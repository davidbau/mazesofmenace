// dat/orcus.js — Orcus-town.
// C ref: dat/orcus.lua
//
// A ghost town on a mazegrid: ruined walls with boulder rubble, a sanctum
// altar, a filled morgue and two shops, Orcus and his undead court by the
// down stair, and hell_tweaks over everything outside the town map.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_region_sel, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_altar, lspo_mazewalk,
         lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect, l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { rn2 } from '../rng.js';
import { hell_tweaks } from './nhlib.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const ORCUS_MAP = `
.|....|....|....|..............|....|........
.|....|....|....|..............|....|........
.|....|....|....|--...-+-------|.............
.|....|....|....|..............+.............
.|.........|....|..............|....|........
.--+-...-+----+--....-------...--------.-+---
.....................|.....|.................
.....................|.....|.................
.--+----....-+---....|.....|...----------+---
.|....|....|....|....---+---...|......|......
.|.........|....|..............|......|......
.----...---------.....-----....+......|......
.|........................|....|......|......
.----------+-...--+--|....|....----------+---
.|....|..............|....+....|.............
.|....+.......|......|....|....|.............
.|....|.......|......|....|....|.............
`.replace(/^\n/, '').replace(/\n$/, '');

export async function orcus_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => (typeof lit === 'string')
            ? lspo_region_sel(sel, lit) : lspo_region_full(sel),
        mazewalk: lspo_mazewalk,
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = {
        match: l_selection_match,
        fillrect: l_selection_fillrect,
        area: l_selection_fillrect,
    };

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'shortsighted');

    const tmpbounds = selection.match('-');
    const bnds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmpbounds, bnds);           /* tmpbounds:bounds() */
    const bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1,
                                       bnds.hx - 2, bnds.hy - 1);

    /* A ghost town */
    const orcus1 = des.map({ halign: 'right', valign: 'center',
                             map: ORCUS_MAP, contents: (rm) => {
        des.mazewalk(0, 6, 'west');
        /* Entire main area */
        des.region(selection.area(1, 0, 44, 16), 'unlit');
        des.stair('down', 33, 15);
        /* Wall "ruins" */
        des.object('boulder', 19, 2);
        des.object('boulder', 20, 2);
        des.object('boulder', 21, 2);
        des.object('boulder', 36, 2);
        des.object('boulder', 36, 3);
        des.object('boulder', 6, 4);
        des.object('boulder', 5, 5);
        des.object('boulder', 6, 5);
        des.object('boulder', 7, 5);
        des.object('boulder', 39, 5);
        des.object('boulder', 8, 8);
        des.object('boulder', 9, 8);
        des.object('boulder', 10, 8);
        des.object('boulder', 11, 8);
        des.object('boulder', 6, 10);
        des.object('boulder', 5, 11);
        des.object('boulder', 6, 11);
        des.object('boulder', 7, 11);
        des.object('boulder', 21, 11);
        des.object('boulder', 21, 12);
        des.object('boulder', 13, 13);
        des.object('boulder', 14, 13);
        des.object('boulder', 15, 13);
        des.object('boulder', 14, 14);
        /* Doors */
        des.door('closed', 23, 2);
        des.door('open', 31, 3);
        des.door('nodoor', 3, 5);
        des.door('closed', 9, 5);
        des.door('closed', 14, 5);
        des.door('closed', 41, 5);
        des.door('open', 3, 8);
        des.door('nodoor', 13, 8);
        des.door('open', 41, 8);
        des.door('closed', 24, 9);
        des.door('closed', 31, 11);
        des.door('open', 11, 13);
        des.door('closed', 18, 13);
        des.door('closed', 41, 13);
        des.door('open', 26, 14);
        des.door('closed', 6, 15);
        /* Special rooms */
        des.altar({ x: 24, y: 7, align: 'noalign', type: 'sanctum' });
        des.region({ region: [22, 12, 25, 16], lit: 0, type: 'morgue',
                     filled: 1 });
        des.region({ region: [32, 9, 37, 12], lit: 1, type: 'shop',
                     filled: 1 });
        des.region({ region: [12, 0, 15, 4], lit: 1, type: 'shop',
                     filled: 1 });
        /* Some traps. */
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('fire');
        des.trap('fire');
        des.trap('magic');
        des.trap('magic');
        /* Some random objects */
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
        /* An object that's worth most of a wish
           (this is part of the compensation for the reduced wishes at the
           Castle) */
        if (mathrandom(0, 1) === 1) {
            des.object('magic marker');
        } else {
            des.object('magic lamp');
        }
        /* The resident nasty */
        des.monster('Orcus', 33, 15);
        /* And its preferred companions */
        des.monster('human zombie', 32, 15);
        des.monster('shade', 32, 14);
        des.monster('shade', 32, 16);
        des.monster('vampire', 35, 16);
        des.monster('vampire', 35, 14);
        des.monster('vampire lord', 36, 14);
        des.monster('vampire lord', 36, 15);
        /* Randomly placed companions */
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('shade');
        des.monster('shade');
        des.monster('shade');
        des.monster('shade');
        des.monster('giant zombie');
        des.monster('giant zombie');
        des.monster('giant zombie');
        des.monster('ettin zombie');
        des.monster('ettin zombie');
        des.monster('ettin zombie');
        des.monster('human zombie');
        des.monster('human zombie');
        des.monster('human zombie');
        des.monster('vampire');
        des.monster('vampire');
        des.monster('vampire');
        des.monster('vampire lord');
        des.monster('vampire lord');
        /* A few more for the party */
        des.monster();
        des.monster();
        des.monster();
        des.monster();
        des.monster();
    } });

    des.levregion({ region: [1, 0, 12, 20], region_islev: 1,
                    exclude: [20, 1, 70, 20], exclude_islev: 1,
                    type: 'stair-up' });
    des.levregion({ region: [1, 0, 12, 20], region_islev: 1,
                    exclude: [20, 1, 70, 20], exclude_islev: 1,
                    type: 'branch' });
    des.teleport_region({ region: [1, 0, 12, 20], region_islev: 1,
                          exclude: [20, 1, 70, 20], exclude_islev: 1 });

    const protected_ = l_selection_or(
        selection_not(selection_clone(bounds2)), orcus1);
    hell_tweaks(protected_);
}
