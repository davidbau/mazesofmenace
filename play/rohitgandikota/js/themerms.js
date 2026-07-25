// themerms.js — the themeroom fills.
// C ref: dat/themerms.lua
//
// Each fill is a Lua `contents` function. They are transcribed here rather than
// interpreted, the same way js/mklev.js already transcribes the shaped rooms'
// contents.
//
// Order matters more than usual: themeroom_fill() picks one by reservoir
// sample (which draws), and then the chosen fill draws too. Wiring the sample
// without the fills makes several sessions diverge EARLIER, measured at -915
// RNG positions, because C keeps drawing exactly where we would go quiet.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { percent, lua_shuffle, lua_d, nh_random } from './nhlua.js';
import { level_difficulty } from './makemon.js';
import { selection_from_mkroom, selection_iterate, selection_rndcoord,
         selection_filter_percent, selection_numpoints,
         selection_filter_mapchar } from './selvar.js';
import { ROOM } from './const.js';
import { lspo_terrain } from './sp_lev.js';

function note_unported_themerms(what) {
    (game.unported ||= new Set()).add(what);
}

// dat/themerms.lua:47 "Ice room"
//
//     local ice = selection.room();
//     des.terrain(ice, "I");
//     if (percent(25)) then
//        local mintime = 1000 - (nh.level_difficulty() * 100);
//        local ice_melter = function(x,y)
//           nh.start_timer_at(x,y, "melt-ice", mintime + nh.rn2(1000));
//        end;
//        ice:iterate(ice_melter);
//     end
//
// The percent(25) is spent whether or not any square melts, and the rn2(1000)
// is spent once PER SQUARE when it passes.
export function fill_ice_room(rm) {
    const ice = selection_from_mkroom(rm._mkroom || rm);

    lspo_terrain(ice, 'I');
    if (percent(25)) {
        const mintime = 1000 - (level_difficulty() * 100);

        selection_iterate(ice, (x, y) => {
            /* nh.start_timer_at(x, y, "melt-ice", mintime + nh.rn2(1000)) —
               the draw is real and ordered; the timer itself needs the timeout
               queue, which is not ported. */
            const when = mintime + rn2(1000);
            note_unported_themerms('start_timer_at:melt-ice');
            return when;
        });
    }
}

// dat/themerms.lua:76 "Boulder room"
//
//     local locs = selection.room():percentage(30);
//     local func = function(x,y)
//        if (percent(50)) then des.object("boulder", x, y);
//        else des.trap("rolling boulder", x, y); end
//     end;
//     locs:iterate(func);
//
// percentage(30) spends one rn2(100) per square of the room, then the iterate
// spends one rn2(100) per SELECTED square. Both are ported; the object and trap
// placement is what still records.
export function fill_boulder_room(rm) {
    const locs = selection_filter_percent(selection_from_mkroom(rm._mkroom || rm), 30);

    selection_iterate(locs, (x, y) => {
        if (percent(50))
            note_unported_themerms('des.object:boulder');
        else
            note_unported_themerms('des.trap:rolling boulder');
    });
}

// dat/themerms.lua:105 "Trap room"
//
//     local traps = { "arrow", "dart", "falling rock", "bear",
//                     "land mine", "sleep gas", "rust", "anti magic" };
//     shuffle(traps);
//     local locs = selection.room():percentage(30);
//     locs:iterate(function(x,y) des.trap(traps[1], x, y) end);
//
// shuffle() on eight entries spends rn2(8) down to rn2(2), seven draws, BEFORE
// the percentage() pass. Only traps[1] is ever used, but the whole shuffle
// happens regardless.
export function fill_trap_room(rm) {
    const traps = ['arrow', 'dart', 'falling rock', 'bear',
                   'land mine', 'sleep gas', 'rust', 'anti magic'];

    lua_shuffle(traps);

    const locs = selection_filter_percent(selection_from_mkroom(rm._mkroom || rm), 30);

    selection_iterate(locs, (x, y) => {
        note_unported_themerms(`des.trap:${traps[0]}`);
    });
}

// dat/themerms.lua:176 "Statuary"
//
//     for i = 1, d(5,5) do des.object({ id = "statue" }); end
//     for i = 1, d(3) do des.trap("statue"); end
//
// Lua evaluates each loop bound ONCE, so d(5,5)'s five draws all happen before
// any statue is placed, and d(3)'s single draw after the last one.
export function fill_statuary(rm) {
    const nstatues = lua_d(5, 5);
    for (let i = 1; i <= nstatues; i++)
        note_unported_themerms('des.object:statue');

    const ntraps = lua_d(3);
    for (let i = 1; i <= ntraps; i++)
        note_unported_themerms('des.trap:statue');
}

