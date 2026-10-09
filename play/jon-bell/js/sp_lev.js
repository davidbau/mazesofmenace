// @ts-nocheck
// sp_lev.ts — Special-level placement helpers.
// C ref: nethack-c/src/sp_lev.c
//
// This file contains the faithful TypeScript port of create_door() and its
// direct helpers (rnddoor).  The full lspo_door dispatcher and other opcode
// handlers live elsewhere; this file is scoped to the placement primitive.
//
// RNG parity is the #1 correctness signal (Cardinal Rule 2).  Every rn2/rnd
// call in this file must match C's sp_lev.c in order and argument.
import { game } from './gstate.js';
import { rn2, rnd, rn1, pushRngLogEntry } from './rng.js';
import { FILL_NORMAL } from './const.js';
import { ALTAR, DOOR, SDOOR, D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED, D_SECRET, W_RANDOM, W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY, IS_OBSTRUCTED, isok, IS_WALL, IS_DOOR, STONE, MAX_TYPE, INVALID_TYPE, MATCH_WALL, IS_STWALL, IS_ROOM, CROSSWALL, HWALL, VWALL, COLNO, ROWNO, W_NONDIGGABLE, W_NONPASSWALL, ROOM, MOAT, TLCORNER, TRCORNER, BLCORNER, BRCORNER, TUWALL, TDWALL, TLWALL, TRWALL, DBWALL, AIR, CLOUD, FOUNTAIN, THRONE, SINK, POOL, WATER, TREE, IRONBARS, IS_DRAWBRIDGE, DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE, NO_TRAP, CORR, ICE, ICED_POOL, ICED_MOAT, SCORR, LAVAPOOL, LAVAWALL, OROOM, THEMEROOM, COURT, SWAMP, VAULT, BEEHIVE, MORGUE, BARRACKS, ZOO, DELPHI, TEMPLE, ANTHOLE, COCKNEST, LEPREHALL, SHOPBASE, ARMORSHOP, SCROLLSHOP, POTIONSHOP, WEAPONSHOP, FOODSHOP, RINGSHOP, WANDSHOP, TOOLSHOP, BOOKSHOP, FODDERSHOP, CANDLESHOP, STAIRS, LADDER, MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB, MKTRAP_SEEN, MKTRAP_NOVICTIM, SP_COORD_IS_RANDOM, OBJ_CONTAINED, OBJ_MINVENT, NON_PM, NEUTRAL, MALE, FEMALE, In_mines, AM_NONE, AM_CHAOTIC, AM_NEUTRAL, AM_LAWFUL, AM_MASK, AM_SPLEV_CO, AM_SPLEV_NONCO, AM_SPLEV_RANDOM, A_NONE, A_LAWFUL, A_ORIGINAL, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPMASK, PROT_FROM_SHAPE_CHANGERS, WET, HOT, SOLID, DEFAULT_INVENT, CUSTOM_INVENT, NO_INVENT, STRAT_WAITFORU, MM_NOTAIL, MM_NOGRP, MM_ADJACENTOK, MM_IGNOREWATER, MM_NOCOUNTBIRTH, MM_NOMSG, NO_MM_FLAGS, G_EXTINCT, G_GONE, LOW_PM, TUTORIAL, QUEST, DUNGEON_ALIGN_BY_DNUM, M_AP_MONSTER, DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, CORPSTAT_NONE, CORPSTAT_HISTORIC, CORPSTAT_MALE, CORPSTAT_FEMALE, ROOMOFFSET, AM_SHRINE, AM_SANCTUM, Is_waterlevel, Is_airlevel, Is_stronghold, In_quest, LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH, LR_TELE, LR_UPTELE, LR_DOWNTELE, LR_MONGEN, GP_CHECKSCARY, IS_LAVA, IS_POOL, OBJ_FREE, LA_UP, LA_DOWN, MAX_NESTED_ROOMS, MAXNROFROOMS, IS_FURNITURE, F_LOOTED, F_WARNED, S_LPUDDING, S_LDWASHER, S_LRING, T_LOOTED, TREE_LOOTED, TREE_SWARM, SET_LIT_NOCHANGE, IS_TREE, is_pit, is_hole, TRAPNUM, Is_botlevel, In_endgame, EPRI, ESHK, ONAME_LEVEL_DEF, RLOC_ERR, RLOC_NOMSG, P_SPEAR, Amask2align, SVALL, } from './const.js';
import { oinit } from './o_init.js';
import { level_finalize_topology, fill_special_room, clear_level_structures, find_branch_room, OC_MERGE, newcham, add_door, makeroguerooms, themeroom_lspo_map_redo_maploc_rng, u_on_newpos, set_wall_state, mdrop_obj_md } from './mklev.js';
import { flip_worm_segs_vertical, flip_worm_segs_horizontal, worm_seg_swap, wormgone } from './worm.js';
import { In_hell, Can_fall_thru, mapfrag_get, mktrap, mksobj_at, mkobj_at, mksobj, makemon, somexy, somex, somey, mk_tt_object, mkcorpstat, resists_ston, del_engr_at, engr_at, make_engr_at, set_corpsenm, sobj_at, wallification, count_level_features, makecorridors, mkstairs, stairway_add, build_room, add_room, topologize, level_difficulty, get_level_extends, fix_wall_spines, occupied, mpickobj } from './mklev.js';
import { set_levltyp_lit, create_maze, baalz_fixup, setup_waterlevel, stolen_booty } from './mkmaze.js';
import { vision_reset, block_point } from './vision.js';
import { litstate_rnd, mkmap, flood_fill_rm } from './mkmap.js';
import { priestini, mk_roamer } from './priest.js';
import { oname, artifact_exists } from './objnam.js';
import { lookup_novel, safe_oname } from './do_name.js';
import { obj_stop_timers, begin_burn } from './timeout.js';
import { bury_an_obj } from './dig.js';
import { obfree } from './dokick.js';
import { reset_xystart_size, get_location, is_ok_location, DRY, NO_LOC_WARN, ANY_LOC, set_ok_location_func } from './sp_lev_loc.js';
import { def_char_to_objclass, def_char_to_monclass } from './drawing.js';
import { OC_NAME } from './oc_name_data.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { weight } from './weight.js';
import { name_to_mon, set_mon_data, set_malign, rndmonnum, can_saddle, mkclass, mkMplayer, rndOffensiveItem, rndDefensiveItem, rndMiscItem, propagate, permonstTemplate, check_gear_next_turn } from './makemon.js';
import { mongets } from './m_initweap.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { t_at, deltrap, maketrap, goodpos, update_mon_extrinsics, m_dowear } from './trap.js';
/* C keeps pick_vibrasquare_location in mkmaze.c; create_trap's VIBRATING_SQUARE
 * arm (sp_lev.c:1819) is its only caller outside makemaz. */
import { pick_vibrasquare_location } from './mkmaze.js';
import { g_at, mergable } from './cmd.js';
import { depth } from './hacklib.js';
import { on_level } from './dungeon.js';
import { m_at, monmightthrowwep } from './uhitm.js';
import { christen_monst, poly_when_stoned } from './mhitm.js';
import { within_bounded_area } from './rect.js';
import { create_gas_cloud, create_gas_cloud_selection as create_region_gas_cloud_selection } from './region.js';
import { PM_MINOTAUR, PM_ARCHEOLOGIST, PM_WIZARD, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_CLERIC, PM_DWARF, PM_GNOME, NUMMONS } from './pm.generated.js';
import { dat_content } from './dat_source.js';
import { tokenize } from './lua/lexer.js';
import { parse } from './lua/parser.js';
import { nhl_init, nhl_done } from './nhlua.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { create_drawbridge } from './dokick.js';
import { impossible } from './pline.js';
import { map_background, map_object, map_trap, newsym_force as newsym_force_real } from './display.js';
import { enexto_core, rloc } from './teleport.js';
import { put_saddle_on_mon } from './steed.js';
import { m_into_limbo } from './dog.js';
import { placebc, unplacebc } from './ball.js';
import { obj_resists } from './zap.js';
import { rloco as steal_rloco } from './steal.js';
import { ENV } from './hostenv.js';
import { delete_contents } from './shk.js';
const MONS_PMNAMES = monPmnamesPack.pmnames;

const MONS_ROWS = monsPack.mons;
// ═══════════════════════════════════════════════════════════════════════════════
// Constants from header files
// ═══════════════════════════════════════════════════════════════════════════════

// BOOL_RANDOM = -1  (global.h:103)
const BOOL_RANDOM = -1;

// enum lvlinit_types (nethack-c/include/sp_lev.h:41-49)
const LVLINIT_NONE = 0;
const LVLINIT_SOLIDFILL = 1;
const LVLINIT_MAZEGRID = 2;
const LVLINIT_MAZE = 3;
const LVLINIT_MINES = 4;
const LVLINIT_ROGUE = 5;
const LVLINIT_SWAMP = 6;

// ═══════════════════════════════════════════════════════════════════════════════
// char2typ table + splev_chr2typ — C ref: nethack-c/src/nhlua.c:335-395
// ═══════════════════════════════════════════════════════════════════════════════

const char2typ = [
    { ch: ' ', typ: STONE },
    { ch: '#', typ: CORR },
    { ch: '.', typ: ROOM },
    { ch: '-', typ: HWALL },
    { ch: '-', typ: TLCORNER },
    { ch: '-', typ: TRCORNER },
    { ch: '-', typ: BLCORNER },
    { ch: '-', typ: BRCORNER },
    { ch: '-', typ: CROSSWALL },
    { ch: '-', typ: TUWALL },
    { ch: '-', typ: TDWALL },
    { ch: '-', typ: TLWALL },
    { ch: '-', typ: TRWALL },
    { ch: '-', typ: DBWALL },
    { ch: '|', typ: VWALL },
    { ch: '+', typ: DOOR },
    { ch: 'A', typ: AIR },
    { ch: 'C', typ: CLOUD },
    { ch: 'S', typ: SDOOR },
    { ch: 'H', typ: SCORR },
    { ch: '{', typ: FOUNTAIN },
    /* C nhlua.c has `{ '\\', THRONE }` — ONE backslash. The two-character
     * form this used to hold could never equal a single map character, so
     * knox.lua:48 `des.terrain(43,09, "\\")` resolved to INVALID_TYPE; it is
     * only reachable at all now that the lexer decodes `"\\"` to one byte. */
    { ch: '\\', typ: THRONE },
    { ch: 'K', typ: SINK },
    { ch: '}', typ: MOAT },
    { ch: 'P', typ: POOL },
    { ch: 'L', typ: LAVAPOOL },
    { ch: 'Z', typ: LAVAWALL },
    { ch: 'I', typ: ICE },
    { ch: 'W', typ: WATER },
    { ch: 'T', typ: TREE },
    { ch: 'F', typ: IRONBARS }, // Fe = iron
    { ch: 'x', typ: MAX_TYPE }, // "see-through"
    { ch: 'B', typ: CROSSWALL }, // hack: boundary location
    { ch: 'w', typ: MATCH_WALL }, // IS_STWALL()
    { ch: '\0', typ: STONE },
];

function splev_chr2typ(c) {
    for (let i = 0; char2typ[i].ch; i++) {
        if (c === char2typ[i].ch)
            return char2typ[i].typ;
    }
    return INVALID_TYPE;
}

// check_mapchr helper (static to this module)
function check_mapchr(s) {
    if (s && s.length === 1)
        return splev_chr2typ(s[0]);
    return INVALID_TYPE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// get_table_* helpers — C ref: nethack-c/src/nhlua.c:1183-1290
// These read values from a marshalled LuaTable (the des.level_init table).
// LuaTable API: .get(key) returns the value, .set(key,v) writes back.
// ═══════════════════════════════════════════════════════════════════════════════

function get_table_int_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null) return defval;
    return Number(v);
}

function get_table_str_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null || v === '') return defval;
    return String(v);
}

// C ref: nhlua.c get_table_str(L, name) — required string field (no
// default; not reached by tut-1/tut-2, which always supply "text").
function get_table_str(args, name) {
    const v = args.get(name);
    return (v == null) ? '' : String(v);
}

function get_table_mapchr_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null || v === '') return defval;
    const s = String(v);
    if (s.length === 0) return defval;
    const typ = check_mapchr(s);
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return typ;
}

// boolean_opt: accepts Lua booleans AND 0/1 like C
function get_table_boolean_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null) return defval;
    const t = typeof v;
    if (t === 'boolean') return v ? 1 : 0;
    if (t === 'number') {
        const n = Number(v);
        if (n === 0 || n === 1) return n;
        throw new Error('Expected a boolean');
    }
    if (t === 'string') {
        const s = String(v).toLowerCase();
        if (s === 'true' || s === 'yes') return 1;
        if (s === 'false' || s === 'no') return 0;
        throw new Error('Expected a boolean');
    }
    throw new Error('Expected a boolean');
}

// get_table_option: map string through allowed list → index (like luaL_checkoption)
function get_table_option(args, name, defval, opts) {
    const v = args.get(name);
    const s = (v != null) ? String(v) : defval;
    for (let i = 0; opts[i] != null; i++) {
        if (s === opts[i]) return i;
    }
    return 0; // default to first option if not found (C's luaL_checkoption behavior)
}

// ═══════════════════════════════════════════════════════════════════════════════
// lvlfill_solid — C ref: nethack-c/src/sp_lev.c:375-390
// ═══════════════════════════════════════════════════════════════════════════════

function lvlfill_solid(filling, lit) {
    // Tool/replay contexts run the loader without a bound level (C never
    // does); the fill is meaningless then — the rn2 draw already happened in
    // set_levltyp (js/mkmaze.js).
    if (!game.level) return;
    // Canonical home is game.gx.x_maze_max/game.gy.y_maze_max (the same
    // gx/gy convention js/sp_lev_loc.js's get_location/reset_xystart_size
    // use) — this was a flat game.x_maze_max/y_maze_max read with a wrong
    // x default (COLNO-1=79) prior to port-sp-lev-loc-mazemax-001. Default
    // matches decl.c:831,844's static initializer: (COLNO-1)&~1 / (ROWNO-1)&~1.
    const xmax = game.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    for (let x = 2; x <= xmax; x++) {
        for (let y = 0; y <= ymax; y++) {
            if (!set_levltyp_lit(x, y, filling, lit))
                continue;
            const loc = game.level.at(x, y);
            if (loc) {
                loc.flags = 0;
                loc.horizontal = 0;
                loc.roomno = 0;
                loc.edge = 0;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// lvlfill_maze_grid — C ref: nethack-c-v5/upstream/src/sp_lev.c:358-370
// ═══════════════════════════════════════════════════════════════════════════════

/* Draws no RNG.  Unlike lvlfill_solid it assigns levl[x][y].typ DIRECTLY —
 * no set_levltyp_lit, so no lit argument and none of the flags/horizontal/
 * roomno/edge clearing.  Port that literally: routing it through
 * set_levltyp_lit would add the bounds/furniture guards C does not apply
 * here. */
function lvlfill_maze_grid(x1, y1, x2, y2, filling) {
    // Same tool/replay guard as lvlfill_solid above (C always has a level).
    if (!game.level) return;
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = game.level.at(x, y);
            if (!loc) continue;
            if (game.level.flags?.corrmaze)
                loc.typ = STONE;
            else
                loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? STONE
                                                          : filling;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// lvlfill_swamp — C ref: nethack-c-v5/upstream/src/sp_lev.c:390-424
// ═══════════════════════════════════════════════════════════════════════════════

/* Jamis Buck's "relaxed blockwise maze": fill the level solid with `bg`, then
 * walk it in 2x2 blocks, carving the block's top-left cell to `fg` and — when
 * all THREE of the block's other cells are still `bg` — one randomly chosen
 * neighbour as well.  That rn2(3) is the whole RNG surface, and it is drawn
 * ONLY on a 3-of-3 block, so the draw count depends on the fill state built by
 * the loop so far; the reads must therefore see the same levl[][] the writes
 * produce (i.e. no snapshotting the grid up front).
 *
 * C's loop bounds are `x += 2` from 2 to min(gx.x_maze_max, COLNO-2) and
 * `y += 2` from 0 to min(gy.y_maze_max, ROWNO-2) — note the min() against
 * COLNO-2 / ROWNO-2, which lvlfill_solid above does NOT have, because this
 * function reads x+1 and y+1.  The gx/gy homes and the decl.c:831,844 static
 * defaults are the same ones lvlfill_solid and lvlfill_maze_grid use.
 *
 * The `levl[x+1][y].typ == bg` reads are RAW typ comparisons against the
 * FILLING value, not IS_* predicates; transcribed literally.  Reachable via
 * des.level_init({ style = "swamp" }) — juiblex.lua:9 is its only dat/ caller.
 * Called with (fg, bg, lit) exactly as C does; no RNG of its own beyond the
 * rn2(3), and lvlfill_solid draws none. */
function lvlfill_swamp(fg, bg, lit) {
    lvlfill_solid(bg, lit);
    if (!game.level) return;  /* same tool/replay guard as lvlfill_solid */

    const xmax = Math.min(game.gx?.x_maze_max ?? ((COLNO - 1) & ~1), COLNO - 2);
    const ymax = Math.min(game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1), ROWNO - 2);
    const typ_at = (x, y) => { const loc = game.level.at(x, y); return loc ? loc.typ : -1; };

    for (let x = 2; x <= xmax; x += 2) {
        for (let y = 0; y <= ymax; y += 2) {
            let c = 0;

            set_levltyp_lit(x, y, fg, lit);
            if (typ_at(x + 1, y) === bg)
                ++c;
            if (typ_at(x, y + 1) === bg)
                ++c;
            if (typ_at(x + 1, y + 1) === bg)
                ++c;
            if (c === 3) {
                switch (rn2(3)) {
                case 0:
                    set_levltyp_lit(x + 1, y, fg, lit);
                    break;
                case 1:
                    set_levltyp_lit(x, y + 1, fg, lit);
                    break;
                case 2:
                    set_levltyp_lit(x + 1, y + 1, fg, lit);
                    break;
                default:
                    break;
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// splev_initlev — C ref: nethack-c/src/sp_lev.c:2988-3035
// ═══════════════════════════════════════════════════════════════════════════════

/* objects.h SPE_NOVEL — see js/objnam.js:87 / js/spell.js:22. */
const SPE_NOVEL_OTYP = 408;

async function splev_initlev(linit) {
    switch (linit.init_style) {
    default:
        // impossible("Unrecognized level init style.");
        if (typeof console !== 'undefined')
            console.warn('Unrecognized level init style.');
        break;
    case LVLINIT_NONE:
        break;
    case LVLINIT_SOLIDFILL:
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        lvlfill_solid(linit.filling, linit.lit);
        break;
    case LVLINIT_MAZEGRID:
        // C ref: sp_lev.c:2996
        //   lvlfill_maze_grid(2, 0, gx.x_maze_max, gy.y_maze_max, linit->bg);
        // Same gx/gy homes and the same decl.c:831,844 static defaults as
        // lvlfill_solid above.
        lvlfill_maze_grid(2, 0,
                          game.gx?.x_maze_max ?? ((COLNO - 1) & ~1),
                          game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1),
                          linit.bg);
        break;
    case LVLINIT_MAZE:
        // C ref: sp_lev.c:2998-2999
        //   create_maze(linit->corrwid, linit->wallthick, linit->rm_deadends);
        create_maze(linit.corrwid, linit.wallthick, linit.rm_deadends);
        break;
    case LVLINIT_ROGUE:
        /* C sp_lev.c:3008 — the rogue layout builder is shared with
         * mklev.c and is already an async port because it may create the
         * rogue ghost and recurse through corridor generation. */
        await makeroguerooms();
        break;
    case LVLINIT_MINES:
        // C ref: sp_lev.c:3010-3016
        //   if (linit->lit == BOOL_RANDOM) linit->lit = rn2(2);
        //   if (linit->filling > -1) lvlfill_solid(linit->filling, 0);
        //   linit->icedpools = icedpools;
        //   mkmap(linit);
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        if (linit.filling > -1)
            lvlfill_solid(linit.filling, 0);
        linit.icedpools = icedpools;
        await mkmap(linit);
        break;
    case LVLINIT_SWAMP:
        // C ref: sp_lev.c:3012-3016
        //   if (linit->lit == BOOL_RANDOM) linit->lit = rn2(2);
        //   lvlfill_swamp(linit->fg, linit->bg, linit->lit);
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        lvlfill_swamp(linit.fg, linit.bg, linit.lit);
        break;
    }
}

// ---------------------------------------------------------------------------
// TODO(sp_lev): okdoor — check if (x,y) is a valid wall position for a door
// C ref: nethack-c/src/mklev.c okdoor()
// Not yet exported from mklev.ts.  Stubbed here; replace with a real import
// when mklev.ts exports it.
// ---------------------------------------------------------------------------
function okdoor(x, y) {
    // TODO(sp_lev): okdoor — import from mklev once exported
    // Faithful stub: defer to the level map's wall/accessible check.
    // This matches the logic in mklev.ts:5075 (private okdoor).
    const map = game.level;
    if (!map)
        return false;
    const loc = map.at(x, y);
    if (!loc)
        return false;
    // C okdoor: must be HWALL or VWALL, not already adjacent to a door.
    // bydoor check omitted (it is a guard on the door-already-there case;
    // omitting it may allow duplicate doors but does not change RNG).
    // IS_OBSTRUCTED check on neighbours mirrors the C logic.
    return ((isok(x - 1, y) && !IS_OBSTRUCTED((map.at(x - 1, y) || {}).typ ?? 0))
        || (isok(x + 1, y) && !IS_OBSTRUCTED((map.at(x + 1, y) || {}).typ ?? 0))
        || (isok(x, y - 1) && !IS_OBSTRUCTED((map.at(x, y - 1) || {}).typ ?? 0))
        || (isok(x, y + 1) && !IS_OBSTRUCTED((map.at(x, y + 1) || {}).typ ?? 0)));
}
// ---------------------------------------------------------------------------
// add_door — C ref: nethack-c-v5/upstream/src/mklev.c:585-623.
//
// This file used to carry its own copy under a TODO saying "Not yet exported
// from mklev.ts.  Stubbed here; replace with a real import when mklev.ts
// exports it."  js/mklev.js has exported add_door for some time, so the note
// was stale and the copy was a live shadow: sp_lev's des.door path ran THIS
// body while every mklev caller ran the other one, and the two then drifted.
// Both were missing C's gs.subrooms[] shift loop; the import now makes that a
// single fact in a single place (c-ref-duplicate-lint's imported=true shape).
// It is pure bookkeeping (no RNG): room.doorct / room.fdoor / level.doors[] /
// level.doorindex.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// rnddoor — pick a random door state from the 5-element state array
// C ref: nethack-c/src/sp_lev.c:1149-1154
// WIRE_PENDING: port-splev-lspo_door-001 — caller is lspo_door (sp_lev.c:4709)
//
// static int state[] = { D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED };
// return ROLL_FROM(state);  /* = state[rn2(SIZE(state))] = state[rn2(5)] */
//
// RNG: one rn2(5) call.
// ---------------------------------------------------------------------------
export function rnddoor() {
    pushRngLogEntry('>rnddoor');
    const state = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
    const result = state[rn2(5)]; // sp_lev.c:1153: ROLL_FROM(state) = rn2(5)
    pushRngLogEntry('<rnddoor');
    return result;
}
// ---------------------------------------------------------------------------
// create_door — place a door on the wall of a room
// C ref: nethack-c/src/sp_lev.c:1715-1807  (staticfn void create_door)
// WIRE_PENDING: port-splev-lspo_door-001 — caller is lspo_door (sp_lev.c:4727)
//
// This is the ground-truth RNG-consuming placement primitive for des.door().
// Called from lspo_door (sp_lev.c:4727) with a room_door struct and the
// current croom.
//
// RNG sequence (Cardinal Rule 2 — same order as C):
//
//  1. If dd->secret == -1:  rn2(2)  → dd->secret  [sp_lev.c:1721]
//
//  2. If dd->mask == -1 (random mask determination):
//     Non-secret path (dd->secret == 0):
//       rn2(3)              → if ==0: open/locked/closed determination
//       if rn2(3)==0:
//         rn2(5)            → if ==0: D_ISOPEN
//         if rn2(5)!=0:
//           rn2(6)          → if ==0: D_LOCKED; else D_CLOSED
//         if mask != D_ISOPEN:
//           rn2(25)         → if ==0: mask |= D_TRAPPED
//       else: mask = D_NODOOR  (no further rn2)
//     Secret path (dd->secret != 0):
//       rn2(5)              → if ==0: D_LOCKED; else D_CLOSED
//       rn2(20)             → if ==0: mask |= D_TRAPPED
//
//  3. Wall-position loop (trycnt 0..99):
//     rn2(4)                → wall direction (case 0/1/2/3)
//     If direction is in dd->wall bitmask AND dd->pos == -1:
//       rn2(1 + room.hx - room.lx)  (N/S walls, case 0/1)
//       rn2(1 + room.hy - room.ly)  (E/W walls, case 2/3)
//     If !okdoor(x,y): continue; else break.
//
//  4. If trycnt >= 100: impossible (no RNG), return.
//
//  5. set_levltyp(x, y, secret ? SDOOR : DOOR)
//     levl[x][y].doormask = mask
//
// Deps stubbed: okdoor (TODO), add_door (TODO), impossible (console.warn).
// ---------------------------------------------------------------------------
export function create_door(dd, broom) {
    pushRngLogEntry('>create_door');
    let x = 0, y = 0;
    let trycnt;
    // sp_lev.c:1720-1721 — randomise secret flag if not already set
    if (dd.secret === -1)
        dd.secret = rn2(2);
    // sp_lev.c:1723-1724 — W_RANDOM is a synonym for W_ANY in the loop
    if (dd.wall === W_RANDOM)
        dd.wall = W_ANY;
    // sp_lev.c:1726-1748 — determine door mask if not pre-set
    if (dd.mask === -1) {
        // sp_lev.c:1728 — non-secret vs secret branch
        if (!dd.secret) {
            // sp_lev.c:1729 — is it a doorway (no door) or a real door?
            if (!rn2(3)) {
                // sp_lev.c:1730 — open?
                if (!rn2(5))
                    dd.mask = D_ISOPEN;
                // sp_lev.c:1732 — locked?
                else if (!rn2(6))
                    dd.mask = D_LOCKED;
                // sp_lev.c:1734 — closed
                else
                    dd.mask = D_CLOSED;
                if (dd.mask !== D_ISOPEN && !rn2(25))
                    dd.mask |= D_TRAPPED;
            }
            else
                // sp_lev.c:1739
                dd.mask = D_NODOOR;
        }
        else {
            // sp_lev.c:1741 — secret door: locked or closed
            if (!rn2(5))
                dd.mask = D_LOCKED;
            else
                dd.mask = D_CLOSED;
            // sp_lev.c:1746 — secret door: trapped?
            if (!rn2(20))
                dd.mask |= D_TRAPPED;
        }
    }
    // sp_lev.c:1751-1799 — wall-position selection loop
    for (trycnt = 0; trycnt < 100; ++trycnt) {
        const dwall = dd.wall;
        const dpos = dd.pos;
        // sp_lev.c:1755 — pick a wall direction
        switch (rn2(4)) {
            case 0: // sp_lev.c:1756-1764 — north wall
                if (!(dwall & W_NORTH))
                    continue;
                y = broom.ly - 1;
                x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx)
                    : dpos);
                if (!isok(x, y - 1))
                    continue;
                {
                    const above = game.level?.at(x, y - 1);
                    if (!above || IS_OBSTRUCTED(above.typ))
                        continue;
                }
                break;
            case 1: // sp_lev.c:1765-1773 — south wall
                if (!(dwall & W_SOUTH))
                    continue;
                y = broom.hy + 1;
                x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx)
                    : dpos);
                if (!isok(x, y + 1))
                    continue;
                {
                    const below = game.level?.at(x, y + 1);
                    if (!below || IS_OBSTRUCTED(below.typ))
                        continue;
                }
                break;
            case 2: // sp_lev.c:1774-1782 — west wall
                if (!(dwall & W_WEST))
                    continue;
                x = broom.lx - 1;
                y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly)
                    : dpos);
                if (!isok(x - 1, y))
                    continue;
                {
                    const left = game.level?.at(x - 1, y);
                    if (!left || IS_OBSTRUCTED(left.typ))
                        continue;
                }
                break;
            case 3: // sp_lev.c:1783-1791 — east wall
                if (!(dwall & W_EAST))
                    continue;
                x = broom.hx + 1;
                y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly)
                    : dpos);
                if (!isok(x + 1, y))
                    continue;
                {
                    const right = game.level?.at(x + 1, y);
                    if (!right || IS_OBSTRUCTED(right.typ))
                        continue;
                }
                break;
            default:
                // sp_lev.c:1792-1794 — NOTREACHED
                break;
        }
        if (okdoor(x, y))
            break;
    }
    // sp_lev.c:1800-1803 — give up if no valid location found
    if (trycnt >= 100) {
        // C: impossible("create_door: Can't find a proper place!")
        // No RNG consumed; just bail.
        if (typeof console !== 'undefined')
            console.warn('create_door: Can\'t find a proper place!');
        pushRngLogEntry('<create_door');
        return;
    }
    // sp_lev.c:1804-1806 — place the door tile
    // C: if (!set_levltyp(x, y, dd->secret ? SDOOR : DOOR)) return;
    // set_levltyp returns false only on out-of-bounds; we guard with isok
    // (already guaranteed by okdoor); inline the placement.
    const loc = game.level?.at(x, y);
    if (!loc) {
        // set_levltyp returned false — out of bounds
        pushRngLogEntry('<create_door');
        return;
    }
    loc.typ = dd.secret ? SDOOR : DOOR;
    // sp_lev.c:1806 — set doormask
    loc.doormask = dd.mask;
    // C does NOT call add_door here; add_doors_to_room() is called later by
    // the level-build post-pass.  However, the mklev.ts splev_create_door_rng
    // stub did call add_door() inline to keep doorct in sync — we replicate
    // that decision here as it is the established in-tree convention.
    add_door(x, y, broom);
    pushRngLogEntry('<create_door');
}

// C ref: themerms.lua "Twin businesses" (themerms.lua:818-866) — the outer
// des.room (w=9,h=5, themed) is already built as aroom; this is its contents.
// Draw order: the 8 placements table evaluates southeast()/northeast()/... eagerly
// (12 percent(50) calls), then percent(50) for ltype/rtype, then d(8), then each
// shop room: build_room (rn2(100) + litstate) and its contents' shopdoorstate()
// (percent(1), percent(50) as needed) + des.door with a fixed wall.
export function themerooms_contents_twin_businesses(outerRoom) {
    const pct = (n) => rn2(100) < n;
    const southeast = () => (pct(50) ? 'south' : 'east');
    const northeast = () => (pct(50) ? 'north' : 'east');
    const northwest = () => (pct(50) ? 'north' : 'west');
    const southwest = () => (pct(50) ? 'south' : 'west');
    const placements = [
        { lx: 1, ly: 1, rx: 4, ry: 1, lwall: 'south', rwall: southeast() },
        { lx: 1, ly: 2, rx: 4, ry: 2, lwall: 'north', rwall: northeast() },
        { lx: 1, ly: 1, rx: 5, ry: 1, lwall: southeast(), rwall: southwest() },
        { lx: 1, ly: 1, rx: 5, ry: 2, lwall: southeast(), rwall: northwest() },
        { lx: 1, ly: 2, rx: 5, ry: 1, lwall: northeast(), rwall: southwest() },
        { lx: 1, ly: 2, rx: 5, ry: 2, lwall: northeast(), rwall: northwest() },
        { lx: 2, ly: 1, rx: 5, ry: 1, lwall: southwest(), rwall: 'south' },
        { lx: 2, ly: 2, rx: 5, ry: 2, lwall: northwest(), rwall: 'north' },
    ];
    // ltype, rtype = "weapon shop", "armor shop"; swapped on percent(50)
    let ltype = WEAPONSHOP, rtype = ARMORSHOP;
    if (pct(50)) {
        const t = ltype; ltype = rtype; rtype = t;
    }
    const shopdoorstate = () => {
        if (pct(1)) return D_LOCKED;
        if (pct(50)) return D_CLOSED;
        return D_ISOPEN;
    };
    const wallmask = { north: W_NORTH, south: W_SOUTH, west: W_WEST, east: W_EAST };
    const p = placements[rn2(placements.length)]; // d(#placements) = 1 + rn2(8) (themerms.lua:854)
    const shops = [[ltype, p.lx, p.ly, p.lwall], [rtype, p.rx, p.ry, p.rwall]];
    for (const [rt, sx, sy, wall] of shops) {
        const shop = build_room({
            chance: 100, rtype: rt, x: sx, y: sy, w: 3, h: 3,
            rlit: -1, needfill: FILL_NORMAL, joined: false,
            xalign: -1, yalign: -1,
        }, outerRoom);
        if (!shop)
            return false; // C sp_lev.c:4104-4105: failed subroom => themeroom_failed
        create_door({ secret: 0, mask: shopdoorstate(), pos: -1, wall: wallmask[wall] }, shop);
    }
    return true;
}

/* sp_lev.c:4678-4740 — argc==3 positional form: door(state, x, y), e.g.
 * des.door("nodoor", 1, 2). The wiring dispatcher (js/lua/nh_state.js:176)
 * spreads raw Lua args, so this takes (...args) like lspo_stair
 * (js/sp_lev.js:4014) and discriminates on args.length before falling
 * back to the existing single-table form. */
export function lspo_door(...args) {
    create_des_coder();

    const doorstates = ['random', 'open', 'closed', 'locked', 'nodoor', 'broken', 'secret'];
    const doorstates2i = [-1, D_ISOPEN, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, D_SECRET];

    let mx, my, msk;

    if (args.length === 3) {
        // sp_lev.c:4694-4697: msk = doorstates2i[luaL_checkoption(L, 1, "random", doorstates)];
        //                     x = int(arg2); y = int(arg3);
        const stateArg = args[0] != null ? String(args[0]) : 'random';
        let stateIdx = 0;
        for (let i = 0; i < doorstates.length; i++) {
            if (stateArg === doorstates[i]) { stateIdx = i; break; }
        }
        msk = doorstates2i[stateIdx];
        mx = Number(args[1]);
        my = Number(args[2]);
    } else {
        const table = args[0];
        if (!(table && table.type === 'table'))
            throw new Error('UNPORTED-CALLEE: lspo_door non-table call form');

        msk = doorstates2i[get_table_option(table, 'state', 'random', doorstates)];
        const xy = get_table_xy_or_coord(table);
        mx = xy.x;
        my = xy.y;
    }

    const typ = (msk === -1) ? rnddoor() : msk;

    if (mx === -1 && my === -1) {
        const walldirs = ['all', 'random', 'north', 'west', 'east', 'south'];
        /* C: "random" is also W_ANY — create_door just wants a mask of
         * acceptable walls. */
        const walldirs2i = [W_ANY, W_ANY, W_NORTH, W_WEST, W_EAST, W_SOUTH, 0];
        const table = (args.length === 3) ? null : args[0];
        const tmpd = {
            secret: (typ === D_SECRET) ? 1 : 0,
            mask: msk,
            pos: table ? get_table_int_opt(table, 'pos', -1) : -1,
            wall: walldirs2i[table ? get_table_option(table, 'wall', 'all', walldirs) : 0],
        };
        create_door(tmpd, game.gc.coder.croom);
        return 0;
    }

    const coord = { x: mx, y: my };
    get_location_coord(coord, ANY_LOC, game.gc.coder.croom, SP_COORD_PACK(mx, my));
    if (!isok(coord.x, coord.y))
        throw new Error('door coord not ok');

    const result = sel_set_door(coord.x, coord.y, { typ: splev_extract_typ(), door: typ });
    const loc = game.level.at(coord.x, coord.y);
    if (loc) {
        loc.typ = result.typ;
        loc.doormask = result.flags;
        loc.horizontal = result.horizontal;
    }
    if (!game.splev_map)
        game.splev_map = new Uint8Array(COLNO * ROWNO);
    game.splev_map[coord.x * ROWNO + coord.y] = 1;

    return 0;
}

function get_table_region(args, name, out, optional) {
    const v = args.get(name);
    if (v == null) {
        if (optional)
            return false;
        throw new Error('Not a region');
    }
    if (!(v && v.type === 'table') || v.length() !== 4)
        throw new Error('Not a region');
    out.x1 = Number(v.get(1));
    out.y1 = Number(v.get(2));
    out.x2 = Number(v.get(3));
    out.y2 = Number(v.get(4));
    return true;
}

function l_get_lregion(args) {
    const lregion = { inarea: {}, delarea: {}, in_islev: 0, del_islev: 0 };

    const inr = {};
    get_table_region(args, 'region', inr, false);
    lregion.inarea.x1 = inr.x1;
    lregion.inarea.y1 = inr.y1;
    lregion.inarea.x2 = inr.x2;
    lregion.inarea.y2 = inr.y2;

    const exr = { x1: -1, y1: -1, x2: -1, y2: -1 };
    get_table_region(args, 'exclude', exr, true);
    lregion.delarea.x1 = exr.x1;
    lregion.delarea.y1 = exr.y1;
    lregion.delarea.x2 = exr.x2;
    lregion.delarea.y2 = exr.y2;

    lregion.in_islev = get_table_boolean_opt(args, 'region_islev', 0);
    lregion.del_islev = get_table_boolean_opt(args, 'exclude_islev', 0);

    if (exr.x1 < 0)
        lregion.del_islev = 1;

    return lregion;
}

function levregion_add(lregion) {
    if (!lregion.in_islev) {
        const c1 = { x: lregion.inarea.x1, y: lregion.inarea.y1 };
        get_location(c1, ANY_LOC, null);
        lregion.inarea.x1 = c1.x;
        lregion.inarea.y1 = c1.y;
        const c2 = { x: lregion.inarea.x2, y: lregion.inarea.y2 };
        get_location(c2, ANY_LOC, null);
        lregion.inarea.x2 = c2.x;
        lregion.inarea.y2 = c2.y;
    }
    if (!lregion.del_islev) {
        const c1 = { x: lregion.delarea.x1, y: lregion.delarea.y1 };
        get_location(c1, ANY_LOC, null);
        lregion.delarea.x1 = c1.x;
        lregion.delarea.y1 = c1.y;
        const c2 = { x: lregion.delarea.x2, y: lregion.delarea.y2 };
        get_location(c2, ANY_LOC, null);
        lregion.delarea.x2 = c2.x;
        lregion.delarea.y2 = c2.y;
    }
    game._lregions = game._lregions || [];
    game._lregions.push(lregion);
}

export function lspo_teleport_region(args) {
    create_des_coder();

    const teledirs = ['both', 'down', 'up'];
    const teledirs2i = [LR_TELE, LR_DOWNTELE, LR_UPTELE];
    const lregion = l_get_lregion(args);
    lregion.rtype = teledirs2i[get_table_option(args, 'dir', 'both', teledirs)];
    lregion.padding = 0;
    lregion.rname = null;

    levregion_add(lregion);

    return 0;
}

/* C ref: sp_lev.c:5475 lspo_levregion. */
/* C ref: sp_lev.c:5475 lspo_levregion. */
/* C ref: sp_lev.c:5475 lspo_levregion. */
/* C ref: sp_lev.c:5475 lspo_levregion. */
export function lspo_levregion(args) {
    create_des_coder();

    const regiontypes = ['stair-down', 'stair-up', 'portal', 'branch',
                         'teleport', 'teleport-up', 'teleport-down'];
    const regiontypes2i = [LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
                           LR_TELE, LR_UPTELE, LR_DOWNTELE];
    const lregion = l_get_lregion(args);
    lregion.rtype = regiontypes2i[get_table_option(args, 'type', 'stair-down', regiontypes)];
    lregion.padding = get_table_int_opt(args, 'padding', 0);
    lregion.rname = get_table_str_opt(args, 'name', null);

    levregion_add(lregion);

    return 0;
}

/* C ref: sp_lev.c:5505-5539 lspo_exclusion. Zero-RNG thin wrapper:
 * type-string -> zonetype int, get_table_region for the 4 coords,
 * get_location_coord twice (one per corner), push onto game.exclusion_zones. */
export function lspo_exclusion(args) {
    create_des_coder();

    const ez_types = ['teleport', 'teleport-up', 'teleport-down', 'monster-generation'];
    const ez_types2i = [LR_TELE, LR_UPTELE, LR_DOWNTELE, LR_MONGEN];

    const ez = {};
    ez.zonetype = ez_types2i[get_table_option(args, 'type', 'teleport', ez_types)];

    const reg = {};
    get_table_region(args, 'region', reg, false);

    const c1 = { x: reg.x1, y: reg.y1 };
    const c2 = { x: reg.x2, y: reg.y2 };
    get_location_coord(c1, ANY_LOC | NO_LOC_WARN, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(reg.x1, reg.y1));
    get_location_coord(c2, ANY_LOC | NO_LOC_WARN, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(reg.x2, reg.y2));

    ez.lx = c1.x;
    ez.ly = c1.y;
    ez.hx = c2.x;
    ez.hy = c2.y;

    if (!game.exclusion_zones)
        game.exclusion_zones = [];
    game.exclusion_zones.unshift(ez);

    return 0;
}

/* C ref: sp_lev.c:3888 lspo_engraving — BOTH argc branches.
 *
 * C dispatches on lua_gettop: argc==1 is the table form (every tut-*.lua call),
 * argc==3 is the positional `des.engraving({x,y}, type, text)` form, which
 * minend-2.lua:6-7 uses for the Gnome King's wine-cellar warnings. Only argc==1
 * was ported and the handler declared a single parameter, so the positional form
 * read the coord table as if it were the option table: get_table_xy_or_coord
 * found no `x`/`y`/`coord` field, so x=y=-1 selected SP_COORD_PACK_RANDOM and
 * the engraving landed on a RANDOM dry square, and `text` came back null so the
 * warning read empty. Anything other than 1 or 3 is nhl_error in C.
 *
 * argc==3 does NOT read degrade/guardobjects — C leaves wipeout TRUE and
 * guardobjs FALSE, so the positional form always produces a degradable,
 * non-object-guarding engraving. RNG: only get_location_coord's random-square
 * search, and only when the coord is absent/nil. */
export function lspo_engraving(...callArgs) {
    create_des_coder();
    const engrtypes = ['dust', 'engrave', 'burn', 'mark', 'blood'];
    const engrtypes2i = [DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD];
    let ex = -1, ey = -1, etyp = DUST, txt = null;
    let wipeout = 1, guardobjs = 0;

    if (callArgs.length === 3) {
        /* C: (void) get_coord(L, 1, &ex, &ey) — a nil/absent coord leaves
         * ex/ey at -1, i.e. the random branch below. */
        const c = get_coord(callArgs[0]);
        if (c) {
            ex = c.x;
            ey = c.y;
        }
        /* C: luaL_checkoption(L, 2, "engrave", engrtypes) */
        const optName = (callArgs[1] == null) ? 'engrave' : String(callArgs[1]);
        const optIdx = engrtypes.indexOf(optName);
        if (optIdx === -1)
            throw new Error(`invalid option '${optName}'`);
        etyp = engrtypes2i[optIdx];
        /* C: dupstr(luaL_checkstring(L, 3)) */
        txt = String(callArgs[2]);
    } else if (callArgs.length === 1) {
        const args = callArgs[0];
        ({ x: ex, y: ey } = get_table_xy_or_coord(args));
        etyp = engrtypes2i[get_table_option(args, 'type', 'engrave', engrtypes)];
        txt = get_table_str(args, 'text');
        wipeout = get_table_boolean_opt(args, 'degrade', 1);
        guardobjs = get_table_boolean_opt(args, 'guardobjects', 0);
    } else {
        throw new Error('Wrong parameters');
    }

    const ecoord = (ex === -1 && ey === -1)
        ? SP_COORD_PACK_RANDOM(0)
        : SP_COORD_PACK(ex, ey);
    const coord = { x: -1, y: -1 };
    get_location_coord(coord, DRY, game.gc?.coder?.croom ?? null, ecoord);
    make_engr_at(coord.x, coord.y, txt, null, 0, etyp);
    const ep = engr_at(coord.x, coord.y);
    if (ep) {
        ep.guardobjects = !!guardobjs;
        ep.nowipeout = !wipeout;
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIRE_PENDING: no JS callers yet (callers live in the unported lspo_* layer).
// ═══════════════════════════════════════════════════════════════════════════

// ─── mapfragment module — C ref: sp_lev.c:204-313 ───────────────────────────
// mapfrag_get / splev_chr2typ live in mklev.js; the mapfragment is { lines, wid, hei }.

/** C ref: sp_lev.c:217-225 — match typ against levl typ (MATCH_WALL / transparency). */
export function match_maptyps(typ, levltyp) {
    if ((typ === MATCH_WALL) && !IS_STWALL(levltyp))
        return false;
    if ((typ < MAX_TYPE) && (typ !== levltyp))
        return false;
    return true;
}

/** C ref: sp_lev.c:275-279 — odd width AND odd height. */
export function mapfrag_canmatch(mf) {
    return !!(((mf.wid % 2) | 0) && ((mf.hei % 2) | 0));
}

/** C ref: sp_lev.c:256-264 — mapfrag_free(struct mapfragment **mf): frees and
 *  nulls *mf. JS has no out-pointer; callers do `mf = mapfrag_free(mf)`. The
 *  buffer free is a no-op under GC; the observable effect is the nulled ref. */
export function mapfrag_free(mf) {
    if (mf) {
        return null;
    }
    return null;
}

/** TYP_CANNOT_MATCH macro (sp_lev.c:204), module-private. */
function TYP_CANNOT_MATCH(typ) {
    return (typ === MAX_TYPE || typ === INVALID_TYPE);
}

/** C ref: sp_lev.c:281-296 — validate a mapfragment, returning an error string or null. */
export function mapfrag_error(mf) {
    let res = null;
    if (!mf) {
        res = "mapfragment error";
    } else if (!mapfrag_canmatch(mf)) {
        mf = mapfrag_free(mf);
        res = "mapfragment needs to have odd height and width";
    } else if (TYP_CANNOT_MATCH(mapfrag_get(mf, (mf.wid / 2) | 0, (mf.hei / 2) | 0))) {
        mf = mapfrag_free(mf);
        res = "mapfragment center must be valid terrain";
    }
    return res;
}

/** C ref: sp_lev.c:298-313 — does the mapfragment match the level centered at (x,y)? */
export function mapfrag_match(mf, x, y) {
    const halfW = (mf.wid / 2) | 0;
    const halfH = (mf.hei / 2) | 0;
    for (let rx = -halfW; rx <= halfW; rx++) {
        for (let ry = -halfH; ry <= halfH; ry++) {
            const mapc = mapfrag_get(mf, rx + halfW, ry + halfH);
            const lx = x + rx;
            const ly = y + ry;
            const levc = isok(lx, ly)
                ? ((game.level.at(lx, ly)?.typ) | 0)
                : STONE;
            if (!match_maptyps(mapc, levc))
                return false;
        }
    }
    return true;
}

// ─── selection floodfill + random wall direction — C ref: sp_lev.c:4583-4604 ─

/** C ref: selvar.c set_selection_floodfillchk — module-global setter
 *  (mirrors set_ok_location_func in sp_lev_loc.js). */
let _selection_floodfillchk = null;
export function set_selection_floodfillchk(fn) {
    _selection_floodfillchk = fn;
}

/** C ref: sp_lev.c:4591-4597 — static typ + floodfill predicate (returns C int 1/0). */
let floodfillchk_match_under_typ = 0;
function floodfillchk_match_under(x, y) {
    return (floodfillchk_match_under_typ === (game.level?.at(x, y)?.typ ?? 0)) ? 1 : 0;
}

function floodfillchk_match_accessible_live(x, y) {
    const t = game.level?.at(x, y)?.typ ?? 0;
    return (ACCESSIBLE(t) || t === SDOOR || t === SCORR) ? 1 : 0;
}

/** C ref: sp_lev.c:4599-4604 — set the static typ, then register the predicate. */
export function set_floodfillchk_match_under(typ) {
    floodfillchk_match_under_typ = typ;
    set_selection_floodfillchk(floodfillchk_match_under);
}

/** C ref: sp_lev.c:4583-4589 — choose a random W_* direction; consumes EXACTLY one rn2(4). */
export function random_wdir() {
    const wdirs = [W_NORTH, W_SOUTH, W_EAST, W_WEST];
    return wdirs[rn2(4)];
}

// ─── geometry — C ref: sp_lev.c:2871-2897, 4799-4809 ─────────────────────────

/** C ref: sp_lev.c:2871-2897 — turn STONE cells bordering rooms/corridors into walls. */
export function wallify_map(x1, y1, x2, y2) {
    y1 = Math.max(y1, 0);
    x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1);
    x2 = Math.min(x2, COLNO - 1);
    const g = game;
    for (let y = y1; y <= y2; y++) {
        const lo_yy = (y > 0) ? y - 1 : 0;
        const hi_yy = (y < y2) ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            const cell = g.level?.at(x, y);
            if (!cell || cell.typ !== STONE)
                continue;
            const lo_xx = (x > 1) ? x - 1 : 1;
            const hi_xx = (x < x2) ? x + 1 : x2;
            for (let yy = lo_yy; yy <= hi_yy; yy++) {
                for (let xx = lo_xx; xx <= hi_xx; xx++) {
                    const nbr = g.level?.at(xx, yy);
                    if (nbr && (IS_ROOM(nbr.typ) || nbr.typ === CROSSWALL)) {
                        cell.typ = (yy !== y) ? HWALL : VWALL;
                        yy = hi_yy; // end `yy` loop (C idiom)
                        break;      // end `xx` loop
                    }
                }
            }
        }
    }
}

/** C ref: sp_lev.c:4799-4809 — inverse of cvt_to_abscoord: absolute -> map/room-relative.
 *  C signature void cvt_to_relcoord(coordxy *x, coordxy *y); JS mutates a {x,y} coord
 *  (the established get_location in/out convention). Branch A (gc.coder->croom) is
 *  unexercised today (coder unported -> game.gc?.coder null -> Branch B fires). */
export function cvt_to_relcoord(coord) {
    const g = game;
    const croom = g.gc?.coder?.croom;
    if (croom) {
        coord.x -= croom.lx | 0;
        coord.y -= croom.ly | 0;
    } else {
        if (!g.gx || g.gx.xstart === undefined)
            reset_xystart_size();
        coord.x -= g.gx.xstart | 0;
        coord.y -= g.gy.ystart | 0;
    }
}

export function selection_new() {
    // C: struct selectionvar *tmps = (struct selectionvar *) alloc(sizeof *tmps);
    const tmps = {
        wid: COLNO,      // C: tmps->wid = COLNO;
        hei: ROWNO,      // C: tmps->hei = ROWNO;
        bounds_dirty: false,  // C: tmps->bounds_dirty = FALSE;
        bounds: {
            lx: COLNO,   // C: tmps->bounds.lx = COLNO;
            ly: ROWNO,   // C: tmps->bounds.ly = ROWNO;
            hx: 0,       // C: tmps->bounds.hx = tmps->bounds.hy = 0;
            hy: 0,
        },
        // C: tmps->map = (char *) alloc((COLNO * ROWNO) + 1);
        // (void) memset(tmps->map, 1, (COLNO * ROWNO));
        // tmps->map[(COLNO * ROWNO)] = '\0';
        map: new Array(COLNO * ROWNO + 1).fill(1),
    };
    // Null-terminate like C (though in JS this is not strictly necessary)
    tmps.map[COLNO * ROWNO] = 0;
    return tmps;
}

// C alloc() compatibility helper.  The active mapfragment/selection paths now
// construct native JS objects directly, but a few C-shaped special-level
// helpers still ask for byte storage by size.  Return zeroed storage with the
// requested extent rather than turning that compatibility call into a crash.
function alloc(size) {
    const n = Math.max(0, Number.isFinite(size) ? Math.trunc(size) : 0);
    return new Uint8Array(n);
}
function dupstr(str) {
    // C dupstr: duplicate (copy) a string
    // In JS, strings are immutable so we just return the same string.
    return str;
}
function stripdigits(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c < '0' || c > '9')
            out += c;
    }
    return out;
}
function str_lines_maxlen(str) {
    let maxLen = 0;
    let s1 = 0;
    while (s1 < str.length) {
        const nl = str.indexOf('\n', s1);
        const len = nl === -1 ? str.length - s1 : nl - s1;
        if (len > maxLen)
            maxLen = len;
        if (nl === -1)
            break;
        s1 = nl + 1;
    }
    return maxLen;
}

export function selection_free(sel, freesel) {
    if (sel) {
        if (sel.map)
            sel.map = null;
        sel.map = null;
        if (freesel) {
            // free((genericptr_t) sel) — in JS, object will be GC'd; just leave it
        } else {
            // (void) memset((genericptr_t) sel, 0, sizeof *sel);
            sel.wid = 0;
            sel.hei = 0;
            sel.bounds_dirty = false;
            sel.bounds = { lx: 0, ly: 0, hx: 0, hy: 0 };
            sel.map = null;
        }
    }
}

/* clear selection, setting all locations to value val */
export function selection_clear(sel, val) {
    /* (void) memset(sel->map, 1 + val, (COLNO * ROWNO)); */
    for (let i = 0; i < COLNO * ROWNO; i++) {
        sel.map[i] = 1 + val;
    }
    if (val) {
        sel.bounds.lx = 0;
        sel.bounds.ly = 0;
        sel.bounds.hx = COLNO - 1;
        sel.bounds.hy = ROWNO - 1;
    } else {
        sel.bounds.lx = COLNO;
        sel.bounds.ly = ROWNO;
        sel.bounds.hx = sel.bounds.hy = 0;
    }
    sel.bounds_dirty = false;
}

/** C ref: selvar.c:65-85 — selection_clone: deep-copy a selectionvar */
export function selection_clone(sel) {
    const tmps = {
        wid: sel.wid,
        hei: sel.hei,
        bounds_dirty: sel.bounds_dirty,
        bounds: {
            lx: sel.bounds.lx,
            ly: sel.bounds.ly,
            hx: sel.bounds.hx,
            hy: sel.bounds.hy,
        },
        map: sel.map.slice(),
    };
    return tmps;
}

/* set a point in a selection */
export function selection_setpoint(x, y, sel, c) {
    if (!sel || !sel.map)
        return;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return;

    if (c && !sel.bounds_dirty) {
        if (sel.bounds.lx > x)
            sel.bounds.lx = x;
        if (sel.bounds.ly > y)
            sel.bounds.ly = y;
        if (sel.bounds.hx < x)
            sel.bounds.hx = x;
        if (sel.bounds.hy < y)
            sel.bounds.hy = y;
    } else if (sel.map[sel.wid * y + x] != 0) {
        sel.bounds_dirty = true;
    }

    sel.map[sel.wid * y + x] = c + 1;
}

/** C ref: sp_lev.c:227-254 — mapfrag_fromstr: create mapfragment from string.
 *  RNG: 0 calls (no RNG in this function).
 *  Returns: pointer to mapfragment struct, or NULL if hei > MAP_Y_LIM. */
export function mapfrag_fromstr(str) {
    // Allocate the struct (C: alloc(sizeof *mf))
    const mf = {};

    // mf->data = dupstr(str);
    mf.data = dupstr(str);

    // (void) stripdigits(mf->data); — modifies in place in C, but JS
    // strings are immutable, so we replace it with the stripped version.
    mf.data = stripdigits(mf.data);

    // mf->wid = str_lines_maxlen(mf->data);
    mf.wid = str_lines_maxlen(mf.data);

    // mf->hei = 0;
    mf.hei = 0;

    // tmps = mf->data;
    let tmps = mf.data;

    // while (tmps && *tmps) { ... }
    while (tmps && tmps.length > 0) {
        // char *s1 = strchr(tmps, '\n');
        const s1_idx = tmps.indexOf('\n');
        let s1 = s1_idx === -1 ? null : tmps.substring(s1_idx);

        // if (mf->hei > MAP_Y_LIM) { free(mf->data); free(mf); return NULL; }
        if (mf.hei > 21) { // MAP_Y_LIM = 21
            // free(mf->data);
            // free(mf);
            return null;
        }

        // if (s1) s1++;
        if (s1) {
            s1 = s1.substring(1); // skip '\n'
        }

        // tmps = s1;
        tmps = s1;

        // mf->hei++;
        mf.hei++;
    }

    // mapfragment contract (this file's own comment, line ~498) is
    // { lines, wid, hei } — mapfrag_get (js/mklev.js) reads mf.lines[y].
    // C's own mapfrag_get (sp_lev.c:266-273) indexes the flat buffer as
    // data[y*(wid+1)+x], i.e. assumes every line is exactly `wid` chars
    // wide (the trailing '\n' is the (wid+1)th byte). The array-based split
    // here instead lets mapfrag_get pad short rows with ' ' — observationally
    // equivalent to C only when every line is the same width (true for
    // tut-1/tut-2's map blocks, verified rectangular). A future
    // non-rectangular map string would misalign C's flat-index read; that
    mf.lines = mf.data.split('\n');

    // return mf;
    return mf;
}

export function create_des_coder() {
    if (!game.gc)
        game.gc = {};
    if (!game.gc.coder)
        game.gc.coder = sp_level_coder_init();
}

// C ref: sp_lev.c:6351-6354 create_des_coder()/sp_level_coder_init() defaults.
// solidify/check_inaccessibles/allow_flips are consumed by load_special()
// (below) and, once ported, by lspo_level_flags — additive fields, nothing
// currently reads them except load_special's own body.
function sp_level_coder_init() {
    game.splev_map = new Uint8Array(COLNO * ROWNO);

    /* C sp_lev.c:6350-6351 — the two module statics this function resets
     * before the level's Lua runs. */
    splev_init_present = false;
    icedpools = false;

    const lf = game?.level?.flags;
    if (lf) {
        lf.is_maze_lev = false;
        lf.temperature = In_hell(game.u?.uz) ? 1 : 0;
        lf.rndmongen = true;
        lf.deathdrops = true;
    }
    return {
        lvl_is_joined: false, croom: null, premapped: 0,
        solidify: false, check_inaccessibles: false, allow_flips: 3,
        // C ref: sp_lev.c:6356-6362 struct sp_coder's n_subroom/tmproomlist/
        // failed_room (nested-room bookkeeping for lspo_room). n_subroom
        // verified against the C init directly); tmproomlist/failed_room
        // are pre-filled MAX_NESTED_ROOMS+1 entries of null/false, matching
        // C's `for (tmpi = 0; tmpi <= MAX_NESTED_ROOMS; tmpi++)` loop.
        n_subroom: 1,
        tmproomlist: new Array(MAX_NESTED_ROOMS + 1).fill(null),
        failed_room: new Array(MAX_NESTED_ROOMS + 1).fill(false),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_level_flags — C ref: nethack-c/src/sp_lev.c:3765-3834
// The des.level_flags wiring picks this up by name (name 'level_flags').
// ═══════════════════════════════════════════════════════════════════════════════

export function lspo_level_flags(...args) {
    if (args.length < 1)
        throw new Error("expected string params");

    create_des_coder();

    for (let i = 0; i < args.length; i++) {
        const s = args[i];

        if (!strcmpi(s, "noteleport"))
            game.level.flags.noteleport = 1;
        else if (!strcmpi(s, "hardfloor"))
            game.level.flags.hardfloor = 1;
        else if (!strcmpi(s, "nommap"))
            game.level.flags.nommap = 1;
        else if (!strcmpi(s, "shortsighted"))
            game.level.flags.shortsighted = 1;
        else if (!strcmpi(s, "arboreal"))
            game.level.flags.arboreal = 1;
        else if (!strcmpi(s, "mazelevel"))
            game.level.flags.is_maze_lev = 1;
        else if (!strcmpi(s, "shroud"))
            game.level.flags.hero_memory = 1;
        else if (!strcmpi(s, "graveyard"))
            game.level.flags.graveyard = 1;
        else if (!strcmpi(s, "icedpools"))
            icedpools = 1;
        else if (!strcmpi(s, "corrmaze"))
            game.level.flags.corrmaze = 1;
        else if (!strcmpi(s, "premapped"))
            game.gc.coder.premapped = 1;
        else if (!strcmpi(s, "solidify"))
            game.gc.coder.solidify = 1;
        else if (!strcmpi(s, "sokoban"))
            game.level.flags.sokoban_rules = 1;
        else if (!strcmpi(s, "inaccessibles"))
            game.gc.coder.check_inaccessibles = 1;
        else if (!strcmpi(s, "noflipx"))
            game.gc.coder.allow_flips &= ~2;
        else if (!strcmpi(s, "noflipy"))
            game.gc.coder.allow_flips &= ~1;
        else if (!strcmpi(s, "noflip"))
            game.gc.coder.allow_flips = 0;
        else if (!strcmpi(s, "temperate"))
            game.level.flags.temperature = 0;
        else if (!strcmpi(s, "hot"))
            game.level.flags.temperature = 1;
        else if (!strcmpi(s, "cold"))
            game.level.flags.temperature = -1;
        else if (!strcmpi(s, "nomongen"))
            game.level.flags.rndmongen = 0;
        else if (!strcmpi(s, "nodeathdrops"))
            game.level.flags.deathdrops = 0;
        else if (!strcmpi(s, "noautosearch"))
            game.level.flags.noautosearch = 1;
        else if (!strcmpi(s, "fumaroles"))
            game.level.flags.fumaroles = 1;
        else if (!strcmpi(s, "stormy"))
            game.level.flags.stormy = 1;
        else
            throw new Error("Unknown level flag " + s);
    }

    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_level_init — C ref: nethack-c/src/sp_lev.c:3843-3891
// The des.level_init wiring picks this up by name.
// ═══════════════════════════════════════════════════════════════════════════════

const initstyles = [
    "solidfill", "mazegrid", "maze", "rogue", "mines", "swamp", null
];

// initstyles2i — parallels initstyles (C: sp_lev.c:3849-3852)
const initstyles2i = [
    LVLINIT_SOLIDFILL, LVLINIT_MAZEGRID, LVLINIT_MAZE, LVLINIT_ROGUE,
    LVLINIT_MINES, LVLINIT_SWAMP, 0
];

export async function lspo_level_init(args) {
    // args is the marshalled LuaTable (des.level_init table)
    create_des_coder();

    /* C sp_lev.c:3852 `splev_init_present = TRUE;` — read by lspo_map's
     * SPLEV_LEFT alignment (sp_lev.c:6195) and by sel_set_ter's ICE arm
     * (sp_lev.c:4626).  See the declaration for what leaving it false cost. */
    splev_init_present = true;

    const init_lev = {};

    init_lev.init_style
        = initstyles2i[get_table_option(args, "style", "solidfill", initstyles)];
    init_lev.fg = get_table_mapchr_opt(args, "fg", ROOM);
    init_lev.bg = get_table_mapchr_opt(args, "bg", INVALID_TYPE);
    init_lev.smoothed = get_table_boolean_opt(args, "smoothed", 0);
    init_lev.joined = get_table_boolean_opt(args, "joined", 0);
    init_lev.lit = get_table_boolean_opt(args, "lit", BOOL_RANDOM);
    init_lev.walled = get_table_boolean_opt(args, "walled", 0);
    init_lev.filling = get_table_mapchr_opt(args, "filling", init_lev.fg);
    init_lev.corrwid = get_table_int_opt(args, "corrwid", -1);
    init_lev.wallthick = get_table_int_opt(args, "wallthick", -1);
    init_lev.rm_deadends = !get_table_boolean_opt(args, "deadends", 1);

    game.gc.coder.lvl_is_joined = !!init_lev.joined;

    if (init_lev.bg === INVALID_TYPE)
        init_lev.bg = (init_lev.init_style === LVLINIT_SWAMP) ? MOAT : STONE;

    await splev_initlev(init_lev);

    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_message — C ref: nethack-c/src/sp_lev.c:3081-3115
// The des.message wiring picks this up by name (name 'message').
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_message — C ref: nethack-c/src/sp_lev.c:3081-3115
// The des.message wiring picks this up by name (name 'message').
// ═══════════════════════════════════════════════════════════════════════════════

export function lspo_message(...args) {
    if (args.length < 1)
        throw new Error("Wrong parameters");

    create_des_coder();

    const msg = args[0];
    // C ref: sp_lev.c:3100-3112 — the accumulator is the PLAIN GLOBAL
    // gl.lev_message (decl.h:567), not a member of struct level.  This wrote
    // game.level.lev_message, which is a different path from the one
    // deliver_splev_message() (questpgr.c:655 → js/objnam.js) reads, so the
    // message was accumulated and then never found.  C's realloc-and-memcpy is
    // exactly "append, separated by '\n'":
    //     old_n = gl.lev_message ? Strlen(gl.lev_message) + 1 : 0;
    //     levmsg = alloc(old_n + n + 1);
    //     if (old_n) levmsg[old_n - 1] = '\n';
    //     ... memcpy old text, memcpy msg, NUL-terminate ...
    if (game.lev_message)
        game.lev_message = game.lev_message + '\n' + msg;
    else
        game.lev_message = msg;

    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_map — C ref: nethack-c/src/sp_lev.c:6084-6329
// des.map wires to this automatically (js/lua/nh_state.js's generic
// DES_EXPORT_EXCEPTIONS-less loop resolves 'map' -> 'lspo_map').
//
// String-arg form only (des.map([[...]])) — the only call shape tut-1/tut-2
// use (keystone-spec-lspo-map.md §5). Table form (halign/valign/x/y/lit/
// contents) throws UNPORTED-CALLEE rather than guess at the marshalling.
// overlap-check-with-retry loop) also throw UNPORTED-CALLEE — game.in_mk_
// themerooms is a real, already-live flag (js/mklev.js:5081-5082) set during
// the themed-room build; if that build path ever routes a des.map call
// through this same Lua-interpreter wiring (not checked in this pass), it
// will collide with the existing hand-rolled
// themeroom_lspo_map_redo_maploc_rng (js/mklev.js:4041) — flagged, not
// resolved, per the spec's explicit interaction-risk note.
//
// RNG: zero draws for the string-arg form (verified against every line of
// sp_lev.c:6084-6154 and 6200-6329 — the only RNG in the whole function is
// ═══════════════════════════════════════════════════════════════════════════════

// SPLEV alignment constants — C file-local #defines, sp_lev.c:167-174.
const SPLEV_LEFT = 1, SPLEV_H_LEFT = 2, SPLEV_CENTER = 3, SPLEV_H_RIGHT = 4,
    SPLEV_RIGHT = 5;
const MAP_TOP = 1, MAP_BOTTOM = 5; // TOP/BOTTOM, sp_lev.c:173-174 (CENTER shared with SPLEV_CENTER)

// C module statics sp_lev.c:192 (`static boolean splev_init_present, icedpools;`).
// splev_init_present is set TRUE by lspo_level_init (sp_lev.c:3852) and reset
// FALSE by sp_level_coder_init (sp_lev.c:6350); icedpools is set by the
// level-flags "icedpools" option (sp_lev.c:3788-3789, wired below) and reset
// alongside it.
//
// splev_init_present WAS `const false` here, with a comment arguing it was
// reasoning covered only ONE of its two readers.  The other is the map
// alignment at lspo_map (sp_lev.c:6195):
//     case SPLEV_LEFT: gx.xstart = splev_init_present ? 1 : 3;
// — so on every level that calls des.level_init() AND places a des.map with
// halign="left", this port put the map TWO COLUMNS to the right of where C
// puts it, and every random coordinate get_location() then draws inside that
// map lands on the wrong square.
//
// `m - juiblex: 31`; juiblex.lua:9 des.level_init{style="swamp"} then
// des.map{halign="left", valign="bottom"} then des.object("boulder")):
//     C  mx=1  -> sampled (8,19), MOAT, rejected, retried and took (4,18)
//     JS mx=3  -> sampled (10,19), ROOM, accepted first try
// first RNG divergence at leaf 72462.  (valign="bottom" was already right:
// both sides get my=15, the odd-bump at sp_lev.c:6220 included.)
let splev_init_present = false;
let icedpools = false;

/** C ref: sp_lev.c:4614-4635 (`staticfn void sel_set_ter`) — change map
 *  location terrain type during level creation. terr is { ter, tlit }
 *  (C's `terrain` struct: ter = new typ, tlit = new lit). */
export function sel_set_ter(x, y, terr) {
    if (!set_levltyp_lit(x, y, terr.ter, terr.tlit))
        return;
    const loc = game.level.at(x, y);
    if (!loc)
        return;
    /* handle doors and secret doors */
    if (loc.typ === SDOOR || IS_DOOR(loc.typ)) {
        if (loc.typ === SDOOR)
            loc.doormask = D_CLOSED;
        if (x !== 0) {
            const west = game.level.at(x - 1, y);
            if (west && (IS_WALL(west.typ) || west.horizontal))
                loc.horizontal = 1;
        }
    } else if (loc.typ === HWALL || loc.typ === IRONBARS) {
        loc.horizontal = 1;
    } else if (splev_init_present && loc.typ === ICE) {
        loc.icedpool = icedpools ? ICED_POOL : ICED_MOAT;
    } else if (loc.typ === CLOUD) {
        del_engr_at(x, y); /* clouds cannot have engravings */
    }
}

export function themerooms_contents_pillars(croom) {
    const rmWidth = (croom.hx - croom.lx + 1) | 0;
    const rmHeight = (croom.hy - croom.ly + 1) | 0;
    const terr = [HWALL, HWALL, HWALL, HWALL, LAVAPOOL, POOL, TREE];

    /* nhlib.lua:18-21 — `for i = #list, 2, -1 do j = math.random(i); swap end`.
     * math.random(i) is 1-based, so the 0-based swap partner is rn2(i). */
    for (let i = terr.length; i >= 2; i--) {
        const j = rn2(i);
        const tmp = terr[i - 1];
        terr[i - 1] = terr[j];
        terr[j] = tmp;
    }

    const tmpterrain = { ter: terr[0], tlit: SET_LIT_NOCHANGE };
    const xmax = rmWidth / 4 - 1, ymax = rmHeight / 4 - 1;
    for (let x = 0; x <= xmax; x++) {
        for (let y = 0; y <= ymax; y++) {
            for (const [dx, dy] of [[2, 2], [3, 2], [2, 3], [3, 3]]) {
                const coord = { x: x * 4 + dx, y: y * 4 + dy };
                get_location_coord(coord, ANY_LOC, croom,
                                   SP_COORD_PACK(coord.x, coord.y));
                if (!isok(coord.x, coord.y))
                    throw new Error('terrain coord not ok');
                sel_set_ter(coord.x, coord.y, tmpterrain);
            }
        }
    }
}

export function themerooms_contents_random_dungeon_feature(croom) {
    const rmWidth = (croom.hx - croom.lx + 1) | 0;
    const rmHeight = (croom.hy - croom.ly + 1) | 0;
    const feature = [CLOUD, LAVAPOOL, ICE, POOL, TREE];

    /* nhlib.lua:18-21 — `for i = #list, 2, -1 do j = math.random(i); swap end`.
     * math.random(i) is 1-based, so the 0-based swap partner is rn2(i). */
    for (let i = feature.length; i >= 2; i--) {
        const j = rn2(i);
        const tmp = feature[i - 1];
        feature[i - 1] = feature[j];
        feature[j] = tmp;
    }

    const tmpterrain = { ter: feature[0], tlit: SET_LIT_NOCHANGE };
    const coord = { x: (rmWidth - 1) / 2, y: (rmHeight - 1) / 2 };
    get_location_coord(coord, ANY_LOC, croom,
                       SP_COORD_PACK(coord.x, coord.y));
    if (!isok(coord.x, coord.y))
        throw new Error('terrain coord not ok');
    sel_set_ter(coord.x, coord.y, tmpterrain);
}

/** C ref: sp_lev.c:6084-6329 — lspo_map. See file-section comment above for
 *  scope. `args` is the raw Lua value passed to des.map(...): a JS string
 *  for the (only supported) single-string-arg call form (the interpreter
 *  never wraps a bare string argument in a LuaTable — js/lua/interp.js's
 *  nativeFn convention), or a LuaTable for the (unsupported) table form. */
export function lspo_map(args) {
    create_des_coder();

    /* C returns immediately when an earlier themed-room map already failed;
     * the room generator then abandons that candidate. */
    if (game.in_mk_themerooms && game.themeroom_failed)
        return 0;

    let mf, lr, tb;
    let lit = false; // C: boolean lit = FALSE; only the table form overrides it.
    let x = -1, y = -1;          // C: lua_Integer x = -1, y = -1;
    let has_contents = false;    // C: boolean has_contents = FALSE;
    let contentsFn = null;

    if (typeof args === 'string') {
        lr = tb = SPLEV_CENTER;
        mf = mapfrag_fromstr(args);
    } else {
        const table = args;
        const left_or_right = ['left', 'half-left', 'center', 'half-right', 'right', 'none'];
        const l_or_r2i = [SPLEV_LEFT, SPLEV_H_LEFT, SPLEV_CENTER, SPLEV_H_RIGHT,
                          SPLEV_RIGHT, -1, -1];
        const top_or_bot = ['top', 'center', 'bottom', 'none'];
        const t_or_b2i = [MAP_TOP, SPLEV_CENTER, MAP_BOTTOM, -1, -1];
        lr = l_or_r2i[get_table_option(table, 'halign', 'none', left_or_right)];
        tb = t_or_b2i[get_table_option(table, 'valign', 'none', top_or_bot)];
        const xy = get_table_xy_or_coord(table);
        x = xy.x;
        y = xy.y;
        const tmpstr = get_table_str(table, 'map');
        lit = !!get_table_boolean_opt(table, 'lit', false);
        const contents = (table && typeof table.get === 'function') ? table.get('contents') : null;
        if (contents != null && (contents.type === 'function' || typeof contents === 'function')) {
            has_contents = true;
            contentsFn = contents;
        }
        mf = mapfrag_fromstr(tmpstr);
    }

    if (!mf)
        throw new Error('Map data error');

    /* C's redo_maploc loop is already shared by the themed-room generator.
     * Reuse it here for the generic Lua path too, preserving the random
     * placement draws and the surrounding-room overlap check.  The helper is
     * only for the fully-random, no-room form; room-relative forms continue
     * through the ordinary coordinate path below. */
    if (game.in_mk_themerooms && lr === -1 && tb === -1
        && x === -1 && y === -1 && !game.gc?.coder?.croom) {
        const themed = themeroom_lspo_map_redo_maploc_rng(mf);
        if (!themed) {
            game.themeroom_failed = true;
            mapfrag_free(mf);
            return 0;
        }
        x = themed.x;
        y = themed.y;
    }
    if (game.in_mk_themerooms && lr === -1 && tb === -1
        && game.gc?.coder?.croom
        && (x === -1 || y === -1)) {
        /* C sp_lev.c:6158-6169: room-relative random placement.  somex/
         * somey return absolute room coordinates; subtracting the fragment
         * dimensions and then applying the normal croom offset below is the
         * slightly unusual, but intentional, C coordinate contract. */
        const croom = game.gc.coder.croom;
        if (x === -1) {
            x = somex(croom) - mf.wid;
            if (x < 1) x = 1;
        }
        if (y === -1) {
            y = somey(croom) - mf.hei;
            if (y < 1) y = 1;
        }
    }

    const sel = selection_new();

    const g = game;
    if (!g.gx)
        g.gx = {};
    if (!g.gy)
        g.gy = {};
    // C: redo_maploc: gx.xsize = mf->wid; gy.ysize = mf->hei; (sp_lev.c:6152-6153,
    // unconditional — the "redo_maploc" retry target is only reached from the
    // in_mk_themerooms branch, thrown above, so this always runs exactly once).
    g.gx.xsize = mf.wid;
    g.gy.ysize = mf.hei;

    const x_maze_max = g.gx.x_maze_max ?? ((COLNO - 1) & ~1);
    const y_maze_max = g.gy.y_maze_max ?? ((ROWNO - 1) & ~1);
    /* C sp_lev.c:6157-6199 — the table form's explicit-x,y placement arm.
     * The in_mk_themerooms sub-branch (x or y == -1) is thrown above, so this
     * is C's `if (isok(x, y))` path and its croom-relative adjustment. */
    if (lr === -1 && tb === -1) {
        if (!isok(x, y))
            throw new Error('Map requires either x,y or halign,valign params');
        const croom = g.gc.coder.croom;
        if (croom) {
            /* in a room? adjust to room relative coords */
            g.gx.xstart = x + croom.lx;
            g.gy.ystart = y + croom.ly;
            g.gx.xsize = Math.min(mf.wid, croom.hx - croom.lx);
            g.gy.ysize = Math.min(mf.hei, croom.hy - croom.ly);
        } else {
            g.gx.xsize = mf.wid;
            g.gy.ysize = mf.hei;
            g.gx.xstart = x;
            g.gy.ystart = y;
        }
    } else {
    switch (lr) {
        case SPLEV_LEFT:
            g.gx.xstart = splev_init_present ? 1 : 3;
            break;
        case SPLEV_H_LEFT:
            g.gx.xstart = 2 + Math.trunc((x_maze_max - 2 - g.gx.xsize) / 4);
            break;
        case SPLEV_CENTER:
            g.gx.xstart = 2 + Math.trunc((x_maze_max - 2 - g.gx.xsize) / 2);
            break;
        case SPLEV_H_RIGHT:
            g.gx.xstart = 2 + Math.trunc((x_maze_max - 2 - g.gx.xsize) * 3 / 4);
            break;
        case SPLEV_RIGHT:
            g.gx.xstart = x_maze_max - g.gx.xsize - 1;
            break;
    }
    switch (tb) {
        case MAP_TOP:
            g.gy.ystart = 3;
            break;
        case SPLEV_CENTER:
            g.gy.ystart = 2 + Math.trunc((y_maze_max - 2 - g.gy.ysize) / 2);
            break;
        case MAP_BOTTOM:
            g.gy.ystart = y_maze_max - g.gy.ysize - 1;
            break;
    }
    if (!(g.gx.xstart % 2))
        g.gx.xstart++;
    if (!(g.gy.ystart % 2))
        g.gy.ystart++;
    } /* end of C's halign/valign arm — the `if (lr == -1 && tb == -1)` else */

    // C: ystart bounds nudge (sp_lev.c:6236-6247). The in_mk_themerooms
    // sub-branch inside this block is unreachable (thrown above).
    if (g.gy.ystart < 0 || g.gy.ystart + g.gy.ysize > ROWNO) {
        g.gy.ystart += (g.gy.ystart > 0) ? -2 : 2;
        if (g.gy.ysize === ROWNO)
            g.gy.ystart = 0;
        if (g.gy.ystart < 0 || g.gy.ystart + g.gy.ysize > ROWNO)
            g.gy.ystart = 0;
    }

    if (g.gx.xsize <= 1 && g.gy.ysize <= 1) {
        reset_xystart_size();
    } else {
        // C: the "Themed rooms should never overwrite anything" overlap
        // (thrown above) — omitted, unreachable in this port.

        /* Load the map (sp_lev.c:6286-6306) */
        for (let y = g.gy.ystart; y < Math.min(ROWNO, g.gy.ystart + g.gy.ysize); y++) {
            for (let x = g.gx.xstart; x < Math.min(COLNO, g.gx.xstart + g.gx.xsize); x++) {
                const mptyp = mapfrag_get(mf, x - g.gx.xstart, y - g.gy.ystart);
                if (mptyp === INVALID_TYPE) {
                    /* TODO: warn about illegal map char */
                    continue;
                }
                if (mptyp >= MAX_TYPE)
                    continue;
                /* clear out levl: load_common_data may set them */
                const loc = game.level.at(x, y);
                if (loc) {
                    loc.flags = 0;
                    loc.horizontal = 0;
                    loc.roomno = 0;
                    loc.edge = 0;
                }
                // SpLev_Map — module-static touch-tracking array (sp_lev.c's
                // SpLev_Map[COLNO][ROWNO]), not yet consumed by any ported
                // caller (solidify_map/remove_boundary_syms still take it as
                // a parameter, WIRE_PENDING). Populate the flat x*ROWNO+y
                if (!g.splev_map)
                    g.splev_map = new Uint8Array(COLNO * ROWNO);
                g.splev_map[x * ROWNO + y] = 1;
                selection_setpoint(x, y, sel, 1);
                sel_set_ter(x, y, { ter: mptyp, tlit: lit });
            }
        }
    }

    mapfrag_free(mf);
    if (has_contents) {
        return {
            sel,
            needsContentsCall: true,
            contentsFn,
            wid: g.gx.xsize,
            hei: g.gy.ysize,
        };
    }

    // C: l_selection_push_copy(L, sel); return 1; — neither tut-1 nor tut-2
    // the exact Lua marshalling of `sel` is unobserved; return it as-is.
    return sel;
}

/* C sp_lev.c:6319 reset_xystart_size(), run after des.map's `contents`
 * closure returns.  Split out so js/lua/nh_state.js's trampoline can call it
 * without importing js/sp_lev_loc.js itself. */
export function map_contents_done() {
    reset_xystart_size();
}

export function selection_do_line(x1, y1, x2, y2, ov) {
    let d0, dx, dy, ai, bi, xi, yi;

    if (x1 < x2) {
        xi = 1;
        dx = x2 - x1;
    } else {
        xi = -1;
        dx = x1 - x2;
    }
    if (y1 < y2) {
        yi = 1;
        dy = y2 - y1;
    } else {
        yi = -1;
        dy = y1 - y2;
    }

    selection_setpoint(x1, y1, ov, 1);

    if (!dx && !dy) {
        /* single point - already all done */
        ;
    } else if (dx > dy) {
        ai = (dy - dx) * 2;
        bi = dy * 2;
        d0 = bi - dx;
        do {
            if (d0 >= 0) {
                y1 += yi;
                d0 += ai;
            } else
                d0 += bi;
            x1 += xi;
            selection_setpoint(x1, y1, ov, 1);
        } while (x1 != x2);
    } else {
        ai = (dx - dy) * 2;
        bi = dx * 2;
        d0 = bi - dy;
        do {
            if (d0 >= 0) {
                x1 += xi;
                d0 += ai;
            } else
                d0 += bi;
            y1 += yi;
            selection_setpoint(x1, y1, ov, 1);
        } while (y1 != y2);
    }
}

/** C ref: selvar.c:211-230 — selection_not: invert the selection */
export function selection_not(s) {
    for (let x = 0; x < s.wid; x++)
        for (let y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    /* C: selection_getbounds(s, &tmprect) — updates bounds via recalc */
    selection_recalc_bounds(s);
    return s;
}

/* C ref: selvar.c:801-811 — selection_force_newsyms: force newsym on selected points */
export function selection_force_newsyms(sel) {
    for (let x = 1; x < sel.wid; x++)
        for (let y = 0; y < sel.hei; y++)
            if (selection_getpoint(x, y, sel))
                newsym_force(x, y);
}

/* C ref: selvar.c:168-185 — selection_getpoint: return point value (0/1) */
export function selection_getpoint(x, y, sel) {
    if (!sel || !sel.map)
        return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return 0;
    return sel.map[sel.wid * y + x] - 1;
}

export function selection_recalc_bounds(sel) {
    let x, y;
    let r = { lx: -1, ly: -1, hx: -1, hy: -1 };

    if (!sel.bounds_dirty)
        return;

    sel.bounds.lx = COLNO;
    sel.bounds.ly = ROWNO;
    sel.bounds.hx = sel.bounds.hy = 0;

    r.lx = r.ly = r.hx = r.hy = -1;

    /* left */
    for (x = 0; x < sel.wid; x++) {
        for (y = 0; y < sel.hei; y++) {
            if (selection_getpoint(x, y, sel)) {
                r.lx = x;
                break;
            }
        }
        if (r.lx > -1)
            break;
    }

    if (r.lx > -1) {
        /* right */
        for (x = sel.wid - 1; x >= r.lx; x--) {
            for (y = 0; y < sel.hei; y++) {
                if (selection_getpoint(x, y, sel)) {
                    r.hx = x;
                    break;
                }
            }
            if (r.hx > -1)
                break;
        }

        /* top */
        for (y = 0; y < sel.hei; y++) {
            for (x = r.lx; x <= r.hx; x++) {
                if (selection_getpoint(x, y, sel)) {
                    r.ly = y;
                    break;
                }
            }
            if (r.ly > -1)
                break;
        }

        /* bottom */
        for (y = sel.hei - 1; y >= r.ly; y--) {
            for (x = r.lx; x <= r.hx; x++) {
                if (selection_getpoint(x, y, sel)) {
                    r.hy = y;
                    break;
                }
            }
            if (r.hy > -1)
                break;
        }
        sel.bounds = r;
    }

    sel.bounds_dirty = false;
}

/* check whether <x,y> is already in xs[],ys[] — C ref: selvar.c sel_flood_havepoint */
function sel_flood_havepoint(x, y, xs, ys, n) {
    let xx = x, yy = y;
    while (n > 0) {
        --n;
        if (xs[n] === xx && ys[n] === yy)
            return true;
    }
    return false;
}

/** C ref: selvar.c selection_floodfill — flood-fill selection.
 *  Does NOT call any RNG (no rn2/rnd).
 *  Stubbed helpers: none needed beyond what's already defined. */
export function selection_floodfill(ov, x, y, diagonals) {
    const tmp = selection_new();
    const SEL_FLOOD_STACK = COLNO * ROWNO;
    const dx = new Array(SEL_FLOOD_STACK);
    const dy = new Array(SEL_FLOOD_STACK);
    const floodfill_stack_overrun = 'floodfill stack overrun';
    let idx = 0;

    if (_selection_floodfillchk === null) {
        selection_free(tmp, true);
        return;
    }

    // SEL_FLOOD(x, y)
    if (idx < SEL_FLOOD_STACK) {
        dx[idx] = x;
        dy[idx] = y;
        idx++;
    } else {
        throw new Error(floodfill_stack_overrun);
    }

    do {
        idx--;
        x = dx[idx];
        y = dy[idx];
        if (isok(x, y)) {
            selection_setpoint(x, y, ov, 1);
            selection_setpoint(x, y, tmp, 1);
        }

        // SEL_FLOOD_CHKDIR(x+1, y, tmp)
        if (isok((x + 1), y)
            && _selection_floodfillchk((x + 1), y)
            && !selection_getpoint((x + 1), y, tmp)
            && !sel_flood_havepoint((x + 1), y, dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = (x + 1);
                dy[idx] = y;
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x-1, y, tmp)
        if (isok((x - 1), y)
            && _selection_floodfillchk((x - 1), y)
            && !selection_getpoint((x - 1), y, tmp)
            && !sel_flood_havepoint((x - 1), y, dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = (x - 1);
                dy[idx] = y;
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x, y+1, tmp)
        if (isok(x, (y + 1))
            && _selection_floodfillchk(x, (y + 1))
            && !selection_getpoint(x, (y + 1), tmp)
            && !sel_flood_havepoint(x, (y + 1), dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = x;
                dy[idx] = (y + 1);
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x, y-1, tmp)
        if (isok(x, (y - 1))
            && _selection_floodfillchk(x, (y - 1))
            && !selection_getpoint(x, (y - 1), tmp)
            && !sel_flood_havepoint(x, (y - 1), dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = x;
                dy[idx] = (y - 1);
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        if (diagonals) {
            // SEL_FLOOD_CHKDIR(x+1, y+1, tmp)
            if (isok((x + 1), (y + 1))
                && _selection_floodfillchk((x + 1), (y + 1))
                && !selection_getpoint((x + 1), (y + 1), tmp)
                && !sel_flood_havepoint((x + 1), (y + 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x-1, y-1, tmp)
            if (isok((x - 1), (y - 1))
                && _selection_floodfillchk((x - 1), (y - 1))
                && !selection_getpoint((x - 1), (y - 1), tmp)
                && !sel_flood_havepoint((x - 1), (y - 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x-1, y+1, tmp)
            if (isok((x - 1), (y + 1))
                && _selection_floodfillchk((x - 1), (y + 1))
                && !selection_getpoint((x - 1), (y + 1), tmp)
                && !sel_flood_havepoint((x - 1), (y + 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x+1, y-1, tmp)
            if (isok((x + 1), (y - 1))
                && _selection_floodfillchk((x + 1), (y - 1))
                && !selection_getpoint((x + 1), (y - 1), tmp)
                && !sel_flood_havepoint((x + 1), (y - 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
        }
    } while (idx > 0);

    selection_free(tmp, true);
}

const trap_types = [
    { name: 'arrow', type: ARROW_TRAP },
    { name: 'dart', type: DART_TRAP },
    { name: 'falling rock', type: ROCKTRAP },
    { name: 'board', type: SQKY_BOARD },
    { name: 'bear', type: BEAR_TRAP },
    { name: 'land mine', type: LANDMINE },
    { name: 'rolling boulder', type: ROLLING_BOULDER_TRAP },
    { name: 'sleep gas', type: SLP_GAS_TRAP },
    { name: 'rust', type: RUST_TRAP },
    { name: 'fire', type: FIRE_TRAP },
    { name: 'pit', type: PIT },
    { name: 'spiked pit', type: SPIKED_PIT },
    { name: 'hole', type: HOLE },
    { name: 'trap door', type: TRAPDOOR },
    { name: 'teleport', type: TELEP_TRAP },
    { name: 'level teleport', type: LEVEL_TELEP },
    { name: 'magic portal', type: MAGIC_PORTAL },
    { name: 'web', type: WEB },
    { name: 'statue', type: STATUE_TRAP },
    { name: 'magic', type: MAGIC_TRAP },
    { name: 'anti magic', type: ANTI_MAGIC },
    { name: 'polymorph', type: POLY_TRAP },
    { name: 'vibrating square', type: VIBRATING_SQUARE },
    { name: 'random', type: -1 },
    { name: null, type: NO_TRAP },
];

/** C ref: sp_lev.c:315-324 — solidify_map: make STONE cells not in SpLev_Map
 *  non-diggable and non-passable. Grid transform — receives flat arrays in
 *  x*ROWNO+y order, returns {typ, flags}. */
export function solidify_map({ typ, flags, splev_map, x_maze_max, y_maze_max }) {
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const idx = x * ROWNO + y;
            if (IS_STWALL(typ[idx]) && !splev_map[idx]) {
                flags[idx] |= (W_NONDIGGABLE | W_NONPASSWALL);
            }
        }
    }
    return { typ, flags };
}

/** C ref: sp_lev.c:4778-4795 — cvt_to_abscoord: convert room-relative coords
 *  to absolute. The gc.coder branch is unexercised (coder null → else branch).
 *  Receives (x, y, {xstart, ystart}) → returns {x, y}. */
export function cvt_to_abscoord(x, y, { xstart, ystart }) {
    if (typeof game !== 'undefined' && game && game.gc && game.gc.coder && game.gc.coder.croom) {
        x += game.gc.coder.croom.lx | 0;
        y += game.gc.coder.croom.ly | 0;
    } else {
        x += xstart | 0;
        y += ystart | 0;
    }
    return { x, y };
}

/** C ref: sp_lev.c:1016-1035 — remove_boundary_syms: if any CROSSWALLs are
 *  found anywhere on the map, change the CROSSWALLs within the used maze
 *  extent (and covered by SpLev_Map) to ROOM. Grid transform — receives flat
 *  arrays in x*ROWNO+y order, returns {typ, flags}. */
export function remove_boundary_syms({ typ, flags, splev_map, x_maze_max, y_maze_max }) {
    let has_bounds = false;
    for (let x = 0; x < COLNO - 1; x++) {
        for (let y = 0; y < ROWNO - 1; y++) {
            if (typ[x * ROWNO + y] === CROSSWALL) {
                has_bounds = true;
                break;
            }
        }
    }
    if (has_bounds) {
        for (let x = 0; x < x_maze_max; x++) {
            for (let y = 0; y < y_maze_max; y++) {
                const idx = x * ROWNO + y;
                if (typ[idx] === CROSSWALL && splev_map[idx])
                    typ[idx] = ROOM;
            }
        }
    }
    return { typ, flags };
}

/** C ref: sp_lev.c:428-437 — flip_dbridge_horizontal: swap a drawbridge's
 *  east/west direction bits. Cell transform — receives {typ, flags} (flags
 *  aliases drawbridgemask), returns {typ, flags}. */
export function flip_dbridge_horizontal({ typ, flags }) {
    if (IS_DRAWBRIDGE(typ)) {
        if ((flags & DB_DIR) === DB_WEST) {
            flags &= ~DB_WEST;
            flags |= DB_EAST;
        } else if ((flags & DB_DIR) === DB_EAST) {
            flags &= ~DB_EAST;
            flags |= DB_WEST;
        }
    }
    return { typ, flags };
}

/** C ref: sp_lev.c:442-451 — flip_dbridge_vertical: swap a drawbridge's
 *  north/south direction bits. Cell transform — receives {typ, flags} (flags
 *  aliases drawbridgemask), returns {typ, flags}. */
export function flip_dbridge_vertical({ typ, flags }) {
    if (IS_DRAWBRIDGE(typ)) {
        if ((flags & DB_DIR) === DB_NORTH) {
            flags &= ~DB_NORTH;
            flags |= DB_SOUTH;
        } else if ((flags & DB_DIR) === DB_SOUTH) {
            flags &= ~DB_SOUTH;
            flags |= DB_NORTH;
        }
    }
    return { typ, flags };
}

/** C ref: sp_lev.c:4373-4382 — get_trapname_bytype: linear scan of trap_types[]
 *  by type, returns the matching name or null (C: NULL) if no match before the
 *  { 0, NO_TRAP } terminator. Pure table lookup. */
export function get_trapname_bytype(ttyp) {
    for (let i = 0; trap_types[i].name; i++) {
        if (ttyp === trap_types[i].type)
            return trap_types[i].name;
    }
    return null;
}

/* ─── swapbits — C ref: hacklib.c:896-901 ─────────────────────────────── */
function swapbits(val, bita, bitb) {
    const tmp = ((val >> bita) & 1) ^ ((val >> bitb) & 1);
    return (val ^ ((tmp << bita) | (tmp << bitb)));
}

/* ─── flip_encoded_dir_bits — C ref: sp_lev.c:500-515 ───────────────────── */
export function flip_encoded_dir_bits(flp, val) {
    /* these depend on xdir[] and ydir[] order */
    if (flp & 1) {
        val = swapbits(val, 1, 7);
        val = swapbits(val, 2, 6);
        val = swapbits(val, 3, 5);
    }
    if (flp & 2) {
        val = swapbits(val, 1, 3);
        val = swapbits(val, 0, 4);
        val = swapbits(val, 7, 5);
    }
    return val;
}

/* ─── room_types table — C ref: sp_lev.c:3964-3997 ──────────────────────── */
const room_types = [
    { name: "ordinary", type: OROOM },
    { name: "themed", type: THEMEROOM },
    { name: "throne", type: COURT },
    { name: "swamp", type: SWAMP },
    { name: "vault", type: VAULT },
    { name: "beehive", type: BEEHIVE },
    { name: "morgue", type: MORGUE },
    { name: "barracks", type: BARRACKS },
    { name: "zoo", type: ZOO },
    { name: "delphi", type: DELPHI },
    { name: "temple", type: TEMPLE },
    { name: "anthole", type: ANTHOLE },
    { name: "cocknest", type: COCKNEST },
    { name: "leprehall", type: LEPREHALL },
    { name: "shop", type: SHOPBASE },
    { name: "armor shop", type: ARMORSHOP },
    { name: "scroll shop", type: SCROLLSHOP },
    { name: "potion shop", type: POTIONSHOP },
    { name: "weapon shop", type: WEAPONSHOP },
    { name: "food shop", type: FOODSHOP },
    { name: "ring shop", type: RINGSHOP },
    { name: "wand shop", type: WANDSHOP },
    { name: "tool shop", type: TOOLSHOP },
    { name: "book shop", type: BOOKSHOP },
    { name: "health food shop", type: FODDERSHOP },
    { name: "candle shop", type: CANDLESHOP },
    { name: null, type: 0 },
];

/* ─── get_mkroom_name — C ref: sp_lev.c:3999-4011 ───────────────────────── */
export function get_mkroom_name(rtype) {
    for (let i = 0; room_types[i].name; i++) {
        if (room_types[i].type === rtype)
            return room_types[i].name;
    }
    /* C: impossible("get_mkroom_name unknown rtype %d", rtype); return "unknown"; */
    if (typeof console !== 'undefined')
        console.warn('get_mkroom_name unknown rtype', rtype);
    return "unknown";
}

/* ─── strcmpi — case-insensitive string compare (mirrors C strcmpi) ──────── */
function strcmpi(s1, s2) {
    let i = 0;
    while (i < s1.length && i < s2.length) {
        const c1 = s1[i].toLowerCase();
        const c2 = s2[i].toLowerCase();
        if (c1 !== c2)
            return c1 < c2 ? -1 : 1;
        i++;
    }
    if (i < s1.length) return 1;
    if (i < s2.length) return -1;
    return 0;
}

/* ─── get_traptype_byname — C ref: sp_lev.c:4386-4400 ───────────────────── */
export function get_traptype_byname(trapname) {
    for (let i = 0; trap_types[i].name; i++) {
        if (!strcmpi(trapname, trap_types[i].name))
            return trap_types[i].type;
    }
    return NO_TRAP;
}

/* ─── ACCESSIBLE — C ref: rm.h macro (typ >= DOOR) ────── */
function ACCESSIBLE(typ) {
    return (typ >= DOOR);
}

/* ─── good_stair_loc — C ref: sp_lev.c:4146-4150 ─────────────────────────── */
export function good_stair_loc(x, y, { typ }) {
    const t = typ[x * ROWNO + y];
    return (t === ROOM || t === CORR || t === ICE) ? 1 : 0;
}

/* ─── floodfillchk_match_accessible — C ref: sp_lev.c:4607-4620 ──────────── */
export function floodfillchk_match_accessible(x, y, { typ }) {
    const t = typ[x * ROWNO + y];
    return (ACCESSIBLE(t) || t === SDOOR || t === SCORR) ? 1 : 0;
}

/* ─── sel_set_lit — C ref: sp_lev.c:5542-5560 ────────────────────────────── */
export function sel_set_lit(x, y, { typ, lit }) {
    const t = typ[x * ROWNO + y];
    return (t === LAVAPOOL || t === LAVAWALL || lit) ? 1 : 0;
}

/* ─── selection_getbounds — C ref: selvar.c:76-95 ────────────────────────
 * void
 * selection_getbounds(struct selectionvar *sel, NhRect *b)
 * {
 *     if (!sel || !b)
 *         return;
 *     selection_recalc_bounds(sel);
 *     if (sel->bounds.lx >= sel->wid) {
 *         b->lx = 0; b->ly = 0; b->hx = COLNO - 1; b->hy = ROWNO - 1;
 *     } else {
 *         b->lx = sel->bounds.lx; b->ly = sel->bounds.ly;
 *         b->hx = sel->bounds.hx; b->hy = sel->bounds.hy;
 *     }
 * }
 * C writes THROUGH the out-parameter `b` and returns nothing. Ported
 * exactly: every caller (all in this file) now declares its own local rect
 * and passes it by out-param, matching C's call idiom at each C call site. */
export function selection_getbounds(sel, b) {
    if (!sel || !b) return;
    selection_recalc_bounds(sel);
    if (sel.bounds.lx >= sel.wid) {
        b.lx = 0;
        b.ly = 0;
        b.hx = COLNO - 1;
        b.hy = ROWNO - 1;
    } else {
        b.lx = sel.bounds.lx;
        b.ly = sel.bounds.ly;
        b.hx = sel.bounds.hx;
        b.hy = sel.bounds.hy;
    }
}

/* ─── selection_filter_percent — C ref: selvar.c:223-245
 * struct selectionvar *
 * selection_filter_percent(struct selectionvar *ov, int percent)
 * {
 *     int x, y;
 *     struct selectionvar *ret;
 *     NhRect rect = cg.zeroNhRect;
 *
 *     if (!ov)
 *         return NULL;
 *     ret = selection_new();
 *     selection_getbounds(ov, &rect);
 *     for (x = rect.lx; x <= rect.hx; x++)
 *         for (y = rect.ly; y <= rect.hy; y++)
 *             if (selection_getpoint(x, y, ov) && (rn2(100) < percent))
 *                 selection_setpoint(x, y, ret, 1);
 *     return ret;
 * }
 * Updated for selection_getbounds' out-parameter shape: declare `rect`
 * (C's `cg.zeroNhRect`-initialized local) and pass it through. ──────── */
export function selection_filter_percent(ov, percent) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (selection_getpoint(x, y, ov) && (rn2(100) < percent)) {
                selection_setpoint(x, y, ret, 1);
            }
        }
    }
    return ret;
}

export function selection_filter_mapchar(ov, typ, lit) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            const levc = isok(x, y) ? ((game.level.at(x, y)?.typ) | 0) : STONE;
            if (selection_getpoint(x, y, ov) && match_maptyps(typ, levc)) {
                switch (lit) {
                case -1:
                    selection_setpoint(x, y, ret, rn2(2));
                    break;
                case 0:
                case 1:
                    if (((game.level.at(x, y)?.lit) | 0) === lit)
                        selection_setpoint(x, y, ret, 1);
                    break;
                default: /* -2 and anything else */
                    selection_setpoint(x, y, ret, 1);
                    break;
                }
            }
        }
    }
    return ret;
}

/* C ref: nhlsel.c:655-678 l_selection_filter_mapchar — the Lua wrapper.
 * `lit` defaults to -2 (luaL_optinteger), and an unrecognised map char is a
 * hard nhl_error, not a silent empty selection. */
export function l_selection_filter_mapchar(sel, mapchr, lit) {
    const typ = check_mapchr(mapchr == null ? '' : String(mapchr));
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return selection_filter_mapchar(sel, typ, (lit == null) ? -2 : (Number(lit) | 0));
}

export function selection_rndcoord(ov, x, y, removeit) {
    let idx = 0;
    let c;
    let rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);

    for (let dx = rect.lx; dx <= rect.hx; dx++)
        for (let dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov))
                idx++;

    if (idx) {
        c = rn2(idx);
        for (let dx = rect.lx; dx <= rect.hx; dx++)
            for (let dy = rect.ly; dy <= rect.hy; dy++)
                if (selection_getpoint(dx, dy, ov)) {
                    if (!c) {
                        x.value = dx;
                        y.value = dy;
                        if (removeit)
                            selection_setpoint(dx, dy, ov, 0);
                        return 1;
                    }
                    c--;
                }
    }
    x.value = y.value = -1;
    return 0;
}

/* ─── selection_do_grow — C ref: selvar.c:321-369 ───────────────────────── */
export function selection_do_grow(ov, dir) {
    if (!ov) return;
    const tmp = selection_new();
    if (dir === W_RANDOM) dir = random_wdir();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = Math.max(0, rect.lx - 1); x <= Math.min(COLNO - 1, rect.hx + 1); x++) {
        for (let y = Math.max(0, rect.ly - 1); y <= Math.min(ROWNO - 1, rect.hy + 1); y++) {
            if (((dir & W_WEST) && selection_getpoint(x + 1, y, ov))
                || (((dir & (W_WEST | W_NORTH)) === (W_WEST | W_NORTH))
                    && selection_getpoint(x + 1, y + 1, ov))
                || ((dir & W_NORTH) && selection_getpoint(x, y + 1, ov))
                || (((dir & (W_NORTH | W_EAST)) === (W_NORTH | W_EAST))
                    && selection_getpoint(x - 1, y + 1, ov))
                || ((dir & W_EAST) && selection_getpoint(x - 1, y, ov))
                || (((dir & (W_EAST | W_SOUTH)) === (W_EAST | W_SOUTH))
                    && selection_getpoint(x - 1, y - 1, ov))
                || ((dir & W_SOUTH) && selection_getpoint(x, y - 1, ov))
                || (((dir & (W_SOUTH | W_WEST)) === (W_SOUTH | W_WEST))
                    && selection_getpoint(x + 1, y - 1, ov))) {
                selection_setpoint(x, y, tmp, 1);
            }
        }
    }
    const rect2 = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmp, rect2);
    for (let x = rect2.lx; x <= rect2.hx; x++) {
        for (let y = rect2.ly; y <= rect2.hy; y++) {
            if (selection_getpoint(x, y, tmp)) {
                selection_setpoint(x, y, ov, 1);
            }
        }
    }
    selection_free(tmp, true);
}

/* ─── selection_or — C ref: nhlsel.c:305-328 l_selection_or ──────────────────
 * Union of two selectionvars: build a fresh selection whose bounds are the
 * rect containing BOTH operands' raw bounds (rect_bounds, rect.c:134-140 — no
 * recalc), then OR selection_getpoint(sela) | selection_getpoint(selb) into it
 * for every point in that rect. C overwrites selr->bounds = rect at the end
 * (nhlsel.c:323), so we do the same. RNG: none. */
export function selection_or(sela, selb) {
    const selr = selection_new();
    /* rect_bounds(sela->bounds, selb->bounds, &rect) — uses the raw bounds
     * structs directly, exactly as C does (not selection_getbounds). */
    const rect = {
        lx: Math.min(sela.bounds.lx, selb.bounds.lx),
        ly: Math.min(sela.bounds.ly, selb.bounds.ly),
        hx: Math.max(sela.bounds.hx, selb.bounds.hx),
        hy: Math.max(sela.bounds.hy, selb.bounds.hy),
    };
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const val = selection_getpoint(x, y, sela) | selection_getpoint(x, y, selb);
            selection_setpoint(x, y, selr, val);
        }
    selr.bounds = { lx: rect.lx, ly: rect.ly, hx: rect.hx, hy: rect.hy };
    return selr;
}

export function selection_and(sela, selb) {
    const selr = selection_new();
    const rect = {
        lx: Math.min(sela.bounds.lx, selb.bounds.lx),
        ly: Math.min(sela.bounds.ly, selb.bounds.ly),
        hx: Math.max(sela.bounds.hx, selb.bounds.hx),
        hy: Math.max(sela.bounds.hy, selb.bounds.hy),
    };
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const val = selection_getpoint(x, y, sela) & selection_getpoint(x, y, selb);
            selection_setpoint(x, y, selr, val);
        }
    selr.bounds = { lx: rect.lx, ly: rect.ly, hx: rect.hx, hy: rect.hy };
    return selr;
}

/* ─── selection_sub — C ref: nhlsel.c:361-385 l_selection_sub ──────────────
 * Set difference used by Tourist quest levels to exclude shop squares from
 * their random trap selection.  C scans the rectangle containing both raw
 * bounds, writes (a ^ b) & a, then recalculates the result bounds. */
export function selection_sub(sela, selb) {
    const selr = selection_new();
    const rect = {
        lx: Math.min(sela.bounds.lx, selb.bounds.lx),
        ly: Math.min(sela.bounds.ly, selb.bounds.ly),
        hx: Math.max(sela.bounds.hx, selb.bounds.hx),
        hy: Math.max(sela.bounds.hy, selb.bounds.hy),
    };
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const a = selection_getpoint(x, y, sela) | 0;
            const b = selection_getpoint(x, y, selb) | 0;
            selection_setpoint(x, y, selr, (a ^ b) & a);
        }
    selection_recalc_bounds(selr);
    return selr;
}

export function l_selection_flood(x, y, diagonals) {
    const sel = selection_new();
    const coord = { x: x | 0, y: y | 0 };
    get_location_coord(coord, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(coord.x, coord.y));
    if (isok(coord.x, coord.y)) {
        set_floodfillchk_match_under(game.level?.at(coord.x, coord.y)?.typ ?? 0);
        selection_floodfill(sel, coord.x, coord.y, !!diagonals);
    }
    return sel;
}

/* ─── params_sel_2coords — C ref: nhlsel.c:474-504 ────────────────────────────
 * The shared argument decoder for selection.line / selection.rect /
 * selection.fillrect (== selection.area).  C dispatches on lua_gettop, and the
 * two accepted arities differ in WHICH selection the result is built on:
 *   argc==4  (x1,y1, x2,y2)      -> a BRAND NEW selection (l_selection_new)
 *   argc==5  (sel, x1,y1, x2,y2) -> the caller's `sel`
 * anything else returns FALSE, which every caller turns into nhl_error.
 * Lua method desugaring makes `s:line(x1,y1,x2,y2)` argc==5, so both shapes
 * arrive here through the same binding.
 * Returns null for the error case; { sel, x1, y1, x2, y2 } otherwise. */
function params_sel_2coords(args) {
    if (args.length === 4) {
        return {
            sel: selection_new(),
            x1: Number(args[0]) | 0, y1: Number(args[1]) | 0,
            x2: Number(args[2]) | 0, y2: Number(args[3]) | 0,
        };
    } else if (args.length === 5) {
        return {
            sel: args[0],
            x1: Number(args[1]) | 0, y1: Number(args[2]) | 0,
            x2: Number(args[3]) | 0, y2: Number(args[4]) | 0,
        };
    }
    return null;
}

/* The get_location_coord + l_selection_clone preamble those same three C
 * bodies share verbatim (e.g. nhlsel.c:569-576).  Note the CLONE: C works on a
 * copy and returns the copy, so `s:fillrect(...)` as a bare Lua statement
 * leaves `s` UNCHANGED — a quirk of the C API, ported as-is (Cardinal Rule 1).
 * Returns { sel, c1, c2 } where sel is the clone to draw into. */
function sel_2coords_prep(p) {
    const c1 = { x: p.x1, y: p.y1 };
    get_location_coord(c1, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(p.x1, p.y1));
    const c2 = { x: p.x2, y: p.y2 };
    get_location_coord(c2, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(p.x2, p.y2));
    return { sel: selection_clone(p.sel), c1, c2 };
}

export function l_selection_fillrect(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.fillrect: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    if (c1.x === c2.x) {
        for (let y = c1.y; y <= c2.y; y++)
            selection_setpoint(c1.x, y, sel, 1);
    } else {
        for (let y = c1.y; y <= c2.y; y++)
            selection_do_line(c1.x, y, c2.x, y, sel);
    }
    return sel;
}

/* ─── l_selection_line — C ref: nhlsel.c:504-527 (registered as
 * selection.line) ────────────────────────────────────────────────────────────
 * Was a record-only stub, so every `selection.line(...)` returned undefined and
 * the des.terrain / `|` union it feeds got nothing: bigrm-1.lua:37-49,
 * valley.lua:38-48 and minetn-5.lua:38-58 drew none of their terrain lines.
 * RNG: none. */
export function l_selection_line(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.line: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    selection_do_line(c1.x, c1.y, c2.x, c2.y, sel);
    return sel;
}

/* ─── l_selection_rect — C ref: nhlsel.c:528-553 (registered as
 * selection.rect) ────────────────────────────────────────────────────────────
 * The four edges of the rectangle, in C's order. Note C's THIRD call is
 * selection_do_line(x1,y1, x1,y2) and its second is (x1,y1, x2,y1) — the
 * top edge, left edge, right edge, bottom edge, with y1/y2 as written (C does
 * not sort the corners). Was a record-only stub. RNG: none. */
export function l_selection_rect(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.rect: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    selection_do_line(c1.x, c1.y, c2.x, c1.y, sel);
    selection_do_line(c1.x, c1.y, c1.x, c2.y, sel);
    selection_do_line(c2.x, c1.y, c2.x, c2.y, sel);
    selection_do_line(c1.x, c2.y, c2.x, c2.y, sel);
    return sel;
}

/* ─── l_selection_match — C ref: nhlsel.c:680-717 (registered as
 * selection.match) ───────────────────────────────────────────────────────────
 * Build a fresh selection holding every map position whose surroundings match
 * the mapfragment string. Was a record-only stub returning undefined, and
 * tut-1.lua:122-123 does
 *     des.region(selection.match("#"), "unlit");
 *     des.region(selection.match(" "), "unlit");
 * so lspo_region was handed `undefined` and the tutorial's corridors and solid
 * rock were never unlit — while C darkens both.
 *
 * The loop bounds are C's, quirks included: y runs 0..sel->hei INCLUSIVE (the
 * last iteration is dropped by selection_setpoint's own guard) and x starts at
 * 1, so column 0 is never tested. selection_recalc_bounds afterwards is C's own
 * fix-up for the "nothing matched at (0,1)" case. RNG: none. */
export function l_selection_match(mapstr) {
    const sel = selection_new();
    const mf = mapfrag_fromstr(String(mapstr));
    const err = mapfrag_error(mf);
    if (err != null)
        throw new Error(err);
    for (let y = 0; y <= sel.hei; y++)
        for (let x = 1; x < sel.wid; x++)
            selection_setpoint(x, y, sel, mapfrag_match(mf, x, y) ? 1 : 0);
    selection_recalc_bounds(sel);
    mapfrag_free(mf);
    return sel;
}

export function l_selection_randline(sel, x1, y1, x2, y2, rough) {
    const c1 = { x: x1, y: y1 };
    get_location_coord(c1, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(x1, y1));
    const c2 = { x: x2, y: y2 };
    get_location_coord(c2, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(x2, y2));
    const clone = selection_clone(sel);
    selection_do_randline(c1.x, c1.y, c2.x, c2.y, rough, 12, clone);
    return clone;
}

export function l_selection_rndcoord(sel, removeit) {
    const xRef = { value: -1 }, yRef = { value: -1 };
    selection_rndcoord(sel, xRef, yRef, removeit ? 1 : 0);
    const coord = { x: xRef.value, y: yRef.value };
    if (!(coord.x === -1 && coord.y === -1)) {
        update_croom();
        cvt_to_relcoord(coord);
    }
    return { x: coord.x, y: coord.y };
}

export function l_selection_setpoint(...args) {
    const argc = args.length;
    let sel = null;
    let x = -1, y = -1;
    let val = 1;

    if (argc === 0) {
        selection_new(); /* C: (void) l_selection_new(L) — sel stays NULL */
    } else if (argc === 1) {
        sel = args[0];
    } else if (argc === 2) {
        x = Number(args[0]) | 0;
        y = Number(args[1]) | 0;
        /* C pops the two integers and pushes a fresh selection, which then
         * becomes slot 1 — i.e. the point lands in a NEW selection, and that
         * new selection is what gets returned. */
        sel = selection_new();
    } else {
        sel = args[0];
        x = Number(args[1]) | 0;
        y = Number(args[2]) | 0;
        val = (args[3] == null) ? 1 : (Number(args[3]) | 0);
    }

    if (!sel || !sel.map)
        throw new Error('Selection setpoint error');

    const crd = (x === -1 && y === -1) ? SP_COORD_PACK_RANDOM(0)
                                       : SP_COORD_PACK(x, y);
    const coord = { x, y };
    get_location_coord(coord, ANY_LOC, game.gc?.coder?.croom ?? null, crd);
    selection_setpoint(coord.x, coord.y, sel, val);
    return sel; /* C: lua_settop(L, 1); return 1 */
}

/* Back-compat alias for the bare-form call site this function grew out of. */
export function selection_setpoint_rndcoord(sel) {
    return l_selection_setpoint(sel);
}

/* ─── selection_do_randline — C ref: selvar.c:682-723 ───────────────────── */
export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    let mx, my;
    let dx, dy;

    if (rec < 1 || (x2 === x1 && y2 === y1))
        return;

    if (rough > Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)))
        rough = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

    if (rough < 2) {
        mx = ((x1 + x2) / 2) | 0;
        my = ((y1 + y2) / 2) | 0;
    } else {
        do {
            dx = rn2(rough) - ((rough / 2) | 0);
            dy = rn2(rough) - ((rough / 2) | 0);
            mx = (((x1 + x2) / 2) | 0) + dx;
            my = (((y1 + y2) / 2) | 0) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }

    if (!selection_getpoint(mx, my, ov)) {
        selection_setpoint(mx, my, ov, 1);
    }

    rough = ((rough * 2) / 3) | 0;

    rec--;

    selection_do_randline(x1, y1, mx, my, rough, rec, ov);
    selection_do_randline(mx, my, x2, y2, rough, rec, ov);

    selection_setpoint(x2, y2, ov, 1);
}

/* ─── set_door_orientation — C ref: sp_lev.c:1043-1085 ──────────────────── */
function set_door_orientation(typ, x, y) {
    const DBWALL = 12;
    const IRONBARS = 22;
    const IS_WALL = (t) => t && t <= DBWALL;
    const IS_DOOR = (t) => t === DOOR;
    const IS_DOORJOIN = (t) => IS_OBSTRUCTED(t) || t === IRONBARS;

    const getTyp = (cx, cy) => typ[cx * ROWNO + cy];

    let wleft = isok(x - 1, y)
        && (IS_WALL(getTyp(x - 1, y)) || IS_DOOR(getTyp(x - 1, y))
            || getTyp(x - 1, y) === SDOOR);
    let wright = isok(x + 1, y)
        && (IS_WALL(getTyp(x + 1, y)) || IS_DOOR(getTyp(x + 1, y))
            || getTyp(x + 1, y) === SDOOR);
    let wup = isok(x, y - 1)
        && (IS_WALL(getTyp(x, y - 1)) || IS_DOOR(getTyp(x, y - 1))
            || getTyp(x, y - 1) === SDOOR);
    let wdown = isok(x, y + 1)
        && (IS_WALL(getTyp(x, y + 1)) || IS_DOOR(getTyp(x, y + 1))
            || getTyp(x, y + 1) === SDOOR);

    if (!wleft && !wright && !wup && !wdown) {
        wleft = !isok(x - 1, y) || IS_DOORJOIN(getTyp(x - 1, y));
        wright = !isok(x + 1, y) || IS_DOORJOIN(getTyp(x + 1, y));
        wup = !isok(x, y - 1) || IS_DOORJOIN(getTyp(x, y - 1));
        wdown = !isok(x, y + 1) || IS_DOORJOIN(getTyp(x, y + 1));
    }
    return ((wleft || wright) && !(wup && wdown)) ? 1 : 0;
}

/* ─── sel_set_door — C ref: sp_lev.c:4654-4670 ──────────────────────────── */
export function sel_set_door(x, y, { typ, splev_map, door }) {
    let doorMask = door;
    let cellTyp = typ[x * ROWNO + y];

    if (!(cellTyp === DOOR) && cellTyp !== SDOOR)
        cellTyp = (doorMask & D_SECRET) ? SDOOR : DOOR;
    if (doorMask & D_SECRET) {
        doorMask &= ~D_SECRET;
        if (doorMask < D_CLOSED)
            doorMask = D_CLOSED;
    }
    const horiz = set_door_orientation(typ, x, y);
    return { typ: cellTyp, flags: doorMask, horizontal: horiz, splev: 1 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Trap opcode chain — C ref: sp_lev.c lspo_trap (4404-4477) / create_trap
// (1812-1847) / get_table_traptype_opt (4357-4372) / get_table_xy_or_coord
// (3193-3210) / get_coord (5325-5373) / get_location_coord (1338-1354).
// nothing. This chain wires the tut path (table-form des.trap with absolute
// coords) into the already-landed general mktrap (js/mklev.js). croom and
// helpers; VIBRATING_SQUARE and launchfrom/teledest are handled explicitly.
// RNG: this layer draws nothing itself — mktrap draws its own rnd(4).
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── SP_COORD_* packing macros — C ref: sp_lev.h:66,82-85 ──────────────── */
function SP_COORD_X(l) { return l & 0xff; }
function SP_COORD_Y(l) { return (l >> 16) & 0xff; }
function SP_COORD_PACK(x, y) { return (x & 0xff) + ((y & 0xff) << 16); }
function SP_COORD_PACK_RANDOM(f) { return SP_COORD_IS_RANDOM | f; }

/* ─── get_table_traptype_opt — C ref: sp_lev.c:4357-4372 ────────────────── */
function get_table_traptype_opt(args, name, defval) {
    const trapstr = get_table_str_opt(args, name, '');
    let res = defval;
    if (trapstr) {
        for (let i = 0; trap_types[i].name; i++) {
            if (!strcmpi(trapstr, trap_types[i].name)) {
                res = trap_types[i].type;
                break;
            }
        }
    }
    return res;
}

/* ─── get_coord — C ref: sp_lev.c:5325-5373 ───────────────────────────────
 * `v` is the marshalled LuaTable value read from a field (or null/nil).
 * Covers the array {a,b} and {x=,y=} table forms — the only ones tut-1/
 * tut-2 use. A non-table, non-nil value is C's nhl_error path; not reached
 * here (des.trap's "coord"/"launchfrom"/"teledest" fields are always tables
 * or absent on the tut path) so it isn't ported. */
function get_coord(v) {
    if (v == null)
        return null; // C: nil coord — caller's x/y are left unchanged
    if (!(v && v.type === 'table'))
        throw new Error('lspo_trap: non-table coord specified');
    const xv = v.get('x');
    if (xv != null) {
        const yv = v.get('y');
        if (yv == null)
            throw new Error('lspo_trap: Not a coordinate');
        return { x: Number(xv), y: Number(yv) };
    }
    if (v.length() !== 2)
        throw new Error('lspo_trap: Not a coordinate');
    return { x: Number(v.get(1)), y: Number(v.get(2)) };
}

/* ─── get_table_xy_or_coord — C ref: sp_lev.c:3193-3210 ─────────────────── */
function get_table_xy_or_coord(args) {
    let mx = get_table_int_opt(args, 'x', -1);
    let my = get_table_int_opt(args, 'y', -1);
    if (mx === -1 && my === -1) {
        const c = get_coord(args.get('coord'));
        if (c) {
            mx = c.x;
            my = c.y;
        }
    }
    return { x: mx, y: my };
}

/* ─── get_unpacked_coord — C ref: sp_lev.c:1317-1335 ────────────────────── */
function get_unpacked_coord(crd, defhumidity) {
    if (crd & SP_COORD_IS_RANDOM) {
        const getloc_flags = (crd & ~SP_COORD_IS_RANDOM) || defhumidity;
        return { x: -1, y: -1, is_random: 1, getloc_flags };
    }
    return { x: SP_COORD_X(crd), y: SP_COORD_Y(crd), is_random: 0, getloc_flags: defhumidity };
}

export function get_location_coord(coord, humidity, croom, crd) {
    const c = get_unpacked_coord(crd, humidity);
    coord.x = c.x;
    coord.y = c.y;
    get_location(coord, c.getloc_flags | (c.is_random ? NO_LOC_WARN : 0), croom);
    if (coord.x === -1 && coord.y === -1 && c.is_random)
        get_location(coord, humidity, croom);
}

/* ─── get_room_loc — C ref: sp_lev.c:1361-1378 ────────────────────────────
 * RNG: somexy() on the fully-random path; rn2(width)/rn2(height) when only
 * one of the two coords is random. */
function get_room_loc(coord, croom) {
    if (coord.x < 0 && coord.y < 0) {
        const c = { x: 0, y: 0 };
        if (somexy(croom, c)) {
            coord.x = c.x;
            coord.y = c.y;
        } else {
            /* C: panic("get_room_loc : can't find a place!") */
            throw new Error("get_room_loc : can't find a place!");
        }
    } else {
        if (coord.x < 0)
            coord.x = rn2(croom.hx - croom.lx + 1);
        if (coord.y < 0)
            coord.y = rn2(croom.hy - croom.ly + 1);
        coord.x += croom.lx;
        coord.y += croom.ly;
    }
}

/* ─── get_free_room_loc — C ref: sp_lev.c:1385-1404 ───────────────────────
 * First try goes through get_location_coord; if that lands on a non-ROOM
 * cell, retry through get_room_loc (which re-randomises from the ORIGINAL
 * *x/*y, per C's `try_x = *x, try_y = *y` inside the loop) until a ROOM cell
 * turns up or 100 tries elapse. */
function get_free_room_loc(coord, croom, pos) {
    const orig_x = coord.x, orig_y = coord.y;
    const t = { x: -1, y: -1 };
    let trycnt = 0;
    get_location_coord(t, DRY, croom, pos);
    if (game.level?.at(t.x, t.y)?.typ !== ROOM) {
        do {
            t.x = orig_x;
            t.y = orig_y;
            get_room_loc(t, croom);
        } while (game.level?.at(t.x, t.y)?.typ !== ROOM && ++trycnt <= 100);
        if (trycnt > 100)
            throw new Error("get_free_room_loc:  can't find a place!");
    }
    coord.x = t.x;
    coord.y = t.y;
}

/* ─── create_trap — C ref: sp_lev.c:1812-1847 ─────────────────────────────
 * RNG: none in this function itself; mktrap draws its own (victim roll). */
async function create_trap(t, croom) {
    /* C sp_lev.c:1818-1821 —
     *     if (t->type == VIBRATING_SQUARE) {
     *         pick_vibrasquare_location();
     *         maketrap(svi.inv_pos.x, svi.inv_pos.y, VIBRATING_SQUARE);
     *         return;
     *     }
     * dat/hellfill.lua:437-438 reaches this on the invocation level, and it
     * returns BEFORE the mktrap() tail, so no MKTRAP flags and no victim roll.
     * pick_vibrasquare_location is ported in js/mkmaze.js (where C keeps it). */
    if (t.type === VIBRATING_SQUARE) {
        pick_vibrasquare_location();
        await maketrap(game.svi.inv_pos.x, game.svi.inv_pos.y, VIBRATING_SQUARE);
        return;
    }

    let x, y;
    if (croom) {
        const coord = { x: -1, y: -1 };
        get_free_room_loc(coord, croom, t.coord);
        x = coord.x;
        y = coord.y;
    } else {
        let trycnt = 0;
        const coord = { x: -1, y: -1 };
        do {
            get_location_coord(coord, DRY, croom, t.coord);
            x = coord.x;
            y = coord.y;
        } while ((game.level?.at(x, y)?.typ === STAIRS
                  || game.level?.at(x, y)?.typ === LADDER)
                 && ++trycnt <= 100);
        if (trycnt > 100)
            return;
    }

    let mktrap_flags = MKTRAP_MAZEFLAG;
    if (!t.spider_on_web)
        mktrap_flags |= MKTRAP_NOSPIDERONWEB;
    if (t.seen)
        mktrap_flags |= MKTRAP_SEEN;
    if (t.novictim)
        mktrap_flags |= MKTRAP_NOVICTIM;

    await mktrap(t.type, mktrap_flags, null, { x, y });
}

/* ─── lspo_trap — C ref: sp_lev.c:4404-4477 ───────────────────────────────
 * argc==1 string / argc==2 string+table / argc==3 positional forms plus the
 * pre-existing table form (des.trap({ type=, coord=, seen=, ... })). The
 * des-binding glue in js/lua/nh_state.js spreads the raw Lua call args
 * (`real(...args)`), same as lspo_door/lspo_stair/lspo_feature, so a
 * variadic signature here sees them positionally.
 * RNG: none — mktrap draws its own. */
export async function lspo_trap(...args) {
    create_des_coder();

    const tmptrap = { spider_on_web: 1, seen: 0, novictim: 0, type: NO_TRAP, coord: 0 };
    let x, y;
    const gl = game.gl || (game.gl = {});
    /* C lspo_trap starts each call with the previous launchplace already
     * cleared by the preceding create_trap().  Initialise it explicitly so
     * malformed or cancelled level callbacks cannot leak a destination. */
    gl.launchplace = { x: 0, y: 0 };

    if (args.length === 1 && typeof args[0] === 'string') {
        // sp_lev.c:4415-4419: argc==1, arg1 string -> type by name; x=y=-1 (random loc)
        tmptrap.type = get_traptype_byname(args[0]);
        x = y = -1;
    } else if (args.length === 2 && typeof args[0] === 'string' && args[1] && args[1].type === 'table') {
        // sp_lev.c:4420-4425: argc==2, arg1 string, arg2 table -> get_coord(arg2)
        tmptrap.type = get_traptype_byname(args[0]);
        const c = get_coord(args[1]);
        x = c.x;
        y = c.y;
    } else if (args.length === 3) {
        // sp_lev.c:4426-4431: argc==3 -> type by name; x=arg2; y=arg3
        tmptrap.type = get_traptype_byname(String(args[0]));
        x = Number(args[1]);
        y = Number(args[2]);
    } else {
        // sp_lev.c:4432-4459 (else branch): 0 args — via lcheck_param_table's
        // "argc<1 -> push empty table" behavior (nhlua.c:224-236) — or a
        // single table arg. Existing table-form logic, unchanged; a bare
        // call is treated as an empty table (all fields absent/default).
        const table = (args.length === 0) ? { type: 'table', get: () => null } : args[0];
        if (!(table && table.type === 'table'))
            throw new Error('UNPORTED-CALLEE: lspo_trap non-table call form');

        const xy = get_table_xy_or_coord(table);
        x = xy.x;
        y = xy.y;
        tmptrap.type = get_table_traptype_opt(table, 'type', -1);
        tmptrap.spider_on_web = get_table_boolean_opt(table, 'spider_on_web', 1);
        tmptrap.seen = get_table_boolean_opt(table, 'seen', 0);
        tmptrap.novictim = !get_table_boolean_opt(table, 'victim', 1);

        const launchfrom = table.get('launchfrom');
        if (launchfrom != null && launchfrom.type === 'table') {
            const c = get_coord(launchfrom);
            gl.launchplace = { x: c.x, y: c.y };
        }
        const teledest = table.get('teledest');
        if (teledest != null && teledest.type === 'table') {
            const c = get_coord(teledest);
            /* C aliases teledest and launch in trap.h; the later field wins
             * when both are supplied, matching the source assignment order. */
            gl.launchplace = { x: c.x, y: c.y };
        }
    }

    if (tmptrap.type === NO_TRAP)
        throw new Error('Unknown trap type');

    tmptrap.coord = (x === -1 && y === -1)
        ? SP_COORD_PACK_RANDOM(0)
        : SP_COORD_PACK(x, y);

    try {
        await create_trap(tmptrap, game.gc.coder.croom);
        return 0;
    } finally {
        /* C sp_lev.c:4468 — gl.launchplace.x = gl.launchplace.y = 0. */
        gl.launchplace = { x: 0, y: 0 };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_object / create_object chain — C ref: nethack-c/src/sp_lev.c:3563-3761
// (lspo_object), 2194-2441 (create_object), 3045-3052 (spo_pop_container).
//
// Scope (verified against tut-1.lua's 19 des.object call sites — all table
// literals with a string `id`): table-form calls only; named-id lookup via
// find_objtype; class+id combinations; explicit spe/buc/coord (absolute
// only)/eroded(zero-path)/quantity/broken/trapped/recharged/greased;
// contents-field container nesting (container_idx bookkeeping — the actual
// chain, not this file's). Out of scope, throws UNPORTED-CALLEE rather than
// guess: montype/STATUE/EGG/CORPSE/TIN/FIGURINE special-casing (tut-1.lua:261
// hits this and must throw cleanly), name/oname(), buried, achievement,
// Medusa-statue case, monster-inventory placement, croom/RANDOM-coord
// placement, RANDOM_CLASS/COIN_CLASS-mkgold object creation, and the 3
// non-table call shapes (string / string+table / string+num+num).
// ═══════════════════════════════════════════════════════════════════════════════

/* header constants — sp_lev.c:196-199, sp_lev.h:54-55; objclass.h enum values */
const MAX_CONTAINMENT = 10;
let container_idx = 0;
const container_obj = new Array(MAX_CONTAINMENT).fill(null);
/* C ref: sp_lev.c:199 `static struct monst *invent_carrying_monster`. Mutable
 * module-level "current des.monster custom-inventory context" — set by
 * create_monster (CUSTOM_INVENT branch), read by create_object's containment
 * check, reset by spo_end_moninvent. */
let invent_carrying_monster = null;
const SADDLE = 235; /* objects.h SADDLE otyp — module-local per project convention
                        (js/u_init.js duplicates the same value). */
const SP_OBJ_CONTENT = 0x1;
const SP_OBJ_CONTAINER = 0x2;
const STRANGE_OBJECT = 0;
const MAXOCLASSES = 18;
const RING_CLASS = 4;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
/* CORPSE/EGG/STATUE/TIN/FIGURINE otyp values — mirrors js/mklev.js's local
 * consts of the same names/values (module-local there, not exported; these
 * are only used to screen lspo_object's out-of-scope montype branch). */
const CORPSE = 265;
const EGG = 266;
const TIN = 296;
const FIGURINE = 241;
const STATUE = 476;
const MAXMCLASSES = 61;

/* ─── get_table_int_or_random — C ref: sp_lev.c:3412-3439 ─────────────────
 * "random" (case-insensitive) or nil -> rndval; a number -> itself; anything
 * else -> error (matches nhl_error's abort-the-call semantics via throw). */
function get_table_int_or_random(args, name, rndval) {
    const v = args.get(name);
    if (v == null)
        return rndval;
    if (typeof v === 'number')
        return v;
    const s = String(v);
    if (!strcmpi(s, 'random'))
        return rndval;
    throw new Error(`Expected integer or "random" for "${name}", got "${s}"`);
}

/* ─── get_table_buc — C ref: sp_lev.c:3447-3458 ───────────────────────────── */
function get_table_buc(args) {
    const bucs = ['random', 'blessed', 'uncursed', 'cursed', 'not-cursed', 'not-uncursed', 'not-blessed'];
    const bucs2i = [0, 1, 2, 3, 4, 5, 6];
    return bucs2i[get_table_option(args, 'buc', 'random', bucs)];
}

/* ─── get_table_objclass — C ref: sp_lev.c:3460-3470 ──────────────────────── */
export function get_table_objclass(args) {
    const s = get_table_str_opt(args, 'class', null);
    if (s && s.length === 1)
        return s.charCodeAt(0);
    return -1;
}

// obj_descr_init[i].oc_descr for all 482 otyps — object appearance strings.
// find_objtype fallback (sp_lev.c:3474 second loop) matches against these.
const OC_DESCR = [
  "", "strange", "weapon", "armor", "ring", "amulet", "tool", "food",
  "potion", "scroll", "spellbook", "wand", "coin", "gem", "large rock", "iron ball",
  "iron chain", "venom", "", "runed arrow", "crude arrow", "", "bamboo arrow", "",
  "", "throwing star", "", "", "runed spear", "crude spear", "stout spear", "",
  "throwing spear", "", "", "runed dagger", "crude dagger", "", "", "",
  "", "", "", "", "", "double-headed axe", "", "runed short sword",
  "crude short sword", "broad short sword", "curved sword", "", "", "runed broadsword", "", "",
  "samurai sword", "long samurai sword", "runed broadsword", "vulgar polearm", "hilted polearm", "forked polearm", "single-edged polearm", "angled poleaxe",
  "long poleaxe", "pole cleaver", "pole sickle", "pruning hook", "hooked polearm", "pronged polearm", "beaked polearm", "broad pick",
  "", "", "", "", "", "", "", "staff",
  "thonged club", "", "", "", "runed bow", "crude bow", "long bow", "",
  "", "leather hat", "iron skull cap", "hard hat", "", "conical hat", "conical hat", "",
  "crystal helmet", "plumed helmet", "etched helmet", "crested helmet", "visored helmet", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "crude chain mail", "", "", "", "crude ring mail", "", "",
  "", "", "", "faded pall", "coarse mantelet", "hooded cloak", "slippery cloak", "",
  "apron", "", "tattered cape", "opera cloak", "ornamental cope", "piece of cloth", "wooden shield", "wooden shield",
  "wooden shield", "blue and green shield", "white-handed shield", "red-eyed shield", "", "large round shield", "polished silver shield", "old gloves",
  "padded gloves", "riding gloves", "fencing gloves", "walking shoes", "hard shoes", "jackboots", "combat boots", "jungle boots",
  "hiking boots", "mud boots", "buckled boots", "riding boots", "snow boots", "wooden", "granite", "opal",
  "clay", "coral", "black onyx", "moonstone", "tiger eye", "jade", "bronze", "agate",
  "topaz", "sapphire", "ruby", "diamond", "pearl", "iron", "brass", "copper",
  "twisted", "steel", "silver", "gold", "ivory", "emerald", "wire", "engagement",
  "shiny", "circular", "spherical", "oval", "triangular", "pyramidal", "square", "concave",
  "hexagonal", "octagonal", "perforated", "cubical", "Amulet of Yendor", "Amulet of Yendor", "", "",
  "", "bag", "bag", "bag", "bag", "key", "", "",
  "candle", "candle", "", "lamp", "lamp", "", "looking glass", "glass orb",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "whistle", "whistle", "flute",
  "flute", "horn", "horn", "horn", "horn", "harp", "harp", "",
  "", "drum", "drum", "", "", "", "candelabrum", "silver bell",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "",
  "", "ruby", "pink", "orange", "yellow", "emerald", "dark green", "cyan",
  "sky blue", "brilliant blue", "magenta", "purple-red", "puce", "milky", "swirly", "bubbly",
  "smoky", "cloudy", "effervescent", "black", "golden", "brown", "fizzy", "dark",
  "white", "murky", "clear", "ZELGO MER", "JUYED AWK YACC", "NR 9", "XIXAXA XOXAXA XUXAXA", "PRATYAVAYAH",
  "DAIYEN FOOELS", "LEP GEX VEN ZEA", "PRIRUTSENIE", "ELBIB YLOH", "VERR YED HORRE", "VENZAR BORGAVVE", "THARR", "YUM YUM",
  "KERNOD WEL", "ELAM EBOW", "DUAM XNAHT", "ANDOVA BEGARIN", "KIRJE", "VE FORBRYDERNE", "HACKEM MUCHE", "VELOX NEB",
  "FOOBIE BLETCH", "TEMOV", "GARVEN DEH", "READ ME", "ETAOIN SHRDLU", "LOREM IPSUM", "FNORD", "KO BATE",
  "ABRA KA DABRA", "ASHPD SODALG", "ZLORFIK", "GNIK SISI VLE", "HAPAX LEGOMENON", "EIRIS SAZUN IDISI", "PHOL ENDE WODAN", "GHOTI",
  "MAPIRO MAHAMA DIROMAT", "VAS CORP BET MANI", "XOR OTA", "STRC PRST SKRZ KRK", "stamped", "unlabeled", "parchment", "vellum",
  "ragged", "dog eared", "mottled", "stained", "cloth", "leathery", "white", "pink",
  "red", "orange", "yellow", "velvet", "light green", "dark green", "turquoise", "cyan",
  "light blue", "dark blue", "indigo", "magenta", "purple", "violet", "tan", "plaid",
  "light brown", "dark brown", "gray", "wrinkled", "dusty", "bronze", "copper", "silver",
  "gold", "glittering", "shining", "dull", "thin", "thick", "checkered", "plain",
  "paperback", "papyrus", "glass", "balsa", "crystal", "maple", "pine", "redwood",
  "oak", "ebony", "marble", "tin", "brass", "copper", "silver", "platinum",
  "iridium", "zinc", "aluminum", "uranium", "iron", "steel", "hexagonal", "short",
  "runed", "long", "curved", "forked", "spiked", "jeweled", "", "white",
  "white", "red", "orange", "blue", "black", "green", "green", "yellow",
  "green", "yellowish brown", "yellowish brown", "black", "white", "yellow", "red", "violet",
  "red", "violet", "black", "orange", "green", "white", "blue", "red",
  "yellowish brown", "orange", "yellow", "black", "green", "violet", "gray", "gray",
  "gray", "gray", "", "", "", "", "", "splash of venom",
  "splash of venom", "",
];

/* ─── find_objtype — C ref: sp_lev.c:3473-3542 ─────────────────────────────
 * Scoped per the spec: the 5-entry class-prefix table + the OC_NAME exact-
 * match loop (covers every tut-1 real-form id). The "find by object
 * description" fallback (needs an OC_DESCR table that doesn't exist in JS
 * yet) throws rather than silently returning STRANGE_OBJECT — verified no
 * tut-1 id needs it (all are canonical OC_NAME entries). */
const OBJCLASS_PREFIXES = [
    { prefix: 'ring of ', oclass: RING_CLASS },
    { prefix: 'potion of ', oclass: POTION_CLASS },
    { prefix: 'scroll of ', oclass: SCROLL_CLASS },
    { prefix: 'spellbook of ', oclass: SPBOOK_CLASS },
    { prefix: 'wand of ', oclass: WAND_CLASS },
];
function find_objtype(s, oclass) {
    if (s) {
        let cls = def_char_to_objclass(oclass);
        if (cls === MAXOCLASSES)
            cls = 0;
        const lower = s.toLowerCase();
        if (lower.includes(' of ')) {
            for (const { prefix, oclass: pclass } of OBJCLASS_PREFIXES) {
                if (lower.startsWith(prefix)) {
                    cls = pclass;
                    s = s.slice(prefix.length);
                    break;
                }
            }
        }
        for (let i = 0; i < OC_NAME.length; i++) {
            const objname = OC_NAME[i];
            if ((!cls || cls === MKOBJ_OC_CLASS[i]) && objname && !strcmpi(s, objname))
                return i;
        }
        for (let i = 0; i < OC_DESCR.length; i++) {
            const d = OC_DESCR[i];
            if (d && !strcmpi(s, d)) return i;
        }
        return STRANGE_OBJECT;
    }
    return STRANGE_OBJECT;
}

/* ─── get_table_objtype — C ref: sp_lev.c:3544-3553 ────────────────────────── */
export function get_table_objtype(args) {
    const s = get_table_str_opt(args, 'id', null);
    const oclass = get_table_objclass(args);
    return find_objtype(s, oclass);
}

/* ─── oc_merge — C's objects[otyp].oc_merge (objects.h BITS() 2nd field,
 * "mrg").
 *
 * This used to be a four-entry hand-verified Map (rock/boulder for tut-1,
 * tallow/wax candle for minetn-1) that THREW on every other otyp, on the
 * premise that "no full oc_merge table is ported to JS".  That premise was
 * false: js/mklev.js has carried the complete 482-entry OC_MERGE bitfield —
 * dumped from a compile of objects.h's OBJECTS_INIT — since it was needed for
 * clear_dknown, it was simply module-private.  The throw was blocking two
 * role-start levels (Mon-strt on objects[296] = tin, Ran-strt on objects[22]
 * = ya) for no reason.
 *
 * Before wiring it, that table's VINTAGE was re-verified against 5.0 rather
 * than assumed, because its provenance comment names nethack-c/ (the 3.7
 * tree) and 3.7/5.0 disagree on otyp indices: the same dumper compiled
 * against nethack-c-v5/upstream/include/objects.h agrees on all 482 entries,
 * and the four otyps the old Map hardcoded (474 rock=1, 475 boulder=0,
 * 224 tallow candle=1, 225 wax candle=1) each read back identically — so
 * this is a strict widening with zero behaviour change on any otyp that
 * could already reach here.
 *
 * C ref: objects[otyp].oc_merge, read at sp_lev.c:2298 (create_object's
 * quantity assignment) and sp_lev.c:3738 (lspo_object's container-fill
 * do/while). */
function oc_merge(otyp) {
    return !!OC_MERGE[otyp];
}

function bless(otmp) {
    if (otmp.oclass === COIN_CLASS)
        return;
    otmp.cursed = false;
    otmp.blessed = true;
}
function unbless(otmp) { otmp.blessed = false; }
function curse(otmp) {
    if (otmp.oclass === COIN_CLASS)
        return;
    otmp.blessed = false;
    otmp.cursed = true;
}
function uncurse(otmp) { otmp.cursed = false; }
function blessorcurse(otmp, chance) {
    if (otmp.blessed || otmp.cursed)
        return;
    if (!rn2(chance)) {
        if (!rn2(2))
            curse(otmp);
        else
            bless(otmp);
    }
}

function add_to_container(container, obj) {
    obj.where = OBJ_CONTAINED;
    obj.ocontainer = container;
    obj.nobj = container.cobj;
    container.cobj = obj;
    return obj;
}

/* ─── add_to_minv — C ref: mkobj.c:2652-2667. Same scope cut as
 * add_to_container above: merged() check omitted. A des.monster
 * custom-inventory item starts life alone (CUSTOM_INVENT overwrites
 * DEFAULT_INVENT before any closure items are added), so no pre-existing
 * stack can ever be present to merge with in this call path. */
function add_to_minv(mon, obj) {
    obj.where = OBJ_MINVENT;
    obj.ocarry = mon;
    obj.nobj = mon.minvent ?? null;
    mon.minvent = obj;
    return obj;
}


export async function spo_end_moninvent() {
    if (invent_carrying_monster)
        await m_dowear(invent_carrying_monster, true);
    invent_carrying_monster = null;
}

export function remove_object(otmp) {
    const xi = otmp.ox | 0, yi = otmp.oy | 0;
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        const h = lvlObjs[xi][yi];
        if (h === otmp) {
            lvlObjs[xi][yi] = otmp.nexthere ?? null;
        } else {
            for (let o = h; o; o = o.nexthere) {
                if (o.nexthere === otmp) { o.nexthere = otmp.nexthere; break; }
            }
        }
    }
    if (game.fobj === otmp) {
        game.fobj = otmp.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === otmp) { o.nobj = otmp.nobj; break; }
        }
    }
    otmp.nexthere = null;
    otmp.where = OBJ_FREE;
    otmp.nobj = null;
}

export async function stackobj(obj) {
    if (!obj)
        return;
    const xi = obj.ox | 0, yi = obj.oy | 0;
    const cell = game.level?.levelObjects?.[xi];
    for (let otmp = cell ? cell[yi] : null; otmp; otmp = otmp.nexthere) {
        if (otmp !== obj && (await _merged_floor(obj, otmp)))
            break;
    }
}

async function _merged_floor(survivor, victim) {
    if (!(await mergable(survivor, victim)))
        return false;

    /* C: age is quantity-weighted unless lit or globby. */
    if (!victim.lamplit && !victim.globby) {
        const sq = survivor.quan | 0, vq = victim.quan | 0;
        if (sq + vq > 0)
            survivor.age = Math.trunc((((survivor.age | 0) * sq)
                                       + ((victim.age | 0) * vq)) / (sq + vq));
    }
    if (!survivor.globby)
        survivor.quan = (survivor.quan | 0) + (victim.quan | 0);
    /* C: gold re-weighs and forgets bknown; puddings keep their owt. */
    if ((survivor.oclass | 0) === 12 /* COIN_CLASS */) {
        survivor.owt = weight(survivor);
        survivor.bknown = 0;
    } else if (!survivor.globby) {
        survivor.owt = weight(survivor);
    }

    remove_object(victim);

    if (victim.timed)
        obj_stop_timers(victim);

    /* C: identification states union; the `discovered` pline is OBJ_INVENT-only. */
    if ((victim.known | 0) !== (survivor.known | 0))
        survivor.known = 1;
    if ((victim.rknown | 0) !== (survivor.rknown | 0))
        survivor.rknown = 1;
    if ((victim.bknown | 0) !== (survivor.bknown | 0))
        survivor.bknown = 1;
    if (victim.bypass)
        survivor.bypass = 1;
    /* C invent.c:930 obfree(obj, otmp) — the absorbed object is FREED, not just
     * unlinked.  Omitting it left the victim alive in whatever else still
     * referenced it (a timer, above; C's own dealloc_obj is what stops those). */
    await obfree(victim, survivor);
    /* Bump bridge objs_deleted.count to match C's delobj counter (mirrors
     * js/cmd.js:6249 _bumpObjsDeletedCount_useupf and js/potion.js:1782's
     * useup_potion).  obfree() bottoms out in js/dokick.js's obfree ->
     * js/mklev.js dealloc_obj(), and dealloc_obj deliberately does NOT bump
     * this counter itself (js/mklev.js:3609's own comment: a single-point bump
     * there would double-count every existing hand-bumped caller).  This is
     * the one and only free this function performs, so bump once, here. */
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
    return true;
}

/* C ref: dungeon.h:110-111 — Lassigned(y) is ((y)->dlevel || (y)->dnum) and
 * Lcheck(x,z) is (Lassigned(z) && on_level(x, z)); dungeon.h:136-137 build
 * Is_mineend_level / Is_sokoend_level on top of it.  The two d_level globals
 * are set by js/dungeon_rng.js at dungeon-init time (game.mineend_level from
 * the 'minend' proto, game.sokoend_level from 'soko1' — soko1 is the TOP
 * Sokoban level, which is where the prize sits). */
function _Lcheck(x, z) {
    if (!x || !z) return false;
    if (!((z.dlevel | 0) || (z.dnum | 0))) return false;   /* Lassigned */
    return on_level(x, z);
}
function Is_mineend_level(x) { return _Lcheck(x, game.mineend_level); }
function Is_sokoend_level(x) { return _Lcheck(x, game.sokoend_level); }

/* ─── create_object — C ref: sp_lev.c:2194-2441 ────────────────────────────
 * Scoped to the table-form/named-id path every tut-1 des.object call uses
 * (o.id is always resolved to a real otyp by find_objtype — verified, all
 * 19 sites specify `id=`). corpsenm handling, the Medusa-statue case, and
 * the montype-driven spe are unreachable here because lspo_object already
 * throws for STATUE/EGG/CORPSE/TIN/FIGURINE ids before calling this. */
async function create_object(o, croom) {
    const named = !!o.name;
    const coord = { x: -1, y: -1 };
    get_location_coord(coord, DRY, croom, o.coord);
    const x = coord.x, y = coord.y;

    const c = o.class >= 0 ? o.class : 0;

    let otmp;
    if (!c) {
        otmp = (await mkobj_at(0 /* RANDOM_CLASS */, x, y, !named));
    } else if (o.id !== -1) {
        otmp = (await mksobj_at(o.id, x, y, true, !named));
    } else {
        const oclass = def_char_to_objclass(c);
        if (oclass === MAXOCLASSES)
            throw new Error(`create_object: unexpected object class '${String.fromCharCode(c)}'`);
        if (oclass === COIN_CLASS) {
            /* C sp_lev.c:2227 — gold-class objects use mkgold(0). */
            otmp = (await mkgold(0, x, y));
        } else {
        /* C ref: sp_lev.c:2226 — `otmp = mkobj_at(oclass, x, y, !named);`.
         * The identical call one branch up (RANDOM_CLASS) was already live;
         * only the class-letter form was left as a throw.  minefill.lua's
         * `des.object("*")` / `des.object("(")` are exactly this form. */
            otmp = (await mkobj_at(oclass, x, y, !named));
        }
    }

    if (o.spe !== -127)
        otmp.spe = o.spe;

    switch (o.curse_state) {
        case 1: bless(otmp); break;
        case 2: unbless(otmp); uncurse(otmp); break;
        case 3: curse(otmp); break;
        case 4: uncurse(otmp); break;
        case 5: blessorcurse(otmp, 1); break;
        case 6: unbless(otmp); break;
        default: break;
    }

    if (o.corpsenm !== NON_PM) {
        if (o.corpsenm === NON_PM - 1)
            set_corpsenm(otmp, rndmonnum());
        else
            set_corpsenm(otmp, o.corpsenm);
    }

    /* C ref: sp_lev.c:2267-2273 — names on novels are canonicalized against
     * the Discworld title table and store the matching novel index. */
    if (named) {
        otmp = oname(otmp, o.name, ONAME_LEVEL_DEF);
        if (otmp.otyp === SPE_NOVEL_OTYP) {
            const idx = { value: otmp.novelidx ?? otmp.corpsenm ?? -1 };
            const canonical = lookup_novel(o.name, idx);
            if (canonical != null) {
                otmp.novelidx = idx.value | 0;
                otmp.corpsenm = idx.value | 0;
            }
        }
    }

    if (o.eroded) {
        if (o.eroded < 0) {
            otmp.oerodeproof = 1;
        } else {
            otmp.oeroded = o.eroded % 4;
            otmp.oeroded2 = Math.floor(o.eroded / 4) % 4;
        }
    } else {
        otmp.oeroded = otmp.oeroded2 = 0;
        otmp.oerodeproof = 0;
    }
    if (o.recharged)
        otmp.recharged = o.recharged % 8;
    if (o.locked === 0 || o.locked === 1) {
        otmp.olocked = o.locked;
    } else if (o.broken) {
        otmp.obroken = 1;
        otmp.olocked = 0;
    }
    if (o.trapped === 0 || o.trapped === 1)
        otmp.otrapped = o.trapped;
    if (o.trapped && (o.tknown === 0 || o.tknown === 1))
        otmp.tknown = o.tknown;
    otmp.greased = o.greased ? 1 : 0;

    if (o.quan > 0 && oc_merge(otmp.otyp)) {
        otmp.quan = o.quan;
        otmp.owt = weight(otmp);
    }

    /* contents (of a container or a des.monster custom inventory) —
     * C ref: sp_lev.c:2304-2342. */
    if ((o.containment & SP_OBJ_CONTENT) || invent_carrying_monster) {
        if (!container_idx) {
            if (invent_carrying_monster) {
                remove_object(otmp);
                /* C sp_lev.c:2319-2320 — the real port lives in js/steed.js
                 * (C steed.c:141); it was reachable all along via Kni-strt's
                 * warhorse `inventory = function() ... des.object("saddle")`. */
                if (otmp.otyp === SADDLE && can_saddle(invent_carrying_monster))
                    await put_saddle_on_mon(otmp, invent_carrying_monster);
                else
                    await mpickobj(invent_carrying_monster, otmp);
            }
        } else {
            const cobj = container_obj[container_idx - 1];
            remove_object(otmp);
            if (cobj) {
                otmp = add_to_container(cobj, otmp);
                cobj.owt = weight(cobj);
            } else {
                /* C treats a missing parent as a failed nested object: unlink
                 * the freshly-created object, clear any artifact reservation,
                 * and free it before returning NULL to the Lua caller. */
                if (otmp.oartifact)
                    artifact_exists(otmp, safe_oname(otmp), false, 0);
                await obfree(otmp, null);
                return null;
            }
        }
    }

    if (o.containment & SP_OBJ_CONTAINER) {
        /* C sp_lev.c:2344 — mksobj_at's mkbox_cnts fill is discarded; the
         * level file's own contents closure refills the container. */
        await delete_contents(otmp);
        if (container_idx < MAX_CONTAINMENT) {
            container_obj[container_idx] = otmp;
            container_idx++;
        } else {
        }
    }

    if ((o.id | 0) === STATUE && Is_medusa_level(game.u?.uz)
        && (o.corpsenm | 0) === NON_PM) {
        let was = null;
        let wastyp = otmp.corpsenm | 0;
        /* C's for-increment `i++, wastyp = rndmonnum()` runs only when the
         * body did NOT break, so a rejected monster costs one rndmonnum. */
        for (let i = 0; i < 1000; i++, wastyp = rndmonnum()) {
            /* C comment: makemon without rndmonst() might create a group */
            was = await makemon(wastyp, 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
            if (was) {
                if (!resists_ston(was) && !poly_when_stoned(_pm_of(wastyp))) {
                    propagate(wastyp, true, false);
                    break;
                }
                _medusa_mongone(was, true);
                was = null;
            }
        }
        if (was) {
            set_corpsenm(otmp, wastyp);
            while (was.minvent) {
                const obj = was.minvent;
                obj.owornmask = 0;
                /* C mkobj.c obj_extract_self(), OBJ_MINVENT arm — every object
                 * taken here is the head of the list, so the unlink is
                 * extract_nobj's head step.  Same scope cut, and the same
                 * three assignments, as js/mklev.js mk_trap_statue. */
                was.minvent = obj.nobj ?? null;
                obj.nobj = null;
                obj.ocarry = null;
                obj.where = OBJ_FREE;
                add_to_container(otmp, obj);
            }
            otmp.owt = weight(otmp);
            _medusa_mongone(was, false);
        }
    }

    /* C ref: sp_lev.c:2391-2419 — the des.object({..., achievement=1}) arm.
     * Records the level's prize object id/otyp in svc.context.achieveo so
     * addinv_core1() (js/cmd.js, invent.c:959) can fire ACH_MINE_PRIZE /
     * ACH_SOKO_PRIZE when the hero picks it up, and sets nomerge so the prize
     * cannot stack away before that.  Draws no RNG.  The bag stored into is
     * game.context.achieveo — the same bag js/cmd.js is_mines_prize() /
     * is_soko_prize() read (NOT game.svc.context, which is a separate object
     * js/mklev.js creates). */
    if (o.achievement) {
        const ctx = game.context || (game.context = {});
        const achieveo = ctx.achieveo || (ctx.achieveo = {});
        if (Is_mineend_level(game.u?.uz)) {
            if (!achieveo.mines_prize_oid) {
                achieveo.mines_prize_oid = otmp.o_id;
                achieveo.mines_prize_otyp = otmp.otyp;
                /* prevent stacking; cleared when achievement is recorded;
                   will be reset in addinv_core1() */
                otmp.nomerge = 1;
            }
            /* else C: impossible("multiple prizes on mines end level") */
        } else if (Is_sokoend_level(game.u?.uz)) {
            if (!achieveo.soko_prize_oid) {
                achieveo.soko_prize_oid = otmp.o_id;
                achieveo.soko_prize_otyp = otmp.otyp;
                otmp.nomerge = 1; /* redundant; Sokoban prizes don't stack */
            }
            /* else C: impossible("multiple prizes on sokoban end level") */
        }
        /* else if (!iflags.lua_testing) C impossible()s with describe_level() +
         * simpleonames(); a diagnostic-only arm with no game effect and no RNG.
         * minend-[123].lua and soko1-[12].lua are the only achievement=1 users
         * in dat/, and both land on one of the two arms above. */
    }

    if (!(o.containment & SP_OBJ_CONTENT)) {
        await stackobj(otmp);
        if (o.lit)
            begin_burn(otmp, false);
        if (o.buried)
            /* C sp_lev.c:2428 — bury the freshly placed object and let the
             * canonical dig.c implementation handle timers and extraction. */
            await bury_an_obj(otmp, null);
    }
    return otmp;
}

export function spo_pop_container() {
    if (container_idx > 0) {
        container_idx--;
        container_obj[container_idx] = null;
    }
}

export async function lspo_object(...args) {
    create_des_coder();

    const tmpobj = {
        name: null, corpsenm: NON_PM, id: 0, spe: -127, coord: 0,
        class: 0, containment: 0, curse_state: 0, quan: -1,
        buried: 0, lit: 0, eroded: 0, locked: -1, trapped: -1,
        tknown: -1, recharged: 0, greased: 0, broken: 0, achievement: 0,
    };
    let ox = -1, oy = -1;
    let maybe_contents = 0;

    if (args.length === 1 && typeof args[0] === 'string') {
        const paramstr = args[0];
        if (paramstr.length === 1) {
            tmpobj.class = paramstr.charCodeAt(0);
            tmpobj.id = STRANGE_OBJECT;
        } else {
            tmpobj.class = -1;
            tmpobj.id = find_objtype(paramstr, -1);
        }
    } else if (args.length === 2 && typeof args[0] === 'string'
               && args[1] && args[1].type === 'table') {
        const paramstr = args[0];
        const c = get_coord(args[1]);
        if (c) {
            ox = c.x;
            oy = c.y;
        }
        if (paramstr.length === 1) {
            tmpobj.class = paramstr.charCodeAt(0);
            tmpobj.id = STRANGE_OBJECT;
        } else {
            tmpobj.class = -1;
            tmpobj.id = find_objtype(paramstr, -1);
        }
    } else if (args.length === 3 && typeof args[1] === 'number'
               && typeof args[2] === 'number') {
        const paramstr = String(args[0]);
        ox = Number(args[1]);
        oy = Number(args[2]);
        if (paramstr.length === 1) {
            tmpobj.class = paramstr.charCodeAt(0);
            tmpobj.id = STRANGE_OBJECT;
        } else {
            tmpobj.class = -1;
            tmpobj.id = find_objtype(paramstr, -1);
        }
    } else {
        args = (args.length === 0) ? { type: 'table', get: () => null } : args[0];
        if (!(args && args.type === 'table'))
            throw new Error('UNPORTED-CALLEE: lspo_object non-table call form');

        tmpobj.spe = get_table_int_or_random(args, 'spe', -127);
        tmpobj.curse_state = get_table_buc(args);
        tmpobj.name = get_table_str_opt(args, 'name', null);
        tmpobj.quan = get_table_int_or_random(args, 'quantity', -1);
        tmpobj.buried = get_table_boolean_opt(args, 'buried', 0);
        tmpobj.lit = get_table_boolean_opt(args, 'lit', 0);
        tmpobj.eroded = get_table_int_opt(args, 'eroded', 0);
        tmpobj.locked = get_table_boolean_opt(args, 'locked', -1);
        tmpobj.trapped = get_table_boolean_opt(args, 'trapped', -1);
        tmpobj.tknown = get_table_boolean_opt(args, 'trap_known', -1);
        tmpobj.recharged = get_table_int_opt(args, 'recharged', 0);
        tmpobj.greased = get_table_boolean_opt(args, 'greased', 0);
        tmpobj.broken = get_table_boolean_opt(args, 'broken', 0);
        tmpobj.achievement = get_table_boolean_opt(args, 'achievement', 0);

        const xy = get_table_xy_or_coord(args);
        ox = xy.x;
        oy = xy.y;

        tmpobj.id = get_table_objtype(args);
        tmpobj.class = get_table_objclass(args);
        maybe_contents = 1;
    }

    tmpobj.coord = (ox === -1 && oy === -1)
        ? SP_COORD_PACK_RANDOM(0)
        : SP_COORD_PACK(ox, oy);

    if (tmpobj.class === -1 && tmpobj.id > STRANGE_OBJECT)
        tmpobj.class = MKOBJ_OC_CLASS[tmpobj.id];
    else if (tmpobj.class > -1 && tmpobj.id === STRANGE_OBJECT)
        tmpobj.id = -1;

    if (tmpobj.id === STATUE || tmpobj.id === EGG || tmpobj.id === CORPSE
        || tmpobj.id === TIN || tmpobj.id === FIGURINE) {
        let pm = null;
        let nonpmobj = false;
        const montype = (args && args.type === 'table') ? get_table_str_opt(args, 'montype', null) : null;
        if (montype) {
            if ((tmpobj.id === TIN && (!strcmpi(montype, 'spinach')
                /* id="tin",montype="empty" produces an empty tin */
                                       || !strcmpi(montype, 'empty')))
                /* id="egg",montype="empty" produces a generic, unhatchable
                   egg rather than an "empty egg" */
                || (tmpobj.id === EGG && !strcmpi(montype, 'empty'))) {
                tmpobj.corpsenm = NON_PM;
                tmpobj.spe = !strcmpi(montype, 'spinach') ? 1 : 0;
                nonpmobj = true;
            } else if (montype.length === 1
                       && def_char_to_monclass(montype.charCodeAt(0)) !== MAXMCLASSES) {
                /* C: pm = mkclass(def_char_to_monclass(*montype),
                 *                 G_NOGEN | G_IGNORE);
                 * js mkclass() already returns the monster INDEX (or null),
                 * so C's later monsndx(pm) is the identity here — same
                 * convention the name-matching branch below already uses. */
                pm = mkclass(def_char_to_monclass(montype.charCodeAt(0)), G_NOGEN | G_IGNORE);
            } else {
                for (let i = LOW_PM; i < NUMMONS; i++) {
                    const row = MONS_PMNAMES[i];
                    if (!row)
                        continue;
                    const [male, female, neutral] = row;
                    if ((neutral != null && !strcmpi(neutral, montype))
                        || (male != null && !strcmpi(male, montype))
                        || (female != null && !strcmpi(female, montype))) {
                        pm = i;
                        break;
                    }
                }
            }
            if (pm !== null)
                tmpobj.corpsenm = pm;
            else if (!nonpmobj)
                throw new Error('Unknown montype');
        }

        /* C ref: sp_lev.c:3706-3721 */
        if (tmpobj.id === STATUE || tmpobj.id === CORPSE) {
            let lflags = 0;
            if (args && args.type === 'table' && get_table_boolean_opt(args, 'historic', 0))
                lflags |= CORPSTAT_HISTORIC;
            if (args && args.type === 'table' && get_table_boolean_opt(args, 'male', 0))
                lflags |= CORPSTAT_MALE;
            if (args && args.type === 'table' && get_table_boolean_opt(args, 'female', 0))
                lflags |= CORPSTAT_FEMALE;
            tmpobj.spe = lflags;
        } else if (tmpobj.id === EGG) {
            tmpobj.spe = (args && args.type === 'table'
                && get_table_boolean_opt(args, 'laid_by_you', 0)) ? 1 : 0;
        } else if (!nonpmobj) { /* tmpobj.spe is already set for nonpmobj */
            tmpobj.spe = 0;
        }
    }

    let quancnt = (tmpobj.id > STRANGE_OBJECT) ? tmpobj.quan : 0;

    if (container_idx)
        tmpobj.containment |= SP_OBJ_CONTENT;

    if (maybe_contents) {
        const contents = (args && args.type === 'table') ? args.get('contents') : null;
        if (contents != null)
            tmpobj.containment |= SP_OBJ_CONTAINER;
    }

    let otmp = null;
    do {
        otmp = await create_object(tmpobj, game.gc.coder.croom);
        quancnt--;
    } while (quancnt > 0 && tmpobj.id > STRANGE_OBJECT && !oc_merge(tmpobj.id));

    const isContainer = !!(tmpobj.containment & SP_OBJ_CONTAINER);
    return { obj: otmp, isContainer };
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_monster / create_monster chain — C ref: nethack-c/src/sp_lev.c:3219-3406
// (lspo_monster), 1925-2188 (create_monster), 1908-1923 (sp_amask_to_amask),
// 1884-1900 (pm_to_humidity), 3119-3185 (get_table_align/get_table_monclass/
// find_montype/get_table_montype), nethack-c/src/dungeon.c:1991-2008
//
// Table-form calls only (des.monster({ id=, coord=, waiting=, ... })) — the
// only shape tut-1.lua's single des.monster call uses (tut-1.lua:158) and
// the only shape the des-binding glue in js/lua/nh_state.js forwards a real
// table for (see lspo_trap's header comment for why). String/positional argc
// forms are out of scope; anything reaching lspo_monster that isn't a table
// throws.
// ═══════════════════════════════════════════════════════════════════════════════

const G_UNIQ = 0x1000; /* monflag.h G_UNIQ — not exported from const.js */
const G_NOGEN = 0x0200; /* monflag.h G_NOGEN — not exported from const.js */
const G_IGNORE = 0x8000; /* monflag.h G_IGNORE — not exported from const.js */

const M2_MALE = 0x00010000;   /* monflag.h M2_MALE — not exported from const.js */
const M2_FEMALE = 0x00020000; /* monflag.h M2_FEMALE — not exported from const.js */
function is_female_mndx(mndx) { return ((MONS_ROWS[mndx][7] | 0) & M2_FEMALE) !== 0; }
function is_male_mndx(mndx) { return ((MONS_ROWS[mndx][7] | 0) & M2_MALE) !== 0; }

/* monsym — C ref: mondata.h:267 macro def_monsyms[(int)(ptr)->mlet].sym.
 * Forward (index->char) direction of the same def_monsyms table
 * js/drawing.js's def_char_to_monclass already embeds in the reverse
 * (char->index) direction — duplicated locally (same convention as
 * is_female_mndx/is_male_mndx above) rather than exported from drawing.js.
 * Returns a char CODE (not a 1-char string) to match def_char_to_monclass's
 * `ch` parameter, which treats its input as a numeric ASCII code
 * (String.fromCharCode(ch)) — mirrors C's `char class` field round-tripping
 * through monsym()/def_char_to_monclass(). */
const MONSYM_CHARS = [
    undefined,
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
    'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '@', ' ', "'", '&', ';', ':', '~', ']',
];
function monsym(mndx) {
    const mlet = MONS_ROWS[mndx][0] | 0;
    const ch = MONSYM_CHARS[mlet];
    return ch ? ch.charCodeAt(0) : 0;
}

/* C's monster grid includes long-worm segments as occupied squares. */
function MON_AT_local(x, y) {
    return m_at(x, y);
}

/* vampshifted — C ref: monst.h:215-218 is_vampshifter/vampshifted macros.
 * mtmp.cham defaults to NON_PM (js/mklev.js makemon), so this is false for
 * any monster that was never shifted into a chameleon/vampire form — no
 * UNPORTED-CALLEE needed, the guard is fully computable. NB: the C macro
 * name is PM_VAMPIRE_LEADER; js/pm.generated.js names the same index
 * PM_VAMPIRE_LORD (a NetHack version rename already reflected elsewhere in
 * this port, e.g. js/mhitm.js's own PM_VAMPIRE_LORD import). */
const SYM_VAMPIRE = 48;
function vampshiftedLocal(mtmp) {
    const cham = mtmp.cham;
    if (cham !== PM_VAMPIRE && cham !== PM_VAMPIRE_LORD && cham !== PM_VLAD_THE_IMPALER)
        return false;
    const dataMlet = (MONS_ROWS[mtmp.mnum] ? MONS_ROWS[mtmp.mnum][0] : -1) | 0;
    return dataMlet !== SYM_VAMPIRE;
}

/* ─── create_monster's appear_as (mimic/shapechanger) support ──────────────
 * C refs: sp_lev.c:1862-1881 m_bad_boulder_spot, monst.h:233-239
 * is_lightblocker_mappear, monst.h:285 ismnum, youprop.h:359-360
 * Protection_from_shape_changers.  None of these draw RNG. */

/* defsym.h PCHAR indices.  The wall run is 0..11 (S_stone plus the eleven wall
 * glyphs), which is exactly C's `mappearance < S_ndoor` test. */
const S_ndoor_splev = 12, S_vcdoor_splev = 15, S_hcdoor_splev = 16, S_tree_splev = 18;
/* defsym.h MONSYM(13, 'm', MIMIC, ...) — same value js/polyself.js:1239 and
 * js/mklev.js:2053 use. */
const S_MIMIC_splev = 13;
/* objects.h — 5.0 otyp for BOULDER, cross-checked by name through
 * js/oc_name_data.js (OC_NAME[475] === "boulder") rather than by counting,
 * because 3.7 and 5.0 disagree on otyp indices elsewhere. */
const BOULDER_OTYP = 475;
/* C sym.h: MAXPCHARS is the PCHAR count; js/const.js:3 has it as a
 * module-private 105.  Taken from the generated table itself so the two cannot
 * drift — js/defsym_data.js is dumped with exactly MAXPCHARS rows. */
const MAXPCHARS = DEFSYM_EXPLANATION.length;
/* C objclass.h NUM_OBJECTS == 481 in 5.0.  js/oc_name_data.js mirrors C's
 * obj_descr_init[NUM_OBJECTS + 1], so OC_NAME.length is 482 and its last entry
 * is the null terminator row, outside C's `i < NUM_OBJECTS` scan. */
const NUM_OBJECTS = OC_NAME.length - 1;

/* C monst.h:285 ismnum(x) */
function ismnum(x) {
    return x != null && x >= LOW_PM && x < NUMMONS;
}

/* mtmp->data->mlet, via the generated mons table this file already uses. */
function mons_mlet(mnum) {
    return (MONS_ROWS[mnum] ? MONS_ROWS[mnum][0] : -1) | 0;
}

function Protection_from_shape_changers_splev() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!(p?.intrinsic || p?.extrinsic);
}

/* C sp_lev.c:1862-1881 m_bad_boulder_spot.  C's own comment notes the
 * sobj_at(BOULDER) test "won't actually work; we get called before objects have
 * been placed" — ported anyway (Cardinal Rule 1). */
function m_bad_boulder_spot(x, y) {
    if (t_at(x, y))
        return true;
    if (sobj_at(BOULDER_OTYP, x, y))
        return true;
    const lev = game.level.locations[x][y];
    if (IS_DOOR(lev.typ) && ((lev.doormask | 0) & (D_CLOSED | D_LOCKED)) !== 0)
        return true;
    return false;
}

/* C monst.h:233-239 is_lightblocker_mappear(mon). */
function is_lightblocker_mappear(mon) {
    const ap = (mon.m_ap_type | 0) & M_AP_TYPMASK;
    const appear = mon.mappearance | 0;
    if (ap === M_AP_OBJECT && appear === BOULDER_OTYP)
        return true;
    return ap === M_AP_FURNITURE
        && (appear === S_hcdoor_splev || appear === S_vcdoor_splev
            || appear < S_ndoor_splev /* = walls */
            || appear === S_tree_splev);
}

/* C ref: sp_lev.c:1310-1314 pm_good_location(x, y, pm) — is_ok_location with
 * the humidity the monster species implies.  Exported for js/priest.js's
 * priestini(), C's only caller. */
export function pm_good_location(x, y, pm) {
    return is_ok_location(x, y, pm_to_humidity(pm));
}

/* pm_to_humidity — C ref: sp_lev.c:1884-1900 */
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_WALLWALK = 0x00000008;
const M1_AMPHIBIOUS = 0x00000200;
const SYM_EYE = 5, SYM_LIGHT = 25, SYM_GHOST = 54, SYM_EEL = 57;
function pm_to_humidity(mndx) {
    if (mndx == null)
        return DRY;
    const row = MONS_ROWS[mndx];
    const mlet = row[0] | 0;
    const mf1 = row[6] >>> 0;
    let loc = DRY;
    if (mlet === SYM_EEL || (mf1 & M1_AMPHIBIOUS) !== 0 || (mf1 & M1_SWIM) !== 0)
        loc = WET;
    if ((mf1 & M1_FLY) !== 0 || mlet === SYM_EYE || mlet === SYM_LIGHT)
        loc |= (HOT | WET);
    if ((mf1 & M1_WALLWALK) !== 0 || mlet === SYM_GHOST)
        loc |= SOLID;
    if (mndx === PM_FIRE_VORTEX || mndx === PM_FLAMING_SPHERE
        || mndx === PM_FIRE_ELEMENTAL || mndx === PM_SALAMANDER)
        loc |= HOT;
    return loc;
}

/* Align2amask — C ref: include/align.h:50-52 */
function Align2amask(al) {
    if (al === A_NONE) return AM_NONE;
    if (al === A_LAWFUL) return AM_LAWFUL;
    return al + 2; /* -1(A_CHAOTIC) => 1(AM_CHAOTIC), 0(A_NEUTRAL) => 2(AM_NEUTRAL) */
}

function induced_align_slevel() {
    const uz = game.u?.uz;
    if (!uz) return null;
    const chn = game._sp_levchn || [];
    for (let i = 0; i < chn.length; i++) {
        const sl = chn[i];
        if (sl.dlevel.dnum === uz.dnum && sl.dlevel.dlevel === uz.dlevel)
            return sl;
    }
    return null;
}
/* Exported because C's `sp_amask_to_amask(AM_SPLEV_RANDOM)` is reached from
 * TWO places in this port: create_monster/create_altar below, and the
 * themeroom-fill stand-ins in js/nhlib.js (wired through js/mklev.js).  A
 * `des.monster{}` written by a themerms.lua fill takes exactly this path in C
 * — sp_lev.c:1943 calls sp_amask_to_amask unconditionally — so the fill must
 * consume this draw, not a hand-rolled rn2(3). */
export function induced_align(pct) {
    const lev = induced_align_slevel();
    if (lev && lev.flags && lev.flags.align)
        if (rn2(100) < pct)
            /* C returns lev->flags.align RAW (dungeon.c:2000) — it is already
             * an AM_* mask, since init_level stores (flags & D_ALIGN_MASK) >> 4
             * and D_ALIGN_<x> == (AM_<x> << 4).  No Align2amask here. */
            return lev.flags.align;
    /* dungeon-wide flags.align check: always false (bitfield-truncation bug above) — no draw. */
    const al = rn2(3) - 1;
    return Align2amask(al);
}

/* noncoalignment — C ref: sp_lev.c:1851-1861.
 *
 *     k = rn2(2);
 *     if (!alignment) return (k ? -1 : 1);
 *     return (k ? -alignment : 0);
 *
 * The rn2(2) is drawn UNCONDITIONALLY, before the `!alignment` test — a
 * hero of neutral alignment (A_NEUTRAL == 0) still consumes it.  Note C's
 * `return 1` in the neutral branch is not an aligntyp any Align2amask arm
 * names specially: Align2amask(1) is 1+2 == 3, which is not a valid AM_*
 * value.  That is C's behaviour and it is ported as-is (Cardinal Rule 1);
 * it is unreachable from any dat/*.lua we load today, since every
 * "noncoaligned" site is on a level whose hero alignment is non-zero for
 * the roles that can reach it. */
function noncoalignment(alignment) {
    const k = rn2(2);
    if (!alignment)
        return k ? -1 : 1;
    return k ? -alignment : 0;
}

/* sp_amask_to_amask — C ref: sp_lev.c:1902-1923.
 *
 * The AM_SPLEV_CO / AM_SPLEV_NONCO arms used to throw UNPORTED-CALLEE on the
 * premise that u.ualignbase was unavailable and no tut-1 des.* call set an
 * explicit align field.  The second half was true and the first was not:
 * u.ualignbase is written by js/u_init.js:444-446 at character creation
 * (both A_CURRENT and A_ORIGINAL to the role/alignment choice), so it is
 * populated long before any special level is generated.  The AM_SPLEV_CO
 * throw was the sole blocker on Cav-strt, whose des.altar at Cav-strt.lua:55
 * is `align="coaligned"`.
 *
 * C: Align2amask(u.ualignbase[A_ORIGINAL]), A_ORIGINAL == 1 (you.h:457);
 * u.ualignbase is [A_CURRENT, A_ORIGINAL], so index 1.
 *
 * The read is NOT `?? 0`-defaulted.  A missing u.ualignbase would silently
 * read as A_NEUTRAL and desync the altar/monster alignment (and, on the
 * NONCO arm, the sign of an RNG-derived result) with no visible symptom —
 * exactly the failure mode a defaulted read produces.  It is an invariant
 * that u_init() has run before any special level is generated, so violating
 * it should be loud. */
function ualignbase_original() {
    const ab = game.u?.ualignbase;
    if (!ab || typeof ab[A_ORIGINAL] !== 'number')
        throw new Error('sp_amask_to_amask: u.ualignbase[A_ORIGINAL] unset — u_init() has not run');
    return ab[A_ORIGINAL];
}

function Align2amask_noncoalignment(alignment) {
    if (noncoalignment(alignment) === A_NONE) return AM_NONE;
    if (noncoalignment(alignment) === A_LAWFUL) return AM_LAWFUL;
    return noncoalignment(alignment) + 2;
}

function sp_amask_to_amask(sp_amask) {
    if (sp_amask === AM_SPLEV_CO)
        return Align2amask(ualignbase_original());
    if (sp_amask === AM_SPLEV_NONCO)
        return Align2amask_noncoalignment(ualignbase_original());
    if (sp_amask === AM_SPLEV_RANDOM)
        return induced_align(80);
    return sp_amask & AM_MASK;
}

export function find_montype(s) {
    const { mntmp: i, gender: nameGend } = name_to_mon(s, null);
    if (i >= LOW_PM && i < NUMMONS) {
        let mgend;
        if (is_male_mndx(i) || is_female_mndx(i))
            mgend = is_female_mndx(i) ? FEMALE : MALE;
        else
            mgend = (nameGend === FEMALE) ? FEMALE : (nameGend === MALE) ? MALE : rn2(2);
        return { id: i, mgend };
    }
    return { id: NON_PM, mgend: NEUTRAL };
}

/* get_table_montype — C ref: sp_lev.c:3172-3185 */
function get_table_montype(args) {
    const s = get_table_str_opt(args, 'id', null);
    if (s == null)
        return { id: NON_PM, mgend: NEUTRAL };
    const { id, mgend } = find_montype(s);
    if (id === NON_PM)
        throw new Error('Unknown monster id');
    return { id, mgend };
}

/* get_table_monclass — C ref: sp_lev.c:3136-3146 */
function get_table_monclass(args) {
    const s = get_table_str_opt(args, 'class', null);
    if (s != null && s.length === 1)
        return s.charCodeAt(0);
    return -1;
}

/* get_table_align — C ref: sp_lev.c:3119-3134 */
const GTALIGNS = ['noalign', 'law', 'neutral', 'chaos', 'coaligned', 'noncoaligned', 'random'];
const ALIGNS2I = [AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, AM_SPLEV_CO, AM_SPLEV_NONCO, AM_SPLEV_RANDOM];
function get_table_align(args) {
    return ALIGNS2I[get_table_option(args, 'align', 'random', GTALIGNS)];
}

const _OCLASS_WEAPON = 2;
/* C obj.h:233 is_spear: WEAPON_CLASS && objects[otyp].oc_skill == P_SPEAR(17) */
function _mplayer_is_spear(obj) {
    const t = obj.otyp | 0;
    const skill = (t >= 0 && t < MKOBJ_OC_SKILL.length) ? (MKOBJ_OC_SKILL[t] | 0) : 0;
    return (obj.oclass | 0) === _OCLASS_WEAPON && skill === P_SPEAR;
}
/* C obj.h:439 is_art(o,art): (o) && (o)->oartifact == (art) */
function _mplayer_is_art(obj, art) {
    return !!(obj && (obj.oartifact | 0) === art);
}
const MPLAYER_CBS = {
    makemon: async (mndx, x, y, flags) => await makemon(mndx, x, y, flags),
    /* C mplayer.c:125-126 — rloc() the occupant out of the way.  Guarded by
     * MON_AT exactly as C is; m_at returns null when the square is free. */
    rlocInsurance: async (x, y) => {
        const occupant = m_at(x, y);
        if (typeof process !== 'undefined' && ENV?.FF_MPLAYER_TRACE === '1')
            pushRngLogEntry(`^mplayer_insurance[xy=${x | 0},${y | 0} occupied=${occupant ? 1 : 0}`
                + ` id=${occupant?.m_id | 0} mndx=${occupant?.mndx ?? occupant?.data?.pmidx ?? -1}]`);
        if (occupant)
            await rloc(occupant, RLOC_ERR | RLOC_NOMSG);
    },
    mksobj: async (otyp, init, artif) => (await mksobj(otyp, init, artif)),
    mpickobj: async (mon, obj) => (await mpickobj(mon, obj)),
    mongets: async (mon, otyp) => (await mongets(mon, otyp, mksobj)),
    setMalign: (mon) => set_malign(mon),
    weight: (obj) => weight(obj),
    isSpear: _mplayer_is_spear,
    isArt: _mplayer_is_art,
    monmightthrowwep: (obj) => monmightthrowwep(obj),
    rndOffensiveItem: (mon) => rndOffensiveItem(mon),
    rndDefensiveItem: (mon) => rndDefensiveItem(mon),
    rndMiscItem: (mon) => rndMiscItem(mon),
};

/* create_monster — C ref: sp_lev.c:1925-2188 */
async function create_monster(m, croom) {
    const class_ = (m.class >= 0) ? def_char_to_monclass(m.class) : 0;
    /* class===MAXMCLASSES panic path: unreachable for a monsym-derived class (skip). */

    /* C sp_lev.c:1943 `amask = sp_amask_to_amask(m->sp_amask);` — ALWAYS
     * called (it draws #2-3 of the keystone spec via induced_align on the
     * AM_SPLEV_RANDOM arm).  The result is consumed by the mk_roamer dispatch
     * below, which is the only reader; it used to be discarded because that
     * arm was a throw. */
    const amask = sp_amask_to_amask(m.sp_amask);

    let pmId = null;
    if (!class_) {
        pmId = null;
    } else if (m.id !== NON_PM) {
        pmId = m.id;
        const mv = (game.mvitals && game.mvitals[pmId]) ? (game.mvitals[pmId].mvflags | 0) : 0;
        const geno = MONS_ROWS[pmId][3] | 0;
        if ((geno & G_UNIQ) !== 0 && (mv & G_EXTINCT) !== 0)
            return null;
        if ((mv & G_GONE) !== 0)
            pmId = null;
    } else {
        /* C ref: sp_lev.c:1956 — pm = mkclass(class, G_NOGEN); a genocided
         * class returns null and falls through to the random-monster path
         * below exactly as C does (pm == 0 -> "make random monster"). */
        pmId = mkclass(class_, G_NOGEN);
    }

    if (game.u?.uz && In_mines(game.u.uz) && pmId != null
        && (((MONS_ROWS[pmId] ? MONS_ROWS[pmId][7] : 0) | 0)
            & ((game.urace?.selfmask) | 0)) !== 0
        && (((game.urace?.mnum) | 0) === PM_DWARF
            || ((game.urace?.mnum) | 0) === PM_GNOME)
        && rn2(3))
        pmId = null;

    const coord = { x: -1, y: -1 };
    if (pmId != null) {
        let loc = pm_to_humidity(pmId);
        get_location_coord(coord, loc | NO_LOC_WARN, croom, m.coord);
        if (coord.x === -1 && coord.y === -1) {
            loc |= DRY;
            get_location_coord(coord, loc, croom, m.coord);
        }
    } else {
        get_location_coord(coord, DRY, croom, m.coord);
    }
    let x = coord.x, y = coord.y;

    if (MON_AT_local(x, y)) {
        const fakemon = (pmId == null) ? null
            : { data: permonstTemplate(pmId), mnum: pmId, m_id: 0, wormno: 0,
                mx: 0, my: 0, minvent: null };
        const newcc = enexto_core(x, y, fakemon, GP_CHECKSCARY)
                   || enexto_core(x, y, fakemon, NO_MM_FLAGS);
        if (newcc) {
            x = newcc.x;
            y = newcc.y;
        }
    }

    if (croom && !splev_inside_room(croom, x, y))
        return;

    let mtmp;
    if (m.sp_amask !== AM_SPLEV_RANDOM) {
        /* C sp_lev.c:1983-1984
         *     mtmp = mk_roamer(pm, Amask2align(amask), x, y, m->peaceful);
         * C passes `pm`, which is NULL for a genocided/extinct type, so pmId
         * (not m.id) is the right argument — same reasoning as the mk_mplayer
         * arm below.  m->peaceful is a tri-state here (BOOL_RANDOM == -1 means
         * "not specified"); C passes it straight through as a boolean, so -1
         * is TRUE to C.  sanctum.lua's nine clerics all say peaceful=0. */
        mtmp = await mk_roamer(pmId, Amask2align(amask), x, y, !!m.peaceful);
    } else if (m.id !== NON_PM && PM_ARCHEOLOGIST <= m.id && m.id <= PM_WIZARD) {
        /* C sp_lev.c:1987 mtmp = mk_mplayer(pm, x, y, FALSE).  C passes `pm`,
         * which is NULL for a genocided type — mk_mplayer's is_mplayer(NULL)
         * test then returns NULL, so pmId (not m.id) is the right argument. */
        mtmp = await mkMplayer(pmId, x, y, false, MPLAYER_CBS);
    } else {
        mtmp = await makemon(pmId, x, y, m.mm_flags);
    }

    if (mtmp) {
        x = mtmp.mx; y = mtmp.my; /* sanity precaution */
        m.x = x; m.y = y;
        /* C sp_lev.c:1994-1995:
         *     if (m->name.str)
         *         mtmp = christen_monst(mtmp, m->name.str);
         * RNG-free.  `appear_as` is ported below. */
        if (m.name)
            mtmp = christen_monst(mtmp, m.name);

        /* C sp_lev.c:1998-2124 — the mimic/shapechanger appearance block.
         * Draws no RNG on any arm reachable from dat/*.lua today.  C's own
         * comment: this does not complain when a non-mimic/non-shapechanger is
         * given an appearance, it just refuses to comply. */
        if (m.appear_as != null
            && ((mons_mlet(mtmp.mnum) === S_MIMIC_splev)
                /* shapechanger (chameleons, et al, and vampires) */
                || (ismnum(mtmp.cham) && m.appear === M_AP_MONSTER))
            && !Protection_from_shape_changers_splev()) {
            let i;

            switch (m.appear) {
            case M_AP_NOTHING:
                /* C impossible() — a name with no tag cannot be produced by
                 * the parse above, which rejects an unknown tag outright. */
                throw new Error(`create_monster: mon has an appearance, "${m.appear_as}", but no type`);

            case M_AP_FURNITURE:
                /* C sp_lev.c:2016-2019: a FORWARD linear scan over defsyms[]
                 * stopping at the first strcmp match.  It must stay a scan and
                 * not become a Map lookup — 44 of the 105 explanations are
                 * duplicates, so a name like "wall" resolves to 1, not 11.
                 * See js/defsym_data.js. */
                for (i = 0; i < MAXPCHARS; i++)
                    if (DEFSYM_EXPLANATION[i] === m.appear_as)
                        break;
                if (i === MAXPCHARS)
                    throw new Error(`create_monster: can't find feature "${m.appear_as}"`);
                mtmp.m_ap_type = M_AP_FURNITURE;
                mtmp.mappearance = i;
                break;

            case M_AP_OBJECT:
                /* C sp_lev.c:2030-2036: the same forward scan, over
                 * OBJ_NAME(objects[i]) for i in [0, NUM_OBJECTS).  OBJ_NAME is
                 * obj_descr[objects[i].oc_name_idx].oc_name, and o_init.c:165
                 * sets oc_name_idx = i and only ever shuffles oc_descr_idx
                 * (o_init.c:131-133) — so OBJ_NAME(objects[i]) is OC_NAME[i]
                 * for the whole game, shuffled appearances notwithstanding.
                 * C skips rows whose oc_name is NULL; OC_NAME stores those as
                 * null, and null never equals a string, so the scan matches. */
                for (i = 0; i < NUM_OBJECTS; i++)
                    if (OC_NAME[i] && OC_NAME[i] === m.appear_as)
                        break;
                if (i === NUM_OBJECTS)
                    throw new Error(`create_monster: can't find object "${m.appear_as}"`);
                mtmp.m_ap_type = M_AP_OBJECT;
                mtmp.mappearance = i;
                /* C sp_lev.c:2043-2062 — a random-position boulder mimic
                 * must not land on a trap, closed door, or existing boulder.
                 * The monster grid is represented by the fmon chain here, so
                 * remove_monster() is only a grid unlink in C; assigning the
                 * new coordinates below is the corresponding JS operation. */
                if (i === BOULDER_OTYP && m.x < 0 && m_bad_boulder_spot(x, y)) {
                    let retrylimit = 10;
                    do {
                        const retry = { x: -1, y: -1 };
                        get_location(retry, DRY, croom);
                        x = retry.x;
                        y = retry.y;
                        if (MON_AT_local(x, y)) {
                            const fakemon = { data: permonstTemplate(mtmp.mnum),
                                mnum: mtmp.mnum, m_id: 0, wormno: 0,
                                mx: 0, my: 0, minvent: null };
                            const next = enexto_core(x, y, fakemon, GP_CHECKSCARY)
                                || enexto_core(x, y, fakemon, NO_MM_FLAGS);
                            if (next) {
                                x = next.x;
                                y = next.y;
                            }
                        }
                    } while (m_bad_boulder_spot(x, y) && --retrylimit > 0);
                    mtmp.mx = x;
                    mtmp.my = y;
                    if (!retrylimit) {
                        /* C set_mimic_sym() clears the appearance when no
                         * safe square was found, leaving an ordinary mimic. */
                        mtmp.m_ap_type = M_AP_NOTHING;
                        mtmp.mappearance = 0;
                    }
                }
                break;

            case M_AP_MONSTER:
                /* C sp_lev.c:2064-2118.  name_to_mon supplies the explicit
                 * target and gender without the random-gender fallback used by
                 * find_montype.  Mimics and Wizard clones retain their body and
                 * only change mappearance; chameleons/vampires take on the
                 * requested form through set_mon_data. */
                {
                    const resolved = name_to_mon(m.appear_as, null);
                    const mndx = resolved?.mntmp ?? NON_PM;
                    const gender = resolved?.gender ?? NEUTRAL;
                    if (mndx === NON_PM || !permonstTemplate(mndx))
                        break; /* C impossible(), then leaves the monster intact. */
                    if ((mtmp.mnum | 0) === (mndx | 0)) {
                        mtmp.m_ap_type = M_AP_NOTHING;
                        mtmp.mappearance = 0;
                    } else if (mons_mlet(mtmp.mnum) === S_MIMIC_splev
                               || (mtmp.mnum | 0) === (PM_WIZARD | 0)) {
                        mtmp.m_ap_type = M_AP_MONSTER;
                        mtmp.mappearance = mndx;
                    } else {
                        if (is_female_mndx(mndx))
                            mtmp.female = 1;
                        else if (is_male_mndx(mndx))
                            mtmp.female = 0;
                        else if (gender !== NEUTRAL
                                 && !vampshiftedLocal(mtmp))
                            mtmp.female = gender === FEMALE ? 1 : 0;
                        else if (!vampshiftedLocal(mtmp) && rn2(10) === 0)
                            mtmp.female = mtmp.female ? 0 : 1;
                        set_mon_data(mtmp, permonstTemplate(mndx));
                    }
                }
                break;

            default:
                throw new Error(`create_monster: unimplemented mon appear type [${m.appear},"${m.appear_as}"]`);
            }

            /* C 2120-2121: if (does_block(x, y, &levl[x][y])) block_point(x, y).
             * Every arm of does_block() other than is_lightblocker_mappear()
             * reads level state that the level's own wallification and vision
             * reset already account for; the only thing NEW at this point is
             * the appearance just assigned.  So this is the mimic term alone,
             * which is the same reduction js/mklev.js:3978-3987 already makes
             * for makemon's mimic path — except that mklev.js's copy tests only
             * S_hwall/S_vwall where C's macro (monst.h:233-239) is
             * `mappearance < S_ndoor`, i.e. EVERY wall glyph plus S_stone.
             * That sibling is narrower than C; it is on a different call path
             * and is left alone here rather than changed untested. */
            if (is_lightblocker_mappear(mtmp))
                block_point(x, y);
        }

        mtmp.female = m.female;
        if (m.peaceful > BOOL_RANDOM) {
            mtmp.mpeaceful = m.peaceful;
            set_malign(mtmp);
        }
        if (m.asleep > BOOL_RANDOM)
            mtmp.msleeping = m.asleep;
        if (m.seentraps)
            mtmp.mtrapseen = m.seentraps;
        if (m.cancelled)
            mtmp.mcan = 1;
        if (m.revived)
            mtmp.mrevived = 1;
        if (m.avenge)
            mtmp.mavenge = 1;
        if (m.stunned)
            mtmp.mstun = 1;
        if (m.confused)
            mtmp.mconf = 1;
        if (m.invis) {
            mtmp.minvis = 1;
            mtmp.perminvis = 1;
        }
        if (m.blinded) {
            mtmp.mcansee = 0;
            mtmp.mblinded = m.blinded % 127;
        }
        if (m.paralyzed) {
            mtmp.mcanmove = 0;
            mtmp.mfrozen = m.paralyzed % 127;
        }
        if (m.fleeing) {
            mtmp.mflee = 1;
            mtmp.mfleetim = m.fleeing % 127;
        }
        if (m.waiting) {
            mtmp.mstrategy = (mtmp.mstrategy | 0) | STRAT_WAITFORU;
            if (vampshiftedLocal(mtmp) && m.appear !== M_AP_MONSTER)
                await newcham(mtmp, mtmp.cham, 0 /* NO_NC_FLAGS */);
        }
        if (m.m_lev_adj) {
            if (mtmp.m_lev + m.m_lev_adj > 49)
                mtmp.m_lev = 49;
            else if (mtmp.m_lev + m.m_lev_adj < 0)
                mtmp.m_lev = 0;
            else
                mtmp.m_lev += m.m_lev_adj;
        }
        if (!(m.has_invent & DEFAULT_INVENT)) {
            for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
                const unwornmask = otmp.owornmask | 0;
                if (unwornmask) {
                    otmp.owornmask = 0;
                    /* C worn.c:1405 — do_extrinsics is TRUE at this call site
                     * (mkobj.c:2531 passes TRUE, TRUE) and the monster is alive. */
                    update_mon_extrinsics(mtmp, otmp, false, true);
                    mtmp.misc_worn_check = (mtmp.misc_worn_check | 0) & ~unwornmask;
                    check_gear_next_turn(mtmp);
                }
                if (obj_resists(otmp, 0, 0)) {
                    if ((mtmp.mx | 0) || (mtmp.my | 0))
                        await mdrop_obj_md(mtmp, otmp, false);
                    else {
                        /* A monster without a map square is the migrating
                         * arm of C's mdrop_special_objs; unlink it and let
                         * the canonical rloco implementation choose a valid
                         * destination. */
                        await steal_rloco(otmp);
                    }
                }
            }
            mtmp.minvent = null;
        }
        if (m.has_invent & CUSTOM_INVENT) {
            invent_carrying_monster = mtmp;
        }
    }
    return mtmp;
}

/* lspo_monster — C ref: sp_lev.c:3219-3406. Variadic: argc==1 string,
 * argc==2 string+table (coord), argc==3 (string, x, y), else table-form
 * (including argc==0 empty-table via lcheck_param_table in nhlua.c). */
export async function lspo_monster(...args) {
    create_des_coder();

    const tmpmons = {
        peaceful: BOOL_RANDOM, asleep: BOOL_RANDOM, appear: 0,
        /* C sp_lev.c:3228 `tmpmons.appear_as.str = (char *) 0` — the absent
         * marker create_monster's mimic block tests with `if (m->appear_as.str`. */
        appear_as: null,
        sp_amask: AM_SPLEV_RANDOM, female: 0,
        invis: 0, cancelled: 0, revived: 0, avenge: 0, fleeing: 0, blinded: 0,
        paralyzed: 0, stunned: 0, confused: 0, seentraps: 0,
        has_invent: DEFAULT_INVENT, waiting: 0, mm_flags: NO_MM_FLAGS,
        m_lev_adj: 0, id: NON_PM, class: -1, coord: 0, name: null,
    };

    let mx = -1, my = -1;
    let keep_default_invent = -1;
    let inventoryField = null;

    if (args.length === 1 && typeof args[0] === 'string') {
        const paramstr = args[0];
        if (paramstr.length === 1) {
            tmpmons.class = paramstr.charCodeAt(0);
            tmpmons.id = NON_PM;
        } else {
            tmpmons.class = -1;
            const { id, mgend } = find_montype(paramstr);
            tmpmons.id = id;
            tmpmons.female = (mgend === FEMALE) ? FEMALE : (mgend === MALE) ? MALE : rn2(2);
        }
    } else if (args.length === 2 && typeof args[0] === 'string' && args[1] && args[1].type === 'table') {
        const paramstr = args[0];
        const c = get_coord(args[1]);
        mx = c.x;
        my = c.y;
        if (paramstr.length === 1) {
            tmpmons.class = paramstr.charCodeAt(0);
            tmpmons.id = NON_PM;
        } else {
            tmpmons.class = -1;
            const { id, mgend } = find_montype(paramstr);
            tmpmons.id = id;
            tmpmons.female = (mgend === FEMALE) ? FEMALE : (mgend === MALE) ? MALE : rn2(2);
        }
    } else if (args.length === 3) {
        const paramstr = String(args[0]);
        mx = Number(args[1]);
        my = Number(args[2]);
        if (paramstr.length === 1) {
            tmpmons.class = paramstr.charCodeAt(0);
            tmpmons.id = NON_PM;
        } else {
            tmpmons.class = -1;
            const { id, mgend } = find_montype(paramstr);
            tmpmons.id = id;
            tmpmons.female = (mgend === FEMALE) ? FEMALE : (mgend === MALE) ? MALE : rn2(2);
        }
    } else {
        const table = (args.length === 0) ? { type: 'table', get: () => null } : args[0];
        if (!(table && table.type === 'table'))
            throw new Error('UNPORTED-CALLEE: lspo_monster non-table call form');

        tmpmons.peaceful = get_table_boolean_opt(table, 'peaceful', BOOL_RANDOM);
        tmpmons.asleep = get_table_boolean_opt(table, 'asleep', BOOL_RANDOM);
        tmpmons.name = get_table_str_opt(table, 'name', null);
        tmpmons.sp_amask = get_table_align(table);
        tmpmons.female = get_table_boolean_opt(table, 'female', BOOL_RANDOM);
        tmpmons.invis = get_table_boolean_opt(table, 'invisible', 0);
        tmpmons.cancelled = get_table_boolean_opt(table, 'cancelled', 0);
        tmpmons.revived = get_table_boolean_opt(table, 'revived', 0);
        tmpmons.avenge = get_table_boolean_opt(table, 'avenge', 0);
        tmpmons.fleeing = get_table_int_opt(table, 'fleeing', 0);
        tmpmons.blinded = get_table_int_opt(table, 'blinded', 0);
        tmpmons.paralyzed = get_table_int_opt(table, 'paralyzed', 0);
        tmpmons.stunned = get_table_boolean_opt(table, 'stunned', 0);
        tmpmons.confused = get_table_boolean_opt(table, 'confused', 0);
        tmpmons.waiting = get_table_boolean_opt(table, 'waiting', 0);
        tmpmons.m_lev_adj = get_table_int_opt(table, 'm_lev_adj', 0);
        tmpmons.seentraps = 0; /* TODO (C parity): list of trap names to bitfield */
        keep_default_invent = get_table_boolean_opt(table, 'keep_default_invent', BOOL_RANDOM);

        if (!get_table_boolean_opt(table, 'tail', 1))
            tmpmons.mm_flags |= MM_NOTAIL;
        if (!get_table_boolean_opt(table, 'group', 1))
            tmpmons.mm_flags |= MM_NOGRP;
        if (get_table_boolean_opt(table, 'adjacentok', 0))
            tmpmons.mm_flags |= MM_ADJACENTOK;
        if (get_table_boolean_opt(table, 'ignorewater', 0))
            tmpmons.mm_flags |= MM_IGNOREWATER;
        if (!get_table_boolean_opt(table, 'countbirth', 1))
            tmpmons.mm_flags |= MM_NOCOUNTBIRTH;

        /* C sp_lev.c:3326-3339 — the appear_as tag/payload split.  The tag is
         * the first four bytes; everything after it is the name that
         * create_monster resolves against defsyms[]/objects[]/mons[].
         * Draws no RNG. */
        const mappear = get_table_str_opt(table, 'appear_as', null);
        if (mappear != null) {
            if (mappear.startsWith('obj:'))
                tmpmons.appear = M_AP_OBJECT;
            else if (mappear.startsWith('mon:'))
                tmpmons.appear = M_AP_MONSTER;
            else if (mappear.startsWith('ter:'))
                tmpmons.appear = M_AP_FURNITURE;
            else
                throw new Error('Unknown appear_as type');   /* C: nhl_error() */
            tmpmons.appear_as = mappear.slice(4);
        }

        const xy = get_table_xy_or_coord(table);
        mx = xy.x;
        my = xy.y;

        /* get_table_montype -> find_montype draws #1 (rn2(2) gender fallback). */
        const { id: montypeId, mgend } = get_table_montype(table);
        tmpmons.id = montypeId;
        /* get_table_montype may return a random gender if the species isn't
         * all-male or all-female; if the level designer specified a gender,
         * override that random one now, unless it *is* a one-gender species
         * (don't permit creation of a male nymph or female Nazgul, etc.). */
        if (mgend !== NEUTRAL
            && (tmpmons.female === BOOL_RANDOM || is_female_mndx(tmpmons.id) || is_male_mndx(tmpmons.id)))
            tmpmons.female = mgend;
        /* safety net — if find_montype did not resolve a gender for this species */
        if (tmpmons.female === BOOL_RANDOM)
            tmpmons.female = 0;

        tmpmons.class = get_table_monclass(table);

        inventoryField = table.get('inventory');
        if (inventoryField != null) {
            if (inventoryField.type === 'function' || typeof inventoryField === 'function') {
                tmpmons.has_invent = CUSTOM_INVENT;
                if (keep_default_invent === 1)
                    tmpmons.has_invent |= DEFAULT_INVENT;
            } else {
                throw new Error('UNPORTED-CALLEE: lspo_monster inventory field (non-function value)');
            }
        } else if (keep_default_invent === 0) {
            tmpmons.has_invent = NO_INVENT;
        }
    }

    tmpmons.coord = (mx === -1 && my === -1)
        ? SP_COORD_PACK_RANDOM(0)
        : SP_COORD_PACK(mx, my);

    if (tmpmons.id !== NON_PM && tmpmons.class === -1)
        tmpmons.class = monsym(tmpmons.id);

    const mtmp = await create_monster(tmpmons, game.gc.coder.croom);
    const hasCustomInvent = !!(tmpmons.has_invent & CUSTOM_INVENT);
    return { mtmp: mtmp || null, hasCustomInvent };
}

// ═══════════════════════════════════════════════════════════════════════════════
// create_altar — C ref: sp_lev.c:2446-2487
// ═══════════════════════════════════════════════════════════════════════════════
async function create_altar(a, croom) {
    let x = -1, y = -1;
    let croom_is_temple = true;
    let sproom;

    if (croom) {
        /* C ref: sp_lev.c:2453-2456 —
         *     get_free_room_loc(&x, &y, croom, a->coord);
         *     if (croom->rtype != TEMPLE) croom_is_temple = FALSE;
         * The callee has been ported and live (create_trap's croom arm calls
         * it) since before this stub was written; the stub outlived its
         * premise.  It is the whole block on minetn-2/-3/-4/-7 — the altar
         * inside Minetown's temple room, placed from des.room contents so
         * gc.coder.croom is non-NULL.  C enters with x = y = -1 (sp_lev.c:2449),
         * which is what get_room_loc's fully-random somexy() arm keys off. */
        const coord = { x: -1, y: -1 };
        get_free_room_loc(coord, croom, a.coord);
        x = coord.x;
        y = coord.y;
        if (croom.rtype !== TEMPLE)
            croom_is_temple = false;
    } else {
        const coord = { x: -1, y: -1 };
        get_location_coord(coord, DRY, croom, a.coord);
        x = coord.x;
        y = coord.y;
        /* in_rooms(x, y, TEMPLE) — inline port */
        sproom = 0;
        const rooms = game.level?.rooms;
        if (rooms) {
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                if (r && r.rtype === TEMPLE
                    && r.lx <= x && x <= r.hx
                    && r.ly <= y && y <= r.hy) {
                    sproom = i + ROOMOFFSET;
                    break;
                }
            }
        }
        if (sproom !== 0) {
            croom = game.level.rooms[sproom - ROOMOFFSET];
        } else {
            croom_is_temple = false;
        }
    }

    /* check for existing features — set_levltyp(x, y, ALTAR) */
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    loc.typ = ALTAR;

    const amask = sp_amask_to_amask(a.sp_amask);
    loc.altarmask = amask;

    if (a.shrine < 0)
        a.shrine = rn2(2); /* handle random case */

    if (!croom_is_temple || !a.shrine)
        return;

    /* C sp_lev.c:2479-2485 — `if (a->shrine)` is redundant after the guard
     * above, but kept so the arms line up with C. */
    if (a.shrine) { /* Is it a shrine or sanctum? */
        await priestini(game.u.uz, croom, x, y, (a.shrine > 1));
        loc.altarmask |= AM_SHRINE;
        if (a.shrine === 2) /* high altar or sanctum */
            loc.altarmask |= AM_SANCTUM;
        game.level.flags.has_temple = true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_altar — C ref: sp_lev.c:4287-4325
// ═══════════════════════════════════════════════════════════════════════════════
export async function lspo_altar(args) {
    const shrines = ['altar', 'shrine', 'sanctum', null];
    const shrines2i = [0, 1, 2, 0];

    create_des_coder();

    if (!(args && args.type === 'table'))
        throw new Error('lspo_altar: expected a table argument');

    const { x: mx, y: my } = get_table_xy_or_coord(args);

    const al = get_table_align(args);
    const shrine = shrines2i[get_table_option(args, 'type', 'altar', shrines)];

    const acoord = (mx === -1 && my === -1)
        ? SP_COORD_PACK_RANDOM(0)
        : SP_COORD_PACK(mx, my);

    const tmpaltar = {
        coord: acoord,
        sp_amask: al,
        shrine: shrine,
    };

    await create_altar(tmpaltar, game.gc.coder.croom);

    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_drawbridge — C ref: sp_lev.c:5719-5754
// ═══════════════════════════════════════════════════════════════════════════════

export function lspo_drawbridge(args) {
    const mwdirs = ["north", "south", "west", "east", "random", null];
    const mwdirs2i = [DB_NORTH, DB_SOUTH, DB_WEST, DB_EAST, -1, -2];
    const dbopens = ["open", "closed", "random", null];
    const dbopens2i = [1, 0, -1, -2];

    create_des_coder();

    if (!(args && args.type === 'table'))
        throw new Error('lspo_drawbridge: expected a table argument');

    const { x: mx, y: my } = get_table_xy_or_coord(args);

    const dir = mwdirs2i[get_table_option(args, 'dir', 'random', mwdirs)];
    const dcoord = SP_COORD_PACK(mx, my);
    let db_open = dbopens2i[get_table_option(args, 'state', 'random', dbopens)];

    // C sp_lev.c:5747-5748 — the des-file (mx,my) are MAP coordinates; they
    // become absolute only through get_location_coord, which adds the
    // xstart/ystart the map fragment was laid down at.  This call was missing
    // and the raw map coords were handed to create_drawbridge, so the castle's
    // `des.drawbridge({dir="east", state="closed", x=05,y=08})` (castle.lua:81)
    // aimed at absolute (5,8) — off the west edge of the 63-wide map, which
    // starts at x=9.  There is STONE there, so create_drawbridge's
    // `!IS_WALL(levl[x2][y2].typ)` guard returned false and the drawbridge was
    // silently never built: the MOAT square at (14,11) that C converts to
    // DRAWBRIDGE_UP stayed water, and mineralize()'s kelp scan drew one extra
    // leaf 22802 of 120639, with castle admitted).
    const coord = { x: mx, y: my };
    get_location_coord(coord, DRY | WET | HOT, game.gc?.coder?.croom ?? null, dcoord);
    // C: `if (!isok(mx, my))` — note C tests the RAW table values, not the
    // resolved (x,y).  Ported as written (Cardinal Rule 1).
    if (!isok(mx, my))
        throw new Error('drawbridge coord not ok');

    if (db_open === -1)
        db_open = !rn2(2);

    // C has NO randomization of `dir`: mwdirs2i maps "random" to -1 and passes
    // it straight through, where create_drawbridge's switch default falls into
    // the DB_WEST arm.  A `dir = rn2(4)` used to stand here; it is not in the
    // 5.0 source (sp_lev.c:5743) nor in 3.7, and no dat/*.lua declares
    // dir="random", so it was a fabricated draw on an unreachable arm.
    create_drawbridge(coord.x, coord.y, dir, db_open);

    // SpLev_Map bookkeeping (C: SpLev_Map[x][y] = 1, after create_drawbridge,
    // on the RESOLVED coordinates)
    if (!game.splev_map)
        game.splev_map = new Uint8Array(COLNO * ROWNO);
    game.splev_map[coord.x * ROWNO + coord.y] = 1;

    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C refs: sp_lev.c:6460-6515 load_special(); sp_lev.c:1123-1143
// link_doors_rooms(); sp_lev.c:329-357 map_cleanup(); sp_lev.c:966-981
// flip_level_rnd(); mkmaze.c:569-704 fixup_special().
// ═══════════════════════════════════════════════════════════════════════════════

const BOULDER = 475; /* object type index for boulders — same local
                         convention already duplicated in mklev.js/dig.js/
                         trap.js/dogmove.js/makemon.js/m_initweap.js/mhitu.js */

// ---------------------------------------------------------------------------
// Grid marshal helpers — remove_boundary_syms/solidify_map (already landed,
// this file, "grid transform" functions taking/returning flat COLNO*ROWNO
// game.level <-> flat-array marshalling load_special needs around each call.
// ---------------------------------------------------------------------------
function splev_extract_typ() {
    const typ = new Array(COLNO * ROWNO);
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            typ[x * ROWNO + y] = game.level.at(x, y)?.typ ?? STONE;
    return typ;
}
function splev_extract_flags() {
    const flags = new Array(COLNO * ROWNO);
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            flags[x * ROWNO + y] = game.level.at(x, y)?.flags ?? 0;
    return flags;
}
function splev_apply_typ_flags(typ, flags) {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            if (!loc)
                continue;
            loc.typ = typ[x * ROWNO + y];
            loc.flags = flags[x * ROWNO + y];
        }
}
// Same fallback as lvlfill_solid (this file, ~line 171-177) — game.gx/
// game.gy are the JS home for C's gx.x_maze_max/gy.y_maze_max.
function splev_maze_extent() {
    return {
        x_maze_max: game.gx?.x_maze_max ?? ((COLNO - 1) & ~1),
        y_maze_max: game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1),
    };
}

// ---------------------------------------------------------------------------
// link_doors_rooms — C ref: sp_lev.c:1076-1143 (shared_with_room,
// maybe_add_door, link_doors_rooms). Walks every door/secret-door tile
// placed by the map's own ASCII art (via lspo_map, already real — doors can
// come straight from '+'/'S' glyphs in a MAP...ENDMAP block, no des.door()
// call required per C's own comment at sp_lev.c:1129-1131) and links each
// one to its room(s).
//
// splev_inside_room duplicates js/mklev.js:6205 inside_room()'s body
// beyond js/sp_lev.js + the single js/mklev.js wallification export the
// task grants). splev_shared_with_room/splev_maybe_add_door are ported
// directly from sp_lev.c:1090-1120, using the same room-index convention
// (roomnoidx ?? rooms.indexOf(...)) mklev.js's own inside_room/somexy use.
// ---------------------------------------------------------------------------
function splev_inside_room(croom, x, y) {
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? game.level.rooms.indexOf(croom);
        const i = idx + ROOMOFFSET;
        const loc = game.level.at(x, y);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}
// C ref: sp_lev.c:1090-1106 shared_with_room()
function splev_shared_with_room(x, y, droom) {
    const rmno = (droom.roomnoidx ?? game.level.rooms.indexOf(droom)) + ROOMOFFSET;
    if (!isok(x, y))
        return false;
    const loc0 = game.level.at(x, y);
    if ((loc0.roomno | 0) === rmno && !loc0.edge)
        return false;
    if (isok(x - 1, y) && (game.level.at(x - 1, y).roomno | 0) === rmno && x - 1 <= droom.hx)
        return true;
    if (isok(x + 1, y) && (game.level.at(x + 1, y).roomno | 0) === rmno && x + 1 >= droom.lx)
        return true;
    if (isok(x, y - 1) && (game.level.at(x, y - 1).roomno | 0) === rmno && y - 1 <= droom.hy)
        return true;
    if (isok(x, y + 1) && (game.level.at(x, y + 1).roomno | 0) === rmno && y + 1 >= droom.ly)
        return true;
    return false;
}
// C ref: sp_lev.c:1109-1120 maybe_add_door()
function splev_maybe_add_door(x, y, droom) {
    if (!droom || droom.hx == null || droom.hx < 0)
        return;
    const rmno = (droom.roomnoidx ?? game.level.rooms.indexOf(droom)) + ROOMOFFSET;
    const loc = game.level.at(x, y);
    if ((!droom.irregular && splev_inside_room(droom, x, y))
        || (loc.roomno | 0) === rmno
        || splev_shared_with_room(x, y, droom)) {
        add_door(x, y, droom);
    }
}
// C ref: sp_lev.c:1123-1143 link_doors_rooms()
function link_doors_rooms() {
    if (!game.level)
        return;
    const typ = splev_extract_typ();
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (!loc)
                continue;
            if (IS_DOOR(loc.typ) || loc.typ === SDOOR) {
                loc.horizontal = !!set_door_orientation(typ, x, y);
                const nroom = game.level.nroom | 0;
                for (let tmpi = 0; tmpi < nroom; tmpi++) {
                    const room = game.level.rooms[tmpi];
                    splev_maybe_add_door(x, y, room);
                    const nsub = room?.nsubrooms | 0;
                    for (let m = 0; m < nsub; m++) {
                        splev_maybe_add_door(x, y, room.sbrooms?.[m]);
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// map_cleanup — C ref: sp_lev.c:326-354. Deletes boulders/traps/engravings
// sitting on lava/pool cells after level load. No RNG.
// ---------------------------------------------------------------------------
// C ref: mkobj.c obj_extract_self, specialized to the map_cleanup case
// js/cmd.js, js/lock.js (per-tile levelObjects/nexthere chain + global
// fobj/nobj chain, no single shared exported helper exists project-wide).
function splev_obj_extract_floor(obj) {
    const xi = obj.ox | 0, yi = obj.oy | 0;
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        const head = lvlObjs[xi][yi];
        if (head === obj) {
            lvlObjs[xi][yi] = obj.nexthere ?? null;
        } else {
            for (let o = head; o; o = o.nexthere) {
                if (o.nexthere === obj) { o.nexthere = obj.nexthere; break; }
            }
        }
    }
    if (game.fobj === obj) {
        game.fobj = obj.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
    obj.where = OBJ_FREE;
}
// C ref: trap.h undestroyable_trap — same local duplicate js/trap.js:720
// uses (module-local there, not exported).
function splev_undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}
function map_cleanup() {
    if (!game.level)
        return;
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            if (!loc)
                continue;
            const typ = loc.typ;
            if (IS_LAVA(typ) || IS_POOL(typ)) {
                let otmp;
                while ((otmp = sobj_at(BOULDER, x, y)) != null) {
                    splev_obj_extract_floor(otmp);
                }
                const ttmp = t_at(x, y);
                if (ttmp && !splev_undestroyable_trap(ttmp.ttyp)) {
                    deltrap(ttmp);
                }
                if (engr_at(x, y))
                    del_engr_at(x, y);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// flip_level — C ref: sp_lev.c:534-923 (+ flip_vault_guard, 925-959).
// Transposes the whole level top<->bottom (flp&1) and/or left<->right
// (flp&2). Draws ZERO rn2/rnd/d/rne/rnz — pure coordinate transposition.
// extras=true is the #wizfliplevel path.  The same structural transpose is
// used, with the additional hero/ball/travel state updates below.
export async function flip_level(flp, extras) {
    if ((flp & 3) === 0)
        return;

    let { xmin: minx, xmax: maxx, ymin: miny, ymax: maxy } = get_level_extends();
    if (miny < 0)
        miny = 0;
    if (minx < 1)
        minx = 1;
    if (maxx >= COLNO)
        maxx = COLNO - 1;
    if (maxy >= ROWNO)
        maxy = ROWNO - 1;

    const FlipX = (val) => (maxx - val) + minx;
    const FlipY = (val) => (maxy - val) + miny;
    const inFlipArea = (x, y) => x >= minx && x <= maxx && y >= miny && y <= maxy;
    const Flip_coord = (cc) => {
        if (cc && cc.x && inFlipArea(cc.x, cc.y)) {
            if (flp & 1)
                cc.y = FlipY(cc.y);
            if (flp & 2)
                cc.x = FlipX(cc.x);
        }
    };

    let ballActive = false;
    let ballFlipArea = true;
    if (extras && game.u?.uball && (game.u.uball.where | 0) !== OBJ_FREE) {
        ballActive = true;
        if (game.u.uball.ocarry === game.u
            || game.u.uball.ocarry === game.u.youmonst)
            game.u.uball.ox = game.u.ux, game.u.uball.oy = game.u.uy;
        const b = game.u.uball, c = game.u.uchain;
        ballFlipArea = !!(c && inFlipArea(b.ox, b.oy) === inFlipArea(c.ox, c.oy)
                           && inFlipArea(b.ox, b.oy) === inFlipArea(game.u.ux, game.u.uy));
        if (!ballFlipArea)
            unplacebc();
    }

    // stairs and ladders — sp_lev.c:587-593
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (flp & 1)
            stway.sy = FlipY(stway.sy);
        if (flp & 2)
            stway.sx = FlipX(stway.sx);
    }

    // traps — sp_lev.c:595-617
    for (const ttmp of game.level.traps || []) {
        if (!inFlipArea(ttmp.tx, ttmp.ty))
            continue;
        if (flp & 1) {
            ttmp.ty = FlipY(ttmp.ty);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                // C sp_lev.c:602-603 flips launch.y and launch2.y. No callee here —
                // pure coordinate arithmetic, zero RNG. Both launch (maketrap,
                // js/mklev.js:3604) and launch2 (mkroll_launch, js/mklev.js:6226)
                // are modeled in JS, so both flip.
                ttmp.launch.y = FlipY(ttmp.launch.y);
                if (ttmp.launch2)
                    ttmp.launch2.y = FlipY(ttmp.launch2.y);
            } else if (is_pit(ttmp.ttyp) && ttmp.conjoined) {
                ttmp.conjoined = flip_encoded_dir_bits(flp, ttmp.conjoined);
            }
        }
        if (flp & 2) {
            ttmp.tx = FlipX(ttmp.tx);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                // C sp_lev.c:611-612 — launch.x and launch2.x, same reasoning as above.
                ttmp.launch.x = FlipX(ttmp.launch.x);
                if (ttmp.launch2)
                    ttmp.launch2.x = FlipX(ttmp.launch2.x);
            } else if (is_pit(ttmp.ttyp) && ttmp.conjoined) {
                ttmp.conjoined = flip_encoded_dir_bits(flp, ttmp.conjoined);
            }
        }
    }

    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
        if (!inFlipArea(otmp.ox, otmp.oy))
            continue;
        if (flp & 1)
            otmp.oy = FlipY(otmp.oy);
        if (flp & 2)
            otmp.ox = FlipX(otmp.ox);
    }

    // buried objects — sp_lev.c:629-637 (buriedobjlist is always empty
    // today — add_to_buried defers the chain link — this loop is a
    // zero-iteration no-op that becomes correct automatically once that
    // lands; costs nothing to port now)
    for (let otmp = game.level.buriedobjlist; otmp; otmp = otmp.nobj) {
        if (!inFlipArea(otmp.ox, otmp.oy))
            continue;
        if (flp & 1)
            otmp.oy = FlipY(otmp.oy);
        if (flp & 2)
            otmp.ox = FlipX(otmp.ox);
    }

    // monsters — sp_lev.c:639-674
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isgd) {
            // extras-only flip_vault_guard() call skipped — extras=false here
            if (mtmp.mx === 0) // not on map so don't flip guard->mx,my
                continue;
        }
        // skip the occasional earth elemental outside the flip area
        if (!inFlipArea(mtmp.mx, mtmp.my))
            continue;
        if (flp & 1)
            mtmp.my = FlipY(mtmp.my);
        if (flp & 2)
            mtmp.mx = FlipX(mtmp.mx);

        // mgoal is never set anywhere in JS today — this guard is a
        // harmless always-false no-op, kept for C-faithfulness.
        Flip_coord(mtmp.mgoal);

        if (mtmp.ispriest) {
            const epri = EPRI(mtmp);
            if (epri)
                Flip_coord(epri.shrpos);
        } else if (mtmp.isshk) {
            const eshk = ESHK(mtmp);
            if (eshk) {
                Flip_coord(eshk.shk); // shk's preferred spot
                Flip_coord(eshk.shd); // shop door
            }
        } else if (mtmp.wormno) {
            /* C sp_lev.c:660-665 */
            if (flp & 1)
                flip_worm_segs_vertical(mtmp, miny, maxy);
            if (flp & 2)
                flip_worm_segs_horizontal(mtmp, minx, maxx);
        }
    }
    // migrating monsters (extras only) — skipped, extras=false here
    if (extras) {
        for (let mtmp = game.gm?.migrating_mons; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.ispriest && mtmp.epri?.shrpos
                && on_level(mtmp.epri.shrlevel, game.u?.uz))
                Flip_coord(mtmp.epri.shrpos);
            else if (mtmp.isshk && mtmp.eshk?.shk
                     && on_level(mtmp.eshk.shoplevel, game.u?.uz)) {
                Flip_coord(mtmp.eshk.shk);
                Flip_coord(mtmp.eshk.shd);
            }
        }
    }

    // engravings — sp_lev.c:690-696. NO inFlipArea guard in C — do not add
    // one. Two-pass: collect every hit across the whole grid, THEN rewrite
    // (rewriting in place while still scanning would corrupt the scan).
    {
        const hits = [];
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const etmp = engr_at(x, y);
                if (etmp)
                    hits.push({ x, y, text: etmp.text, engr_type: etmp.engr_type });
            }
        }
        for (const h of hits) {
            del_engr_at(h.x, h.y);
            const newY = (flp & 1) ? FlipY(h.y) : h.y;
            const newX = (flp & 2) ? FlipX(h.x) : h.x;
            make_engr_at(newX, newY, h.text, null, 0, h.engr_type);
        }
    }

    // level (teleport) regions — sp_lev.c:698-734
    for (const lregion of game._lregions || []) {
        if (flp & 1) {
            lregion.inarea.y1 = FlipY(lregion.inarea.y1);
            lregion.inarea.y2 = FlipY(lregion.inarea.y2);
            if (lregion.inarea.y1 > lregion.inarea.y2) {
                const tmp = lregion.inarea.y1;
                lregion.inarea.y1 = lregion.inarea.y2;
                lregion.inarea.y2 = tmp;
            }
            lregion.delarea.y1 = FlipY(lregion.delarea.y1);
            lregion.delarea.y2 = FlipY(lregion.delarea.y2);
            if (lregion.delarea.y1 > lregion.delarea.y2) {
                const tmp = lregion.delarea.y1;
                lregion.delarea.y1 = lregion.delarea.y2;
                lregion.delarea.y2 = tmp;
            }
        }
        if (flp & 2) {
            lregion.inarea.x1 = FlipX(lregion.inarea.x1);
            lregion.inarea.x2 = FlipX(lregion.inarea.x2);
            if (lregion.inarea.x1 > lregion.inarea.x2) {
                const tmp = lregion.inarea.x1;
                lregion.inarea.x1 = lregion.inarea.x2;
                lregion.inarea.x2 = tmp;
            }
            lregion.delarea.x1 = FlipX(lregion.delarea.x1);
            lregion.delarea.x2 = FlipX(lregion.delarea.x2);
            if (lregion.delarea.x1 > lregion.delarea.x2) {
                const tmp = lregion.delarea.x1;
                lregion.delarea.x1 = lregion.delarea.x2;
                lregion.delarea.x2 = tmp;
            }
        }
    }

    // regions (poison clouds etc, sp_lev.c:736-763) — OMITTED. See
    // "region.js's svn.n_regions is always 0 (module-private, no accessor,
    // nothing ever increments it) — a loop that cannot run".  All three
    // clauses are false.  `add_region()` (js/region.js) increments
    // svn.n_regions and has SIX live callers outside its own module
    // (js/monmove.js:2811/:2814/:2842, js/makemon.js:4700, js/potion.js:1329,
    // js/trap.js:564, all through create_gas_cloud), and js/region.js now
    // exports `regions_list()` as exactly the accessor this claimed did not
    // but it is NOT justified by "the loop cannot run".

    // rooms + subrooms — sp_lev.c:765-812. game.level.rooms is an array
    // that carries a trailing sentinel entry ({hx:-1}, see mklev.js
    // add_room) mirroring C's sentinel-terminated svr.rooms[] — break on it
    // exactly as the C scan does, don't flip it.
    for (const sroom of game.level.rooms || []) {
        if ((sroom.hx ?? -1) < 0)
            break;
        if (flp & 1) {
            sroom.ly = FlipY(sroom.ly);
            sroom.hy = FlipY(sroom.hy);
            if (sroom.ly > sroom.hy) {
                const tmp = sroom.ly;
                sroom.ly = sroom.hy;
                sroom.hy = tmp;
            }
        }
        if (flp & 2) {
            sroom.lx = FlipX(sroom.lx);
            sroom.hx = FlipX(sroom.hx);
            if (sroom.lx > sroom.hx) {
                const tmp = sroom.lx;
                sroom.lx = sroom.hx;
                sroom.hx = tmp;
            }
        }
        for (let i = 0; i < (sroom.nsubrooms | 0); i++) {
            const rroom = sroom.sbrooms[i];
            if (flp & 1) {
                rroom.ly = FlipY(rroom.ly);
                rroom.hy = FlipY(rroom.hy);
                if (rroom.ly > rroom.hy) {
                    const tmp = rroom.ly;
                    rroom.ly = rroom.hy;
                    rroom.hy = tmp;
                }
            }
            if (flp & 2) {
                rroom.lx = FlipX(rroom.lx);
                rroom.hx = FlipX(rroom.hx);
                if (rroom.lx > rroom.hx) {
                    const tmp = rroom.lx;
                    rroom.lx = rroom.hx;
                    rroom.hx = tmp;
                }
            }
        }
    }

    // doors — sp_lev.c:814-817
    for (let i = 0; i < (game.level.doorindex | 0); i++) {
        Flip_coord(game.level.doors[i]);
    }

    // the map — sp_lev.c:819-861. Terrain, object-pile and the monsters[][]
    // grid, in C's own order.
    //
    // The note that used to sit here said the monsters[x][y] swap was skipped
    // because "game.level.monsters has no real backing (JS tracks monster
    // position solely via the fmon-chain walk above)". That was true when it
    // was written and is not any more: js/worm.js keeps a module-local
    // occupancy map for LONG WORM SEGMENTS, which are exactly the entries C's
    // grid holds that are not fmon entries (rm.h:533 place_worm_seg), and
    // js/uhitm.js m_at() reads it. Flipping the segments' own <wx,wy> in the
    // monster loop above without flipping that occupancy left the two halves
    // of one worm on opposite sides of the map.
    if (flp & 1) {
        for (let x = minx; x <= maxx; x++) {
            for (let y = miny; y < (miny + Math.floor((maxy - miny + 1) / 2)); y++) {
                const ny = FlipY(y);

                let res = flip_dbridge_vertical(game.level.locations[x][y]);
                game.level.locations[x][y].typ = res.typ;
                game.level.locations[x][y].flags = res.flags;
                res = flip_dbridge_vertical(game.level.locations[x][ny]);
                game.level.locations[x][ny].typ = res.typ;
                game.level.locations[x][ny].flags = res.flags;

                [game.level.locations[x][y], game.level.locations[x][ny]] =
                    [game.level.locations[x][ny], game.level.locations[x][y]];

                [game.level.levelObjects[x][y], game.level.levelObjects[x][ny]] =
                    [game.level.levelObjects[x][ny], game.level.levelObjects[x][y]];

                // sp_lev.c:844-846 — the monsters[][] swap; worm segments are
                // the only entries this port's grid stand-in holds.
                worm_seg_swap(x, y, x, ny);
            }
        }
    }
    if (flp & 2) {
        for (let x = minx; x < (minx + Math.floor((maxx - minx + 1) / 2)); x++) {
            for (let y = miny; y <= maxy; y++) {
                const nx = FlipX(x);

                let res = flip_dbridge_horizontal(game.level.locations[x][y]);
                game.level.locations[x][y].typ = res.typ;
                game.level.locations[x][y].flags = res.flags;
                res = flip_dbridge_horizontal(game.level.locations[nx][y]);
                game.level.locations[nx][y].typ = res.typ;
                game.level.locations[nx][y].flags = res.flags;

                [game.level.locations[x][y], game.level.locations[nx][y]] =
                    [game.level.locations[nx][y], game.level.locations[x][y]];

                [game.level.levelObjects[x][y], game.level.levelObjects[nx][y]] =
                    [game.level.levelObjects[nx][y], game.level.levelObjects[x][y]];

                // sp_lev.c:858-860 — the monsters[][] swap; see above.
                worm_seg_swap(x, y, nx, y);
            }
        }
    }

    // timed effects (MELT_ICE_AWAY, sp_lev.c:863-875) — OMITTED. No timer
    // row 13.

    // C ref: sp_lev.c:877-897 — flip the level's exclusion zones with the map.
    //
    // This block used to be OMITTED, on the reasoning that "js/dungeon.js's
    // sve.exclusion_zones is always null".  That is true and irrelevant: the
    // LIVE store in this port is game.exclusion_zones, which lspo_exclusion()
    // (this file, C sp_lev.c:5505) unshifts onto for every des.exclusion(), and
    // which all three goodpos() copies read.  So the map flipped and the
    // exclusion rectangle did not.
    //
    // Every monster-generation exclusion in dat/ belongs to a Sokoban level
    // (soko[1-4]-[12].lua), and Sokoban levels are ALWAYS flip candidates.
    // soko1-1.lua:63 declares `region = { 07,01, 23,01 }` — the row of filled
    // holes, "prevent monster generation over the (filled) holes" — which lands
    // level-teleports into soko1-1 with the vertical flip on: C moves the zone
    // down with the holes, this port left it on row 4 and then refused to
    // generate anything in x 45..50 of that row.  Probed under the scored
    // runSegment path: 5 squares x 50 rejected rndmonst picks, all failing on
    // exactly this test, so the level's fill produced no monsters and no gold —
    // leaf 9643, C rnd(2) @next_ident(mkobj.c:521) vs JS rn2(3)).
    for (const ez of (game.exclusion_zones || [])) {
        if (flp & 1) {
            ez.ly = FlipY(ez.ly);
            ez.hy = FlipY(ez.hy);
            if (ez.ly > ez.hy) {
                const itmp = ez.ly; ez.ly = ez.hy; ez.hy = itmp;
            }
        }
        if (flp & 2) {
            ez.lx = FlipX(ez.lx);
            ez.hx = FlipX(ez.hx);
            if (ez.lx > ez.hx) {
                const itmp = ez.lx; ez.lx = ez.hx; ez.hx = itmp;
            }
        }
    }

    fix_wall_spines(1, 0, COLNO - 1, ROWNO - 1);
    if (extras) {
        if (inFlipArea(game.u?.ux, game.u?.uy)) {
            if (flp & 1) game.u.uy = FlipY(game.u.uy);
            if (flp & 2) game.u.ux = FlipX(game.u.ux);
            game.u.ux0 = game.u.ux;
            game.u.uy0 = game.u.uy;
        }
        if (ballActive && !ballFlipArea)
            await placebc();
        const travel = game.iflags?.travelcc;
        if (travel) Flip_coord(travel);
        const digging = game.context?.digging?.pos;
        if (digging) Flip_coord(digging);
        set_wall_state();
    }
    vision_reset();
}

// ---------------------------------------------------------------------------
// flip_level_rnd — C ref: sp_lev.c:966-981. Randomly transposes top/bottom
// and/or left/right per the allow_flips bitmask; the geometric transpose
// itself (flip_level(), sp_lev.c:852-955) is a separate, much larger
//
// KNOWN DISCREPANCY (see PR notes / keystone-spec-phase3-wiring.md §1.7):
// the spec's premise for this being a provable no-op on tut-1/tut-2 is that
// "noflip" has already zeroed gc.coder.allow_flips by the time this runs.
// That requires lspo_level_flags (des.level_flags) to be real; it is not
// des.* wiring loop (js/lua/nh_state.js's DES_EXPORT_EXCEPTIONS loop) only
// forwards the FIRST positional Lua argument to a real handler for
// multi-arg des.* calls like des.level_flags("mazelevel","noflip",...), so
// a same-shaped lspo_level_flags could not observe the rest of the flag
// list even if added here — fixing that is an js/lua/nh_state.js wiring
// single js/mklev.js wallification export). Net effect: gc.coder.allow_flips
// stays at the real C *default* (3) for tut-1/tut-2 today, so this
// function, unlike in C, DOES roll rn2(2) draws and CAN reach the
// flip_level() call below.
export async function flip_level_rnd(flp, extras) {
    let c = 0;
    if ((flp & 1) && rn2(2))
        c |= 1;
    if ((flp & 2) && rn2(2))
        c |= 2;
    if (c) {
        if (!game.level)
            return; // tool/smoke-test context — no bound level (matches lvlfill_solid's guard convention, this file ~line 171)
        await flip_level(c, extras);
    }
}


/* C sp_lev.c:5150-5153.  Resolved by (name, oc_class) through the compiled 5.0
 * object table rather than by 3.7 otyp number, per this file's oc_merge note:
 *   259 pick-axe (TOOL)      71 dwarvish mattock (WEAPON)   428 digging (WAND)
 *   424 teleportation (WAND) 333 teleportation (SCROLL)     194 teleportation (RING)
 * The three "teleportation" rows are why the lookup has to carry the class:
 * the name alone is ambiguous across wand/scroll/ring. */
const WAY_OUT_ESCAPEITEMS = [259, 71, 428, 424, 333, 194];

async function generate_way_out_method(nx, ny, ov) {
    const ov2 = selection_new();
    let ov3;
    const cx = { value: 0 }, cy = { value: 0 };
    let res = true;

    selection_floodfill(ov2, nx, ny, true);
    ov3 = selection_clone(ov2);

    /* try to make a secret door */
    let done = false;
    while (!done && selection_rndcoord(ov3, cx, cy, true)) {
        const x = cx.value, y = cy.value;
        const loc = (px, py) => game.level.locations[px][py];
        if (isok(x + 1, y) && !selection_getpoint(x + 1, y, ov)
            && IS_WALL(loc(x + 1, y).typ)
            && isok(x + 2, y) && selection_getpoint(x + 2, y, ov)
            && ACCESSIBLE(loc(x + 2, y).typ)) {
            loc(x + 1, y).typ = SDOOR;
            done = true;
        } else if (isok(x - 1, y) && !selection_getpoint(x - 1, y, ov)
            && IS_WALL(loc(x - 1, y).typ)
            && isok(x - 2, y) && selection_getpoint(x - 2, y, ov)
            && ACCESSIBLE(loc(x - 2, y).typ)) {
            loc(x - 1, y).typ = SDOOR;
            done = true;
        } else if (isok(x, y + 1) && !selection_getpoint(x, y + 1, ov)
            && IS_WALL(loc(x, y + 1).typ)
            && isok(x, y + 2) && selection_getpoint(x, y + 2, ov)
            && ACCESSIBLE(loc(x, y + 2).typ)) {
            loc(x, y + 1).typ = SDOOR;
            done = true;
        } else if (isok(x, y - 1) && !selection_getpoint(x, y - 1, ov)
            && IS_WALL(loc(x, y - 1).typ)
            && isok(x, y - 2) && selection_getpoint(x, y - 2, ov)
            && ACCESSIBLE(loc(x, y - 2).typ)) {
            loc(x, y - 1).typ = SDOOR;
            done = true;
        }
    }

    /* try to make a hole or a trapdoor */
    if (!done && Can_fall_thru(game.u.uz)) {
        selection_free(ov3, true);
        ov3 = selection_clone(ov2);
        while (!done && selection_rndcoord(ov3, cx, cy, true)) {
            /* C's rn2(2) is inside maketrap's argument, so it is drawn on every
             * iteration, including ones where maketrap then returns NULL. */
            if (await maketrap(cx.value, cy.value, rn2(2) ? HOLE : TRAPDOOR))
                done = true;
        }
    }

    /* generate one of the escape items */
    if (!done && selection_rndcoord(ov2, cx, cy, false)) {
        /* C ROLL_FROM(escapeitems) — hack.h:1493 `array[rn2(SIZE(array))]` */
        await mksobj_at(WAY_OUT_ESCAPEITEMS[rn2(WAY_OUT_ESCAPEITEMS.length)],
                  cx.value, cy.value, true, false);
        done = true;
    }

    if (!done)
        res = false;

    selection_free(ov2, true);
    selection_free(ov3, true);
    return res;
}

async function ensure_way_out() {
    const ov = selection_new();

    set_selection_floodfillchk(floodfillchk_match_accessible_live);

    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.tolev.dnum === game.u.uz.dnum)
            selection_floodfill(ov, stway.sx, stway.sy, true);
    }

    /* C walks the gf.ftrap linked list; this port keeps traps in an array
     * (js/trap.js deltrap's own note).  The two orders differ — C prepends,
     * this pushes — but the loop draws no RNG and its result is the UNION of
     * the floodfilled regions, which is order-independent. */
    for (const ttmp of (game.level?.traps || [])) {
        if ((splev_undestroyable_trap(ttmp.ttyp) || is_hole(ttmp.ttyp))
            && !selection_getpoint(ttmp.tx, ttmp.ty, ov))
            selection_floodfill(ov, ttmp.tx, ttmp.ty, true);
    }

    /* C's do/while with the `goto outhere` is a scan that restarts from (1,0)
     * after every repair, and terminates when a full scan finds no accessible
     * square outside the selection.  Note C sets ret = FALSE and jumps
     * REGARDLESS of whether generate_way_out_method succeeded, so a square it
     * cannot fix is rescanned forever — that is C's behaviour and the reason
     * for its own "TODO: ensure_way_out() needs rewrite" at sp_lev.c:6025. */
    let ret;
    do {
        ret = true;
        outer:
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (ACCESSIBLE(game.level.locations[x][y].typ)
                    && !selection_getpoint(x, y, ov)) {
                    if (await generate_way_out_method(x, y, ov))
                        selection_floodfill(ov, x, y, true);
                    ret = false;
                    break outer;
                }
            }
        }
    } while (!ret);
    selection_free(ov, true);
}
/* C ref: detect.c:2122-2129 skip_premap_detect() — "skip premap detection of
 * areas outside Sokoban map": undiggable/unpassable STONE is the frame Sokoban
 * solidifies around its map, and C leaves it unmapped. */
function skip_premap_detect(loc) {
    return (loc.typ === STONE)
        && ((loc.wall_info | 0) & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0;
}
/* C ref: detect.c:2131-2159 premap_detect() — pre-map a level whose .lua set
 * `premapped` (des.level_flags("premapped"), i.e. every Sokoban level).  Marks
 * the whole grid seen+waslit, paints the terrain and any boulder into the
 * hero's map memory, and reveals every trap.  Consumes NO RNG. */
function premap_detect() {
    /* C 2140-2151: map the background and boulders */
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc || skip_premap_detect(loc))
                continue;
            loc.seenv = SVALL;
            loc.waslit = true;
            /* C 2147-2148: an SDOOR loses its wall_info here — see rm.h */
            if (loc.typ === SDOOR)
                loc.wall_info = 0;
            map_background(x, y, 1);
            const obj = sobj_at(BOULDER, x, y);
            if (obj)
                map_object(obj, 1);
        }
    }
    /* C 2154-2157: map the traps */
    for (let ttmp = game.ftrap; ttmp; ttmp = ttmp.ntrap) {
        ttmp.tseen = 1;
        map_trap(ttmp, 1);
    }
}

// C ref: dungeon.c:1464-1473 Is_branchlev(). js/mklev.js's own copy
// (function is_branchlev(), module-local, not exported) can't be imported
function splev_is_branchlev(uz) {
    const brlist = game._dungeon_branches || game.branches;
    if (!brlist || !uz)
        return null;
    for (const br of brlist) {
        /* Same end1_floating skip as js/mklev.js is_branchlev(): a floating
         * branch's still-declared end1 is not a real placement. */
        if (!br?.end1_floating
            && br?.end1?.dnum === uz.dnum && br?.end1?.dlevel === uz.dlevel)
            return br;
        if (br?.end2?.dnum === uz.dnum && br?.end2?.dlevel === uz.dlevel)
            return br;
    }
    return null;
}

// C ref: mkmaze.c:317-332 is_exclusion_zone(). Mirrors game.exclusion_zones
// (pushed by lspo_exclusion, real/ported — see above) exactly against the C
// sve.exclusion_zones linked list: LR_DOWNTELE/LR_UPTELE also match the
// generic LR_TELE zonetype, everything else needs an exact zonetype match.
function is_exclusion_zone(type, x, y) {
    const zones = game.exclusion_zones || [];
    for (const ez of zones) {
        const typeMatches =
            (type === LR_DOWNTELE && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype;
        if (typeMatches && within_bounded_area(x, y, ez.lx, ez.ly, ez.hx, ez.hy))
            return true;
    }
    return false;
}

// C ref: mkmaze.c:334-350 bad_location(). js/mklev.js has its own copy
// (function bad_location(), module-local, not exported, used by that
// file's narrower hero-placement place_lregion) — can't be imported without
// splev_is_branchlev precedent above.
function splev_bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return true;
    return !!(occupied(x, y)
        || within_bounded_area(x, y, nlx, nly, nhx, nhy)
        || !((loc.typ === CORR && game.level?.flags?.is_maze_lev)
             || loc.typ === ROOM
             || loc.typ === AIR));
}

// C ref: mkmaze.c:1458-1474 mkportal(). The one body in js/ — small and
// self-contained (maketrap + dst wiring), needed as a
// put_lregion_here/place_branch callee. C's debug_fuzzer branch is skipped
// place_branch(), whose BR_PORTAL arm used to fall through doing nothing.
export async function mkportal(x, y, todnum, todlevel) {
    // maketrap is async only because C's STATUE_TRAP arm reaches makemon
    // (js/trap.js maketrap header).  C's mkportal (mkmaze.c:1458) is
    // synchronous; awaiting here preserves the C statement order.
    const ttmp = await maketrap(x, y, MAGIC_PORTAL);
    if (!ttmp)
        return; // C: impossible("portal on top of portal?")
    ttmp.dst.dnum = todnum;
    ttmp.dst.dlevel = todlevel;
}

// C ref: mklev.c:1699-1757 place_branch(branchp, x, y). js/mklev.js's own
// place_branch (module-local, not exported) only implements the x==0
// "whole level" path (its sole caller, the u_on_rndspot chain, never passes
// explicit coords) — duplicating it wholesale would also require importing
// its RNG-consuming find_branch_room/generate_stairs_find_room/somexyspace
// dependency chain, none of which are exported either. put_lregion_here
// below always calls with explicit (x,y) already chosen by place_lregion's
// own search loop, i.e. the x!=0 path, which is self-contained (on_level
// dispatch + mkportal/stairway_add) and ported faithfully here. The x==0
// path (mklev.c:1718-1725, only reachable via the !lx LR_BRANCH+nroom
// shortcut in place_lregion below, or fixup_special's own !added_branch
// tail fallback) throws — none of the quest-file branch regions checked
// bounded branch regions. C: pos_to_room(x,y) return value is discarded by
// the caller (mklev.c:1724) and has no side effects — skipped.
async function splev_place_branch(branchp, x, y) {
    if (!branchp || game.made_branch)
        return;
    if (!x) { /* find random coordinates for branch */
        const m = { x: 0, y: 0 };
        find_branch_room(m);
        x = m.x;
        y = m.y;
    }
    const uz = game.u?.uz;
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const on_end1 = (branchp.end1?.dnum === dnum && branchp.end1?.dlevel === dlevel);
    const dest = on_end1 ? branchp.end2 : branchp.end1;
    const BR_NO_END1 = 1, BR_NO_END2 = 2, BR_PORTAL = 3;
    const brtype = branchp.type ?? 0;
    const make_stairs = on_end1 ? (brtype !== BR_NO_END1) : (brtype !== BR_NO_END2);
    if (brtype === BR_PORTAL) {
        await mkportal(x, y, dest?.dnum ?? 0, dest?.dlevel ?? 0);
    } else if (make_stairs) {
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        stairway_add(x, y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        const loc = game.level?.at(x, y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? LA_UP : LA_DOWN;
        }
        if (goes_up)
            game.level.upstair = { x, y };
        else
            game.level.dnstair = { x, y };
    }
    game.made_branch = true;
}

/* C ref: dungeon.c:299-307 find_level(s) — scan svs.sp_levchn for the s_level
 * whose proto matches `s`, case-insensitively; returns NULL when there is none.
 * No RNG, no state change.  game._sp_levchn is the JS sp_levchn (built by
 * js/dungeon_rng.js); js/mklev.js's sp_levchn_lookup() is the by-d_level
 * counterpart of this by-name scan. */
export function find_level(s) {
    const chn = game._sp_levchn || [];
    const want = String(s ?? '').toLowerCase();
    for (let i = 0; i < chn.length; i++)
        if (String(chn[i].proto ?? '').toLowerCase() === want)
            return chn[i];
    return null;
}

// C ref: mkmaze.c:414-499 put_lregion_here().
async function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    const lregionTrace = typeof process !== 'undefined' && ENV?.FF_LREGION_TRACE === '1';
    if (lregionTrace)
        pushRngLogEntry(`^splev_lregion_try[x=${x | 0},${y | 0} rtype=${rtype | 0} oneshot=${oneshot ? 1 : 0}]`);
    if (splev_bad_location(x, y, nlx, nly, nhx, nhy) || is_exclusion_zone(rtype, x, y)) {
        if (!oneshot)
            return false;
        const t = t_at(x, y);
        if (t && !splev_undestroyable_trap(t.ttyp)) {
            const mtmp = m_at(x, y);
            if (mtmp)
                mtmp.mtrapped = 0;
            deltrap(t);
        }
        if (splev_bad_location(x, y, nlx, nly, nhx, nhy) || is_exclusion_zone(rtype, x, y))
            return false;
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE:
        /* C treats the destination as the hero: clear an occupying monster
         * when this is the one-shot fallback, then perform the normal
         * u_on_newpos bookkeeping. */
        {
            const mtmp = m_at(x, y);
            if (mtmp) {
                if (lregionTrace)
                    pushRngLogEntry(`^splev_lregion_occupied[x=${x | 0},${y | 0} id=${mtmp.m_id | 0} mndx=${mtmp?.mndx ?? mtmp?.data?.pmidx ?? -1} rtype=${rtype | 0} oneshot=${oneshot ? 1 : 0}]`);
                if (!oneshot)
                    return false;
                if (!await rloc(mtmp, RLOC_NOMSG))
                    await m_into_limbo(mtmp);
            }
            u_on_newpos(x, y);
        }
        break;
    case LR_PORTAL:
        await mkportal(x, y, lev?.dnum ?? 0, lev?.dlevel ?? 0);
        break;
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkstairs(x, y, rtype === LR_UPSTAIR, null);
        break;
    case LR_BRANCH:
        await splev_place_branch(splev_is_branchlev(game.u?.uz), x, y);
        break;
    }
    return true;
}

// C ref: mkmaze.c:353-410 place_lregion(). RNG-CRITICAL: two rn1() calls
// per probabilistic try (x then y), up to 200 tries, matching C's exact
// call order, before falling back to the deterministic x/y nested-loop
async function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) { // default to whole level
        // if there are rooms and this a branch, let place_branch choose
        // the branch location (to avoid putting branches in corridors).
        if (rtype === LR_BRANCH && (game.level?.nroom ?? 0)) {
            await splev_place_branch(splev_is_branchlev(game.u?.uz), 0, 0);
            return;
        }
        lx = 1; // column 0 is not used
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    // clamp the area to the map
    if (lx < 1)
        lx = 1;
    if (hx > COLNO - 1)
        hx = COLNO - 1;
    if (ly < 0)
        ly = 0;
    if (hy > ROWNO - 1)
        hy = ROWNO - 1;

    // first a probabilistic approach
    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev))
            return;
    }

    // then a deterministic one
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true, lev))
                return;

    // C mkmaze.c:409
    await impossible("Couldn't place lregion type %d!", rtype);
}

const MR_STONE = 0x80;
/* C mondata.h:14 — #define pm_resistance(ptr, typ) (((ptr)->mresists & (typ)) != 0)
 * MONS row column [5] is mresists (js/makemon.js:1271 permonstTemplate). */
function pm_resistance(mndx, typ) {
    const row = MONS_ROWS[mndx | 0];
    return row ? (((row[5] | 0) & typ) !== 0) : false;
}
/* The `&mons[n]` argument poly_when_stoned() wants: js/mhitm.js's real body
 * reads only .mlet and .pmidx.  Column [0] is mlet.  A row-less mndx (NON_PM)
 * cannot happen on C's path here — mk_tt_object/mkcorpstat always set
 * corpsenm — so the fallback is a JS crash shield, and it answers the same way
 * C's `mons[]` row for a non-golem would (mlet != S_GOLEM). */
function _pm_of(mndx) {
    const row = MONS_ROWS[mndx | 0];
    return { mlet: row ? (row[0] | 0) : -1, pmidx: mndx | 0 };
}
/* C dungeon.h Is_medusa_level(lev) = on_level(lev, &medusa_level).  One
 * spelling, used by BOTH C sites that need it here (create_object's statue
 * special case, sp_lev.c:2356, and fixup_special's statue placement,
 * mkmaze.c:648) — js/dungeon_rng.js:610 is what fills game.medusa_level. */
function Is_medusa_level(uz) {
    return !!(uz && game.medusa_level && on_level(uz, game.medusa_level));
}
/* C mon.c:3267 mongone(), narrowed to the level-generation callers — see the
 * long note at the create_object call site for exactly which C statements are
 * dropped and why each is provably inert there.  `discard` selects the reject
 * path, where the monster's inventory leaves the game (C:
 * discard_minvent(mdef, FALSE)).  The reject path draws one obj_resists per item. */
function _medusa_mongone(mdef, discard) {
    if (discard) {
        for (let o = mdef.minvent; o; o = o.nobj)
            obj_resists(o, 0, 0);
        while (mdef.minvent) {
            const obj = mdef.minvent;
            mdef.minvent = obj.nobj ?? null;
            obj.nobj = null;
            obj.ocarry = null;
            obj.owornmask = 0;
            obj.where = OBJ_FREE;   /* removed from the game */
        }
    }
    mdef.mhp = 0;
    /* C mon.c:2786-2787 m_detach(): if (mtmp->wormno) wormgone(mtmp) — a long worm
     * made for a statue must give its tail squares back to the grid. */
    if (mdef.wormno) wormgone(mdef);
}

// C ref: mkmaze.c:569-704 fixup_special(). gl.lregions is game._lregions —
// populated by lspo_stair/lspo_region/lspo_branch/lspo_teleport_region,
// all four of which are ported and real (see above), so this loop is live
// for any level whose des-file declares a stair/branch/portal levregion
// (e.g. nethack-c/dat/Tou-strt.lua's branch region at (68,14,68,14)). The
// medusa/cleric-quest/stronghold/baalzebub/mines-ransacked tail is a
// straight port of the C if/else-if chain using already-real predicates
// (Is_waterlevel/Is_airlevel/Is_stronghold/In_quest/on_level); the branches
// whose bodies need genuinely unported machinery (setup_waterlevel, the
// medusa statue placement, baalz_fixup, stolen_booty) still throw rather
// than guess at their behavior — none of those conditions are true for
// tut-1/tut-2 (verified against keystone-spec-phase3-wiring.md §1.8 and
// nethack-c/dat/dungeon.lua's Tutorial stanza: "unconnected", no branches
// entry, not medusa/stronghold/baalzebub/mines) so none of those throws
async function fixup_special() {
    const uz = game.u?.uz;
    if (Is_waterlevel(uz) || Is_airlevel(uz)) {
        if (game.level)
            game.level.flags.hero_memory = 0;
        /* C mkmaze.c:585-588 — `svl.level.flags.hero_memory = 0;
         * setup_waterlevel();`.  js/mkmaze.js carries the AIR half of the
         * bubble subsystem (see its header for what the WATER half still
         * omits); this used to throw, which is what kept `air` and `water`
         * out of js/mklev.js's LOADER_READY. */
        setup_waterlevel();
        /* NO early return: C falls through into the lregion loop below (its
         * own comment says the water level "has to be set up BEFORE calling
         * place_lregions etc."). */
    }

    const lregions = game._lregions || [];
    let added_branch = false;
    for (const r of lregions) {
        switch (r.rtype) {
        case LR_BRANCH:
            added_branch = true;
            await place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                          r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                          r.rtype, null);
            break;
        case LR_PORTAL: {
            // C ref: mkmaze.c:588-596 — resolve the destination d_level
            // before falling into place_it.  Two forms: the "chutes and
            // ladders" numeric one (rname is a bare digit string → same
            // dungeon, that dlevel) and the named one, which is
            // find_level(rname)->dlevel.
            //
            // C dungeon.c:300-307 find_level() is a strcmpi scan of
            // svs.sp_levchn by proto — no RNG, no state change.  It was
            // stubbed out here as "unused by any quest-file levregion",
            // blocking six protos from LOADER_READY (air/earth/fire/water
            // chain to each other, fakewiz1 → wizard3, wizard3 → fakewiz1),
            const rname = r.rname || '';
            let lev;
            if (rname && rname[0] >= '0' && rname[0] <= '9') {
                lev = { dnum: uz?.dnum ?? 0, dlevel: parseInt(rname, 10) };
            } else {
                const sp = find_level(rname);
                // C dereferences sp unconditionally; a missing proto is a
                // NULL deref there, so a throw is the faithful outcome and
                // never a silent wrong destination.
                if (!sp)
                    throw new Error('find_level("' + rname + '"): no such proto in sp_levchn');
                lev = { dnum: sp.dlevel.dnum, dlevel: sp.dlevel.dlevel };
            }
            await place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                          r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                          r.rtype, lev);
            break;
        }
        case LR_UPSTAIR:
        case LR_DOWNSTAIR:
            await place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                          r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2,
                          r.rtype, null);
            break;
        case LR_TELE:
        case LR_UPTELE:
        case LR_DOWNTELE:
            // C ref: mkmaze.c:610-627 — save the region outlines for
            // goto_level() to consume later. Real, cheap, no RNG; nothing
            // reads game.updest/game.dndest yet (js/cmd.js goto_level still
            // uses the "all zeros -> whole level" simplification) but
            // that's an existing, separately-tracked gap, not introduced
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE) {
                game.updest = game.updest || {};
                game.updest.lx = r.inarea.x1;
                game.updest.ly = r.inarea.y1;
                game.updest.hx = r.inarea.x2;
                game.updest.hy = r.inarea.y2;
                game.updest.nlx = r.delarea.x1;
                game.updest.nly = r.delarea.y1;
                game.updest.nhx = r.delarea.x2;
                game.updest.nhy = r.delarea.y2;
            }
            if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE) {
                game.dndest = game.dndest || {};
                game.dndest.lx = r.inarea.x1;
                game.dndest.ly = r.inarea.y1;
                game.dndest.hx = r.inarea.x2;
                game.dndest.hy = r.inarea.y2;
                game.dndest.nlx = r.delarea.x1;
                game.dndest.nly = r.delarea.y1;
                game.dndest.nhx = r.delarea.x2;
                game.dndest.nhy = r.delarea.y2;
            }
            break;
        }
    }

    if (!added_branch && splev_is_branchlev(uz)) {
        // C ref: mkmaze.c:640-643 — place dungeon branch if not placed
        // above. Unreachable for tut-1/tut-2 (Tutorial is "unconnected" in
        // nethack-c/dat/dungeon.lua, no branches entry points at it); this
        // is place_lregion's !lx path, which throws on the x==0 place_branch
        // sub-case (see splev_place_branch above) if ever actually hit.
        await place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);
    }

    if (Is_medusa_level(uz)) {
        /* C mkmaze.c:652 — the first room defined on the medusa level. */
        const croom = (game.level?.rooms ?? [])[0];
        if (croom) {
            let otmp;
            /* C mkmaze.c:653 */
            for (let tryct = rnd(4); tryct; tryct--) {
                const x = somex(croom);
                const y = somey(croom);
                if (goodpos(x, y, null, 0)) {
                    let tryct2 = 0;
                    otmp = (await mk_tt_object(STATUE, x, y));
                    while (++tryct2 < 100 && otmp
                           && (poly_when_stoned(_pm_of(otmp.corpsenm | 0))
                               || pm_resistance(otmp.corpsenm | 0, MR_STONE))) {
                        /* set_corpsenm() handles weight too */
                        set_corpsenm(otmp, rndmonnum());
                    }
                }
            }

            /* C mkmaze.c:670-676 */
            if (rn2(2)) {
                const sx = somex(croom), sy = somey(croom);
                otmp = (await mk_tt_object(STATUE, sx, sy));
            } else {
                /* Medusa statues don't contain books */
                const sx = somex(croom), sy = somey(croom);
                otmp = (await mkcorpstat(STATUE, null, null, sx, sy, CORPSTAT_NONE));
            }
            /* C mkmaze.c:677-684 — same rejection loop, guards in the other
             * order (pm_resistance first); order is immaterial to the RNG but
             * kept as C writes it. */
            if (otmp) {
                let tryct = 0;
                while (++tryct < 100
                       && (pm_resistance(otmp.corpsenm | 0, MR_STONE)
                           || poly_when_stoned(_pm_of(otmp.corpsenm | 0)))) {
                    /* set_corpsenm() handles weight too */
                    set_corpsenm(otmp, rndmonnum());
                }
            }
        }
    } else {
        // C mkmaze.c:686 `else if (Role_if(PM_CLERIC) && In_quest(&u.uz))`.
        // Role_if(X) is `gu.urole.mnum == X` (you.h:247); PM_CLERIC is the
        // PLAYER-ROLE Priest, mons[] index 337 (js/pm.generated.js, added
        // monster-only "aligned cleric" at index 275, which keeps the name
        // PM_PRIEST). js/roles.js:612 sets `game.urole.mnum =
        // ROLE_PM_MNUM[ROLE]`, i.e. the real PM_ index, so on the scored
        // path a Priest character reads game.urole.mnum === 337 (PM_CLERIC),
        // never 275 (PM_PRIEST) — comparing against PM_PRIEST here made this
        // branch permanently unreachable. Same (urole.mnum ?? u.umonnum)
        // fallback js/dokick.js:330 already uses — Role_if itself
        // (js/potion.js:946) is an unconditional throw stub and must NOT be
        const roleMnum = (game.urole?.mnum ?? game.u?.umonnum ?? -1) | 0;
        if (roleMnum === PM_CLERIC && In_quest(uz)) {
            if (game.level)
                game.level.flags.graveyard = 1;
        } else if (Is_stronghold(uz)) {
            if (game.level)
                game.level.flags.graveyard = 1;
        } else if (uz && game.baalzebub_level && on_level(uz, game.baalzebub_level)) {
            /* C mkmaze.c:693 baalz_fixup() — the insect-leg wallification
             * fixup for Baalzebub's lair; ported in js/mkmaze.js. */
            await baalz_fixup();
        } else if (uz && uz.dnum === game.mines_dnum && game.ransacked) {
            /* C mkmaze.c:694-695 stolen_booty() — orctown's fled orc gang and
             * the loot it took.  Ported in js/mkmaze.js (this file's fixup_special
             * is the C mkmaze.c one; the port lives next to check_ransacked(),
             * which is what sets game.ransacked). */
            await stolen_booty();
        }
    }

    // C: (sp = Is_special(&u.uz)) != 0 && sp->flags.town — deliberately NOT
    // exported); we're already inside load_special for an allowlisted
    const spHit = uz && (game._sp_levchn || []).find(
        sl => sl.dlevel.dnum === uz.dnum && sl.dlevel.dlevel === uz.dlevel);
    if (spHit && spHit.flags && spHit.flags.town) {
        if (game.level)
            game.level.flags.has_town = 1;
    }

    game._lregions = [];
}

// ---------------------------------------------------------------------------
// loadLuaFile / load_special — C refs: nhlua.c:2545-2565 load_lua();
// sp_lev.c:6460-6515 load_special().
// ---------------------------------------------------------------------------
// Reuses createLevelLuaState()'s tokenize/parse/run pattern
// fresh interpreter per file, no supplements. Parse/run exceptions
// over it" (no maze-fallback path is ported; keystone-spec-phase3-
// wiring.md §1.6).
// DAT VINTAGE.  This read used to be a bare `nethack-c/dat/${name}` — the
// NetHack 5.0.0_Release.  Unlike js/dispfile.js, whose eight topic constants are
// a closed set that happens to be `cmp`-equal between the trees, `name` here is
// whatever the dungeon description asks for, and EIGHT of the level files it can
// ask for differ: 5.0 adds a rolling boulder trap to soko1-1 and edits all of
// soko1-2 .. soko4-2.  Reading the 3.7 Sokoban levels would desync the RNG on
// arrival, silently.
//
// bigrm-*, Arc-strt, Bar-strt — is a file the trees agree on.  So the 3.7 read
// recording that descends into Sokoban would silently get 3.7 levels.  Routing
// through resolve_dat() makes that fail loudly with the vendoring instruction
// instead.  See js/dat_source.js.
async function loadLuaFile(name) {
    const source = dat_content(name);
    if (source === null)
        throw new Error(`Failed to read dat/${name}: not carried in js/dat_bundle.js`);
    const interp = await nhl_init();
    const ast = parse(tokenize(source));
    try {
        await interp.run(ast);
    } finally {
        await nhl_done(interp);
    }
    return true;
}

// C ref: sp_lev.c:6460-6515 load_special(). See
// field-by-field derivation of every call below.
export async function load_special(name) {
    create_des_coder();
    const ok = await loadLuaFile(name);
    if (!ok)
        return give_up_des_coder(false);

    link_doors_rooms();

    if (game.level) {
        const { x_maze_max, y_maze_max } = splev_maze_extent();
        const r = remove_boundary_syms({
            typ: splev_extract_typ(), flags: splev_extract_flags(),
            splev_map: game.splev_map, x_maze_max, y_maze_max,
        });
        splev_apply_typ_flags(r.typ, r.flags);
    }

    if (game.gc.coder.check_inaccessibles)
        await ensure_way_out();

    map_cleanup();

    if (!game.level?.flags?.corrmaze)
        wallification(1, 0, COLNO - 1, ROWNO - 1);

    await flip_level_rnd(game.gc.coder.allow_flips, false);

    if (game.level)
        count_level_features();

    if (game.gc.coder.solidify) {
        const { x_maze_max, y_maze_max } = splev_maze_extent();
        const r = solidify_map({
            typ: splev_extract_typ(), flags: splev_extract_flags(),
            splev_map: game.splev_map, x_maze_max, y_maze_max,
        });
        splev_apply_typ_flags(r.typ, r.flags);
    }

    await fixup_special();

    if (game.gc.coder.premapped)
        premap_detect();

    return give_up_des_coder(true);
}

/* C ref: sp_lev.c:5993-6061 lspo_reset_level/lspo_finalize_level, L == NULL arms */
export async function lspo_reset_level() {
    const wt = (await import('./dochug.js')).In_W_tower_wz(game.u.ux | 0, game.u.uy | 0, game.u.uz);
    (game.iflags = game.iflags || {}).lua_testing = true;
    await (await import('./wizcmds.js')).makemap_prepost(true, wt);
    game.in_mklev = true; oinit(); clear_level_structures();
    return 0;
}
export async function lspo_finalize_level() {
    const wt = (await import('./dochug.js')).In_W_tower_wz(game.u.ux | 0, game.u.uy | 0, game.u.uz);
    link_doors_rooms();
    if (game.level) {
        const { x_maze_max, y_maze_max } = splev_maze_extent();
        const r = remove_boundary_syms({ typ: splev_extract_typ(), flags: splev_extract_flags(),
            splev_map: game.splev_map, x_maze_max, y_maze_max });
        splev_apply_typ_flags(r.typ, r.flags);
    }
    map_cleanup();
    if (!game.level?.flags?.corrmaze) wallification(1, 0, COLNO - 1, ROWNO - 1);
    if (game.level) count_level_features();
    await fixup_special(); await level_finalize_topology();
    for (let i = 0; i < (game.level?.nroom ?? 0); ++i) await fill_special_room(game.level.rooms[i]);
    await (await import('./wizcmds.js')).makemap_prepost(false, wt);
    game.iflags.lua_testing = false;
    return 0;
}

function give_up_des_coder(result) {
    game.gc.coder = null;
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_random_corridors — C ref: nethack-c/src/sp_lev.c:4565-4581
// des.random_corridors() handler.
//
// In C, this builds a `corridor tc` with all src/dest fields hardcoded to -1
// and calls create_corridor(&tc).  create_corridor's first branch is
// `if (c->src.room == -1) { makecorridors(); return; }` — since src.room is
// ALWAYS -1 here, the remaining ~50 lines of create_corridor (search_door,
// dig_corridor, wall switch, etc.) are dead code for this call site and are
// intentionally not ported.
// ═══════════════════════════════════════════════════════════════════════════════
export async function lspo_random_corridors(args) {
    create_des_coder();
    await makecorridors();
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// lspo_gas_cloud — C ref: nethack-c/src/sp_lev.c:4935-4972
// des.gas_cloud() handler.
// Both the selection and explicit-coordinate forms use region.js's shared
// region list.  Keeping a private region here loses selection clouds as soon
// as this handler returns; fog clouds then fail visible_region_at() and emit
// spurious vapor on their first m_everyturn_effect call.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── create_gas_cloud_selection — C ref: region.c:1312-1335 ──────────────────

function create_gas_cloud_selection(sel, damage) {
    const r = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, r);
    const points = [];

    for (let x = r.lx; x <= r.hx; x++) {
        for (let y = r.ly; y <= r.hy; y++) {
            if (selection_getpoint(x, y, sel))
                points.push({ x, y });
        }
    }

    return create_region_gas_cloud_selection(points, damage);
}

// ─── lspo_gas_cloud — C ref: sp_lev.c:4935-4972 ──────────────────────────────

export function lspo_gas_cloud(args) {
    create_des_coder();

    /* C sp_lev.c:4953-4957 — coordinate form creates a one-cell cloud;
     * region.c owns the RNG-bearing implementation and returns the region so
     * the optional TTL can be applied identically to the selection form. */
    if (args && typeof args === 'object'
        && (args.x !== undefined || args.y !== undefined || args.coord !== undefined)) {
        const { x, y } = get_table_xy_or_coord(args);
        if (x < 0 || y < 0)
            throw new Error('lspo_gas_cloud: invalid coordinate');
        const cloud = create_gas_cloud(x, y, 1, args.damage ?? 0);
        if (args.ttl !== undefined && args.ttl > -2)
            cloud.ttl = args.ttl;
        return 0;
    }

    if (args && typeof args === 'object' && args.selection !== undefined) {
        const sel = args.selection;
        const damage = args.damage ?? 0;
        const cloud = create_gas_cloud_selection(sel, damage);
        // C: if (args.ttl > -2) cloud->ttl = args.ttl;
        if (args.ttl !== undefined && args.ttl > -2) {
            cloud.ttl = args.ttl;
        }
        return 0;
    }

    throw new Error('lspo_gas_cloud: expected a selection or coordinate table');
}


// ═══════════════════════════════════════════════════════════════════════════════
// terrain,non_diggable,mazewalk}-w2-001.yaml
// ═══════════════════════════════════════════════════════════════════════════════

// ─── lspo_stair / l_create_stairway — C ref: sp_lev.c:4153-4233 ──────────────
// coord, zero RNG. The non-table (string+positional / bare positional) call
// forms use nhl_get_xy_params (nhlua.c:508-525), ported below.

/** C ref: nhlua.c:508-525 nhl_get_xy_params(L, x, y).
 *  `args` is the (already argc==1-table-checked-by-caller-excluded) remaining
 *  positional arg list. Returns {ok,x,y}; C ignores the return value at this
 *  callsite, so ok=false leaves x,y at the caller's -1,-1 sentinel default —
 *  same as C leaving *x,*y untouched. */
function nhl_get_xy_params(args) {
    if (args.length === 2)
        return { ok: true, x: Number(args[0]), y: Number(args[1]) };
    if (args.length === 1 && args[0] && args[0].type === 'table') {
        const c = get_coord(args[0]);
        return { ok: true, x: c.x, y: c.y };
    }
    return { ok: false, x: -1, y: -1 };
}

/* callback for is_ok_location (set_ok_location_func's 2-arg (x,y) contract)
 * — C ref: sp_lev.c:4148-4155 good_stair_loc. Stairs generated at a random
 * location shouldn't overwrite special terrain. NOTE: js/sp_lev.js:1931
 * already exports a `good_stair_loc` — that one takes a 3rd `{typ}` flat-
 * array arg (a different, selection/floodfill-style calling convention,
 * never wired to a caller) and is NOT compatible with set_ok_location_func's
 * 2-arg contract, so this is a distinctly-named local, not a redefinition. */
function stair_ok_loc(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return (typ === ROOM || typ === CORR || typ === ICE);
}

function l_create_stairway(args, using_ladder) {
    const stairdirs = ['down', 'up', null];
    const stairdirs2i = [0, 1];

    create_des_coder();

    let x = -1, y = -1, up = 0;
    if (args.length === 1 && args[0] && args[0].type === 'table') {
        const { x: ax, y: ay } = get_table_xy_or_coord(args[0]);
        up = stairdirs2i[get_table_option(args[0], 'dir', 'down', stairdirs)];
        x = ax;
        y = ay;
    } else {
        // C: if (argc > 0 && ltype == LUA_TSTRING) { up = ...checkoption...;
        //     lua_remove(L, 1); } nhl_get_xy_params(L, &ix, &iy);
        let rest = args;
        if (rest.length > 0 && typeof rest[0] === 'string') {
            const dirIdx = stairdirs.indexOf(rest[0]);
            if (dirIdx === -1)
                throw new Error(`l_create_stairway: invalid option '${rest[0]}'`);
            up = stairdirs2i[dirIdx];
            rest = rest.slice(1);
        }
        const params = nhl_get_xy_params(rest);
        if (params.ok) {
            x = params.x;
            y = params.y;
        }
    }

    let scoord;
    if (x === -1 && y === -1) {
        set_ok_location_func(stair_ok_loc);
        scoord = SP_COORD_PACK_RANDOM(0);
    } else {
        scoord = SP_COORD_PACK(x, y);
    }

    const coord = { x, y };
    get_location_coord(coord, DRY, game.gc.coder.croom, scoord);
    x = coord.x;
    y = coord.y;
    set_ok_location_func(null);

    const badtrap = t_at(x, y);
    if (badtrap)
        deltrap(badtrap);
    if (!game.splev_map)
        game.splev_map = new Uint8Array(COLNO * ROWNO);
    game.splev_map[x * ROWNO + y] = 1;

    if (using_ladder) {
        const loc = game.level.at(x, y);
        if (loc)
            loc.typ = LADDER;
        if (up) {
            const dest = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel - 1 };
            stairway_add(x, y, true, true, dest);
            if (loc)
                loc.ladder = LA_UP;
        } else {
            const dest = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
            stairway_add(x, y, false, true, dest);
            if (loc)
                loc.ladder = LA_DOWN;
        }
    } else {
        mkstairs(x, y, up, game.gc.coder.croom);
    }
    return 0;
}

export function lspo_stair(...args) {
    return l_create_stairway(args, false);
}

export function lspo_ladder(...args) {
    return l_create_stairway(args, true);
}

// ─── lspo_room / build_room / spo_endroom / update_croom — sp_lev.c:4011-4139 ─
// NOTE: build_room ALREADY EXISTS, fully ported, in js/mklev.js:5553 (used by
// the hand-rolled themed-room dispatch path) — exported and reused here

/** C ref: sp_lev.c:4011-4027 get_table_roomtype_opt — reuses the existing
 *  module-local `room_types` table (js/sp_lev.js:1859), not a second copy. */
function get_table_roomtype_opt(args, name, defval) {
    const roomstr = get_table_str_opt(args, name, '');
    let res = defval;
    if (roomstr) {
        for (let i = 0; room_types[i].name; i++) {
            if (!strcmpi(roomstr, room_types[i].name)) {
                res = room_types[i].type;
                break;
            }
        }
    }
    return res;
}

/** C ref: sp_lev.c:6334-6341 update_croom() */
function update_croom() {
    if (!game.gc?.coder)
        return;
    const coder = game.gc.coder;
    if (coder.n_subroom)
        coder.croom = coder.tmproomlist[coder.n_subroom - 1];
    else
        coder.croom = null;
}

function add_doors_to_room(croom) {
    if (!croom || !game.level)
        return;
    for (let x = (croom.lx | 0) - 1; x <= (croom.hx | 0) + 1; x++)
        for (let y = (croom.ly | 0) - 1; y <= (croom.hy | 0) + 1; y++) {
            const loc = isok(x, y) ? game.level.at(x, y) : null;
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                splev_maybe_add_door(x, y, croom);
        }
    for (let i = 0; i < (croom.nsubrooms | 0); i++)
        add_doors_to_room(croom.sbrooms?.[i]);
}

/** C ref: sp_lev.c:4125-4139 spo_endroom(coder) */
function spo_endroom(coder) {
    if (coder.n_subroom > 1) {
        coder.n_subroom--;
        coder.tmproomlist[coder.n_subroom] = null;
        coder.failed_room[coder.n_subroom] = true;
    } else {
        // no subroom, get out of top-level room
        if ((game.gx?.xsize ?? 0) <= 1 && (game.gy?.ysize ?? 0) <= 1)
            reset_xystart_size();
    }
    update_croom();
}

export function spo_finish_room() {
    const coder = game.gc.coder;
    spo_endroom(coder);
    /* C sp_lev.c:4100 / :5710 — add_doors_to_room(troom) runs immediately after
     * spo_endroom on BOTH the lspo_room and lspo_region paths.  When the room
     * has a `contents` closure this file returns to the wiring layer before
     * spo_endroom, so the room is stashed on the coder and picked up here. */
    const pending = coder?._pending_add_doors_room ?? null;
    if (coder) coder._pending_add_doors_room = null;
    if (pending) add_doors_to_room(pending);
}

export function lspo_room(args) {
    const left_or_right = ['left', 'half-left', 'center', 'half-right', 'right', 'none', 'random', null];
    const l_or_r2i = [SPLEV_LEFT, SPLEV_H_LEFT, SPLEV_CENTER, SPLEV_H_RIGHT, SPLEV_RIGHT, -1, -1, -1];
    const top_or_bot = ['top', 'center', 'bottom', 'none', 'random', null];
    const t_or_b2i = [MAP_TOP, SPLEV_CENTER, MAP_BOTTOM, -1, -1, -1];

    create_des_coder();

    if (game.in_mk_themerooms && game.themeroom_failed)
        return 0;

    if (!(args && args.type === 'table'))
        throw new Error('UNPORTED-CALLEE: lspo_room non-table call form');

    const coder = game.gc.coder;

    if (coder.n_subroom > MAX_NESTED_ROOMS)
        throw new Error('lspo_room: Too deeply nested rooms?!');

    const { x: rx, y: ry } = get_table_xy_or_coord(args);
    const tmproom = { x: rx, y: ry };
    if ((tmproom.x === -1 || tmproom.y === -1) && tmproom.x !== tmproom.y)
        throw new Error('Room must have both x and y');

    tmproom.w = get_table_int_opt(args, 'w', -1);
    tmproom.h = get_table_int_opt(args, 'h', -1);
    if ((tmproom.w === -1 || tmproom.h === -1) && tmproom.w !== tmproom.h)
        throw new Error('Room must have both w and h');

    tmproom.xalign = l_or_r2i[get_table_option(args, 'xalign', 'random', left_or_right)];
    tmproom.yalign = t_or_b2i[get_table_option(args, 'yalign', 'random', top_or_bot)];
    tmproom.rtype = get_table_roomtype_opt(args, 'type', OROOM);
    tmproom.chance = get_table_int_opt(args, 'chance', 100);
    tmproom.rlit = get_table_int_opt(args, 'lit', -1);
    // theme rooms default to unfilled
    tmproom.needfill = get_table_int_opt(args, 'filled', game.in_mk_themerooms ? 0 : 1);
    tmproom.joined = get_table_boolean_opt(args, 'joined', 1);

    if (!coder.failed_room[coder.n_subroom - 1]) {
        const tmpcr = build_room(tmproom, coder.croom);
        if (tmpcr) {
            const n = coder.n_subroom;
            coder.tmproomlist[n] = tmpcr;
            coder.failed_room[n] = false;
            // added a subroom, make parent room irregular
            if (coder.tmproomlist[n - 1])
                coder.tmproomlist[n - 1].irregular = true;
            coder.n_subroom++;
            update_croom();

            const contents = args.get('contents');
            if (contents != null && (contents.type === 'function' || typeof contents === 'function')) {
                coder._pending_add_doors_room = tmpcr;
                return { tmpcr, needsContentsCall: true };
            }

            spo_endroom(coder);
            add_doors_to_room(tmpcr); /* C sp_lev.c:4100 */
            return { tmpcr: null, needsContentsCall: false };
        }
        if (game.in_mk_themerooms)
            game.themeroom_failed = true;
    }
    // failed to create parent room, so fail this too
    coder.tmproomlist[coder.n_subroom] = null;
    coder.failed_room[coder.n_subroom] = true;
    coder.n_subroom++;
    update_croom();
    spo_endroom(coder);
    if (game.in_mk_themerooms)
        game.themeroom_failed = true;

    return { tmpcr: null, needsContentsCall: false };
}

// ─── lspo_region / light_region — C ref: sp_lev.c:5567-5722 ────────────────
//   Tou-strt.lua:39 des.region({ region={14,01,20,03}, lit=0, type="morgue",
//   filled=1 }); Sam-strt.lua:44 des.region({ region={18,03,26,07}, lit=1,
//   type="throne", filled=2 }). Neither sets `irregular`, `arrival_room`, or
//   `contents` — verified against the full table literals in the .lua files.
//   for their non-special-room des.region calls, e.g. Tou-strt.lua:38
//   des.region(selection.area(...), "lit"); must dispatch cleanly so
//   execution REACHES the later special-room call in the same file):
//   tut-2.lua:17 des.region(selection.area(01,01,73,16), "lit").

/** C ref: sp_lev.c:5567-5584 get_table_coords_or_region — thin wrapper over
 *  the already-exported get_table_region. */
function get_table_coords_or_region(args) {
    let dx1 = get_table_int_opt(args, 'x1', -1);
    let dy1 = get_table_int_opt(args, 'y1', -1);
    let dx2 = get_table_int_opt(args, 'x2', -1);
    let dy2 = get_table_int_opt(args, 'y2', -1);
    if (dx1 === -1 && dy1 === -1 && dx2 === -1 && dy2 === -1) {
        const out = {};
        get_table_region(args, 'region', out, false);
        dx1 = out.x1;
        dy1 = out.y1;
        dx2 = out.x2;
        dy2 = out.y2;
    }
    return { dx1, dy1, dx2, dy2 };
}

/** C ref: sp_lev.c:2841-2868 light_region — set lighting in a region that
 *  will not become a room. ZERO RNG. */
function light_region(rlit, x1, y1, x2, y2) {
    const litstate = rlit ? 1 : 0;
    let lowx = x1, lowy = y1, hix = x2, hiy = y2;
    if (litstate) {
        lowx = Math.max(lowx - 1, 1);
        hix = Math.min(hix + 1, COLNO - 1);
        lowy = Math.max(lowy - 1, 0);
        hiy = Math.min(hiy + 1, ROWNO - 1);
    }
    for (let x = lowx; x <= hix; x++) {
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc)
                loc.lit = IS_LAVA(loc.typ) ? 1 : litstate;
        }
    }
}

export function lspo_region(...args) {
    create_des_coder();

    let dx1, dy1, dx2, dy2;
    let needfill = 0, irregular = 0, joined = 1, do_arrival_room = 0;
    let rtype = OROOM, rlit = -1;

    if (args.length <= 1) {
        const table = args[0];
        if (!(table && table.type === 'table'))
            throw new Error('Wrong parameters');

        needfill = get_table_int_opt(table, 'filled', 0);
        irregular = get_table_boolean_opt(table, 'irregular', 0);
        joined = get_table_boolean_opt(table, 'joined', 1);
        do_arrival_room = get_table_boolean_opt(table, 'arrival_room', 0);
        rtype = get_table_roomtype_opt(table, 'type', OROOM);
        rlit = get_table_int_opt(table, 'lit', -1);

        const coords = get_table_coords_or_region(table);
        dx1 = coords.dx1; dy1 = coords.dy1; dx2 = coords.dx2; dy2 = coords.dy2;

        if (dx1 === -1 && dy1 === -1 && dx2 === -1 && dy2 === -1)
            throw new Error('region needs region');
    } else if (args.length === 2) {
        // region(selection, "lit"); -- sp_lev.c:5619-5642. Early return: does
        // NOT fall through to the table-form logic below.
        const lits = ['unlit', 'lit'];
        const orig = args[0];
        const opt = String(args[1]);
        const litIdx = lits.indexOf(opt);
        if (litIdx === -1)
            throw new Error(`invalid option '${opt}'`);

        // C: l_selection_check(L, 1) — arg1 must be a real selectionvar
        // userdata; in real play selection.area/selection.new/etc. ALWAYS
        // return one (verified: js/lua/nh_state.js's real 'area' handler
        // returns SPLEV.selection_new()'s object, js/sp_lev.js:880-899), so
        // this guard is defense-in-depth, not a reachable real-play branch.
        // SELECTION_FIELDS override, deliberately record-only per its own
        // comment) can reach here with no real selection; treat that the
        // same as an empty selection — zero points, no lighting work, no
        // crash — rather than abort the whole file load over a tracing
        // artifact unrelated to this opcode's own port.
        if (orig && typeof orig === 'object' && orig.map) {
            const sel = selection_clone(orig);
            if (litIdx)
                selection_do_grow(sel, W_ANY);
            // C: selection_iterate(sel, sel_set_lit, &rlit) — ported inline
            // (sel_set_lit's body, sp_lev.c:5542-5548) rather than the generic
            // C callback-pointer machinery, matching this file's established
            // per-point-loop convention (selection_do_grow/selection_filter_
            // percent above). selection_iterate itself (selvar.c:725-741) is
            // exactly bounds-rect + isok() + selection_getpoint, reproduced
            // here directly.
            const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
            selection_getbounds(sel, rect);
            for (let x = rect.lx; x <= rect.hx; x++) {
                for (let y = rect.ly; y <= rect.hy; y++) {
                    if (isok(x, y) && selection_getpoint(x, y, sel)) {
                        const loc = game.level.at(x, y);
                        if (loc)
                            loc.lit = (IS_LAVA(loc.typ) || litIdx) ? 1 : 0;
                    }
                }
            }
            selection_free(sel, true);
        }

        return 0;
    } else {
        throw new Error('Wrong parameters');
    }

    rlit = litstate_rnd(rlit) ? 1 : 0;

    const c1 = { x: dx1, y: dy1 };
    get_location(c1, ANY_LOC, null);
    dx1 = c1.x; dy1 = c1.y;
    const c2 = { x: dx2, y: dy2 };
    get_location(c2, ANY_LOC, null);
    dx2 = c2.x; dy2 = c2.y;

    const room_not_needed = (rtype === OROOM && !irregular && !do_arrival_room
                              && !game.in_mk_themerooms);
    if (room_not_needed || game.level.nroom >= MAXNROFROOMS) {
        // C: if (!room_not_needed) impossible("Too many rooms on new level!");
        // — non-fatal warning, no JS action (this file's impossible()
        // convention, e.g. js/sp_lev.js:483).
        light_region(rlit, dx1, dy1, dx2, dy2);
        return 0;
    }

    // arrival_room: C reads do_arrival_room in EXACTLY ONE place, the
    // room_not_needed expression above (sp_lev.c:5653).  Verified by grepping
    // the whole 5.0 tree: sp_lev.c:5588/5603/5653 are its only three
    // occurrences outside dat/*.lua.  So "a region to constrain the arrival of
    // migrating monsters" is implemented purely by forcing the ordinary
    // room-creation path below to run for an OROOM region — mon_arrive
    // (mon.c) then finds a real mkroom to arrive in.  There is no separate
    // arrival_room code path to port, and the throw that used to stand here
    // was a scope marker, not a missing callee.
    // Witnesses: wizard1.lua:41, wizard2.lua:34, wizard3.lua:38,
    // fakewiz1.lua:31 (with irregular=1), knox.lua:86, medusa-1/2/3,
    // minend-1.lua:39.

    let troom;
    if (irregular) {
        // C: sp_lev.c:5674-5683.  gm.min_r*/gm.max_r* are flood_fill_rm's
        // out-parameters — it only ever WIDENS them, so they must be seeded to
        // the start point first.  gs.smeq lives on game.smeq here (js/mklev.js:
        // 4595 allocates it).  n_loc_filled is flood_fill_rm's own counter and
        // C does NOT reset it on this path (only join_map does), so neither
        // do we.
        if (!game.gm) game.gm = {}; /* same lazy home as js/mkmap.js:97 */
        game.gm.min_rx = game.gm.max_rx = dx1;
        game.gm.min_ry = game.gm.max_ry = dy1;
        game.smeq[game.level.nroom] = game.level.nroom;
        flood_fill_rm(dx1, dy1, game.level.nroom + ROOMOFFSET, rlit, true);
        add_room(game.gm.min_rx, game.gm.min_ry, game.gm.max_rx,
                 game.gm.max_ry, false, rtype, true);
        troom = game.level.rooms[game.level.nroom - 1];
        // C: add_room passed lit=FALSE (flood_fill_rm already did the
        // lighting), then troom->rlit is overwritten with the real rlit.
        troom.rlit = rlit;
        troom.irregular = true;
        // C: no topologize() on this arm — flood_fill_rm set roomno itself,
        // and topologize would square off the irregular shape.
    } else {
        add_room(dx1, dy1, dx2, dy2, rlit, rtype, true);
        troom = game.level.rooms[game.level.nroom - 1];
        topologize(troom);
    }
    // C sets these two on &svr.rooms[svn.nroom] BEFORE add_room, which writes
    // into that same slot and (with special=TRUE) touches neither field.  JS's
    // add_room BUILDS a fresh object instead, so assign after the call.
    troom.needfill = needfill;
    troom.needjoining = joined;

    const coder = game.gc.coder;
    if (coder.n_subroom > 1) {
        // C: impossible("region as subroom"); — non-fatal warning, no JS
    } else {
        coder.tmproomlist[coder.n_subroom] = troom;
        coder.failed_room[coder.n_subroom] = false;
        coder.n_subroom++;
        update_croom();

        // C sp_lev.c:5700-5707:
        //     lua_getfield(L, 1, "contents");
        //     if (lua_type(L, -1) == LUA_TFUNCTION) {
        //         lua_remove(L, -2);
        //         l_push_mkroom_table(L, troom);        <- ONE argument
        //         nhl_pcall_handle(L, 1, 0, "lspo_region", NHLpa_panic);
        //     } else lua_pop(L, 1);
        //     spo_endroom(gc.coder);
        // Hand off to the interpreter exactly the way lspo_room does — the
        // closure call has to happen there — and leave the room OPEN
        // (spo_endroom NOT run) so the closure's opcodes see this region as
        // gc.coder->croom, which is the whole point: sanctum.lua:35's closure
        // is `des.door({ wall="random", state="secret" })`, and a wall-relative
        // door with no croom has nothing to be relative to.
        const contents = args[0].get('contents');
        if (contents != null && (contents.type === 'function' || typeof contents === 'function')) {
            coder._pending_add_doors_room = troom;
            return { troom, needsContentsCall: true };
        }

        spo_endroom(coder);
        add_doors_to_room(troom); /* C sp_lev.c:5710 */
    }

    return 0;
}

// ─── lspo_gold / mkgold — C ref: sp_lev.c:4487-4529, mkobj.c:2003-2021 ──────
// — argc==1 table form, explicit coord, amount always > 0 (zero mkgold-internal
// RNG expected; lspo_gold itself draws none either since amount is never < 0).

const GOLD_PIECE = 438; /* objects.h GOLD_PIECE — module-local per project
                            convention (mklev.js/eat.js duplicate the same). */

/** C ref: mkobj.c:2003-2021 mkgold(amount, x, y) — never returns null. */
async function mkgold(amount, x, y) {
    let gold = g_at(x, y);
    if (amount <= 0) {
        const mul = rnd(Math.trunc(30 / Math.max(12 - depth(game.u.uz), 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    if (gold) {
        gold.quan += amount;
    } else {
        gold = (await mksobj_at(GOLD_PIECE, x, y, true, false));
        gold.quan = amount;
    }
    gold.owt = weight(gold);
    return gold;
}

/** C ref: sp_lev.c:4487-4529 lspo_gold.
 *  All four of C's argc arms, transcribed.  The previous single-`args`
 *  signature took only the argc==1 table form and threw "Wrong parameters"
 *  on everything else — which meant the ARGC==0 form threw too.  That is not
 *  a hypothetical arm: hellfill.lua:75 populatemaze() calls a bare
 *  `des.gold()` 8..13 times per Gehennom level, so the whole level load died
 *  there.  `...args` (the lspo_message/lspo_feature convention) is required
 *  to see argc at all; a single-`args` parameter cannot distinguish "no
 *  argument" from "one table". */
export async function lspo_gold(...args) {
    create_des_coder();

    const argc = args.length;
    let amount, x, y;
    if (argc === 3) {
        // C: amount = luaL_checkinteger(L,1); x = luaL_checkinteger(L,2);
        //    y = luaL_checkinteger(L,3);
        amount = Number(args[0]);
        x = Number(args[1]);
        y = Number(args[2]);
    } else if (argc === 2 && args[1] && args[1].type === 'table') {
        // C: amount = luaL_checkinteger(L,1); (void) get_coord(L, 2, ...);
        amount = Number(args[0]);
        const c = get_coord(args[1]);
        x = c ? c.x : -1;
        y = c ? c.y : -1;
    } else if (argc === 0 || (argc === 1 && args[0] && args[0].type === 'table')) {
        // C: lcheck_param_table(L); amount = get_table_int_opt(L,"amount",-1);
        //    get_table_xy_or_coord(L, &gldx, &gldy);
        // With argc==0 there is no table, so both lookups take their defaults.
        const t = args[0];
        amount = t ? get_table_int_opt(t, 'amount', -1) : -1;
        if (t) {
            const c = get_table_xy_or_coord(t);
            x = c.x;
            y = c.y;
        } else {
            x = -1;
            y = -1;
        }
    } else {
        throw new Error('Wrong parameters');
    }

    const coord = { x, y };
    const gcoord = (x === -1 && y === -1) ? SP_COORD_PACK_RANDOM(0) : SP_COORD_PACK(x, y);
    get_location_coord(coord, DRY, game.gc.coder.croom, gcoord);
    x = coord.x;
    y = coord.y;

    // C: two-layer resolution — lspo_gold's own rnd(200) fallback fires
    // BEFORE mkgold is called; mkgold's internal rnd/rnd pair only fires if
    // amount is STILL <=0 by then, which cannot happen once this branch has
    // run (rnd(200) always returns >= 1). Preserve the order: this draw,
    // if any, always happens first.
    if (amount < 0)
        amount = rnd(200);

    await mkgold(amount, x, y);
    return 0;
}

// ─── lspo_feature / sel_set_feature / l_table_getset_feature_flag ───────────
// C ref: sp_lev.c:4640-4651, 4746-4763, 4851-4931.
// positional form. Uses `...args` (not a single `args` param) so all 3
// positional values are actually delivered (see lspo_message/lspo_level_flags
// for the same convention) — a single-`args`-param signature would silently
// drop args 2/3 the way lspo_gold/lspo_room's table-only scope did.

/** C ref: sp_lev.c:4640-4651 sel_set_feature(x, y, arg). VERIFIED: called
 *  directly on a single resolved (x,y) by lspo_feature (sp_lev.c:4903), NOT
 *  through selection_iterate — so `typ` is a plain value here, not a
 *  genericptr_t-wrapped pointer. */
function sel_set_feature(x, y, typ) {
    if (!isok(x, y))
        return;
    const loc = game.level.at(x, y);
    if (!loc || IS_FURNITURE(loc.typ))
        return;
    loc.typ = typ;
}

/** C ref: sp_lev.c:4746-4763 l_table_getset_feature_flag. Reuses the
 *  EXISTING get_table_boolean_opt(args, name, defval) (js/sp_lev.js:146)
 *  rather than a new helper: passing defval=-2 as the "field absent"
 *  sentinel reproduces C's get_table_boolean_opt(L, name, -2) exactly.
 *  C's val==-1 "random" branch (rn2(2)) is UNREACHABLE in practice — C's
 *  own get_table_boolean() throws nhl_error("Expected a boolean") before
 *  ever returning -1 to this caller, so -1 can never reach here; the
 *  existing get_table_boolean_opt already throws on any non-boolean value
 *  for the same reason, so this call site never needs the rn2(2) draw. */
function l_table_getset_feature_flag(x, y, args, name, flag) {
    const val = get_table_boolean_opt(args, name, -2);
    if (val !== -2) {
        const loc = game.level.at(x, y);
        if (loc) {
            if (val)
                loc.flags |= flag;
            else
                loc.flags &= ~flag;
        }
    }
}

/** Bare-string option match for the 3 non-table call shapes (C:
 *  luaL_checkoption(L, N, NULL, features) on a positional string arg, NOT a
 *  table field — distinct from get_table_option, which reads a named table
 *  field. NULL defval means the option is required; throws if unmatched. */
function feature_str_opt(s, opts) {
    for (let i = 0; opts[i] != null; i++) {
        if (s === opts[i])
            return i;
    }
    throw new Error(`lspo_feature: invalid option '${s}'`);
}

export function lspo_feature(...args) {
    const features = ['fountain', 'sink', 'pool', 'throne', 'tree', null];
    const features2i = [FOUNTAIN, SINK, POOL, THRONE, TREE, STONE];

    create_des_coder();

    let x, y, typ;
    let can_have_flags = false;
    let tableArgs = null;

    if (args.length === 1 && typeof args[0] === 'string') {
        typ = features2i[feature_str_opt(args[0], features)];
        x = y = -1;
    } else if (args.length === 2 && typeof args[0] === 'string' && args[1] && args[1].type === 'table') {
        typ = features2i[feature_str_opt(args[0], features)];
        const c = get_coord(args[1]);
        x = c.x;
        y = c.y;
    } else if (args.length === 3) {
        typ = features2i[feature_str_opt(args[0], features)];
        x = Number(args[1]);
        y = Number(args[2]);
    } else if (args.length <= 1 && args[0] && args[0].type === 'table') {
        tableArgs = args[0];
        const c = get_table_xy_or_coord(tableArgs);
        x = c.x;
        y = c.y;
        typ = features2i[get_table_option(tableArgs, 'type', null, features)];
        can_have_flags = true;
    } else {
        throw new Error('Wrong parameters');
    }

    let fcoord, humidity;
    if (x === -1 && y === -1) {
        fcoord = SP_COORD_PACK_RANDOM(0);
        humidity = DRY; // pick a regular space, no rock or other furniture
    } else {
        fcoord = SP_COORD_PACK(x, y);
        humidity = ANY_LOC; // assume the author knows what they're doing
    }
    const coord = { x, y };
    get_location_coord(coord, humidity, game.gc.coder.croom, fcoord);
    x = coord.x;
    y = coord.y;

    if (typ === STONE) {
        // C: impossible("feature has unknown type param."); — non-fatal warning
        if (typeof console !== 'undefined')
            console.warn('feature has unknown type param.');
    } else {
        sel_set_feature(x, y, typ);
    }

    if (game.level.at(x, y)?.typ !== typ || !can_have_flags)
        return 0;

    switch (typ) {
    case FOUNTAIN:
        l_table_getset_feature_flag(x, y, tableArgs, 'looted', F_LOOTED);
        l_table_getset_feature_flag(x, y, tableArgs, 'warned', F_WARNED);
        break;
    case SINK:
        l_table_getset_feature_flag(x, y, tableArgs, 'pudding', S_LPUDDING);
        l_table_getset_feature_flag(x, y, tableArgs, 'dishwasher', S_LDWASHER);
        l_table_getset_feature_flag(x, y, tableArgs, 'ring', S_LRING);
        break;
    case THRONE:
        l_table_getset_feature_flag(x, y, tableArgs, 'looted', T_LOOTED);
        break;
    case TREE:
        l_table_getset_feature_flag(x, y, tableArgs, 'looted', TREE_LOOTED);
        l_table_getset_feature_flag(x, y, tableArgs, 'swarm', TREE_SWARM);
        break;
    default:
        break;
    }

    return 0;
}

// ─── lspo_wallify — C ref: sp_lev.c:5972-5996, nhlua.c:1171-1179 ────────────
// coder's current x/ystart+size window. wallify_map is ALREADY exported
// EXISTING get_table_int_opt (js/sp_lev.js:115) — get_table_int (below) is a
// genuinely new, distinctly-named REQUIRED (non-opt, throws-on-absence)
// variant; verified no `get_table_int` (sans _opt) exists yet in this file.

/** C ref: nhlua.c:1171-1179 get_table_int(L, name) — required integer field,
 *  throws if absent/non-numeric (no defval, unlike get_table_int_opt). */
function get_table_int(args, name) {
    const v = args.get(name);
    if (v == null)
        throw new Error(`wrong parameters (missing "${name}")`);
    return Number(v);
}

export function lspo_wallify(args) {
    let dx1 = -1, dy1 = -1, dx2 = -1, dy2 = -1;

    create_des_coder();

    if (args && args.type === 'table') {
        dx1 = get_table_int(args, 'x1');
        dy1 = get_table_int(args, 'y1');
        dx2 = get_table_int(args, 'x2');
        dy2 = get_table_int(args, 'y2');
    }

    if (!game.gx || game.gx.xstart === undefined)
        reset_xystart_size();

    wallify_map(
        dx1 < 0 ? (game.gx.xstart - 1) : dx1,
        dy1 < 0 ? (game.gy.ystart - 1) : dy1,
        dx2 < 0 ? (game.gx.xstart + game.gx.xsize + 1) : dx2,
        dy2 < 0 ? (game.gy.ystart + game.gy.ysize + 1) : dy2
    );

    return 0;
}

// ─── lspo_replace_terrain — C ref: sp_lev.c:5057-5150, nhlua.c:243-255 ──────
// fromterrain="L", toterrain=terrain[tidx] }) — region-form (get_table_region),
// NOT mapfrag, NOT selection.
// selection = darkness:grow(), fromterrain=".", toterrain="I" }) — the
// selection-field form, reached only on the `percent(25)` arm of a level that
// also had to pick a non-nil `darkness`. That conditional nesting is why both
// lua-level-load-probe and loader-chain call bigrm-2 CHAIN-CLEAR while

/** C ref: nhlua.c:243-255 get_table_mapchr(L, name) — required (non-opt)
 *  mapchar lookup, distinct from the EXISTING get_table_mapchr_opt
 *  (js/sp_lev.js:134, which takes a defval). Shared with lspo_terrain
 *  (port-lspo-terrain-w2-001) — defined here, reused there, not redefined. */
function get_table_mapchr(args, name) {
    const ter = get_table_str(args, name);
    const typ = check_mapchr(ter);
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return typ;
}

export function lspo_replace_terrain(args) {
    create_des_coder();

    if (!(args && args.type === 'table'))
        throw new Error('Wrong parameters');

    const totyp = get_table_mapchr(args, 'toterrain');
    if (totyp >= MAX_TYPE)
        return 0;

    let mf = null;
    const fromtyp = get_table_mapchr_opt(args, 'fromterrain', INVALID_TYPE);
    if (fromtyp === INVALID_TYPE) {
        const tmpstr = get_table_str(args, 'mapfragment');
        mf = mapfrag_fromstr(tmpstr);
        const err = mapfrag_error(mf);
        if (err != null)
            throw new Error(err);
    }

    const chance = get_table_int_opt(args, 'chance', 100);
    const tolit = get_table_int_opt(args, 'lit', SET_LIT_NOCHANGE);
    let x1 = get_table_int_opt(args, 'x1', -1);
    let y1 = get_table_int_opt(args, 'y1', -1);
    let x2 = get_table_int_opt(args, 'x2', -1);
    let y2 = get_table_int_opt(args, 'y2', -1);

    if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
        const out = {};
        if (get_table_region(args, 'region', out, true)) {
            x1 = out.x1;
            y1 = out.y1;
            x2 = out.x2;
            y2 = out.y2;
        }
    }

    // C: lua_getfield(L, 1, "selection"); if not nil, sel = l_selection_check.
    // Same defense-in-depth convention as lspo_terrain / lspo_region: only a
    // value carrying the selectionvar shape (`.map`) is taken as a selection.
    let sel = null;
    if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
        const selArg = args.get('selection');
        if (selArg && typeof selArg === 'object' && selArg.map)
            sel = selArg;
    }

    // C: `if (!sel) { sel = selection_new(); freesel = TRUE; ... }` — when the
    // caller supplied one, the fresh-selection block (and its clear/rect fill)
    // is skipped ENTIRELY and the caller's selection is scanned as-is.
    let freesel = false;
    if (!sel) {
        sel = selection_new();
        freesel = true;
        if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
            selection_clear(sel, 1);
        } else {
            const c1 = { x: x1, y: y1 };
            get_location(c1, ANY_LOC, game.gc.coder.croom);
            const c2 = { x: x2, y: y2 };
            get_location(c2, ANY_LOC, game.gc.coder.croom);
            for (let x = Math.max(c1.x, 0); x <= Math.min(c2.x, COLNO - 1); x++)
                for (let y = Math.max(c1.y, 0); y <= Math.min(c2.y, ROWNO - 1); y++)
                    selection_setpoint(x, y, sel, 1);
        }
    }

    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, rect);

    // RNG order (Cardinal Rule 2): x-outer/y-inner scan, rn2(100) drawn ONLY
    // for points where selection_getpoint is true, and (via && short-circuit,
    // matching C's `mapfrag_match(...) && (rn2(100)) < chance` /
    // `(...) && rn2(100) < chance`) only when the terrain-match predicate
    // itself is true.
    for (let x = Math.max(1, rect.lx); x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (!selection_getpoint(x, y, sel))
                continue;
            if (mf) {
                if (mapfrag_match(mf, x, y) && (rn2(100) < chance))
                    set_levltyp_lit(x, y, totyp, tolit);
            } else {
                const curtyp = game.level.at(x, y)?.typ ?? 0;
                const matches = (fromtyp === MATCH_WALL && IS_STWALL(curtyp)) || curtyp === fromtyp;
                if (matches && rn2(100) < chance)
                    set_levltyp_lit(x, y, totyp, tolit);
            }
        }
    }

    if (freesel)
        selection_free(sel, true);
    mapfrag_free(mf);

    return 0;
}

// ─── lspo_terrain — C ref: sp_lev.c:4984-5045 ────────────────────────────────
// form. Uses `...args` (see lspo_feature) so all 3 positional args arrive.
// The selection-field (argc==1) / selection-arg (argc==2, non-table arg1)
// shapes both need a REAL selectionvar arriving from Lua. Verified against
// the 5 LOADER_READY quest -strt.lua files (Bar/Val/Tou/Hea/Sam-strt.lua):
// only the argc==2 shape is reached (Bar-strt.lua:44
// `des.terrain(selection.randline(...), ".")`, Val-strt.lua:27-28
// `des.terrain(pools..., ...)`); none of the 5 call the argc==1
// selection-field form (that form is only used by hellfill.lua /
// themerms.lua, neither of which any of the 5 dofile). Both shapes are
// ported below for full C fidelity regardless.

export function lspo_terrain(...args) {
    create_des_coder();

    const tmpterrain = { tlit: SET_LIT_NOCHANGE, ter: INVALID_TYPE };
    let x = 0, y = 0;
    let sel = null;

    if (args.length === 1) {
        const a = args[0];
        if (!(a && a.type === 'table'))
            throw new Error('wrong parameters');
        const c = get_table_xy_or_coord(a);
        x = c.x;
        y = c.y;
        if (x === -1 && y === -1) {
            // C: lua_getfield(L, 1, "selection"); sel = l_selection_check(L,
            // -1); lua_pop(L, 1). Same defense-in-depth convention as
            // lspo_region's argc==2 branch (js/sp_lev.js:5108-5116): a
            // genuine selectionvar carries `.map`; anything else (absent
            // field, or an inert record-only stub) is treated as an empty
            // selection rather than crashing the file load.
            const selArg = a.get('selection');
            if (selArg && typeof selArg === 'object' && selArg.map)
                sel = selArg;
        }
        tmpterrain.ter = get_table_mapchr(a, 'typ');
        tmpterrain.tlit = get_table_int_opt(a, 'lit', SET_LIT_NOCHANGE);
    } else if (args.length === 2 && args[0] && args[0].type === 'table' && typeof args[1] === 'string') {
        tmpterrain.ter = check_mapchr(args[1]);
        const c = get_coord(args[0]);
        x = c.x;
        y = c.y;
    } else if (args.length === 2) {
        // C: sel = l_selection_check(L, 1) — arg1 must be a real
        // selectionvar. Same defense-in-depth convention as above/
        // lspo_region: only treat it as a selection when it actually
        // carries the selectionvar shape (`.map`).
        const orig = args[0];
        if (orig && typeof orig === 'object' && orig.map)
            sel = orig;
        tmpterrain.ter = check_mapchr(args[1]);
    } else if (args.length === 3) {
        x = Number(args[0]);
        y = Number(args[1]);
        tmpterrain.ter = check_mapchr(args[2]);
    } else {
        throw new Error('wrong parameters');
    }

    if (tmpterrain.ter === INVALID_TYPE)
        throw new Error('Erroneous map char');

    if (sel) {
        // C: selection_iterate(sel, sel_set_ter, &tmpterrain) — ported
        // inline as bounds-rect + selection_getpoint, matching this file's
        // established per-point-loop convention (lspo_replace_terrain,
        // set_wallprop_in_selection, lspo_region's argc==2 branch). Zero
        // RNG (sel_set_ter is a flat terrain-type + lit assignment) — all
        // RNG for a real selectionvar already happened upstream in
        // whatever selection.* call produced it.
        const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
        selection_getbounds(sel, rect);
        for (let sx = rect.lx; sx <= rect.hx; sx++)
            for (let sy = rect.ly; sy <= rect.hy; sy++)
                if (selection_getpoint(sx, sy, sel))
                    sel_set_ter(sx, sy, tmpterrain);
    } else {
        const coord = { x, y };
        get_location_coord(coord, ANY_LOC, game.gc.coder.croom, SP_COORD_PACK(x, y));
        x = coord.x;
        y = coord.y;
        if (!isok(x, y))
            throw new Error('terrain coord not ok');
        sel_set_ter(x, y, tmpterrain);
    }

    return 0;
}

// ─── lspo_non_diggable / set_wallprop_in_selection / sel_set_wall_property ──
// des.non_diggable() — the argc==0 form, VERIFIED to have NO dependency on
// port-lspo-selection-wiring-w2-001 (it builds its own whole-level selection
// via selection_new()+selection_clear(), never touching the Lua `selection`

/** C ref: sp_lev.c:985-994 sel_set_wall_property(x, y, arg). */
function sel_set_wall_property(x, y, prop) {
    const loc = game.level.at(x, y);
    if (!loc)
        return;
    if (IS_STWALL(loc.typ) || IS_TREE(loc.typ) || loc.typ === IRONBARS)
        loc.wall_info = (loc.wall_info | 0) | prop;
}

function set_wallprop_in_selection(args, prop) {
    create_des_coder();

    let sel = null;
    let freesel = false;

    if (args !== undefined && args !== null) {
        sel = args;                 // argc==1 — already a real selectionvar
    } else {
        // argc==0 — whole level.
        freesel = true;
        sel = selection_new();
        selection_clear(sel, 1);
    }

    if (sel) {
        const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
        selection_getbounds(sel, rect);
        for (let x = rect.lx; x <= rect.hx; x++)
            for (let y = rect.ly; y <= rect.hy; y++)
                if (selection_getpoint(x, y, sel))
                    sel_set_wall_property(x, y, prop);
        if (freesel)
            selection_free(sel, true);
    }
}

export function lspo_non_diggable(args) {
    set_wallprop_in_selection(args, W_NONDIGGABLE);
    return 0;
}

export function lspo_non_passwall(args) {
    set_wallprop_in_selection(args, W_NONPASSWALL);
    return 0;
}

// ─── lspo_mazewalk / walkfrom / okay / mz_move — C ref: sp_lev.c:5775-5876,
// mkmaze.c:1279-1309 (walkfrom, non-MICRO recursive variant — VERIFIED no
// -DMICRO/`define MICRO` in this build), mkmaze.c:296-305 (okay),
// mkmaze.c:32-40 (mz_move, ported as a small function, not a macro). ─────────
// positional form. fstocked defaults to 1/true in EVERY call shape (C's
// `int fstocked = 1` initializer is never overridden by the argc==3 form,
// reach the fill_empty_maze tail and throw there — an EXPECTED, documented
// partial result (fill_empty_maze needs maze1xy/rndtrap, neither ported);
// the walkfrom-based carving itself is real, independently valuable, and
// RNG-order-exact up to that point.

/** C ref: mkmaze.c:32-40 mz_move (a #define macro in C; ported as a small
 *  function mutating a {x,y} coord object, matching how mz_move mutates its
 *  X/Y arguments in place). dir here is walkfrom/okay's own internal 0-3
 *  encoding — NOT the W_NORTH/W_SOUTH/W_EAST/W_WEST bit-flag constants
 *  lspo_mazewalk's own initial 1-step nudge uses; the two encodings are
 *  unrelated despite both meaning "a direction". */
function mz_move(coord, dir) {
    switch (dir) {
    case 0:
        coord.y--;
        break;
    case 1:
        coord.x++;
        break;
    case 2:
        coord.y++;
        break;
    case 3:
        coord.x--;
        break;
    default:
        throw new Error('mz_move: bad direction ' + dir);
    }
}

/** C ref: mkmaze.c:296-305 okay(x, y, dir). VERIFIED: C passes x,y BY VALUE
 *  (coordxy, not pointers) — okay's two mz_move calls mutate its OWN local
 *  copy only, never the caller's x,y. The JS {x,y} object built here is
 *  exactly that local copy. */
function okay(x, y, dir) {
    const c = { x, y };
    mz_move(c, dir);
    mz_move(c, dir);
    const { x_maze_max, y_maze_max } = splev_maze_extent();
    if (c.x < 3 || c.y < 3 || c.x > x_maze_max || c.y > y_maze_max)
        return false;
    return (game.level.at(c.x, c.y)?.typ ?? 0) === STONE;
}

/** C ref: mkmaze.c:1279-1309 walkfrom(x, y, typ) — recursive backtracking
 *  maze-carver. Ported as a genuinely recursive function per Cardinal Rule 1
 *  (a MICRO iterative variant exists in C but is NOT what this non-MICRO
 *  build uses) — do NOT flatten the `while(1) { ...; walkfrom(...); }` loop
 *  into pure iteration; C's own loop re-scans directions from the SAME cell
 *  after each recursive excursion returns, which only works because the
 *  recursive call already fully explored (and can no longer re-explore) the
 *  cells it touched. */
function walkfrom(x, y, typ) {
    if (!typ)
        typ = game.level?.flags?.corrmaze ? CORR : ROOM;

    const loc0 = game.level.at(x, y);
    if (loc0 && !IS_DOOR(loc0.typ)) {
        loc0.typ = typ;
        loc0.flags = 0;
    }

    const coord = { x, y };
    while (true) {
        const dirs = [];
        for (let a = 0; a < 4; a++)
            if (okay(coord.x, coord.y, a))
                dirs.push(a);
        if (dirs.length === 0)
            return;
        const dir = dirs[rn2(dirs.length)];
        mz_move(coord, dir);
        const loc1 = game.level.at(coord.x, coord.y);
        if (loc1)
            loc1.typ = typ;
        mz_move(coord, dir);
        walkfrom(coord.x, coord.y, typ);
    }
}

/* objclass.h RANDOM_CLASS / GEM_CLASS — module-local per this file's existing
 * convention (js/sp_lev.js:3093 already inlines RANDOM_CLASS as 0; GEM_CLASS is
 * 13 in js/mkobj.js:27, js/o_init.js:36, js/uhitm.js:116). */
const RANDOM_CLASS = 0;
const GEM_CLASS = 13;

/** C ref: sp_lev.c:2899-2916 maze1xy(coord *m, int humidity) — pick a random
 *  ODD-parity maze cell not already claimed by the special level's own map
 *  (SpLev_Map) and passing the humidity screen. The tryct=2000 give-up is
 *  C's, including the fact that on give-up it RETURNS THE LAST DRAWN (x,y)
 *  even though that coord failed the loop test — port the bug. */
function maze1xy(m, humidity) {
    let x, y, tryct = 2000;
    const xmax = game.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    const splev_map = game.splev_map;
    do {
        x = rn1(xmax - 3, 3);
        y = rn1(ymax - 3, 3);
        if (--tryct < 0)
            break; /* give up */
    } while (!(x % 2) || !(y % 2)
             || (splev_map ? splev_map[x * ROWNO + y] : 0)
             || !is_ok_location(x, y, humidity));

    m.x = x;
    m.y = y;
}

/** C ref: dungeon.c:1650-1655 Can_dig_down(lev). Local because js/cmd.js's
 *  Invocation_lev reads a `game.invocation_level` that nothing in js/ ever
 *  writes (so it is unconditionally false); this one uses C's actual
 *  definition, dungeon.c:2016-2021 — In_hell && dlevel == num_dunlevs - 1. */
function Can_dig_down(lev) {
    if (game.level?.flags?.hardfloor)
        return false;
    if (Is_botlevel(lev))
        return false;
    const dun = game.dungeons?.[lev?.dnum];
    const invocation = In_hell(lev) && !!dun
                       && lev.dlevel === (dun.num_dunlevs | 0) - 1;
    return !invocation;
}

/** C ref: sp_lev.c:1155-1188 rndtrap() — random trap for a special level,
 *  rerolling until it lands on something legal here. */
function rndtrap() {
    let rtrap;
    do {
        rtrap = rnd(TRAPNUM - 1);
        switch (rtrap) {
        case HOLE: /* no random holes on special levels */
        case VIBRATING_SQUARE:
        case MAGIC_PORTAL:
            rtrap = NO_TRAP;
            break;
        case TRAPDOOR:
            if (!Can_dig_down(game.u?.uz))
                rtrap = NO_TRAP;
            break;
        case LEVEL_TELEP:
        case TELEP_TRAP:
            if (game.level?.flags?.noteleport)
                rtrap = NO_TRAP;
            break;
        case ROLLING_BOULDER_TRAP:
        case ROCKTRAP:
            if (In_endgame(game.u?.uz))
                rtrap = NO_TRAP;
            break;
        }
    } while (rtrap === NO_TRAP);
    return rtrap;
}

/** C ref: sp_lev.c:2925-2979 fill_empty_maze() — if a significant portion of
 *  the maze is unused by the special level's own map, stock it with objects,
 *  boulders, minotaurs, monsters, gold and traps in proportion to the unused
 *  area. Async because makemon/maketrap/mktrap are async in this port. */
async function fill_empty_maze() {
    let mapcountmax, mapcount, mapfact;
    const mm = { x: 0, y: 0 };
    const xmax = game.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = game.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    const splev_map = game.splev_map;

    mapcountmax = mapcount = (xmax - 2) * (ymax - 2);
    mapcountmax = Math.trunc(mapcountmax / 2);

    for (let x = 2; x < xmax; x++)
        for (let y = 0; y < ymax; y++)
            if (splev_map ? splev_map[x * ROWNO + y] : 0)
                mapcount--;

    if (mapcount > Math.trunc(mapcountmax / 10)) {
        mapfact = Math.trunc((mapcount * 100) / mapcountmax);
        for (let x = rnd(Math.trunc((20 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            await mkobj_at(rn2(2) ? GEM_CLASS : RANDOM_CLASS, mm.x, mm.y, true);
        }
        for (let x = rnd(Math.trunc((12 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            const ttmp = t_at(mm.x, mm.y);
            if (ttmp && (is_pit(ttmp.ttyp) || is_hole(ttmp.ttyp)))
                continue;
            await mksobj_at(BOULDER, mm.x, mm.y, true, false);
        }
        for (let x = rn2(2); x; x--) {
            maze1xy(mm, DRY);
            /* C: makemon(&mons[PM_MINOTAUR], ...) — this port's makemon takes
             * the mndx itself (js/mklev.js:3554 `typeof mdat === 'number'`). */
            await makemon(PM_MINOTAUR, mm.x, mm.y, NO_MM_FLAGS);
        }
        for (let x = rnd(Math.trunc((12 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            await makemon(null, mm.x, mm.y, NO_MM_FLAGS);
        }
        for (let x = rn2(Math.trunc((15 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            await mkgold(0, mm.x, mm.y);
        }
        for (let x = rn2(Math.trunc((15 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            let trytrap = rndtrap();
            if (sobj_at(BOULDER, mm.x, mm.y))
                while (is_pit(trytrap) || is_hole(trytrap))
                    trytrap = rndtrap();
            await maketrap(mm.x, mm.y, trytrap);
        }
    }
}

export async function lspo_mazewalk(...args) {
    const mwdirs = ['north', 'south', 'east', 'west', 'random', null];
    const mwdirs2i = [W_NORTH, W_SOUTH, W_EAST, W_WEST, W_RANDOM, -2];

    create_des_coder();

    let mx, my, ftyp = ROOM, fstocked = 1, dir = -1;

    if (args.length === 3) {
        mx = Number(args[0]);
        my = Number(args[1]);
        dir = mwdirs2i[feature_str_opt(args[2], mwdirs)];
    } else {
        const a = args[0];
        if (!(a && a.type === 'table'))
            throw new Error('wrong parameters');
        const c = get_table_xy_or_coord(a);
        mx = c.x;
        my = c.y;
        ftyp = get_table_mapchr_opt(a, 'typ', ROOM);
        fstocked = get_table_boolean_opt(a, 'stocked', 1);
        dir = mwdirs2i[get_table_option(a, 'dir', 'random', mwdirs)];
    }

    const mcoord = SP_COORD_PACK(mx, my);
    const coord = { x: mx, y: my };
    get_location_coord(coord, ANY_LOC, game.gc.coder.croom, mcoord);
    let x = coord.x, y = coord.y;

    if (!isok(x, y))
        throw new Error('mazewalk coord not ok');

    if (ftyp < 1)
        ftyp = game.level?.flags?.corrmaze ? CORR : ROOM;

    if (dir === W_RANDOM)
        dir = random_wdir();

    // don't use move() - it doesn't use W_NORTH, etc.
    switch (dir) {
    case W_NORTH:
        y--;
        break;
    case W_SOUTH:
        y++;
        break;
    case W_EAST:
        x++;
        break;
    case W_WEST:
        x--;
        break;
    default:
        throw new Error('mazewalk: Bad direction');
    }

    let loc = game.level.at(x, y);
    if (loc && !IS_DOOR(loc.typ)) {
        loc.typ = ftyp;
        loc.flags = 0;
    }

    // Ensure walkfrom's starting parity is odd, accounting for direction.
    if (!(x % 2)) {
        if (dir === W_EAST)
            x++;
        else
            x--;
        // no need for IS_DOOR check; out of map bounds
        loc = game.level.at(x, y);
        if (loc) {
            loc.typ = ftyp;
            loc.flags = 0;
        }
    }

    if (!(y % 2)) {
        if (dir === W_SOUTH)
            y++;
        else
            y--;
    }

    walkfrom(x, y, ftyp);
    if (fstocked)
        await fill_empty_maze();

    return 0;
}

/* C display.c: newsym_force — share the canonical forced repaint state. */
function newsym_force(x, y) { return newsym_force_real(x, y); }
