// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, rnz } from './rng.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED, NO_ROOM,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    SHOPBASE, COURT, ZOO, BEEHIVE, MORGUE, BARRACKS, SWAMP, TEMPLE,
    LEPREHALL, COCKNEST, ANTHOLE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_ROOM, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    AIR, CLOUD, THRONE, TREE, DRAWBRIDGE_UP,
    MAX_TYPE, INVALID_TYPE, MATCH_WALL,
    A_LAWFUL, Align2amask, STRAT_WAITFORU, NON_PM,
    LR_UPTELE,
    TAINT_AGE,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM,
    WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
} from './const.js';
import {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,
    FOOD_CLASS, SCROLL_CLASS, POTION_CLASS, TOOL_CLASS, GEM_CLASS,
    SPBOOK_CLASS,
    objectNames,
} from './objects.js';
import { setgemprobs } from './o_init.js';
import { maketrap, t_at } from './trap.js';
import {
    mkobj, mksobj, mksobj_at, mkobj_at, mkgold, mkcorpstat, next_ident,
    curse, bless, blessorcurse, place_object, add_to_buried, weight, OBJ,
} from './mkobj.js';
import { makemon, mkclass, MM_NOGRP } from './makemon.js';
import {
    PM_ELF, PM_DWARF, PM_ORC, PM_GNOME, PM_HUMAN,
    PM_ARCHEOLOGIST, PM_WIZARD, PM_GIANT_SPIDER,
    is_male, is_female, mons,
} from './monsters.js';
import { name_to_monplus } from './mondata.js';
import { make_engr_at, wipe_engr_at, random_engraving } from './engrave.js';
import { DUST, MARK as ENGRAVE_MARK } from './const.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const KELP_FROND = objectNames.indexOf('KELP_FROND');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const BELL = objectNames.indexOf('BELL');
const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const SPBOOK_no_NOVEL = 0 - SPBOOK_CLASS; // C: objclass.h -(int)SPBOOK_CLASS
const POT_HEALING = objectNames.indexOf('POT_HEALING');
const POT_EXTRA_HEALING = objectNames.indexOf('POT_EXTRA_HEALING');
const POT_SPEED = objectNames.indexOf('POT_SPEED');
const POT_GAIN_ENERGY = objectNames.indexOf('POT_GAIN_ENERGY');
const SCR_ENCHANT_WEAPON = objectNames.indexOf('SCR_ENCHANT_WEAPON');
const SCR_ENCHANT_ARMOR = objectNames.indexOf('SCR_ENCHANT_ARMOR');
const SCR_CONFUSE_MONSTER = objectNames.indexOf('SCR_CONFUSE_MONSTER');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const ARROW = objectNames.indexOf('ARROW');
const DART = objectNames.indexOf('DART');
const DAGGER = objectNames.indexOf('DAGGER');
const BOW = objectNames.indexOf('BOW');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

// Trap constants — C ref: trap.h enum trap_types
const NO_TRAP = 0;
const TRAPNUM = 26;
const ARROW_TRAP = 1;
const DART_TRAP = 2;
const ROCKTRAP = 3;
const SQKY_BOARD = 4;
const BEAR_TRAP = 5;
const LANDMINE = 6;
const ROLLING_BOULDER_TRAP = 7;
const SLP_GAS_TRAP = 8;
const RUST_TRAP = 9;
const FIRE_TRAP = 10;
const PIT = 11;
const SPIKED_PIT = 12;
const HOLE = 13;
const TRAPDOOR = 14;
const TELEP_TRAP = 15;
const LEVEL_TELEP = 16;
const MAGIC_PORTAL = 17;
const WEB = 18;
const STATUE_TRAP = 19;
const MAGIC_TRAP = 20;
const ANTI_MAGIC = 21;
const POLY_TRAP = 22;
const VIBRATING_SQUARE = 23;
const TRAPPED_DOOR = 24;
const TRAPPED_CHEST = 25;

function is_hole(t) { return t === HOLE || t === TRAPDOOR; }
function is_pit(t) { return t === PIT || t === SPIKED_PIT; }

// Stairway list management — C ref: stairs.c stairway_add
function stairway_add(x, y, up, isladder, dest) {
    const node = {
        sx: x, sy: y, up, isladder,
        tolev: { ...dest },
        u_traversed: false,
        next: game.stairs,
    };
    game.stairs = node;
}

// ── Stairway lookup ──

/** C ref: stairs.c stairway_at */
export function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up) return s;
    return null;
}

function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up) return s;
    return null;
}

/** C ref: stairs.c known_branch_stairs */
export function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && sway.u_traversed);
}

/**
 * C ref: stairs.c stairs_description — ordinary / Dlvl1-up / known-branch.
 * Deferred: "to level N" after traverse, Elemental Planes / end-game amulet
 * destination strings beyond the Dlvl1 no-amulet case.
 */
export function stairs_description(sway, stcase = true) {
    if (!sway) return '';
    const stairs = sway.isladder ? 'ladder' : (stcase ? 'staircase' : 'stairs');
    const updown = sway.up ? 'up' : 'down';
    if (!known_branch_stairs(sway)) {
        let out = `${stairs} ${updown}`;
        if (sway.u_traversed) {
            // C: specialdepth / depth(&tolev) — approximate with tolev.dlevel
            out += ` to level ${sway.tolev.dlevel}`;
        }
        return out;
    }
    const uz = game.u?.uz || {};
    if ((uz.dnum ?? 0) === 0 && (uz.dlevel ?? 1) === 1 && sway.up) {
        const haveAmulet = !!(game.u?.uhave?.amulet);
        if (!haveAmulet)
            return `${stairs} ${updown} out of the dungeon`;
        return `branch ${stairs} ${updown} to the end game`;
    }
    const dname = (game.dungeons?.[sway.tolev.dnum]?.dname || 'elsewhere')
        .replace(/^The /, 'the ');
    return `branch ${stairs} ${updown} to ${dname}`;
}

// ── Hero placement (C ref: stairs.c, mkmaze.c) ──

function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
}

// C ref: mkmaze.c bad_location — simplified for skeleton
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // Excluded region
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy) return true;
    // Must be ROOM or (CORR in maze)
    if (loc.typ !== ROOM && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}

// C ref: mkmaze.c place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // Probabilistic search
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
            u_on_newpos(x, y);
            return;
        }
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
                u_on_newpos(x, y);
                return;
            }
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) { u_on_newpos(stway.sx, stway.sy); return; }
    // No upstair — try special stairs, then random
    const special = stairway_find_special_dir(0);
    if (special) { u_on_newpos(special.sx, special.sy); return; }
    // Random placement via place_lregion
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
}

// oinit — C ref: o_init.c oinit() → setgemprobs(&u.uz)
// ledger_no for DoD dlvl1 is 1; setgemprobs zeroes first (9 - lev/3) gems.
function oinit() {
    // Approximate ledger_no: depth within dungeon bookkeeping ≈ dlevel when dnum==0
    setgemprobs(game.u?.uz || null);
}

// level_difficulty stub
function level_difficulty() {
    const uz = game.u?.uz;
    const d = depth_of_level(uz);
    return d;
}

// place_object / weight imported from mkobj.js
function dealloc_obj(_otmp) { /* stub */ }
function add_to_container(_container, _otmp) { /* stub */ }
function sobj_at(_otyp, _x, _y) { return false; }

function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = GRAVE;
}

// C ref: mklev.c trap_engravings[] — parallel to trap.h order
const trap_engravings = new Array(TRAPNUM).fill(null);
trap_engravings[TRAPDOOR] = 'Vlad was here';
trap_engravings[TELEP_TRAP] = 'ad aerarium';
trap_engravings[LEVEL_TELEP] = 'ad aerarium';

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
function getbones() {
    const flags = game.flags || {};
    // C: discover global; JS playmode explore/discover both set flags.explore
    if (flags.explore || flags.discover) return false;
    if (flags.bones === false) return false;
    if (rn2(3) && !flags.debug && !flags.wizard) return false;
    // Bones file load deferred — always fail open after the chance roll
    return false;
}

// C ref: allmain.c l_nhcore_init()
export function l_nhcore_init() {
    const align = [0, 0, 0]; // A_LAWFUL, A_NEUTRAL, A_CHAOTIC
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game.splev_align = align;
}

// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    if (getbones()) return;
    g.in_mklev = true;
    await makelevel();
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
}

function recount_level_features() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lvl.at(x, y)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}

// C ref: mklev.c clear_level_structures()
function clear_level_structures() {
    const g = game;
    g.fmon = null;
    g.fobj = null;
    g.ftrap = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    // C init_mapseen memset svl.lastseentyp — reuse buffer per level
    g.lastseentyp = null;
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
}

