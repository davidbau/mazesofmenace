// dat/wizard1.js — the top (real) Wizard's tower level.
// C ref: dat/wizard1.lua
//
// The Wizard of Yendor asleep in his moated inner sanctum with the Book of
// the Dead, a secret-doored morgue (unfilled), krakens and eels in the
// moat, and hell_tweaks outside the tower map.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_ladder, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_non_passwall, lspo_mazewalk,
         lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { rn2 } from '../rng.js';
import { hell_tweaks } from './nhlib.js';

/* dat/nhlib.lua math.random shim — one-arg form is 1 + rn2(n) */
const mathrandom = (a, b) => (b === undefined) ? 1 + rn2(a) : a + rn2(b + 1 - a);

const WIZARD1_MAP = `
----------------------------x
|.......|..|.........|.....|x
|.......S..|.}}}}}}}.|.....|x
|..--S--|..|.}}---}}.|---S-|x
|..|....|..|.}--.--}.|..|..|x
|..|....|..|.}|...|}.|..|..|x
|..--------|.}--.--}.|..|..|x
|..|.......|.}}---}}.|..|..|x
|..S.......|.}}}}}}}.|..|..|x
|..|.......|.........|..|..|x
|..|.......|-----------S-S-|x
|..|.......S...............|x
----------------------------x
`.replace(/^\n/, '').replace(/\n$/, '');

export async function wizard1_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        door: (o, x, y) => (typeof o === 'object')
            ? lspo_door(o) : lspo_door({ state: o, x, y }),
        ladder: (d, x, y) => lspo_ladder(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        non_passwall: (s) => lspo_non_passwall(s[0], s[1], s[2], s[3]),
        mazewalk: lspo_mazewalk,
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    const tmpbounds = l_selection_match('-');
    const bnds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmpbounds, bnds);           /* tmpbounds:bounds() */
    const bounds2 = l_selection_fillrect(bnds.lx, bnds.ly + 1,
                                         bnds.hx - 2, bnds.hy - 1);

    const wiz1 = des.map({ halign: 'center', valign: 'center',
                           map: WIZARD1_MAP, contents: (rm) => {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        des.region({ region: [12, 1, 20, 9], lit: 0, type: 'morgue',
                     filled: 2, contents: () => {
                         const sdwall = ['south', 'west', 'east'];
                         des.door({ wall: sdwall[mathrandom(sdwall.length)
                                                 - 1],
                                    state: 'secret' });
                     } });
        /* another region to constrain monster arrival */
        des.region({ region: [1, 1, 10, 11], lit: 0, type: 'ordinary',
                     arrival_room: true });
        des.mazewalk(28, 5, 'east');
        des.ladder('down', 6, 5);
        /* Non diggable walls
           Walls inside the moat stay diggable */
        des.non_diggable(selection.area(0, 0, 11, 12));
        des.non_diggable(selection.area(11, 0, 21, 0));
        des.non_diggable(selection.area(11, 10, 27, 12));
        des.non_diggable(selection.area(21, 0, 27, 10));
        /* Non passable walls */
        des.non_passwall(selection.area(0, 0, 11, 12));
        des.non_passwall(selection.area(11, 0, 21, 0));
        des.non_passwall(selection.area(11, 10, 27, 12));
        des.non_passwall(selection.area(21, 0, 27, 10));
        /* The wizard and his guards */
        des.monster({ id: 'Wizard of Yendor', x: 16, y: 5, asleep: 1 });
        des.monster('hell hound', 15, 5);
        des.monster('vampire lord', 17, 5);
        /* The local treasure */
        des.object('Book of the Dead', 16, 5);
        /* Surrounding terror */
        des.monster('kraken', 14, 2);
        des.monster('giant eel', 17, 2);
        des.monster('kraken', 13, 4);
        des.monster('giant eel', 13, 6);
        des.monster('kraken', 19, 4);
        des.monster('giant eel', 19, 6);
        des.monster('kraken', 15, 8);
        des.monster('giant eel', 17, 8);
        des.monster('piranha', 15, 2);
        des.monster('piranha', 19, 8);
        /* Random monsters */
        des.monster('D');
        des.monster('H');
        des.monster('&');
        des.monster('&');
        des.monster('&');
        des.monster('&');
        /* And to make things a little harder. */
        des.trap('board', 16, 4);
        des.trap('board', 16, 6);
        des.trap('board', 15, 5);
        des.trap('board', 17, 5);
        /* Random traps. */
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('magic');
        /* Some random loot. */
        des.object('ruby');
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('+');
        des.object('+');
        des.object('+');
    } });

    const protected_ = l_selection_or(
        selection_not(selection_clone(bounds2)), wiz1);
    hell_tweaks(protected_);
}
