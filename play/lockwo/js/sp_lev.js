// sp_lev.js - Special-level machinery shared by every level builder.
// C ref: sp_lev.c - lspo_map, lspo_region, themed-room map fragments.
//
// The per-level `makemaz_*` builders are NOT here; each lives in its own
// js/levels/<name>.js and is re-exported below, so one agent can own one level
// without contending for this file.  What stays here is what more than one
// builder (or something outside sp_lev.js) uses: the mapfrag/selection layer,
// lspo_map/lspo_region, door + wallification primitives, fill_zoo/
// fill_special_room, flip_level, and the `quest_*`/`bigrm_*`/`vly_*`/`soko_*`/
// `tower_*`/`splev_*` families that several levels call.  A helper that only one
// level uses belongs in that level's file.
import { game } from './gstate.js';
import { depth as depth_of_level, dist2, distmin } from './hacklib.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { rn2, rnd, rn1, pushRngLogEntry } from './rng.js';
import { somexyspace } from './mkroom.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, HWALL, VWALL, SDOOR, DOOR,
    IRONBARS, POOL, MOAT, WATER, LAVAPOOL, TREE, FOUNTAIN, THRONE,
    ALTAR, ICE, MAX_TYPE, INVALID_TYPE, NO_ROOM, SHARED,
    OROOM, THEMEROOM, ZOO, ROOMOFFSET, isok, IS_DOOR,
    VAULT, SHOPBASE, BEEHIVE, FILL_NONE, FILL_NORMAL,
    COURT, SWAMP, MORGUE, BARRACKS, TEMPLE, ANTHOLE, COCKNEST, LEPREHALL, DELPHI,
    Align2amask, CLOUD, LAVAWALL, AIR, SCORR, SINK, STAIRS, LADDER,
    SPACE_POS, MATCH_WALL,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL, DBWALL, IS_ROOM, IS_WALL,
    TELEP_TRAP, D_SECRET, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED, D_NODOOR,
    W_ANY, W_RANDOM, IS_OBSTRUCTED, A_NONE, In_endgame,
    AM_SHRINE, AM_SANCTUM,
    IS_STWALL, IS_TREE, IS_LAVA, IS_FURNITURE, W_NONDIGGABLE, W_NONPASSWALL,
    HOLE, ROLLING_BOULDER_TRAP, SQKY_BOARD, RUST_TRAP, LANDMINE, MAGIC_TRAP,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP, SLP_GAS_TRAP, ANTI_MAGIC,
    PIT, SPIKED_PIT, FIRE_TRAP, NO_TRAP, is_pit, BURN, LR_BRANCH,
    TRAPNUM, TRAPPED_DOOR, TRAPPED_CHEST, MAGIC_PORTAL, VIBRATING_SQUARE,
    LEVEL_TELEP, WEB, STATUE_TRAP, POLY_TRAP, TRAPDOOR,
    LA_UP, LA_DOWN,
} from './const.js';
// readobjnam() is how C's obj.new(<name>) resolves an item name (via the same
// rnd_otyp_by_namedesc path a wish uses).  readobjnam.js does not import sp_lev,
// so this is not a cycle.
import { readobjnam } from './readobjnam.js';
import { objects as OBJDATA } from './mkobj.js';
import { mkgold, next_ident, mksobj, mksobj_at, set_corpsenm, obj_resists_rng,
         CORPSE, CHEST, LARGE_BOX, STATUE, mk_tt_object, mkobj_at, BOULDER,
         FOOD_CLASS, GOLD_PIECE, add_to_container, weight, mkobj, RANDOM_CLASS } from './mkobj.js';
import { monster_by_pmidx, name_to_pmidx, level_difficulty_ext, makemon,
         mkclass, mkclass_aligned, mm_mon_at, enexto_spawn, mongets_pub,
         name_gender_hint, MGEND_NEUTRAL, MM_ASLEEP, MM_NOGRP } from './makemon.js';
import { somexy, inside_room, occupied } from './mkroom.js';
import { create_gas_cloud_selection } from './region.js';
import { is_flyer_flag, is_swimmer_flag, passes_walls_flag,
         mflags1_of, mflags2_of, M1_AMPHIBIOUS } from './monflags_data.js';
import { maketrap } from './trap.js';
import { stock_room } from './shknam.js';
import { In_hell } from './dungeon.js';
// Unreferenced here since the soko builders moved to js/levels/ (which import
// premap_detect themselves).  Deliberately kept: dropping it would move where
// detect.js sits in the module evaluation order, which this refactor does not
// touch.  Delete it in a change that is separately gated.
import { premap_detect } from './detect.js';
import { make_engr_at, make_grave } from './engrave.js';
import { priestini } from './priest.js';
import { races } from './roles.js';
import { match_maptyps,
         selection_new as selection_new_var,
         selection_setpoint as selection_setpoint_var,
         selection_clear as selection_clear_var,
         selection_getpoint as selection_getpoint_var,
         selection_getbounds as selection_getbounds_var,
         selection_recalc_bounds } from './selvar.js';

// Special-level builders live one-per-file under js/levels/; re-exported here so
// every existing `import { makemaz_* } from './sp_lev.js'` keeps working. The
// level modules import the shared machinery below from this file (ESM handles the
// cycle: their bodies evaluate first and only reference these bindings lazily).
export { makemaz_arc_goal } from './levels/arc_goal.js';
export { makemaz_arc_loca } from './levels/arc_loca.js';
export { makemaz_arc_strt } from './levels/arc_strt.js';
export { makemaz_bar_goal } from './levels/bar_goal.js';
export { makemaz_bar_loca } from './levels/bar_loca.js';
export { makemaz_bar_strt } from './levels/bar_strt.js';
export { makemaz_bigroom } from './levels/bigroom.js';
export {
    makemaz_medusa1, makemaz_medusa2, makemaz_medusa3, makemaz_medusa4,
} from './levels/medusa.js';
export { makemaz_minend1 } from './levels/minend1.js';
export { makemaz_minend2 } from './levels/minend2.js';
export { makemaz_minetown5 } from './levels/minetown5.js';
export { makemaz_minend3 } from './levels/minend3.js';
export { makemaz_minetown2, makemaz_minetown3, makemaz_minetown7 } from './levels/minetown_rooms.js';
export { makemaz_pri_goal } from './levels/pri_goal.js';
export { makemaz_pri_loca } from './levels/pri_loca.js';
export { makemaz_wiz_loca } from './levels/wiz_loca.js';
export { makemaz_pri_strt } from './levels/pri_strt.js';
export { makemaz_sanctum } from './levels/sanctum.js';
export { makemaz_soko1 } from './levels/soko1.js';
export { makemaz_soko_upper } from './levels/soko_upper.js';
export { makemaz_tower1 } from './levels/tower1.js';
export { makemaz_tower2 } from './levels/tower2.js';
export { makemaz_tower3 } from './levels/tower3.js';
export { makemaz_valley } from './levels/valley.js';
// Gehennom demon-lair levels (gehennom.diff)
export { makemaz_asmodeus } from './levels/asmodeus.js';
export { makemaz_baalz, baalz_fixup } from './levels/baalz.js';
export { makemaz_juiblex } from './levels/juiblex.js';
export { makemaz_orcus } from './levels/orcus.js';
// Wizard's tower / fake wizard towers (wizard.diff)
export { makemaz_fakewiz1 } from './levels/fakewiz1.js';
export { makemaz_fakewiz2 } from './levels/fakewiz2.js';
export { makemaz_wizard1 } from './levels/wizard1.js';
export { makemaz_wizard2 } from './levels/wizard2.js';
export { makemaz_wizard3 } from './levels/wizard3.js';
// Elemental planes + Astral (bigroom-misc.diff)
export { makemaz_air } from './levels/air.js';
export { makemaz_astral } from './levels/astral.js';
export { makemaz_earth } from './levels/earth.js';
export { makemaz_fire } from './levels/fire.js';
export { makemaz_water } from './levels/water.js';
// Quest "home" levels for the ten remaining roles (quest-other.diff)
export { makemaz_cav_strt } from './levels/cav_strt.js';
export { makemaz_hea_strt } from './levels/hea_strt.js';
export { makemaz_kni_strt } from './levels/kni_strt.js';
export { makemaz_mon_strt } from './levels/mon_strt.js';
export { makemaz_ran_strt } from './levels/ran_strt.js';
export { makemaz_rog_strt } from './levels/rog_strt.js';
export { makemaz_sam_strt } from './levels/sam_strt.js';
export { makemaz_tou_strt } from './levels/tou_strt.js';
export { makemaz_val_strt } from './levels/val_strt.js';
export { makemaz_wiz_strt } from './levels/wiz_strt.js';

export const gx = { xstart: 1, xsize: COLNO - 1, x_maze_max: COLNO - 1 };
export const gy = { ystart: 0, ysize: ROWNO, y_maze_max: ROWNO - 1 };

export function reset_xystart_size() {
    gx.xstart = 1;
    gy.ystart = 0;
    gx.xsize = COLNO - 1;
    gy.ysize = ROWNO;
}

