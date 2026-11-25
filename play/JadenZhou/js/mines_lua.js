// mines_lua.js — hand port of the Gnomish Mines level scripts sessions
// reach: dat/minefill.lua (the filler levels), the Minetown variants
// (dat/minetn-*.lua) and the Mines' End variants (dat/minend-*.lua).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/minefill.lua, dat/minetn-*.lua, dat/minend-*.lua
//
// Lua-side rolls (math.random, percent, shuffle, d) go through
// withRngCaller() with the tag the C recorder writes.

import { withRngCaller } from './rng.js';
import { lua_band } from './nhlua.js';
import { chunk_random } from './nhlib_lua.js';

// C ref: dat/minefill.lua
//	The "fill" level for the mines.
//
//	This level is used to fill out any levels not occupied by
//	specific levels.
function minefill_lua(L) {
    const G = L.globals, des = G.des;
    const F = 'minefill.lua';

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true, joined: true, walled: true });

    //
    des.stair('up');
    des.stair('down');
    //
    // for i = 1,math.random(2, 5) do
    for (let i = 1, n = chunk_random(G, F, 23, 2, 5); i <= n; i++) {
        des.object('*');
    }
    des.object('(');
    for (let i = 1, n = chunk_random(G, F, 27, 2, 4); i <= n; i++) {
        des.object();
    }
    if (G.percent(75)) {
        for (let i = 1, n = chunk_random(G, F, 31, 1, 2); i <= n; i++) {
            des.object('boulder');
        }
    }
    //
    for (let i = 1, n = chunk_random(G, F, 36, 6, 8); i <= n; i++) {
        des.monster('gnome');
    }
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('G');
    des.monster('G');
    des.monster(G.percent(50) ? 'h' : 'G');
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

