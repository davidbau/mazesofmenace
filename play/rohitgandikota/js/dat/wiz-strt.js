// dat/wiz-strt.js — the Wizard quest start level.
// C ref: dat/Wiz-strt.lua
//
// Neferet the Green's cloud-ringed tower: chance clouds rolled over the
// whole map then scrubbed from the tower interior, eight apprentice
// guards, eels in the pond, and bat/wraith/imp siege lines.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_levregion, lspo_door, lspo_terrain, lspo_non_diggable,
         lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect } from '../sp_lev.js';

const WIZ_STRT_MAP = `............................................................................
.....................C....CC.C........................C.....................
..........CCC.....................CCC.......................................
........CC........-----------.......C.C...C...C....C........................
.......C.....---------------------...C..C..C..C.............................
......C..C...------....\\....------....C.....C...............................
........C...||....|.........|....||.........................................
.......C....||....|.........+....||.........................................
.......C...||---+--.........|....|||........................................
......C....||...............|--S--||........................................
...........||--+--|++----|---|..|.SS..........C......C......................
........C..||.....|..|...|...|--|.||..CC..C.....C..........C................
.......C...||.....|..|.--|.|.|....||.................C..C...................
.....C......||....|..|.....|.|.--||..C..C..........C...........}}}..........
......C.C...||....|..-----.|.....||...C.C.C..............C....}}}}}}........
.........C...------........|------....C..C.....C..CC.C......}}}}}}}}}}}.....
.........CC..---------------------...C.C..C.....CCCCC.C.......}}}}}}}}......
.........C........-----------..........C.C.......CCC.........}}}}}}}}}......
..........C.C.........................C............C...........}}}}}........
......................CCC.C.................................................`;

export async function wizstrt_level() {
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

    des.map(WIZ_STRT_MAP);

    /* first do cloud everywhere */
    des.replace_terrain({ region: [0, 0, 75, 19], fromterrain: '.',
                          toterrain: 'C', chance: 10 });
    /* then replace clouds inside the tower back to floor */
    des.replace_terrain({ region: [13, 5, 33, 15], fromterrain: 'C',
                          toterrain: '.', chance: 100 });

    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(35, 0, 49, 3), 'unlit');
    des.region(selection.area(43, 12, 49, 16), 'unlit');
    des.region({ region: [19, 11, 33, 15], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region(selection.area(30, 10, 31, 10), 'unlit');
    /* Stairs */
    des.stair('down', 30, 10);
    /* Portal arrival point */
    des.terrain([63, 6], '.');
    des.levregion({ region: [63, 6, 63, 6], type: 'branch' });
    /* Doors */
    des.door('closed', 31, 9);
    des.door('closed', 16, 8);
    des.door('closed', 28, 7);
    des.door('locked', 34, 10);
    des.door('locked', 35, 10);
    des.door('closed', 15, 10);
    des.door('locked', 19, 10);
    des.door('locked', 20, 10);
    /* Neferet the Green, the quest leader */
    des.monster({ id: 'Neferet the Green', coord: [23, 5],
                  inventory: () => {
        des.object({ id: 'elven cloak', spe: 5 });
        des.object({ id: 'quarterstaff', spe: 5 });
    } });
    /* The treasure of the quest leader */
    des.object('chest', 24, 5);
    /* apprentice guards for the audience chamber */
    des.monster('apprentice', 30, 7);
    des.monster('apprentice', 24, 6);
    des.monster('apprentice', 15, 6);
    des.monster('apprentice', 15, 12);
    des.monster('apprentice', 26, 11);
    des.monster('apprentice', 27, 11);
    des.monster('apprentice', 19, 9);
    des.monster('apprentice', 20, 9);
    /* Eels in the pond */
    des.monster('giant eel', 62, 14);
    des.monster('giant eel', 69, 15);
    des.monster('giant eel', 67, 17);
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
    des.monster({ class: 'B', x: 60, y: 9, peaceful: 0 });
    des.monster({ class: 'W', x: 60, y: 10, peaceful: 0 });
    des.monster({ class: 'B', x: 60, y: 11, peaceful: 0 });
    des.monster({ class: 'B', x: 60, y: 12, peaceful: 0 });
    des.monster({ class: 'i', x: 60, y: 13, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 10, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 11, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 12, peaceful: 0 });
    des.monster({ class: 'B', x: 35, y: 3, peaceful: 0 });
    des.monster({ class: 'i', x: 35, y: 17, peaceful: 0 });
    des.monster({ class: 'B', x: 36, y: 17, peaceful: 0 });
    des.monster({ class: 'B', x: 34, y: 16, peaceful: 0 });
    des.monster({ class: 'i', x: 34, y: 17, peaceful: 0 });
    des.monster({ class: 'W', x: 67, y: 2, peaceful: 0 });
    des.monster({ class: 'B', x: 10, y: 19, peaceful: 0 });
}
