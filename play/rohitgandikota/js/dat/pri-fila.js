// dat/pri-fila.js — Priest quest filler, upper half (above the locate
// level).
// C ref: dat/Pri-fila.lua
//
// Six rooms, two of them morgues, with zombies and a wraith, joined by the
// standard corridor pass.

import { lspo_room, lspo_stair, lspo_object, lspo_trap, lspo_monster,
         lspo_random_corridors } from '../sp_lev.js';

export async function prifila_level() {
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
        await des.monster('human zombie');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        await des.trap();
        des.object();
        await des.monster('human zombie');
    } });

    await des.room({ type: 'morgue', contents: async () => {
        des.stair('down');
        des.object();
        await des.trap();
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        des.object();
        await des.trap();
        await des.monster('wraith');
    } });

    await des.room({ type: 'morgue', contents: async () => {
        des.object();
        await des.trap();
    } });

    des.random_corridors();
}