// C ref: dat/minetn-1.lua
// -- A tragic accident has occurred in Frontier Town....
//
// -- Minetown variant 1
// -- Orcish Town - a variant of Frontier Town that has been
// -- overrun by orcs.  Note the barricades (iron bars).
function minetn_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const F = 'minetn-1.lua';

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true, joined: true, walled: true });

    des.map([
        '.....................................',
        '.----------------F------------------.',
        '.|.................................|.',
        '.|.-------------......------------.|.',
        '.|.|...|...|...|......|..|...|...|.|.',
        '.F.|...|...|...|......|..|...|...|.|.',
        '.|.|...|...|...|......|..|...|...|.F.',
        '.|.|...|...|----......------------.|.',
        '.|.---------.......................|.',
        '.|.................................|.',
        '.|.---------.....--...--...........|.',
        '.|.|...|...|----.|.....|.---------.|.',
        '.|.|...|...|...|.|.....|.|..|....|.|.',
        '.|.|...|...|...|.|.....|.|..|....|.|.',
        '.|.|...|...|...|.|.....|.|..|....|.|.',
        '.|.-------------.-------.---------.|.',
        '.|.................................F.',
        '.-----------F------------F----------.',
        '.....................................',
    ].join('\n') + '\n');

    // -- Don't let the player fall into his likely death; used to explicitly exclude
    // -- the town, but that meant that you couldn't teleport out as well as not in.
    des.teleport_region({ region: [1, 1, 75, 19], exclude: [1, 0, 35, 21], region_islev: 1 });
    des.region(selection.area(1, 1, 35, 17), 'lit');
    des.levregion({ type: 'stair-up', region: [1, 3, 21, 19], region_islev: 1,
                    exclude: [0, 1, 36, 17] });
    des.levregion({ type: 'stair-down', region: [57, 3, 75, 19], region_islev: 1,
                    exclude: [0, 1, 36, 17] });

    // -- shame we can't make polluted fountains
    des.feature('fountain', 16, 9);
    des.feature('fountain', 25, 9);

    // -- the altar's defiled; useful for BUC but never coaligned
    des.altar({ x: 20, y: 13, align: 'noalign', type: 'shrine' });

    // -- set up the shop doors; could be broken down
    des.door('random', 5, 8);
    des.door('random', 9, 8);
    des.door('random', 13, 7);
    des.door('random', 22, 5);
    des.door('random', 27, 7);
    des.door('random', 31, 7);
    des.door('random', 5, 10);
    des.door('random', 9, 10);
    des.door('random', 15, 13);
    des.door('random', 25, 13);
    des.door('random', 31, 11);

    // -- knock a few holes in the shop interior walls
    des.replace_terrain({ region: [7, 4, 11, 6], fromterrain: '|', toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [25, 4, 29, 6], fromterrain: '|', toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [7, 12, 11, 14], fromterrain: '|', toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [28, 12, 28, 14], fromterrain: '|', toterrain: '.', chance: 33 });

    // -- One spot each in most shops...   (Lua place[k] is JS place[k - 1])
    const place = [ [5, 4], [9, 5], [13, 4], [26, 4], [31, 5], [30, 14], [5, 14], [10, 13], [26, 14], [27, 13] ];
    G.shuffle(place);

    // -- scatter some bodies
    des.object({ id: 'corpse', x: 20, y: 12, montype: 'aligned cleric' });
    des.object({ id: 'corpse', coord: place[0], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[1], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[2], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[3], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[4], montype: 'shopkeeper' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watch captain' });

    // -- Rubble!
    for (let i = 1, n = chunk_random(G, F, 91, 10, 19); i <= n; i++) {
        if (G.percent(90)) {
            des.object('boulder');
        }
        des.object('rock');
    }

    // -- Guarantee 7 candles since we won't have Izchak available
    des.object({ id: 'wax candle', coord: place[3], quantity: chunk_random(G, F, 99, 1, 2) });

    des.object({ id: 'wax candle', coord: place[0], quantity: chunk_random(G, F, 101, 2, 4) });
    des.object({ id: 'wax candle', coord: place[1], quantity: chunk_random(G, F, 102, 1, 2) });
    des.object({ id: 'tallow candle', coord: place[2], quantity: chunk_random(G, F, 103, 1, 3) });
    des.object({ id: 'tallow candle', coord: place[1], quantity: chunk_random(G, F, 104, 1, 2) });
    des.object({ id: 'tallow candle', coord: place[3], quantity: chunk_random(G, F, 105, 1, 2) });

    // -- go ahead and leave a lamp next to one corpse to be suggestive
    // -- and some empty wands...
    des.object('oil lamp', place[1]);
    des.object({ id: 'wand of striking', coord: place[0], buc: 'uncursed', spe: 0 });
    des.object({ id: 'wand of striking', coord: place[2], buc: 'uncursed', spe: 0 });
    des.object({ id: 'wand of striking', coord: place[3], buc: 'uncursed', spe: 0 });
    des.object({ id: 'wand of magic missile', coord: place[3], buc: 'uncursed', spe: 0 });
    des.object({ id: 'wand of magic missile', coord: place[4], buc: 'uncursed', spe: 0 });

    // -- the Orcish Army

    const inside = selection.floodfill(18, 8);
    const near_temple = lua_band(selection.area(17, 8, 23, 14), inside);

    for (let i = 1, n = chunk_random(G, F, 121, 5, 15); i <= n; i++) {
        if (G.percent(50)) {
            des.monster({ id: 'orc-captain', coord: inside.rndcoord(1), peaceful: 0 });
        } else {
            if (G.percent(80)) {
                des.monster({ id: 'Uruk-hai', coord: inside.rndcoord(1), peaceful: 0 });
            } else {
                des.monster({ id: 'Mordor orc', coord: inside.rndcoord(1), peaceful: 0 });
            }
        }
    }
    // -- shamans can be hanging out in/near the temple
    // -- one of the shamans is higher level
    for (let i = 1, n = chunk_random(G, F, 134, 1, 6); i <= n; i++) {
        des.monster({ id: 'orc shaman', coord: near_temple.rndcoord(0), peaceful: 0,
                      m_lev_adj: (i === 1) ? 3 : 0 });
    }
    // -- these are not such a big deal
    // -- to run into outside the bars
    for (let i = 1, n = chunk_random(G, F, 140, 10, 19); i <= n; i++) {
        if (G.percent(90)) {
            des.monster({ id: 'hill orc', peaceful: 0 });
        } else {
            des.monster({ id: 'goblin', peaceful: 0 });
        }
    }

    // -- Hack to force full-level wallification

    des.wallify();
}

// C ref: dat/minetn-2.lua
// -- Minetown variant 2
// -- "Town Square"
function minetn_2_lua(L) {
    const G = L.globals, des = G.des;

    // a closet: des.room({ type = "ordinary", [lit=], x=,y=, w=2,h=2,
    //                      contents = function() des.door(...) [des.monster(...)] end })
    const closet = (lit, x, y, state, wall, mon) => {
        const r = { type: 'ordinary', x, y, w: 2, h: 2,
                    contents: function() {
                        des.door({ state, wall });
                        if (mon) des.monster(mon);
                    } };
        if (lit !== undefined) r.lit = lit;
        return r;
    };

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 31, h: 15,
               contents: function() {
                   des.feature('fountain', 17, 5);
                   des.feature('fountain', 13, 8);
                   if (G.percent(75)) {
                       des.room(closet(undefined, 2, 0, 'closed', 'west'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(0, 5, 0, 'closed', 'south'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(undefined, 8, 0, 'closed', 'east'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(1, 16, 0, 'closed', 'west'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(0, 19, 0, 'closed', 'south'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(undefined, 22, 0, 'closed', 'south', 'gnome'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(0, 25, 0, 'closed', 'east'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(1, 2, 5, 'closed', 'north'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(1, 5, 5, 'closed', 'south'));
                   }
                   if (G.percent(75)) {
                       des.room(closet(undefined, 8, 5, 'locked', 'north', 'gnome'));
                   }
                   des.room({ type: 'shop', chance: 90, lit: 1, x: 2, y: 10, w: 4, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'west' });
                              } });
                   des.room({ type: 'tool shop', chance: 90, lit: 1, x: 23, y: 10, w: 4, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'east' });
                              } });
                   des.room({ type: G.monkfoodshop(), chance: 90, lit: 1, x: 24, y: 5, w: 3, h: 4,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'north' });
                              } });
                   des.room({ type: 'candle shop', lit: 1, x: 11, y: 10, w: 4, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'east' });
                              } });
                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 7, y: 10, w: 3, h: 3,
                                  contents: function() {
                                      des.door({ state: 'locked', wall: 'north' });
                                      des.monster('gnome');
                                  } });
                   }
                   des.room({ type: 'temple', lit: 1, x: 19, y: 5, w: 4, h: 4,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'north' });
                                  des.altar({ x: 2, y: 2, align: G.align[0], type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });
                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 18, y: 10, w: 4, h: 3,
                                  contents: function() {
                                      des.door({ state: 'locked', wall: 'west' });
                                      des.monster('gnome lord');
                                  } });
                   }
                   // -- The Town Watch
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
               } });
    des.room({ contents: function() {
        des.stair('up');
    } });
    des.room({ contents: function() {
        des.stair('down');
        des.trap();
        des.monster('gnome');
        des.monster('gnome');
    } });
    des.room({ contents: function() {
        des.monster('dwarf');
    } });
    des.room({ contents: function() {
        des.trap();
        des.monster('gnome');
    } });
    des.random_corridors();
}

