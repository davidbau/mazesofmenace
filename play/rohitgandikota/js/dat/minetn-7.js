// dat/minetn-7.js — Minetown variant 7, "Bazaar Town" (by Kelly Bailey).
// C ref: dat/minetn-7.lua
//
// A room-based mine town: a bazaar of chance-gated huts and shops around
// two fountains, a monkey house, the temple with the shuffled-align shrine,
// and the Town Watch; four plain rooms and random corridors outside.

import { lspo_room, lspo_door, lspo_feature, lspo_altar, lspo_stair,
         lspo_trap, lspo_monster, lspo_random_corridors } from '../sp_lev.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

export async function minetn7_level() {
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
                   des.feature('fountain', 12, 7);
                   des.feature('fountain', 11, 13);

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 2, y: 2, w: 4, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 7, y: 2, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'north' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 7, y: 5, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 10, y: 2,
                                  w: 3, h: 4,
                                  contents: () => {
                                      des.monster('gnome');
                                      des.monster('monkey');
                                      des.monster('monkey');
                                      des.monster('monkey');
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 14, y: 2, w: 4, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south', pos: 0 });
                                      des.monster('n');
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 16, y: 5, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 19, y: 2,
                                  w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'locked',
                                                 wall: 'east' });
                                      des.monster('gnome king');
                                  } });
                   }

                   des.room({ type: monkfoodshop(), chance: 50, lit: 1,
                              x: 19, y: 5, w: 2, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 2, y: 7, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'east' });
                                  } });
                   }

                   des.room({ type: 'tool shop', chance: 50, lit: 1,
                              x: 2, y: 10, w: 2, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'south' });
                              } });

                   des.room({ type: 'candle shop', lit: 1, x: 5, y: 10,
                              w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 11, y: 10, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'locked',
                                                 wall: 'west' });
                                      des.monster('G');
                                  } });
                   }

                   des.room({ type: 'shop', chance: 60, lit: 1, x: 14, y: 10,
                              w: 2, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'north' });
                              } });

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 17, y: 11, w: 4, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'north' });
                                  } });
                   }

                   if (percent(75)) {
                       des.room({ type: 'ordinary', x: 22, y: 11, w: 2, h: 2,
                                  contents: () => {
                                      des.door({ state: 'closed',
                                                 wall: 'south' });
                                      des.feature('sink', 0, 0);
                                  } });
                   }

                   des.room({ type: monkfoodshop(), chance: 50, lit: 1,
                              x: 25, y: 11, w: 3, h: 2,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'east' });
                              } });

                   des.room({ type: 'tool shop', chance: 30, lit: 1,
                              x: 25, y: 2, w: 3, h: 3,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                              } });

                   des.room({ type: 'temple', lit: 1, x: 24, y: 6,
                              w: 4, h: 4,
                              contents: () => {
                                  des.door({ state: 'closed',
                                             wall: 'west' });
                                  des.altar({ x: 2, y: 1, align: align(1),
                                              type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
                   des.monster('gnome');
                   des.monster('gnome');
                   des.monster('gnome');
                   des.monster('gnome lord');
                   des.monster('monkey');
                   des.monster('monkey');
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
