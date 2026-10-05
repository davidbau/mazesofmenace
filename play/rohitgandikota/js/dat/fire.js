// dat/fire.js — the Plane of Fire.
// C ref: dat/fire.lua
//
// Open ground criss-crossed with lava lakes, forty randomly placed
// fire traps, and a fire-themed population placed at random. The "hot" and
// "fumaroles" flags drive the poison-gas venting in mkmaze.c fumaroles().

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_teleport_region, lspo_levregion, lspo_trap,
         lspo_monster, lspo_object } from '../sp_lev.js';

const FIRE_MAP = `
LL.............LL..............L...LL.........LL.................LL...........L
LL....LLLLLLLL............L...L.............LL....LLL.......................LL.
L....LL...................L......................LLLL................LL........
.....L.............LLLL...LL....LL...............LLLLL.............LLL.........
.L.LLLL..............LL....L.....LLL..............LLLL..............LLLL......L
LL..........LLLL...LLLL...LLL....LLL......L........LLLL....LL........LLL......L
LL........LLLLLLL...LL.....L......L......LL.........LL......LL........LL...L...
L.........LL..LLL..LL......LL......LLLL..L.........LL......LLL............LL...
......L..LL....LLLLL.................LLLLLLL.......L......LL............LLLLLL.
......L..L.....LL.LLLL.......L............L........LLLLL.LL......LL.........LL.
......LL........L...LL......LL.............LLL.....L...LLL.......LLL.........L.
.L.....LLLLLL........L.......LLL.............L....LL...L.LLL......LLLLLLL......
LL..........LLLL............LL.L.............L....L...LL.........LLL..LLL......
.L...........................LLLLL...........LL...L...L........LLLL..LLLLLL...L
.L.....LLLL.............LL....LL.......LLL...LL.......L..LLL....LLLLLLL.......L
.........LLL.........LLLLLLLLLLL......LLLLL...L...........LL...LL...LL.........
...........LL.......LL.........LL.......LLL....L..LLL....LL.........LL.........
............LLLLLLLLL...........LL....LLL.......LLLLL.....LL........LL.........
.LL...............L.............LLLLLL............LL...LLLL.........LL.......L.
LL.....L..........................LL....................LL..................LLL
L.....LLL......................LLLLL.........L.........LLLLLLLL..............LL
`.replace(/^\n/, '').replace(/\n$/, '');

export async function fire_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        teleport_region: lspo_teleport_region,
        levregion: lspo_levregion,
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'shortsighted',
                    'hot', 'fumaroles');
    /* The player lands, upon arrival, in the lower-right.  The location of
       the portal to the next level is randomly chosen.  This map has no
       visible outer boundary, and is mostly open area, with lava lakes and
       bunches of fire traps.  It fills the entire mappable area. */
    des.map(FIRE_MAP);
    des.teleport_region({ region: [71, 16, 71, 16] });
    des.levregion({ region: [0, 0, 78, 19], exclude: [67, 13, 78, 19],
                    type: 'portal', name: 'water' });

    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    /* An assortment of fire-appropriate nasties */
    des.monster('red dragon');
    des.monster('balrog');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster('hell hound');
    /* */
    des.monster('fire giant');
    des.monster('barbed devil');
    des.monster('hell hound');
    des.monster('stone golem');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    /* */
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('scorpion');
    des.monster('fire giant');
    /* */
    des.monster('hell hound');
    des.monster('dust vortex');
    des.monster('fire vortex');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('stone golem');
    des.monster('pit viper');
    des.monster('pit viper');
    des.monster('fire vortex');
    /* */
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire giant');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster('fire vortex');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('pit viper');
    /* */
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('minotaur');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('steam vortex');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });
    /* */
    des.monster('fire giant');
    des.monster('barbed devil');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster('fire giant');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    /* */
    des.monster('barbed devil');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('steam vortex');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });

    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
}