// C ref: dat/minetn-3.lua
// -- Minetown variant 3 by Kelly Bailey
// -- "Alley Town"
// (The bare 'random' entries in some des.room() tables are positional
// nils in Lua, which the des.room() options never read.)
function minetn_3_lua(L) {
    const G = L.globals, des = G.des;

    // a subroom whose contents are a door and maybe a monster
    const room = (opts, state, wall, mon) => des.room({ ...opts,
        contents: function() {
            des.door({ state, wall });
            if (mon) des.monster(mon);
        } });

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 31, h: 15,
               contents: function() {
                   des.feature('fountain', 1, 6);
                   des.feature('fountain', 29, 13);
                   room({ type: 'ordinary', x: 2, y: 2, w: 2, h: 2 }, 'closed', 'south');
                   room({ type: 'tool shop', chance: 30, lit: 1, x: 5, y: 3, w: 2, h: 3 }, 'closed', 'south');
                   room({ type: 'ordinary', x: 2, y: 10, w: 2, h: 3 }, 'locked', 'north', 'G');
                   room({ type: 'ordinary', x: 5, y: 9, w: 2, h: 2 }, 'closed', 'north');
                   des.room({ type: 'temple', lit: 1, x: 10, y: 2, w: 3, h: 4,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'east' });
                                  des.altar({ x: 1, y: 1, align: G.align[0], type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });
                   room({ type: 'ordinary', x: 11, y: 7, w: 2, h: 2 }, 'closed', 'west');
                   room({ type: 'shop', lit: 1, x: 10, y: 10, w: 3, h: 3 }, 'closed', 'west');
                   room({ type: 'ordinary', x: 14, y: 8, w: 2, h: 2 }, 'locked', 'north', 'G');
                   room({ type: 'ordinary', x: 14, y: 11, w: 2, h: 2 }, 'closed', 'south');
                   room({ type: 'tool shop', chance: 40, lit: 1, x: 17, y: 10, w: 3, h: 3 }, 'closed', 'north');
                   room({ type: 'ordinary', x: 21, y: 11, w: 2, h: 2 }, 'locked', 'east', 'G');
                   room({ type: G.monkfoodshop(), chance: 90, lit: 1, x: 26, y: 8, w: 3, h: 2 }, 'closed', 'west');
                   room({ type: 'ordinary', x: 16, y: 2, w: 2, h: 2 }, 'closed', 'west');
                   room({ type: 'ordinary', x: 19, y: 2, w: 2, h: 2 }, 'closed', 'north');
                   room({ type: 'wand shop', chance: 30, lit: 1, x: 19, y: 5, w: 3, h: 2 }, 'closed', 'west');
                   room({ type: 'candle shop', lit: 1, x: 25, y: 2, w: 3, h: 3 }, 'closed', 'south');
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
               } });
    des.room({ type: 'ordinary', contents: function() {
        des.stair('up');
    } });
    des.room({ type: 'ordinary', contents: function() {
        des.stair('down');
        des.trap();
        des.monster('gnome');
        des.monster('gnome');
    } });
    des.room({ type: 'ordinary', contents: function() {
        des.monster('dwarf');
    } });
    des.room({ type: 'ordinary', contents: function() {
        des.trap();
        des.monster('gnome');
    } });
    des.random_corridors();
}

// C ref: dat/minetn-4.lua
// -- Minetown variant 4 by Kelly Bailey
// -- "College Town"
function minetn_4_lua(L) {
    const G = L.globals, des = G.des;

    // a subroom whose contents are a door and some monsters
    const room = (opts, state, wall, ...mons) => des.room({ ...opts,
        contents: function() {
            des.door({ state, wall });
            for (const mon of mons) des.monster(mon);
        } });

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 30, h: 15,
               contents: function() {
                   des.feature('fountain', 8, 7);
                   des.feature('fountain', 18, 7);

                   room({ type: 'book shop', lit: 1, x: 4, y: 2, w: 3, h: 3 }, 'closed', 'south');

                   room({ type: 'ordinary', x: 8, y: 2, w: 2, h: 2 }, 'closed', 'south');

                   des.room({ type: 'temple', lit: 1, x: 11, y: 3, w: 5, h: 4,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'south' });
                                  des.altar({ x: 2, y: 1, align: G.align[0], type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   room({ type: 'ordinary', x: 19, y: 2, w: 2, h: 2 }, 'closed', 'south', 'G');

                   room({ type: 'candle shop', lit: 1, x: 22, y: 2, w: 3, h: 3 }, 'closed', 'south');

                   room({ type: 'ordinary', x: 26, y: 2, w: 2, h: 2 }, 'locked', 'east', 'G');

                   room({ type: 'tool shop', chance: 90, lit: 1, x: 4, y: 10, w: 3, h: 3 }, 'closed', 'north');

                   room({ type: 'ordinary', x: 8, y: 11, w: 2, h: 2 }, 'locked', 'south',
                        'kobold shaman', 'kobold shaman', 'kitten', 'f');

                   room({ type: G.monkfoodshop(), chance: 90, lit: 1, x: 11, y: 11, w: 3, h: 2 }, 'closed', 'east');

                   room({ type: 'ordinary', x: 17, y: 11, w: 2, h: 2 }, 'closed', 'west');

                   room({ type: 'ordinary', x: 20, y: 10, w: 2, h: 2 }, 'locked', 'north', 'G');

                   room({ type: 'shop', chance: 90, lit: 1, x: 23, y: 10, w: 3, h: 3 }, 'closed', 'north');

                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.stair('up');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.stair('down');
                   des.trap();
                   des.monster('gnome');
                   des.monster('gnome');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.monster('dwarf');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.trap();
                   des.monster('gnome');
               } });

    des.random_corridors();
}

