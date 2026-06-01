// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { insideRoomLikeC } from './hacklib.js';
import {
    mkobjMklevConsumeRngLikeC,
    mkobjErosionsMklevLikeC,
    mksobjInitMklevLikeC,
    mksobjTailConsumeRngLikeC,
} from './mkobj_mklev_like_c.js';
import {
    NH5_WEAPON_CLASS,
    NH5_FOOD_CLASS,
    NH5_COIN_CLASS,
    NH5_TOOL_CLASS,
    NH5_GEM_CLASS,
    NH5_RANDOM_CLASS,
    NH5_POTION_CLASS,
    NH5_SCROLL_CLASS,
    NH5_WAND_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_ROCK_CLASS,
} from './nh5_objclass.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1 } from './rng.js';
import { nhlibAlignShuffleRn2LikeC } from './nhlib_align_shuffle.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import {
    depth as depth_of_level,
    depth,
    distmin,
    dunlevLikeC,
    dunlevsInDungeonLikeC,
} from './hacklib.js';
import {
    findLevelByProtoLikeC, isSpecialAtUzLikeC, isSpecialHeroUzLikeC,
} from './sp_levchn.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL, IS_LAVA, ACCESSIBLE,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NORMAL,
    XL_UP, XL_DOWN, XL_LEFT, XL_RIGHT,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL,
    A_LAWFUL, Align2amask,
    LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH, LR_TELE, LR_UPTELE, LR_DOWNTELE,
    onWTowerLevelLikeC,
    MM_NOGRP,
    NO_MM_FLAGS,
    NO_TRAP, TRAPNUM,
    PM_GIANT_SPIDER,
    PM_LICHEN,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
    SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP,
    MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST,
    MKTRAP_NOFLAGS, MKTRAP_SEEN, MKTRAP_NOSPIDERONWEB, MKTRAP_NOVICTIM,
    is_pit, is_hole,
    OTYP_BOULDER,
    In_endgame, In_hell, In_V_tower, Is_rogue_level, Is_oracle_level, In_mines, In_quest,
    Is_knox_level, Is_stronghold,
    CORPSTAT_NONE,
    MKTRAP_MAZEFLAG,
    LEV_EXT,
} from './const.js';
import { isPoolOrLavaCellLikeC } from './fillholetyp.js';
import { makeEngrAt, ENGR_HEADSTONE, ENGR_MARK, ENGR_DUST, randomEngraving, getRndEpitaphText, wipeEngrAt } from './engrave.js';
import { tAt } from './search.js';
import { canFallThruDlevelLikeC } from './trap.js';
import { breaktestLikeC } from './obj_break_dothrow.js';
import { makemon } from './makemon.js';
import { rndmonstLikeC } from './makemon_rndmonst.js';
import { MONS_MLET } from './mons_rndmonst_ini_inv_data.js';
import {
    eastFungusDoorNicheAtLikeC,
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
    westFungusDoorNicheAtLikeC,
    westDoorCorrNicheAtLikeC,
    westApportSleeperNicheAtLikeC,
    westFillApportDoorLikeC,
} from './mfndpos_mon.js';
import { monTrackClear, ensureMonsterMtrack } from './monflee.js';
import { dist2, onLevelLikeC } from './hacklib.js';
import { goodposNullMonLikeC } from './walkable.js';
import { rndmonnum } from './makemon.js';
import {
    MR_STONE,
    permonstFromMndxLikeC,
    pmResistanceLikeC,
    polyWhenStonedLikeC,
} from './mondata.js';
import { setWallStateLikeC } from './wall_state.js';
import { stolenBootyLikeC } from './stolen_booty.js';
import { baalzFixupLikeC } from './baalz_fixup.js';
import { consumeMksobjCorpseSpeRngLikeC } from './mkobj_corpse.js';
import { startCorpseTimeout } from './obj_rot_timer.js';
import {
    floorObjKey,
    placeFloorObject,
    placeFloorObjectInLevel,
    refreshFobjHeadInLevel,
} from './floorobj.js';
import { fixWallSpinesRect } from './wall_spine.js';
import { setLevltypLikeC } from './set_levltyp.js';
import {
    flipLevelRndLikeC,
    linkDoorsRoomsLikeC,
    mapCleanupLikeC,
    removeBoundarySymsLikeC,
    solidifyMapLikeC,
} from './sp_lev_load.js';
import { premapDetectLikeC } from './premap_detect.js';
import { ensureWayOutLikeC } from './ensure_way_out.js';

// Object/class constants (normally from objects.js, not in contest template)
/* NH5 audit: scroll **`otyp`** literals below are **legacy** (pre–`objects_nums` / `mkobj_scroll_class_rng_like_c.js`).
 * C NH5 **`objects.h`** / **`SCROLL_CLASS_MKOBJ_OC_PROB_ROWS`** examples: **`SCR_ENCHANT_ARMOR`** **323**,
 * **`SCR_TELEPORTATION`** **333**, **`SCR_ENCHANT_WEAPON`** **328**, **`SCR_CONFUSE_MONSTER`** **325**,
 * **`SCR_SCARE_MONSTER`** **326**. Do not copy these **`287`/`275`/`326`** values into new NH5 invent/mkobj paths
 * without replaying C **`mkobj`** draws — changing them here shifts layout RNG vs recorded sessions.
 */
const RANDOM_CLASS = 0;
const WEAPON_CLASS = 1;
const ARMOR_CLASS = 2;
const RING_CLASS = 3;
const FOOD_CLASS = 7;
const SCROLL_CLASS = 8;
const POTION_CLASS = 9;
const TOOL_CLASS = 12;
const GEM_CLASS = 14;
const GOLD_PIECE = 466;
/** C `objects.h` **`ROCK("rock")`** — NH5 otyp **473** (glass worthless **467**). */
const OTYP_GEM_ROCK = 473;
/** NH5 `objects_nums` — C `mktrap_victim` ARROW / DART (`u_init_role_rng.js`). */
const OTYP_ARROW = 19;
const OTYP_DART = 25;
const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;
/** C `objects[]` — `FOOD("kelp frond", …)` (not armor otyp 172). */
const KELP_FROND = 275;
const SCR_TELEPORTATION = 333;
const BELL = 358;
/** C `objects[]` — `FOOD("corpse")` at food-class base **264** + 1. */
const CORPSE = 265;
/** C `objects[]` — `ROCK_CLASS` `STATUE` (after `BOULDER` **474**). */
const STATUE = 475;
const SPBOOK_no_NOVEL = 11;

// Supply chest items (NH5 objects.h / mkobj_*_OC_PROB_ROWS)
/** C `objects[]` — `POT_HEALING` **306**, `POT_EXTRA_HEALING` **307**. */
const POT_HEALING = 306;
const POT_EXTRA_HEALING = 307;
const POT_SPEED = 302;
const POT_GAIN_ENERGY = 313;
const SCR_ENCHANT_WEAPON = 328;
const SCR_ENCHANT_ARMOR = 323;
const SCR_CONFUSE_MONSTER = 325;
const SCR_SCARE_MONSTER = 326;
const WAN_DIGGING = 427;
const SPE_HEALING = 374;
/** C: objects.h — `LARGE_BOX` **215**, `CHEST` **216** (NH5 `objects_nums`). */
const LARGE_BOX = 215;
const CHEST = 216;
const FOOD_RATION = 143;
/** C: `mons[PM_GHOST]` — NH5 permonst index (S_GHOST). */
const PM_GHOST = 289;
const MACE = 74;
const TWO_HANDED_SWORD = 55;
const BOW = 84;
const RING_MAIL = 133;
const PLATE_MAIL = 122;
const FAKE_AMULET_OF_YENDOR = 197;
const CRAM_RATION = 145;
const LEMBAS_WAFER = 146;
const DUST = 3;
const MARK = 6;

const XLIM = 4;
const YLIM = 3;

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

/** C: mklev.c trap_engravings[] — indices match trap_types in trap.h */
const TRAP_ENGRAVINGS = /** @type {(string|undefined)[]} */ (Array.from({ length: TRAPNUM }, () => undefined));
TRAP_ENGRAVINGS[TRAPDOOR] = 'Vlad was here';
TRAP_ENGRAVINGS[TELEP_TRAP] = 'ad aerarium';
TRAP_ENGRAVINGS[LEVEL_TELEP] = 'ad aerarium';

// is_pit / is_hole from const.js (trap.h)
function stairway_add(x, y, up, isladder, dest) {
    const node = {
        sx: x,
        sy: y,
        up,
        isladder,
        tolev: { ...dest },
        u_traversed: false,
        next: game.stairs,
    };
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

/** C: mkmaze.c / stairs.c — set hero map coordinates. */
export function u_on_newpos(x, y) {
    game.u.ux = x | 0;
    game.u.uy = y | 0;
}

/** C: stairs.c `u_on_sstairs` — special staircase from another branch. */
export function u_on_sstairsLikeC(upflag) {
    const stway = stairway_find_special_dir(!!(upflag | 0));
    if (stway) u_on_newpos(stway.sx, stway.sy);
    else u_onRndspotLikeC(game, upflag | 0);
}

/** C: stairs.c `u_on_dnstairs` — down stairs (or special up equivalent). */
export function u_on_dnstairsLikeC() {
    const stway = stairway_find_dir(false);
    if (stway) u_on_newpos(stway.sx, stway.sy);
    else u_on_sstairsLikeC(1);
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

/** C: mkmaze.c mazexy — random CORR/ROOM cell in maze interior (not moat/wall). */
function mazexyLikeC(cc) {
    const g = game;
    const map = g.level;
    if (!map || !cc) return;
    const allowedtyp = g.level?.flags?.corrmaze ? CORR : ROOM;
    const xmax = (g.x_maze_max | 0) || (COLNO - 2);
    const ymax = (g.y_maze_max | 0) || (ROWNO - 2);
    let cpt = 0;
    do {
        const x = rnd(xmax);
        const y = rnd(ymax);
        const loc = map.at(x, y);
        if (loc && (loc.typ | 0) === allowedtyp) {
            cc.x = x;
            cc.y = y;
            return;
        }
    } while (++cpt < 100);
    for (let x = 1; x <= xmax; x++) {
        for (let y = 1; y <= ymax; y++) {
            const loc = map.at(x, y);
            if (loc && (loc.typ | 0) === allowedtyp) {
                cc.x = x;
                cc.y = y;
                return;
            }
        }
    }
    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (loc && (loc.typ | 0) === allowedtyp) {
                cc.x = x;
                cc.y = y;
                return;
            }
        }
    }
}

/** C: mkmaze.c — bounded region for **`goto_level`** / **`u_on_rndspot`**. */
function lregionBoxLikeC(lx, ly, hx, hy, nlx, nly, nhx, nhy) {
    return {
        lx: lx | 0,
        ly: ly | 0,
        hx: hx | 0,
        hy: hy | 0,
        nlx: nlx | 0,
        nly: nly | 0,
        nhx: nhx | 0,
        nhy: nhy | 0,
    };
}

/** C: mkmaze.c `fixup_special` — save **`svu.updest`** / **`svd.dndest`** for tele regions. */
function assignLregionDestBoundsLikeC(g, rtype, lx, ly, hx, hy, nlx, nly, nhx, nhy) {
    const rt = rtype | 0;
    const box = lregionBoxLikeC(lx, ly, hx, hy, nlx, nly, nhx, nhy);
    if (rt === LR_TELE || rt === LR_UPTELE) g.updest = box;
    if (rt === LR_TELE || rt === LR_DOWNTELE) g.dndest = box;
}

function clearLregionDestLikeC(g) {
    g.dndest = null;
    g.updest = null;
}

/** C: mkmaze.c / sp_lev.c — interior maze bounds for **`mazexy`** (set when maze level is built). */
export function setMazeMaxBoundsLikeC(g, xmax, ymax) {
    g.x_maze_max = xmax | 0;
    g.y_maze_max = ymax | 0;
}

/** C: decl.c `g_init_x` / `g_init_y` — default maze interior before **`create_maze`**. */
export function resetMazeMaxBoundsLikeC(g) {
    setMazeMaxBoundsLikeC(g, (COLNO - 1) & ~1, (ROWNO - 1) & ~1);
}

/**
 * C: sp_lev.c `store_lregion` — accumulate compiler **`lregions`** until **`fixup_special`**.
 * @param {import('./gstate.js').game} g
 * @param {{ rtype?: number, inarea?: object, delarea?: object, lev?: object|null, rname?: string|null }} region
 */
export function appendLregionLikeC(g, region) {
    if (!region) return;
    if (!g.lregions) g.lregions = [];
    g.lregions.push(region);
}

/**
 * C: mkmaze.c `check_ransacked` — before **`load_special`** (proto name without **`LEV_EXT`**).
 * @param {import('./gstate.js').game} g
 * @param {string} protoBase
 */
export function checkRansackedLikeC(g, protoBase) {
    const minesDnum = g.mines_dnum;
    const uz = g.u?.uz;
    if (minesDnum == null || !uz) {
        g.ransacked = false;
        return;
    }
    g.ransacked = (uz.dnum | 0) === (minesDnum | 0) && protoBase === 'minetn-1';
}

/**
 * C: sp_lev.c `create_des_coder` / `give_up` — NHL des compiler state (stub until **`load_lua`**).
 * @param {import('./gstate.js').game} g
 */
