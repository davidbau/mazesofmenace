// dat/medusa-1.js — Medusa's island, variant 1.
// C ref: dat/medusa-1.lua
//
// Two islands in a great water level: the up stairs on the west isle, and
// Medusa's walled palace on the center isle with the Perseus statue, the
// petrified-adventurer statues, and the sea monsters between.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_levregion, lspo_teleport_region } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MEDUSA1_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}.}}}}}..}}}}}......}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}....}}}...}}}}}
}...}}.....}}}}}....}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}...............}
}....}}}}}}}}}}....}}}..}}}}}}}}}}}.......}}}}}}}}}}}}}}}}..}}.....}}}...}}
}....}}}}}}}}.....}}}}..}}}}}}.................}}}}}}}}}}}.}}}}.....}}...}}
}....}}}}}}}}}}}}.}}}}.}}}}}}.-----------------.}}}}}}}}}}}}}}}}}.........}
}....}}}}}}}}}}}}}}}}}}.}}}...|...............S...}}}}}}}}}}}}}}}}}}}....}}
}.....}.}}....}}}}}}}}}.}}....--------+--------....}}}}}}..}}}}}}}}}}}...}}
}......}}}}..}}}}}}}}}}}}}........|.......|........}}}}}....}}}}}}}}}}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}........|.......|........}}}}}...}}}}}}}}}.}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}....--------+--------....}}}}}}.}.}}}}}}}}}}}}}}}
}......}}}}}}}}}}}}}}}}}}}}...S...............|...}}}}}}}}}}}}}}}}}.}}}}}}}
}.......}}}}}}}..}}}}}}}}}}}}.-----------------.}}}}}}}}}}}}}}}}}....}}}}}}
}........}}.}}....}}}}}}}}}}}}.................}}}}}..}}}}}}}}}.......}}}}}
}.......}}}}}}}......}}}}}}}}}}}}}}.......}}}}}}}}}.....}}}}}}...}}..}}}}}}
}.....}}}}}}}}}}}.....}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}..}}}}}}}}}}....}}}}}}}
}}..}}}}}}}}}}}}}....}}}}}}}}}}}}}}}}}}}}}}...}}..}}}}}}}.}}.}}}}..}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`.replace(/^\n/, '').replace(/\n$/, '');

export async function medusa1_level() {
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

    des.map(MEDUSA1_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 74, 19), 'lit');
    des.region(selection.area(31, 7, 45, 7), 'unlit');
    /* make the downstairs room a real room to control arriving monsters,
       and also as a fixup_special hack; the first room defined on Medusa's
       level receives some statues */
    des.region({ region: [35, 9, 41, 10], lit: 0, type: 'ordinary',
                 arrival_room: true });
    des.region(selection.area(31, 12, 45, 12), 'unlit');
    /* Teleport: down to up stairs island, up to Medusa's island */
    des.teleport_region({ region: [1, 1, 5, 17], dir: 'down' });
    des.teleport_region({ region: [26, 4, 50, 15], dir: 'up' });
    /* Stairs */
    des.stair('up', 5, 14);
    des.stair('down', 36, 10);
    /* Doors */
    des.door('closed', 46, 7);
    des.door('locked', 38, 8);
    des.door('locked', 38, 11);
    des.door('closed', 30, 12);
    /* Branch, not allowed inside Medusa's building. */
    des.levregion({ region: [1, 0, 79, 20], exclude: [30, 6, 46, 13],
                    type: 'branch' });
    /* Non diggable walls */
    des.non_diggable(selection.area(30, 6, 46, 13));
    /* Objects */
    des.object({ id: 'statue', x: 36, y: 10, buc: 'uncursed',
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

    /* Specifying explicit contents forces them to be empty. */
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap('board', 38, 7);
    des.trap('board', 38, 12);
    /* Random monsters */
    des.monster({ id: 'Medusa', x: 36, y: 10, asleep: 1 });
    des.monster('giant eel', 11, 6);
    des.monster('giant eel', 23, 13);
    des.monster('giant eel', 29, 2);
    des.monster('jellyfish', 2, 2);
    des.monster('jellyfish', 0, 8);
    des.monster('jellyfish', 4, 18);
    des.monster('water troll', 51, 3);
    des.monster('water troll', 64, 11);
    des.monster({ class: 'S', x: 38, y: 7 });
    des.monster({ class: 'S', x: 38, y: 12 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
}
