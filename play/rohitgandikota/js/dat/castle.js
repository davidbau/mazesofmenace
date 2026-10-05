// dat/castle.js — the Castle.
// C ref: dat/castle.lua
//
// A map-based special level: mazegrid init, the fixed castle map centered on
// the maze bounds, shuffled storeroom object classes and court monster
// classes, the wand-of-wishing chest in one random tower, trapdoors along the
// back corridor, soldier garrisons, moat sharks and eels, two mazewalks out
// the east and west gates, and the throne/barracks region fills.

import { lspo_level_flags, lspo_object, lspo_monster, lspo_door,
         lspo_feature, lspo_trap, lspo_engraving,
         lspo_level_init, lspo_map_full, lspo_teleport_region,
         lspo_levregion, lspo_drawbridge, lspo_mazewalk,
         lspo_non_diggable, lspo_region_full,
         selection_area_obj } from '../sp_lev.js';
import { rn2 } from '../rng.js';

const CASTLE_MAP = `
}}}}}}}}}.............................................}}}}}}}}}
}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}
}|.....|-----------------------------------------------|.....|}
}|.....+...............................................+.....|}
}-------------------------------+-----------------------------}
}}}}}}|........|..........+...........|.......S.S.......|}}}}}}
.....}|........|..........|...........|.......|.|.......|}.....
.....}|........------------...........---------S---------}.....
.....}|...{....+..........+.........\\.S.................+......
.....}|........------------...........---------S---------}.....
.....}|........|..........|...........|.......|.|.......|}.....
}}}}}}|........|..........+...........|.......S.S.......|}}}}}}
}-------------------------------+-----------------------------}
}|.....+...............................................+.....|}
}|.....|-----------------------------------------------|.....|}
}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}
}}}}}}}}}.............................................}}}}}}}}}
`.replace(/^\n/, '').replace(/\n$/, '');

// dat/nhlib.lua:8 shuffle() — Fisher-Yates via nh.rn2, drawing from the top.
function shuffle(list) {
    for (let i = list.length - 1; i >= 1; i--) {
        const j = rn2(i + 1);
        const t = list[i]; list[i] = list[j]; list[j] = t;
    }
}

