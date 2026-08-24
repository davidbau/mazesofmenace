// dat/bar-strt.js — the Barbarian quest start level.
// C ref: dat/Bar-strt.lua
//
// Pelias's besieged camp: a solid-fill map with the audience chamber and
// its chieftain guards west of a river of water walls, a forest thickened
// by three chance-based tree replacements east of it, a randline path to
// the branch arrival square, eels in the river and a dozen hostile ogres
// on siege duty flood-filled onto the near bank.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_levregion, lspo_door, lspo_terrain,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_randline, l_selection_flood, l_selection_and,
         l_selection_fillrect } from '../sp_lev.js';
import { selection_new, selection_rndcoord } from '../selvar.js';

const BAR_STRT_MAP = `
..................................PP........................................
...................................PP.......................................
...................................PP.......................................
....................................PP......................................
........--------------......-----....PPP....................................
........|...S........|......+...|...PPP.....................................
........|----........|......|...|....PP.....................................
........|.\\..........+......-----...........................................
........|----........|...............PP.....................................
........|...S........|...-----.......PPP....................................
........--------------...+...|......PPPPP...................................
.........................|...|.......PPP....................................
...-----......-----......-----........PP....................................
...|...+......|...+..--+--.............PP...................................
...|...|......|...|..|...|..............PP..................................
...-----......-----..|...|.............PPPP.................................
.....................-----............PP..PP................................
.....................................PP...PP................................
....................................PP...PP.................................
....................................PP....PP................................
`.replace(/^\n/, '').replace(/\n$/, '');

export async function barstrt_level() {
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
        region: (o) => lspo_region_full(o),
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: lspo_non_diggable,
        trap: (t, x, y) => lspo_trap(t, x, y),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(BAR_STRT_MAP);

    /* the forest beyond the river */
    des.replace_terrain({ region: [37, 0, 59, 19], fromterrain: '.',
                          toterrain: 'T', chance: 5 });
    des.replace_terrain({ region: [60, 0, 64, 19], fromterrain: '.',
                          toterrain: 'T', chance: 10 });
    des.replace_terrain({ region: [65, 0, 75, 19], fromterrain: '.',
                          toterrain: 'T', chance: 20 });
    /* guarantee a path and free spot for the portal */
    des.terrain(l_selection_randline(selection_new(), 37, 7, 62, 2, 7), '.');
    des.terrain([62, 2], '.');

    /* Dungeon Description */
    des.region({ area: [0, 0, 75, 19], lit: 1 });
    des.region({ area: [9, 5, 11, 5], lit: 0 });
    des.region({ area: [9, 7, 11, 7], lit: 1 });
    des.region({ area: [9, 9, 11, 9], lit: 0 });
    des.region({ area: [13, 5, 20, 9], lit: 1 });
    des.region({ area: [29, 5, 31, 6], lit: 1 });
    des.region({ area: [26, 10, 28, 11], lit: 1 });
    des.region({ area: [4, 13, 6, 14], lit: 1 });
    des.region({ area: [15, 13, 17, 14], lit: 1 });
    des.region({ area: [22, 14, 24, 15], lit: 1 });
    /* Stairs */
    des.stair('down', 9, 9);
    /* Portal arrival point */
    des.levregion({ region: [62, 2, 62, 2], type: 'branch' });
    /* Doors */
    des.door('locked', 12, 5);
    des.door('locked', 12, 9);
    des.door('closed', 21, 7);
    des.door('open', 7, 13);
    des.door('open', 18, 13);
    des.door('open', 23, 13);
    des.door('open', 25, 10);
    des.door('open', 28, 5);
    /* Elder */
    des.monster({ id: 'Pelias', coord: [10, 7], inventory: () => {
        des.object({ id: 'runesword', spe: 5 });
        des.object({ id: 'chain mail', spe: 5 });
    } });
    /* The treasure of Pelias */
    des.object('chest', 9, 5);
    /* chieftain guards for the audience chamber */
    des.monster('chieftain', 10, 5);
    des.monster('chieftain', 10, 9);
    des.monster('chieftain', 11, 5);
    des.monster('chieftain', 11, 9);
    des.monster('chieftain', 14, 5);
    des.monster('chieftain', 14, 9);
    des.monster('chieftain', 16, 5);
    des.monster('chieftain', 16, 9);
    /* Non diggable walls */
    des.non_diggable(0, 0, 75, 19);
    /* One trap to keep the ogres at bay. */
    des.trap('spiked pit', 37, 7);
    /* Eels in the river */
    des.monster('giant eel', 36, 1);
    des.monster('giant eel', 37, 9);
    des.monster('giant eel', 39, 15);
    /* Monsters on siege duty. */
    const ogrelocs = l_selection_and(l_selection_flood(37, 7),
                                     l_selection_fillrect(40, 3, 45, 20));
    for (let i = 0; i <= 11; i++)
        des.monster({ id: 'ogre', coord: selection_rndcoord(ogrelocs, 1),
                      peaceful: 0 });
}
