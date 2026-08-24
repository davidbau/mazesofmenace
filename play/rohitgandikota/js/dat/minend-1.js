// dat/minend-1.js — Mine end variant 1, "Mimic of the Mines".
// C ref: dat/minend-1.lua
//
// The gem-niche mines end: seven shuffled niches behind secret doors, four
// of them guarded by mimics posing as luckstone/loadstone/flint/touchstone,
// the real luckstone prize in the fifth, one left empty.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}

const MINEND1_MAP = `
------------------------------------------------------------------   ------
|                        |.......|     |.......-...|       |.....|.       |
|    ---------        ----.......-------...........|       ---...-S-      |
|    |.......|        |..........................-S-      --.......|      |
|    |......-------   ---........................|.       |.......--      |
|    |..--........-----..........................|.       -.-..----       |
|    --..--.-----........-.....................---        --..--          |
|     --..--..| -----------..................---.----------..--           |
|      |...--.|    |..S...S..............---................--            |
|     ----..-----  ------------........--- ------------...---             |
|     |.........--            ----------              ---...-- -----      |
|    --.....---..--                           --------  --...---...--     |
| ----..-..-- --..---------------------      --......--  ---........|     |
|--....-----   --..-..................---    |........|    |.......--     |
|.......|       --......................S..  --......--    ---..----      |
|--.--.--        ----.................---     ------..------...--         |
| |....S..          |...............-..|         ..S...........|          |
--------            --------------------           ------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minend1_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        object: at(lspo_object),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MINEND1_MAP);

    /* Dungeon Description */
    const place = [[8, 16], [13, 7], [21, 8], [41, 14], [50, 4], [50, 16],
                   [66, 1]];
    shuffle(place);

    /* make the entry chamber a real room; it affects monster arrival */
    des.region({ region: [26, 1, 32, 1], lit: 0, type: 'ordinary',
                 irregular: 1, arrival_room: true });
    des.region(selection.area(20, 8, 21, 8), 'unlit');
    des.region(selection.area(23, 8, 25, 8), 'unlit');
    /* Secret doors */
    des.door('locked', 7, 16);
    des.door('locked', 22, 8);
    des.door('locked', 26, 8);
    des.door('locked', 40, 14);
    des.door('locked', 50, 3);
    des.door('locked', 51, 16);
    des.door('locked', 66, 2);
    /* Stairs */
    des.stair('up', 36, 4);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 74, 17));
    /* Niches
       Note: place[6] empty */
    des.object('diamond', place[6]);
    des.object('emerald', place[6]);
    des.object('worthless piece of violet glass', place[6]);
    des.monster({ class: 'm', coord: place[6], appear_as: 'obj:luckstone' });
    des.object('worthless piece of white glass', place[0]);
    des.object('emerald', place[0]);
    des.object('amethyst', place[0]);
    des.monster({ class: 'm', coord: place[0], appear_as: 'obj:loadstone' });
    des.object('diamond', place[1]);
    des.object('worthless piece of green glass', place[1]);
    des.object('amethyst', place[1]);
    des.monster({ class: 'm', coord: place[1], appear_as: 'obj:flint' });
    des.object('worthless piece of white glass', place[2]);
    des.object('emerald', place[2]);
    des.object('worthless piece of violet glass', place[2]);
    des.monster({ class: 'm', coord: place[2], appear_as: 'obj:touchstone' });
    des.object('worthless piece of red glass', place[3]);
    des.object('ruby', place[3]);
    des.object('loadstone', place[3]);
    des.object('ruby', place[4]);
    des.object('worthless piece of red glass', place[4]);
    des.object({ id: 'luckstone', coord: place[4], buc: 'not-cursed',
                 achievement: 1 });
    /* Random objects */
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('(');
    des.object('(');
    des.object();
    des.object();
    des.object();
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters */
    des.monster('gnome king');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnomish wizard');
    des.monster('gnomish wizard');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('hobbit');
    des.monster('hobbit');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('h');
}
