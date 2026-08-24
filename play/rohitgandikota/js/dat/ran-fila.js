// dat/ran-fila.js — Ranger quest filler, upper half (above the locate
// level).
// C ref: dat/Ran-fila.lua
//
// A walled smoothed cavern carved from trees (random lit) with centaurs
// and a scorpion.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function ranfila_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'T', smoothed: true,
                     joined: true, walled: true });

    des.stair('up');
    des.stair('down');

    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();

    des.trap();
    des.trap();
    des.trap();
    des.trap();

    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
}