// dat/themerms.lua:157 "Massacre"
//
//     local idx = math.random(#mon);
//     for i = 1, d(5,5) do
//        if (percent(10)) then idx = math.random(#mon); end
//        des.object({ id = "corpse", montype = mon[idx] });
//     end
//
// The first math.random(27) is spent before the count, and the percent(10)
// inside the loop is spent EVERY iteration whether or not it re-rolls idx.
export function fill_massacre(rm) {
    const mon = ['apprentice', 'warrior', 'ninja', 'thug',
                 'hunter', 'acolyte', 'abbot', 'page',
                 'attendant', 'neanderthal', 'chieftain',
                 'student', 'wizard', 'valkyrie', 'tourist',
                 'samurai', 'rogue', 'ranger', 'priestess',
                 'priest', 'monk', 'knight', 'healer',
                 'cavewoman', 'caveman', 'barbarian',
                 'archeologist'];
    let idx = nh_random(1, mon.length);     /* math.random(#mon) */
    const n = lua_d(5, 5);

    for (let i = 1; i <= n; i++) {
        if (percent(10))
            idx = nh_random(1, mon.length);
        note_unported_themerms('des.object:corpse');
    }
}

// dat/themerms.lua:191 "Light source" — one unlit-room object, no draws.
export function fill_light_source(rm) {
    note_unported_themerms('des.object:oil lamp');
}

// dat/themerms.lua:199 "Temple of the gods" — three altars, one per alignment,
// in the order nhlib.lua's shuffled `align` table holds them. The shuffle
// happened once at nhl_init(); nothing draws here.
export function fill_temple_of_the_gods(rm) {
    for (const _ of (game.splev_align || []))
        note_unported_themerms('des.altar');
}

// dat/themerms.lua:92 "Spider nest"
//
//     local spooders = nh.level_difficulty() > 8;
//     local locs = selection.room():percentage(30);
//     locs:iterate(function(x,y)
//        des.trap({ type = "web", x = x, y = y,
//                   spider_on_web = spooders and percent(80) });
//     end);
//
// Lua's `and` SHORT-CIRCUITS, so percent(80) is evaluated only when spooders is
// true. On a level of difficulty 8 or less this fill spends no draws inside the
// loop at all; above it, one per selected square. Writing it as an unconditional
// percent(80) would add a draw per square on every shallow level.
export function fill_spider_nest(rm) {
    const spooders = level_difficulty() > 8;
    const locs = selection_filter_percent(selection_from_mkroom(rm._mkroom || rm), 30);

    selection_iterate(locs, (x, y) => {
        const spider_on_web = spooders && percent(80);
        note_unported_themerms('des.trap:web');
    });
}

// dat/themerms.lua:253 "Storeroom"
//
//     local locs = selection.room():percentage(30);
//     locs:iterate(function(x,y)
//        if (percent(25)) then des.object("chest");
//        else des.monster({ class = "m", appear_as = "obj:chest" }); end
//     end);
export function fill_storeroom(rm) {
    const locs = selection_filter_percent(selection_from_mkroom(rm._mkroom || rm), 30);

    selection_iterate(locs, (x, y) => {
        if (percent(25))
            note_unported_themerms('des.object:chest');
        else
            note_unported_themerms('des.monster:mimic-as-chest');
    });
}

// dat/themerms.lua:65 "Cloud room"
//
//     local fog = selection.room();
//     for i = 1, (fog:numpoints() / 4) do
//        des.monster({ id = "fog cloud", asleep = true });
//     end
//     des.gas_cloud({ selection = fog });
//
// Lua's numeric for with a fractional limit runs while i <= limit, so a room of
// 14 squares gives 3.5 and three iterations. No draws here; the monsters and
// the gas cloud are what record.
export function fill_cloud_room(rm) {
    const fog = selection_from_mkroom(rm._mkroom || rm);
    const limit = selection_numpoints(fog) / 4;

    for (let i = 1; i <= limit; i++)
        note_unported_themerms('des.monster:fog cloud');

    note_unported_themerms('des.gas_cloud');
}

// dat/themerms.lua:225 "Ghost of an Adventurer"
//
// One rndcoord, then SIX percent() gates in a fixed order: 65, 55, 45, 65, 20,
// 20. Every one is evaluated regardless of what the earlier ones returned, so
// this fill always spends exactly seven draws.
export function fill_ghost_of_an_adventurer(rm) {
    const loc = selection_rndcoord(selection_from_mkroom(rm._mkroom || rm), 0);

    note_unported_themerms('des.monster:ghost');

    if (percent(65)) note_unported_themerms('des.object:dagger');
    if (percent(55)) note_unported_themerms('des.object:weapon');
    if (percent(45)) {
        note_unported_themerms('des.object:bow');
        note_unported_themerms('des.object:arrow');
    }
    if (percent(65)) note_unported_themerms('des.object:armor');
    if (percent(20)) note_unported_themerms('des.object:ring');
    if (percent(20)) note_unported_themerms('des.object:scroll');
}