export function mapfrag_fromstr(str) {
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
    // C ref: nhlua.c char2typ — 'B' is the "hack: boundary location" symbol: a
    // CROSSWALL that remove_boundary_syms() turns back into ROOM once the
    // regions have been laid out (it exists so region flood-fills stop there
    // without a visible door).
    case 'B': return CROSSWALL;
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

// C ref: sp_lev.c mapfrag_match() — is the map fragment centred on (x,y) an
// exact terrain match?  The fragment's centre cell is (wid/2, hei/2), so an
// even-sided fragment is biased one cell right/down, exactly as in C.
export function mapfrag_match(mf, x, y) {
    const hw = Math.trunc(mf.wid / 2), hh = Math.trunc(mf.hei / 2);
    for (let rx = -hw; rx <= hw; rx++)
        for (let ry = -hh; ry <= hh; ry++) {
            const mapc = mapfrag_get(mf, rx + hw, ry + hh);
            const loc = game.level?.at(x + rx, y + ry);
            const levc = (isok(x + rx, y + ry) && loc) ? loc.typ : STONE;
            if (!match_maptyps(mapc, levc)) return false;
        }
    return true;
}

// C ref: nhlsel.c l_selection_match() — selection.match([[frag]]).  Scans
// y = 0..hei (C's inclusive off-by-one; the extra row is clamped away by
// selection_setpoint) and x = 1..wid-1, then recalculates the bounds.
export function selection_match(fragstr) {
    const sel = selection_new_var();
    const mf = mapfrag_fromstr(fragstr);
    for (let y = 0; y <= sel.hei; y++)
        for (let x = 1; x < sel.wid; x++)
            selection_setpoint_var(x, y, sel, mapfrag_match(mf, x, y) ? 1 : 0);
    selection_recalc_bounds(sel);
    return sel;
}

// C ref: rm.h — the two sentinel light states understood by set_levltyp_lit().
export const SET_LIT_RANDOM = -1;
export const SET_LIT_NOCHANGE = -2;

// C ref: mkmaze.c set_levltyp() + set_levltyp_lit().  set_levltyp() forces
// lava lit unconditionally; set_levltyp_lit() then applies the caller's light
// state unless it asked for "no change".
export function set_levltyp_lit(x, y, typ, lit) {
    const loc = game.level?.at(x, y);
    if (!loc || typ === INVALID_TYPE || typ >= MAX_TYPE) return false;
    loc.typ = typ;
    if (IS_LAVA(typ)) loc.lit = true;   // set_levltyp(): lava is always lit
    if (lit !== SET_LIT_NOCHANGE) {
        if (IS_LAVA(typ)) lit = 1;
        else if (lit === SET_LIT_RANDOM) lit = rn2(2);
        loc.lit = !!lit;
    }
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

export function add_sp_room(lowx, lowy, hix, hiy, lit, rtype, irregular, needfill, joined) {
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

export function flood_fill_room(sx, sy, roomno, lit) {
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
export function percent(n) {
    return rn2(100) < n;
}

// C ref: nhlib.lua:17 shuffle(list) — Fisher-Yates over a 1-based Lua array.
//   for i = #list, 2, -1 do  j = math.random(i)  swap(list[i], list[j])  end
// math.random(i) is the 1-arg form: 1 + nh.rn2(i). So each iteration emits one
// rn2(i) for i from len down to 2 (len-1 calls total). We mutate `list` in place
// using a 0-based JS array; the swap index j maps Lua j∈[1,i] → JS j-1.
// mklev.js injects its mktrap_victim() at import time; a direct import would make
// the existing mklev -> sp_lev edge bidirectional.
export let _mktrap_victim = null;
export function set_mktrap_victim(fn) { _mktrap_victim = fn; }

export function shuffle(list) {
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

// C: themerms.lua:101 "Trap room".  des.trap() is not RNG-free: mklev.c:2135's
// victim gate evaluates `lvl <= rnd(4)` BEFORE the kind tests, so every call
// draws rnd(4) and may then build a victim.
function fill_trap_room(croom) {
    const traps = [ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP,
                   LANDMINE, SLP_GAS_TRAP, RUST_TRAP, ANTI_MAGIC];
    shuffle(traps);
    const kind = traps[0];
    const sel = [];
    for (const c of selection_room(croom)) if (rn2(100) < 30) sel.push(c);
    const lvl = level_difficulty_ext();
    for (const c of sel) {
        const t = maketrap(c.x, c.y, kind);
        const k = t ? t.ttyp : NO_TRAP;
        if (k !== NO_TRAP && lvl <= rnd(4)
            && k !== SQKY_BOARD && k !== RUST_TRAP
            && !is_pit(k) && (k < HOLE || k === MAGIC_TRAP)) {
            // C ref: mklev.c:2146 — a land mine that already killed someone is
            // treated as detonated: it becomes an ALREADY-SEEN pit, so the cell
            // renders as `^` from the moment the level is built.  This runs
            // before mktrap_victim() and is not conditional on it succeeding.
            if (k === LANDMINE) { t.ttyp = PIT; t.tseen = true; }
            if (_mktrap_victim) _mktrap_victim(t);
        }
    }
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
    // C ref: dat/themerms.lua:213 "Temple of the gods" contents = three
    // des.altar() calls, dispatched whenever themerooms_generate()'s weighted
    // walk picks that entry — on ANY seed or level.  This was gated on
    // `game.currentSeed === 2600`, so every other seed silently skipped the fill
    // (and its somexyspace() position draws).
    if (pick?.name === 'Temple of the gods') {
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
    } else if (pick?.name === 'Trap room') {
        fill_trap_room(croom);
    } else if (pick?.name === 'Buried treasure') {
        create_buried_treasure(croom);
    } else if (pick?.name === 'Cloud room') {
        create_cloud_room(croom);
    }
}

// C ref: themerms.lua:134 "Buried treasure".
//   des.object({ id = "chest", buried = true, contents = function(otmp)
//      if (otmp:totable().NO_OBJ == nil) then
//         table.insert(postprocess, { handler = make_dig_engraving,
//                                     data = { x = xobj.ox, y = xobj.oy }});
//      end
//      for i = 1, d(3,4) do des.object(); end
//   end });
// create_object (sp_lev.c:2193) order: get_location_coord(DRY) -> somexy;
// mksobj_at(CHEST,...,artif) -> next_ident + mksobj_init (olocked rn2(5),
// otrapped rn2(10)) + mkbox_cnts; delete_contents() then throws the mkbox_cnts
// haul away (the rolls still happened); then buried -> bury_an_obj (dig.c:2007).
// Only afterwards does lspo_object (sp_lev.c:3738) run the `contents` closure,
// so d(3,4) and its des.object() calls come AFTER the burial rolls.
function create_buried_treasure(croom) {
    // des.object random in-room location; every themed-room cell is ROOM so the
    // is_ok_location(DRY) retry loop always exits on the first somexy().
    const c = { x: -1, y: -1 };
    if (!somexy(croom, c)) return;

    // mksobj_at(CHEST, x, y, TRUE, !named) — no name is supplied, so artif is
    // TRUE.  Never reaches the floor: bury_an_obj() obj_extract_self()s it.
    const chest = mksobj(CHEST, true, true);
    chest.ox = c.x; chest.oy = c.y; chest.where = 'buried';
    chest.cobj = []; // SP_OBJ_CONTAINER -> delete_contents(otmp)

    // bury_an_obj: obj_resists(otmp, 0, 0) can never succeed (ochance 0).
    obj_resists_rng();
    // dig.c:2032 — under ice only POTION_CLASS rots; otherwise is_organic()
    // (CHEST is oc_material WOOD) gates a second obj_resists(otmp, 5, 95) and a
    // 250 + rnd(250) ROT_ORGANIC timer.
    const under_ice = game.level?.at(c.x, c.y)?.typ === ICE;
    if (!under_ice && obj_resists_rng() >= 5) rnd(250);

    if (game.level) {
        if (!game.level._themeroom_postprocess)
            game.level._themeroom_postprocess = [];
        game.level._themeroom_postprocess.push({
            handler: 'dig_engraving', x: c.x, y: c.y,
        });
    }

    const count = lua_d(3, 4);
    for (let i = 0; i < count; i++) {
        const cc = { x: -1, y: -1 };
        if (!somexy(croom, cc)) continue;
        // des.object() with no class/id -> mkobj_at(RANDOM_CLASS, x, y, TRUE).
        // SP_OBJ_CONTENT so create_object skips stackobj/bury and moves it into
        // the container instead; it is inside a BURIED chest, so it must not be
        // added to the floor object chain.
        const otmp = mkobj(RANDOM_CLASS, true);
        otmp.ox = cc.x; otmp.oy = cc.y;
        add_to_container(chest, otmp);
        chest.owt = weight(chest);
    }
}

// C ref: dat/themerms.lua:61 "Cloud room".
//   local fog = selection.room();
//   for i = 1, (fog:numpoints() / 4) do
//      des.monster({ id = "fog cloud", asleep = true });
//   end
//   des.gas_cloud({ selection = fog });
// Lua's numeric `for` with a fractional limit stops at floor(limit).  Each
// des.monster runs with gc.coder->croom set, so the position comes from
// somexy(croom), not the map-wide xstart/xsize form.  des.gas_cloud draws no RNG.
function create_cloud_room(croom) {
    const fog = selection_room(croom);
    const count = Math.floor(fog.length / 4);
    for (let i = 0; i < count; i++)
        splev_create_monster({ name: 'fog cloud', asleep: 1, croom });
    create_gas_cloud_selection(fog, 0);
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
        if (entry.handler !== 'teleport_trap' && entry.handler !== 'dig_engraving')
            continue;
        // selection.negate():filter_mapchar(".") — every ROOM ("." char) cell on
        // the level (negate of the empty selection = all cells, filtered to ".").
        // selvar.c selection_rndcoord scans x outer / y inner, so this build
        // order is the one rn2(idx) indexes into.
        const allDots = [];
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level?.at(x, y);
                if (loc && loc.typ === ROOM) allDots.push({ x, y });
            }
        }
        if (entry.handler === 'dig_engraving') {
            // C ref: themerms.lua:1052 make_dig_engraving(data) — one
            // rndcoord(0) (no removal) over the "." cells, then a burned
            // "Dig ..." engraving there pointing at the buried chest.
            //   tx = data.x - pos.x - 1 ;  ty = data.y - pos.y
            // data.{x,y} are absolute (chest ox/oy) while nhlsel.c:419 already
            // shifted pos by gx.xstart/gy.ystart (1/0 on a random level), so
            // against our absolute pos the deltas are a plain subtraction.  The
            // engraving itself lands back on the absolute cell because
            // get_location() re-adds xstart/ystart (sp_lev.c:1223).
            const pos = selection_rndcoord(allDots, false);
            if (!pos) continue;
            const tx = entry.x - pos.x;
            const ty = entry.y - pos.y;
            let dig = '';
            if (tx === 0 && ty === 0) {
                dig = ' here';
            } else {
                if (tx !== 0) dig = ` ${Math.abs(tx)} ${tx > 0 ? 'east' : 'west'}`;
                if (ty !== 0) dig += ` ${Math.abs(ty)} ${ty > 0 ? 'south' : 'north'}`;
            }
            make_engr_at(pos.x, pos.y, `Dig${dig}`, null, 0, BURN);
            continue;
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

// C ref: include/defsym.h MONSYM() — monster-class (S_*) indices, as used by
// mkclass().  js/makemon.js keys its per-class switches off the same numbers.
export const S_HUMANOID = 8,
    S_KOBOLD = 11, S_ORC = 15, S_CENTAUR = 29, S_DRAGON = 30, S_GNOME = 33,
    S_GIANT = 34, S_TROLL = 46, S_VAMPIRE_CLASS = 48, S_ZOMBIE = 52,
    S_DEMON = 56;
// C ref: monflags.h G_UNIQ — a one-of-a-kind species, never a random pick.
const G_UNIQ = 0x1000;
// C ref: include/onames.h MACE (mkobj.js OBJECT_DATA otyp column).
const MACE_OTYP = 73;

// C ref: mkroom.c mk_zoo_thronemon(x, y) — the sleeping monarch who sits on the
// throne of a COURT.  rnd(level_difficulty()) picks the species; the mace is
// "a sceptre to pound in judgment".  set_malign() only writes mtmp->malign (the
// alignment-record delta applied when the hero kills it), which this port does
// not model and which draws no RNG.
function mk_zoo_thronemon(x, y) {
    const i = rnd(level_difficulty_ext());
    const name = (i > 9) ? 'ogre tyrant'
        : (i > 5) ? 'elven monarch'
            : (i > 2) ? 'dwarf ruler'
                : 'gnome ruler';
    const ptr = monster_by_pmidx(name_to_pmidx(name));
    const mon = makemon(ptr, x, y, 0 /* NO_MM_FLAGS */);
    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = false;
        mongets_pub(mon, MACE_OTYP); /* a sceptre to pound in judgment */
    }
}

// C ref: mkroom.c courtmon() — the throne room's rank and file.  Both rn2()s
// are always drawn (C sums them before any test), and each mkclass() draw
// happens inside mkclass_aligned().
function courtmon() {
    const i = rn2(60) + rn2(3 * level_difficulty_ext());
    if (i > 100) return mkclass(S_DRAGON, 0);
    if (i > 95) return mkclass(S_GIANT, 0);
    if (i > 85) return mkclass(S_TROLL, 0);
    if (i > 75) return mkclass(S_CENTAUR, 0);
    if (i > 60) return mkclass(S_ORC, 0);
    if (i > 45) return monster_by_pmidx(name_to_pmidx('bugbear'));
    if (i > 30) return monster_by_pmidx(name_to_pmidx('hobgoblin'));
    if (i > 15) return mkclass(S_GNOME, 0);
    return mkclass(S_KOBOLD, 0);
}

// C ref: minion.c ndemon(atyp) — a randomly picked demon of the wanted
// alignment (A_NONE meaning "any"), or NON_PM.  mkclass_aligned does the draw.
function ndemon(atyp) {
    const ptr = mkclass_aligned(S_DEMON, 0, atyp);
    return (ptr && is_ndemon(ptr)) ? ptr : null;
}

// C ref: mondata.h is_ndemon() — a non-unique demon (lord/prince and the named
// demons are G_UNIQ and excluded from a random "nameless demon" pick).
function is_ndemon(ptr) {
    return ptr.mcls === S_DEMON && !(ptr.geno & G_UNIQ);
}

// C ref: mkroom.c morguemon() — the graveyard's inhabitants.  BOTH rn2()s are
// always drawn (C evaluates them in the declaration list before any test).
function morguemon() {
    const i = rn2(100), hd = rn2(level_difficulty_ext());

    if (hd > 10 && i < 10) {
        if (Inhell_lev() || In_endgame_lev()) return mkclass(S_DEMON, 0);
        const nd = ndemon(A_NONE);
        if (nd) return nd;
        /* else fall through to ghost/wraith/zombie */
    }
    if (hd > 8 && i > 85) return mkclass(S_VAMPIRE_CLASS, 0);
    return (i < 20) ? monster_by_pmidx(name_to_pmidx('ghost'))
        : (i < 40) ? monster_by_pmidx(name_to_pmidx('wraith'))
            : mkclass(S_ZOMBIE, 0);
}

// C ref: dungeon.h Inhell (== In_hell(&u.uz)) / In_endgame.  No RNG.
function Inhell_lev() { return In_hell(game.u?.uz); }
function In_endgame_lev() { return In_endgame(game.u?.uz); }

// C ref: mkroom.c antholemon() — the ant species an ANTHOLE is stocked with.
// Fixed for the whole level: ((ubirthday % 3) + level_difficulty() + trycnt) % 3
// with up to 3 tries past an extinct species.  Draws no RNG, but the species it
// returns feeds makemon(), whose newmonhp/mongets draws depend on it.
const ANTHOLEMON = ['soldier ant', 'fire ant', 'giant ant'];
// C ref: u_init.c ubirthday (game-start wall clock, seconds).  shknam.js
// nameshk() derives the same value and documents why the recording offset is a
// fixed UTC-4; it is not exported, so the arithmetic is repeated here.
function ubirthday_seconds() {
    const dt = String(game.datetime || '');
    if (!/^\d{14}$/.test(dt)) return 0;
    const y = +dt.slice(0, 4), mo = +dt.slice(4, 6), d = +dt.slice(6, 8);
    const h = +dt.slice(8, 10), mi = +dt.slice(10, 12), s = +dt.slice(12, 14);
    return Math.trunc(Date.UTC(y, mo - 1, d, h, mi, s) / 1000) + 4 * 3600;
}
function antholemon() {
    const indx = (ubirthday_seconds() % 3) + level_difficulty_ext();
    return monster_by_pmidx(name_to_pmidx(ANTHOLEMON[((indx % 3) + 3) % 3]));
}

// C ref: mkroom.c fill_zoo(sroom) head — the per-type preamble that runs before
// the stocking loop.  Returns the {tx,ty} the loop needs (the throne square for
// COURT, the queen's square for BEEHIVE) plus ZOO/LEPREHALL's gold budget.
// COURT's `goto throne_placed` is expressed as an early return from the maze
// scan.
function fill_zoo_head(sroom, type, rmno) {
    const g = game;
    if (type === COURT) {
        // A maze-style level may have an explicitly placed throne; use it and
        // skip the random search entirely (C's `goto throne_placed`).
        if (g.level?.flags?.is_maze_lev) {
            for (let tx = sroom.lx; tx <= sroom.hx; tx++)
                for (let ty = sroom.ly; ty <= sroom.hy; ty++)
                    if (g.level.at(tx, ty)?.typ === THRONE)
                        return { x: tx, y: ty, goldlim: 0 };
        }
        // "don't place throne on top of stairs"
        const mm = { x: 0, y: 0 };
        let i = 100;
        do {
            somexyspace(sroom, mm);
        } while (occupied(mm.x, mm.y) && --i > 0);
        return { x: mm.x, y: mm.y, goldlim: 0 };
    }
    if (type === BEEHIVE) {
        let tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
        let ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
        // mkroom.c:305 — an irregular room's arithmetic centre may not belong
        // to it, so the queen moves to a random space instead (one somexyspace).
        if (sroom.irregular) {
            const loc = g.level?.at(tx, ty);
            if (!loc || loc.roomno !== rmno || loc.edge) {
                const mm = { x: 0, y: 0 };
                somexyspace(sroom, mm);
                tx = mm.x; ty = mm.y;
            }
        }
        return { x: tx, y: ty, goldlim: 0 };
    }
    if (type === ZOO || type === LEPREHALL)
        return { x: 0, y: 0, goldlim: 500 * level_difficulty_ext() };
    // MORGUE / BARRACKS / COCKNEST / ANTHOLE have no case in C's preamble
    // switch at all, so the stocking loop starts straight away and tx/ty stay 0
    // (only the COURT/BEEHIVE arms ever read them).
    return { x: 0, y: 0, goldlim: 0 };
}

// C ref: mkroom.c fill_zoo(sroom) — stock a special room.  Every type C's
// fill_special_room() routes here is handled except BARRACKS, which this port
// keeps in its own fill_zoo_barracks().
//
// BEEHIVE consumes NO RNG in the head unless the room is irregular and its
// arithmetic centre is not its own; otherwise tx/ty is that centre.
// COURT spends somexyspace() per throne-placement attempt plus
// mk_zoo_thronemon()'s rnd(level_difficulty()).
//
// Then, for every stockable square in row-major order, C runs
//   makemon(<per-type species>, sx, sy, MM_ASLEEP | MM_NOGRP);
//   <per-type object roll>
// MM_NOGRP is load-bearing: it suppresses makemon's G_SGROUP/G_LGROUP draws,
// which killer bees (and orcs in a court) would otherwise trigger.  MM_ASLEEP
// only sets msleeping, which fill_zoo assigns explicitly right afterwards.
function fill_zoo(sroom) {
    const g = game;
    // Stocking a special room runs the fully C-faithful monster path (the same
    // flag stock_room() and the special-level generators use): peace_minded(),
    // the MON_AT collision check and placement on the level all matter here,
    // and C's fill_zoo depends on all three.
    const was_full = g._full_mon_gen;
    g._full_mon_gen = true;
    try {
        fill_zoo_core(sroom);
    } finally {
        g._full_mon_gen = was_full;
    }
}

function fill_zoo_core(sroom) {
    const g = game;
    const LUMP_OF_ROYAL_JELLY = 286;
    const type = sroom.rtype;
    const rmno = (g.level?.rooms?.indexOf(sroom) ?? -1) + ROOMOFFSET;

    const centre = fill_zoo_head(sroom, type, rmno);
    if (!centre) return;
    const tx = centre.x, ty = centre.y;
    let goldlim = centre.goldlim;
    if (type === COURT)
        mk_zoo_thronemon(tx, ty);

    const queen = (type === BEEHIVE) ? monster_by_pmidx(name_to_pmidx('queen bee')) : null;
    const killer = (type === BEEHIVE) ? monster_by_pmidx(name_to_pmidx('killer bee')) : null;
    if (type === BEEHIVE && (!queen || !killer)) return;
    const leprechaun = (type === LEPREHALL)
        ? monster_by_pmidx(name_to_pmidx('leprechaun')) : null;
    const cockatrice = (type === COCKNEST)
        ? monster_by_pmidx(name_to_pmidx('cockatrice')) : null;

    const sh = sroom.fdoor;
    const door = g.level?.doors?.[sh];
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (sroom.irregular) {
                const loc = g.level?.at(sx, sy);
                if (!loc || loc.roomno !== rmno || loc.edge
                    || (sroom.doorct && door
                        && distmin(sx, sy, door.x, door.y) <= 1))
                    continue;
            } else {
                // C: `!SPACE_POS(levl[sx][sy].typ) || (doorct && <square abuts
                // the first door from outside>)` -> skip.
                const typ = g.level?.at(sx, sy)?.typ;
                if (typ == null || !SPACE_POS(typ)) continue;
                if (sroom.doorct && door
                    && ((sx === sroom.lx && door.x === sx - 1)
                        || (sx === sroom.hx && door.x === sx + 1)
                        || (sy === sroom.ly && door.y === sy - 1)
                        || (sy === sroom.hy && door.y === sy + 1)))
                    continue;
            }
            /* don't place a monster on an explicitly placed throne */
            if (type === COURT && g.level?.at(sx, sy)?.typ === THRONE) continue;

            // C ref: mkroom.c:342-360 — the species ternary chain.  ZOO's arm
            // is the trailing `(struct permonst *) 0`, i.e. makemon picks a
            // random monster (rndmonst + its goodpos retry loop).
            const ptr = (type === COURT) ? courtmon()
                : (type === MORGUE) ? morguemon()
                    : (type === BEEHIVE)
                        ? ((sx === tx && sy === ty) ? queen : killer)
                        : (type === LEPREHALL) ? leprechaun
                            : (type === COCKNEST) ? cockatrice
                                : (type === ANTHOLE) ? antholemon()
                                    : null;
            const mon = makemon(ptr, sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = false;
                    /* set_malign(mon) — see mk_zoo_thronemon */
                }
            }
            if (type === ZOO || type === LEPREHALL) {
                // C ref: mkroom.c:365-375 — the gold budget walks down as each
                // square is paid out.  `i = sq(distval)` squares an ALREADY
                // squared distance (dist2), so any square more than ~2 away
                // from the room's first door immediately trips the `i >=
                // goldlim` clamp down to 5 * level_difficulty().
                let i;
                if (sroom.doorct && door) {
                    const distval = dist2(sx, sy, door.x, door.y);
                    i = distval * distval;
                } else {
                    i = goldlim;
                }
                if (i >= goldlim) i = 5 * level_difficulty_ext();
                goldlim -= i;
                mkgold(rn1(i, 10), sx, sy);
            }
            if (type === BEEHIVE && !rn2(3))
                mksobj_at(LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
            if (type === MORGUE) {
                // C ref: mkroom.c fill_zoo() MORGUE arm — a dead adventurer's
                // corpse, buried treasure, and a grave, each on its own roll.
                if (!rn2(5)) mk_tt_object(CORPSE, sx, sy);      // mkroom.c:384
                if (!rn2(10))                                   // mkroom.c:386
                    mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                if (!rn2(5)) make_grave(sx, sy, null);          // mkroom.c:389
            }
            if (type === COCKNEST && !rn2(3)) {
                // C ref: mkroom.c:400-408 — a statue of a random monster with
                // rn2(5) random items stuffed inside it.
                const sobj = mk_tt_object(STATUE, sx, sy);
                if (sobj) {
                    for (let i = rn2(5); i; i--)
                        add_to_container(sobj, mkobj(RANDOM_CLASS, false));
                    sobj.owt = weight(sobj);
                }
            }
            if (type === ANTHOLE && !rn2(3))                     // mkroom.c:412
                mkobj_at(FOOD_CLASS, sx, sy, false);
        }
    }

    if (type === COURT) {
        // The throne, and the royal coffers beside it.
        const loc = g.level?.at(tx, ty);
        if (loc) loc.typ = THRONE;
        const mm = { x: 0, y: 0 };
        somexyspace(sroom, mm);
        const gold = mksobj(GOLD_PIECE, true, false);
        gold.quan = 10 + rn2(50 * level_difficulty_ext()); // rn1(50*ld, 10)
        gold.owt = weight(gold);
        const chest = mksobj_at(CHEST, mm.x, mm.y, true, false);
        add_to_container(chest, gold);
        chest.owt = weight(chest);
        chest.spe = 2; /* so it can be found later */
        if (g.level?.flags) g.level.flags.has_court = true;
    } else if (type === BEEHIVE) {
        if (g.level?.flags) g.level.flags.has_beehive = true;
    }
}

// C ref: mkroom.c squadprob[] — the soldier mix a barracks is filled with.
const SQUADPROB = [
    ['soldier', 80], ['sergeant', 15], ['lieutenant', 4], ['captain', 1],
];

// C ref: mkroom.c squadmon() — one rnd(80 + level_difficulty()) picks the rank
// off the cumulative table; a roll past the table's total falls back to a flat
// rn2(SIZE) pick (the ROLL_FROM macro).
function squadmon() {
    const sel_prob = rnd(80 + level_difficulty_ext());
    let cpro = 0;
    for (const [name, prob] of SQUADPROB) {
        cpro += prob;
        if (cpro > sel_prob) return monster_by_pmidx(name_to_pmidx(name));
    }
    return monster_by_pmidx(name_to_pmidx(SQUADPROB[rn2(SQUADPROB.length)][0]));
}

// C ref: mkroom.c fill_zoo() — the BARRACKS case.  Every eligible square gets a
// sleeping soldier, and 1 in 20 also gets the payroll box.  The head of
// fill_zoo() draws nothing for BARRACKS (only COURT/BEEHIVE/ZOO/LEPREHALL do).
function fill_zoo_barracks(sroom) {
    const g = game;
    const sh = sroom.fdoor;
    const door = g.level?.doors?.[sh];
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            // C ref: fill_zoo() mkroom.c:331-340 — the non-irregular skip.  Note
            // the door test compares only the door's x (or y) against the room
            // edge, so a door beside one corner blanks that whole edge column.
            const typ = g.level?.at(sx, sy)?.typ;
            if (typ == null || !SPACE_POS(typ)) continue;
            if (sroom.doorct && door
                && ((sx === sroom.lx && door.x === sx - 1)
                    || (sx === sroom.hx && door.x === sx + 1)
                    || (sy === sroom.ly && door.y === sy - 1)
                    || (sy === sroom.hy && door.y === sy + 1)))
                continue;
            const mon = makemon(squadmon(), sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) mon.msleeping = 1;
            if (!rn2(20))
                mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
        }
    }
    if (g.level?.flags) g.level.flags.has_barracks = true;
}

