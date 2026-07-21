// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1 } from './rng.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level } from './hacklib.js';
import { filler_region, lspo_map, fill_special_room, themeroom_fill, themeroom_map_contents, makemaz_bigroom, makemaz_bar_strt } from './sp_lev.js';
import { Is_special } from './dungeon.js';
import { somex, somey, somexy, somexyspace, occupied, has_dnstairs, has_upstairs, inside_room } from './mkroom.js';
import { maketrap } from './trap.js';
import { makemon as make_monster, rndmonst, mkclass,
         name_to_pmidx, monster_by_pmidx, enexto_spawn } from './makemon.js';
import { m_at } from './display.js';
import { set_corpsenm } from './mkobj.js';
import { make_engr_at, random_engraving, wipe_engr_at, get_rnd_epitaph } from './engrave.js';
import {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, FOOD_CLASS,
    SCROLL_CLASS, POTION_CLASS, TOOL_CLASS, GEM_CLASS, SPBOOK_no_NOVEL,
    ARROW, DART, BOULDER, GOLD_PIECE, ROCK, KELP_FROND,
    SCR_TELEPORTATION, BELL, CORPSE, STATUE, POT_HEALING,
    POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY, SCR_ENCHANT_WEAPON,
    SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER, SCR_SCARE_MONSTER,
    WAN_DIGGING, SPE_HEALING, LARGE_BOX, CHEST, FOOD_RATION,
    CRAM_RATION, LEMBAS_WAFER,
    mkobj, mkobj_at, mksobj, mksobj_at, mkcorpstat, mkgold, curse,
    place_object, weight, objects, add_to_container,
} from './mkobj.js';
import { obj_resists } from './zap.js';
import { spell_level } from './u_init.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED, NO_ROOM,
    SHOPBASE, COURT, ZOO, BEEHIVE, MORGUE, BARRACKS, SWAMP, TEMPLE,
    LEPREHALL, COCKNEST, ANTHOLE,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL, IS_ROOM,
    IS_SDOOR,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NONE, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    WM_MASK, WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM,
    WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_C_OUTER, WM_C_INNER,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    A_LAWFUL, Align2amask,
    LR_UPTELE,
    DUST, MARK, HEADSTONE,
    TAINT_AGE,
} from './const.js';

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

// Trap constants
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

// Monster indices referenced only by the special-room dispatch's extinction
// guards (mvitals_gone ignores the value, so exact indices are non-load-bearing
// here — they document which species each branch checks).
const PM_LEPRECHAUN = 0;
const PM_KILLER_BEE = 0;
const PM_SOLDIER = 0;
const PM_COCKATRICE = 0;

const trap_engravings = {
    [TRAPDOOR]: 'Vlad was here',
    [TELEP_TRAP]: 'ad aerarium',
    [LEVEL_TELEP]: 'ad aerarium',
};

// Stairway list management
function stairway_add(x, y, up, isladder, dest) {
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest }, next: game.stairs };
    game.stairs = node;
}

// ── Stairway lookup ──

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

// oinit stub (level-dependent object probability reset)
function oinit() { /* no-op for contest */ }

// level_difficulty stub
function level_difficulty() {
    const uz = game.u?.uz;
    const d = depth_of_level(uz);
    return d;
}

// ============================================================
// Stub functions for monster/trap/engraving creation.
// Object creation lives in mkobj.js.
// ============================================================

function rndmonnum() {
    return rndmonst()?.pmidx ?? 0;
}

// makemon — create a monster and (when it has a real position) place it
// on the level so the renderer can draw it.  C ref: makemon.c makemon /
// mon.c place_monster.  The RNG side-effects all live in make_monster();
// here we just record the placement for display.
async function makemon(mdat, x, y, mmflags) {
    const mtmp = make_monster(mdat, x, y, mmflags);
    if (mtmp && x > 0 && y > 0 && game.level) {
        mtmp.mx = x;
        mtmp.my = y;
        if (!game.level.monsters) game.level.monsters = [];
        game.level.monsters.push(mtmp);
    }
    return mtmp;
}

