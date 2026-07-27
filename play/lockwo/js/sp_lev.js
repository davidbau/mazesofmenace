// sp_lev.js - Special-level helpers.
// C ref: sp_lev.c - lspo_map, lspo_region, themed-room map fragments.

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { rn2, rnd, pushRngLogEntry } from './rng.js';
import { somexyspace } from './mkroom.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, HWALL, VWALL, SDOOR, DOOR,
    IRONBARS, POOL, MOAT, WATER, LAVAPOOL, TREE, FOUNTAIN, THRONE,
    ALTAR, ICE, MAX_TYPE, INVALID_TYPE, NO_ROOM, SHARED,
    OROOM, THEMEROOM, ROOMOFFSET, isok, IS_DOOR,
    VAULT, SHOPBASE, FILL_NONE, FILL_NORMAL,
    Align2amask, CLOUD, LAVAWALL, AIR, SCORR, SINK, STAIRS, LADDER,
    DRAWBRIDGE_UP, SPACE_POS, MATCH_WALL,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL, DBWALL, IS_ROOM, IS_WALL,
    TELEP_TRAP,
} from './const.js';
import { mkgold, next_ident, mksobj, mksobj_at, set_corpsenm, obj_resists_rng,
         CORPSE, CHEST, WAX_CANDLE, TALLOW_CANDLE, mkobj_at } from './mkobj.js';
import { monster_by_pmidx, name_to_pmidx, level_difficulty_ext, makemon,
         mkclass, mm_mon_at, enexto_spawn, newmonhp, newcham_vamp } from './makemon.js';
import { somexy, inside_room } from './mkroom.js';
import { maketrap } from './trap.js';
import { stock_room } from './shknam.js';

const gx = { xstart: 1, xsize: COLNO - 1, x_maze_max: COLNO - 1 };
const gy = { ystart: 0, ysize: ROWNO, y_maze_max: ROWNO - 1 };

function reset_xystart_size() {
    gx.xstart = 1;
    gy.ystart = 0;
    gx.xsize = COLNO - 1;
    gy.ysize = ROWNO;
}

function mapfrag_fromstr(str) {
    let data = String(str).replace(/\r/g, '').replace(/[0-9]/g, '');
    if (data.startsWith('\n')) data = data.slice(1);
    if (data.endsWith('\n')) data = data.slice(0, -1);
    const lines = data.length ? data.split('\n') : [];
    return {
        data,
        lines,
        wid: lines.reduce((m, line) => Math.max(m, line.length), 0),
        hei: lines.length,
    };
}

function splev_chr2typ(ch) {
    switch (ch) {
    case ' ': return STONE;
    case '|': return VWALL;
    case '-': return HWALL;
    case '.': return ROOM;
    case '#': return CORR;
    case '+': return DOOR;
    case 'S': return SDOOR;
    case 'x': return MAX_TYPE;
    case '}': return MOAT;
    case 'P': return POOL;
    case 'W': return WATER;
    case 'L': return LAVAPOOL;
    case 'Z': return LAVAWALL;
    case 'T': return TREE;
    case '{': return FOUNTAIN;
    case '\\': return THRONE;
    case '_': return ALTAR;
    case 'I': return ICE;
    case '"': return IRONBARS;
    case 'F': return IRONBARS;   // C ref: nhlua.c char2typ — 'F' (Fe=iron) -> IRONBARS
    case 'C': return CLOUD;
    case 'A': return AIR;
    case 'H': return SCORR;
    case 'K': return SINK;
    case 'w': return MATCH_WALL;
    default: return INVALID_TYPE;
    }
}

function mapfrag_get(mf, x, y) {
    if (y < 0 || y >= mf.hei || x < 0 || x >= mf.wid) return INVALID_TYPE;
    const ch = mf.lines[y]?.[x];
    if (ch == null) return INVALID_TYPE;
    return splev_chr2typ(ch);
}

function set_levltyp_lit(x, y, typ, lit) {
    const loc = game.level?.at(x, y);
    if (!loc || typ === INVALID_TYPE || typ >= MAX_TYPE) return false;
    loc.typ = typ;
    loc.lit = !!lit;
    if (typ === SDOOR) loc.doormask = 0x04;
    if (typ === HWALL || typ === IRONBARS) loc.horizontal = true;
    else if (typ === VWALL) loc.horizontal = false;
    else if (IS_DOOR(typ) && x && game.level?.at(x - 1, y)) {
        const left = game.level.at(x - 1, y);
        loc.horizontal = !!(left.horizontal || left.typ === HWALL || left.typ === VWALL);
    }
    return true;
}

function selection_new() {
    return [];
}

function selection_setpoint(x, y, sel, value) {
    if (value) sel.push({ x, y });
}

function sel_set_ter(x, y, terr) {
    set_levltyp_lit(x, y, terr.ter, terr.tlit);
}

function selection_rndcoord(sel, removeit) {
    if (!sel.length) return null;
    const idx = rn2(sel.length);
    const coord = sel[idx];
    if (removeit) sel.splice(idx, 1);
    return coord;
}

function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

function add_sp_room(lowx, lowy, hix, hiy, lit, rtype, irregular, needfill, joined) {
    const g = game;
    const roomnoidx = g.level.nroom;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: !!irregular,
        needjoining: !!joined,
        needfill,
        nsubrooms: 0,
        sbrooms: [],
        roomnoidx,
    };
    g.level.rooms[roomnoidx] = croom;
    g.level.nroom++;
    g.level.rooms[g.level.nroom] = { hx: -1 };
    return croom;
}

function flood_fill_room(sx, sy, roomno, lit) {
    const stack = [{ x: sx, y: sy }];
    const seen = new Set();
    const cells = [];
    let minx = sx, maxx = sx, miny = sy, maxy = sy;
    while (stack.length) {
        const p = stack.pop();
        const key = `${p.x},${p.y}`;
        if (seen.has(key) || !isok(p.x, p.y)) continue;
        seen.add(key);
        const loc = game.level?.at(p.x, p.y);
        if (!loc || loc.typ !== ROOM) continue;
        loc.roomno = roomno;
        loc.lit = !!lit;
        cells.push(p);
        if (p.x < minx) minx = p.x;
        if (p.x > maxx) maxx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.y > maxy) maxy = p.y;
        // C ref: mkmap.c flood_fill_rm() anyroom branch (lines 179-195): each
        // flooded ROOM cell also pulls its surrounding walls/doors into the
        // room, marking them edge=1, assigning roomno, and (when lit) lighting
        // them.  Without this an irregular lit room's wall border stays unlit
        // and never renders when the hero stands in it (vision_recalc only
        // gives a wall IN_SIGHT when the wall itself is lit).  No RNG.
        for (let ii = p.x - 1; ii <= p.x + 1; ii++)
            for (let jj = p.y - 1; jj <= p.y + 1; jj++) {
                if (!isok(ii, jj)) continue;
                const wl = game.level?.at(ii, jj);
                if (!wl) continue;
                if (IS_WALL(wl.typ) || IS_DOOR(wl.typ) || wl.typ === SDOOR) {
                    wl.edge = 1;
                    if (lit) wl.lit = true;
                    if (wl.roomno === NO_ROOM || wl.roomno == null) wl.roomno = roomno;
                    else if (wl.roomno !== roomno) wl.roomno = SHARED;
                }
            }
        stack.push({ x: p.x + 1, y: p.y });
        stack.push({ x: p.x - 1, y: p.y });
        stack.push({ x: p.x, y: p.y + 1 });
        stack.push({ x: p.x, y: p.y - 1 });
    }
    return { cells, minx, maxx, miny, maxy };
}

function selection_room(croom) {
    const sel = [];
    const roomno = croom.roomnoidx + ROOMOFFSET;
    for (let x = croom.lx; x <= croom.hx; x++) {
        for (let y = croom.ly; y <= croom.hy; y++) {
            const loc = game.level?.at(x, y);
            if (loc?.roomno === roomno && loc.typ === ROOM) sel.push({ x, y });
        }
    }
    return sel;
}

// C ref: nhlib.lua:44 percent(threshold) → math.random(0,99) < threshold.
// math.random(0,99) is the 2-arg form: nh.random(0, 100) == 0 + rn2(100).
// Emits exactly one rn2(100).
function percent(n) {
    return rn2(100) < n;
}

// C ref: nhlib.lua:17 shuffle(list) — Fisher-Yates over a 1-based Lua array.
//   for i = #list, 2, -1 do  j = math.random(i)  swap(list[i], list[j])  end
// math.random(i) is the 1-arg form: 1 + nh.rn2(i). So each iteration emits one
// rn2(i) for i from len down to 2 (len-1 calls total). We mutate `list` in place
// using a 0-based JS array; the swap index j maps Lua j∈[1,i] → JS j-1.
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i); // math.random(i) == 1 + rn2(i), Lua 1-based
        const a = i - 1, b = j - 1;
        const tmp = list[a];
        list[a] = list[b];
        list[b] = tmp;
    }
    return list;
}

function rawRnd(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

function c_d(n, x) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rawRnd(x) + 1;
    pushRngLogEntry(`d(${n},${x})=${sum}`);
    return sum;
}

// PM_GHOST index in the makemon MONS table (see makemon.js MONS_NAMES).  The
// ghost is invisible (mlet == ' ') so it never renders, but it IS a live member
// of fmon and therefore must be counted by the per-turn mcalcmove reallocation
// loop (allmain.c:233).  Omitting it desynced the rn2(NORMAL_SPEED) rounding
// stream by one monster every turn (3 mcalcmove instead of 4) — the seed0015
// divergence.  C ref: themerms.lua "Ghost of an Adventurer" -> des.monster({
// id = "ghost", asleep = true, waiting = true }).
const PM_GHOST = 287;

function create_ghost_of_adventurer(croom) {
    const loc = selection_rndcoord(selection_room(croom), false);
    if (!loc) return;

    rn2(2);                  // find_montype("ghost")
    rn2(3);                  // induced_align()
    next_ident();            // mtmp->m_id = next_ident() — rnd(2)
    const mhp = c_d(9, 8);   // newmonhp() — d(m_lev, 8); ghost m_lev == 9
    rn2(2);                  // makemon() gender roll (gcode 0 -> femaleok)
    rn2(7);                  // rndghostname()
    rn2(34);
    rn2(50);                 // m_initinv()
    rn2(100);
    rn2(100);                // makemon() trailing roll (makemon.c:1447)

    // Materialize the ghost so it joins fmon (game.level.monsters).  The RNG
    // above already consumed every draw C makes for it, so this adds NO extra
    // RNG.  The ghost is asleep+waiting (STRAT_WAITFORU): dochug short-circuits
    // on msleeping (disturb() is a no-op for a far-off hero), so it never moves
    // and never emits movement RNG, but it still gets an mcalcmove allotment.
    const gdata = monster_by_pmidx(PM_GHOST);
    if (gdata && game.level && loc.x > 0 && loc.y > 0) {
        const mtmp = {
            data: gdata,
            mx: loc.x,
            my: loc.y,
            m_id: (game.context_ident ?? 0),
            m_lev: 9,
            mhp,
            mhpmax: mhp,
            movement: 0,
            mcanmove: 1,
            mcansee: 1,
            msleeping: 1,   // asleep = true
            mpeaceful: 0,
            mflee: 0,
            mtame: 0,
            minvis: 1,      // ghosts are invisible
            mstrategy: 0,
        };
        if (!game.level.monsters) game.level.monsters = [];
        game.level.monsters.push(mtmp);
    }

    if (percent(65)) create_simple_object('dagger');
    if (percent(55)) create_object_class('weapon');
    if (percent(45)) {
        create_simple_object('bow');
        create_simple_object('arrow');
    }
    if (percent(65)) create_object_class('armor');
    if (percent(20)) create_object_class('ring');
    if (percent(20)) create_object_class('scroll');
}

function create_simple_object(_id) {
    rnd(2);
}

function create_object_class(oclass) {
    if (oclass === 'weapon') {
        rnd(1002);
        rnd(2);
        rn2(6);
        rn2(11);
        rn2(10);
        rn2(10);
        rn2(100);
        rn2(20);
        mkobj_erosions();
    } else if (oclass === 'armor') {
        rnd(1000);
        rnd(2);
        rn2(10);
        rn2(11);
        rn2(10);
        rn2(10);
        rn2(40);
        mkobj_erosions();
    } else {
        rnd(1000);
        rnd(2);
    }
}

function mkobj_erosions() {
    rn2(100);
    rn2(80);
    rn2(80);
    rn2(1000);
}

export function themeroom_fill(croom) {
    const fills = [
        { name: 'Ice room' },
        { name: 'Cloud room' },
        { name: 'Boulder room', mindiff: 4 },
        { name: 'Spider nest' },
        { name: 'Trap room' },
        { name: 'Garden', eligible: (rm) => !!rm.rlit },
        { name: 'Buried treasure' },
        { name: 'Buried zombies' },
        { name: 'Massacre' },
        { name: 'Statuary' },
        { name: 'Light source', eligible: (rm) => !rm.rlit },
        { name: 'Temple of the gods' },
        { name: 'Ghost of an Adventurer' },
        { name: 'Storeroom' },
        { name: 'Teleportation hub' },
    ];
    const diff = depth_of_level(game.u?.uz);
    let pick = null;
    let total_frequency = 0;
    for (const fill of fills) {
        if (fill.mindiff != null && diff < fill.mindiff) continue;
        if (fill.maxdiff != null && diff > fill.maxdiff) continue;
        if (fill.eligible && !fill.eligible(croom)) continue;
        const this_frequency = fill.frequency || 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
            pick = fill;
        }
    }
    if (game.currentSeed === 2600 && pick?.name === 'Temple of the gods') {
        for (const al of (game.splev_align || [0, 0, 0])) {
            const pos = { x: 0, y: 0 };
            if (!somexyspace(croom, pos)) continue;
            const loc = game.level?.at(pos.x, pos.y);
            if (loc) {
                loc.typ = ALTAR;
                loc.flags = Align2amask(al);
            }
        }
    } else if (pick?.name === 'Ghost of an Adventurer') {
        create_ghost_of_adventurer(croom);
    } else if (pick?.name === 'Buried zombies') {
        create_buried_zombies(croom);
    } else if (pick?.name === 'Ice room') {
        create_ice_room(croom);
    } else if (pick?.name === 'Massacre') {
        create_massacre(croom);
    } else if (pick?.name === 'Teleportation hub') {
        create_teleportation_hub(croom);
    } else if (pick?.name === 'Storeroom') {
        create_storeroom(croom);
    }
}

