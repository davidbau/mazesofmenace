// dat/medusa-2.js — Medusa's island, variant 2.
// C ref: dat/medusa-2.lua
//
// The west isle holds the up stairs, the east complex Medusa's gallery of
// stone golems and cobra statues, with a titan and electric eels between.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_levregion, lspo_teleport_region } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MEDUSA2_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}}}}}}}}--------------}
}|....|}}}}}}}}}..}.}}..}}}}}}}}}}}}}..}}}}}}-.....--}}}}}}}|............|}
}|....|.}}}}}}}}}}}.}...}}..}}}}}}}}}}}}}}}}}---......}}}}}.|............|}
}S....|.}}}}}}---}}}}}}}}}}}}}}}}}}}}}}}}}}---...|..-}}}}}}.S..----------|}
}|....|.}}}}}}-...}}}}}}}}}.}}...}.}}}}.}}}......----}}}}}}.|............|}
}|....|.}}}}}}-....--}}}}}}}}}}}}}}}}}}}}}}----...--}}}}}}}.|..--------+-|}
}|....|.}}}}}}}......}}}}...}}}}}}.}}}}}}}}}}}---..---}}}}}.|..|..S...|..|}
}|....|.}}}}}}-....-}}}}}}}------}}}}}}}}}}}}}}-...|.-}}}}}.|..|..|...|..|}
}|....|.}}}}}}}}}---}}}}}}}........}}}}}}}}}}---.|....}}}}}.|..|..|...|..|}
}|....|.}}}}}}}}}}}}}}}}}}-....|...-}}}}}}}}--...----.}}}}}.|..|..|...|..|}
}|....|.}}}}}}..}}}}}}}}}}---..--------}}}}}-..---}}}}}}}}}.|..|..-------|}
}|...}|...}}}.}}}}}}...}}}}}--..........}}}}..--}}}}}}}}}}}.|..|.........|}
}|...}S...}}.}}}}}}}}}}}}}}}-..--------}}}}}}}}}}}}}}...}}}.|..--------..S}
}|...}|...}}}}}}}..}}}}}}----..|....-}}}}}}}}}}}}}}}}}..}}}.|............|}
}|....|}}}}}....}}}}..}}.-.......----}}......}}}}}}.......}}|............|}
}------}}}}}}}}}}}}}}}}}}---------}}}}}}}}}}}}}}}}}}}}}}}}}}--------------}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`.replace(/^\n/, '').replace(/\n$/, '');

export async function medusa2_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(MEDUSA2_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 74, 19), 'lit');
    des.region(selection.area(2, 3, 5, 16), 'unlit');
    /* fixup_special hack: the first room defined on a Medusa level gets some
       leaderboard statues; setting the region as irregular makes it a room */
    des.region({ region: [61, 3, 72, 16], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region(selection.area(71, 8, 72, 11), 'unlit');
    /* make the downstairs area a real room to control arriving monsters */
    des.region({ region: [67, 8, 69, 11], lit: 1, type: 'ordinary',
                 arrival_room: true });
    /* Teleport: down to up stairs island, up to Medusa's island */
    des.teleport_region({ region: [2, 3, 5, 16], dir: 'down' });
    des.teleport_region({ region: [61, 3, 72, 16], dir: 'up' });
    /* Stairs */
    des.stair('up', 4, 9);
    des.stair('down', 68, 10);
    /* Doors */
    des.door('locked', 71, 7);
    /* Branch, not allowed on Medusa's island. */
    des.levregion({ type: 'branch', region: [1, 0, 79, 20],
                    exclude: [59, 1, 73, 17] });
    /* Non diggable walls */
    des.non_diggable(selection.area(1, 2, 6, 17));
    des.non_diggable(selection.area(60, 2, 73, 17));
    /* Objects */
    des.object({ id: 'statue', x: 68, y: 10, buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: () => {
                     if (percent(25)) {
                         des.object({ id: 'shield of reflection',
                                      buc: 'cursed', spe: 0 });
                     }
                     if (percent(75)) {
                         des.object({ id: 'levitation boots', spe: 0 });
                     }
                     if (percent(50)) {
                         des.object({ id: 'scimitar', buc: 'blessed',
                                      spe: 2 });
                     }
                     if (percent(50)) {
                         des.object('sack');
                     }
                 } });
    des.object({ id: 'statue', x: 64, y: 8, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 8, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 9, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 9, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 10, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 10, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 11, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 11, contents: 0 });
    des.object('boulder', 4, 4);
    des.object('/', 52, 9);
    des.object('boulder', 52, 9);
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    /* Traps */
    des.trap('magic', 3, 12);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Monsters. */
    des.monster({ id: 'Medusa', x: 68, y: 10, asleep: 1 });
    des.monster('gremlin', 2, 14);
    des.monster('titan', 2, 5);
    des.monster('electric eel', 10, 13);
    des.monster('electric eel', 11, 13);
    des.monster('electric eel', 10, 14);
    des.monster('electric eel', 11, 14);
    des.monster('electric eel', 10, 15);
    des.monster('electric eel', 11, 15);
    des.monster('jellyfish', 1, 1);
    des.monster('jellyfish', 0, 8);
    des.monster('jellyfish', 4, 19);
    des.monster({ id: 'stone golem', x: 64, y: 8, asleep: 1 });
    des.monster({ id: 'stone golem', x: 65, y: 8, asleep: 1 });
    des.monster({ id: 'stone golem', x: 64, y: 9, asleep: 1 });
    des.monster({ id: 'stone golem', x: 65, y: 9, asleep: 1 });
    des.monster({ id: 'cobra', x: 64, y: 10, asleep: 1 });
    des.monster({ id: 'cobra', x: 65, y: 10, asleep: 1 });
    des.monster('A', 72, 8);
    des.monster({ id: 'yellow light', x: 72, y: 11, asleep: 1 });
    des.monster({ x: 17, y: 7 });
    des.monster({ x: 28, y: 11 });
    des.monster({ x: 32, y: 13 });
    des.monster({ x: 49, y: 9 });
    des.monster({ x: 48, y: 7 });
    des.monster({ x: 65, y: 3 });
    des.monster({ x: 70, y: 4 });
    des.monster({ x: 70, y: 15 });
    des.monster({ x: 65, y: 16 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
}