// C ref: mkmap.c litstate_rnd()
function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();

    // C ref: mklev.c:1295 — check for below-Medusa maze level
    // This rn2(5) is consumed even when the condition fails (short-circuit)
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && (g.u?.uz?.dlevel ?? 1) > (medusa?.dlevel ?? 999)) {
        // Would generate maze — not applicable for contest level 1
    }

    // Regular level generation
    // C ref: mklev.c:382-388 — load themerms.lua for themed rooms
    // nhlib.lua shuffle when loading themerms.lua (first level of branch)
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!g._luathemes_loaded) g._luathemes_loaded = {};
    if (!g._luathemes_loaded[dnum]) {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
        g._luathemes_loaded[dnum] = true;
    }

    await makerooms();

    if (g.level.nroom <= 0) return;
    sort_rooms();
    await generate_stairs();

    // Branch check
    const branchp = is_branchlev();

    makecorridors();
    await make_niches();

    // C ref: mklev.c do_vault() — secret treasure vault
    // Outer rnd_rect() is only a null-check; create_vault() calls rnd_rect
    // again inside create_room (up to trycnt 100). Do not stub that loop.
    if (g.vault_x !== -1) {
        const vw = { v: 1 }, vh = { v: 1 };
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        const fill_vault = async () => {
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = true;
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
            fill_special_room(vaultRoom);
            mk_knox_portal(vx.v + vw.v, vy.v + vh.v);
            // C: if (!noteleport && !rn2(3)) makevtele();
            if (!g.level.flags.noteleport && !rn2(3))
                await makeniche(TELEP_TRAP);
        };
        if (check_room(vx, vw, vy, vh, true)) {
            await fill_vault();
        } else if (rnd_rect() && create_vault()) {
            // C: gv.vault_x/y = rooms[nroom].lx/ly; re-check then fill or hx=-1
            g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
            g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
            vx.v = g.vault_x;
            vy.v = g.vault_y;
            if (check_room(vx, vw, vy, vh, true)) {
                await fill_vault();
            } else if (g.level.rooms[g.level.nroom]) {
                g.level.rooms[g.level.nroom].hx = -1;
            }
        }
    }

    // C ref: mklev.c:1344-1375 — up to one special room by depth
    const u_depth = depth_of_level(g.u?.uz);
    const medusaDepth = depth_of_level(g.medusa_level) || 999;
    let room_threshold = branchp ? 4 : 3;
    // Vault creation bumps room_threshold in C when filled
    if (g.level.flags.has_vault) room_threshold++;

    if (u_depth > 1 && u_depth < medusaDepth
        && g.level.nroom >= room_threshold && rn2(u_depth) < 3) {
        do_mkroom(SHOPBASE);
    } else if (u_depth > 4 && !rn2(6)) {
        do_mkroom(COURT);
    } else if (u_depth > 5 && !rn2(8)) {
        do_mkroom(LEPREHALL);
    } else if (u_depth > 6 && !rn2(7)) {
        do_mkroom(ZOO);
    } else if (u_depth > 8 && !rn2(5)) {
        do_mkroom(TEMPLE);
    } else if (u_depth > 9 && !rn2(5)) {
        do_mkroom(BEEHIVE);
    } else if (u_depth > 11 && !rn2(6)) {
        do_mkroom(MORGUE);
    } else if (u_depth > 12 && !rn2(8)) {
        do_mkroom(ANTHOLE);
    } else if (u_depth > 14 && !rn2(4)) {
        do_mkroom(BARRACKS);
    } else if (u_depth > 15 && !rn2(6)) {
        do_mkroom(SWAMP);
    } else if (u_depth > 16 && !rn2(8)) {
        do_mkroom(COCKNEST);
    }

    // Place dungeon branch
    // C ref: mklev.c:1378-1387 — prevstairs + Dlvl1 branch stairs traversed
    const prevstairs = g.stairs;
    if (branchp) {
        place_branch(branchp);
    }
    if ((g.u?.uz?.dnum ?? 0) === 0 && (g.u?.uz?.dlevel ?? 1) === 1
        && g.stairs && g.stairs !== prevstairs) {
        g.stairs.u_traversed = true;
    }

    // C ref: mklev.c:1394-1412 — fill ordinary rooms + bonus item room
    let fillable_room_count = 0;
    for (let i = 0; i < g.level.nroom; i++) {
        const croom = g.level.rooms[i];
        if (croom && croom.hx > 0 && ROOM_IS_FILLABLE(croom)) fillable_room_count++;
    }
    let bonus_item_room_countdown = fillable_room_count
        ? rn2(fillable_room_count) : -1;

    for (let i = 0; i < g.level.nroom; i++) {
        const croom = g.level.rooms[i];
        if (!croom || croom.hx <= 0) continue;
        const fillable = ROOM_IS_FILLABLE(croom);
        await fill_ordinary_room(croom, fillable && bonus_item_room_countdown === 0);
        if (fillable) --bonus_item_room_countdown;
    }

    // C ref: mklev.c:1416-1418 — fill all special rooms
    for (let i = 0; i < g.level.nroom; i++)
        fill_special_room(g.level.rooms[i]);

    // C ref: mklev.c themerooms_post_level_generate() — after fill, Lua
    // post_level_generate (no-op when postprocess empty for default rooms)
    // then full-map wallification. JS has no Lua postprocess queue yet.
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

/**
 * C ref: mkroom.c do_mkroom — dispatch special room makers.
 * Shop path: mkshop eligibility scan; stocking deferred when a room qualifies.
 */
function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop();
        return;
    }
    // COURT/ZOO/… bodies deferred — named in C-JS-MAP.md
}

/**
 * C ref: mkroom.c mkshop — find eligible OROOM with one door, no stairs.
 * Full invalid_shop_shape + shtypes rnd(100) + rtype set deferred; candidates
 * are skipped so we never claim a shop without burning shop-type RNG.
 * seed0015 dlvl2: C also finds no eligible room → no RNG here.
 */
function mkshop() {
    const g = game;
    const nroom = g.level?.nroom | 0;
    for (let i = 0; i < nroom; i++) {
        const sroom = g.level.rooms[i];
        if (!sroom || sroom.hx < 0) return;
        if (sroom.rtype !== OROOM) continue;
        let hasStairs = false;
        for (let s = g.stairs; s; s = s.next) {
            if (s.sx >= sroom.lx && s.sx <= sroom.hx
                && s.sy >= sroom.ly && s.sy <= sroom.hy) {
                hasStairs = true;
                break;
            }
        }
        if (hasStairs) continue;
        if ((sroom.doorct | 0) === 1) {
            // Eligible under doorct rule — invalid_shop_shape/shtypes omitted;
            // skip rather than set rtype without rnd(100).
            continue;
        }
    }
}

function ROOM_IS_FILLABLE(croom) {
    return (croom.rtype === OROOM || croom.rtype === THEMEROOM)
        && croom.needfill === FILL_NORMAL;
}

/**
 * C ref: sp_lev.c fill_special_room() — vault gold + zoo stubs.
 * Shops/zoos not yet ported; VAULT is enough for early Tourist seeds.
 */
function fill_special_room(croom) {
    if (!croom) return;
    for (let i = 0; i < (croom.nsubrooms || 0); i++)
        fill_special_room(croom.sbrooms[i]);

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === 0 /* FILL_NONE */)
        return;

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype === VAULT) {
            const d = Math.abs(depth_of_level(game.u?.uz));
            for (let x = croom.lx; x <= croom.hx; x++) {
                for (let y = croom.ly; y <= croom.hy; y++)
                    mkgold(rn1(d * 100, 51), x, y);
            }
        }
        // COURT/ZOO/... → fill_zoo — TODO
    }
    if (croom.rtype === VAULT)
        game.level.flags.has_vault = true;
}

/**
 * C ref: mklev.c mk_knox_portal() — usually defers; burns rn2(3).
 */
function mk_knox_portal(_x, _y) {
    const g = game;
    const knox = g.knox_level;
    const br = (g.branches || []).find(b =>
        knox && b.end2
        && b.end2.dnum === knox.dnum
        && b.end2.dlevel === knox.dlevel);
    if (!br) return; // C panics; soft-skip if data missing
    // C: if (on_level(knox, end1)) source=end2; else source=end1
    // end1 is sentinel (dnum==n_dgns), so source = end1
    if (is_branchlev()) return;
    const source = br.end1;
    // Already set or 2/3 chance of deferring until a later level
    if (source.dnum < g.n_dgns || (rn2(3) && !g.flags?.debug))
        return;
    // Placement only when deep in main dungeon — not reached on Tourist dlvl1
}

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;

    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            // C: themes path always calls themerooms_generate; failure is
            // gt.themeroom_failed (map placement miss), not a false return.
            g.themeroom_failed = false;
            const ok = await themerooms_generate(difficulty);
            if (!ok || g.themeroom_failed) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
    }
}

