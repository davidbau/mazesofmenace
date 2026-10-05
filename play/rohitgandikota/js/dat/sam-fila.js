// dat/sam-fila.js — Samurai quest filler, upper half (above the locate
// level).
// C ref: dat/Sam-fila.lua
//
// A walled smoothed cavern carved from pools (random lit), wolves, a d
// and a stalker.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function samfila_level() {
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

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: true,
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
    des.object();
    des.object();

    des.monster('d');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('stalker');

    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