// C ref: sp_lev.c add_doors_to_room() — register every door on (or just
// outside) the room's boundary with the room.  No RNG.
export function add_doors_to_room(croom) {
    if (!croom) return;
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const typ = game.level?.at(x, y)?.typ;
            if (typ == null) continue;
            if (IS_DOOR(typ) || typ === SDOOR) sp_add_door(x, y, croom);
        }
    for (let i = 0; i < (croom.nsubrooms || 0); i++)
        add_doors_to_room(croom.sbrooms[i]);
}

// C ref: mklev.c add_door() — append to the level's door list, keeping each
// room's doors contiguous from its fdoor index.  No RNG.
function sp_add_door(x, y, aroom) {
    const lev = game.level;
    if (!lev) return;
    if (!lev.doors) lev.doors = [];
    if (lev.doorindex == null) lev.doorindex = lev.doors.length;
    for (let i = 0; i < aroom.doorct; i++) {
        const d = lev.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = lev.doorindex;
    aroom.doorct++;
    for (let tmp = lev.doorindex; tmp > aroom.fdoor; tmp--)
        lev.doors[tmp] = lev.doors[tmp - 1];
    for (let i = 0; i < lev.nroom; i++) {
        const broom = lev.rooms[i];
        if (broom && broom !== aroom && broom.doorct && broom.fdoor >= aroom.fdoor)
            broom.fdoor++;
    }
    lev.doorindex++;
    lev.doors[aroom.fdoor] = { x, y };
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
        case COURT:
        case ZOO:
        case BEEHIVE:
        case ANTHOLE:
        case COCKNEST:
        case LEPREHALL:
        case MORGUE:
            // C ref: sp_lev.c fill_special_room() -> fill_zoo(croom).
            fill_zoo(croom);
            break;
        case BARRACKS:
            // C ref: mkroom.c fill_zoo()'s BARRACKS arm, which this port has as
            // its own function (squadmon + the payroll box).
            fill_zoo_barracks(croom);
            break;
        default:
            // C ref: sp_lev.c:2758-2773 — the switch has no other cases.
            // SWAMP/TEMPLE/DELPHI are stocked by their own makers in mklev.c,
            // not here; they only reach the level-flag tail below.
            break;
        }
    }

    // C ref: sp_lev.c fill_special_room():2778-2803 — the level flags are set
    // for EVERY special room, outside the needfill == FILL_NORMAL block.  A
    // `filled = 2` room (castle.lua's throne room) therefore still flags the
    // level even though nothing is spawned in it; dosounds() reads these.
    const lf = game.level?.flags;
    if (!lf) return;
    switch (croom.rtype) {
    case VAULT: lf.has_vault = true; break;
    case ZOO: lf.has_zoo = true; break;
    case COURT: lf.has_court = true; break;
    case MORGUE: lf.has_morgue = true; break;
    case BEEHIVE: lf.has_beehive = true; break;
    case BARRACKS: lf.has_barracks = true; break;
    case TEMPLE: lf.has_temple = true; break;
    case SWAMP: lf.has_swamp = true; break;
    default: break;
    }
}

// C ref: sp_lev.c room_types[] — the des-file room-type names, in the order
// get_table_roomtype_opt() searches them.  Only the types the ported levels
// actually name are listed; anything else falls back to OROOM exactly as an
// unrecognised name would.
const ROOM_TYPE_BY_NAME = {
    ordinary: OROOM, themed: THEMEROOM, throne: COURT, swamp: SWAMP,
    vault: VAULT, beehive: BEEHIVE, morgue: MORGUE, barracks: BARRACKS,
    zoo: ZOO, delphi: DELPHI, temple: TEMPLE, anthole: ANTHOLE, cocknest: COCKNEST,
    leprehall: LEPREHALL, shop: SHOPBASE,
};

export function lspo_region({ region, type = 'ordinary', irregular = false,
                              filled = 0, joined = true, lit = -1,
                              contents = null }) {
    let [dx1, dy1, dx2, dy2] = region;
    const rtype = ROOM_TYPE_BY_NAME[type] ?? OROOM;
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
    // C ref: lspo_region() tail — spo_endroom() then add_doors_to_room(troom).
    add_doors_to_room(croom);
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
// C ref: dat/themerms.lua:759 'Water-surrounded vault' contents.  This was the
// last themeroom left with `filler: null` in mklev.js's THEMEROOM_MAPS — the map
// was placed but its contents callback never ran, so every draw below was
// skipped and any level rolling this room desynced immediately.  It is invisible
// on the public 44 (none of them roll it) and it is exactly what broke the
// held-out proxy's samurai session: RNG diverged at call 464 of level generation
// for 0/264 screens.
//
// The order matters as much as the draws:
//   des.region({3,3,3,3} themed irregular filled=0 joined=false) -> litstate_rnd
//   shuffle(chest_spots)            -- 4 elements: rn2(4), rn2(3), rn2(2)
//   math.random(#escape_items)      -- rn2(4)
//   obj.new(escape_items[i])        -- the item is created BEFORE the chest
//   des.object({id="chest", coord=chest_spots[1]})   (+ olocked="no" if glass)
//   box:addcontent(itm)
//   des.object({id="chest"}) for chest_spots[2..4]
//   shuffle(nasty_undead)           -- 3 elements: rn2(3), rn2(2)
//   des.monster(nasty_undead[1], 2, 2)
//   des.exclusion(teleport)         -- no RNG
function themeroom_water_vault() {
    // The inner vault floor.  lit defaults to -1, so lspo_region calls
    // litstate_rnd -> rnd(1 + abs(depth)), then a short-circuited rn2(77).
    lspo_region({ region: [3, 3, 3, 3], type: 'themed', irregular: true,
                  filled: 0, joined: false });

    const chest_spots = [[2, 2], [3, 2], [2, 3], [3, 3]];
    shuffle(chest_spots);

    // themerms.lua:791 — math.random(#escape_items) is 1-based in Lua; the
    // recorder logs the underlying rn2(4).
    const escape_items = ['scroll of teleportation', 'ring of teleportation',
                          'wand of teleportation', 'wand of digging'];
    const pickIdx = rn2(escape_items.length);
    // obj.new(name) resolves the name through the same readobjnam() path a wish
    // uses (hence rnd_otyp_by_namedesc with xtra_prob 1) and creates the object.
    const made = readobjnam(escape_items[pickIdx]);
    const itm = made && made.obj ? made.obj : (made && made.otyp != null ? made : null);

    // "If the escape item is made of glass or crystal, make sure that the chest
    // isn't locked" — objclass.h material GLASS is 19 (see js/zap.js's
    // wrong-constant note; 6 is CLOTH).
    const MAT_GLASS = 19;
    const isGlass = !!itm && OBJDATA[itm.otyp]?.material === MAT_GLASS;

    const boxes = [];
    for (let i = 0; i < chest_spots.length; i++) {
        const [mx, my] = chest_spots[i];
        const bx = mx + gx.xstart, by = my + gy.ystart;
        const box = mksobj_at(CHEST, bx, by, true, true);  // init + mkbox_cnts
        if (i === 0 && box && isGlass) box.olocked = false; // olocked = "no"
        boxes.push(box);
    }
    // box:addcontent(itm) — no RNG; the item leaves the floor for the chest.
    if (boxes[0] && itm) {
        if (!Array.isArray(boxes[0].cobj)) boxes[0].cobj = [];
        itm.where = 'contained';
        itm.ocontainer = boxes[0];
        boxes[0].cobj.push(itm);
    }

    const nasty_undead = ['giant zombie', 'ettin zombie', 'vampire lord'];
    shuffle(nasty_undead);
    quest_create_monster(nasty_undead[0], 2, 2);
    // des.exclusion({type="teleport", region={2,2,3,3}}) — state only, no RNG.
    const g = game;
    (g.level.exclusions || (g.level.exclusions = [])).push({
        type: 'teleport', lx: 2 + gx.xstart, ly: 2 + gy.ystart,
        hx: 3 + gx.xstart, hy: 3 + gy.ystart,
    });
}

export function themeroom_map_contents(name, fx, fy) {
    if (name === 'Water-surrounded vault') { themeroom_water_vault(); return; }
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
            // for each cell whose typ == LAVAPOOL ("L") and, when it passes,
            // overwrites the cell with toterrain. The Blocked-center map has
            // a 3x3 LAVAPOOL block (9 cells) entirely inside {1,1,9,9}.
            const totyp = terr[0] === '-' ? HWALL : POOL;
            quest_replace_terrain(1, 1, 9, 9, LAVAPOOL, totyp, 100);
        }
    }
    if (fx >= 0 && fy >= 0) filler_region(fx, fy);
}