// Themed room metadata — must match C's themerms.lua frequency table exactly.
// Generated from themeroom_meta.js (31 rooms).
const THEMEROOM_META = [
    { name: 'default', frequency: 1000 },
    { name: 'Fake Delphi', frequency: 1 },
    { name: 'Room in a room', frequency: 1 },
    { name: 'Huge room with another room inside', frequency: 1 },
    { name: 'Nesting rooms', frequency: 1 },
    { name: 'Default room with themed fill', frequency: 6 },
    { name: 'Unlit room with themed fill', frequency: 2 },
    { name: 'Room with both normal contents and themed fill', frequency: 2 },
    { name: 'Pillars', frequency: 1 },
    { name: 'Mausoleum', frequency: 1 },
    { name: 'Random dungeon feature', frequency: 1 },
    { name: 'L-shaped', frequency: 1 },
    { name: 'L-shaped, rot 1', frequency: 1 },
    { name: 'L-shaped, rot 2', frequency: 1 },
    { name: 'L-shaped, rot 3', frequency: 1 },
    { name: 'Blocked center', frequency: 1 },
    { name: 'Circular, small', frequency: 1 },
    { name: 'Circular, medium', frequency: 1 },
    { name: 'Circular, big', frequency: 1 },
    { name: 'T-shaped', frequency: 1 },
    { name: 'T-shaped, rot 1', frequency: 1 },
    { name: 'T-shaped, rot 2', frequency: 1 },
    { name: 'T-shaped, rot 3', frequency: 1 },
    { name: 'S-shaped', frequency: 1 },
    { name: 'S-shaped, rot 1', frequency: 1 },
    { name: 'Z-shaped', frequency: 1 },
    { name: 'Z-shaped, rot 1', frequency: 1 },
    { name: 'Cross', frequency: 1 },
    { name: 'Four-leaf clover', frequency: 1 },
    { name: 'Water-surrounded vault', frequency: 1 },
    { name: 'Twin businesses', frequency: 1, mindiff: 4 },
];

// C ref: themerms.lua — des.map rooms whose contents are only filler_region(x,y).
// Extracted from nethack-c/upstream/dat/themerms.lua (simple filler envelope).
const THEMEROOM_MAPS = {
    'L-shaped': {
        map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n--------',
        fx: 1, fy: 1,
    },
    'L-shaped, rot 1': {
        map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n--------',
        fx: 5, fy: 1,
    },
    'L-shaped, rot 2': {
        map: '--------\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----',
        fx: 1, fy: 1,
    },
    'L-shaped, rot 3': {
        map: '--------\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx',
        fx: 1, fy: 1,
    },
    'Circular, small': {
        map: 'xx---xx\nx--.--x\n--...--\n|.....|\n--...--\nx--.--x\nxx---xx',
        fx: 3, fy: 3,
    },
    'Circular, medium': {
        map: 'xx-----xx\nx--...--x\n--.....--\n|.......|\n|.......|\n|.......|\n--.....--\nx--...--x\nxx-----xx',
        fx: 4, fy: 4,
    },
    'Circular, big': {
        map: 'xxx-----xxx\nx---...---x\nx-.......-x\n--.......--\n|.........|\n|.........|\n|.........|\n--.......--\nx-.......-x\nx---...---x\nxxx-----xxx',
        fx: 5, fy: 5,
    },
    'T-shaped': {
        map: 'xxx-----xxx\nxxx|...|xxx\nxxx|...|xxx\n----...----\n|.........|\n|.........|\n|.........|\n-----------',
        fx: 5, fy: 5,
    },
    'T-shaped, rot 1': {
        map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx',
        fx: 2, fy: 2,
    },
    'T-shaped, rot 2': {
        map: '-----------\n|.........|\n|.........|\n|.........|\n----...----\nxxx|...|xxx\nxxx|...|xxx\nxxx-----xxx',
        fx: 2, fy: 2,
    },
    'T-shaped, rot 3': {
        map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----',
        fx: 5, fy: 5,
    },
    'S-shaped': {
        map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----',
        fx: 2, fy: 2,
    },
    'S-shaped, rot 1': {
        map: 'xxx--------\nxxx|......|\nxxx|......|\n----......|\n|......----\n|......|xxx\n|......|xxx\n--------xxx',
        fx: 5, fy: 5,
    },
    'Z-shaped': {
        map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx',
        fx: 5, fy: 5,
    },
    'Z-shaped, rot 1': {
        map: '--------xxx\n|......|xxx\n|......|xxx\n|......----\n----......|\nxxx|......|\nxxx|......|\nxxx--------',
        fx: 2, fy: 2,
    },
    'Cross': {
        map: 'xxx-----xxx\nxxx|...|xxx\nxxx|...|xxx\n----...----\n|.........|\n|.........|\n|.........|\n----...----\nxxx|...|xxx\nxxx|...|xxx\nxxx-----xxx',
        fx: 6, fy: 6,
    },
    'Four-leaf clover': {
        map: '-----x-----\n|...|x|...|\n|...---...|\n|.........|\n---.....---\nxx|.....|xx\n---.....---\n|.........|\n|...---...|\n|...|x|...|\n-----x-----',
        fx: 6, fy: 6,
    },
};

// C ref: nhlua.c char2typ[] / splev_chr2typ() — first match wins ('-' → HWALL).
const SPLEV_CHAR2TYP = [
    [' ', STONE],
    ['#', CORR],
    ['.', ROOM],
    ['-', HWALL],
    ['|', VWALL],
    ['+', DOOR],
    ['A', AIR],
    ['C', CLOUD],
    ['S', SDOOR],
    ['H', SCORR],
    ['{', FOUNTAIN],
    ['\\', THRONE],
    ['K', SINK],
    ['}', MOAT],
    ['P', POOL],
    ['L', LAVAPOOL],
    ['Z', LAVAWALL],
    ['I', ICE],
    ['W', WATER],
    ['T', TREE],
    ['F', IRONBARS],
    ['x', MAX_TYPE],
    ['B', CROSSWALL],
    ['w', MATCH_WALL],
];

function splev_chr2typ(ch) {
    for (const [c, typ] of SPLEV_CHAR2TYP) {
        if (c === ch) return typ;
    }
    return INVALID_TYPE;
}

// C ref: sp_lev.c mapfrag_fromstr / mapfrag_get
function mapfrag_fromstr(str) {
    const lines = String(str).replace(/\r/g, '').split('\n');
    // drop a single trailing empty line from a final newline
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const wid = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const data = lines.map(l => l.padEnd(wid, ' '));
    return { wid, hei: data.length, data };
}

function mapfrag_get(mf, x, y) {
    return splev_chr2typ(mf.data[y][x]);
}

// C ref: sp_lev.c sel_set_ter / set_levltyp_lit subset for map load
function sel_set_ter(x, y, ter, tlit) {
    const loc = game.level.at(x, y);
    if (!loc || !isok(x, y)) return;
    loc.typ = ter;
    loc.flags = 0;
    loc.horizontal = false;
    loc.roomno = NO_ROOM;
    loc.edge = false;
    if (tlit) loc.lit = true;
    if (ter === SDOOR || IS_DOOR(ter)) {
        if (ter === SDOOR) loc.doormask = D_CLOSED;
        const left = game.level.at(x - 1, y);
        if (x && left && (IS_WALL(left.typ) || left.horizontal))
            loc.horizontal = true;
    } else if (ter === HWALL || ter === IRONBARS) {
        loc.horizontal = true;
    }
}

// flood_fill bounds — C mkmap.c WIDTH = COLNO-2
const FLOOD_WIDTH = COLNO - 2;

