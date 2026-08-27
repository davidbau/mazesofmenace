// dat/hellfill.js - the generic Gehennom filler level.
// C ref: dat/hellfill.lua

import {
    lspo_level_flags, lspo_level_init, lspo_stair, lspo_object,
    lspo_trap, lspo_monster, lspo_gold, lspo_replace_terrain,
    lspo_mazewalk, lspo_terrain, lspo_wallify, lspo_map_full,
    lspo_map_coord, lspo_non_diggable, lspo_region_full,
    lspo_exclusion, lspo_drawbridge, lspo_altar,
    l_selection_match, l_selection_fillrect, l_selection_negate,
    l_selection_grow, l_selection_filter_mapchar, l_selection_rect,
} from '../sp_lev.js';
import { selection_filter_percent, selection_getbounds } from '../selvar.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { Invocation_lev } from '../dungeon.js';
import { hell_tweaks } from './nhlib.js';

const mathrandom = (n) => 1 + rn2(n);
const percent = (n) => rn2(100) < n;

function shuffle(list) {
    for (let i = list.length - 1; i >= 1; --i) {
        const j = rn2(i + 1);
        [list[i], list[j]] = [list[j], list[i]];
    }
}

const rnd_halign = () => ['half-left', 'center', 'half-right'][rn2(3)];
const rnd_valign = () => ['top', 'center', 'bottom'][rn2(3)];
const emptyContents = () => {};
const placeMap = (opts) =>
    (opts.x !== undefined || opts.y !== undefined)
        ? lspo_map_coord(opts) : lspo_map_full(opts);

