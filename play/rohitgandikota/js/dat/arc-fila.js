// dat/arc-fila.js — Archeologist quest filler, upper half (above the locate
// level).
// C ref: dat/Arc-fila.lua
//
// Six ordinary rooms with the stairs, snakes and a mummy, joined by the
// standard corridor pass.

import { lspo_room, lspo_stair, lspo_object, lspo_trap, lspo_monster,
         lspo_random_corridors } from '../sp_lev.js';

export async function arcfila_level() {
    const des = {
        room: (o) => lspo_room(o),
        stair: (d) => lspo_stair(d),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        random_corridors: lspo_random_corridors,
    };

    des.room({ type: 'ordinary', contents: () => {
        des.stair('up');
        des.object();
        des.monster('S');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.monster('S');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.object();
        des.monster('S');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.stair('down');
        des.object();
        des.trap();
        des.monster('S');
        des.monster('human mummy');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.trap();
        des.monster('S');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.monster('S');
    } });

    des.random_corridors();
}