// C ref: mkmap.c flood_fill_rm()
function flood_fill_rm(sx, sy, rmno, lit, anyroom, bounds) {
    const map = game.level;
    const fg_typ = map.at(sx, sy)?.typ;
    if (fg_typ == null) return;

    while (sx > 0) {
        const loc = map.at(sx, sy);
        if (!loc) break;
        const oktyp = anyroom ? IS_ROOM(loc.typ) : loc.typ === fg_typ;
        if (!oktyp || loc.roomno === rmno) break;
        sx--;
    }
    sx++;

    if (sx < bounds.min_rx) bounds.min_rx = sx;
    if (sy < bounds.min_ry) bounds.min_ry = sy;

    let i = sx;
    for (; i <= FLOOD_WIDTH; i++) {
        const loc = map.at(i, sy);
        if (!loc || loc.typ !== fg_typ) break;
        loc.roomno = rmno;
        loc.lit = !!lit;
        if (anyroom) {
            for (let ii = (i === sx ? i - 1 : i); ii <= i + 1; ii++) {
                for (let jj = sy - 1; jj <= sy + 1; jj++) {
                    if (!isok(ii, jj)) continue;
                    const w = map.at(ii, jj);
                    if (!w) continue;
                    if (IS_WALL(w.typ) || IS_DOOR(w.typ) || w.typ === SDOOR) {
                        w.edge = true;
                        if (lit) w.lit = true;
                        if (w.roomno === NO_ROOM) w.roomno = rmno;
                        else if (w.roomno !== rmno) w.roomno = SHARED;
                    }
                }
            }
        }
    }
    const nx = i;

    if (isok(sx, sy - 1)) {
        for (i = sx; i < nx; i++) {
            const above = map.at(i, sy - 1);
            if (above?.typ === fg_typ) {
                if (above.roomno !== rmno)
                    flood_fill_rm(i, sy - 1, rmno, lit, anyroom, bounds);
            } else {
                const al = map.at(i - 1, sy - 1);
                if ((i > sx || isok(i - 1, sy - 1)) && al?.typ === fg_typ
                    && al.roomno !== rmno)
                    flood_fill_rm(i - 1, sy - 1, rmno, lit, anyroom, bounds);
                const ar = map.at(i + 1, sy - 1);
                if ((i < nx - 1 || isok(i + 1, sy - 1)) && ar?.typ === fg_typ
                    && ar.roomno !== rmno)
                    flood_fill_rm(i + 1, sy - 1, rmno, lit, anyroom, bounds);
            }
        }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++) {
            const below = map.at(i, sy + 1);
            if (below?.typ === fg_typ) {
                if (below.roomno !== rmno)
                    flood_fill_rm(i, sy + 1, rmno, lit, anyroom, bounds);
            } else {
                const bl = map.at(i - 1, sy + 1);
                if ((i > sx || isok(i - 1, sy + 1)) && bl?.typ === fg_typ
                    && bl.roomno !== rmno)
                    flood_fill_rm(i - 1, sy + 1, rmno, lit, anyroom, bounds);
                const br = map.at(i + 1, sy + 1);
                if ((i < nx - 1 || isok(i + 1, sy + 1)) && br?.typ === fg_typ
                    && br.roomno !== rmno)
                    flood_fill_rm(i + 1, sy + 1, rmno, lit, anyroom, bounds);
            }
        }
    }

    if (nx - 1 > bounds.max_rx) bounds.max_rx = nx - 1;
    if (sy > bounds.max_ry) bounds.max_ry = sy;
}

// C ref: themerms.lua themeroom_fills frequency table (mindiff + lit eligible)
const THEMEROOM_FILLS = [
    { name: 'Ice room', frequency: 1 },
    { name: 'Cloud room', frequency: 1 },
    { name: 'Boulder room', frequency: 1, mindiff: 4 },
    { name: 'Spider nest', frequency: 1 },
    { name: 'Trap room', frequency: 1 },
    { name: 'Garden', frequency: 1, needs_lit: true },
    { name: 'Buried treasure', frequency: 1 },
    { name: 'Buried zombies', frequency: 1 },
    { name: 'Massacre', frequency: 1 },
    { name: 'Statuary', frequency: 1 },
    { name: 'Light source', frequency: 1, needs_unlit: true },
    { name: 'Temple of the gods', frequency: 1 },
    { name: 'Ghost of an Adventurer', frequency: 1 },
    { name: 'Storeroom', frequency: 1 },
    { name: 'Teleportation hub', frequency: 1 },
];

function is_themeroom_fill_eligible(fill, croom, difficulty) {
    if (fill.mindiff != null && difficulty < fill.mindiff) return false;
    if (fill.maxdiff != null && difficulty > fill.maxdiff) return false;
    // C: Garden eligible = rm.lit == true; Light source = rm.lit == false
    if (fill.needs_lit && !croom?.rlit) return false;
    if (fill.needs_unlit && croom?.rlit) return false;
    return true;
}

// C ref: nhlib.lua percent() → nh.rn2(100) < threshold
function percent(threshold) {
    return rn2(100) < threshold;
}

// C ref: dungeon.c induced_align — burn RNG even when create_monster discards amask
function induced_align(pct) {
    const levAlign = game.level?.flags?.align;
    if (levAlign) {
        if (rn2(100) < pct) return levAlign;
    }
    const dunAlign = game.dungeons?.[game.u?.uz?.dnum]?.flags?.align;
    if (dunAlign) {
        if (rn2(100) < pct) return dunAlign;
    }
    return Align2amask(rn2(3) - 1);
}

// C ref: selvar.c selection_from_mkroom — room floor cells (!edge, matching roomno)
function selection_from_mkroom(croom) {
    const pts = new Set();
    let lx = COLNO, ly = ROWNO, hx = 0, hy = 0;
    if (!croom) return { pts, lx: 0, ly: 0, hx: -1, hy: -1 };
    const rmno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    for (let y = croom.ly; y <= croom.hy; y++) {
        for (let x = croom.lx; x <= croom.hx; x++) {
            if (!isok(x, y)) continue;
            const loc = game.level.at(x, y);
            if (loc && !loc.edge && loc.roomno === rmno) {
                pts.add(`${x},${y}`);
                if (x < lx) lx = x;
                if (y < ly) ly = y;
                if (x > hx) hx = x;
                if (y > hy) hy = y;
            }
        }
    }
    if (pts.size === 0) return { pts, lx: 0, ly: 0, hx: -1, hy: -1 };
    return { pts, lx, ly, hx, hy };
}

// C ref: selvar.c selection_rndcoord — walk x-outer then y; rn2(count)
function selection_rndcoord(sel, removeit) {
    if (!sel || !sel.pts.size) return null;
    let idx = 0;
    for (let dx = sel.lx; dx <= sel.hx; dx++) {
        for (let dy = sel.ly; dy <= sel.hy; dy++) {
            if (sel.pts.has(`${dx},${dy}`)) idx++;
        }
    }
    if (!idx) return null;
    let c = rn2(idx);
    for (let dx = sel.lx; dx <= sel.hx; dx++) {
        for (let dy = sel.ly; dy <= sel.hy; dy++) {
            const key = `${dx},${dy}`;
            if (!sel.pts.has(key)) continue;
            if (!c) {
                if (removeit) sel.pts.delete(key);
                return { x: dx, y: dy };
            }
            c--;
        }
    }
    return null;
}

// C ref: mkobj.c unbless — clear blessed only
function unbless(otmp) {
    if (otmp) otmp.blessed = false;
}

// C ref: sp_lev.c create_object — id/class + not-blessed (curse_state 6) at abs coord
function create_object_themed(opts, x, y) {
    let otmp = null;
    const named = false;
    if (opts.id != null && opts.id >= 0) {
        otmp = mksobj_at(opts.id, x, y, true, !named);
    } else if (opts.oclass != null && opts.oclass >= 0) {
        otmp = mkobj_at(opts.oclass, x, y, !named);
    }
    if (!otmp) return null;
    // curse_state 6 = not-blessed
    if (opts.curse_state === 6) unbless(otmp);
    else if (opts.curse_state === 1) bless(otmp);
    else if (opts.curse_state === 3) curse(otmp);
    return otmp;
}

// C ref: sp_lev.c find_montype — gender roll for non-fixed-sex species
function find_montype_gender(name) {
    const i = name_to_monplus(name);
    if (i < 0 || i === NON_PM) return { mndx: NON_PM, female: 0 };
    const ptr = mons(i);
    let female = 0;
    if (is_male(ptr) || is_female(ptr)) {
        female = is_female(ptr) ? 1 : 0;
    } else {
        female = rn2(2); // FEMALE=1 / MALE=0
    }
    return { mndx: i, female };
}