// C ref: dat/minetn-5.lua
// -- "Grotto Town" by Kelly Bailey
function minetn_5_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map([
        '-----         ---------                                                    ',
        '|...---  ------.......--    -------                       ---------------  ',
        '|.....----.........--..|    |.....|          -------      |.............|  ',
        '--..-....-.----------..|    |.....|          |.....|     --+---+--.----+-  ',
        ' --.--.....----     ----    |.....|  ------  --....----  |..-...--.-.+..|  ',
        '  ---.........----  -----   ---+---  |..+.|   ---..-..----..---+-..---..|  ',
        '    ----.-....|..----...--    |.|    |..|.|    ---+-.....-+--........--+-  ',
        '       -----..|....-.....---- |.|    |..|.------......--................|  ',
        '    ------ |..|.............---.--   ----.+..|-.......--..--------+--..--  ',
        '    |....| --......---...........-----  |.|..|-...{....---|.........|..--  ',
        '    |....|  |........-...-...........----.|..|--.......|  |.........|...|  ',
        '    ---+--------....-------...---......--.-------....---- -----------...|  ',
        ' ------.---...--...--..-..--...-..---...|.--..-...-....------- |.......--  ',
        ' |..|-.........-..---..-..---.....--....|........---...-|....| |.-------   ',
        ' |..+...............-+---+-----..--..........--....--...+....| |.|...S.    ',
        '-----.....{....----...............-...........--...-...-|....| |.|...|     ',
        '|..............-- --+--.---------.........--..-........------- |.--+-------',
        '-+-----.........| |...|.|....|  --.......------...|....---------.....|....|',
        '|...| --..------- |...|.+....|   ---...---    --..|...--......-...{..+..-+|',
        '|...|  ----       ------|....|     -----       -----.....----........|..|.|',
        '-----                   ------                     -------  ---------------',
    ].join('\n') + '\n');

    if (G.percent(75)) {
        if (G.percent(50)) {
            des.terrain(selection.line(25, 8, 25, 9), '|');
        } else {
            des.terrain(selection.line(16, 13, 17, 13), '-');
        }
    }
    if (G.percent(75)) {
        if (G.percent(50)) {
            des.terrain(selection.line(36, 10, 36, 11), '|');
        } else {
            des.terrain(selection.line(32, 15, 33, 15), '-');
        }
    }
    if (G.percent(50)) {
        des.terrain(selection.area(21, 4, 22, 5), '.');
        des.terrain(selection.line(14, 9, 14, 10), '|');
    }
    if (G.percent(50)) {
        des.terrain([46, 13], '|');
        des.terrain(selection.line(43, 5, 47, 5), '-');
        des.terrain(selection.line(42, 6, 46, 6), '.');
        des.terrain(selection.line(46, 7, 47, 7), '.');
    }
    if (G.percent(50)) {
        des.terrain(selection.area(69, 11, 71, 11), '-');
    }

    des.stair('up', 1, 1);
    des.stair('down', 46, 3);
    des.feature('fountain', 50, 9);
    des.feature('fountain', 10, 15);
    des.feature('fountain', 66, 18);

    des.region(selection.area(0, 0, 74, 20), 'unlit');
    des.region(selection.area(9, 13, 11, 17), 'lit');
    des.region(selection.area(8, 14, 12, 16), 'lit');
    des.region(selection.area(49, 7, 51, 11), 'lit');
    des.region(selection.area(48, 8, 52, 10), 'lit');
    des.region(selection.area(64, 17, 68, 19), 'lit');
    des.region(selection.area(37, 13, 39, 17), 'lit');
    des.region(selection.area(36, 14, 40, 17), 'lit');
    des.region(selection.area(59, 2, 72, 10), 'lit');

    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');

    // -- The shops
    des.region({ region: [25, 17, 28, 19], lit: 1, type: 'candle shop', filled: 1 });
    des.door('closed', 24, 18);
    des.region({ region: [59, 9, 67, 10], lit: 1, type: 'shop', filled: 1 });
    des.door('closed', 66, 8);
    des.region({ region: [57, 13, 60, 15], lit: 1, type: 'tool shop', filled: 1 });
    des.door('closed', 56, 14);
    des.region({ region: [5, 9, 8, 10], lit: 1, type: G.monkfoodshop(), filled: 1 });
    des.door('closed', 7, 11);
    // -- Gnome homes
    des.door('closed', 4, 14);
    des.door('locked', 1, 17);
    des.monster('gnomish wizard', 2, 19);
    des.door('locked', 20, 16);
    des.monster('G', 20, 18);
    des.door('random', 21, 14);
    des.door('random', 25, 14);
    des.door('random', 42, 8);
    des.door('locked', 40, 5);
    des.monster('G', 38, 7);
    des.door('random', 59, 3);
    des.door('random', 58, 6);
    des.door('random', 63, 3);
    des.door('random', 63, 5);
    des.door('locked', 71, 3);
    des.door('locked', 71, 6);
    des.door('closed', 69, 4);
    des.door('closed', 67, 16);
    des.monster('gnomish wizard', 67, 14);
    des.object('=', 70, 14);
    des.door('locked', 69, 18);
    des.monster('gnome lord', 71, 19);
    des.door('locked', 73, 18);
    des.object('chest', 73, 19);
    des.door('locked', 50, 6);
    des.object('(', 50, 3);
    des.object({ id: 'statue', x: 38, y: 15, montype: 'gnome king', historic: 1 });
    // -- Temple
    des.region({ region: [29, 2, 33, 4], lit: 1, type: 'temple', filled: 1 });
    des.door('closed', 31, 5);
    des.altar({ x: 31, y: 3, align: G.align[0], type: 'shrine' });
}

