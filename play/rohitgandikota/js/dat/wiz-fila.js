// dat/wiz-fila.js — Wizard quest filler, upper half (above the locate
// level).
// C ref: dat/Wiz-fila.lua
//
// Six ordinary rooms with imps and vampire bats, joined by the standard
// corridor pass.

import { lspo_room, lspo_stair, lspo_object, lspo_trap, lspo_monster,
         lspo_random_corridors } from '../sp_lev.js';

export async function wizfila_level() {
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
        des.monster({ class: 'i', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.monster({ class: 'i', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.object();
        des.monster('vampire bat');
        des.monster('vampire bat');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.stair('down');
        des.object();
        des.trap();
        des.monster({ class: 'i', peaceful: 0 });
        des.monster('vampire bat');
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.object();
        des.trap();
        des.monster({ class: 'i', peaceful: 0 });
    } });

    des.room({ type: 'ordinary', contents: () => {
        des.object();
        des.trap();
        des.monster('vampire bat');
    } });

    des.random_corridors();
}
