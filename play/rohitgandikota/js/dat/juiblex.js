// dat/juiblex.js — Juiblex's Swamp.
// C ref: dat/juiblex.lua
//
// A swamp-filled level: two guaranteed open pockets with boulders, the
// central lair with its fountain-mimics, Juiblex amid shuffled blobby
// monster classes, lemures, and swamp liquids.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_feature, lspo_object, lspo_trap,
         lspo_monster, lspo_levregion, lspo_teleport_region,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new, selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}

const JUIBLEX_POCKET_W = `
xxxxxxxx
xx...xxx
xxx...xx
xxxx.xxx
xxxxxxxx
`.replace(/^\n/, '').replace(/\n$/, '');

const JUIBLEX_POCKET_E = `
xxxxxxxx
xxxx.xxx
xxx...xx
xx...xxx
xxxxxxxx
`.replace(/^\n/, '').replace(/\n$/, '');

const JUIBLEX_LAIR = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxx}}}}}xxxx
xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxx}.....}xxx
xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxx}..P.P..}xx
xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxx}.....}xxx
xxxxxxxxxxxxxxxxxxxxx}}.P.P.}}xxxxxxxxxxxx}...}xxxx
xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxxx}...}xxxx
xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxxxxx}}}xxxxx
xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx
xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`.replace(/^\n/, '').replace(/\n$/, '');

export async function juiblex_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        feature: at(lspo_feature),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };

    des.level_flags('mazelevel', 'shortsighted', 'noflip', 'temperate');
    des.level_init({ style: 'swamp', lit: 0 });
    /* guarantee at least one open spot to ensure successful stair
       placement */
    des.map({ halign: 'left', valign: 'bottom', map: JUIBLEX_POCKET_W });
    des.object('boulder');
    des.map({ halign: 'right', valign: 'top', map: JUIBLEX_POCKET_E });
    des.object('boulder');
    /* lair */
    des.map(JUIBLEX_LAIR);
    /* Random registers */
    const monster = ['j', 'b', 'P', 'F'];
    shuffle(monster);

    const place = selection_new();
    l_selection_setpoint(place, 4, 2);
    l_selection_setpoint(place, 46, 2);
    l_selection_setpoint(place, 4, 15);
    l_selection_setpoint(place, 46, 15);

    /* Dungeon description */
    des.region({ region: [0, 0, 50, 17], lit: 0, type: 'swamp', filled: 2 });
    des.levregion({ region: [1, 0, 11, 20], region_islev: 1,
                    exclude: [0, 0, 50, 17], type: 'stair-down' });
    des.levregion({ region: [69, 0, 79, 20], region_islev: 1,
                    exclude: [0, 0, 50, 17], type: 'stair-up' });
    des.levregion({ region: [1, 0, 11, 20], region_islev: 1,
                    exclude: [0, 0, 50, 17], type: 'branch' });
    des.teleport_region({ region: [1, 0, 11, 20], region_islev: 1,
                          exclude: [0, 0, 50, 17], dir: 'up' });
    des.teleport_region({ region: [69, 0, 79, 20], region_islev: 1,
                          exclude: [0, 0, 50, 17], dir: 'down' });
    {
        const c = selection_rndcoord(place, 1);
        des.feature('fountain', [c.x, c.y]);
    }
    {
        const c = selection_rndcoord(place, 1);
        des.monster({ id: 'giant mimic', coord: [c.x, c.y],
                      appear_as: 'ter:fountain' });
    }
    {
        const c = selection_rndcoord(place, 1);
        des.monster({ id: 'giant mimic', coord: [c.x, c.y],
                      appear_as: 'ter:fountain' });
    }
    {
        const c = selection_rndcoord(place, 1);
        des.monster({ id: 'giant mimic', coord: [c.x, c.y],
                      appear_as: 'ter:fountain' });
    }
    /* The demon of the swamp */
    des.monster('Juiblex', 25, 8);
    /* And a couple demons */
    des.monster('lemure', 43, 8);
    des.monster('lemure', 44, 8);
    des.monster('lemure', 45, 8);
    /* Some liquids and gems */
    des.object('*', 43, 6);
    des.object('*', 45, 6);
    des.object('!', 43, 9);
    des.object('!', 44, 9);
    des.object('!', 45, 9);
    /* And lots of blobby monsters */
    des.monster(monster[3], 25, 6);
    des.monster(monster[0], 24, 7);
    des.monster(monster[1], 26, 7);
    des.monster(monster[2], 23, 8);
    des.monster(monster[2], 27, 8);
    des.monster(monster[1], 24, 9);
    des.monster(monster[0], 26, 9);
    des.monster(monster[3], 25, 10);
    des.monster('j');
    des.monster('j');
    des.monster('j');
    des.monster('j');
    des.monster('P');
    des.monster('P');
    des.monster('P');
    des.monster('P');
    des.monster('b');
    des.monster('b');
    des.monster('b');
    des.monster('F');
    des.monster('F');
    des.monster('F');
    des.monster('m');
    des.monster('m');
    des.monster('jellyfish');
    des.monster('jellyfish');
    /* Some random objects */
    des.object('!');
    des.object('!');
    des.object('!');
    des.object('%');
    des.object('%');
    des.object('%');
    des.object('boulder');
    /* Some traps */
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('magic');
    des.trap('magic');
}
