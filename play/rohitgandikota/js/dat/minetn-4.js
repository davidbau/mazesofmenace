// dat/minetn-4.js — Minetown variant 4, "College Town" (by Kelly Bailey).
// C ref: dat/minetn-4.lua
//
// A room-based mine town: two fountains, a book shop, the temple with the
// shuffled-align shrine, candle/tool/food shops, a kobold-shaman den, and
// the Town Watch; four plain rooms and random corridors outside.

import { lspo_room, lspo_door, lspo_feature, lspo_altar, lspo_stair,
         lspo_trap, lspo_monster, lspo_random_corridors } from '../sp_lev.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

export async function minetn4_level() {
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
               xalign: 'center', yalign: 'center', w: 30, h: 15,
               contents: () => {
                   des.feature('fountain', 8, 7);
                   des.feature('fountain', 18, 7);

                   des.room({ type: 'book shop', lit: 1, x: 4, y: 2,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'ordinary', x: 8, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'temple', lit: 1, x: 11, y: 3,
                              w: 5, h: 4,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                                  des.altar({ x: 2, y: 1, align: align(1),
                                              type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   des.room({ type: 'ordinary', x: 19, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                                  des.monster('G');
                              } });

                   des.room({ type: 'candle shop', lit: 1, x: 22, y: 2,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'ordinary', x: 26, y: 2, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'east' });
                                  des.monster('G');
                              } });

                   des.room({ type: 'tool shop', chance: 90, lit: 1,
                              x: 4, y: 10, w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   des.room({ type: 'ordinary', x: 8, y: 11, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'south' });
                                  des.monster('kobold shaman');
                                  des.monster('kobold shaman');
                                  des.monster('kitten');
                                  des.monster('f');
                              } });

                   des.room({ type: monkfoodshop(), chance: 90, lit: 1,
                              x: 11, y: 11, w: 3, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'east' });
                              } });

                   des.room({ type: 'ordinary', x: 17, y: 11, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'ordinary', x: 20, y: 10, w: 2, h: 2,
                              contents: () => {
                                  des.door({ state: 'locked',
                                             wall: 'north' });
                                  des.monster('G');
                              } });

                   des.room({ type: 'shop', chance: 90, lit: 1, x: 23, y: 10,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
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