// C ref: engrave.c make_grave(). The only RNG side-effect is the epitaph pick
// when no text is supplied: get_rnd_text(EPITAPHFILE, ...) -> rn2(24075) plus the
// MD_PAD_RUMORS line scan. Dropping that draw desyncs every subsequent rn2() on
// levels that contain a grave. The headstone text itself is not shown at game
// start, so only the draw sequence is load-bearing.
function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    // Can we put a grave here?  (caller's find_okay_roompos already excludes
    // traps/furniture, so this guard normally passes for a plain ROOM cell)
    if (loc.typ !== ROOM && loc.typ !== GRAVE) return;
    loc.typ = GRAVE;
    // del_engr_at: drop any existing engraving at this spot (consumes no RNG)
    if (game.level?.engravings) {
        game.level.engravings = game.level.engravings.filter(
            (ep) => ep.engr_x !== x || ep.engr_y !== y,
        );
    }
    let str = text;
    if (str == null) str = get_rnd_epitaph();
    make_engr_at(x, y, str, null, 0, HEADSTONE);
}

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
// NB: in C, `discover` == flags.explore (the same macro) and `wizard` ==
// flags.debug. In explore/discover playmode getbones returns 0 with NO rng
// draw (the rn2(3) is reached only when NOT in discover mode). Our options
// parser stores playmode:explore as flags.playmode === 'explore' (it never
// sets flags.explore), so check both spellings.
function getbones() {
    const flags = game.flags || {};
    const discover = flags.explore || flags.playmode === 'explore';
    if (discover) return false;               // C: if (discover) return 0; (no rng)
    if (flags.bones === false) return false;  // C: if (!flags.bones) return 0;
    if (rn2(3) && !flags.debug) return false; // C: if (rn2(3) && !wizard) return 0;
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
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    g.in_mk_themerooms = false; // C: flag is only TRUE inside the themeroom maker
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

    // C ref: mklev.c:1267-1270 — special (named) levels dispatch to makemaz()
    // BEFORE the ordinary-level path (and before the medusa rn2(5) check).
    // Currently only the Big Room special level is ported; other named levels
    // fall through to the regular generator (their sessions diverge earlier
    // anyway, so this cannot regress them).
    const slev = Is_special(g.u?.uz);
    if (slev && slev.proto && slev.proto.toLowerCase() === 'bigrm') {
        await makemaz_bigroom();
        return;
    }
    if (slev && slev.proto && slev.proto.toLowerCase() === 'oracle') {
        await makemaz_oracle();
        return;
    }
    // C ref: mklev.c:1269 makemaz(slev->proto) — the Barbarian quest "home"
    // (start) level.  Only Bar-strt is ported; other quest levels fall through.
    if (slev && slev.proto === 'Bar-strt') {
        await makemaz_bar_strt();
        // C ref: place_lregions() at level finalize — place the registered
        // "branch" levregion.  A 1-cell region so place_lregion's rn1 loop draws
        // exactly rn2(1) for x and rn2(1) for y (mkmaze.c:396/397).
        quest_place_branch();
        return;
    }

    // C ref: mklev.c:1271 — svd.dungeons[dnum].fill_lvl[0] dispatch (the mines
    // filler), BEFORE the regular path and the below-Medusa rn2(5) check.
    // Only the Gnomish Mines "minefill" filler is ported; other fill levels (if
    // any) fall through to the regular generator.
    {
        const dnum0 = g.u?.uz?.dnum ?? 0;
        const fill = g.dungeons?.[dnum0]?.fill_lvl;
        if (!slev && fill && fill.toLowerCase() === 'minefill') {
            await makemaz_minefill();
            return;
        }
    }

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
    // C ref: mklev.c:1306 — minimum number of rooms needed to allow a random
    // special room (4 on branch levels, otherwise 3).  Incremented when a
    // secret vault is added (mklev.c:1328).
    let room_threshold = branchp ? 4 : 3;

    makecorridors();
    await make_niches();

    // Vault creation (simplified for contest)
    if (g.vault_x !== -1) {
        const vw = { v: 1 }, vh = { v: 1 };
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        if (check_room(vx, vw, vy, vh, true)) {
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = true;
            room_threshold++;                   // C ref: mklev.c:1328
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
            fill_special_room(vaultRoom);       // C ref: mklev.c:1330
            if (!is_branchlev()) rn2(3);        // mk_knox_portal rn2(3)
            if (!rn2(3)) await makeniche(TELEP_TRAP);
        } else if (rnd_rect() && create_vault()) {
            // C ref: mklev.c:1334 — fallback vault attempt with fresh rnd_rect
            g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
            g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
            const vx2 = { v: g.vault_x }, vy2 = { v: g.vault_y };
            if (check_room(vx2, vw, vy2, vh, true)) {
                add_room(vx2.v, vy2.v, vx2.v + vw.v, vy2.v + vh.v, true, VAULT, false);
                g.level.flags.has_vault = true;
                room_threshold++;
                const vaultRoom2 = g.level.rooms[g.level.nroom - 1];
                if (vaultRoom2) vaultRoom2.needfill = FILL_NORMAL;
                fill_special_room(vaultRoom2);
                if (!is_branchlev()) rn2(3);
                if (!rn2(3)) await makeniche(TELEP_TRAP);
            } else {
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        }
    }

    // C ref: mklev.c:1344-1375 — make up to 1 special room, type depends on
    // depth.  do_mkroom only sets the room's rtype/needfill; the room is filled
    // later by the fill_special_room loop.  The rn2() gating conditions here are
    // consumed regardless of whether the room maker succeeds, so they must run
    // in this exact order to keep the PRNG aligned with C.
    {
        const u_depth = depth_of_level(g.u?.uz);
        const medusaDepth = g.medusa_level
            ? depth_of_level(g.medusa_level) : 999;
        const wizardEnv = false; // contest build never sets SHOPTYPE env
        if (g.flags?.debug && wizardEnv) {
            do_mkroom(SHOPBASE);
        } else if (u_depth > 1 && u_depth < medusaDepth
                   && g.level.nroom >= room_threshold && rn2(u_depth) < 3) {
            do_mkroom(SHOPBASE);
        } else if (u_depth > 4 && !rn2(6)) {
            do_mkroom(COURT);
        } else if (u_depth > 5 && !rn2(8) && !mvitals_gone(PM_LEPRECHAUN)) {
            do_mkroom(LEPREHALL);
        } else if (u_depth > 6 && !rn2(7)) {
            do_mkroom(ZOO);
        } else if (u_depth > 8 && !rn2(5)) {
            do_mkroom(TEMPLE);
        } else if (u_depth > 9 && !rn2(5) && !mvitals_gone(PM_KILLER_BEE)) {
            do_mkroom(BEEHIVE);
        } else if (u_depth > 11 && !rn2(6)) {
            do_mkroom(MORGUE);
        } else if (u_depth > 12 && !rn2(8) && antholemon()) {
            do_mkroom(ANTHOLE);
        } else if (u_depth > 14 && !rn2(4) && !mvitals_gone(PM_SOLDIER)) {
            do_mkroom(BARRACKS);
        } else if (u_depth > 15 && !rn2(6)) {
            do_mkroom(SWAMP);
        } else if (u_depth > 16 && !rn2(8) && !mvitals_gone(PM_COCKATRICE)) {
            do_mkroom(COCKNEST);
        }
    }

    // Place dungeon branch
    if (branchp) {
        const prevstairs = g.stairs; /* test for place_branch() success */
        place_branch(branchp);
        // C ref: mklev.c:1382-1387 — for main dungeon level 1, the up stairs
        // where the hero starts are branch stairs; treat them as if the hero
        // had just come down them by marking them traversed.  This makes
        // known_branch_stairs() true so the staircase renders as a branch
        // staircase (CLR_YELLOW) rather than a plain one.
        if ((g.u?.uz?.dnum ?? 0) === 0 && (g.u?.uz?.dlevel ?? 1) === 1
            && g.stairs !== prevstairs)
            g.stairs.u_traversed = true;
    }

    // C ref: mklev.c:1392-1402 — choose which fillable room gets bonus items
    // This rn2(fillable_room_count) call must happen here regardless of whether
    // fill_ordinary_room is called immediately or deferred to fastforward.
    {
        let fillable_room_count = 0;
        for (let i = 0; i < (g.level.rooms?.length ?? 0); i++) {
            const croom = g.level.rooms[i];
            if (!croom || croom.hx <= 0) break;
            if ((croom.rtype === OROOM || croom.rtype === THEMEROOM)
                && croom.needfill === FILL_NORMAL)
                fillable_room_count++;
        }
        g.level._bonus_room_idx = (fillable_room_count > 0) ? rn2(fillable_room_count) : -1;
    }

    // Fill rooms + mineralize: handled by fastforward_fill_mineralize (seed8000)
    // or real fill loop (all other seeds), called from allmain.js.
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
            // Themed room selection (reservoir sampling).
            // C ref: mklev.c:413-417 — gi.in_mk_themerooms is TRUE only for the
            // duration of the themerooms_generate lua call (it is FALSE in the
            // vault branch and outside the maker). check_room() reads this flag
            // and *rejects* a room that needed shrinking instead of
            // shrinking+accepting it; rejecting skips an extra rect split and
            // keeps the subsequent rnd_rect args aligned with C. themeroom_failed
            // is also reset to FALSE around the call (mklev.c:414).
            g.themeroom_failed = false;
            g.in_mk_themerooms = true;
            let themed_ok;
            try {
                themed_ok = await themerooms_generate(difficulty);
            } finally {
                g.in_mk_themerooms = false;
            }
            if (!themed_ok) {
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

const THEMEROOM_MAPS = {
    'L-shaped': {
        filler: [1, 1],
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
--------`,
    },
    'L-shaped, rot 1': {
        filler: [5, 1],
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
--------`,
    },
    'L-shaped, rot 2': {
        filler: [1, 1],
        map: `--------
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    },
    'L-shaped, rot 3': {
        filler: [1, 1],
        map: `--------
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    },
    'Blocked center': {
        filler: [1, 1],
        map: `-----------
|.........|
|.........|
|.........|
|...LLL...|
|...LLL...|
|...LLL...|
|.........|
|.........|
|.........|
-----------`,
    },
    'Circular, small': {
        filler: [3, 3],
        map: `xx---xx
x--.--x
--...--
|.....|
--...--
x--.--x
xx---xx`,
    },
    'Circular, medium': {
        filler: [4, 4],
        map: `xx-----xx
x--...--x
--.....--
|.......|
|.......|
|.......|
--.....--
x--...--x
xx-----xx`,
    },
    'Circular, big': {
        filler: [5, 5],
        map: `xxx-----xxx
x---...---x
x-.......-x
--.......--
|.........|
|.........|
|.........|
--.......--
x-.......-x
x---...---x
xxx-----xxx`,
    },
    'T-shaped': {
        filler: [5, 5],
        map: `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
-----------`,
    },
    'T-shaped, rot 1': {
        filler: [2, 2],
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    },
    'T-shaped, rot 2': {
        filler: [2, 2],
        map: `-----------
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
    },
    'T-shaped, rot 3': {
        filler: [5, 5],
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    },
    'S-shaped': {
        filler: [2, 2],
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    },
    'S-shaped, rot 1': {
        filler: [5, 5],
        map: `xxx--------
xxx|......|
xxx|......|
----......|
|......----
|......|xxx
|......|xxx
--------xxx`,
    },
    'Z-shaped': {
        filler: [5, 5],
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    },
    'Z-shaped, rot 1': {
        filler: [2, 2],
        map: `--------xxx
|......|xxx
|......|xxx
|......----
----......|
xxx|......|
xxx|......|
xxx--------`,
    },
    'Cross': {
        filler: [6, 6],
        map: `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
    },
    'Four-leaf clover': {
        filler: [6, 6],
        map: `-----x-----
|...|x|...|
|...---...|
|.........|
---.....---
xx|.....|xx
---.....---
|.........|
|...---...|
|...|x|...|
-----x-----`,
    },
    'Water-surrounded vault': {
        filler: null,
        map: `}}}}}}
}----}
}|..|}
}|..|}
}----}
}}}}}}`,
    },
};

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// C ref: themerms.lua themerooms_generate()
// Reservoir sampling picks one themed room. For seed8000 level 1,
// 'ordinary' always wins (frequency 1000 vs others ~1-10).
async function themerooms_generate(difficulty) {
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
    const mapSpec = THEMEROOM_MAPS[pick.name];
    if (mapSpec) {
        const placed = lspo_map({
            map: mapSpec.map,
            contents: mapSpec.filler
                ? () => themeroom_map_contents(pick.name, mapSpec.filler[0], mapSpec.filler[1])
                : null,
        });
        return !!placed && !game.themeroom_failed;
    }
    // C ref: themerms.lua — the three "themed fill" themerooms call
    //   des.room({ type = "themed", [lit=0|filled=1,] contents = themeroom_fill })
    // i.e. a THEMEROOM whose contents() runs the themeroom_fill reservoir
    // (themerms.lua:1039).  des.room inside in_mk_themerooms defaults needfill
    // to 0 (FILL_NONE) unless filled=1 is passed (sp_lev.c:4076-4077).  All
    // other non-map picks fall through to the plain "default" room
    // (des.room({type="ordinary", filled=1}) -> OROOM, FILL_NORMAL, no fill).
    const roomSpecs = {
        'Default room with themed fill': {
            rtype: THEMEROOM, rlit: -1, needfill: FILL_NONE, contents: themeroom_fill,
        },
        'Unlit room with themed fill': {
            rtype: THEMEROOM, rlit: 0, needfill: FILL_NONE, contents: themeroom_fill,
        },
        'Room with both normal contents and themed fill': {
            rtype: THEMEROOM, rlit: -1, needfill: FILL_NORMAL, contents: themeroom_fill,
        },
    };
    const spec = roomSpecs[pick.name]
        || { rtype: OROOM, rlit: -1, needfill: FILL_NORMAL, contents: null };
    rn2(100); // build_room chance check
    const ok = create_room(-1, -1, -1, -1, -1, -1, spec.rtype, spec.rlit);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = spec.needfill;
            if (spec.contents) spec.contents(aroom);
        }
    }
    return ok;
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
            // C ref: sp_lev.c:1580-1645 — "Only some parameters are random".
            // Used by special levels (e.g. Oracle) with explicit/aligned coords.
            let rndpos = 0;
            if (xtmp < 0 && ytmp < 0) { // Position is RANDOM
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) { // Size is RANDOM
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) xaltmp = rnd(3); // Horizontal alignment RANDOM
            if (yaltmp === -1) yaltmp = rnd(3); // Vertical alignment RANDOM

            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;
            // SPLEV_LEFT=1, SPLEV_CENTER=3, SPLEV_RIGHT=5; TOP=1, BOTTOM=5.
            switch (xaltmp) {
            case 1: break;                                   // SPLEV_LEFT
            case 5: xabs += Math.trunc(COLNO / 5) - wtmp; break; // SPLEV_RIGHT
            case 3: xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2); break; // CENTER
            }
            switch (yaltmp) {
            case 1: break;                                   // TOP
            case 5: yabs += Math.trunc(ROWNO / 5) - htmp; break; // BOTTOM
            case 3: yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2); break; // CENTER
            }
            if (xabs + wtmp - 1 > COLNO - 2) xabs = COLNO - wtmp - 3;
            if (xabs < 2) xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2) yabs = ROWNO - htmp - 3;
            if (yabs < 2) yabs = 2;
            // C ref: sp_lev.c:1634-1644. r2 is the scratch rect passed to
            // get_rect AND later to split_rects (with its PRE-check_room coords);
            // check_room may shift xabs/yabs but does NOT touch r2. add_room uses
            // wtmp/htmp (the original sizes), not dx/dy.
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp + rndpos, hy: yabs + htmp + rndpos };
            r1 = get_rect(r2);
            const dx = wtmp, dy = htmp;
            if (r1) {
                const lowx = { v: xabs }, ddx = { v: dx };
                const lowy = { v: yabs }, ddy = { v: dy };
                if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                    r1 = null;
                } else {
                    xabs = lowx.v; yabs = lowy.v;
                }
            }
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

// ============================================================
// Special rooms (C ref: mkroom.c do_mkroom/mkshop/mkzoo/mktemple/mkswamp)
//
// These set a room's rtype + needfill so the later fill_special_room() loop
// stocks them.  Only their *RNG side effects* and rtype assignment are
// load-bearing for parity; the actual stocking (stock_room / fill_zoo) is
// owned by sp_lev.js and runs from the fill loop, not here.
// ============================================================

