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

    des.room({ type: 'ordinary', contents: () => {
        des.stair('up');
        des.object();
        des.monster({ class: 'X', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.monster({ class: 'X', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.object();
        des.monster({ class: 'E', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.stair('down');
        des.object();
        des.trap();
        des.monster({ class: 'E', peaceful: 0 });
        des.monster('earth elemental');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.trap();
        des.monster({ class: 'X', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.monster('earth elemental');
    } });

    des.random_corridors();
}