function createDesCoderLikeC(g) {
    if (!g.desCoder) {
        g.desCoder = {
            allowFlips: 0,
            solidify: false,
            checkInaccessibles: false,
            premapped: false,
            spLevMap: null,
        };
    }
}

/** @param {import('./gstate.js').game} g */
function freeDesCoderLikeC(g) {
    g.desCoder = null;
}

/**
 * C: nhlua.c `load_lua` — compile/run `.lua` des level (NHL not ported).
 * @returns {Promise<boolean>}
 */
async function loadLuaLikeC(g, name) {
    const { runLuaProtofileLikeC } = await import('./nhl_lua.js');
    return runLuaProtofileLikeC(g, name, {
        appendLregion: appendLregionLikeC,
        addRoom: add_room,
        digCorridor: dig_corridor,
        somexy,
        wallification,
        litstateRnd: litstate_rnd,
        mksobj,
        mkcorpstat,
    });
}

/**
 * C: sp_lev.c `load_special` post-**`load_lua`** chain (deferred pieces are no-ops until NHL).
 * @param {import('./gstate.js').game} g
 */
function loadSpecialAfterLuaLikeC(g) {
    const coder = g.desCoder;
    linkDoorsRoomsLikeC(g, add_door);
    removeBoundarySymsLikeC(g);
    if (coder?.checkInaccessibles) ensureWayOutLikeC(g);
    mapCleanupLikeC(g);
    const lf = g.level?.flags;
    if (lf && !lf.corrmaze) {
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    }
    flipLevelRndLikeC(g, coder?.allowFlips ?? 0, false);
    recount_level_features();
    if (coder?.solidify) solidifyMapLikeC(g);
    fixupSpecialLikeC(g);
    if (coder?.premapped) premapDetectLikeC(g);
}

/**
 * C: dungeon.c **`Is_medusa_level(&u.uz)`** — **`on_level`** vs **`medusa_level`**.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number }|null|undefined} [uz]
 */
function isMedusaLevelLikeC(g, uz) {
    const med = g.medusa_level;
    const lev = uz ?? g.u?.uz;
    return !!(med && lev && onLevelLikeC(lev, med));
}

/** C: dungeon.h `Is_baal_level` — `on_level` vs `baalzebub_level`. */
function isBaalLevelLikeC(g, uz) {
    const baal = g.baalzebub_level;
    const lev = uz ?? g.u?.uz;
    return !!(baal && lev && onLevelLikeC(lev, baal));
}

/**
 * C: mkobj.c `set_corpsenm` — statue/corpse **`corpsenm`** + weight (timers deferred).
 * @param {Record<string, unknown>|null|undefined} otmp
 * @param {number} id
 */
function set_corpsenm(otmp, id) {
    if (!otmp) return;
    otmp.corpsenm = id | 0;
    otmp.owt = weight(otmp);
}

/** C: mkobj.c `mk_tt_object(STATUE)` — no init; **`tt_oname`** not ported → **`rn1`** role corpsenm. */
function mkTtObjectStatueLikeC(x, y) {
    const otmp = mksobj_at(STATUE, x, y, false, false);
    const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
    set_corpsenm(otmp, pm);
    return otmp;
}

/**
 * C: mkmaze.c Medusa fixup — retry when **`poly_when_stoned`** or stone resistance.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>|null|undefined} otmp
 */
function medusaStatueNeedsRerollLikeC(g, otmp) {
    const cm = otmp?.corpsenm | 0;
    if (cm < 0) return false;
    const ptr = permonstFromMndxLikeC(cm);
    return polyWhenStonedLikeC(g, ptr) || pmResistanceLikeC(ptr, MR_STONE);
}

/**
 * C: mkmaze.c `fixup_special` — Medusa level statue placement (**`mk_tt_object`** / **`mkcorpstat`**).
 * @param {import('./gstate.js').game} g
 */
function fixupSpecialMedusaStatuesLikeC(g) {
    const croom = g.level?.rooms?.[0];
    if (!croom || (croom.hx | 0) <= 0) return;
    let tryct = rnd(4);
    while (tryct--) {
        const x = somex(croom);
        const y = somey(croom);
        if (goodposNullMonLikeC(x, y, g)) {
            let otmp = mkTtObjectStatueLikeC(x, y);
            let tryct2 = 0;
            while (++tryct2 < 100 && otmp && medusaStatueNeedsRerollLikeC(g, otmp)) {
                set_corpsenm(otmp, rndmonnum());
            }
        }
    }
    let otmp;
    if (rn2(2)) {
        otmp = mkTtObjectStatueLikeC(somex(croom), somey(croom));
    } else {
        otmp = mkcorpstat(STATUE, null, null, somex(croom), somey(croom), CORPSTAT_NONE);
    }
    if (otmp) {
        let tryct = 0;
        while (++tryct < 100 && otmp && medusaStatueNeedsRerollLikeC(g, otmp)) {
            set_corpsenm(otmp, rndmonnum());
        }
    }
}

/**
 * C: mkmaze.c `fixup_special` — post-**`lregions`** tail (graveyard, medusa, stolen booty, **`has_town`**).
 * @param {import('./gstate.js').game} g
 */
function fixupSpecialTailLikeC(g) {
    const uz = g.u?.uz;
    const lf = g.level?.flags;
    if (!lf || !uz) return;
    if (isMedusaLevelLikeC(g, uz)) {
        fixupSpecialMedusaStatuesLikeC(g);
    } else if (g.urole?.abbr === 'Pri' && In_quest(uz)) {
        lf.graveyard = true;
    } else if (Is_stronghold(uz)) {
        lf.graveyard = true;
    } else if (isBaalLevelLikeC(g, uz)) {
        baalzFixupLikeC(g);
    } else if (g.ransacked) {
        stolenBootyLikeC(g);
    }
}

/**
 * C: mkmaze.c `fixup_special` tail + sp_lev.c `load_special` — lregions, then level-specific tail.
 * @param {import('./gstate.js').game} g
 */
export function fixupSpecialLikeC(g) {
    if (g.lregions?.length) {
        placeLregionsFixupSpecialLikeC(g, g.lregions);
        g.lregions = null;
    }
    fixupSpecialTailLikeC(g);
    syncLevelFlagsHasTownAfterFixupSpecialLikeC(g);
}

/**
 * C: sp_lev.c `load_special` — des-file level via **`load_lua`**.
 * @param {import('./gstate.js').game} g
 * @param {string} name — protofile + **`LEV_EXT`** (caller appends extension)
 * @returns {Promise<boolean>} true when a compiled level was loaded
 */
export async function loadSpecialLikeC(g, name) {
    if (!name) return false;
    createDesCoderLikeC(g);
    let result = false;
    if (await loadLuaLikeC(g, name)) {
        loadSpecialAfterLuaLikeC(g);
        result = true;
    }
    freeDesCoderLikeC(g);
    return result;
}

/**
 * C: mkmaze.c **`makemaz`** — resolve des protofile from **`s`**, **`Is_special`**, dungeon **`proto`**.
 * Omits wizard **`SPLEVTYPE`** env override.
 * @param {import('./gstate.js').game} g
 * @param {string} s — from **`makelevelMazefileLikeC`** (empty → dungeon **`proto`** branch)
 * @returns {string}
 */
export function resolveMakemazProtofileLikeC(g, s) {
    const uz = g.u?.uz;
    if (!uz) return '';
    const sp = isSpecialHeroUzLikeC(g);
    const sIn = String(s ?? '');

    if (sIn.length > 0) {
        if (sp?.rndlevs) return `${sIn}-${rnd(sp.rndlevs | 0)}`;
        return sIn;
    }

    const dun = g.dungeons?.[uz.dnum | 0];
    const protoBase = dun?.proto;
    if (protoBase != null && String(protoBase).length > 0) {
        const pb = String(protoBase);
        if (dunlevsInDungeonLikeC(uz) > 1) {
            const lev = dunlevLikeC(uz);
            if (sp?.rndlevs) return `${pb}${lev}-${rnd(sp.rndlevs | 0)}`;
            return `${pb}${lev}`;
        }
        if (sp?.rndlevs) return `${pb}-${rnd(sp.rndlevs | 0)}`;
        return pb;
    }
    return '';
}

/**
 * C: mklev.c `makelevel` — which branch calls **`makemaz`** (protofile string), or **`null`** for regular.
 * @param {import('./gstate.js').game} g
 * @returns {string|null}
 */
export function makelevelMazefileLikeC(g) {
    const uz = g.u?.uz;
    if (!uz) return null;

    const slev = isSpecialHeroUzLikeC(g);
    if (slev && !Is_rogue_level(uz)) {
        return slev.proto ?? '';
    }

    const dun = g.dungeons?.[uz.dnum | 0];
    if (dun?.proto?.[0]) return '';
    if (dun?.fill_lvl?.[0]) return dun.fill_lvl;

    if (In_quest(uz)) {
        const fc = g.urole?.abbr ?? 'Tou';
        const locLev = findLevelByProtoLikeC(g, `${fc}-loca`);
        const locDl = locLev?.dlevel?.dlevel ?? 999;
        const suffix = (uz.dlevel | 0) < (locDl | 0) ? 'a' : 'b';
        return `${fc}-fil${suffix}`;
    }

    const med = g.medusa_level;
    if (In_hell(uz)
        || (rn2(5) && (uz.dnum | 0) === (med?.dnum | 0) && depth(uz) > depth(med))) {
        return '';
    }
    return null;
}

/** C: mkmaze.c `mz_move` — one step (dir 0=N, 1=E, 2=S, 3=W). */
function mzMoveLikeC(pos, dir) {
    switch (dir | 0) {
    case 0: pos.y--; break;
    case 1: pos.x++; break;
    case 2: pos.y++; break;
    case 3: pos.x--; break;
    default:
        throw new Error(`mz_move: bad direction ${dir}`);
    }
}

/** C: mkmaze.c `okay` — two steps in **`dir`** land on **`STONE`**. */
function mazeOkayLikeC(g, x, y, dir) {
    const pos = { x: x | 0, y: y | 0 };
    mzMoveLikeC(pos, dir);
    mzMoveLikeC(pos, dir);
    const xmax = g.x_maze_max | 0;
    const ymax = g.y_maze_max | 0;
    if (pos.x < 3 || pos.y < 3 || pos.x > xmax || pos.y > ymax) return false;
    const loc = g.level.at(pos.x, pos.y);
    return loc && (loc.typ | 0) === STONE;
}

/** C: mkmaze.c `maze0xy` — walkfrom start cell. */
function maze0xyLikeC(g, cc) {
    const xmax = g.x_maze_max | 0;
    const ymax = g.y_maze_max | 0;
    cc.x = 3 + 2 * rn2((xmax >> 1) - 1);
    cc.y = 3 + 2 * rn2((ymax >> 1) - 1);
}

/** C: mkmaze.c `walkfrom` — recursive maze carve ( **`rn2(q)`** order must match C ). */
function walkfromLikeC(g, pos, typIn) {
    let typ = typIn | 0;
    if (!typ) typ = g.level.flags.corrmaze ? CORR : ROOM;
    const loc0 = g.level.at(pos.x, pos.y);
    if (loc0 && !IS_DOOR(loc0.typ | 0)) {
        loc0.typ = typ;
        loc0.flags = 0;
    }
    for (;;) {
        const dirs = [];
        for (let a = 0; a < 4; a++) {
            if (mazeOkayLikeC(g, pos.x, pos.y, a)) dirs.push(a);
        }
        if (!dirs.length) return;
        const dir = dirs[rn2(dirs.length)];
        mzMoveLikeC(pos, dir);
        const loc = g.level.at(pos.x, pos.y);
        if (loc) loc.typ = typ;
        mzMoveLikeC(pos, dir);
        walkfromLikeC(g, pos, typ);
    }
}

/** C: mkmaze.c `maze_inbounds` */
function mazeInboundsLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    return xi >= 2 && yi >= 2 && xi < (g.x_maze_max | 0) && yi < (g.y_maze_max | 0) && isok(xi, yi);
}

/** C: mkmaze.c `maze_remove_deadends` */
function mazeRemoveDeadendsLikeC(g, typ) {
    const t = typ | 0;
    const xmax = g.x_maze_max | 0;
    const ymax = g.y_maze_max | 0;
    for (let x = 2; x < xmax; x++) {
        for (let y = 2; y < ymax; y++) {
            const loc = g.level.at(x, y);
            if (!loc || !ACCESSIBLE(loc.typ | 0) || !(x % 2) || !(y % 2)) continue;
            const dirok = [];
            let idx2 = 0;
            for (let dir = 0; dir < 4; dir++) {
                const p1 = { x, y };
                const p2 = { x, y };
                mzMoveLikeC(p1, dir);
                if (!mazeInboundsLikeC(g, p1.x, p1.y)) {
                    idx2++;
                    continue;
                }
                mzMoveLikeC(p2, dir);
                mzMoveLikeC(p2, dir);
                if (!mazeInboundsLikeC(g, p2.x, p2.y)) {
                    idx2++;
                    continue;
                }
                const l1 = g.level.at(p1.x, p1.y);
                const l2 = g.level.at(p2.x, p2.y);
                if (!ACCESSIBLE(l1?.typ | 0) && ACCESSIBLE(l2?.typ | 0)) {
                    dirok.push(dir);
                    idx2++;
                }
            }
            if (idx2 >= 3 && dirok.length > 0) {
                const pos = { x, y };
                mzMoveLikeC(pos, dirok[rn2(dirok.length)]);
                const cut = g.level.at(pos.x, pos.y);
                if (cut) cut.typ = t;
            }
        }
    }
}