export async function castle_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        teleport_region: lspo_teleport_region,
        levregion: lspo_levregion,
        feature: (t, x, y) => lspo_feature(t, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        drawbridge: lspo_drawbridge,
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        engraving: (o) => lspo_engraving(o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        mazewalk: lspo_mazewalk,
        non_diggable: lspo_non_diggable,
        region: lspo_region_full,
    };

    des.level_init({ style: 'mazegrid', bg: '-' });
    des.level_flags('mazelevel', 'noteleport', 'noflipy');
    des.map(CASTLE_MAP);

    /* Random registers initialisation */
    const object = ['[', ')', '*', '%'];
    shuffle(object);

    const place = selection_area_obj(0, 0, -1, -1);
    place.pts = [];
    place.set(4, 2);
    place.set(58, 2);
    place.set(4, 14);
    place.set(58, 14);

    const monster = ['L', 'N', 'E', 'H', 'M', 'O', 'R', 'T', 'X', 'Z'];
    shuffle(monster);

    des.teleport_region({ region: [1, 0, 10, 20], region_islev: 1,
                          exclude: [1, 1, 61, 15], dir: 'down' });
    des.teleport_region({ region: [69, 0, 79, 20], region_islev: 1,
                          exclude: [1, 1, 61, 15], dir: 'up' });
    des.levregion({ region: [1, 0, 10, 20], region_islev: 1,
                    exclude: [0, 0, 62, 16], type: 'stair-up' });
    des.feature('fountain', 10, 8);

    des.door('closed', 7, 3);
    des.door('closed', 55, 3);
    des.door('locked', 32, 4);
    des.door('locked', 26, 5);
    des.door('locked', 46, 5);
    des.door('locked', 48, 5);
    des.door('locked', 47, 7);
    des.door('closed', 15, 8);
    des.door('closed', 26, 8);
    des.door('locked', 38, 8);
    des.door('locked', 56, 8);
    des.door('locked', 47, 9);
    des.door('locked', 26, 11);
    des.door('locked', 46, 11);
    des.door('locked', 48, 11);
    des.door('locked', 32, 12);
    des.door('closed', 7, 13);
    des.door('closed', 55, 13);

    des.drawbridge({ dir: 'east', state: 'closed', x: 5, y: 8 });

    /* Storeroom number 1 */
    for (const [x, y] of [[39,5],[40,5],[41,5],[42,5],[43,5],[44,5],[45,5],
                          [39,6],[40,6],[41,6],[42,6],[43,6],[44,6],[45,6]])
        des.object(object[0], x, y);
    /* Storeroom number 2 */
    for (const [x, y] of [[49,5],[50,5],[51,5],[52,5],[53,5],[54,5],[55,5],
                          [49,6],[50,6],[51,6],[52,6],[53,6],[54,6],[55,6]])
        des.object(object[1], x, y);
    /* Storeroom number 3 */
    for (const [x, y] of [[39,10],[40,10],[41,10],[42,10],[43,10],[44,10],
                          [45,10],[39,11],[40,11],[41,11],[42,11],[43,11],
                          [44,11],[45,11]])
        des.object(object[2], x, y);
    /* Storeroom number 4 */
    for (const [x, y] of [[49,10],[50,10],[51,10],[52,10],[53,10],[54,10],
                          [55,10],[49,11],[50,11],[51,11],[52,11],[53,11],
                          [54,11],[55,11]])
        des.object(object[3], x, y);

    /* THE WAND OF WISHING in 1 of the 4 towers */
    const loc = place.rndcoord(1);
    des.object({ id: 'chest', trapped: 0, locked: 1, coord: [loc.x, loc.y],
                 contents: () => {
                     des.object('wishing');
                     des.object('potion of gain level');
                 } });
    /* Prevent monsters from eating it.  (@'s never eat objects) */
    des.engraving({ coord: [loc.x, loc.y], type: 'burn', text: 'Elbereth' });
    des.object({ id: 'scroll of scare monster', coord: [loc.x, loc.y],
                 buc: 'cursed' });
    /* The treasure of the lord */
    des.object('chest', 37, 8);

    /* Traps */
    des.trap('trap door', 40, 8);
    des.trap('trap door', 44, 8);
    des.trap('trap door', 48, 8);
    des.trap('trap door', 52, 8);
    des.trap('trap door', 55, 8);

    /* Soldiers guarding the entry hall */
    for (const [x, y] of [[8,6],[9,5],[11,5],[12,6],[8,10],[9,11],[11,11],
                          [12,10]])
        des.monster('soldier', x, y);
    des.monster('lieutenant', 9, 8);
    /* Soldiers guarding the towers */
    for (const [x, y] of [[3,2],[5,2],[57,2],[59,2],[3,14],[5,14],[57,14],
                          [59,14]])
        des.monster('soldier', x, y);
    /* The four dragons that are guarding the storerooms */
    des.monster('D', 47, 5);
    des.monster('D', 47, 6);
    des.monster('D', 47, 10);
    des.monster('D', 47, 11);
    /* Sea monsters in the moat */
    des.monster('giant eel', 5, 7);
    des.monster('giant eel', 5, 9);
    des.monster('giant eel', 57, 7);
    des.monster('giant eel', 57, 9);
    des.monster('shark', 5, 0);
    des.monster('shark', 5, 16);
    des.monster('shark', 57, 0);
    des.monster('shark', 57, 16);
    /* The throne room and the court monsters */
    const courtSpots = [
        [9, 27, 5], [0, 30, 5], [1, 33, 5], [2, 36, 5],
        [3, 28, 6], [4, 31, 6], [5, 34, 6], [6, 37, 6],
        [7, 27, 7], [8, 30, 7], [9, 33, 7], [0, 36, 7],
        [1, 28, 8], [2, 31, 8], [3, 34, 8],
        [4, 27, 9], [5, 30, 9], [6, 33, 9], [7, 36, 9],
        [8, 28, 10], [9, 31, 10], [0, 34, 10], [1, 37, 10],
        [2, 27, 11], [3, 30, 11], [4, 33, 11], [5, 36, 11],
    ];
    for (const [mi, x, y] of courtSpots)
        des.monster(monster[mi], x, y);

    /* MazeWalks */
    des.mazewalk(0, 10, 'west');
    des.mazewalk(62, 6, 'east');
    /* Non diggable walls */
    des.non_diggable(0, 0, 62, 16);

    /* Subrooms */
    des.region({ area: [0, 0, 62, 16], lit: 0 });          /* castle area */
    des.region({ area: [0, 5, 5, 11], lit: 1 });           /* courtyards */
    des.region({ area: [57, 5, 62, 11], lit: 1 });
    des.region({ region: [27, 5, 37, 11], lit: 1, type: 'throne', filled: 2 });
    des.region({ area: [7, 5, 14, 11], lit: 1 });          /* antechamber */
    des.region({ area: [39, 5, 45, 6], lit: 1 });          /* storerooms */
    des.region({ area: [39, 10, 45, 11], lit: 1 });
    des.region({ area: [49, 5, 55, 6], lit: 1 });
    des.region({ area: [49, 10, 55, 11], lit: 1 });
    des.region({ area: [2, 2, 6, 3], lit: 1 });            /* corners */
    des.region({ area: [56, 2, 60, 3], lit: 1 });
    des.region({ area: [2, 13, 6, 14], lit: 1 });
    des.region({ area: [56, 13, 60, 14], lit: 1 });
    des.region({ region: [16, 5, 25, 6], lit: 1, type: 'barracks', filled: 1 });
    des.region({ region: [16, 10, 25, 11], lit: 1, type: 'barracks',
                 filled: 1 });
    des.region({ area: [8, 3, 54, 3], lit: 0 });           /* hallways */
    des.region({ area: [8, 13, 54, 13], lit: 0 });
    des.region({ area: [16, 8, 25, 8], lit: 0 });
    des.region({ area: [39, 8, 55, 8], lit: 0 });
    des.region({ area: [47, 5, 47, 6], lit: 0 });          /* alcoves */
    des.region({ area: [47, 10, 47, 11], lit: 0 });
}
