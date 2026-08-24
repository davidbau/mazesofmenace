// dat/pri-strt.js — the Priest quest start level.
// C ref: dat/Pri-strt.lua
//
// The Great Temple under siege: the Arch Priest's shrine at the center,
// eight acolyte guards, forests at both map edges, and a dozen human
// zombies flood-filled onto the open ground outside the walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_levregion, lspo_door, lspo_terrain, lspo_non_diggable,
         lspo_object, lspo_trap, lspo_monster, lspo_altar,
         l_selection_flood, l_selection_fillrect } from '../sp_lev.js';
import { selection_rndcoord } from '../selvar.js';

const PRI_STRT_MAP = `............................................................................
............................................................................
............................................................................
....................------------------------------------....................
....................|................|.....|.....|.....|....................
....................|..------------..|--+-----+-----+--|....................
....................|..|..........|..|.................|....................
....................|..|..........|..|+---+---+-----+--|....................
..................---..|..........|......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................---..|..........|......|...|...|.....|....................
....................|..|..........|..|+-----+---+---+--|....................
....................|..|..........|..|.................|....................
....................|..------------..|--+-----+-----+--|....................
....................|................|.....|.....|.....|....................
....................------------------------------------....................
............................................................................
............................................................................
............................................................................`;

export async function pristrt_level() {
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
        levregion: lspo_levregion,
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        monster: (a, x, y, o) => (x !== undefined && typeof x === 'object'
                                  && !Array.isArray(x))
            ? lspo_monster(a, x.x, x.y, o)
            : lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => (x !== undefined && typeof x === 'object'
                            && !Array.isArray(x))
            ? lspo_trap(t, x.x, x.y)
            : lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(PRI_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [24, 6, 33, 13], lit: 1, type: 'temple',
                 filled: 2 });

    des.replace_terrain({ region: [0, 0, 10, 19], fromterrain: '.',
                          toterrain: 'T', chance: 10 });
    des.replace_terrain({ region: [65, 0, 75, 19], fromterrain: '.',
                          toterrain: 'T', chance: 10 });
    des.terrain([5, 4], '.');

    const spacelocs = l_selection_flood(5, 4);

    /* Portal arrival point */
    des.levregion({ region: [5, 4, 5, 4], type: 'branch' });
    /* Stairs */
    des.stair('down', 52, 9);
    /* Doors */
    des.door('locked', 18, 9);
    des.door('locked', 18, 10);
    des.door('closed', 34, 9);
    des.door('closed', 34, 10);
    des.door('closed', 40, 5);
    des.door('closed', 46, 5);
    des.door('closed', 52, 5);
    des.door('locked', 38, 7);
    des.door('closed', 42, 7);
    des.door('closed', 46, 7);
    des.door('closed', 52, 7);
    des.door('locked', 38, 12);
    des.door('closed', 44, 12);
    des.door('closed', 48, 12);
    des.door('closed', 52, 12);
    des.door('closed', 40, 14);
    des.door('closed', 46, 14);
    des.door('closed', 52, 14);
    /* Unattended Altar - unaligned due to conflict - player must align it. */
    des.altar({ x: 28, y: 9, align: 'noalign', type: 'altar' });
    /* High Priest */
    des.monster({ id: 'Arch Priest', coord: [28, 10], inventory: () => {
        des.object({ id: 'robe', spe: 4 });
        des.object({ id: 'mace', spe: 4 });
    } });
    /* The treasure of High Priest */
    des.object('chest', 27, 10);
    /* knight guards for the audience chamber */
    des.monster('acolyte', 32, 7);
    des.monster('acolyte', 32, 8);
    des.monster('acolyte', 32, 11);
    des.monster('acolyte', 32, 12);
    des.monster('acolyte', 33, 7);
    des.monster('acolyte', 33, 8);
    des.monster('acolyte', 33, 11);
    des.monster('acolyte', 33, 12);
    /* Non diggable walls */
    des.non_diggable(selection.area(18, 3, 55, 16));
    /* Random traps */
    for (let i = 1; i <= 2; i++)
        des.trap('dart', selection_rndcoord(spacelocs, 1));
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Monsters on siege duty. */
    for (let i = 1; i <= 12; i++)
        des.monster('human zombie', selection_rndcoord(spacelocs, 1));
}