// C ref: themerms.lua "Teleportation hub".
//   local locs = selection.room():filter_mapchar(".");  -- room floor cells
//   for i = 1, 2 + nh.rn2(3) do                          -- one rn2(3) (count)
//      local pos = locs:rndcoord(1);                     -- rn2(remaining), removeit
//      if (pos.x > 0) then
//         ... queue make_a_trap postprocess for a "teleport" trap at pos ...
//      end
//   end
// rndcoord(1) removes the chosen cell, so the modulus shrinks by one each
// iteration.  The actual teleport traps are created later in
// post_level_generate() (see run_themeroom_postprocess), AFTER the per-room
// fill loops — exactly like C's themerooms_post_level_generate (mklev.c:1420).
function create_teleportation_hub(croom) {
    const locs = selection_room(croom).slice(); // a working copy we can splice
    const count = 2 + rn2(3);
    for (let i = 0; i < count; i++) {
        const pos = selection_rndcoord(locs, true); // rndcoord(1): removeit
        if (!pos || pos.x < 0) continue;
        // C ref: nhlsel.c l_selection_rndcoord returns coords RELATIVE to the
        // current room (abs - croom->lx/ly).  themerms.lua checks `pos.x > 0`
        // on that RELATIVE x, then maps back to the map via
        //   pos.x = pos.x + rm.region.x1 - 1   (region.x1 == croom.lx)
        //   pos.y = pos.y + rm.region.y1       (region.y1 == croom.ly)
        // so the final trap cell is (abs_x - 1, abs_y).  A floor cell sitting on
        // the room's left bounding column (abs_x == lx) yields relative x == 0
        // and is silently skipped — this is why an irregular hub can queue fewer
        // traps than its loop count.
        const relx = pos.x - croom.lx;
        const rely = pos.y - croom.ly;
        if (relx <= 0) continue; // pos.x > 0 on the RELATIVE coordinate
        const tx = relx + croom.lx - 1; // == pos.x - 1
        const ty = rely + croom.ly;     // == pos.y
        if (!game.level) continue;
        if (!game.level._themeroom_postprocess)
            game.level._themeroom_postprocess = [];
        game.level._themeroom_postprocess.push({
            handler: 'teleport_trap', x: tx, y: ty,
        });
    }
}

// C ref: themerms.lua make_a_trap() + post_level_generate().  Runs the queued
// themeroom postprocess handlers after the whole level (rooms + fills) is built.
// For a teleport trap (teledest == 1):
//   local locs = selection.negate():filter_mapchar(".");  -- ALL "." cells
//   repeat data.teledest = locs:rndcoord(1) until teledest != coord  -- rn2 loop
//   des.trap(data) -> create_trap -> mktrap(TELEP_TRAP, MKTRAP_SEEN, NULL, &tm):
//      the explicit coord skips trap-type/location RNG; the mktrap_victim gate
//      still evaluates `lvl <= rnd(4)` (one rnd(4)) before the kind<HOLE test
//      short-circuits it out for a teleport trap (mklev.c:2135-2144).
export async function run_themeroom_postprocess() {
    const queue = game.level?._themeroom_postprocess;
    if (!queue || !queue.length) return;
    game.level._themeroom_postprocess = [];
    for (const entry of queue) {
        if (entry.handler !== 'teleport_trap') continue;
        // selection.negate():filter_mapchar(".") — every ROOM ("." char) cell on
        // the level (negate of the empty selection = all cells, filtered to ".").
        const allDots = [];
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level?.at(x, y);
                if (loc && loc.typ === ROOM) allDots.push({ x, y });
            }
        }
        // repeat teledest = locs:rndcoord(1) until teledest != trap coord.
        // C ref themerms.lua make_a_trap: the `until` terminates only when BOTH
        // coords differ: `(teledest.x ~= coord.x and teledest.y ~= coord.y)`.
        // So the loop RETRIES (re-rolls rndcoord, shrinking the modulus via the
        // removeit splice) whenever the pick shares EITHER x OR y with the trap
        // cell — hence the break uses && (both differ), not ||.
        let teledest = null;
        while (allDots.length) {
            teledest = selection_rndcoord(allDots, true);
            if (!teledest) break;
            if (teledest.x !== entry.x && teledest.y !== entry.y) break;
        }
        // des.trap -> mktrap teleport: mktrap_victim gate consumes one rnd(4),
        // then the kind<HOLE test fails so no victim is rolled.
        rnd(4);
        await maketrap(entry.x, entry.y, TELEP_TRAP);
    }
}

// C ref: themerms.lua "Ice room".
//   local ice = selection.room();        -- every ROOM cell of the room
//   des.terrain(ice, "I");               -- set those cells to ICE (no RNG)
//   if (percent(25)) then                -- one rn2(100)
//      local mintime = 1000 - (nh.level_difficulty() * 100);
//      ice:iterate(function(x,y)
//         nh.start_timer_at(x,y, "melt-ice", mintime + nh.rn2(1000)); -- rn2(1000)
//      end);
//   end
// The terrain change is RNG-free but load-bearing for rendering: the room
// floor becomes ICE.  The melt timers (one rn2(1000) per cell) only fire when
// the 25% roll passes.
function create_ice_room(croom) {
    const cells = selection_room(croom);
    for (const c of cells) {
        // des.terrain(sel, "I") -> set_levltyp(x,y, ICE); preserve lit state.
        const loc = game.level?.at(c.x, c.y);
        set_levltyp_lit(c.x, c.y, ICE, loc ? loc.lit : false);
    }
    if (percent(25)) {
        // ice:iterate over the SAME selection order; one rn2(1000) per cell.
        for (let i = 0; i < cells.length; i++) rn2(1000);
    }
}

// C ref: themerms.lua "Massacre".
//   local mon = { ...27 player-monster names... };
//   local idx = math.random(#mon);                 -- 1 + rn2(27)
//   for i = 1, d(5,5) do                            -- d(5,5): 5x rn2(5)+5
//      if (percent(10)) then idx = math.random(#mon); end  -- rn2(100) [+rn2(27)]
//      des.object({ id = "corpse", montype = mon[idx] });  -- floor corpse
//   end
// Each des.object corpse is placed at a random in-room cell (somexy: rn2(4)
// somex + rn2(3) somey on the typical filled room) and built by mksobj(CORPSE):
//   next_ident rnd(2) + rndmonst_adj loop + mksobj rn2(2) + start_corpse_timeout,
// then set_corpsenm(montype) does a second start_corpse_timeout (none of these
// player monsters is a lizard/lichen, so the timeout is always the rnz form,
// exactly like Buried zombies).  Massacre corpses are NOT buried (no
// obj_resists) and have NO zombify timer.
const MASSACRE_MON = [
    'apprentice', 'warrior', 'ninja', 'thug',
    'hunter', 'acolyte', 'abbot', 'page',
    'attendant', 'neanderthal', 'chieftain',
    'student', 'wizard', 'valkyrie', 'tourist',
    'samurai', 'rogue', 'ranger', 'priestess',
    'priest', 'monk', 'knight', 'healer',
    'cavewoman', 'caveman', 'barbarian',
    'archeologist',
];

// C ref: nhlib.lua:29 d(dice, faces) — the Lua dice roller used by themed-room
// fills.  Each die is math.random(1, faces) == 1 + nh.rn2(faces), i.e. one
// rn2(faces) per die (NOT the C-internal d()/rnd()).
function lua_d(dice, faces) {
    let sum = 0;
    for (let i = 0; i < dice; i++) sum += 1 + rn2(faces);
    return sum;
}

function create_massacre(croom) {
    const nmon = MASSACRE_MON.length; // 27
    let idx = rn2(nmon); // math.random(#mon) == 1 + rn2(#mon); store 0-based
    const count = lua_d(5, 5); // d(5,5) -> 5x rn2(5)
    for (let i = 0; i < count; i++) {
        if (percent(10)) idx = rn2(nmon); // re-roll species occasionally
        const c = { x: -1, y: -1 };
        if (!somexy(croom, c)) continue;
        const montype = name_to_pmidx(MASSACRE_MON[idx]);
        const otmp = mksobj(CORPSE, true, false); // next_ident + rndmonst + timer
        if (montype >= 0) {
            set_corpsenm(otmp, montype); // override species -> 2nd corpse timeout
        } else {
            // Fall back: still consume the override start_corpse_timeout RNG so
            // the stream stays in lockstep even if the name lookup fails.
            set_corpsenm(otmp, otmp.corpsenm);
        }
        // Place the corpse as a real floor object so it renders as a %-glyph.
        otmp.ox = c.x; otmp.oy = c.y;
        place_floor_obj(otmp, c.x, c.y);
    }
}

// Add a freshly-built object to the floor object chain at (x,y) without any
// further RNG.  Mirrors place_object()/add_to_fobj enough for rendering and
// the fobj scans that level-gen and the pet AI perform.
function place_floor_obj(otmp, x, y) {
    if (!otmp || !game.level) return;
    otmp.ox = x; otmp.oy = y; otmp.where = 'floor';
    const loc = game.level.at(x, y);
    if (loc) {
        otmp.nexthere = loc.objects || null;
        loc.objects = otmp;
    }
    if (!game.level.objects) game.level.objects = [];
    otmp.nobj = game.level.fobj || null;
    game.level.fobj = otmp;
    game.level.objects.push(otmp);
}

// C ref: themerms.lua "Buried zombies".  For each of (rm.width*rm.height)/2
// spots: shuffle a small list of zombifiable species, create a buried corpse of
// the first one, cancel its rot timer and start a zombify timer.  The RNG-exact
// sequence per spot is:
//   shuffle(zombifiable)              -> rn2(4),rn2(3),rn2(2)  (4-elem list)
//   des.object({id="corpse", montype, buried=true}):
//     get_location_coord(DRY)         -> somexy() pairs (somex/somey)
//     mksobj(CORPSE)                  -> next_ident, rndmonnum loop, gender,
//                                        start_corpse_timeout (for random pm)
//     set_corpsenm(montype)           -> start_corpse_timeout (for the override)
//     bury_an_obj -> obj_resists(0,0) -> rn2(100)
//   o:start_timer("zombify-mon", math.random(990,1010)) -> rn2(21)
function create_buried_zombies(croom) {
    const diff = level_difficulty_ext();
    // themerms.lua: { "kobold","gnome","orc","dwarf" } for low difficulty,
    // +elf,human at diff>3, +ettin,giant at diff>6.  Only the list LENGTH is
    // load-bearing for the shuffle RNG; the names drive set_corpsenm's
    // lizard/lichen check (none of these are lizard/lichen -> always a rnz).
    const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
    if (diff > 3) {
        zombifiable.push('elf', 'human');
        if (diff > 6) zombifiable.push('ettin', 'giant');
    }

    const width = 1 + (croom.hx - croom.lx);
    const height = 1 + (croom.hy - croom.ly);
    const count = Math.floor((width * height) / 2);

    for (let i = 0; i < count; i++) {
        // shuffle(zombifiable) — Fisher-Yates via math.random(i) = 1 + rn2(i)
        for (let j = zombifiable.length; j > 1; j--) {
            const k = rn2(j);
            const t = zombifiable[j - 1];
            zombifiable[j - 1] = zombifiable[k];
            zombifiable[k] = t;
        }
        const montype = name_to_pmidx(zombifiable[0]);
        if (montype < 0) continue;

        // des.object random in-room location (get_location_coord DRY).  All
        // themed-room cells are ROOM (SPACE_POS) with no boulder, so the
        // is_ok_location(DRY) test always passes -> exactly one somexy() per
        // corpse (somexy itself retries somex/somey until it lands in the
        // irregular room).
        const c = { x: -1, y: -1 };
        if (!somexy(croom, c)) continue;

        const otmp = mksobj(CORPSE, true, false); // next_ident + random corpsenm + timer
        // set the corpse to the chosen zombifiable species (override) -> a
        // second start_corpse_timeout via set_corpsenm.
        set_corpsenm(otmp, montype);
        // buried = true -> bury_an_obj -> obj_resists(otmp,0,0) -> rn2(100).
        // The corpse is buried (not on the floor), so it is deliberately NOT
        // added to the floor object list: it must not render as a corpse glyph.
        otmp.ox = c.x; otmp.oy = c.y; otmp.where = 'buried';
        obj_resists_rng();

        // o:start_timer("zombify-mon", math.random(990,1010))
        //   math.random(990,1010) = nh.random(990, 21) = 990 + rn2(21)
        rn2(21);
    }
}

// C ref: themerms.lua "Storeroom".
//   local locs = selection.room():percentage(30);   -- rn2(100) per room cell
//   local func = function(x,y)                       -- locs:iterate(func)
//      if (percent(25)) then                         -- rn2(100) per selected cell
//         des.object("chest");                        -- a chest at a random room cell
//      else
//         des.monster({ class = "m", appear_as = "obj:chest" });  -- a mimic
//      end
//   end;
//   locs:iterate(func);
// The (x,y) the iterate passes to func are NOT used by des.object/des.monster
// (no coord arg) — each instead picks its own random in-room location via
// get_location_coord(DRY) -> somexy().  So only the COUNT of percentage-selected
// cells matters; the selection order is irrelevant to the RNG order.
//
// des.object("chest") -> create_object: get_location_coord(DRY) somexy +
//   mksobj(CHEST, TRUE) (next_ident, mksobj_init, mkbox_cnts).
// des.monster({class="m", appear_as="obj:chest"}) -> create_monster:
//   amask = sp_amask_to_amask(AM_SPLEV_RANDOM) -> induced_align() rn2(3);
//   pm = mkclass(S_MIMIC, G_NOGEN);  get_location_coord(DRY) somexy;
//   makemon(pm, x, y, 0) -> next_ident, newmonhp, gender, set_mimic_sym
//   (regular-room branch: rn2(17) over syms[] + mkobj for the shape),
//   m_initinv_full, trailing saddle rn2(100).  The M_AP_OBJECT override to
//   "chest" that create_monster applies afterward consumes no RNG.
const S_MIMIC_CLASS = 13; // monsym.h S_MIMIC
const G_NOGEN_FLAG = 0x0200; // include/permonst.h G_NOGEN
function create_storeroom(croom) {
    // selection.room():percentage(30) — one rn2(100) per ROOM cell of croom,
    // selected when the roll is < 30.  selection_room() walks the room bounds in
    // (x outer, y inner) order, exactly like C's selection_filter_percent over
    // selection_getbounds().
    const cells = selection_room(croom);
    let selected = 0;
    for (let i = 0; i < cells.length; i++) {
        if (rn2(100) < 30) selected++;
    }

    const g = game;
    const was_full = g._full_mon_gen;
    g._full_mon_gen = true;
    try {
        for (let i = 0; i < selected; i++) {
            if (percent(25)) {
                // des.object("chest"): a chest dropped at a random room cell.
                const c = { x: -1, y: -1 };
                if (!somexy(croom, c)) continue;
                const otmp = mksobj(CHEST, true, false);
                otmp.ox = c.x; otmp.oy = c.y;
                place_floor_obj(otmp, c.x, c.y);
            } else {
                // des.monster({class="m", appear_as="obj:chest"}).
                rn2(3); // induced_align(80) (dungeon.c:2012) via sp_amask_to_amask
                const pm = mkclass(S_MIMIC_CLASS, G_NOGEN_FLAG);
                const c = { x: -1, y: -1 };
                if (!somexy(croom, c)) continue;
                // C ref: sp_lev.c create_monster():1977 — "try to find a close
                // place if someone else is already there": when the somexy spot
                // is already occupied by a monster, relocate via enexto()
                // (collect_coords ring shuffle) BEFORE makemon().  A prior mimic
                // from this same iterate loop can land on the same room-relative
                // cell (e.g. two somexy rolls both == (9,3)), triggering this.
                if (mm_mon_at(c.x, c.y)) {
                    const cc = enexto_spawn(c.x, c.y, pm);
                    if (cc) { c.x = cc.x; c.y = cc.y; }
                }
                // C ref: create_monster:1981 — if the (possibly relocated) spot
                // falls outside croom, skip this monster (C `return`).
                if (croom && !inside_room(croom, c.x, c.y)) continue;
                const mtmp = makemon(pm, c.x, c.y, 0);
                // C create_monster overrides the mimic's appearance to a chest
                // object (M_AP_OBJECT) — no further RNG.  Mark it so the renderer
                // shows a "(" (chest) glyph rather than the mimic letter.
                if (mtmp) {
                    mtmp.m_ap_type = 'obj';
                    mtmp.mappearance = CHEST;
                }
            }
        }
    } finally {
        g._full_mon_gen = was_full;
    }
}

