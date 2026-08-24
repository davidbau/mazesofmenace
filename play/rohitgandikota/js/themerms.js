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
import { selection_from_mkroom, l_selection_iterate, selection_rndcoord,
         selection_filter_percent, selection_numpoints,
         selection_filter_mapchar, selection_not,
         selection_new, selection_clear } from './selvar.js';
import { ROOM } from './const.js';
import { lspo_engraving, lspo_terrain, lspo_trap, get_traptype_byname,
         lspo_object, lspo_monster, lspo_altar } from './sp_lev.js';

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

        l_selection_iterate(ice, (x, y) => {
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

    l_selection_iterate(locs, (x, y) => {
        if (percent(50))
            lspo_object('boulder', x, y);
        else
            lspo_trap(get_traptype_byname('rolling boulder'), x, y);
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

    l_selection_iterate(locs, (x, y) => {
        lspo_trap(get_traptype_byname(traps[0]), x, y);
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
        lspo_object('statue');          /* no coord: random in the room */

    const ntraps = lua_d(3);
    for (let i = 1; i <= ntraps; i++)
        lspo_trap(get_traptype_byname('statue'));   /* no coord: random */
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
    lspo_object('oil lamp', undefined, undefined, { lit: true });
}

// dat/themerms.lua:199 "Temple of the gods" — three altars, one per alignment,
// in the order nhlib.lua's shuffled `align` table holds them. The shuffle
// happened once at nhl_init(); nothing draws here.
export function fill_temple_of_the_gods(rm) {
    /* des.altar({ align = align[1..3] }) — nhlib.lua's `align` table, shuffled
       once at nhl_init(). Nothing draws here: the shuffle already happened and
       an altar with no `type` has shrine 0, which skips create_altar's rn2(2). */
    for (const al of (game.splev_align || []))
        lspo_altar({ align: al });
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

    l_selection_iterate(locs, (x, y) => {
        const spider_on_web = spooders && percent(80);
        lspo_trap(get_traptype_byname('web'), x, y, { spider_on_web });
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

    l_selection_iterate(locs, (x, y) => {
        if (percent(25))
            lspo_object('chest');
        else
            lspo_monster(null, undefined, undefined,
                         { class: 'm', appear_as: 'obj:chest' });
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
        lspo_monster('fog cloud', undefined, undefined, { asleep: true });

    note_unported_themerms('des.gas_cloud');
}

// dat/themerms.lua:225 "Ghost of an Adventurer"
//
// One rndcoord, then SIX percent() gates in a fixed order: 65, 55, 45, 65, 20,
// 20. Every one is evaluated regardless of what the earlier ones returned, so
// this fill always spends exactly seven draws.
export function fill_ghost_of_an_adventurer(rm) {
    const loc = selection_rndcoord(selection_from_mkroom(rm._mkroom || rm), 0);

    lspo_monster('ghost', loc.x, loc.y, { asleep: true, waiting: true });

    const nb = { coord: loc, buc: 'not-blessed' };
    if (percent(65)) lspo_object('dagger', undefined, undefined, nb);
    if (percent(55)) lspo_object(')', undefined, undefined, nb);
    if (percent(45)) {
        lspo_object('bow', undefined, undefined, nb);
        lspo_object('arrow', undefined, undefined, nb);
    }
    if (percent(65)) lspo_object('[', undefined, undefined, nb);
    if (percent(20)) lspo_object('=', undefined, undefined, nb);
    if (percent(20)) lspo_object('?', undefined, undefined, nb);
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

    /* dat/themerms.lua:162 —
     *
     *     for i = 1, (rm.width * rm.height) / 2 do
     *        shuffle(zombifiable);
     *        local o = des.object({ id = "corpse", montype = zombifiable[1],
     *                             buried = true });
     *        o:stop_timer("rot-corpse");
     *        o:start_timer("zombify-mon", math.random(990, 1010));
     *     end
     *
     * The des.object() was being skipped and only the timer's draw spent, so
     * the corpse's own coordinate -- somex/somey inside the room, plus
     * mksobj's draws -- never happened. */
    const n = (rm.width * rm.height) / 2;
    for (let i = 1; i <= n; i++) {
        lua_shuffle(zombifiable);
        lspo_object('corpse', undefined, undefined,
                    { montype: zombifiable[0], buried: true });
        /* o:stop_timer("rot-corpse") draws nothing */
        nh_random(990, 21);             /* math.random(990, 1010) */
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
        lspo_monster('wood nymph', undefined, undefined, { asleep: true });
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
    lspo_object('chest', undefined, undefined, {
        buried: true,
        contents: (otmp) => {
            /* `if (xobj.NO_OBJ == nil)` — obj:totable() sets NO_OBJ on a null
               object, so this registers only when the chest really exists. */
            if (otmp)
                postprocess_add(make_dig_engraving, { x: otmp.ox, y: otmp.oy });

            const n = lua_d(3, 4);
            for (let i = 1; i <= n; i++)
                lspo_object(undefined, undefined, undefined,
                            { inContainer: true });
        },
    });
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
        if (pos.x > 0) {
            pos.x = pos.x + rm.region.x1 - 1;
            pos.y = pos.y + rm.region.y1;
            postprocess_add(make_a_trap, {
                type: 'teleport', seen: true, coord: pos, teledest: 1,
            });
        }
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

// dat/themerms.lua:42 postprocess — handlers queued DURING level generation and
// run after all of it, in insertion order.
//
// The deferral is not cosmetic: make_a_trap picks its teleport destination from
// the finished level, so running it inline would search a half-built map and
// spend a different number of draws.
const postprocess = [];

export function postprocess_add(handler, data) {
    postprocess.push({ handler, data });
}

// dat/themerms.lua:1092 post_level_generate() — drain in order, then clear.
export function post_level_generate() {
    for (const v of postprocess)
        v.handler(v.data);
    postprocess.length = 0;
}

// dat/themerms.lua:1081 make_a_trap()
//
//     if (data.teledest == 1 and data.type == "teleport") then
//        local locs = selection.negate():filter_mapchar(".");
//        repeat
//           data.teledest = locs:rndcoord(1);
//        until (data.teledest.x ~= data.coord.x and data.teledest.y ~= data.coord.y);
//     end
//     des.trap(data);
//
// The repeat loop spends one rndcoord per pass, and rndcoord(1) REMOVES its
// pick, so the candidate set shrinks and each pass draws from a smaller range.
// The `and` in the until means it retries when EITHER coordinate matches.
// dat/themerms.lua:1052 make_dig_engraving() — the postprocess handler queued
// by "Buried treasure". It burns a note into the floor saying which way to dig.
//
//     local floors = selection.negate():filter_mapchar(".");
//     local pos = floors:rndcoord(0);
//     local tx = data.x - pos.x - 1;
//
// Exactly one draw, the rn2 inside rndcoord. filter_mapchar defaults lit to -2
// (nhlsel.c:663) so it sets matches unconditionally rather than spending an
// rn2(2) per square.
//
// The `- 1` on tx is not a typo to tidy up. The engraving reports the offset in
// the coordinate system the player reads off the screen, whose x is one less
// than the map x, and the Lua compensates on x only. ty has no such term.
export function make_dig_engraving(data) {
    const all = selection_new();
    selection_clear(all, 1);            /* selection.negate() */
    const floors = selection_filter_mapchar(all, ROOM, -2);
    const pos = selection_rndcoord(floors, 0);

    const tx = data.x - pos.x - 1;
    const ty = data.y - pos.y;
    let dig = '';

    if (tx === 0 && ty === 0) {
        dig = ' here';
    } else {
        if (tx < 0 || tx > 0)
            dig = ` ${Math.abs(tx)} ${tx > 0 ? 'east' : 'west'}`;
        if (ty < 0 || ty > 0)
            dig += ` ${Math.abs(ty)} ${ty > 0 ? 'south' : 'north'}`;
    }

    lspo_engraving({ coord: pos, type: 'burn', text: 'Dig' + dig });
}

export function make_a_trap(data) {
    if (data.teledest === 1 && data.type === 'teleport') {
        const all = selection_new();
        selection_clear(all, 1);        /* nhlsel.c:265 negate() with no self */
        const locs = selection_filter_mapchar(all, ROOM, -2);

        do {
            data.teledest = selection_rndcoord(locs, 1);
        } while (!(data.teledest.x !== data.coord.x
                   && data.teledest.y !== data.coord.y));
    }
    lspo_trap(get_traptype_byname(data.type), data.coord.x, data.coord.y,
              { seen: data.seen });
}
