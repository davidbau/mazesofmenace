// dat/valley.js — the Valley of the Dead.
// C ref: dat/valley.lua
//
// Gehennom's first level: a solid-fill cave map with three morgue graveyards,
// Moloch's temple, a fixed down stair, the branch back up to the dungeon,
// piles of adventurer corpses and grave goods at random spots, and the
// resident undead. Three percent(50) rolls rearrange the path walls.

import { lspo_level_flags, lspo_object, lspo_monster, lspo_door,
         lspo_trap, lspo_level_init, lspo_map_full,
         lspo_teleport_region, lspo_levregion, lspo_stair, lspo_altar,
         lspo_non_diggable, lspo_region_full, lspo_terrain } from '../sp_lev.js';
import { selection_new, selection_setpoint } from '../selvar.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';

const VALLEY_MAP = `
----------------------------------------------------------------------------
|...S.|..|.....|  |.....-|      |................|   |...............| |...|
|---|.|.--.---.|  |......--- ----..........-----.-----....---........---.-.|
|   |.|.|..| |.| --........| |.............|   |.......---| |-...........--|
|   |...S..| |.| |.......-----.......------|   |--------..---......------- |
|----------- |.| |-......| |....|...-- |...-----................----       |
|.....S....---.| |.......| |....|...|  |..............-----------          |
|.....|.|......| |.....--- |......---  |....---.......|                    |
|.....|.|------| |....--   --....-- |-------- ----....---------------      |
|.....|--......---BBB-|     |...--  |.......|    |..................|      |
|..........||........-|    --...|   |.......|    |...||.............|      |
|.....|...-||-........------....|   |.......---- |...||.............--     |
|.....|--......---...........--------..........| |.......---------...--    |
|.....| |------| |--.......--|   |..B......----- -----....| |.|  |....---  |
|.....| |......--| ------..| |----..B......|       |.--------.-- |-.....---|
|------ |........|  |.|....| |.....----BBBB---------...........---.........|
|       |........|  |...|..| |.....|  |-.............--------...........---|
|       --.....-----------.| |....-----.....----------     |.........----  |
|        |..|..B...........| |.|..........|.|              |.|........|    |
----------------------------------------------------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

/* dat/nhlib.lua percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

/* selection.line — Bresenham inclusive of both endpoints; map-relative
   points translated to absolute like selection.area */
function sel_line(x1, y1, x2, y2) {
    const sel = selection_new();
    const ox = game.xstart | 0, oy = game.ystart | 0;
    let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const xi = x1 < x2 ? 1 : -1, yi = y1 < y2 ? 1 : -1;
    let x = x1, y = y1;
    if (dx >= dy) {
        let d0 = 2 * dy - dx;
        const ai = 2 * (dy - dx), bi = 2 * dy;
        selection_setpoint(x + ox, y + oy, sel, 1);
        while (x !== x2) {
            if (d0 >= 0) { y += yi; d0 += ai; } else d0 += bi;
            x += xi;
            selection_setpoint(x + ox, y + oy, sel, 1);
        }
    } else {
        let d0 = 2 * dx - dy;
        const ai = 2 * (dx - dy), bi = 2 * dx;
        selection_setpoint(x + ox, y + oy, sel, 1);
        while (y !== y2) {
            if (d0 >= 0) { x += xi; d0 += ai; } else d0 += bi;
            y += yi;
            selection_setpoint(x + ox, y + oy, sel, 1);
        }
    }
    return sel;
}

function sel_point(x, y) {
    const sel = selection_new();
    selection_setpoint(x + (game.xstart | 0), y + (game.ystart | 0), sel, 1);
    return sel;
}

export async function valley_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
        door: (state, x, y) => lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        non_diggable: lspo_non_diggable,
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        terrain: (sel, ch) => {
            if (sel && sel.x !== undefined) {
                lspo_terrain(sel_point(sel.x, sel.y), sel.typ);
            } else {
                lspo_terrain(sel, ch);
            }
        },
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap',
                    'temperate');
    des.map(VALLEY_MAP);

    /* Make the path somewhat unpredictable */
    if (percent(50)) {
        des.terrain(sel_line(50, 8, 53, 8), '-');
        des.terrain(sel_line(40, 8, 43, 8), 'B');
    }
    if (percent(50)) {
        des.terrain({ x: 27, y: 12, typ: '|' });
        des.terrain(sel_line(27, 3, 29, 3), 'B');
        des.terrain({ x: 28, y: 2, typ: '-' });
    }
    if (percent(50)) {
        des.terrain(sel_line(16, 10, 16, 11), '|');
        des.terrain(sel_line(9, 13, 14, 13), 'B');
    }

    /* The shrine to Moloch and the graveyards */
    des.region({ region: [1, 6, 5, 14], lit: 1, type: 'temple', filled: 2 });
    des.region({ region: [19, 1, 24, 8], lit: 0, type: 'morgue', filled: 1,
                 irregular: 1 });
    des.region({ region: [9, 14, 16, 18], lit: 0, type: 'morgue', filled: 1,
                 irregular: 1 });
    des.region({ region: [37, 9, 43, 14], lit: 0, type: 'morgue', filled: 1,
                 irregular: 1 });

    des.stair('down', 1, 1);

    des.levregion({ type: 'branch', region: [66, 17, 66, 17] });
    des.teleport_region({ region: [58, 9, 72, 18], dir: 'down' });

    des.door('locked', 4, 1);
    des.door('locked', 8, 4);
    des.door('locked', 6, 6);

    des.altar({ x: 3, y: 10, align: 'noalign', type: 'shrine' });

    des.non_diggable(0, 0, 75, 19);

    /* the fallen */
    for (const who of ['archeologist', 'archeologist', 'barbarian',
                       'barbarian', 'caveman', 'cavewoman', 'healer',
                       'healer', 'knight', 'knight', 'ranger', 'ranger',
                       'rogue', 'rogue', 'samurai', 'samurai', 'tourist',
                       'tourist', 'valkyrie', 'valkyrie', 'wizard', 'wizard'])
        des.object({ id: 'corpse', montype: who });

    /* their goods */
    for (const cls of ['[', '[', '[', '[', ')', ')', ')', ')'])
        des.object(cls);
    des.object('ruby');
    for (const cls of ['*', '*', '!', '!', '!', '?', '?', '?', '/', '/',
                       '=', '=', '+', '(', '(', '('])
        des.object(cls);

    /* (Not so) Random traps. */
    des.trap('spiked pit', 5, 2);
    des.trap('spiked pit', 14, 5);
    des.trap('sleep gas', 3, 1);
    des.trap('board', 21, 12);
    des.trap('board');
    des.trap('dart', 60, 1);
    des.trap('dart', 26, 17);
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('magic');
    des.trap('magic');

    /* Random monsters. */
    for (let i = 0; i < 6; i++)
        des.monster('ghost');
    for (let i = 0; i < 3; i++)
        des.monster('vampire bat');
    des.monster('L');
    des.monster('V');
    des.monster('V');
    des.monster('V');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
}
