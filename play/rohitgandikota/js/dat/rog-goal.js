// dat/rog-goal.js — the Rogue quest goal level.
// C ref: dat/Rog-goal.lua
//
// The Assassins' fastness: a stair-up levregion on the west edge, The
// Master Key of Thievery under the Master Assassin, a chameleon tin,
// sharks in the pond, and leprechaun/naga/chameleon packs.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_levregion, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const ROG_GOAL_MAP = `-----      -------.......................................|-----------------|
|...|  -----.....|.......................................|.................|
|...----...|.....|.......................................|....---------....|
|.---......---..--.................................------------.......|....|
|...............|..................................|..|...|...----........-|
|.....-----....--.................................|-..--..-|.....----S----| 
|--S---...|....|.................................|-........-|....|........| 
|.........---------.............................|-....}}....-|...|...|....| 
|....|.....S......|............................|-.....}}.....-|..--.------| 
|-----.....--.....|...........................|-...}}}}}}}}...-|....|.....--
|...........--....------S-----...............|-....}}}}}}}}....-|..........|
|............--........|...| |..............--.....}}.}}........----------S-
|.............|........|...| |..............|......}}}}}}}}......|...|.....|
|S-.---.---.---.---.---|...| ------------...--........}}.}}.....--..---....|
|.---.---.---.---.-S-..----- |....|.....|....|-....}}}}}}}}....---..S.|--..|
|...|.......|..........|...---....---...S.....|-...}}}}}}}}...-|.S..|...|..|
|...|..|....|..........|............|..--..----|-.....}}.....-|..----...-S--
|...|---....----.......|----- ......|...---|    |-....}}....-|...|..--.--..|
-----.....---.....--.---....--...--------..|     |-........-|....|.........|
    |.............|..........|.............S...   |S-------|.....|..-----..|
    ----------------------------------------  ......       ----------   ----`;

export async function roggoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        levregion: lspo_levregion,
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noteleport');
    des.map(ROG_GOAL_MAP);
    des.region(selection.area(0, 0, 75, 20), 'lit');
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1,
                    exclude: [1, 18, 4, 20], type: 'stair-up' });
    des.non_diggable(selection.area(0, 0, 75, 20));
    des.trap('spiked pit', 37, 7);
    des.object({ id: 'skeleton key', x: 38, y: 10, buc: 'blessed', spe: 0,
                 name: 'The Master Key of Thievery' });
    des.object({ id: 'tin', x: 26, y: 12, montype: 'chameleon' });
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
    des.object();
    des.object();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.monster({ id: 'Master Assassin', x: 38, y: 10, peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'shark', x: 51, y: 14, peaceful: 0 });
    des.monster({ id: 'shark', x: 53, y: 9, peaceful: 0 });
    des.monster({ id: 'shark', x: 55, y: 15, peaceful: 0 });
    des.monster({ id: 'shark', x: 58, y: 10, peaceful: 0 });
}
