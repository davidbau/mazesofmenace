// dat/val-fila.js — Valkyrie quest filler, upper half (above the locate
// level).
// C ref: dat/Val-fila.lua
//
// A smoothed joined lit mines cavern carved from ice, with fire ants, an
// 'a' and a fire giant.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function valfila_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: 'I' });

    des.level_flags('mazelevel', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'I', smoothed: true,
                     joined: true, lit: 1, walled: false });

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

    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ id: 'fire giant', peaceful: 0 });

    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
