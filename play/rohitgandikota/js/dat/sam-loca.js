// dat/sam-loca.js — the Samurai quest locate level.
// C ref: dat/Sam-loca.lua
//
// The shogun's fortress compound: locked storerooms of gems, armor,
// weapons and tools, ninja/wolf patrols, nine stalkers, and hostile
// samurai (mk_mplayer monsters) guarding the courtyard.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const SAM_LOCA_MAP = `............................................................................
............................................................................
........-----..................................................-----........
........|...|..................................................|...|........
........|...---..}..--+------------------------------+--..}..---...|........
........|-|...|.....|...|....|....|....|....|....|.|...|.....|...|-|........
..........|...-------...|....|....|....|....|....S.|...-------...|..........
..........|-|.........------+----+-+-------+-+--------.........|-|..........
............|..--------.|}........................}|.--------..|............
............|..+........+..........................+........+..|............
............|..+........+..........................+........+..|............
............|..--------.|}........................}|.--------..|............
..........|-|.........--------+-+-------+-+----+------.........|-|..........
..........|...-------...|.S....|....|....|....|....|...-------...|..........
........|-|...|.....|...|.|....|....|....|....|....|...|.....|...|-|........
........|...---..}..--+------------------------------+--..}..---...|........
........|...|..................................................|...|........
........-----..................................................-----........
............................................................................
............................................................................`;

export async function samloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(SAM_LOCA_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    /* Doors */
    des.door('locked', 22, 4);
    des.door('locked', 22, 15);
    des.door('locked', 53, 4);
    des.door('locked', 53, 15);
    des.door('locked', 49, 6);
    des.door('locked', 26, 13);
    des.door('locked', 28, 7);
    des.door('locked', 30, 12);
    des.door('locked', 33, 7);
    des.door('locked', 32, 12);
    des.door('locked', 35, 7);
    des.door('locked', 40, 12);
    des.door('locked', 43, 7);
    des.door('locked', 42, 12);
    des.door('locked', 45, 7);
    des.door('locked', 47, 12);
    des.door('closed', 15, 9);
    des.door('closed', 15, 10);
    des.door('closed', 24, 9);
    des.door('closed', 24, 10);
    des.door('closed', 51, 9);
    des.door('closed', 51, 10);
    des.door('closed', 60, 9);
    des.door('closed', 60, 10);
    /* Stairs */
    des.stair('up', 10, 10);
    des.stair('down', 25, 14);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Objects */
    des.object('*', 25, 5);
    des.object('*', 26, 5);
    des.object('*', 27, 5);
    des.object('*', 28, 5);
    des.object('*', 25, 6);
    des.object('*', 26, 6);
    des.object('*', 27, 6);
    des.object('*', 28, 6);

    des.object('[', 40, 5);
    des.object('[', 41, 5);
    des.object('[', 42, 5);
    des.object('[', 43, 5);
    des.object('[', 40, 6);
    des.object('[', 41, 6);
    des.object('[', 42, 6);
    des.object('[', 43, 6);

    des.object(')', 27, 13);
    des.object(')', 28, 13);
    des.object(')', 29, 13);
    des.object(')', 30, 13);
    des.object(')', 27, 14);
    des.object(')', 28, 14);
    des.object(')', 29, 14);
    des.object(')', 30, 14);

    des.object('(', 37, 13);
    des.object('(', 38, 13);
    des.object('(', 39, 13);
    des.object('(', 40, 13);
    des.object('(', 37, 14);
    des.object('(', 38, 14);
    des.object('(', 39, 14);
    des.object('(', 40, 14);
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster({ id: 'ninja', x: 15, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 16, y: 5, peaceful: 0 });
    des.monster('wolf', 17, 5);
    des.monster('wolf', 18, 5);
    des.monster({ id: 'ninja', x: 19, y: 5, peaceful: 0 });
    des.monster('wolf', 15, 14);
    des.monster('wolf', 16, 14);
    des.monster({ id: 'ninja', x: 17, y: 14, peaceful: 0 });
    des.monster({ id: 'ninja', x: 18, y: 14, peaceful: 0 });
    des.monster('wolf', 56, 5);
    des.monster({ id: 'ninja', x: 57, y: 5, peaceful: 0 });
    des.monster('wolf', 58, 5);
    des.monster('wolf', 59, 5);
    des.monster({ id: 'ninja', x: 56, y: 14, peaceful: 0 });
    des.monster('wolf', 57, 14);
    des.monster({ id: 'ninja', x: 58, y: 14, peaceful: 0 });
    des.monster('d', 59, 14);
    des.monster('wolf', 60, 14);
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    /*	"guards" for the central courtyard. */
    des.monster({ id: 'samurai', x: 30, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 31, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 32, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 32, y: 14, peaceful: 0 });
    des.monster({ id: 'samurai', x: 33, y: 14, peaceful: 0 });
    des.monster({ id: 'samurai', x: 34, y: 14, peaceful: 0 });
}