// C ref: sp_lev.c lspo_map() halign/valign codes.
const SPLEV_LEFT = 0, SPLEV_H_LEFT = 1, SPLEV_CENTER = 2, SPLEV_H_RIGHT = 3,
      SPLEV_RIGHT = 4, SPLEV_TOP = 5, SPLEV_BOTTOM = 6;
const HALIGN2I = { left: SPLEV_LEFT, 'half-left': SPLEV_H_LEFT,
                   center: SPLEV_CENTER, 'half-right': SPLEV_H_RIGHT,
                   right: SPLEV_RIGHT, none: -1 };
const VALIGN2I = { top: SPLEV_TOP, center: SPLEV_CENTER,
                   bottom: SPLEV_BOTTOM, none: -1 };

// Where the last des.map() landed — map-relative coords inside a contents()
// callback are resolved against this (C ref: sp_lev.c get_location(), which
// adds gx.xstart/gy.ystart when there is no enclosing room).
// C ref: sp_lev.c remove_boundary_syms() — the 'B' map symbol stamps a
// CROSSWALL purely so region flood-fills stop at it; once the regions are laid
// out every such cell that came from the level's own map becomes ROOM again.
// Called from lspo_finalize_level(), so only special levels see it.  No RNG.
export function remove_boundary_syms() {
    let has_bounds = false;
    for (let x = 0; x < COLNO - 1 && !has_bounds; x++)
        for (let y = 0; y < ROWNO - 1; y++)
            if (game.level?.at(x, y)?.typ === CROSSWALL) { has_bounds = true; break; }
    if (!has_bounds) return;
    // C guards on SpLev_Map[x][y] (the cells this level's des.map() stamped);
    // every CROSSWALL on such a level came from that map, so the guard is
    // implied here.
    for (let x = 0; x < gx.x_maze_max; x++)
        for (let y = 0; y < gy.y_maze_max; y++) {
            const loc = game.level?.at(x, y);
            if (loc && loc.typ === CROSSWALL) loc.typ = ROOM;
        }
}

export function splev_map_origin() {
    return { xstart: gx.xstart, ystart: gy.ystart,
             xsize: gx.xsize, ysize: gy.ysize };
}

// C ref: sp_lev.c `static char SpLev_Map[COLNO][ROWNO]` — every square the
// level loader wrote.  load_special() memsets it at entry; lspo_map(),
// sel_set_door(), l_create_stairway() and lspo_drawbridge() set it; maze1xy()
// and fill_empty_maze() read it to find the parts of the maze the special
// level did NOT claim.  Modelled as a Set of "x,y" keys.
export function splev_map_reset() { game._splev_map = new Set(); }
export function splev_map_mark(x, y) {
    if (!game._splev_map) game._splev_map = new Set();
    game._splev_map.add(x + ',' + y);
}
export function splev_map_at(x, y) {
    return !!game._splev_map?.has(x + ',' + y);
}

export function lspo_map({ map, x = -1, y = -1, halign = 'none',
                           valign = 'none', lit = false, contents = null,
                           in_themerooms = true }) {
    if (in_themerooms && game.themeroom_failed) return null;

    const mf = mapfrag_fromstr(map);
    if (!mf || !mf.wid || !mf.hei) return null;

    const lr = HALIGN2I[halign] ?? -1;
    const tb = VALIGN2I[valign] ?? -1;
    const sel = selection_new();
    const ox = x;
    const oy = y;
    let tryct = 0;

    for (;;) {
        gx.xsize = mf.wid;
        gy.ysize = mf.hei;

        if (lr === -1 && tb === -1) {
            if (in_themerooms) {
                if (ox === -1) x = 1 + rn2(COLNO - 1 - mf.wid);
                if (oy === -1) y = rn2(ROWNO - mf.hei);
            }
            if (!isok(x, y)) {
                reset_xystart_size();
                return null;
            }
            gx.xstart = x;
            gy.ystart = y;
        } else {
            // C ref: sp_lev.c lspo_map() — "place map starting at
            // halign,valign".  x_maze_max/y_maze_max here are the decl.c
            // defaults ((COLNO-1)&~1 and (ROWNO-1)&~1); no RNG is involved.
            const xmm = (COLNO - 1) & ~1, ymm = (ROWNO - 1) & ~1;
            switch (lr) {
            case SPLEV_LEFT: gx.xstart = 1; break;
            case SPLEV_H_LEFT:
                gx.xstart = 2 + Math.trunc((xmm - 2 - gx.xsize) / 4); break;
            case SPLEV_CENTER:
                gx.xstart = 2 + Math.trunc((xmm - 2 - gx.xsize) / 2); break;
            case SPLEV_H_RIGHT:
                gx.xstart = 2 + Math.trunc((xmm - 2 - gx.xsize) * 3 / 4); break;
            case SPLEV_RIGHT: gx.xstart = xmm - gx.xsize - 1; break;
            default: break;
            }
            switch (tb) {
            case SPLEV_TOP: gy.ystart = 3; break;
            case SPLEV_CENTER:
                gy.ystart = 2 + Math.trunc((ymm - 2 - gy.ysize) / 2); break;
            case SPLEV_BOTTOM: gy.ystart = ymm - gy.ysize - 1; break;
            default: break;
            }
            if (!(gx.xstart % 2)) gx.xstart++;
            if (!(gy.ystart % 2)) gy.ystart++;
        }

        if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) {
            if (in_themerooms) {
                game.themeroom_failed = true;
                reset_xystart_size();
                return null;
            }
            // C: "try to move the start a bit"
            gy.ystart += (gy.ystart > 0) ? -2 : 2;
            if (gy.ysize === ROWNO) gy.ystart = 0;
            if (gy.ystart < 0 || gy.ystart + gy.ysize > ROWNO) gy.ystart = 0;
        }

        // C ref: "Themed rooms should never overwrite anything" — this
        // collision check runs only for themeroom maps.
        if (!in_themerooms) break;

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
            splev_map_mark(xx, yy);          // C: SpLev_Map[x][y] = 1
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

// map-relative (mx,my) -> absolute level coord using the map offset that
// bigrm_load_map computed into gx.xstart / gy.ystart.
export function q_absx(mx) { return mx + gx.xstart; }
export function q_absy(my) { return my + gy.ystart; }

// C ref: sp_lev.c splev_initlev() LVLINIT_SOLIDFILL with fg=" " and no explicit
// lit -> BOOL_RANDOM -> one rn2(2); then lvlfill_solid(STONE, lit).  Returns the
// lit bit so the map load can preserve it.
export function quest_level_init_solidfill() {
    const lit = rn2(2);                  // sp_lev.c:2992
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) { loc.typ = STONE; loc.lit = !!lit; loc.roomno = NO_ROOM; }
        }
    return lit;
}

// C ref: sp_lev.c:5051 lspo_replace_terrain() — des.replace_terrain{}.
// `spec` mirrors the Lua table: toterrain/fromterrain are already-resolved
// typs, mapfragment is the alternative matcher, and region/x1..y2/selection
// pick the squares.  Coordinates are map-relative (C runs the corners through
// get_location(ANY_LOC), which adds gx.xstart/gy.ystart outside a room).
//
// RNG: ONE rn2(100) per square that MATCHES (not per square scanned), drawn
// even at chance == 100.  Getting the match test or the scan order wrong
// therefore shifts every later draw on the level.
export function lspo_replace_terrain({
    totyp, fromtyp = INVALID_TYPE, mapfragment = null, chance = 100,
    tolit = SET_LIT_NOCHANGE, region = null,
    x1 = -1, y1 = -1, x2 = -1, y2 = -1, selection = null,
}) {
    if (totyp == null || totyp >= MAX_TYPE) return;        // sp_lev.c:5068
    const mf = (fromtyp === INVALID_TYPE && mapfragment != null)
        ? mapfrag_fromstr(mapfragment) : null;
    if (region && x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1)
        [x1, y1, x2, y2] = region;                         // get_table_region

    let sel = selection;
    if (!sel) {
        sel = selection_new_var();
        if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
            selection_clear_var(sel, 1);                   // sp_lev.c:5109
        } else {
            const a = vly_abs(x1, y1), b = vly_abs(x2, y2);
            for (let x = Math.max(a.x, 0); x <= Math.min(b.x, COLNO - 1); x++)
                for (let y = Math.max(a.y, 0); y <= Math.min(b.y, ROWNO - 1); y++)
                    selection_setpoint_var(x, y, sel, 1);
        }
    }

    const rect = selection_getbounds_var(sel);
    for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)  // sp_lev.c:5123
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (!selection_getpoint_var(x, y, sel)) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (mf) {
                if (mapfrag_match(mf, x, y) && rn2(100) < chance)
                    set_levltyp_lit(x, y, totyp, tolit);
            } else if (((fromtyp === MATCH_WALL && IS_STWALL(loc.typ))
                        || loc.typ === fromtyp)
                       && rn2(100) < chance) {             // sp_lev.c:5132
                set_levltyp_lit(x, y, totyp, tolit);
            }
        }
}

// The region form, as the quest levels spell it.  Thin wrapper so the loop
// above stays the single implementation.
export function quest_replace_terrain(x1, y1, x2, y2, fromtyp, totyp, chance) {
    lspo_replace_terrain({ totyp, fromtyp, chance, region: [x1, y1, x2, y2] });
}

