// dat/minetn-2.js — Minetown variant 2, "Town Square".
// C ref: dat/minetn-2.lua
//
// A room-based mine town: the big outer room holds two fountains and a ring
// of chance-gated huts, four shops, a temple with the shuffled-align shrine,
// and the Town Watch; four plain rooms and random corridors outside.

import { lspo_room, lspo_door, lspo_feature, lspo_altar, lspo_stair,
         lspo_trap, lspo_monster, lspo_random_corridors } from '../sp_lev.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

export async function minetn2_level() {
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
                   des.feature('fountain', 17, 5);
                   des.feature('fountain', 13, 8);

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 2, y: 0, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'west' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 5, y: 0,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 8, y: 0, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'east' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 16, y: 0,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'west' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 19, y: 0,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 22, y: 0, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                      des.monster('gnome');
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 25, y: 0,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'east' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 2, y: 5,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'north' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 5, y: 5,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 8, y: 5, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'locked',
                                                 wall: 'north' });
                                      des.monster('gnome');
                                  } });
                   }

                   des.room({ type: 'shop', chance: 90, lit: 1, x: 2, y: 10,
                              w: 4, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'tool shop', chance: 90, lit: 1,
                              x: 23, y: 10, w: 4, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'east' });
                              } });

                   des.room({ type: monkfoodshop(), chance: 90, lit: 1,
                              x: 24, y: 5, w: 3, h: 4,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   des.room({ type: 'candle shop', lit: 1, x: 11, y: 10,
                              w: 4, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'east' });
                              } });

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 7, y: 10,
                                  w: 3, h: 3,
                                  contents: () => {
                                      des.door({ state: 'locked',
                                                 wall: 'north' });
                                      des.monster('gnome');
                                  } });
                   }

                   des.room({ type: 'temple', lit: 1, x: 19, y: 5,
                              w: 4, h: 4,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                                  des.altar({ x: 2, y: 2, align: align(1),
                                              type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 18, y: 10,
                                  w: 4, h: 3,
                                  contents: () => {
                                      des.door({ state: 'locked',
                                                 wall: 'west' });
                                      des.monster('gnome lord');
                                  } });
                   }

                   /* The Town Watch */
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
               } });

    des.room({ contents: () => {
        des.stair('up');
    } });

    des.room({ contents: () => {
        des.stair('down');
        des.trap();
        des.monster('gnome');
        des.monster('gnome');
    } });

    des.room({ contents: () => {
        des.monster('dwarf');
    } });

    des.room({ contents: () => {
        des.trap();
        des.monster('gnome');
    } });

    des.random_corridors();
}