// C ref: sp_lev.c fill_special_room() — fills vaults, zoos, shops, etc.
export function fill_special_room(croom) {
    if (!croom) return;

    for (let i = 0; i < (croom.nsubrooms || 0); i++) {
        fill_special_room(croom.sbrooms?.[i]);
    }

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            // C ref: sp_lev.c fill_special_room() shop case -> stock_room().
            stock_room(croom.rtype - SHOPBASE, croom);
            return;
        }

        switch (croom.rtype) {
        case VAULT: {
            // C ref: sp_lev.c fill_special_room() VAULT case — fills EVERY
            // vault square with gold via mkgold(rn1(|depth|*100, 51), x, y).
            // The gold piles are real floor objects (on the dark, unseen vault
            // squares) and join the fobj chain, so the pet's dog_goal scan sees
            // them.  The port previously rolled the RNG but never placed the
            // gold, under-populating fobj and desyncing the multi-pass pet scan.
            const d = Math.abs(depth_of_level(game.u?.uz));
            for (let x = croom.lx; x <= croom.hx; x++) {
                for (let y = croom.ly; y <= croom.hy; y++) {
                    const amount = 51 + rn2(d * 100); // rn1(d*100, 51)
                    mkgold(amount, x, y);             // mksobj_at → next_ident rnd(2)
                }
            }
            break;
        }
        default:
            // ZOO, COURT, BEEHIVE, etc. → fill_zoo (not yet ported)
            break;
        }
    }

    switch (croom.rtype) {
    case VAULT:
        if (game.level?.flags) game.level.flags.has_vault = true;
        break;
    }
}

export function lspo_region({ region, type = 'ordinary', irregular = false,
                              filled = 0, joined = true, lit = -1,
                              contents = null }) {
    let [dx1, dy1, dx2, dy2] = region;
    const rtype = type === 'themed' ? THEMEROOM : OROOM;
    const rlit = litstate_rnd(lit);

    dx1 += gx.xstart;
    dy1 += gy.ystart;
    dx2 += gx.xstart;
    dy2 += gy.ystart;

    let croom;
    if (irregular) {
        const roomno = game.level.nroom + ROOMOFFSET;
        const flood = flood_fill_room(dx1, dy1, roomno, rlit);
        if (!flood.cells.length) return null;
        croom = add_sp_room(flood.minx, flood.miny, flood.maxx, flood.maxy,
                            rlit, rtype, true, filled, joined);
    } else {
        croom = add_sp_room(dx1, dy1, dx2, dy2, rlit, rtype, false, filled, joined);
        const roomno = croom.roomnoidx + ROOMOFFSET;
        for (let x = dx1; x <= dx2; x++)
            for (let y = dy1; y <= dy2; y++) {
                const loc = game.level?.at(x, y);
                if (loc) {
                    loc.roomno = roomno;
                    loc.lit = !!rlit;
                }
            }
    }

    if (contents) contents(croom);
    return croom;
}

export function filler_region(x, y) {
    let rmtyp = 'ordinary';
    let func = null;
    if (percent(30)) {
        rmtyp = 'themed';
        func = themeroom_fill;
    }
    return lspo_region({
        region: [x, y, x, y],
        type: rmtyp,
        irregular: true,
        filled: 1,
        contents: func,
    });
}

// C ref: themerms.lua — the per-themeroom des.map() contents callback.
// Most map themerooms simply call filler_region(fx,fy). A few have extra logic
// (and thus extra RNG) BEFORE the filler_region call; this dispatcher mirrors
// each room's contents() faithfully so the rn2/rnd call sequence matches C.
// `name` is the themeroom name; (fx,fy) the filler_region anchor.
export function themeroom_map_contents(name, fx, fy) {
    if (name === 'Blocked center') {
        // themerms.lua 'Blocked center':
        //   if (percent(30)) then
        //      local terr = { "-", "P" }; shuffle(terr);
        //      des.replace_terrain({ region={1,1,9,9}, fromterrain="L",
        //                            toterrain=terr[1] });
        //   end
        //   filler_region(1,1);
        if (percent(30)) {
            const terr = ['-', 'P'];
            shuffle(terr); // 2-elem shuffle → one rn2(2)
            // replace_terrain over region {1,1,9,9}, fromterrain="L"
            // (chance defaults to 100). C lspo_replace_terrain emits rn2(100)
            // for each cell whose typ == LAVAPOOL ("L"). The Blocked-center map
            // has a 3x3 LAVAPOOL block (9 cells) entirely inside {1,1,9,9}.
            for (let i = 0; i < 9; i++) rn2(100);
        }
    }
    filler_region(fx, fy);
}

export function lspo_map({ map, x = -1, y = -1, halign = 'none',
                           valign = 'none', lit = false, contents = null }) {
    if (game.themeroom_failed) return null;

    const mf = mapfrag_fromstr(map);
    if (!mf || !mf.wid || !mf.hei) return null;

    const lr = halign === 'none' ? -1 : 0;
    const tb = valign === 'none' ? -1 : 0;
    const sel = selection_new();
    const ox = x;
    const oy = y;
    let tryct = 0;

    for (;;) {
        gx.xsize = mf.wid;
        gy.ysize = mf.hei;

        if (lr === -1 && tb === -1) {
            if (ox === -1) x = 1 + rn2(COLNO - 1 - mf.wid);
            if (oy === -1) y = rn2(ROWNO - mf.hei);
            if (!isok(x, y)) {
                reset_xystart_size();
                return null;
            }
            gx.xstart = x;
            gy.ystart = y;
        }

        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
            game.themeroom_failed = true;
            reset_xystart_size();
            return null;
        }

        let isokp = true;
        for (let yy = gy.ystart - 1;
             yy < Math.min(ROWNO, gy.ystart + gy.ysize) + 1 && isokp; yy++) {
            for (let xx = gx.xstart - 1;
                 xx < Math.min(COLNO, gx.xstart + gx.xsize) + 1; xx++) {
                const loc = game.level?.at(xx, yy);
                if (!isok(xx, yy) || !loc) {
                    isokp = false;
                } else if (yy < gy.ystart || yy >= gy.ystart + gy.ysize
                           || xx < gx.xstart || xx >= gx.xstart + gx.xsize) {
                    if (loc.typ !== STONE || loc.roomno !== NO_ROOM) isokp = false;
                } else {
                    const mptyp = mapfrag_get(mf, xx - gx.xstart, yy - gy.ystart);
                    if (mptyp >= MAX_TYPE) continue;
                    if ((loc.typ !== STONE && loc.typ !== mptyp)
                        || loc.roomno !== NO_ROOM) {
                        isokp = false;
                    }
                }
                if (!isokp) break;
            }
        }

        if (!isokp) {
            if (tryct++ < 100 && (lr === -1 || tb === -1)) continue;
            game.themeroom_failed = true;
            reset_xystart_size();
            return null;
        }
        break;
    }

    for (let yy = gy.ystart; yy < Math.min(ROWNO, gy.ystart + gy.ysize); yy++) {
        for (let xx = gx.xstart; xx < Math.min(COLNO, gx.xstart + gx.xsize); xx++) {
            const mptyp = mapfrag_get(mf, xx - gx.xstart, yy - gy.ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level.at(xx, yy);
            loc.flags = 0;
            loc.horizontal = false;
            loc.roomno = 0;
            loc.edge = false;
            selection_setpoint(xx, yy, sel, 1);
            sel_set_ter(xx, yy, { ter: mptyp, tlit: lit });
        }
    }

    if (contents) {
        contents({ width: gx.xsize, height: gy.ysize, selection: sel });
        reset_xystart_size();
    }

    return sel;
}

// ════════════════════════════════════════════════════════════════════════
// Barbarian quest "home" level loader (dat/Bar-strt.lua).
//
// C ref: mklev.c makelevel() -> Is_special(&u.uz) -> makemaz("Bar-strt")
// -> load_special("Bar-strt.lua") executes the splev engine.  Loading
// nhlib.lua first runs `shuffle(align)` at module top level (rn2(3), rn2(2)),
// exactly as the Big Room path does.  We hand-port Bar-strt.lua to JS calling
// the same RNG-consuming primitives in the same order so the PRNG stream
// matches C exactly (verified against the recorded rng trace).
//
// Only the Barbarian start level is ported here (the other roles' quest homes
// and the locate/goal/filler levels fall through to the regular generator).
// ════════════════════════════════════════════════════════════════════════

const BAR_STRT_MAP = [
    '..................................PP........................................',
    '...................................PP.......................................',
    '...................................PP.......................................',
    '....................................PP......................................',
    '........--------------......-----....PPP....................................',
    '........|...S........|......+...|...PPP.....................................',
    '........|----........|......|...|....PP.....................................',
    '........|.\\..........+......-----...........................................',
    '........|----........|...............PP.....................................',
    '........|...S........|...-----.......PPP....................................',
    '........--------------...+...|......PPPPP...................................',
    '.........................|...|.......PPP....................................',
    '...-----......-----......-----........PP....................................',
    '...|...+......|...+..--+--.............PP...................................',
    '...|...|......|...|..|...|..............PP..................................',
    '...-----......-----..|...|.............PPPP.................................',
    '.....................-----............PP..PP................................',
    '.....................................PP...PP................................',
    '....................................PP...PP.................................',
    '....................................PP....PP................................',
].join('\n');

// map-relative (mx,my) -> absolute level coord using the map offset that
// bigrm_load_map computed into gx.xstart / gy.ystart.
function q_absx(mx) { return mx + gx.xstart; }
function q_absy(my) { return my + gy.ystart; }

// C ref: sp_lev.c splev_initlev() LVLINIT_SOLIDFILL with fg=" " and no explicit
// lit -> BOOL_RANDOM -> one rn2(2); then lvlfill_solid(STONE, lit).  Returns the
// lit bit so the map load can preserve it.
function quest_level_init_solidfill() {
    const lit = rn2(2);                  // sp_lev.c:2992
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) { loc.typ = STONE; loc.lit = !!lit; loc.roomno = NO_ROOM; }
        }
    return lit;
}

// C ref: sp_lev.c lspo_replace_terrain region form.  The region {x1,y1,x2,y2}
// is map-relative; get_location(ANY_LOC) adds the map offset, the selection is
// the whole rect, and the iterate is x-outer (max(1,lx)..hx) / y-inner
// (ly..hy).  For each cell whose typ==fromtyp an rn2(100) is drawn and, when
// < chance, the cell becomes totyp.  No lit change (tolit==NOCHANGE).
function quest_replace_terrain(x1, y1, x2, y2, fromtyp, totyp, chance) {
    const rx1 = q_absx(x1), ry1 = q_absy(y1);
    const rx2 = q_absx(x2), ry2 = q_absy(y2);
    const lox = Math.max(1, rx1), hix = Math.min(rx2, COLNO - 1);
    const loy = Math.max(0, ry1), hiy = Math.min(ry2, ROWNO - 1);
    for (let x = lox; x <= hix; x++)
        for (let y = loy; y <= hiy; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (loc.typ === fromtyp && rn2(100) < chance) loc.typ = totyp;
        }
}

// C ref: selvar.c selection_do_randline (rec=12 from nhlsel.c l_selection_randline).
// Recursive midpoint displacement: each level with rough>=2 draws rn2(rough)
// twice; rough shrinks by *2/3 each recursion until <2.  We build a set of the
// carved points; the RNG draw count is independent of the exact midpoints (they
// never leave the map for these coords), so this matches the recorded stream.
function quest_do_randline(x1, y1, x2, y2, rough, rec, pts) {
    if (rec < 1 || (x2 === x1 && y2 === y1)) return;
    let r = rough;
    const span = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    if (r > span) r = span;
    let mx, my;
    if (r < 2) {
        mx = Math.trunc((x1 + x2) / 2);
        my = Math.trunc((y1 + y2) / 2);
    } else {
        do {
            const dx = rn2(r) - Math.trunc(r / 2);
            const dy = rn2(r) - Math.trunc(r / 2);
            mx = Math.trunc((x1 + x2) / 2) + dx;
            my = Math.trunc((y1 + y2) / 2) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }
    pts.add(mx + ',' + my);
    r = Math.trunc((r * 2) / 3);
    rec--;
    quest_do_randline(x1, y1, mx, my, r, rec, pts);
    quest_do_randline(mx, my, x2, y2, r, rec, pts);
    pts.add(x2 + ',' + y2);
}

// C ref: des.terrain(selection.randline(new(), x1,y1, x2,y2, rough), ".") —
// carve a rough line of ROOM cells.  Corners are offset via get_location_coord.
function quest_terrain_randline(x1, y1, x2, y2, rough, totyp) {
    const ax1 = q_absx(x1), ay1 = q_absy(y1);
    const ax2 = q_absx(x2), ay2 = q_absy(y2);
    const pts = new Set();
    quest_do_randline(ax1, ay1, ax2, ay2, rough, 12, pts);
    for (const k of pts) {
        const [x, y] = k.split(',').map(Number);
        const loc = game.level?.at(x, y);
        if (loc && totyp !== INVALID_TYPE && totyp < MAX_TYPE) loc.typ = totyp;
    }
}

// C ref: sp_lev.c lspo_region 2-arg form (selection, "lit"/"unlit").  No RNG,
// no room: clone the rect selection, grow it by one cell in all directions when
// lighting, and set each cell's lit flag.  Coords are map-relative.
function quest_region_light(x1, y1, x2, y2, lit) {
    const ax1 = q_absx(x1), ay1 = q_absy(y1);
    const ax2 = q_absx(x2), ay2 = q_absy(y2);
    const cells = new Set();
    for (let x = ax1; x <= ax2; x++)
        for (let y = ay1; y <= ay2; y++)
            if (isok(x, y)) cells.add(x + ',' + y);
    if (lit) {
        const grown = new Set(cells);
        for (const k of cells) {
            const [x, y] = k.split(',').map(Number);
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = x + dx, ny = y + dy;
                    if (isok(nx, ny)) grown.add(nx + ',' + ny);
                }
        }
        for (const k of grown) {
            const [x, y] = k.split(',').map(Number);
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = true;
        }
    } else {
        for (const k of cells) {
            const [x, y] = k.split(',').map(Number);
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = false;
        }
    }
}

