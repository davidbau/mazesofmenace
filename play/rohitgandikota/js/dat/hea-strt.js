// dat/hea-strt.js — the Healer quest start level.
// C ref: dat/Hea-strt.lua
//
// Hippocrates' Temple of Epidaurus on its marsh island: pools thinned by
// chance, the neutral altar in the temple wing, eight attendant guards,
// rabid rats and sea monsters on siege duty.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_levregion, lspo_door, lspo_object, lspo_trap, lspo_monster,
         lspo_altar, lspo_non_diggable } from '../sp_lev.js';

const HEA_STRT_MAP = `PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
PPPP........PPPP.....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP.P..PPPPP......PPPPPPPP
PPP..........PPPP...PPPPP.........................PPPP..PPPPP........PPPPPPP
PP............PPPPPPPP..............................PPP...PPPP......PPPPPPPP
P.....PPPPPPPPPPPPPPP................................PPPPPPPPPPPPPPPPPPPPPPP
PPPP....PPPPPPPPPPPP...................................PPPPP.PPPPPPPPPPPPPPP
PPPP........PPPPP.........-----------------------........PP...PPPPPPP.....PP
PPP............PPPPP....--|.|......S..........S.|--.....PPPP.PPPPPPP.......P
PPPP..........PPPPP.....|.S.|......-----------|S|.|......PPPPPP.PPP.......PP
PPPPPP......PPPPPP......|.|.|......|...|......|.|.|.....PPPPPP...PP.......PP
PPPPPPPPPPPPPPPPPPP.....+.|.|......S.\\.S......|.|.+......PPPPPP.PPPP.......P
PPP...PPPPP...PPPP......|.|.|......|...|......|.|.|.......PPPPPPPPPPP.....PP
PP.....PPP.....PPP......|.|S|-----------......|.S.|......PPPPPPPPPPPPPPPPPPP
PPP..PPPPP...PPPP.......--|.S..........S......|.|--.....PPPPPPPPP....PPPPPPP
PPPPPPPPPPPPPPPP..........-----------------------..........PPPPP..........PP
PPPPPPPPPPPPPPPPP........................................PPPPPP............P
PPP.............PPPP...................................PPP..PPPP..........PP
PP...............PPPPP................................PPPP...PPPP........PPP
PPP.............PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP....PPPPPP
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`;

export async function heastrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        altar: (o) => lspo_altar(o),
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(HEA_STRT_MAP);

    des.replace_terrain({ region: [1, 1, 74, 18], fromterrain: 'P',
                          toterrain: '.', chance: 10 });

    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    /* Stairs */
    des.stair('down', 37, 9);
    /* Portal arrival point */
    des.levregion({ region: [4, 12, 4, 12], type: 'branch' });
    /* altar for the Temple */
    des.altar({ x: 32, y: 9, align: 'neutral', type: 'altar' });
    /* Doors */
    des.door('locked', 24, 10);
    des.door('closed', 26, 8);
    des.door('closed', 27, 12);
    des.door('locked', 28, 13);
    des.door('closed', 35, 7);
    des.door('locked', 35, 10);
    des.door('locked', 39, 10);
    des.door('closed', 39, 13);
    des.door('locked', 46, 7);
    des.door('closed', 47, 8);
    des.door('closed', 48, 12);
    des.door('locked', 50, 10);
    /* Hippocrates */
    des.monster({ id: 'Hippocrates', coord: [37, 10], inventory: () => {
        des.object({ id: 'silver dagger', spe: 5 });
    } });
    /* The treasure of Hippocrates */
    des.object('chest', 37, 10);
    /* intern guards for the audience chamber */
    des.monster('attendant', 29, 8);
    des.monster('attendant', 29, 9);
    des.monster('attendant', 29, 10);
    des.monster('attendant', 29, 11);
    des.monster('attendant', 40, 9);
    des.monster('attendant', 40, 10);
    des.monster('attendant', 40, 11);
    des.monster('attendant', 40, 13);
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
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('giant eel');
    des.monster('shark');
    des.monster(';');
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
}
