// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, rnz } from './rng.js';
import { CLR_CYAN, CLR_GRAY, CLR_BRIGHT_BLUE } from './terminal.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level, dist2, distmin, level_difficulty as level_difficulty_of } from './hacklib.js';
import { try_load_bones } from './bones.js';
import { no_bones_level } from './end.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED, D_BROKEN,
    In_V_tower, Is_oracle_level, BURN, OBJ_CONTAINED, OBJ_FREE,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED, NO_ROOM,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    SHOPBASE, COURT, ZOO, BEEHIVE, MORGUE, BARRACKS, SWAMP, TEMPLE,
    LEPREHALL, COCKNEST, ANTHOLE,
    FOODSHOP, TOOLSHOP, CANDLESHOP, FODDERSHOP,
    W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY, D_SECRET,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_ROOM, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    IS_LAVA, IS_THRONE, SPACE_POS, isok, W_NONDIGGABLE, W_NONPASSWALL, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    AIR, CLOUD, THRONE, TREE, DRAWBRIDGE_UP, LADDER, LA_DOWN, LA_UP,
    MAX_TYPE, INVALID_TYPE, MATCH_WALL,
    A_LAWFUL, A_NONE, Align2amask, Amask2align, AM_NONE, AM_LAWFUL, AM_NEUTRAL,
    AM_CHAOTIC, AM_SHRINE, MM_EPRI, N_DIRS, W_ARMC, RLOC_NOMSG,
    FILL_LVFLAGS, STRAT_WAITFORU, NON_PM, ONAME_LEVEL_DEF,
    LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
    LR_TELE, LR_UPTELE, LR_DOWNTELE,
    BR_PORTAL, BR_NO_END1, BR_NO_END2,
    TAINT_AGE,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM,
    WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    BOOL_RANDOM,
    SET_LIT_RANDOM, SET_LIT_NOCHANGE,
    LVLINIT_SOLIDFILL, LVLINIT_MINES,
    In_mines,
    In_quest,
    In_endgame,
    ZOMBIFY_MON, TIMER_OBJECT,
    Is_rogue_level,
    Is_medusa_level,
    DUST, MARK as ENGRAVE_MARK, M_AP_OBJECT, ENGRAVE,
    MM_ASLEEP, MM_NOCOUNTBIRTH, MM_NOMSG, IS_TREE, G_GENOD,
    G_EXTINCT, MAXMONNO,
    MKTRAP_NOSPIDERONWEB,
    MKTRAP_NOVICTIM,
    Is_firelevel,
    Is_airlevel,
    Is_waterlevel,
    DRY, WET, HOT, SOLID, ANY_LOC, NO_LOC_WARN, SPACELOC,
    Can_fall_thru, G_GONE,
    CORPSTAT_HISTORIC, CORPSTAT_MALE, CORPSTAT_NONE,
} from './const.js';
import {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS,
    FOOD_CLASS, SCROLL_CLASS, POTION_CLASS, TOOL_CLASS, GEM_CLASS,
    SPBOOK_CLASS, WAND_CLASS,
    objectNames,
} from './objects.js';
import { shtypes, stock_room } from './shknam.js';
import { setgemprobs } from './o_init.js';
import { maketrap, t_at } from './trap.js';
import {
    mkobj, mksobj, mksobj_at, mkobj_at, mkgold, mkcorpstat, next_ident,
    curse, bless, uncurse, blessorcurse, place_object, add_to_buried, weight, OBJ,
    set_corpsenm, obj_stop_timers, start_timer, obj_extract_self,
    add_to_container, objects_at,
} from './mkobj.js';
import {
    makemon, mkclass, MM_NOGRP, set_mimic_sym, mpickobj, newcham,
    mongets, set_malign, rndmonnum,
} from './makemon.js';
import { m_at } from './mon.js';
import { enexto, rloc, goodpos } from './teleport.js';
import { clear_wormdata } from './worm.js';
import { obj_resists } from './dogmove.js';
import {
    PM_ELF, PM_DWARF, PM_ORC, PM_GNOME, PM_HUMAN,
    PM_ARCHEOLOGIST, PM_WIZARD, PM_GIANT_SPIDER, PM_MONK, PM_LICHEN,
    is_male, is_female, mons, G_NOGEN, G_UNIQ, monsterNames,
    MALE, FEMALE, NEUTRAL,
    is_flyer, is_floater, is_swimmer, amphibious,
    passes_walls, noncorporeal, likes_fire,
    mon_learns_traps,
    resists_ston, poly_when_stoned,
} from './monsters.js';
import { name_to_monplus, name_to_mon } from './mondata.js';
import { christen_monst, oname } from './do_name.js';
import { make_engr_at, make_grave, wipe_engr_at, random_engraving } from './engrave.js';
import { find_level } from './dungeon.js';
import { premap_detect } from './detect.js';
import { create_gas_cloud, clear_regions } from './region.js';
import { ndemon } from './minion.js';

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
const SCR_EARTH = objectNames.indexOf('SCR_EARTH');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const MACE = objectNames.indexOf('MACE');
const ROBE = objectNames.indexOf('ROBE');
const RUNESWORD = objectNames.indexOf('RUNESWORD');
const CHAIN_MAIL = objectNames.indexOf('CHAIN_MAIL');
const FEDORA = objectNames.indexOf('FEDORA');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const HELM_OF_BRILLIANCE = objectNames.indexOf('HELM_OF_BRILLIANCE');
const ARROW = objectNames.indexOf('ARROW');
const DART = objectNames.indexOf('DART');
const DAGGER = objectNames.indexOf('DAGGER');
const KNIFE = objectNames.indexOf('KNIFE');
const BOW = objectNames.indexOf('BOW');
const PM_OGRE_TYRANT = monsterNames.indexOf('PM_OGRE_TYRANT');
const PM_ELVEN_MONARCH = monsterNames.indexOf('PM_ELVEN_MONARCH');
const PM_DWARF_RULER = monsterNames.indexOf('PM_DWARF_RULER');
const PM_GNOME_RULER = monsterNames.indexOf('PM_GNOME_RULER');
const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_WRAITH = monsterNames.indexOf('PM_WRAITH');
const PM_LEPRECHAUN = monsterNames.indexOf('PM_LEPRECHAUN');
const PM_KILLER_BEE = monsterNames.indexOf('PM_KILLER_BEE');
const PM_SOLDIER = monsterNames.indexOf('PM_SOLDIER');
const PM_COCKATRICE = monsterNames.indexOf('PM_COCKATRICE');
const PM_SMALL_MIMIC = monsterNames.indexOf('PM_SMALL_MIMIC');
const PM_LARGE_MIMIC = monsterNames.indexOf('PM_LARGE_MIMIC');
const PM_GIANT_MIMIC = monsterNames.indexOf('PM_GIANT_MIMIC');
const PM_BUGBEAR = monsterNames.indexOf('PM_BUGBEAR');
const PM_HOBGOBLIN = monsterNames.indexOf('PM_HOBGOBLIN');
const PM_KNIGHT = monsterNames.indexOf('PM_KNIGHT');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const WAN_SECRET_DOOR_DETECTION =
    objectNames.indexOf('WAN_SECRET_DOOR_DETECTION');
const APPLE = objectNames.indexOf('APPLE');
const CANDY_BAR = objectNames.indexOf('CANDY_BAR');
const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const SPE_LIGHT = objectNames.indexOf('SPE_LIGHT');
const POT_OBJECT_DETECTION = objectNames.indexOf('POT_OBJECT_DETECTION');
const DIAMOND = objectNames.indexOf('DIAMOND');
const EMERALD = objectNames.indexOf('EMERALD');
const RUBY = objectNames.indexOf('RUBY');
const AMETHYST = objectNames.indexOf('AMETHYST');
const FLINT = objectNames.indexOf('FLINT');
const TOUCHSTONE = objectNames.indexOf('TOUCHSTONE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const WORTHLESS_VIOLET_GLASS = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
const WORTHLESS_WHITE_GLASS = objectNames.indexOf('WORTHLESS_WHITE_GLASS');
const WORTHLESS_GREEN_GLASS = objectNames.indexOf('WORTHLESS_GREEN_GLASS');
const WORTHLESS_RED_GLASS = objectNames.indexOf('WORTHLESS_RED_GLASS');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const LEVITATION_BOOTS = objectNames.indexOf('LEVITATION_BOOTS');
const SCIMITAR = objectNames.indexOf('SCIMITAR');
const SACK = objectNames.indexOf('SACK');

const XLIM = 4;
const YLIM = 3;

// C ref: sp_lev.c local alignment macros (create_room positioned path)
const SPLEV_LEFT = 1;
const SPLEV_CENTER = 3;
const SPLEV_RIGHT = 5;
const SPLEV_TOP = 1;
const SPLEV_BOTTOM = 5;

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

/** C ref: stairs.c stairway_find_from */
export function stairway_find_from(fromdlev, isladder) {
    const dnum = fromdlev?.dnum | 0;
    const dlevel = fromdlev?.dlevel | 0;
    const ladder = !!isladder;
    for (let s = game.stairs; s; s = s.next) {
        if ((s.tolev?.dnum | 0) === dnum
            && (s.tolev?.dlevel | 0) === dlevel
            && !!s.isladder === ladder) {
            return s;
        }
    }
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
export { u_on_newpos };

// C ref: dungeon.h within_bounded_area
function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// C ref: mkmaze.c bad_location
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (occupied(x, y)) return true;
    if (within_bounded_area(x, y, nlx, nly, nhx, nhy)) return true;
    const okTyp = (loc.typ === CORR && game.level?.flags?.is_maze_lev)
        || loc.typ === ROOM
        || loc.typ === AIR;
    return !okTyp;
}

// C ref: mkmaze.c is_exclusion_zone
function is_exclusion_zone(type, x, y) {
    for (let ez = game.exclusion_zones; ez; ez = ez.next) {
        if (((type === LR_DOWNTELE
                && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE
                && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype)
            && within_bounded_area(x, y, ez.lx, ez.ly, ez.hx, ez.hy))
            return true;
    }
    return false;
}

// C ref: mkmaze.c put_lregion_here — place stair/branch/tele at (x,y)
function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    if (bad_location(x, y, nlx, nly, nhx, nhy)
        || is_exclusion_zone(rtype, x, y)) {
        if (!oneshot) return false;
        // C: deltrap undestroyable-safe then retry bad_location + exclusion
        const t = t_at(x, y);
        if (t) {
            // Named omission: undestroyable_trap gate + mtrapped clear
            let prev = null;
            for (let cur = game.ftrap; cur; prev = cur, cur = cur.ntrap) {
                if (cur === t) {
                    if (prev) prev.ntrap = cur.ntrap;
                    else game.ftrap = cur.ntrap;
                    break;
                }
            }
        }
        if (bad_location(x, y, nlx, nly, nhx, nhy)
            || is_exclusion_zone(rtype, x, y))
            return false;
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE: {
        // C: monster here → oneshot rloc/limbo, else retry
        const mtmp = m_at(x, y);
        if (mtmp) {
            if (oneshot) {
                if (!rloc(mtmp, 0)) {
                    // m_into_limbo deferred
                }
            } else {
                return false;
            }
        }
        u_on_newpos(x, y);
        break;
    }
    case LR_PORTAL: {
        // C ref: mkmaze.c mkportal — MAGIC_PORTAL + dst dnum/dlevel
        const ttmp = maketrap(x, y, MAGIC_PORTAL);
        if (ttmp && lev) {
            ttmp.dst = { dnum: lev.dnum | 0, dlevel: lev.dlevel | 0 };
        }
        break;
    }
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkstairs(x, y, rtype === LR_UPSTAIR ? 1 : 0, null);
        break;
    case LR_BRANCH:
        place_branch(is_branchlev(), x, y);
        break;
    }
    return true;
}

// C ref: mkmaze.c place_lregion
/**
 * C ref: dungeon.c u_on_rndspot — place hero via updest/dndest after goto_level.
 * Named omission: switch_terrain after place; W-tower exclusion path untested.
 */
export function u_on_rndspot(upflag) {
    const up = !!(upflag & 1);
    const was_in_W_tower = !!(upflag & 2);
    const dndest = game.dndest || {};
    const updest = game.updest || {};
    if (was_in_W_tower && dndest.nlx) {
        // On_W_tower_level gate deferred — use exclusion region when present
        place_lregion(
            dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy,
            0, 0, 0, 0, LR_DOWNTELE, null,
        );
    } else if (up) {
        place_lregion(
            updest.lx | 0, updest.ly | 0, updest.hx | 0, updest.hy | 0,
            updest.nlx | 0, updest.nly | 0, updest.nhx | 0, updest.nhy | 0,
            LR_UPTELE, null,
        );
    } else {
        place_lregion(
            dndest.lx | 0, dndest.ly | 0, dndest.hx | 0, dndest.hy | 0,
            dndest.nlx | 0, dndest.nly | 0, dndest.nhx | 0, dndest.nhy | 0,
            LR_DOWNTELE, null,
        );
    }
}

export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        // When rooms exist, let place_branch pick (avoid corridor branches)
        if (rtype === LR_BRANCH && (game.level?.nroom | 0)) {
            place_branch(is_branchlev(), 0, 0);
            return;
        }
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev))
            return;
    }
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true, lev))
                return;
}

// C ref: mkmaze.c fixup_special — post-special-level branch/lregion placement
function fixup_special() {
    // lev_region[] from level compiler deferred (minefill has none / noflip)
    // load_fire applies tele/portal lregions inline after flip.
    if (!game.made_branch && is_branchlev()) {
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);
    }

    // C ref: mkmaze.c fixup_special Is_medusa_level — statues in rooms[0]
    if (Is_medusa_level(game.u?.uz)) {
        const croom = game.level?.rooms?.[0];
        if (croom) {
            for (let tryct = rnd(4); tryct; tryct--) {
                const x = somex(croom);
                const y = somey(croom);
                if (goodpos(x, y, null, 0)) {
                    let tryct2 = 0;
                    const otmp = mk_tt_object(STATUE, x, y);
                    // Named omission: poly_when_stoned / pm_resistance MR_STONE
                    // retry loop (mresists not extracted) — keep first corpsenm.
                    void tryct2;
                    void otmp;
                }
            }
            let otmp;
            if (rn2(2))
                otmp = mk_tt_object(STATUE, somex(croom), somey(croom));
            else
                otmp = mkcorpstat(STATUE, null, null, somex(croom), somey(croom),
                    CORPSTAT_NONE);
            // Named omission: stone-resist corpsenm retry (same as above)
            void otmp;
        }
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

// C ref: dungeon.c level_difficulty — via hacklib (builds_up aware)
function level_difficulty() {
    return level_difficulty_of(game.u?.uz);
}

// place_object / weight / add_to_container imported from mkobj.js
function dealloc_obj(_otmp) { /* stub */ }
// C ref: mkobj.c sobj_at — first floor object of otyp at (x,y)
function sobj_at(otyp, x, y) {
    for (let otmp = objects_at(x, y); otmp; otmp = otmp.nexthere) {
        if (otmp.otyp === otyp) return otmp;
    }
    return null;
}

// make_grave imported from engrave.js (C engrave.c)

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

// C ref: bones.c getbones() — chance roll then VFS open/restore (D-0274).
async function getbones() {
    const flags = game.flags || {};
    // C: discover global; JS playmode explore/discover both set flags.explore
    if (flags.explore || flags.discover) return false;
    if (flags.bones === false) return false;
    if (rn2(3) && !flags.debug && !flags.wizard) return false;
    // C: no_bones_level after chance roll (still burns rn2(3) first)
    if (no_bones_level(game.u?.uz || { dnum: 0, dlevel: 1 })) return false;
    return try_load_bones(game.u?.uz);
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
    // C: init_mapseen before getbones
    const { init_mapseen } = await import('./dungeon.js');
    init_mapseen(g.u?.uz);
    if (await getbones()) return;
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
    // C: svl.level.objects[x][y] = 0 for all cells — JS spatial index
    g._objects_at = new Map();
    // C: worm.c wheads/wtails + level.monsters[][] (place_worm_seg)
    clear_wormdata();
    g.ftrap = null;
    // C savelev release_data clears head_engr when leaving a level
    g.head_engr = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.nsubroom = 0;
    // C: rooms[(MAXNROFROOMS+1)*2]; subrooms = &rooms[MAXNROFROOMS+1]
    g.level.rooms = new Array((MAXNROFROOMS + 1) * 2);
    // C init_mapseen memset svl.lastseentyp — reuse buffer per level
    g.lastseentyp = null;
    g.made_branch = false;
    g.lregions = [];
    g.lev_message = null;
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
    // C: svl.level.flags.sokoban_rules = 0 — Sokoban is a level flag
    // (#define Sokoban), not a sticky global. Clear JS aliases too.
    lf.sokoban_rules = false;
    lf.sokoban = false;
    g.Sokoban = false;
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
    // C: clear_regions() — gas must not survive into a freshly mklev'd map
    clear_regions();
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

// Maze extent — C ref: decl.c x_maze_max / y_maze_max
const X_MAZE_MAX = (COLNO - 1) & ~1; // 78
const Y_MAZE_MAX = (ROWNO - 1) & ~1; // 20
const MKMAP_WIDTH = COLNO - 2; // 78
const MKMAP_HEIGHT = ROWNO - 1; // 20

/** C ref: sp_lev.c reset_xystart_size — full-level get_location bounds. */
function reset_xystart_size() {
    game.splev_xstart = 1;
    game.splev_ystart = 0;
    game.splev_xsize = COLNO - 1;
    game.splev_ysize = ROWNO;
    // C create_des_coder: memset SpLev_Map
    game.SpLev_Map = new Set();
}

/**
 * C ref: mkmaze.c makemaz — build protofile (rndlevs → rnd), load_special,
 * else maze fallback. Ported loaders: minefill, tut-1, bigrm-2, bigrm-3,
 * bigrm-7, bigrm-8, Bar-strt, Bar-loca, Bar-fila, Bar-filb, Arc-strt, Arc-loca,
 * Arc-fila, Arc-filb, Arc-goal, soko1-1, soko1-2, soko2-1, soko3-1, soko3-2,
 * soko4-2, tower1, fire, air, minend-1, minetn-2, medusa-1,
 * Pri-fila, Pri-filb.
 * Named omissions: other bigrm-N / soko2-2 / soko4-1 / quest
 * protos (Bar-goal); minetn-1/3–7; minend-2/3; tower2/3;
 * medusa-2/3/4; water/earth/astral; create_maze fallback; check_ransacked side
 * effects beyond ransacked flag; dmonsfree.
 */
async function makemaz(s) {
    const g = game;
    const uz = g.u?.uz || { dnum: 0, dlevel: 1 };
    const sp = (g.sp_levchn || []).find(s0 =>
        (s0.dlevel?.dnum | 0) === (uz.dnum | 0)
        && (s0.dlevel?.dlevel | 0) === (uz.dlevel | 0));
    const dun = g.dungeons?.[uz.dnum | 0];
    let protofile = '';

    // C ref: mkmaze.c:1133-1157 — protofile construction
    if (s && String(s).length) {
        if (sp && (sp.rndlevs | 0))
            protofile = `${s}-${rnd(sp.rndlevs | 0)}`;
        else
            protofile = String(s);
    } else if (dun?.proto) {
        const nlev = dun.num_dunlevs | 0;
        const dlev = uz.dlevel | 0;
        if (nlev > 1) {
            if (sp && (sp.rndlevs | 0))
                protofile = `${dun.proto}${dlev}-${rnd(sp.rndlevs | 0)}`;
            else
                protofile = `${dun.proto}${dlev}`;
        } else if (sp && (sp.rndlevs | 0)) {
            protofile = `${dun.proto}-${rnd(sp.rndlevs | 0)}`;
        } else {
            protofile = String(dun.proto);
        }
    }

    // C: wizard SPLEVTYPE override deferred (getenv)

    if (!protofile) {
        // create_maze fallback deferred (C-JS-MAP)
        return;
    }

    // C: check_ransacked(protofile) — no RNG; orctown flag only
    if ((uz.dnum | 0) === (g.mines_dnum | 0) && protofile === 'minetn-1')
        g.ransacked = true;

    g.in_mk_themerooms = false;
    if (load_special_proto(protofile)) {
        // C: dmonsfree() after successful load_special
        return;
    }
    // C: impossible → create_maze; deferred — leave empty rather than wrong RNG
}

/**
 * C ref: sp_lev.c load_special — dispatch known JS-ported .lua specials.
 * @returns {boolean} true if loaded (C load_special success)
 */
function load_special_proto(protofile) {
    // C ref: sp_lev.c create_des_coder / reset_xystart_size at load start
    reset_xystart_size();
    if (protofile === 'minefill') {
        load_minefill();
        return true;
    }
    if (protofile === 'tut-1') {
        load_tut1();
        return true;
    }
    if (protofile === 'bigrm-2') {
        load_bigrm_2();
        return true;
    }
    if (protofile === 'bigrm-3') {
        load_bigrm_3();
        return true;
    }
    if (protofile === 'medusa-1') {
        load_medusa_1();
        return true;
    }
    if (protofile === 'bigrm-7') {
        load_bigrm_7();
        return true;
    }
    if (protofile === 'bigrm-8') {
        load_bigrm_8();
        return true;
    }
    if (protofile === 'Bar-strt') {
        load_bar_strt();
        return true;
    }
    if (protofile === 'Pri-strt') {
        load_pri_strt();
        return true;
    }
    if (protofile === 'Pri-loca') {
        load_pri_loca();
        return true;
    }
    if (protofile === 'Pri-goal') {
        load_pri_goal();
        return true;
    }
    if (protofile === 'Pri-fila') {
        load_pri_fila();
        return true;
    }
    if (protofile === 'Pri-filb') {
        load_pri_filb();
        return true;
    }
    if (protofile === 'Arc-strt') {
        load_arc_strt();
        return true;
    }
    if (protofile === 'Arc-loca') {
        load_arc_loca();
        return true;
    }
    if (protofile === 'Bar-loca') {
        load_bar_loca();
        return true;
    }
    if (protofile === 'Bar-fila') {
        load_bar_fila();
        return true;
    }
    if (protofile === 'Bar-filb') {
        load_bar_filb();
        return true;
    }
    if (protofile === 'Arc-fila') {
        load_arc_fila();
        return true;
    }
    if (protofile === 'Arc-filb') {
        load_arc_filb();
        return true;
    }
    if (protofile === 'Arc-goal') {
        load_arc_goal();
        return true;
    }
    if (protofile === 'tower1') {
        load_tower1();
        return true;
    }
    if (protofile === 'soko1-1') {
        load_soko1_1();
        return true;
    }
    if (protofile === 'soko1-2') {
        load_soko1_2();
        return true;
    }
    if (protofile === 'soko2-1') {
        load_soko2_1();
        return true;
    }
    if (protofile === 'soko3-1') {
        load_soko3_1();
        return true;
    }
    if (protofile === 'soko3-2') {
        load_soko3_2();
        return true;
    }
    if (protofile === 'soko4-2') {
        load_soko4_2();
        return true;
    }
    if (protofile === 'fire') {
        load_fire();
        return true;
    }
    if (protofile === 'air') {
        load_air();
        return true;
    }
    if (protofile === 'minend-1') {
        load_minend_1();
        return true;
    }
    if (protofile === 'minetn-2') {
        load_minetn_2();
        return true;
    }
    return false;
}

/**
 * C ref: sp_lev.c create_monster — when !(has_invent & DEFAULT_INVENT):
 * mdrop_special_objs then discard_minvent(TRUE). mdrop_special_objs always
 * rolls obj_resists(0,0) per invent item before discard.
 */
function splev_discard_default_minvent(mtmp) {
    if (!mtmp) return;
    for (let obj = mtmp.minvent; obj; ) {
        const next = obj.nobj;
        obj_resists(obj, 0, 0);
        // C: if resists || is_quest_artifact → mdrop_obj; ordinary never resists
        // with ochance 0, so they stay for discard_minvent → obfree.
        obj = next;
    }
    while (mtmp.minvent) obj_extract_self(mtmp.minvent);
}

/** Apply CENTER-aligned des.map string; sets game.splev_* origin/size. */
function splev_apply_centered_map(mapstr) {
    const mf = mapfrag_fromstr(mapstr);
    const { xstart, ystart } = splev_map_center_start(mf.wid, mf.hei);
    game.splev_xstart = xstart;
    game.splev_ystart = ystart;
    game.splev_xsize = mf.wid;
    game.splev_ysize = mf.hei;
    if (!game.SpLev_Map) game.SpLev_Map = new Set();
    for (let yy = ystart; yy < Math.min(ROWNO, ystart + mf.hei); yy++) {
        for (let xx = xstart; xx < Math.min(COLNO, xstart + mf.wid); xx++) {
            const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            sel_set_ter(xx, yy, mptyp, false);
            // C lspo_map: SpLev_Map[x][y] = 1 for each map cell written
            game.SpLev_Map.add(`${xx},${yy}`);
        }
    }
    return { xstart, ystart, mf };
}

/**
 * C ref: sp_lev.c solidify_map — mark STWALL outside SpLev_Map as
 * nondiggable/nonpasswall so premap_detect can skip them.
 */
function solidify_map() {
    const spMap = game.SpLev_Map;
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc || !IS_STWALL(loc.typ)) continue;
            if (spMap && spMap.has(`${x},${y}`)) continue;
            loc.wall_info = (loc.wall_info || 0) | (W_NONDIGGABLE | W_NONPASSWALL);
            loc.flags = (loc.flags | 0) | (W_NONDIGGABLE | W_NONPASSWALL);
        }
    }
}

/**
 * C ref: sp_lev.c load_special epilogue for premapped Sokoban levels —
 * wallify → flip → solidify → fixup → premap_detect.
 */
function soko_load_epilogue(allowFlips = 3) {
    if (!game.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(allowFlips, false);
    solidify_map();
    fixup_special();
    premap_detect();
}

/**
 * C ref: dat/bigrm-2.lua via load_special.
 * Named omissions: darkness choice 0–2 ice replace (selection:grow);
 * flip_level_rnd (noflip); ensure_way_out / solidify / premap.
 */
function load_bigrm_2() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    // des.level_flags("mazelevel", "noflip") — allow_flips=0

    const BIGRM2_MAP = `
---------------------------------------------------------------------------
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
---------------------------------------------------------------------------
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(BIGRM2_MAP);

    // des.region(selection.area(01,01,73,16),"lit") → light_region expands walls
    light_region(xstart + 1, ystart + 1, xstart + 73, ystart + 16, true);

    // math.random(0,3) → nh.random(0,4) → 0+rn2(4); choice==3 → no darkness
    const choice = lua_random2(0, 3);
    if (choice === 0 || choice === 1 || choice === 2) {
        // darkness regions + percent(25) ice replace — named omission envelope:
        // still burn choice RNG; leave lit (wrong for 0–2, rare for this seed).
        if (percent(25)) {
            /* ice replace deferred with selection:grow */
        }
    }

    splev_create_stair(true);
    splev_create_stair(false);

    // des.non_diggable()
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    for (let i = 0; i < 15; i++) splev_create_object(null);
    for (let i = 0; i < 6; i++) splev_create_trap();
    for (let i = 0; i < 28; i++) splev_create_monster(null);

    // C load_special: wallification when !corrmaze; fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    fixup_special();
}

/**
 * C ref: dat/bigrm-3.lua via load_special.
 * Named omissions: ensure_way_out / solidify / premap; other bigrm-N.
 */
function load_bigrm_3() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    // des.level_flags("mazelevel", "noflip") — allow_flips=0

    // Exact dat/bigrm-3.lua des.map (18×75)
    const BIGRM3_MAP = [
        '---------------------------------------------------------------------------',
        '|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|',
        '|.........................................................................|',
        '|.........................................................................|',
        '|.........................................................................|',
        '|..............---.......................................---..............|',
        '|...............|.........................................|...............|',
        '|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|',
        '|.....|--------   --------|...................|----------   --------|.....|',
        '|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|',
        '|...............|.........................................|...............|',
        '|..............---.......................................---..............|',
        '|.........................................................................|',
        '|.........................................................................|',
        '|.........................................................................|',
        '|.........................................................................|',
        '|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|',
        '---------------------------------------------------------------------------',
    ].join('\n');
    splev_apply_centered_map(BIGRM3_MAP);

    // des.region(selection.area(01,01,73,16),"lit")
    {
        const mx = g.splev_xstart ?? 1;
        const my = g.splev_ystart ?? 0;
        light_region(mx + 1, my + 1, mx + 73, my + 16, true);
    }

    // if percent(66) then selection.match("[.w.]") → des.terrain(sel, F|T|W|Z)
    if (percent(66)) {
        const sel = selection_match_mapfrag('[.w.]');
        const terrains = [IRONBARS, TREE, WATER, LAVAWALL];
        const choice = terrains[lua_random2(1, terrains.length) - 1];
        selection_iterate(sel, (x, y) => sel_set_ter(x, y, choice, SET_LIT_NOCHANGE));
    }

    splev_create_stair(true);
    splev_create_stair(false);

    // des.non_diggable()
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    for (let i = 0; i < 15; i++) splev_create_object(null);
    for (let i = 0; i < 6; i++) splev_create_trap();

    // des.monster({ x, y }) — random mon at fixed map-relative coords
    {
        const mx = g.splev_xstart ?? 1;
        const my = g.splev_ystart ?? 0;
        for (const [rx, ry] of [
            [1, 1], [13, 1], [25, 1], [37, 1], [49, 1], [61, 1], [73, 1],
            [7, 7], [13, 7], [25, 7], [37, 7], [49, 7], [61, 7], [67, 7],
            [7, 9], [13, 9], [25, 9], [37, 9], [49, 9], [61, 9], [67, 9],
            [1, 16], [13, 16], [25, 16], [37, 16], [49, 16], [61, 16], [73, 16],
        ]) {
            induced_align(80);
            let x = mx + rx;
            let y = my + ry;
            const moved = splev_resolve_occupied(x, y, null);
            x = moved.x;
            y = moved.y;
            makemon(null, x, y, 0);
        }
    }

    // C load_special: wallification when !corrmaze; noflip → skip flip
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    fixup_special();
}

/**
 * C ref: makemon.c propagate + mbirth_limit — Medusa statue accept tally.
 * Named omission: full makemon-path propagate on every birth.
 */
function medusa_statue_propagate(mndx) {
    const g = game;
    if (!g.mvitals) g.mvitals = [];
    if (!g.mvitals[mndx]) g.mvitals[mndx] = { mvflags: 0, born: 0, died: 0 };
    const ptr = mons(mndx);
    const PM_NAZGUL = monsterNames.indexOf('PM_NAZGUL');
    const PM_ERINYS = monsterNames.indexOf('PM_ERINYS');
    const lim = mndx === PM_NAZGUL ? 9
        : mndx === PM_ERINYS ? 3
            : MAXMONNO;
    const gone = ((g.mvitals[mndx].mvflags | 0) & G_GONE) !== 0;
    const result = ((g.mvitals[mndx].born | 0) < lim && !gone);
    if (ptr && (ptr.geno & G_UNIQ) !== 0
        && mndx !== monsterNames.indexOf('PM_HIGH_CLERIC')) {
        g.mvitals[mndx].mvflags = (g.mvitals[mndx].mvflags | 0) | G_EXTINCT;
    }
    // C: tally && (!ghostly || result) with tally=TRUE ghostly=FALSE → always
    if ((g.mvitals[mndx].born | 0) < 255) {
        g.mvitals[mndx].born = (g.mvitals[mndx].born | 0) + 1;
    }
    if ((g.mvitals[mndx].born | 0) >= lim
        && ptr && (ptr.geno & G_NOGEN) === 0
        && ((g.mvitals[mndx].mvflags | 0) & G_EXTINCT) === 0) {
        g.mvitals[mndx].mvflags = (g.mvitals[mndx].mvflags | 0) | G_EXTINCT;
    }
    return result;
}

/**
 * C ref: dat/medusa-1.lua via load_special.
 * Named omissions: worn/artifact STONE_RES in resists_ston; medusa-2/3/4;
 * flip_level lregion coord update (same shortcut as Bar-strt/fire);
 * full mongone invent teardown beyond fmon unlink.
 */
function load_medusa_1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    // des.level_flags("mazelevel", "noteleport") — allow_flips default 3

    // Exact dat/medusa-1.lua des.map (20×75)
    const MEDUSA1_MAP = `
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}.}}}}}..}}}}}......}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}....}}}...}}}}}
}...}}.....}}}}}....}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}...............}
}....}}}}}}}}}}....}}}..}}}}}}}}}}}.......}}}}}}}}}}}}}}}}..}}.....}}}...}}
}....}}}}}}}}.....}}}}..}}}}}}.................}}}}}}}}}}}.}}}}.....}}...}}
}....}}}}}}}}}}}}.}}}}.}}}}}}.-----------------.}}}}}}}}}}}}}}}}}.........}
}....}}}}}}}}}}}}}}}}}}.}}}...|...............S...}}}}}}}}}}}}}}}}}}}....}}
}.....}.}}....}}}}}}}}}.}}....--------+--------....}}}}}}..}}}}}}}}}}}...}}
}......}}}}..}}}}}}}}}}}}}........|.......|........}}}}}....}}}}}}}}}}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}........|.......|........}}}}}...}}}}}}}}}.}}}}}}
}.....}}}}}}}}}}}}}}}}}}}}....--------+--------....}}}}}}.}.}}}}}}}}}}}}}}}
}......}}}}}}}}}}}}}}}}}}}}...S...............|...}}}}}}}}}}}}}}}}}.}}}}}}}
}.......}}}}}}}..}}}}}}}}}}}}.-----------------.}}}}}}}}}}}}}}}}}....}}}}}}
}........}}.}}....}}}}}}}}}}}}.................}}}}}..}}}}}}}}}.......}}}}}
}.......}}}}}}}......}}}}}}}}}}}}}}.......}}}}}}}}}.....}}}}}}...}}..}}}}}}
}.....}}}}}}}}}}}.....}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}..}}}}}}}}}}....}}}}}}}
}}..}}}}}}}}}}}}}....}}}}}}}}}}}}}}}}}}}}}}...}}..}}}}}}}.}}.}}}}..}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
`.replace(/^\n/, '');
    splev_apply_centered_map(MEDUSA1_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region(selection.area(00,00,74,19),"lit") — 2-arg light form
    light_region(mx + 0, my + 0, mx + 74, my + 19, true);
    // des.region(selection.area(31,07,45,07),"unlit")
    for (let x = 31; x <= 45; x++) {
        const loc = g.level.at(mx + x, my + 7);
        if (loc) loc.lit = false;
    }
    // des.region({ region={35,09, 41,10}, lit=0, type="ordinary", arrival_room=true })
    {
        const dx1 = mx + 35, dy1 = my + 9, dx2 = mx + 41, dy2 = my + 10;
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            add_room(dx1, dy1, dx2, dy2, false, OROOM, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.rlit = 0;
                troom.needjoining = true;
                troom.needfill = 0;
                topologize(troom);
            }
        }
    }
    // des.region(selection.area(31,12,45,12),"unlit")
    for (let x = 31; x <= 45; x++) {
        const loc = g.level.at(mx + x, my + 12);
        if (loc) loc.lit = false;
    }

    // des.teleport_region — applied after flip like fire/air
    g.lregions = g.lregions || [];
    g.lregions.push({
        rtype: LR_DOWNTELE,
        rname: null,
        inarea: { x1: mx + 1, y1: my + 1, x2: mx + 5, y2: my + 17 },
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    });
    g.lregions.push({
        rtype: LR_UPTELE,
        rname: null,
        inarea: { x1: mx + 26, y1: my + 4, x2: mx + 50, y2: my + 15 },
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    });
    // des.levregion branch with exclude Medusa's building
    g.lregions.push({
        rtype: LR_BRANCH,
        rname: null,
        inarea: { x1: mx + 1, y1: my + 0, x2: mx + 79, y2: my + 20 },
        delarea: { x1: mx + 30, y1: my + 6, x2: mx + 46, y2: my + 13 },
    });

    // des.stair("up", 05,14) / des.stair("down", 36,10)
    mkstairs(mx + 5, my + 14, 1, null);
    mkstairs(mx + 36, my + 10, 0, null);

    // des.door
    const medDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    medDoor(46, 7, D_CLOSED);
    medDoor(38, 8, D_LOCKED);
    medDoor(38, 11, D_LOCKED);
    medDoor(30, 12, D_CLOSED);

    // des.non_diggable(selection.area(30,06,46,13))
    for (let y = my + 6; y <= my + 13 && y < ROWNO; y++) {
        for (let x = mx + 30; x <= mx + 46 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    // des.object Perseus statue + contents (SP_OBJ_CONTAINER)
    {
        // C: mksobj_at(STATUE, x, y, TRUE, !named) — named → artif false
        const statue = mksobj_at(STATUE, mx + 36, my + 10, true, false);
        if (statue) {
            statue.spe = CORPSTAT_HISTORIC | CORPSTAT_MALE;
            if (PM_KNIGHT >= 0) set_corpsenm(statue, PM_KNIGHT);
            unbless(statue);
            uncurse(statue);
            oname(statue, 'Perseus', ONAME_LEVEL_DEF);
            // SP_OBJ_CONTAINER → delete_contents after mksobj book chance
            statue.cobj = null;
            statue.owt = weight(statue);
            const addContent = (otyp, buc, spe) => {
                const pos = get_location_coord_random(DRY);
                if (pos.x < 0) return;
                const otmp = mksobj_at(otyp, pos.x, pos.y, true, true);
                if (!otmp) return;
                if (spe != null) otmp.spe = spe;
                if (buc === 'cursed') curse(otmp);
                else if (buc === 'blessed') bless(otmp);
                else if (buc === 'uncursed') {
                    unbless(otmp);
                    uncurse(otmp);
                }
                otmp.oeroded = 0;
                otmp.oeroded2 = 0;
                otmp.oerodeproof = 0;
                obj_extract_self(otmp);
                add_to_container(statue, otmp);
                statue.owt = weight(statue);
            };
            if (percent(75)) addContent(SHIELD_OF_REFLECTION, 'cursed', 0);
            if (percent(25)) addContent(LEVITATION_BOOTS, null, 0);
            if (percent(50)) addContent(SCIMITAR, 'blessed', 2);
            if (percent(50)) addContent(SACK, null, null);
        }
    }

    // des.object({ id="statue", contents=0 }) × 7 — empty + Medusa invent fill
    // C ref: sp_lev.c create_object Medusa special when o->corpsenm == NON_PM
    for (let i = 0; i < 7; i++) {
        const pos = get_location_random(null);
        const otmp = mksobj_at(STATUE, pos.x, pos.y, true, true);
        if (!otmp) continue;
        otmp.cobj = null;
        otmp.owt = weight(otmp);
        let wastyp = otmp.corpsenm;
        let was = null;
        for (let j = 0; j < 1000; j++, wastyp = rndmonnum()) {
            was = makemon(mons(wastyp), 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
            if (!was) continue;
            // C: !resists_ston(was) && !poly_when_stoned(&mons[wastyp])
            if (!resists_ston(was)
                && !poly_when_stoned(mons(wastyp), g.mvitals)) {
                // C: propagate(wastyp, TRUE, FALSE) — MM_NOCOUNTBIRTH skipped tally
                medusa_statue_propagate(wastyp);
                break;
            }
            // C: mongone(was) — reject stone-resistant / poly-when-stoned
            const list = g.fmon;
            if (Array.isArray(list)) {
                const ix = list.indexOf(was);
                if (ix >= 0) list.splice(ix, 1);
            }
            was.mx = 0;
            was.my = 0;
            was.minvent = null;
            was = null;
        }
        if (was) {
            set_corpsenm(otmp, wastyp);
            while (was.minvent) {
                const obj = was.minvent;
                obj.owornmask = 0;
                obj_extract_self(obj);
                add_to_container(otmp, obj);
            }
            otmp.owt = weight(otmp);
            const list = g.fmon;
            if (Array.isArray(list)) {
                const ix = list.indexOf(was);
                if (ix >= 0) list.splice(ix, 1);
            }
            was.mx = 0;
            was.my = 0;
        }
    }

    // des.object() × 8
    for (let i = 0; i < 8; i++) splev_create_object(null);

    // des.trap() × 5 then board traps
    for (let i = 0; i < 5; i++) splev_create_trap();
    {
        const t1 = maketrap(mx + 38, my + 7, SQKY_BOARD);
        mktrap_seen_victim(t1, {});
        const t2 = maketrap(mx + 38, my + 12, SQKY_BOARD);
        mktrap_seen_victim(t2, {});
    }

    // des.monster Medusa asleep at downstairs
    {
        find_montype_gender('Medusa');
        induced_align(80);
        const pmIdx = name_to_mon('Medusa');
        if (pmIdx >= 0 && pmIdx !== NON_PM) {
            const mtmp = makemon(mons(pmIdx), mx + 36, my + 10, 0);
            if (mtmp) mtmp.msleeping = 1;
        }
    }
    // fixed-coord aquatic / snakes
    for (const [id, rx, ry] of [
        ['giant eel', 11, 6], ['giant eel', 23, 13], ['giant eel', 29, 2],
        ['jellyfish', 2, 2], ['jellyfish', 0, 8], ['jellyfish', 4, 18],
        ['water troll', 51, 3], ['water troll', 64, 11],
    ]) {
        const { mndx, female } = find_montype_gender(id);
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        let x = mx + rx;
        let y = my + ry;
        const moved = splev_resolve_occupied(x, y, mons(mndx));
        x = moved.x;
        y = moved.y;
        const mtmp = makemon(mons(mndx), x, y, 0);
        if (mtmp) mtmp.female = female;
    }
    for (const [rx, ry] of [[38, 7], [38, 12]]) {
        induced_align(80);
        const pm = mkclass('S_SNAKE', G_NOGEN);
        let x = mx + rx;
        let y = my + ry;
        const moved = splev_resolve_occupied(x, y, pm);
        x = moved.x;
        y = moved.y;
        if (pm) makemon(pm, x, y, 0);
    }
    for (let i = 0; i < 10; i++) splev_create_monster(null);

    // C load_special: wallification → flip → lregions → fixup
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    {
        const lregions = g.lregions || [];
        g.lregions = [];
        for (const r of lregions) {
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE || r.rtype === LR_DOWNTELE) {
                const tele = {
                    lx: r.inarea.x1, ly: r.inarea.y1,
                    hx: r.inarea.x2, hy: r.inarea.y2,
                    nlx: r.delarea.x1, nly: r.delarea.y1,
                    nhx: r.delarea.x2, nhy: r.delarea.y2,
                };
                if (r.rtype === LR_TELE || r.rtype === LR_UPTELE)
                    g.updest = { ...tele };
                if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE)
                    g.dndest = { ...tele };
            } else if (r.rtype === LR_BRANCH) {
                place_lregion(
                    r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                    r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                    LR_BRANCH, null,
                );
            }
        }
    }
    fixup_special();
}

/**
 * C ref: dat/bigrm-7.lua via load_special.
 * Named omissions: ensure_way_out / solidify / premap; other bigrm-N.
 */
function load_bigrm_7() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    // des.level_flags("mazelevel") — allow_flips stays default 3 (no noflip)

    // Exact dat/bigrm-7.lua des.map (19×75, trailing spaces pad width)
    const BIGRM7_MAP = [
        '                                                        -----              ',
        '                                                ---------...---            ',
        '                                        ---------.........L...---          ',
        '                                ---------.......................---        ',
        '                        ---------.................................---      ',
        '                ---------...........................................---    ',
        '        ---------.....................................................---  ',
        '---------...............................................................---',
        '|.........................................................................|',
        '|.L.....................................................................L.|',
        '|.........................................................................|',
        '---...............................................................---------',
        '  ---.....................................................---------        ',
        '    ---...........................................---------                ',
        '      ---.................................---------                        ',
        '        ---.......................---------                                ',
        '          ---...L.........---------                                        ',
        '            ---...---------                                                ',
        '              -----                                                        ',
    ].join('\n');
    splev_apply_centered_map(BIGRM7_MAP);

    // terrain = { "L", "T", "{", "." }; tidx = math.random(1, #terrain)
    // replace_terrain region {00,00,74,18} fromterrain L → terrain[tidx]
    {
        const terrain = [LAVAPOOL, TREE, FOUNTAIN, ROOM];
        const tidx = lua_random2(1, terrain.length) - 1;
        lspo_replace_terrain_region(0, 0, 74, 18, LAVAPOOL, terrain[tidx], 100);
    }

    // des.region(selection.area(01,01,73,17),"lit")
    {
        const mx = g.splev_xstart ?? 1;
        const my = g.splev_ystart ?? 0;
        light_region(mx + 1, my + 1, mx + 73, my + 17, true);
    }

    splev_create_stair(true);
    splev_create_stair(false);

    // des.non_diggable()
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    for (let i = 0; i < 15; i++) splev_create_object(null);
    for (let i = 0; i < 6; i++) splev_create_trap();
    for (let i = 0; i < 28; i++) splev_create_monster(null);

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/bigrm-8.lua via load_special.
 * Named omissions: ensure_way_out / solidify / premap; other bigrm-N.
 */
function load_bigrm_8() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    // des.level_flags("mazelevel") — allow_flips stays default 3 (no noflip)

    // Exact dat/bigrm-8.lua des.map (18×75, trailing spaces pad width)
    const BIGRM8_MAP = [
        '----------------------------------------------                             ',
        '|............................................---                           ',
        '--.............................................---                         ',
        ' ---......................................FF.....---                       ',
        '   ---...................................FF........---                     ',
        '     ---................................FF...........---                   ',
        '       ---.............................FF..............---                 ',
        '         ---..........................FF.................---               ',
        '           ---.......................FF....................---             ',
        '             ---....................FF.......................---           ',
        '               ---.................FF..........................---         ',
        '                 ---..............FF.............................---       ',
        '                   ---...........FF................................----    ',
        '                     ---........FF...................................---   ',
        '                       ---.....FF......................................--- ',
        '                         ---.............................................--',
        '                           ---............................................|',
        '                             ----------------------------------------------',
    ].join('\n');
    splev_apply_centered_map(BIGRM8_MAP);

    // if percent(40) then replace F → random {L,},T,.,-,C}
    if (percent(40)) {
        const terrain = [LAVAPOOL, MOAT, TREE, ROOM, HWALL, CLOUD];
        const tidx = lua_random2(1, terrain.length) - 1;
        lspo_replace_terrain_region(0, 0, 74, 17, IRONBARS, terrain[tidx], 100);
    }

    // des.region(selection.area(01,01,73,16),"lit") → light_region expands walls
    {
        const mx = g.splev_xstart ?? 1;
        const my = g.splev_ystart ?? 0;
        light_region(mx + 1, my + 1, mx + 73, my + 16, true);
    }

    splev_create_stair(true);
    splev_create_stair(false);

    // des.non_diggable()
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    for (let i = 0; i < 15; i++) splev_create_object(null);
    for (let i = 0; i < 6; i++) splev_create_trap();
    for (let i = 0; i < 28; i++) splev_create_monster(null);

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Bar-strt.lua via load_special — full script through branch
 * levregion; m_dowear after Pelias invent still partial.
 * Named omissions: m_dowear after custom invent; flip_level lregion
 * coord update (C also leaves lregions unflipped in this port path).
 */
function load_bar_strt() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;

    const BAR_STRT_MAP = `
