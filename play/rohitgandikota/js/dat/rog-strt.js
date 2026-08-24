// dat/rog-strt.js — the Rogue quest start level.
// C ref: dat/Rog-strt.lua
//
// Ransmannsby's alleys (nommap): the down stair hides at one of four
// shuffled exits, the other three are mimics posing as stairwells, thug
// guards ring the Master of Thieves, and nymph/leprechaun/chameleon
// packs wander the flood-filled streets.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_stair, lspo_levregion, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable,
         l_selection_flood } from '../sp_lev.js';
import { selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}
/* dat/nhlib.lua:29 d() — dice, faces: sum of math.random(1, faces) */
function d(dice, faces) {
    let sum = 0;
    for (let i = 1; i <= dice; i++)
        sum += 1 + rn2(faces);
    return sum;
}
/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const ROG_STRT_MAP = `---------------------------------.------------------------------------------
|.....|.||..........|....|......|.|.........|.......+............---.......|
|.....|..+..........+....---....S.|...-S-----.-----.|............+.+.......|
|.....+.||........---......|....|.|...|.....|.|...|.---.....------.--------|
|-----|.-------|..|........------.-----.....|.--..|...-------..............|
|.....|........------+------..........+.....|..--S---.........------.-----..
|.....|.------...............-----.}}.--------.|....-------.---....|.+...--|
|..-+--.|....|-----.--------.|...|.....+.....|.|....|.....+.+......|.--....|
|..|....|....|....+.|......|.|...-----.|.....|.--...|.....|.|......|..|....|
|..|.-----S----...|.+....-----...|...|.----..|..|.---....--.---S-----.|----|
|..|.|........|...------.|.S.....|...|....-----.+.|......|..|.......|.|....|
|---.-------..|...|....|.|.|.....|...----.|...|.|---.....|.|-.......|.---..|
...........|..S...|....---.----S----..|...|...+.|..-------.---+-....|...--+|
|---------.---------...|......|....S..|.---...|.|..|...........----.---....|
|........|.........|...+.------....|---.---...|.--+-.----.----....|.+...--+|
|........|.---+---.|----.--........|......-----......|..|..|.--+-.|.-S-.|..|
|........|.|.....|........----------.----.......---.--..|-.|....|.-----.|..|
|----....+.|.....----+---............|..|--------.+.|...SS.|....|.......|..|
|...--+-----.....|......|.------------............---...||.------+--+----..|
|..........S.....|......|.|..........S............|.....||...|.....|....|..|
-------------------------.--------------------------------------------------`;