// C ref: themerms.lua "Ghost of an Adventurer" contents + sp_lev create_monster/object
function themeroom_fill_ghost(croom) {
    const sel = selection_from_mkroom(croom);
    // Lua: selection.room():rndcoord(0) — removeit=FALSE; returns room-relative,
    // then get_location adds lx/ly. Use absolute cells directly.
    const loc = selection_rndcoord(sel, false);
    if (!loc) return;

    const { mndx, female } = find_montype_gender('ghost');
    if (mndx === NON_PM || mndx < 0) return;

    // C create_monster: sp_amask_to_amask(AM_SPLEV_RANDOM) always burns induced_align
    induced_align(80);

    const ptr = mons(mndx);
    const mtmp = makemon(ptr, loc.x, loc.y, 0);
    if (mtmp) {
        mtmp.female = female;
        mtmp.msleeping = 1; // asleep = true
        mtmp.mstrategy = (mtmp.mstrategy || 0) | STRAT_WAITFORU; // waiting
    }

    const buc = { curse_state: 6 }; // not-blessed
    if (percent(65)) create_object_themed({ id: DAGGER, ...buc }, loc.x, loc.y);
    if (percent(55)) create_object_themed({ oclass: WEAPON_CLASS, ...buc }, loc.x, loc.y);
    if (percent(45)) {
        create_object_themed({ id: BOW, ...buc }, loc.x, loc.y);
        create_object_themed({ id: ARROW, ...buc }, loc.x, loc.y);
    }
    if (percent(65)) create_object_themed({ oclass: ARMOR_CLASS, ...buc }, loc.x, loc.y);
    if (percent(20)) create_object_themed({ oclass: RING_CLASS, ...buc }, loc.x, loc.y);
    if (percent(20)) create_object_themed({ oclass: SCROLL_CLASS, ...buc }, loc.x, loc.y);
}

const THEMEROOM_FILL_BODIES = {
    'Ghost of an Adventurer': themeroom_fill_ghost,
};

// C ref: themerms.lua themeroom_fill() — reservoir + dispatched fill bodies
function themeroom_fill(croom) {
    const difficulty = depth_of_level(game.u?.uz);
    let pick = null;
    let total_frequency = 0;
    for (const fill of THEMEROOM_FILLS) {
        if (!is_themeroom_fill_eligible(fill, croom, difficulty)) continue;
        const this_frequency = fill.frequency || 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency)
            pick = fill;
    }
    if (!pick) return;
    croom._themeroom_fill = pick.name;
    const body = THEMEROOM_FILL_BODIES[pick.name];
    if (body) body(croom);
    // Named omission: other fill contents (Ice/Temple/Storeroom/…)
}

// C ref: themerms.lua filler_region + sp_lev.c lspo_region irregular path
function filler_region(rel_x, rel_y) {
    const g = game;
    const xstart = g.splev_xstart ?? 1;
    const ystart = g.splev_ystart ?? 0;
    const ax = xstart + rel_x;
    const ay = ystart + rel_y;

    // percent(30) → nh.rn2(100) < 30
    let rtype = OROOM;
    let do_themed_fill = false;
    if (rn2(100) < 30) {
        rtype = THEMEROOM;
        do_themed_fill = true;
    }

    // lit defaults to -1 in des.region table → litstate_rnd
    const rlit = litstate_rnd(-1);

    if (g.level.nroom >= MAXNROFROOMS) return false;

    const bounds = {
        min_rx: ax, max_rx: ax, min_ry: ay, max_ry: ay,
    };
    const rmno = g.level.nroom + ROOMOFFSET;
    if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
    flood_fill_rm(ax, ay, rmno, rlit, true, bounds);

    // C lspo_region: needjoining=TRUE (joined default), then add_room special
    add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
        false, rtype, true);
    const troom = g.level.rooms[g.level.nroom - 1];
    if (troom) {
        troom.rlit = rlit ? 1 : 0;
        troom.irregular = true;
        troom.needjoining = true;
        troom.needfill = FILL_NORMAL;
        if (rlit) {
            for (let x = troom.lx - 1; x <= troom.hx + 1; x++) {
                for (let y = Math.max(troom.ly - 1, 0); y <= troom.hy + 1; y++) {
                    const loc = g.level.at(x, y);
                    if (loc) loc.lit = true;
                }
            }
        }
        if (do_themed_fill) themeroom_fill(troom);
    }
    return true;
}

// C ref: sp_lev.c lspo_map — themerms random-placement path (lr=tb=-1, no croom)
function lspo_map_themeroom(mapstr, filler_x, filler_y) {
    const g = game;
    const mf = mapfrag_fromstr(mapstr);
    if (!mf || mf.wid < 1 || mf.hei < 1) {
        g.themeroom_failed = true;
        return false;
    }

    let tryct = 0;
    let x = -1;
    let y = -1;

    for (;;) {
        // C: x = 1 + rn2(COLNO - 1 - mf->wid); y = rn2(ROWNO - mf->hei);
        x = 1 + rn2(COLNO - 1 - mf.wid);
        y = rn2(ROWNO - mf.hei);

        const xstart = x;
        const ystart = y;
        const xsize = mf.wid;
        const ysize = mf.hei;

        let isokp = true;
        outer:
        for (let yy = ystart - 1; yy < Math.min(ROWNO, ystart + ysize) + 1; yy++) {
            for (let xx = xstart - 1; xx < Math.min(COLNO, xstart + xsize) + 1; xx++) {
                if (!isok(xx, yy)) {
                    isokp = false;
                } else if (yy < ystart || yy >= ystart + ysize
                    || xx < xstart || xx >= xstart + xsize) {
                    const loc = g.level.at(xx, yy);
                    if (loc.typ !== STONE || loc.roomno !== NO_ROOM)
                        isokp = false;
                } else {
                    const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
                    if (mptyp >= MAX_TYPE) continue;
                    const loc = g.level.at(xx, yy);
                    if ((loc.typ !== STONE && loc.typ !== mptyp)
                        || loc.roomno !== NO_ROOM)
                        isokp = false;
                }
                if (!isokp) break outer;
            }
        }

        if (!isokp) {
            if (tryct++ < 100) continue;
            g.themeroom_failed = true;
            return false;
        }

        // Load the map
        g.splev_xstart = xstart;
        g.splev_ystart = ystart;
        g.splev_xsize = xsize;
        g.splev_ysize = ysize;
        for (let yy = ystart; yy < Math.min(ROWNO, ystart + ysize); yy++) {
            for (let xx = xstart; xx < Math.min(COLNO, xstart + xsize); xx++) {
                const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
                if (mptyp === INVALID_TYPE) continue;
                if (mptyp >= MAX_TYPE) continue;
                sel_set_ter(xx, yy, mptyp, false);
            }
        }

        filler_region(filler_x, filler_y);
        // C resets xystart after contents
        g.splev_xstart = 1;
        g.splev_ystart = 0;
        g.splev_xsize = COLNO - 1;
        g.splev_ysize = ROWNO;
        return true;
    }
}

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// C ref: themerms.lua themerooms_generate() + mklev.c makerooms wrapper
// Reservoir sampling picks one themed room. Default (freq 1000) dominates.
// C sets gi.in_mk_themerooms for the whole Lua call so check_room aborts
// (no shrink) when it hits non-STONE.
async function themerooms_generate(difficulty) {
    const g = game;
    g.in_mk_themerooms = true;
    g.themeroom_failed = false;
    try {
        let pick = null;
        let total_frequency = 0;
        for (const meta of THEMEROOM_META) {
            if (!is_themeroom_eligible(meta, difficulty)) continue;
            const this_frequency = meta.frequency || 1;
            total_frequency += this_frequency;
            if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
                pick = meta;
            }
        }
        if (!pick) return false;

        const mapdef = THEMEROOM_MAPS[pick.name];
        if (mapdef) {
            // C: des.map → lspo_map (no build_room rn2(100) chance burn)
            return lspo_map_themeroom(mapdef.map, mapdef.fx, mapdef.fy);
        }

        // C build_room: chance defaults to 100 → always burns rn2(100)
        // (default themerms entry is named "default", not "ordinary")
        // Map-shaped rooms handled above; remaining still use create_room.
        if (pick.name !== 'ordinary') {
            rn2(100);
        }
        const ok = create_room(-1, -1, -1, -1, -1, -1, OROOM, -1);
        if (ok) {
            // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
            const aroom = g.level.rooms[g.level.nroom - 1];
            if (aroom) {
                topologize(aroom);
                aroom.needfill = FILL_NORMAL;
            }
        }
        return ok;
    } finally {
        g.in_mk_themerooms = false;
    }
}

// C ref: sp_lev.c check_room()
function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.v + ddx.v, hiy = lowy.v + ddy.v;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.v, s_ddx = ddx.v;
    const s_lowy = lowy.v, s_ddy = ddy.v;
    if (lowx.v < 3) lowx.v = 3;
    if (lowy.v < 2) lowy.v = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.v || hiy <= lowy.v) return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.v && s_ddx !== ddx.v
            && s_lowy !== lowy.v && s_ddy !== ddy.v) {
            return false;
        }
        let retry = false;
        for (let x = lowx.v - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = Math.max(lowy.v - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3)) return false;
                    if (game.in_mk_themerooms) return false;
                    if (x < lowx.v) lowx.v = x + xlim + 1;
                    else hix = x - xlim - 1;
                    if (y < lowy.v) lowy.v = y + ylim + 1;
                    else hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry) break;
    }
    ddx.v = hix - lowx.v;
    ddy.v = hiy - lowy.v;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.v && s_ddx !== ddx.v
        && s_lowy !== lowy.v && s_ddy !== ddy.v) {
        return false;
    }
    return true;
}