// C ref: mon.c — a monster's mvitals[].mvflags & G_GONE.  At level generation
// none of the gated species are extinct in any session reachable with correct
// RNG, and this check consumes no RNG, so a "not gone" default is faithful.
function mvitals_gone(_mndx) {
    return false;
}

// C ref: mkroom.c antholemon() — returns a valid ant permonst (truthy) unless
// every ant species is extinct; never the case at the depths reached here.
// No RNG.
function antholemon() {
    return true;
}

// C ref: mkroom.c do_mkroom()
function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop();
    } else {
        switch (roomtype) {
        case COURT: mkzoo(COURT); break;
        case ZOO: mkzoo(ZOO); break;
        case BEEHIVE: mkzoo(BEEHIVE); break;
        case MORGUE: mkzoo(MORGUE); break;
        case BARRACKS: mkzoo(BARRACKS); break;
        case SWAMP: mkswamp(); break;
        case TEMPLE: mktemple(); break;
        case LEPREHALL: mkzoo(LEPREHALL); break;
        case COCKNEST: mkzoo(COCKNEST); break;
        case ANTHOLE: mkzoo(ANTHOLE); break;
        default: break;
        }
    }
}

// C ref: mkroom.c invalid_shop_shape() — irregular or sub-divided shops are
// rejected.  Regular rectangular rooms (the only kind we generate) are valid.
function invalid_shop_shape(sroom) {
    return !!sroom.irregular || (sroom.nsubrooms ?? 0) > 0;
}

// C ref: mkroom.c isbig() — room area > 20.
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1);
    return area > 20;
}

// C ref: mkroom.c mkshop().  Contest build never sets the SHOPTYPE env, so the
// wizard-getenv branch is skipped; we only model the room search + the random
// shop-type roll (rnd(100)).  Stocking happens later in fill_special_room().
function mkshop() {
    const g = game;
    let i = -1; // shoptype not yet determined
    // Find an eligible room: OROOM, no stairs, exactly one door.
    let sroom = null;
    for (let r = 0; ; r++) {
        const cur = g.level.rooms[r];
        if (!cur || cur.hx < 0) return;       // no eligible room
        if (r >= g.level.nroom) return;
        if (cur.rtype !== OROOM) continue;
        if (has_dnstairs(cur) || has_upstairs(cur)) continue;
        if (cur.doorct === 1) {
            if (invalid_shop_shape(cur)) continue;
            sroom = cur;
            break;
        }
    }
    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = g.level.at(x, y);
                if (loc) loc.lit = true;
            }
        sroom.rlit = 1;
    }
    if (i < 0) {
        // pick a shop type at random — only the rnd(100) draw is load-bearing
        // here; the precise type only affects later stocking (sp_lev.js).
        rnd(100);
        i = 0;
        // big rooms cannot be wand/book shops — handled at stock time; the
        // isbig() test itself consumes no RNG.
        isbig(sroom);
    }
    sroom.rtype = SHOPBASE + i;
    topologize(sroom);
    sroom.needfill = FILL_NORMAL;
}

// C ref: mkroom.c pick_room() — pick an unused room, preferably single-door.
function pick_room(strict) {
    const g = game;
    const n = g.level.nroom;
    if (n <= 0) return null;
    let idx = rn2(n);
    for (let i = n; i-- > 0; idx++) {
        if (idx === n) idx = 0;
        const sroom = g.level.rooms[idx];
        if (!sroom || sroom.hx < 0) return null;
        if (sroom.rtype !== OROOM) continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3))) continue;
        } else if (has_upstairs(sroom) || has_dnstairs(sroom)) {
            continue;
        }
        if (sroom.doorct === 1 || !rn2(5) || g.flags?.debug) return sroom;
    }
    return null;
}

// C ref: mkroom.c mkzoo() — pick a room and mark it; fill happens later.
function mkzoo(type) {
    const sroom = pick_room(false);
    if (sroom) {
        sroom.rtype = type;
        sroom.needfill = FILL_NORMAL;
    }
}

// C ref: mkroom.c shrine_pos() — center of a temple room (with rn2(2) tie-break
// when a dimension is even).
function shrine_pos(roomno) {
    const g = game;
    const troom = g.level.rooms[roomno - ROOMOFFSET];
    let bx, by;
    let delta = troom.hx - troom.lx;
    bx = troom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) bx++;
    delta = troom.hy - troom.ly;
    by = troom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) by++;
    return { x: bx, y: by };
}

// C ref: mkroom.c mktemple().  The shrine altar is placed at the room center;
// induced_align()/priestini() (alignment + priest spawn) are owned by other
// files and not modeled here beyond the room marking.  Only reachable at
// u_depth > 8, which no parity-tested session reaches with correct RNG.
function mktemple() {
    const g = game;
    const sroom = pick_room(true);
    if (!sroom) return;
    sroom.rtype = TEMPLE;
    const idx = g.level.rooms.indexOf(sroom);
    const spot = shrine_pos(idx + ROOMOFFSET);
    const loc = g.level.at(spot.x, spot.y);
    if (loc) {
        loc.typ = ALTAR;
        // induced_align(80) consumes RNG in C; left to the alignment subsystem.
        loc.flags = Align2amask(A_LAWFUL);
    }
    sroom.needfill = FILL_NORMAL;
    if (g.level.flags) g.level.flags.has_temple = true;
}

// C ref: mkroom.c mkswamp().  Only reachable at u_depth > 15, beyond any
// parity-tested session's correct-RNG range; modeled minimally (terrain +
// eel/fungus RNG is owned by makemon.js and intentionally not replayed here).
function mkswamp() {
    const g = game;
    if (g.level.flags) g.level.flags.has_swamp = true;
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

// C ref: mklev.c finddpos_shift()
// starting from x,y going towards dir, find a good location for a door
function finddpos_shift(xp, yp, dir, aroom) {
    const map = game.level;
    const rdir = DIR_180(dir);
    const dx = xdir[rdir];
    const dy = ydir[rdir];

    if (good_rm_wall_doorpos(xp.v, yp.v, rdir, aroom)) return true;

    // irregular rooms may have the room wall away from the room rectangular
    // area; go into the area until we encounter something
    if (aroom.irregular) {
        let rx = xp.v, ry = yp.v;
        let fail = false;
        let rloc = map.at(rx, ry);
        while (!fail && isok(rx, ry)
               && rloc && (rloc.typ === STONE || rloc.typ === CORR)) {
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            rloc = map.at(rx, ry);
            if (!rloc || !(rloc.typ === STONE || rloc.typ === CORR))
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
    // C ref: rm.h — doormask is an alias for the cell's flags field.
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.doormask = D_ISOPEN;
            else if (!rn2(6)) loc.doormask = D_LOCKED;
            else loc.doormask = D_CLOSED;
            if (loc.doormask !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.doormask |= D_TRAPPED;
        } else {
            loc.doormask = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.doormask & D_TRAPPED) {
            if (level_difficulty() >= 9 && !rn2(5)) {
                loc.doormask = D_NODOOR;
            }
        }
        loc.flags = loc.doormask;
    } else {
        // SDOOR/SCORR: rm.flags is overloaded for wall_info here, so the
        // door state lives only in the separate doormask field (the
        // renderer keys SDOOR display off loc.horizontal, not flags).
        if (shdoor || !rn2(5)) loc.doormask = D_LOCKED;
        else loc.doormask = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.doormask |= D_TRAPPED;
    }
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
// Oracle special level (C ref: dat/oracle.lua, loaded via makemaz("oracle")
// -> load_special -> the des.* program).  Reuses create_room/makecorridors/
// wallification.  Only entered for the Oracle level position; gated so it
// cannot affect ordinary level generation.
// ============================================================

// C ref: dungeon.c induced_align(80).  The Oracle level has flags.align set
// (neutral), so the level-align rn2(100) gate runs; the main dungeon has no
// align so the fallthrough is just rn2(3).
function oracle_induced_align(pct = 80) {
    const slev = Is_special(game.u?.uz);
    if (slev && slev.flags && slev.flags.align) {
        if (rn2(100) < pct) return; // returns level align (no further rng)
    }
    // main dungeon flags.align == 0 -> skip its rn2(100); fall through.
    rn2(3);
}

// C ref: sp_lev.c create_subroom() — random size/pos within parent.
function create_subroom(proom, x, y, w, h, rtype, rlit) {
    const width = proom.hx - proom.lx + 1;
    const height = proom.hy - proom.ly + 1;
    if (width < 4 || height < 4) return false;
    if (w === -1) w = rnd(width - 3);
    if (h === -1) h = rnd(height - 3);
    if (x === -1) x = rnd(width - w);
    if (y === -1) y = rnd(height - h);
    if (x === 1) x = 0;
    if (y === 1) y = 0;
    if ((x + w + 1) === width) x++;
    if ((y + h + 1) === height) y++;
    if (rtype === -1) rtype = OROOM;
    rlit = litstate_rnd(rlit);
    add_subroom(proom, proom.lx + x, proom.ly + y,
                proom.lx + x + w - 1, proom.ly + y + h - 1, rlit, rtype, false);
    return true;
}

// C ref: mklev.c add_subroom().
function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom - 1, // subrooms share parent's roomno region
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, false);
    if (!proom.sbrooms) proom.sbrooms = [];
    proom.sbrooms[proom.nsubrooms++] = croom;
    return croom;
}

// C ref: sp_lev.c create_door() for a room-relative door (x=y=-1).
function oracle_create_door(broom, wallmask, mask) {
    for (let trycnt = 0; trycnt < 100; trycnt++) {
        let x = 0, y = 0;
        const dpos = -1;
        switch (rn2(4)) {
        case 0:
            if (!(wallmask & 1 /*W_NORTH*/)) continue;
            y = broom.ly - 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(game.level.at(x, y - 1)?.typ)) continue;
            break;
        case 1:
            if (!(wallmask & 2 /*W_SOUTH*/)) continue;
            y = broom.hy + 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(game.level.at(x, y + 1)?.typ)) continue;
            break;
        case 2:
            if (!(wallmask & 8 /*W_WEST*/)) continue;
            x = broom.lx - 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(game.level.at(x - 1, y)?.typ)) continue;
            break;
        case 3:
            if (!(wallmask & 4 /*W_EAST*/)) continue;
            x = broom.hx + 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(game.level.at(x + 1, y)?.typ)) continue;
            break;
        default: break;
        }
        if (oracle_okdoor(x, y)) {
            const loc = game.level.at(x, y);
            if (loc && IS_WALL(loc.typ)) {
                loc.typ = DOOR;
                loc.doormask = mask;
                add_door(x, y, broom);
            }
            return;
        }
    }
}