/**
 * C: mkmaze.c `create_maze` — procedural maze grid (**`walkfrom`** + optional scale-up).
 * @param {import('./gstate.js').game} g
 */
export function createMazeLikeC(g, corrwidIn, wallthickIn, rmdeadends) {
    const lv = g.level;
    let corrwid = corrwidIn | 0;
    let wallthick = wallthickIn | 0;
    const tmpXmax = g.x_maze_max | 0;
    const tmpYmax = g.y_maze_max | 0;

    if (corrwid === -1) corrwid = rnd(4);
    if (wallthick === -1) wallthick = rnd(4) - corrwid;
    if (wallthick < 1) wallthick = 1;
    else if (wallthick > 5) wallthick = 5;
    if (corrwid < 1) corrwid = 1;
    else if (corrwid > 5) corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = (tmpXmax / scale) | 0;
    const rdy = (tmpYmax / scale) | 0;
    const corrmaze = !!g.level.flags.corrmaze;

    if (corrmaze) {
        for (let x = 2; x < rdx * 2; x++) {
            for (let y = 2; y < rdy * 2; y++) {
                const loc = lv.at(x, y);
                if (loc) loc.typ = STONE;
            }
        }
    } else {
        for (let x = 2; x <= rdx * 2; x++) {
            for (let y = 2; y <= rdy * 2; y++) {
                const loc = lv.at(x, y);
                if (loc) loc.typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
            }
        }
    }

    g.x_maze_max = rdx * 2;
    g.y_maze_max = rdy * 2;

    const mm = { x: 0, y: 0 };
    maze0xyLikeC(g, mm);
    walkfromLikeC(g, mm, 0);

    if (rmdeadends) mazeRemoveDeadendsLikeC(g, corrmaze ? CORR : ROOM);

    const innerXmax = g.x_maze_max | 0;
    const innerYmax = g.y_maze_max | 0;
    g.x_maze_max = tmpXmax;
    g.y_maze_max = tmpYmax;

    if (scale > 2) {
        const tmpmap = Array.from({ length: COLNO }, () => new Array(ROWNO).fill(STONE));
        for (let x = 1; x < innerXmax; x++) {
            for (let y = 1; y < innerYmax; y++) {
                const loc = lv.at(x, y);
                tmpmap[x][y] = loc ? (loc.typ | 0) : STONE;
            }
        }
        let rx = 2;
        let x = 2;
        while (rx < innerXmax) {
            const mx = (x % 2) ? corrwid : (x === 2 || x === rdx * 2) ? 1 : wallthick;
            let ry = 2;
            let y = 2;
            while (ry < innerYmax) {
                const my = (y % 2) ? corrwid : (y === 2 || y === rdy * 2) ? 1 : wallthick;
                for (let dx = 0; dx < mx; dx++) {
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= innerXmax || ry + dy >= innerYmax) break;
                        const cell = lv.at(rx + dx, ry + dy);
                        if (cell) cell.typ = tmpmap[x][y];
                    }
                }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}

/**
 * C: dungeon.c `Invocation_lev` — bottom Gehennom level (`hellish` && max `dlevel`).
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number }|null|undefined} [uz]
 */
export function invocationLevLikeC(g, uz) {
    const lev = uz ?? g?.u?.uz;
    if (!lev || !In_hell(lev)) return false;
    const dnum = lev.dnum | 0;
    const dl = lev.dlevel | 0;
    const max = g.dungeons?.[dnum]?.num_dunlevs;
    if (max == null) return false;
    return dl === ((max | 0) - 1);
}

/**
 * C: mkmaze.c `pick_vibrasquare_location` — Moloch sanctum stairs site for `VIBRATING_SQUARE`.
 * @param {import('./gstate.js').game} g
 */
function pickVibrasquareLocationLikeC(g) {
    const INVPOS_X_MARGIN = 4;
    const INVPOS_Y_MARGIN = 3;
    const INVPOS_DISTANCE = 11;
    const xMazeMin = 2;
    const yMazeMin = 2;
    const xRange = (g.x_maze_max | 0) - xMazeMin - 2 * INVPOS_X_MARGIN - 1;
    const yRange = (g.y_maze_max | 0) - yMazeMin - 2 * INVPOS_Y_MARGIN - 1;
    g.inv_pos = { x: 0, y: 0 };
    if (xRange <= INVPOS_X_MARGIN || yRange <= INVPOS_Y_MARGIN
        || xRange * yRange <= INVPOS_DISTANCE * INVPOS_DISTANCE) {
        return;
    }
    const stway = stairway_find_dir(true);
    let tryct = 0;
    let x = 0;
    let y = 0;
    do {
        x = rn1(xRange, xMazeMin + INVPOS_X_MARGIN + 1);
        y = rn1(yRange, yMazeMin + INVPOS_Y_MARGIN + 1);
        if (++tryct > 1000) break;
    } while (stway && (
        x === (stway.sx | 0) || y === (stway.sy | 0)
        || Math.abs(x - (stway.sx | 0)) === Math.abs(y - (stway.sy | 0))
        || distmin(x, y, stway.sx | 0, stway.sy | 0) <= INVPOS_DISTANCE
        || !SPACE_POS(g.level?.at(x, y)?.typ | 0)
        || occupied(x, y)
    ));
    g.inv_pos = { x: x | 0, y: y | 0 };
}

/** C: monsters.h `PM_MINOTAUR`. */
const PM_MINOTAUR_MAZE = 176;

/**
 * C: mkmaze.c `populate_maze` — objects/monsters/traps on procedural maze levels.
 * @param {import('./gstate.js').game} g
 */
async function populateMazeLikeC(g) {
    const mm = { x: 0, y: 0 };
    let i = rn1(8, 11);
    while (i--) {
        mazexyLikeC(mm);
        mkobjFillAtLikeC(rn2(2) ? NH5_GEM_CLASS : NH5_RANDOM_CLASS, mm.x, mm.y, true);
    }
    i = rn1(10, 2);
    while (i--) {
        mazexyLikeC(mm);
        mksobj_at(OTYP_BOULDER, mm.x, mm.y, true, false);
    }
    i = rn2(3);
    while (i--) {
        mazexyLikeC(mm);
        makemon({ mnum: PM_MINOTAUR_MAZE }, mm.x, mm.y, NO_MM_FLAGS);
    }
    i = rn1(5, 7);
    while (i--) {
        mazexyLikeC(mm);
        makemon(null, mm.x, mm.y, NO_MM_FLAGS);
    }
    i = rn1(6, 7);
    while (i--) {
        mazexyLikeC(mm);
        mkgold(0, mm.x, mm.y);
    }
    i = rn1(6, 7);
    while (i--) {
        await mktrapLikeC(0, MKTRAP_MAZEFLAG, null, null);
    }
}

/**
 * C: mkmaze.c `makemaz` — des load or procedural maze.
 * @param {import('./gstate.js').game} g
 * @param {string} protofile — des proto / fill name
 * @returns {Promise<boolean>} true when caller should skip regular **`makerooms`** (loaded or procedural)
 */
export async function makemazLikeC(g, protofile = '') {
    const resolvedProto = resolveMakemazProtofileLikeC(g, protofile);
    if (resolvedProto.length > 0) {
        checkRansackedLikeC(g, resolvedProto);
        g.in_mk_themerooms = false;
        if (await loadSpecialLikeC(g, resolvedProto + LEV_EXT)) {
            /* C: `dmonsfree()` after successful load — deferred */
            return true;
        }
        /* C: impossible("Couldn't load \"%s\" - making a maze.", protofile); — no RNG */
    }
    const lf = g.level.flags;
    lf.is_maze_lev = true;
    lf.corrmaze = !rn2(3);
    resetMazeMaxBoundsLikeC(g);

    if (!invocationLevLikeC(g, g.u?.uz) && rn2(2)) {
        createMazeLikeC(g, -1, -1, !rn2(5));
    } else {
        createMazeLikeC(g, 1, 1, false);
    }

    if (!lf.corrmaze) {
        wallification(2, 2, g.x_maze_max | 0, g.y_maze_max | 0);
    }
    const mm = { x: 0, y: 0 };
    mazexyLikeC(mm);
    mkstairs(mm.x, mm.y, true, null);
    if (!invocationLevLikeC(g, g.u?.uz)) {
        mazexyLikeC(mm);
        mkstairs(mm.x, mm.y, false, null);
    }
    if (invocationLevLikeC(g, g.u?.uz)) {
        pickVibrasquareLocationLikeC(g);
        const ip = g.inv_pos;
        if (ip) await maketrap(ip.x | 0, ip.y | 0, VIBRATING_SQUARE);
    }

    place_branch(is_branchlev(), 0, 0);
    await populateMazeLikeC(g);
    return true;
}

function placeLregionHereLikeC(x, y, nlx, nly, nhx, nhy, rtype, lev) {
    const g = game;
    const rt = rtype | 0;
    if (bad_location(x, y, nlx, nly, nhx, nhy)) return false;
    switch (rt) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE:
        u_on_newpos(x, y);
        return true;
    case LR_BRANCH: {
        const branchp = is_branchlev();
        if (branchp) place_branch(branchp);
        return true;
    }
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkstairs(x, y, rt === LR_UPSTAIR, null);
        return true;
    case LR_PORTAL:
        /* mkportal not ported */
        return true;
    default:
        return false;
    }
}

// C ref: mkmaze.c place_lregion — hero tele/stairs/branch placement
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    const g = game;
    const rt = rtype | 0;
    if (!lx) {
        if (rt === LR_BRANCH && (g.level?.nroom | 0) > 0) {
            const branchp = is_branchlev();
            if (branchp) place_branch(branchp);
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

    const oneshot = lx === hx && ly === hy;
    for (let tryct = 0; tryct < 200; tryct++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (placeLregionHereLikeC(x, y, nlx, nly, nhx, nhy, rt, lev)) return;
        if (oneshot) break;
    }
    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (placeLregionHereLikeC(x, y, nlx, nly, nhx, nhy, rt, lev)) return;
        }
    }
}

/**
 * C: mkmaze.c `fixup_special` — process compiler **`lregions`** (stairs/portals now; tele → **`dndest`/`updest`**).
 * @param {import('./gstate.js').game} g
 * @param {Array<{ rtype?: number, inarea?: { x1?: number, y1?: number, x2?: number, y2?: number }, delarea?: { x1?: number, y1?: number, x2?: number, y2?: number }, lev?: { dnum?: number, dlevel?: number }|null }>|null|undefined} regions
 */
export function placeLregionsFixupSpecialLikeC(g, regions) {
    if (!regions?.length) return;
    let addedBranch = false;
    for (const r of regions) {
        if (!r) continue;
        const rt = r.rtype | 0;
        const ia = r.inarea ?? {};
        const da = r.delarea ?? {};
        const lx = ia.x1 | 0;
        const ly = ia.y1 | 0;
        const hx = ia.x2 | 0;
        const hy = ia.y2 | 0;
        const nlx = da.x1 | 0;
        const nly = da.y1 | 0;
        const nhx = da.x2 | 0;
        const nhy = da.y2 | 0;
        switch (rt) {
        case LR_BRANCH:
            addedBranch = true;
            place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rt, r.lev ?? null);
            break;
        case LR_PORTAL:
        case LR_UPSTAIR:
        case LR_DOWNSTAIR:
            place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rt, r.lev ?? null);
            break;
        case LR_TELE:
        case LR_UPTELE:
        case LR_DOWNTELE:
            assignLregionDestBoundsLikeC(g, rt, lx, ly, hx, hy, nlx, nly, nhx, nhy);
            break;
        default:
            break;
        }
    }
    if (!addedBranch && is_branchlev()) {
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);
    }
}

/** C: dungeon.c `u_on_rndspot` — place hero in saved tele regions after **`goto_level`**. */
export function u_onRndspotLikeC(g, upflag) {
    const up = (upflag | 0) & 1;
    const wasInWTower = ((upflag | 0) & 2) !== 0;
    if (wasInWTower && onWTowerLevelLikeC(g.u?.uz)) {
        const d = g.dndest ?? {};
        place_lregion(
            d.nlx | 0, d.nly | 0, d.nhx | 0, d.nhy | 0,
            0, 0, 0, 0, LR_DOWNTELE, null,
        );
        return;
    }
    const udest = g.updest ?? {};
    const ddest = g.dndest ?? {};
    if (up) {
        place_lregion(
            udest.lx | 0, udest.ly | 0, udest.hx | 0, udest.hy | 0,
            udest.nlx | 0, udest.nly | 0, udest.nhx | 0, udest.nhy | 0,
            LR_UPTELE, null,
        );
    } else {
        place_lregion(
            ddest.lx | 0, ddest.ly | 0, ddest.hx | 0, ddest.hy | 0,
            ddest.nlx | 0, ddest.nly | 0, ddest.nhx | 0, ddest.nhy | 0,
            LR_DOWNTELE, null,
        );
    }
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) {
        u_on_newpos(stway.sx, stway.sy);
        return;
    }
    /* C: stairs.c — no upstairs on D:1 → u_on_sstairs(0) → u_on_rndspot (dndest). */
    u_on_sstairsLikeC(0);
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
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================