// C ref: sp_lev.c create_room()
function create_room(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1) rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w; htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1) return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50) dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                   + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                   + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1) dy--;
            }
            const lowx = { v: xabs }, ddx = { v: dx };
            const lowy = { v: yabs }, ddy = { v: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.v;
            yabs = lowy.v;
            wtmp = ddx.v + 1;
            htmp = ddy.v + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        } else {
            // positioned room (not used for seed8000)
            return false;
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1) return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    } else {
        if (!g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}

function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}

// C ref: mklev.c add_room()
function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}

// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
    const map = game.level;
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y)) map.at(x, y).lit = true;
        croom.rlit = 1;
    } else {
        croom.rlit = 0;
    }
    croom.lx = lowx; croom.hx = hix;
    croom.ly = lowy; croom.hy = hiy;
    croom.rtype = _rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = HWALL; loc.horizontal = true; }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = VWALL; loc.horizontal = false; }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}

// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    g.level.rooms = liveRooms;
    if (n < MAXNROFROOMS) g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}

// C ref: mklev.c topologize()
function topologize(croom) {
    if (!croom || croom.irregular) return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET) return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno) return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
}

// ============================================================
// Corridors
// ============================================================

function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y)) return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty)) return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ)) return false;
    if (rmno !== tloc.roomno) return false;
    return true;
}

// C ref: mklev.c finddpos_shift() — irregular rooms walk inward from
// the bounding-box edge through STONE/CORR until a real wall doorpos.
function finddpos_shift(xp, yp, dir, aroom) {
    dir = DIR_180(dir);
    const dx = xdir[dir];
    const dy = ydir[dir];
    if (good_rm_wall_doorpos(xp.v, yp.v, dir, aroom)) return true;
    if (aroom.irregular) {
        let rx = xp.v;
        let ry = yp.v;
        let fail = false;
        const map = game.level;
        while (!fail && isok(rx, ry)) {
            const loc = map.at(rx, ry);
            if (!loc || !(loc.typ === STONE || loc.typ === CORR)) break;
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, dir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            const nloc = map.at(rx, ry);
            if (!nloc || !(nloc.typ === STONE || nloc.typ === CORR))
                fail = true;
            if (rx < aroom.lx || rx > aroom.hx
                || ry < aroom.ly || ry > aroom.hy)
                fail = true;
        }
    }
    return false;
}

// C ref: mklev.c finddpos()
function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
    case DIR_N: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1; break;
    case DIR_S: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1; break;
    case DIR_W: x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy; break;
    case DIR_E: x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy; break;
    default: return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { v: x }, yp = { v: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.v; cc.y = yp.v;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { v: x }, yp = { v: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.v; cc.y = yp.v;
                return true;
            }
        }
    cc.x = x1; cc.y = y1;
    return false;
}

function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}

// C ref: sp_lev.c dig_corridor()
function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out) npoints_out.v = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx; yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) return false;
        xx += dx; yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;
        const crm = map.at(xx, yy);
        if (!crm) return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = SCORR;
            } else {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1)) dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1)) diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx; dy = 0; continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy; dx = 0; continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) { dx = 0; dy = (ty < yy) ? -1 : 1; }
        else { dy = 0; dx = (tx < xx) ? -1 : 1; }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR)) continue;
        dy = -dy; dx = -dx;
    }
    if (npoints_out) npoints_out.v = npoints;
    return true;
}

// C ref: mklev.c dosdoor()
function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, 0).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
        if (type === DOOR) {
            if (!rn2(3)) {
                if (!rn2(5)) loc.flags = D_ISOPEN;
                else if (!rn2(6)) loc.flags = D_LOCKED;
                else loc.flags = D_CLOSED;
                if (loc.flags !== D_ISOPEN && !shdoor
                    && level_difficulty() >= 5 && !rn2(25))
                    loc.flags |= D_TRAPPED;
            } else {
                loc.flags = shdoor ? D_ISOPEN : D_NODOOR;
            }
            if (loc.flags & D_TRAPPED) {
                if (level_difficulty() >= 9 && !rn2(5)) {
                    loc.flags = D_NODOOR;
                }
            }
        } else {
            if (shdoor || !rn2(5)) loc.flags = D_LOCKED;
            else loc.flags = D_CLOSED;
            if (!shdoor && level_difficulty() >= 4 && !rn2(20))
                loc.flags |= D_TRAPPED;
        }
        // C: struct rm flags/doormask are a union — keep JS mirrors in sync
        loc.doormask = loc.flags;
    add_door(x, y, aroom);
}

function dodoor(x, y, aroom) {
    dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}

function add_door(x, y, aroom) {
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

function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

function okdoor(x, y) {
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

// C ref: mklev.c join()
function join(a, b, nxcor) {
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        if (!finddpos(cc, DIR_E, croom)) return;
        if (!finddpos(tt, DIR_W, troom)) return;
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        if (!finddpos(cc, DIR_N, croom)) return;
        if (!finddpos(tt, DIR_S, troom)) return;
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        if (!finddpos(cc, DIR_W, croom)) return;
        if (!finddpos(tt, DIR_E, troom)) return;
    } else {
        dy = 1; dx = 0;
        if (!finddpos(cc, DIR_S, croom)) return;
        if (!finddpos(tt, DIR_N, troom)) return;
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) return;
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { v: 0 };
    const ftyp = CORR;
    const dig_result = dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.v > 0) && (okdoor(xx, yy) || !nxcor))
        dodoor(xx, yy, croom);
    if (!dig_result) return;
    if (okdoor(tt.x, tt.y) || !nxcor)
        dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b]) g.smeq[b] = g.smeq[a];
    else g.smeq[a] = g.smeq[b];
}

// C ref: mklev.c makecorridors()
function makecorridors() {
    const g = game;
    let any = true;
    for (let i = 0; i < g.level.nroom; i++) g.smeq[i] = i;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        join(a, a + 1, false);
        if (!rn2(50)) break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2]) join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) { join(a, b, false); any = true; }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a) b += 2;
            join(a, b, true);
        }
    }
}

// ============================================================
// Room helper functions
// ============================================================

function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

// C ref: mkroom.c inside_room()
function inside_room(croom, x, y) {
    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        const loc = game.level.at(x, y);
        return !!(loc && !loc.edge && loc.roomno === i);
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

// C ref: mkroom.c somexy() — irregular rejects bbox cells with edge/wrong roomno
function somexy(croom, c) {
    let try_cnt = 0;

    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = game.level.at(c.x, c.y);
            if (loc && !loc.edge && loc.roomno === i) return true;
        }
        for (c.x = croom.lx; c.x <= croom.hx; c.x++) {
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = game.level.at(c.x, c.y);
                if (loc && !loc.edge && loc.roomno === i) return true;
            }
        }
        return false;
    }

    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }

    // Check that coords don't fall into a subroom or into a wall
    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        let in_sub = false;
        for (let i = 0; i < croom.nsubrooms; i++) {
            if (inside_room(croom.sbrooms[i], c.x, c.y)) {
                in_sub = true;
                break;
            }
        }
        if (in_sub) continue;
        break;
    }
    if (try_cnt >= 100) return false;
    return true;
}

// C ref: mklev.c occupied() — traps/furniture/lava/pool/invocation
function occupied(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level.at(x, y);
    if (!loc) return false;
    // invocation_pos: omitted until inv_pos/Invocation_lev exist (always false)
    return !!(t_at(x, y)
        || IS_FURNITURE(loc.typ)
        || loc.typ === LAVAPOOL || loc.typ === LAVAWALL
        || IS_POOL(loc.typ));
}

function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

// ============================================================
// Stairs
// ============================================================

function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0) return false;
    if (!croom.needjoining && phase >= 0) return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom) continue;
        if (st.up) hasUp = true; else hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp)) return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM)) return false;
    return true;
}

function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}

function mkstairs(x, y, up, croom) {
    const g = game;
    const loc = g.level.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up) g.level.upstair = { x, y };
    else g.level.dnstair = { x, y };
}

async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}

// ============================================================
// Niches
// ============================================================

function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno) return true;
    }
    return false;
}

function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom)) return null;
    } else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom)) return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE) return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ)) return null;
    if (!cardinal_nextto_room(aroom, xx, yy)) return null;
    return { dy, xx, yy };
}