// C ref: dat/minetn-6.lua
// "Bustling Town" by Kelly Bailey
function minetn_6_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'inaccessibles');

    des.level_init({ style: 'mines', fg: '.', bg: '-', smoothed: true, joined: true, lit: 1, walled: true });

    // -- Map extends the full height of the playable area in order to prevent any of
    // -- the cavern fill from getting cut off by walls of the town buildings and
    // -- creating inaccessible spaces. The inaccessibles flag does compensate for
    // -- this, but it does so by doing things like creating backdoors into adjacent
    // -- shops which we don't want.
    des.map({ halign: 'center', valign: 'top', map: [
        'x--------xxxxxxxxxxx-------------------x',
        'x------xxxxxxxxxxxxxx-----------------xx',
        '.-----................----------------.x',
        '.|...|................|...|..|...|...|..',
        '.|...+..--+--.........|...|..|...|...|..',
        '.|...|..|...|..-----..|...|..|-+---+--..',
        '.-----..|...|--|...|..--+---+-.........x',
        '........|...|..|...+.............-----.x',
        '........-----..|...|......--+-...|...|..',
        'x----...|...|+------..{...|..|...+...|..',
        'x|..+...|...|.............|..|...|...|..',
        '.|..|...|...|-+-.....---+-------------.x',
        '.----...--+--..|..-+-|..................',
        '...|........|..|..|..|----....--------.x',
        '...|..T.....----..|..|...+....|......|..',
        '...|-....{........|..|...|....+......|x.',
        '...--..-....T.....--------....|......|x.',
        '.......--.....................----------',
        '.xxxx-----xxxxxxxxxxxxxxxxxx------------',
        'xxxx-------xxxxxxxxxxxxxxx--------------',
    ].join('\n') + '\n' });

    des.region(selection.area(0, 0, 39, 19), 'lit');

    // -- stairs can generate 1 column left or right inside the map,
    // -- in case the randomly generated mines layout doesn't extend outside the map
    des.levregion({ type: 'stair-up', region: [1, 3, 21, 19], region_islev: 1, exclude: [1, 0, 39, 18] });
    des.levregion({ type: 'stair-down', region: [60, 3, 75, 19], region_islev: 1, exclude: [0, 0, 38, 18] });

    des.region(selection.area(13, 7, 14, 8), 'unlit');
    des.region({ region: [9, 9, 11, 11], lit: 1, type: 'candle shop', filled: 1 });
    des.region({ region: [16, 6, 18, 8], lit: 1, type: 'tool shop', filled: 1 });
    des.region({ region: [23, 3, 25, 5], lit: 1, type: 'shop', filled: 1 });
    des.region({ region: [22, 14, 24, 15], lit: 1, type: G.monkfoodshop(), filled: 1 });
    des.region({ region: [31, 14, 36, 16], lit: 1, type: 'temple', filled: 1 });
    des.altar({ x: 35, y: 15, align: G.align[0], type: 'shrine' });

    des.door('closed', 5, 4);
    des.door('locked', 4, 10);
    des.door('closed', 10, 4);
    des.door('closed', 10, 12);
    des.door('locked', 13, 9);
    des.door('locked', 14, 11);
    des.door('closed', 19, 7);
    des.door('closed', 19, 12);
    des.door('closed', 24, 6);
    des.door('closed', 24, 11);
    des.door('closed', 25, 14);
    des.door('closed', 28, 6);
    des.door('locked', 28, 8);
    des.door('closed', 30, 15);
    des.door('closed', 31, 5);
    des.door('closed', 35, 5);
    des.door('closed', 33, 9);

    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome', 14, 8);
    des.monster('gnome lord', 14, 7);
    des.monster('gnome', 27, 10);
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster({ id: 'dwarf', peaceful: 1 });
    des.monster({ id: 'dwarf', peaceful: 1 });
    des.monster({ id: 'gnome', peaceful: 1 });
    des.monster({ id: 'gnome', peaceful: 1 });
    des.monster({ id: 'hobbit', peaceful: 1 });
    des.monster({ id: 'goblin', peaceful: 1 });
    des.monster({ id: 'kobold', peaceful: 1 });
    des.monster({ id: 'dog', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
}

// C ref: dat/minend-1.lua
// Mine end level variant 1
// "Mimic of the Mines"
function minend_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map([
        '------------------------------------------------------------------   ------',
        '|                        |.......|     |.......-...|       |.....|.       |',
        '|    ---------        ----.......-------...........|       ---...-S-      |',
        '|    |.......|        |..........................-S-      --.......|      |',
        '|    |......-------   ---........................|.       |.......--      |',
        '|    |..--........-----..........................|.       -.-..----       |',
        '|    --..--.-----........-.....................---        --..--          |',
        '|     --..--..| -----------..................---.----------..--           |',
        '|      |...--.|    |..S...S..............---................--            |',
        '|     ----..-----  ------------........--- ------------...---             |',
        '|     |.........--            ----------              ---...-- -----      |',
        '|    --.....---..--                           --------  --...---...--     |',
        '| ----..-..-- --..---------------------      --......--  ---........|     |',
        '|--....-----   --..-..................---    |........|    |.......--     |',
        '|.......|       --......................S..  --......--    ---..----      |',
        '|--.--.--        ----.................---     ------..------...--         |',
        '| |....S..          |...............-..|         ..S...........|          |',
        '--------            --------------------           ------------------------',
    ].join('\n') + '\n');

    // -- Dungeon Description
    const place = [ [8, 16], [13, 7], [21, 8], [41, 14], [50, 4], [50, 16], [66, 1] ];
    G.shuffle(place);

    // -- make the entry chamber a real room; it affects monster arrival
    des.region({ region: [26, 1, 32, 1], lit: 0, type: 'ordinary', irregular: 1, arrival_room: true });
    des.region(selection.area(20, 8, 21, 8), 'unlit');
    des.region(selection.area(23, 8, 25, 8), 'unlit');
    // -- Secret doors
    des.door('locked', 7, 16);
    des.door('locked', 22, 8);
    des.door('locked', 26, 8);
    des.door('locked', 40, 14);
    des.door('locked', 50, 3);
    des.door('locked', 51, 16);
    des.door('locked', 66, 2);
    // -- Stairs
    des.stair('up', 36, 4);
    // -- Non diggable walls
    des.non_diggable(selection.area(0, 0, 74, 17));
    // -- Niches
    // -- Note: place[6] empty   (Lua place[k] is JS place[k - 1])
    des.object('diamond', place[6]);
    des.object('emerald', place[6]);
    des.object('worthless piece of violet glass', place[6]);
    des.monster({ class: 'm', coord: place[6], appear_as: 'obj:luckstone' });
    des.object('worthless piece of white glass', place[0]);
    des.object('emerald', place[0]);
    des.object('amethyst', place[0]);
    des.monster({ class: 'm', coord: place[0], appear_as: 'obj:loadstone' });
    des.object('diamond', place[1]);
    des.object('worthless piece of green glass', place[1]);
    des.object('amethyst', place[1]);
    des.monster({ class: 'm', coord: place[1], appear_as: 'obj:flint' });
    des.object('worthless piece of white glass', place[2]);
    des.object('emerald', place[2]);
    des.object('worthless piece of violet glass', place[2]);
    des.monster({ class: 'm', coord: place[2], appear_as: 'obj:touchstone' });
    des.object('worthless piece of red glass', place[3]);
    des.object('ruby', place[3]);
    des.object('loadstone', place[3]);
    des.object('ruby', place[4]);
    des.object('worthless piece of red glass', place[4]);
    des.object({ id: 'luckstone', coord: place[4], buc: 'not-cursed', achievement: 1 });
    // -- Random objects
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('(');
    des.object('(');
    des.object();
    des.object();
    des.object();
    // -- Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- Random monsters
    des.monster('gnome king');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnomish wizard');
    des.monster('gnomish wizard');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('hobbit');
    des.monster('hobbit');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('h');
}

