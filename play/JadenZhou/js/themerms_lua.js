// themerms_lua.js — hand port of dat/themerms.lua, the themed-room
// definitions. makerooms() (mklev.c) loads it into a Lua state of its own,
// one per dungeon branch, then calls pre_themerooms_generate(),
// themerooms_generate() once per room, and post_themerooms_generate().
// C ref: dat/themerms.lua
//
// Lua tables are JS arrays here (Lua index i is JS index i - 1). Every
// Lua-side roll goes through withRngCaller() with the tag the C recorder
// writes for that call site: nh.rn2 called by a function that C called is
// "nh.rn2(themerms.lua:<line>)"; otherwise the tag names the calling frame
// and its parent (see nhlib_lua.js).
//
// The contents functions call des.*, selection.* and obj.*; those that are
// not ported yet raise a Lua error (sp_lev.js l_register_des()).

import { game } from './gstate.js';
import { withRngCaller } from './rng.js';
import { lua_error, lua_callmeth } from './nhlua.js';

// The des.map() maps, verbatim from themerms.lua.
const MAP_L_shaped = `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
--------`;
const MAP_L_shaped_rot_1 = `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
--------`;
const MAP_L_shaped_rot_2 = `--------
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`;
const MAP_L_shaped_rot_3 = `--------
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`;
const MAP_Blocked_center = `-----------
|.........|
|.........|
|.........|
|...LLL...|
|...LLL...|
|...LLL...|
|.........|
|.........|
|.........|
-----------`;
const MAP_Circular_small = `xx---xx
x--.--x
--...--
|.....|
--...--
x--.--x
xx---xx`;
const MAP_Circular_medium = `xx-----xx
x--...--x
--.....--
|.......|
|.......|
|.......|
--.....--
x--...--x
xx-----xx`;
const MAP_Circular_big = `xxx-----xxx
x---...---x
x-.......-x
--.......--
|.........|
|.........|
|.........|
--.......--
x-.......-x
x---...---x
xxx-----xxx`;
const MAP_T_shaped = `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
-----------`;
const MAP_T_shaped_rot_1 = `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`;
const MAP_T_shaped_rot_2 = `-----------
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`;
const MAP_T_shaped_rot_3 = `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`;
const MAP_S_shaped = `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`;
const MAP_S_shaped_rot_1 = `xxx--------
xxx|......|
xxx|......|
----......|
|......----
|......|xxx
|......|xxx
--------xxx`;
const MAP_Z_shaped = `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`;
const MAP_Z_shaped_rot_1 = `--------xxx
|......|xxx
|......|xxx
|......----
----......|
xxx|......|
xxx|......|
xxx--------`;
const MAP_Cross = `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`;
const MAP_Four_leaf_clover = `-----x-----
|...|x|...|
|...---...|
|.........|
---.....---
xx|.....|xx
---.....---
|.........|
|...---...|
|...|x|...|
-----x-----`;
const MAP_Water_surrounded_vault = `}}}}}}
}----}
}|..|}
}|..|}
}----}
}}}}}}`;