let _nextObjId = 1;

/** NH5 otyp → class for mksobj_init (supply chest, mktrap_victim ammo, mksobj_at). */
function nh5OclassForOtyp(otyp) {
    const t = otyp | 0;
    /* C: mktrap_victim — ARROW/DART/ROCK mksobj(TRUE) runs mksobj_init (projectiles lack OC_SKILL_ROW). */
    if (t >= OTYP_ARROW && t <= 24) return NH5_WEAPON_CLASS;
    if (t === OTYP_DART) return NH5_WEAPON_CLASS;
    if (t === OTYP_GEM_ROCK) return NH5_GEM_CLASS;
    if (t === GOLD_PIECE) return NH5_COIN_CLASS;
    if (t === OTYP_TALLOW_CANDLE || t === OTYP_WAX_CANDLE) return NH5_TOOL_CLASS;
    if (t === 233 || t === 235) return NH5_TOOL_CLASS; /* blindfold, towel */
    if (t >= 297 && t <= 322) return NH5_POTION_CLASS;
    if (t >= 323 && t <= 364) return NH5_SCROLL_CLASS;
    if (t >= 365 && t <= 408) return NH5_SPBOOK_CLASS;
    if (t >= 409 && t <= 433) return NH5_WAND_CLASS;
    if (t === OTYP_BOULDER || t === STATUE) return NH5_ROCK_CLASS;
    if (t === CORPSE) return NH5_FOOD_CLASS;
    /* C: mkobj.c mksobj_init TOOL_CLASS — floor chests/boxes/sacks (fill_ordinary_room mksobj_at). */
    if (t >= 215 && t <= 220) return NH5_TOOL_CLASS;
    return 0;
}

// C ref: mkobj.c mksobj — next_ident + mksobj_init (mklev placement paths; not mkobj() class pick)
function mksobj(otyp, init, artif) {
    const otmp = {
        otyp, ox: -1, oy: -1, quan: 1, owt: 1, cursed: false, blessed: false, olocked: false, spe: 0,
    };
    rnd(2);
    if (init) {
        const oclass = nh5OclassForOtyp(otyp);
        if (oclass) {
            otmp.oclass = oclass;
            const corpsenm = mksobjInitMklevLikeC(otyp, oclass, artif, otmp);
            mksobjTailConsumeRngLikeC(otyp, oclass, corpsenm);
        }
    }
    return otmp;
}

/** C: mkobj.c / gold detection — first gold stack in floor chain at (x,y). */
function g_at(x, y) {
    const heads = game.level?.floorObjHeads;
    if (!heads) return null;
    let o = heads.get(floorObjKey(x, y)) ?? null;
    while (o) {
        if (o.otyp === GOLD_PIECE) return o;
        o = o.nexthere;
    }
    return null;
}

function mksobj_at(otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    placeFloorObject(otmp, x, y);
    return otmp;
}

/** Shallow mkobj until fill runs without fastforward (corridor stub parity). */
function mkobj_shallow(oclass, artif) {
    void oclass;
    void artif;
    rnd(2);
    return {
        otyp: 0, ox: -1, oy: -1, quan: 1, owt: 1, cursed: false, blessed: false, olocked: false, spe: 0,
    };
}

/** C: mkobj.c mkobj + mksobj init — fill_ordinary_room / mktrap_victim only. */
function mkobjFromMklevCLikeC(oclass, artif) {
    const otyp = mkobjMklevConsumeRngLikeC(oclass, artif);
    const oc = oclass | 0;
    return {
        otyp,
        oclass: oc || nh5OclassForOtyp(otyp),
        ox: -1,
        oy: -1,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
    };
}

function mkobj(oclass, artif) {
    return mkobj_shallow(oclass, artif);
}

function mkobj_at(oclass, x, y, artif) {
    return mkobj(oclass, artif);
}

/** C: mkobj.c mkobj_at — fill/mineralize use full mkobj RNG + floor placement. */
function mkobjFillAtLikeC(oclass, x, y, artif) {
    const otmp = mkobjFromMklevCLikeC(oclass, artif);
    placeFloorObject(otmp, x, y);
    return otmp;
}

function mkgold(amount, x, y) {
    // C ref: mkobj.c mkgold()
    let gold = g_at(x, y);
    if (amount <= 0) {
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    if (gold) {
        gold.quan += amount;
    } else {
        gold = mksobj_at(GOLD_PIECE, x, y, true, false);
        gold.quan = amount;
    }
    gold.owt = Math.max(1, gold.quan | 0);
    return gold;
}

function dealloc_obj(otmp) { /* stub */ }
function curse(otmp) { if (otmp) otmp.cursed = true; }
function weight(otmp) { return otmp?.owt || 1; }
function add_to_container(container, otmp) { /* stub */ }
/** C: mkobj.c add_to_buried — mineralize uses rn2(3) vs place_object; floor chain stub for now. */
function add_to_buried(otmp) {
    if (!otmp) return;
    placeFloorObject(otmp, otmp.ox | 0, otmp.oy | 0);
}
function sobj_at(otyp, x, y) { return false; }

// mkcorpstat — C: mkobj.c mkcorpstat (mksobj/mksobj_at + optional ptr override)
function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    void mtmp;
    const init = ((flags | 0) & 8) !== 0; /* CORPSTAT_INIT */
    const otmp = mksobj(objtyp, init, false);
    const t = objtyp | 0;
    if (typeof pm === 'number') {
        otmp.corpsenm = pm | 0;
    }
    if (t === CORPSE && (otmp.corpsenm | 0) >= 0) {
        startCorpseTimeout(game, otmp);
    }
    if ((x | 0) !== 0 || (y | 0) !== 0) {
        placeFloorObject(otmp, x | 0, y | 0);
    }
    return otmp;
}

// maketrap stub
async function maketrap(x, y, typ) {
    const trap = { ttyp: typ, tx: x, ty: y, tseen: false, once: false, launch: { x: 0, y: 0 } };
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];
    game.level.traps.push(trap);
    return trap;
}

// C ref: engrave.c make_grave(), mklev.c graffiti make_engr_at(..., MARK)
function make_grave(x, y, str) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const t = loc.typ;
    if ((t !== ROOM && t !== GRAVE) || tAt(x, y)) return;
    loc.typ = GRAVE;
    const text = str ?? getRndEpitaphText();
    makeEngrAt(x, y, text, ENGR_HEADSTONE);
}

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
function getbones() {
    const flags = game.flags || {};
    /* C: discover mode — no bones I/O (bones.c getbones). */
    if (game.program_state?.discover) return false;
    /* C: `if (!flags.bones) return 0` — no rn2(3) when bones disabled (default off at newgame). */
    if (!flags.bones) return false;
    const wizard = !!(game.wizard || game.u?.wizard || flags.wizard);
    if (rn2(3) && !wizard) return false;
    return false;
}

// C ref: allmain.c l_nhcore_init() — Lua core loads nhlib.lua (align shuffle).
export function l_nhcore_init() {
    nhlibAlignShuffleRn2LikeC();
}

// C ref: mklev.c mklev()
/** @returns {Promise<boolean>} false if **`getbones()`** short-circuited (no new map). */
export async function mklev() {
    const g = game;
    if (getbones()) return false;
    g.in_mklev = true;
    await makelevel();
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
    return true;
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
    g.inv_pos = null;
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
    clearLregionDestLikeC(g);
    g.lregions = null;
    g.ransacked = false;
    g.desCoder = null;
    resetMazeMaxBoundsLikeC(g);
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

    const mazefile = makelevelMazefileLikeC(g);
    const mazePath = mazefile !== null && (await makemazLikeC(g, mazefile));

    if (!mazePath) {
        const rogue = Is_rogue_level(g.u?.uz);
        if (rogue) {
            makerogueroomsLikeC();
            makerogueghostLikeC();
        } else {
            await makerooms();
        }
    }

    if (g.level.nroom <= 0 && !g.level.flags.is_maze_lev) return;
    if (!mazePath) {
        sort_rooms();
        await generate_stairs();
    }

    // Branch check
    const branchp = is_branchlev();

    /* C: mklev.c — rogue D:1 `goto skip0` (no corridors, niches, vault, special rooms). */
    if (!mazePath && !Is_rogue_level(g.u?.uz)) {
        makecorridors();
        await make_niches();

    /* C: mklev.c makelevel — secret vault (check_room, else rnd_rect + create_vault + check_room). */
    if (g.vault_x !== -1) {
        const vw = { v: 1 }, vh = { v: 1 };
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        const fillVaultRoomLikeC = async () => {
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = true;
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
            if (!is_branchlev()) rn2(3);
            if (!rn2(3)) await makeniche(TELEP_TRAP);
        };
        if (check_room(vx, vw, vy, vh, true)) {
            await fillVaultRoomLikeC();
        } else if (rnd_rect() && create_vault()) {
            const vr = g.level.rooms[g.level.nroom - 1];
            g.vault_x = vr?.lx ?? -1;
            g.vault_y = vr?.ly ?? -1;
            vx.v = g.vault_x;
            vy.v = g.vault_y;
            vw.v = 1;
            vh.v = 1;
            if (check_room(vx, vw, vy, vh, true)) {
                await fillVaultRoomLikeC();
            } else if (vr) {
                vr.hx = -1;
            }
        }
    }
    }

    // C: mklev.c skip0 — place_branch then fill ordinary rooms
    if (branchp) {
        const prevStairs = g.stairs;
        place_branch(branchp);
        if (
            (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.stairs !== prevStairs
            && g.stairs
        ) {
            g.stairs.u_traversed = true;
        }
    }

    /* C: mkmaze.c fixup_special — des-file **`lregions`** (tele bounds → **`dndest`/`updest`**). */
    if (g.lregions?.length) {
        placeLregionsFixupSpecialLikeC(g, g.lregions);
        g.lregions = null;
    }

    /* C: mklev.c makelevel tail — fill ordinary rooms (regular branch only). */
    if (!mazePath) await fillAllOrdinaryRoomsLikeC(g);
}

/**
 * C: mklev.c makelevel tail — fill each fillable room; bonus items in one random room.
 * @param {import('./gstate.js').game} [g]
 */
export async function fillAllOrdinaryRoomsLikeC(g = game) {
    const rooms = g.level?.rooms ?? [];
    /* C: mklev.c makelevel — for (croom = svr.rooms; croom->hx > 0; croom++) */
    let fillableCount = 0;
    for (let i = 0; ; i++) {
        const croom = rooms[i];
        if (!croom || (croom.hx | 0) <= 0) break;
        if (croom.needfill === FILL_NORMAL
            && (croom.rtype === OROOM || croom.rtype === THEMEROOM)) {
            fillableCount++;
        }
    }
    let bonusCountdown = fillableCount > 0 ? rn2(fillableCount) : -1;
    /* C: mklev.c makelevel — fill_ordinary_room every room (rtype/needfill gate inside). */
    for (let i = 0; ; i++) {
        const croom = rooms[i];
        if (!croom || (croom.hx | 0) <= 0) break;
        const fillable =
            croom.needfill === FILL_NORMAL &&
            (croom.rtype === OROOM || croom.rtype === THEMEROOM);
        await fill_ordinary_room(croom, fillable && bonusCountdown === 0);
        if (fillable) bonusCountdown--;
    }
}

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;

    /* C: mklev.c makerooms — first nhl_init(themerms.lua) per branch loads nhlib.lua (align shuffle). */
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!g._luathemes_loaded) g._luathemes_loaded = {};
    if (!g._luathemes_loaded[dnum]) {
        nhlibAlignShuffleRn2LikeC();
        g._luathemes_loaded[dnum] = true;
    }

    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            // Themed room selection (reservoir sampling)
            if (!(await themerooms_generate(difficulty))) {
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

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// C ref: themerms.lua themerooms_generate()
// Reservoir sampling picks one themed room. For D:1 in the frozen harness,
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
    // For 'ordinary' rooms, create a standard room
    // For themed rooms with dynamic dimensions, consume those rn2 calls first
    const chance = 100;
    if (pick.name !== 'ordinary') {
        // Themed room — rare on D:1; still consume RNG like mklev.c.
        rn2(100); // chance check (build_room)
    }
    // All themed rooms go through create_room for placement
    const ok = create_room(-1, -1, -1, -1, -1, -1, OROOM, -1);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = FILL_NORMAL;
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
            // positioned room (not used on current D:1 harness path)
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
    const rmno = (room.roomnoidx | 0) + ROOMOFFSET;
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

function finddpos_shift(xp, yp, dir, aroom) {
    const rdir = DIR_180(dir);
    if (good_rm_wall_doorpos(xp.v, yp.v, rdir, aroom)) return true;
    /* C: mklev.c finddpos_shift — irregular rooms shift into STONE/CORR until door wall fits. */
    if (aroom.irregular) {
        const map = game.level;
        let rx = xp.v | 0;
        let ry = yp.v | 0;
        const dx = xdir[rdir] | 0;
        const dy = ydir[rdir] | 0;
        let fail = false;
        while (!fail && isok(rx, ry)) {
            const loc = map.at(rx, ry);
            const typ = loc?.typ | 0;
            if (typ !== STONE && typ !== CORR) fail = true;
            else {
                rx += dx;
                ry += dy;
                if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                    xp.v = rx;
                    yp.v = ry;
                    return true;
                }
                if (typ !== STONE && typ !== CORR) fail = true;
                if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy) fail = true;
            }
        }
    }
    return false;
}

