// dat/minend-2.js — Mine end variant 2, "Gnome King's Wine Cellar".
// C ref: dat/minend-2.lua
//
// Four percent() rolls rearrange the passages, the Trespassers engravings
// guard the booze cellar, and the gem treasure chamber on the east holds
// the luckstone prize.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_feature,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_engraving, lspo_terrain, lspo_teleport_region,
         l_selection_setpoint, l_selection_fillrect } from '../sp_lev.js';
import { selection_new } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MINEND2_MAP = `
---------------------------------------------------------------------------
|...................................................|                     |
|.|---------S--.--|...|--------------------------|..|                     |
|.||---|   |.||-| |...|..........................|..|                     |
|.||...| |-|.|.|---...|.............................|                ..   |
|.||...|-|.....|....|-|..........................|..|.               ..   |
|.||.....|-S|..|....|............................|..|..                   |
|.||--|..|..|..|-|..|----------------------------|..|-.                   |
|.|   |..|..|....|..................................|...                  |
|.|   |..|..|----|..-----------------------------|..|....                 |
|.|---|..|--|.......|----------------------------|..|.....                |
|...........|----.--|......................|     |..|.......              |
|-----------|...|.| |------------------|.|.|-----|..|.....|..             |
|-----------|.{.|.|--------------------|.|..........|.....|....           |
|...............|.S......................|-------------..-----...         |
|.--------------|.|--------------------|.|.........................       |
|.................|                    |.....................|........    |
---------------------------------------------------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minend2_level() {
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
        feature: at(lspo_feature),
        object: at(lspo_object),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        engraving: (coord, type, text) => lspo_engraving({ coord, type,
                                                           text }),
        /* des.terrain({x,y}, ch) — the coord form goes through
           get_location_coord like the C (sp_lev.c:5008) */
        terrain: (sel, ch) => Array.isArray(sel) && sel.length === 2
            ? lspo_terrain(l_selection_setpoint(selection_new(),
                                                sel[0], sel[1]), ch)
            : lspo_terrain(sel, ch),
        teleport_region: lspo_teleport_region,
    };
    /* des.terrain(selection.area(...), ch) needs a real selection here */
    const selection = {
        area: (x1, y1, x2, y2) => [x1, y1, x2, y2],
    };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MINEND2_MAP);

    if (percent(50)) {
        des.terrain([55, 14], '-');
        des.terrain([56, 14], '-');
        des.terrain([61, 15], '|');
        des.terrain([52, 5], 'S');
        des.door('locked', 52, 5);
    }
    if (percent(50)) {
        des.terrain([18, 1], '|');
        des.terrain(l_selection_fillrect(7, 12, 8, 13), '.');
    }
    if (percent(50)) {
        des.terrain([49, 4], '|');
        des.terrain([21, 5], '.');
    }
    if (percent(50)) {
        if (percent(50)) {
            des.terrain([22, 1], '|');
        } else {
            des.terrain([50, 7], '-');
            des.terrain([51, 7], '-');
        }
    }

    /* uncontrolled arrival (via trap door, level teleport) will be in the
       central portion of level to prevent ending up stuck in the treasure
       area, whether arriving from above or below */
    des.teleport_region({ region: [23, 3, 48, 16], region_islev: 1 });

    /* Dungeon Description */
    des.feature('fountain', [14, 13]);
    des.region(selection.area(23, 3, 48, 6), 'lit');
    des.region(selection.area(21, 6, 22, 6), 'lit');
    des.region(selection.area(14, 4, 14, 4), 'unlit');
    des.region(selection.area(10, 5, 14, 8), 'unlit');
    des.region(selection.area(10, 9, 11, 9), 'unlit');
    des.region(selection.area(15, 8, 16, 8), 'unlit');
    /* Secret doors */
    des.door('locked', 12, 2);
    des.door('locked', 11, 6);
    /* Stairs */
    des.stair('up', 36, 4);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 52, 17));
    des.non_diggable(selection.area(53, 0, 74, 0));
    des.non_diggable(selection.area(53, 17, 74, 17));
    des.non_diggable(selection.area(74, 1, 74, 16));
    des.non_diggable(selection.area(53, 7, 55, 7));
    des.non_diggable(selection.area(53, 14, 61, 14));
    /* The Gnome King's wine cellar.
       the Trespassers sign is a long-running joke */
    des.engraving([12, 3], 'engrave',
                  "You are now entering the Gnome King's wine cellar.");
    des.engraving([12, 4], 'engrave', 'Trespassers will be persecuted!');
    des.object('potion of booze', 10, 7);
    des.object('potion of booze', 10, 7);
    des.object('!', 10, 7);
    des.object('potion of booze', 10, 8);
    des.object('potion of booze', 10, 8);
    des.object('!', 10, 8);
    des.object('potion of booze', 10, 9);
    des.object('potion of booze', 10, 9);
    des.object('potion of object detection', 10, 9);
    /* Objects
       The Treasure chamber... */
    des.object('diamond', 69, 4);
    des.object('*', 69, 4);
    des.object('diamond', 69, 4);
    des.object('*', 69, 4);
    des.object('emerald', 70, 4);
    des.object('*', 70, 4);
    des.object('emerald', 70, 4);
    des.object('*', 70, 4);
    des.object('emerald', 69, 5);
    des.object('*', 69, 5);
    des.object('ruby', 69, 5);
    des.object('*', 69, 5);
    des.object('ruby', 70, 5);
    des.object('amethyst', 70, 5);
    des.object('*', 70, 5);
    des.object('amethyst', 70, 5);
    des.object({ id: 'luckstone', x: 70, y: 5, buc: 'not-cursed',
                 achievement: 1 });
    /* Scattered gems... */
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
    /* Random monsters. */
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