// C ref: dat/minetn-7.lua
// -- "Bazaar Town" by Kelly Bailey
function minetn_7_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 30, h: 15,
               contents: function() {
                   des.feature('fountain', 12, 7);
                   des.feature('fountain', 11, 13);

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 2, y: 2, w: 4, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'south' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 7, y: 2, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'north' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 7, y: 5, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'south' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', lit: 1, x: 10, y: 2, w: 3, h: 4,
                                  contents: function() {
                                      des.monster('gnome');
                                      des.monster('monkey');
                                      des.monster('monkey');
                                      des.monster('monkey');
                                      des.door({ state: 'closed', wall: 'south' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 14, y: 2, w: 4, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'south', pos: 0 });
                                      des.monster('n');
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 16, y: 5, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'south' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', lit: 0, x: 19, y: 2, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'locked', wall: 'east' });
                                      des.monster('gnome king');
                                  } });
                   }

                   des.room({ type: G.monkfoodshop(), chance: 50, lit: 1, x: 19, y: 5, w: 2, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'south' });
                              } });

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 2, y: 7, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'east' });
                                  } });
                   }

                   des.room({ type: 'tool shop', chance: 50, lit: 1, x: 2, y: 10, w: 2, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'south' });
                              } });

                   des.room({ type: 'candle shop', lit: 1, x: 5, y: 10, w: 3, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'north' });
                              } });

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 11, y: 10, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'locked', wall: 'west' });
                                      des.monster('G');
                                  } });
                   }

                   des.room({ type: 'shop', chance: 60, lit: 1, x: 14, y: 10, w: 2, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'north' });
                              } });

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 17, y: 11, w: 4, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'north' });
                                  } });
                   }

                   if (G.percent(75)) {
                       des.room({ type: 'ordinary', x: 22, y: 11, w: 2, h: 2,
                                  contents: function() {
                                      des.door({ state: 'closed', wall: 'south' });
                                      des.feature('sink', 0, 0);
                                  } });
                   }

                   des.room({ type: G.monkfoodshop(), chance: 50, lit: 1, x: 25, y: 11, w: 3, h: 2,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'east' });
                              } });

                   des.room({ type: 'tool shop', chance: 30, lit: 1, x: 25, y: 2, w: 3, h: 3,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'west' });
                              } });

                   des.room({ type: 'temple', lit: 1, x: 24, y: 6, w: 4, h: 4,
                              contents: function() {
                                  des.door({ state: 'closed', wall: 'west' });
                                  des.altar({ x: 2, y: 1, align: G.align[0], type: 'shrine' });
                                  des.monster('gnomish wizard');
                                  des.monster('gnomish wizard');
                              } });

                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watchman', peaceful: 1 });
                   des.monster({ id: 'watch captain', peaceful: 1 });
                   des.monster('gnome');
                   des.monster('gnome');
                   des.monster('gnome');
                   des.monster('gnome lord');
                   des.monster('monkey');
                   des.monster('monkey');

               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.stair('up');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.stair('down');
                   des.trap();
                   des.monster('gnome');
                   des.monster('gnome');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.monster('dwarf');
               } });

    des.room({ type: 'ordinary',
               contents: function() {
                   des.trap();
                   des.monster('gnome');
               } });

    des.random_corridors();
}