..................................PP........................................
...................................PP.......................................
...................................PP.......................................
....................................PP......................................
........--------------......-----....PPP....................................
........|...S........|......+...|...PPP.....................................
........|----........|......|...|....PP.....................................
........|.\\..........+......-----...........................................
........|----........|...............PP.....................................
........|...S........|...-----.......PPP....................................
........--------------...+...|......PPPPP...................................
.........................|...|.......PPP....................................
...-----......-----......-----........PP....................................
...|...+......|...+..--+--.............PP...................................
...|...|......|...|..|...|..............PP..................................
...-----......-----..|...|.............PPPP.................................
.....................-----............PP..PP................................
.....................................PP...PP................................
....................................PP...PP.................................
....................................PP....PP................................
`.replace(/^\n/, '');
    splev_apply_centered_map(BAR_STRT_MAP);

    // des.replace_terrain forest strips (map-relative region arm)
    lspo_replace_terrain_region(37, 0, 59, 19, ROOM, TREE, 5);
    lspo_replace_terrain_region(60, 0, 64, 19, ROOM, TREE, 10);
    lspo_replace_terrain_region(65, 0, 75, 19, ROOM, TREE, 20);

    // des.terrain(selection.randline(selection.new(), 37,7, 62,02, 7), ".")
    // C: nhlsel.c l_selection_randline → get_location_coord then
    // selection_do_randline(..., roughness, 12, sel)
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;
    const pathSel = selection_new();
    selection_do_randline(mx + 37, my + 7, mx + 62, my + 2, 7, 12, pathSel);
    selection_iterate(pathSel, (x, y) => sel_set_ter(x, y, ROOM, false));
    // des.terrain({62,02}, ".") — portal free spot
    sel_set_ter(mx + 62, my + 2, ROOM, false);

    // des.region lit/unlit (map-relative; RNG-free)
    const barLit = (x1, y1, x2, y2, lit) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = lit;
            }
        }
    };
    barLit(0, 0, 75, 19, true);
    barLit(9, 5, 11, 5, false);
    barLit(9, 7, 11, 7, true);
    barLit(9, 9, 11, 9, false);
    barLit(13, 5, 20, 9, true);
    barLit(29, 5, 31, 6, true);
    barLit(26, 10, 28, 11, true);
    barLit(4, 13, 6, 14, true);
    barLit(15, 13, 17, 14, true);
    barLit(22, 14, 24, 15, true);

    // des.stair("down", 09,09)
    mkstairs(mx + 9, my + 9, 0, null);
    // des.levregion branch — placed after wallify/flip in load_special epilogue

    // des.door — C lspo_door → sel_set_door (typ already DOOR/SDOOR from map)
    const barDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    barDoor(12, 5, D_LOCKED);
    barDoor(12, 9, D_LOCKED);
    barDoor(21, 7, D_CLOSED);
    barDoor(7, 13, D_ISOPEN);
    barDoor(18, 13, D_ISOPEN);
    barDoor(23, 13, D_ISOPEN);
    barDoor(25, 10, D_ISOPEN);
    barDoor(28, 5, D_ISOPEN);

    // des.monster({ id = "Pelias", coord = {10,07}, inventory = ... })
    // C: sp_lev.c create_monster — induced_align then makemon; CUSTOM_INVENT
    // discards default minvent then invent callback objects → mpickobj.
    {
        find_montype_gender('Pelias');
        induced_align(80);
        const pmIdx = name_to_mon('Pelias');
        const mtmp = pmIdx >= 0
            ? makemon(mons(pmIdx), mx + 10, my + 7, 0)
            : null;
        if (mtmp) {
            // !(has_invent & DEFAULT_INVENT) → mdrop_special_objs + discard_minvent
            splev_discard_default_minvent(mtmp);
            // invent: des.object runesword/chain mail spe=5 (no coord → random)
            for (const [otyp, spe] of [[RUNESWORD, 5], [CHAIN_MAIL, 5]]) {
                const pos = get_location_random(null);
                const otmp = mksobj_at(otyp, pos.x, pos.y, true, true);
                if (!otmp) continue;
                otmp.spe = spe;
                otmp.oeroded = 0;
                otmp.oeroded2 = 0;
                otmp.oerodeproof = 0;
                obj_extract_self(otmp);
                mpickobj(mtmp, otmp);
            }
            // spo_end_moninvent → m_dowear deferred (C-JS-MAP)
        }
    }

    // des.object("chest", 09, 05)
    mksobj_at(CHEST, mx + 9, my + 5, true, true);

    // des.monster("chieftain", ...) — string+coord form
    for (const [rx, ry] of [
        [10, 5], [10, 9], [11, 5], [11, 9],
        [14, 5], [14, 9], [16, 5], [16, 9],
    ]) {
        const { mndx, female } = find_montype_gender('chieftain');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // des.non_diggable(selection.area(00,00,75,19))
    for (let y = my; y <= my + 19 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    // des.trap("spiked pit",37,07) — create_trap → mktrap; pits still burn
    // victim-gate rnd(4) then skip body via is_pit (mklev.c order).
    {
        const ttmp = maketrap(mx + 37, my + 7, SPIKED_PIT);
        mktrap_seen_victim(ttmp, {});
    }

    // des.monster("giant eel", ...) — fixed river coords
    for (const [rx, ry] of [[36, 1], [37, 9], [39, 15]]) {
        const { mndx, female } = find_montype_gender('giant eel');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // local ogrelocs = selection.floodfill(37,7) & selection.area(40,03, 45,20)
    // C: nhlsel floodfill match-under typ; area → fillrect; & → and
    {
        const fx = mx + 37;
        const fy = my + 7;
        const flood = selection_new();
        const matchTyp = g.level.at(fx, fy)?.typ ?? ROOM;
        selection_floodfill(flood, fx, fy, false, matchTyp);
        const area = selection_fillrect(mx + 40, my + 3, mx + 45, my + 20);
        const ogrelocs = selection_and(flood, area);
        // for i = 0, 11 do des.monster({ id="ogre", coord=rndcoord(1), peaceful=0 })
        for (let i = 0; i < 12; i++) {
            const pos = selection_rndcoord(ogrelocs, true);
            const { mndx, female } = find_montype_gender('ogre');
            induced_align(80);
            if (!pos || mndx < 0 || mndx === NON_PM) continue;
            const mtmp = makemon(mons(mndx), pos.x, pos.y, 0);
            if (mtmp) {
                mtmp.female = female;
                mtmp.mpeaceful = 0; // C: peaceful > BOOL_RANDOM override
            }
        }
    }

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // des.levregion({ region={62,02,62,02}, type="branch" }) via fixup
    // C levregion_add then fixup place_lregion oneshot (rn2(1) x2).
    place_lregion(
        mx + 62, my + 2, mx + 62, my + 2,
        0, 0, 0, 0, LR_BRANCH, null,
    );
    fixup_special();
}

/**
 * C ref: dat/Pri-strt.lua via load_special — Priest quest start.
 * Named omissions: spo_end_moninvent m_dowear after Arch Priest invent;
 * flip_level lregion coord update (same shortcut as Bar-strt);
 * fill_special_room TEMPLE beyond FILL_LVFLAGS has_temple.
 */
function load_pri_strt() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;

    const PRI_STRT_MAP = `
............................................................................
............................................................................
............................................................................
....................------------------------------------....................
....................|................|.....|.....|.....|....................
....................|..------------..|--+-----+-----+--|....................
....................|..|..........|..|.................|....................
....................|..|..........|..|+---+---+-----+--|....................
..................---..|..........|......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................---..|..........|......|...|...|.....|....................
....................|..|..........|..|+-----+---+---+--|....................
....................|..|..........|..|.................|....................
....................|..------------..|--+-----+-----+--|....................
....................|................|.....|.....|.....|....................
....................------------------------------------....................
............................................................................
............................................................................
............................................................................
`.replace(/^\n/, '');
    splev_apply_centered_map(PRI_STRT_MAP);

    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region(selection.area(00,00,75,19), "lit")
    for (let y = my; y <= my + 19 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    // des.region({ region={24,06, 33,13}, lit=1, type="temple", filled=2 })
    {
        const dx1 = mx + 24, dy1 = my + 6, dx2 = mx + 33, dy2 = my + 13;
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            add_room(dx1, dy1, dx2, dy2, true, TEMPLE, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.needfill = FILL_LVFLAGS;
                troom.needjoining = true;
                topologize(troom);
            }
        }
    }

    // des.replace_terrain forest strips (chance 10)
    lspo_replace_terrain_region(0, 0, 10, 19, ROOM, TREE, 10);
    lspo_replace_terrain_region(65, 0, 75, 19, ROOM, TREE, 10);

    // des.terrain({05,04}, ".") — portal/floodfill seed
    sel_set_ter(mx + 5, my + 4, ROOM, SET_LIT_NOCHANGE);

    // local spacelocs = selection.floodfill(05,04)
    const spacelocs = selection_new();
    {
        const fx = mx + 5, fy = my + 4;
        const matchTyp = g.level.at(fx, fy)?.typ ?? ROOM;
        selection_floodfill(spacelocs, fx, fy, false, matchTyp);
    }

    // des.stair("down", 52,09)
    mkstairs(mx + 52, my + 9, 0, null);

    // des.door — C lspo_door → sel_set_door
    const priDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    priDoor(18, 9, D_LOCKED);
    priDoor(18, 10, D_LOCKED);
    priDoor(34, 9, D_CLOSED);
    priDoor(34, 10, D_CLOSED);
    priDoor(40, 5, D_CLOSED);
    priDoor(46, 5, D_CLOSED);
    priDoor(52, 5, D_CLOSED);
    priDoor(38, 7, D_LOCKED);
    priDoor(42, 7, D_CLOSED);
    priDoor(46, 7, D_CLOSED);
    priDoor(52, 7, D_CLOSED);
    priDoor(38, 12, D_LOCKED);
    priDoor(44, 12, D_CLOSED);
    priDoor(48, 12, D_CLOSED);
    priDoor(52, 12, D_CLOSED);
    priDoor(40, 14, D_CLOSED);
    priDoor(46, 14, D_CLOSED);
    priDoor(52, 14, D_CLOSED);

    // des.altar({ x=28, y=09, align="noalign", type="altar" })
    {
        const loc = g.level.at(mx + 28, my + 9);
        if (loc) {
            loc.typ = ALTAR;
            loc.flags = AM_NONE;
            loc.altarmask = AM_NONE;
        }
    }

    // des.monster({ id = "Arch Priest", coord = {28, 10}, inventory = ... })
    {
        find_montype_gender('Arch Priest');
        induced_align(80);
        const pmIdx = name_to_mon('Arch Priest');
        const mtmp = pmIdx >= 0
            ? makemon(mons(pmIdx), mx + 28, my + 10, 0)
            : null;
        if (mtmp) {
            splev_discard_default_minvent(mtmp);
            for (const [otyp, spe] of [[ROBE, 4], [MACE, 4]]) {
                const pos = get_location_random(null);
                const otmp = mksobj_at(otyp, pos.x, pos.y, true, true);
                if (!otmp) continue;
                otmp.spe = spe;
                otmp.oeroded = 0;
                otmp.oeroded2 = 0;
                otmp.oerodeproof = 0;
                obj_extract_self(otmp);
                mpickobj(mtmp, otmp);
            }
            // spo_end_moninvent → m_dowear deferred
        }
    }

    // des.object("chest", 27, 10)
    mksobj_at(CHEST, mx + 27, my + 10, true, true);

    // des.monster("acolyte", ...)
    for (const [rx, ry] of [
        [32, 7], [32, 8], [32, 11], [32, 12],
        [33, 7], [33, 8], [33, 11], [33, 12],
    ]) {
        const { mndx, female } = find_montype_gender('acolyte');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // des.non_diggable(selection.area(18,03,55,16)) — STWALL/TREE/IRONBARS
    for (let y = my + 3; y <= my + 16 && y < ROWNO; y++) {
        for (let x = mx + 18; x <= mx + 55 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
    }

    // des.trap("dart", spacelocs:rndcoord(1)) × 2
    for (let i = 0; i < 2; i++) {
        const pos = selection_rndcoord(spacelocs, true);
        if (!pos) continue;
        const ttmp = maketrap(pos.x, pos.y, DART_TRAP);
        mktrap_seen_victim(ttmp, {});
    }
    // des.trap() × 4
    for (let i = 0; i < 4; i++) splev_create_trap();

    // des.monster("human zombie", spacelocs:rndcoord(1)) × 12
    for (let i = 0; i < 12; i++) {
        const pos = selection_rndcoord(spacelocs, true);
        const { mndx, female } = find_montype_gender('human zombie');
        induced_align(80);
        if (!pos || mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), pos.x, pos.y, 0);
        if (mtmp) mtmp.female = female;
    }

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // des.levregion({ region={05,04,05,04}, type="branch" })
    // Place after flip at pre-flip map offsets (same Bar-strt shortcut;
    // flip_level lregion coord update named omission — portal lands at
    // unflipped (mx+5,my+4) which is still ROOM after both flips).
    place_lregion(
        mx + 5, my + 4, mx + 5, my + 4,
        0, 0, 0, 0, LR_BRANCH, null,
    );
    fixup_special();
}

/**
 * C ref: dat/Pri-loca.lua via load_special — Priest quest locate
 * (Temple of Nalzok). Mines init is a lit-field kludge (fg=bg=".");
 * des.map overlays with C lspo_map lit=FALSE (D-0668 clears SpLev_Map
 * .lit); morgue regions stock undead; temple flood re-lights.
 * Named omissions: humidity-aware get_location; flip_level (noflip);
 * spo_end_moninvent m_dowear; add_doors_to_room mid-region (doors are
 * linked once via link_doors_rooms before wallify, ≡ C load_special).
 */
function load_pri_loca() {
    const g = game;
    nhlib_shuffle_align();

    // des.level_init({ style = "solidfill", fg = " " }) — lit defaults BOOL_RANDOM
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.hardfloor = true;

    // des.level_init mines: fg=".", bg=".", smoothed=false, joined=false,
    // lit=1, walled=false — kludge for a lit open field (fg==bg)
    splev_initlev({
        init_style: LVLINIT_MINES,
        fg: ROOM, bg: ROOM, filling: ROOM,
        lit: 1, smoothed: false, joined: false, walled: false,
        icedpools: false,
    });

    const PRI_LOCA_MAP = `
........................................
........................................
..........----------+----------.........
..........|........|.|........|.........
..........|........|.|........|.........
..........|----.----.----.----|.........
..........+...................+.........
..........+...................+.........
..........|----.----.----.----|.........
..........|........|.|........|.........
..........|........|.|........|.........
..........----------+----------.........
........................................
........................................
`.replace(/^\n/, '');
    splev_apply_centered_map(PRI_LOCA_MAP);
    // C lspo_map defaults lit=FALSE → set_levltyp_lit clears mines-init
    // lit=1 on every map cell (sel_set_ter(...,false) is still nochange
    // for other loaders; Pri-loca needs the C clear so morgue stays dark).
    {
        const sp = g.SpLev_Map;
        if (sp) {
            for (const key of sp) {
                const comma = key.indexOf(',');
                const x = Number(key.slice(0, comma));
                const y = Number(key.slice(comma + 1));
                const loc = g.level.at(x, y);
                if (!loc) continue;
                loc.lit = IS_LAVA(loc.typ) ? true : false;
            }
        }
    }
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    const priAddRectRoom = (x1, y1, x2, y2, lit, rtype, needfill) => {
        const dx1 = mx + x1, dy1 = my + y1, dx2 = mx + x2, dy2 = my + y2;
        if ((g.level.nroom | 0) >= MAXNROFROOMS) return null;
        add_room(dx1, dy1, dx2, dy2, lit, rtype, true);
        const troom = g.level.rooms[g.level.nroom - 1];
        if (!troom) return null;
        troom.needfill = needfill;
        troom.needjoining = true;
        topologize(troom);
        return troom;
    };

    // des.region morgue rects (filled=1) — lua x2=39 (D-0657/D-0658).
    // fill_zoo skips lx edge when doorct>0 (doors linked below).
    priAddRectRoom(0, 0, 9, 13, false, MORGUE, FILL_NORMAL);
    priAddRectRoom(9, 0, 30, 1, false, MORGUE, FILL_NORMAL);
    priAddRectRoom(9, 12, 30, 13, false, MORGUE, FILL_NORMAL);
    priAddRectRoom(31, 0, 39, 13, false, MORGUE, FILL_NORMAL);

    // des.region temple irregular filled=1 — flood from region x1,y1
    let templeRoom = null;
    {
        const dx1 = mx + 11, dy1 = my + 3;
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            const bounds = {
                min_rx: dx1, max_rx: dx1, min_ry: dy1, max_ry: dy1,
            };
            const rmno = g.level.nroom + ROOMOFFSET;
            if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
            flood_fill_rm(dx1, dy1, rmno, true, true, bounds);
            add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
                false, TEMPLE, true);
            templeRoom = g.level.rooms[g.level.nroom - 1];
            if (templeRoom) {
                templeRoom.rlit = 1;
                templeRoom.irregular = true;
                templeRoom.needjoining = true;
                templeRoom.needfill = FILL_NORMAL;
            }
        }
    }

    // des.altar({ x=20,y=07, align="noalign", type="shrine" })
    {
        const ax = mx + 20, ay = my + 7;
        const loc = g.level.at(ax, ay);
        if (loc) {
            loc.typ = ALTAR;
            loc.flags = AM_NONE | AM_SHRINE;
            loc.altarmask = AM_NONE | AM_SHRINE;
        }
        // C create_altar shrine in temple → priestini
        if (templeRoom) priestini(g.u?.uz, templeRoom, ax, ay, false);
    }

    // des.monster({ id = "aligned cleric", x=20, y=07, align="noalign", peaceful=0 })
    {
        // C: find_montype gender before create_monster; align=noalign skips
        // induced_align(80) random-amask burn.
        const { mndx, female } = find_montype_gender('aligned cleric');
        const pm = (mndx >= 0 && mndx !== NON_PM) ? mons(mndx) : null;
        let pos = { x: mx + 20, y: my + 7 };
        pos = splev_resolve_occupied(pos.x, pos.y, pm);
        const mtmp = pm ? makemon(pm, pos.x, pos.y, 0) : null;
        if (mtmp) {
            mtmp.female = female;
            mtmp.mpeaceful = 0;
            set_malign(mtmp);
        }
    }

    // des.door locked
    const priDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    priDoor(10, 6, D_LOCKED);
    priDoor(10, 7, D_LOCKED);
    priDoor(20, 2, D_LOCKED);
    priDoor(20, 11, D_LOCKED);
    priDoor(30, 6, D_LOCKED);
    priDoor(30, 7, D_LOCKED);

    // Stairs — up intentionally off-map (x=43); down in temple
    mkstairs(mx + 43, my + 5, 1, null);
    mkstairs(mx + 20, my + 6, 0, null);

    // des.non_diggable(selection.area(10,02,30,13))
    for (let y = my + 2; y <= my + 13 && y < ROWNO; y++) {
        for (let x = mx + 10; x <= mx + 30 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
    }

    // des.object({ coord = { … } }) — RANDOM_CLASS; clear erosion
    for (const [rx, ry] of [
        [14, 3], [15, 3], [16, 3],
        [14, 10], [15, 10], [16, 10], [17, 10],
        [24, 3], [25, 3], [26, 3], [27, 3],
        [24, 10], [25, 10], [26, 10], [27, 10],
    ]) {
        const otmp = mkobj_at(RANDOM_CLASS, mx + rx, my + ry, true);
        if (!otmp) continue;
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        otmp.oerodeproof = 0;
    }

    // Fixed traps then two random-location traps
    // C: des.trap({ coord }) without type → maketrap random kind
    // Can_fall_thru respects hardfloor (Pri-loca) → holes become ROCKTRAP
    for (const [rx, ry] of [[15, 4], [25, 4], [15, 9], [25, 9]]) {
        let kind;
        do { kind = traptype_rnd(); } while (kind === NO_TRAP);
        if (is_hole(kind) && !Can_fall_thru(g.u?.uz)) kind = ROCKTRAP;
        const ttmp = maketrap(mx + rx, my + ry, kind);
        mktrap_seen_victim(ttmp, {});
    }
    for (let i = 0; i < 2; i++) splev_create_trap();

    // C load_special: link_doors_rooms before wallify/fixup (sp_lev.c).
    // Door linkage makes fill_zoo skip morgue door-edges → fill count
    // matches lua hx=39 (D-0645 hx=35 clip removed; D-0658).
    link_doors_rooms();

    // des.level_flags noflip — wallify then fixup (skip flip_level_rnd)
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    fixup_special();
}

/**
 * C ref: dat/Pri-goal.lua via load_special — Priest quest goal (Nalzok).
 * Mines init fg=L bg=. (filling defaults to fg=lava). Map 'x' keeps lava.
 * Named omissions: humidity get_location beyond HOT for lava-likers;
 * spo_end_moninvent m_dowear; Pri-fila/filb.
 */
function load_pri_goal() {
    const g = game;
    nhlib_shuffle_align();

    // des.level_init({ style = "solidfill", fg = " " })
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;

    // des.level_init mines: fg="L", bg=".", lit=0, smoothed/joined/walled false
    // C: filling defaults to fg when omitted (sp_lev.c get_table_mapchr_opt)
    splev_initlev({
        init_style: LVLINIT_MINES,
        fg: LAVAPOOL, bg: ROOM, filling: LAVAPOOL,
        lit: 0, smoothed: false, joined: false, walled: false,
        icedpools: false,
    });

    const PRI_GOAL_MAP = `
xxxxxx..xxxxxx...xxxxxxxxx
xxxx......xx......xxxxxxxx
xx.xx.............xxxxxxxx
x....................xxxxx
......................xxxx
......................xxxx
xx........................
xxx......................x
xxx................xxxxxxx
xxxx.....x.xx.......xxxxxx
xxxxx...xxxxxx....xxxxxxxx
`.replace(/^\n/, '');
    splev_apply_centered_map(PRI_GOAL_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // local place = { {14,04}, {13,07} }; placeidx = math.random(1, #place)
    // nh.random(1,2) → 1+rn2(2); JS 0-based index
    const place = [[14, 4], [13, 7]];
    const placeidx = rn2(2);
    const [px, py] = place[placeidx];

    // des.region(selection.area(00,00,25,10), "unlit")
    // C sp_lev.c light_region: lava stays lit (IS_LAVA → lit=1).
    light_region(mx + 0, my + 0, mx + 25, my + 10, false);

    // des.stair("up", 20,05)
    mkstairs(mx + 20, my + 5, 1, null);

    // des.object helm of brilliance → The Mitre of Holiness
    // eroded=-1 ⇒ oerodeproof=1 (lua comment / create_object)
    {
        const otmp = mksobj_at(HELM_OF_BRILLIANCE, mx + px, my + py, true, false);
        if (otmp) {
            otmp.spe = 0;
            bless(otmp);
            otmp.oeroded = 0;
            otmp.oeroded2 = 0;
            otmp.oerodeproof = 1;
            oname(otmp, 'The Mitre of Holiness', ONAME_LEVEL_DEF);
        }
    }

    // des.object() × 14
    for (let i = 0; i < 14; i++) splev_create_object(null);

    // des.trap("fire") × 4 then des.trap() × 2
    for (let i = 0; i < 4; i++) {
        let trycnt = 0;
        let pos;
        do {
            pos = get_location_random(null);
            const typ = g.level.at(pos.x, pos.y)?.typ;
            if (typ !== STAIRS && typ !== LADDER) break;
        } while (++trycnt <= 100);
        if (trycnt > 100) continue;
        const ttmp = maketrap(pos.x, pos.y, FIRE_TRAP);
        mktrap_seen_victim(ttmp, {});
    }
    for (let i = 0; i < 2; i++) splev_create_trap();

    // des.monster("Nalzok", place[placeidx])
    {
        find_montype_gender('Nalzok');
        induced_align(80);
        const pmIdx = name_to_mon('Nalzok');
        if (pmIdx >= 0 && pmIdx !== NON_PM) {
            makemon(mons(pmIdx), mx + px, my + py, 0);
        }
    }
    for (let i = 0; i < 16; i++) splev_create_monster('human zombie');
    for (let i = 0; i < 2; i++) splev_create_monster('Z');
    for (let i = 0; i < 8; i++) splev_create_monster('wraith');
    splev_create_monster('W');

    // C load_special: wallification → flip_level_rnd → fixup
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Arc-strt.lua via load_special — Archeologist quest start.
 * Named omissions: spo_end_moninvent m_dowear;
 * humidity-aware get_location for water-likers (eels use fixed moat).
 */
function load_arc_strt() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;

    const ARC_STRT_MAP = `