// C ref: dat/themerms.lua (top-level chunk)
export function themerms_lua(L) {
    const G = L.globals;
    const nh = G.nh;
    const des = G.des;
    const selection = G.selection;
    const percent = G.percent;
    const shuffle = G.shuffle;
    const d = G.d;

    // nh.rn2 called directly from a contents function that
    // themerooms_generate() called (line 978): the recorder names the
    // calling frame "contents" and its caller "lua".
    const contents_rn2 = (line, x) => withRngCaller(
        `contents src=themerms.lua:${line} parent=lua(themerms.lua:978)`,
        () => nh.rn2(x));
    // math.random from a contents function called by C (lspo_room).
    const lua_random = (line, ...args) => withRngCaller(
        `random src=nhlib.lua:${args.length === 1 ? 8 : 10} parent=lua(themerms.lua:${line})`,
        () => G.math.random(...args));
    // math.random from a fill's contents function, which themeroom_fill()
    // calls from Lua as themeroom_fills[pick].contents(rm): Lua names that
    // frame after the field, "contents".
    const fill_random = (line, ...args) => withRngCaller(
        `random src=nhlib.lua:${args.length === 1 ? 8 : 10} parent=contents(themerms.lua:${line})`,
        () => G.math.random(...args));

    // local postprocess = { };
    let postprocess = [];

    G.themeroom_fills = [
        {
            name: 'Ice room',
            contents: function(rm) {
                const ice = selection.room();
                des.terrain(ice, 'I');
                if (percent(25)) {
                    const mintime = 1000 - (nh.level_difficulty() * 100);
                    // ice:iterate() calls ice_melter from C, so Lua cannot
                    // name its frame (the recorder falls back to "nh.rn2")
                    // and the parent frame is the C method "iterate".
                    const ice_melter = function(x, y) {
                        nh.start_timer_at(x, y, 'melt-ice', mintime + withRngCaller(
                            'nh.rn2 src=themerms.lua:54 parent=iterate([C]:-1)',
                            () => nh.rn2(1000)));
                    };
                    ice.iterate(ice_melter);
                }
            },
        },
        {
            name: 'Cloud room',
            contents: function(rm) {
                const fog = selection.room();
                for (let i = 1; i <= (fog.numpoints() / 4); i++) {
                    des.monster({ id: 'fog cloud', asleep: true });
                }
                des.gas_cloud({ selection: fog });
            },
        },
        {
            name: 'Boulder room',
            mindiff: 4,
            contents: function(rm) {
                const locs = selection.room().percentage(30);
                const func = function(x, y) {
                    if (percent(50)) {
                        des.object('boulder', x, y);
                    } else {
                        des.trap('rolling boulder', x, y);
                    }
                };
                locs.iterate(func);
            },
        },
        {
            name: 'Spider nest',
            contents: function(rm) {
                const spooders = nh.level_difficulty() > 8;
                const locs = selection.room().percentage(30);
                const func = function(x, y) {
                    des.trap({ type: 'web', x, y,
                               spider_on_web: spooders && percent(80) });
                };
                locs.iterate(func);
            },
        },
        {
            name: 'Trap room',
            contents: function(rm) {
                const traps = ['arrow', 'dart', 'falling rock', 'bear',
                               'land mine', 'sleep gas', 'rust',
                               'anti magic'];
                shuffle(traps);
                const locs = selection.room().percentage(30);
                const func = function(x, y) {
                    des.trap(traps[0], x, y);
                };
                locs.iterate(func);
            },
        },
        {
            name: 'Garden',
            eligible: function(rm) { return rm.lit === true; },
            contents: function(rm) {
                const s = selection.room();
                const npts = (s.numpoints() / 6);
                for (let i = 1; i <= npts; i++) {
                    des.monster({ id: 'wood nymph', asleep: true });
                    if (percent(30)) {
                        des.feature('fountain');
                    }
                }
                postprocess.push({ handler: G.make_garden_walls,
                                   data: { sel: selection.room() } });
            },
        },
        {
            name: 'Buried treasure',
            contents: function(rm) {
                des.object({ id: 'chest', buried: true, contents: function(otmp) {
                    const xobj = lua_callmeth(otmp, 'totable');
                    // keep track of the last buried treasure
                    if (xobj.NO_OBJ === undefined) {
                        postprocess.push({ handler: G.make_dig_engraving,
                                           data: { x: xobj.ox, y: xobj.oy } });
                    }
                    for (let i = 1, n = d(3, 4); i <= n; i++) {
                        des.object();
                    }
                } });
            },
        },
        {
            name: 'Buried zombies',
            contents: function(rm) {
                const diff = nh.level_difficulty();
                // start with [1..4] for low difficulty
                const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
                if (diff > 3) { // medium difficulty
                    zombifiable[4] = 'elf'; zombifiable[5] = 'human';
                    if (diff > 6) { // high difficulty (relatively speaking)
                        zombifiable[6] = 'ettin'; zombifiable[7] = 'giant';
                    }
                }
                for (let i = 1; i <= (rm.width * rm.height) / 2; i++) {
                    shuffle(zombifiable);
                    const o = des.object({ id: 'corpse', montype: zombifiable[0],
                                           buried: true });
                    lua_callmeth(o, 'stop_timer', 'rot-corpse');
                    lua_callmeth(o, 'start_timer', 'zombify-mon', withRngCaller(
                        'random src=nhlib.lua:10 parent=contents(themerms.lua:167)',
                        () => G.math.random(990, 1010)));
                }
            },
        },
        {
            name: 'Massacre',
            contents: function(rm) {
                const mon = ['apprentice', 'warrior', 'ninja', 'thug',
                             'hunter', 'acolyte', 'abbot', 'page',
                             'attendant', 'neanderthal', 'chieftain',
                             'student', 'wizard', 'valkyrie', 'tourist',
                             'samurai', 'rogue', 'ranger', 'priestess',
                             'priest', 'monk', 'knight', 'healer',
                             'cavewoman', 'caveman', 'barbarian',
                             'archeologist'];
                let idx = fill_random(183, mon.length);
                for (let i = 1, n = d(5, 5); i <= n; i++) {
                    if (percent(10)) { idx = fill_random(185, mon.length); }
                    des.object({ id: 'corpse', montype: mon[idx - 1] });
                }
            },
        },
        {
            name: 'Statuary',
            contents: function(rm) {
                for (let i = 1, n = d(5, 5); i <= n; i++) {
                    des.object({ id: 'statue' });
                }
                // d(3) tail-calls math.random: tagged with this frame
                const n3 = withRngCaller(
                    'nh.random src=nhlib.lua:10 parent=contents(themerms.lua:197)',
                    () => d(3));
                for (let i = 1, n = n3; i <= n; i++) {
                    des.trap('statue');
                }
            },
        },
        {
            name: 'Light source',
            eligible: function(rm) { return rm.lit === false; },
            contents: function(rm) {
                des.object({ id: 'oil lamp', lit: true });
            },
        },
        {
            name: 'Temple of the gods',
            contents: function(rm) {
                des.altar({ align: G.align[0] });
                des.altar({ align: G.align[1] });
                des.altar({ align: G.align[2] });
            },
        },
        {
            name: 'Ghost of an Adventurer',
            contents: function(rm) {
                const loc = selection.room().rndcoord(0);
                des.monster({ id: 'ghost', asleep: true, waiting: true,
                              coord: loc });
                if (percent(65)) {
                    des.object({ id: 'dagger', coord: loc, buc: 'not-blessed' });
                }
                if (percent(55)) {
                    des.object({ class: ')', coord: loc, buc: 'not-blessed' });
                }
                if (percent(45)) {
                    des.object({ id: 'bow', coord: loc, buc: 'not-blessed' });
                    des.object({ id: 'arrow', coord: loc, buc: 'not-blessed' });
                }
                if (percent(65)) {
                    des.object({ class: '[', coord: loc, buc: 'not-blessed' });
                }
                if (percent(20)) {
                    des.object({ class: '=', coord: loc, buc: 'not-blessed' });
                }
                if (percent(20)) {
                    des.object({ class: '?', coord: loc, buc: 'not-blessed' });
                }
            },
        },
        {
            name: 'Storeroom',
            contents: function(rm) {
                const locs = selection.room().percentage(30);
                const func = function(x, y) {
                    if (percent(25)) {
                        des.object('chest');
                    } else {
                        des.monster({ class: 'm', appear_as: 'obj:chest' });
                    }
                };
                locs.iterate(func);
            },
        },
        {
            name: 'Teleportation hub',
            contents: function(rm) {
                const locs = selection.room().filter_mapchar('.');
                for (let i = 1, n = 2 + withRngCaller(
                        'contents src=themerms.lua:268 parent=lua(themerms.lua:1048)',
                        () => nh.rn2(3)); i <= n; i++) {
                    const pos = locs.rndcoord(1);
                    if (pos.x > 0) {
                        pos.x = pos.x + rm.region.x1 - 1;
                        pos.y = pos.y + rm.region.y1;
                        postprocess.push({ handler: G.make_a_trap,
                                           data: { type: 'teleport', seen: true,
                                                   coord: pos, teledest: 1 } });
                    }
                }
            },
        },
    ];

    const map_room = (map, fx, fy) => function() {
        des.map({ map, contents: function(m) { G.filler_region(fx, fy); } });
    };

    G.themerooms = [
        {
            name: 'default',
            frequency: 1000,
            contents: function() {
                des.room({ type: 'ordinary', filled: 1 });
            },
        },
        {
            name: 'Fake Delphi',
            contents: function() {
                des.room({ type: 'ordinary', w: 11, h: 9, filled: 1,
                           contents: function() {
                               des.room({ type: 'ordinary', x: 4, y: 3, w: 3, h: 3,
                                          filled: 1,
                                          contents: function() {
                                              des.door({ state: 'random', wall: 'all' });
                                          },
                               });
                           },
                });
            },
        },
        {
            name: 'Room in a room',
            contents: function() {
                des.room({ type: 'ordinary', filled: 1,
                           contents: function() {
                               des.room({ type: 'ordinary',
                                          contents: function() {
                                              des.door({ state: 'random', wall: 'all' });
                                          },
                               });
                           },
                });
            },
        },
        {
            name: 'Huge room with another room inside',
            contents: function() {
                des.room({ type: 'ordinary', w: contents_rn2(325, 10) + 11,
                           h: contents_rn2(325, 5) + 8,
                           filled: 1,
                           contents: function() {
                               if (percent(90)) {
                                   des.room({ type: 'ordinary', filled: 1,
                                              contents: function() {
                                                  des.door({ state: 'random', wall: 'all' });
                                                  if (percent(50)) {
                                                      des.door({ state: 'random', wall: 'all' });
                                                  }
                                              },
                                   });
                               }
                           },
                });
            },
        },
        {
            name: 'Nesting rooms',
            contents: function() {
                des.room({ type: 'ordinary', w: 9 + contents_rn2(346, 4),
                           h: 9 + contents_rn2(346, 4),
                           filled: 1,
                           contents: function(rm) {
                               const wid = lua_random(349, Math.floor(rm.width / 2), rm.width - 2);
                               const hei = lua_random(350, Math.floor(rm.height / 2),
                                                      rm.height - 2);
                               des.room({ type: 'ordinary', w: wid, h: hei, filled: 1,
                                          contents: function() {
                                              if (percent(90)) {
                                                  des.room({ type: 'ordinary', filled: 1,
                                                             contents: function() {
                                                                 des.door({ state: 'random', wall: 'all' });
                                                                 if (percent(15)) {
                                                                     des.door({ state: 'random', wall: 'all' });
                                                                 }
                                                             },
                                                  });
                                              }
                                              des.door({ state: 'random', wall: 'all' });
                                              if (percent(15)) {
                                                  des.door({ state: 'random', wall: 'all' });
                                              }
                                          },
                               });
                           },
                });
            },
        },
        {
            name: 'Default room with themed fill',
            frequency: 6,
            contents: function() {
                des.room({ type: 'themed', contents: G.themeroom_fill });
            },
        },
        {
            name: 'Unlit room with themed fill',
            frequency: 2,
            contents: function() {
                des.room({ type: 'themed', lit: 0, contents: G.themeroom_fill });
            },
        },
        {
            name: 'Room with both normal contents and themed fill',
            frequency: 2,
            contents: function() {
                des.room({ type: 'themed', filled: 1, contents: G.themeroom_fill });
            },
        },
        {
            name: 'Pillars',
            contents: function() {
                des.room({ type: 'themed', w: 10, h: 10,
                           contents: function(rm) {
                               const terr = ['-', '-', '-', '-', 'L', 'P', 'T'];
                               shuffle(terr);
                               for (let x = 0; x <= (rm.width / 4) - 1; x++) {
                                   for (let y = 0; y <= (rm.height / 4) - 1; y++) {
                                       des.terrain({ x: x * 4 + 2, y: y * 4 + 2, typ: terr[0], lit: -2 });
                                       des.terrain({ x: x * 4 + 3, y: y * 4 + 2, typ: terr[0], lit: -2 });
                                       des.terrain({ x: x * 4 + 2, y: y * 4 + 3, typ: terr[0], lit: -2 });
                                       des.terrain({ x: x * 4 + 3, y: y * 4 + 3, typ: terr[0], lit: -2 });
                                   }
                               }
                           },
                });
            },
        },
        {
            name: 'Mausoleum',
            contents: function() {
                des.room({ type: 'themed', w: 5 + contents_rn2(422, 3) * 2,
                           h: 5 + contents_rn2(422, 3) * 2,
                           contents: function(rm) {
                               des.room({ type: 'themed',
                                          x: (rm.width - 1) / 2, y: (rm.height - 1) / 2,
                                          w: 1, h: 1, joined: false,
                                          contents: function() {
                                              if (percent(50)) {
                                                  const mons = ['M', 'V', 'L', 'Z'];
                                                  shuffle(mons);
                                                  des.monster({ class: mons[0], x: 0, y: 0, waiting: 1 });
                                              } else {
                                                  des.object({ id: 'corpse', montype: '@', coord: [0, 0] });
                                              }
                                              if (percent(20)) {
                                                  des.door({ state: 'secret', wall: 'all' });
                                              }
                                          },
                               });
                           },
                });
            },
        },
        {
            name: 'Random dungeon feature in the middle of an odd-sized room',
            contents: function() {
                const wid = 3 + (contents_rn2(448, 3) * 2);
                const hei = 3 + (contents_rn2(449, 3) * 2);
                des.room({ type: 'ordinary', filled: 1, w: wid, h: hei,
                           contents: function(rm) {
                               const feature = ['C', 'L', 'I', 'P', 'T'];
                               shuffle(feature);
                               des.terrain((rm.width - 1) / 2, (rm.height - 1) / 2,
                                           feature[0]);
                           },
                });
            },
        },
        { name: 'L-shaped', contents: map_room(MAP_L_shaped, 1, 1) },
        { name: 'L-shaped, rot 1', contents: map_room(MAP_L_shaped_rot_1, 5, 1) },
        { name: 'L-shaped, rot 2', contents: map_room(MAP_L_shaped_rot_2, 1, 1) },
        { name: 'L-shaped, rot 3', contents: map_room(MAP_L_shaped_rot_3, 1, 1) },
        {
            name: 'Blocked center',
            contents: function() {
                des.map({ map: MAP_Blocked_center, contents: function(m) {
                    if (percent(30)) {
                        const terr = ['-', 'P'];
                        shuffle(terr);
                        des.replace_terrain({ region: [1, 1, 9, 9],
                                              fromterrain: 'L',
                                              toterrain: terr[0] });
                    }
                    G.filler_region(1, 1);
                } });
            },
        },
        { name: 'Circular, small', contents: map_room(MAP_Circular_small, 3, 3) },
        { name: 'Circular, medium', contents: map_room(MAP_Circular_medium, 4, 4) },
        { name: 'Circular, big', contents: map_room(MAP_Circular_big, 5, 5) },
        { name: 'T-shaped', contents: map_room(MAP_T_shaped, 5, 5) },
        { name: 'T-shaped, rot 1', contents: map_room(MAP_T_shaped_rot_1, 2, 2) },
        { name: 'T-shaped, rot 2', contents: map_room(MAP_T_shaped_rot_2, 2, 2) },
        { name: 'T-shaped, rot 3', contents: map_room(MAP_T_shaped_rot_3, 5, 5) },
        { name: 'S-shaped', contents: map_room(MAP_S_shaped, 2, 2) },
        { name: 'S-shaped, rot 1', contents: map_room(MAP_S_shaped_rot_1, 5, 5) },
        { name: 'Z-shaped', contents: map_room(MAP_Z_shaped, 5, 5) },
        { name: 'Z-shaped, rot 1', contents: map_room(MAP_Z_shaped_rot_1, 2, 2) },
        { name: 'Cross', contents: map_room(MAP_Cross, 6, 6) },
        { name: 'Four-leaf clover', contents: map_room(MAP_Four_leaf_clover, 6, 6) },
        {
            name: 'Water-surrounded vault',
            contents: function() {
                des.map({ map: MAP_Water_surrounded_vault, contents: function(m) {
                    des.region({ region: [3, 3, 3, 3], type: 'themed', irregular: true,
                                 filled: 0, joined: false });
                    const nasty_undead = ['giant zombie', 'ettin zombie', 'vampire lord'];
                    const chest_spots = [[2, 2], [3, 2], [2, 3], [3, 3]];
                    shuffle(chest_spots);
                    const escape_items = [
                        'scroll of teleportation', 'ring of teleportation',
                        'wand of teleportation', 'wand of digging',
                    ];
                    const itm = G.obj.new(escape_items[withRngCaller(
                        'random src=nhlib.lua:8 parent=lua(themerms.lua:793)',
                        () => G.math.random(escape_items.length)) - 1]);
                    const itmcls = lua_callmeth(itm, 'class');
                    let box;
                    if (itmcls.material === 'glass') {
                        // explicitly force chest to be unlocked
                        box = des.object({ id: 'chest', coord: chest_spots[0],
                                           olocked: 'no' });
                    } else {
                        // accept random locked/unlocked state
                        box = des.object({ id: 'chest', coord: chest_spots[0] });
                    }
                    lua_callmeth(box, 'addcontent', itm);
                    for (let i = 2; i <= chest_spots.length; i++) {
                        des.object({ id: 'chest', coord: chest_spots[i - 1] });
                    }
                    shuffle(nasty_undead);
                    des.monster(nasty_undead[0], 2, 2);
                    des.exclusion({ type: 'teleport', region: [2, 2, 3, 3] });
                } });
            },
        },
        {
            name: 'Twin businesses',
            mindiff: 4, // arbitrary
            contents: function() {
                // The shop placement code (themerms.lua lines 821-866) is
                // not ported yet; des.room raises the not-ported error for
                // its inner rooms before any of it would roll.
                des.room({ type: 'themed', w: 9, h: 5, contents: function() {
                    lua_error('Twin businesses: shop placement is not ported yet');
                } });
            },
        },
    ];

    // -- store these at global scope, they will be reinitialized in
    // -- pre_themerooms_generate
    G.debug_rm_idx = undefined;
    G.debug_fill_idx = undefined;

    // function filler_region(x, y)
    G.filler_region = function filler_region(x, y) {
        let rmtyp = 'ordinary';
        let func = undefined;
        if (percent(30)) {
            rmtyp = 'themed';
            func = G.themeroom_fill;
        }
        des.region({ region: [x, y, x, y], type: rmtyp, irregular: true, filled: 1, contents: func });
    };

    // function is_eligible(room, mkrm)
    G.is_eligible = function is_eligible(room, mkrm) {
        const diff = nh.level_difficulty();
        if (room.mindiff !== undefined && diff < room.mindiff) {
            return false;
        } else if (room.maxdiff !== undefined && diff > room.maxdiff) {
            return false;
        }
        if (mkrm !== undefined && room.eligible !== undefined) {
            return room.eligible(mkrm);
        }
        return true;
    };

    // -- given the name of a themed room or fill, return its index in that array
    G.lookup_by_name = function lookup_by_name(name, checkfills) {
        if (name === undefined || name === null) {
            return undefined;
        }
        if (checkfills) {
            for (let i = 1; i <= G.themeroom_fills.length; i++) {
                if (G.themeroom_fills[i - 1].name === name) {
                    return i;
                }
            }
        } else {
            for (let i = 1; i <= G.themerooms.length; i++) {
                if (G.themerooms[i - 1].name === name) {
                    return i;
                }
            }
        }
        return undefined;
    };

    // -- called repeatedly until the core decides there are enough rooms
    G.themerooms_generate = function themerooms_generate() {
        if (G.debug_rm_idx !== undefined) {
            // THEMERM debugging (wizard mode only) is not ported:
            // nh.debug_themerm() always returns nil here.
            lua_error('themerooms_generate: debug_rm_idx is not ported');
        } else if (G.debug_fill_idx !== undefined) {
            lua_error('themerooms_generate: debug_fill_idx is not ported');
        }
        let pick = undefined;
        let total_frequency = 0;
        for (let i = 1; i <= G.themerooms.length; i++) {
            const rm = G.themerooms[i - 1];
            if (typeof rm !== 'object') {
                nh.impossible(`themed room ${i} is not a table`);
            } else if (G.is_eligible(rm, undefined)) {
                // Reservoir sampling: select one room from the set of eligible rooms,
                // which may change on different levels because of level difficulty.
                let this_frequency;
                if (rm.frequency !== undefined) {
                    this_frequency = rm.frequency;
                } else {
                    this_frequency = 1;
                }
                total_frequency = total_frequency + this_frequency;
                // avoid rn2(0) if a room has freq 0
                if (this_frequency > 0
                    && withRngCaller('nh.rn2(themerms.lua:969)',
                                     () => nh.rn2(total_frequency)) < this_frequency) {
                    pick = i;
                }
            }
        }
        if (pick === undefined) {
            nh.impossible('no eligible themed rooms?');
            return;
        }
        G.themerooms[pick - 1].contents();
    };

    // -- called before any rooms are generated
    G.pre_themerooms_generate = function pre_themerooms_generate() {
        const debug_themerm = nh.debug_themerm(false);
        const debug_fill = nh.debug_themerm(true);
        let xtrainfo = '';
        G.debug_rm_idx = G.lookup_by_name(debug_themerm, false);
        G.debug_fill_idx = G.lookup_by_name(debug_fill, true);
        if (debug_themerm !== undefined && G.debug_rm_idx === undefined) {
            if (G.lookup_by_name(debug_themerm, true) !== undefined) {
                xtrainfo = '; it is a fill type';
            }
            G.pline(`Warning: themeroom '${debug_themerm}' not found in themerooms${xtrainfo}`, true);
        }
        if (debug_fill !== undefined && G.debug_fill_idx === undefined) {
            if (G.lookup_by_name(debug_fill, false) !== undefined) {
                xtrainfo = '; it is a room type';
            }
            G.pline(`Warning: themeroom fill '${debug_fill}' not found in themeroom_fills${xtrainfo}`, true);
        }
    };

    // -- called after all rooms have been generated
    // -- but before creating connecting corridors/doors, or filling rooms
    G.post_themerooms_generate = function post_themerooms_generate() {
    };

    // function themeroom_fill(rm)
    // Called by C (lspo_room / lspo_region run the room's contents), so the
    // recorder tags its nh.rn2 with the des function as parent.
    G.themeroom_fill = function themeroom_fill(rm) {
        if (G.debug_fill_idx !== undefined) {
            lua_error('themeroom_fill: debug_fill_idx is not ported');
        }
        let pick = undefined;
        let total_frequency = 0;
        for (let i = 1; i <= G.themeroom_fills.length; i++) {
            const fill = G.themeroom_fills[i - 1];
            if (typeof fill !== 'object') {
                nh.impossible(`themeroom fill ${i} must be a table`);
            } else if (G.is_eligible(fill, rm)) {
                // Reservoir sampling: select one room from the set of eligible rooms,
                // which may change on different levels because of level difficulty.
                let this_frequency;
                if (fill.frequency !== undefined) {
                    this_frequency = fill.frequency;
                } else {
                    this_frequency = 1;
                }
                total_frequency = total_frequency + this_frequency;
                // avoid rn2(0) if a fill has freq 0
                if (this_frequency > 0
                    && withRngCaller(`nh.rn2 src=themerms.lua:1039 parent=${game.lua_des_caller}([C]:-1)`,
                                     () => nh.rn2(total_frequency)) < this_frequency) {
                    pick = i;
                }
            }
        }
        if (pick === undefined) {
            nh.impossible('no eligible themed room fills?');
            return;
        }
        G.themeroom_fills[pick - 1].contents(rm);
    };

    // -- postprocess callback: create an engraving pointing at a location
    G.make_dig_engraving = function make_dig_engraving(data) {
        const floors = selection.negate().filter_mapchar('.');
        const pos = floors.rndcoord(0);
        const tx = data.x - pos.x - 1;
        const ty = data.y - pos.y;
        let dig = '';
        if (tx === 0 && ty === 0) {
            dig = ' here';
        } else {
            if (tx < 0 || tx > 0) {
                dig = ` ${Math.abs(tx)} ${(tx > 0) ? 'east' : 'west'}`;
            }
            if (ty < 0 || ty > 0) {
                dig = dig + ` ${Math.abs(ty)} ${(ty > 0) ? 'south' : 'north'}`;
            }
        }
        des.engraving({ coord: pos, type: 'burn', text: 'Dig' + dig });
    };

    // -- postprocess callback: turn room walls into trees
    G.make_garden_walls = function make_garden_walls(data) {
        const sel = data.sel.grow();
        // change walls to trees
        des.replace_terrain({ selection: sel, fromterrain: 'w', toterrain: 'T' });
        // update secret doors; attempting to change to AIR will set arboreal flag
        des.replace_terrain({ selection: sel, fromterrain: 'S', toterrain: 'A' });
    };

    // -- postprocess callback: make a trap
    G.make_a_trap = function make_a_trap(data) {
        if (data.teledest === 1 && data.type === 'teleport') {
            const locs = selection.negate().filter_mapchar('.');
            do {
                data.teledest = locs.rndcoord(1);
            } while (!(data.teledest.x !== data.coord.x && data.teledest.y !== data.coord.y));
        }
        des.trap(data);
    };

    // -- called once after the whole level has been generated
    G.post_level_generate = function post_level_generate() {
        for (const v of postprocess) {
            v.handler(v.data);
        }
        postprocess = [];
    };
}
