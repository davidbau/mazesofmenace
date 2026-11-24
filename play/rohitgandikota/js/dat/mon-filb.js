// dat/mon-filb.js — Monk quest filler, lower half (at or below the
// locate level).
// C ref: dat/Mon-filb.lua
//
// Six ordinary rooms with X's, E's and earth elementals, joined by the
// standard corridor pass.

import { lspo_room, lspo_stair, lspo_object, lspo_trap, lspo_monster,
         lspo_random_corridors } from '../sp_lev.js';

export async function monfilb_level() {
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
        await des.monster({ class: 'X', peaceful: 0 });
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        des.object();
        await des.monster({ class: 'X', peaceful: 0 });
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        await des.trap();
        des.object();
        await des.monster({ class: 'E', peaceful: 0 });
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.stair('down');
        des.object();
        await des.trap();
        await des.monster({ class: 'E', peaceful: 0 });
        await des.monster('earth elemental');
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        des.object();
        await des.trap();
        await des.monster({ class: 'X', peaceful: 0 });
    } });

    await des.room({ type: 'ordinary', contents: async () => {
        des.object();
        await des.trap();
        await des.monster('earth elemental');
    } });

    des.random_corridors();
}
