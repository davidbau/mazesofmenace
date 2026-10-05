// dat/wiz-loca.js — the Wizard quest locate level.
// C ref: dat/Wiz-loca.lua
//
// The Tower of Darkness on its moat island: nested irregular rings each
// hiding one secret door (two side vaults pick from three named walls),
// cloud and water chance scatter outside, and a bat/imp population.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair, lspo_door,
         lspo_terrain, lspo_non_diggable, lspo_object, lspo_trap,
         lspo_monster, l_selection_fillrect } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const WIZ_LOCA_MAP = `.............        .......................................................
..............       .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......
..............      ..............}.................................}.......
..............      ..............}.-------------------------------.}.......
...............     .........C....}.|.............................|.}.......
...............    ..........C....}.|.---------------------------.|.}.......
...............    .........CCC...}.|.|.........................|.|.}.......
................   ....C....CCC...}.|.|.-----------------------.|.|.}.......
.......C..C.....  .....C....CCC...}.|.|.|......+.......+......|.|.|.}.......
.............C..CC.....C....CCC...}.|.|.|......|-------|......|.|.|.}.......
................   ....C....CCC...}.|.|.|......|.......|......|.|.|.}.......
......C..C.....    ....C....CCC...}.|.|.|......|-------|......|.|.|.}.......
............C..     ...C....CCC...}.|.|.|......+.......+......|.|.|.}.......
........C......    ....C....CCC...}.|.|.-----------------------.|.|.}.......
....C......C...     ........CCC...}.|.|.........................|.|.}.......
......C..C....      .........C....}.|.---------------------------.|.}.......
..............      .........C....}.|.............................|.}.......
.............       ..............}.-------------------------------.}.......
.............        .............}.................................}.......
.............        .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......
.............        .......................................................`;

export async function wizloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        terrain: (sel, ch) => {
            if (Array.isArray(sel)) {
                /* des.terrain({x,y}, mapchar) — one located point */
                lspo_terrain(l_selection_fillrect(sel[0], sel[1],
                                                  sel[0], sel[1]), ch);
            } else {
                lspo_terrain(sel, ch);
            }
        },
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => (typeof state === 'object')
            ? lspo_door(state)
            : lspo_door({ state, x, y }),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(WIZ_LOCA_MAP);

    des.replace_terrain({ region: [0, 0, 30, 20], fromterrain: '.',
                          toterrain: 'C', chance: 15 });
    des.replace_terrain({ region: [68, 0, 75, 20], fromterrain: '.',
                          toterrain: '}', chance: 25 });
    des.replace_terrain({ region: [34, 1, 68, 19], fromterrain: '}',
                          toterrain: '.', chance: 2 });

    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 20), 'lit');
    des.region({ region: [37, 4, 65, 16], lit: 0, type: 'ordinary',
                 irregular: 1, contents: () => {
        des.door({ state: 'secret', wall: 'random' });
    } });
    des.region({ region: [39, 6, 63, 14], lit: 0, type: 'ordinary',
                 irregular: 1, contents: () => {
        des.door({ state: 'secret', wall: 'random' });
    } });

    des.region({ region: [41, 8, 46, 12], lit: 1, type: 'ordinary',
                 irregular: 1, contents: () => {
        const walls = ['north', 'south', 'west'];
        const widx = mathrandom(1, walls.length);
        des.door({ state: 'secret', wall: walls[widx - 1] });
    } });

    des.region({ region: [56, 8, 61, 12], lit: 1, type: 'ordinary',
                 irregular: 1, contents: () => {
        const walls = ['north', 'south', 'east'];
        const widx = mathrandom(1, walls.length);
        des.door({ state: 'secret', wall: walls[widx - 1] });
    } });

    des.region(selection.area(48, 8, 54, 8), 'unlit');
    des.region(selection.area(48, 12, 54, 12), 'unlit');

    des.region({ region: [48, 10, 54, 10], lit: 0, type: 'ordinary',
                 irregular: 1, contents: () => {
        des.door({ state: 'secret', wall: 'random' });
    } });

    /* Doors */
    des.door('locked', 55, 8);
    des.door('locked', 55, 12);
    des.door('locked', 47, 8);
    des.door('locked', 47, 12);
    /* Stairs */
    des.terrain([3, 17], '.');
    des.stair('up', 3, 17);
    des.stair('down', 48, 10);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 20));
    /* Objects */
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    /* Random traps */
    des.trap('spiked pit', 24, 2);
    des.trap('spiked pit', 7, 10);
    des.trap('spiked pit', 23, 5);
    des.trap('spiked pit', 26, 19);
    des.trap('spiked pit', 72, 2);
    des.trap('spiked pit', 72, 12);
    des.trap('falling rock', 45, 16);
    des.trap('falling rock', 65, 13);
    des.trap('falling rock', 55, 6);
    des.trap('falling rock', 39, 11);
    des.trap('falling rock', 57, 9);
    des.trap('magic');
    des.trap('statue');
    des.trap('statue');
    des.trap('polymorph');
    des.trap('anti magic', 53, 10);
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('dart');
    des.trap('dart');
    des.trap('dart');
    /* Random monsters. */
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster({ class: 'i', peaceful: 0 });
}