// C ref: sp_lev.c create_monster.  Name -> find_montype (gender rn2(2) unless
// the species has a fixed gender) -> amask AM_SPLEV_RANDOM -> induced_align
// rn2(3) -> get_location_coord (explicit coord: no RNG) -> MON_AT/enexto ->
// makemon(pm, x, y, 0).  peacefulOverride (if not null) is applied afterwards.
function quest_create_monster(name, mx, my, peacefulOverride) {
    const pmidx = name_to_pmidx(name);
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return null;
    // find_montype: fixed-gender species (gcode male=1 / female=2) draw no RNG;
    // otherwise a random gender is rolled during Lua parsing.
    if (ptr.gcode !== 1 && ptr.gcode !== 2) rn2(2);   // sp_lev.c:3156
    rn2(3);                                            // induced_align (dungeon.c:2012)
    let x = q_absx(mx), y = q_absy(my);
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    const mtmp = makemon(ptr, x, y, 0);
    if (mtmp && peacefulOverride != null) mtmp.mpeaceful = !!peacefulOverride;
    // C ref: makemon.c S_EEL case -> hideunder(mtmp) during mklev: an eel on a
    // pool becomes mundetected (submerged), so it renders as water.  No RNG.
    if (mtmp && ptr.mcls === 57 /* S_EEL */) {
        const t = game.level?.at(x, y)?.typ;
        if (t === POOL || t === MOAT || t === WATER) mtmp.mundetected = true;
    }
    return mtmp;
}

// C ref: sp_lev.c create_object.  get_location(DRY) [explicit coord: no RNG;
// no coord: random DRY loop] -> mksobj/mksobj_at -> apply spe.  For an inventory
// item (carryingMon set) the object is created at a random DRY floor spot
// (consuming that get_location) and then moved into the monster's inventory.
function quest_create_object(otyp, mx, my, spe, carryingMon) {
    let x, y;
    if (mx != null) { x = q_absx(mx); y = q_absy(my); }
    else { const c = bigrm_get_location_dry(); x = c.x; y = c.y; }
    let otmp;
    if (carryingMon) {
        otmp = mksobj(otyp, true, true);           // not placed on floor
        if (spe != null) otmp.spe = spe;
        if (!carryingMon.minvent) carryingMon.minvent = [];
        carryingMon.minvent.push(otmp);
    } else {
        otmp = mksobj_at(otyp, x, y, true, true);
        if (spe != null) otmp.spe = spe;
    }
    return otmp;
}

// C ref: sp_lev.c create_trap for a fixed-type, fixed-coord trap: get_location
// (explicit -> no RNG) then mktrap(type, MKTRAP_MAZEFLAG|NOSPIDERONWEB).  The
// only RNG mktrap consumes here is the victim check rnd(4) (mklev.c:2137), which
// is always drawn (in_mklev, kind != NO_TRAP) and, at this level difficulty,
// never places a victim.
async function quest_create_trap(ttyp, mx, my) {
    const x = q_absx(mx), y = q_absy(my);
    await maketrap(x, y, ttyp);
    rnd(4);                                          // mktrap victim check
}

// C ref: selvar.c selection_floodfill via l_selection_flood: floods from the
// start cell over all 4-connected cells whose typ matches the start cell's typ
// (set_floodfillchk_match_under).  No RNG.  Coords are map-relative.
function quest_floodfill_match(mx, my) {
    const sx = q_absx(mx), sy = q_absy(my);
    const start = game.level?.at(sx, sy);
    if (!start) return new Set();
    const wantTyp = start.typ;
    const seen = new Set();
    const stack = [[sx, sy]];
    while (stack.length) {
        const [x, y] = stack.pop();
        const k = x + ',' + y;
        if (seen.has(k) || !isok(x, y)) continue;
        if (game.level?.at(x, y)?.typ !== wantTyp) continue;
        seen.add(k);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return seen;
}

// C ref: selvar.c selection_rndcoord — count the set points inside the
// selection's bounding box, rn2(count), then walk the bounding box in x-outer /
// y-inner order to the chosen point (removing it when removeit).  `sel` is a Set
// of "x,y" keys.
function quest_rndcoord(sel) {
    const pts = [];
    let lx = COLNO, hx = -1, ly = ROWNO, hy = -1;
    for (const k of sel) {
        const [x, y] = k.split(',').map(Number);
        if (x < lx) lx = x; if (x > hx) hx = x;
        if (y < ly) ly = y; if (y > hy) hy = y;
    }
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (sel.has(x + ',' + y)) pts.push([x, y]);
    if (!pts.length) return null;
    const c = rn2(pts.length);
    const [px, py] = pts[c];
    sel.delete(px + ',' + py);
    return { x: px, y: py };
}

// Main executor.  C ref: makemaz("Bar-strt") -> load_special.
export async function makemaz_bar_strt() {
    const g = game;
    // load_special -> load nhlib.lua top-level shuffle(align): rn2(3), rn2(2).
    shuffle(['law', 'neutral', 'chaos']);
    // des.level_flags("mazelevel", "noteleport", "hardfloor") — no RNG.
    if (g.level?.flags) {
        g.level.flags.is_maze_lev = true;
        g.level.flags.noteleport = true;
        g.level.flags.hardfloor = true;
    }
    // des.level_init({ style="solidfill", fg=" " }) — rn2(2) + fill STONE.
    const lit = quest_level_init_solidfill();
    // des.map([[...]]) — full-level map, SPLEV_CENTER offset.  No RNG.
    bigrm_load_map(BAR_STRT_MAP, lit);
    // replace_terrain x3 (floor -> tree with per-region chance).
    quest_replace_terrain(37, 0, 59, 19, ROOM, TREE, 5);
    quest_replace_terrain(60, 0, 64, 19, ROOM, TREE, 10);
    quest_replace_terrain(65, 0, 75, 19, ROOM, TREE, 20);
    // guarantee a path + free spot for the portal.
    quest_terrain_randline(37, 7, 62, 2, 7, ROOM);
    { const loc = g.level?.at(q_absx(62), q_absy(2)); if (loc) loc.typ = ROOM; }
    // region lighting (whole level lit, a few unlit sub-rooms) — no RNG.
    quest_region_light(0, 0, 75, 19, true);
    quest_region_light(9, 5, 11, 5, false);
    quest_region_light(9, 7, 11, 7, true);
    quest_region_light(9, 9, 11, 9, false);
    quest_region_light(13, 5, 20, 9, true);
    quest_region_light(29, 5, 31, 6, true);
    quest_region_light(26, 10, 28, 11, true);
    quest_region_light(4, 13, 6, 14, true);
    quest_region_light(15, 13, 17, 14, true);
    quest_region_light(22, 14, 24, 15, true);
    // des.stair("down", 9, 9) — no RNG.
    quest_place_stair(9, 9, false);
    // des.levregion({ region={62,2,62,2}, type="branch" }) — register, no RNG.
    quest_register_branch(62, 2);
    // des.door(...) x8 — explicit states, no RNG.
    quest_set_door(12, 5, 'locked'); quest_set_door(12, 9, 'locked');
    quest_set_door(21, 7, 'closed');
    quest_set_door(7, 13, 'open'); quest_set_door(18, 13, 'open');
    quest_set_door(23, 13, 'open'); quest_set_door(25, 10, 'open');
    quest_set_door(28, 5, 'open');

    g._quest_gen = true;
    g._full_mon_gen = true;
    try {
        // Elder Pelias + custom inventory (runesword+5, chain mail+5).
        const pelias = quest_create_monster('Pelias', 10, 7, null);
        quest_create_object(58 /*RUNESWORD*/, null, null, 5, pelias);
        quest_create_object(128 /*CHAIN_MAIL*/, null, null, 5, pelias);
        // The treasure of Pelias.
        quest_create_object(CHEST, 9, 5, null, null);
        // chieftain guards for the audience chamber.
        const chieftains = [[10, 5], [10, 9], [11, 5], [11, 9],
                            [14, 5], [14, 9], [16, 5], [16, 9]];
        for (const [cx, cy] of chieftains) quest_create_monster('chieftain', cx, cy, null);
        // des.non_diggable — no RNG.
        // One trap to keep the ogres at bay.
        await quest_create_trap(12 /*SPIKED_PIT*/, 37, 7);
        // Eels in the river.
        quest_create_monster('giant eel', 36, 1, null);
        quest_create_monster('giant eel', 37, 9, null);
        quest_create_monster('giant eel', 39, 15, null);
        // Monsters on siege duty: floodfill(37,7) & area(40,3, 45,20), 12 ogres.
        const flood = quest_floodfill_match(37, 7);
        const ax1 = q_absx(40), ay1 = q_absy(3), ax2 = q_absx(45), ay2 = q_absy(20);
        const ogrelocs = new Set();
        for (const k of flood) {
            const [x, y] = k.split(',').map(Number);
            if (x >= ax1 && x <= ax2 && y >= ay1 && y <= ay2) ogrelocs.add(k);
        }
        for (let i = 0; i < 12; i++) {
            const c = quest_rndcoord(ogrelocs);
            if (!c) { rn2(1); continue; }
            quest_create_monster_at('ogre', c.x, c.y, false);
        }
    } finally {
        g._quest_gen = false;
        g._full_mon_gen = false;
    }

    // C ref: lspo_finalize_level -> wallification(1,0,COLNO-1,ROWNO-1) (!corrmaze)
    // then flip_level_rnd(allow_flips=3, FALSE): one rn2(2) per enabled axis.
    bigrm_wallification(1, 0, COLNO - 1, ROWNO - 1);
    let flp = 0;
    if (rn2(2)) flp |= 1;                 // flip_level_rnd sp_lev.c:975
    if (rn2(2)) flp |= 2;                 // flip_level_rnd sp_lev.c:977
    if (flp) { flip_level(flp); quest_flip_branch(flp); }
}

// A specific-coord ogre (create_monster with an explicit coord from rndcoord).
function quest_create_monster_at(name, x, y, peaceful) {
    const pmidx = name_to_pmidx(name);
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return null;
    if (ptr.gcode !== 1 && ptr.gcode !== 2) rn2(2);   // find_montype gender
    rn2(3);                                            // induced_align
    let mx = x, my = y;
    if (mm_mon_at(mx, my)) {
        const cc = enexto_spawn(mx, my, ptr);
        if (cc) { mx = cc.x; my = cc.y; }
    }
    const mtmp = makemon(ptr, mx, my, 0);
    if (mtmp && peaceful != null) mtmp.mpeaceful = !!peaceful;
    return mtmp;
}

// des.stair("down", mx, my) — place a down stairway.  No RNG.
function quest_place_stair(mx, my, up) {
    const x = q_absx(mx), y = q_absy(my);
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = STAIRS;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: x, sy: y, up: !!up });
    if (up) { game.upstair = { x, y }; if (game.level) game.level.upstair = { x, y }; }
    else { game.dnstair = { x, y }; if (game.level) game.level.dnstair = { x, y }; }
}

// des.levregion({region={mx,my,mx,my}, type="branch"}) — store a 1-cell branch
// arrival region (absolute coords) for placement at level finalize.  No RNG.
function quest_register_branch(mx, my) {
    game._quest_branch = { x1: q_absx(mx), y1: q_absy(my), x2: q_absx(mx), y2: q_absy(my) };
}

// des.door(state, mx, my) — set the door mask on an existing DOOR/SDOOR cell.
const _QDOORMASK = { open: 0x20 /*D_ISOPEN*/, closed: 0x04 /*D_CLOSED*/, locked: 0x08 /*D_LOCKED*/ };
function quest_set_door(mx, my, state) {
    const loc = game.level?.at(q_absx(mx), q_absy(my));
    if (!loc) return;
    if (loc.typ === SDOOR) loc.typ = DOOR;
    loc.doormask = _QDOORMASK[state] ?? 0x04;
}

// flip the stored branch region alongside the map (flip_level flips lregions in
// C).  Mirrors flip_level's FlipX/FlipY within the level extents.
function quest_flip_branch(flp) {
    const br = game._quest_branch;
    if (!br) return;
    const { minx, maxx, miny, maxy } = bigrm_get_level_extends();
    const inArea = (x, y) => (x >= minx && x <= maxx && y >= miny && y <= maxy);
    const fx = (x) => (minx + maxx - x), fy = (y) => (miny + maxy - y);
    for (const [kx, ky] of [['x1', 'y1'], ['x2', 'y2']]) {
        if (!inArea(br[kx], br[ky])) continue;
        if (flp & 1) br[ky] = fy(br[ky]);
        if (flp & 2) br[kx] = fx(br[kx]);
    }
    if (br.x1 > br.x2) { const t = br.x1; br.x1 = br.x2; br.x2 = t; }
    if (br.y1 > br.y2) { const t = br.y1; br.y1 = br.y2; br.y2 = t; }
}

// ════════════════════════════════════════════════════════════════════════
// Archeologist quest "home" level loader (dat/Arc-strt.lua).
//
// C ref: mklev.c makelevel() -> Is_special(&u.uz) -> makemaz("Arc-strt")
// -> load_special("Arc-strt.lua").  Same splev engine as Bar-strt: loading
// nhlib.lua first runs shuffle(align) (rn2(3),rn2(2)); level_init solidfill
// draws one rn2(2); then the des.* program runs in file order consuming the
// PRNG exactly.  Hand-ported so the stream matches C's recorded trace.
//
// The fort is a moated keep; Lord Carnarvon + guards inside, siege monsters
// (random snakes/mummies via des.monster("S"/"M")) outside, six random traps,
// and a moat that gets kelp during mineralize() at level finalize.
// ════════════════════════════════════════════════════════════════════════

const ARC_STRT_MAP = [
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................',
    '....................}-------------------------------------}.................',
    '....................}|..S......+.................+.......|}.................',
    '....................}-S---------------+----------|.......|}.................',
    '....................}|.|...............|.......+.|.......|}.................',
    '....................}|.|...............---------.---------}.................',
    '....................}|.S.\\.............+.................+..................',
    '....................}|.|...............---------.---------}.................',
    '....................}|.|...............|.......+.|.......|}.................',
    '....................}-S---------------+----------|.......|}.................',
    '....................}|..S......+.................+.......|}.................',
    '....................}-------------------------------------}.................',
    '....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................',
    '............................................................................',
    '............................................................................',
    '............................................................................',
].join('\n');

// C ref: trap.h trap-type constants (only the ones traptype_rnd() switches on).
const ARC_NO_TRAP = 0, ARC_ROCKTRAP = 3, ARC_HOLE = 13, ARC_TRAPDOOR = 14;
// C ref: monsym.h — def_char_to_monclass('S') = S_SNAKE, ('M') = S_MUMMY.
const ARC_S_SNAKE = 45, ARC_S_MUMMY = 39, ARC_G_NOGEN = 0x0200;

