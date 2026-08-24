// dat/pri-filb.js — Priest quest filler, lower half (at or below the
// locate level).
// C ref: dat/Pri-filb.lua
//
// Six rooms, three of them morgues, with zombie/wraith pairs, joined by
// the standard corridor pass.

import { lspo_room, lspo_stair, lspo_object, lspo_trap, lspo_monster,
         lspo_random_corridors } from '../sp_lev.js';

export async function prifilb_level() {
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
        des.monster('human zombie');
        des.monster('wraith');
    } });

    des.room({ type: 'morgue', contents: () => {
        des.object();
        des.object();
        des.object();
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.object();
        des.monster('human zombie');
        des.monster('wraith');
    } });

    des.room({ type: 'morgue', contents: () => {
        des.stair('down');
        des.object();
        des.object();
        des.trap();
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.trap();
        des.monster('human zombie');
        des.monster('wraith');
    } });

    des.room({ type: 'morgue', contents: () => {
        des.object();
        des.trap();
    } });

    des.random_corridors();
}