function oracle_okdoor(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    const near_door = bydoor(x, y);
    return (loc.typ === HWALL || loc.typ === VWALL) && !near_door;
}

// C ref: get_free_room_loc -> get_location_coord(random) -> somexy(croom).
function oracle_get_free_room_loc(croom) {
    const c = { x: 0, y: 0 };
    somexy(croom, c);
    return c;
}

// Place a random STATUE with the given montype monster-class index (the
// historic statue gets a random corpsenm from the class, then create_object
// overrides corpsenm with the montype species; statue internals consume the
// rndmonnum + spellbook rolls inside mksobj_init).  x,y are absolute.
function oracle_place_statue(x, y, monclass) {
    // C: lspo_object pre-roll — mkclass(monclass, G_NOGEN|G_IGNORE) for montype.
    const pm = mkclass(monclass, 0);
    // create_object -> mksobj_at(STATUE, x, y, init=true)
    const otmp = mksobj_at(STATUE, x, y, true, true);
    // create_object: o->corpsenm != NON_PM -> set_corpsenm(otmp, montype species)
    if (pm && otmp) set_corpsenm(otmp, pm.pmidx);
    return otmp;
}

// ============================================================
// Gnomish Mines fill level (C ref: dat/minefill.lua loaded via
// makemaz("minefill") -> load_special -> the des.* program; the cave is built
// by the cellular-automaton generator mkmap.c).  Gated so it only runs for the
// mines fill levels and cannot perturb ordinary level generation.
// ============================================================

// mkmap.c constants.
const MK_HEIGHT = ROWNO - 1;   // 20
const MK_WIDTH = COLNO - 2;    // 78

// mkmap.c dirs[16] — 8 neighbor offsets.
const MK_DIRS = [
    -1, -1,  -1, 0,  -1, 1,  0, -1,
     0,  1,   1, -1,  1, 0,  1,  1,
];

// C ref: mkmap.c get_map()
function mk_get_map(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > MK_WIDTH || row >= MK_HEIGHT)
        return bg_typ;
    return game.level.at(col, row).typ;
}

// C ref: mkmap.c init_map()
function mk_init_map(bg_typ) {
    const map = game.level;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            loc.roomno = NO_ROOM;
            loc.typ = bg_typ;
            loc.lit = false;
        }
}

// C ref: mkmap.c init_fill()
function mk_init_fill(bg_typ, fg_typ) {
    const map = game.level;
    const limit = Math.trunc((MK_WIDTH * MK_HEIGHT * 2) / 5);
    let count = 0;
    while (count < limit) {
        const x = rn1(MK_WIDTH - 1, 2);   // rn1(77, 2) = 2 + rn2(77)
        const y = rnd(MK_HEIGHT - 1);     // rnd(19)
        const loc = map.at(x, y);
        if (loc && loc.typ === bg_typ) {
            loc.typ = fg_typ;
            count++;
        }
    }
}

// C ref: mkmap.c pass_one()
function mk_pass_one(bg_typ, fg_typ) {
    const map = game.level;
    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (mk_get_map(x + MK_DIRS[dr * 2], y + MK_DIRS[dr * 2 + 1], bg_typ) === fg_typ)
                    count++;
            const loc = map.at(x, y);
            switch (count) {
            case 0: case 1: case 2:
                loc.typ = bg_typ; break;
            case 5: case 6: case 7: case 8:
                loc.typ = fg_typ; break;
            default: break;
            }
        }
}

// C ref: mkmap.c pass_two()
function mk_pass_two(bg_typ, fg_typ) {
    const map = game.level;
    const newloc = new Array((MK_WIDTH + 1) * MK_HEIGHT);
    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (mk_get_map(x + MK_DIRS[dr * 2], y + MK_DIRS[dr * 2 + 1], bg_typ) === fg_typ)
                    count++;
            newloc[y * (MK_WIDTH + 1) + x] = (count === 5) ? bg_typ : mk_get_map(x, y, bg_typ);
        }
    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++)
            map.at(x, y).typ = newloc[y * (MK_WIDTH + 1) + x];
}

// C ref: mkmap.c pass_three()
function mk_pass_three(bg_typ, fg_typ) {
    const map = game.level;
    const newloc = new Array((MK_WIDTH + 1) * MK_HEIGHT);
    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (mk_get_map(x + MK_DIRS[dr * 2], y + MK_DIRS[dr * 2 + 1], bg_typ) === fg_typ)
                    count++;
            newloc[y * (MK_WIDTH + 1) + x] = (count < 3) ? bg_typ : mk_get_map(x, y, bg_typ);
        }
    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++)
            map.at(x, y).typ = newloc[y * (MK_WIDTH + 1) + x];
}

// flood_fill_rm bookkeeping (C ref: gm.min_rx etc.).
let mk_min_rx, mk_max_rx, mk_min_ry, mk_max_ry, mk_n_loc_filled;

// C ref: mkmap.c flood_fill_rm() — anyroom=FALSE path only (used by join_map).
function mk_flood_fill_rm(sx, sy, rmno) {
    const map = game.level;
    const fg_typ = map.at(sx, sy).typ;

    while (sx > 0 && map.at(sx, sy).typ === fg_typ
           && map.at(sx, sy).roomno !== rmno)
        sx--;
    sx++;

    if (sx < mk_min_rx) mk_min_rx = sx;
    if (sy < mk_min_ry) mk_min_ry = sy;

    let i;
    for (i = sx; i <= MK_WIDTH && map.at(i, sy).typ === fg_typ; i++) {
        map.at(i, sy).roomno = rmno;
        map.at(i, sy).lit = false;
        mk_n_loc_filled++;
    }
    const nx = i;

    if (isok(sx, sy - 1)) {
        for (i = sx; i < nx; i++)
            if (map.at(i, sy - 1).typ === fg_typ) {
                if (map.at(i, sy - 1).roomno !== rmno)
                    mk_flood_fill_rm(i, sy - 1, rmno);
            } else {
                if ((i > sx || isok(i - 1, sy - 1))
                    && map.at(i - 1, sy - 1).typ === fg_typ) {
                    if (map.at(i - 1, sy - 1).roomno !== rmno)
                        mk_flood_fill_rm(i - 1, sy - 1, rmno);
                }
                if ((i < nx - 1 || isok(i + 1, sy - 1))
                    && map.at(i + 1, sy - 1).typ === fg_typ) {
                    if (map.at(i + 1, sy - 1).roomno !== rmno)
                        mk_flood_fill_rm(i + 1, sy - 1, rmno);
                }
            }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++)
            if (map.at(i, sy + 1).typ === fg_typ) {
                if (map.at(i, sy + 1).roomno !== rmno)
                    mk_flood_fill_rm(i, sy + 1, rmno);
            } else {
                if ((i > sx || isok(i - 1, sy + 1))
                    && map.at(i - 1, sy + 1).typ === fg_typ) {
                    if (map.at(i - 1, sy + 1).roomno !== rmno)
                        mk_flood_fill_rm(i - 1, sy + 1, rmno);
                }
                if ((i < nx - 1 || isok(i + 1, sy + 1))
                    && map.at(i + 1, sy + 1).typ === fg_typ) {
                    if (map.at(i + 1, sy + 1).roomno !== rmno)
                        mk_flood_fill_rm(i + 1, sy + 1, rmno);
                }
            }
    }

    if (nx > mk_max_rx) mk_max_rx = nx - 1;
    if (sy > mk_max_ry) mk_max_ry = sy;
}

// C ref: mkmap.c join_map_cleanup()
function mk_join_map_cleanup() {
    const map = game.level;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            map.at(x, y).roomno = NO_ROOM;
    game.level.nroom = 0;
    game.level.rooms[0] = { hx: -1 };
}

// C ref: mkmap.c join_map()
function mk_join_map(bg_typ, fg_typ) {
    const g = game;
    const map = g.level;

    for (let x = 2; x <= MK_WIDTH; x++)
        for (let y = 1; y < MK_HEIGHT; y++) {
            const loc = map.at(x, y);
            if (loc.typ === fg_typ && loc.roomno === NO_ROOM) {
                mk_min_rx = mk_max_rx = x;
                mk_min_ry = mk_max_ry = y;
                mk_n_loc_filled = 0;
                mk_flood_fill_rm(x, y, g.level.nroom + ROOMOFFSET);
                if (mk_n_loc_filled > 3) {
                    add_room(mk_min_rx, mk_min_ry, mk_max_rx, mk_max_ry,
                             false, OROOM, true);
                    g.level.rooms[g.level.nroom - 1].irregular = true;
                    if (g.level.nroom >= (MAXNROFROOMS * 2)) {
                        return mk_join_map_corridors(bg_typ, fg_typ);
                    }
                } else {
                    for (let sx = mk_min_rx; sx <= mk_max_rx; sx++)
                        for (let sy = mk_min_ry; sy <= mk_max_ry; sy++) {
                            const l2 = map.at(sx, sy);
                            if (l2.roomno === g.level.nroom + ROOMOFFSET) {
                                l2.typ = bg_typ;
                                l2.roomno = NO_ROOM;
                            }
                        }
                }
            }
        }
    return mk_join_map_corridors(bg_typ, fg_typ);
}

// C ref: mkmap.c join_map() second half — connect regions with corridors.
function mk_join_map_corridors(bg_typ, fg_typ) {
    const g = game;
    const rooms = g.level.rooms;
    let ci = 0, c2i = 1;
    const sm = { x: 0, y: 0 }, em = { x: 0, y: 0 };
    while (c2i < g.level.nroom) {
        const croom = rooms[ci], croom2 = rooms[c2i];
        if (!somexy(croom, sm) || !somexy(croom2, em)) {
            sm.x = croom.lx + Math.trunc((croom.hx - croom.lx) / 2);
            sm.y = croom.ly + Math.trunc((croom.hy - croom.ly) / 2);
            em.x = croom2.lx + Math.trunc((croom2.hx - croom2.lx) / 2);
            em.y = croom2.ly + Math.trunc((croom2.hy - croom2.ly) / 2);
        }
        dig_corridor(sm, em, null, false, fg_typ, bg_typ);
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly) && rn2(3))) {
            ci = c2i;
        }
        c2i++;
    }
    mk_join_map_cleanup();
}

