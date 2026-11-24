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

    await des.room({ type: 'ordinary', contents: async () => {
        des.stair('up');
        des.object();
        await des.monster('S');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        des.object();
        await des.monster('S');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        await des.trap();
        des.object();
        await des.monster('S');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.stair('down');
        des.object();
        await des.trap();
        await des.monster('S');
        await des.monster('human mummy');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        des.object();
        await des.trap();
        await des.monster('S');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        await des.trap();
        await des.monster('S');
    } });

    des.random_corridors();
}
