// dat/cav-fila.js — Caveman quest filler, upper half (above the locate
// level).
// C ref: dat/Cav-fila.lua
//
// A walled smoothed cavern (random lit) with bugbears, an h and a hill
// giant.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function cavfila_level() {
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

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true,
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

    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
}