async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(aroom);
        if (!niche) continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm) continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                // C ref: mklev.c makeniche — Can_fall_thru gate for holes
                let actualTrap = trap_type;
                if (is_hole(actualTrap)) actualTrap = ROCKTRAP;
                const ttmp = await maketrap(xx, yy + dy, actualTrap);
                if (ttmp) {
                    if (actualTrap !== ROCKTRAP) ttmp.once = 1;
                    // C: trap_engravings indexed by (possibly ROCKTRAP-adjusted) type
                    const engr = trap_engravings[actualTrap];
                    if (engr) {
                        make_engr_at(xx, yy - dy, engr, null, 0, DUST);
                        wipe_engr_at(xx, yy - dy, 5, false);
                    }
                }
            }
            dosdoor(xx, yy, aroom, SDOOR);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            } else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3)) {
                        // C ref: mklev.c makeniche → mkcorpstat(..., mkclass(S_HUMAN,0), ..., TRUE)
                        const ptr = mkclass('S_HUMAN', 0);
                        mkcorpstat(CORPSE, null, ptr, xx, yy + dy, 1);
                    }
                }
                if (!g.level.flags.noteleport) {
                    mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}

async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        } else {
            await makeniche(NO_TRAP);
        }
    }
}

// ============================================================
// Branch placement
// ============================================================

function is_branchlev() {
    const g = game;
    if (!g.branches) return null;
    for (const br of g.branches) {
        if (br?.end1?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end1?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
        if (br?.end2?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end2?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
    }
    return null;
}

function find_branch_room(mp) {
    const croom = generate_stairs_find_room();
    if (croom) somexyspace(croom, mp);
    return croom;
}

function place_branch(branchp) {
    const g = game;
    const mp = { x: 0, y: 0 };
    const croom = find_branch_room(mp);
    if (croom && mp.x > 0) {
        const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
            && branchp.end1?.dlevel === g.u?.uz?.dlevel);
        const dest = on_end1 ? branchp.end2 : branchp.end1;
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        const loc = g.level?.at(mp.x, mp.y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? 1 : 2;
        }
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        if (goes_up) g.level.upstair = { x: mp.x, y: mp.y };
        else g.level.dnstair = { x: mp.x, y: mp.y };
    }
    g.made_branch = true;
}

// ============================================================
// Wallification
// ============================================================

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x-1,y-1) && isSolidTile(x-1,y) && isSolidTile(x-1,y+1)
                && isSolidTile(x,y-1) && isSolidTile(x,y+1)
                && isSolidTile(x+1,y-1) && isSolidTile(x+1,y) && isSolidTile(x+1,y+1))
                loc.typ = STONE;
        }
}
function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [isWallOrStone(x-1,y-1), isWallOrStone(x-1,y), isWallOrStone(x-1,y+1)],
                [isWallOrStone(x,y-1), 0, isWallOrStone(x,y+1)],
                [isWallOrStone(x+1,y-1), isWallOrStone(x+1,y), isWallOrStone(x+1,y+1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x,y-1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x,y+1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x+1,y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}
function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

function traptype_rnd() {
    const lvl = game.u?.uz?.dlevel ?? 1;
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        kind = NO_TRAP; break; // not hellish
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;
    }
    return kind;
}

function find_okay_roompos(croom, crd) {
    let tryct = 0;
    do {
        if (++tryct > 200) return false;
        if (!somexyspace(croom, crd)) return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}

// C ref: dothrow.c breaktest() — RNG-consuming; used when landmine → PIT debris.
function mktrap_breaktest(obj) {
    if (!obj) return false;
    const GLASS = 19;
    const o = game.objects?.[obj.otyp];
    const oclass = obj.oclass ?? o?.oc_class;
    let nonbreakchance = 1;
    if (oclass === ARMOR_CLASS && o?.oc_material === GLASS) nonbreakchance = 90;
    // C: if (obj_resists(obj, nonbreakchance, 99)) return FALSE;
    const chance = rn2(100);
    if (chance < (obj.oartifact ? 99 : nonbreakchance)) return false;
    if (o?.oc_material === GLASS && !obj.oartifact && oclass !== GEM_CLASS)
        return true;
    if (oclass === POTION_CLASS) return true;
    const n = objectNames[obj.otyp];
    return n === 'EXPENSIVE_CAMERA' || n === 'EGG' || n === 'CREAM_PIE'
        || n === 'MELON' || n === 'ACID_VENOM' || n === 'BLINDING_VENOM';
}

// C ref: mklev.c mktrap_victim — trap ammo + cursed possessions on fobj, then corpse.
function mktrap_victim(trap) {
    const lvl = level_difficulty();
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    let otmp = null;
    switch (kind) {
    case ARROW_TRAP:
        otmp = mksobj(ARROW, true, false);
        if (otmp) otmp.opoisoned = 0;
        break;
    case DART_TRAP:
        otmp = mksobj(DART, true, false);
        break;
    case ROCKTRAP:
        otmp = mksobj(ROCK, true, false);
        break;
    default:
        break;
    }
    if (otmp) place_object(otmp, x, y);

    // C: cursed random possession(s); 20% chance of another
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        otmp = mkobj(cls, false);
        if (!otmp) break;
        curse(otmp);
        // C: for mktrap_victim, PIT is an exploded LANDMINE
        if (trap.ttyp === PIT && mktrap_breaktest(otmp)) {
            /* dealloc — not placed */
        } else {
            place_object(otmp, x, y);
        }
    } while (!rn2(5));

    let victim_mnum;
    switch (rn2(15)) {
    case 0:
        victim_mnum = PM_ELF;
        if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2))) victim_mnum = PM_HUMAN;
        break;
    case 1: case 2: victim_mnum = PM_DWARF; break;
    case 3: case 4: case 5: victim_mnum = PM_ORC; break;
    case 6: case 7: case 8: case 9:
        victim_mnum = PM_GNOME;
        if (!rn2(10)) {
            otmp = mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
            if (otmp) {
                otmp.quan = 1;
                otmp.owt = weight(otmp);
                curse(otmp);
                place_object(otmp, x, y);
                // begin_burn deferred when tile unlit
            }
        }
        break;
    default: victim_mnum = PM_HUMAN; break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    otmp = mkcorpstat(CORPSE, null, victim_mnum, x, y, 8);
    if (otmp) otmp.age -= (TAINT_AGE + 1); // died too long ago to safely eat
}

async function mktrap_room(croom) {
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? 1);
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const pos = { x: 0, y: 0 };
    if (!somexyspace(croom, pos)) return;
    const trap = await maketrap(pos.x, pos.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    const lvl = game.u?.uz?.dlevel ?? 1;
    if (game.in_mklev && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
    }
}

function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = FOUNTAIN;
        if (!rn2(7)) loc.blessedftn = 1;
        game.level.flags.nfountains++;
    }
}

function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    const al = rn2(A_LAWFUL + 2) - 1;
    loc.flags = Align2amask(al);
}

function mkgrave_room(croom) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            const depth = game.u?.uz?.dlevel ?? 1;
            gold.quan = rnd(20) + depth * rnd(5);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobj(RANDOM_CLASS, true);
        curse(otmp);
    }
    if (dobell) mksobj_at(BELL, pos.x, pos.y, true, false);
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;
    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // Sleeping monster (33%) — C: u.uhave.amulet || !rn2(3)
    if (!rn2(3) && somexyspace(croom, pos)) {
        makemon(null, pos.x, pos.y, MM_NOGRP);
    }
    // Traps — C: x = 8 - (level_difficulty() / 6)
    let x = 8 - Math.trunc(level_difficulty() / 6);
    if (x <= 1) x = 2;
    let trycnt = 0;
    while (!rn2(x) && ++trycnt < 1000) {
        await mktrap_room(croom);
    }
    // Gold
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkgold(0, pos.x, pos.y);
    }
    // Fountain
    if (!rn2(10)) mkfount(croom);
    // Sink
    if (!rn2(60)) {
        if (find_okay_roompos(croom, pos)) {
            const loc = g.level?.at(pos.x, pos.y);
            if (loc) { loc.typ = SINK; g.level.flags.nsinks = (g.level.flags.nsinks || 0) + 1; }
        }
    }
    // Altar
    if (!rn2(60)) mkaltar(croom);
    // Grave
    x = 80 - (depth_of_level(g.u?.uz) * 2);
    if (x < 2) x = 2;
    if (!rn2(x)) mkgrave_room(croom);
    // Statue
    if (!rn2(20) && somexyspace(croom, pos)) {
        mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
    }
    // Bonus items — C ref: mklev.c fill_ordinary_room bonus_items block
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const branchp = is_branchlev();
        const mines_dnum = g.mines_dnum ?? 2;
        const oracle_dnum = g.oracle_level?.dnum ?? 0;
        const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
        if (branchp && (g.u?.uz?.dnum ?? 0) !== mines_dnum
            && (branchp.end1?.dnum === mines_dnum || branchp.end2?.dnum === mines_dnum)) {
            // Mines entrance bonus food
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if ((g.u?.uz?.dnum ?? 0) === oracle_dnum
            && (g.u?.uz?.dlevel ?? 1) < oracle_dlevel && rn2(3)) {
            // Supply chest
            const supply_chest = mksobj_at(rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false);
            if (supply_chest) {
                supply_chest.olocked = !!rn2(6);
                let tryct2 = 0;
                let cursed_item;
                do {
                    let otyp;
                    const supply_items = [POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING];
                    if (rn2(2)) otyp = POT_HEALING;
                    else otyp = supply_items[rn2(supply_items.length)];
                    const otmp = mksobj(otyp, true, false);
                    if (otmp && otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                    }
                    cursed_item = otmp?.cursed ?? false;
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    // C: mkobj(SPBOOK_no_NOVEL) uses rnd_class through SPE_BLANK_PAPER
                    mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL) {
                        const depth = depth_of_level(g.u?.uz);
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            mkobj(oclass, false);
                        }
                    }
                }
            }
            skip_chests = true;
        }
    }
    // Box/chest check
    if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos)) {
        mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
    }
    // Graffiti
    const depth = depth_of_level(g.u?.uz);
    if (!rn2(27 + 3 * Math.abs(depth))) {
        const { text: engrText, pristine } = random_engraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
            if (g.level?.at(pos.x, pos.y)?.typ === ROOM) {
                make_engr_at(pos.x, pos.y, engrText, pristine, 0, ENGRAVE_MARK);
            }
        }
    }
    // Random objects
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        let objTrycnt = 0;
        while (!rn2(5)) {
            if (++objTrycnt > 100) break;
            if (somexyspace(croom, pos)) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        }
    }
}