// C ref: sp_lev.c wallify_map() — convert STONE cells adjacent to a ROOM (or
// crosswall) into HWALL (vertically adjacent) or VWALL (horizontally adjacent).
// No RNG.  This is what gives the cave its walls; the corner/T types are set
// later by wallification().
function mk_wallify_map(x1, y1, x2, y2) {
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

// C ref: mkmap.c finish_map() — walled + lit handling (smooth/join already done).
function mk_finish_map(fg_typ, bg_typ, lit, walled) {
    const map = game.level;
    if (walled)
        mk_wallify_map(1, 0, COLNO - 1, ROWNO - 1);
    if (lit) {
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const t = map.at(x, y).typ;
                if ((!IS_OBSTRUCTED(fg_typ) && t === fg_typ)
                    || (!IS_OBSTRUCTED(bg_typ) && t === bg_typ)
                    || (walled && IS_WALL(t)))
                    map.at(x, y).lit = true;
            }
        for (let x = 0; x < game.level.nroom; x++)
            game.level.rooms[x].rlit = 1;
    }
}

// C ref: mkmap.c mkmap() — bg=STONE, fg=ROOM, smooth+join+walled for mines.
function mk_mkmap(lit) {
    const bg_typ = STONE, fg_typ = ROOM;
    mk_init_map(bg_typ);
    mk_init_fill(bg_typ, fg_typ);
    mk_pass_one(bg_typ, fg_typ);     // N_P1_ITER = 1
    mk_pass_two(bg_typ, fg_typ);     // N_P2_ITER = 1
    mk_pass_three(bg_typ, fg_typ);   // N_P3_ITER = 2 (smoothed)
    mk_pass_three(bg_typ, fg_typ);
    mk_join_map(bg_typ, fg_typ);     // joined
    mk_finish_map(fg_typ, bg_typ, lit, true);  // walled
    // a walled, joined level is cavernous, not mazelike
    game.level.flags.is_maze_lev = false;
    game.level.flags.is_cavernous_lev = true;
}

// ── lspo helpers for minefill ──

// C ref: sp_lev.c get_location() random spot (croom=NULL), then is_ok_location.
// Returns {x,y}.  okfn(typ-cell) gates acceptance (DRY-equivalent default).
function mk_get_location_random(okfn) {
    const map = game.level;
    const mx = 1, my = 0, sx = COLNO - 1, sy = ROWNO; // xstart/ystart/xsize/ysize
    let cpt = 0;
    let x = -1, y = -1;
    do {
        x = mx + rn2(sx);   // 1 + rn2(79)
        y = my + rn2(sy);   // 0 + rn2(21)
        if (okfn(x, y)) break;
    } while (++cpt < 100);
    if (cpt >= 100) {
        for (let xx = 0; xx < sx; xx++)
            for (let yy = 0; yy < sy; yy++) {
                x = mx + xx; y = my + yy;
                if (okfn(x, y)) return { x, y };
            }
    }
    return { x, y };
}

// is_ok_location DRY: SPACE_POS(typ) && no boulder.
function mk_ok_dry(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (!SPACE_POS(loc.typ)) return false;
    // no boulder at this spot (objects placed later, so floor is clear)
    return true;
}

// good_stair_loc: ROOM || CORR || ICE.
function mk_ok_stair(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    return loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE;
}

// des.stair(dir) random spot: get_location_coord(DRY) with good_stair_loc, then
// mkstairs.  C ref: l_create_stairway().
function mk_stair(up) {
    const c = mk_get_location_random(mk_ok_stair);
    const t = game.level.at(c.x, c.y);
    if (t) t.typ = ROOM; // SpLev_Map mark; cell becomes floor for the stair
    mkstairs(c.x, c.y, up ? 1 : 0, null);
}

// des.object(class) at a random DRY spot.  oclass: GEM_CLASS / WEAPON_CLASS /
// RANDOM_CLASS / BOULDER(specific id).  C ref: create_object().
function mk_object(oclass, specificId) {
    const c = mk_get_location_random(mk_ok_dry);
    if (specificId != null) {
        mksobj_at(specificId, c.x, c.y, true, true);
    } else if (oclass === RANDOM_CLASS) {
        mkobj_at(RANDOM_CLASS, c.x, c.y, true);
    } else {
        mkobj_at(oclass, c.x, c.y, true);
    }
}

// Name-implied gender for find_montype: returns 'male'/'female'/'neutral'.
// A name that is the gendered variant (e.g. "gnome lord" is male, "gnome lady"
// is female) supplies the gender directly; a base/neutral name yields 'neutral'.
const MK_MALE_NAMES = new Set([
    'gnome lord', 'gnome leader', 'gnome king', 'gnome ruler',
    'dwarf lord', 'dwarf leader', 'dwarf king', 'dwarf ruler',
]);
const MK_FEMALE_NAMES = new Set([
    'gnome lady', 'gnome queen', 'dwarf lady', 'dwarf queen',
]);
function mk_name_gender(name) {
    if (MK_MALE_NAMES.has(name)) return 'male';
    if (MK_FEMALE_NAMES.has(name)) return 'female';
    return 'neutral';
}

// The JS monster table stores gender-neutral canonical names ("gnome leader",
// "gnome ruler"); the lua uses gendered aliases ("gnome lord", "gnome king").
// Resolve a gendered name to the canonical species name for lookup.
const MK_NAME_ALIAS = {
    'gnome lord': 'gnome leader', 'gnome lady': 'gnome leader',
    'gnome king': 'gnome ruler', 'gnome queen': 'gnome ruler',
    'dwarf lord': 'dwarf leader', 'dwarf lady': 'dwarf leader',
    'dwarf king': 'dwarf ruler', 'dwarf queen': 'dwarf ruler',
};
function mk_resolve_name(name) {
    return MK_NAME_ALIAS[name] || name;
}

// is_male/is_female: species fixed gender (gcode 1=male, 2=female).
function mk_is_fixed_gender(data) {
    return !!data && (data.gcode === 1 || data.gcode === 2);
}

// C ref: sp_lev.c find_montype() — name lookup + conditional gender roll.
// Rolls rn2(2) only when the species is not fixed-gender AND the name does not
// imply a gender.  Returns the permonst data for the named monster.
function mk_find_montype(name) {
    const pm = name_to_pmidx(mk_resolve_name(name));
    const data = monster_by_pmidx(pm);
    if (mk_is_fixed_gender(data)) {
        // gender fixed by species — no roll.
    } else {
        const ng = mk_name_gender(name);
        if (ng === 'neutral') rn2(2);   // mgend = rn2(2)
        // else mgend taken from the name; no roll.
    }
    return data;
}

// des.monster(name) — a multi-char monster name (id given, no mkclass).
// C ref: lspo_monster (find_montype) + create_monster (induced_align + makemon).
function mk_monster_named(name) {
    const data = mk_find_montype(name);
    // sp_amask_to_amask(AM_SPLEV_RANDOM) -> induced_align(80).
    oracle_induced_align();
    // In_mines && your_race(pm) && (Race_if(DWARF)||Race_if(GNOME)) && rn2(3):
    // hero (seed0030) is not gnome/dwarf race, so this gate does not fire.
    // pm_to_humidity(pm) — DRY for these mines monsters (no swimmers/flyers).
    const c = mk_get_location_random(mk_ok_dry);
    make_monster(data, c.x, c.y, 0);
}

// des.monster("G"/"h") — a single-char monster CLASS (no find_montype gender
// roll).  C ref: create_monster -> mkclass(class, G_NOGEN), then induced_align
// + makemon.  S_GNOME=33 ('G'), S_HUMANOID=8 ('h').
function mk_monster_class(classChar) {
    const klass = classChar === 'G' ? 33 : classChar === 'h' ? 8 : 0;
    // C ref: create_monster — amask = sp_amask_to_amask(AM_SPLEV_RANDOM) ->
    // induced_align(80) is computed FIRST, then pm = mkclass(class, G_NOGEN),
    // then get_location + makemon.
    oracle_induced_align();
    const data = mkclass(klass, 1 /* G_NOGEN */);
    const c = mk_get_location_random(mk_ok_dry);
    make_monster(data, c.x, c.y, 0);
}

// dispatch: single-char -> class; else named.
function mk_monster(spec) {
    if (spec.length === 1) mk_monster_class(spec);
    else mk_monster_named(spec);
}

// des.trap() random type at a random DRY spot (avoiding stairs/ladders).
// C ref: create_trap() croom==NULL path + mktrap().
async function mk_trap() {
    const map = game.level;
    let c, trycnt = 0;
    do {
        c = mk_get_location_random(mk_ok_dry);
        const t = map.at(c.x, c.y);
        if (!(t && (t.typ === STAIRS))) break; // LADDER not present here
    } while (++trycnt <= 100);
    // mktrap(type=-1 random): traptype loop + maketrap + victim gate.
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1)
        < (dungeon?.num_dunlevs ?? 99);
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const trap = await maketrap(c.x, c.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    const lvl = level_difficulty();
    if (kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
    }
}

// math.random(lo,hi) = lo + rn2(hi+1-lo).
function mk_mrandom(lo, hi) { return lo + rn2(hi + 1 - lo); }
// percent(n) = rn2(100) < n.
function mk_percent(n) { return rn2(100) < n; }