// C ref: dat/minend-2.lua
// -- Mine end level variant 2
// -- "Gnome King's Wine Cellar"
function minend_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map([
        '---------------------------------------------------------------------------',
        '|...................................................|                     |',
        '|.|---------S--.--|...|--------------------------|..|                     |',
        '|.||---|   |.||-| |...|..........................|..|                     |',
        '|.||...| |-|.|.|---...|.............................|                ..   |',
        '|.||...|-|.....|....|-|..........................|..|.               ..   |',
        '|.||.....|-S|..|....|............................|..|..                   |',
        '|.||--|..|..|..|-|..|----------------------------|..|-.                   |',
        '|.|   |..|..|....|..................................|...                  |',
        '|.|   |..|..|----|..-----------------------------|..|....                 |',
        '|.|---|..|--|.......|----------------------------|..|.....                |',
        '|...........|----.--|......................|     |..|.......              |',
        '|-----------|...|.| |------------------|.|.|-----|..|.....|..             |',
        '|-----------|.{.|.|--------------------|.|..........|.....|....           |',
        '|...............|.S......................|-------------..-----...         |',
        '|.--------------|.|--------------------|.|.........................       |',
        '|.................|                    |.....................|........    |',
        '---------------------------------------------------------------------------',
    ].join('\n') + '\n');

    if (G.percent(50)) {
        des.terrain([55, 14], '-');
        des.terrain([56, 14], '-');
        des.terrain([61, 15], '|');
        des.terrain([52, 5], 'S');
        des.door('locked', 52, 5);
    }
    if (G.percent(50)) {
        des.terrain([18, 1], '|');
        des.terrain(selection.area(7, 12, 8, 13), '.');
    }
    if (G.percent(50)) {
        des.terrain([49, 4], '|');
        des.terrain([21, 5], '.');
    }
    if (G.percent(50)) {
        if (G.percent(50)) {
            des.terrain([22, 1], '|');
        } else {
            des.terrain([50, 7], '-');
            des.terrain([51, 7], '-');
        }
    }

    // -- uncontrolled arrival (via trap door, level teleport) will be in the central
    // -- portion of level to prevent ending up stuck in the treasure area, whether
    // -- arriving from above or below (despite this being bottom of Mines branch,
    // -- hero might arrive from below by invoking Wiz role's Eye of the Aethiopica)
    des.teleport_region({ region: [23, 3, 48, 16], region_islev: 1 });

    // -- Dungeon Description
    des.feature('fountain', [14, 13]);
    des.region(selection.area(23, 3, 48, 6), 'lit');
    des.region(selection.area(21, 6, 22, 6), 'lit');
    des.region(selection.area(14, 4, 14, 4), 'unlit');
    des.region(selection.area(10, 5, 14, 8), 'unlit');
    des.region(selection.area(10, 9, 11, 9), 'unlit');
    des.region(selection.area(15, 8, 16, 8), 'unlit');
    // -- Secret doors
    des.door('locked', 12, 2);
    des.door('locked', 11, 6);
    // -- Stairs
    des.stair('up', 36, 4);
    // -- Non diggable walls
    des.non_diggable(selection.area(0, 0, 52, 17));
    des.non_diggable(selection.area(53, 0, 74, 0));
    des.non_diggable(selection.area(53, 17, 74, 17));
    des.non_diggable(selection.area(74, 1, 74, 16));
    des.non_diggable(selection.area(53, 7, 55, 7));
    des.non_diggable(selection.area(53, 14, 61, 14));
    // -- The Gnome King's wine cellar.
    // -- the Trespassers sign is a long-running joke
    des.engraving([12, 3], 'engrave',
                  "You are now entering the Gnome King's wine cellar.");
    des.engraving([12, 4], 'engrave', 'Trespassers will be persecuted!');
    des.object('potion of booze', 10, 7);
    des.object('potion of booze', 10, 7);
    des.object('!', 10, 7);
    des.object('potion of booze', 10, 8);
    des.object('potion of booze', 10, 8);
    des.object('!', 10, 8);
    des.object('potion of booze', 10, 9);
    des.object('potion of booze', 10, 9);
    des.object('potion of object detection', 10, 9);
    // -- Objects
    // -- The Treasure chamber...
    des.object('diamond', 69, 4);
    des.object('*', 69, 4);
    des.object('diamond', 69, 4);
    des.object('*', 69, 4);
    des.object('emerald', 70, 4);
    des.object('*', 70, 4);
    des.object('emerald', 70, 4);
    des.object('*', 70, 4);
    des.object('emerald', 69, 5);
    des.object('*', 69, 5);
    des.object('ruby', 69, 5);
    des.object('*', 69, 5);
    des.object('ruby', 70, 5);
    des.object('amethyst', 70, 5);
    des.object('*', 70, 5);
    des.object('amethyst', 70, 5);
    des.object({ id: 'luckstone', x: 70, y: 5,
                 buc: 'not-cursed', achievement: 1 });
    // -- Scattered gems...
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('*');
    des.object('(');
    des.object('(');
    des.object();
    des.object();
    des.object();
    // -- Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- Random monsters.
    des.monster('gnome king');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('gnomish wizard');
    des.monster('gnomish wizard');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('hobbit');
    des.monster('hobbit');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('h');
}