// C ref: sp_lev.c lspo_region 2-arg form (selection, "lit"/"unlit").  No RNG,
// no room: clone the rect selection, grow it by one cell in all directions when
// lighting, and set each cell's lit flag.  Coords are map-relative.
export function quest_region_light(x1, y1, x2, y2, lit) {
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
export function quest_create_monster(name, mx, my, peacefulOverride) {
    const pmidx = name_to_pmidx(name);
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return null;
    // C ref: sp_lev.c:3156 find_montype() —
    //   mgend = name_to_monplus(s, 0, &mgend);      /* the matched name's slot */
    //   if (is_male || is_female)  mgend = fixed;
    //   else mgend = (mgend == FEMALE) ? FEMALE : (mgend == MALE) ? MALE : rn2(2);
    // so the rn2(2) is skipped BOTH for a fixed-gender species (gcode 1/2) AND
    // when the NAME itself is a NAMS() male/female form ("vampire lord" vs the
    // neutral "vampire leader").  lspo_monster's own
    // `tmpmons.female = ... : rn2(2)` never rolls either, because find_montype
    // has already reduced mgend to MALE or FEMALE.
    if (ptr.gcode !== 1 && ptr.gcode !== 2
        && name_gender_hint(name) === MGEND_NEUTRAL)
        rn2(2);
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
export function quest_create_object(otyp, mx, my, spe, carryingMon) {
    let x, y;
    if (mx != null) { x = q_absx(mx); y = q_absy(my); }
    else { const c = bigrm_get_location_dry(); x = c.x; y = c.y; }
    let otmp;
    if (carryingMon) {
        otmp = mksobj(otyp, true, true);           // not placed on floor
        if (spe != null) otmp.spe = spe;
        if (!carryingMon.minvent) carryingMon.minvent = [];
        carryingMon.minvent.unshift(otmp);
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
export async function quest_create_trap(ttyp, mx, my) {
    const x = q_absx(mx), y = q_absy(my);
    await maketrap(x, y, ttyp);
    rnd(4);                                          // mktrap victim check
}

// C ref: selvar.c selection_floodfill via l_selection_flood: floods from the
// start cell over all 4-connected cells whose typ matches the start cell's typ
// (set_floodfillchk_match_under).  No RNG.  Coords are map-relative.
export function quest_floodfill_match(mx, my) {
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
export function quest_rndcoord(sel) {
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

// A specific-coord ogre (create_monster with an explicit coord from rndcoord).
export function quest_create_monster_at(name, x, y, peaceful) {
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
export function quest_place_stair(mx, my, up) {
    const x = q_absx(mx), y = q_absy(my);
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = STAIRS;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: x, sy: y, up: !!up });
    if (up) { game.upstair = { x, y }; if (game.level) game.level.upstair = { x, y }; }
    else { game.dnstair = { x, y }; if (game.level) game.level.dnstair = { x, y }; }
}

// des.levregion({region={mx,my,mx,my}, type=...}) — store a 1-cell levregion
// (absolute coords) plus its LR_* rtype for placement at level finalize
// (mkmaze.c place_lregions()).  No RNG.  `lev` is the levregion's destination
// d_level, which only the LR_PORTAL rtype reads.
function quest_register_lregion(mx, my, rtype, lev) {
    game._quest_lregion = {
        x1: q_absx(mx), y1: q_absy(my), x2: q_absx(mx), y2: q_absy(my),
        rtype, lev: lev || null,
    };
}

// des.levregion({region={mx,my,mx,my}, type="branch"})
export function quest_register_branch(mx, my) {
    quest_register_lregion(mx, my, LR_BRANCH, null);
}

// des.door(state, mx, my) — set the door mask on an existing DOOR/SDOOR cell.
// rm.h: D_ISOPEN is 0x02 (0x20 was wrong — nothing is defined there).
const _QDOORMASK = {
    nodoor: 0x00 /*D_NODOOR*/, broken: 0x01 /*D_BROKEN*/,
    open: 0x02 /*D_ISOPEN*/, closed: 0x04 /*D_CLOSED*/,
    locked: 0x08 /*D_LOCKED*/, secret: D_SECRET,
};

// C ref: sp_lev.c set_door_orientation() — used by sel_set_door() below to
// pick the SDOOR/DOOR glyph orientation (horizontal wall-run vs vertical).
export function set_door_orientation(x, y) {
    const isJoin = (t) => IS_WALL(t) || IS_DOOR(t) || t === SDOOR;
    const at = (dx, dy) => { const l = game.level?.at(x + dx, y + dy); return l ? l.typ : STONE; };
    let wleft = isok(x - 1, y) && isJoin(at(-1, 0));
    let wright = isok(x + 1, y) && isJoin(at(1, 0));
    let wup = isok(x, y - 1) && isJoin(at(0, -1));
    let wdown = isok(x, y + 1) && isJoin(at(0, 1));
    if (!wleft && !wright && !wup && !wdown) {
        const isDoorjoin = (t) => IS_OBSTRUCTED(t) || t === IRONBARS;
        wleft = !isok(x - 1, y) || isDoorjoin(at(-1, 0));
        wright = !isok(x + 1, y) || isDoorjoin(at(1, 0));
        wup = !isok(x, y - 1) || isDoorjoin(at(0, -1));
        wdown = !isok(x, y + 1) || isDoorjoin(at(0, 1));
    }
    const loc = game.level?.at(x, y);
    if (loc) loc.horizontal = ((wleft || wright) && !(wup && wdown));
}

// C ref: sp_lev.c sel_set_door().  A cell that is ALREADY a door or secret
// door keeps its current typ (an existing SDOOR stays hidden — it renders as
// a plain wall until the player finds it later); only a fresh (non-door,
// non-SDOOR) cell gets promoted, to SDOOR when the requested state is
// "secret" or DOOR otherwise.  The doormask is always (re)written.
export function quest_set_door(mx, my, state) {
    const x = q_absx(mx), y = q_absy(my);
    const loc = game.level?.at(x, y);
    if (!loc) return;
    let typ = _QDOORMASK[state] ?? D_CLOSED;
    if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) {
        loc.typ = (typ & D_SECRET) ? SDOOR : DOOR;
    }
    if (typ & D_SECRET) {
        typ &= ~D_SECRET;
        if (typ < D_CLOSED) typ = D_CLOSED;
    }
    set_door_orientation(x, y);
    loc.doormask = typ;
}

// flip the stored levregion alongside the map (flip_level flips lregions in
// C).  Mirrors flip_level's FlipX/FlipY within the level extents.
export function quest_flip_branch(flp) {
    const br = game._quest_lregion;
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

// C ref: sp_lev.c create_monster — named species (id known via find_montype),
// NO explicit coord.  Order: find_montype gender roll (species-dependent) +
// induced_align (sp_amask_to_amask); then get_location_coord(DRY) — these
// land-dwelling species take the "first try" DRY branch, one rn2(xsize)/
// rn2(ysize) draw; then the MON_AT/enexto relocate-if-occupied check; then
// makemon().
export function quest_create_monster_randpos(name, peacefulOverride) {
    const pmidx = name_to_pmidx(name);
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return null;
    if (ptr.gcode !== 1 && ptr.gcode !== 2) rn2(2);    // find_montype gender
    rn2(3);                                             // induced_align (dungeon.c:2012)
    const c = bigrm_get_location_dry();
    let x = c.x, y = c.y;
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    const mtmp = makemon(ptr, x, y, 0);
    if (mtmp && peacefulOverride != null) mtmp.mpeaceful = !!peacefulOverride;
    return mtmp;
}

// C ref: trap.h trap-type constants (only the ones traptype_rnd() switches on).
const ARC_NO_TRAP = 0, ARC_ROCKTRAP = 3, ARC_HOLE = 13, ARC_TRAPDOOR = 14;
// C ref: monsym.h — def_char_to_monclass('S') = S_SNAKE, ('M') = S_MUMMY.
export const ARC_S_SNAKE = 45, ARC_S_MUMMY = 39, ARC_G_NOGEN = 0x0200;

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
export async function quest_create_trap_random() {
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
export function quest_create_monster_class(classNum, mx, my) {
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
export function quest_drop_default_invent(mtmp) {
    if (!mtmp || !Array.isArray(mtmp.minvent)) return;
    for (let i = 0; i < mtmp.minvent.length; i++) {
        rn2(100);                                      // obj_resists(obj, 0, 0)
    }
    // discard_minvent(mtmp, TRUE): non-artifact items dealloc with no RNG.
    mtmp.minvent = [];
}

// C ref: sp_lev.c lspo_map halign=SPLEV_H_LEFT / valign=SPLEV_CENTER offset.
// gx.xstart = 2 + ((x_maze_max-2-xsize)/4); gy.ystart = 2 + ((y_maze_max-2-ysize)/2);
// each bumped odd.  Then stamp the fixed terrain (no RNG).
// `lit` is des.map's OWN "lit" option (sp_lev.c:6122 get_table_boolean_opt
// "lit", default FALSE) — NOT the level_init lit.  Passing the level_init
// rn2(2) here renders the whole of tower2 lit (its roll is 1, tower1/3 roll 0).
export function tower1_load_map(mapstr, lit) {
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
            // C ref: sp_lev.c lspo_map() draws every cell through
            // sel_set_ter() -> set_levltyp_lit(), and BOTH set_levltyp()
            // and set_levltyp_lit() force `lit = 1` for lava whatever the
            // map asked for.  Writing the map's own `lit` here left every
            // lava pool dark, so the hero saw none of the Plane of Fire on
            // arrival (seed0373 step 100).
            loc.lit = IS_LAVA(mptyp) ? true : !!lit;
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

// des.ladder("up"/"down", mx, my) — no RNG.  C ref: sp_lev.c lspo_ladder ->
// levl[x][y].typ = LADDER; levl[x][y].ladder = up ? LA_UP : LA_DOWN;
// stairway_add(x, y, up, TRUE, ...).
export function tower_place_ladder(mx, my, up = false) {
    const x = q_absx(mx), y = q_absy(my);
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = LADDER;
    if (!game.stairs) game.stairs = [];
    game.stairs.push({ sx: x, sy: y, up: !!up, isladder: true });
    if (up) {
        game.upstair = { x, y };
        if (game.level) { game.level.upstair = { x, y }; if (loc) loc.ladder = LA_UP; }
    } else {
        game.dnstair = { x, y };
        if (game.level) { game.level.dnstair = { x, y }; if (loc) loc.ladder = LA_DOWN; }
    }
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
export function tower_wallification(x1, y1, x2, y2) {
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

// obj.h otyps used by tower2/tower3 (verified against js/mkobj.js objects[]).
export const AMULET_OF_LIFE_SAVING = 202, AMULET_OF_STRANGULATION = 203,
    WATER_WALKING_BOOTS = 167, CRYSTAL_PLATE_MAIL = 122,
    LONG_SWORD = 54, LOCK_PICK = 222, ELVEN_CLOAK = 139, BLINDFOLD = 233,
    SPE_CONE_OF_COLD = 369, SPE_CLAIRVOYANCE = 385, SPE_CHARM_MONSTER = 387,
    SPE_INVISIBILITY = 393, SPE_POLYMORPH = 399, SPE_CREATE_FAMILIAR = 401,
    SPE_STONE_TO_FLESH = 405;

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

// ── generic get_location() humidity machinery (sp_lev.c) ────────────────
// C ref: sp_lev.h — the getloc_flags_t bits get_location()/is_ok_location()
// filter candidate squares with.
export const LOC_DRY = 0x01, LOC_WET = 0x02, LOC_HOT = 0x04, LOC_SOLID = 0x08,
             LOC_ANY = 0x10, LOC_SPACE = 0x40;

// C ref: sp_lev.c is_ok_location(x, y, humidity).  No RNG.  The
// is_ok_location_func hook is only installed by the themed-room and Sokoban
// coders (which use their own local checks in this port), and Is_waterlevel's
// "accept anything" shortcut belongs to the endgame.
export function is_ok_location(x, y, humidity) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    if (typ == null) return false;
    if (humidity & LOC_ANY) return true;
    if ((humidity & LOC_SOLID) && IS_OBSTRUCTED(typ)) return true;
    if ((humidity & (LOC_DRY | LOC_SPACE)) && SPACE_POS(typ)) {
        // C: a boulder disqualifies the square unless SOLID is also asked for.
        const bould = !!(game.level?.objects || []).find(
            (o) => o && o.otyp === BOULDER && o.ox === x && o.oy === y);
        if (!bould || (humidity & LOC_SOLID)) return true;
    }
    if ((humidity & LOC_WET) && splev_is_pool(x, y)) return true;
    if ((humidity & LOC_HOT) && IS_LAVA(typ)) return true;
    return false;
}

function splev_is_pool(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ === POOL || typ === MOAT || typ === WATER;
}

// C ref: monsym.h S_* class indices used by mondata.h's mlet-based predicates.
const S_EYE = 5, S_LIGHT = 25, S_EEL = 57, S_GHOST = 54;

// C ref: mondata.h is_floater / noncorporeal / likes_fire (via likes_lava).
const is_floater = (p) => p.mcls === S_EYE || p.mcls === S_LIGHT;
const noncorporeal = (p) => p.mcls === S_GHOST;
const likes_fire = (p) => ['fire vortex', 'flaming sphere', 'fire elemental',
                           'salamander'].includes(p.name);

// C ref: sp_lev.c pm_to_humidity(pm) — where a species may be placed.  No RNG.
export function pm_to_humidity(pm) {
    let loc = LOC_DRY;
    if (!pm) return loc;
    if (pm.mcls === S_EEL || (mflags1_of(pm) & M1_AMPHIBIOUS)
        || is_swimmer_flag(pm))
        loc = LOC_WET;
    if (is_flyer_flag(pm) || is_floater(pm)) loc |= (LOC_HOT | LOC_WET);
    if (passes_walls_flag(pm) || noncorporeal(pm)) loc |= LOC_SOLID;
    if (likes_fire(pm)) loc |= LOC_HOT;
    return loc;
}

// C ref: sp_lev.c get_location():1227-1231 — the croom != NULL random branch.
// The candidate square comes from somexy(croom) (which re-rolls somex/somey
// itself inside an irregular room), NOT the xstart/xsize form; every
// themeroom_fill runs with gc.coder->croom set, so this is the one des.monster
// and des.object use there.
export function splev_get_location_room(croom, humidity, nowarn = false) {
    if (!croom) return splev_get_location_rnd(humidity, nowarn);
    const c = { x: -1, y: -1 };
    let cpt = 0;
    do {
        somexy(croom, c); // C discards the return: a failed somexy still leaves c set
        if (is_ok_location(c.x, c.y, humidity)) return { x: c.x, y: c.y };
    } while (++cpt < 100);
    // C's "last try" scans the croom footprint (mx+xx, my+yy for xx < sx).
    for (let x = croom.lx; x <= croom.hx; x++)
        for (let y = croom.ly; y <= croom.hy; y++)
            if (is_ok_location(x, y, humidity)) return { x, y };
    if (nowarn) return { x: -1, y: -1 };
    return { x: gx.x_maze_max, y: gy.y_maze_max };
}

// C ref: sp_lev.c get_location() random-location branch with croom == NULL:
// loop `x = xstart + rn2(xsize); y = ystart + rn2(ysize)` until
// is_ok_location(humidity) passes, up to 100 tries, then fall back to a
// deterministic scan of the map footprint.  With NO_LOC_WARN in `humidity` C
// returns (-1,-1) instead of the fallback, which is how create_monster asks
// "is there a wet/solid spot?" before retrying with DRY added.
export function splev_get_location_rnd(humidity, nowarn = false) {
    // C ref: sp_lev.c get_location_coord():1348-1352 — a RANDOM coord reaches
    // get_location() TWICE: first with NO_LOC_WARN forced on, then (only when
    // that came back (-1,-1)) again with the caller's own flags.  Each call is
    // its own 100-draw loop, so collapsing them to one let a water-only species
    // fall through to its DRY retry 200 draws early (seed0373 step 99, pit viper
    // on the Plane of Fire).
    const r = get_location_rnd_once(humidity, true);
    if (r.x !== -1 || r.y !== -1) return r;
    return get_location_rnd_once(humidity, nowarn);
}

function get_location_rnd_once(humidity, nowarn) {
    let x = -1, y = -1, cpt = 0;
    do {
        x = gx.xstart + rn2(gx.xsize);   // sp_lev.c:1233
        y = gy.ystart + rn2(gy.ysize);   // sp_lev.c:1234
        if (is_ok_location(x, y, humidity)) return { x, y };
    } while (++cpt < 100);
    // C ref: sp_lev.c:1242 — the deterministic "last try" scan runs BEFORE the
    // NO_LOC_WARN (-1,-1) bail, not after it.
    for (let xx = 0; xx < gx.xsize; xx++)
        for (let yy = 0; yy < gy.ysize; yy++) {
            x = gx.xstart + xx; y = gy.ystart + yy;
            if (is_ok_location(x, y, humidity)) return { x, y };
        }
    if (nowarn) return { x: -1, y: -1 };
    return { x: gx.x_maze_max, y: gy.y_maze_max };
}

// C ref: rm.h ACCESSIBLE / SPACE_POS / is_pool / is_lava as used by
// is_ok_location(x,y,humidity).  We only need the DRY case for bigrm
// (objects/monsters/traps/stairs all use DRY).  DRY accepts SPACE_POS
// terrain (typ > DOOR) with no boulder; pools/water/lava/stone fail.
function bigrm_is_ok_location_dry(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    if (typ == null) return false;
    if (!SPACE_POS(typ)) return false;
    // C ref: sp_lev.c:1298 — DRY (without SOLID) rejects a square that already
    // has a BOULDER on it.  Inert in the empty big room, decisive in Sokoban:
    // without it every des.object({class=...}) accepts a boulder square C would
    // have re-rolled (seed0360 step 249, soko4-1).
    for (const o of (game.level?.objects || []))
        if (o && o.otyp === BOULDER && o.ox === x && o.oy === y) return false;
    return true;
}

// C ref: sp_lev.c get_location() random-location branch (sp_lev.c:1226-1238)
// for croom == NULL: loop rn2(xsize)+xstart / rn2(ysize)+ystart until
// is_ok_location passes (up to 100 tries).  Returns {x,y}.
export function bigrm_get_location_dry() {
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
export function bigrm_load_map(mapstr, lit) {
    const mf = mapfrag_fromstr(mapstr);
    gx.xsize = mf.wid;
    gy.ysize = mf.hei;
    // SPLEV_CENTER.  C ref: decl.c g_init_x — x_maze_max defaults to
    // (COLNO-1)&~1 == 78, not COLNO-1; the odd value shifts xstart by 2 after
    // the `if (!(xstart % 2)) xstart++` parity fixup (seed0373 step 88: soko3-1
    // landed two columns right of C's).  lspo_map already uses the masked pair.
    const xmm = (COLNO - 1) & ~1, ymm = (ROWNO - 1) & ~1;
    gx.xstart = 2 + Math.trunc((xmm - 2 - gx.xsize) / 2);
    gy.ystart = 2 + Math.trunc((ymm - 2 - gy.ysize) / 2);
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
            // C ref: sp_lev.c lspo_map() draws every cell through
            // sel_set_ter() -> set_levltyp_lit(), and BOTH set_levltyp()
            // and set_levltyp_lit() force `lit = 1` for lava whatever the
            // map asked for.  Writing the map's own `lit` here left every
            // lava pool dark, so the hero saw none of the Plane of Fire on
            // arrival (seed0373 step 100).
            loc.lit = IS_LAVA(mptyp) ? true : !!lit;
            // C ref: sp_lev.c:4608-4630 sel_set_ter() — every des.map cell goes
            // through it, and its tail is what gives map-drawn walls and doors
            // their .horizontal flag.  back_to_glyph() renders an SDOOR as
            // S_hwall/S_vwall straight off that bit, so skipping this draws a
            // horizontal secret door as a vertical one.
            if (loc.typ === SDOOR || IS_DOOR(loc.typ)) {
                if (loc.typ === SDOOR) loc.doormask = D_CLOSED;
                const left = x ? game.level?.at(x - 1, y) : null;
                if (left && (IS_WALL(left.typ) || left.horizontal))
                    loc.horizontal = true;
            } else if (loc.typ === HWALL || loc.typ === IRONBARS) {
                loc.horizontal = true;
            }
        }
    return mf;
}

// C ref: sp_lev.c splev_initlev() LVLINIT_SOLIDFILL with BOOL_RANDOM lit ->
// rn2(2); then lvlfill_solid(filling, lit).  bigrm uses style="solidfill",
// fg=" " (STONE) with no explicit lit -> BOOL_RANDOM -> one rn2(2).
export function bigrm_level_init_solidfill() {
    const lit = rn2(2);                  // sp_lev.c:2992
    const fill = STONE;                  // fg = " "
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) { loc.typ = fill; loc.lit = !!lit; loc.roomno = NO_ROOM; }
        }
}

// C ref: mklev.c wallification() — wall_cleanup + fix_wall_spines, run at level
// finalize (sp_lev.c:6038).  Sets corner/T/cross wall types from neighbours.
const _SPINE = [VWALL, HWALL, HWALL, HWALL, VWALL, TRCORNER, TLCORNER, TDWALL,
                VWALL, BRCORNER, BLCORNER, TUWALL, VWALL, TLWALL, TRWALL, CROSSWALL];
export function bigrm_wallification(x1, y1, x2, y2) {
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
    fix_wall_spines(x1, y1, x2, y2);
}

// C ref: mklev.c fix_wall_spines() — set each wall's corner/T/cross variant
// from its four cardinal neighbours.  Split out because flip_level() calls it
// on its own (sp_lev.c:915) WITHOUT wall_cleanup: mirroring the grid moves the
// glyphs but leaves every corner facing the old way.  No RNG.
function fix_wall_spines(x1, y1, x2, y2) {
    const map = game.level;
    // C ref: mkmaze.c:45 iswall() — doors, iron bars, lava wall and water all
    // join a wall spine, not just IS_WALL.
    const iswall = (xx, yy) => {
        if (!isok(xx, yy)) return 0;
        const l = map.at(xx, yy);
        const t = l ? l.typ : STONE;
        return (IS_WALL(t) || IS_DOOR(t) || t === LAVAWALL || t === WATER
                || t === SDOOR || t === IRONBARS) ? 1 : 0;
    };
    // C ref: mkmaze.c:59 iswall_or_stone() — out of bounds counts as stone.
    const iswall_or_stone = (xx, yy) => {
        if (!isok(xx, yy)) return 1;
        const l = map.at(xx, yy);
        return ((l ? l.typ : STONE) === STONE || iswall(xx, yy)) ? 1 : 0;
    };
    // C ref: mkmaze.c:166 extend_spine() — a spine is SUPPRESSED when the wall
    // in that direction is boxed in on both sides by wall/stone, which is what
    // keeps a straight run of wall drawn as '-' instead of a row of tees.
    const extend_spine = (locale, wall_there, dx, dy) => {
        if (!wall_there) return 0;
        const nx = 1 + dx, ny = 1 + dy;
        if (dx) {
            return (locale[1][0] && locale[1][2]
                    && locale[nx][0] && locale[nx][2]) ? 0 : 1;
        }
        return (locale[0][1] && locale[2][1]
                && locale[0][ny] && locale[2][ny]) ? 0 : 1;
    };
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_WALL(loc.typ) && loc.typ !== DBWALL)) continue;
            const locale = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (let ddx = -1; ddx <= 1; ddx++)
                for (let ddy = -1; ddy <= 1; ddy++) {
                    if (!ddx && !ddy) continue;
                    locale[1 + ddx][1 + ddy] = iswall_or_stone(x + ddx, y + ddy);
                }
            const bits = (extend_spine(locale, iswall(x, y - 1), 0, -1) << 3)
                       | (extend_spine(locale, iswall(x, y + 1), 0, 1) << 2)
                       | (extend_spine(locale, iswall(x + 1, y), 1, 0) << 1)
                       | extend_spine(locale, iswall(x - 1, y), -1, 0);
            if (bits) loc.typ = _SPINE[bits];
        }
}

// C ref: mkmaze.c get_level_extends() — bounding box of the non-STONE area,
// padded by 1 (maze edge) or 2 (open level) on each side.  Mirrors mklev.js's
// copy so the flip transform uses the identical extents the C engine does.
export function bigrm_get_level_extends() {
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
export function flip_level(flp) {
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
        // C ref: sp_lev.c:645-661 — the extended-monster coords flip AFTER the
        // in-area `continue` and after the monster's own mx/my, and each goes
        // through Flip_coord(), which is `if ((cc).x && inFlipArea(cc))`
        // (sp_lev.c:520-528): a stored coord of 0, or one off the flip area, is
        // left alone.  Without this a flipped Mine Town leaves every shopkeeper
        // walking toward the pre-flip door and pri_move() at the wrong altar.
        const flipCoord = (cc) => { if (cc && cc.x && inArea(cc.x, cc.y)) flipPt(cc, 'x', 'y'); };
        if (m.ispriest) flipCoord(m.epri?.shrpos);
        else if (m.isshk && m.eshk) { flipCoord(m.eshk.shk); flipCoord(m.eshk.shd); }
    }
    // engravings — C ref: sp_lev.c:689-694, flipped unconditionally.
    for (const e of (map.engravings || [])) {
        if (flp & 1) e.engr_y = FlipY(e.engr_y);
        if (flp & 2) e.engr_x = FlipX(e.engr_x);
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

    // C ref: sp_lev.c:915 — flip_level() ends with fix_wall_spines() over the
    // whole grid.  Mirroring moves the cells but leaves every corner/T glyph
    // pointing the pre-flip way (seed0360 step 211: 43 differing cells, all of
    // them wall corners).  RNG-free.
    fix_wall_spines(1, 0, COLNO - 1, ROWNO - 1);
}

// C ref: sp_lev.c:4323 trap_types[] — des.trap() name -> ttyp.  This used to
// list only the two kinds soko2/soko3 ask for, so soko4's ten `pit` traps became
// maketrap(x, y, undefined): no RNG either way (which is why the stream stayed
// aligned) but ttyp undefined, rendering '^' in cyan instead of PIT's black.
const SOKO_TRAP_NAME = {
    arrow: ARROW_TRAP, dart: DART_TRAP, 'falling rock': ROCKTRAP,
    board: SQKY_BOARD, bear: BEAR_TRAP, 'land mine': LANDMINE,
    'rolling boulder': ROLLING_BOULDER_TRAP, 'sleep gas': SLP_GAS_TRAP,
    rust: RUST_TRAP, fire: FIRE_TRAP, pit: PIT, 'spiked pit': SPIKED_PIT,
    hole: HOLE, 'trap door': TRAPDOOR, teleport: TELEP_TRAP,
    'level teleport': LEVEL_TELEP, 'magic portal': MAGIC_PORTAL, web: WEB,
    statue: STATUE_TRAP, magic: MAGIC_TRAP, 'anti magic': ANTI_MAGIC,
    polymorph: POLY_TRAP, 'vibrating square': VIBRATING_SQUARE, random: -1,
};

// C ref: mklev.c mktrap(num, ..., tm) with an explicit type+coord (skips the
// type/location RNG that the no-args des.trap() form draws) — maketrap()
// (which for HOLE/TRAPDOOR draws hole_destination()'s rn2(4) internally),
// then the victim-gate rnd(4) (mklev.c:2135-2144), ALWAYS drawn when
// kind!=NO_TRAP.  At this level's difficulty (13 — Sokoban's builds-up
// adjustment on top of depth 5, see level_difficulty_ext()) `lvl <= rnd(4)`
// can never pass (rnd(4)'s max is 4), so mktrap_victim() is never reachable
// here and is intentionally not ported — porting it on a guess with no
// recorded stream that exercises it would risk an unverified RNG count.
export async function soko_mktrap(mx, my, name) {
    const x = q_absx(mx), y = q_absy(my);
    const trap = await maketrap(x, y, SOKO_TRAP_NAME[name]);
    const kind = trap ? trap.ttyp : NO_TRAP;
    const lvl = level_difficulty_ext();
    if (kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
             && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        // unreachable at this level's difficulty — see comment above.
    }
    return trap;
}

// C ref: sp_lev.c create_object — bare class char, no coord -> get_location
// (DRY, random) then mkobj_at(oclass, x, y, !named).
export function soko_create_object_class_random(oclass) {
    const c = bigrm_get_location_dry();
    return mkobj_at(oclass, c.x, c.y, true);
}

// C ref: sp_lev.c lspo_region — the region(selection,"lit") 2-arg form: grow
// the selection by 1 (W_ANY) then set .lit on every included cell.  No RNG,
// no room created.  Local (map-relative) rectangle.
export function soko_region_lit_grow(x1, y1, x2, y2) {
    const dx1 = Math.max(x1 + gx.xstart - 1, 1);
    const dy1 = Math.max(y1 + gy.ystart - 1, 0);
    const dx2 = Math.min(x2 + gx.xstart + 1, COLNO - 1);
    const dy2 = Math.min(y2 + gy.ystart + 1, ROWNO - 1);
    for (let x = dx1; x <= dx2; x++)
        for (let y = dy1; y <= dy2; y++) {
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = true;
        }
}

// C ref: sp_lev.c set_wall_property(W_NONDIGGABLE|W_NONPASSWALL) applied over
// this file's own des.non_diggable/non_passwall(area(0,0,25,16)) call (which
// covers every wall inside the map's own footprint, interior and boundary)
// UNIONED with solidify_map()'s pass over the rest of the level (any
// IS_STWALL cell outside the map's own footprint — everywhere else is
// still bare STONE from level_init, so solidify_map's own "!SpLev_Map[x][y]"
// gate is equivalent here to "outside our map").  Both operations are RNG
// free, so folding them into one full-grid pass produces the same final
// state as running them separately.
export function soko_solidify_and_nondig() {
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }
}

// C ref: mkroom.h TEMPLE room type (const.js exports MORGUE already).
export const TEMPLE_RTYPE = 10;

// C ref: sp_lev.c get_location() with croom == NULL for an EXPLICIT coordinate:
// the map-relative x/y simply gain the last des.map() origin.  No RNG.
export function vly_abs(mx, my) { return { x: mx + gx.xstart, y: my + gy.ystart }; }

// C ref: nhlsel.c l_selection_line -> selection_do_line(): both endpoints go
// through get_location_coord() first, then Bresenham between them.  valley.lua
// only ever draws axis-aligned lines.  No RNG.
export function vly_terrain_line(x1, y1, x2, y2, typ) {
    const a = vly_abs(x1, y1), b = vly_abs(x2, y2);
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let i = 0; i <= n; i++)
        set_levltyp_lit(a.x + dx * i, a.y + dy * i, typ, SET_LIT_NOCHANGE);
}

// C ref: sp_lev.c lspo_terrain() table form des.terrain({x=,y=,typ=}).  No RNG.
export function vly_terrain_at(mx, my, typ) {
    const c = vly_abs(mx, my);
    set_levltyp_lit(c.x, c.y, typ, SET_LIT_NOCHANGE);
}

// C ref: mklev.c add_door(x, y, aroom).  Kept local to sp_lev.js (rather than
// imported from mklev.js) because mklev.js already imports this module and a
// second edge would close an import cycle.  No RNG.
function splev_add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors) g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    for (const broom of g.level.rooms || []) {
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0)) continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor) broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}