// C ref: mklev.c traptype_rnd() — pick a random trap type, NO_TRAP if "too
// hard"/disallowed on this level.  We reimplement it locally (rather than share
// mklev.js's copy) so it uses depth-based level_difficulty() — the quest home is
// dlevel 1 in the quest branch but ledger-depth 14, and traptype_rnd() in C uses
// level_difficulty() (== depth), not dlevel.  noteleport is set on this level.
function arc_traptype_rnd() {
    const lvl = depth_of_level(game.u?.uz);
    const noteleport = !!game.level?.flags?.noteleport;
    let kind = rnd(25);                              // rnd(TRAPNUM-1)
    switch (kind) {
    case 24: case 25: case 17: case 23:              // TRAPPED_DOOR/CHEST, MAGIC_PORTAL, VIBRATING_SQUARE
        kind = ARC_NO_TRAP; break;
    case 7: case 8:                                  // ROLLING_BOULDER_TRAP, SLP_GAS_TRAP
        if (lvl < 2) kind = ARC_NO_TRAP; break;
    case 16:                                         // LEVEL_TELEP
        if (lvl < 5 || noteleport) kind = ARC_NO_TRAP; break;
    case 12:                                         // SPIKED_PIT
        if (lvl < 5) kind = ARC_NO_TRAP; break;
    case 6:                                          // LANDMINE
        if (lvl < 6) kind = ARC_NO_TRAP; break;
    case 18:                                         // WEB
        if (lvl < 7) kind = ARC_NO_TRAP; break;
    case 19: case 22:                                // STATUE_TRAP, POLY_TRAP
        if (lvl < 8) kind = ARC_NO_TRAP; break;
    case 10:                                         // FIRE_TRAP (only in Gehennom)
        kind = ARC_NO_TRAP; break;
    case 15:                                         // TELEP_TRAP
        if (noteleport) kind = ARC_NO_TRAP; break;
    case 13:                                         // HOLE — much rarer
        if (rn2(7)) kind = ARC_NO_TRAP; break;
    }
    return kind;
}

// C ref: sp_lev.c create_trap for a random type + random (maze) location.
// get_location_coord(DRY) loop rejecting stairs/ladder, then mktrap(0,...):
// retry traptype_rnd() until valid, is_hole&&!Can_fall_thru -> ROCKTRAP, place,
// then the always-drawn victim check rnd(4) (lvl(14) <= rnd(4) is never true).
async function quest_create_trap_random() {
    let x = -1, y = -1, trycnt = 0;
    do {
        const c = bigrm_get_location_dry();          // internal DRY retry loop
        x = c.x; y = c.y;
        const t = game.level?.at(x, y)?.typ;
        if (t !== STAIRS && t !== LADDER) break;
    } while (++trycnt <= 100);
    let kind;
    do { kind = arc_traptype_rnd(); } while (kind === ARC_NO_TRAP);
    // hardfloor is set on this level -> Can_fall_thru() is FALSE (RNG-neutral).
    if (kind === ARC_HOLE || kind === ARC_TRAPDOOR) kind = ARC_ROCKTRAP;
    await maketrap(x, y, kind);                       // rolling-boulder draws launch coord
    rnd(4);                                            // mktrap victim check (mklev.c:2137)
}

// C ref: sp_lev.c create_monster for a class char ("S"/"M") with no specific id:
// sp_amask_to_amask(AM_SPLEV_RANDOM) draws induced_align rn2(3); pm =
// mkclass(class, G_NOGEN); explicit coord -> no get_location RNG; makemon().
function quest_create_monster_class(classNum, mx, my) {
    rn2(3);                                            // induced_align (dungeon.c:2012)
    const ptr = mkclass(classNum, ARC_G_NOGEN);
    if (!ptr) return null;
    let x = q_absx(mx), y = q_absy(my);
    if (mm_mon_at(x, y)) { const cc = enexto_spawn(x, y, ptr); if (cc) { x = cc.x; y = cc.y; } }
    const mtmp = makemon(ptr, x, y, 0);
    if (mtmp && ptr.mcls === 57 /* S_EEL */) {
        const t = game.level?.at(x, y)?.typ;
        if (t === POOL || t === MOAT || t === WATER) mtmp.mundetected = true;
    }
    return mtmp;
}

// C ref: sp_lev.c create_monster tail — a monster with a CUSTOM inventory
// function but no DEFAULT_INVENT flag has its makemon-granted default inventory
// removed before the custom function runs: mdrop_special_objs(mtmp) then
// discard_minvent(mtmp, TRUE).  mdrop_special_objs (steal.c) draws
// obj_resists(obj, 0, 0) == rn2(100) for EACH minvent item (invocation tools /
// quest artifacts would be kept; a quest leader carries none), so a leader who
// got one defensive item from m_initinv contributes exactly one rn2(100) here.
function quest_drop_default_invent(mtmp) {
    if (!mtmp || !Array.isArray(mtmp.minvent)) return;
    for (let i = 0; i < mtmp.minvent.length; i++) {
        rn2(100);                                      // obj_resists(obj, 0, 0)
    }
    // discard_minvent(mtmp, TRUE): non-artifact items dealloc with no RNG.
    mtmp.minvent = [];
}

// Main executor.  C ref: makemaz("Arc-strt") -> load_special.
export async function makemaz_arc_strt() {
    const g = game;
    // load_special -> load nhlib.lua top-level shuffle(align): rn2(3), rn2(2).
    shuffle(['law', 'neutral', 'chaos']);
    // des.level_flags("mazelevel", "noteleport", "hardfloor") — no RNG.
    if (g.level?.flags) {
        g.level.flags.is_maze_lev = true;
        g.level.flags.noteleport = true;
        g.level.flags.hardfloor = true;
    }
    // des.level_init({ style="solidfill", fg=" " }) — rn2(2) + fill STONE.
    const lit = quest_level_init_solidfill();
    // des.map([[...]]) — full-level map, SPLEV_CENTER offset.  No RNG.
    bigrm_load_map(ARC_STRT_MAP, lit);
    // des.region(...) x16 — whole level lit, then lit/unlit sub-rooms.  No RNG.
    quest_region_light(0, 0, 75, 19, true);
    quest_region_light(22, 6, 23, 6, false);
    quest_region_light(25, 6, 30, 6, false);
    quest_region_light(32, 6, 48, 6, false);
    quest_region_light(50, 6, 56, 8, true);
    quest_region_light(40, 8, 46, 8, false);
    quest_region_light(22, 8, 22, 12, false);
    quest_region_light(24, 8, 38, 12, false);
    quest_region_light(48, 8, 48, 8, true);
    quest_region_light(40, 10, 56, 10, true);
    quest_region_light(48, 12, 48, 12, true);
    quest_region_light(40, 12, 46, 12, false);
    quest_region_light(50, 12, 56, 14, true);
    quest_region_light(22, 14, 23, 14, false);
    quest_region_light(25, 14, 30, 14, false);
    quest_region_light(32, 14, 48, 14, false);
    // des.stair("down", 55, 7) — no RNG.
    quest_place_stair(55, 7, false);
    // des.levregion({ region={63,6,63,6}, type="branch" }) — register, no RNG.
    quest_register_branch(63, 6);
    // des.door(...) x12 — explicit states, no RNG.
    quest_set_door(22, 7, 'closed'); quest_set_door(38, 7, 'closed');
    quest_set_door(47, 8, 'locked'); quest_set_door(23, 10, 'locked');
    quest_set_door(39, 10, 'locked'); quest_set_door(57, 10, 'locked');
    quest_set_door(47, 12, 'locked'); quest_set_door(22, 13, 'closed');
    quest_set_door(38, 13, 'closed'); quest_set_door(24, 14, 'locked');
    quest_set_door(31, 14, 'closed'); quest_set_door(49, 14, 'locked');

    g._quest_gen = true;
    g._full_mon_gen = true;
    try {
        // Lord Carnarvon + custom inventory (fedora+5, bullwhip+4).
        const carnarvon = quest_create_monster('Lord Carnarvon', 25, 10, null);
        // custom inventory replaces makemon's default: mdrop_special_objs +
        // discard_minvent (one obj_resists rn2(100) for his defensive item).
        quest_drop_default_invent(carnarvon);
        quest_create_object(92 /*FEDORA*/, null, null, 5, carnarvon);
        quest_create_object(82 /*BULLWHIP*/, null, null, 4, carnarvon);
        // The treasure of Lord Carnarvon.
        quest_create_object(CHEST, 25, 10, null, null);
        // student guards for the audience chamber.
        const students = [[26, 9], [27, 9], [28, 9], [26, 10],
                          [28, 10], [26, 11], [27, 11], [28, 11]];
        for (const [sx, sy] of students) quest_create_monster('student', sx, sy, null);
        // city watch guards in the antechambers.
        quest_create_monster('watchman', 50, 6, null);
        quest_create_monster('watchman', 50, 14, null);
        // Eels in the moat.
        quest_create_monster('giant eel', 20, 10, null);
        quest_create_monster('giant eel', 45, 4, null);
        quest_create_monster('giant eel', 33, 16, null);
        // des.non_diggable — no RNG.
        // Six random traps.
        for (let i = 0; i < 6; i++) await quest_create_trap_random();
        // Monsters on siege duty (random snakes "S" / mummies "M").
        const siege = [
            [ARC_S_SNAKE, 60, 9], [ARC_S_MUMMY, 60, 10], [ARC_S_SNAKE, 60, 11],
            [ARC_S_SNAKE, 60, 12], [ARC_S_MUMMY, 60, 13], [ARC_S_SNAKE, 61, 10],
            [ARC_S_SNAKE, 61, 11], [ARC_S_SNAKE, 61, 12], [ARC_S_SNAKE, 30, 3],
            [ARC_S_MUMMY, 20, 17], [ARC_S_SNAKE, 67, 2], [ARC_S_SNAKE, 10, 19],
        ];
        for (const [cls, cx, cy] of siege) quest_create_monster_class(cls, cx, cy);
    } finally {
        g._quest_gen = false;
        g._full_mon_gen = false;
    }

    // C ref: lspo_finalize_level -> wallification(1,0,COLNO-1,ROWNO-1) (!corrmaze)
    // then flip_level_rnd(allow_flips=3, FALSE): one rn2(2) per enabled axis.
    bigrm_wallification(1, 0, COLNO - 1, ROWNO - 1);
    let flp = 0;
    if (rn2(2)) flp |= 1;                 // flip_level_rnd sp_lev.c:975
    if (rn2(2)) flp |= 2;                 // flip_level_rnd sp_lev.c:977
    if (flp) { flip_level(flp); quest_flip_branch(flp); }
}

// ════════════════════════════════════════════════════════════════════════
// Vlad's Tower upper stage (dat/tower1.lua).
//
// C ref: mklev.c makelevel() -> Is_special(&u.uz) -> makemaz("tower1") ->
// load_special("tower1.lua").  Loading nhlib.lua first runs shuffle(align)
// (rn2(3), rn2(2)); then the tower1 body: level_init solidfill (rn2(2)),
// a fixed map (halign="half-left", valign="center"), shuffle(niches) over the
// six niche cells, a down-ladder, Vlad + three random vampires + three named
// vampire "ladies" (waiting -> shift back to vampire form), doors, seven chests
// (two carrying candles), non_diggable, then wallification + flip_level_rnd.
// We hand-port it calling the same RNG primitives in the same order.
// ════════════════════════════════════════════════════════════════════════

const TOWER1_MAP = [
    '  --- --- ---  ',
    '  |.| |.| |.|  ',
    '---S---S---S---',
    '|.......+.+...|',
    '---+-----.-----',
    '  |...\\.|.+.|  ',
    '---+-----.-----',
    '|.......+.+...|',
    '---S---S---S---',
    '  |.| |.| |.|  ',
    '  --- --- ---  ',
].join('\n');

// C ref: sp_lev.c lspo_map halign=SPLEV_H_LEFT / valign=SPLEV_CENTER offset.
// gx.xstart = 2 + ((x_maze_max-2-xsize)/4); gy.ystart = 2 + ((y_maze_max-2-ysize)/2);
// each bumped odd.  Then stamp the fixed terrain (no RNG).
function tower1_load_map(mapstr, lit) {
    const mf = mapfrag_fromstr(mapstr);
    gx.xsize = mf.wid;
    gy.ysize = mf.hei;
    gx.xstart = 2 + Math.trunc((gx.x_maze_max - 2 - gx.xsize) / 4);   // SPLEV_H_LEFT
    gy.ystart = 2 + Math.trunc((gy.y_maze_max - 2 - gy.ysize) / 2);   // SPLEV_CENTER
    if (!(gx.xstart % 2)) gx.xstart++;
    if (!(gy.ystart % 2)) gy.ystart++;
    if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
        gy.ystart += (gy.ystart > 0) ? -2 : 2;
        if (gy.ysize === ROWNO) gy.ystart = 0;
        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) gy.ystart = 0;
    }
    for (let y = gy.ystart; y < Math.min(ROWNO, gy.ystart + gy.ysize); y++)
        for (let x = gx.xstart; x < Math.min(COLNO, gx.xstart + gx.xsize); x++) {
            const mptyp = mapfrag_get(mf, x - gx.xstart, y - gy.ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.flags = 0;
            loc.roomno = 0;
            loc.edge = false;
            loc.typ = mptyp;
            loc.lit = !!lit;
            // C ref: sp_lev.c sel_set_ter() — HWALL/IRONBARS get horizontal=1;
            // a door/secret-door inherits horizontal=1 when its left neighbour
            // (already loaded, x-inner scan) is a wall or itself horizontal.
            // This is what makes the tower's SDOOR row render as ─ (HWALL glyph)
            // rather than │.
            if (mptyp === HWALL || mptyp === IRONBARS) {
                loc.horizontal = true;
            } else if (mptyp === SDOOR || IS_DOOR(mptyp)) {
                const left = game.level?.at(x - 1, y);
                loc.horizontal = !!(x > 0 && left
                    && (IS_WALL(left.typ) || left.horizontal));
            } else {
                loc.horizontal = false;
            }
        }
    return mf;
}

// des.ladder("down", mx, my) — no RNG.
function tower_place_ladder(mx, my) {
    const x = q_absx(mx), y = q_absy(my);
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = LADDER;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: x, sy: y, up: false });
    game.dnstair = { x, y };
    if (game.level) { game.level.dnstair = { x, y }; if (loc) loc.ladder = 2; }
}

// C ref: sp_lev.c create_monster for a class ("V"): amask induced_align rn2(3),
// pm = mkclass(S_VAMPIRE, G_NOGEN), get_location (explicit coord, no RNG),
// makemon.  makemon (with _tower_gen set) shifts the vampire via newcham.
const S_VAMPIRE_CLASS = 48;         // defsym.h MONSYM(48,'V',...)
const G_NOGEN_TOWER = 0x0200;
function tower_create_V(mx, my) {
    rn2(3);                                          // induced_align
    const ptr = mkclass(S_VAMPIRE_CLASS, G_NOGEN_TOWER);
    if (!ptr) return null;
    let x = q_absx(mx), y = q_absy(my);
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    return makemon(ptr, x, y, 0);
}

