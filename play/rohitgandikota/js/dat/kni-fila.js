// dat/kni-fila.js — Knight quest filler, upper half (above the locate
// level).
// C ref: dat/Kni-fila.lua
//
// A lit swamp field (pools background, unjoined blobs joined), quasits,
// an imp and an ochre jelly.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function knifila_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: '.' });

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

    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });

    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