const hellPrefabs = [
    {
        repeatable: true,
        contents: () => placeMap({
            halign: rnd_halign(), valign: 'center',
            map: `
......
......
......
......
......
......
......
......
......
......
......
......
......
......
......
......`,
            contents: emptyContents,
        }),
    },
    {
        repeatable: true,
        contents: () => placeMap({
            halign: rnd_halign(), valign: 'center',
            map: `
xxxxxx.....xxxxxx
xxxx.........xxxx
xx.............xx
xx.............xx
x...............x
x...............x
.................
.................
.................
.................
.................
x...............x
x...............x
xx.............xx
xx.............xx
xxxx.........xxxx
xxxxxx.....xxxxxx`,
            contents: emptyContents,
        }),
    },
    (coldhell) => placeMap({
        halign: rnd_halign(), valign: rnd_valign(),
        map: `
xxxxxx.xxxxxx
xLLLLLLLLLLLx
xL---------Lx
xL|.......|Lx
xL|.......|Lx
.L|.......|L.
xL|.......|Lx
xL|.......|Lx
xL---------Lx
xLLLLLLLLLLLx
xxxxxx.xxxxxx`,
        contents: () => {
            lspo_non_diggable(2, 2, 10, 8);
            lspo_region_full({ area: [4, 4, 8, 6], lit: 1 });
            lspo_exclusion({ type: 'teleport', region: [2, 2, 10, 8] });
            if (coldhell) {
                lspo_replace_terrain({ region: [1, 1, 11, 9],
                                       fromterrain: 'L', toterrain: 'P' });
            }
            const dblocs = [
                { x: 1, y: 5, dir: 'east', state: 'closed' },
                { x: 11, y: 5, dir: 'west', state: 'closed' },
                { x: 6, y: 1, dir: 'south', state: 'closed' },
                { x: 6, y: 9, dir: 'north', state: 'closed' },
            ];
            shuffle(dblocs);
            for (let i = 0, n = mathrandom(dblocs.length); i < n; ++i)
                lspo_drawbridge(dblocs[i]);

            const mons = ['H', 'T', '@'];
            shuffle(mons);
            for (let i = 0, n = 3 + mathrandom(5); i < n; ++i)
                lspo_monster(mons[0], 6, 5);
        },
    }),
    {
        repeatable: true,
        contents: () => placeMap({
            halign: 'center', valign: 'center',
            map: `
..............................................................
..............................................................
..............................................................
..............................................................
..............................................................`,
            contents: emptyContents,
        }),
    },
    {
        repeatable: true,
        contents: () => placeMap({
            halign: rnd_halign(), valign: rnd_valign(), lit: true,
            map: `
x.....x
.......
.......
.......
.......
.......
x.....x`,
            contents: emptyContents,
        }),
    },
    () => placeMap({
        halign: rnd_halign(), valign: rnd_valign(),
        map: `
BBBBBBB
B.....B
B.....B
B.....B
B.....B
B.....B
BBBBBBB`,
        contents: () => {
            lspo_region_full({ region: [2, 2, 2, 2], type: 'temple',
                               filled: 1, irregular: 1 });
            lspo_altar({ x: 3, y: 3, align: 'noalign',
                         type: percent(75) ? 'altar' : 'shrine' });
        },
    }),
    () => placeMap({
        halign: rnd_halign(), valign: rnd_valign(),
        map: `
..........
..........
..........
...FFFF...
...F..F...
...F..F...
...FFFF...
..........
..........
..........`,
        contents: () => {
            lspo_exclusion({ type: 'teleport', region: [4, 4, 5, 5] });
            const mons = ['Angel', 'D', 'H', 'L'];
            lspo_monster(mons[mathrandom(mons.length) - 1], 4, 4);
        },
    }),
    () => placeMap({
        halign: rnd_halign(), valign: rnd_valign(),
        map: `
.........
.}}}}}}}.
.}}---}}.
.}--.--}.
.}|...|}.
.}--.--}.
.}}---}}.
.}}}}}}}.
.........`,
        contents: () => {
            lspo_exclusion({ type: 'teleport', region: [3, 3, 5, 5] });
            lspo_monster('L', 4, 4);
        },
    }),
    () => {
        const map = percent(30)
            ? `
.....
.LLL.
.LZL.
.LLL.
.....`
            : `
.....
.PPP.
.PWP.
.PPP.
.....`;
        for (let dx = 1; dx <= 5; ++dx) {
            placeMap({ x: dx * 14 - 4, y: 3 + rn2(13), map,
                       contents: emptyContents });
        }
    },
    {
        repeatable: true,
        contents: () => {
            const map = `
...
...
...
...
...
...
...
...
...
...
...
...
...
...
...
...
...`;
            for (let dx = 1; dx <= 3; ++dx) {
                placeMap({ x: 3 + rn2(73), y: 3, map,
                           contents: emptyContents });
            }
        },
    },
];

function rnd_hell_prefab(coldhell) {
    let dorepeat = true;
    let nloops = 0;
    do {
        ++nloops;
        const fab = hellPrefabs[rn2(hellPrefabs.length)];
        if (typeof fab === 'function') {
            fab(coldhell);
            dorepeat = false;
        } else {
            fab.contents(coldhell);
            dorepeat = !(fab.repeatable && rn2(nloops * 2 + 1) === 0);
        }
    } while (dorepeat && nloops <= 5);
}

function populate_maze() {
    for (let i = 1, n = mathrandom(8) + 11; i <= n; ++i)
        lspo_object(percent(50) ? '*' : undefined);

    for (let i = 1, n = mathrandom(10) + 2; i <= n; ++i)
        lspo_object('`');

    for (let i = 1, n = mathrandom(3); i <= n; ++i)
        lspo_monster({ id: 'minotaur', peaceful: 0 });

    for (let i = 1, n = mathrandom(5) + 7; i <= n; ++i)
        lspo_monster({ peaceful: 0 });

    for (let i = 1, n = mathrandom(6) + 7; i <= n; ++i)
        lspo_gold({});

    for (let i = 1, n = mathrandom(6) + 7; i <= n; ++i)
        lspo_trap();
}