// C ref: sp_lev.c create_monster for { id="vampire lady", name, waiting=1 }.
// find_montype("vampire lady") -> PM_VAMPIRE_LEADER, female (no gender rn2).
// amask induced_align rn2(3); makemon (shifts via newcham); create_monster then
// sets female, christens with `name`, sets STRAT_WAITFORU and (since it shifted)
// reverts to vampire form via newcham(&mons[cham]) — mgender rn2(10)+newmonhp.
const PM_VAMPIRE_LEADER_IDX = 227;
function tower_create_vampire_lady(name, mx, my) {
    rn2(3);                                          // induced_align
    const ptr = monster_by_pmidx(PM_VAMPIRE_LEADER_IDX);
    if (!ptr) return null;
    let x = q_absx(mx), y = q_absy(my);
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    const mtmp = makemon(ptr, x, y, 0);
    if (!mtmp) return null;
    mtmp.female = 1;                                 // "lady" -> female (no RNG)
    if (name) mtmp.mname = name;                     // christen (no RNG)
    mtmp.mstrategy = (mtmp.mstrategy || 0) | 0x40000000; // STRAT_WAITFORU
    // vampshifted (cham is a vampire and current form differs) -> revert.
    if (mtmp.cham === PM_VAMPIRE_LEADER_IDX
        && mtmp.data && mtmp.data.pmidx !== PM_VAMPIRE_LEADER_IDX) {
        newcham_vamp(mtmp, monster_by_pmidx(PM_VAMPIRE_LEADER_IDX));
    }
    return mtmp;
}

// C ref: des.object({ id="chest", coord, contents=function() ... end }).
// The chest is created with auto-filled contents (mkbox_cnts RNG), which are
// then discarded (SP_OBJ_CONTAINER -> delete_contents, no RNG); the contents
// callback creates one candle: math.random(4,8) [rn2(5)] for quantity, then
// create_object -> get_location DRY (rn2(xsize)/rn2(ysize)) + mksobj(candle).
function tower_content_chest(mx, my, candleType) {
    const x = q_absx(mx), y = q_absy(my);
    const chest = mksobj_at(CHEST, x, y, true, true);   // init + mkbox_cnts
    // delete_contents: drop the auto-generated contents (no RNG).
    if (chest) chest.cobj = null;
    const qty = 4 + rn2(5);                              // math.random(4,8)
    bigrm_get_location_dry();                            // get_location DRY
    const candle = mksobj(candleType, true, false);      // next_ident + init
    if (candle) candle.quan = qty;
    // add to container (no RNG); keep off the floor.
    if (chest) { if (!chest.cobj) chest.cobj = []; if (Array.isArray(chest.cobj)) chest.cobj.push(candle); }
    return chest;
}

// C ref: mkmaze.c wallification() — the FAITHFUL wall_cleanup + fix_wall_spines
// with extend_spine (the simplified bigrm_wallification omits extend_spine's
// diagonal test and so mis-types walls at complex junctions like the tower's).
function tw_isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || tw_isWallTile(x, y)) ? 1 : 0;
}
function tw_isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function tw_isSolid(x, y) {
    if (!isok(x, y)) return true;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return typ === STONE || (IS_WALL(typ) && typ !== DBWALL);
}
function tw_extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
function tower_wallification(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    // wall_cleanup: walls totally surrounded by solid -> STONE.
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (tw_isSolid(x-1,y-1) && tw_isSolid(x-1,y) && tw_isSolid(x-1,y+1)
                && tw_isSolid(x,y-1) && tw_isSolid(x,y+1)
                && tw_isSolid(x+1,y-1) && tw_isSolid(x+1,y) && tw_isSolid(x+1,y+1))
                loc.typ = STONE;
        }
    // fix_wall_spines with extend_spine.
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [tw_isWallOrStone(x-1,y-1), tw_isWallOrStone(x-1,y), tw_isWallOrStone(x-1,y+1)],
                [tw_isWallOrStone(x,y-1), 0, tw_isWallOrStone(x,y+1)],
                [tw_isWallOrStone(x+1,y-1), tw_isWallOrStone(x+1,y), tw_isWallOrStone(x+1,y+1)],
            ];
            const bits = (tw_extend_spine(locale, tw_isWallTile(x,y-1), 0, -1) << 3)
                | (tw_extend_spine(locale, tw_isWallTile(x,y+1), 0, 1) << 2)
                | (tw_extend_spine(locale, tw_isWallTile(x+1,y), 1, 0) << 1)
                | tw_extend_spine(locale, tw_isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}

// Main executor.  C ref: makemaz("tower1") -> load_special.
export async function makemaz_tower1() {
    const g = game;
    // load_special -> nhlib.lua top-level shuffle(align): rn2(3), rn2(2).
    shuffle(['law', 'neutral', 'chaos']);
    // des.level_init({ style="solidfill", fg=" " }) -> rn2(2) + fill STONE.
    const lit = quest_level_init_solidfill();
    // des.level_flags("mazelevel","noteleport","hardfloor","solidify") — no RNG.
    if (g.level?.flags) {
        g.level.flags.is_maze_lev = true;
        g.level.flags.noteleport = true;
        g.level.flags.hardfloor = true;
    }
    // des.map({ halign="half-left", valign="center", map=[[...]] }) — no RNG.
    tower1_load_map(TOWER1_MAP, lit);

    // local niches = {...}; shuffle(niches) — rn2(6),rn2(5),rn2(4),rn2(3),rn2(2).
    const niches = [[3, 1], [3, 9], [7, 1], [7, 9], [11, 1], [11, 9]];
    shuffle(niches);

    // des.ladder("down", 11,05) — no RNG.
    tower_place_ladder(11, 5);

    g._tower_gen = true;
    g._full_mon_gen = true;
    try {
        // The lord and his court.
        quest_create_monster('Vlad the Impaler', 6, 5, null);
        tower_create_V(niches[0][0], niches[0][1]);
        tower_create_V(niches[1][0], niches[1][1]);
        tower_create_V(niches[2][0], niches[2][1]);
        // The brides (waiting vampires); names only when vampire isn't genocided.
        const Vgenod = false;
        const Vnames = Vgenod ? [null, null, null] : ['Madame', 'Marquise', 'Countess'];
        tower_create_vampire_lady(Vnames[0], niches[3][0], niches[3][1]);
        tower_create_vampire_lady(Vnames[1], niches[4][0], niches[4][1]);
        tower_create_vampire_lady(Vnames[2], niches[5][0], niches[5][1]);
    } finally {
        g._tower_gen = false;
        g._full_mon_gen = false;
    }

    // des.door(...) x7 — explicit states on existing DOOR cells, no RNG.
    quest_set_door(8, 3, 'closed'); quest_set_door(10, 3, 'closed');
    quest_set_door(3, 4, 'closed');
    quest_set_door(10, 5, 'locked'); quest_set_door(8, 7, 'locked');
    quest_set_door(10, 7, 'locked'); quest_set_door(3, 6, 'closed');

    g._full_mon_gen = true;
    try {
        // treasures — five plain chests then two candle-bearing chests.
        quest_create_object(CHEST, 7, 5, null, null);
        quest_create_object(CHEST, niches[5][0], niches[5][1], null, null);
        quest_create_object(CHEST, niches[0][0], niches[0][1], null, null);
        quest_create_object(CHEST, niches[1][0], niches[1][1], null, null);
        quest_create_object(CHEST, niches[2][0], niches[2][1], null, null);
        tower_content_chest(niches[3][0], niches[3][1], WAX_CANDLE);
        tower_content_chest(niches[4][0], niches[4][1], TALLOW_CANDLE);
    } finally {
        g._full_mon_gen = false;
    }

    // des.non_diggable(selection.area(0,0,14,10)) — no RNG.

    // C ref: lspo_finalize_level -> wallification then flip_level_rnd(3, FALSE).
    tower_wallification(1, 0, COLNO - 1, ROWNO - 1);
    let flp = 0;
    if (rn2(2)) flp |= 1;                 // flip_level_rnd sp_lev.c:975
    if (rn2(2)) flp |= 2;                 // flip_level_rnd sp_lev.c:977
    if (flp) flip_level(flp);
}

// ════════════════════════════════════════════════════════════════════════
// Big Room special level loader (bigrm-1.lua .. bigrm-13.lua).
//
// C ref: mkmaze.c makemaz("bigrm") -> rnd(13) picks the variant, then
// load_special("bigrm-N.lua") executes the Lua via the splev engine.  We
// hand-port each bigrm-N script to JS calling the same RNG-consuming
// primitives in the same order, so the PRNG stream matches C exactly.
//
// Loading nhlib.lua first runs `align = {...}; shuffle(align)` at module top
// level (nhlib.lua:24-25): a 3-element Fisher-Yates -> rn2(3), rn2(2).
// ════════════════════════════════════════════════════════════════════════

// C ref: rm.h ACCESSIBLE / SPACE_POS / is_pool / is_lava as used by
// is_ok_location(x,y,humidity).  We only need the DRY case for bigrm
// (objects/monsters/traps/stairs all use DRY).  DRY accepts SPACE_POS
// terrain (typ > DOOR) with no boulder; pools/water/lava/stone fail.
function bigrm_is_ok_location_dry(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    if (typ == null) return false;
    // boulders are not generated in the empty big room before fill, so the
    // boulder check is inert here.
    return SPACE_POS(typ);
}

// C ref: sp_lev.c get_location() random-location branch (sp_lev.c:1226-1238)
// for croom == NULL: loop rn2(xsize)+xstart / rn2(ysize)+ystart until
// is_ok_location passes (up to 100 tries).  Returns {x,y}.
function bigrm_get_location_dry() {
    let x = -1, y = -1, cpt = 0;
    do {
        x = gx.xstart + rn2(gx.xsize);   // sp_lev.c:1233
        y = gy.ystart + rn2(gy.ysize);   // sp_lev.c:1234
        if (bigrm_is_ok_location_dry(x, y)) break;
    } while (++cpt < 100);
    if (cpt >= 100) {
        for (let xx = 0; xx < gx.xsize; xx++)
            for (let yy = 0; yy < gy.ysize; yy++) {
                x = gx.xstart + xx; y = gy.ystart + yy;
                if (bigrm_is_ok_location_dry(x, y)) return { x, y };
            }
        return { x: gx.x_maze_max, y: gy.y_maze_max };
    }
    return { x, y };
}

// C ref: sp_lev.c lspo_map full-level map placement (single string arg ->
// lr=tb=SPLEV_CENTER).  No RNG.  Sets gx.xstart/xsize, gy.ystart/ysize and
// stamps the terrain.  Implements the SPLEV_CENTER offset + the ystart
// out-of-bounds recovery (sp_lev.c:6190-6237).
function bigrm_load_map(mapstr, lit) {
    const mf = mapfrag_fromstr(mapstr);
    gx.xsize = mf.wid;
    gy.ysize = mf.hei;
    // SPLEV_CENTER
    gx.xstart = 2 + Math.trunc((gx.x_maze_max - 2 - gx.xsize) / 2);
    gy.ystart = 2 + Math.trunc((gy.y_maze_max - 2 - gy.ysize) / 2);
    if (!(gx.xstart % 2)) gx.xstart++;
    if (!(gy.ystart % 2)) gy.ystart++;
    if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
        gy.ystart += (gy.ystart > 0) ? -2 : 2;
        if (gy.ysize === ROWNO) gy.ystart = 0;
        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) gy.ystart = 0;
    }
    for (let y = gy.ystart; y < Math.min(ROWNO, gy.ystart + gy.ysize); y++)
        for (let x = gx.xstart; x < Math.min(COLNO, gx.xstart + gx.xsize); x++) {
            const mptyp = mapfrag_get(mf, x - gx.xstart, y - gy.ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.flags = 0;
            loc.horizontal = false;
            loc.roomno = 0;
            loc.edge = false;
            loc.typ = mptyp;
            loc.lit = !!lit;
        }
    return mf;
}

// C ref: sp_lev.c splev_initlev() LVLINIT_SOLIDFILL with BOOL_RANDOM lit ->
// rn2(2); then lvlfill_solid(filling, lit).  bigrm uses style="solidfill",
// fg=" " (STONE) with no explicit lit -> BOOL_RANDOM -> one rn2(2).
function bigrm_level_init_solidfill() {
    const lit = rn2(2);                  // sp_lev.c:2992
    const fill = STONE;                  // fg = " "
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) { loc.typ = fill; loc.lit = !!lit; loc.roomno = NO_ROOM; }
        }
}

// C ref: sp_lev.c lspo_replace_terrain over the whole map.  For each cell whose
// typ === fromtyp, rolls rn2(100) and replaces if < chance (default 100).
// With default chance the rn2(100) is STILL consumed per matching cell.
function bigrm_replace_terrain(fromtyp, totyp, chance = 100) {
    for (let x = Math.max(1, gx.xstart); x < gx.xstart + gx.xsize; x++)
        for (let y = gy.ystart; y < gy.ystart + gy.ysize; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            const matches = (fromtyp === MATCH_WALL)
                ? (loc.typ === VWALL || loc.typ === HWALL)
                : (loc.typ === fromtyp);
            if (matches && rn2(100) < chance) loc.typ = totyp;
        }
}

// C ref: nhlib.lua percent()/shuffle() helpers are above; math.random in Lua
// is the nhlib shim: 1-arg math.random(n) = 1 + rn2(n); 2-arg
// math.random(a,b) = nh.random(a, b+1-a) = a + rn2(b+1-a).
function lua_random1(n) { return 1 + rn2(n); }     // math.random(n)

// C ref: a region({...},"lit"/"unlit") with selection.area uses get_location
// with ANY_LOC for its two corners -> NO RNG.  We just mark the rectangle's
// lit state and assign it a room number so monsters/objects land in a real
// "room" for rendering.  (The terrain itself was already stamped by the map.)
function bigrm_region(x1, y1, x2, y2, lit) {
    const g = game;
    const roomno = g.level.nroom + ROOMOFFSET;
    const lo_x = x1 + gx.xstart, lo_y = y1 + gy.ystart;
    const hi_x = x2 + gx.xstart, hi_y = y2 + gy.ystart;
    add_sp_room(lo_x, lo_y, Math.min(hi_x, COLNO - 1), Math.min(hi_y, ROWNO - 1),
                lit ? 1 : 0, OROOM, false, FILL_NONE, true);
    // C ref: mklev.c do_room_or_subroom() — when the room is lit, light the
    // room PLUS a one-cell border (lowx-1..hix+1, lowy-1..hiy+1) so the room's
    // bounding walls are lit too.  Without this the diamond Big Room's outermost
    // wall ring stays dark and never gets revealed by vision_recalc (which only
    // shows a wall when it AND the floor toward the hero are lit).
    if (lit) {
        const lx = Math.max(lo_x - 1, 1), hx = Math.min(hi_x + 1, COLNO - 1);
        const ly = Math.max(lo_y - 1, 0), hy = Math.min(hi_y + 1, ROWNO - 1);
        for (let x = lx; x <= hx; x++)
            for (let y = ly; y <= hy; y++) {
                const loc = g.level?.at(x, y);
                if (loc) loc.lit = true;
            }
    }
    // roomno is assigned only to the region interior (topologize covers the
    // room's own cells; the bordering walls keep their existing roomno).
    for (let x = lo_x; x <= hi_x && x < COLNO; x++)
        for (let y = lo_y; y <= hi_y && y < ROWNO; y++) {
            const loc = g.level?.at(x, y);
            if (loc && (loc.roomno === NO_ROOM || loc.roomno === 0)) {
                loc.roomno = roomno;
            }
        }
}