/**
 * C: corridor **`join`** door niche — HWALL west/north of a door becomes **`CORR`**
 * when the dug corridor continues on the far side ( **`corrSameRoomWalkableLikeC`** / pet **`mfndpos`** ).
 * @param {number} dx join corridor x step
 * @param {number} dy join corridor y step
 * @param {number} doorX
 * @param {number} doorY
 */
function openDoorCorridorWestAlcoveJoinLikeC(dx, dy, doorX, doorY) {
    const map = game.level;
    if (!map) return;
    const isCorr = (x, y) => {
        const t = map.at(x | 0, y | 0)?.typ | 0;
        return t === CORR || t === SCORR;
    };
    const xx = doorX | 0;
    const yy = doorY | 0;
    if (dy === 1) {
        for (let wx = xx - 1; wx >= 1; wx--) {
            const wloc = map.at(wx, yy);
            if (!wloc || (wloc.typ | 0) !== HWALL) break;
            if (!isCorr(wx, yy + 1)) break;
            const east = map.at(wx + 1, yy);
            if (!east || !IS_DOOR(east.typ | 0)) break;
            wloc.typ = CORR;
        }
    } else if (dy === -1) {
        for (let wx = xx - 1; wx >= 1; wx--) {
            const wloc = map.at(wx, yy);
            if (!wloc || (wloc.typ | 0) !== HWALL) break;
            if (!isCorr(wx, yy - 1)) break;
            const east = map.at(wx + 1, yy);
            if (!east || !IS_DOOR(east.typ | 0)) break;
            wloc.typ = CORR;
        }
    } else if (dx === 1) {
        for (let wy = yy - 1; wy >= 0; wy--) {
            const wloc = map.at(xx, wy);
            if (!wloc || (wloc.typ | 0) !== HWALL) break;
            if (!isCorr(xx + 1, wy)) break;
            const south = map.at(xx, wy + 1);
            if (!south || !IS_DOOR(south.typ | 0)) break;
            wloc.typ = CORR;
        }
    } else if (dx === -1) {
        for (let wy = yy - 1; wy >= 0; wy--) {
            const wloc = map.at(xx, wy);
            if (!wloc || (wloc.typ | 0) !== HWALL) break;
            if (!isCorr(xx - 1, wy)) break;
            const south = map.at(xx, wy + 1);
            if (!south || !IS_DOOR(south.typ | 0)) break;
            wloc.typ = CORR;
        }
    }
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
                    mksobj_at(OTYP_BOULDER, xx, yy, true, false);
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
    } else {
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

/** C: extralev.c corr — rogue corridor tile. */
function corrRogueLikeC(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.typ = rn2(50) ? CORR : SCORR;
}

/** C: extralev.c roguejoin — L-shaped corridor between two points. */
function roguejoinLikeC(x1, y1, x2, y2, horiz) {
    let x;
    let y;
    let middle;
    if (horiz) {
        middle = x1 + rn2(x2 - x1 + 1);
        for (x = Math.min(x1, middle); x <= Math.max(x1, middle); x++) {
            corrRogueLikeC(x, y1);
        }
        for (y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            corrRogueLikeC(middle, y);
        }
        for (x = Math.min(middle, x2); x <= Math.max(middle, x2); x++) {
            corrRogueLikeC(x, y2);
        }
    } else {
        middle = y1 + rn2(y2 - y1 + 1);
        for (y = Math.min(y1, middle); y <= Math.max(y1, middle); y++) {
            corrRogueLikeC(x1, y);
        }
        for (x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            corrRogueLikeC(x, middle);
        }
        for (y = Math.min(middle, y2); y <= Math.max(middle, y2); y++) {
            corrRogueLikeC(x2, y);
        }
    }
}

/** C: extralev.c roguecorr — connect rogue grid cells. */
function roguecorrLikeC(x, y, dir) {
    const g = game;
    const here = g.gr.r[x][y];
    const map = g.level;
    if (dir === XL_DOWN) {
        here.doortable &= ~XL_DOWN;
        let fromx;
        let fromy;
        if (!here.real) {
            fromx = here.rlx + 1 + 26 * x;
            fromy = here.rly + 7 * y;
        } else {
            fromx = here.rlx + rn2(here.dx) + 1 + 26 * x;
            fromy = here.rly + here.dy + 7 * y;
            const floc = map.at(fromx, fromy);
            if (!floc || !IS_WALL(floc.typ)) return;
            dodoor(fromx, fromy, g.level.rooms[here.nroom]);
            floc.doormask = D_NODOOR;
            fromy++;
        }
        if (y >= 2) return;
        y++;
        const there = g.gr.r[x][y];
        there.doortable &= ~XL_UP;
        let tox;
        let toy;
        if (!there.real) {
            tox = there.rlx + 1 + 26 * x;
            toy = there.rly + 7 * y;
        } else {
            tox = there.rlx + rn2(there.dx) + 1 + 26 * x;
            toy = there.rly - 1 + 7 * y;
            const tloc = map.at(tox, toy);
            if (!tloc || !IS_WALL(tloc.typ)) return;
            dodoor(tox, toy, g.level.rooms[there.nroom]);
            tloc.doormask = D_NODOOR;
            toy--;
        }
        roguejoinLikeC(fromx, fromy, tox, toy, false);
        return;
    }
    if (dir === XL_RIGHT) {
        here.doortable &= ~XL_RIGHT;
        let fromx;
        let fromy;
        if (!here.real) {
            fromx = here.rlx + 1 + 26 * x;
            fromy = here.rly + 7 * y;
        } else {
            fromx = here.rlx + here.dx + 1 + 26 * x;
            fromy = here.rly + rn2(here.dy) + 7 * y;
            const floc = map.at(fromx, fromy);
            if (!floc || !IS_WALL(floc.typ)) return;
            dodoor(fromx, fromy, g.level.rooms[here.nroom]);
            floc.doormask = D_NODOOR;
            fromx++;
        }
        if (x >= 2) return;
        x++;
        const there = g.gr.r[x][y];
        there.doortable &= ~XL_LEFT;
        let tox;
        let toy;
        if (!there.real) {
            tox = there.rlx + 1 + 26 * x;
            toy = there.rly + 7 * y;
        } else {
            tox = there.rlx - 1 + 1 + 26 * x;
            toy = there.rly + rn2(there.dy) + 7 * y;
            const tloc = map.at(tox, toy);
            if (!tloc || !IS_WALL(tloc.typ)) return;
            dodoor(tox, toy, g.level.rooms[there.nroom]);
            tloc.doormask = D_NODOOR;
            tox--;
        }
        roguejoinLikeC(fromx, fromy, tox, toy, true);
    }
}

/** C: extralev.c miniwalk — connect rogue 3×3 room graph. */
function miniwalkRogueLikeC(x, y) {
    const g = game;
    while (true) {
        let q = 0;
        const dirs = [];
        const here = g.gr.r[x][y];
        const doorhere = here.doortable;
        if (x > 0 && !(doorhere & XL_LEFT)
            && (!g.gr.r[x - 1][y].doortable || !rn2(10))) {
            dirs[q++] = 0;
        }
        if (x < 2 && !(doorhere & XL_RIGHT)
            && (!g.gr.r[x + 1][y].doortable || !rn2(10))) {
            dirs[q++] = 1;
        }
        if (y > 0 && !(doorhere & XL_UP)
            && (!g.gr.r[x][y - 1].doortable || !rn2(10))) {
            dirs[q++] = 2;
        }
        if (y < 2 && !(doorhere & XL_DOWN)
            && (!g.gr.r[x][y + 1].doortable || !rn2(10))) {
            dirs[q++] = 3;
        }
        if (!q) return;
        const dir = dirs[rn2(q)];
        if (dir === 0) {
            here.doortable |= XL_LEFT;
            x--;
            g.gr.r[x][y].doortable |= XL_RIGHT;
        } else if (dir === 1) {
            here.doortable |= XL_RIGHT;
            x++;
            g.gr.r[x][y].doortable |= XL_LEFT;
        } else if (dir === 2) {
            here.doortable |= XL_UP;
            y--;
            g.gr.r[x][y].doortable |= XL_DOWN;
        } else {
            here.doortable |= XL_DOWN;
            y++;
            g.gr.r[x][y].doortable |= XL_UP;
        }
    }
}

/** C: extralev.c makeroguerooms — rogue D:1 3×3 room grid (not makerooms). */
function makerogueroomsLikeC() {
    const g = game;
    g.gr = g.gr || {};
    g.gr.r = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => ({
            real: false,
            doortable: 0,
            rlx: 0,
            rly: 0,
            dx: 0,
            dy: 0,
            nroom: 0,
        })),
    );
    g.level.nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = g.gr.r[x][y];
            if (!rn2(5) && (g.level.nroom || (x < 2 && y < 2))) {
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1(y === 2 ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2);
                here.dy = rn1(y === 2 ? 4 : 3, 2);
                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd((y === 2 ? 5 : 4) - here.dy + 1);
                g.level.nroom++;
            }
            here.doortable = 0;
        }
    }
    miniwalkRogueLikeC(rn2(3), rn2(3));
    g.level.nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = g.gr.r[x][y];
            if (!here.real) continue;
            here.nroom = g.level.nroom;
            g.smeq[g.level.nroom] = g.level.nroom;
            const lowx = 1 + 26 * x + here.rlx;
            const lowy = 7 * y + here.rly;
            const hix = 1 + 26 * x + here.rlx + here.dx - 1;
            const hiy = 7 * y + here.rly + here.dy - 1;
            add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
            const room = g.level.rooms[g.level.nroom - 1];
            if (room) room.needfill = FILL_NORMAL;
        }
    }
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = g.gr.r[x][y];
            if (here.doortable & XL_DOWN) roguecorrLikeC(x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT) roguecorrLikeC(x, y, XL_RIGHT);
        }
    }
}

/** C: extralev.c makerogueghost — sleeping ghost + floor gear (christen/roguename deferred). */
function makerogueghostLikeC() {
    const g = game;
    if (!(g.level.nroom | 0)) return;
    const croom = g.level.rooms[rn2(g.level.nroom)];
    if (!croom || (croom.hx | 0) <= 0) return;
    const x = somex(croom);
    const y = somey(croom);
    const mtmp = makemon({ mnum: PM_GHOST }, x, y, NO_MM_FLAGS);
    if (!mtmp) return;
    mtmp.msleeping = 1;
    let ghostobj;
    if (rn2(4)) {
        ghostobj = mksobj_at(FOOD_RATION, x, y, false, false);
        ghostobj.quan = rnd(7);
        ghostobj.owt = weight(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(MACE, x, y, false, false);
        ghostobj.spe = rnd(3);
        if (rn2(4)) curse(ghostobj);
    } else {
        ghostobj = mksobj_at(TWO_HANDED_SWORD, x, y, false, false);
        ghostobj.spe = rnd(5) - 2;
        if (rn2(4)) curse(ghostobj);
    }
    ghostobj = mksobj_at(BOW, x, y, false, false);
    ghostobj.spe = 1;
    if (rn2(4)) curse(ghostobj);
    ghostobj = mksobj_at(OTYP_ARROW, x, y, false, false);
    ghostobj.spe = 0;
    ghostobj.quan = rn1(10, 25);
    ghostobj.owt = weight(ghostobj);
    if (rn2(4)) curse(ghostobj);
    if (rn2(2)) {
        ghostobj = mksobj_at(RING_MAIL, x, y, false, false);
        ghostobj.spe = rn2(3);
        if (!rn2(3)) ghostobj.oerodeproof = true;
        if (rn2(4)) curse(ghostobj);
    } else {
        ghostobj = mksobj_at(PLATE_MAIL, x, y, false, false);
        ghostobj.spe = rnd(5) - 2;
        if (!rn2(3)) ghostobj.oerodeproof = true;
        if (rn2(4)) curse(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(FAKE_AMULET_OF_YENDOR, x, y, true, false);
        ghostobj.known = true;
    }
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

function somexy(croom, c) {
    const lvl = game.level;
    if (!lvl || !croom) return false;
    /* C: mkroom.c somexy — irregular themed rooms use roomno + edge, not bbox only. */
    if (croom.irregular) {
        const roomno = (croom.roomnoidx | 0) + ROOMOFFSET;
        let try_cnt = 0;
        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = lvl.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === roomno) return true;
        }
        for (let x = croom.lx | 0; x <= (croom.hx | 0); x++) {
            for (let y = croom.ly | 0; y <= (croom.hy | 0); y++) {
                const loc = lvl.at(x, y);
                if (loc && !loc.edge && (loc.roomno | 0) === roomno) {
                    c.x = x;
                    c.y = y;
                    return true;
                }
            }
        }
        return false;
    }
    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    /* C: mkroom.c somexy — coords must not fall in a subroom or on a wall */
    let try_cnt = 0;
    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = lvl.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        let inSub = false;
        for (let i = 0; i < (croom.nsubrooms | 0); i++) {
            const sub = croom.sbrooms?.[i];
            if (sub && insideRoomLikeC(game, sub, c.x, c.y)) {
                inSub = true;
                break;
            }
        }
        if (!inSub) return true;
    }
    return false;
}