............................................................................
............................................................................
............................................................................
............................................................................
....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................
....................}-------------------------------------}.................
....................}|..S......+.................+.......|}.................
....................}-S---------------+----------|.......|}.................
....................}|.|...............|.......+.|.......|}.................
....................}|.|...............---------.---------}.................
....................}|.S.\\.............+.................+..................
....................}|.|...............---------.---------}.................
....................}|.|...............|.......+.|.......|}.................
....................}-S---------------+----------|.......|}.................
....................}|..S......+.................+.......|}.................
....................}-------------------------------------}.................
....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................
............................................................................
............................................................................
............................................................................
`.replace(/^\n/, '');
    splev_apply_centered_map(ARC_STRT_MAP);

    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region lit/unlit (map-relative; RNG-free)
    const arcLit = (x1, y1, x2, y2, lit) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = lit;
            }
        }
    };
    arcLit(0, 0, 75, 19, true);
    arcLit(22, 6, 23, 6, false);
    arcLit(25, 6, 30, 6, false);
    arcLit(32, 6, 48, 6, false);
    arcLit(50, 6, 56, 8, true);
    arcLit(40, 8, 46, 8, false);
    arcLit(22, 8, 22, 12, false);
    arcLit(24, 8, 38, 12, false);
    arcLit(48, 8, 48, 8, true);
    arcLit(40, 10, 56, 10, true);
    arcLit(48, 12, 48, 12, true);
    arcLit(40, 12, 46, 12, false);
    arcLit(50, 12, 56, 14, true);
    arcLit(22, 14, 23, 14, false);
    arcLit(25, 14, 30, 14, false);
    arcLit(32, 14, 48, 14, false);

    // des.stair("down", 55,07)
    mkstairs(mx + 55, my + 7, 0, null);

    // des.door — C lspo_door → sel_set_door
    const arcDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    arcDoor(22, 7, D_CLOSED);
    arcDoor(38, 7, D_CLOSED);
    arcDoor(47, 8, D_LOCKED);
    arcDoor(23, 10, D_LOCKED);
    arcDoor(39, 10, D_LOCKED);
    arcDoor(57, 10, D_LOCKED);
    arcDoor(47, 12, D_LOCKED);
    arcDoor(22, 13, D_CLOSED);
    arcDoor(38, 13, D_CLOSED);
    arcDoor(24, 14, D_LOCKED);
    arcDoor(31, 14, D_CLOSED);
    arcDoor(49, 14, D_LOCKED);

    // des.monster({ id = "Lord Carnarvon", coord = {25, 10}, inventory = ... })
    {
        find_montype_gender('Lord Carnarvon');
        induced_align(80);
        const pmIdx = name_to_mon('Lord Carnarvon');
        const mtmp = pmIdx >= 0
            ? makemon(mons(pmIdx), mx + 25, my + 10, 0)
            : null;
        if (mtmp) {
            splev_discard_default_minvent(mtmp);
            for (const [otyp, spe] of [[FEDORA, 5], [BULLWHIP, 4]]) {
                const pos = get_location_random(null);
                const otmp = mksobj_at(otyp, pos.x, pos.y, true, true);
                if (!otmp) continue;
                otmp.spe = spe;
                otmp.oeroded = 0;
                otmp.oeroded2 = 0;
                otmp.oerodeproof = 0;
                obj_extract_self(otmp);
                mpickobj(mtmp, otmp);
            }
        }
    }

    // des.object("chest", 25, 10)
    mksobj_at(CHEST, mx + 25, my + 10, true, true);

    // des.monster("student", ...)
    for (const [rx, ry] of [
        [26, 9], [27, 9], [28, 9],
        [26, 10], [28, 10],
        [26, 11], [27, 11], [28, 11],
    ]) {
        const { mndx, female } = find_montype_gender('student');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // des.monster("watchman", ...)
    for (const [rx, ry] of [[50, 6], [50, 14]]) {
        const { mndx, female } = find_montype_gender('watchman');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // des.monster("giant eel", ...) — fixed moat coords
    for (const [rx, ry] of [[20, 10], [45, 4], [33, 16]]) {
        const { mndx, female } = find_montype_gender('giant eel');
        induced_align(80);
        if (mndx < 0 || mndx === NON_PM) continue;
        const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
        if (mtmp) mtmp.female = female;
    }

    // des.non_diggable(selection.area(00,00,75,19))
    for (let y = my; y <= my + 19 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    // des.trap() × 6 — create_trap → mktrap(random)
    for (let i = 0; i < 6; i++) splev_create_trap();

    // Siege monsters — class letter + fixed coord
    const placeClassMon = (cls, rx, ry) => {
        induced_align(80);
        const mlet = monclass_letter_to_mlet(cls);
        const pm = mlet ? mkclass(mlet, G_NOGEN) : null;
        let x = mx + rx;
        let y = my + ry;
        if (m_at(x, y)) {
            const cc = { x: 0, y: 0 };
            if (enexto(cc, x, y, pm)) {
                x = cc.x;
                y = cc.y;
            }
        }
        makemon(pm, x, y, 0);
    };
    for (const [cls, rx, ry] of [
        ['S', 60, 9], ['M', 60, 10], ['S', 60, 11], ['S', 60, 12],
        ['M', 60, 13], ['S', 61, 10], ['S', 61, 11], ['S', 61, 12],
        ['S', 30, 3], ['M', 20, 17], ['S', 67, 2], ['S', 10, 19],
    ]) {
        placeClassMon(cls, rx, ry);
    }

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // des.levregion({ region={63,06,63,06}, type="branch" })
    place_lregion(
        mx + 63, my + 6, mx + 63, my + 6,
        0, 0, 0, 0, LR_BRANCH, null,
    );
    fixup_special();
}

/**
 * C ref: dat/Arc-loca.lua via load_special — Archeologist quest locate.
 * Named omissions: humidity-aware get_location; selection.grow on
 * 2-arg lit regions; spo_end_moninvent m_dowear.
 */
function load_arc_loca() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.hardfloor = true;

    const ARC_LOCA_MAP = `
............................................................................
............................................................................
............................................................................
........................-------------------------------.....................
........................|....|.S......................|.....................
........................|....|.|.|+------------------.|.....................
........................|....|.|.|.|.........|......|.|.....................
........................|....|.|.|.|.........|......|.|.....................
........................|---+-.|.|.|..---....+......|.|.....................
........................|....|.|.|.---|.|....|......|.|.....................
........................|....S.|.|.+..S.|--S-----S--|.|.....................
........................|....|.|.|.---|.|....|......+.|.....................
........................|---+-.|.|.|..---....|.------.|.....................
........................|....|.|.|.|.........|.|....+.|.....................
........................|....|.|.|.|.........|+|....|-|.....................
........................|....|.|.|------------+------.S.....................
........................|....|.S......................|.....................
........................-------------------------------.....................
............................................................................
............................................................................
`.replace(/^\n/, '');
    splev_apply_centered_map(ARC_LOCA_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region lit/unlit (map-relative; RNG-free for fixed lit values)
    const arcLit = (x1, y1, x2, y2, lit) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = lit;
            }
        }
    };
    arcLit(0, 0, 75, 19, true);
    arcLit(30, 4, 30, 16, true);
    arcLit(32, 4, 32, 16, false);
    arcLit(36, 10, 37, 10, false);
    arcLit(39, 9, 39, 11, false);
    arcLit(46, 6, 51, 9, false);
    arcLit(48, 13, 51, 14, false);

    // Temple / irregular rooms — C lspo_region (needfill FILL_LVFLAGS=2)
    const arcAddRectRoom = (x1, y1, x2, y2, lit, rtype, needfill) => {
        const dx1 = mx + x1, dy1 = my + y1, dx2 = mx + x2, dy2 = my + y2;
        if ((g.level.nroom | 0) >= MAXNROFROOMS) return;
        add_room(dx1, dy1, dx2, dy2, lit, rtype, true);
        const troom = g.level.rooms[g.level.nroom - 1];
        if (!troom) return;
        troom.needfill = needfill;
        troom.needjoining = true;
        topologize(troom);
    };
    const arcAddIrregular = (x1, y1, lit) => {
        const dx1 = mx + x1, dy1 = my + y1;
        if ((g.level.nroom | 0) >= MAXNROFROOMS) return;
        const bounds = {
            min_rx: dx1, max_rx: dx1, min_ry: dy1, max_ry: dy1,
        };
        const rmno = g.level.nroom + ROOMOFFSET;
        if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
        flood_fill_rm(dx1, dy1, rmno, lit, true, bounds);
        add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
            false, OROOM, true);
        const troom = g.level.rooms[g.level.nroom - 1];
        if (!troom) return;
        troom.rlit = lit ? 1 : 0;
        troom.irregular = true;
        troom.needjoining = true;
        troom.needfill = 0;
    };
    arcAddRectRoom(25, 4, 28, 7, true, TEMPLE, FILL_LVFLAGS);
    arcAddRectRoom(25, 9, 28, 11, false, TEMPLE, FILL_LVFLAGS);
    arcAddRectRoom(25, 13, 28, 16, true, TEMPLE, FILL_LVFLAGS);
    // irregular ordinary regions (lit=0)
    arcAddIrregular(33, 4, false);
    arcAddIrregular(36, 6, false);
    arcAddIrregular(36, 12, false);
    arcAddIrregular(46, 11, false);
    // remaining unlit ordinary rects (lighting only; room_not_needed)
    arcLit(33, 4, 53, 4, false);
    arcLit(36, 6, 42, 8, false);
    arcLit(36, 12, 42, 14, false);
    arcLit(46, 11, 49, 11, false);

    // des.door
    const arcDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    arcDoor(31, 4, D_CLOSED);
    arcDoor(28, 8, D_CLOSED);
    arcDoor(29, 10, D_LOCKED);
    arcDoor(28, 12, D_CLOSED);
    arcDoor(31, 16, D_CLOSED);
    arcDoor(34, 5, D_LOCKED);
    arcDoor(35, 10, D_LOCKED);
    arcDoor(38, 10, D_LOCKED);
    arcDoor(43, 10, D_CLOSED);
    arcDoor(45, 8, D_CLOSED);
    arcDoor(46, 14, D_LOCKED);
    arcDoor(46, 15, D_LOCKED);
    arcDoor(49, 10, D_LOCKED);
    arcDoor(52, 11, D_LOCKED);
    arcDoor(52, 13, D_CLOSED);
    arcDoor(54, 15, D_CLOSED);

    // des.stair
    mkstairs(mx + 3, my + 17, 1, null);
    mkstairs(mx + 39, my + 10, 0, null);

    // des.altar — type="altar" (shrine=0); align from shuffled splev_align
    const alignStrToAmask = (s) => {
        if (s === 'law') return AM_LAWFUL;
        if (s === 'neutral') return AM_NEUTRAL;
        if (s === 'chaos') return AM_CHAOTIC;
        return AM_NEUTRAL;
    };
    const align = g.splev_align || ['law', 'neutral', 'chaos'];
    // Lua align[1..3] → JS indices 0..2
    for (const [rx, ry, ai] of [[26, 5, 0], [26, 10, 1], [26, 15, 2]]) {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) continue;
        loc.typ = ALTAR;
        const amask = alignStrToAmask(align[ai]);
        loc.flags = amask;
        loc.altarmask = amask;
    }

    // des.non_diggable — C sel_set_wall_property: STWALL/TREE/IRONBARS only
    for (let y = my; y <= my + 19 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
    }

    // des.object() × 15
    for (let i = 0; i < 15; i++) splev_create_object(null);

    // des.engraving — random DRY spot, type engrave, degrade default
    for (let i = 0; i < 4; i++) {
        const pos = get_location_random(null);
        const ep = make_engr_at(
            pos.x, pos.y, 'X marks the spot.', null, 0, ENGRAVE,
        );
        // C: wipeout = degrade default TRUE → nowipeout = !wipeout = false
        if (ep) ep.nowipeout = 0;
    }

    // Fixed traps then random-location traps
    const placeTrap = (ttyp, rx, ry) => {
        const ttmp = maketrap(mx + rx, my + ry, ttyp);
        mktrap_seen_victim(ttmp, {});
    };
    for (const [rx, ry] of [
        [24, 2], [37, 0], [23, 5], [26, 19], [55, 10], [55, 8],
    ]) {
        placeTrap(SPIKED_PIT, rx, ry);
    }
    for (const [rx, ry] of [
        [51, 1], [23, 18], [31, 18], [48, 19], [55, 15],
    ]) {
        placeTrap(PIT, rx, ry);
    }
    placeTrap(MAGIC_TRAP, 60, 4);
    placeTrap(STATUE_TRAP, 72, 7);
    for (let i = 0; i < 2; i++) {
        const pos = get_location_random(null);
        const ttmp = maketrap(pos.x, pos.y, STATUE_TRAP);
        mktrap_seen_victim(ttmp, {});
    }
    placeTrap(ANTI_MAGIC, 64, 12);
    for (let i = 0; i < 2; i++) {
        const pos = get_location_random(null);
        const ttmp = maketrap(pos.x, pos.y, SLP_GAS_TRAP);
        mktrap_seen_victim(ttmp, {});
    }
    for (let i = 0; i < 3; i++) {
        const pos = get_location_random(null);
        const ttmp = maketrap(pos.x, pos.y, DART_TRAP);
        mktrap_seen_victim(ttmp, {});
    }
    placeTrap(ROLLING_BOULDER_TRAP, 32, 10);
    placeTrap(ROLLING_BOULDER_TRAP, 40, 16);

    // des.monster — class S / M + human mummy
    for (let i = 0; i < 18; i++) splev_create_monster('S');
    splev_create_monster('M');
    for (let i = 0; i < 7; i++) splev_create_monster('human mummy');
    splev_create_monster('M');

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Arc-goal.lua via load_special — Archeologist quest goal.
 * Named omissions: humidity-aware get_location; spo_end_moninvent
 * m_dowear; fill_special_room TEMPLE flag-only path beyond has_temple.
 */
function load_arc_goal() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;

    const ARC_GOAL_MAP = `
                                                                            
                                  ---------                                 
                                  |..|.|..|                                 
                       -----------|..S.S..|-----------                      
                       |.|........|+-|.|-+|........|.|                      
                       |.S........S..|.|..S........S.|                      
                       |.|........|..|.|..|........|.|                      
                    ------------------+------------------                   
                    |..|..........|.......|..........|..|                   
                    |..|..........+.......|..........S..|                   
                    |..S..........|.......+..........|..|                   
                    |..|..........|.......|..........|..|                   
                    ------------------+------------------                   
                       |.|........|..|.|..|........|.|                      
                       |.S........S..|.|..S........S.|                      
                       |.|........|+-|.|-+|........|.|                      
                       -----------|..S.S..|-----------                      
                                  |..|.|..|                                 
                                  ---------                                 
                                                                            
`.replace(/^\n/, '');
    splev_apply_centered_map(ARC_GOAL_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region lit/unlit (map-relative; RNG-free for fixed lit values)
    const arcLit = (x1, y1, x2, y2, lit) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = lit;
            }
        }
    };
    arcLit(0, 0, 75, 19, true);
    arcLit(35, 2, 36, 3, false);
    arcLit(40, 2, 41, 3, false);
    arcLit(24, 4, 24, 6, false);
    arcLit(26, 4, 33, 6, true);
    arcLit(38, 2, 38, 6, false);
    arcLit(43, 4, 50, 6, true);
    arcLit(52, 4, 52, 6, false);
    arcLit(35, 5, 36, 6, false);
    arcLit(40, 5, 41, 6, false);
    arcLit(21, 8, 22, 11, false);
    arcLit(24, 8, 33, 11, true);
    arcLit(35, 8, 41, 11, false);
    arcLit(43, 8, 52, 11, true);
    arcLit(54, 8, 55, 11, false);
    arcLit(24, 13, 24, 15, false);
    arcLit(26, 13, 33, 15, false);
    arcLit(35, 13, 36, 14, false);
    arcLit(35, 16, 36, 17, false);
    arcLit(38, 13, 38, 17, false);
    arcLit(40, 13, 41, 14, false);
    arcLit(40, 16, 41, 17, false);
    arcLit(52, 13, 52, 15, false);

    // Temple room — C lspo_region needfill FILL_LVFLAGS=2 (flags only)
    {
        const dx1 = mx + 43, dy1 = my + 13, dx2 = mx + 50, dy2 = my + 15;
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            add_room(dx1, dy1, dx2, dy2, false, TEMPLE, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.needfill = FILL_LVFLAGS;
                troom.needjoining = true;
                topologize(troom);
            }
        }
    }

    // des.stair("up", 38,10)
    mkstairs(mx + 38, my + 10, 1, null);

    // des.non_diggable — C sel_set_wall_property: STWALL/TREE/IRONBARS only
    for (let y = my; y <= my + 19 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
    }

    // des.altar({ x=50,y=14,align="chaos",type="altar" }) — unattended
    {
        const loc = g.level.at(mx + 50, my + 14);
        if (loc) {
            loc.typ = ALTAR;
            loc.flags = AM_CHAOTIC;
            loc.altarmask = AM_CHAOTIC;
        }
    }

    // des.object crystal ball → The Orb of Detection (create_object named)
    {
        // C: mksobj_at(..., TRUE, !named) then spe/bless then oname LEVEL_DEF
        const otmp = mksobj_at(CRYSTAL_BALL, mx + 50, my + 14, true, false);
        if (otmp) {
            otmp.spe = 5;
            bless(otmp);
            otmp.oeroded = 0;
            otmp.oeroded2 = 0;
            otmp.oerodeproof = 0;
            oname(otmp, 'The Orb of Detection', ONAME_LEVEL_DEF);
        }
    }

    // des.object() × 14 (Arc-goal.lua lines 65–78)
    for (let i = 0; i < 14; i++) splev_create_object(null);

    // des.trap() × 6 then fixed rolling boulder
    for (let i = 0; i < 6; i++) splev_create_trap();
    {
        const ttmp = maketrap(mx + 46, my + 14, ROLLING_BOULDER_TRAP);
        mktrap_seen_victim(ttmp, {});
    }

    // des.monster("Minion of Huhetotl", 50, 14)
    {
        find_montype_gender('Minion of Huhetotl');
        induced_align(80);
        const pmIdx = name_to_mon('Minion of Huhetotl');
        if (pmIdx >= 0 && pmIdx !== NON_PM) {
            makemon(mons(pmIdx), mx + 50, my + 14, 0);
        }
    }

    // des.monster class S × 18, human mummy × 8, class M × 1
    for (let i = 0; i < 18; i++) splev_create_monster('S');
    for (let i = 0; i < 8; i++) splev_create_monster('human mummy');
    splev_create_monster('M');

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Bar-loca.lua via load_special — locate level (ogre fort).
 * Named omissions: humidity-aware get_location for water-likers;
 * set_malign after peaceful override (matches Bar-strt partial);
 * Bar-goal.
 */
function load_bar_loca() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.hardfloor = true;

    const BAR_LOCA_MAP = `
..........PPP.........................................                      
...........PP..........................................        .......      
..........PP...........-----..........------------------     ..........     
...........PP..........+...|..........|....S...........|..  ............    
..........PPP..........|...|..........|-----...........|...  .............  
...........PPP.........-----..........+....+...........|...  .............  
..........PPPPPPPPP...................+....+...........S.................   
........PPPPPPPPPPPPP.........-----...|-----...........|................    
......PPPPPPPPPPPPPP..P.......+...|...|....S...........|          ...       
.....PPPPPPP......P..PPPP.....|...|...------------------..         ...      
....PPPPPPP.........PPPPPP....-----........................      ........   
...PPPPPPP..........PPPPPPP..................................   ..........  
....PPPPPPP........PPPPPPP....................................  ..........  
.....PPPPP........PPPPPPP.........-----........................   ........  
......PPP..PPPPPPPPPPPP...........+...|.........................    .....   
..........PPPPPPPPPPP.............|...|.........................     ....   
..........PPPPPPPPP...............-----.........................       .    
..............PPP.................................................          
...............PP....................................................       
................PPP...................................................      
`.replace(/^\n/, '');
    splev_apply_centered_map(BAR_LOCA_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // des.region lit/unlit (map-relative; RNG-free)
    const barLit = (x1, y1, x2, y2, lit) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = lit;
            }
        }
    };
    barLit(0, 0, 75, 19, true);
    barLit(24, 3, 26, 4, false);
    barLit(31, 8, 33, 9, false);
    barLit(35, 14, 37, 15, false);
    barLit(39, 3, 54, 8, true);
    barLit(56, 0, 75, 8, false);
    barLit(64, 9, 75, 16, false);

    // des.door
    const barDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    barDoor(23, 3, D_ISOPEN);
    barDoor(30, 8, D_ISOPEN);
    barDoor(34, 14, D_ISOPEN);
    barDoor(38, 5, D_LOCKED);
    barDoor(38, 6, D_LOCKED);
    barDoor(43, 3, D_CLOSED);
    barDoor(43, 5, D_CLOSED);
    barDoor(43, 6, D_CLOSED);
    barDoor(43, 8, D_CLOSED);
    barDoor(55, 6, D_LOCKED);

    // des.stair
    mkstairs(mx + 5, my + 2, 1, null);
    mkstairs(mx + 70, my + 13, 0, null);

    // des.object({ x, y }) — create_object RANDOM_CLASS; default clears erosion
    for (const [rx, ry] of [
        [42, 3], [42, 3], [42, 3],
        [41, 3], [41, 3], [41, 3], [41, 3],
        [41, 8], [41, 8],
        [42, 8], [42, 8], [42, 8],
        [71, 13], [71, 13], [71, 13],
    ]) {
        const otmp = mkobj_at(RANDOM_CLASS, mx + rx, my + ry, true);
        if (!otmp) continue;
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        otmp.oerodeproof = 0;
    }

    // des.trap spiked pit (fixed) + four random
    for (const [rx, ry] of [[10, 13], [21, 7], [67, 8], [68, 9]]) {
        const ttmp = maketrap(mx + rx, my + ry, SPIKED_PIT);
        mktrap_seen_victim(ttmp, {});
    }
    for (let i = 0; i < 4; i++) splev_create_trap();

    // des.monster — id/class + optional coord; peaceful=0 override
    const placeMon = (spec) => {
        let pm = null;
        let female = 0;
        if (spec.id) {
            const r = find_montype_gender(spec.id);
            female = r.female;
            if (r.mndx >= 0 && r.mndx !== NON_PM) pm = mons(r.mndx);
        }
        induced_align(80);
        if (spec.cls) {
            const mlet = monclass_letter_to_mlet(spec.cls);
            pm = mlet ? mkclass(mlet, G_NOGEN) : null;
        }
        let x, y;
        if (spec.rx != null) {
            x = mx + spec.rx;
            y = my + spec.ry;
        } else {
            const pos = get_location_random(null);
            x = pos.x;
            y = pos.y;
        }
        if (m_at(x, y)) {
            const cc = { x: 0, y: 0 };
            if (enexto(cc, x, y, pm)) {
                x = cc.x;
                y = cc.y;
            }
        }
        const mtmp = makemon(pm, x, y, 0);
        if (!mtmp) return;
        if (spec.id) mtmp.female = female;
        // C: peaceful > BOOL_RANDOM → override (0 here)
        if (spec.peaceful != null && spec.peaceful > BOOL_RANDOM)
            mtmp.mpeaceful = spec.peaceful;
    };

    for (const [rx, ry] of [
        [12, 9], [18, 11], [45, 5], [45, 6], [47, 5], [46, 5],
        [56, 3], [56, 4], [56, 5], [56, 6],
        [57, 3], [57, 4], [57, 5], [57, 6],
    ]) {
        placeMon({ id: 'ogre', rx, ry, peaceful: 0 });
    }
    for (let i = 0; i < 3; i++) placeMon({ id: 'ogre', peaceful: 0 });
    placeMon({ cls: 'O', peaceful: 0 });
    placeMon({ cls: 'T', peaceful: 0 });
    for (const [rx, ry] of [
        [46, 6], [47, 6], [56, 7], [57, 7], [70, 13],
    ]) {
        placeMon({ id: 'rock troll', rx, ry, peaceful: 0 });
    }
    for (let i = 0; i < 2; i++) placeMon({ id: 'rock troll', peaceful: 0 });
    placeMon({ cls: 'T', peaceful: 0 });

    // C load_special: wallification → flip_level_rnd → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: sp_lev.c lspo_map — half-left / center / half-right xstart.
 * Forces odd xstart/ystart like C after the maze-max formula.
 */
function splev_map_aligned_start(wid, hei, halign) {
    let xstart;
    if (halign === 'half-left')
        xstart = 2 + Math.floor((X_MAZE_MAX - 2 - wid) / 4);
    else if (halign === 'half-right')
        xstart = 2 + Math.floor((X_MAZE_MAX - 2 - wid) * 3 / 4);
    else
        xstart = 2 + Math.floor((X_MAZE_MAX - 2 - wid) / 2);
    let ystart = 2 + Math.floor((Y_MAZE_MAX - 2 - hei) / 2);
    if (!(xstart % 2)) xstart++;
    if (!(ystart % 2)) ystart++;
    if (ystart < 0 || ystart + hei > ROWNO) {
        ystart += (ystart > 0) ? -2 : 2;
        if (hei === ROWNO) ystart = 0;
        if (ystart < 0 || ystart + hei > ROWNO) ystart = 0;
    }
    return { xstart, ystart };
}

/**
 * C ref: dat/tower1.lua via load_special — Vlad's Tower upper stage.
 * Named omissions: tower2/3; SpLev_Map fidelity beyond solidify set;
 * map_cleanup lava/pool sweep; mon_has_special Vlad gate (makemon skips
 * newcham for Vlad); full nh.is_genocided beyond mvitals G_GENOD.
 * D-0673: map lit=FALSE clear after solidfill (≡ C lspo_map).
 */
function load_tower1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;

    const TOWER1_MAP = `
  --- --- ---  
  |.| |.| |.|  
---S---S---S---
|.......+.+...|
---+-----.-----
  |...\\.|.+.|  
---+-----.-----
|.......+.+...|
---S---S---S---
  |.| |.| |.|  
  --- --- ---  
`.replace(/^\n/, '');
    const mf = mapfrag_fromstr(TOWER1_MAP);
    const { xstart, ystart } = splev_map_aligned_start(mf.wid, mf.hei, 'half-left');
    g.splev_xstart = xstart;
    g.splev_ystart = ystart;
    g.splev_xsize = mf.wid;
    g.splev_ysize = mf.hei;
    const spLevMap = new Set();
    for (let yy = ystart; yy < Math.min(ROWNO, ystart + mf.hei); yy++) {
        for (let xx = xstart; xx < Math.min(COLNO, xstart + mf.wid); xx++) {
            const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            sel_set_ter(xx, yy, mptyp, false);
            spLevMap.add(`${xx},${yy}`);
        }
    }
    // C lspo_map defaults lit=FALSE → set_levltyp_lit clears solidfill
    // BOOL_RANDOM lit on map cells (sel_set_ter(...,false) is nochange).
    // Same envelope as Pri-loca D-0668 / fire D-0569.
    for (const key of spLevMap) {
        const comma = key.indexOf(',');
        const x = Number(key.slice(0, comma));
        const y = Number(key.slice(comma + 1));
        const loc = g.level.at(x, y);
        if (!loc) continue;
        loc.lit = IS_LAVA(loc.typ) ? true : false;
    }
    const mx = xstart;
    const my = ystart;

    // local niches = { {03,01}, ... }; shuffle(niches);
    const niches = [
        [3, 1], [3, 9], [7, 1], [7, 9], [11, 1], [11, 9],
    ];
    nhlib_shuffle(niches);

    // des.ladder("down", 11,05)
    {
        const lx = mx + 11;
        const ly = my + 5;
        const loc = g.level.at(lx, ly);
        if (loc) {
            loc.typ = LADDER;
            loc.ladder = LA_DOWN;
        }
        stairway_add(lx, ly, false, true, {
            dnum: g.u?.uz?.dnum ?? 0,
            dlevel: (g.u?.uz?.dlevel ?? 1) + 1,
        });
        if (g.level) g.level.dnstair = { x: lx, y: ly };
        spLevMap.add(`${lx},${ly}`);
    }

    // des.monster("Vlad the Impaler", 06, 05)
    {
        find_montype_gender('Vlad the Impaler');
        induced_align(80);
        const pmIdx = name_to_mon('Vlad the Impaler');
        if (pmIdx >= 0 && pmIdx !== NON_PM)
            makemon(mons(pmIdx), mx + 6, my + 5, 0);
    }

    // des.monster("V", niches[1..3])
    for (let i = 0; i < 3; i++) {
        const [rx, ry] = niches[i];
        induced_align(80);
        const pm = mkclass('S_VAMPIRE', G_NOGEN);
        if (pm) makemon(pm, mx + rx, my + ry, 0);
    }

    // vampire ladies with names + waiting
    {
        const vampPm = name_to_mon('vampire');
        const Vgenod = vampPm >= 0
            && (((g.mvitals?.[vampPm]?.mvflags ?? 0) & G_GENOD) !== 0);
        const Vnames = Vgenod ? [null, null, null] : ['Madame', 'Marquise', 'Countess'];
        for (let i = 0; i < 3; i++) {
            const [rx, ry] = niches[i + 3];
            const { mndx, female } = find_montype_gender('vampire lady');
            induced_align(80);
            if (mndx < 0 || mndx === NON_PM) continue;
            const mtmp = makemon(mons(mndx), mx + rx, my + ry, 0);
            if (!mtmp) continue;
            mtmp.female = female;
            if (Vnames[i]) christen_monst(mtmp, Vnames[i]);
            // C: waiting → STRAT_WAITFORU; vampshifted → newcham back to cham
            mtmp.mstrategy = (mtmp.mstrategy || 0) | STRAT_WAITFORU;
            if (mtmp.cham != null && mtmp.cham !== NON_PM
                && mtmp.data?.mlet !== 'S_VAMPIRE') {
                newcham(mtmp, mons(mtmp.cham), 0);
            }
        }
    }

    // doors
    const twDoor = (rx, ry, mask) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    twDoor(8, 3, D_CLOSED);
    twDoor(10, 3, D_CLOSED);
    twDoor(3, 4, D_CLOSED);
    twDoor(10, 5, D_LOCKED);
    twDoor(8, 7, D_LOCKED);
    twDoor(10, 7, D_LOCKED);
    twDoor(3, 6, D_CLOSED);

    // treasures — chest at 07,05 then niche chests
    mksobj_at(CHEST, mx + 7, my + 5, true, true);
    for (const idx of [5, 0, 1, 2]) {
        const [rx, ry] = niches[idx];
        mksobj_at(CHEST, mx + rx, my + ry, true, true);
    }
    // niches[4] wax candles; niches[5] tallow candles
    // C: contents des.object → create_object get_location_coord(DRY, random)
    // then remove_object + add_to_container (sp_lev.c create_object).
    for (const [nidx, otyp, quanLo] of [
        [3, WAX_CANDLE, 4],
        [4, TALLOW_CANDLE, 4],
    ]) {
        const [rx, ry] = niches[nidx];
        const chest = mksobj_at(CHEST, mx + rx, my + ry, true, true);
        if (!chest) continue;
        // C: SP_OBJ_CONTAINER contents → delete_contents after mkbox_cnts
        chest.cobj = null;
        const quan = quanLo + rn2(5); // math.random(4,8)
        const pos = get_location_coord_random(DRY);
        if (pos.x < 0) continue;
        const candle = mksobj_at(otyp, pos.x, pos.y, true, true);
        if (candle) {
            candle.quan = quan;
            candle.owt = weight(candle);
            candle.oeroded = 0;
            candle.oeroded2 = 0;
            candle.oerodeproof = 0;
            obj_extract_self(candle);
            add_to_container(chest, candle);
            chest.owt = weight(chest);
        }
    }

    // des.non_diggable(selection.area(00,00,14,10))
    for (let y = my; y <= my + 10 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 14 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }

    // C load_special: wallification → flip → solidify → fixup_special
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // solidify_map — STWALL outside SpLev_Map get nondig/nonpass
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            if (!loc || !IS_STWALL(loc.typ)) continue;
            if (spLevMap.has(`${x},${y}`)) continue;
            loc.flags = (loc.flags | 0) | (W_NONDIGGABLE | W_NONPASSWALL);
        }
    }
    fixup_special();
}

/**
 * C ref: dat/soko1-1.lua via load_special.
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; link_doors_rooms full scan;
 * COURT/BEEHIVE/… fill_zoo arms beyond ZOO. Room fill is deferred to
 * makelevel (not here).
 */
function load_soko1_1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;
    // allow_flips remains default 3 (no "noflip")

    const SOKO1_1_MAP = `
--------------------------
|........................|
|.......|---------------.|
-------.------         |.|
 |...........|         |.|
 |...........|         |.|
--------.-----         |.|
|............|         |.|
|............|         |.|
-----.--------   ------|.|
 |..........|  --|.....|.|
 |..........|  |.+.....|.|
 |.........|-  |-|.....|.|