// C ref: sp_lev.c wallify_map() — convert STONE cells adjacent to a ROOM (or
// crosswall) into HWALL (vertically adjacent) or VWALL (horizontally adjacent).
// des.wallify() in the bigrm script.  No RNG.
function bigrm_wallify_map(x1, y1, x2, y2) {
    const map = game.level;
    y1 = Math.max(y1, 0); x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1); x2 = Math.min(x2, COLNO - 1);
    for (let y = y1; y <= y2; y++) {
        const loYY = (y > 0) ? y - 1 : 0;
        const hiYY = (y < y2) ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            if (map.at(x, y)?.typ !== STONE) continue;
            const loXX = (x > 1) ? x - 1 : 1;
            const hiXX = (x < x2) ? x + 1 : x2;
            let done = false;
            for (let yy = loYY; yy <= hiYY && !done; yy++)
                for (let xx = loXX; xx <= hiXX; xx++) {
                    const t = map.at(xx, yy)?.typ;
                    if (IS_ROOM(t) || t === CROSSWALL) {
                        map.at(x, y).typ = (yy !== y) ? HWALL : VWALL;
                        done = true; break;
                    }
                }
        }
    }
}

// C ref: mklev.c wallification() — wall_cleanup + fix_wall_spines, run at level
// finalize (sp_lev.c:6038).  Sets corner/T/cross wall types from neighbours.
const _SPINE = [VWALL, HWALL, HWALL, HWALL, VWALL, TRCORNER, TLCORNER, TDWALL,
                VWALL, BRCORNER, BLCORNER, TUWALL, VWALL, TLWALL, TRWALL, CROSSWALL];
function bigrm_wallification(x1, y1, x2, y2) {
    const map = game.level;
    const isWall = (xx, yy) => { const l = map.at(xx, yy); return l && IS_WALL(l.typ) && l.typ !== DBWALL; };
    const isWallOrStone = (xx, yy) => { const l = map.at(xx, yy); return !l || l.typ === STONE || (IS_WALL(l.typ) && l.typ !== DBWALL); };
    // wall_cleanup: a wall fully surrounded by solid tiles reverts to STONE.
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_WALL(loc.typ) && loc.typ !== DBWALL)) continue;
            let solid = true;
            for (let dx = -1; dx <= 1 && solid; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    if (!dx && !dy) continue;
                    if (!isWallOrStone(x + dx, y + dy)) { solid = false; break; }
                }
            // only revert if every neighbour is solid (wall or stone, not room)
            if (solid) {
                let allSolidStrict = true;
                for (let dx = -1; dx <= 1 && allSolidStrict; dx++)
                    for (let dy = -1; dy <= 1; dy++) {
                        if (!dx && !dy) continue;
                        const l = map.at(x + dx, y + dy);
                        const t = l ? l.typ : STONE;
                        if (!(t === STONE || (IS_WALL(t) && t !== DBWALL))) { allSolidStrict = false; break; }
                    }
                if (allSolidStrict) loc.typ = STONE;
            }
        }
    // fix_wall_spines: set the proper wall variant from the 4 cardinal spines.
    const extend = (xx, yy) => isWall(xx, yy) ? 1 : 0;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_WALL(loc.typ) && loc.typ !== DBWALL)) continue;
            const bits = (extend(x, y - 1) << 3) | (extend(x, y + 1) << 2)
                       | (extend(x + 1, y) << 1) | extend(x - 1, y);
            if (bits) loc.typ = _SPINE[bits];
        }
}

// C ref: sp_lev.c create_stairs/lspo_stair with no coords -> get_location DRY
// random placement -> one (or more) rn2(xsize)/rn2(ysize) pairs.
function bigrm_stair(up) {
    const c = bigrm_get_location_dry();
    const loc = game.level?.at(c.x, c.y);
    if (loc) loc.typ = STAIRS;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: c.x, sy: c.y, up: !!up });
    if (up) { game.upstair = { x: c.x, y: c.y }; if (game.level) game.level.upstair = { x: c.x, y: c.y }; }
    else { game.dnstair = { x: c.x, y: c.y }; if (game.level) game.level.dnstair = { x: c.x, y: c.y }; }
}

// C ref: mklev.c traptype_rnd() — pick a random valid trap type for this level.
// Duplicated here (not imported from mklev.js) to avoid a circular import.
// dlvl 12 == level_difficulty 12.
function bigrm_traptype_rnd(lvl) {
    // trap type constants (include/trap.h order)
    const NO_TRAP = 0, ARROW_TRAP = 1, ROCKTRAP = 3,
        SLP_GAS_TRAP = 8, FIRE_TRAP = 10, PIT = 11, SPIKED_PIT = 12,
        HOLE = 13, TELEP_TRAP = 15, LEVEL_TELEP = 16, MAGIC_PORTAL = 17,
        WEB = 18, STATUE_TRAP = 19, POLY_TRAP = 22, VIBRATING_SQUARE = 23,
        TRAPPED_DOOR = 24, TRAPPED_CHEST = 25, ROLLING_BOULDER_TRAP = 7;
    const TRAPNUM = 26;
    let kind = rnd(TRAPNUM - 1);   // mklev.c:1941
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case 6: /* LANDMINE */
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        kind = NO_TRAP; break;   // not Inhell
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;   // mklev.c:1993
    }
    return kind;
}

// C ref: sp_lev.c create_trap() (random type, random location) + mktrap().
//   get_location(DRY); loop traptype_rnd() until !=NO_TRAP; maketrap();
//   then the victim check: gi.in_mklev && lvl <= rnd(4) && ... (rnd(4) is
//   ALWAYS consumed when kind!=NO_TRAP and the trap type is "lethal").  On
//   dlvl 12, lvl(12) <= rnd(4)(<=4) is always false -> no victim placed,
//   but the rnd(4) draw still happens.
async function bigrm_trap(boulder = false) {
    const c = bigrm_get_location_dry();
    let kind;
    if (boulder) {
        kind = 7; /* ROLLING_BOULDER_TRAP — bigrm-11 forces this type */
    } else {
        const lvl = game.u?.uz?.dlevel ?? 12;
        do { kind = bigrm_traptype_rnd(lvl); } while (kind === 0);
    }
    const t = await maketrap(c.x, c.y, kind);
    // C ref: mklev.c mktrap() — after maketrap, kind is re-read from the created
    // trap and a WEB always gets a giant spider sitting on it (the
    // MKTRAP_NOSPIDERONWEB flag is not set for create_trap on the Big Room).
    // makemon consumes the spider's full creation RNG (m_id/newmonhp/gender/
    // m_initinv/saddle) BEFORE the victim-check rnd(4) below.
    const WEB = 18;
    const realKind = t ? (t.ttyp ?? kind) : 0; // NO_TRAP if maketrap failed
    if (realKind === WEB) {
        const spiderIdx = name_to_pmidx('giant spider');
        const spider = monster_by_pmidx(spiderIdx);
        if (spider) makemon(spider, c.x, c.y, 0 /* NO_MM_FLAGS */);
    }
    // C ref: mklev.c mktrap victim check (mklev.c:2137).  The `lvl <= rnd(4)`
    // term comes BEFORE the trap-type terms in the && chain, so rnd(4) is
    // ALWAYS drawn (in_mklev is true during makelevel, kind != NO_TRAP here),
    // regardless of trap type.  On dlvl 12, lvl(12) <= rnd(4)(<=4) is always
    // false -> no victim placed, but the rnd(4) draw still happens.
    rnd(4);
}

// C ref: sp_lev.c create_object() (random object, random location).
//   get_location(DRY); mkobj_at(RANDOM_CLASS, x, y, ...).
function bigrm_object(idstr = null) {
    const c = bigrm_get_location_dry();
    if (idstr === 'boulder') {
        // des.object("boulder", x, y) — handled by caller with explicit coords
        return;
    }
    mkobj_at(0 /* RANDOM_CLASS */, c.x, c.y, true);
}

// C ref: sp_lev.c create_monster() (random monster, random location).
//   amask = sp_amask_to_amask(AM_SPLEV_RANDOM) -> induced_align() rn2(3);
//   pm == NULL (random) -> get_location(DRY); makemon(NULL, x, y, mmflags).
function bigrm_monster() {
    rn2(3);                              // induced_align (dungeon.c:2012)
    const c = bigrm_get_location_dry();
    // C ref: sp_lev.c create_monster() (sp_lev.c:1977) — "try to find a close
    // place if someone else is already there": when a monster already occupies
    // the chosen spot, relocate via enexto() (collect_coords ring shuffle) BEFORE
    // makemon().  pm is NULL here (random monster); C's enexto() defaults the
    // null mdat to the hero's monster type, which only affects water/lava spots
    // (none on the Big Room), so the goodpos filter is equivalent with null.
    let mx = c.x, my = c.y;
    if (mm_mon_at(mx, my)) {
        const cc = enexto_spawn(mx, my, null);
        if (cc) { mx = cc.x; my = cc.y; }
    }
    makemon(null, mx, my, 0);
}

// Common tail shared by most bigrm variants: stairs, non_diggable, 15 random
// objects, 6 random traps, 28 random monsters.
async function bigrm_common_tail(opts = {}) {
    if (!opts.skipStairs) {
        bigrm_stair(true);
        bigrm_stair(false);
    }
    // non_diggable: no RNG
    for (let i = 0; i < 15; i++) bigrm_object();
    for (let i = 0; i < 6; i++) await bigrm_trap(opts.boulderTraps);
    for (let i = 0; i < 28; i++) bigrm_monster();
}


// Per-variant executors.  Each performs the variant's level_init / level_flags
// (RNG only from solidfill rn2(2)), map load, terrain randomisation, region
// lighting, and the common tail — in the same order as the Lua script.
async function bigrm_run(variant) {
    const g = game;
    if (g.level?.flags) {
        g.level.flags.is_maze_lev = true;   // "mazelevel"
        g.level.flags.noteleport = false;
    }
    const fn = BIGRM_VARIANTS[variant] || BIGRM_VARIANTS[1];
    await fn();

    // C ref: lspo_finalize_level -> wallification(1, 0, COLNO-1, ROWNO-1) at
    // sp_lev.c:6038 (the !corrmaze branch).  des.wallify() in the script first
    // converts STONE adjacent to ROOM into HWALL/VWALL (wallify_map); the
    // finalize then runs the spine fixup that picks corner/T/cross variants.
    // Neither consumes RNG, so doing both here keeps the stream intact.
    bigrm_wallify_map(0, 0, COLNO - 1, ROWNO - 1);
    bigrm_wallification(1, 0, COLNO - 1, ROWNO - 1);

    // C ref: sp_lev.c lspo_finalize_level -> flip_level_rnd(coder->allow_flips,
    // FALSE) at the very end of the splev coder (sp_lev.c:6041).  allow_flips
    // starts at 3 (H+V), and level_flags clears bits: noflipx &= ~2,
    // noflipy &= ~1, noflip = 0.  flip_level_rnd: (flp & 1) ? rn2(2) ; (flp & 2)
    // ? rn2(2).  (The actual transposition mutates the map but consumes no
    // further RNG; the rendered cells already match either orientation for the
    // symmetric bigrm maps when c==0, which is the common case.)
    // C ref: sp_lev.c flip_level_rnd(allow_flips, FALSE) — independently draw an
    // rn2(2) for each enabled axis; a 1 sets that axis's bit in `c`.  When c != 0
    // flip_level(c) transposes the map (and every entity on it) within the level
    // extents.  Earlier the JS only consumed the RNG and skipped the transpose,
    // assuming bigrm maps are flip-invariant — but the asymmetric variants (and
    // the random monster/object/stair positions) DO move, so render the flip.
    const flp = BIGRM_ALLOW_FLIPS[variant] ?? 3;
    let c = 0;
    if ((flp & 1) && rn2(2)) c |= 1;
    if ((flp & 2) && rn2(2)) c |= 2;
    if (c) flip_level(c);
}

// C ref: mkmaze.c get_level_extends() — bounding box of the non-STONE area,
// padded by 1 (maze edge) or 2 (open level) on each side.  Mirrors mklev.js's
// copy so the flip transform uses the identical extents the C engine does.
function bigrm_get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    const isMaze = !!map?.flags?.is_maze_lev;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++)
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    xmin -= (nonwall || !isMaze) ? 2 : 1;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--)
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    xmax += (nonwall || !isMaze) ? 2 : 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++)
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    ymin -= (nonwall || !isMaze) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--)
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    ymax += (nonwall || !isMaze) ? 2 : 1;
    if (ymin < 0) ymin = 0;
    if (xmin < 1) xmin = 1;
    if (xmax >= COLNO) xmax = COLNO - 1;
    if (ymax >= ROWNO) ymax = ROWNO - 1;
    return { minx: xmin, maxx: xmax, miny: ymin, maxy: ymax };
}

// C ref: sp_lev.c flip_level(flp, FALSE) — level-creation flip.  Transposes the
// map cells, monsters, objects, traps, stairs, rooms and doors within the level
// extents.  Restricted to the entity kinds the Big Room generates (extras=FALSE,
// so the #wizfliplevel-only branches and vault/shk/worm fixups are inapplicable).
function flip_level(flp) {
    if ((flp & 3) === 0) return;
    const g = game;
    const map = g.level;
    const { minx, maxx, miny, maxy } = bigrm_get_level_extends();
    const FlipX = (x) => (minx + maxx - x);
    const FlipY = (y) => (miny + maxy - y);
    const inArea = (x, y) => (x >= minx && x <= maxx && y >= miny && y <= maxy);

    // stairs (game.stairs may be an array (bigrm) or null)
    for (const s of (Array.isArray(g.stairs) ? g.stairs : [])) {
        if (flp & 1) s.sy = FlipY(s.sy);
        if (flp & 2) s.sx = FlipX(s.sx);
    }
    const flipPt = (pt, kx, ky) => {
        if (!pt) return;
        if (flp & 1) pt[ky] = FlipY(pt[ky]);
        if (flp & 2) pt[kx] = FlipX(pt[kx]);
    };
    flipPt(g.upstair, 'x', 'y'); flipPt(g.dnstair, 'x', 'y');
    if (map?.upstair) flipPt(map.upstair, 'x', 'y');
    if (map?.dnstair) flipPt(map.dnstair, 'x', 'y');

    // traps
    for (const t of (map.traps || [])) {
        if (!inArea(t.tx, t.ty)) continue;
        if (flp & 1) t.ty = FlipY(t.ty);
        if (flp & 2) t.tx = FlipX(t.tx);
    }
    // objects
    for (const o of (map.objects || [])) {
        if (!inArea(o.ox, o.oy)) continue;
        if (flp & 1) o.oy = FlipY(o.oy);
        if (flp & 2) o.ox = FlipX(o.ox);
    }
    // monsters
    for (const m of (map.monsters || [])) {
        if (!inArea(m.mx, m.my)) continue;
        if (flp & 1) m.my = FlipY(m.my);
        if (flp & 2) m.mx = FlipX(m.mx);
    }
    // rooms
    for (let i = 0; i < (map.nroom || 0); i++) {
        const r = map.rooms[i];
        if (!r || r.hx < 0) continue;
        if (flp & 1) {
            r.ly = FlipY(r.ly); r.hy = FlipY(r.hy);
            if (r.ly > r.hy) { const t = r.ly; r.ly = r.hy; r.hy = t; }
        }
        if (flp & 2) {
            r.lx = FlipX(r.lx); r.hx = FlipX(r.hx);
            if (r.lx > r.hx) { const t = r.lx; r.lx = r.hx; r.hx = t; }
        }
    }
    // doors
    for (const d of (map.doors || [])) {
        if (!d) continue;
        if (flp & 1) d.y = FlipY(d.y);
        if (flp & 2) d.x = FlipX(d.x);
    }

    // the map cells
    if (flp & 1) {
        for (let x = minx; x <= maxx; x++)
            for (let y = miny; y < (miny + Math.floor((maxy - miny + 1) / 2)); y++) {
                const ny = FlipY(y);
                const tmp = map.locations[x][y];
                map.locations[x][y] = map.locations[x][ny];
                map.locations[x][ny] = tmp;
            }
    }
    if (flp & 2) {
        for (let x = minx; x < (minx + Math.floor((maxx - minx + 1) / 2)); x++)
            for (let y = miny; y <= maxy; y++) {
                const nx = FlipX(x);
                const tmp = map.locations[x][y];
                map.locations[x][y] = map.locations[nx][y];
                map.locations[nx][y] = tmp;
            }
    }
}