// C ref: sp_lev.c maybe_add_door() / add_doors_to_room() — after a region has
// become a room, every DOOR/SDOOR square already on the map that belongs to it
// joins its door list.  No RNG.
function splev_add_doors_to_room(croom) {
    const rmno = croom.roomnoidx + ROOMOFFSET;
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = game.level?.at(x, y);
            if (!loc || !(IS_DOOR(loc.typ) || loc.typ === SDOOR)) continue;
            const mine = croom.irregular
                ? (loc.roomno === rmno)
                : (x >= croom.lx - 1 && x <= croom.hx + 1
                   && y >= croom.ly - 1 && y <= croom.hy + 1);
            if (mine || loc.roomno === rmno) splev_add_door(x, y, croom);
        }
}

// C ref: mklev.c bydoor(x, y) — is any orthogonal neighbour already a door?
// No RNG.
export function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

// C ref: mklev.c:1779-1790 okdoor(x, y).  Load-bearing for RNG: create_door's
// retry loop breaks on it, so a missing clause costs (or invents) whole
// rn2(4)+rn2(span) iterations.  No RNG.
export function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL)) return false;
    if (bydoor(x, y)) return false;
    return (
        (isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ))
    );
}

// C ref: sp_lev.c:1713-1806 create_door(room_door *dd, struct mkroom *broom).
// dd: { secret: -1|0|1, mask: -1|doormask, pos: -1|offset, wall: bitmask }.
// The three prologue mutations of *dd (secret, wall, mask) survive the call in
// C, so they are written back here too.
//
// Draw order per retry iteration is rn2(4) [wall side] and then, only when that
// side is in `wall` and pos == -1, rn2(span) [offset along it]; both the
// obstruction test and okdoor() run AFTER the offset draw, so a rejected
// placement still costs two draws.
export function create_door(dd, broom) {
    if (dd.secret === -1) dd.secret = rn2(2);            // sp_lev.c:1720
    if (dd.wall === W_RANDOM) dd.wall = W_ANY;           // sp_lev.c:1723
    if (dd.mask === -1) {
        if (!dd.secret) {
            if (!rn2(3)) {                               // sp_lev.c:1728
                if (!rn2(5)) dd.mask = D_ISOPEN;         // sp_lev.c:1729
                else if (!rn2(6)) dd.mask = D_LOCKED;    // sp_lev.c:1731
                else dd.mask = D_CLOSED;
                if (dd.mask !== D_ISOPEN && !rn2(25))    // sp_lev.c:1735
                    dd.mask |= D_TRAPPED;
            } else {
                dd.mask = D_NODOOR;
            }
        } else {
            if (!rn2(5)) dd.mask = D_LOCKED;             // sp_lev.c:1740
            else dd.mask = D_CLOSED;
            if (!rn2(20)) dd.mask |= D_TRAPPED;          // sp_lev.c:1745
        }
    }
    let x = 0, y = 0, trycnt;
    for (trycnt = 0; trycnt < 100; trycnt++) {
        const dwall = dd.wall, dpos = dd.pos;
        switch (rn2(4)) {                                // sp_lev.c:1754
        case 0: // W_NORTH
            if (!(dwall & 1)) continue;
            y = broom.ly - 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(game.level.at(x, y - 1)?.typ)) continue;
            break;
        case 1: // W_SOUTH
            if (!(dwall & 2)) continue;
            y = broom.hy + 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(game.level.at(x, y + 1)?.typ)) continue;
            break;
        case 2: // W_WEST
            if (!(dwall & 8)) continue;
            x = broom.lx - 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(game.level.at(x - 1, y)?.typ)) continue;
            break;
        case 3: // W_EAST
            if (!(dwall & 4)) continue;
            x = broom.hx + 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(game.level.at(x + 1, y)?.typ)) continue;
            break;
        }
        if (okdoor(x, y)) break;
    }
    if (trycnt >= 100) return;  // C: impossible(), *dd mutations already made
    const loc = game.level.at(x, y);
    if (!loc) return;
    // C: set_levltyp(x, y, dd->secret ? SDOOR : DOOR) — assigns typ only.  It
    // deliberately does NOT touch .horizontal: the door inherits the
    // orientation flag the underlying HWALL/VWALL already carried.
    loc.typ = dd.secret ? SDOOR : DOOR;
    loc.doormask = dd.mask;
    // C's create_door does NOT call add_door(); the square is picked up by
    // add_doors_to_room() when the enclosing region/room closes.  Our
    // themeroom caller relied on the eager registration, so keep it: the
    // duplicate check in splev_add_door makes a later add_doors_to_room a
    // no-op.  No RNG either way.
    splev_add_door(x, y, broom);
}