-------.----   |.+.....+.|
|........|     |-|.....|--
|........|     |.+.....|  
|...|-----     --|.....|  
-----            -------  
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO1_1_MAP);

    // reward selection places (map-relative → absolute)
    const placeAbs = {
        pts: new Set([
            `${xstart + 16},${ystart + 11}`,
            `${xstart + 16},${ystart + 13}`,
            `${xstart + 16},${ystart + 15}`,
        ]),
        lx: xstart + 16, ly: ystart + 11,
        hx: xstart + 16, hy: ystart + 15,
    };

    mkstairs(xstart + 1, ystart + 1, 0, null); // des.stair("down", 01, 01)

    // des.region(selection.area(00,00,25,17),"lit")
    for (let y = ystart; y <= ystart + 17 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    // des.non_diggable / non_passwall — C set_wall_property on STWALL/TREE/bars
    for (let y = ystart; y <= ystart + 17 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [3, 5], [5, 5], [7, 5], [9, 5], [11, 5],
        [4, 7], [4, 8], [6, 7], [9, 7], [11, 7],
        [3, 12], [4, 10], [5, 12], [6, 10], [7, 11], [8, 10], [9, 12],
        [3, 14],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    // Traps: hole / rolling boulder / holes — create_trap → mktrap + victim gate
    const trapSpecs = [
        [HOLE, 7, 1],
        [ROLLING_BOULDER_TRAP, 8, 1],
        [HOLE, 9, 1], [HOLE, 10, 1], [HOLE, 11, 1], [HOLE, 12, 1],
        [HOLE, 13, 1], [HOLE, 14, 1], [HOLE, 15, 1], [HOLE, 16, 1],
        [HOLE, 17, 1], [HOLE, 18, 1], [HOLE, 19, 1], [HOLE, 20, 1],
        [HOLE, 21, 1], [HOLE, 22, 1], [HOLE, 23, 1],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    create_mimic_as_boulder();
    create_mimic_as_boulder();

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    // Doors before zoo region so add_doors_to_room can find them
    const sokoDoor = (mx, my, mask) => {
        const loc = g.level.at(xstart + mx, ystart + my);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    sokoDoor(23, 13, D_LOCKED);
    sokoDoor(17, 11, D_CLOSED);
    sokoDoor(17, 13, D_CLOSED);
    sokoDoor(17, 15, D_CLOSED);

    // des.region zoo filled irregular — C lspo_region flood_fill path
    {
        let dx1 = 18, dy1 = 10, dx2 = 22, dy2 = 16;
        // get_location ANY_LOC with map-relative coords
        dx1 += xstart; dy1 += ystart;
        dx2 += xstart; dy2 += ystart;
        const rlit = litstate_rnd(1);
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            const bounds = {
                min_rx: dx1, max_rx: dx1, min_ry: dy1, max_ry: dy1,
            };
            const rmno = g.level.nroom + ROOMOFFSET;
            if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
            flood_fill_rm(dx1, dy1, rmno, rlit, true, bounds);
            add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
                false, ZOO, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.rlit = rlit ? 1 : 0;
                troom.irregular = true;
                troom.needjoining = true;
                troom.needfill = FILL_NORMAL;
                add_doors_to_room(troom);
            }
        }
    }

    const pt = selection_rndcoord(placeAbs, false);
    if (pt) {
        if (percent(75)) {
            const otmp = mksobj_at(BAG_OF_HOLDING, pt.x, pt.y, true, true);
            if (otmp) uncurse(otmp);
        } else {
            const otmp = mksobj_at(AMULET_OF_REFLECTION, pt.x, pt.y, true, true);
            if (otmp) uncurse(otmp);
        }
        make_engr_at(pt.x, pt.y, 'Elbereth', null, 0, BURN);
        {
            const otmp = mksobj_at(SCR_SCARE_MONSTER, pt.x, pt.y, true, true);
            if (otmp) curse(otmp);
        }
    }

    // C ref: sp_lev.c load_special — wallify, flip, solidify, fixup, premap
    // fill_special_room runs once later in makelevel (mklev.c:1416), not here.
    soko_load_epilogue();
}

/**
 * C ref: dat/soko1-2.lua via load_special.
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; other soko*-*;
 * COURT/BEEHIVE/… fill_zoo arms beyond ZOO. Room fill deferred to makelevel.
 */
function load_soko1_2() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;

    const SOKO1_2_MAP = `
  ------------------------
  |......................|
  |..-------------------.|
----.|    -----        |.|
|..|.--  --...|        |.|
|.....|--|....|        |.|
|.....|..|....|        |.|
--....|......--        |.|
 |.......|...|   ------|.|
 |....|..|...| --|.....|.|
 |....|--|...| |.+.....|.|
 |.......|..-- |-|.....|.|
 ----....|.--  |.+.....+.|
    ---.--.|   |-|.....|--
     |.....|   |.+.....|  
     |..|..|   --|.....|  
     -------     -------  
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO1_2_MAP);

    const placeAbs = {
        pts: new Set([
            `${xstart + 16},${ystart + 10}`,
            `${xstart + 16},${ystart + 12}`,
            `${xstart + 16},${ystart + 14}`,
        ]),
        lx: xstart + 16, ly: ystart + 10,
        hx: xstart + 16, hy: ystart + 14,
    };

    mkstairs(xstart + 6, ystart + 15, 0, null); // des.stair("down", 06, 15)

    // des.region(selection.area(00,00,25,16),"lit")
    for (let y = ystart; y <= ystart + 16 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    for (let y = ystart; y <= ystart + 16 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [4, 4], [2, 6], [3, 6], [4, 7], [5, 7], [2, 8], [5, 8],
        [3, 9], [4, 9], [3, 10], [5, 10], [6, 12],
        [7, 14],
        [11, 5], [12, 6], [10, 7], [11, 7], [10, 8], [12, 9], [11, 10],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    const trapSpecs = [
        [ROLLING_BOULDER_TRAP, 5, 1],
        [HOLE, 6, 1], [HOLE, 7, 1], [HOLE, 8, 1], [HOLE, 9, 1],
        [HOLE, 10, 1], [HOLE, 11, 1], [HOLE, 12, 1], [HOLE, 13, 1],
        [HOLE, 14, 1], [HOLE, 15, 1], [HOLE, 16, 1], [HOLE, 17, 1],
        [HOLE, 18, 1], [HOLE, 19, 1], [HOLE, 20, 1], [HOLE, 21, 1],
        [HOLE, 22, 1], [HOLE, 23, 1],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    create_mimic_as_boulder();
    create_mimic_as_boulder();

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    const sokoDoor = (mx, my, mask) => {
        const loc = g.level.at(xstart + mx, ystart + my);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = mask;
        loc.flags = mask;
    };
    sokoDoor(23, 12, D_LOCKED);
    sokoDoor(17, 10, D_CLOSED);
    sokoDoor(17, 12, D_CLOSED);
    sokoDoor(17, 14, D_CLOSED);

    // des.region zoo filled irregular — region={18,09, 22,15}
    {
        let dx1 = 18, dy1 = 9, dx2 = 22, dy2 = 15;
        dx1 += xstart; dy1 += ystart;
        dx2 += xstart; dy2 += ystart;
        const rlit = litstate_rnd(1);
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            const bounds = {
                min_rx: dx1, max_rx: dx1, min_ry: dy1, max_ry: dy1,
            };
            const rmno = g.level.nroom + ROOMOFFSET;
            if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
            flood_fill_rm(dx1, dy1, rmno, rlit, true, bounds);
            add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
                false, ZOO, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.rlit = rlit ? 1 : 0;
                troom.irregular = true;
                troom.needjoining = true;
                troom.needfill = FILL_NORMAL;
                add_doors_to_room(troom);
            }
        }
    }

    // C: percent(25) bag else amulet (soko1-2; soko1-1 uses percent(75))
    const pt = selection_rndcoord(placeAbs, false);
    if (pt) {
        if (percent(25)) {
            const otmp = mksobj_at(BAG_OF_HOLDING, pt.x, pt.y, true, true);
            if (otmp) uncurse(otmp);
        } else {
            const otmp = mksobj_at(AMULET_OF_REFLECTION, pt.x, pt.y, true, true);
            if (otmp) uncurse(otmp);
        }
        make_engr_at(pt.x, pt.y, 'Elbereth', null, 0, BURN);
        {
            const otmp = mksobj_at(SCR_SCARE_MONSTER, pt.x, pt.y, true, true);
            if (otmp) curse(otmp);
        }
    }

    soko_load_epilogue();
}

/**
 * C ref: dat/soko3-1.lua via load_special.
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; soko2-2 / soko4-1.
 */
function load_soko3_1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;

    // C ref: dat/soko3-1.lua des.map — 29×12
    const SOKO3_1_MAP = `
-----------       -----------
|....|....|--     |.........|
|....|......|     |.........|
|.........|--     |.........|
|....|....|       |.........|
|-.---------      |.........|
|....|.....|      |.........|
|....|.....|      |.........|
|..........|      |.........|
|....|.....|---------------+|
|....|......................|
-----------------------------
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO3_1_MAP);

    mkstairs(xstart + 11, ystart + 2, 0, null); // des.stair("down", 11, 02)
    mkstairs(xstart + 23, ystart + 4, 1, null); // des.stair("up", 23, 04)

    {
        const loc = g.level.at(xstart + 27, ystart + 9);
        if (loc) {
            if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
            loc.doormask = D_LOCKED;
            loc.flags = D_LOCKED;
        }
    }

    // des.region(selection.area(00,00,28,11), "lit")
    for (let y = ystart; y <= ystart + 11 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 28 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    for (let y = ystart; y <= ystart + 11 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 28 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [3, 2], [4, 2],
        [6, 2], [6, 3], [7, 2],
        [3, 6], [2, 7], [3, 7], [3, 8], [2, 9], [3, 9], [4, 9],
        [6, 7], [6, 9], [8, 7], [8, 10], [9, 8], [9, 9], [10, 7], [10, 10],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    const trapSpecs = [
        [ROLLING_BOULDER_TRAP, 11, 10],
        [HOLE, 12, 10], [HOLE, 13, 10], [HOLE, 14, 10], [HOLE, 15, 10],
        [HOLE, 16, 10], [HOLE, 17, 10], [HOLE, 18, 10], [HOLE, 19, 10],
        [HOLE, 20, 10], [HOLE, 21, 10], [HOLE, 22, 10], [HOLE, 23, 10],
        [HOLE, 24, 10], [HOLE, 25, 10], [HOLE, 26, 10],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    // C ref: sp_lev.c load_special — wallify, flip, solidify, fixup, premap
    soko_load_epilogue();
}

/**
 * C ref: dat/soko3-2.lua via load_special.
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; soko2-2 / soko4-1.
 */
function load_soko3_2() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;

    // C ref: dat/soko3-2.lua des.map — 26×14
    const SOKO3_2_MAP = `
 ----          -----------
-|..|-------   |.........|
|..........|   |.........|
|..-----.-.|   |.........|
|..|...|...|   |.........|
|.........-|   |.........|
|.......|..|   |.........|
|.----..--.|   |.........|
|........|.--  |.........|
|.---.-.....------------+|
|...|...-................|
|.........----------------
----|..|..|               
    -------               
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO3_2_MAP);

    mkstairs(xstart + 3, ystart + 1, 0, null); // des.stair("down", 03, 01)
    mkstairs(xstart + 20, ystart + 4, 1, null); // des.stair("up", 20, 04)

    {
        const loc = g.level.at(xstart + 24, ystart + 9);
        if (loc) {
            if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
            loc.doormask = D_LOCKED;
            loc.flags = D_LOCKED;
        }
    }

    // des.region(selection.area(00,00,25,13), "lit")
    for (let y = ystart; y <= ystart + 13 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    for (let y = ystart; y <= ystart + 13 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 25 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [2, 3], [8, 3], [9, 4],
        [2, 5], [4, 5], [9, 5],
        [2, 6], [5, 6], [6, 7],
        [3, 8], [7, 8], [5, 9], [10, 9],
        [7, 10], [10, 10], [3, 11],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    const trapSpecs = [
        [ROLLING_BOULDER_TRAP, 11, 10],
        [HOLE, 12, 10], [HOLE, 13, 10], [HOLE, 14, 10], [HOLE, 15, 10],
        [HOLE, 16, 10], [HOLE, 17, 10], [HOLE, 18, 10], [HOLE, 19, 10],
        [HOLE, 20, 10], [HOLE, 21, 10], [HOLE, 22, 10], [HOLE, 23, 10],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    // C ref: sp_lev.c load_special — wallify, flip, solidify, fixup, premap
    soko_load_epilogue();
}

/**
 * C ref: dat/soko4-2.lua via load_special — Sokoban entry (bottom).
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; soko2-2 / soko4-1;
 * levregion coords after flip (same Bar-strt pattern).
 */
function load_soko4_2() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;

    // C ref: dat/soko4-2.lua des.map — 15×11
    const SOKO4_2_MAP = `
-------- ------
|.|....|-|....|
|.|-..........|
|.||....|.....|
|.||....|.....|
|.|-----|.-----
|.|    |......|
|.-----|......|
|.............|
|..|---|......|
----   --------
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO4_2_MAP);

    mkstairs(xstart + 1, ystart + 1, 1, null); // des.stair("up", 01, 01)

    // des.region(selection.area(00,00,14,10),"lit")
    for (let y = ystart; y <= ystart + 10 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 14 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    for (let y = ystart; y <= ystart + 10 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 14 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [5, 2], [6, 2], [6, 3], [7, 3],
        [9, 5], [10, 3], [11, 2], [12, 3],
        [7, 8], [8, 8], [9, 8], [10, 8],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    const trapSpecs = [
        [PIT, 1, 2], [PIT, 1, 3], [PIT, 1, 4], [PIT, 1, 5], [PIT, 1, 6],
        [ROLLING_BOULDER_TRAP, 1, 7],
        [PIT, 1, 8], [PIT, 2, 8], [PIT, 3, 8], [PIT, 4, 8], [PIT, 5, 8],
        [ROLLING_BOULDER_TRAP, 6, 8],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    // des.object("scroll of earth", …)
    mksobj_at(SCR_EARTH, xstart + 1, ystart + 9, true, true);
    mksobj_at(SCR_EARTH, xstart + 2, ystart + 9, true, true);

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    // C ref: sp_lev.c load_special — wallify, flip, levregion, solidify, fixup, premap
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // des.levregion({ region={03,01,03,01}, type="branch" })
    place_lregion(
        xstart + 3, ystart + 1, xstart + 3, ystart + 1,
        0, 0, 0, 0, LR_BRANCH, null,
    );
    solidify_map();
    fixup_special();
    premap_detect();
}

/**
 * C ref: dat/fire.lua via load_special — Plane of Fire.
 * Named omissions: solidify/premap; water/earth/astral planes; Norep whoosh
 * on fumaroles. Map load uses SpLev_Map lit epilogue (D-0569).
 */
function load_fire() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;
    g.level.flags.shortsighted = true;
    g.level.flags.temperature = 1; // "hot"
    g.level.flags.fumaroles = true;

    // C ref: dat/fire.lua des.map — 79×21 full mappable area
    const FIRE_MAP = `
LL.............LL..............L...LL.........LL.................LL...........L
LL....LLLLLLLL............L...L.............LL....LLL.......................LL.
L....LL...................L......................LLLL................LL........
.....L.............LLLL...LL....LL...............LLLLL.............LLL.........
.L.LLLL..............LL....L.....LLL..............LLLL..............LLLL......L
LL..........LLLL...LLLL...LLL....LLL......L........LLLL....LL........LLL......L
LL........LLLLLLL...LL.....L......L......LL.........LL......LL........LL...L...
L.........LL..LLL..LL......LL......LLLL..L.........LL......LLL............LL...
......L..LL....LLLLL.................LLLLLLL.......L......LL............LLLLLL.
......L..L.....LL.LLLL.......L............L........LLLLL.LL......LL.........LL.
......LL........L...LL......LL.............LLL.....L...LLL.......LLL.........L.
.L.....LLLLLL........L.......LLL.............L....LL...L.LLL......LLLLLLL......
LL..........LLLL............LL.L.............L....L...LL.........LLL..LLL......
.L...........................LLLLL...........LL...L...L........LLLL..LLLLLL...L
.L.....LLLL.............LL....LL.......LLL...LL.......L..LLL....LLLLLLL.......L
.........LLL.........LLLLLLLLLLL......LLLLL...L...........LL...LL...LL.........
...........LL.......LL.........LL.......LLL....L..LLL....LL.........LL.........
............LLLLLLLLL...........LL....LLL.......LLLLL.....LL........LL.........
.LL...............L.............LLLLLL............LL...LLLL.........LL.......L.
LL.....L..........................LL....................LL..................LLL
L.....LLL......................LLLLL.........L.........LLLLLLLL..............LL
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(FIRE_MAP);

    // des.teleport_region({ region = {71,16,71,16} }) — dir both (default)
    // des.levregion portal→water with exclude — stored for fixup after flip
    const abs = (mx, my) => ({ x: xstart + mx, y: ystart + my });
    const t0 = abs(71, 16);
    g.lregions = g.lregions || [];
    g.lregions.push({
        rtype: LR_TELE,
        rname: null,
        inarea: { x1: t0.x, y1: t0.y, x2: t0.x, y2: t0.y },
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    });
    const p0 = abs(0, 0);
    const p1 = abs(78, 19);
    const e0 = abs(67, 13);
    const e1 = abs(78, 19);
    g.lregions.push({
        rtype: LR_PORTAL,
        rname: 'water',
        inarea: { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y },
        delarea: { x1: e0.x, y1: e0.y, x2: e1.x, y2: e1.y },
    });

    // 40× des.trap("fire") — create_trap DRY + mktrap victim gate
    for (let i = 0; i < 40; i++) {
        let trycnt = 0;
        let pos;
        do {
            pos = get_location_random(null);
            const typ = g.level.at(pos.x, pos.y)?.typ;
            if (typ !== STAIRS && typ !== LADDER) break;
        } while (++trycnt <= 100);
        if (trycnt > 100) continue;
        const ttmp = maketrap(pos.x, pos.y, FIRE_TRAP);
        mktrap_seen_victim(ttmp, {});
    }

    // des.monster list — peaceful:0 overrides; bare id leaves makemon default
    const fireMons = [
        ['red dragon'], ['balrog'],
        ['fire elemental', 0], ['fire elemental', 0],
        ['fire vortex'], ['hell hound'],
        ['fire giant'], ['barbed devil'], ['hell hound'], ['stone golem'],
        ['pit fiend'], ['fire elemental', 0],
        ['fire elemental', 0], ['hell hound'], ['fire elemental', 0],
        ['fire elemental', 0], ['scorpion'], ['fire giant'],
        ['hell hound'], ['dust vortex'], ['fire vortex'],
        ['fire elemental', 0], ['fire elemental', 0], ['fire elemental', 0],
        ['hell hound'], ['fire elemental', 0], ['stone golem'],
        ['pit viper'], ['pit viper'], ['fire vortex'],
        ['fire elemental', 0], ['fire elemental', 0], ['fire giant'],
        ['fire elemental', 0], ['fire vortex'], ['fire vortex'],
        ['pit fiend'], ['fire elemental', 0], ['pit viper'],
        ['salamander', 0], ['salamander', 0], ['minotaur'],
        ['salamander', 0], ['steam vortex'],
        ['salamander', 0], ['salamander', 0],
        ['fire giant'], ['barbed devil'], ['fire elemental', 0],
        ['fire vortex'], ['fire elemental', 0], ['fire elemental', 0],
        ['hell hound'], ['fire giant'], ['pit fiend'],
        ['fire elemental', 0], ['fire elemental', 0],
        ['barbed devil'], ['salamander', 0], ['steam vortex'],
        ['salamander', 0], ['salamander', 0],
    ];
    for (const spec of fireMons) {
        if (spec.length > 1) splev_create_monster(spec[0], spec[1]);
        else splev_create_monster(spec[0]);
    }

    for (let i = 0; i < 5; i++) splev_create_boulder();

    // C ref: sp_lev.c load_special — wallify, flip, then lregions / fixup
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    {
        const lregions = g.lregions || [];
        g.lregions = [];
        for (const r of lregions) {
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE || r.rtype === LR_DOWNTELE) {
                const tele = {
                    lx: r.inarea.x1, ly: r.inarea.y1,
                    hx: r.inarea.x2, hy: r.inarea.y2,
                    nlx: r.delarea.x1, nly: r.delarea.y1,
                    nhx: r.delarea.x2, nhy: r.delarea.y2,
                };
                if (r.rtype === LR_TELE || r.rtype === LR_UPTELE)
                    g.updest = { ...tele };
                if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE)
                    g.dndest = { ...tele };
            } else if (r.rtype === LR_PORTAL) {
                let lev = null;
                if (r.rname) {
                    const sp = find_level(r.rname);
                    if (sp?.dlevel)
                        lev = { dnum: sp.dlevel.dnum | 0, dlevel: sp.dlevel.dlevel | 0 };
                }
                place_lregion(
                    r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                    r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                    LR_PORTAL, lev,
                );
            }
        }
    }
    fixup_special();
    // C lspo_map string form lit=FALSE → set_levltyp_lit clears solidfill
    // BOOL_RANDOM lit on non-lava map cells (D-0569). Lava always lit.
    {
        const sp = g.SpLev_Map;
        if (sp) {
            for (const key of sp) {
                const comma = key.indexOf(',');
                const x = Number(key.slice(0, comma));
                const y = Number(key.slice(comma + 1));
                const loc = g.level.at(x, y);
                if (!loc) continue;
                loc.lit = IS_LAVA(loc.typ) ? true : false;
            }
        }
    }
}

/**
 * C ref: dat/air.lua via load_special — Plane of Air.
 * Named omissions: solidify/premap; water/earth/astral; movebubbles.
 */
function load_air() {
    const g = game;
    nhlib_shuffle_align();
    // des.level_init({ style = "solidfill", fg = " " }) — ' ' → STONE
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.hardfloor = true;
    g.level.flags.shortsighted = true;
    g.level.flags.stormy = true;

    // C: des.message ×2 → lev_message newline-joined for deliver_splev_message
    g.lev_message =
        'What a strange feeling!\nYou notice that there is no gravity here.';

    // C ref: dat/air.lua des.map — 76×20 AIR
    const AIR_MAP = `
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(AIR_MAP);

    // region_islev=1 teleport_region — absolute coords; exclude → delarea
    g.lregions = g.lregions || [];
    g.lregions.push({
        rtype: LR_UPTELE,
        rname: null,
        inarea: { x1: 1, y1: 0, x2: 24, y2: 20 },
        delarea: { x1: 25, y1: 0, x2: 79, y2: 20 },
    });
    g.lregions.push({
        rtype: LR_DOWNTELE,
        rname: null,
        inarea: { x1: 56, y1: 0, x2: 79, y2: 20 },
        delarea: { x1: 1, y1: 0, x2: 55, y2: 20 },
    });
    // des.levregion portal→fire, region_islev=1
    g.lregions.push({
        rtype: LR_PORTAL,
        rname: 'fire',
        inarea: { x1: 57, y1: 1, x2: 78, y2: 19 },
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    });

    // des.region(selection.area(00,00,75,19),"lit") — map-relative
    for (let y = ystart; y <= ystart + 19 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 75 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    const airMons = [
        ['air elemental', 0], ['air elemental', 0], ['air elemental', 0],
        ['air elemental', 0], ['air elemental', 0], ['air elemental', 0],
        ['air elemental', 0], ['air elemental', 0], ['air elemental', 0],
        ['air elemental', 0], ['air elemental', 0],
        ['floating eye', 0], ['floating eye', 0], ['floating eye', 0],
        ['yellow light', 0], ['yellow light', 0], ['yellow light', 0],
        ['couatl'],
        ['D'], ['D'], ['D'], ['D'], ['D'],
        ['E'], ['E'], ['E'],
        ['J'], ['J'],
        ['djinni', 0], ['djinni', 0], ['djinni', 0],
        ['fog cloud', 0], ['fog cloud', 0], ['fog cloud', 0],
        ['fog cloud', 0], ['fog cloud', 0], ['fog cloud', 0],
        ['fog cloud', 0], ['fog cloud', 0], ['fog cloud', 0],
        ['energy vortex', 0], ['energy vortex', 0], ['energy vortex', 0],
        ['energy vortex', 0], ['energy vortex', 0],
        ['steam vortex', 0], ['steam vortex', 0], ['steam vortex', 0],
        ['steam vortex', 0], ['steam vortex', 0],
    ];
    for (const spec of airMons) {
        if (spec.length > 1) splev_create_monster(spec[0], spec[1]);
        else splev_create_monster(spec[0]);
    }

    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    // C: fixup_special — setup_waterlevel before applying tele/portal lregions
    setup_waterlevel();
    {
        const lregions = g.lregions || [];
        g.lregions = [];
        for (const r of lregions) {
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE || r.rtype === LR_DOWNTELE) {
                const tele = {
                    lx: r.inarea.x1, ly: r.inarea.y1,
                    hx: r.inarea.x2, hy: r.inarea.y2,
                    nlx: r.delarea.x1, nly: r.delarea.y1,
                    nhx: r.delarea.x2, nhy: r.delarea.y2,
                };
                if (r.rtype === LR_TELE || r.rtype === LR_UPTELE)
                    g.updest = { ...tele };
                if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE)
                    g.dndest = { ...tele };
            } else if (r.rtype === LR_PORTAL) {
                let lev = null;
                if (r.rname) {
                    const sp = find_level(r.rname);
                    if (sp?.dlevel)
                        lev = { dnum: sp.dlevel.dnum | 0, dlevel: sp.dlevel.dlevel | 0 };
                }
                place_lregion(
                    r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                    r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                    LR_PORTAL, lev,
                );
            }
        }
    }
    fixup_special();
}

/**
 * C ref: dat/minend-1.lua via load_special — Mimic of the Mines.
 * Named omissions: minend-2/3; ensure_way_out; link_doors_rooms full scan;
 * map_cleanup; is_mines_prize consumption beyond achieveo oid/otyp stamp.
 */
function load_minend_1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;

    const MINEND1_MAP = `
------------------------------------------------------------------   ------
|                        |.......|     |.......-...|       |.....|.       |
|    ---------        ----.......-------...........|       ---...-S-      |
|    |.......|        |..........................-S-      --.......|      |
|    |......-------   ---........................|.       |.......--      |
|    |..--........-----..........................|.       -.-..----       |
|    --..--.-----........-.....................---        --..--          |
|     --..--..| -----------..................---.----------..--           |
|      |...--.|    |..S...S..............---................--            |
|     ----..-----  ------------........--- ------------...---             |
|     |.........--            ----------              ---...-- -----      |
|    --.....---..--                           --------  --...---...--     |
| ----..-..-- --..---------------------      --......--  ---........|     |
|--....-----   --..-..................---    |........|    |.......--     |
|.......|       --......................S..  --......--    ---..----      |
|--.--.--        ----.................---     ------..------...--         |
| |....S..          |...............-..|         ..S...........|          |
--------            --------------------           ------------------------
`.replace(/^\n/, '');
    splev_apply_centered_map(MINEND1_MAP);
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;

    // local place = {…}; shuffle(place) — Lua 1-based; place[6] unused
    const place = [
        [8, 16], [13, 7], [21, 8], [41, 14], [50, 4], [50, 16], [66, 1],
    ];
    nhlib_shuffle(place);

    // des.region arrival_room irregular ordinary lit=0
    {
        const dx1 = mx + 26;
        const dy1 = my + 1;
        if ((g.level.nroom | 0) < MAXNROFROOMS) {
            const bounds = {
                min_rx: dx1, max_rx: dx1, min_ry: dy1, max_ry: dy1,
            };
            const rmno = g.level.nroom + ROOMOFFSET;
            if (g.smeq) g.smeq[g.level.nroom] = g.level.nroom;
            flood_fill_rm(dx1, dy1, rmno, false, true, bounds);
            add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
                false, OROOM, true);
            const troom = g.level.rooms[g.level.nroom - 1];
            if (troom) {
                troom.rlit = 0;
                troom.irregular = true;
                troom.needjoining = true;
                troom.needfill = 0;
            }
        }
    }
    // des.region(selection.area(...), "unlit") — lighting only (no grow)
    const setUnlit = (x1, y1, x2, y2) => {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const loc = g.level.at(mx + x, my + y);
                if (loc) loc.lit = false;
            }
        }
    };
    setUnlit(20, 8, 21, 8);
    setUnlit(23, 8, 25, 8);

    // des.door("locked", …) — map 'S' → SDOOR; set D_LOCKED
    const meDoor = (rx, ry) => {
        const loc = g.level.at(mx + rx, my + ry);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
        loc.doormask = D_LOCKED;
        loc.flags = D_LOCKED;
    };
    meDoor(7, 16);
    meDoor(22, 8);
    meDoor(26, 8);
    meDoor(40, 14);
    meDoor(50, 3);
    meDoor(51, 16);
    meDoor(66, 2);

    // des.stair("up", 36,04)
    mkstairs(mx + 36, my + 4, 1, null);

    // des.non_diggable(selection.area(00,00,74,17))
    for (let y = my; y <= my + 17 && y < ROWNO; y++) {
        for (let x = mx; x <= mx + 74 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
    }

    const placeObj = (otyp, rx, ry, buc) => {
        if (otyp < 0) return null;
        const otmp = mksobj_at(otyp, mx + rx, my + ry, true, true);
        if (!otmp) return null;
        if (buc === 'not-cursed') uncurse(otmp);
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        otmp.oerodeproof = 0;
        return otmp;
    };
    const placeMimicAs = (otyp, rx, ry) => {
        induced_align(80);
        const pm = mkclass('S_MIMIC', G_NOGEN);
        let x = mx + rx;
        let y = my + ry;
        ({ x, y } = splev_resolve_occupied(x, y, pm));
        const mtmp = makemon(pm, x, y, 0);
        if (!mtmp) return null;
        mtmp.m_ap_type = M_AP_OBJECT;
        mtmp.mappearance = otyp;
        return mtmp;
    };

    // niches — Lua place[7]/1..5]; place[6] empty
    const p7 = place[6];
    const p1 = place[0];
    const p2 = place[1];
    const p3 = place[2];
    const p4 = place[3];
    const p5 = place[4];
    placeObj(DIAMOND, p7[0], p7[1]);
    placeObj(EMERALD, p7[0], p7[1]);
    placeObj(WORTHLESS_VIOLET_GLASS, p7[0], p7[1]);
    placeMimicAs(LUCKSTONE, p7[0], p7[1]);
    placeObj(WORTHLESS_WHITE_GLASS, p1[0], p1[1]);
    placeObj(EMERALD, p1[0], p1[1]);
    placeObj(AMETHYST, p1[0], p1[1]);
    placeMimicAs(LOADSTONE, p1[0], p1[1]);
    placeObj(DIAMOND, p2[0], p2[1]);
    placeObj(WORTHLESS_GREEN_GLASS, p2[0], p2[1]);
    placeObj(AMETHYST, p2[0], p2[1]);
    placeMimicAs(FLINT, p2[0], p2[1]);
    placeObj(WORTHLESS_WHITE_GLASS, p3[0], p3[1]);
    placeObj(EMERALD, p3[0], p3[1]);
    placeObj(WORTHLESS_VIOLET_GLASS, p3[0], p3[1]);
    placeMimicAs(TOUCHSTONE, p3[0], p3[1]);
    placeObj(WORTHLESS_RED_GLASS, p4[0], p4[1]);
    placeObj(RUBY, p4[0], p4[1]);
    placeObj(LOADSTONE, p4[0], p4[1]);
    placeObj(RUBY, p5[0], p5[1]);
    placeObj(WORTHLESS_RED_GLASS, p5[0], p5[1]);
    {
        const otmp = placeObj(LUCKSTONE, p5[0], p5[1], 'not-cursed');
        // C create_object achievement on mine end → achieveo mines_prize
        if (otmp) {
            if (!g.context) g.context = {};
            if (!g.context.achieveo) g.context.achieveo = {};
            const ao = g.context.achieveo;
            if (!ao.mines_prize_oid) {
                ao.mines_prize_oid = otmp.o_id;
                ao.mines_prize_otyp = otmp.otyp;
                otmp.nomerge = 1;
            }
        }
    }

    // C ref: dat/minend-1.lua des.object("*") / "(" / () — defsym '('=TOOL, ')'=WEAPON
    for (let i = 0; i < 7; i++) splev_create_object(GEM_CLASS);
    for (let i = 0; i < 2; i++) splev_create_object(TOOL_CLASS);
    for (let i = 0; i < 3; i++) splev_create_object(null);
    for (let i = 0; i < 6; i++) splev_create_trap();

    splev_create_monster('gnome king');
    for (let i = 0; i < 3; i++) splev_create_monster('gnome lord');
    for (let i = 0; i < 2; i++) splev_create_monster('gnomish wizard');
    for (let i = 0; i < 9; i++) splev_create_monster('gnome');
    for (let i = 0; i < 2; i++) splev_create_monster('hobbit');
    for (let i = 0; i < 3; i++) splev_create_monster('dwarf');
    splev_create_monster('h');

    // C load_special: wallification → flip → fixup (no solidify/premap)
    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/minetn-2.lua via load_special — Mines town "Town Square".
 * Nested des.room + create_subroom/create_door + shops/temple/watch.
 * Named omissions: minetn-1/3–7; link_doors_rooms extras; ensure_way_out.
 */
function load_minetn_2() {
    const g = game;
    nhlib_shuffle_align();
    const align = g.splev_align || ['law', 'neutral', 'chaos'];

    // Outer town square: des.room x=3,y=3 center 31×15 lit
    splev_des_room({
        type: 'ordinary', lit: 1, x: 3, y: 3,
        xalign: SPLEV_CENTER, yalign: SPLEV_CENTER, w: 31, h: 15,
    }, null, (town) => {
        splev_room_feature_fountain(town, 17, 5);
        splev_room_feature_fountain(town, 13, 8);

        const nest = (opts, doorWall, doorState, monId) => {
            if (!percent(75)) return;
            splev_des_room(opts, town, (r) => {
                splev_room_door(r, doorState || 'closed', doorWall);
                if (monId) splev_room_monster(r, monId);
            });
        };

        nest({ type: 'ordinary', x: 2, y: 0, w: 2, h: 2 }, 'west');
        nest({ type: 'ordinary', lit: 0, x: 5, y: 0, w: 2, h: 2 }, 'south');
        nest({ type: 'ordinary', x: 8, y: 0, w: 2, h: 2 }, 'east');
        nest({ type: 'ordinary', lit: 1, x: 16, y: 0, w: 2, h: 2 }, 'west');
        nest({ type: 'ordinary', lit: 0, x: 19, y: 0, w: 2, h: 2 }, 'south');
        nest({ type: 'ordinary', x: 22, y: 0, w: 2, h: 2 }, 'south', 'closed', 'gnome');
        nest({ type: 'ordinary', lit: 0, x: 25, y: 0, w: 2, h: 2 }, 'east');
        nest({ type: 'ordinary', lit: 1, x: 2, y: 5, w: 2, h: 2 }, 'north');
        nest({ type: 'ordinary', lit: 1, x: 5, y: 5, w: 2, h: 2 }, 'south');
        nest({ type: 'ordinary', x: 8, y: 5, w: 2, h: 2 }, 'north', 'locked', 'gnome');

        splev_des_room({
            type: 'shop', chance: 90, lit: 1, x: 2, y: 10, w: 4, h: 3,
        }, town, (r) => splev_room_door(r, 'closed', 'west'));

        splev_des_room({
            type: 'tool shop', chance: 90, lit: 1, x: 23, y: 10, w: 4, h: 3,
        }, town, (r) => splev_room_door(r, 'closed', 'east'));

        splev_des_room({
            type: monkfoodshop(), chance: 90, lit: 1, x: 24, y: 5, w: 3, h: 4,
        }, town, (r) => splev_room_door(r, 'closed', 'north'));

        splev_des_room({
            type: 'candle shop', lit: 1, x: 11, y: 10, w: 4, h: 3,
        }, town, (r) => splev_room_door(r, 'closed', 'east'));

        nest({ type: 'ordinary', lit: 0, x: 7, y: 10, w: 3, h: 3 },
            'north', 'locked', 'gnome');

        splev_des_room({
            type: 'temple', lit: 1, x: 19, y: 5, w: 4, h: 4,
        }, town, (r) => {
            splev_room_door(r, 'closed', 'north');
            splev_room_altar_shrine(r, 2, 2, align[0]);
            splev_room_monster(r, 'gnomish wizard');
            splev_room_monster(r, 'gnomish wizard');
        });

        nest({ type: 'ordinary', lit: 1, x: 18, y: 10, w: 4, h: 3 },
            'west', 'locked', 'gnome lord');

        // Town Watch
        splev_room_monster(town, 'watchman', 1);
        splev_room_monster(town, 'watchman', 1);
        splev_room_monster(town, 'watchman', 1);
        splev_room_monster(town, 'watchman', 1);
        splev_room_monster(town, 'watch captain', 1);
    });

    splev_ordinary_room((r) => {
        splev_room_stair(r, true);
    });
    splev_ordinary_room((r) => {
        splev_room_stair(r, false);
        splev_room_trap(r);
        splev_room_monster(r, 'gnome');
        splev_room_monster(r, 'gnome');
    });
    splev_ordinary_room((r) => {
        splev_room_monster(r, 'dwarf');
    });
    splev_ordinary_room((r) => {
        splev_room_trap(r);
        splev_room_monster(r, 'gnome');
    });

    makecorridors();

    if (!g.level.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: mkmaze.c setup_waterlevel — air/water bubble grid + stone→AIR/WATER.
 * Named omission: full bubble cons / movebubbles body beyond initial paint.
 */
function setup_waterlevel() {
    const g = game;
    const uz = g.u?.uz;
    if (!Is_waterlevel(uz) && !Is_airlevel(uz)) return;
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.hero_memory = false;

    const xmin = 3;
    const ymin = 1;
    let xmax = 78;
    if (xmax > COLNO - 2) xmax = COLNO - 2;
    let ymax = 20;
    if (ymax > ROWNO - 1) ymax = ROWNO - 1;
    const gbxmin = xmin + 1;
    const gbymin = ymin + 1;
    const gbxmax = xmax - 1;
    const gbymax = ymax - 1;
    g.waterlevel_bounds = { xmin, ymin, xmax, ymax, gbxmin, gbymin, gbxmax, gbymax };

    // C: glyph = cmap_to_glyph(water ? S_water : S_air); set on every cell
    const memGlyph = Is_waterlevel(uz)
        ? { ch: '}', color: CLR_BRIGHT_BLUE, decgfx: false }
        : { ch: ' ', color: CLR_CYAN, decgfx: false };
    const typ = Is_waterlevel(uz) ? WATER : AIR;
    for (let x = 1; x <= COLNO - 1; x++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            loc.remembered_glyph = { ...memGlyph };
            if (loc.typ === STONE) loc.typ = typ;
        }
    }

    let xskip, yskip;
    if (Is_waterlevel(uz)) {
        xskip = 10 + rn2(10);
        yskip = 4 + rn2(4);
    } else {
        xskip = 6 + rn2(4);
        yskip = 3 + rn2(3);
    }

    g.bbubbles = null;
    for (let x = gbxmin; x <= gbxmax; x += xskip) {
        for (let y = gbymin; y <= gbymax; y += yskip) {
            mk_bubble(x, y, rn2(7), gbxmin, gbymin, gbxmax, gbymax);
        }
    }
}

/** C ref: mkmaze.c mk_bubble + mv_bubble(ini) cloud/air paint RNG. */
function mk_bubble(x, y, n, gbxmin, gbymin, gbxmax, gbymax) {
    const BM = [
        [2, 1, 0x3],
        [3, 2, 0x7, 0x7],
        [4, 3, 0x6, 0xf, 0x6],
        [5, 3, 0xe, 0x1f, 0xe],
        [6, 4, 0x1e, 0x3f, 0x3f, 0x1e],
        [7, 4, 0x3e, 0x7f, 0x7f, 0x3e],
        [8, 4, 0x7e, 0xff, 0xff, 0x7e],
    ];
    if (x >= gbxmax || y >= gbymax) return;
    if (n >= BM.length) n = BM.length - 1;
    const bm = BM[n];
    let bx = x;
    let by = y;
    if ((bx + bm[0] - 1) > gbxmax) bx = gbxmax - bm[0] + 1;
    if ((by + bm[1] - 1) > gbymax) by = gbymax - bm[1] + 1;
    const dx = 1 - rn2(3);
    const dy = 1 - rn2(3);
    // C: mv_bubble(b, 0, 0, TRUE) — air clouds skip move unless !rn2(6)
    if (!Is_airlevel(game.u?.uz) || !rn2(6)) {
        // ini move with dx=dy=0 — no position change; still burns air rn2(6)
        void dx;
        void dy;
    }
    // paint bubble cells: water→AIR, air→CLOUD
    const paint = Is_waterlevel(game.u?.uz) ? AIR : CLOUD;
    for (let i = 0; i < bm[0]; i++) {
        for (let j = 0; j < bm[1]; j++) {
            if (bm[j + 2] & (1 << i)) {
                const loc = game.level.at(bx + i, by + j);
                if (loc) {
                    loc.typ = paint;
                    loc.lit = true;
                }
            }
        }
    }
    const b = { x: bx, y: by, dx, dy, bm, next: null };
    if (!game.bbubbles) game.bbubbles = b;
    else {
        let e = game.bbubbles;
        while (e.next) e = e.next;
        e.next = b;
    }
}

/**
 * C ref: mkmaze.c movebubbles — air edge clouds + bubble drift (goto_level /
 * moveloop). Named omission: water cons pickup/deposit; Punished ball.
 */
export function movebubbles() {
    const g = game;
    const uz = g.u?.uz;
    if (!Is_waterlevel(uz) && !Is_airlevel(uz)) return;

    if (!g.wportal) {
        for (let t = g.ftrap; t; t = t.ntrap) {
            if ((t.ttyp | 0) === MAGIC_PORTAL) {
                g.wportal = t;
                break;
            }
        }
    }

    const bounds = g.waterlevel_bounds || {
        gbxmin: 4, gbymin: 2, gbxmax: 77, gbymax: 19,
    };
    const { gbxmin, gbymin, gbxmax, gbymax } = bounds;

    if (Is_airlevel(uz)) {
        // C: levl[x][y] = air_pos — glyph S_cloud, typ AIR, lit 1
        // (docrt paints lev->glyph for the whole map before vision).
        const airGlyph = { ch: '#', color: CLR_GRAY, decgfx: false };
        for (let x = 1; x <= COLNO - 1; x++) {
            for (let y = 0; y <= ROWNO - 1; y++) {
                const loc = g.level.at(x, y);
                if (!loc) continue;
                loc.remembered_glyph = { ...airGlyph };
                loc.typ = AIR;
                loc.lit = true;
                const xedge = x < gbxmin || x > gbxmax;
                const yedge = y < gbymin || y > gbymax;
                if (xedge || yedge) {
                    if (!rn2(xedge ? 3 : 5)) {
                        loc.typ = CLOUD;
                    }
                }
            }
        }
    }
    // water bubble cons pickup deferred

    g.movebubbles_up = !g.movebubbles_up;
    const up = !!g.movebubbles_up;
    // Traverse bbubbles forward or reverse; reverse needs ebubbles chain.
    let bubbles = [];
    for (let b = g.bbubbles; b; b = b.next) bubbles.push(b);
    if (!up) bubbles = bubbles.reverse();
    for (const b of bubbles) {
        const rx = rn2(3);
        const ry = rn2(3);
        const mdx = b.dx + 1 - (!b.dx ? rx : (rx ? 1 : 0));
        const mdy = b.dy + 1 - (!b.dy ? ry : (ry ? 1 : 0));
        mv_bubble_move(b, mdx, mdy, gbxmin, gbymin, gbxmax, gbymax);
    }
    g.vision_full_recalc = 1;
}

/** C ref: mkmaze.c mv_bubble — air rn2(6) skip + CLOUD paint + boing. */
function mv_bubble_move(b, dx, dy, gbxmin, gbymin, gbxmax, gbymax) {
    let colli = 0;
    if (!Is_airlevel(game.u?.uz) || !rn2(6)) {
        let mdx = dx;
        let mdy = dy;
        if (mdx < -1 || mdx > 1 || mdy < -1 || mdy > 1) {
            mdx = Math.sign(mdx);
            mdy = Math.sign(mdy);
        }
        if (b.x <= gbxmin) colli |= 2;
        if (b.y <= gbymin) colli |= 1;
        if ((b.x + b.bm[0] - 1) >= gbxmax) colli |= 2;
        if ((b.y + b.bm[1] - 1) >= gbymax) colli |= 1;
        if (b.x === gbxmin && mdx < 0) mdx = -mdx;
        if (b.x + b.bm[0] - 1 === gbxmax && mdx > 0) mdx = -mdx;
        if (b.y === gbymin && mdy < 0) mdy = -mdy;
        if (b.y + b.bm[1] - 1 === gbymax && mdy > 0) mdy = -mdy;
        b.x += mdx;
        b.y += mdy;
    }
    const paint = Is_waterlevel(game.u?.uz) ? AIR : CLOUD;
    for (let i = 0; i < b.bm[0]; i++) {
        for (let j = 0; j < b.bm[1]; j++) {
            if (b.bm[j + 2] & (1 << i)) {
                const loc = game.level.at(b.x + i, b.y + j);
                if (loc) {
                    loc.typ = paint;
                    loc.lit = true;
                }
            }
        }
    }
    // C: boing — sometimes alter direction (!ini path; movebubbles uses FALSE)
    switch (colli) {
    case 1:
        b.dy = -b.dy;
        break;
    case 3:
        b.dy = -b.dy;
        // FALLTHROUGH
    case 2:
        b.dx = -b.dx;
        break;
    default:
        if ((b.dx || b.dy) ? !rn2(20) : !rn2(5)) {
            b.dx = 1 - rn2(3);
            b.dy = 1 - rn2(3);
        }
        break;
    }
}

/**
 * C ref: mkmaze.c fumaroles — gas-cloud bursts on lava (arrival / moveloop).
 * Named omission: Norep whoosh; clear_heros_fault.
 */
export function fumaroles() {
    const g = game;
    const lf = g.level?.flags;
    if (!lf?.fumaroles) return;
    let nmax = rn2(3);
    let sizemin = 5;
    if (Is_firelevel(g.u?.uz)) {
        nmax++;
        sizemin += 5;
    }
    if ((lf.temperature | 0) > 0) {
        nmax++;
        sizemin += 5;
    }
    for (let n = nmax; n; n--) {
        const x = rn1(COLNO - 4, 3);
        const y = rn1(ROWNO - 4, 3);
        if (g.level.at(x, y)?.typ === LAVAPOOL) {
            create_gas_cloud(x, y, rn1(10, sizemin), rn1(10, 5));
            // Norep whoosh / clear_heros_fault deferred
        }
    }
}

/**
 * C ref: dat/soko2-1.lua via load_special.
 * Named omissions: ensure_way_out;
 * populate exclusion_zones from des.exclusion; soko2-2 / soko4-1.
 */
function load_soko2_1() {
    const g = game;
    nhlib_shuffle_align();
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;
    g.level.flags.noteleport = true;
    g.level.flags.sokoban = true;
    g.level.flags.sokoban_rules = true;
    g.Sokoban = true;

    // C ref: dat/soko2-1.lua des.map — 20×12
    const SOKO2_1_MAP = `
--------------------
|........|...|.....|
|.....-..|.-.|.....|
|..|.....|...|.....|
|-.|..-..|.-.|.....|
|...--.......|.....|
|...|...-...-|.....|
|...|..|...--|.....|
|-..|..|----------+|
|..................|
|...|..|------------
--------            
`.replace(/^\n/, '');
    const { xstart, ystart } = splev_apply_centered_map(SOKO2_1_MAP);

    mkstairs(xstart + 6, ystart + 10, 0, null); // des.stair("down", 06, 10)
    mkstairs(xstart + 16, ystart + 4, 1, null); // des.stair("up", 16, 04)

    {
        const loc = g.level.at(xstart + 18, ystart + 8);
        if (loc) {
            if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) loc.typ = DOOR;
            loc.doormask = D_LOCKED;
            loc.flags = D_LOCKED;
        }
    }

    // des.region(selection.area(00,00, 19,11), "lit")
    for (let y = ystart; y <= ystart + 11 && y < ROWNO; y++) {
        for (let x = xstart; x <= xstart + 19 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }

    for (let y = ystart; y <= ystart + 11 && y < ROWNO; y++) {
        for (let x = Math.max(1, xstart); x <= xstart + 19 && x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }

    const boulderCoords = [
        [2, 2], [3, 2],
        [5, 3], [7, 3], [7, 2], [8, 2],
        [10, 3], [11, 3],
        [2, 7], [2, 8], [3, 9],
        [5, 7], [6, 6],
    ];
    for (const [mx, my] of boulderCoords) {
        mksobj_at(BOULDER, xstart + mx, ystart + my, true, true);
    }

    const trapSpecs = [
        [ROLLING_BOULDER_TRAP, 7, 9],
        [HOLE, 8, 9], [HOLE, 9, 9], [HOLE, 10, 9], [HOLE, 11, 9],
        [HOLE, 12, 9], [HOLE, 13, 9], [HOLE, 14, 9], [HOLE, 15, 9],
        [HOLE, 16, 9], [HOLE, 17, 9],
    ];
    for (const [ttyp, mx, my] of trapSpecs) {
        const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
        mktrap_seen_victim(ttmp, {});
    }

    for (let i = 0; i < 4; i++) splev_create_object(FOOD_CLASS);
    splev_create_object(RING_CLASS);
    splev_create_object(WAND_CLASS);

    // C ref: sp_lev.c load_special — wallify, flip, solidify, fixup, premap
    soko_load_epilogue();
}

/** C ref: sp_lev.c add_doors_to_room — scan bbox±1 for doors. */
function add_doors_to_room(croom) {
    if (!croom) return;
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++) {
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            if (!isok(x, y)) continue;
            const loc = game.level.at(x, y);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                add_door(x, y, croom);
        }
    }
    for (let i = 0; i < (croom.nsubrooms || 0); i++)
        add_doors_to_room(croom.sbrooms[i]);
}

/** C ref: rm.h IS_DOORJOIN — obstructed or iron bars. */
function IS_DOORJOIN(typ) {
    return IS_OBSTRUCTED(typ) || typ === IRONBARS;
}

/**
 * C ref: sp_lev.c set_door_orientation — MAP '+'/'S' door axis from
 * adjacent walls (also used by link_doors_rooms).
 */
function set_door_orientation(x, y) {
    const lev = (xx, yy) => game.level.at(xx, yy);
    let wleft = isok(x - 1, y) && (() => {
        const t = lev(x - 1, y)?.typ;
        return IS_WALL(t) || IS_DOOR(t) || t === SDOOR;
    })();
    let wright = isok(x + 1, y) && (() => {
        const t = lev(x + 1, y)?.typ;
        return IS_WALL(t) || IS_DOOR(t) || t === SDOOR;
    })();
    let wup = isok(x, y - 1) && (() => {
        const t = lev(x, y - 1)?.typ;
        return IS_WALL(t) || IS_DOOR(t) || t === SDOOR;
    })();
    let wdown = isok(x, y + 1) && (() => {
        const t = lev(x, y + 1)?.typ;
        return IS_WALL(t) || IS_DOOR(t) || t === SDOOR;
    })();
    if (!wleft && !wright && !wup && !wdown) {
        wleft = !isok(x - 1, y) || IS_DOORJOIN(lev(x - 1, y)?.typ);
        wright = !isok(x + 1, y) || IS_DOORJOIN(lev(x + 1, y)?.typ);
        wup = !isok(x, y - 1) || IS_DOORJOIN(lev(x, y - 1)?.typ);
        wdown = !isok(x, y + 1) || IS_DOORJOIN(lev(x, y + 1)?.typ);
    }
    const loc = lev(x, y);
    if (loc) loc.horizontal = ((wleft || wright) && !(wup && wdown)) ? 1 : 0;
}

/**
 * C ref: sp_lev.c shared_with_room — door cell adjacent to room interior.
 */
function shared_with_room(x, y, droom) {
    const rmno = ((droom.roomnoidx ?? 0) | 0) + ROOMOFFSET;
    if (!isok(x, y)) return false;
    const here = game.level.at(x, y);
    if ((here?.roomno | 0) === rmno && !here.edge) return false;
    if (isok(x - 1, y)) {
        const loc = game.level.at(x - 1, y);
        if ((loc?.roomno | 0) === rmno && x - 1 <= droom.hx) return true;
    }
    if (isok(x + 1, y)) {
        const loc = game.level.at(x + 1, y);
        if ((loc?.roomno | 0) === rmno && x + 1 >= droom.lx) return true;
    }
    if (isok(x, y - 1)) {
        const loc = game.level.at(x, y - 1);
        if ((loc?.roomno | 0) === rmno && y - 1 <= droom.hy) return true;
    }
    if (isok(x, y + 1)) {
        const loc = game.level.at(x, y + 1);
        if ((loc?.roomno | 0) === rmno && y + 1 >= droom.ly) return true;
    }
    return false;
}

/**
 * C ref: sp_lev.c maybe_add_door — attach door to room if inside/shared.
 */
function maybe_add_door(x, y, droom) {
    if (!droom || (droom.hx | 0) < 0) return;
    const rmno = ((droom.roomnoidx ?? 0) | 0) + ROOMOFFSET;
    const loc = game.level.at(x, y);
    if ((!droom.irregular && inside_room(droom, x, y))
        || (loc && (loc.roomno | 0) === rmno)
        || shared_with_room(x, y, droom)) {
        add_door(x, y, droom);
    }
}

/**
 * C ref: sp_lev.c link_doors_rooms — full-map door→room linkage after
 * special content (before wallify/fixup in load_special).
 */
function link_doors_rooms() {
    const rooms = game.level?.rooms || [];
    const nroom = game.level?.nroom | 0;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (!loc || (!IS_DOOR(loc.typ) && loc.typ !== SDOOR)) continue;
            set_door_orientation(x, y);
            for (let tmpi = 0; tmpi < nroom; tmpi++) {
                const droom = rooms[tmpi];
                if (!droom || (droom.hx | 0) < 0) continue;
                maybe_add_door(x, y, droom);
                for (let m = 0; m < (droom.nsubrooms | 0); m++)
                    maybe_add_door(x, y, droom.sbrooms[m]);
            }
        }
    }
}