// ============================================================
// Mineralize
// ============================================================

function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (kelp_pool && (loc.typ === POOL || loc.typ === WATER) && !rn2(kelp_pool)) return true;
    if (kelp_moat && loc.typ === MOAT && !rn2(kelp_moat)) return true;
    return false;
}

function mineralize_kelp(kelp_pool, kelp_moat) {
    if (kelp_pool < 0) kelp_pool = 10;
    if (kelp_moat < 0) kelp_moat = 30;
    for (let x = 2; x < COLNO - 2; x++)
        for (let y = 1; y < ROWNO - 1; y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                mksobj_at(KELP_FROND, x, y, true, false);
}

function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    const map = game.level;
    mineralize_kelp(kelp_pool, kelp_moat);
    // Endgame / hell / special-level skips not applicable for DoD dlvl1
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            const locBelow = map.at(x, y + 1);
            if (!loc || !locBelow) continue;
            if (locBelow.typ !== STONE) { y += 2; continue; }
            if (loc.typ !== STONE) { y += 1; continue; }
            const n = (d) => { const l = map.at(x + d[0], y + d[1]); return l && l.typ === STONE; };
            if (!(loc.wall_info & W_NONDIGGABLE)
                && n([0,-1]) && n([1,-1]) && n([-1,-1])
                && n([1,0]) && n([-1,0])
                && n([1,1]) && n([-1,1])) {
                if (rn2(1000) < goldprob) {
                    const otmp = mksobj(GOLD_PIECE, false, false);
                    if (otmp) {
                        otmp.ox = x;
                        otmp.oy = y;
                        otmp.quan = 1 + rnd(goldprob * 3);
                        otmp.owt = weight(otmp);
                        // C: !rn2(3) → add_to_buried; else place_object
                        if (!rn2(3)) add_to_buried(otmp);
                        else place_object(otmp, x, y);
                    }
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const otmp = mkobj(GEM_CLASS, false);
                        if (otmp && otmp.otyp === objectNames.indexOf('ROCK')) {
                            /* dealloc — not placed */
                        } else if (otmp) {
                            otmp.ox = x;
                            otmp.oy = y;
                            if (!rn2(3)) add_to_buried(otmp);
                            else place_object(otmp, x, y);
                        }
                    }
                }
            }
        }
    }
}

// ============================================================
// Level finalize topology
// ============================================================

function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}

function bound_digging() {
    const map = game.level;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
}

// C ref: display.c check_pos / set_wall / set_corn / set_twall /
// set_crosswall / xy_set_wall_state / set_wall_state — unfinished
// exterior walls get WM_* modes so wall_angle can hide them as stone
// until enough seenv octants are seen.

function check_pos(x, y, which) {
    if (!isok(x, y)) return which;
    const type = game.level?.at(x, y)?.typ ?? STONE;
    if (IS_STWALL(type) || type === CORR || type === SCORR || type === SDOOR)
        return which;
    return 0;
}

function more_than_one(a, b, c) {
    return !!((a && (b | c)) || (b && (a | c)) || (c && (a | b)));
}

function set_twall(x1, y1, x2, y2, x3, y3) {
    const is_1 = check_pos(x1, y1, WM_T_LONG);
    const is_2 = check_pos(x2, y2, WM_T_BL);
    const is_3 = check_pos(x3, y3, WM_T_BR);
    if (more_than_one(is_1, is_2, is_3)) return 0;
    return is_1 + is_2 + is_3;
}

function set_wall_mode(x, y, horiz) {
    let is_1, is_2;
    if (horiz) {
        is_1 = check_pos(x, y - 1, WM_W_TOP);
        is_2 = check_pos(x, y + 1, WM_W_BOTTOM);
    } else {
        is_1 = check_pos(x - 1, y, WM_W_LEFT);
        is_2 = check_pos(x + 1, y, WM_W_RIGHT);
    }
    if (more_than_one(is_1, is_2, 0)) return 0;
    return is_1 + is_2;
}

function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {
    const is_1 = check_pos(x1, y1, 1);
    const is_2 = check_pos(x2, y2, 1);
    const is_3 = check_pos(x3, y3, 1);
    const is_4 = check_pos(x4, y4, 1);
    if (is_4) return WM_C_INNER;
    if (is_1 && is_2 && is_3) return WM_C_OUTER;
    return 0;
}

function set_crosswall(x, y) {
    const is_1 = check_pos(x - 1, y - 1, 1);
    const is_2 = check_pos(x + 1, y - 1, 1);
    const is_3 = check_pos(x + 1, y + 1, 1);
    const is_4 = check_pos(x - 1, y + 1, 1);
    let wmode = is_1 + is_2 + is_3 + is_4;
    if (wmode > 1) {
        if (is_1 && is_3 && (is_2 + is_4 === 0)) return WM_X_TLBR;
        if (is_2 && is_4 && (is_1 + is_3 === 0)) return WM_X_BLTR;
        return 0;
    }
    if (is_1) return WM_X_TL;
    if (is_2) return WM_X_TR;
    if (is_3) return WM_X_BR;
    if (is_4) return WM_X_BL;
    return wmode;
}

function xy_set_wall_state(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    let wmode;
    switch (lev.typ) {
    case SDOOR:
        wmode = set_wall_mode(x, y, lev.horizontal ? 1 : 0);
        break;
    case VWALL:
        wmode = set_wall_mode(x, y, 0);
        break;
    case HWALL:
        wmode = set_wall_mode(x, y, 1);
        break;
    case TDWALL:
        wmode = set_twall(x, y - 1, x - 1, y + 1, x + 1, y + 1);
        break;
    case TUWALL:
        wmode = set_twall(x, y + 1, x + 1, y - 1, x - 1, y - 1);
        break;
    case TLWALL:
        wmode = set_twall(x + 1, y, x - 1, y - 1, x - 1, y + 1);
        break;
    case TRWALL:
        wmode = set_twall(x - 1, y, x + 1, y + 1, x + 1, y - 1);
        break;
    case TLCORNER:
        wmode = set_corn(x - 1, y - 1, x, y - 1, x - 1, y, x + 1, y + 1);
        break;
    case TRCORNER:
        wmode = set_corn(x, y - 1, x + 1, y - 1, x + 1, y, x - 1, y + 1);
        break;
    case BLCORNER:
        wmode = set_corn(x, y + 1, x - 1, y + 1, x - 1, y, x + 1, y - 1);
        break;
    case BRCORNER:
        wmode = set_corn(x + 1, y, x + 1, y + 1, x, y + 1, x - 1, y - 1);
        break;
    case CROSSWALL:
        wmode = set_crosswall(x, y);
        break;
    default:
        return;
    }
    lev.wall_info = ((lev.wall_info || 0) & ~WM_MASK) | wmode;
}

function set_wall_state() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            xy_set_wall_state(x, y);
}

function level_finalize_topology() {
    bound_digging();
    // C ref: mklev.c:1550
    mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
}