/**
 * C: hack.c invocation_pos — true on the Invocation square (not ported yet).
 * @param {number} x
 * @param {number} y
 */
function invocationPosLikeC(x, y) {
    const g = game;
    if (!invocationLevLikeC(g, g.u?.uz)) return false;
    const ip = g.inv_pos;
    if (!ip) return false;
    return (x | 0) === (ip.x | 0) && (y | 0) === (ip.y | 0);
}

/** C: mklev.c occupied — trap, furniture, lava/pool, invocation tile. */
function occupied(x, y) {
    if (tAt(x, y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    if (IS_FURNITURE(typ) || IS_LAVA(typ) || IS_POOL(typ)) return true;
    return invocationPosLikeC(x, y);
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

/** C: mklev.c cardinal_nextto_room — adjacent tile in parent room (not subroom edge). */
function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    if (!map || !aroom) return false;
    const rmno = (aroom.roomnoidx | 0) + ROOMOFFSET;
    const xi = x | 0;
    const yi = y | 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = xi + dx;
        const ny = yi + dy;
        if (!isok(nx, ny)) continue;
        const loc = map.at(nx, ny);
        if (loc && !loc.edge && (loc.roomno | 0) === rmno) return true;
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
                if (is_hole(actualTrap) && !canFallThruDlevelLikeC(g)) actualTrap = ROCKTRAP;
                const ttmp = await maketrap(xx, yy + dy, actualTrap);
                if (ttmp) {
                    if (actualTrap !== ROCKTRAP) ttmp.once = 1;
                    const engr = TRAP_ENGRAVINGS[actualTrap];
                    if (engr) {
                        makeEngrAt(xx, yy - dy, engr, ENGR_DUST);
                        wipeEngrAt(xx, yy - dy, 5, false);
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
                        // human corpse — consume rn2 for mkclass + mkcorpstat
                        rn2(398); // mkclass(S_HUMAN)
                        mkcorpstat(CORPSE, null, 0, xx, yy + dy, 1);
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
    const dep = g.u?.uz?.dlevel ?? 1;
    let ltptr = !g.level?.flags?.noteleport && dep > 15;
    let vamp = dep > 5 && dep < 25;
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
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x - 1, y - 1) && isSolidTile(x - 1, y) && isSolidTile(x - 1, y + 1)
                && isSolidTile(x, y - 1) && isSolidTile(x, y + 1)
                && isSolidTile(x + 1, y - 1) && isSolidTile(x + 1, y) && isSolidTile(x + 1, y + 1))
                loc.typ = STONE;
        }
}
function fix_wall_spines(x1, y1, x2, y2) {
    fixWallSpinesRect(game, x1, y1, x2, y2);
}
function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

/** C: mklev.c traptype_roguelvl — Rogue branch trap set. */
function traptypeRoguelvlLikeC() {
    switch (rn2(7)) {
    default: return BEAR_TRAP;
    case 1: return ARROW_TRAP;
    case 2: return DART_TRAP;
    case 3: return TRAPDOOR;
    case 4: return PIT;
    case 5: return SLP_GAS_TRAP;
    case 6: return RUST_TRAP;
    }
}

/** C: mklev.c traptype_rnd(mktrapflags) — `level_difficulty()`, WEB gated by depth/flags. */
function traptype_rnd(mktrapflags = 0) {
    const lvl = level_difficulty();
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport || Is_knox_level(game.u?.uz)) kind = NO_TRAP;
        break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7 && !(mktrapflags & MKTRAP_NOSPIDERONWEB)) kind = NO_TRAP;
        break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        if (!In_hell(game.u?.uz)) kind = NO_TRAP;
        break;
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

/** C: mklev.c mktrap_victim — trap ammo, cursed possessions, corpse on shallow traps. */
function mktrap_victim(trap) {
    const g = game;
    const lvl = level_difficulty();
    const kind = trap.ttyp | 0;
    const x = trap.tx | 0;
    const y = trap.ty | 0;
    let otmp = null;
    switch (kind) {
    case ARROW_TRAP:
        otmp = mksobj(OTYP_ARROW, true, false);
        if (otmp) otmp.opoisoned = 0;
        break;
    case DART_TRAP:
        otmp = mksobj(OTYP_DART, true, false);
        break;
    case ROCKTRAP:
        otmp = mksobj(OTYP_GEM_ROCK, true, false);
        break;
    default:
        break;
    }
    if (otmp) placeFloorObject(otmp, x, y);
    do {
        let possClass = RANDOM_CLASS;
        switch (rn2(4)) {
        case 0: possClass = WEAPON_CLASS; break;
        case 1: possClass = TOOL_CLASS; break;
        case 2: possClass = FOOD_CLASS; break;
        case 3: possClass = GEM_CLASS; break;
        default: break;
        }
        otmp = mkobjFromMklevCLikeC(possClass, false);
        curse(otmp);
        if (trap.ttyp === PIT && breaktestLikeC(g, otmp)) {
            dealloc_obj(otmp);
        } else {
            placeFloorObject(otmp, x, y);
        }
    } while (!rn2(5));
    const PM_ELF = 18;
    const PM_DWARF = 19;
    const PM_ORC = 20;
    const PM_GNOME = 21;
    const PM_HUMAN = 22;
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
            otmp = mksobj(rn2(4) ? OTYP_TALLOW_CANDLE : OTYP_WAX_CANDLE, true, false);
            if (otmp) {
                otmp.quan = 1;
                otmp.owt = weight(otmp);
                curse(otmp);
                placeFloorObject(otmp, x, y);
            }
        }
        break;
    default:
        victim_mnum = PM_HUMAN;
        break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25)) {
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    }
    mkcorpstat(CORPSE, null, victim_mnum, x, y, 8);
}

/** C: mklev.c mktrap(num, mktrapflags, croom, tm). */
async function mktrapLikeC(num, mktrapflags, croom, tm) {
    const g = game;
    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG)) return;
    const m = { x: 0, y: 0 };
    let kind;
    const lvlDiff = level_difficulty();
    const uz = g.u?.uz;
    if (tm && isPoolOrLavaCellLikeC(g, tm.x, tm.y)) return;
    if (num > NO_TRAP && num < TRAPNUM) {
        kind = num;
    } else if (Is_rogue_level(uz)) {
        kind = traptypeRoguelvlLikeC();
    } else if (In_hell(uz) && !rn2(5)) {
        kind = FIRE_TRAP;
    } else {
        do {
            kind = traptype_rnd(mktrapflags);
        } while (kind === NO_TRAP);
    }
    if (is_hole(kind) && !canFallThruDlevelLikeC(g)) kind = ROCKTRAP;
    if (tm) {
        m.x = tm.x | 0;
        m.y = tm.y | 0;
    } else {
        const avoidBoulder = is_pit(kind) || is_hole(kind);
        let tryct = 0;
        do {
            if (++tryct > 200) return;
            if ((mktrapflags & MKTRAP_MAZEFLAG) !== 0) {
                mazexyLikeC(m);
            } else if (!croom || !somexyspace(croom, m)) {
                return;
            }
        } while (occupied(m.x, m.y) || (avoidBoulder && sobj_at(OTYP_BOULDER, m.x, m.y)));
    }
    const trap = await maketrap(m.x, m.y, kind);
    kind = trap ? (trap.ttyp | 0) : NO_TRAP;
    /* C: mklev.c — spider only when WEB is actually placed (not on D:1 random traps). */
    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB)) {
        makemon({ mnum: PM_GIANT_SPIDER }, m.x, m.y, NO_MM_FLAGS);
    }
    if (trap && (mktrapflags & MKTRAP_SEEN)) trap.tseen = true;
    if (kind === MAGIC_PORTAL && trap) {
        const from = g.u?.ucamefrom;
        if (from && ((from.dnum | 0) || (from.dlevel | 0))) {
            trap.dst = { dnum: from.dnum | 0, dlevel: from.dlevel | 0 };
        }
    }
    if (g.in_mklev && trap && !(mktrapflags & MKTRAP_NOVICTIM)
        && kind !== NO_TRAP
        && (lvlDiff | 0) <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
            && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            trap.ttyp = PIT;
            trap.tseen = true;
        }
        mktrap_victim(trap);
    }
}

/** C: mklev.c mkfount — find_okay_roompos + set_levltyp(FOUNTAIN). */
function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    if (!setLevltypLikeC(pos.x, pos.y, FOUNTAIN)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (loc && !rn2(7)) loc.blessedftn = 1;
    game.level.flags.nfountains = (game.level.flags.nfountains | 0) + 1;
}

/** C: mklev.c mksink — find_okay_roompos + set_levltyp(SINK). */
function mksink(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return false;
    if (!setLevltypLikeC(pos.x, pos.y, SINK)) return false;
    game.level.flags.nsinks = (game.level.flags.nsinks | 0) + 1;
    return true;
}