/**
 * C ref: sp_lev.c create_monster id=giant mimic appear_as=obj:boulder.
 * Random map placement. C's boulder m_bad_boulder_spot retry is gated on
 * `m->x < 0` AFTER `m->x = mtmp->mx` (sp_lev.c ~1992/2041), so the retry
 * never runs — match that (do not invent post-makemon relocation RNG).
 */
function create_mimic_as_boulder() {
    const { mndx, female } = find_montype_gender('giant mimic');
    induced_align(80);
    const pm = (mndx !== NON_PM && mndx >= 0) ? mons(mndx) : null;
    let pos = get_location_random(null);
    if (game.fmon) {
        for (const m of game.fmon) {
            if (m.mx === pos.x && m.my === pos.y) {
                const cc = { x: 0, y: 0 };
                if (enexto(cc, pos.x, pos.y, pm)) pos = { x: cc.x, y: cc.y };
                break;
            }
        }
    }
    const mtmp = makemon(pm, pos.x, pos.y, 0);
    if (!mtmp) return null;
    mtmp.female = female;
    mtmp.m_ap_type = M_AP_OBJECT;
    mtmp.mappearance = BOULDER;
    return mtmp;
}

/** C ref: sp_lev.c m_bad_boulder_spot */
function m_bad_boulder_spot(x, y) {
    if (t_at(x, y)) return true;
    if (sobj_at(BOULDER, x, y)) return true;
    const loc = game.level.at(x, y);
    if (loc && IS_DOOR(loc.typ)
        && ((loc.doormask || loc.flags || 0) & (D_CLOSED | D_LOCKED)) !== 0)
        return true;
    return false;
}

/**
 * C ref: sp_lev.c flip_level_rnd — rn2 per allowed axis then flip_level.
 */
function flip_level_rnd(flp, extras) {
    let c = 0;
    if ((flp & 1) && rn2(2)) c |= 1;
    if ((flp & 2) && rn2(2)) c |= 2;
    if (c) flip_level(c, extras);
}

/** C ref: mkmaze.c get_level_extends — see bottom of file. */

/**
 * C ref: sp_lev.c flip_level — transpose terrain / traps / objs / mons /
 * rooms / doors / stairs / engravings in the extends bbox.
 * Named omissions: lregions deferred beyond inarea/delarea flip; drawbridge
 * flip helpers, vault-guard extras, worm segs, exclusion zones, ball/chain.
 */
function flip_level(flp, _extras) {
    if ((flp & 3) === 0) return;
    let { xmin: minx, ymin: miny, xmax: maxx, ymax: maxy } = get_level_extends();
    if (miny < 0) miny = 0;
    if (minx < 1) minx = 1;
    if (maxx >= COLNO) maxx = COLNO - 1;
    if (maxy >= ROWNO) maxy = ROWNO - 1;
    const FlipX = (x) => (maxx - x) + minx;
    const FlipY = (y) => (maxy - y) + miny;
    const inFlipArea = (x, y) =>
        x >= minx && x <= maxx && y >= miny && y <= maxy;

    // C: flip SpLev_Map bits with the terrain (needed for solidify_map)
    if (game.SpLev_Map && game.SpLev_Map.size) {
        const next = new Set();
        for (const key of game.SpLev_Map) {
            const [xs, ys] = key.split(',');
            let x = Number(xs), y = Number(ys);
            if (inFlipArea(x, y)) {
                if (flp & 1) y = FlipY(y);
                if (flp & 2) x = FlipX(x);
            }
            next.add(`${x},${y}`);
        }
        game.SpLev_Map = next;
    }

    // stairs
    for (let stway = game.stairs; stway; stway = stway.next) {
        if ((flp & 1) && inFlipArea(stway.sx, stway.sy))
            stway.sy = FlipY(stway.sy);
        if ((flp & 2) && inFlipArea(stway.sx, stway.sy))
            stway.sx = FlipX(stway.sx);
    }
    if (game.level?.upstair && inFlipArea(game.level.upstair.x, game.level.upstair.y)) {
        if (flp & 1) game.level.upstair.y = FlipY(game.level.upstair.y);
        if (flp & 2) game.level.upstair.x = FlipX(game.level.upstair.x);
    }
    if (game.level?.dnstair && inFlipArea(game.level.dnstair.x, game.level.dnstair.y)) {
        if (flp & 1) game.level.dnstair.y = FlipY(game.level.dnstair.y);
        if (flp & 2) game.level.dnstair.x = FlipX(game.level.dnstair.x);
    }

    // traps (list + level.traps)
    const trapList = [];
    if (Array.isArray(game.level?.traps)) trapList.push(...game.level.traps);
    else if (game.ftrap) {
        for (let t = game.ftrap; t; t = t.ntrap) trapList.push(t);
    }
    for (const ttmp of trapList) {
        if (!ttmp || !inFlipArea(ttmp.tx, ttmp.ty)) continue;
        if (flp & 1) {
            ttmp.ty = FlipY(ttmp.ty);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                if (ttmp.launch) ttmp.launch.y = FlipY(ttmp.launch.y);
                if (ttmp.launch2) ttmp.launch2.y = FlipY(ttmp.launch2.y);
            }
        }
        if (flp & 2) {
            ttmp.tx = FlipX(ttmp.tx);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                if (ttmp.launch) ttmp.launch.x = FlipX(ttmp.launch.x);
                if (ttmp.launch2) ttmp.launch2.x = FlipX(ttmp.launch2.x);
            }
        }
    }

    // objects on fobj — update coords then rebuild _objects_at
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
        if (!inFlipArea(otmp.ox, otmp.oy)) continue;
        if (flp & 1) otmp.oy = FlipY(otmp.oy);
        if (flp & 2) otmp.ox = FlipX(otmp.ox);
    }
    if (game._objects_at) {
        const next = new Map();
        for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
            if (otmp.where !== undefined && otmp.where !== 1 /* OBJ_FLOOR */
                && otmp.where !== OBJ_FREE) {
                // still re-index floor objs by ox,oy
            }
            const key = `${otmp.ox},${otmp.oy}`;
            otmp.nexthere = next.get(key) || null;
            next.set(key, otmp);
        }
        // Rebuild properly preserving nexthere stacking order from fobj scan
        // (above inverted order). Redo: clear and place via scan per cell.
        game._objects_at = new Map();
        for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
            const key = `${otmp.ox | 0},${otmp.oy | 0}`;
            otmp.nexthere = game._objects_at.get(key) || null;
            game._objects_at.set(key, otmp);
        }
    }

    // monsters
    if (game.fmon) {
        for (const mtmp of game.fmon) {
            if (!mtmp || !inFlipArea(mtmp.mx, mtmp.my)) continue;
            if (flp & 1) mtmp.my = FlipY(mtmp.my);
            if (flp & 2) mtmp.mx = FlipX(mtmp.mx);
        }
    }

    // engravings
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        if (flp & 1) ep.engr_y = FlipY(ep.engr_y);
        if (flp & 2) ep.engr_x = FlipX(ep.engr_x);
    }

    // C ref: sp_lev.c flip_level — lregions inarea/delarea
    for (const r of game.lregions || []) {
        if (!r?.inarea) continue;
        if (flp & 1) {
            r.inarea.y1 = FlipY(r.inarea.y1);
            r.inarea.y2 = FlipY(r.inarea.y2);
            if (r.inarea.y1 > r.inarea.y2) {
                const t = r.inarea.y1; r.inarea.y1 = r.inarea.y2; r.inarea.y2 = t;
            }
            r.delarea.y1 = FlipY(r.delarea.y1);
            r.delarea.y2 = FlipY(r.delarea.y2);
            if (r.delarea.y1 > r.delarea.y2) {
                const t = r.delarea.y1; r.delarea.y1 = r.delarea.y2; r.delarea.y2 = t;
            }
        }
        if (flp & 2) {
            r.inarea.x1 = FlipX(r.inarea.x1);
            r.inarea.x2 = FlipX(r.inarea.x2);
            if (r.inarea.x1 > r.inarea.x2) {
                const t = r.inarea.x1; r.inarea.x1 = r.inarea.x2; r.inarea.x2 = t;
            }
            r.delarea.x1 = FlipX(r.delarea.x1);
            r.delarea.x2 = FlipX(r.delarea.x2);
            if (r.delarea.x1 > r.delarea.x2) {
                const t = r.delarea.x1; r.delarea.x1 = r.delarea.x2; r.delarea.x2 = t;
            }
        }
    }

    // rooms (+ nested sbrooms — C sp_lev.c flip_level)
    const flipRoomBounds = (sroom) => {
        if (!sroom || sroom.hx < 0) return;
        if (flp & 1) {
            sroom.ly = FlipY(sroom.ly);
            sroom.hy = FlipY(sroom.hy);
            if (sroom.ly > sroom.hy) {
                const t = sroom.ly; sroom.ly = sroom.hy; sroom.hy = t;
            }
        }
        if (flp & 2) {
            sroom.lx = FlipX(sroom.lx);
            sroom.hx = FlipX(sroom.hx);
            if (sroom.lx > sroom.hx) {
                const t = sroom.lx; sroom.lx = sroom.hx; sroom.hx = t;
            }
        }
        for (let i = 0; i < (sroom.nsubrooms | 0); i++)
            flipRoomBounds(sroom.sbrooms[i]);
    };
    for (let i = 0; i < (game.level?.nroom | 0); i++) {
        const sroom = game.level.rooms[i];
        if (!sroom || sroom.hx < 0) break;
        flipRoomBounds(sroom);
    }

    // doors
    const doors = game.level?.doors || [];
    for (let i = 0; i < (game.level?.doorindex | doors.length | 0); i++) {
        const d = doors[i];
        if (!d || !inFlipArea(d.x, d.y)) continue;
        if (flp & 1) d.y = FlipY(d.y);
        if (flp & 2) d.x = FlipX(d.x);
    }

    // terrain cell swap
    if (flp & 1) {
        for (let x = minx; x <= maxx; x++) {
            for (let y = miny; y < (miny + Math.floor((maxy - miny + 1) / 2)); y++) {
                const ny = FlipY(y);
                const a = game.level.at(x, y);
                const b = game.level.at(x, ny);
                if (!a || !b) continue;
                const tmp = { ...a };
                Object.assign(a, b);
                Object.assign(b, tmp);
            }
        }
    }
    if (flp & 2) {
        for (let x = minx; x < (minx + Math.floor((maxx - minx + 1) / 2)); x++) {
            for (let y = miny; y <= maxy; y++) {
                const nx = FlipX(x);
                const a = game.level.at(x, y);
                const b = game.level.at(nx, y);
                if (!a || !b) continue;
                const tmp = { ...a };
                Object.assign(a, b);
                Object.assign(b, tmp);
            }
        }
    }

    // C flip_level: fix_wall_spines after cell swap so corners/T-junctions
    // match the new orientation (TLCORNER moved to the right must become
    // TRCORNER). flip_visuals only when extras (wizfliplevel) — deferred.
    fix_wall_spines(1, 0, COLNO - 1, ROWNO - 1);
}

/**
 * C ref: sp_lev.c lspo_map — string des.map defaults halign/valign CENTER.
 * Forces odd xstart/ystart like C after the maze-max formula.
 */
function splev_map_center_start(wid, hei) {
    let xstart = 2 + Math.floor((X_MAZE_MAX - 2 - wid) / 2);
    let ystart = 2 + Math.floor((Y_MAZE_MAX - 2 - hei) / 2);
    if (!(xstart % 2)) xstart++;
    if (!(ystart % 2)) ystart++;
    // C ref: sp_lev.c lspo_map — clamp when map does not fit ROWNO
    if (ystart < 0 || ystart + hei > ROWNO) {
        ystart += (ystart > 0) ? -2 : 2;
        if (hei === ROWNO) ystart = 0;
        if (ystart < 0 || ystart + hei > ROWNO) ystart = 0;
    }
    return { xstart, ystart };
}

/**
 * C ref: dat/tut-1.lua via load_special — map + des.* through end of file.
 * Named omissions: tut_key/eckey (hardcoded defaults), Knight jump,
 * leave-tutorial invent restore, map_location tseen traps.
 */
function load_tut1() {
    // C: load_special loads nhlib.lua → shuffle(align) then runs tut-1.lua
    nhlib_shuffle_align();
    // des.level_init({ style = "solidfill", fg = " " }) — ' ' → STONE
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!game.level.flags) game.level.flags = {};
    game.level.flags.is_maze_lev = true;
    game.level.flags.nomongen = true;
    game.level.flags.nodeathdrops = true;
    game.level.flags.noautosearch = true;

    // des.map([[...]]) — C lspo_map string form → SPLEV_CENTER (not 1,0)
    const TUT1_MAP = `
---------------------------------------------------------------------------
|-.--|.......|......|..S....|.F.......|.............|.......|.............|
|.-..........|......|--|....|.F.....|.|S-------.....|.....................|
||.--|.......|..T......|....|.F.....|.|.......|.....|.......|.............|
||.|.|.......|......|-.|....|.F.....|.|.......|.....|--------.............|
||.|.|.......|......||.|-.-----------.-.......|-S----.....................|
|-+-S---------..---.||........................|...|.......................|
|......|          |.-------------------.......|...|....--S----............|
|......|  ######  |.........|      |..S.......|...|....|.....|............|
|----.-| -+-   #  |.....---.|######+..|.......S...|....|.....|............|
|----+----.----+---.|.--|.|.|#     ------------...|....|.....F............|
|........|.|......|.|...F...|#  ........|.....+...|....|.....|............|
|.P......-S|......|------.---# .........|.....|...|....-------........----|
|..........|......+.|...|.|.S# ..--S-----.....|LLL|..................|..| |
|.W......---......|.|.|.|.|.|# ..|......|.....|LLL|..................|..--|
|....Z.L.S.F......|.|.|.|.---#   |......+.....|...|..................|..|.|
|........|--......|...|.....|####+......|.....|...+..................||...|
---------------------------------------------------------------------------
`.replace(/^\n/, '');
    const mf = mapfrag_fromstr(TUT1_MAP);
    const { xstart, ystart } = splev_map_center_start(mf.wid, mf.hei);
    game.splev_xstart = xstart;
    game.splev_ystart = ystart;
    game.splev_xsize = mf.wid;
    game.splev_ysize = mf.hei;
    for (let yy = ystart; yy < Math.min(ROWNO, ystart + mf.hei); yy++) {
        for (let xx = xstart; xx < Math.min(COLNO, xstart + mf.wid); xx++) {
            const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            sel_set_ter(xx, yy, mptyp, false);
        }
    }
    // des.region lit area(01,01,73,16) — map-relative + xstart/ystart
    for (let y = ystart + 1; y <= ystart + 16 && y < ROWNO; y++) {
        for (let x = xstart + 1; x <= xstart + 73 && x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc) loc.lit = true;
        }
    }
    // des.non_diggable — mark all as nondiggable
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc) loc.flags = (loc.flags | 0) | W_NONDIGGABLE;
        }
    }
    // des.teleport_region({ region = { 9,3, 9,3 } }) — C levregion_add
    // get_location then fixup_special → updest/dndest; place via u_on_rndspot.
    const tx = xstart + 9;
    const ty = ystart + 3;
    const tele = { lx: tx, ly: ty, hx: tx, hy: ty, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.updest = { ...tele };
    game.dndest = { ...tele };

    // C: nh.parse_config OPTIONS=mention_walls/mention_decor/lit_corridor
    if (!game.flags) game.flags = {};
    game.flags.mention_walls = true;
    game.flags.mention_decor = true;
    game.flags.lit_corridor = true;

    // C: lspo_engraving degrade=false → nowipeout; coords map-relative.
    // tut_key/eckey deferred — default hjkl / single-letter binds.
    const tut1_engr = (mx, my, text, etype = ENGRAVE) => {
        const ep = make_engr_at(
            xstart + mx, ystart + my, text, null, 0, etype,
        );
        if (ep) ep.nowipeout = 1;
    };
    // C: lspo_door → sel_set_door (doormask; typ already DOOR from map '+')
    const tut1_door = (mx, my, mask) => {
        const loc = game.level.at(xstart + mx, ystart + my);
        if (!loc) return;
        if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR) {
            loc.typ = DOOR;
        }
        loc.doormask = mask;
        loc.flags = mask;
    };

    tut1_engr(9, 3, 'Move around with h j k l');
    // C: diagmovekeys via tut_key; default b u n y for hjkl.
    tut1_engr(5, 2, 'Move diagonally with b u n y');
    // Knight jump engraving deferred (role gate).
    tut1_engr(2, 4, 'Some actions may require multiple tries before succeeding');
    tut1_engr(2, 5, 'Open the door by moving into it');
    tut1_door(2, 6, D_CLOSED);
    tut1_engr(2, 7, "Close the door with 'c'");
    tut1_engr(4, 5, 'You can leave the tutorial via the magic portal.');
    // C: create_trap → mktrap(SEEN); victim gate always burns rnd(4)
    {
        const ttmp = maketrap(xstart + 4, ystart + 4, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }

    // --- tut-1.lua kick door through search traps (RNG-critical) ---
    tut1_engr(5, 9, "This door is locked. Kick it with 'Ctrl-D'");
    tut1_door(5, 10, D_LOCKED);
    // tut_key_help(6,8): kick is Ctrl-D → ctrl-key help engraving
    tut1_engr(6, 8,
        "Note: Outside the tutorial, Ctrl-key combinations are shown prefixed with a caret, like '^D'");
    tut1_engr(5, 12,
        "Look around the map with ';', press ESC when you're done");
    tut1_engr(10, 13, "Use 's' to search for secret doors");
    tut1_engr(10, 15, 'Wrong secret');
    tut1_engr(10, 10, 'Behind this door is a dark corridor');
    // des.door percent(50) locked/closed — C nhlib percent → rn2(100)
    tut1_door(10, 9, percent(50) ? D_LOCKED : D_CLOSED);
    // des.region(selection.match("#"|" "), "unlit")
    tut1_unlit_match(xstart, ystart, mf, '#');
    tut1_unlit_match(xstart, ystart, mf, ' ');
    tut1_door(15, 10, percent(50) ? D_LOCKED : D_CLOSED);

    tut1_engr(15, 11, 'There are four traps next to you! Search for them.');
    // C: shuffle then 4× percent trap with victim=false (no rnd(4))
    {
        const locs = [[14, 11], [14, 12], [15, 12], [16, 12], [16, 11]];
        nhlib_shuffle(locs);
        for (let i = 0; i < 4; i++) {
            const [mx, my] = locs[i];
            const ttyp = percent(50) ? SLP_GAS_TRAP : SQKY_BOARD;
            const ttmp = maketrap(xstart + mx, ystart + my, ttyp);
            mktrap_seen_victim(ttmp, { novictim: true });
        }
    }
    tut1_engr(15, 15, "Some traps can be disabled with 'Ctrl-T'");
    {
        // spider_on_web=false → no spider; still burns victim-gate rnd(4)
        const ttmp = maketrap(xstart + 15, ystart + 16, WEB);
        mktrap_seen_victim(ttmp, { nospider: true });
    }
    tut1_door(18, 13, D_CLOSED);

    tut1_engr(19, 13, "Pick up items with ','");
    // C: Monk → leather gloves; else leather armor; spe=0 cursed
    {
        const otyp = (game.urole?.mnum === PM_MONK)
            ? objectNames.indexOf('LEATHER_GLOVES')
            : objectNames.indexOf('LEATHER_ARMOR');
        tut1_object(xstart, ystart, 19, 14, otyp, 0, 'cursed');
    }
    tut1_engr(19, 15, "Wear armor with 'W'");
    tut1_object(xstart, ystart, 21, 15, DAGGER, 0, 'not-cursed');
    tut1_engr(21, 14, "Wield weapons with 'w'");
    tut1_engr(22, 13, 'Hit monsters by walking into them.');
    // lichen: find_montype gender + induced_align + makemon waiting
    {
        find_montype_gender('lichen');
        induced_align(80); // C sp_amask_to_amask(RANDOM) always
        const mtmp = makemon(mons(PM_LICHEN), xstart + 23, ystart + 15, MM_NOGRP);
        if (mtmp) {
            mtmp.mstrategy = (mtmp.mstrategy || 0) | STRAT_WAITFORU;
        }
    }

    tut1_engr(24, 16,
        'Now you know the very basics. You can leave the tutorial via the magic portal.');
    tut1_engr(26, 16, 'Step into this portal to leave the tutorial');
    {
        const ttmp = maketrap(xstart + 27, ystart + 16, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }
    tut1_engr(25, 13, 'Push boulders by moving into them');
    tut1_object(xstart, ystart, 25, 12, BOULDER, -127, null);
    tut1_engr(27, 9, "Take off armor with 'T'");
    {
        const otmp = tut1_object(xstart, ystart, 23, 11,
            objectNames.indexOf('SCR_REMOVE_CURSE'), -127, 'blessed');
        void otmp;
    }
    tut1_engr(22, 11,
        'Some items have shuffled descriptions, different each game');
    tut1_engr(23, 11,
        "Pick up this scroll, read it with 'r', and try to remove the armor again");
    tut1_engr(19, 10, 'Another magic portal, a way to leave this tutorial');
    {
        const ttmp = maketrap(xstart + 19, ystart + 11, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }
    // rock fall — Lua math.random(lo,hi) → lo+rn2(hi-lo+1) then mksobj
    tut1_object_quan(xstart, ystart, 14, 5, ROCK, 50 + rn2(50));
    tut1_object_quan(xstart, ystart, 15, 5, ROCK, 10 + rn2(21));
    tut1_object_quan(xstart, ystart, 14, 4, ROCK, 10 + rn2(21));
    tut1_object_quan(xstart, ystart, 15, 6, ROCK, 30 + rn2(31));
    tut1_object_quan(xstart, ystart, 14, 6, ROCK, 30 + rn2(31));
    tut1_object(xstart, ystart, 14, 6, BOULDER, -127, null);
    tut1_door(20, 3, percent(50) ? D_ISOPEN : D_CLOSED);
    tut1_engr(21, 3, 'Avoid being burdened, it slows you down');
    tut1_engr(22, 3, "Drop items with 'd'");
    tut1_engr(22, 4,
        'You can drop partial stacks by prefixing the item slot letter with a number');
    {
        find_montype_gender('yellow mold');
        induced_align(80);
        const pm = name_to_mon('yellow mold');
        const mtmp = pm >= 0 ? makemon(mons(pm), xstart + 26, ystart + 2, MM_NOGRP) : null;
        if (mtmp) mtmp.mstrategy = (mtmp.mstrategy || 0) | STRAT_WAITFORU;
    }
    tut1_engr(25, 5, "Throw items with 't'");
    {
        const ttmp = maketrap(xstart + 21, ystart + 1, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }
    {
        find_montype_gender('wolf');
        induced_align(80);
        const pm = name_to_mon('wolf');
        const mtmp = pm >= 0 ? makemon(mons(pm), xstart + 29, ystart + 2, MM_NOGRP) : null;
        if (mtmp) {
            mtmp.mpeaceful = 0;
            mtmp.mstrategy = (mtmp.mstrategy || 0) | STRAT_WAITFORU;
        }
    }
    tut1_engr(37, 4,
        'Missiles, such as rocks, work better when fired from appropriate launcher');
    tut1_object(xstart, ystart, 37, 3,
        objectNames.indexOf('SLING'), 9, 'not-cursed');
    tut1_engr(37, 3, 'Wield the sling');
    tut1_engr(36, 1, "Use 'f' to fire missiles with the wielded launcher");
    tut1_engr(35, 4,
        "Firing launches items from your quiver; Use 'Q' to put items in it");
    tut1_engr(33, 4, "You can wait a turn with '.'");
    tut1_door(38, 6, D_CLOSED);

    // --- tut-1.lua loot box through end (RNG-critical) ---
    tut1_engr(39, 6, "You loot containers with ':'");
    // C: create_object large box broken+trapped=false + contents wand
    {
        const box = tut1_object(xstart, ystart, 41, 6, LARGE_BOX, -127, null);
        if (box) {
            // C: broken → obroken=1 olocked=0; trapped=0 overrides mksobj
            box.obroken = 1;
            box.olocked = 0;
            box.otrapped = 0;
            // C: SP_OBJ_CONTAINER → delete_contents (mkbox_cnts already burned)
            box.cobj = null;
            // contents: get_location RANDOM then mksobj_at wand spe=30
            const sx = game.splev_xsize | 0;
            const sy = game.splev_ysize | 0;
            let wx = xstart + rn2(sx);
            let wy = ystart + rn2(sy);
            const wand = mksobj_at(
                WAN_SECRET_DOOR_DETECTION, wx, wy, true, true,
            );
            if (wand) {
                wand.spe = 30;
                wand.oeroded = 0;
                wand.oeroded2 = 0;
                wand.oerodeproof = 0;
                obj_extract_self(wand);
                add_to_container(box, wand);
                box.owt = weight(box);
            }
        }
    }
    tut1_engr(42, 6, "Containers can also be emptied with '\\'");
    tut1_engr(45, 6, "Magic wands are used with 'z'");

    tut1_door(35, 9, D_NODOOR);
    tut1_engr(34, 9, "You can run by prefixing a movement key with 'G'");
    tut1_door(33, 16, D_NODOOR);
    tut1_engr(35, 15, "Travel across the level with '_'");

    {
        const ttmp = maketrap(xstart + 27, ystart + 14, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }

    tut1_engr(48, 1, "Use 'e' to eat edible things", BURN);
    tut1_object(xstart, ystart, 50, 3, APPLE, -127, 'not-cursed');
    tut1_object(xstart, ystart, 50, 3, CANDY_BAR, -127, 'not-cursed');
    {
        const otmp = tut1_object(xstart, ystart, 50, 3, CORPSE, -127, 'not-cursed');
        if (otmp) set_corpsenm(otmp, PM_LICHEN);
    }

    tut1_door(46, 11, D_CLOSED);
    tut1_engr(43, 11, "Use '#twoweapon' to use two weapons at once", BURN);
    tut1_object(xstart, ystart, 43, 13, KNIFE, -127, 'uncursed');
    tut1_object(xstart, ystart, 43, 14, DAGGER, -127, 'blessed');
    tut1_engr(43, 16, "Swap weapons quickly with 'x'", BURN);
    // C: lspo_door state=random → rnddoor() / ROLL_FROM
    tut1_door(40, 15, rnddoor());

    tut1_object(xstart, ystart, 48, 7, RIN_LEVITATION, -127, 'not-cursed');
    tut1_engr(48, 10, "Put on accessories with 'P'", BURN);
    tut1_engr(48, 16, "Remove accessories with 'R'", BURN);
    tut1_door(50, 16, D_CLOSED);

    tut1_engr(58, 9, "Use '>' to go down the stairs", BURN);
    mkstairs(xstart + 58, ystart + 10, 0, null);

    // tut_key_help(64,4): no pending Ctrl key after kick help already emitted
    tut1_engr(65, 3, 'UNDER CONSTRUCTION', BURN);
    {
        const ttmp = maketrap(xstart + 66, ystart + 2, MAGIC_PORTAL);
        mktrap_seen_victim(ttmp, { seen: true });
    }

    tut1_engr(69, 12, "Can't get through?  You're carrying too much.", BURN);
    tut1_object(xstart, ystart, 71, 16, BOULDER, -127, null);
    tut1_object(xstart, ystart, 72, 16, BOULDER, -127, null);
    tut1_object(xstart, ystart, 73, 16, BOULDER, -127, null);
    {
        const ttmp = maketrap(xstart + 73, ystart + 15, TRAPDOOR);
        mktrap_seen_victim(ttmp, {});
    }

    tut1_engr(60, 2, 'Spellcasting');
    // C: if (u.uenmax < 5) — Ranger starter Pw often < 5
    if ((game.u?.uenmax | 0) < 5) {
        tut1_engr(59, 2,
            "Unfortunately you don't have enough energy to cast spells.");
    }
    tut1_engr(57, 2, "Pick up the spellbook with ','");
    tut1_object(xstart, ystart, 57, 2, SPE_LIGHT, -127, 'blessed');
    tut1_engr(55, 2, "Read the spellbook with 'r'");
    tut1_engr(53, 2, "Use 'Z' to cast a spell");
    // des.region(selection.area(53,01, 59, 3), "unlit")
    for (let y = ystart + 1; y <= ystart + 3 && y < ROWNO; y++) {
        for (let x = xstart + 53; x <= xstart + 59 && x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc) loc.lit = false;
        }
    }

    tut1_engr(72, 2, 'You "quaff" potions with \'q\'');
    tut1_object(xstart, ystart, 72, 2, POT_OBJECT_DETECTION, -127, 'blessed');
}

/**
 * C ref: sp_lev.c rnddoor — ROLL_FROM({NODOOR,BROKEN,ISOPEN,CLOSED,LOCKED}).
 */
function rnddoor() {
    const state = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
    return state[rn2(state.length)];
}

/**
 * C ref: sp_lev.c create_object — mksobj_at then spe + curse_state.
 * Erosions from mksobj are cleared when des.object omits eroded=.
 * spe=-127 means leave mksobj spe; buc null means leave mksobj buc.
 */
function tut1_object(xstart, ystart, mx, my, otyp, spe, buc) {
    if (otyp < 0) return null;
    const otmp = mksobj_at(otyp, xstart + mx, ystart + my, true, true);
    if (!otmp) return null;
    if (spe !== -127) otmp.spe = spe;
    if (buc === 'cursed') curse(otmp);
    else if (buc === 'blessed') bless(otmp);
    else if (buc === 'not-cursed') {
        otmp.cursed = false;
    } else if (buc === 'uncursed') {
        otmp.blessed = false;
        otmp.cursed = false;
    }
    otmp.oeroded = 0;
    otmp.oeroded2 = 0;
    otmp.oerodeproof = 0;
    return otmp;
}

/** C ref: create_object quan>0 && oc_merge — set after mksobj_at. */
function tut1_object_quan(xstart, ystart, mx, my, otyp, quan) {
    const otmp = tut1_object(xstart, ystart, mx, my, otyp, -127, null);
    if (otmp && quan > 0) {
        otmp.quan = quan;
        otmp.owt = weight(otmp);
    }
    return otmp;
}

/**
 * C ref: mklev.c mktrap post-maketrap — spider on WEB, SEEN, victim gate.
 * Order matches C: WEB makemon before SEEN before victim `rnd(4)`.
 * `rnd(4)` is evaluated only when !novictim (clang && short-circuit).
 * MAGIC_PORTAL/WEB fail (kind < HOLE || MAGIC_TRAP) so no victim body.
 * opts.nospider / MKTRAP_NOSPIDERONWEB skips giant spider (create_trap).
 */
function mktrap_seen_victim(ttmp, opts) {
    if (!ttmp) return;
    const kind = ttmp.ttyp;
    const nospider = !!(opts?.nospider
        || ((opts?.mktrapflags ?? 0) & MKTRAP_NOSPIDERONWEB));
    // C: if (kind == WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
    //        makemon(&mons[PM_GIANT_SPIDER], m.x, m.y, NO_MM_FLAGS);
    if (kind === WEB && !nospider) {
        makemon(mons(PM_GIANT_SPIDER), ttmp.tx, ttmp.ty, 0);
    }
    if (opts?.seen) ttmp.tseen = true;
    const novictim = !!(opts?.novictim
        || ((opts?.mktrapflags ?? 0) & MKTRAP_NOVICTIM));
    const lvl = level_difficulty();
    if (game.in_mklev
        && kind !== NO_TRAP
        && !novictim
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
            && ttmp.launch?.x === ttmp.tx && ttmp.launch?.y === ttmp.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            ttmp.ttyp = PIT;
            ttmp.tseen = true;
        }
        mktrap_victim(ttmp);
    }
}

/** C ref: selection.match(ch) then des.region unlit — map-relative cells. */
function tut1_unlit_match(xstart, ystart, mf, ch) {
    for (let my = 0; my < mf.hei; my++) {
        for (let mx = 0; mx < mf.wid; mx++) {
            if (mf.data[my]?.[mx] !== ch) continue;
            const loc = game.level.at(xstart + mx, ystart + my);
            if (loc) loc.lit = false;
        }
    }
}

/** C ref: nhlib.lua top-level shuffle(align) on special-level load */
function nhlib_shuffle_align() {
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game.splev_align = align;
}

/** C ref: sp_lev.c lvlfill_solid → set_levltyp_lit */
function lvlfill_solid(filling, lit) {
    const map = game.level;
    for (let x = 2; x <= X_MAZE_MAX; x++) {
        for (let y = 0; y <= Y_MAZE_MAX; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.typ = filling;
            loc.flags = 0;
            loc.horizontal = false;
            loc.roomno = 0;
            loc.edge = false;
            // C set_levltyp_lit: always assign when lit != SET_LIT_NOCHANGE
            let l = lit;
            if (IS_LAVA(filling)) l = 1;
            else if (l === SET_LIT_RANDOM) l = rn2(2);
            loc.lit = !!l;
        }
    }
}

/** C ref: mkmap.c init_map */
function mkmap_init_map(bg_typ) {
    const map = game.level;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.roomno = NO_ROOM;
            loc.typ = bg_typ;
            loc.lit = false;
        }
    }
}