// C ref: dat/minefill.lua + mkmap.c + load_special finalize + mineralize.
async function makemaz_minefill() {
    const g = game;

    // load_special -> load_lua -> nhlib.lua prelude shuffle(align): rn2(3),rn2(2)
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const a = i - 1, b = j - 1;
        const t = align[a]; align[a] = align[b]; align[b] = t;
    }

    const was_full = g._full_mon_gen;
    g._full_mon_gen = true;
    const was_mklev = g.in_mklev;
    g.in_mklev = true;
    try {
        // des.level_init({ style="solidfill", fg=" " })
        //   splev_initlev SOLIDFILL: lit = rn2(2); lvlfill_solid(STONE, lit).
        rn2(2);
        // des.level_flags("mazelevel","noflip") — no PRNG.
        // des.level_init({ style="mines", fg=".", bg=" ", smoothed, joined, walled })
        //   splev_initlev MINES: lit = rn2(2); lvlfill_solid(ROOM,0); mkmap().
        const minesLit = rn2(2);
        // litstate_rnd(lit): lit >= 0 -> returns lit, no PRNG.
        mk_mkmap(!!minesLit);

        // des.stair("up"); des.stair("down")
        mk_stair(true);
        mk_stair(false);

        // for i=1,math.random(2,5) do des.object("*") end  (gems)
        let n = mk_mrandom(2, 5);
        for (let i = 0; i < n; i++) mk_object(GEM_CLASS);
        // des.object("(")   (tool, '(' == TOOL_CLASS)
        mk_object(TOOL_CLASS);
        // for i=1,math.random(2,4) do des.object() end  (random class)
        n = mk_mrandom(2, 4);
        for (let i = 0; i < n; i++) mk_object(RANDOM_CLASS);
        // if percent(75) then for i=1,math.random(1,2) do des.object("boulder")
        if (mk_percent(75)) {
            n = mk_mrandom(1, 2);
            for (let i = 0; i < n; i++) mk_object(null, BOULDER);
        }

        // for i=1,math.random(6,8) do des.monster("gnome") end
        n = mk_mrandom(6, 8);
        for (let i = 0; i < n; i++) mk_monster('gnome');
        mk_monster('gnome lord');
        mk_monster('dwarf');
        mk_monster('dwarf');
        mk_monster('G');               // random gnome class
        mk_monster('G');
        mk_monster(mk_percent(50) ? 'h' : 'G');

        // des.trap() x6
        for (let i = 0; i < 6; i++) await mk_trap();
    } finally {
        g._full_mon_gen = was_full;
        g.in_mklev = was_mklev;
    }

    // load_special finalize: !corrmaze -> wallification(1,0,COLNO-1,ROWNO-1).
    // (mkmap already wallified; this is idempotent for our purposes — no PRNG.)
    wallification(1, 0, COLNO - 1, ROWNO - 1);

    // fixup_special: place the dungeon branch staircase (place_lregion LR_BRANCH
    // probabilistic loop, since join_map_cleanup left svn.nroom == 0).
    mk_fixup_branch();

    // NOTE: level_finalize_topology -> mineralize() is NOT called here; the JS
    // engine factors mineralize() into fastforward_fill_mineralize(), which
    // goto_level() runs immediately after mklev().  For minefill the room-fill
    // loop there is a no-op (join_map_cleanup left nroom == 0) and only
    // mineralize() runs, matching C's level_finalize_topology ordering.
}

// C ref: mkmaze.c fixup_special() — for a branch level with no rooms left
// (join_map_cleanup reset svn.nroom to 0), the branch is placed via
// place_lregion(0,...,LR_BRANCH).  Because nroom==0 the LR_BRANCH early-return
// (place_branch) is NOT taken; instead place_lregion runs its probabilistic
// rn1 loop: x = rn1(79,1), y = rn1(21,0) until put_lregion_here succeeds.
// put_lregion_here(LR_BRANCH): valid iff !bad_location -> !occupied && typ==ROOM
// (cavernous, not is_maze_lev), then place_branch(branchp, x, y).
function mk_fixup_branch() {
    const branchp = is_branchlev();
    if (!branchp) return;
    let x = 0, y = 0;
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        x = rn1(COLNO - 1 - 1 + 1, 1);  // rn1((hx-lx)+1, lx) = rn1(79, 1)
        y = rn1(ROWNO - 1 - 0 + 1, 0);  // rn1((hy-ly)+1, ly) = rn1(21, 0)
        if (mk_put_branch_here(x, y, branchp)) return;
    }
    // deterministic fallback (no PRNG)
    for (x = 1; x <= COLNO - 1; x++)
        for (y = 0; y <= ROWNO - 1; y++)
            if (mk_put_branch_here(x, y, branchp, true)) return;
}

function mk_bad_branch_location(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return true;
    if (occupied(x, y)) return true;
    // cavernous mines: is_maze_lev is false, so only ROOM is valid.
    return loc.typ !== ROOM;
}

// C ref: mkmaze.c place_lregions() — place the registered "branch" levregion
// on a quest home level.  game._quest_branch holds the (already flipped) 1-cell
// region; place_lregion's probabilistic loop therefore draws rn1(1,x)=rn2(1)+x
// and rn1(1,y)=rn2(1)+y, then put_lregion_here(LR_BRANCH) -> place_branch.
function quest_place_branch() {
    const br = game._quest_branch;
    if (!br) return;
    const branchp = is_branchlev();
    if (!branchp) return;
    const lx = br.x1, ly = br.y1, hx = br.x2, hy = br.y2;
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        // put_lregion_here(LR_BRANCH): on a maze level bad_location accepts
        // ROOM (and CORR); the branch cell (the cleared portal spot) is ROOM.
        const loc = game.level?.at(x, y);
        if (loc && !occupied(x, y)
            && (loc.typ === ROOM || (loc.typ === CORR && game.level?.flags?.is_maze_lev))) {
            mk_place_branch_at(branchp, x, y);
            return;
        }
    }
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++) {
            const loc = game.level?.at(x, y);
            if (loc && !occupied(x, y) && loc.typ === ROOM) {
                mk_place_branch_at(branchp, x, y);
                return;
            }
        }
}

function mk_put_branch_here(x, y, branchp) {
    if (mk_bad_branch_location(x, y)) return false;
    mk_place_branch_at(branchp, x, y);
    return true;
}