// C ref: dat/minend-3.lua
// -- "Catacombs" by Kelly Bailey
// -- Relies on some very specific behavior of MAZEWALK.
function minend_3_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: '-' });

    des.level_flags('mazelevel', 'nommap');

    des.map({ halign: 'center', valign: 'bottom', map: [
        ' - - - - - - - - - - -- -- - - . - - - - - - - - - -- - - -- - - - - . - - |',
        '------...---------.-----------...-----.-------.-------     ----------------|',
        ' - - - - - - - - - - - . - - - . - - - - - - - - - - -- - -- - . - - - - - |',
        '------------.---------...-------------------------.---   ------------------|',
        ' - - - - - - - - - - . . - - --- - . - - - - - - - - -- -- - - - - |.....| |',
        '--.---------------.......------------------------------- ----------|.....S-|',
        ' - - - - |.. ..| - ....... . - - - - |.........| - - - --- - - - - |.....| |',
        '----.----|.....|------.......--------|.........|--------------.------------|',
        ' - - - - |..{..| - - -.... . --- - -.S.........S - - - - - - - - - - - - - |',
        '---------|.....|--.---...------------|.........|---------------------------|',
        ' - - - - |.. ..| - - - . - - - - - - |.........| - --- . - - - - - - - - - |',
        '----------------------...-------.---------------------...------------------|',
        '---..| - - - - - - - - . --- - - - - - - - - - - - - - . - - --- - - --- - |',
        '-.S..|----.-------.------- ---------.-----------------...----- -----.-------',
        '---..| - - - - - - - -- - - -- . - - - - - . - - - . - . - - -- -- - - - -- ',
        '-.S..|--------.---.---       -...---------------...{.---------   ---------  ',
        '--|. - - - - - - - -- - - - -- . - - - --- - - - . . - - - - -- - - - - - - ',
    ].join('\n') + '\n' });

    // (Lua place[k] is JS place[k - 1])
    const place = [ [1, 15], [68, 6], [1, 13] ];
    G.shuffle(place);

    des.non_diggable(selection.area(67, 3, 73, 7));
    des.non_diggable(selection.area(0, 12, 2, 16));
    des.feature('fountain', [12, 8]);
    des.feature('fountain', [51, 15]);
    des.region(selection.area(0, 0, 75, 16), 'unlit');
    des.region(selection.area(38, 6, 46, 10), 'lit');
    des.door('closed', 37, 8);
    des.door('closed', 47, 8);
    des.door('closed', 73, 5);
    des.door('closed', 2, 15);
    des.mazewalk({ x: 36, y: 8, dir: 'west', stocked: false });
    des.stair('up', 42, 8);
    des.wallify();

    // -- Objects
    des.object('diamond');
    des.object('*');
    des.object('diamond');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('ruby');
    des.object('*');
    des.object('ruby');
    des.object('amethyst');
    des.object('*');
    des.object('amethyst');
    des.object({ id: 'luckstone', coord: place[1], buc: 'not-cursed', achievement: 1 });
    des.object('flint', place[0]);
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('+');
    des.object('+');
    des.object('+');
    des.object('+');
    des.object();
    des.object();
    des.object();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- One-time annoyance factor
    des.trap('level teleport', place[1]);
    des.trap('level teleport', place[0]);
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('ettin mummy');
    des.monster('V');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('V');
    des.monster('e');
    des.monster('e');
    des.monster('e');
    des.monster('e');
}

// The hand-ported Mines level scripts by file name, for nhl_loadlua().
export const mines_lua_files = {
    'minefill.lua': minefill_lua,
    'minetn-1.lua': minetn_1_lua,
    'minetn-2.lua': minetn_2_lua,
    'minetn-3.lua': minetn_3_lua,
    'minetn-4.lua': minetn_4_lua,
    'minetn-5.lua': minetn_5_lua,
    'minetn-6.lua': minetn_6_lua,
    'minetn-7.lua': minetn_7_lua,
    'minend-1.lua': minend_1_lua,
    'minend-2.lua': minend_2_lua,
    'minend-3.lua': minend_3_lua,
};