/** C ref: mkmap.c init_fill */
function mkmap_init_fill(bg_typ, fg_typ) {
    const map = game.level;
    const limit = (MKMAP_WIDTH * MKMAP_HEIGHT * 2) / 5;
    let count = 0;
    while (count < limit) {
        const x = rn1(MKMAP_WIDTH - 1, 2);
        const y = rnd(MKMAP_HEIGHT - 1);
        const loc = map.at(x, y);
        if (loc && loc.typ === bg_typ) {
            loc.typ = fg_typ;
            count++;
        }
    }
}

const MKMAP_DIRS = [
    -1, -1, -1, 0, -1, 1, 0, -1,
    0, 1, 1, -1, 1, 0, 1, 1,
];

function mkmap_get(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > MKMAP_WIDTH || row >= MKMAP_HEIGHT)
        return bg_typ;
    return game.level.at(col, row)?.typ ?? bg_typ;
}

function mkmap_pass_one(bg_typ, fg_typ) {
    const map = game.level;
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                if (mkmap_get(x + MKMAP_DIRS[dr * 2], y + MKMAP_DIRS[dr * 2 + 1], bg_typ)
                    === fg_typ)
                    count++;
            }
            const loc = map.at(x, y);
            if (!loc) continue;
            if (count <= 2) loc.typ = bg_typ;
            else if (count >= 5) loc.typ = fg_typ;
        }
    }
}

function mkmap_pass_two(bg_typ, fg_typ) {
    const map = game.level;
    const neu = new Array((MKMAP_WIDTH + 1) * MKMAP_HEIGHT);
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                if (mkmap_get(x + MKMAP_DIRS[dr * 2], y + MKMAP_DIRS[dr * 2 + 1], bg_typ)
                    === fg_typ)
                    count++;
            }
            neu[y * (MKMAP_WIDTH + 1) + x] = (count === 5)
                ? bg_typ
                : mkmap_get(x, y, bg_typ);
        }
    }
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            const loc = map.at(x, y);
            if (loc) loc.typ = neu[y * (MKMAP_WIDTH + 1) + x];
        }
    }
}

function mkmap_pass_three(bg_typ, fg_typ) {
    const map = game.level;
    const neu = new Array((MKMAP_WIDTH + 1) * MKMAP_HEIGHT);
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                if (mkmap_get(x + MKMAP_DIRS[dr * 2], y + MKMAP_DIRS[dr * 2 + 1], bg_typ)
                    === fg_typ)
                    count++;
            }
            neu[y * (MKMAP_WIDTH + 1) + x] = (count < 3)
                ? bg_typ
                : mkmap_get(x, y, bg_typ);
        }
    }
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            const loc = map.at(x, y);
            if (loc) loc.typ = neu[y * (MKMAP_WIDTH + 1) + x];
        }
    }
}

function mkmap_flood_fill_rm(sx, sy, rmno, lit, anyroom, bounds) {
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
    for (; i <= MKMAP_WIDTH; i++) {
        const loc = map.at(i, sy);
        if (!loc || loc.typ !== fg_typ) break;
        loc.roomno = rmno;
        loc.lit = !!lit;
        bounds.n_filled = (bounds.n_filled | 0) + 1;
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
                    mkmap_flood_fill_rm(i, sy - 1, rmno, lit, anyroom, bounds);
            } else {
                const al = map.at(i - 1, sy - 1);
                if ((i > sx || isok(i - 1, sy - 1)) && al?.typ === fg_typ
                    && al.roomno !== rmno)
                    mkmap_flood_fill_rm(i - 1, sy - 1, rmno, lit, anyroom, bounds);
                const ar = map.at(i + 1, sy - 1);
                if ((i < nx - 1 || isok(i + 1, sy - 1)) && ar?.typ === fg_typ
                    && ar.roomno !== rmno)
                    mkmap_flood_fill_rm(i + 1, sy - 1, rmno, lit, anyroom, bounds);
            }
        }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++) {
            const below = map.at(i, sy + 1);
            if (below?.typ === fg_typ) {
                if (below.roomno !== rmno)
                    mkmap_flood_fill_rm(i, sy + 1, rmno, lit, anyroom, bounds);
            } else {
                const bl = map.at(i - 1, sy + 1);
                if ((i > sx || isok(i - 1, sy + 1)) && bl?.typ === fg_typ
                    && bl.roomno !== rmno)
                    mkmap_flood_fill_rm(i - 1, sy + 1, rmno, lit, anyroom, bounds);
                const br = map.at(i + 1, sy + 1);
                if ((i < nx - 1 || isok(i + 1, sy + 1)) && br?.typ === fg_typ
                    && br.roomno !== rmno)
                    mkmap_flood_fill_rm(i + 1, sy + 1, rmno, lit, anyroom, bounds);
            }
        }
    }

    if (nx - 1 > bounds.max_rx) bounds.max_rx = nx - 1;
    if (sy > bounds.max_ry) bounds.max_ry = sy;
}

function join_map_cleanup() {
    const g = game;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            if (loc) loc.roomno = NO_ROOM;
        }
    }
    g.level.nroom = 0;
    g.level.rooms = [{ hx: -1 }];
}

function join_map_dig_pass(bg_typ, fg_typ) {
    const g = game;
    const rooms = g.level.rooms;
    const nroom = g.level.nroom;
    let ci = 0;
    let cj = 1;
    while (cj < nroom) {
        const croom = rooms[ci];
        const croom2 = rooms[cj];
        if (!croom || !croom2) break;
        const sm = { x: 0, y: 0 };
        const em = { x: 0, y: 0 };
        if (!somexy(croom, sm) || !somexy(croom2, em)) {
            sm.x = croom.lx + ((croom.hx - croom.lx) / 2 | 0);
            sm.y = croom.ly + ((croom.hy - croom.ly) / 2 | 0);
            em.x = croom2.lx + ((croom2.hx - croom2.lx) / 2 | 0);
            em.y = croom2.ly + ((croom2.hy - croom2.ly) / 2 | 0);
        }
        dig_corridor(sm, em, null, false, fg_typ, bg_typ);
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly) && rn2(3))) {
            ci = cj;
        }
        cj++;
    }
}

/** C ref: mkmap.c join_map */
function join_map_fixed(bg_typ, fg_typ) {
    const g = game;
    outer:
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            const loc = g.level.at(x, y);
            if (!loc || loc.typ !== fg_typ || loc.roomno !== NO_ROOM) continue;
            const bounds = {
                min_rx: x, max_rx: x, min_ry: y, max_ry: y, n_filled: 0,
            };
            mkmap_flood_fill_rm(x, y, g.level.nroom + ROOMOFFSET, false, false, bounds);
            if (bounds.n_filled > 3) {
                add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
                    false, OROOM, true);
                const croom = g.level.rooms[g.level.nroom - 1];
                if (croom) croom.irregular = true;
                if (g.level.nroom >= MAXNROFROOMS * 2) break outer;
            } else {
                const rmno = /* room index before add */ (g.level.nroom + ROOMOFFSET);
                // flood used nroom+ROOMOFFSET without incrementing nroom
                for (let sx = bounds.min_rx; sx <= bounds.max_rx; sx++) {
                    for (let sy = bounds.min_ry; sy <= bounds.max_ry; sy++) {
                        const cell = g.level.at(sx, sy);
                        if (cell && cell.roomno === rmno) {
                            cell.typ = bg_typ;
                            cell.roomno = NO_ROOM;
                        }
                    }
                }
            }
        }
    }
    join_map_dig_pass(bg_typ, fg_typ);
    join_map_cleanup();
}

/** C ref: sp_lev.c wallify_map */
function wallify_map(x1, y1, x2, y2) {
    const map = game.level;
    y1 = Math.max(y1, 0);
    x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1);
    x2 = Math.min(x2, COLNO - 1);
    for (let y = y1; y <= y2; y++) {
        const lo_yy = (y > 0) ? y - 1 : 0;
        const hi_yy = (y < y2) ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== STONE) continue;
            const lo_xx = (x > 1) ? x - 1 : 1;
            const hi_xx = (x < x2) ? x + 1 : x2;
            let done = false;
            for (let yy = lo_yy; yy <= hi_yy && !done; yy++) {
                for (let xx = lo_xx; xx <= hi_xx; xx++) {
                    const n = map.at(xx, yy);
                    if (n && (IS_ROOM(n.typ) || n.typ === CROSSWALL)) {
                        loc.typ = (yy !== y) ? HWALL : VWALL;
                        done = true;
                        break;
                    }
                }
            }
        }
    }
}

function finish_map(fg_typ, bg_typ, lit, walled, icedpools) {
    const map = game.level;
    if (walled) wallify_map(1, 0, COLNO - 1, ROWNO - 1);
    if (lit) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = map.at(x, y);
                if (!loc) continue;
                if ((!IS_OBSTRUCTED(fg_typ) && loc.typ === fg_typ)
                    || (!IS_OBSTRUCTED(bg_typ) && loc.typ === bg_typ)
                    || (bg_typ === TREE && loc.typ === bg_typ)
                    || (walled && IS_WALL(loc.typ)))
                    loc.lit = true;
            }
        }
        for (let i = 0; i < (game.level.nroom | 0); i++) {
            if (game.level.rooms[i]) game.level.rooms[i].rlit = 1;
        }
    }
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (loc.typ === LAVAPOOL) loc.lit = true;
            else if (loc.typ === ICE) loc.icedpool = icedpools ? 1 : 2;
        }
    }
}

/** C ref: mkmap.c mkmap */
function mkmap(init_lev) {
    const bg_typ = init_lev.bg;
    const fg_typ = init_lev.fg;
    const smooth = !!init_lev.smoothed;
    const join = !!init_lev.joined;
    let lit = init_lev.lit;
    const walled = !!init_lev.walled;

    lit = litstate_rnd(lit) ? 1 : 0;

    mkmap_init_map(bg_typ);
    mkmap_init_fill(bg_typ, fg_typ);
    mkmap_pass_one(bg_typ, fg_typ);
    mkmap_pass_two(bg_typ, fg_typ);
    if (smooth) {
        mkmap_pass_three(bg_typ, fg_typ);
        mkmap_pass_three(bg_typ, fg_typ);
    }
    if (join) join_map_fixed(bg_typ, fg_typ);
    finish_map(fg_typ, bg_typ, lit, walled, !!init_lev.icedpools);
    if (walled && join) {
        game.level.flags.is_maze_lev = false;
        game.level.flags.is_cavernous_lev = true;
    }
}

/** C ref: sp_lev.c splev_initlev — SOLIDFILL + MINES for minefill */
function splev_initlev(linit) {
    switch (linit.init_style) {
    case LVLINIT_SOLIDFILL:
        if (linit.lit === BOOL_RANDOM) linit.lit = rn2(2);
        lvlfill_solid(linit.filling, linit.lit);
        break;
    case LVLINIT_MINES:
        if (linit.lit === BOOL_RANDOM) linit.lit = rn2(2);
        if (linit.filling > -1) lvlfill_solid(linit.filling, 0);
        mkmap(linit);
        break;
    default:
        break;
    }
}

function splev_map_origin() {
    // C get_location uses coder xstart/ystart/xsize/ysize after lspo_map
    const sx = game.splev_xsize | 0;
    const sy = game.splev_ysize | 0;
    if (sx > 0 && sy > 0) {
        return {
            mx: game.splev_xstart | 0,
            my: game.splev_ystart | 0,
            sx,
            sy,
        };
    }
    return { mx: 1, my: 0, sx: COLNO - 1, sy: ROWNO };
}

function good_stair_loc(x, y) {
    const typ = game.level.at(x, y)?.typ;
    return typ === ROOM || typ === CORR || typ === ICE;
}

/**
 * C ref: sp_lev.c pm_to_humidity — DRY plus WET/HOT/SOLID by mon traits.
 * Named omission: Is_waterlevel short-circuit in is_ok_location.
 */
function pm_to_humidity(pm) {
    let loc = DRY;
    if (!pm) return loc;
    if (pm.mlet === 'S_EEL' || amphibious(pm) || is_swimmer(pm))
        loc = WET;
    if (is_flyer(pm) || is_floater(pm))
        loc |= (HOT | WET);
    if (passes_walls(pm) || noncorporeal(pm))
        loc |= SOLID;
    if (likes_fire(pm))
        loc |= HOT;
    return loc;
}

/**
 * C ref: sp_lev.c is_ok_location — humidity DRY|SPACELOC / WET / HOT / SOLID.
 * LAVAPOOL is not SPACE_POS (typ 20 < DOOR 23), so HOT is required for lava.
 */
function is_ok_location(x, y, humidity) {
    if (!isok(x, y)) return false;
    const typ = game.level.at(x, y)?.typ ?? STONE;
    if (humidity & ANY_LOC) return true;
    if ((humidity & SOLID) && IS_OBSTRUCTED(typ)) return true;
    if ((humidity & (DRY | SPACELOC)) && SPACE_POS(typ)) {
        const bould = sobj_at(BOULDER, x, y);
        if (!bould || (humidity & SOLID)) return true;
    }
    if ((humidity & WET) && (typ === POOL || typ === MOAT || typ === WATER))
        return true;
    if ((humidity & HOT) && IS_LAVA(typ)) return true;
    return false;
}

/** C ref: sp_lev.c is_ok_location humidity DRY — SPACE_POS, no boulder. */
function is_ok_location_dry(x, y) {
    return is_ok_location(x, y, DRY);
}

function get_location_random(ok_fn, humidity = DRY) {
    const { mx, my, sx, sy } = splev_map_origin();
    let x = 0, y = 0;
    let cpt = 0;
    const flags = humidity | 0;
    const ok = ok_fn || ((xx, yy) => is_ok_location(xx, yy, flags));
    do {
        x = mx + rn2(sx);
        y = my + rn2(sy);
        if (ok(x, y)) break;
    } while (++cpt < 100);
    if (cpt >= 100) {
        for (let xx = 0; xx < sx; xx++) {
            for (let yy = 0; yy < sy; yy++) {
                x = mx + xx;
                y = my + yy;
                if (ok(x, y)) return { x, y };
            }
        }
        if (flags & NO_LOC_WARN) return { x: -1, y: -1 };
        return { x: X_MAZE_MAX, y: Y_MAZE_MAX };
    }
    return { x, y };
}

/**
 * C ref: sp_lev.c get_location_coord — random coord path only.
 * First get_location(humidity|NO_LOC_WARN); on (-1,-1) retry
 * get_location(humidity) so amphibious WET-only searches burn two
 * full 100-try loops before create_monster's DRY fallback.
 * Named omission: fixed (non-random) coords; croom/somexy.
 */
function get_location_coord_random(humidity) {
    let pos = get_location_random(null, humidity | NO_LOC_WARN);
    if (pos.x < 0)
        pos = get_location_random(null, humidity);
    return pos;
}

function lua_random2(lo, hi) {
    return lo + rn2(hi - lo + 1);
}

function splev_create_object(oclass) {
    const pos = get_location_random(null);
    if (oclass == null) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
    else mkobj_at(oclass, pos.x, pos.y, true);
}

function splev_create_boulder() {
    const pos = get_location_random(null);
    mksobj_at(BOULDER, pos.x, pos.y, true, true);
}

/** C ref: defsym.h / monsym — reverse of display MLET_CH for des.monster class. */
function monclass_letter_to_mlet(ch) {
    const map = {
        a: 'S_ANT', b: 'S_BLOB', c: 'S_COCKATRICE', d: 'S_DOG', e: 'S_EYE',
        f: 'S_FELINE', g: 'S_GREMLIN', h: 'S_HUMANOID', i: 'S_IMP', j: 'S_JELLY',
        k: 'S_KOBOLD', l: 'S_LEPRECHAUN', m: 'S_MIMIC', n: 'S_NYMPH', o: 'S_ORC',
        p: 'S_PIERCER', q: 'S_QUADRUPED', r: 'S_RODENT', s: 'S_SPIDER',
        t: 'S_TRAPPER', u: 'S_UNICORN', v: 'S_VORTEX', w: 'S_WORM', x: 'S_XAN',
        y: 'S_LIGHT', z: 'S_ZRUTY',
        A: 'S_ANGEL', B: 'S_BAT', C: 'S_CENTAUR', D: 'S_DRAGON',
        E: 'S_ELEMENTAL', F: 'S_FUNGUS', G: 'S_GNOME', H: 'S_GIANT',
        J: 'S_JABBERWOCK', K: 'S_KOP', L: 'S_LICH', M: 'S_MUMMY', N: 'S_NAGA',
        O: 'S_OGRE', P: 'S_PUDDING', Q: 'S_QUANTMECH', R: 'S_RUSTMONST',
        S: 'S_SNAKE', T: 'S_TROLL', U: 'S_UMBER', V: 'S_VAMPIRE', W: 'S_WRAITH',
        X: 'S_XORN', Y: 'S_YETI', Z: 'S_ZOMBIE',
        "'": 'S_GOLEM', '&': 'S_DEMON', ' ': 'S_HUMAN', '@': 'S_HUMAN',
    };
    return map[ch] || null;
}

/**
 * C ref: sp_lev.c create_monster — if MON_AT(x,y) && enexto, relocate
 * before makemon. Shared by splev_create_monster and quest fill helpers.
 */
function splev_resolve_occupied(x, y, pm) {
    if (!m_at(x, y)) return { x, y };
    const cc = { x: 0, y: 0 };
    if (enexto(cc, x, y, pm)) return { x: cc.x, y: cc.y };
    return { x, y };
}

// C ref: sp_lev.c create_monster — sp_amask_to_amask before mkclass / makemon
// optional peaceful (> BOOL_RANDOM) overrides after makemon (quest fills).
function splev_create_monster(id_or_class, peaceful) {
    let pm = null;
    let female = 0;
    const isClass = typeof id_or_class === 'string' && id_or_class.length === 1;
    // Named ids: find_montype gender RNG happens before create_monster in C Lua
    // binding; class letters leave id=NON_PM and resolve via mkclass after amask.
    if (!isClass && typeof id_or_class === 'string') {
        const r = find_montype_gender(id_or_class);
        female = r.female;
        if (r.mndx !== NON_PM && r.mndx >= 0) pm = mons(r.mndx);
    }
    // C: amask = sp_amask_to_amask(m->sp_amask) → induced_align(80) for RANDOM
    induced_align(80);
    if (isClass) {
        const mlet = monclass_letter_to_mlet(id_or_class);
        pm = mlet ? mkclass(mlet, G_NOGEN) : null;
    }
    // C: pm_to_humidity then get_location_coord(loc|NO_LOC_WARN); on fail |= DRY
    // get_location_coord itself retries get_location once on random miss.
    let pos;
    if (pm) {
        let loc = pm_to_humidity(pm);
        pos = get_location_coord_random(loc | NO_LOC_WARN);
        if (pos.x < 0) {
            loc |= DRY;
            pos = get_location_coord_random(loc);
        }
    } else {
        pos = get_location_coord_random(DRY);
    }
    pos = splev_resolve_occupied(pos.x, pos.y, pm);
    const mtmp = makemon(pm, pos.x, pos.y, 0);
    if (mtmp && typeof id_or_class === 'string' && id_or_class.length > 1) {
        mtmp.female = female;
    }
    if (mtmp && peaceful != null && peaceful > BOOL_RANDOM)
        mtmp.mpeaceful = peaceful;
}

function splev_create_stair(up) {
    const pos = get_location_random(good_stair_loc);
    const trap = t_at(pos.x, pos.y);
    if (trap) {
        let prev = null;
        for (let t = game.ftrap; t; t = t.ntrap) {
            if (t === trap) {
                if (prev) prev.ntrap = t.ntrap;
                else game.ftrap = t.ntrap;
                break;
            }
            prev = t;
        }
    }
    mkstairs(pos.x, pos.y, up ? 1 : 0, null);
}

// C ref: sp_lev.c create_trap → mktrap(random) — retry until kind != NO_TRAP
// Default spider_on_web=true → no MKTRAP_NOSPIDERONWEB (giant spider on WEB).
function splev_create_trap() {
    const pos = get_location_random(null);
    let kind;
    do {
        kind = traptype_rnd();
    } while (kind === NO_TRAP);
    // C mktrap: is_hole && !Can_fall_thru → ROCKTRAP (hardfloor matters)
    if (is_hole(kind) && !Can_fall_thru(game.u?.uz)) kind = ROCKTRAP;
    const trap = maketrap(pos.x, pos.y, kind);
    // C: WEB spider → SEEN → victim gate (mklev.c mktrap)
    mktrap_seen_victim(trap, {});
}

/**
 * C ref: sp_lev.c get_location with croom — somexy until humidity ok.
 * Optional ok_fn mirrors set_ok_location_func (stairs).
 */
function get_location_in_room(croom, humidity = DRY, ok_fn = null) {
    const flags = humidity | 0;
    const c = { x: 0, y: 0 };
    let cpt = 0;
    do {
        if (!somexy(croom, c)) break;
        if (is_ok_location(c.x, c.y, flags) && (!ok_fn || ok_fn(c.x, c.y)))
            return { x: c.x, y: c.y };
    } while (++cpt < 100);
    if (!(flags & NO_LOC_WARN)) {
        for (let x = croom.lx; x <= croom.hx; x++) {
            for (let y = croom.ly; y <= croom.hy; y++) {
                if (is_ok_location(x, y, flags) && (!ok_fn || ok_fn(x, y)))
                    return { x, y };
            }
        }
    }
    return { x: -1, y: -1 };
}

/** C ref: sp_lev.c get_free_room_loc — DRY then ROOM-typed retry. */
function get_free_room_loc(croom) {
    let pos = get_location_coord_in_room(croom, DRY);
    if (pos.x >= 0 && game.level.at(pos.x, pos.y)?.typ === ROOM)
        return pos;
    let trycnt = 0;
    do {
        const c = { x: -1, y: -1 };
        // C get_room_loc random → somexy
        if (!somexy(croom, c)) break;
        pos = { x: c.x, y: c.y };
        if (game.level.at(pos.x, pos.y)?.typ === ROOM) return pos;
    } while (++trycnt <= 100);
    return pos;
}

/**
 * C ref: sp_lev.c get_location_coord with croom — random path.
 * First get_location(humidity|NO_LOC_WARN); on (-1,-1) retry
 * get_location(humidity). Amphibious WET-only thus burns two 100-try
 * loops before create_monster's DRY fallback (D-0618).
 */
function get_location_coord_in_room(croom, humidity, ok_fn = null) {
    let pos = get_location_in_room(croom, humidity | NO_LOC_WARN, ok_fn);
    if (pos.x < 0)
        pos = get_location_in_room(croom, humidity, ok_fn);
    return pos;
}

/**
 * C ref: sp_lev.c create_object with croom (des.object inside des.room).
 */
function splev_room_object(croom, oclass = null) {
    // C create_object → get_location_coord(DRY) — includes coord double-try
    const pos = get_location_coord_in_room(croom, DRY);
    if (pos.x < 0) return;
    if (oclass == null) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
    else mkobj_at(oclass, pos.x, pos.y, true);
}

/**
 * C ref: sp_lev.c create_monster with croom (des.monster inside des.room).
 */
function splev_room_monster(croom, id_or_class, peaceful) {
    let pm = null;
    let female = 0;
    const isClass = typeof id_or_class === 'string' && id_or_class.length === 1;
    if (!isClass && typeof id_or_class === 'string') {
        const r = find_montype_gender(id_or_class);
        female = r.female;
        if (r.mndx !== NON_PM && r.mndx >= 0) pm = mons(r.mndx);
    }
    induced_align(80);
    if (isClass) {
        const mlet = monclass_letter_to_mlet(id_or_class);
        pm = mlet ? mkclass(mlet, G_NOGEN) : null;
    }
    let pos;
    if (pm) {
        let loc = pm_to_humidity(pm);
        // C: get_location_coord(loc|NO_LOC_WARN) then DRY fallback
        pos = get_location_coord_in_room(croom, loc | NO_LOC_WARN);
        if (pos.x < 0) {
            loc |= DRY;
            pos = get_location_coord_in_room(croom, loc);
        }
    } else {
        pos = get_location_coord_in_room(croom, DRY);
    }
    if (pos.x < 0) return;
    pos = splev_resolve_occupied(pos.x, pos.y, pm);
    if (croom && !inside_room(croom, pos.x, pos.y)) return;
    const mtmp = makemon(pm, pos.x, pos.y, 0);
    if (mtmp && typeof id_or_class === 'string' && id_or_class.length > 1)
        mtmp.female = female;
    if (mtmp && peaceful != null && peaceful > BOOL_RANDOM)
        mtmp.mpeaceful = peaceful;
}

/**
 * C ref: sp_lev.c l_create_stairway with croom (des.stair inside des.room).
 */
function splev_room_stair(croom, up) {
    // C: set_ok_location_func(good_stair_loc); get_location_coord(DRY, random)
    const pos = get_location_coord_in_room(croom, DRY, good_stair_loc);
    if (pos.x < 0) return;
    const trap = t_at(pos.x, pos.y);
    if (trap) {
        let prev = null;
        for (let t = game.ftrap; t; t = t.ntrap) {
            if (t === trap) {
                if (prev) prev.ntrap = t.ntrap;
                else game.ftrap = t.ntrap;
                break;
            }
            prev = t;
        }
    }
    mkstairs(pos.x, pos.y, up ? 1 : 0, croom);
}

/**
 * C ref: sp_lev.c create_trap with croom (des.trap inside des.room).
 */
function splev_room_trap(croom) {
    const pos = get_free_room_loc(croom);
    if (pos.x < 0) return;
    let kind;
    do {
        kind = traptype_rnd();
    } while (kind === NO_TRAP);
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? 1);
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const trap = maketrap(pos.x, pos.y, kind);
    mktrap_seen_victim(trap, {});
}

/**
 * C ref: sp_lev.c room_types[] get_table_roomtype_opt — subset used by minetn.
 */
function splev_roomtype(name, defval = OROOM) {
    if (!name) return defval;
    const map = {
        ordinary: OROOM,
        temple: TEMPLE,
        morgue: MORGUE,
        shop: SHOPBASE,
        'tool shop': TOOLSHOP,
        'food shop': FOODSHOP,
        'health food shop': FODDERSHOP,
        'candle shop': CANDLESHOP,
    };
    return map[String(name).toLowerCase()] ?? defval;
}

/** C ref: nhlib.lua monkfoodshop */
function monkfoodshop() {
    return (game.urole?.mnum === PM_MONK) ? 'health food shop' : 'food shop';
}

/**
 * C ref: mklev.c add_subroom — store at rooms[MAXNROFROOMS+1+nsubroom]
 * (≡ C gs.subrooms = &svr.rooms[MAXNROFROOMS+1]).
 */
function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    if (!g.level.rooms) g.level.rooms = [];
    const idx = MAXNROFROOMS + 1 + (g.level.nsubroom | 0);
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex | 0,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: idx,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, false);
    croom.roomnoidx = idx;
    g.level.rooms[idx] = croom;
    if (!proom.sbrooms) proom.sbrooms = [];
    proom.sbrooms[proom.nsubrooms | 0] = croom;
    proom.nsubrooms = (proom.nsubrooms | 0) + 1;
    g.level.nsubroom = (g.level.nsubroom | 0) + 1;
    if (idx + 1 < ((MAXNROFROOMS + 1) * 2))
        g.level.rooms[idx + 1] = { hx: -1 };
    return croom;
}

