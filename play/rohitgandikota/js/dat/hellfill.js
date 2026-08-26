// dat/hellfill.js - the generic Gehennom filler level.
// C ref: dat/hellfill.lua

import {
    lspo_level_flags, lspo_level_init, lspo_stair, lspo_object,
    lspo_trap, lspo_monster, lspo_gold, lspo_replace_terrain,
    lspo_mazewalk, lspo_terrain, lspo_wallify,
    l_selection_match, l_selection_fillrect, l_selection_negate,
    l_selection_grow, l_selection_filter_mapchar, l_selection_rect,
} from '../sp_lev.js';
import { selection_filter_percent, selection_getbounds } from '../selvar.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { hell_tweaks } from './nhlib.js';

const mathrandom = (n) => 1 + rn2(n);
const percent = (n) => rn2(100) < n;

function note_unported(what) {
    (game.unported ||= new Set()).add(`hellfill:${what}`);
}

function rnd_hell_prefab() {
    note_unported('rnd_hell_prefab');
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
    const inv = game.inv_pos;
    if (inv && game.u.uz.dnum === inv.dnum && game.u.uz.dlevel === inv.dlevel)
        lspo_trap('vibrating square');
    else
        lspo_stair('down');

    populate_maze();
}