// dat/themerms.lua:154 "Buried zombies"
//
// The candidate list GROWS with depth: four species below difficulty 4, six up
// to 6, eight above. shuffle() therefore costs three, five or seven draws per
// iteration, and there is one iteration per two squares of the room.
//
// math.random(990, 1010) goes through the shim as nh.random(990, 21), i.e.
// 990 + rn2(21) — one more draw each time round.
export function fill_buried_zombies(rm) {
    const diff = level_difficulty();
    const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];

    if (diff > 3) {
        zombifiable[4] = 'elf';
        zombifiable[5] = 'human';
        if (diff > 6) {
            zombifiable[6] = 'ettin';
            zombifiable[7] = 'giant';
        }
    }

    const n = (rm.width * rm.height) / 2;
    for (let i = 1; i <= n; i++) {
        lua_shuffle(zombifiable);
        note_unported_themerms('des.object:buried corpse');
        /* o:stop_timer("rot-corpse") draws nothing */
        nh_random(990, 21);             /* start_timer zombify-mon delay */
        note_unported_themerms('start_timer:zombify-mon');
    }
}

// dat/themerms.lua:120 "Garden" — only eligible in a LIT room.
//
//     local npts = (s:numpoints() / 6);
//     for i = 1, npts do
//        des.monster({ id = "wood nymph", asleep = true });
//        if (percent(30)) then des.feature("fountain"); end
//     end
//     table.insert(postprocess, { handler = make_garden_walls, ... });
//
// One percent(30) per nymph. The postprocess entry runs after the whole level
// is built, not here.
export function fill_garden(rm) {
    const s = selection_from_mkroom(rm._mkroom || rm);
    const npts = selection_numpoints(s) / 6;

    for (let i = 1; i <= npts; i++) {
        note_unported_themerms('des.monster:wood nymph');
        if (percent(30))
            note_unported_themerms('des.feature:fountain');
    }
    note_unported_themerms('postprocess:make_garden_walls');
}

// dat/themerms.lua:137 "Buried treasure"
//
//     des.object({ id = "chest", buried = true, contents = function(otmp)
//        ...
//        for i = 1, d(3,4) do des.object(); end
//     end });
//
// The d(3,4) is THREE draws and they happen inside the chest's contents
// closure, i.e. after the chest itself is placed, not before.
export function fill_buried_treasure(rm) {
    note_unported_themerms('des.object:buried chest');
    note_unported_themerms('postprocess:make_dig_engraving');

    const n = lua_d(3, 4);
    for (let i = 1; i <= n; i++)
        note_unported_themerms('des.object:random in chest');
}

// dat/themerms.lua:268 "Teleportation hub"
//
//     local locs = selection.room():filter_mapchar(".");
//     for i = 1, 2 + nh.rn2(3) do
//        local pos = locs:rndcoord(1);
//        if (pos.x > 0) then ... postprocess make_a_trap ... end
//     end
//
// rndcoord(1) REMOVES the square it picks, so the count shrinks each round and
// the rn2 inside it narrows with it. The loop bound's rn2(3) is spent once,
// before any of them.
export function fill_teleportation_hub(rm) {
    const locs = selection_filter_mapchar(selection_from_mkroom(rm._mkroom || rm), ROOM, -2);
    const n = 2 + rn2(3);

    for (let i = 1; i <= n; i++) {
        const pos = selection_rndcoord(locs, 1);
        if (pos.x > 0)
            note_unported_themerms('postprocess:make_a_trap:teleport');
    }
}

// dat/themerms.lua themeroom_fills[] — name to contents, in table order.
//
// The reservoir sample in themeroom_fill() picks by name; this is the dispatch
// it picks into. Every entry is present, which is the precondition for wiring
// the sample at all: with the sample drawing and the contents absent, C keeps
// drawing where we go quiet and levels diverge EARLIER than with neither
// ported. That cost 915 RNG positions when tried prematurely.
export const themeroom_fill_contents = {
    'Ice room':               fill_ice_room,
    'Cloud room':             fill_cloud_room,
    'Boulder room':           fill_boulder_room,
    'Spider nest':            fill_spider_nest,
    'Trap room':              fill_trap_room,
    'Garden':                 fill_garden,
    'Buried treasure':        fill_buried_treasure,
    'Buried zombies':         fill_buried_zombies,
    'Massacre':               fill_massacre,
    'Statuary':               fill_statuary,
    'Light source':           fill_light_source,
    'Temple of the gods':     fill_temple_of_the_gods,
    'Ghost of an Adventurer': fill_ghost_of_an_adventurer,
    'Storeroom':              fill_storeroom,
    'Teleportation hub':      fill_teleportation_hub,
};