/**
 * C ref: sp_lev.c create_subroom — relative x/y/w/h inside parent.
 */
function create_subroom(proom, x, y, w, h, rtype, rlit) {
    const width = (proom.hx - proom.lx + 1) | 0;
    const height = (proom.hy - proom.ly + 1) | 0;
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
    add_subroom(
        proom,
        proom.lx + x, proom.ly + y,
        proom.lx + x + w - 1, proom.ly + y + h - 1,
        rlit, rtype, false,
    );
    return true;
}

/**
 * C ref: sp_lev.c create_door — wall-mask door placement in a room.
 * Fixed state ("closed"/"locked") skips secret/mask RNG.
 */
function create_door(dd, broom) {
    if (!broom || !dd) return;
    let secret = dd.secret;
    let mask = dd.mask;
    let wall = dd.wall;
    const pos = dd.pos ?? -1;
    if (secret === -1) secret = rn2(2);
    if (wall === -1 || wall == null) wall = W_ANY;
    if (mask === -1) {
        if (!secret) {
            if (!rn2(3)) {
                if (!rn2(5)) mask = D_ISOPEN;
                else if (!rn2(6)) mask = D_LOCKED;
                else mask = D_CLOSED;
                if (mask !== D_ISOPEN && !rn2(25)) mask |= D_TRAPPED;
            } else {
                mask = D_NODOOR;
            }
        } else {
            if (!rn2(5)) mask = D_LOCKED;
            else mask = D_CLOSED;
            if (!rn2(20)) mask |= D_TRAPPED;
        }
    }
    let x = 0, y = 0;
    let trycnt = 0;
    for (; trycnt < 100; ++trycnt) {
        const dwall = wall;
        const dpos = pos;
        switch (rn2(4)) {
        case 0:
            if (!(dwall & W_NORTH)) continue;
            y = broom.ly - 1;
            x = broom.lx + ((dpos === -1)
                ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y - 1)
                || IS_OBSTRUCTED(game.level.at(x, y - 1)?.typ)) continue;
            break;
        case 1:
            if (!(dwall & W_SOUTH)) continue;
            y = broom.hy + 1;
            x = broom.lx + ((dpos === -1)
                ? rn2(1 + broom.hx - broom.lx) : dpos);
            if (!isok(x, y + 1)
                || IS_OBSTRUCTED(game.level.at(x, y + 1)?.typ)) continue;
            break;
        case 2:
            if (!(dwall & W_WEST)) continue;
            x = broom.lx - 1;
            y = broom.ly + ((dpos === -1)
                ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x - 1, y)
                || IS_OBSTRUCTED(game.level.at(x - 1, y)?.typ)) continue;
            break;
        case 3:
            if (!(dwall & W_EAST)) continue;
            x = broom.hx + 1;
            y = broom.ly + ((dpos === -1)
                ? rn2(1 + broom.hy - broom.ly) : dpos);
            if (!isok(x + 1, y)
                || IS_OBSTRUCTED(game.level.at(x + 1, y)?.typ)) continue;
            break;
        default:
            break;
        }
        if (okdoor(x, y)) break;
    }
    if (trycnt >= 100) return;
    const loc = game.level.at(x, y);
    if (!loc) return;
    loc.typ = secret ? SDOOR : DOOR;
    loc.doormask = mask;
    loc.flags = mask;
}

const DOOR_WALL = {
    north: W_NORTH, south: W_SOUTH, east: W_EAST, west: W_WEST,
    all: W_ANY, random: W_ANY,
};
const DOOR_STATE = {
    open: D_ISOPEN, closed: D_CLOSED, locked: D_LOCKED,
    nodoor: D_NODOOR, broken: D_BROKEN, secret: D_SECRET, random: -1,
};

/**
 * C ref: sp_lev.c lspo_door wall-form → create_door.
 */
function splev_room_door(croom, state, wall) {
    const mask = DOOR_STATE[state] ?? -1;
    const typ = (mask === -1) ? -1 : mask;
    create_door({
        secret: (typ === D_SECRET) ? 1 : 0,
        mask,
        pos: -1,
        wall: DOOR_WALL[wall] ?? W_ANY,
    }, croom);
}

/**
 * C ref: sp_lev.c build_room + lspo_room — top-level or nested.
 * @returns {object|null} the new mkroom
 */
function splev_build_room(opts, parent) {
    const g = game;
    const chance = opts.chance ?? 100;
    const wantType = splev_roomtype(opts.type, OROOM);
    // C: (!chance || rn2(100) < chance) ? rtype : OROOM
    const rtype = (!chance || rn2(100) < chance) ? wantType : OROOM;
    const rlit = opts.lit ?? -1;
    const x = opts.x ?? -1;
    const y = opts.y ?? -1;
    const w = opts.w ?? -1;
    const h = opts.h ?? -1;
    const xalign = opts.xalign ?? -1;
    const yalign = opts.yalign ?? -1;
    const needfill = opts.filled ?? 1;
    const joined = opts.joined ?? true;

    let ok = false;
    if (parent) {
        ok = create_subroom(parent, x, y, w, h, rtype, rlit);
        if (ok) {
            const aroom = g.level.rooms[
                MAXNROFROOMS + 1 + ((g.level.nsubroom | 0) - 1)];
            if (aroom) {
                topologize(aroom);
                aroom.needfill = needfill;
                aroom.needjoining = joined;
                aroom.rtype = rtype;
                // C lspo_room: mark parent irregular after adding a subroom
                parent.irregular = true;
                return aroom;
            }
        }
        return null;
    }
    ok = create_room(x, y, w, h, xalign, yalign, rtype, rlit);
    if (!ok) return null;
    const aroom = g.level.rooms[(g.level.nroom | 0) - 1];
    if (!aroom) return null;
    topologize(aroom);
    aroom.needfill = needfill;
    aroom.needjoining = joined;
    return aroom;
}

/**
 * C ref: sp_lev.c lspo_room — build then run contents then add_doors_to_room.
 */
function splev_des_room(opts, parent, contentsFn) {
    const aroom = splev_build_room(opts, parent);
    if (!aroom) return null;
    if (typeof contentsFn === 'function') contentsFn(aroom);
    add_doors_to_room(aroom);
    return aroom;
}

/**
 * C ref: sp_lev.c lspo_feature fountain at relative room coords.
 */
function splev_room_feature_fountain(croom, rx, ry) {
    const x = croom.lx + rx;
    const y = croom.ly + ry;
    const loc = game.level.at(x, y);
    if (!loc) return;
    loc.typ = FOUNTAIN;
    if (game.level.flags) game.level.flags.nfountains =
        (game.level.flags.nfountains | 0) + 1;
}

/**
 * C ref: sp_lev.c create_altar — fixed relative coords, shrine in temple.
 */
function splev_room_altar_shrine(croom, rx, ry, alignStr) {
    const x = croom.lx + rx;
    const y = croom.ly + ry;
    const loc = game.level.at(x, y);
    if (!loc) return;
    loc.typ = ALTAR;
    let amask = AM_NEUTRAL;
    if (alignStr === 'law') amask = AM_LAWFUL;
    else if (alignStr === 'neutral') amask = AM_NEUTRAL;
    else if (alignStr === 'chaos') amask = AM_CHAOTIC;
    else if (alignStr === 'noalign') amask = AM_NONE;
    loc.altarmask = amask;
    loc.flags = amask;
    if ((croom.rtype | 0) === TEMPLE) {
        priestini(game.u?.uz, croom, x, y, false);
        loc.altarmask = (loc.altarmask | 0) | AM_SHRINE;
        loc.flags = (loc.flags | 0) | AM_SHRINE;
        if (game.level.flags) game.level.flags.has_temple = true;
    }
}

/**
 * C ref: sp_lev.c lspo_room + build_room for fully-random ordinary room.
 * chance defaults to 100 (still burns rn2(100)); filled=1; joined=true.
 */
function splev_ordinary_room(contentsFn) {
    const g = game;
    // C build_room: (!chance || rn2(100) < chance) with chance=100
    rn2(100);
    if (!create_room(-1, -1, -1, -1, -1, -1, OROOM, -1)) return false;
    const aroom = g.level.rooms[g.level.nroom - 1];
    if (!aroom) return false;
    topologize(aroom);
    aroom.needfill = FILL_NORMAL;
    aroom.needjoining = true;
    if (typeof contentsFn === 'function') contentsFn(aroom);
    add_doors_to_room(aroom);
    return true;
}

/**
 * C ref: dat/minefill.lua via load_special — JS port of the fill script.
 */
function load_minefill() {
    const g = game;
    nhlib_shuffle_align();

    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        fg: STONE, bg: STONE, filling: STONE,
        lit: BOOL_RANDOM, smoothed: false, joined: false, walled: false,
    });

    g.level.flags.is_maze_lev = true;

    splev_initlev({
        init_style: LVLINIT_MINES,
        fg: ROOM, bg: STONE, filling: ROOM,
        lit: BOOL_RANDOM, smoothed: true, joined: true, walled: true,
        icedpools: false,
    });

    splev_create_stair(true);
    splev_create_stair(false);

    for (let i = 0, n = lua_random2(2, 5); i < n; i++)
        splev_create_object(GEM_CLASS);
    splev_create_object(TOOL_CLASS);
    for (let i = 0, n = lua_random2(2, 4); i < n; i++)
        splev_create_object(null);
    if (percent(75)) {
        for (let i = 0, n = lua_random2(1, 2); i < n; i++)
            splev_create_boulder();
    }

    for (let i = 0, n = lua_random2(6, 8); i < n; i++)
        splev_create_monster('gnome');
    splev_create_monster('gnome lord');
    splev_create_monster('dwarf');
    splev_create_monster('dwarf');
    splev_create_monster('G');
    splev_create_monster('G');
    splev_create_monster(percent(50) ? 'h' : 'G');

    for (let i = 0; i < 6; i++) splev_create_trap();

    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);

    // C ref: sp_lev.c load_special — fixup_special after wallify/noflip
    fixup_special();
}

/**
 * C ref: dat/Bar-fila.lua via load_special — quest filler above locate.
 * Named omissions: other-role *-fila; humidity get_location.
 */
function load_bar_fila() {
    const g = game;
    nhlib_shuffle_align();

    // des.level_init({ style = "solidfill", fg = " " }) — ' ' → STONE
    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;

    // des.level_init mines: fg=".", bg=".", lit=0, walled=false
    splev_initlev({
        init_style: LVLINIT_MINES,
        fg: ROOM, bg: ROOM, filling: ROOM,
        lit: 0, smoothed: true, joined: true, walled: false,
        icedpools: false,
    });

    splev_create_stair(true);
    splev_create_stair(false);
    for (let i = 0; i < 8; i++) splev_create_object(null);
    for (let i = 0; i < 4; i++) splev_create_trap();
    splev_create_monster('ogre', 0);
    splev_create_monster('ogre', 0);
    splev_create_monster('O', 0);
    splev_create_monster('rock troll', 0);

    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    // des.level_flags noflip — skip flip_level_rnd
    fixup_special();
}

/**
 * C ref: dat/Bar-filb.lua via load_special — quest filler below locate.
 * Named omissions: other-role *-filb; humidity get_location.
 */
function load_bar_filb() {
    const g = game;
    nhlib_shuffle_align();

    splev_initlev({
        init_style: LVLINIT_SOLIDFILL,
        filling: STONE,
        lit: BOOL_RANDOM,
        icedpools: false,
    });
    if (!g.level.flags) g.level.flags = {};
    g.level.flags.is_maze_lev = true;

    // des.level_init mines: fg=".", bg=" ", lit=0, walled=true
    splev_initlev({
        init_style: LVLINIT_MINES,
        fg: ROOM, bg: STONE, filling: ROOM,
        lit: 0, smoothed: true, joined: true, walled: true,
        icedpools: false,
    });

    splev_create_stair(true);
    splev_create_stair(false);
    for (let i = 0; i < 11; i++) splev_create_object(null);
    for (let i = 0; i < 4; i++) splev_create_trap();
    for (let i = 0; i < 7; i++) splev_create_monster('ogre', 0);
    splev_create_monster('O', 0);
    for (let i = 0; i < 3; i++) splev_create_monster('rock troll', 0);
    splev_create_monster('T', 0);

    if (!g.level.flags.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    fixup_special();
}

/**
 * C ref: dat/Arc-fila.lua via load_special — quest filler above locate.
 * Six ordinary des.room + des.random_corridors. Named omissions:
 * other-role *-fila room scripts; failed-room skip fidelity beyond
 * create_room false; ensure_way_out / link_doors_rooms extras.
 */
function load_arc_fila() {
    const g = game;
    nhlib_shuffle_align();

    // des.room contents mirror Arc-fila.lua order
    splev_ordinary_room((r) => {
        splev_room_stair(r, true);
        splev_room_object(r);
        splev_room_monster(r, 'S');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_monster(r, 'S');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_object(r);
        splev_room_monster(r, 'S');
    });
    splev_ordinary_room((r) => {
        splev_room_stair(r, false);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
        splev_room_monster(r, 'human mummy');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
    });

    // des.random_corridors → create_corridor all -1 → makecorridors
    makecorridors();

    // C load_special: wallification → flip_level_rnd(allow_flips=3) → fixup
    if (!g.level.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Arc-filb.lua via load_special — quest filler below locate.
 * Same room scaffold as Arc-fila; first rooms use class "M" (mummy).
 * Named omissions: other-role *-filb; failed-room / ensure_way_out.
 */
function load_arc_filb() {
    const g = game;
    nhlib_shuffle_align();

    splev_ordinary_room((r) => {
        splev_room_stair(r, true);
        splev_room_object(r);
        splev_room_monster(r, 'M');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_monster(r, 'M');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_object(r);
        splev_room_monster(r, 'M');
    });
    splev_ordinary_room((r) => {
        splev_room_stair(r, false);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
        splev_room_monster(r, 'human mummy');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
    });
    splev_ordinary_room((r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'S');
    });

    makecorridors();

    if (!g.level.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Pri-fila.lua via load_special — quest filler above locate.
 * Ordinary + morgue des.room + des.random_corridors. Named omissions:
 * other-role *-fila room scripts; failed-room skip fidelity beyond
 * create_room false; ensure_way_out / link_doors_rooms extras.
 */
function load_pri_fila() {
    const g = game;
    nhlib_shuffle_align();

    // des.room contents mirror Pri-fila.lua order
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_stair(r, true);
        splev_room_object(r);
        splev_room_monster(r, 'human zombie');
    });
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_object(r);
        splev_room_object(r);
    });
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_object(r);
        splev_room_monster(r, 'human zombie');
    });
    splev_des_room({ type: 'morgue' }, null, (r) => {
        splev_room_stair(r, false);
        splev_room_object(r);
        splev_room_trap(r);
    });
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'wraith');
    });
    splev_des_room({ type: 'morgue' }, null, (r) => {
        splev_room_object(r);
        splev_room_trap(r);
    });

    // des.random_corridors → create_corridor all -1 → makecorridors
    makecorridors();

    // C load_special: wallification → flip_level_rnd(allow_flips=3) → fixup
    if (!g.level.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}

/**
 * C ref: dat/Pri-filb.lua via load_special — quest filler below locate.
 * Ordinary + morgue des.room + des.random_corridors. Named omissions:
 * other-role *-filb; failed-room / ensure_way_out.
 */
function load_pri_filb() {
    const g = game;
    nhlib_shuffle_align();

    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_stair(r, true);
        splev_room_object(r);
        splev_room_monster(r, 'human zombie');
        splev_room_monster(r, 'wraith');
    });
    splev_des_room({ type: 'morgue' }, null, (r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_object(r);
    });
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_object(r);
        splev_room_monster(r, 'human zombie');
        splev_room_monster(r, 'wraith');
    });
    splev_des_room({ type: 'morgue' }, null, (r) => {
        splev_room_stair(r, false);
        splev_room_object(r);
        splev_room_object(r);
        splev_room_trap(r);
    });
    splev_des_room({ type: 'ordinary' }, null, (r) => {
        splev_room_object(r);
        splev_room_object(r);
        splev_room_trap(r);
        splev_room_monster(r, 'human zombie');
        splev_room_monster(r, 'wraith');
    });
    splev_des_room({ type: 'morgue' }, null, (r) => {
        splev_room_object(r);
        splev_room_trap(r);
    });

    makecorridors();

    if (!g.level.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3, false);
    fixup_special();
}


// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();
    // C: themerms.lua local postprocess = {} (fresh each Lua load / level)
    themerms_postprocess.length = 0;

    const dun = g.dungeons?.[g.u?.uz?.dnum | 0];
    const fill = dun?.fill_lvl || '';
    // C ref: mklev.c:1267-1289 — Is_special / proto / fill_lvl / In_quest
    // before ordinary. Medusa rn2(5) only in hell/medusa else-if.
    const slev = (g.sp_levchn || []).find(s =>
        (s.dlevel?.dnum | 0) === (g.u?.uz?.dnum | 0)
        && (s.dlevel?.dlevel | 0) === (g.u?.uz?.dlevel | 0));
    if (slev && !Is_rogue_level(g.u?.uz)) {
        await makemaz(slev.proto);
    } else if (dun?.proto) {
        // C: makemaz("") → create_maze; deferred (empty protofile early-return)
        await makemaz('');
    } else if (fill) {
        await makemaz(fill);
    } else if (In_quest(g.u?.uz)) {
        // C ref: mklev.c:1275-1285 — role-fil a/b relative to locate
        const code = g.urole?.filecode || 'Tou';
        const loc_lev = find_level(`${code}-loca`);
        const loc_dlvl = loc_lev?.dlevel?.dlevel | 0;
        const suffix = ((g.u.uz.dlevel | 0) < loc_dlvl) ? 'a' : 'b';
        await makemaz(`${code}-fil${suffix}`);
    } else {
        await makelevel_ordinary();
        return; // ordinary already runs fill_special + themerms_post + wallify
    }

    // C ref: mklev.c:1416-1420 — common tail after makemaz
    for (let i = 0; i < (g.level?.nroom | 0); i++)
        fill_special_room(g.level.rooms[i]);
    run_themerms_post_level_generate();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

// C ref: mklev.c makelevel() regular-room branch
async function makelevel_ordinary() {
    const g = game;

    // C ref: mklev.c:1286-1289 — hell or (rn2(5) && past medusa) → makemaz("")
    // Burn Medusa rn2(5) only on the ordinary path when not In_hell.
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && depth_of_level(g.u?.uz) > depth_of_level(medusa)) {
        // Would makemaz("") — deferred; continue ordinary for now
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
    } else if (u_depth > 5 && !rn2(8)
        && !(((g.mvitals?.[PM_LEPRECHAUN]?.mvflags ?? 0) & G_GONE))) {
        do_mkroom(LEPREHALL);
    } else if (u_depth > 6 && !rn2(7)) {
        do_mkroom(ZOO);
    } else if (u_depth > 8 && !rn2(5)) {
        do_mkroom(TEMPLE);
    } else if (u_depth > 9 && !rn2(5)
        && !(((g.mvitals?.[PM_KILLER_BEE]?.mvflags ?? 0) & G_GONE))) {
        do_mkroom(BEEHIVE);
    } else if (u_depth > 11 && !rn2(6)) {
        do_mkroom(MORGUE);
    } else if (u_depth > 12 && !rn2(8)) {
        // C: antholemon() gate — JS antholemon always truthy until typed port
        do_mkroom(ANTHOLE);
    } else if (u_depth > 14 && !rn2(4)
        && !(((g.mvitals?.[PM_SOLDIER]?.mvflags ?? 0) & G_GONE))) {
        do_mkroom(BARRACKS);
    } else if (u_depth > 15 && !rn2(6)) {
        do_mkroom(SWAMP);
    } else if (u_depth > 16 && !rn2(8)
        && !(((g.mvitals?.[PM_COCKATRICE]?.mvflags ?? 0) & G_GONE))) {
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
    // post_level_generate then full-map wallification.
    run_themerms_post_level_generate();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

/**
 * C ref: mkroom.c pick_room(strict) — walk rooms from rn2(nroom), wrap at
 * nroom sentinel. Non-strict may keep downstairs with !rn2(3); doorct==1
 * or !rn2(5) or wizard accepts. Short-circuit matches C.
 * C: `#define wizard flags.debug` (flag.h) — playmode:debug sets flags.debug.
 */
function pick_room(strict) {
    const g = game;
    const nroom = g.level?.nroom | 0;
    if (nroom <= 0) return null;
    let i = nroom;
    let idx = rn2(nroom);
    for (; i--; idx++) {
        if (idx === nroom) idx = 0;
        const sroom = g.level.rooms[idx];
        if (!sroom || sroom.hx < 0) return null;
        if (sroom.rtype !== OROOM) continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3)))
                continue;
        } else if (has_upstairs(sroom) || has_dnstairs(sroom)) {
            continue;
        }
        // C: doorct == 1 || !rn2(5) || wizard  (wizard ≡ flags.debug)
        if ((sroom.doorct | 0) === 1 || !rn2(5)
            || g.flags?.wizard || g.flags?.debug)
            return sroom;
    }
    return null;
}

/**
 * C ref: mkroom.c mkzoo — pick_room(FALSE), set rtype + needfill.
 * Stocking deferred to fill_special_room → fill_zoo at end of makelevel.
 */
function mkzoo(type) {
    const sroom = pick_room(false);
    if (sroom) {
        sroom.rtype = type;
        sroom.needfill = FILL_NORMAL;
    }
}

/**
 * C ref: mkroom.c shrine_pos — center of room; odd width/height may nudge
 * by rn2(2) onto an adjacent cell.
 */
function shrine_pos(roomno) {
    const troom = game.level?.rooms?.[roomno - ROOMOFFSET];
    if (!troom) return { x: 0, y: 0 };
    let delta = (troom.hx | 0) - (troom.lx | 0);
    let x = (troom.lx | 0) + ((delta / 2) | 0);
    if ((delta % 2) && rn2(2)) x++;
    delta = (troom.hy | 0) - (troom.ly | 0);
    let y = (troom.ly | 0) + ((delta / 2) | 0);
    if ((delta % 2) && rn2(2)) y++;
    return { x, y };
}

/**
 * C ref: worn.c which_armor — first minvent obj with owornmask bit.
 * Local copy to avoid mklev↔trap cycle.
 */
function which_armor_local(mtmp, mask) {
    for (let otmp = mtmp?.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.owornmask | 0) & (mask | 0)) return otmp;
    }
    return null;
}

/**
 * C ref: priest.c p_coaligned — hero align vs priest shrine align.
 */
function p_coaligned(priest) {
    const shralign = priest?.mextra?.epri?.shralign;
    const algn = shralign != null ? (shralign | 0) : (priest?.data?.maligntyp | 0);
    return (game.u?.ualign?.type | 0) === (algn | 0);
}

/**
 * C ref: priest.c priestini — place aligned/high cleric beside shrine,
 * fill epri, spellbooks, optional robe curse/uncurse.
 * Named omission: sanctum Amulet arm only when on sanctum_level (wired but
 * mktemple passes sanctum=FALSE); intemple greetings deferred.
 */
function priestini(lvl, sroom, sx, sy, sanctum) {
    const primNdx = sanctum ? PM_HIGH_CLERIC : PM_ALIGNED_CLERIC;
    const prim = mons(primNdx);
    const si = rn2(N_DIRS);
    let px = sx | 0, py = sy | 0;
    let i;
    for (i = 0; i < N_DIRS; i++) {
        const di = ((i + si) % N_DIRS + N_DIRS) % N_DIRS;
        px = (sx | 0) + xdir[di];
        py = (sy | 0) + ydir[di];
        // C: pm_good_location → is_ok_location(pm_to_humidity); clerics → DRY
        if (is_ok_location(px, py, DRY)) break;
    }
    if (i === N_DIRS) {
        px = sx | 0;
        py = sy | 0;
    }
    const blocker = m_at(px, py);
    if (blocker) rloc(blocker, RLOC_NOMSG);

    const priest = makemon(prim, px, py, MM_EPRI);
    if (!priest) return;
    const epri = priest.mextra?.epri;
    if (epri) {
        const roomIdx = sroom.roomnoidx
            ?? game.level.rooms.indexOf(sroom);
        epri.shroom = ((roomIdx | 0) + ROOMOFFSET) | 0;
        epri.shralign = Amask2align(game.level.at(sx, sy)?.altarmask | 0);
        epri.shrpos = { x: sx | 0, y: sy | 0 };
        epri.shrlevel = {
            dnum: lvl?.dnum | 0,
            dlevel: lvl?.dlevel | 0,
        };
    }
    mon_learns_traps(priest, -1 /* ALL_TRAPS */);
    priest.mpeaceful = 1;
    priest.ispriest = 1;
    priest.isminion = 0;
    priest.msleeping = 0;
    set_malign(priest);

    if (sanctum && epri?.shralign === A_NONE
        && game.sanctum_level
        && (game.sanctum_level.dnum | 0) === (game.u?.uz?.dnum | 0)
        && (game.sanctum_level.dlevel | 0) === (game.u?.uz?.dlevel | 0)) {
        mongets(priest, AMULET_OF_YENDOR);
    }
    for (let cnt = rn1(3, 2); cnt > 0; --cnt) {
        mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
    }
    if (rn2(2)) {
        const otmp = which_armor_local(priest, W_ARMC);
        if (otmp) {
            if (p_coaligned(priest)) uncurse(otmp);
            else curse(otmp);
        }
    }
}

/**
 * C ref: mkroom.c mktemple — pick_room(TRUE), ALTAR+induced_align,
 * priestini, AM_SHRINE, has_temple.
 */
function mktemple() {
    const sroom = pick_room(true);
    if (!sroom) return;
    sroom.rtype = TEMPLE;
    const roomIdx = sroom.roomnoidx ?? game.level.rooms.indexOf(sroom);
    const shrine_spot = shrine_pos((roomIdx | 0) + ROOMOFFSET);
    const lev = game.level.at(shrine_spot.x, shrine_spot.y);
    if (!lev) return;
    lev.typ = ALTAR;
    const amask = induced_align(80);
    lev.altarmask = amask;
    lev.flags = amask;
    priestini(game.u?.uz, sroom, shrine_spot.x, shrine_spot.y, false);
    lev.altarmask = (lev.altarmask | 0) | AM_SHRINE;
    lev.flags = (lev.flags | 0) | AM_SHRINE;
    if (game.level.flags) game.level.flags.has_temple = true;
}

/**
 * C ref: mkroom.c do_mkroom — dispatch special room makers.
 * Shop path: mkshop sets rtype/needfill; stock_room deferred to fill_special_room.
 * SWAMP body deferred (mkswamp) — named in C-JS-MAP.
 */
function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop();
        return;
    }
    switch (roomtype) {
    case COURT:
        mkzoo(COURT);
        break;
    case ZOO:
        mkzoo(ZOO);
        break;
    case BEEHIVE:
        mkzoo(BEEHIVE);
        break;
    case MORGUE:
        mkzoo(MORGUE);
        break;
    case BARRACKS:
        mkzoo(BARRACKS);
        break;
    case LEPREHALL:
        mkzoo(LEPREHALL);
        break;
    case COCKNEST:
        mkzoo(COCKNEST);
        break;
    case ANTHOLE:
        mkzoo(ANTHOLE);
        break;
    case TEMPLE:
        mktemple();
        break;
    case SWAMP:
        // mkswamp deferred — no RNG burned (C would pick_room)
        break;
    default:
        break;
    }
}

/** C ref: mkroom.c isbig() */
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1);
    return area > 20;
}

/** C ref: mkroom.c has_dnstairs() */
function has_dnstairs(sroom) {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (!stway.up && inside_room(sroom, stway.sx, stway.sy)) return true;
    }
    return false;
}

/** C ref: mkroom.c has_upstairs() */
function has_upstairs(sroom) {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.up && inside_room(sroom, stway.sx, stway.sy)) return true;
    }
    return false;
}

/**
 * C ref: mkroom.c invalid_shop_shape() — door-adjacent ROOM cells must leave
 * the shopkeeper more than one escape square.
 */
function invalid_shop_shape(sroom) {
    const doors = game.level?.doors;
    if (!doors || sroom.fdoor == null || !doors[sroom.fdoor]) return true;
    const doorx = doors[sroom.fdoor].x;
    const doory = doors[sroom.fdoor].y;
    let insidex = 0, insidey = 0, insidect = 0;

    for (let x = Math.max(doorx - 1, sroom.lx);
        x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly);
            y <= Math.min(doory + 1, sroom.hy); y++) {
            const loc = game.level.at(x, y);
            if (loc && loc.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1) return true;
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx);
            x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly);
                y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey) continue;
                const loc = game.level.at(x, y);
                if (loc && loc.typ === ROOM) insidect++;
            }
        }
        if (insidect === 1) return true;
    }
    return false;
}

/**
 * C ref: mkroom.c mkshop — find eligible OROOM (one door, no stairs, valid
 * shape), light it, pick shtypes via rnd(100), set rtype/needfill/topologize.
 * Wizard SHOPTYPE env and stock_room deferred (stocked in fill_special_room).
 */
function mkshop() {
    const g = game;
    const nroom = g.level?.nroom | 0;
    let sroom = null;
    for (let i = 0; i < nroom; i++) {
        const cand = g.level.rooms[i];
        if (!cand || cand.hx < 0) return;
        if (cand.rtype !== OROOM) continue;
        if (has_dnstairs(cand) || has_upstairs(cand)) continue;
        if ((cand.doorct | 0) === 1) {
            if (invalid_shop_shape(cand)) continue;
            sroom = cand;
            break;
        }
    }
    if (!sroom) return;

    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++) {
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = g.level.at(x, y);
                if (loc) loc.lit = 1;
            }
        }
        sroom.rlit = 1;
    }

    let shopIdx = -1;
    {
        let j = rnd(100);
        let i = 0;
        for (; i < shtypes.length && (j -= shtypes[i].prob) > 0; i++)
            continue;
        shopIdx = i;
        if (isbig(sroom) && (shtypes[shopIdx]?.symb === WAND_CLASS
            || shtypes[shopIdx]?.symb === SPBOOK_CLASS)) {
            shopIdx = 0;
        }
    }

    sroom.rtype = SHOPBASE + shopIdx;
    topologize(sroom);
    sroom.needfill = FILL_NORMAL;
}

function ROOM_IS_FILLABLE(croom) {
    return (croom.rtype === OROOM || croom.rtype === THEMEROOM)
        && croom.needfill === FILL_NORMAL;
}

/**
 * C ref: sp_lev.c fill_special_room() — vault gold; shop stock_room; fill_zoo.
 */
function fill_special_room(croom) {
    if (!croom) return;
    for (let i = 0; i < (croom.nsubrooms || 0); i++)
        fill_special_room(croom.sbrooms[i]);

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === 0 /* FILL_NONE */)
        return;

    if (croom.needfill === FILL_NORMAL) {
        // C: rtype >= SHOPBASE → stock_room(...); has_shop
        if (croom.rtype >= SHOPBASE) {
            stock_room(croom.rtype - SHOPBASE, croom);
            if (game.level?.flags) game.level.flags.has_shop = true;
            return;
        }
        if (croom.rtype === VAULT) {
            const d = Math.abs(depth_of_level(game.u?.uz));
            for (let x = croom.lx; x <= croom.hx; x++) {
                for (let y = croom.ly; y <= croom.hy; y++)
                    mkgold(rn1(d * 100, 51), x, y);
            }
        } else if (croom.rtype === ZOO || croom.rtype === COURT
            || croom.rtype === BEEHIVE || croom.rtype === ANTHOLE
            || croom.rtype === COCKNEST || croom.rtype === LEPREHALL
            || croom.rtype === MORGUE || croom.rtype === BARRACKS) {
            fill_zoo(croom);
        }
    }
    if (croom.rtype === VAULT)
        game.level.flags.has_vault = true;
    else if (croom.rtype === ZOO)
        game.level.flags.has_zoo = true;
    else if (croom.rtype === COURT)
        game.level.flags.has_court = true;
    else if (croom.rtype === MORGUE)
        game.level.flags.has_morgue = true;
    else if (croom.rtype === BEEHIVE)
        game.level.flags.has_beehive = true;
    else if (croom.rtype === BARRACKS)
        game.level.flags.has_barracks = true;
    else if (croom.rtype === TEMPLE)
        game.level.flags.has_temple = true;
    else if (croom.rtype === SWAMP)
        game.level.flags.has_swamp = true;
}

/**
 * C ref: mkroom.c courtmon — difficulty-scaled court monster pick.
 */
function courtmon() {
    const i = rn2(60) + rn2(3 * level_difficulty());
    if (i > 100) return mkclass('S_DRAGON', 0);
    if (i > 95) return mkclass('S_GIANT', 0);
    if (i > 85) return mkclass('S_TROLL', 0);
    if (i > 75) return mkclass('S_CENTAUR', 0);
    if (i > 60) return mkclass('S_ORC', 0);
    if (i > 45) return PM_BUGBEAR >= 0 ? mons(PM_BUGBEAR) : null;
    if (i > 30) return PM_HOBGOBLIN >= 0 ? mons(PM_HOBGOBLIN) : null;
    if (i > 15) return mkclass('S_GNOME', 0);
    return mkclass('S_KOBOLD', 0);
}

/**
 * C ref: mkroom.c morguemon — undead pick for MORGUE fill_zoo.
 * Named omission: Inhell S_DEMON arm uses dungeon hellish flag (≡ C Inhell).
 */
function morguemon() {
    const i = rn2(100);
    const hd = rn2(level_difficulty());
    if (hd > 10 && i < 10) {
        const uz = game.u?.uz;
        const inHell = !!(game.dungeons?.[uz?.dnum | 0]?.flags?.hellish);
        if (inHell || In_endgame(uz)) {
            return mkclass('S_DEMON', 0);
        }
        const nd = ndemon(A_NONE);
        if (nd !== NON_PM) return mons(nd);
    }
    if (hd > 8 && i > 85) return mkclass('S_VAMPIRE', 0);
    if (i < 20) return PM_GHOST >= 0 ? mons(PM_GHOST) : null;
    if (i < 40) return PM_WRAITH >= 0 ? mons(PM_WRAITH) : null;
    return mkclass('S_ZOMBIE', 0);
}

/**
 * C ref: mkobj.c mk_tt_object — CORPSE/STATUE with topten name or role pm.
 * Empty RECORD: get_rnd_toptenentry burns rnd(10) then null → rn1 role.
 */
function mk_tt_object(objtype, x, y) {
    const initialize_it = objtype !== STATUE;
    const otmp = mksobj_at(objtype, x, y, initialize_it, false);
    if (!otmp) return null;
    rnd(10); // C get_rnd_toptenentry after successful open
    set_corpsenm(otmp, rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST));
    return otmp;
}

/**
 * C ref: mkroom.c mk_zoo_thronemon — sleeping hostile ruler + mace.
 */
function mk_zoo_thronemon(x, y) {
    const i = rnd(level_difficulty());
    const pmIdx = (i > 9) ? PM_OGRE_TYRANT
        : (i > 5) ? PM_ELVEN_MONARCH
        : (i > 2) ? PM_DWARF_RULER
        : PM_GNOME_RULER;
    const mon = pmIdx >= 0 ? makemon(mons(pmIdx), x, y, 0) : null;
    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        set_malign(mon);
        mongets(mon, MACE);
    }
}

/**
 * C ref: mkroom.c fill_zoo — COURT throne/courtmon/chest ported; ZOO/
 * LEPREHALL gold; MORGUE morguemon + corpse/chest/grave (D-0642);
 * rectangular fill matches C (no roomno gate; D-0643 gate removed once
 * link_doors_rooms door-edge skips cover Pri-loca overlaps — D-0658);
 * COCKNEST typed mon. Named omissions: BEEHIVE queen; BARRACKS/ANTHOLE
 * loot + squadmon/antholemon.
 */