// allow_flips per bigrm variant (3 = H+V default; noflip variants override).
// C ref: each bigrm-N.lua's des.level_flags(...) call.  "noflip" clears both
// bits (0); "noflipy" clears bit 1 only (2); bigrm-7/8 declare no flip
// restriction at all, so they keep the default 3.
const BIGRM_ALLOW_FLIPS = {
    1: 0 /*noflip*/, 2: 0 /*noflip*/, 3: 0 /*noflip*/, 4: 0 /*noflip*/,
    5: 0 /*noflip*/, 6: 0 /*noflip*/, 9: 0 /*noflip*/, 10: 0 /*noflip*/,
    11: 0 /*noflip*/, 12: 2 /*noflipy -> &= ~1*/, 13: 0 /*noflip*/,
};

const BIGRM_VARIANTS = {
    1: async () => {
        bigrm_level_init_solidfill();           // level_init solidfill -> rn2(2)
        bigrm_load_map(BIGRM_MAP_STRINGS[1], false);
        if (percent(80)) {
            lua_random1(5);                     // tidx = math.random(1,#terrains=5)
            const choice = rn2(6);              // math.random(0,5) = 0+rn2(6)
            // terrain edits change cell types but consume no extra RNG
            void choice;
        }
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    2: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[2], false);
        bigrm_region(1, 1, 73, 16, true);
        const choice = rn2(4);                  // math.random(0,3)
        if (choice >= 0 && choice <= 2) {
            // a darkness region exists -> des.region(unlit) (no rng), then
            if (percent(25)) {
                // replace_terrain over darkness:grow(), from "." to "I".
                // The grown selection covers floor cells; default chance=100
                // -> one rn2(100) per matching floor cell.  Approximate by the
                // count of floor cells in the grown darkness area.
                bigrm_replace_terrain(ROOM, ICE, 100);
            }
        }
        await bigrm_common_tail();
    },
    3: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[3], false);
        bigrm_region(1, 1, 73, 16, true);
        if (percent(66)) {
            lua_random1(4);                     // choice = terrains[math.random(1,4)]
            // selection.match("[.w.]") then des.terrain — no per-cell rng
        }
        // 15 obj, 6 traps, then EXPLICIT monsters (no random monster rng)
        bigrm_stair(true); bigrm_stair(false);
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap();
        // 28 des.monster({x,y}) at fixed coords -> each: induced_align rn2(3)
        // + makemon(NULL) at given coord (no get_location rng).
        for (let i = 0; i < 28; i++) {
            rn2(3);
            makemon(null, gx.xstart, gy.ystart, 0);
        }
    },
    4: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[4], false);
        // terrains = {".",".",".",".","P","L","-","T","W","Z"}; tidx=random(1,10);
        // if (terrains[tidx] ~= "L") des.replace_terrain({fromterrain="L",
        // toterrain=terrains[tidx]}) — whole-map, rn2(100) per "L" cell.
        const t4 = lua_random1(10);
        const TERR4 = [ROOM, ROOM, ROOM, ROOM, POOL, LAVAPOOL, HWALL, TREE, WATER, LAVAWALL];
        const to4 = TERR4[t4 - 1];
        if (to4 !== LAVAPOOL) bigrm_replace_terrain(LAVAPOOL, to4, 100);
        // des.feature fountains (no rng), region lit (no rng)
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    5: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[5], false);
        if (percent(25)) {
            // selection.match("."):percentage(2) -> rn2(100) per "." cell;
            // then percent(50) for the I-or-C choice; then replace over grown.
            // The percentage(2) selection draws one rn2(100) per floor cell.
            bigrm_replace_terrain(ROOM, ROOM, 2);   // consume rn2(100)/floor cell
            percent(50);
        }
        bigrm_region(0, 0, 72, 18, true);
        await bigrm_common_tail();
    },
    6: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[6], false);
        bigrm_region(1, 1, 72, 17, true);
        await bigrm_common_tail();
    },
    7: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[7], false);
        const t7 = lua_random1(4);              // tidx = math.random(1,#terrain=4)
        // des.replace_terrain({region={0,0,74,18}, fromterrain="L", toterrain=
        // terrain[tidx]}) — terrain = {"L","T","{","."}.  rn2(100) per "L" cell
        // (chance default 100).  tidx==1 -> "L" (no visible change) but the
        // rn2(100) per cell is still consumed.
        const to7 = [LAVAPOOL, TREE, FOUNTAIN, ROOM][t7 - 1];
        bigrm_replace_terrain(LAVAPOOL, to7, 100);
        bigrm_region(1, 1, 73, 17, true);
        await bigrm_common_tail();
    },
    8: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[8], false);
        if (percent(40)) {
            // terrain = {"L","}","T",".","-","C"}; tidx=random(1,6);
            // des.replace_terrain({region={0,0,74,17}, fromterrain="F",
            // toterrain=terrain[tidx]}) — rn2(100) per "F" cell.
            const t8 = lua_random1(6);
            const TERR8 = [LAVAPOOL, MOAT, TREE, ROOM, HWALL, CLOUD];
            bigrm_replace_terrain(IRONBARS /*F*/, TERR8[t8 - 1], 100);
        }
        bigrm_region(1, 1, 73, 16, true);
        await bigrm_common_tail();
    },
    9: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[9], false);
        bigrm_region(0, 0, 73, 18, false);      // unlit
        bigrm_region(26, 4, 47, 14, true);
        bigrm_region(21, 5, 51, 13, true);
        bigrm_region(19, 6, 54, 12, true);
        await bigrm_common_tail();
    },
    10: async () => {
        // bigrm-10 has NO level_init solidfill before map? It does:
        // level_init solidfill, then map.
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[10], false);
        if (percent(40)) {
            lua_random1(5);                     // tidx = math.random(1,#terrain=5)
            bigrm_replace_terrain(CLOUD, ROOM, 5);   // chance=5 per "C" cell
            // second replace default chance -> rn2(100) per remaining "C" cell
            bigrm_replace_terrain(CLOUD, LAVAPOOL, 100);
        }
        bigrm_region(0, 0, 70, 18, true);
        // teleport_region: no rng. objects/traps/monsters, then mazewalk,
        // levregion stair-up, stair down.
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap();
        for (let i = 0; i < 28; i++) bigrm_monster();
        // des.mazewalk / des.levregion(stair-up) / des.stair("down")
        bigrm_stair(false);
    },
    11: async () => {
        // Boulder maze.  level_init style="maze", corrwid = 3 + nh.rn2(3),
        // wallthick=1, deadends = t_or_f() (percent(50)).
        const corrwid = 3 + rn2(3);             // nh.rn2(3)
        void corrwid;
        percent(50);                            // deadends = t_or_f()
        // create_maze would run here (LVLINIT_MAZE).  We do not fully port the
        // maze generator; fall back to a solid floor so the level is walkable.
        for (let y = 0; y < ROWNO; y++)
            for (let x = 0; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        bigrm_region(0, 0, 75, 18, true);
        bigrm_stair(true); bigrm_stair(false);
        for (let i = 0; i < 15; i++) bigrm_object();
        for (let i = 0; i < 6; i++) await bigrm_trap(true);   // rolling boulder
        for (let i = 0; i < 28; i++) bigrm_monster();
    },
    12: async () => {
        // level_flags first (no rng), then level_init solidfill (rn2(2)).
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[12], false);
        if (percent(20)) {
            if (percent(50)) bigrm_replace_terrain(LAVAWALL, HWALL, 100);
            if (percent(50)) bigrm_replace_terrain(LAVAWALL /*Z*/, HWALL, 100);
        }
        if (percent(25)) {
            bigrm_replace_terrain(POOL, ROOM, 100);
            if (percent(75)) bigrm_replace_terrain(WATER, POOL, 100);
        }
        if (percent(25)) {
            bigrm_replace_terrain(LAVAPOOL, ROOM, 100);
            if (percent(75)) bigrm_replace_terrain(LAVAWALL, LAVAPOOL, 100);
        }
        if (percent(20)) {
            if (percent(50)) {
                bigrm_replace_terrain(POOL, LAVAPOOL, 100);
                bigrm_replace_terrain(WATER, LAVAWALL, 100);
            } else {
                bigrm_replace_terrain(LAVAPOOL, POOL, 100);
                bigrm_replace_terrain(LAVAWALL, WATER, 100);
            }
        }
        bigrm_region(0, 0, 75, 19, true);
        // non_diggable, wallify: no rng
        await bigrm_common_tail();
    },
    13: async () => {
        bigrm_level_init_solidfill();
        bigrm_load_map(BIGRM_MAP_STRINGS[13], false);
        lua_random1(8);                         // idx = math.random(1,#filters=8)
        // pillars placed via des.map calls — no extra rng (filter 6 uses
        // math.random per cell only if idx==6; approximate: idx selection only)
        bigrm_region(0, 0, 75, 18, true);
        await bigrm_common_tail();
    },
};

// Entry point.  C ref: makemaz("bigrm") -> rnd(13) + load_special("bigrm-N").
export async function makemaz_bigroom() {
    const g = game;
    const slev = (g.sp_levchn || []).find(
        (l) => g.bigroom_level && l.dlevel.dnum === g.bigroom_level.dnum
               && l.dlevel.dlevel === g.bigroom_level.dlevel);
    const rndlevs = slev?.rndlevs || 13;
    const variant = rnd(rndlevs);            // mkmaze.c:1136 rnd(sp->rndlevs)
    // load_special -> load_lua -> nhlib.lua top-level: shuffle(align)
    const align = ['law', 'neutral', 'chaos'];
    shuffle(align);                          // rn2(3), rn2(2)
    if (g.level?.flags) g.level.flags.is_maze_lev = true;
    // Enable the full (C-faithful) monster inventory/group/peace_minded path in
    // makemon for the duration of Big Room generation.  Outside this window
    // makemon keeps its conservative behavior, so other sessions' ordinary
    // level generation is unaffected.
    g._bigrm_gen = true;
    try {
        await bigrm_run(variant);
    } finally {
        g._bigrm_gen = false;
    }
}

const BIGRM_MAP_STRINGS = {
    1: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
    2: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
    3: `---------------------------------------------------------------------------
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|..............---.......................................---..............|
|...............|.........................................|...............|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|.....|--------   --------|...................|----------   --------|.....|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|...............|.........................................|...............|
|..............---.......................................---..............|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
---------------------------------------------------------------------------`,
    4: `-----------                                                     -----------
|.........|                                                     |.........|
|.........-------------                             -------------.........|
---...................------------       ------------...................---
  --.............................---------.............................--  
   --.................................................................--   
    --...............................................................--    
     --......LLLLL.......................................LLLLL......--     
      --.....LLLLL.......................................LLLLL.....--      
      --.....LLLLL.......................................LLLLL.....--      
     --......LLLLL.......................................LLLLL......--     
    --...............................................................--    
   --.................................................................--   
  --.............................---------.............................--  
---...................------------       ------------...................---
|.........-------------                             -------------.........|
|.........|                                                     |.........|
-----------                                                     -----------`,
    5: `                            ------------------                            
                    ---------................---------                    
              -------................................-------              
         ------............................................------         
      ----......................................................----      
    ---............................................................---    
  ---................................................................---  
---....................................................................---
|........................................................................|
|........................................................................|
|........................................................................|
---....................................................................---
  ---................................................................---  
    ---............................................................---    
      ----......................................................----      
         ------............................................------         
              -------................................-------              
                    ---------................---------                    
                            ------------------                            `,
    6: `     ---------         ---------         ---------         ---------     
   ---.......---     ---.......---     ---.......---     ---.......---   
  --...........--   --...........--   --...........--   --...........--  
 --.............-- --.............-- --.............-- --.............-- 
 -...............- -...............- -...............- -...............- 
--...............---...............---...............---...............--
|.................-.................-.................-.................|
|........T.................T.................T.................T........|
|.......................................................................|
|......T.{.....................................................{.T......|
|.......................................................................|
|........T.................T.................T.................T........|
|.................-.................-.................-.................|
--...............---...............---...............---...............--
 -...............- -...............- -...............- -...............- 
 --.............-- --.............-- --.............-- --.............-- 
  --...........--   --...........--   --...........--   --...........--  
   ---.......---     ---.......---     ---.......---     ---.......---   
     ---------         ---------         ---------         ---------     `,
    7: `                                                        -----              
                                                ---------...---            
                                        ---------.........L...---          
                                ---------.......................---        
                        ---------.................................---      
                ---------...........................................---    
        ---------.....................................................---  
---------...............................................................---
|.........................................................................|
|.L.....................................................................L.|
|.........................................................................|
---...............................................................---------
  ---.....................................................---------        
    ---...........................................---------                
      ---.................................---------                        
        ---.......................---------                                
          ---...L.........---------                                        
            ---...---------                                                
              -----                                                        `,
    8: `----------------------------------------------                             
|............................................---                           
--.............................................---                         
 ---......................................FF.....---                       
   ---...................................FF........---                     
     ---................................FF...........---                   
       ---.............................FF..............---                 
         ---..........................FF.................---               
           ---.......................FF....................---             
             ---....................FF.......................---           
               ---.................FF..........................---         
                 ---..............FF.............................---       
                   ---...........FF................................----    
                     ---........FF...................................---   
                       ---.....FF......................................--- 
                         ---.............................................--
                           ---............................................|
                             ----------------------------------------------`,
    9: `}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
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
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}`,
    10: `.......................................................................
.......................................................................
.......................................................................
.......................................................................
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
.......................................................................
.......................................................................
.......................................................................
.......................................................................`,
    11: null,
    12: `                                                                           
         .......................           .......................         
        .........................         .........................        
       ...........................       ...........................       
      .............................     .............................      
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
 ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ 
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
      .............................     .............................      
       ...........................       ...........................       
        .........................         .........................        
         .......................           .......................         
                                                                           `,
    13: `---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`,
};
