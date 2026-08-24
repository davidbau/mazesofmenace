// dat/val-filb.js — Valkyrie quest filler, lower half (at or below the
// locate level).
// C ref: dat/Val-filb.lua
//
// A smoothed joined lit mines cavern carved from lava, five fire traps,
// fire ants and three fire giants.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function valfilb_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: 'L' });

    des.level_flags('mazelevel', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'L', smoothed: true,
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
    des.object();
    des.object();

    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });

    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
}