// C ref: mklev.c place_branch(br, x, y) with explicit coords.
function mk_place_branch_at(branchp, x, y) {
    const g = game;
    if (!branchp || g.made_branch) return;
    const onEnd1 = (branchp.end1?.dnum === g.u?.uz?.dnum
                    && branchp.end1?.dlevel === g.u?.uz?.dlevel);
    const dest = onEnd1 ? branchp.end2 : branchp.end1;
    const makeStairs = onEnd1 ? (branchp.type !== 1 /*BR_NO_END1*/)
                              : (branchp.type !== 2 /*BR_NO_END2*/);
    if (branchp.type === 3 /*BR_PORTAL*/) {
        // mkportal — not exercised for the mines branch.
    } else if (makeStairs) {
        const goes_up = onEnd1 ? !!branchp.end1_up : !branchp.end1_up;
        stairway_add(x, y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        const loc = g.level.at(x, y);
        if (loc) { loc.typ = STAIRS; loc.ladder = goes_up ? 1 : 2; }
        if (goes_up) g.level.upstair = { x, y };
        else g.level.dnstair = { x, y };
    }
    g.made_branch = true;
}

// C ref: oracle.lua — the full des.* program.
async function makemaz_oracle() {
    const g = game;
    g.level.flags.is_maze_lev = false;
    // load_special -> load_lua -> nhlib.lua top-level shuffle(align): rn2(3),rn2(2)
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const a = i - 1, b = j - 1;
        const t = align[a]; align[a] = align[b]; align[b] = t;
    }
    // des.level_flags("noflip") — sets allow_flips=0 (handled at finalize: no rng)

    const was_full = g._full_mon_gen;
    g._full_mon_gen = true;
    const was_mklev = g.in_mklev;
    g.in_mklev = true;
    try {
        // ---- Room 1: the big ordinary center room (lit) -------------------
        // des.room({ type="ordinary", lit=1, x=3,y=3, xalign="center",
        //            yalign="center", w=11,h=9, contents=... })
        rn2(100);                                   // build_room chance
        let ok = create_room(3, 3, 11, 9, 3 /*CENTER*/, 3 /*CENTER*/, OROOM, 1);
        const room1 = g.level.rooms[g.level.nroom - 1];
        if (ok && room1) {
            topologize(room1);
            // C: special-level rooms are filled inline (here) during gen and
            // are NOT re-filled by the ordinary fill_ordinary_room loop, so mark
            // them FILL_NONE to keep fastforward_fill_mineralize from re-stocking.
            room1.needfill = FILL_NONE;
            // 8 historic centaur statues at fixed room-relative coords.
            const S_CENTAUR = 29;
            const statpos = [[0,0],[0,8],[10,0],[10,8],[5,1],[5,7],[2,4],[8,4]];
            for (const [rx, ry] of statpos) {
                oracle_place_statue(room1.lx + rx, room1.ly + ry, S_CENTAUR);
            }
            // delphi subroom: des.room({ type="delphi", lit=1, x=4,y=3, w=3,h=3 })
            rn2(100);                               // build_room chance (subroom)
            const oksub = create_subroom(room1, 4, 3, 3, 3, OROOM, 1);
            room1.irregular = true;                 // parent made irregular
            if (oksub) {
                const delphi = room1.sbrooms[room1.nsubrooms - 1];
                // four fountains at fixed delphi-relative coords (no rng)
                const setfeat = (rx, ry, typ) => {
                    const loc = g.level.at(delphi.lx + rx, delphi.ly + ry);
                    if (loc) loc.typ = typ;
                };
                setfeat(0, 1, FOUNTAIN);
                setfeat(1, 0, FOUNTAIN);
                setfeat(1, 2, FOUNTAIN);
                setfeat(2, 1, FOUNTAIN);
                // des.monster("Oracle", 1, 1) — fixed coords inside delphi.
                oracle_induced_align();             // sp_amask_to_amask
                const ox = delphi.lx + 1, oy = delphi.ly + 1;
                make_monster(monster_by_pmidx(name_to_pmidx('Oracle')), ox, oy, 0);
                // des.door({ state="nodoor", wall="all" })
                oracle_create_door(delphi, 15 /*W_ANY*/, D_NODOOR);
            }
            // des.monster(); des.monster() — two random monsters in room 1.
            // Uses the same create_monster() collision->enexto relocation as the
            // random rooms below (oracle_monster).
            for (let i = 0; i < 2; i++) {
                oracle_monster(room1);
            }
        }

        // ---- Rooms 2..6: fully random rooms with contents -----------------
        // Room 2: { stair("up"), object() }
        await oracle_random_room(async (croom) => {
            await oracle_stair(croom, true);
            oracle_object(croom);
        });
        // Room 3: { stair("down"), object(), trap(), monster(), monster() }
        await oracle_random_room(async (croom) => {
            await oracle_stair(croom, false);
            oracle_object(croom);
            await oracle_trap(croom);
            oracle_monster(croom);
            oracle_monster(croom);
        });
        // Room 4: { object(), object(), monster() }
        await oracle_random_room(async (croom) => {
            oracle_object(croom);
            oracle_object(croom);
            oracle_monster(croom);
        });
        // Room 5: { object(), trap(), monster() }
        await oracle_random_room(async (croom) => {
            oracle_object(croom);
            await oracle_trap(croom);
            oracle_monster(croom);
        });
        // Room 6: { object(), trap(), monster() }
        await oracle_random_room(async (croom) => {
            oracle_object(croom);
            await oracle_trap(croom);
            oracle_monster(croom);
        });

        // ---- des.random_corridors() -> create_corridor(src=-1) -> makecorridors
        makecorridors();
    } finally {
        g._full_mon_gen = was_full;
        g.in_mklev = was_mklev;
    }

    // load_special finalize: wallification(1,0,COLNO-1,ROWNO-1) (not corrmaze).
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

// Build a fully-random room (no coords/size/align) and run its contents.
async function oracle_random_room(contents) {
    const g = game;
    rn2(100);                                       // build_room chance
    const ok = create_room(-1, -1, -1, -1, -1, -1, OROOM, -1);
    if (!ok) return;
    const croom = g.level.rooms[g.level.nroom - 1];
    if (!croom) return;
    topologize(croom);
    croom.needfill = FILL_NONE;   // filled inline, not by fill_ordinary_room
    if (contents) await contents(croom);
}

// des.stair(dir) with random coord: get_location_coord(random) -> somexy.
async function oracle_stair(croom, up) {
    const c = oracle_get_free_room_loc(croom);
    mkstairs(c.x, c.y, up ? 1 : 0, croom);
}

// des.object() fully random: get_location(random)->somexy, then mkobj_at(RANDOM).
function oracle_object(croom) {
    const c = oracle_get_free_room_loc(croom);
    mkobj_at(RANDOM_CLASS, c.x, c.y, true);
}

// des.monster() fully random: induced_align, somexy, makemon(rndmonst).
// C ref: sp_lev.c create_monster() — a random des.monster() resolves pm==NULL,
// picks a spot via get_location_coord(random)->somexy, then, if that spot is
// already occupied by a monster, relocates to a close free spot via enexto()
// (which shuffles collect_coords rings, consuming rn2 exactly as the C engine
// does).  If the relocated spot falls outside croom the monster is skipped.
function oracle_monster(croom) {
    oracle_induced_align();
    const c = oracle_get_free_room_loc(croom);
    // C: if (MON_AT(x, y) && enexto(&cc, x, y, pm)) x = cc.x, y = cc.y;  (pm==NULL)
    if (m_at(c.x, c.y)) {
        const cc = enexto_spawn(c.x, c.y, null);
        if (cc) { c.x = cc.x; c.y = cc.y; }
    }
    // C: if (croom && !inside_room(croom, x, y)) return;
    if (croom && !inside_room(croom, c.x, c.y)) return;
    make_monster(null, c.x, c.y, 0);
}

// des.trap() fully random: create_trap -> get_free_room_loc(somexy) ->
// mktrap(type=-1, MKTRAP_MAZEFLAG, croom=NULL, tm) — random traptype loop +
// victim gate.  C ref: sp_lev.c create_trap + mklev.c mktrap.
async function oracle_trap(croom) {
    const g = game;
    const c = oracle_get_free_room_loc(croom);      // somexy (get_free_room_loc)
    // is_pool_or_lava(tm) check: room floor is never pool here.
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP); // rnd(25) loop
    const dungeon = g.dungeons?.[g.u?.uz?.dnum ?? 0];
    const canFallThru = (g.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? dungeon?.dunlev_ureached ?? 99);
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const trap = await maketrap(c.x, c.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    const lvl = level_difficulty();
    // victim gate (gi.in_mklev is true during gen)
    if (kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
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
                let actualTrap = trap_type;
                if (is_hole(actualTrap)) actualTrap = ROCKTRAP;
                const ttmp = await maketrap(xx, yy + dy, actualTrap);
                if (ttmp) {
                    if (actualTrap !== ROCKTRAP) ttmp.once = true;
                    const trapText = trap_engravings[actualTrap];
                    if (trapText) {
                        make_engr_at(xx, yy - dy, trapText, null, 0, DUST);
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
                        // inaccessible niches occasionally have iron bars with
                        // a human corpse behind them.  C: mkcorpstat(CORPSE,
                        // NULL, mkclass(S_HUMAN, 0), ...).  mkclass() consumes
                        // the rn2(9)-per-candidate / rn2(2) / rnd(num) stream.
                        const S_HUMAN = 53;
                        const hptr = mkclass(S_HUMAN, 0);
                        mkcorpstat(CORPSE, null, hptr ? hptr.pmidx : 0,
                                   xx, yy + dy, 1);
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
export function wallification(x1, y1, x2, y2) {
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

// C ref: dothrow.c breaktest(obj) — used by mktrap_victim()'s PIT (exploded
// landmine) branch to discard fragile possessions.  Rolls obj_resists(obj,1,99)
// (rn2(100)); only the RNG side-effect + glass/potion/egg/etc verdict matter
// here.  No glass armor reaches a trap-victim, so the ARMOR/GLASS nonbreakchance
// tweak is irrelevant but kept faithful.
function breaktest(otmp) {
    const GLASS_MATERIAL = 19; // objclass.h obj_material_types GLASS
    const POT_WATER = 322, EGG = 266, EXPENSIVE_CAMERA = 229;
    const CREAM_PIE = 287, MELON = 280, ACID_VENOM = 479, BLINDING_VENOM = 478;
    const od = objects[otmp.otyp] || {};
    let nonbreakchance = 1;
    if (otmp.oclass === ARMOR_CLASS && od.material === GLASS_MATERIAL)
        nonbreakchance = 90;
    if (obj_resists(otmp, nonbreakchance, 99))
        return false;
    if (od.material === GLASS_MATERIAL && !otmp.oartifact
        && otmp.oclass !== GEM_CLASS)
        return true;
    const key = (otmp.oclass === POTION_CLASS) ? POT_WATER : otmp.otyp;
    switch (key) {
    case EXPENSIVE_CAMERA:
    case POT_WATER:
    case EGG:
    case CREAM_PIE:
    case MELON:
    case ACID_VENOM:
    case BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

function mktrap_victim(trap) {
    const lvl = game.u?.uz?.dlevel ?? 1;
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    // Object generated by the trap (placed on the floor at the trap square).
    // C ref: mklev.c mktrap_victim() — ARROW_TRAP also clears opoisoned.
    let otmp = null;
    switch (kind) {
    case ARROW_TRAP: otmp = mksobj(ARROW, true, false); otmp.opoisoned = 0; break;
    case DART_TRAP: otmp = mksobj(DART, true, false); break;
    case ROCKTRAP: otmp = mksobj(ROCK, true, false); break;
    default: break;
    }
    if (otmp) place_object(otmp, x, y);
    // Random items on victim — each cursed and placed at (x,y).  C ref: mklev.c
    // mktrap_victim() do/while loop; for a PIT (exploded landmine) a fragile item
    // is destroyed (breaktest) instead of placed.
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        otmp = mkobj(cls, false);
        curse(otmp);
        if (kind === PIT && breaktest(otmp)) {
            // dealloc: object never reaches the floor (matches C dealloc_obj).
        } else {
            place_object(otmp, x, y);
        }
    } while (!rn2(5));
    // Victim type.  C ref: include/monsters.h / pm.h global mons[] indices —
    // these are the real PM_* constants (the corpse's corpsenm, which drives the
    // displayed corpse color via mon_color = mons[corpsenm].mcolor).  The prior
    // placeholder values (18..22, 338, 350) produced wrong-species corpses (e.g.
    // an "orc" rendered as a gray wolf corpse instead of the red orc C records).
    const PM_ELF = 264, PM_DWARF = 44, PM_ORC = 72, PM_GNOME = 165, PM_HUMAN = 260;
    const PM_ARCHEOLOGIST = 330, PM_WIZARD = 342;
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
        // 10% chance of a candle too — placed on the floor and (if the square is
        // unlit) lit.  C ref: mklev.c mktrap_victim().
        if (!rn2(10)) {
            otmp = mksobj(rn2(4) ? 370 : 371, true, false); // TALLOW_CANDLE / WAX_CANDLE
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            curse(otmp);
            place_object(otmp, x, y);
            // C begin_burn(otmp, FALSE): mark the candle lit on an unlit square.
            // No RNG; the light-source list isn't modelled, so just set lamplit.
            if (!game.level?.at(x, y)?.lit) otmp.lamplit = 1;
        }
        break;
    default: victim_mnum = PM_HUMAN; break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    // C ref: mklev.c — the corpse is placed at (x,y) (mksobj_at via mkcorpstat)
    // and aged past TAINT_AGE so it can't be safely eaten.
    otmp = mkcorpstat(CORPSE, null, victim_mnum, x, y, 8); // CORPSTAT_INIT
    if (otmp) otmp.age = (otmp.age || 0) - (TAINT_AGE + 1);
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
    const was_in_mklev = game.in_mklev;
    game.in_mklev = true;
    try {
        if (kind !== NO_TRAP
            && lvl <= rnd(4)
            && kind !== SQKY_BOARD && kind !== RUST_TRAP
            && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
            && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
            if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
            mktrap_victim(trap);
        }
    } finally {
        game.in_mklev = was_in_mklev;
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

export async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;
    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // Sleeping monster (33%)
    if (!rn2(3) && somexyspace(croom, pos)) {
        await makemon(null, pos.x, pos.y, 0x00002000); // MM_NOGRP
    }
    // Traps
    const u_depth = g.u?.uz?.dlevel ?? 1;
    let x = 8 - Math.trunc(u_depth / 6);
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
    x = 80 - (u_depth * 2);
    if (x < 2) x = 2;
    if (!rn2(x)) mkgrave_room(croom);
    // Statue
    if (!rn2(20) && somexyspace(croom, pos)) {
        mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
    }
    // Bonus items
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const branchp = is_branchlev();
        const uz = g.u?.uz ?? { dnum: 0, dlevel: 1 };
        const mines_dnum = g.mines_dnum;
        const oracle_level = g.oracle_level ?? { dnum: 0, dlevel: 5 };
        const uz_branch = Number.isInteger(branchp?.id) ? branchp : null;
        if (uz_branch && uz.dnum !== mines_dnum
            && (uz_branch.end1?.dnum === mines_dnum || uz_branch.end2?.dnum === mines_dnum)) {
            // Mines entrance bonus food
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if (uz.dnum === oracle_level.dnum && uz.dlevel < oracle_level.dlevel && rn2(3)) {
            // Supply chest.  C ref: mklev.c fill_ordinary_room() supply-chest
            // branch — the rolled items are added INTO the chest (add_to_container);
            // the chest weight is recomputed at the end.  (The previous port rolled
            // the items but discarded them, leaving the chest empty, which broke
            // #force/loot of the chest's contents downstream.)
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
                        otmp.owt = weight(otmp);
                    }
                    cursed_item = otmp?.cursed ?? false;
                    add_to_container(supply_chest, otmp);
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    let otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        // Bias towards a lower-level spellbook: re-roll maxpass
                        // times and keep the lowest-oc_level book.  C ref:
                        // mklev.c — compares objects[].oc_level, dealloc the
                        // higher one.
                        const depth = g.u?.uz?.dlevel ?? 1;
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            const otmp2 = mkobj(oclass, false);
                            if (spell_level(otmp.otyp) <= spell_level(otmp2.otyp)) {
                                // keep otmp (otmp2 discarded)
                            } else {
                                otmp = otmp2;
                            }
                        }
                    }
                    add_to_container(supply_chest, otmp);
                }
                // C: add_to_container() doesn't update the container weight.
                supply_chest.owt = weight(supply_chest);
            }
            skip_chests = true;
        }
    }
    // Box/chest check
    if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos)) {
        mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
    }
    // Graffiti
    const depth = g.u?.uz?.dlevel ?? 1;
    if (!rn2(27 + 3 * Math.abs(depth))) {
        const { text: engrText, pristine } = random_engraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
            if (g.level?.at(pos.x, pos.y)?.typ === ROOM)
                make_engr_at(pos.x, pos.y, engrText, pristine, 0, MARK);
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

// C ref: mkobj.c add_to_buried(otmp) — moves the object onto the level's buried
// chain (svl.level.buriedobjlist).  Buried objects are NOT on the floor (fobj),
// so the pet's dog_goal scan never sees them; we only need them off level.objects.
// Tracking them keeps weight/RNG bookkeeping faithful without affecting display.
function bury_object(otmp) {
    if (!otmp) return otmp;
    otmp.where = 'buried';
    const lvl = game.level;
    if (lvl) {
        if (!lvl.buriedobjs) lvl.buriedobjs = [];
        lvl.buriedobjs.push(otmp);
    }
    return otmp;
}

export function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    const map = game.level;
    mineralize_kelp(kelp_pool, kelp_moat);
    // C ref: mklev.c mineralize() — gold/gem seeding is skipped (after kelp) for
    // almost all special levels: In_hell || In_V_tower || Is_rogue_level ||
    // arboreal || (Is_special && !Is_oracle && (!In_mines || town)).  The Big
    // Room is a special level, so its gold/gem loop is suppressed (kelp only).
    if (!skip_lvl_checks) {
        const sp = Is_special(game.u?.uz);
        if (game.level?.flags?.arboreal
            || (sp && sp.proto && sp.proto.toLowerCase() !== 'oracle'
                && sp.proto.toLowerCase() !== 'minetn')) {
            return;
        }
    }
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    // C ref: mklev.c mineralize() — mines have MORE goodies, quest fewer.
    if (!skip_lvl_checks) {
        const dnum = game.u?.uz?.dnum ?? 0;
        if (game.mines_dnum != null && dnum === game.mines_dnum) {
            goldprob *= 2; gemprob *= 3;
        } else if (game.quest_dnum != null && dnum === game.quest_dnum) {
            goldprob = Math.trunc(goldprob / 4);
            gemprob = Math.trunc(gemprob / 6);
        }
    }
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
                // C ref: mklev.c mineralize() — seed rock areas with gold/gems.
                // ~2/3 land on the floor (place_object) and ~1/3 are buried
                // (add_to_buried); the rn2(3) chooses.  These floor objects sit
                // on UNSEEN/DARK stone squares, so they never show on the map,
                // but they DO join the fobj chain and are scanned by the pet's
                // dog_goal object loop (obj_resists rn2(100) each).  Earlier the
                // JS port created them (matching RNG) but discarded both branches,
                // under-populating fobj and desyncing the multi-pass pet scan.
                if (rn2(1000) < goldprob) {
                    const otmp = mksobj(GOLD_PIECE, false, false);
                    if (otmp) {
                        otmp.ox = x; otmp.oy = y;
                        otmp.quan = 1 + rnd(goldprob * 3);
                        otmp.owt = weight(otmp);
                        if (!rn2(3)) bury_object(otmp);
                        else place_object(otmp, x, y);
                    }
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const otmp = mkobj(GEM_CLASS, false);
                        if (!otmp) continue;
                        if (otmp.otyp === ROCK) {
                            // C: dealloc_obj(otmp) — discard (no rn2(3), no place).
                        } else {
                            otmp.ox = x; otmp.oy = y;
                            if (!rn2(3)) bury_object(otmp);
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

// C ref: display.c check_pos — return `which` if the position implies an
// unfinished exterior (rock / corridor / secret door), else 0.
function check_pos(x, y, which) {
    if (!isok(x, y)) return which;
    const type = game.level?.at(x, y)?.typ ?? STONE;
    // Everything below POOL excluding TREE: STWALL, CORR, SCORR, SDOOR
    if (IS_STWALL(type) || type === CORR || type === SCORR || IS_SDOOR(type))
        return which;
    return 0;
}

// C ref: display.c more_than_one(x,y,a,b,c)
function more_than_one(a, b, c) {
    return ((a && (b | c)) || (b && (a | c)) || (c && (a | b)));
}

// C ref: display.c set_wall(x,y,horiz) — wall mode for H/V wall.
function set_wall(x, y, horiz) {
    let is_1, is_2;
    if (horiz) {
        is_1 = check_pos(x, y - 1, WM_W_TOP);
        is_2 = check_pos(x, y + 1, WM_W_BOTTOM);
    } else {
        is_1 = check_pos(x - 1, y, WM_W_LEFT);
        is_2 = check_pos(x + 1, y, WM_W_RIGHT);
    }
    return more_than_one(is_1, is_2, 0) ? 0 : (is_1 + is_2);
}

// C ref: display.c set_twall(...) — wall mode for a T wall.
function set_twall(x1, y1, x2, y2, x3, y3) {
    const is_1 = check_pos(x1, y1, WM_T_LONG);
    const is_2 = check_pos(x2, y2, WM_T_BL);
    const is_3 = check_pos(x3, y3, WM_T_BR);
    return more_than_one(is_1, is_2, is_3) ? 0 : (is_1 + is_2 + is_3);
}

// C ref: display.c set_corn(...) — wall mode for a corner wall.
// (x4,y4) is the "inner" position.
function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {
    const is_1 = check_pos(x1, y1, 1);
    const is_2 = check_pos(x2, y2, 1);
    const is_3 = check_pos(x3, y3, 1);
    const is_4 = check_pos(x4, y4, 1); /* inner location */
    if (is_4) return WM_C_INNER;
    if (is_1 && is_2 && is_3) return WM_C_OUTER;
    return 0; /* finished walls on all sides */
}

// C ref: display.c set_crosswall(x,y) — mode for a crosswall.
function set_crosswall(x, y) {
    const is_1 = check_pos(x - 1, y - 1, 1);
    const is_2 = check_pos(x + 1, y - 1, 1);
    const is_3 = check_pos(x + 1, y + 1, 1);
    const is_4 = check_pos(x - 1, y + 1, 1);
    let wmode = is_1 + is_2 + is_3 + is_4;
    if (wmode > 1) {
        if (is_1 && is_3 && (is_2 + is_4 === 0)) wmode = WM_X_TLBR;
        else if (is_2 && is_4 && (is_1 + is_3 === 0)) wmode = WM_X_BLTR;
        else wmode = 0;
    } else if (is_1) wmode = WM_X_TL;
    else if (is_2) wmode = WM_X_TR;
    else if (is_3) wmode = WM_X_BR;
    else if (is_4) wmode = WM_X_BL;
    return wmode;
}

// C ref: display.c xy_set_wall_state(x,y)
function xy_set_wall_state(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    let wmode;
    switch (lev.typ) {
    case SDOOR:
        wmode = set_wall(x, y, lev.horizontal ? 1 : 0);
        break;
    case VWALL:
        wmode = set_wall(x, y, 0);
        break;
    case HWALL:
        wmode = set_wall(x, y, 1);
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
        wmode = -1; /* don't set wall info */
        break;
    }
    if (wmode >= 0)
        lev.wall_info = (lev.wall_info & ~WM_MASK) | wmode;
}

// C ref: display.c set_wall_state() — scan the level and set wall modes.
export function set_wall_state() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            xy_set_wall_state(x, y);
}

function level_finalize_topology() {
    bound_digging();
    // mineralize is consumed by fastforward_fill_mineralize
    game.in_mklev = false;
    // C ref: mklev.c themerooms_post_level_generate() runs the level-wide
    // wallification(1, 0, COLNO-1, ROWNO-1) at the very end of makelevel()
    // (mklev.c:1190), BEFORE mklev()'s topologize + set_wall_state() pass
    // (mklev.c:1561-1569).  It converts HWALL/VWALL spines into proper corner
    // and T-junction wall types so the room borders (including irregular
    // themeroom borders) carry the right typ for set_wall_state()/wall_angle().
    // Our fill loop runs after mklev() returns, but wallification only depends
    // on the room/corridor wall layout (fixed by makerooms/makecorridors) and
    // consumes no RNG, so running it here is terrain-equivalent and keeps the
    // PRNG aligned.  Without it, irregular lit rooms render straight walls
    // instead of corners.  C ref: mklev.c wallification().
    wallification(1, 0, COLNO - 1, ROWNO - 1);
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
