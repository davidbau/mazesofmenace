// dat/minetn-3.js — Minetown variant 3, "Alley Town" (by Kelly Bailey).
// C ref: dat/minetn-3.lua
//
// A room-based mine town: alleys between many small huts, chance-gated tool
// and wand shops, the temple with the shuffled-align shrine, a candle shop,
// and the Town Watch; four plain rooms and random corridors outside.

import { lspo_room, lspo_door, lspo_feature, lspo_altar, lspo_stair,
         lspo_trap, lspo_monster, lspo_random_corridors } from '../sp_lev.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

export async function minetn3_level() {
    const des = {
        room: (o) => lspo_room(o),
        door: (o) => lspo_door(o),
        feature: (t, x, y) => lspo_feature(t, x, y),
        altar: (o) => lspo_altar(o),
        stair: (d, x, y) => lspo_stair(d, x, y),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        random_corridors: () => lspo_random_corridors(),
    };
    /* dat/nhlib.lua:24 align — shuffled by load_special; Lua is 1-indexed */
    const align = (n) => game.nhlib_align[n - 1];

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 31, h: 15,
               contents: () => {
                   des.feature('fountain', 1, 6);
                   des.feature('fountain', 29, 13);

                   des.room({ type: 'ordinary', x: 2, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'tool shop', chance: 30, lit: 1,
                              x: 5, y: 3, w: 2, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'ordinary', x: 2, y: 10, w: 2, h: 3,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'north' });
                                  des.monster('G');
                              } });

                   des.room({ type: 'ordinary', x: 5, y: 9, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   des.room({ type: 'temple', lit: 1, x: 10, y: 2,
                              w: 3, h: 4,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'east' });
                                  des.altar({ x: 1, y: 1, align: align(1),
                                              type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   des.room({ type: 'ordinary', x: 11, y: 7, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'shop', lit: 1, x: 10, y: 10,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   /* the bare `random` in these tables is a nil global in
                      the Lua; it adds nothing */
                   des.room({ type: 'ordinary', x: 14, y: 8, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'north' });
                                  des.monster('G');
                              } });

                   des.room({ type: 'ordinary', x: 14, y: 11, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'tool shop', chance: 40, lit: 1,
                              x: 17, y: 10, w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   des.room({ type: 'ordinary', x: 21, y: 11, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'east' });
                                  des.monster('G');
                              } });

                   des.room({ type: monkfoodshop(), chance: 90, lit: 1,
                              x: 26, y: 8, w: 3, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'ordinary', x: 16, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'ordinary', x: 19, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   des.room({ type: 'wand shop', chance: 30, lit: 1,
                              x: 19, y: 5, w: 3, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'candle shop', lit: 1, x: 25, y: 2,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
               } });

    des.room({ type: 'ordinary', contents: () => {
        des.stair('up');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.stair('down');
        des.trap();
        des.monster('gnome');
        des.monster('gnome');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.monster('dwarf');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.trap();
        des.monster('gnome');
    } });

    des.random_corridors();
}
