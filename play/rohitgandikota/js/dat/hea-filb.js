// dat/hea-filb.js — Healer quest filler, lower half (at or below the
// locate level).
// C ref: dat/Hea-filb.lua
//
// A lit pool-flooded mines carving with more eels, rats and sea
// monsters, eleven objects.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function heafilb_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: 'P' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false,
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

    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });

    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