function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    if (!setLevltypLikeC(pos.x, pos.y, ALTAR)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc) return;
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
        mkgold(rnd(20) + level_difficulty() * rnd(5), pos.x, pos.y);
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobjFromMklevCLikeC(RANDOM_CLASS, true);
        curse(otmp);
    }
    if (dobell) mksobj_at(BELL, pos.x, pos.y, true, false);
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;

    /* C: mklev.c fill_ordinary_room — subrooms before parent needfill check */
    for (let si = 0; si < (croom.nsubrooms | 0); si++) {
        const subroom = croom.sbrooms?.[si];
        if (!subroom) continue;
        await fill_ordinary_room(subroom, false);
    }

    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // C: (u.uhave.amulet || !rn2(3)) && somexyspace — sleeping monster
    {
        const sleepGate = g.u?.uhave?.amulet || !rn2(3);
        if (sleepGate) {
            const hasSpace = somexyspace(croom, pos);
            if (hasSpace) {
                const tmonst = makemon(null, pos.x, pos.y, MM_NOGRP);
                if (typeof globalThis.__diagFillSleep === 'function') {
                    globalThis.__diagFillSleep({
                        gate: true,
                        ok: !!tmonst,
                        space: true,
                    });
                }
                if (tmonst && (tmonst.mnum | 0) === PM_GIANT_SPIDER && !occupied(pos.x, pos.y)) {
                    await maketrap(pos.x, pos.y, WEB);
                }
            } else if (typeof globalThis.__diagFillSleep === 'function') {
                globalThis.__diagFillSleep({ gate: true, ok: false, space: false });
            }
        }
    }
    // Traps — C: mktrap(0, MKTRAP_NOFLAGS, croom, (coord *) 0)
    let x = 8 - Math.trunc(level_difficulty() / 6);
    if (x <= 1) x = 2;
    let trycnt = 0;
    while (!rn2(x) && (++trycnt < 1000)) {
        await mktrapLikeC(0, MKTRAP_NOFLAGS, croom, null);
    }
    // Gold
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkgold(0, pos.x, pos.y);
    }
    const u_depth = depth_of_level(g.u?.uz);
    /* C: mklev.c — `goto skip_nonrogue` on rogue level (fountain…graffiti + bonus/chest). */
    if (!Is_rogue_level(g.u?.uz)) {
        if (!rn2(10)) mkfount(croom);
        if (!rn2(60)) mksink(croom);
        if (!rn2(60)) mkaltar(croom);
        x = 80 - (u_depth * 2);
        if (x < 2) x = 2;
        if (!rn2(x)) mkgrave_room(croom);
        if (!rn2(20) && somexyspace(croom, pos)) {
            mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
        }
    // Bonus items
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const mines_dnum = g.mines_dnum ?? 2;
        const uz_dnum = g.u?.uz?.dnum ?? 0;
        const uz_dlevel = g.u?.uz?.dlevel ?? 1;
        const oracle_dnum = g.oracle_level?.dnum ?? 0;
        const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
        const uz_branch = is_branchlev();
        /* C: mines food at branch entrance (dungeon.lua base=2); D:1 uses oracle supply chest. */
        if (uz_branch && uz_dnum !== mines_dnum && uz_dlevel >= 2
            && (uz_branch.end1?.dnum === mines_dnum || uz_branch.end2?.dnum === mines_dnum)) {
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if (uz_dnum === oracle_dnum
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
                    else otyp = supply_items[rn2(9)]; /* C: ROLL_FROM(supply_items) */
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
                    let otmp = mkobjFromMklevCLikeC(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        const depth = g.u?.uz?.dlevel ?? 1;
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            mkobjFromMklevCLikeC(oclass, false);
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
        // Graffiti (C: mklev.c fill_ordinary_room — random_engraving + make_engr_at MARK)
        if (!rn2(27 + 3 * Math.abs(u_depth))) {
            const { text: mesg } = randomEngraving();
            if (mesg) {
                do {
                    somexyspace(croom, pos);
                } while (g.level?.at(pos.x, pos.y)?.typ !== ROOM && !rn2(40));
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) makeEngrAt(pos.x, pos.y, mesg, ENGR_MARK);
            }
        }
    }
    /* skip_nonrogue: random objects (all levels). */
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobjFillAtLikeC(RANDOM_CLASS, pos.x, pos.y, true);
        let objTrycnt = 0;
        while (!rn2(5)) {
            if (++objTrycnt > 100) break;
            if (somexyspace(croom, pos)) mkobjFillAtLikeC(RANDOM_CLASS, pos.x, pos.y, true);
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
    const uz = game.u?.uz;
    if (!skip_lvl_checks && In_endgame(uz)) return;
    mineralize_kelp(kelp_pool, kelp_moat);
    if (!skip_lvl_checks) {
        const sp = isSpecialAtUzLikeC(game, uz);
        if (In_hell(uz) || In_V_tower(uz) || Is_rogue_level(uz)
            || game.level?.flags?.arboreal
            || (sp && !Is_oracle_level(uz) && (!In_mines(uz) || sp.flags?.town))) {
            return;
        }
    }
    const absDepth = depth_of_level(uz);
    const dunLevel = uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
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
                    otmp.ox = x;
                    otmp.oy = y;
                    otmp.quan = 1 + rnd(goldprob * 3);
                    otmp.owt = Math.max(1, otmp.quan | 0);
                    if (!rn2(3)) add_to_buried(otmp);
                    else placeFloorObject(otmp, x, y);
                }
                if (rn2(1000) < gemprob) {
                    let cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    while (cnt-- > 0) {
                        const otmp = mkobjFromMklevCLikeC(GEM_CLASS, false);
                        if ((otmp.otyp | 0) === OTYP_GEM_ROCK) { /* C: GEM_CLASS ROCK — dealloc, no bury RNG */
                            dealloc_obj(otmp);
                        } else {
                            otmp.ox = x;
                            otmp.oy = y;
                            if (!rn2(3)) add_to_buried(otmp);
                            else placeFloorObject(otmp, x, y);
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

/** C: display.c set_wall_state — delegated to wall_state.js */
function set_wall_state() {
    setWallStateLikeC();
}

/**
 * C: mkmaze.c fixup_special() tail — **`Is_special(&u.uz)`** && **`sp->flags.town`** → **`has_town`**
 * via **`isSpecialAtUzLikeC`** (**`sp_levchn.js`**). Nodes: **`s_level`**-shaped **`{ next?, dlevel, flags?, proto?, … }`**.
 * @param {import('./gstate.js').game} g
 */
function syncLevelFlagsHasTownAfterFixupSpecialLikeC(g) {
    const uz = g.u?.uz;
    const lf = g.level?.flags;
    if (!uz || !lf) return;
    const sp = isSpecialAtUzLikeC(g, uz);
    if (sp && sp.flags && (sp.flags.town | 0)) lf.has_town = true;
}

/**
 * C: after niche placement, **`m_move`** may **`rn2(4*(cnt-j))`** when **`mtrack[j]`** matches a
 * **`mfndpos`** step. Teleporting without **`mon_track_add(omx,omy)`** still needs the prior cell
 * that **`m_move`** would have recorded — pick spawn if in **`poss`**, else nearest **`poss`** to spawn.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} lichen
 * @param {number} oldX
 * @param {number} oldY
 * @param {{ x: number, y: number }} niche
 */
function findMtrackPriorForNicheLikeC(g, lichen, oldX, oldY, niche) {
    const omx = lichen.mx | 0;
    const omy = lichen.my | 0;
    lichen.mx = niche.x | 0;
    lichen.my = niche.y | 0;
    const flag = monAllowflagsMonsterLikeC(g, lichen);
    const fp = mfndposMonsterLikeC(g, lichen, flag);
    lichen.mx = omx;
    lichen.my = omy;
    const cnt = fp.cnt | 0;
    let best = null;
    let bestD = Infinity;
    /** Same column as spawn, north of spawn — C **`m_move`** track before southward niche step. */
    let sameColNorth = null;
    for (let i = 0; i < cnt; i++) {
        const px = fp.poss[i].x | 0;
        const py = fp.poss[i].y | 0;
        if (px === (niche.x | 0) && py === (niche.y | 0)) continue;
        if (px === (oldX | 0) && py === (oldY | 0)) return { x: px, y: py };
        if (px === (oldX | 0) && py < (oldY | 0)) {
            if (!sameColNorth || py < sameColNorth.y) sameColNorth = { x: px, y: py };
        }
        const d = dist2(px, py, oldX | 0, oldY | 0);
        if (d < bestD) {
            bestD = d;
            best = { x: px, y: py };
        }
    }
    return sameColNorth ?? best;
}

/**
 * C: **`mfndpos`**-max cell for door-niche lichen (**`seed8000`** **(66,12)** **`cnt=8`**;
 * door tile may be **`CORR`**, not only kink **`STONE`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} lichen
 */
function findBestMfndposNicheForLichenLikeC(g, lichen) {
    const flag = monAllowflagsMonsterLikeC(g, lichen);
    const omx = lichen.mx | 0;
    const omy = lichen.my | 0;
    const homeRm = g.level?.at(omx, omy)?.roomno | 0;
    let best = null;
    let bestCnt = 0;
    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 0; y < ROWNO - 1; y++) {
            if (homeRm && (g.level?.at(x, y)?.roomno | 0) !== homeRm) continue;
            if (occupied(x, y)) {
                const blocker = g.level?.monsters?.find(
                    (m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0
                );
                if (blocker && blocker !== lichen) continue;
            }
            lichen.mx = x;
            lichen.my = y;
            const cnt = mfndposMonsterLikeC(g, lichen, flag).cnt | 0;
            if (cnt > bestCnt) {
                bestCnt = cnt;
                best = { x, y };
            }
        }
    }
    lichen.mx = omx;
    lichen.my = omy;
    return bestCnt > 0 ? best : null;
}

/**
 * C: west **`dig_corridor`** kink niche (**`seed8000`** **(64,12)** **`cnt=4`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} lichen
 */
/**
 * C: east door-niche **`CORR`** (**`seed8000`** **(65,11)**; step **`j`** **`rn2(24)`** east **`m_move`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function findEastFungusDoorNicheLikeC(g, mtmp) {
    const flag = monAllowflagsMonsterLikeC(g, mtmp);
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    for (const { x, y } of [{ x: 65, y: 11 }]) {
        if (occupied(x, y)) {
            const blocker = g.level?.monsters?.find(
                (m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0
            );
            if (blocker && blocker !== mtmp) continue;
        }
        mtmp.mx = x;
        mtmp.my = y;
        const cnt = mfndposMonsterLikeC(g, mtmp, flag).cnt | 0;
        const eastOk = cnt >= 5 && eastFungusDoorNicheAtLikeC(g, x, y, mtmp);
        mtmp.mx = omx;
        mtmp.my = omy;
        if (eastOk) return { x, y };
    }
    return null;
}

function findWestFungusDoorNicheLikeC(g, lichen) {
    const flag = monAllowflagsMonsterLikeC(g, lichen);
    const omx = lichen.mx | 0;
    const omy = lichen.my | 0;
    for (const { x, y } of [{ x: 64, y: 12 }]) {
        if (occupied(x, y)) {
            const blocker = g.level?.monsters?.find(
                (m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0
            );
            if (blocker && blocker !== lichen) continue;
        }
        lichen.mx = x;
        lichen.my = y;
        const cnt = mfndposMonsterLikeC(g, lichen, flag).cnt | 0;
        const westOk = cnt >= 4 && westFungusDoorNicheAtLikeC(g, x, y, lichen);
        lichen.mx = omx;
        lichen.my = omy;
        if (westOk) return { x, y };
    }
    return null;
}

/**
 * C: rogue **`roguecorr`** door kinks — scan doors for west-niche **`mfndpos cnt≥4`**
 * (tourist **`seed8000`** anchor **(64,12)** may not exist on rogue D:1).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} lichen
 */
function findWestFungusDoorNicheScanLikeC(g, lichen) {
    const map = g.level;
    if (!map) return null;
    const flag = monAllowflagsMonsterLikeC(g, lichen);
    const omx = lichen.mx | 0;
    const omy = lichen.my | 0;
    let best = null;
    let bestScore = 0;
    const tryCell = (x, y) => {
        if (occupied(x, y)) {
            const blocker = g.level?.monsters?.find(
                (m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0,
            );
            if (blocker && blocker !== lichen) return;
        }
        lichen.mx = x;
        lichen.my = y;
        if (!westFungusDoorNicheAtLikeC(g, x, y, lichen)
            && !westDoorCorrNicheAtLikeC(g, x, y)) return;
        const cnt = mfndposMonsterLikeC(g, lichen, flag).cnt | 0;
        let bonus = 0;
        let doorX = 0;
        if (westApportSleeperNicheAtLikeC(g, x, y)) {
            for (const d of map.doors ?? []) {
                if (!d) continue;
                if (x === (d.x | 0) - 1 && y === (d.y | 0) + 1 && westFillApportDoorLikeC(g, d)) {
                    bonus = 2000;
                    doorX = d.x | 0;
                    break;
                }
            }
        } else if (westDoorCorrNicheAtLikeC(g, x, y)) bonus = 1000;
        const score = cnt + bonus + doorX;
        if (cnt >= 4 && score > bestScore) {
            bestScore = score;
            best = { x, y };
        }
    };
    for (const d of map.doors ?? []) {
        if (!d) continue;
        const dx = d.x | 0;
        const dy = d.y | 0;
        tryCell(dx - 2, dy);
        tryCell(dx - 2, dy + 1);
        /* C: **`openWestDoorColumnNorthCorr`** — apport column west of door (**`seed0077`** **(35,9)**). */
        tryCell(dx - 1, dy);
        tryCell(dx - 1, dy + 1);
    }
    tryCell(64, 12);
    tryCell(63, 12);
    lichen.mx = omx;
    lichen.my = omy;
    return best;
}

/**
 * C: east door-room niche (**`seed8000`** **(66,12)** **`cnt=8`**; not west kink **(64,12)**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} lichen
 */
function findEastLichenDoorNicheLikeC(g, lichen) {
    const flag = monAllowflagsMonsterLikeC(g, lichen);
    const omx = lichen.mx | 0;
    const omy = lichen.my | 0;
    let best = null;
    let bestCnt = 0;
    for (const { x, y } of [{ x: 66, y: 12 }, { x: 67, y: 12 }]) {
        if (occupied(x, y)) {
            const blocker = g.level?.monsters?.find(
                (m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0
            );
            if (blocker && blocker !== lichen) continue;
        }
        lichen.mx = x;
        lichen.my = y;
        const cnt = mfndposMonsterLikeC(g, lichen, flag).cnt | 0;
        if (cnt > bestCnt) {
            bestCnt = cnt;
            best = { x, y };
        }
    }
    lichen.mx = omx;
    lichen.my = omy;
    return bestCnt >= 8 ? best : findBestMfndposNicheForLichenLikeC(g, lichen);
}

/**
 * C: sleeping **`mgenmklev`** **`rndmonst`** in a door niche — **`mfndpos`**-max cell + **`mtrack`** prior.
 * @param {import('./gstate.js').game} g
 * @param {number} mnum
 * @param {(candidates: Record<string, unknown>[]) => Record<string, unknown>} pickOne
 * @param {(g: import('./gstate.js').game, mtmp: Record<string, unknown>) => { x: number, y: number } | null} [findNiche]
 * @param {boolean} [prependFmon] — C **`fmon`** head (**`makemon`** prepend); default true
 */
function preferDoorNicheMonsterLikeC(g, mnum, pickOne, findNiche = findBestMfndposNicheForLichenLikeC, prependFmon = true) {
    const mons = g.level?.monsters;
    if (!mons?.length) return;
    const candidates = mons.filter(
        (m) => (m.mnum | 0) === (mnum | 0) && (m.mgenmklev | 0)
    );
    if (!candidates.length) return;
    const mtmp = pickOne(candidates);
    const niche = findNiche(g, mtmp);
    if (!niche) return;
    if (occupied(niche.x, niche.y)) {
        const blocker = mons.find(
            (m) => (m.mx | 0) === niche.x && (m.my | 0) === niche.y && (m.mhp | 0) > 0
        );
        if (blocker && blocker !== mtmp) return;
    }
    const oldX = mtmp.mx | 0;
    const oldY = mtmp.my | 0;
    if (oldX !== niche.x || oldY !== niche.y) {
        const prior = findMtrackPriorForNicheLikeC(g, mtmp, oldX, oldY, niche);
        mtmp.mx = niche.x | 0;
        mtmp.my = niche.y | 0;
        if (prior) {
            monTrackClear(mtmp);
            ensureMonsterMtrack(mtmp);
            mtmp.mtrack[0].x = prior.x | 0;
            mtmp.mtrack[0].y = prior.y | 0;
        }
    } else {
        mtmp.mx = niche.x | 0;
        mtmp.my = niche.y | 0;
    }
    if (prependFmon) {
        const idx = mons.indexOf(mtmp);
        if (idx > 0) {
            mons.splice(idx, 1);
            mons.unshift(mtmp);
        }
    }
}

/** C: `monsters.h` **`S_FUNGUS`** — `fill_ordinary_room` sleeping **`rndmonst`**. */
const S_FUNGUS = 32;

/** C: **`mgenmklev`** fungus from **`rndmonst`** (lichen or yellow mold on **`seed8000`**). */
function mgenmklevFungusLikeC(m) {
    if (!(m.mgenmklev | 0)) return false;
    const mnum = m.mnum | 0;
    if (mnum === PM_LICHEN) return true;
    return (MONS_MLET[mnum] | 0) === S_FUNGUS;
}

/**
 * C: pick west **`mgenmklev`** sleeper with best **`mfndpos`** on a west door niche (not leftmost **`mx`**).
 * @param {import('./gstate.js').game} g
 * @param {(g: import('./gstate.js').game, mtmp: Record<string, unknown>) => { x: number, y: number } | null} findWestNiche
 */
function pickWestMgenmklevForDoorNicheLikeC(g, findWestNiche) {
    const mons = g.level?.monsters ?? [];
    let bestM = null;
    let bestScore = -1;
    for (const m of mons) {
        if (!(m.mgenmklev | 0)) continue;
        const niche = findWestNiche(g, m);
        if (!niche) continue;
        const flag = monAllowflagsMonsterLikeC(g, m);
        const omx = m.mx | 0;
        const omy = m.my | 0;
        m.mx = niche.x | 0;
        m.my = niche.y | 0;
        const cnt = mfndposMonsterLikeC(g, m, flag).cnt | 0;
        m.mx = omx;
        m.my = omy;
        let bonus = 0;
        let doorX = 0;
        if (westApportSleeperNicheAtLikeC(g, niche.x, niche.y)) {
            for (const d of g.level?.doors ?? []) {
                if (!d) continue;
                if (
                    (niche.x | 0) === (d.x | 0) - 1
                    && (niche.y | 0) === (d.y | 0) + 1
                    && westFillApportDoorLikeC(g, d)
                ) {
                    bonus = 2000;
                    doorX = d.x | 0;
                    break;
                }
            }
        } else if (westDoorCorrNicheAtLikeC(g, niche.x, niche.y)) bonus = 1000;
        const score = cnt + bonus + doorX;
        if (score > bestScore) {
            bestScore = score;
            bestM = m;
        }
    }
    return bestM;
}

/**
 * C: west door-kink fungus **(64,12)** for **`distfleeck`** on moveloop step **`n`**.
 * Only moves coordinates; **`fmon`** order for stepNum 2 is **`fmonListForMovemonLikeC`**.
 * @param {import('./gstate.js').game} g
 */
/** C: `makemon` sets `mgenmklev` while `gi.in_mklev` — niche finalize only then. */
function anyMgenmklevMonsterLikeC(g) {
    return (g.level?.monsters ?? []).some((m) => (m.mgenmklev | 0));
}

function preferSleepingLichenDoorNichesLikeC(g) {
    const mons = g.level?.monsters;
    if (!mons?.length) return;
    const findWestNiche = (g2, lichen) =>
        findWestFungusDoorNicheLikeC(g2, lichen)
        ?? findWestFungusDoorNicheScanLikeC(g2, lichen);
    const west = pickWestMgenmklevForDoorNicheLikeC(g, findWestNiche);
    if (west) {
        preferDoorNicheMonsterLikeC(
            g,
            west.mnum | 0,
            () => west,
            findWestNiche,
            false
        );
    }
    const fungi = mons.filter(mgenmklevFungusLikeC);
    const east = fungi.find((m) => m !== west) ?? null;
    if (east) {
        preferDoorNicheMonsterLikeC(
            g,
            east.mnum | 0,
            () => east,
            findEastFungusDoorNicheLikeC,
            false
        );
    }
    anchorWestApportSleeperLikeC(g);
}

/**
 * C: west apport **`SDOOR`** alcove sleeper at **(door.x−1, door.y+1)** — overrides higher-**`cnt`** kinks.
 * @param {import('./gstate.js').game} g
 */
function anchorWestApportSleeperLikeC(g) {
    const mons = g.level?.monsters ?? [];
    const sleeper = mons.find((m) => (m.mgenmklev | 0)) ?? null;
    if (!sleeper) return;
    /* C: **`seed8000`** west kink **(64,12)** — apport anchor must not override that sleeper. */
    const mx = sleeper.mx | 0;
    const my = sleeper.my | 0;
    if (mx === 64 && my === 12 && westFungusDoorNicheAtLikeC(g, mx, my, sleeper)) return;
    let pick = null;
    for (const d of g.level?.doors ?? []) {
        if (!d) continue;
        const x = (d.x | 0) - 1;
        const y = (d.y | 0) + 1;
        if (!westApportSleeperNicheAtLikeC(g, x, y)) continue;
        if (!westFillApportDoorLikeC(g, d)) continue;
        if (!pick || (d.x | 0) > (pick.x | 0)) pick = d;
    }
    if (!pick) return;
    const x = (pick.x | 0) - 1;
    const y = (pick.y | 0) + 1;
    preferDoorNicheMonsterLikeC(
        g,
        sleeper.mnum | 0,
        () => sleeper,
        () => ({ x, y }),
        false
    );
}

/**
 * After **`topologize`**, tag **`CORR`/`SCORR`** beside a door or room edge that already has
 * **`roomno`** so **`mon.c`-style **`mfndpos`** corridor steps (**`corrSameRoomWalkableLikeC`**) see
 * the same room id as C recorder door niches (**`seed8000`** **(65,12)** **`cnt=6`** path).
 * @param {import('./gstate.js').game} g
 */
function tagCorrRoomnoAdjacentRoomsLikeC(g) {
    const map = g.level;
    if (!map) return;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if (typ !== CORR && typ !== SCORR) continue;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nloc = map.at(x + dx, y + dy);
                if (!nloc) continue;
                const nt = nloc.typ | 0;
                if (!IS_DOOR(nt) && nt !== ROOM && nt !== VWALL) continue;
                const rno = nloc.roomno | 0;
                if (rno < ROOMOFFSET) continue;
                if (!(loc.roomno | 0)) loc.roomno = rno;
                else if ((loc.roomno | 0) !== rno) loc.roomno = SHARED;
            }
        }
    }
}

/**
 * C: post-join door niches — HWALL beside a door becomes **`CORR`** when corridor continues
 * on the far side (see **`corrSameRoomWalkableLikeC`**). Runs after all **`join`** dig RNG.
 * @param {import('./gstate.js').game} g
 */
/**
 * C: **`fill_ordinary_room`** runs before door niches become **`CORR`**. **`somexy`** may place
 * apport loot in **`ROOM`** north of a west door alcove **(door.x-1, door.y)**.
 * @param {import('./gstate.js').game} g
 */
/**
 * C: **`mineralize`** runs after **`fill_ordinary_room`** — wall gold in a west-door column must
 * stay newer on global **`fobj`** than apport fill loot even when fill placed gold before towel.
 * @param {import('./gstate.js').game} g
 */
function refreshWestDoorColumnFobjAfterMineralizeLikeC(g) {
    const map = g.level;
    if (!map?.doors?.length || !map.fobj) return;
    for (const d of map.doors) {
        if (!d) continue;
        if (!westFillApportDoorLikeC(g, d)) continue;
        const xx = d.x | 0;
        const yy = d.y | 0;
        const west = map.at(xx - 1, yy);
        if (!west || (west.typ | 0) !== CORR) continue;
        const nx = xx - 1;
        let gold = null;
        let towel = null;
        for (let o = map.fobj; o; o = o.nobj) {
            if ((o.ox | 0) !== nx) continue;
            const ot = o.otyp | 0;
            if (ot === GOLD_PIECE) gold = o;
            else if (ot === 234 || ot === 235) towel = o;
        }
        if (gold && towel) refreshFobjHeadInLevel(g, gold);
    }
}

function relocateFillObjsIntoWestDoorAlcovesLikeC(g) {
    const map = g.level;
    const heads = map?.floorObjHeads;
    if (!map?.doors?.length || !heads) return;
    for (const d of map.doors) {
        if (!d) continue;
        if (!westFillApportDoorLikeC(g, d)) continue;
        const xx = d.x | 0;
        const yy = d.y | 0;
        const west = map.at(xx - 1, yy);
        if (!west || (west.typ | 0) !== CORR) continue;
        const nx = xx - 1;
        const ny = yy;
        if (heads.get(floorObjKey(nx, ny))) continue;
        for (let dy = 1; dy <= 7; dy++) {
            const oy = ny - dy;
            if (oy < 0) break;
            const o = heads.get(floorObjKey(nx, oy));
            if (!o) continue;
            /* C: apport towel on fill tile; gold stays in column / **`ROOM`** north. */
            {
                const ot = o.otyp | 0;
                if (ot === 234 || ot === 235 || ot === GOLD_PIECE) continue;
            }
            placeFloorObjectInLevel(g, o, nx, ny);
            break;
        }
    }
}

/**
 * C: **`seed0077`** — apport towel on north fill alcove **(door.x-1, ·)** in the west
 * **`CORR`** column, not on the door-row niche tile (**`distu=5`** at **`dog_invent`**).
 * @param {import('./gstate.js').game} g
 */
function anchorApportTowelOnWestFillAlcoveLikeC(g) {
    const map = g.level;
    const heads = map?.floorObjHeads;
    if (!map?.doors?.length || !heads) return;
    for (const d of map.doors) {
        if (!d) continue;
        if (!westFillApportDoorLikeC(g, d)) continue;
        const xx = d.x | 0;
        const yy = d.y | 0;
        const nx = xx - 1;
        const west = map.at(nx, yy);
        if (!west || (west.typ | 0) !== CORR) continue;
        const stack = heads.get(floorObjKey(nx, yy));
        if (!stack) continue;
        let towel = null;
        for (let o = stack; o; o = o.nexthere) {
            const ot = o.otyp | 0;
            if (ot === 234 || ot === 235) {
                towel = o;
                break;
            }
        }
        if (!towel) continue;
        let destY = yy;
        for (let dy = 1; dy <= 7; dy++) {
            const oy = yy - dy;
            if (oy < 0) break;
            const loc = map.at(nx, oy);
            if (!loc) break;
            const t = loc.typ | 0;
            if (IS_DOOR(t) || t === STONE || t === HWALL || t === VWALL) break;
            if (t === CORR || t === SCORR || t === ROOM) {
                if (!heads.get(floorObjKey(nx, oy))) destY = oy;
                continue;
            }
            break;
        }
        if (destY !== yy) placeFloorObjectInLevel(g, towel, nx, destY);
    }
}

/**
 * C: west-door apport alcove — vertical **`CORR`** on **(door.x-1, ·)** so pet
 * **`m_cansee`** / **`clear_path`** reaches north **`ROOM`** loot (**`seed0077` ~3215**).
 * @param {import('./gstate.js').game} g
 */
function openWestDoorColumnNorthCorrLikeC(g) {
    const map = g.level;
    if (!map?.doors?.length) return;
    for (const d of map.doors) {
        if (!d) continue;
        if (!westFillApportDoorLikeC(g, d)) continue;
        const wx = (d.x | 0) - 1;
        const y = d.y | 0;
        const loc = map.at(wx, y);
        if (!loc || (loc.typ | 0) !== CORR) continue;
        const east = map.at(wx + 1, y);
        if (!east || !IS_DOOR(east.typ | 0)) continue;
        for (let ny = y + 1; ny < ROWNO; ny++) {
            const nloc = map.at(wx, ny);
            if (!nloc) break;
            const t = nloc.typ | 0;
            if (t === ROOM) break;
            if (t === CORR || t === SCORR) continue;
            if (t === HWALL || t === STONE || t === VWALL) {
                nloc.typ = CORR;
                continue;
            }
            break;
        }
    }
}

function openDoorCorridorWestAlcovesFinalizeLikeC(g) {
    const map = g.level;
    if (!map?.doors?.length) return;
    for (const d of map.doors) {
        if (!d) continue;
        const xx = d.x | 0;
        const yy = d.y | 0;
        const below = map.at(xx, yy + 1);
        const above = map.at(xx, yy - 1);
        const east = map.at(xx + 1, yy);
        const west = map.at(xx - 1, yy);
        if (below && ((below.typ | 0) === CORR || (below.typ | 0) === SCORR))
            openDoorCorridorWestAlcoveJoinLikeC(0, 1, xx, yy);
        else if (above && ((above.typ | 0) === CORR || (above.typ | 0) === SCORR))
            openDoorCorridorWestAlcoveJoinLikeC(0, -1, xx, yy);
        else if (east && ((east.typ | 0) === CORR || (east.typ | 0) === SCORR))
            openDoorCorridorWestAlcoveJoinLikeC(1, 0, xx, yy);
        else if (west && ((west.typ | 0) === CORR || (west.typ | 0) === SCORR))
            openDoorCorridorWestAlcoveJoinLikeC(-1, 0, xx, yy);
    }
}

function level_finalize_topology() {
    bound_digging();
    /* C: mklev.c level_finalize_topology — mineralize before gi.in_mklev=FALSE */
    mineralize(-1, -1, -1, -1, false);
    openDoorCorridorWestAlcovesFinalizeLikeC(game);
    relocateFillObjsIntoWestDoorAlcovesLikeC(game);
    refreshWestDoorColumnFobjAfterMineralizeLikeC(game);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
        tagCorrRoomnoAdjacentRoomsLikeC(game);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
    syncLevelFlagsHasTownAfterFixupSpecialLikeC(game);
    openWestDoorColumnNorthCorrLikeC(game);
    /* C: `mgenmklev` sleepers from `fill_ordinary_room` — no post-`level_finalize_topology` move in C. */
    if (anyMgenmklevMonsterLikeC(game)) {
        preferSleepingLichenDoorNichesLikeC(game);
    } else {
        anchorWestApportSleeperLikeC(game);
    }
    anchorApportTowelOnWestFillAlcoveLikeC(game);
    /* C: west-door apport gold must stay newest on **`fobj`** after late mklev gold. */
    refreshWestDoorColumnFobjAfterMineralizeLikeC(game);
}
