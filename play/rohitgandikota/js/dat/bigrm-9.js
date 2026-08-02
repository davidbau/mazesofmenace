// dat/bigrm-9.js — big room variant 9.
// C ref: dat/bigrm-9.lua
//
// A map-based special level: solidfill init, an eye-shaped big room whose
// "pupil" is a lava pool, four region calls (the whole level unlit, then three
// progressively wider lit bands around the pupil), both stairs, non-diggable,
// then 15 objects, 6 traps and 28 monsters placed at random.
//
// Unlike bigrm-7 this one takes "noflip" and has NO replace_terrain, so it
// draws nothing before the object/trap/monster loops.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_non_diggable, lspo_object,
         lspo_trap, lspo_monster } from '../sp_lev.js';

const BIGRM9_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}
}}}}}}}}}}......................................................}}}}}}}}}}
}}}}}}}............................................................}}}}}}}
}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}
}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}
}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}
}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}
}}}}}}}............................................................}}}}}}}
}}}}}}}}}}......................................................}}}}}}}}}}
}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`;

export async function bigrm9_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (o) => lspo_region_full(o),
        stair: (d) => lspo_stair(d),
        non_diggable: (sel) => lspo_non_diggable(sel),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: () => lspo_trap(),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');
    des.map(BIGRM9_MAP);

    /* Unlit, except 3 mapgrids around the "pupil" */
    des.region({ area: [0, 0, 73, 18], lit: 0 });
    des.region({ area: [26, 4, 47, 14], lit: 1 });
    des.region({ area: [21, 5, 51, 13], lit: 1 });
    des.region({ area: [19, 6, 54, 12], lit: 1 });

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();
}
