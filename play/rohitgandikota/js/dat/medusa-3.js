// dat/medusa-3.js — Medusa's island, variant 3.
// C ref: dat/medusa-3.lua
//
// Ravens nesting in the trees: three walled nooks, one of which (chosen by
// rndcoord) holds Medusa, the down stairs and the Perseus statue, another a
// decoy statue, the third a fountain. Thirty hostile ravens.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_feature,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_levregion, lspo_teleport_region,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new, selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MEDUSA3_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}T..T.}}}}}}}}}}}}}}}}}}}}..}}}}}}}}.}}}...}}}}}}}.}}}}}......}}}}}}}
}}}}}}.......T.}}}}}}}}}}}..}}}}..T.}}}}}}...T...T..}}...T..}}..-----..}}}}}
}}}...-----....}}}}}}}}}}.T..}}}}}...}}}}}.....T..}}}}}......T..|...|.T..}}}
}}}.T.|...|...T.}}}}}}}.T......}}}}..T..}}.}}}.}}...}}}}}.T.....+...|...}}}}
}}}}..|...|.}}.}}}}}.....}}}T.}}}}.....}}}}}}.T}}}}}}}}}}}}}..T.|...|.}}}}}}
}}}}}.|...|.}}}}}}..T..}}}}}}}}}}}}}T.}}}}}}}}..}}}}}}}}}}}.....-----.}}}}}}
}}}}}.--+--..}}}}}}...}}}}}}}}}}}}}}}}}}}T.}}}}}}}}}}}}}}}}.T.}........}}}}}
}}}}}.......}}}}}}..}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}.}}.T.}}}}}}
}}.T...T...}}}}T}}}}}}}}}}}....}}}}}}}}}}T}}}}}.T}}...}}}}}}}}}}}}}}...}}}}}
}}}...T}}}}}}}..}}}}}}}}}}}.T...}}}}}}}}.T.}.T.....T....}}}}}}}}}}}}}.}}}}}}
}}}}}}}}}}}}}}}....}}}}}}}...}}.}}}}}}}}}}............T..}}}}}.T.}}}}}}}}}}}
}}}}}}}}}}}}}}}}..T..}}}}}}}}}}}}}}..}}}}}..------+--...T.}}}....}}}}}}}}}}}
}}}}.}..}}}}}}}.T.....}}}}}}}}}}}..T.}}}}.T.|...|...|....}}}}}.}}}}}...}}}}}
}}}.T.}...}..}}}}T.T.}}}}}}.}}}}}}}....}}...|...+...|.}}}}}}}}}}}}}..T...}}}
}}}}..}}}.....}}...}}}}}}}...}}}}}}}}}}}}}T.|...|...|}}}}}}}}}}}....T..}}}}}
}}}}}..}}}.T..}}}.}}}}}}}}.T..}}}}}}}}}}}}}}---S-----}}}}}}}}}}}}}....}}}}}}
}}}}}}}}}}}..}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}T..T}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`.replace(/^\n/, '').replace(/\n$/, '');

export async function medusa3_level() {
    const at = (f) => (a, x, y, o) =>
        (x && typeof x === 'object' && !Array.isArray(x))
            ? f(a, x.x, x.y, o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: at(lspo_stair),
        door: (state, x, y) => lspo_door({ state, x, y }),
        feature: at(lspo_feature),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('noteleport', 'mazelevel', 'shortsighted');

    des.map(MEDUSA3_MAP);

    const place = selection_new();
    /* each of these spots are inside a distinct room */
    l_selection_setpoint(place, 8, 6);
    l_selection_setpoint(place, 66, 5);
    l_selection_setpoint(place, 46, 15);

    /* location of Medusa and downstairs and Perseus's statue */
    const medloc = selection_rndcoord(place, 1);
    /* specific location for some other statue in a different
       downstairs-eligible room */
    const altloc = selection_rndcoord(place, 1);
    /* location of a fountain, in the remaining of three downstairs-eligible
       rooms */
    const othloc = selection_rndcoord(place, 1);

    des.region(selection.area(0, 0, 74, 19), 'lit');
    /* fixup_special hack: the first room defined on a Medusa level gets some
       leaderboard statues, use arrival_room to force it to be a room even
       though monsters won't arrive within it */
    des.region({ region: [49, 14, 51, 16], lit: -1, type: 'ordinary',
                 arrival_room: true });
    des.region(selection.area(7, 5, 9, 7), 'unlit');
    des.region(selection.area(65, 4, 67, 6), 'unlit');
    des.region(selection.area(45, 14, 47, 16), 'unlit');
    /* Non diggable walls
       4th room has diggable walls as Medusa is never placed there */
    des.non_diggable(selection.area(6, 4, 10, 8));
    des.non_diggable(selection.area(64, 3, 68, 7));
    des.non_diggable(selection.area(44, 13, 48, 17));
    /* All places are accessible also with jumping, so don't bother
       restricting the placement when teleporting from levels below this. */
    des.teleport_region({ region: [33, 2, 38, 7], dir: 'down' });
    des.levregion({ region: [32, 1, 39, 7], type: 'stair-up' });

    /* place the downstairs at the same spot where Medusa will be placed */
    des.stair('down', medloc);

    des.door('locked', 8, 8);
    des.door('locked', 64, 5);
    des.door('random', 50, 13);
    des.door('locked', 48, 15);

    /* in one of the three designated rooms, but not the one with Medusa plus
       downstairs and also not 'altloc' where a random statue will be placed */
    des.feature('fountain', othloc);

    /* same spot as Medusa plus downstairs */
    des.object({ id: 'statue', coord: [medloc.x, medloc.y], buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: () => {
                     if (percent(75)) {
                         des.object({ id: 'shield of reflection',
                                      buc: 'cursed', spe: 0 });
                     }
                     if (percent(25)) {
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

    /* first random statue is in one of the three designated rooms but not
       the one with Medusa plus downstairs or the one with the fountain */
    des.object({ id: 'statue', coord: [altloc.x, altloc.y], contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });

    for (let i = 1; i <= 8; i++)
        des.object();
    des.object('scroll of blank paper', 48, 18);
    des.object('scroll of blank paper', 48, 18);

    des.trap('rust');
    des.trap('rust');
    des.trap('board');
    des.trap('board');
    des.trap();

    /* place Medusa before placing other monsters so that they won't be able
       to unintentionally steal her spot on the downstairs */
    des.monster({ id: 'Medusa', coord: [medloc.x, medloc.y], asleep: 1 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('jellyfish');
    des.monster('jellyfish');
    des.monster('wood nymph');
    des.monster('wood nymph');
    des.monster('water nymph');
    des.monster('water nymph');

    for (let i = 1; i <= 30; i++)
        des.monster({ id: 'raven', peaceful: 0 });
}
