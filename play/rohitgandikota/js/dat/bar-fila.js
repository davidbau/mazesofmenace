// dat/bar-fila.js — Barbarian quest filler, upper half (above the locate
// level).
// C ref: dat/Bar-fila.lua
//
// An unlit joined cavern carved fg-on-fg (everything room), with eight
// random objects, four traps, hostile ogres and a rock troll.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';

export async function barfila_level() {
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

    des.level_init({ style: 'mines', fg: '.', bg: '.',
                     smoothed: true, joined: true, lit: 0, walled: false });

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

    des.trap();
    des.trap();
    des.trap();
    des.trap();

    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
}