// C ref: sp_lev.c rnddoor() — state[rn2(5)].  Reachable from lspo_door's
// `typ = (msk == -1) ? rnddoor() : msk;`.
export function splev_rnddoor_roll() {
    const state = [D_NODOOR, 0x01 /*D_BROKEN*/, D_ISOPEN, D_CLOSED, D_LOCKED];
    return state[rn2(state.length)];
}

// C ref: sp_lev.c lspo_door() doorstates[]/doorstates2i[] and
// walldirs[]/walldirs2i[].  Note "all" and "random" both map to W_ANY, so the
// W_RANDOM normalisation inside create_door is never reached from des.door.
export const DOORSTATES = {
    random: -1, open: D_ISOPEN, closed: D_CLOSED, locked: D_LOCKED,
    nodoor: D_NODOOR, broken: 0x01 /*D_BROKEN*/, secret: D_SECRET,
};
export const WALLDIRS = {
    all: W_ANY, random: W_ANY, north: 1, west: 8, east: 4, south: 2,
};

// C ref: sp_lev.c lspo_door() x == -1 && y == -1 arm — a wall-relative door in
// the current room.  `typ` is discarded except for its D_SECRET test, but the
// rnddoor() rn2(5) it costs is real.
export function lspo_door_relative(spec, broom) {
    const msk = DOORSTATES[spec.state != null ? spec.state : 'random'];
    const typ = (msk === -1) ? splev_rnddoor_roll() : msk;
    if (!broom) return;
    create_door({
        secret: (typ === D_SECRET) ? 1 : 0,
        mask: msk,
        pos: spec.pos != null ? spec.pos : -1,
        wall: WALLDIRS[spec.wall != null ? spec.wall : 'all'],
    }, broom);
}

// C ref: mkmap.c flood_fill_rm(sx, sy, rmno, lit, anyroom=TRUE) — the
// scanline flood behind an irregular des.region.  Faithful to the C recursion
// (including its diagonal spill-over through the `else` arms), because the
// exact set of flooded squares decides how many squares fill_zoo() stocks and
// therefore thousands of downstream draws.  No RNG.
const FFR_WIDTH = COLNO - 2;
function flood_fill_rm(sx, sy, rmno, lit, anyroom, ext) {
    const at = (x, y) => game.level?.at(x, y);
    const typAt = (x, y) => at(x, y)?.typ;
    const roomnoAt = (x, y) => (at(x, y)?.roomno ?? NO_ROOM);
    const fg_typ = typAt(sx, sy);

    while (sx > 0 && (anyroom ? IS_ROOM(typAt(sx, sy)) : typAt(sx, sy) === fg_typ)
           && roomnoAt(sx, sy) !== rmno)
        sx--;
    sx++;

    if (sx < ext.min_rx) ext.min_rx = sx;
    if (sy < ext.min_ry) ext.min_ry = sy;

    let i;
    for (i = sx; i <= FFR_WIDTH && typAt(i, sy) === fg_typ; i++) {
        const loc = at(i, sy);
        loc.roomno = rmno;
        loc.lit = !!lit;
        if (anyroom) {
            /* add walls to room as well */
            for (let ii = (i === sx ? i - 1 : i); ii <= i + 1; ii++)
                for (let jj = sy - 1; jj <= sy + 1; jj++) {
                    if (!isok(ii, jj)) continue;
                    const wl = at(ii, jj);
                    if (!wl) continue;
                    if (!(IS_WALL(wl.typ) || IS_DOOR(wl.typ) || wl.typ === SDOOR))
                        continue;
                    wl.edge = 1;
                    if (lit) wl.lit = true;
                    if ((wl.roomno ?? NO_ROOM) === NO_ROOM) wl.roomno = rmno;
                    else if (wl.roomno !== rmno) wl.roomno = SHARED;
                }
        }
        ext.n_loc_filled++;
    }
    const nx = i;

    for (const dy of [-1, 1]) {
        if (!isok(sx, sy + dy)) continue;
        for (i = sx; i < nx; i++) {
            if (typAt(i, sy + dy) === fg_typ) {
                if (roomnoAt(i, sy + dy) !== rmno)
                    flood_fill_rm(i, sy + dy, rmno, lit, anyroom, ext);
            } else {
                if ((i > sx || isok(i - 1, sy + dy))
                    && typAt(i - 1, sy + dy) === fg_typ
                    && roomnoAt(i - 1, sy + dy) !== rmno)
                    flood_fill_rm(i - 1, sy + dy, rmno, lit, anyroom, ext);
                if ((i < nx - 1 || isok(i + 1, sy + dy))
                    && typAt(i + 1, sy + dy) === fg_typ
                    && roomnoAt(i + 1, sy + dy) !== rmno)
                    flood_fill_rm(i + 1, sy + dy, rmno, lit, anyroom, ext);
            }
        }
    }

    if (nx > ext.max_rx) ext.max_rx = nx - 1;
    if (sy > ext.max_ry) ext.max_ry = sy;
}

// C ref: sp_lev.c lspo_region() for a SPECIAL (non-OROOM) region — the room is
// really created (add_room + topologize, or flood_fill_rm for an irregular one),
// its needfill is recorded for the level-finalize fill_special_room() pass, and
// add_doors_to_room() attaches any door squares already on the map.  litstate is
// an explicit 0/1 here, so litstate_rnd() draws nothing.
//
// Generic despite the vly_ prefix: the named Gehennom levels in mklev.js
// (sanctum/orcus/wizard1-3/...) create their morgues, zoos, beehives, temples
// and shops through this same entry point.
// `contents` is the Lua region's contents function: C runs update_croom() ->
// contents() -> spo_endroom() -> add_doors_to_room(), so it must fire AFTER
// the room exists and BEFORE the door sweep.
export function vly_region(mx1, my1, mx2, my2, lit, rtype, needfill, irregular,
                           contents) {
    const a = vly_abs(mx1, my1), b = vly_abs(mx2, my2);
    let croom;
    if (irregular) {
        const roomno = game.level.nroom + ROOMOFFSET;
        const ext = { min_rx: a.x, max_rx: a.x, min_ry: a.y, max_ry: a.y,
                      n_loc_filled: 0 };
        flood_fill_rm(a.x, a.y, roomno, lit, true, ext);
        croom = add_sp_room(ext.min_rx, ext.min_ry, ext.max_rx, ext.max_ry,
                            lit, rtype, true, needfill, true);
    } else {
        croom = add_sp_room(a.x, a.y, b.x, b.y, lit, rtype, false, needfill, true);
        const roomno = croom.roomnoidx + ROOMOFFSET;
        for (let x = a.x; x <= b.x; x++)
            for (let y = a.y; y <= b.y; y++) {
                const loc = game.level?.at(x, y);
                if (loc) { loc.roomno = roomno; loc.lit = !!lit; }
            }
    }
    if (contents) contents(croom);
    splev_add_doors_to_room(croom);
    return croom;
}

// C ref: sp_lev.c lspo_teleport_region() -> fixup_special() LR_DOWNTELE arm,
// which copies the region into svd.dndest for goto_level()'s own
// place_lregion() call (the hero's arrival spot).  No RNG here.
// `islev` is the Lua `region_islev` flag: the coordinates are then whole-level
// absolute rather than relative to the last des.map() origin (sp_lev.c
// lspo_teleport_region reads region_islev before get_location_coord).
export function vly_teleport_region(mx1, my1, mx2, my2, islev, dir = 'both') {
    const a = islev ? { x: mx1, y: my1 } : vly_abs(mx1, my1);
    const b = islev ? { x: mx2, y: my2 } : vly_abs(mx2, my2);
    // C ref: sp_lev.c lspo_teleport_region():5452 — dir defaults to "both"
    // (LR_TELE), which fixup_special() copies into BOTH svu.updest and svd.dndest.
    const rgn = { lx: a.x, ly: a.y, hx: b.x, hy: b.y,
                  nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    if (dir === 'both' || dir === 'up') game.updest = { ...rgn };
    if (dir === 'both' || dir === 'down') game.dndest = { ...rgn };
}

// C ref: sp_lev.c create_altar() with croom == NULL — an explicit coordinate
// (no RNG), the altarmask from the requested alignment, and, when the square
// falls inside a TEMPLE region and shrine is set, priestini().  Generic
// despite the prefix — sanctum.lua and orcus.lua use it for their `type=
// "sanctum"` altars (shrine == 2, which also sets AM_SANCTUM).
export function vly_altar(mx, my, amask, shrine) {
    const c = vly_abs(mx, my);
    if (!set_levltyp_lit(c.x, c.y, ALTAR, SET_LIT_NOCHANGE)) return;
    const loc = game.level.at(c.x, c.y);
    loc.altarmask = amask;
    // C: `sproom = *in_rooms(x, y, TEMPLE)`; a des.region temple already owns
    // this square's roomno.
    const rno = (loc.roomno ?? 0) - ROOMOFFSET;
    const croom = (rno >= 0) ? game.level.rooms[rno] : null;
    if (!croom || croom.rtype !== TEMPLE_RTYPE || !shrine) return;
    priestini(game.u?.uz, croom, c.x, c.y, shrine > 1);
    loc.altarmask |= AM_SHRINE;
    // C ref: create_altar()'s tail — `shrine == 2` is a high altar / sanctum,
    // and either way the level is now known to hold a temple.  No RNG.
    if (shrine === 2) loc.altarmask |= AM_SANCTUM;
    if (game.level?.flags) game.level.flags.has_temple = true;
}

// C ref: sp_lev.c lspo_non_diggable() -> set_wall_property(W_NONDIGGABLE) over
// the selection: every wall/tree/ironbars square inside it becomes undiggable.
// No RNG.
export function vly_non_diggable(mx1, my1, mx2, my2) {
    const a = vly_abs(mx1, my1), b = vly_abs(mx2, my2);
    for (let x = Math.max(a.x, 1); x <= Math.min(b.x, COLNO - 1); x++)
        for (let y = Math.max(a.y, 0); y <= Math.min(b.y, ROWNO - 1); y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS)
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
        }
}

// C ref: sp_lev.c create_object() at a RANDOM DRY location.  `montype` names a
// species for a corpse/statue (a plain table scan in lspo_object -> no RNG);
// `oclass` is a des.object("X") class char; `otyp` a des.object("name") id.
export function vly_object({ otyp = null, oclass = null, montype = null }) {
    const { x, y } = splev_get_location_rnd(LOC_DRY);
    let otmp;
    if (otyp != null) otmp = mksobj_at(otyp, x, y, true, true);
    else if (oclass != null) otmp = mkobj_at(oclass, x, y, true);
    else otmp = mkobj_at(0 /* RANDOM_CLASS */, x, y, true);
    if (otmp && montype != null) {
        const pmidx = name_to_pmidx(montype);
        if (pmidx >= 0) set_corpsenm(otmp, pmidx);
    }
    return otmp;
}

// C ref: sp_lev.c create_trap() — get_location(DRY) (explicit coord: no RNG;
// random coord: the rn2 loop) then mktrap(type, MKTRAP_MAZEFLAG|NOSPIDERONWEB).
// mktrap's own only draw at this depth is the victim check rnd(4)
// (mklev.c:2137), which is always evaluated and never succeeds here.
export async function vly_trap(ttyp, mx = null, my = null) {
    let x, y;
    if (mx != null) { const c = vly_abs(mx, my); x = c.x; y = c.y; }
    else { const c = splev_get_location_rnd(LOC_DRY); x = c.x; y = c.y; }
    await maketrap(x, y, ttyp);
    rnd(4);                                       // mktrap victim check
}