function init_hell_style(style) {
    let cwid, outsideWalls, wwid;

    switch (style) {
    case 1:
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'mines', fg: '.', smoothed: true,
                          joined: true, lit: 0, walled: true });
        lspo_replace_terrain({ fromterrain: ' ', toterrain: 'L' });
        lspo_replace_terrain({ fromterrain: '.', toterrain: 'L', chance: 5 });
        lspo_replace_terrain({ mapfragment: 'w', toterrain: 'L', chance: 20 });
        lspo_replace_terrain({ mapfragment: 'w', toterrain: '.', chance: 15 });
        break;

    case 2: {
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'mazegrid', bg: '-' });
        lspo_mazewalk({ x: 1, y: 10, dir: 'east', stocked: false });
        const bounds = { lx: 0, ly: 0, hx: 0, hy: 0 };
        selection_getbounds(l_selection_match('-'), bounds);
        const protectedArea = l_selection_fillrect(
            bounds.lx, bounds.ly + 1, bounds.hx - 2, bounds.hy - 1);
        hell_tweaks(l_selection_negate(protectedArea));
        if (percent(25))
            rnd_hell_prefab(false);
        break;
    }

    case 3:
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'maze', wallthick: 1 });
        break;

    case 4: {
        cwid = mathrandom(4);
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'maze', wallthick: 1, corrwid: cwid });
        outsideWalls = l_selection_match(' ');
        const wallterrain = ['F', 'L'];
        const j = rn2(2);
        [wallterrain[1], wallterrain[j]] = [wallterrain[j], wallterrain[1]];
        lspo_replace_terrain({ mapfragment: 'w', toterrain: wallterrain[0] });
        if (cwid === 1) {
            if (wallterrain[0] === 'F' && percent(80)) {
                lspo_replace_terrain({ mapfragment: '.\nF\n.', toterrain: '.',
                                       chance: 25 * mathrandom(4) });
            } else if (percent(25)) {
                rnd_hell_prefab(false);
            }
        }
        lspo_terrain(outsideWalls, ' ');
        break;
    }

    case 5:
        wwid = 1 + mathrandom(2);
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'maze', wallthick: wwid,
                          corrwid: mathrandom(2) });
        if (percent(50)) {
            outsideWalls = l_selection_match(' ');
            lspo_replace_terrain({ mapfragment: 'w', toterrain: 'L' });
            lspo_terrain(outsideWalls, ' ');
            if (wwid === 3 && percent(40)) {
                const sel = l_selection_match('LLL\nLLL\nLLL');
                lspo_terrain(selection_filter_percent(
                    sel, 30 * mathrandom(4)), 'Z');
            }
        }
        break;

    case 6: {
        cwid = mathrandom(4);
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip', 'cold');
        lspo_level_init({ style: 'maze', wallthick: 1, corrwid: cwid });
        outsideWalls = l_selection_match(' ');
        let icey = selection_filter_percent(l_selection_negate(), 10);
        icey = l_selection_grow(icey);
        icey = l_selection_filter_mapchar(icey, '.');
        lspo_terrain(icey, 'I');
        if (cwid > 1)
            lspo_terrain(selection_filter_percent(icey, 1), 'W');
        lspo_terrain(selection_filter_percent(icey, 5), 'P');
        if (percent(25))
            lspo_terrain(l_selection_match('w'), 'W');
        if (cwid === 1 && percent(25))
            rnd_hell_prefab(true);
        lspo_terrain(outsideWalls, ' ');
        break;
    }

    case 7: {
        const wallTerrain = percent(50) ? ' ' : 'L';
        lspo_level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        lspo_level_flags('mazelevel', 'noflip');
        lspo_level_init({ style: 'mines', fg: '.', bg: wallTerrain,
                          smoothed: true, joined: true, lit: 0 });
        lspo_terrain(l_selection_grow(l_selection_match('.')), '.');
        lspo_terrain(l_selection_rect(0, 0, 78, 20), wallTerrain);
        lspo_wallify();
        break;
    }
    }
}

export async function hellfill_level() {
    init_hell_style(mathrandom(7));

    lspo_stair('up');
    if (Invocation_lev(game.u.uz))
        lspo_trap('vibrating square');
    else
        lspo_stair('down');

    populate_maze();
}