export async function rogstrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        /* des.stair({ dir=..., coord=... }) — table form */
        stair: (dd, x, y) => (typeof dd === 'object')
            ? lspo_stair(dd.dir, Array.isArray(dd.coord) ? dd.coord[0]
                                                         : dd.coord.x,
                         Array.isArray(dd.coord) ? dd.coord[1]
                                                 : dd.coord.y)
            : lspo_stair(dd, x, y),
        levregion: lspo_levregion,
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap');

    des.map(ROG_STRT_MAP);
    /* Dungeon Description */

    const streets = l_selection_flood(0, 12);

    /* The down stairs is at one of the 4 "exits".  The others are mimics,
       mimicking stairwells. */
    const place = [[33, 0], [0, 12], [25, 20], [75, 5]];
    shuffle(place);

    des.stair({ dir: 'down', coord: place[0] });
    des.monster({ id: 'giant mimic', coord: place[1],
                  appear_as: 'ter:staircase down' });
    des.monster({ id: 'large mimic', coord: place[2],
                  appear_as: 'ter:staircase down' });
    des.monster({ id: 'small mimic', coord: place[3],
                  appear_as: 'ter:staircase down' });
    /* Portal arrival point */
    des.levregion({ region: [19, 9, 19, 9], type: 'branch' });
    /* Doors (secret) */
    des.door('locked', 32, 2);
    des.door('locked', 63, 9);
    des.door('locked', 27, 10);
    des.door('locked', 31, 12);
    des.door('locked', 35, 13);
    des.door('locked', 69, 15);
    des.door('locked', 56, 17);
    des.door('locked', 57, 17);
    des.door('locked', 11, 19);
    des.door('locked', 37, 19);
    des.door('locked', 39, 2);
    des.door('locked', 49, 5);
    des.door('locked', 10, 9);
    des.door('locked', 14, 12);
    /* Doors (regular) */
    des.door('closed', 52, 1);
    des.door('closed', 9, 2);
    des.door('closed', 20, 2);
    des.door('closed', 65, 2);
    des.door('closed', 67, 2);
    des.door('closed', 6, 3);
    des.door('closed', 21, 5);
    des.door('closed', 38, 5);
    des.door('closed', 69, 6);
    des.door('closed', 4, 7);
    des.door('closed', 39, 7);
    des.door('closed', 58, 7);
    des.door('closed', 60, 7);
    des.door('closed', 18, 8);
    des.door('closed', 20, 9);
    des.door('closed', 48, 10);
    des.door('closed', 46, 12);
    des.door('closed', 62, 12);
    des.door('closed', 74, 12);
    des.door('closed', 23, 14);
    des.door('closed', 23, 14);
    des.door('closed', 50, 14);
    des.door('closed', 68, 14);
    des.door('closed', 74, 14);
    des.door('closed', 14, 15);
    des.door('closed', 63, 15);
    des.door('closed', 9, 17);
    des.door('closed', 21, 17);
    des.door('closed', 50, 17);
    des.door('closed', 6, 18);
    des.door('closed', 65, 18);
    des.door('closed', 68, 18);
    /* Master of Thieves */
    des.monster({ id: 'Master of Thieves', coord: [36, 11],
                  inventory: () => {
        des.object({ id: 'leather armor', spe: 5 });
        des.object({ id: 'silver dagger', spe: 4 });
        des.object({ id: 'dagger', spe: 2, quantity: d(2, 4),
                     buc: 'not-cursed' });
    } });
    /* The treasure of Master of Thieves */
    des.object('chest', 36, 11);
    /* thug guards, room #1 */
    des.monster('thug', 28, 10);
    des.monster('thug', 29, 11);
    des.monster('thug', 30, 9);
    des.monster('thug', 31, 7);
    /* thug guards, room #2 */
    des.monster('thug', 31, 13);
    des.monster('thug', 33, 14);
    des.monster('thug', 30, 15);
    /* thug guards, room #3 */
    des.monster('thug', 35, 9);
    des.monster('thug', 36, 13);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 20));
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /*
     * Monsters to get in the way.
     */
    /* West exit */
    des.monster({ id: 'leprechaun', x: 1, y: 12, peaceful: 0 });
    des.monster({ id: 'water nymph', x: 2, y: 12, peaceful: 0 });
    /* North exit */
    des.monster({ id: 'water nymph', x: 33, y: 1, peaceful: 0 });
    des.monster({ id: 'leprechaun', x: 33, y: 2, peaceful: 0 });
    /* East exit */
    des.monster({ id: 'water nymph', x: 74, y: 5, peaceful: 0 });
    des.monster({ id: 'leprechaun', x: 74, y: 4, peaceful: 0 });
    /* South exit */
    des.monster({ id: 'leprechaun', x: 25, y: 19, peaceful: 0 });
    des.monster({ id: 'water nymph', x: 25, y: 18, peaceful: 0 });
    /* Wandering the streets. */
    for (let i = 1, n = mathrandom(4, 7); i <= n; i++) {
        des.monster({ id: 'water nymph',
                      coord: selection_rndcoord(streets, 1), peaceful: 0 });
        des.monster({ id: 'leprechaun',
                      coord: selection_rndcoord(streets, 1), peaceful: 0 });
    }
    for (let i = 1, n = mathrandom(7, 10); i <= n; i++)
        des.monster({ id: 'chameleon',
                      coord: selection_rndcoord(streets, 1), peaceful: 0 });
}