// C ref: sp_lev.c create_monster() for a bare CLASS char ("L"/"V"/"Z"/"M").
// find_montype is never reached (no "id" field), so there is no gender roll;
// the class is resolved by mkclass(class, G_NOGEN) AFTER induced_align.
export function vly_monster_class(classNum) {
    rn2(3);                                           // induced_align
    const ptr = mkclass(classNum, 0x0200 /* G_NOGEN */);
    if (!ptr) return null;
    return vly_place_monster(ptr);
}

export function vly_place_monster(ptr) {
    const hum = pm_to_humidity(ptr);
    let { x, y } = splev_get_location_rnd(hum, true);
    if (x === -1 && y === -1) {
        const c = splev_get_location_rnd(hum | LOC_DRY);
        x = c.x; y = c.y;
    }
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    return makemon(ptr, x, y, 0 /* NO_MM_FLAGS */);
}
export const VLY_S_LICH = 38, VLY_S_MUMMY = 39, VLY_S_VAMPIRE = 48, VLY_S_ZOMBIE = 52;

// C ref: sp_lev.c flip_level():697 "level (teleport) regions" — gl.lregions[]
// is mirrored with the map, and fixup_special() copies the teleport region into
// svd.dndest only AFTER that.  This port fills dndest at des.teleport_region()
// time (BEFORE the flip), so every generator that flips must mirror it too or
// the hero lands on the un-mirrored arrival square (seed0373: Plane of Fire,
// x=72 where C has x=8).  No RNG.
export function vly_flip_dndest(flp) { flip_lregion_dest(flp, game.dndest); }

// The updest half of the same C loop.  Split out because only the four
// elemental planes reach goto_level() with `up` set (their depth is negative,
// so every arrival counts as going up) and therefore read svu.updest; flipping
// it for the mine-end / Valley / sanctum generators as well measured -105 on
// seed4500, whose exclusion regions sit off-map.
export function vly_flip_updest(flp) { flip_lregion_dest(flp, game.updest); }

function flip_lregion_dest(flp, d) {
    if (!d) return;
    const { minx, maxx, miny, maxy } = bigrm_get_level_extends();
    // C ref: sp_lev.c flip_level():698-731 — the lregion loop applies FlipX /
    // FlipY to inarea and delarea UNCONDITIONALLY; unlike the map/monster/object
    // loops it has no inFlipArea() test, so a corner outside the level extents
    // is flipped anyway.  An in-extents guard here turned air.lua's up region
    // {1,0}-{24,20} into a ONE-ROW box whenever y=0 fell outside the extents,
    // which made u_on_rndspot draw rn2(1) where C draws rn2(21).
    for (const [kx, ky] of [['lx', 'ly'], ['hx', 'hy']]) {
        if (flp & 1) d[ky] = miny + maxy - d[ky];
        if (flp & 2) d[kx] = minx + maxx - d[kx];
    }
    if (d.lx > d.hx) { const t = d.lx; d.lx = d.hx; d.hx = t; }
    if (d.ly > d.hy) { const t = d.ly; d.ly = d.hy; d.hy = t; }
    // C ref: sp_lev.c flip_level():708-714 / 725-731 — the EXCLUSION half of
    // each lregion (delarea) is flipped by the same FlipX/FlipY, with no
    // in-extents test and its own low/high swap.  Leaving it unflipped left the
    // Plane of Air's arrival region and its exclusion pointing at opposite ends
    // of the level, so every one of place_lregion()'s 200 rn1() tries landed
    // inside the exclusion and the hero fell through to the deterministic scan
    // (seed0373 step 110: C accepts its FIRST try).  An all-zero delarea means
    // "no exclusion" and must stay all-zero, so skip it.
    if (d.nlx || d.nly || d.nhx || d.nhy) {
        if (flp & 1) { d.nly = miny + maxy - d.nly; d.nhy = miny + maxy - d.nhy; }
        if (flp & 2) { d.nlx = minx + maxx - d.nlx; d.nhx = minx + maxx - d.nhx; }
        if (d.nlx > d.nhx) { const t = d.nlx; d.nlx = d.nhx; d.nhx = t; }
        if (d.nly > d.nhy) { const t = d.nly; d.nly = d.nhy; d.nhy = t; }
    }
}

// C ref: lspo_finalize_level()'s trailing `for (i = 0; i < svn.nroom; ++i)
// fill_special_room(&svr.rooms[i]);` — run AFTER fixup_special() has placed the
// branch lregion.  Stocking runs the fully C-faithful monster path, the same
// flag the other special-level generators use.
export function fill_level_special_rooms() {
    const g = game;
    const was_full = g._full_mon_gen;
    g._full_mon_gen = true;
    try {
        for (let i = 0; i < (g.level?.nroom ?? 0); i++)
            fill_special_room(g.level.rooms[i]);
    } finally {
        g._full_mon_gen = was_full;
    }
}

// C ref: sp_lev.c lspo_region() two-argument form `des.region(sel, "lit")`
// (sp_lev.c:5613-5629).  This form NEVER builds a room: the selection is
// cloned, grown one cell in every direction when lighting
// (selection_do_grow(sel, W_ANY)), and sel_set_lit writes levl[][].lit on each
// point — lava counts as lit whatever was asked for.  No RNG.
export function splev_region_lit(mx1, my1, mx2, my2, lit) {
    const a = vly_abs(mx1, my1), b = vly_abs(mx2, my2);
    let lox = a.x, loy = a.y, hix = b.x, hiy = b.y;
    if (lit) { lox--; loy--; hix++; hiy++; }
    // selection_iterate skips !isok cells, and isok() starts at x == 1.
    for (let x = Math.max(1, lox); x <= Math.min(COLNO - 1, hix); x++)
        for (let y = Math.max(0, loy); y <= Math.min(ROWNO - 1, hiy); y++) {
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = !!(IS_LAVA(loc.typ) || lit);
        }
}

// C ref: sp_lev.c lspo_terrain() over a selection.area() rectangle.  No RNG.
export function splev_terrain_area(mx1, my1, mx2, my2, typ) {
    const a = vly_abs(mx1, my1), b = vly_abs(mx2, my2);
    for (let x = a.x; x <= b.x; x++)
        for (let y = a.y; y <= b.y; y++)
            set_levltyp_lit(x, y, typ, SET_LIT_NOCHANGE);
}

// C ref: sp_lev.c sel_set_feature() — a furniture square is left alone;
// anything else takes the feature's typ directly (no set_levltyp).  No RNG.
export function splev_feature(mx, my, typ) {
    const c = vly_abs(mx, my);
    const loc = game.level?.at(c.x, c.y);
    if (!loc || IS_FURNITURE(loc.typ)) return;
    loc.typ = typ;
}

// C ref: sp_lev.c lspo_door() 3-argument form des.door(state, x, y).  A
// "random" state is msk == -1, which costs one rnddoor() rn2(5) before
// sel_set_door; every other state is a plain mask and draws nothing.
export function splev_door_at(state, mx, my) {
    const msk = DOORSTATES[state];
    const typ = (msk === -1) ? splev_rnddoor_roll() : msk;
    const c = vly_abs(mx, my);
    const loc = game.level?.at(c.x, c.y);
    if (!loc) return;
    let mask = typ;
    if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR)
        loc.typ = (mask & D_SECRET) ? SDOOR : DOOR;
    if (mask & D_SECRET) {
        mask &= ~D_SECRET;
        if (mask < D_CLOSED) mask = D_CLOSED;
    }
    set_door_orientation(c.x, c.y);
    loc.doormask = mask;
}

// C ref: sp_lev.c link_doors_rooms() (sp_lev.c:1122) — the first thing
// lspo_finalize_level() does.  Every DOOR/SDOOR square on the map is
// re-oriented and offered to every room in index order; maybe_add_door()
// accepts it when it borders that room.  Load-bearing for shops: stock_room()
// reads svd.doors[sroom->fdoor], and minetn-*.lua places its shop doors AFTER
// the des.region that creates the shop, so without this pass the shop has no
// door at all.  No RNG.
export function splev_link_doors_rooms() {
    const g = game;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = g.level?.at(x, y);
            if (!loc || !(IS_DOOR(loc.typ) || loc.typ === SDOOR)) continue;
            set_door_orientation(x, y);
            for (let i = 0; i < (g.level?.nroom ?? 0); i++) {
                const croom = g.level.rooms[i];
                if (!croom || croom.hx < 0) continue;
                const rmno = croom.roomnoidx + ROOMOFFSET;
                const mine = croom.irregular
                    ? (loc.roomno === rmno)
                    : (x >= croom.lx - 1 && x <= croom.hx + 1
                       && y >= croom.ly - 1 && y <= croom.hy + 1);
                if (mine) splev_add_door(x, y, croom);
            }
        }
}

function splev_In_mines() {
    return game.mines_dnum != null && game.u?.uz?.dnum === game.mines_dnum;
}
function splev_race_is(nm) {
    return (races[game.initrace]?.name || 'human') === nm;
}
// C ref: mondata.h:102 `((ptr)->mflags2 & gu.urace.selfmask) != 0L` — a FLAG
// test, not an identity test: for a gnome hero every M2_GNOME species (gnome
// lord/king, gnomish wizard, gnome mummy/zombie) is your_race, not just PM_GNOME.
// MH_* are the M2_* bits (monflag.h:187-191), so selfmask masks mflags2 directly.
function splev_your_race(ptr) {
    const selfmask = races[game.initrace]?.selfmask;
    return selfmask != null && (mflags2_of(ptr) & selfmask) !== 0;
}

// C ref: sp_lev.c create_monster() (sp_lev.c:1925) reached from lspo_monster().
// Draw order, all before makemon:
//   * find_montype (sp_lev.c:3156) rn2(2) for the gender, during lspo_monster's
//     PARSE — so it precedes induced_align.  Skipped when the species has a
//     fixed gender or the NAME itself is a gendered form of a NAMS() triple
//     ("gnome lord" is the male name, so it never rolls).
//   * sp_amask_to_amask -> induced_align (dungeon.c:2012) rn2(3), for any
//     monster whose table carries no `align` key.
//   * mkclass(class, G_NOGEN) for a bare class char.
//   * the In_mines your_race rn2(3) (sp_lev.c:1957).
//   * the location (explicit: none; random: the get_location loop).
export function splev_create_monster({ name = null, cls = 0, mx = null, my = null,
                                peaceful = null, croom = null, asleep = null }) {
    let ptr = null;
    if (name != null) {
        const pmidx = name_to_pmidx(name);
        ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
        if (ptr && ptr.gcode !== 1 && ptr.gcode !== 2
            && name_gender_hint(name) === MGEND_NEUTRAL)
            rn2(2);                                   // find_montype sp_lev.c:3156
    }
    rn2(3);                                           // induced_align dungeon.c:2012
    if (name == null && cls) ptr = mkclass(cls, 0x0200 /* G_NOGEN */);
    if (splev_In_mines() && ptr && splev_your_race(ptr)
        && (splev_race_is('dwarf') || splev_race_is('gnome')) && rn2(3))
        ptr = null;
    let x, y;
    if (mx != null) { const c = vly_abs(mx, my); x = c.x; y = c.y; }
    else if (ptr) {
        const hum = pm_to_humidity(ptr);
        const r = splev_get_location_room(croom, hum, true);
        x = r.x; y = r.y;
        if (x === -1 && y === -1) {
            const r2 = splev_get_location_room(croom, hum | LOC_DRY);
            x = r2.x; y = r2.y;
        }
    } else {
        const r = splev_get_location_room(croom, LOC_DRY);
        x = r.x; y = r.y;
    }
    if (mm_mon_at(x, y)) {
        const cc = enexto_spawn(x, y, ptr);
        if (cc) { x = cc.x; y = cc.y; }
    }
    // C ref: sp_lev.c create_monster:1981 — a (possibly enexto-relocated) spot
    // outside croom aborts the monster entirely, before makemon.
    if (croom && !inside_room(croom, x, y)) return null;
    const mtmp = makemon(ptr, x, y, 0 /* NO_MM_FLAGS */);
    if (mtmp && peaceful != null) mtmp.mpeaceful = peaceful ? 1 : 0;
    if (mtmp && asleep != null) mtmp.msleeping = asleep ? 1 : 0;
    return mtmp;
}

// C ref: sp_lev.c create_object() at an EXPLICIT coordinate — get_location_coord
// draws nothing, then the object is built exactly as the random-location form.
// `historic` is obj.h's CORPSTAT_HISTORIC (4) in a statue's spe bitfield.
export function splev_object_at({ otyp = null, oclass = null, montype = null,
                           historic = 0 }, mx, my) {
    const c = vly_abs(mx, my);
    let otmp;
    if (otyp != null) otmp = mksobj_at(otyp, c.x, c.y, true, true);
    else if (oclass != null) otmp = mkobj_at(oclass, c.x, c.y, true);
    else otmp = mkobj_at(0 /* RANDOM_CLASS */, c.x, c.y, true);
    if (otmp && historic) otmp.spe = 4;
    if (otmp && montype != null) {
        const pmidx = name_to_pmidx(montype);
        if (pmidx >= 0) set_corpsenm(otmp, pmidx);
    }
    return otmp;
}

// C ref: mklev.c traptype_rnd(mktrapflags) (mklev.c:1938) — the FULL function,
// parameterised on the caller's mktrapflags exactly as C is.  NO_TRAP means
// "too hard for this level"; mktrap() re-rolls until it gets something.
// Note the WEB arm: with MKTRAP_NOSPIDERONWEB (which sp_lev.c's create_trap
// always passes for a `des.trap()` with spider_on_web unset) a web is legal at
// ANY level difficulty — the depth gate only exists to keep the free giant
// spider off shallow levels.
export function splev_traptype_rnd(mktrapflags) {
    const lvl = level_difficulty_ext();
    const noteleport = !!game.level?.flags?.noteleport;
    let kind = rnd(TRAPNUM - 1);                      // mklev.c:1941
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST:
    case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || noteleport || single_level_branch()) kind = NO_TRAP;
        break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7 && !(mktrapflags & 0x04 /* MKTRAP_NOSPIDERONWEB */))
            kind = NO_TRAP;
        break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        if (!In_hell(game.u?.uz)) kind = NO_TRAP; break;
    case TELEP_TRAP:
        if (noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;            // mklev.c:1993
    default: break;
    }
    return kind;
}

// C ref: dungeon.c single_level_branch(&u.uz) — a one-level branch dungeon
// (Sokoban's entry, the quest home...) where a level teleporter would strand
// the hero.  The Mines and the main dungeon are multi-level, so this is only
// ever true off the ported levels; kept faithful for the general helper.
function single_level_branch() {
    const uz = game.u?.uz;
    const dgn = uz ? game.dungeons?.[uz.dnum] : null;
    return !!(dgn && (dgn.num_dunlevs ?? 0) === 1);
}