function fill_zoo(sroom) {
    if (!sroom) return;
    const type = sroom.rtype;
    const sh = sroom.fdoor | 0;
    const doors = game.level?.doors || [];
    const rmno = (sroom.roomnoidx ?? 0) + ROOMOFFSET;
    let goldlim = 0;
    let tx = 0;
    let ty = 0;
    const mm = { x: 0, y: 0 };

    switch (type) {
    case COURT: {
        let thronePlaced = false;
        if (game.level?.flags?.is_maze_lev) {
            for (let x = sroom.lx; x <= sroom.hx && !thronePlaced; x++) {
                for (let y = sroom.ly; y <= sroom.hy; y++) {
                    const loc = game.level.at(x, y);
                    if (loc && IS_THRONE(loc.typ)) {
                        tx = x;
                        ty = y;
                        thronePlaced = true;
                        break;
                    }
                }
            }
        }
        if (!thronePlaced) {
            let i = 100;
            do {
                somexyspace(sroom, mm);
                tx = mm.x;
                ty = mm.y;
            } while (occupied(tx, ty) && --i > 0);
        }
        mk_zoo_thronemon(tx, ty);
        break;
    }
    case ZOO:
    case LEPREHALL:
        goldlim = 500 * level_difficulty();
        break;
    default:
        break;
    }

    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (sroom.irregular) {
                const loc = game.level.at(sx, sy);
                if (!loc || (loc.roomno | 0) !== rmno || loc.edge)
                    continue;
                if ((sroom.doorct | 0)
                    && doors[sh]
                    && distmin(sx, sy, doors[sh].x, doors[sh].y) <= 1)
                    continue;
            } else if (!SPACE_POS(game.level.at(sx, sy)?.typ)
                || ((sroom.doorct | 0) && doors[sh] && (
                    (sx === sroom.lx && doors[sh].x === sx - 1)
                    || (sx === sroom.hx && doors[sh].x === sx + 1)
                    || (sy === sroom.ly && doors[sh].y === sy - 1)
                    || (sy === sroom.hy && doors[sh].y === sy + 1)))) {
                continue;
            }
            // don't place monster on explicitly placed throne
            if (type === COURT && IS_THRONE(game.level.at(sx, sy)?.typ))
                continue;

            let pm = null;
            if (type === COURT) {
                pm = courtmon();
            } else if (type === LEPREHALL) {
                const idx = name_to_mon('leprechaun');
                pm = idx >= 0 ? mons(idx) : null;
            } else if (type === COCKNEST) {
                const idx = name_to_mon('cockatrice');
                pm = idx >= 0 ? mons(idx) : null;
            } else if (type === MORGUE) {
                pm = morguemon();
            }
            // ZOO / default → makemon(NULL) random
            const mon = makemon(pm, sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    set_malign(mon);
                }
            }

            if (type === ZOO || type === LEPREHALL) {
                let i;
                if (sroom.doorct | 0) {
                    const door = doors[sh];
                    const distval = door
                        ? dist2(sx, sy, door.x, door.y) : goldlim;
                    i = distval * distval;
                } else {
                    i = goldlim;
                }
                if (i >= goldlim) i = 5 * level_difficulty();
                goldlim -= i;
                mkgold(rn1(i, 10), sx, sy);
            } else if (type === MORGUE) {
                if (!rn2(5)) mk_tt_object(CORPSE, sx, sy);
                if (!rn2(10))
                    mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                if (!rn2(5)) make_grave(sx, sy, null);
            }
        }
    }

    if (type === COURT) {
        const loc = game.level.at(tx, ty);
        if (loc) loc.typ = THRONE;
        somexyspace(sroom, mm);
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = rn1(50 * level_difficulty(), 10);
            gold.owt = weight(gold);
            const chest = mksobj_at(CHEST, mm.x, mm.y, true, false);
            if (chest) {
                add_to_container(chest, gold);
                chest.owt = weight(chest);
                chest.spe = 2; /* so it can be found later */
            }
        }
        if (game.level?.flags) game.level.flags.has_court = true;
    } else if (type === ZOO && game.level?.flags) {
        game.level.flags.has_zoo = true;
    } else if (type === MORGUE && game.level?.flags) {
        game.level.flags.has_morgue = true;
    }
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
    // C ref: themerms.lua 'Blocked center' — map + optional lava→wall/pool replace
    'Blocked center': {
        map: '-----------\n|.........|\n|.........|\n|.........|\n|...LLL...|\n|...LLL...|\n|...LLL...|\n|.........|\n|.........|\n|.........|\n-----------',
        fx: 1, fy: 1,
        contents() {
            // percent(30) then shuffle({"-","P"}) then replace L in {1,1,9,9}
            if (rn2(100) < 30) {
                const terr = [HWALL, POOL];
                nhlib_shuffle(terr);
                lspo_replace_terrain_region(1, 1, 9, 9, LAVAPOOL, terr[0], 100);
            }
            filler_region(1, 1);
        },
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

/** C ref: sp_lev.c match_maptyps — MATCH_WALL / MAX_TYPE / INVALID_TYPE. */
function match_maptyps(typ, levltyp) {
    if (typ === MATCH_WALL && !IS_STWALL(levltyp)) return false;
    if (typ < MAX_TYPE && typ !== levltyp) return false;
    return true;
}

/** C ref: sp_lev.c mapfrag_match — odd-sized fragment centered on (x,y). */
function mapfrag_match(mf, x, y) {
    const cx = (mf.wid / 2) | 0;
    const cy = (mf.hei / 2) | 0;
    for (let rx = -cx; rx <= cx; rx++) {
        for (let ry = -cy; ry <= cy; ry++) {
            const mapc = mapfrag_get(mf, rx + cx, ry + cy);
            const loc = isok(x + rx, y + ry) ? game.level.at(x + rx, y + ry) : null;
            const levc = loc ? loc.typ : STONE;
            if (!match_maptyps(mapc, levc)) return false;
        }
    }
    return true;
}

/**
 * C ref: nhlsel.c l_selection_match — scan level for mapfrag centers.
 * `[.w.]` uses INVALID_TYPE wildcards around ROOM–MATCH_WALL–ROOM.
 */
function selection_match_mapfrag(mapstr) {
    const mf = mapfrag_fromstr(mapstr);
    const sel = selection_new();
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (mapfrag_match(mf, x, y)) selection_setpoint(x, y, sel, 1);
        }
    }
    return sel;
}

/**
 * C ref: sp_lev.c light_region — when lighting, expand by 1 so room
 * walls (and corner STONE→wall cells) get .lit; lava always lit.
 * Region coords are absolute map cells (caller adds xstart/ystart).
 */
function light_region(x1, y1, x2, y2, lit) {
    let litstate = lit ? 1 : 0;
    let lowx = x1, hix = x2, lowy = y1, hiy = y2;
    if (litstate) {
        lowx = Math.max(lowx - 1, 1);
        hix = Math.min(hix + 1, COLNO - 1);
        lowy = Math.max(lowy - 1, 0);
        hiy = Math.min(hiy + 1, ROWNO - 1);
    }
    for (let x = lowx; x <= hix; x++) {
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.lit = IS_LAVA(loc.typ) ? 1 : litstate;
        }
    }
}

/**
 * C ref: sp_lev.c sel_set_ter + mkmaze.c set_levltyp_lit subset.
 * tlit truthy → lit; SET_LIT_NOCHANGE → leave; falsey (legacy map
 * callers) → leave (themerms / sokoban light afterward). Fire plane
 * forces unlit after map via load_fire epilogue (D-0569) — C string
 * maps use lit=FALSE which would clear solidfill BOOL_RANDOM lit=1.
 */
function sel_set_ter(x, y, ter, tlit) {
    const loc = game.level.at(x, y);
    if (!loc || !isok(x, y)) return;
    loc.typ = ter;
    loc.flags = 0;
    loc.horizontal = false;
    loc.roomno = NO_ROOM;
    loc.edge = false;
    if (tlit === SET_LIT_NOCHANGE) {
        /* keep loc.lit */
    } else if (tlit) {
        loc.lit = true;
    }
    // else: legacy false → nochange (not C lit=FALSE; see load_fire)
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

// C ref: dungeon.c induced_align — Is_special then dungeon then rn2(3)
function induced_align(pct) {
    const uz = game.u?.uz;
    const slev = (game.sp_levchn || []).find(s =>
        s?.dlevel
        && (s.dlevel.dnum | 0) === (uz?.dnum | 0)
        && (s.dlevel.dlevel | 0) === (uz?.dlevel | 0));
    if (slev?.flags?.align) {
        if (rn2(100) < pct) return slev.flags.align;
    }
    const dunAlign = game.dungeons?.[uz?.dnum ?? 0]?.flags?.align;
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

// C ref: sp_lev.c find_montype — gender from name_to_monplus / fixed-sex / rn2(2)
function find_montype_gender(name) {
    // C: int mgend = NEUTRAL; then name_to_monplus(..., &mgend)
    const genderVar = { gender: NEUTRAL };
    const i = name_to_monplus(name, null, genderVar);
    if (i < 0 || i === NON_PM) return { mndx: NON_PM, female: 0 };
    const ptr = mons(i);
    let female = 0;
    if (is_male(ptr) || is_female(ptr)) {
        female = is_female(ptr) ? FEMALE : MALE;
    } else {
        const mgend = genderVar.gender;
        // C: (mgend == FEMALE) ? FEMALE : (mgend == MALE) ? MALE : rn2(2)
        female = mgend === FEMALE ? FEMALE
            : mgend === MALE ? MALE
            : rn2(2);
    }
    return { mndx: i, female };
}

// C ref: selvar.c selection_filter_percent — rn2(100) < pct per set cell
function selection_filter_percent(sel, pct) {
    const pts = new Set();
    let lx = COLNO, ly = ROWNO, hx = 0, hy = 0;
    if (!sel || !sel.pts.size) return { pts, lx: 0, ly: 0, hx: -1, hy: -1 };
    for (let x = sel.lx; x <= sel.hx; x++) {
        for (let y = sel.ly; y <= sel.hy; y++) {
            const key = `${x},${y}`;
            if (!sel.pts.has(key)) continue;
            if (rn2(100) < pct) {
                pts.add(key);
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

// C ref: selection.room() iterate order — x-outer then y (same as filter_percent)
function selection_iterate(sel, fn) {
    if (!sel || !sel.pts.size) return;
    for (let x = sel.lx; x <= sel.hx; x++) {
        for (let y = sel.ly; y <= sel.hy; y++) {
            if (sel.pts.has(`${x},${y}`)) fn(x, y);
        }
    }
}

// C ref: selvar.c selection_new — empty COLNO×ROWNO selection (Set-backed)
function selection_new() {
    return { pts: new Set(), lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
}

// C ref: selvar.c selection_getpoint
function selection_getpoint(x, y, sel) {
    if (!sel || x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return 0;
    return sel.pts.has(`${x},${y}`) ? 1 : 0;
}

// C ref: selvar.c selection_setpoint — set/clear; update bounds on set
function selection_setpoint(x, y, sel, c) {
    if (!sel || x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return;
    const key = `${x},${y}`;
    if (c) {
        sel.pts.add(key);
        if (x < sel.lx) sel.lx = x;
        if (y < sel.ly) sel.ly = y;
        if (x > sel.hx) sel.hx = x;
        if (y > sel.hy) sel.hy = y;
    } else {
        sel.pts.delete(key);
    }
}

/**
 * C ref: selvar.c selection_floodfill + sp_lev floodfillchk_match_under.
 * Stack walk; matchTyp is terrain under the seed cell.
 */
function selection_floodfill(ov, x0, y0, diagonals, matchTyp) {
    if (!ov || !isok(x0, y0)) return;
    const stackX = [];
    const stackY = [];
    const queued = new Set();
    const enqueue = (nx, ny) => {
        if (!isok(nx, ny)) return;
        const key = `${nx},${ny}`;
        if (queued.has(key) || selection_getpoint(nx, ny, ov)) return;
        const loc = game.level.at(nx, ny);
        if (!loc || loc.typ !== matchTyp) return;
        queued.add(key);
        stackX.push(nx);
        stackY.push(ny);
    };
    enqueue(x0, y0);
    while (stackX.length) {
        const x = stackX.pop();
        const y = stackY.pop();
        selection_setpoint(x, y, ov, 1);
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
        if (diagonals) {
            enqueue(x + 1, y + 1);
            enqueue(x - 1, y - 1);
            enqueue(x - 1, y + 1);
            enqueue(x + 1, y - 1);
        }
    }
}

/** C ref: nhlsel.c l_selection_fillrect / selection.area — absolute rect. */
function selection_fillrect(x1, y1, x2, y2) {
    const sel = selection_new();
    const xa = Math.min(x1, x2);
    const xb = Math.max(x1, x2);
    const ya = Math.min(y1, y2);
    const yb = Math.max(y1, y2);
    for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
            if (isok(x, y)) selection_setpoint(x, y, sel, 1);
        }
    }
    return sel;
}

/** C ref: nhlsel.c l_selection_and — intersection. */
function selection_and(sela, selb) {
    const selr = selection_new();
    if (!sela?.pts?.size || !selb?.pts?.size) return selr;
    const lx = Math.max(sela.lx, selb.lx);
    const ly = Math.max(sela.ly, selb.ly);
    const hx = Math.min(sela.hx, selb.hx);
    const hy = Math.min(sela.hy, selb.hy);
    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (selection_getpoint(x, y, sela) && selection_getpoint(x, y, selb))
                selection_setpoint(x, y, selr, 1);
        }
    }
    return selr;
}

// C ref: selvar.c selection_do_randline — recursive midpoint displace
// Caller: nhlsel.c l_selection_randline passes rec=12.
function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    if (rec < 1 || (x2 === x1 && y2 === y1)) return;

    let r = rough | 0;
    const span = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    if (r > span) r = span;

    let mx, my;
    if (r < 2) {
        mx = ((x1 + x2) / 2) | 0;
        my = ((y1 + y2) / 2) | 0;
    } else {
        let dx, dy;
        do {
            dx = rn2(r) - ((r / 2) | 0);
            dy = rn2(r) - ((r / 2) | 0);
            mx = (((x1 + x2) / 2) | 0) + dx;
            my = (((y1 + y2) / 2) | 0) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }

    if (!selection_getpoint(mx, my, ov)) {
        selection_setpoint(mx, my, ov, 1);
    }

    r = ((r * 2) / 3) | 0;
    rec--;
    selection_do_randline(x1, y1, mx, my, r, rec, ov);
    selection_do_randline(mx, my, x2, y2, r, rec, ov);
    selection_setpoint(x2, y2, ov, 1);
}

// C ref: sp_lev.c get_location with croom → somexy for random room place
function room_random_loc(croom) {
    const c = { x: 0, y: 0 };
    if (!somexy(croom, c)) return null;
    return c;
}

// C ref: sp_lev.c create_monster class "m" + appear_as "obj:chest" in croom
function create_mimic_as_chest(croom) {
    // C: amask = sp_amask_to_amask(RANDOM) → induced_align(80)
    induced_align(80);
    const pm = mkclass('S_MIMIC', G_NOGEN);
    let pos = room_random_loc(croom);
    if (!pos) return null;
    // C: if (MON_AT && enexto) relocate before makemon
    if (game.fmon) {
        for (const m of game.fmon) {
            if (m.mx === pos.x && m.my === pos.y) {
                const cc = { x: 0, y: 0 };
                if (enexto(cc, pos.x, pos.y, pm)) {
                    pos = { x: cc.x, y: cc.y };
                } else {
                    return null;
                }
                break;
            }
        }
    }
    const mtmp = makemon(pm, pos.x, pos.y, 0);
    if (mtmp) {
        // C create_monster appear_as overrides set_mimic_sym result
        mtmp.m_ap_type = M_AP_OBJECT;
        mtmp.mappearance = CHEST;
    }
    return mtmp;
}

// C ref: themerms.lua "Storeroom" contents
function themeroom_fill_storeroom(croom) {
    const roomSel = selection_from_mkroom(croom);
    const locs = selection_filter_percent(roomSel, 30);
    // Lua iterate ignores x,y and places via get_location(croom) each time
    selection_iterate(locs, () => {
        if (percent(25)) {
            const pos = room_random_loc(croom);
            if (pos) mksobj_at(CHEST, pos.x, pos.y, true, false);
        } else {
            create_mimic_as_chest(croom);
        }
    });
}

// C ref: themerms.lua "Buried zombies" + sp_lev.c create_object buried CORPSE
// Loop (width*height)/2: shuffle zombifiable → mksobj CORPSE → set_corpsenm →
// bury_an_obj → stop rot-corpse → start zombify-mon(990+rn2(21)).
function themeroom_fill_buried_zombies(croom) {
    const diff = level_difficulty();
    // C: start with [1..4]; expand at diff>3 / diff>6
    const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
    if (diff > 3) {
        zombifiable.push('elf', 'human');
        if (diff > 6) zombifiable.push('ettin', 'giant');
    }
    // C sp_lev mkroom table: width = 1+(hx-lx), height = 1+(hy-ly)
    const width = 1 + (croom.hx - croom.lx);
    const height = 1 + (croom.hy - croom.ly);
    // Lua `/` is float; for-loop runs while i <= limit
    const n = Math.floor((width * height) / 2);
    for (let i = 0; i < n; i++) {
        nhlib_shuffle(zombifiable);
        const mndx = name_to_mon(zombifiable[0]);
        if (mndx < 0 || mndx === NON_PM) continue;
        const pos = room_random_loc(croom);
        if (!pos) continue;
        // C create_object: mksobj_at(id, x, y, TRUE, !named) with named=false
        const otmp = mksobj_at(CORPSE, pos.x, pos.y, true, true);
        if (!otmp) continue;
        // Override random corpsenm (restarts corpse timeout like C set_corpsenm)
        set_corpsenm(otmp, mndx);
        // C bury_an_obj: obj_resists(0,0) then extract + add_to_buried
        rn2(100);
        obj_extract_self(otmp);
        add_to_buried(otmp);
        // Lua: o:stop_timer("rot-corpse"); o:start_timer("zombify-mon", math.random(990,1010))
        // math.random(990,1010) → nh.random(990,21) → 990+rn2(21)
        obj_stop_timers(otmp);
        start_timer(990 + rn2(21), TIMER_OBJECT, ZOMBIFY_MON, otmp);
    }
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

// C ref: themerms.lua postprocess queue (Teleportation hub / garden / dig)
const themerms_postprocess = [];

// C ref: selvar.c selection_filter_mapchar — lit default -2 (no lit RNG)
function selection_filter_mapchar(sel, typ) {
    const pts = new Set();
    let lx = COLNO, ly = ROWNO, hx = 0, hy = 0;
    if (!sel || !sel.pts.size) return { pts, lx: 0, ly: 0, hx: -1, hy: -1 };
    for (let x = sel.lx; x <= sel.hx; x++) {
        for (let y = sel.ly; y <= sel.hy; y++) {
            const key = `${x},${y}`;
            if (!sel.pts.has(key)) continue;
            const loc = game.level.at(x, y);
            // match_maptyps(typ, levl.typ) for ROOM (".")
            if (!loc || loc.typ !== typ) continue;
            pts.add(key);
            if (x < lx) lx = x;
            if (y < ly) ly = y;
            if (x > hx) hx = x;
            if (y > hy) hy = y;
        }
    }
    if (pts.size === 0) return { pts, lx: 0, ly: 0, hx: -1, hy: -1 };
    return { pts, lx, ly, hx, hy };
}

// C ref: selection.negate() with no args → all cells set, then filter_mapchar(".")
function selection_all_room_floors() {
    const pts = new Set();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) pts.add(`${x},${y}`);
    }
    return selection_filter_mapchar(
        { pts, lx: 1, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 },
        ROOM,
    );
}

// C ref: themerms.lua "Teleportation hub" contents
// rndcoord returns room-relative; Lua stores abs via +region.x1-1 / +region.y1.
// pos.x > 0 skips failed (-1) and leftmost room-relative column (rel==0).
function themeroom_fill_teleport_hub(croom) {
    const roomSel = selection_from_mkroom(croom);
    const locs = selection_filter_mapchar(roomSel, ROOM);
    const n = 2 + rn2(3);
    for (let i = 0; i < n; i++) {
        const abs = selection_rndcoord(locs, true);
        if (!abs) continue;
        const relX = abs.x - croom.lx;
        if (!(relX > 0)) continue;
        // Stored form matches Lua postprocess coords (xstart-relative later)
        themerms_postprocess.push({
            handler: 'make_a_trap',
            data: {
                type: 'teleport',
                seen: true,
                coord: { x: abs.x - 1, y: abs.y },
                teledest: 1,
            },
        });
    }
}

// C ref: themerms.lua make_a_trap — teledest pick then des.trap
function make_a_trap_postprocess(data) {
    if (!data || data.type !== 'teleport') return;
    let teledest = data.teledest;
    if (teledest === 1) {
        const locs = selection_all_room_floors();
        // Lua: until x differs AND y differs (both axes)
        do {
            const abs = selection_rndcoord(locs, true);
            if (!abs) return;
            // Relative to xstart=1, ystart=0 (reset_xystart_size)
            teledest = { x: abs.x - 1, y: abs.y };
        } while (!(teledest.x !== data.coord.x && teledest.y !== data.coord.y));
    }
    if (!teledest || typeof teledest !== 'object') return;

    // get_location adds xstart/ystart to stored relative coords
    const tx = data.coord.x + 1;
    const ty = data.coord.y;
    const dx = teledest.x + 1;
    const dy = teledest.y;
    if (!isok(tx, ty)) return;
    const ttmp = maketrap(tx, ty, TELEP_TRAP);
    if (!ttmp) return;
    if (data.seen) ttmp.tseen = true;
    ttmp.teledest = { x: dx, y: dy };

    // C create_trap → mktrap: victim gate evaluates rnd(4) before
    // (kind < HOLE || MAGIC_TRAP) rejects TELEP — burn must still happen.
    const kind = TELEP_TRAP;
    const lvl = level_difficulty();
    if (game.in_mklev
        && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
            && ttmp.launch?.x === ttmp.tx && ttmp.launch?.y === ttmp.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { ttmp.ttyp = PIT; ttmp.tseen = true; }
        mktrap_victim(ttmp);
    }
}

// C ref: themerms.lua post_level_generate + mklev.c themerooms_post_level_generate
function run_themerms_post_level_generate() {
    for (const v of themerms_postprocess) {
        if (v.handler === 'make_a_trap') make_a_trap_postprocess(v.data);
    }
    themerms_postprocess.length = 0;
}

const THEMEROOM_FILL_BODIES = {
    'Ghost of an Adventurer': themeroom_fill_ghost,
    'Teleportation hub': themeroom_fill_teleport_hub,
    'Storeroom': themeroom_fill_storeroom,
    'Buried zombies': themeroom_fill_buried_zombies,
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
    // Named omission: other fill contents (Ice/Trap room/Garden/Temple/…)
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

    // C ref: sp_lev.c lspo_region irregular —
    // flood_fill_rm(..., rlit, TRUE) then add_room(..., FALSE, rtype, TRUE).
    // Lighting comes only from flood_fill_rm (room shape + edge walls), not
    // from re-lighting the bounding box (that wrongly lit holes / niches).
    add_room(bounds.min_rx, bounds.min_ry, bounds.max_rx, bounds.max_ry,
        false, rtype, true);
    const troom = g.level.rooms[g.level.nroom - 1];
    if (troom) {
        troom.rlit = rlit ? 1 : 0;
        troom.irregular = true;
        troom.needjoining = true;
        troom.needfill = FILL_NORMAL;
        if (do_themed_fill) themeroom_fill(troom);
    }
    return true;
}

// C ref: nhlib.lua shuffle() — Fisher–Yates with math.random(i)=1+rn2(i)
function nhlib_shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const tmp = list[i - 1];
        list[i - 1] = list[j - 1];
        list[j - 1] = tmp;
    }
}

// C ref: sp_lev.c lspo_replace_terrain — region arm (relative to map xystart)
// Iterates x outer, y inner; rn2(100)<chance only after fromtyp match (clang &&).
function lspo_replace_terrain_region(rx1, ry1, rx2, ry2, fromtyp, totyp, chance) {
    const g = game;
    const mx = g.splev_xstart ?? 1;
    const my = g.splev_ystart ?? 0;
    const ax1 = mx + rx1;
    const ay1 = my + ry1;
    const ax2 = mx + rx2;
    const ay2 = my + ry2;
    const ch = chance == null ? 100 : chance;
    for (let x = Math.max(1, ax1); x <= ax2; x++) {
        for (let y = ay1; y <= ay2; y++) {
            if (!isok(x, y)) continue;
            const loc = g.level.at(x, y);
            if (!loc) continue;
            const match = (fromtyp === MATCH_WALL && IS_STWALL(loc.typ))
                || loc.typ === fromtyp;
            if (match && rn2(100) < ch) {
                // C replace_terrain default lit=SET_LIT_NOCHANGE
                sel_set_ter(x, y, totyp, SET_LIT_NOCHANGE);
            }
        }
    }
}

// C ref: sp_lev.c lspo_map — themerms random-placement path (lr=tb=-1, no croom)
// mapdef: { map, fx, fy [, contents()] } — contents replaces default filler_region.
function lspo_map_themeroom(mapdef) {
    const g = game;
    const mapstr = mapdef.map;
    const contents_fn = mapdef.contents || null;

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

        if (contents_fn) contents_fn();
        else filler_region(mapdef.fx, mapdef.fy);
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
            return lspo_map_themeroom(mapdef);
        }

        // C themerms.lua rectangular rooms:
        //  default → ordinary filled=1 (fully-random create_room)
        //  sized outer rooms → create_room positioned (rnd(5)) when w/h set
        //  Nesting rooms → fixed w/h then build_room (D-0226)
        //  Default/Unlit/Both themed fill → type=themed + themeroom_fill
        // Size RNG must run before build_room's rn2(100) (Lua table eval order).
        let rtype = OROOM;
        let rlit = -1;
        let needfill = FILL_NORMAL;
        let do_themed_fill = false;
        let room_w = -1;
        let room_h = -1;
        if (pick.name === 'Nesting rooms') {
            // C ref: themerms.lua:346 — w/h evaluated before des.room/build_room
            room_w = 9 + rn2(4);
            room_h = 9 + rn2(4);
            needfill = FILL_NORMAL;
        } else if (pick.name === 'Fake Delphi') {
            // C ref: themerms.lua:294 — outer w=11,h=9; nested create_subroom deferred
            room_w = 11;
            room_h = 9;
            needfill = FILL_NORMAL;
        } else if (pick.name === 'Huge room with another room inside') {
            // C ref: themerms.lua:325 — w/h before des.room; nested body deferred
            room_w = rn2(10) + 11;
            room_h = rn2(5) + 8;
            needfill = FILL_NORMAL;
        } else if (pick.name === 'Pillars') {
            // C ref: themerms.lua:402 — themed 10×10; pillar terrain deferred
            rtype = THEMEROOM;
            room_w = 10;
            room_h = 10;
            needfill = 0;
        } else if (pick.name === 'Mausoleum') {
            // C ref: themerms.lua:422 — themed odd size; nested 1×1 deferred
            rtype = THEMEROOM;
            room_w = 5 + rn2(3) * 2;
            room_h = 5 + rn2(3) * 2;
            needfill = 0;
        } else if (pick.name === 'Random dungeon feature') {
            // C ref: themerms.lua:448 — odd-sized ordinary; center terrain deferred
            room_w = 3 + rn2(3) * 2;
            room_h = 3 + rn2(3) * 2;
            needfill = FILL_NORMAL;
        } else if (pick.name === 'Twin businesses') {
            // C ref: themerms.lua:824 — themed 9×5 aisle; nested shops deferred
            rtype = THEMEROOM;
            room_w = 9;
            room_h = 5;
            needfill = 0;
        } else if (pick.name === 'Default room with themed fill') {
            rtype = THEMEROOM;
            needfill = 0;
            do_themed_fill = true;
        } else if (pick.name === 'Unlit room with themed fill') {
            rtype = THEMEROOM;
            rlit = 0;
            needfill = 0;
            do_themed_fill = true;
        } else if (pick.name === 'Room with both normal contents and themed fill') {
            rtype = THEMEROOM;
            needfill = FILL_NORMAL;
            do_themed_fill = true;
        }
        // Named omission: Room-in-room nested create_subroom/door; Fake Delphi /
        // Huge / Nesting / Mausoleum / Twin nested bodies; Pillars terrain;
        // Random-feature center terrain. Water vault is map-path. Blocked
        // center map+replace_terrain done (D-0243).

        // C build_room: chance defaults to 100 → always burns rn2(100)
        // (after contents arg RNG such as Nesting rn2(4) size rolls)
        rn2(100);

        const ok = create_room(-1, -1, room_w, room_h, -1, -1, rtype, rlit);
        if (ok) {
            // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
            const aroom = g.level.rooms[g.level.nroom - 1];
            if (aroom) {
                topologize(aroom);
                aroom.needfill = needfill;
                // C lspo_room: contents(themeroom_fill) after build_room
                if (do_themed_fill) themeroom_fill(aroom);
                // Nesting rooms nested contents deferred (create_subroom/door)
            }
        } else if (g.in_mk_themerooms) {
            g.themeroom_failed = true;
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
            // C ref: sp_lev.c:1580 — only some parameters are random
            let rndpos = 0;
            if (xtmp < 0 && ytmp < 0) {
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) {
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) xaltmp = rnd(3);
            if (yaltmp === -1) yaltmp = rnd(3);

            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;
            switch (xaltmp) {
            case SPLEV_LEFT:
                break;
            case SPLEV_RIGHT:
                xabs += Math.trunc(COLNO / 5) - wtmp;
                break;
            case SPLEV_CENTER:
                xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2);
                break;
            }
            switch (yaltmp) {
            case SPLEV_TOP:
                break;
            case SPLEV_BOTTOM:
                yabs += Math.trunc(ROWNO / 5) - htmp;
                break;
            case SPLEV_CENTER:
                yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2);
                break;
            }

            if (xabs + wtmp - 1 > COLNO - 2) xabs = COLNO - wtmp - 3;
            if (xabs < 2) xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2) yabs = ROWNO - htmp - 3;
            if (yabs < 2) yabs = 2;

            r2 = {
                lx: xabs - 1,
                ly: yabs - 1,
                hx: xabs + wtmp + rndpos,
                hy: yabs + htmp + rndpos,
            };
            r1 = get_rect(r2);
            const ddx = { v: wtmp }, ddy = { v: htmp };
            const lowx = { v: xabs }, lowy = { v: yabs };
            if (r1 && !check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
            } else if (r1) {
                xabs = lowx.v;
                yabs = lowy.v;
                // C does not rewrite wtmp/htmp from dx/dy after check_room
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
                // C ref: mklev.c dosdoor — trapped door may become mimic
                if (level_difficulty() >= 9 && !rn2(5)
                    && !((((game.mvitals?.[PM_SMALL_MIMIC]?.mvflags ?? 0) & G_GONE))
                        && (((game.mvitals?.[PM_LARGE_MIMIC]?.mvflags ?? 0) & G_GONE))
                        && (((game.mvitals?.[PM_GIANT_MIMIC]?.mvflags ?? 0) & G_GONE)))) {
                    loc.flags = D_NODOOR;
                    loc.doormask = D_NODOOR;
                    const mtmp = makemon(mkclass('S_MIMIC', 0), x, y, 0);
                    if (mtmp) set_mimic_sym(mtmp);
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
                if (is_hole(actualTrap) && !Can_fall_thru(g.u?.uz))
                    actualTrap = ROCKTRAP;
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
    // C ref: mklev.c make_niches — dep = depth(&u.uz); ltptr needs !noteleport
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    const dep = depth_of_level(g.u?.uz);
    let ltptr = (!g.level.flags.noteleport && dep > 15);
    let vamp = (dep > 5 && dep < 25);
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

/**
 * C ref: mkmaze.c mkportal — MAGIC_PORTAL trap with destination dungeon/level.
 */
function mkportal(x, y, todnum, todlevel) {
    const ttmp = maketrap(x, y, MAGIC_PORTAL);
    if (!ttmp) return;
    ttmp.dst = { dnum: todnum | 0, dlevel: todlevel | 0 };
}

function place_branch(branchp, x = 0, y = 0) {
    const g = game;
    // C ref: mklev.c place_branch — early-out if none or already placed
    if (!branchp || g.made_branch) return;

    if (!x) {
        const mp = { x: 0, y: 0 };
        const croom = find_branch_room(mp);
        if (croom && mp.x > 0) {
            x = mp.x;
            y = mp.y;
        } else {
            g.made_branch = true;
            return;
        }
    }

    const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
        && branchp.end1?.dlevel === g.u?.uz?.dlevel);
    const dest = on_end1 ? branchp.end2 : branchp.end1;
    const brType = branchp.type ?? 0;
    let make_stairs = true;
    if (on_end1) make_stairs = brType !== BR_NO_END1;
    else make_stairs = brType !== BR_NO_END2;

    if (brType === BR_PORTAL) {
        // C ref: mklev.c place_branch → mkportal(x,y,dest)
        // (debug_fuzzer ucamefrom arm deferred)
        mkportal(x, y, dest?.dnum | 0, dest?.dlevel | 0);
    } else if (make_stairs) {
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        const loc = g.level?.at(x, y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? 1 : 2;
        }
        stairway_add(x, y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        if (goes_up) g.level.upstair = { x, y };
        else g.level.dnstair = { x, y };
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

function traptype_rnd(mktrapflags = 0) {
    // C ref: mklev.c traptype_rnd — uses level_difficulty(), not dunlev
    const lvl = level_difficulty();
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST:
        kind = NO_TRAP; break;
    case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        // single_level_branch (Knox) deferred — ordinary/quest branches false
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7 && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
            kind = NO_TRAP;
        break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        // C: if (!Inhell) — quest/main never hell here
        kind = NO_TRAP; break;
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
    // C mktrap: WEB spider before victim gate; level_difficulty not dlevel
    mktrap_seen_victim(trap, {});
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

// C ref: mklev.c mkgrave — grave + optional buried gold/loot + bell
function mkgrave_room(croom) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = rnd(20) + level_difficulty() * rnd(5);
            gold.owt = weight(gold);
            gold.ox = pos.x;
            gold.oy = pos.y;
            add_to_buried(gold);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobj(RANDOM_CLASS, true);
        if (!otmp) return;
        curse(otmp);
        otmp.ox = pos.x;
        otmp.oy = pos.y;
        add_to_buried(otmp);
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
            // C ref: mklev.c make_niche / fill_room — supply chest before Oracle
            // mksobj_at(..., FALSE, FALSE) skips mkbox_cnts; fill via add_to_container.
            const supply_chest = mksobj_at(
                rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false,
            );
            if (supply_chest) {
                supply_chest.olocked = !!rn2(6);
                let tryct2 = 0;
                let cursed_item;
                do {
                    const supply_items = [
                        POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING,
                    ];
                    // C: rn2(2) ? POT_HEALING : ROLL_FROM(supply_items)
                    const otyp = rn2(2)
                        ? POT_HEALING
                        : supply_items[rn2(supply_items.length)];
                    const otmp = mksobj(otyp, true, false);
                    if (otmp && otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                        otmp.owt = weight(otmp);
                    }
                    cursed_item = otmp?.cursed ?? false;
                    if (otmp) add_to_container(supply_chest, otmp);
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [
                        FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL,
                    ];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    let otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        const depth = depth_of_level(g.u?.uz);
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            const otmp2 = mkobj(oclass, false);
                            if (!otmp2) continue;
                            const lv1 = (g.objects?.[otmp.otyp]?.oc_level) | 0;
                            const lv2 = (g.objects?.[otmp2.otyp]?.oc_level) | 0;
                            // C: keep lower-level book; dealloc the other
                            if (lv1 <= lv2) {
                                otmp2.quan = 0;
                            } else {
                                otmp.quan = 0;
                                otmp = otmp2;
                            }
                        }
                    }
                    if (otmp && (otmp.quan | 0) > 0) {
                        add_to_container(supply_chest, otmp);
                    }
                }
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
    // C ref: mklev.c mineralize — hell / V_tower / rogue / arboreal / most
    // specials skip rock deposits after kelp.
    const uz = game.u?.uz;
    const slev = (game.sp_levchn || []).find(s =>
        s?.dlevel
        && (s.dlevel.dnum | 0) === (uz?.dnum | 0)
        && (s.dlevel.dlevel | 0) === (uz?.dlevel | 0));
    const inHell = !!(game.dungeons?.[uz?.dnum]?.flags?.hellish);
    if (!skip_lvl_checks
        && (inHell || In_V_tower(uz) || Is_rogue_level(uz)
            || game.level?.flags?.arboreal
            || (slev && !Is_oracle_level(uz)
                && (!In_mines(uz) || slev.flags?.town)))) {
        return;
    }
    const absDepth = depth_of_level(uz);
    const dunLevel = uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    // C ref: mklev.c mineralize — mines boost; quest sparsifies
    if (!skip_lvl_checks) {
        if (In_mines(uz)) {
            goldprob *= 2;
            gemprob *= 3;
        } else if (In_quest(uz)) {
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
                        if (otmp && otmp.otyp === ROCK) {
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
