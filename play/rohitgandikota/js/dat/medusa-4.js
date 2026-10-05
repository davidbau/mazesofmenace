// dat/medusa-4.js — Medusa's island, variant 4.
// C ref: dat/medusa-4.lua
//
// Medusa rules slithery monsters from her iron-barred palace, with a yellow
// dragon nesting in the backyard. Four downstairs-eligible rooms; rndcoord
// picks Medusa's and the decoy statue's.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_levregion, lspo_teleport_region,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new, selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MEDUSA4_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}........}}}}}}}}}}}}}}}}}}}}}}}..}}}.....}}}}}}}}}}}----|}}}}}
}}}}}}..----------F-.....}}}}}}}}}}}}}}}}..---...}}}}....T.}}}}}}}....|}}}}}
}}}.....|...F......S}}}}....}}}}}}}...}}.....|}}.}}}}}}}......}}}}|......}}}
}}}.....+...|..{...|}}}}}}}}}}}}.....}}}}|...|}}}}}}}}}}}.}}}}}}}}----.}}}}}
}}......|...|......|}}}}}}}}}......}}}}}}|.......}}}}}}}}}}}}}..}}}}}...}}}}
}}|-+--F|-+--....|F|-|}}}}}....}}}....}}}-----}}.....}}}}}}}......}}}}.}}}}}
}}|...}}|...|....|}}}|}}}}}}}..}}}}}}}}}}}}}}}}}}}}....}}}}}}}}....T.}}}}}}}
}}|...}}F...+....F}}}}}}}..}}}}}}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}....}}..}}
}}|...}}|...|....|}}}|}....}}}}}}....}}}...}}}}}...}}}}}}}}}}}}}}}}}.....}}}
}}--+--F|-+--....-F|-|....}}}}}}}}}}.T...}}}}....---}}}}}}}}}}}}}}}}}}}}}}}}
}}......|...|......|}}}}}.}}}}}}}}}....}}}}}}}.....|}}}}}}}}}.}}}}}}}}}}}}}}
}}}}....+...|..{...|.}}}}}}}}}}}}}}}}}}}}}}}}}}.|..|}}}}}}}......}}}}...}}}}
}}}}}}..|...F......|...}}}}}}}}}}..---}}}}}}}}}}--.-}}}}}....}}}}}}....}}}}}
}}}}}}}}-----S----F|....}}}}}}}}}|...|}}}}}}}}}}}}...}}}}}}...}}}}}}..}}}}}}
}}}}}}}}}..............T...}}}}}.|.......}}}}}}}}}}}}}}..}...}.}}}}....}}}}}
}}}}}}}}}}....}}}}...}...}}}}}.......|.}}}}}}}}}}}}}}.......}}}}}}}}}...}}}}
}}}}}}}}}}..}}}}}}}}}}.}}}}}}}}}}-..--.}}}}}}}}..}}}}}}..T...}}}..}}}}}}}}}}
}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}}...}}}}}}}....}}}}}}}.}}}..}}}...}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}....}}}}}}}}}}}}}}}}}}}...}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`.replace(/^\n/, '').replace(/\n$/, '');

export async function medusa4_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) =>
            (x && typeof x === 'object' && !Array.isArray(x))
                ? lspo_stair(d, x.x, x.y) : lspo_stair(d, x, y),
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
    des.level_flags('noteleport', 'mazelevel');

    des.map(MEDUSA4_MAP);

    /* place handling is similar to medusa-3.lua except that there are 4
       downstairs-eligible rooms rather than 3, and only 2 of them are used */
    const place = selection_new();
    /* each of these spots are inside a distinct room */
    l_selection_setpoint(place, 4, 8);
    l_selection_setpoint(place, 10, 4);
    l_selection_setpoint(place, 10, 8);
    l_selection_setpoint(place, 10, 12);

    /* location of Medusa and downstairs and Perseus's statue */
    const medloc = selection_rndcoord(place, 1);
    /* specific location for some other statue in a different
       downstairs-eligible room */
    const altloc = selection_rndcoord(place, 1);

    des.region(selection.area(0, 0, 74, 19), 'lit');
    /* fixup_special hack: The first "room" region in Medusa levels gets
       filled with some leaderboard statues, so this needs to be a room;
       setting irregular=1 will force this */
    des.region({ region: [13, 3, 18, 13], lit: 1, type: 'ordinary',
                 irregular: 1 });

    des.teleport_region({ region: [64, 1, 74, 17], dir: 'down' });
    des.teleport_region({ region: [2, 2, 18, 13], dir: 'up' });

    des.levregion({ region: [67, 1, 74, 20], type: 'stair-up' });

    /* place the downstairs at the same spot where Medusa will be placed */
    des.stair('down', medloc);

    des.door('locked', 4, 6);
    des.door('locked', 4, 10);
    des.door('locked', 8, 4);
    des.door('locked', 8, 12);
    des.door('locked', 10, 6);
    des.door('locked', 10, 10);
    des.door('locked', 12, 8);

    des.levregion({ region: [27, 0, 79, 20], type: 'branch' });

    des.non_diggable(selection.area(1, 1, 22, 14));

    des.object('crystal ball', 7, 8);

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

    /* first random statue is in one of the designated stair rooms but not
       the one with Medusa plus downstairs */
    des.object({ id: 'statue', coord: [altloc.x, altloc.y], contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    for (let i = 1; i <= 8; i++)
        des.object();

    for (let i = 1; i <= 7; i++)
        des.trap();

    /* place Medusa before placing other monsters so that they won't be able
       to unintentionally steal her spot on the downstairs */
    des.monster({ id: 'Medusa', coord: [medloc.x, medloc.y], asleep: 1 });
    des.monster('kraken', 7, 7);

    /* the nesting dragon */
    des.monster({ id: 'yellow dragon', x: 5, y: 4, asleep: 1 });
    if (percent(50)) {
        des.monster({ id: 'baby yellow dragon', x: 4, y: 4, asleep: 1 });
    }
    if (percent(25)) {
        des.monster({ id: 'baby yellow dragon', x: 4, y: 5, asleep: 1 });
    }
    des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    if (percent(50)) {
        des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    }
    if (percent(25)) {
        des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    }

    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('jellyfish');
    des.monster('jellyfish');
    for (let i = 1; i <= 14; i++)
        des.monster('S');
    for (let i = 1; i <= 4; i++) {
        des.monster('black naga hatchling');
        des.monster('black naga');
    }
}
