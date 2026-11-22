// sp_lev.js — the special-level coder and the "des" Lua table.
// C ref: sp_lev.c — create_des_coder, sp_level_coder_init, reset_xystart_size,
// update_croom, spo_endroom, build_room, lspo_room, add_doors_to_room,
// maybe_add_door, shared_with_room, get_table_roomtype_opt,
// get_table_xy_or_coord, l_push_mkroom_table, l_register_des.
//
// check_room() and create_room() (also sp_lev.c) live in mklev.js for now,
// next to the room code they share with makerooms().
//
// Ported so far: des.room, des.map, des.region, des.altar, des.object,
// des.monster and des.exclusion as themed rooms use them (with their helpers
// mapfrag_*, sel_set_ter, get_location, create_object, create_monster). The
// other des.* functions are registered by name but raise a Lua error until
// they are ported (their C counterparts are listed in sp_lev_des_names).

import { game } from './gstate.js';
import { flip_worm_segs_vertical, flip_worm_segs_horizontal,
         flip_wseg_cells } from './worm.js';
import { does_block, block_point } from './vision.js';
import { rn2, rn1, rnd, ROLL_FROM } from './rng.js';
import { depth, In_hell, on_level } from './dungeon.js';
import {
    COLNO, ROWNO, OROOM, THEMEROOM, COURT, SWAMP, VAULT, BEEHIVE, MORGUE,
    BARRACKS, ZOO, DELPHI, TEMPLE, ANTHOLE, COCKNEST, LEPREHALL, SHOPBASE,
    ARMORSHOP, SCROLLSHOP, POTIONSHOP, WEAPONSHOP, FOODSHOP, RINGSHOP,
    WANDSHOP, TOOLSHOP, BOOKSHOP, FODDERSHOP, CANDLESHOP, ROOMOFFSET,
    IS_DOOR, SDOOR, isok, TRUE, FALSE, FILL_NONE, FILL_NORMAL,
    STONE, MAX_TYPE, INVALID_TYPE, NO_ROOM, HWALL, IRONBARS, CLOUD, D_CLOSED,
    IS_WALL, MAXNROFROOMS, ROOM, ALTAR, SPACE_POS, IS_OBSTRUCTED,
    IS_POOL, IS_LAVA, AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, AM_MASK,
    AM_SHRINE, AM_SANCTUM,
    Align2amask, A_ORIGINAL, STAIRS, LADDER,
    NO_TRAP, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE,
    MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB, MKTRAP_SEEN, MKTRAP_NOVICTIM,
    STRAT_WAITFORU, D_NODOOR, D_BROKEN, D_ISOPEN, D_LOCKED, D_TRAPPED, D_SECRET, DOOR,
    W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY, W_RANDOM,
    IS_FURNITURE, FOUNTAIN, SINK, POOL, THRONE, TREE,
    F_LOOTED, F_WARNED, S_LPUDDING, S_LDWASHER, S_LRING, T_LOOTED,
    TREE_LOOTED, TREE_SWARM, MATCH_WALL, IS_STWALL, ACCESSIBLE, SCORR,
} from './const.js';
import { splev_chr2typ, luaL_checkstring, check_mapchr, get_table_mapchr, get_table_mapchr_opt } from './nhlua.js';
import { set_levltyp, set_levltyp_lit, SET_LIT_NOCHANGE } from './mkmaze.js';
import { flood_fill_rm, litstate_rnd } from './mkmap.js';
import {
    selection_new, selection_setpoint, selection_getpoint, selection_getbounds,
    selection_clear, selection_iterate, l_selection_check, match_maptyps,
    selection_clone, selection_do_grow, selection_free, selection_rndcoord,
    selection_floodfill, set_selection_floodfillchk,
} from './selvar.js';
import {
    get_table_int_opt, get_table_str, get_table_str_opt, get_table_option, nhl_error,
    luaL_checkoption, luaL_checkinteger, lua_type, LUA_TNIL, LUA_TSTRING,
    LUA_TBOOLEAN, LUA_TNUMBER, LUA_TFUNCTION, LUA_TTABLE, lua_error,
} from './nhlua.js';
import { create_room, topologize, add_door, add_room, add_subroom, okdoor, somex, somey, somexy, mktrap, fill_zoo } from './mklev.js';
import {
    mkgold, mkobj_at, mksobj_at, bless, curse, blessorcurse, set_corpsenm,
    rndmonnum, weight, add_to_container,
} from './mkobj.js';
import {
    NON_PM, MALE, FEMALE, NEUTRAL, G_EXTINCT, G_GONE, LR_TELE, LR_UPTELE,
    LR_DOWNTELE, LR_MONGEN, M_AP_OBJECT, M_AP_MONSTER, M_AP_FURNITURE,
    NO_MM_FLAGS, MM_NOTAIL, MM_NOGRP, MM_ADJACENTOK, MM_IGNOREWATER,
    MM_NOCOUNTBIRTH, MM_NOMSG, STONE_RES, M_AP_NOTHING, PROT_FROM_SHAPE_CHANGERS,
} from './const.js';
import {
    mons, NUMMONS, LOW_PM, MAXMCLASSES, G_UNIQ, G_NOGEN, G_IGNORE, S_EEL, S_GHOST,
    S_MIMIC, M1_AMPHIBIOUS, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FIRE_VORTEX,
    PM_FLAMING_SPHERE, PM_ARCHEOLOGIST, PM_WIZARD, PM_DWARF, PM_GNOME,
} from './monsters.js';
import {
    objects, OBJ_NAME, OBJ_DESCR, NUM_OBJECTS, STRANGE_OBJECT, STATUE, EGG,
    CORPSE, TIN, FIGURINE, RANDOM_CLASS, COIN_CLASS, RING_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, MAXOCLASSES,
    BOULDER, PICK_AXE, DWARVISH_MATTOCK, WAN_DIGGING, WAN_TELEPORTATION,
    SCR_TELEPORTATION, RIN_TELEPORTATION, SPE_NOVEL,
} from './objects.js';
import { ONAME_LEVEL_DEF, IS_DRAWBRIDGE, DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST,
         DB_WEST } from './const.js';
import { create_drawbridge } from './dbridge.js';
import {
    name_to_monplus, is_male, is_female, monsndx, is_vampshifter, is_vampire, is_swimmer, is_flyer,
    is_floater, passes_walls, your_race, Resists_Elem, poly_when_stoned,
} from './mondata.js';
import {
    def_char_to_monclass, def_monsyms, def_char_to_objclass,
} from './drawing.js';
import { mkclass, makemon, set_malign, m_at, sobj_at, propagate } from './makemon.js';
import { t_at } from './trap.js';
import { create_gas_cloud_selection } from './region.js';
import { enexto } from './teleport.js';
import { strcmpi, strncmpi, strstri } from './hacklib.js';
import { induced_align } from './dungeon.js';
import { nhl_push_obj } from './nhlobj.js';
import { bury_an_obj } from './dig.js';
import { stock_room } from './shknam.js';
import { priestini, mk_roamer } from './priest.js';
import { Amask2align } from './const.js';
import { make_engr_at, engr_at, del_engr_at } from './engrave.js';
import { DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, Is_waterlevel } from './const.js';
import {
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, CROSSWALL, IS_ROOM, VWALL, CORR, ICE, MOAT,
    TRAPNUM, NHL_SB_SAFE, LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
    W_NONDIGGABLE, W_NONPASSWALL, LA_UP, LA_DOWN, In_endgame,
} from './const.js';
import {
    wallification, fix_wall_spines, makecorridors, mkstairs, stairway_add,
    get_level_extends, Can_dig_down, Can_fall_thru,
} from './mklev.js';
import { fixup_special, create_maze, walkfrom, pick_vibrasquare_location } from './mkmaze.js';
import { deltrap, maketrap, is_pit, is_hole, trap_explanations } from './trap.js';
import { defsyms_explanation } from './pager.js';
import { mk_mplayer } from './mplayer.js';
import { obj_extract_self } from './mkobj.js';
import { del_engr } from './engrave.js';
import { vision_reset } from './vision.js';
import { load_lua, get_table_int } from './nhlua.js';
import { PM_MINOTAUR } from './monsters.js';
import { GEM_CLASS, SADDLE } from './objects.js';
import { mdrop_special_objs, discard_minvent, mpickobj } from './steal.js';
import { m_dowear } from './worn.js';
import { can_saddle, put_saddle_on_mon } from './makemon.js';
import { in_rooms } from './hack.js';
import { premap_detect } from './detect.js';
import { christen_monst, oname } from './do_name.js';
import { newcham_sync, mongone } from './mon.js';
import { mkmap } from './mkmap.js';

// C ref: dungeon.h In_mines()
function In_mines(lev) { return lev.dnum === game.dungeon_topology.d_mines_dnum; }

// C's impossible() and panic() (pline.c) are not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }
function panic(msg) { throw new Error(`panic: ${msg}`); }

const MAX_NESTED_ROOMS = 5;
const MAP_Y_LIM = 21; /* sp_lev.h */
/* sp_lev.h getloc_flags_t */
const DRY = 0x01;
const WET = 0x02;
const HOT = 0x04;
const SOLID = 0x08;
export const ANY_LOC = 0x10; /* even outside the level */
const NO_LOC_WARN = 0x20; /* no complaints and set x & y to -1, if no loc */
const SPACELOC = 0x40; /* like DRY, but accepts furniture too */
/* sp_lev.h SP_COORD_IS_RANDOM */
const SP_COORD_IS_RANDOM = 0x01000000;
/* align.h special-level altar masks */
const AM_SPLEV_CO = 0x20;
const AM_SPLEV_NONCO = 0x40;
const AM_SPLEV_RANDOM = 0x80;

// C ref: sp_lev.c alignment codes (#define SPLEV_LEFT ... BOTTOM)
export const SPLEV_LEFT = 1;
export const SPLEV_H_LEFT = 2;
export const SPLEV_CENTER = 3;
export const SPLEV_H_RIGHT = 4;
export const SPLEV_RIGHT = 5;
export const TOP = 1;
export const BOTTOM = 5;

// C ref: nhlua.c lcheck_param_table()
/* the table argument of a des.* call; no arguments means an empty table */
function lcheck_param_table(args) {
    const tbl = (args.length < 1) ? {} : args[0];

    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* luaL_checktype() */
    return tbl;
}

// C ref: sp_lev.c reset_xystart_size()
export function reset_xystart_size() {
    game.xstart = 1; /* column [0] is off limits */
    game.ystart = 0;
    game.xsize = COLNO - 1; /* 1..COLNO-1 */
    game.ysize = ROWNO; /* 0..ROWNO-1 */
}

// C ref: sp_lev.c sp_level_coder_init()
function sp_level_coder_init() {
    const coder = {
        premapped: FALSE,
        solidify: FALSE,
        check_inaccessibles: FALSE,
        allow_flips: 3, /* allow flipping level horiz/vert */
        croom: null,
        n_subroom: 1,
        lvl_is_joined: FALSE,
        room_stack: 0,
        tmproomlist: new Array(MAX_NESTED_ROOMS + 1).fill(null),
        failed_room: new Array(MAX_NESTED_ROOMS + 1).fill(FALSE),
    };

    game.splev_init_present = FALSE;
    game.icedpools = FALSE;

    /* update_croom(): gc.coder isn't set yet, so C's call is a no-op */

    container_obj = new Array(MAX_CONTAINMENT).fill(null);
    container_idx = 0;

    invent_carrying_monster = null;

    game.SpLev_Map = []; /* memset(SpLev_Map, 0, sizeof SpLev_Map) */

    game.level.flags.is_maze_lev = 0;
    game.level.flags.temperature = In_hell(game.u.uz) ? 1 : 0;
    game.level.flags.rndmongen = 1;
    game.level.flags.deathdrops = 1;

    reset_xystart_size();

    return coder;
}

// C ref: sp_lev.c create_des_coder()
export function create_des_coder() {
    if (!game.coder)
        game.coder = sp_level_coder_init();
}

// C ref: sp_lev.c update_croom()
export function update_croom() {
    const coder = game.coder;
    if (!coder)
        return;

    if (coder.n_subroom)
        coder.croom = coder.tmproomlist[coder.n_subroom - 1];
    else
        coder.croom = null;
}

// C ref: sp_lev.c spo_endroom()
function spo_endroom(coder) {
    if (game.coder.n_subroom > 1) {
        game.coder.n_subroom--;
        game.coder.tmproomlist[game.coder.n_subroom] = null;
        game.coder.failed_room[game.coder.n_subroom] = TRUE;
    } else {
        /* no subroom, get out of top-level room */
        /* Need to ensure xstart/ystart/xsize/ysize have something sensible,
           in case there's some stuff to be created outside the outermost
           room, and there's no MAP. */
        if (game.xsize <= 1 && game.ysize <= 1)
            reset_xystart_size();
    }
    update_croom();
}

// C ref: sp_lev.c room_types[]
const room_types = [
    { name: 'ordinary', type: OROOM },
    { name: 'themed', type: THEMEROOM },
    { name: 'throne', type: COURT },
    { name: 'swamp', type: SWAMP },
    { name: 'vault', type: VAULT },
    { name: 'beehive', type: BEEHIVE },
    { name: 'morgue', type: MORGUE },
    { name: 'barracks', type: BARRACKS },
    { name: 'zoo', type: ZOO },
    { name: 'delphi', type: DELPHI },
    { name: 'temple', type: TEMPLE },
    { name: 'anthole', type: ANTHOLE },
    { name: 'cocknest', type: COCKNEST },
    { name: 'leprehall', type: LEPREHALL },
    { name: 'shop', type: SHOPBASE },
    { name: 'armor shop', type: ARMORSHOP },
    { name: 'scroll shop', type: SCROLLSHOP },
    { name: 'potion shop', type: POTIONSHOP },
    { name: 'weapon shop', type: WEAPONSHOP },
    { name: 'food shop', type: FOODSHOP },
    { name: 'ring shop', type: RINGSHOP },
    { name: 'wand shop', type: WANDSHOP },
    { name: 'tool shop', type: TOOLSHOP },
    { name: 'book shop', type: BOOKSHOP },
    { name: 'health food shop', type: FODDERSHOP },
    { name: 'candle shop', type: CANDLESHOP },
];

// C ref: sp_lev.c get_mkroom_name()
function get_mkroom_name(rtype) {
    for (const rt of room_types)
        if (rt.type === rtype)
            return rt.name;

    impossible(`get_mkroom_name unknown rtype ${rtype}`);
    return 'unknown'; /* not NULL */
}

// C ref: sp_lev.c get_table_roomtype_opt()
function get_table_roomtype_opt(tbl, name, defval) {
    const roomstr = get_table_str_opt(tbl, name, '');
    let res = defval;

    if (roomstr) {
        const rt = room_types.find(r => r.name.toLowerCase() === roomstr.toLowerCase());
        if (rt)
            res = rt.type;
        else
            impossible(`Unknown room type '${roomstr}'`);
    }
    return res;
}

// C ref: nhlua.c get_table_boolean()
function get_table_boolean(tbl, name) {
    const boolstr = ['true', 'false', 'yes', 'no'];
    const v = tbl[name];
    const ltyp = lua_type(v);
    let ret = -1;

    if (ltyp === LUA_TSTRING) {
        ret = luaL_checkoption(v, null, boolstr);
    } else if (ltyp === LUA_TBOOLEAN) {
        ret = v ? 1 : 0;
    } else if (ltyp === LUA_TNUMBER) {
        ret = luaL_checkinteger(v);
        if (ret < 0 || ret > 1)
            ret = -1;
    }
    if (ret === -1)
        nhl_error(null, 'Expected a boolean');
    return ret;
}

// C ref: nhlua.c get_table_boolean_opt()
function get_table_boolean_opt(tbl, name, defval) {
    if (lua_type(tbl[name]) !== LUA_TNIL)
        return get_table_boolean(tbl, name);
    return defval;
}

// C ref: sp_lev.c get_coord()
export function get_coord(v) {
    if (lua_type(v) === LUA_TNIL || typeof v !== 'object')
        return null;
    if (Array.isArray(v) && v.length === 2)
        return { x: luaL_checkinteger(v[0]), y: luaL_checkinteger(v[1]) };
    if (v.x !== undefined && v.y !== undefined)
        return { x: luaL_checkinteger(v.x), y: luaL_checkinteger(v.y) };
    return null;
}

// C ref: sp_lev.c get_table_xy_or_coord()
function get_table_xy_or_coord(tbl) {
    let mx = get_table_int_opt(tbl, 'x', -1);
    let my = get_table_int_opt(tbl, 'y', -1);

    if (mx === -1 && my === -1) {
        const c = get_coord(tbl.coord);
        if (c) {
            mx = c.x;
            my = c.y;
        }
    }
    return { x: mx, y: my };
}

// C ref: sp_lev.c l_push_mkroom_table()
function l_push_mkroom_table(tmpr) {
    return {
        width: 1 + (tmpr.hx - tmpr.lx),
        height: 1 + (tmpr.hy - tmpr.ly),
        region: { x1: tmpr.lx, y1: tmpr.ly, x2: tmpr.hx, y2: tmpr.hy },
        lit: !!tmpr.rlit,
        irregular: !!tmpr.irregular,
        needjoining: !!tmpr.needjoining,
        type: get_mkroom_name(tmpr.rtype),
    };
}

// C ref: sp_lev.c shared_with_room()
function shared_with_room(x, y, droom) {
    const levl = game.level;
    const rmno = droom.roomnoidx + ROOMOFFSET;

    if (!isok(x, y))
        return FALSE;
    if (levl.at(x, y).roomno === rmno && !levl.at(x, y).edge)
        return FALSE;
    if (isok(x - 1, y) && levl.at(x - 1, y).roomno === rmno && x - 1 <= droom.hx)
        return TRUE;
    if (isok(x + 1, y) && levl.at(x + 1, y).roomno === rmno && x + 1 >= droom.lx)
        return TRUE;
    if (isok(x, y - 1) && levl.at(x, y - 1).roomno === rmno && y - 1 <= droom.hy)
        return TRUE;
    if (isok(x, y + 1) && levl.at(x, y + 1).roomno === rmno && y + 1 >= droom.ly)
        return TRUE;
    return FALSE;
}

// C ref: mkroom.c inside_room()
export function inside_room(croom, x, y) {
    if (croom.irregular) {
        const i = croom.roomnoidx + ROOMOFFSET;
        return (!game.level.at(x, y).edge && game.level.at(x, y).roomno === i);
    }

    return (x >= croom.lx - 1 && x <= croom.hx + 1
            && y >= croom.ly - 1 && y <= croom.hy + 1);
}

// C ref: sp_lev.c maybe_add_door()
function maybe_add_door(x, y, droom) {
    if (droom.hx >= 0
        && ((!droom.irregular && inside_room(droom, x, y))
            || game.level.at(x, y).roomno === droom.roomnoidx + ROOMOFFSET
            || shared_with_room(x, y, droom))) {
        add_door(x, y, droom);
    }
}

// C ref: sp_lev.c add_doors_to_room()
/* Add to the room any doors within/bordering it */
function add_doors_to_room(croom) {
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = game.level.at(x, y);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                maybe_add_door(x, y, croom);
        }
    for (let i = 0; i < croom.nsubrooms; i++)
        add_doors_to_room(croom.sbrooms[i]);
}

// C ref: sp_lev.c fill_special_room()
export function fill_special_room(croom) {
    if (!croom)
        return;

    /* First recurse into subrooms. We don't want to block an ordinary room
     * with a special subroom from having the subroom filled, or an unfilled
     * outer room preventing a special subroom from being filled. */
    for (let i = 0; i < croom.nsubrooms; ++i) {
        fill_special_room(croom.sbrooms[i]);
    }

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;

    if (croom.needfill === FILL_NORMAL) {
        /* Shop ? */
        if (croom.rtype >= SHOPBASE) {
            stock_room(croom.rtype - SHOPBASE, croom);
            game.level.flags.has_shop = TRUE;
            return;
        }

        switch (croom.rtype) {
        case VAULT:
            for (let x = croom.lx; x <= croom.hx; x++)
                for (let y = croom.ly; y <= croom.hy; y++)
                    mkgold(rn1(Math.abs(depth(game.u.uz)) * 100, 51), x, y);
            break;
        case COURT:
        case ZOO:
        case BEEHIVE:
        case ANTHOLE:
        case COCKNEST:
        case LEPREHALL:
        case MORGUE:
        case BARRACKS:
            fill_zoo(croom);
            break;
        }
    }
    switch (croom.rtype) {
    case VAULT:
        game.level.flags.has_vault = TRUE;
        break;
    case ZOO:
        game.level.flags.has_zoo = TRUE;
        break;
    case COURT:
        game.level.flags.has_court = TRUE;
        break;
    case MORGUE:
        game.level.flags.has_morgue = TRUE;
        break;
    case BEEHIVE:
        game.level.flags.has_beehive = TRUE;
        break;
    case BARRACKS:
        game.level.flags.has_barracks = TRUE;
        break;
    case TEMPLE:
        game.level.flags.has_temple = TRUE;
        break;
    case SWAMP:
        game.level.flags.has_swamp = TRUE;
        break;
    }
}

// C ref: rm.h IS_DOORJOIN()
function IS_DOORJOIN(typ) { return IS_OBSTRUCTED(typ) || typ === IRONBARS; }

// C ref: sp_lev.c set_door_orientation()
function set_door_orientation(x, y) {
    const lv = (xx, yy) => game.level.at(xx, yy);
    const wallish = (xx, yy) => (isok(xx, yy) && (IS_WALL(lv(xx, yy).typ)
                                                  || IS_DOOR(lv(xx, yy).typ)
                                                  || lv(xx, yy).typ === SDOOR));
    let wleft = wallish(x - 1, y);
    let wright = wallish(x + 1, y);
    let wup = wallish(x, y - 1);
    let wdown = wallish(x, y + 1);

    if (!wleft && !wright && !wup && !wdown) {
        /* out of bounds is treated as implicit wall; should be academic
           because we don't expect to have doors so near the level's edge */
        wleft  = (!isok(x - 1, y) || IS_DOORJOIN(lv(x - 1, y).typ));
        wright = (!isok(x + 1, y) || IS_DOORJOIN(lv(x + 1, y).typ));
        wup    = (!isok(x, y - 1) || IS_DOORJOIN(lv(x, y - 1).typ));
        wdown  = (!isok(x, y + 1) || IS_DOORJOIN(lv(x, y + 1).typ));
    }
    lv(x, y).horizontal = ((wleft || wright) && !(wup && wdown)) ? 1 : 0;
}

// C ref: sp_lev.c rnddoor()
/*
 * Choose randomly the state (nodoor, open, closed or locked) for a door
 */
function rnddoor() {
    const state = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];

    return ROLL_FROM(state);
}

// C ref: sp_lev.c create_door()
/*
 * Create a new door in a room.
 * It's placed on a wall (north, south, east or west).
 */
function create_door(dd, broom) {
    let x = 0, y = 0;
    let trycnt;
    const levl = (xx, yy) => game.level.at(xx, yy);

    if (dd.secret === -1)
        dd.secret = rn2(2);

    if (dd.wall === W_RANDOM)
        dd.wall = W_ANY; /* speeds things up in the below loop */

    if (dd.mask === -1) {
        /* is it a locked door, closed, or a doorway? */
        if (!dd.secret) {
            if (!rn2(3)) {
                if (!rn2(5))
                    dd.mask = D_ISOPEN;
                else if (!rn2(6))
                    dd.mask = D_LOCKED;
                else
                    dd.mask = D_CLOSED;
                if (dd.mask !== D_ISOPEN && !rn2(25))
                    dd.mask |= D_TRAPPED;
            } else
                dd.mask = D_NODOOR;
        } else {
            if (!rn2(5))
                dd.mask = D_LOCKED;
            else
                dd.mask = D_CLOSED;

            if (!rn2(20))
                dd.mask |= D_TRAPPED;
        }
    }

    for (trycnt = 0; trycnt < 100; ++trycnt) {
        const dwall = dd.wall, dpos = dd.pos;

        /* Convert wall and pos into an absolute coordinate! */
        switch (rn2(4)) {
        case 0:
            if (!(dwall & W_NORTH))
                continue;
            y = broom.ly - 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx)
                                          : dpos);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(levl(x, y - 1).typ))
                continue;
            break;
        case 1:
            if (!(dwall & W_SOUTH))
                continue;
            y = broom.hy + 1;
            x = broom.lx + ((dpos === -1) ? rn2(1 + broom.hx - broom.lx)
                                          : dpos);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(levl(x, y + 1).typ))
                continue;
            break;
        case 2:
            if (!(dwall & W_WEST))
                continue;
            x = broom.lx - 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly)
                                          : dpos);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(levl(x - 1, y).typ))
                continue;
            break;
        case 3:
            if (!(dwall & W_EAST))
                continue;
            x = broom.hx + 1;
            y = broom.ly + ((dpos === -1) ? rn2(1 + broom.hy - broom.ly)
                                          : dpos);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(levl(x + 1, y).typ))
                continue;
            break;
        default:
            /*NOTREACHED*/
            break;
        }

        if (okdoor(x, y))
            break;
    }
    if (trycnt >= 100) {
        impossible("create_door: Can't find a proper place!");
        return;
    }
    if (!set_levltyp(x, y, (dd.secret ? SDOOR : DOOR)))
        return;
    levl(x, y).doormask = dd.mask;
}

// C ref: sp_lev.c sel_set_door()
function sel_set_door(dx, dy, typ) {
    const x = dx, y = dy;
    const loc = game.level.at(x, y);

    if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR)
        loc.typ = (typ & D_SECRET) ? SDOOR : DOOR;
    if (typ & D_SECRET) {
        typ &= ~D_SECRET;
        if (typ < D_CLOSED)
            typ = D_CLOSED;
    }
    set_door_orientation(x, y); /* set/clear levl[x][y].horizontal */
    loc.doormask = typ;
    if (!game.SpLev_Map) game.SpLev_Map = [];
    if (!game.SpLev_Map[x]) game.SpLev_Map[x] = [];
    game.SpLev_Map[x][y] = 1;
}

// C ref: sp_lev.c lspo_door()
/* door({ x = 1, y = 1, state = "nodoor" }); */
/* door({ coord = {1, 1}, state = "nodoor" }); */
/* door({ wall = "north", pos = 3, state="secret" }); */
/* door("nodoor", 1, 2); */
export function lspo_door(...args) {
    const doorstates = [
        'random', 'open', 'closed', 'locked', 'nodoor', 'broken', 'secret',
    ];
    const doorstates2i = [
        -1, D_ISOPEN, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, D_SECRET,
    ];
    let msk;
    let x, y;
    let tbl = null;

    create_des_coder();

    if (args.length === 3) {
        const i = doorstates.indexOf(luaL_checkstring(args[0]));
        if (i < 0) /* luaL_checkoption() */
            nhl_error(null, `bad door state '${args[0]}'`);
        msk = doorstates2i[i];
        x = luaL_checkinteger(args[1]);
        y = luaL_checkinteger(args[2]);
    } else {
        if (args.length < 1)
            args[0] = {}; /* lcheck_param_table(): lua_createtable() */
        tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        const xy = get_table_xy_or_coord(tbl);
        x = xy.x, y = xy.y;
        msk = doorstates2i[get_table_option(tbl, 'state', 'random',
                                            doorstates)];
    }

    const typ = (msk === -1) ? rnddoor() : msk;

    if (x === -1 && y === -1) {
        const walldirs = [
            'all', 'random', 'north', 'west', 'east', 'south',
        ];
        /* Note that "random" is also W_ANY, because create_door just wants a
         * mask of acceptable walls */
        const walldirs2i = [
            W_ANY, W_ANY, W_NORTH, W_WEST, W_EAST, W_SOUTH, 0,
        ];
        const tmpd = {};

        tmpd.secret = (typ === D_SECRET) ? 1 : 0;
        tmpd.mask = msk;
        tmpd.pos = get_table_int_opt(tbl, 'pos', -1);
        tmpd.wall = walldirs2i[get_table_option(tbl, 'wall', 'all', walldirs)];

        create_door(tmpd, game.coder.croom);
    } else {
        /*selection_iterate(sel, sel_set_door, (genericptr_t) &typ);*/
        const c = { x, y };
        get_location_coord(c, ANY_LOC, game.coder.croom,
                           SP_COORD_PACK(x, y));
        x = c.x, y = c.y;
        if (!isok(x, y)) {
            nhl_error(null, 'door coord not ok');
            /*NOTREACHED*/
            return 0;
        }
        sel_set_door(x, y, typ);
    }

    return 0;
}

// C ref: sp_lev.c create_subroom()
function create_subroom(proom, x, y, w, h, rtype, rlit) {
    const width = proom.hx - proom.lx + 1;
    const height = proom.hy - proom.ly + 1;

    /* There is a minimum size for the parent room */
    if (width < 4 || height < 4)
        return FALSE;

    /* Check for random position, size, etc... */

    if (w === -1)
        w = rnd(width - 3);
    if (h === -1)
        h = rnd(height - 3);
    if (x === -1)
        x = rnd(width - w);
    if (y === -1)
        y = rnd(height - h);
    if (x === 1)
        x = 0;
    if (y === 1)
        y = 0;
    if ((x + w + 1) === width)
        x++;
    if ((y + h + 1) === height)
        y++;
    if (rtype === -1)
        rtype = OROOM;
    rlit = litstate_rnd(rlit);
    add_subroom(proom, proom.lx + x, proom.ly + y, proom.lx + x + w - 1,
                proom.ly + y + h - 1, rlit, rtype, FALSE);
    return TRUE;
}

// C ref: sp_lev.c build_room()
function build_room(r, mkr) {
    let okroom;
    let aroom;
    const rtype = (!r.chance || rn2(100) < r.chance) ? r.rtype : OROOM;

    if (mkr) {
        okroom = create_subroom(mkr, r.x, r.y, r.w, r.h, rtype, r.rlit);
        aroom = okroom ? game.level.subrooms[game.level.nsubroom - 1] : null;
    } else {
        okroom = create_room(r.x, r.y, r.w, r.h, r.xalign, r.yalign,
                             rtype, r.rlit);
        aroom = okroom ? game.level.rooms[game.level.nroom - 1] : null;
    }

    if (okroom) {
        topologize(aroom); /* set roomno */
        aroom.needfill = r.needfill;
        aroom.needjoining = r.joined;
        return aroom;
    }
    return null;
}

// C ref: sp_lev.c lspo_room()
/* room({ type="ordinary", lit=1, x=3,y=3, xalign="center",yalign="center",
 *        w=11,h=9 }); */
export function lspo_room(tbl) {
    create_des_coder();
    const coder = game.coder;

    if (game.in_mk_themerooms && game.themeroom_failed)
        return 0;

    if (lua_type(tbl) !== 5 /* LUA_TTABLE */)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    if (coder.n_subroom > MAX_NESTED_ROOMS) {
        panic('Too deeply nested rooms?!');
    } else {
        const left_or_right = [
            'left', 'half-left', 'center', 'half-right', 'right',
            'none', 'random',
        ];
        const l_or_r2i = [
            SPLEV_LEFT, SPLEV_H_LEFT, SPLEV_CENTER, SPLEV_H_RIGHT,
            SPLEV_RIGHT, -1, -1, -1,
        ];
        const top_or_bot = ['top', 'center', 'bottom', 'none', 'random'];
        const t_or_b2i = [TOP, SPLEV_CENTER, BOTTOM, -1, -1, -1];
        const tmproom = {};

        const { x: rx, y: ry } = get_table_xy_or_coord(tbl);
        tmproom.x = rx; tmproom.y = ry;
        if ((tmproom.x === -1 || tmproom.y === -1) && tmproom.x !== tmproom.y)
            nhl_error(null, 'Room must have both x and y');

        tmproom.w = get_table_int_opt(tbl, 'w', -1);
        tmproom.h = get_table_int_opt(tbl, 'h', -1);

        if ((tmproom.w === -1 || tmproom.h === -1) && tmproom.w !== tmproom.h)
            nhl_error(null, 'Room must have both w and h');

        tmproom.xalign = l_or_r2i[get_table_option(tbl, 'xalign', 'random',
                                                   left_or_right)];
        tmproom.yalign = t_or_b2i[get_table_option(tbl, 'yalign', 'random',
                                                   top_or_bot)];
        tmproom.rtype = get_table_roomtype_opt(tbl, 'type', OROOM);
        tmproom.chance = get_table_int_opt(tbl, 'chance', 100);
        tmproom.rlit = get_table_int_opt(tbl, 'lit', -1);
        /* theme rooms default to unfilled */
        tmproom.needfill = get_table_int_opt(tbl, 'filled',
                                             game.in_mk_themerooms ? 0 : 1);
        tmproom.joined = get_table_boolean_opt(tbl, 'joined', TRUE);

        if (!coder.failed_room[coder.n_subroom - 1]) {
            const tmpcr = build_room(tmproom, coder.croom);
            if (tmpcr) {
                const n = coder.n_subroom;

                coder.tmproomlist[n] = tmpcr; /* TRUE to get here... */
                coder.failed_room[n] = FALSE;
                /* added a subroom, make parent room irregular */
                if (coder.tmproomlist[n - 1])
                    coder.tmproomlist[n - 1].irregular = TRUE;
                coder.n_subroom++;
                update_croom();
                const contents = tbl.contents;
                if (lua_type(contents) === LUA_TFUNCTION) {
                    /* nhl_pcall_handle(L, 1, 0, "lspo_room", NHLpa_panic);
                       game.lua_des_caller is the Lua stack frame the
                       recorder sees for this C function: des.room */
                    const saved = game.lua_des_caller;
                    game.lua_des_caller = 'room';
                    try {
                        contents(l_push_mkroom_table(tmpcr));
                    } finally {
                        game.lua_des_caller = saved;
                    }
                }
                spo_endroom(coder);
                add_doors_to_room(tmpcr);
                return 0;
            }
            if (game.in_mk_themerooms)
                game.themeroom_failed = TRUE;
        } /* failed to create parent room, so fail this too */
    }
    coder.tmproomlist[coder.n_subroom] = null;
    coder.failed_room[coder.n_subroom] = TRUE;
    coder.n_subroom++;
    update_croom();
    spo_endroom(coder);
    if (game.in_mk_themerooms)
        game.themeroom_failed = TRUE;

    return 0;
}

// C ref: sp_lev.c mapfrag_fromstr()
export function mapfrag_fromstr(str) {
    const mf = {};

    mf.data = str.replace(/[0-9]/g, ''); /* stripdigits() */
    const lines = mf.data.split('\n');
    mf.wid = Math.max(...lines.map(l => l.length)); /* str_lines_maxlen() */
    mf.hei = 0;
    let tmps = 0;
    while (tmps !== null && tmps < mf.data.length) {
        const s1 = mf.data.indexOf('\n', tmps);

        if (mf.hei > MAP_Y_LIM) {
            return null;
        }
        tmps = (s1 >= 0) ? s1 + 1 : null;
        mf.hei++;
    }
    return mf;
}

// C ref: sp_lev.c mapfrag_get()
function mapfrag_get(mf, x, y) {
    if (y < 0 || x < 0 || y > mf.hei - 1 || x > mf.wid - 1)
        panic(`outside mapfrag (${mf.wid},${mf.hei}), wanted (${x},${y})`);
    return splev_chr2typ(mf.data[y * (mf.wid + 1) + x]);
}

// C ref: sp_lev.c TYP_CANNOT_MATCH()
function TYP_CANNOT_MATCH(typ) { return (typ === MAX_TYPE || typ === INVALID_TYPE); }

// C ref: sp_lev.c mapfrag_canmatch()
function mapfrag_canmatch(mf) {
    return ((mf.wid % 2) && (mf.hei % 2));
}

// C ref: sp_lev.c mapfrag_error()
export function mapfrag_error(mf) {
    let res = null;

    if (!mf) {
        res = 'mapfragment error';
    } else if (!mapfrag_canmatch(mf)) {
        res = 'mapfragment needs to have odd height and width';
    } else if (TYP_CANNOT_MATCH(mapfrag_get(mf, Math.trunc(mf.wid / 2),
                                            Math.trunc(mf.hei / 2)))) {
        res = 'mapfragment center must be valid terrain';
    }
    return res;
}

// C ref: sp_lev.c mapfrag_match()
export function mapfrag_match(mf, x, y) {
    const hw = Math.trunc(mf.wid / 2), hh = Math.trunc(mf.hei / 2);

    for (let rx = -hw; rx <= hw; rx++)
        for (let ry = -hh; ry <= hh; ry++) {
            const mapc = mapfrag_get(mf, rx + hw, ry + hh);
            const levc = isok(x + rx, y + ry) ? game.level.at(x + rx, y + ry).typ
                                              : STONE;

            if (!match_maptyps(mapc, levc))
                return FALSE;
        }
    return TRUE;
}

// C ref: sp_lev.c sel_set_ter()
function sel_set_ter(x, y, terr) {
    const levl = (xx, yy) => game.level.at(xx, yy);

    if (!set_levltyp_lit(x, y, terr.ter, terr.tlit))
        return;
    /* TODO: move this below into set_levltyp? */
    /* handle doors and secret doors */
    if (levl(x, y).typ === SDOOR || IS_DOOR(levl(x, y).typ)) {
        if (levl(x, y).typ === SDOOR)
            levl(x, y).doormask = D_CLOSED;
        if (x && (IS_WALL(levl(x - 1, y).typ) || levl(x - 1, y).horizontal))
            levl(x, y).horizontal = true;
    } else if (levl(x, y).typ === HWALL || levl(x, y).typ === IRONBARS) {
        levl(x, y).horizontal = true;
    } else if (levl(x, y).typ === CLOUD) {
        del_engr_at(x, y);
    }
}

// C ref: sp_lev.c random_wdir()
export function random_wdir() {
    const wdirs = [W_NORTH, W_SOUTH, W_EAST, W_WEST];
    return wdirs[rn2(4)];
}

// C ref: sp_lev.c sel_set_feature()
function sel_set_feature(x, y, arg) {
    if (!isok(x, y)) {
        return;
    }
    if (IS_FURNITURE(game.level.at(x, y).typ))
        return;
    game.level.at(x, y).typ = arg;
}

// C ref: sp_lev.c l_table_getset_feature_flag()
function l_table_getset_feature_flag(tbl, x, y, name, flag) {
    let val = get_table_boolean_opt(tbl, name, -2);

    if (val !== -2) {
        if (val === -1)
            val = rn2(2);
        const lev = game.level.at(x, y);
        if (val)
            lev.flags = (lev.flags || 0) | flag;
        else
            lev.flags = (lev.flags || 0) & ~flag;
    }
}

// C ref: sp_lev.c lspo_feature()
/* feature("fountain", x, y); */
/* feature("fountain", {x,y}); */
/* feature({ type="fountain", x=NN, y=NN }); */
/* feature({ type="fountain", coord={NN, NN} }); */
/* feature({ type="tree", coord={NN, NN}, swarm=true, looted=false }); */
export function lspo_feature(...args) {
    const features = ['fountain', 'sink', 'pool', 'throne', 'tree'];
    const features2i = [FOUNTAIN, SINK, POOL, THRONE, TREE, STONE];
    let x, y;
    let typ;
    const argc = args.length;
    let can_have_flags = FALSE;
    let fcoord;
    let humidity;

    create_des_coder();

    if (argc === 1 && lua_type(args[0]) === LUA_TSTRING) {
        typ = features2i[luaL_checkoption(args[0], null, features)];
        x = y = -1;
    } else if (argc === 2 && lua_type(args[0]) === LUA_TSTRING
               && lua_type(args[1]) === LUA_TTABLE) {
        typ = features2i[luaL_checkoption(args[0], null, features)];
        const c = get_coord(args[1]);
        x = c ? c.x : 0;
        y = c ? c.y : 0;
    } else if (argc === 3) {
        typ = features2i[luaL_checkoption(args[0], null, features)];
        x = luaL_checkinteger(args[1]);
        y = luaL_checkinteger(args[2]);
    } else {
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        ({ x, y } = get_table_xy_or_coord(tbl));
        typ = features2i[get_table_option(tbl, 'type', null, features)];
        can_have_flags = TRUE;
    }

    if (x === -1 && y === -1) {
        fcoord = SP_COORD_PACK_RANDOM(0);
        humidity = DRY; /* pick a regular space, no rock or other furniture */
    } else {
        fcoord = SP_COORD_PACK(x, y);
        humidity = ANY_LOC; /* assume the author knows what they're doing */
    }
    const c = { x, y };
    get_location_coord(c, humidity, game.coder.croom, fcoord);
    x = c.x, y = c.y;

    if (typ === STONE)
        impossible('feature has unknown type param.');
    else
        sel_set_feature(x, y, typ);

    if (game.level.at(x, y).typ !== typ || !can_have_flags)
        return 0;

    const tbl = args[0];
    switch (typ) {
    default:
        break;
    case FOUNTAIN:
        l_table_getset_feature_flag(tbl, x, y, 'looted', F_LOOTED);
        l_table_getset_feature_flag(tbl, x, y, 'warned', F_WARNED);
        break;
    case SINK:
        l_table_getset_feature_flag(tbl, x, y, 'pudding', S_LPUDDING);
        l_table_getset_feature_flag(tbl, x, y, 'dishwasher', S_LDWASHER);
        l_table_getset_feature_flag(tbl, x, y, 'ring', S_LRING);
        break;
    case THRONE:
        l_table_getset_feature_flag(tbl, x, y, 'looted', T_LOOTED);
        break;
    case TREE:
        l_table_getset_feature_flag(tbl, x, y, 'looted', TREE_LOOTED);
        l_table_getset_feature_flag(tbl, x, y, 'swarm', TREE_SWARM);
        break;
    }

    return 0;
}

// C ref: sp_lev.c lspo_gas_cloud()
/* gas_cloud({ selection=SELECTION }); */
/* gas_cloud({ selection=SELECTION, damage=N }); */
/* gas_cloud({ selection=SELECTION, damage=N, ttl=N }); */
export function lspo_gas_cloud(...args) {
    let x = 0, y = 0;
    let sel = null;
    const argc = args.length;
    let damage = 0;
    let ttl = -2;

    create_des_coder();

    if (argc === 1 && lua_type(args[0]) === LUA_TTABLE) {
        const tbl = args[0];
        let reg;

        ({ x, y } = get_table_xy_or_coord(tbl));
        if (x === -1 && y === -1) {
            sel = l_selection_check(tbl.selection);
        }
        damage = get_table_int_opt(tbl, 'damage', 0);
        ttl = get_table_int_opt(tbl, 'ttl', -2);
        if (!sel) {
            /* create_gas_cloud(x, y, 1, damage) (region.c) */
            nhl_error(null, 'des.gas_cloud: create_gas_cloud() is not ported yet');
        } else
            reg = create_gas_cloud_selection(sel, damage);
        if (ttl > -2)
            reg.ttl = ttl;
    } else {
        nhl_error(null, 'wrong parameters');
    }

    return 0;
}

// C ref: sp_lev.c lspo_replace_terrain()
/*
 * replace_terrain({ x1=NN,y1=NN, x2=NN,y2=NN, fromterrain=MAPCHAR,
 *                   toterrain=MAPCHAR, lit=N, chance=NN });
 * replace_terrain({ region={x1,y1, x2,y2}, fromterrain=MAPCHAR,
 *                   toterrain=MAPCHAR, lit=N, chance=NN });
 * replace_terrain({ selection=selection.area(2,5, 40,10),
 *                   fromterrain=MAPCHAR, toterrain=MAPCHAR });
 * replace_terrain({ selection=SEL, mapfragment=[[...]],
 *                   toterrain=MAPCHAR });
 */
export function lspo_replace_terrain(...args) {
    let sel = null;
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    const tbl = args[0];

    create_des_coder();

    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    let mf = null;
    const totyp = get_table_mapchr(tbl, 'toterrain');

    if (totyp >= MAX_TYPE)
        return 0;

    const fromtyp = get_table_mapchr_opt(tbl, 'fromterrain', INVALID_TYPE);

    if (fromtyp === INVALID_TYPE) {
        let err;
        const tmpstr = get_table_str(tbl, 'mapfragment');
        mf = mapfrag_fromstr(tmpstr);

        if ((err = mapfrag_error(mf)) !== null) {
            nhl_error(null, err);
            /*NOTREACHED*/
        }
    }

    const chance = get_table_int_opt(tbl, 'chance', 100);
    const tolit = get_table_int_opt(tbl, 'lit', SET_LIT_NOCHANGE);
    let x1 = get_table_int_opt(tbl, 'x1', -1);
    let y1 = get_table_int_opt(tbl, 'y1', -1);
    let x2 = get_table_int_opt(tbl, 'x2', -1);
    let y2 = get_table_int_opt(tbl, 'y2', -1);

    if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
        const r = get_table_region(tbl, 'region', TRUE);
        if (r)
            ({ x1, y1, x2, y2 } = r);
    }

    if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
        if (lua_type(tbl.selection) !== LUA_TNIL)
            sel = l_selection_check(tbl.selection);
    }

    if (!sel) {
        sel = selection_new();

        if (x1 === -1 && y1 === -1 && x2 === -1 && y2 === -1) {
            selection_clear(sel, 1);
        } else {
            const r1 = { x: x1, y: y1 }, r2 = { x: x2, y: y2 };
            get_location(r1, ANY_LOC, game.coder.croom);
            get_location(r2, ANY_LOC, game.coder.croom);
            for (let x = Math.max(r1.x, 0); x <= Math.min(r2.x, COLNO - 1); x++)
                for (let y = Math.max(r1.y, 0); y <= Math.min(r2.y, ROWNO - 1); y++)
                    selection_setpoint(x, y, sel, 1);
        }
    }

    selection_getbounds(sel, rect);

    for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, sel)) {
                if (mf) {
                    if (mapfrag_match(mf, x, y) && (rn2(100)) < chance)
                        set_levltyp_lit(x, y, totyp, tolit);
                } else {
                    const typ = game.level.at(x, y).typ;
                    if (((fromtyp === MATCH_WALL && IS_STWALL(typ))
                         || typ === fromtyp)
                        && rn2(100) < chance)
                        set_levltyp_lit(x, y, totyp, tolit);
                }
            }

    /* mapfrag_free(&mf) */
    return 0;
}

// C ref: sp_lev.c lspo_terrain()
/*
 * [lit_state: 1 On, 0 Off, -1 random, -2 leave as-is]
 * terrain({ x=NN, y=NN, typ=MAPCHAR, lit=lit_state });
 * terrain({ coord={X, Y}, typ=MAPCHAR, lit=lit_state });
 * terrain({ selection=SELECTION, typ=MAPCHAR, lit=lit_state });
 * terrain( SELECTION, MAPCHAR [, lit_state ] );
 * terrain({x,y}, MAPCHAR);
 * terrain(x,y, MAPCHAR);
 */
export function lspo_terrain(...args) {
    const tmpterrain = {};
    let x = 0, y = 0;
    let sel = null;
    const argc = args.length;

    create_des_coder();
    tmpterrain.tlit = SET_LIT_NOCHANGE;
    tmpterrain.ter = INVALID_TYPE;

    if (argc === 1) {
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        const t = get_table_xy_or_coord(tbl);
        x = t.x, y = t.y;
        if (t.x === -1 && t.y === -1) {
            sel = l_selection_check(tbl.selection);
        }
        tmpterrain.ter = get_table_mapchr(tbl, 'typ');
        tmpterrain.tlit = get_table_int_opt(tbl, 'lit', SET_LIT_NOCHANGE);
    } else if (argc === 2 && lua_type(args[0]) === LUA_TTABLE
               && lua_type(args[1]) === LUA_TSTRING) {
        tmpterrain.ter = check_mapchr(luaL_checkstring(args[1]));
        const c = get_coord(args[0]);
        if (c) {
            x = c.x;
            y = c.y;
        }
    } else if (argc === 2) {
        sel = l_selection_check(args[0]);
        tmpterrain.ter = check_mapchr(luaL_checkstring(args[1]));
    } else if (argc === 3) {
        x = luaL_checkinteger(args[0]);
        y = luaL_checkinteger(args[1]);
        tmpterrain.ter = check_mapchr(luaL_checkstring(args[2]));
    } else {
        nhl_error(null, 'wrong parameters');
    }

    if (tmpterrain.ter === INVALID_TYPE)
        nhl_error(null, 'Erroneous map char');

    if (sel) {
        selection_iterate(sel, sel_set_ter, tmpterrain);
    } else {
        const c = { x, y };
        get_location_coord(c, ANY_LOC, game.coder.croom,
                           SP_COORD_PACK(x, y));
        x = c.x, y = c.y;
        if (!isok(x, y)) {
            nhl_error(null, 'terrain coord not ok');
            /*NOTREACHED*/
            return 0;
        }
        sel_set_ter(x, y, tmpterrain);
    }

    return 0;
}

// C ref: sp_lev.c l_push_wid_hei_table()
function l_push_wid_hei_table(wid, hei) {
    return { width: wid, height: hei };
}

// C ref: sp_lev.c lspo_map()
/* map({ x = 10, y = 10, map = [[...]] }); */
/* map({ coord = {10, 10}, map = [[...]] }); */
/* map({ halign = "center", valign = "center", map = [[...]] }); */
/* map([[...]]) */
export function lspo_map(...args) {
    const left_or_right = [
        'left', 'half-left', 'center', 'half-right', 'right', 'none',
    ];
    const l_or_r2i = [
        SPLEV_LEFT, SPLEV_H_LEFT, SPLEV_CENTER, SPLEV_H_RIGHT,
        SPLEV_RIGHT, -1, -1,
    ];
    const top_or_bot = ['top', 'center', 'bottom', 'none'];
    const t_or_b2i = [TOP, SPLEV_CENTER, BOTTOM, -1, -1];
    let lr, tb;
    let x = -1, y = -1;
    let mf;
    let tmpstr;
    const argc = args.length;
    let has_contents = FALSE;
    let contents = null;
    let tryct = 0;
    let ox, oy;
    let lit = FALSE;
    const levl = (xx, yy) => game.level.at(xx, yy);

    create_des_coder();
    const coder = game.coder;

    if (game.in_mk_themerooms && game.themeroom_failed)
        return 0;

    if (argc === 1 && lua_type(args[0]) === LUA_TSTRING) {
        tmpstr = luaL_checkstring(args[0]);
        lr = tb = SPLEV_CENTER;
        mf = mapfrag_fromstr(tmpstr);
    } else {
        const tbl = lcheck_param_table(args);
        lr = l_or_r2i[get_table_option(tbl, 'halign', 'none', left_or_right)];
        tb = t_or_b2i[get_table_option(tbl, 'valign', 'none', top_or_bot)];
        ({ x, y } = get_table_xy_or_coord(tbl));
        tmpstr = luaL_checkstring(tbl.map); /* get_table_str(L, "map") */
        lit = get_table_boolean_opt(tbl, 'lit', FALSE);
        if (lua_type(tbl.contents) === LUA_TFUNCTION) {
            contents = tbl.contents;
            has_contents = TRUE;
        }
        mf = mapfrag_fromstr(tmpstr);
    }

    if (!mf) {
        nhl_error(null, 'Map data error');
        /*NOTREACHED*/
        return 0;
    }

    const sel = selection_new();
    ox = x;
    oy = y;
    let skipmap = false;
    redo_maploc: for (;;) {
        game.xsize = mf.wid;
        game.ysize = mf.hei;

        if (lr === -1 && tb === -1) {
            if (game.in_mk_themerooms && (ox === -1 || oy === -1)) {
                if (ox === -1) {
                    if (coder.croom) {
                        x = somex(coder.croom) - mf.wid;
                        if (x < 1)
                            x = 1;
                    } else {
                        x = 1 + rn2(COLNO - 1 - mf.wid);
                    }
                }

                if (oy === -1) {
                    if (coder.croom) {
                        y = somey(coder.croom) - mf.hei;
                        if (y < 1)
                            y = 1;
                    } else {
                        y = rn2(ROWNO - mf.hei);
                    }
                }
            }

            if (isok(x, y)) {
                /* x,y is given, place map starting at x,y */
                if (coder.croom) {
                    /* in a room? adjust to room relative coords */
                    game.xstart = x + coder.croom.lx;
                    game.ystart = y + coder.croom.ly;
                    game.xsize = Math.min(mf.wid,
                                          (coder.croom.hx - coder.croom.lx));
                    game.ysize = Math.min(mf.hei,
                                          (coder.croom.hy - coder.croom.ly));
                } else {
                    game.xsize = mf.wid;
                    game.ysize = mf.hei;
                    game.xstart = x;
                    game.ystart = y;
                }
            } else {
                nhl_error(null, 'Map requires either x,y or halign,valign params');
                return 0;
            }
        } else {
            /* place map starting at halign,valign */
            switch (lr) {
            case SPLEV_LEFT:
                game.xstart = game.splev_init_present ? 1 : 3;
                break;
            case SPLEV_H_LEFT:
                game.xstart = 2 + Math.trunc((game.x_maze_max - 2 - game.xsize) / 4);
                break;
            case SPLEV_CENTER:
                game.xstart = 2 + Math.trunc((game.x_maze_max - 2 - game.xsize) / 2);
                break;
            case SPLEV_H_RIGHT:
                game.xstart = 2 + Math.trunc((game.x_maze_max - 2 - game.xsize) * 3 / 4);
                break;
            case SPLEV_RIGHT:
                game.xstart = game.x_maze_max - game.xsize - 1;
                break;
            }
            switch (tb) {
            case TOP:
                game.ystart = 3;
                break;
            case SPLEV_CENTER:
                game.ystart = 2 + Math.trunc((game.y_maze_max - 2 - game.ysize) / 2);
                break;
            case BOTTOM:
                game.ystart = game.y_maze_max - game.ysize - 1;
                break;
            }
            if (!(game.xstart % 2))
                game.xstart++;
            if (!(game.ystart % 2))
                game.ystart++;
        }

        if (game.ystart < 0 || game.ystart + game.ysize > ROWNO) {
            if (game.in_mk_themerooms) {
                game.themeroom_failed = TRUE;
                skipmap = true;
                break redo_maploc;
            }
            /* try to move the start a bit */
            game.ystart += (game.ystart > 0) ? -2 : 2;
            if (game.ysize === ROWNO)
                game.ystart = 0;
            if (game.ystart < 0 || game.ystart + game.ysize > ROWNO)
                game.ystart = 0;
        }
        if (game.xsize <= 1 && game.ysize <= 1) {
            reset_xystart_size();
        } else {
            let mptyp;

            /* Themed rooms should never overwrite anything */
            if (game.in_mk_themerooms) {
                let isokp = TRUE;
                for (y = game.ystart - 1;
                     y < Math.min(ROWNO, game.ystart + game.ysize) + 1; y++)
                    for (x = game.xstart - 1;
                         x < Math.min(COLNO, game.xstart + game.xsize) + 1; x++) {
                        if (!isok(x, y)) {
                            isokp = FALSE;
                        } else if (y < game.ystart || y >= (game.ystart + game.ysize)
                                   || x < game.xstart || x >= (game.xstart + game.xsize)) {
                            if (levl(x, y).typ !== STONE
                                || levl(x, y).roomno !== NO_ROOM)
                                isokp = FALSE;
                        } else {
                            mptyp = mapfrag_get(mf, x - game.xstart, y - game.ystart);
                            if (mptyp >= MAX_TYPE)
                                continue;
                            if ((levl(x, y).typ !== STONE
                                 && levl(x, y).typ !== mptyp)
                                || levl(x, y).roomno !== NO_ROOM)
                                isokp = FALSE;
                        }
                        if (!isokp) {
                            if (tryct++ < 100 && (lr === -1 || tb === -1))
                                continue redo_maploc;
                            game.themeroom_failed = TRUE;
                            skipmap = true;
                            break redo_maploc;
                        }
                    }
            }

            /* Load the map */
            for (y = game.ystart; y < Math.min(ROWNO, game.ystart + game.ysize); y++)
                for (x = game.xstart; x < Math.min(COLNO, game.xstart + game.xsize); x++) {
                    mptyp = mapfrag_get(mf, (x - game.xstart), (y - game.ystart));
                    if (mptyp === INVALID_TYPE) {
                        /* TODO: warn about illegal map char */
                        continue;
                    }
                    if (mptyp >= MAX_TYPE)
                        continue;
                    /* clear out levl: load_common_data may set them */
                    levl(x, y).flags = 0;
                    levl(x, y).horizontal = false;
                    levl(x, y).roomno = 0;
                    levl(x, y).edge = false;
                    if (!game.SpLev_Map) game.SpLev_Map = [];
                    if (!game.SpLev_Map[x]) game.SpLev_Map[x] = [];
                    game.SpLev_Map[x][y] = 1;
                    selection_setpoint(x, y, sel, 1);
                    sel_set_ter(x, y, { ter: mptyp, tlit: lit });
                }
        }
        break;
    }

    /* skipmap: */
    if (game.in_mk_themerooms && game.themeroom_failed) {
        /* this mutated xstart and ystart in the process of trying to make a
         * themed room, so undo them */
        reset_xystart_size();
    } else if (has_contents) {
        /* nhl_pcall_handle(L, 1, 0, "lspo_map", NHLpa_panic) */
        const saved = game.lua_des_caller;
        game.lua_des_caller = 'map';
        try {
            contents(l_push_wid_hei_table(game.xsize, game.ysize));
        } finally {
            game.lua_des_caller = saved;
        }
        reset_xystart_size();
    }

    /* return selection where map locations were put */
    return sel; /* l_selection_push_copy(L, sel) */
}

// C ref: sp_lev.c get_table_region()
/* returns the region's corners, or null when 'optional' and the field is
   nil (C then leaves *x1..*y2 unchanged) */
function get_table_region(tbl, name, optional) {
    const v = tbl[name];
    if (optional && lua_type(v) === LUA_TNIL)
        return null;
    if (lua_type(v) !== 5 /* LUA_TTABLE */)
        nhl_error(null, `bad argument (table expected, got ${typeof v})`);
    if (v.length !== 4)
        nhl_error(null, 'Not a region');
    const x1 = luaL_checkinteger(v[0]);
    const y1 = luaL_checkinteger(v[1]);
    const x2 = luaL_checkinteger(v[2]);
    const y2 = luaL_checkinteger(v[3]);
    return { x1, y1, x2, y2 };
}

// C ref: sp_lev.c get_table_coords_or_region()
function get_table_coords_or_region(tbl) {
    let dx1 = get_table_int_opt(tbl, 'x1', -1);
    let dy1 = get_table_int_opt(tbl, 'y1', -1);
    let dx2 = get_table_int_opt(tbl, 'x2', -1);
    let dy2 = get_table_int_opt(tbl, 'y2', -1);

    if (dx1 === -1 && dy1 === -1 && dx2 === -1 && dy2 === -1) {
        const r = get_table_region(tbl, 'region', FALSE);
        dx1 = r.x1; dy1 = r.y1;
        dx2 = r.x2; dy2 = r.y2;
    }
    return { dx1, dy1, dx2, dy2 };
}

// C ref: sp_lev.c create_monster() M_AP_FURNITURE lookup:
//   for (i = 0; i < MAXPCHARS; i++)
//       if (!strcmp(defsyms[i].explanation, m->appear_as.str)) break;
// defsyms[] (defsym.h) is the map features (pager.js defsyms_explanation,
// S_stone..S_water) followed by the traps (trap.js trap_explanations,
// S_arrow_trap..S_trapped_chest); the special effects after them are not
// tabled here, so a name found in neither stops explicitly.
const MAXPCHARS = 105; /* defsym.h */
function defsym_by_explanation(str) {
    let i = defsyms_explanation.indexOf(str);
    if (i >= 0)
        return i;
    i = trap_explanations.indexOf(str);
    if (i >= 0)
        return defsyms_explanation.length + i; /* S_arrow_trap + i */
    throw new Error(`create_monster: defsyms[] effect explanation "${str}" not ported yet`);
}

// C ref: sp_lev.c light_region()
function light_region(tmpregion) {
    const litstate = tmpregion.rlit ? true : false;
    let hiy = tmpregion.y2;
    let lowy = tmpregion.y1;
    let lowx = tmpregion.x1, hix = tmpregion.x2;

    if (litstate) {
        /* adjust region size for walls, but only if lighted */
        lowx = Math.max(lowx - 1, 1);
        hix = Math.min(hix + 1, COLNO - 1);
        lowy = Math.max(lowy - 1, 0);
        hiy = Math.min(hiy + 1, ROWNO - 1);
    }
    for (let x = lowx; x <= hix; x++) {
        for (let y = lowy; y <= hiy; y++) {
            const lev = game.level.at(x, y);
            lev.lit = IS_LAVA(lev.typ) ? true : litstate;
        }
    }
}

// C ref: sp_lev.c sel_set_lit()
function sel_set_lit(x, y, arg) {
    const lit = arg;

    game.level.at(x, y).lit = (IS_LAVA(game.level.at(x, y).typ) || lit) ? true : false;
}

// C ref: sp_lev.c lspo_region()
/* region(selection, lit); */
/* region({ x1=NN, y1=NN, x2=NN, y2=NN, lit=BOOL, type=ROOMTYPE, joined=BOOL,
 *          irregular=BOOL, filled=NN [ , contents = FUNCTION ] }); */
/* region({ region={x1,y1, x2,y2}, type="ordinary" }); */
export function lspo_region(...args) {
    let dx1, dy1, dx2, dy2;
    let troom;
    let do_arrival_room = FALSE, room_not_needed,
        irregular = FALSE, joined = TRUE;
    let rtype = OROOM, rlit = 1, needfill = 0;
    const argc = args.length;
    const tbl = args[0];

    create_des_coder();
    const coder = game.coder;

    if (argc <= 1) {
        if (lua_type(tbl) !== 5 /* LUA_TTABLE */)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        /* TODO: "unfilled" => filled=0, "filled" => filled=1, and
         * "lvflags_only" => filled=2, probably in a get_table_needfill_opt */
        needfill = get_table_int_opt(tbl, 'filled', 0);
        irregular = get_table_boolean_opt(tbl, 'irregular', 0);
        joined = get_table_boolean_opt(tbl, 'joined', TRUE);
        do_arrival_room = get_table_boolean_opt(tbl, 'arrival_room', 0);
        rtype = get_table_roomtype_opt(tbl, 'type', OROOM);
        rlit = get_table_int_opt(tbl, 'lit', -1);

        ({ dx1, dy1, dx2, dy2 } = get_table_coords_or_region(tbl));

        if (dx1 === -1 && dy1 === -1 && dx2 === -1 && dy2 === -1) {
            nhl_error(null, 'region needs region');
        }
    } else if (argc === 2) {
        /* region(selection, "lit"); */
        const lits = ['unlit', 'lit'];
        const orig = l_selection_check(args[0]),
            sel = selection_clone(orig);

        rlit = luaL_checkoption(args[1], 'lit', lits);

        /*
    TODO: lit=random
        */
        if (rlit)
            selection_do_grow(sel, W_ANY);
        selection_iterate(sel, sel_set_lit, rlit);

        /* TODO: skip the rest of this function? */
        return 0;
    } else {
        nhl_error(null, 'Wrong parameters');
        /*NOTREACHED*/
        return 0;
    }

    rlit = litstate_rnd(rlit);

    const c1 = { x: dx1, y: dy1 }, c2 = { x: dx2, y: dy2 };
    get_location(c1, ANY_LOC, null);
    get_location(c2, ANY_LOC, null);
    dx1 = c1.x; dy1 = c1.y; dx2 = c2.x; dy2 = c2.y;

    /* Many regions are simple, rectangular areas that just need to set
     * lighting in an area. In that case, we don't need to do anything
     * complicated by creating a room. The exceptions are:
     *  - Special rooms (which usually need to be filled).
     *  - Irregular regions (more convenient to use the room-making code).
     *  - Themed room regions (which often have contents).
     *  - When a room is desired to constrain the arrival of migrating
     *    monsters (see the mon_arrive function for details).
     */
    room_not_needed = (rtype === OROOM && !irregular
                       && !do_arrival_room && !game.in_mk_themerooms);
    if (room_not_needed || game.level.nroom >= MAXNROFROOMS) {
        if (!room_not_needed)
            impossible('Too many rooms on new level!');
        const tmpregion = { rlit, x1: dx1, y1: dy1, x2: dx2, y2: dy2 };
        light_region(tmpregion);

        return 0;
    }

    /* troom = &svr.rooms[svn.nroom]: add_room() below creates it */
    const nroom = game.level.nroom;

    if (irregular) {
        game.min_rx = game.max_rx = dx1;
        game.min_ry = game.max_ry = dy1;
        game.smeq[nroom] = nroom;
        flood_fill_rm(dx1, dy1, nroom + ROOMOFFSET, rlit, TRUE);
        add_room(game.min_rx, game.min_ry, game.max_rx, game.max_ry, FALSE, rtype,
                 TRUE);
        troom = game.level.rooms[nroom];
        troom.rlit = rlit ? 1 : 0;
        troom.irregular = TRUE;
    } else {
        add_room(dx1, dy1, dx2, dy2, rlit, rtype, TRUE);
        troom = game.level.rooms[nroom];
        topologize(troom); /* set roomno */
    }

    /* mark rooms that must be filled, but do it later */
    troom.needfill = needfill;

    troom.needjoining = joined;

    if (!room_not_needed) {
        if (coder.n_subroom > 1) {
            impossible('region as subroom');
        } else {
            coder.tmproomlist[coder.n_subroom] = troom;
            coder.failed_room[coder.n_subroom] = FALSE;
            coder.n_subroom++;
            update_croom();
            if (lua_type(tbl.contents) === LUA_TFUNCTION) {
                /* nhl_pcall_handle(L, 1, 0, "lspo_region", NHLpa_panic) */
                const saved = game.lua_des_caller;
                game.lua_des_caller = 'region';
                try {
                    tbl.contents(l_push_mkroom_table(troom));
                } finally {
                    game.lua_des_caller = saved;
                }
            }
            spo_endroom(coder);
            add_doors_to_room(troom);
        }
    }

    return 0;
}

// C ref: sp_lev.c get_unpacked_coord()
function get_unpacked_coord(loc, defhumidity) {
    const c = {};

    if (loc & SP_COORD_IS_RANDOM) {
        c.x = c.y = -1;
        c.is_random = 1;
        c.getloc_flags = (loc & ~SP_COORD_IS_RANDOM);
        if (!c.getloc_flags)
            c.getloc_flags = defhumidity;
    } else {
        c.is_random = 0;
        c.getloc_flags = defhumidity;
        c.x = loc & 0xff;          /* SP_COORD_X() */
        c.y = (loc >> 16) & 0xff;  /* SP_COORD_Y() */
    }
    return c;
}

// C ref: sp_lev.c is_ok_location()
function is_ok_location(x, y, humidity) {
    const typ = game.level.at(x, y).typ;

    if (Is_waterlevel(game.u.uz))
        return TRUE; /* accept any spot */

    if (game.is_ok_location_func)
        return game.is_ok_location_func(x, y);

    /* TODO: Should perhaps check if wall is diggable/passwall? */
    if (humidity & ANY_LOC)
        return TRUE;

    if ((humidity & SOLID) && IS_OBSTRUCTED(typ))
        return TRUE;

    if ((humidity & (DRY | SPACELOC)) && SPACE_POS(typ)) {
        const bould = (sobj_at(BOULDER, x, y) !== null);

        if (!bould || (bould && (humidity & SOLID)))
            return TRUE;
    }
    if ((humidity & WET) && IS_POOL(typ))
        return TRUE;
    if ((humidity & HOT) && IS_LAVA(typ))
        return TRUE;
    return FALSE;
}

// C ref: sp_lev.c get_location()
/*
 * Choose a location (x,y) relative to croom (or to xstart/ystart when
 * croom is null); negative x means a random location.
 */
function get_location(c, humidity, croom) {
    let cpt = 0;
    let mx, my, sx, sy;

    if (croom) {
        mx = croom.lx;
        my = croom.ly;
        sx = croom.hx - mx + 1;
        sy = croom.hy - my + 1;
    } else {
        mx = game.xstart;
        my = game.ystart;
        sx = game.xsize;
        sy = game.ysize;
    }

    found_it: {
        if (c.x >= 0) { /* normal locations */
            c.x += mx;
            c.y += my;
        } else { /* random location */
            do {
                if (croom) { /* handle irregular areas */
                    const tmpc = { x: 0, y: 0 };
                    somexy(croom, tmpc);
                    c.x = tmpc.x;
                    c.y = tmpc.y;
                } else {
                    c.x = mx + rn2(sx);
                    c.y = my + rn2(sy);
                }
                if (is_ok_location(c.x, c.y, humidity))
                    break;
            } while (++cpt < 100);
            if (cpt >= 100) {
                /* last try */
                for (let xx = 0; xx < sx; xx++)
                    for (let yy = 0; yy < sy; yy++) {
                        c.x = mx + xx;
                        c.y = my + yy;
                        if (is_ok_location(c.x, c.y, humidity))
                            break found_it;
                    }
                if (!(humidity & NO_LOC_WARN)) {
                    impossible('get_location:  can\'t find a place!');
                } else {
                    c.x = c.y = -1;
                }
            }
        }
    }

    if (!(humidity & ANY_LOC) && !isok(c.x, c.y)) {
        if (!(humidity & NO_LOC_WARN)) {
            /*warning("get_location:  (%d,%d) out of bounds", *x, *y);*/
            c.x = game.x_maze_max;
            c.y = game.y_maze_max;
        } else {
            c.x = c.y = -1;
        }
    }
}

// C ref: sp_lev.c get_location_coord()
export function get_location_coord(c, humidity, croom, crd) {
    const uc = get_unpacked_coord(crd, humidity);
    c.x = uc.x;
    c.y = uc.y;
    get_location(c, uc.getloc_flags | (uc.is_random ? NO_LOC_WARN : 0),
                 croom);

    if (c.x === -1 && c.y === -1 && uc.is_random)
        get_location(c, humidity, croom);
}

// C ref: sp_lev.c get_room_loc()
/*
 * Get a relative position inside a room.
 * negative values for x or y means RANDOM!
 */
function get_room_loc(c, croom) {
    if (c.x < 0 && c.y < 0) {
        const tmpc = { x: 0, y: 0 };
        if (somexy(croom, tmpc)) {
            c.x = tmpc.x;
            c.y = tmpc.y;
        } else
            panic('get_room_loc : can\'t find a place!');
    } else {
        if (c.x < 0)
            c.x = rn2(croom.hx - croom.lx + 1);
        if (c.y < 0)
            c.y = rn2(croom.hy - croom.ly + 1);
        c.x += croom.lx;
        c.y += croom.ly;
    }
}

// C ref: sp_lev.c get_free_room_loc()
/*
 * Get a relative position inside a room.
 * negative values for x or y means RANDOM!
 */
function get_free_room_loc(c, croom, pos) {
    const tryc = { x: 0, y: 0 };
    let trycnt = 0;

    get_location_coord(tryc, DRY, croom, pos);
    if (game.level.at(tryc.x, tryc.y).typ !== ROOM) {
        do {
            tryc.x = c.x; tryc.y = c.y;
            get_room_loc(tryc, croom);
        } while (game.level.at(tryc.x, tryc.y).typ !== ROOM && ++trycnt <= 100);

        if (trycnt > 100)
            panic('get_free_room_loc:  can\'t find a place!');
    }
    c.x = tryc.x; c.y = tryc.y;
}

// C ref: sp_lev.c sp_amask_to_amask()
function sp_amask_to_amask(sp_amask) {
    let amask;

    if (sp_amask === AM_SPLEV_CO)
        amask = Align2amask(game.u.ualignbase[A_ORIGINAL]);
    else if (sp_amask === AM_SPLEV_NONCO)
        amask = Align2amask(noncoalignment(game.u.ualignbase[A_ORIGINAL]));
    else if (sp_amask === AM_SPLEV_RANDOM)
        amask = induced_align(80);
    else
        amask = sp_amask & AM_MASK;

    return amask;
}

// C ref: sp_lev.c get_table_align()
function get_table_align(tbl) {
    const gtaligns = [
        'noalign', 'law', 'neutral', 'chaos',
        'coaligned', 'noncoaligned', 'random',
    ];
    const aligns2i = [
        AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC,
        AM_SPLEV_CO, AM_SPLEV_NONCO, AM_SPLEV_RANDOM, 0,
    ];

    return aligns2i[get_table_option(tbl, 'align', 'random', gtaligns)];
}

// C ref: sp_lev.c create_altar()
function create_altar(a, croom) {
    const c = { x: -1, y: -1 };
    let croom_is_temple = TRUE;

    if (croom) {
        get_free_room_loc(c, croom, a.coord);
        if (croom.rtype !== TEMPLE)
            croom_is_temple = FALSE;
    } else {
        let sproom;
        get_location_coord(c, DRY, croom, a.coord);
        if ((sproom = in_rooms(c.x, c.y, TEMPLE).charCodeAt(0) || 0) !== 0)
            croom = game.level.rooms[sproom - ROOMOFFSET];
        else
            croom_is_temple = FALSE;
    }

    /* check for existing features */
    if (!set_levltyp(c.x, c.y, ALTAR))
        return;

    const amask = sp_amask_to_amask(a.sp_amask);

    game.level.at(c.x, c.y).altarmask = amask;

    if (a.shrine < 0)
        a.shrine = rn2(2); /* handle random case */

    if (!croom_is_temple || !a.shrine)
        return;

    if (a.shrine) { /* Is it a shrine  or sanctum? */
        priestini(game.u.uz, croom, c.x, c.y, (a.shrine > 1));
        game.level.at(c.x, c.y).altarmask |= AM_SHRINE;
        if (a.shrine === 2) /* high altar or sanctum */
            game.level.at(c.x, c.y).altarmask |= AM_SANCTUM;
        game.level.flags.has_temple = TRUE;
    }
}

// C ref: sp_lev.c lspo_altar()
/* altar({ x=NN, y=NN, align=ALIGNMENT, type="altar" }); */
export function lspo_altar(tbl) {
    const shrines = ['altar', 'shrine', 'sanctum'];
    const shrines2i = [0, 1, 2, 0];

    create_des_coder();

    if (lua_type(tbl) !== 5 /* LUA_TTABLE */)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    const { x, y } = get_table_xy_or_coord(tbl);

    const al = get_table_align(tbl);
    const shrine = shrines2i[get_table_option(tbl, 'type', 'altar', shrines)];
    let acoord;

    if (x === -1 && y === -1)
        acoord = SP_COORD_IS_RANDOM | 0; /* SP_COORD_PACK_RANDOM(0) */
    else
        acoord = (x & 0xff) + ((y & 0xff) << 16); /* SP_COORD_PACK(x, y) */

    const tmpaltar = { coord: acoord, sp_amask: al, shrine };

    create_altar(tmpaltar, game.coder.croom);

    return 0;
}

// C ref: sp_lev.c noncoalignment()
function noncoalignment(alignment) {
    let k;

    k = rn2(2);
    if (!alignment)
        return (k ? -1 : 1);
    return (k ? -alignment : 0);
}

// sp_lev.h SP_COORD_PACK(), SP_COORD_PACK_RANDOM()
export function SP_COORD_PACK(x, y) { return (x & 0xff) + ((y & 0xff) << 16); }
export function SP_COORD_PACK_RANDOM(l) { return SP_COORD_IS_RANDOM | l; }

// sp_lev.h object containment flags
const SP_OBJ_CONTENT = 0x1;
const SP_OBJ_CONTAINER = 0x2;
const MAX_CONTAINMENT = 10;
// sp_lev.h monster inventory flags
const DEFAULT_INVENT = 0x01;
const CUSTOM_INVENT = 0x02;
const NO_INVENT = 0x00;
const BOOL_RANDOM = -1;
// hack.h CORPSTAT_* flags for lspo_object()
const CORPSTAT_HISTORIC = 0x04;
const CORPSTAT_FEMALE = 1;
const CORPSTAT_MALE = 2;

// C ref: sp_lev.c container_obj[], container_idx, invent_carrying_monster
let container_obj = new Array(MAX_CONTAINMENT).fill(null);
let container_idx = 0;
let invent_carrying_monster = null;

// C ref: youprop.h Protection_from_shape_changers
function Protection_from_shape_changers() {
    const prot = game.u.uprops[PROT_FROM_SHAPE_CHANGERS];
    return !!(prot.intrinsic || prot.extrinsic);
}

// C ref: sp_lev.c m_bad_boulder_spot()
function m_bad_boulder_spot(x, y) {
    /* avoid trap locations */
    if (t_at(x, y))
        return TRUE;
    /* try to avoid locations which already have a boulder (this won't
       actually work; we get called before objects have been placed...) */
    if (sobj_at(BOULDER, x, y))
        return TRUE;
    /* avoid closed doors */
    const lev = game.level.at(x, y);
    if (IS_DOOR(lev.typ) && (lev.doormask & (D_CLOSED | D_LOCKED)) !== 0)
        return TRUE;
    /* spot is ok */
    return FALSE;
}

// C ref: sp_lev.c pm_good_location()
export function pm_good_location(x, y, pm) {
    return is_ok_location(x, y, pm_to_humidity(pm));
}

// C ref: sp_lev.c pm_to_humidity()
function pm_to_humidity(pm) {
    let loc = DRY;

    if (!pm)
        return loc;
    if (pm.mlet === S_EEL || amphibious(pm) || is_swimmer(pm))
        loc = WET;
    if (is_flyer(pm) || is_floater(pm))
        loc |= (HOT | WET);
    if (passes_walls(pm) || noncorporeal(pm))
        loc |= SOLID;
    if (likes_fire(pm))
        loc |= HOT;
    return loc;
}

// C ref: mondata.h amphibious(), noncorporeal(), likes_lava(), likes_fire()
function amphibious(ptr) { return (ptr.mflags1 & M1_AMPHIBIOUS) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === S_GHOST; }
function likes_lava(ptr) {
    return ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_SALAMANDER];
}
function likes_fire(ptr) {
    return ptr === mons[PM_FIRE_VORTEX] || ptr === mons[PM_FLAMING_SPHERE]
           || likes_lava(ptr);
}

// C ref: sp_lev.c create_monster()
function create_monster(m, croom) {
    let mtmp;
    let mclass;
    let amask;
    const cc = { x: 0, y: 0 };
    let pm;
    let g_mvflags;
    const c = { x: 0, y: 0 };

    if (m.class !== -1)
        mclass = def_char_to_monclass(m.class);
    else
        mclass = 0;

    if (mclass === MAXMCLASSES)
        panic(`create_monster: unknown monster class '${m.class}'`);

    amask = sp_amask_to_amask(m.sp_amask);

    if (!mclass) {
        pm = null;
    } else if (m.id !== NON_PM) {
        pm = mons[m.id];
        g_mvflags = game.mvitals[monsndx(pm)].mvflags;
        if ((pm.geno & G_UNIQ) && (g_mvflags & G_EXTINCT))
            return;
        if (g_mvflags & G_GONE) /* genocided or extinct */
            pm = null; /* make random monster */
    } else {
        pm = mkclass(mclass, G_NOGEN);
        /* if we can't get a specific monster type (pm == 0) then the
           class has been genocided, so settle for a random monster */
    }
    if (In_mines(game.u.uz) && pm && your_race(pm)
        && (game.urace.mnum === PM_DWARF || game.urace.mnum === PM_GNOME)
        && rn2(3))
        pm = null;

    if (pm) {
        let loc = pm_to_humidity(pm);

        /* If water-liking monster, first try is without DRY */
        get_location_coord(c, loc | NO_LOC_WARN, croom, m.coord);
        if (c.x === -1 && c.y === -1) {
            loc |= DRY;
            get_location_coord(c, loc, croom, m.coord);
        }
    } else {
        get_location_coord(c, DRY, croom, m.coord);
    }
    let x = c.x, y = c.y;

    /* try to find a close place if someone else is already there */
    if (m_at(x, y) && enexto(cc, x, y, pm))
        x = cc.x, y = cc.y;

    if (croom && !inside_room(croom, x, y))
        return;

    if (m.sp_amask !== AM_SPLEV_RANDOM)
        mtmp = mk_roamer(pm, Amask2align(amask), x, y, m.peaceful);
    else if (PM_ARCHEOLOGIST <= m.id && m.id <= PM_WIZARD)
        mtmp = mk_mplayer(pm, x, y, FALSE);
    else
        mtmp = makemon(pm, x, y, m.mm_flags);

    if (mtmp) {
        x = mtmp.mx, y = mtmp.my; /* sanity precaution */
        m.x = x, m.y = y;
        /* handle specific attributes for some special monsters */
        if (m.name)
            mtmp = christen_monst(mtmp, m.name);

        /*
         * This doesn't complain if an attempt is made to give a
         * non-mimic/non-shapechanger an appearance or to give a
         * shapechanger a non-monster shape, it just refuses to comply.
         */
        if (m.appear_as
            && ((mtmp.data.mlet === S_MIMIC)
                /* shapechanger (chameleons, et al, and vampires) */
                || (mtmp.cham >= LOW_PM && m.appear === M_AP_MONSTER))
            && !Protection_from_shape_changers()) {
            let i;

            switch (m.appear) {
            case M_AP_NOTHING:
                impossible(
                 `create_monster: mon has an appearance, "${m.appear_as}", but no type`);
                break;

            case M_AP_FURNITURE:
                i = defsym_by_explanation(m.appear_as);
                if (i === MAXPCHARS) {
                    impossible(`create_monster: can't find feature "${m.appear_as}"`);
                } else {
                    mtmp.m_ap_type = M_AP_FURNITURE;
                    mtmp.mappearance = i;
                }
                break;

            case M_AP_OBJECT:
                for (i = 0; i < NUM_OBJECTS; i++)
                    if (OBJ_NAME(objects[i])
                        && OBJ_NAME(objects[i]) === m.appear_as)
                        break;
                if (i === NUM_OBJECTS) {
                    impossible(`create_monster: can't find object "${m.appear_as}"`);
                } else {
                    mtmp.m_ap_type = M_AP_OBJECT;
                    mtmp.mappearance = i;
                    /* try to avoid placing mimic boulder on a trap */
                    if (i === BOULDER && m.x < 0
                        && m_bad_boulder_spot(x, y)) {
                        /* remove_monster() + get_location() retry loop:
                           not ported yet */
                        nhl_error(null, 'create_monster: mimic boulder relocation is not ported yet');
                    }
                }
                break;

            case M_AP_MONSTER:
                /* select_newcham_form(), validvamp(), set_mon_data():
                   not ported yet */
                nhl_error(null, 'create_monster: monster appear_as is not ported yet');
                break;

            default:
                impossible(
                  `create_monster: unimplemented mon appear type [${m.appear},"${m.appear_as}"]`);
                break;
            }
            if (does_block(x, y, game.level.at(x, y)))
                block_point(x, y);
        }

        mtmp.female = m.female;
        if (m.peaceful > BOOL_RANDOM) {
            mtmp.mpeaceful = m.peaceful;
            /* changed mpeaceful again; have to reset malign */
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
            mtmp.minvis = mtmp.perminvis = 1;
        }
        if (m.blinded) {
            mtmp.mcansee = 0;
            mtmp.mblinded = (m.blinded % 127);
        }
        if (m.paralyzed) {
            mtmp.mcanmove = 0;
            mtmp.mfrozen = (m.paralyzed % 127);
        }
        if (m.fleeing) {
            mtmp.mflee = 1;
            mtmp.mfleetim = (m.fleeing % 127);
        }
        if (m.waiting) {
            mtmp.mstrategy |= STRAT_WAITFORU;
            /* if this is a vampire that got created already shifted into
               bat/fog/wolf form and the special level or theme room didn't
               explicitly request that, shift back to vampire */
            if (is_vampshifter(mtmp) && !is_vampire(mtmp.data)
                && m.appear !== M_AP_MONSTER) /* vampshifted() */
                newcham_sync(mtmp, mons[mtmp.cham], 0 /* NO_NC_FLAGS */);
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
            /* guard against someone accidentally specifying e.g. quest nemesis
             * with custom inventory that lacks Bell or quest artifact but
             * forgetting to flag them as receiving their default inventory */
            mdrop_special_objs(mtmp);
            discard_minvent(mtmp, TRUE);
        }
        if (m.has_invent & CUSTOM_INVENT) {
            invent_carrying_monster = mtmp;
        }
    }
}

// C ref: sp_lev.c get_table_monclass()
function get_table_monclass(tbl) {
    const s = get_table_str_opt(tbl, 'class', null);
    let ret = -1;

    if (s && s.length === 1)
        ret = s;
    return ret;
}

// C ref: sp_lev.c find_montype()
function find_montype(s, mgender) {
    let i;
    const g = { v: NEUTRAL };

    i = name_to_monplus(s, null, g);
    let mgend = g.v;
    if (i >= LOW_PM && i < NUMMONS) {
        if (is_male(mons[i]) || is_female(mons[i]))
            mgend = is_female(mons[i]) ? FEMALE : MALE;
        else
            mgend = (mgend === FEMALE) ? FEMALE
                        : (mgend === MALE) ? MALE : rn2(2);
        if (mgender)
            mgender.v = mgend;
        return i;
    }
    if (mgender)
        mgender.v = NEUTRAL;
    return NON_PM;
}

// C ref: sp_lev.c get_table_montype()
function get_table_montype(tbl, mgender) {
    const s = get_table_str_opt(tbl, 'id', null);
    let ret = NON_PM;

    if (s) {
        ret = find_montype(s, mgender);
        if (ret === NON_PM)
            nhl_error(null, 'Unknown monster id');
    }
    return ret;
}

// C ref: sp_lev.c lspo_monster()
/* monster(); */
/* monster("wood nymph"); */
/* monster("D"); */
/* monster("giant eel",11,06); */
/* monster("hill giant", {08,06}); */
/* monster({ id = "giant mimic", appear_as = "obj:boulder" }); */
/* monster({ class = "H", peaceful = 0 }); */
export function lspo_monster(...args) {
    const argc = args.length;
    const tmpmons = {};
    let mx = -1, my = -1;
    const mgend = { v: NEUTRAL };
    let invfn = null;

    create_des_coder();

    tmpmons.peaceful = -1;
    tmpmons.asleep = -1;
    tmpmons.name = null;
    tmpmons.appear = 0;
    tmpmons.appear_as = null;
    tmpmons.sp_amask = AM_SPLEV_RANDOM;
    tmpmons.female = 0;
    tmpmons.invis = 0;
    tmpmons.cancelled = 0;
    tmpmons.revived = 0;
    tmpmons.avenge = 0;
    tmpmons.fleeing = 0;
    tmpmons.blinded = 0;
    tmpmons.paralyzed = 0;
    tmpmons.stunned = 0;
    tmpmons.confused = 0;
    tmpmons.seentraps = 0;
    tmpmons.has_invent = DEFAULT_INVENT;
    tmpmons.waiting = 0;
    tmpmons.mm_flags = NO_MM_FLAGS;
    tmpmons.m_lev_adj = 0;

    const from_paramstr = (paramstr) => {
        if (paramstr.length === 1) {
            tmpmons.class = paramstr;
            tmpmons.id = NON_PM;
        } else {
            tmpmons.class = -1;
            tmpmons.id = find_montype(paramstr, mgend);
            tmpmons.female = (mgend.v === FEMALE) ? FEMALE
                                : (mgend.v === MALE) ? MALE : rn2(2);
        }
    };

    if (argc === 1 && lua_type(args[0]) === LUA_TSTRING) {
        from_paramstr(luaL_checkstring(args[0]));
    } else if (argc === 2 && lua_type(args[0]) === LUA_TSTRING
               && lua_type(args[1]) === LUA_TTABLE) {
        const paramstr = luaL_checkstring(args[0]);
        const crd = get_coord(args[1]);
        if (crd)
            mx = crd.x, my = crd.y;
        from_paramstr(paramstr);
    } else if (argc === 3) {
        const paramstr = luaL_checkstring(args[0]);

        mx = luaL_checkinteger(args[1]);
        my = luaL_checkinteger(args[2]);
        from_paramstr(paramstr);
    } else {
        let keep_default_invent = -1; /* -1 = unspecified */
        if (args.length < 1)
            args[0] = {}; /* lcheck_param_table(): lua_createtable() */
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        tmpmons.peaceful = get_table_boolean_opt(tbl, 'peaceful', BOOL_RANDOM);
        tmpmons.asleep = get_table_boolean_opt(tbl, 'asleep', BOOL_RANDOM);
        tmpmons.name = get_table_str_opt(tbl, 'name', null);
        tmpmons.appear = 0;
        tmpmons.appear_as = null;
        tmpmons.sp_amask = get_table_align(tbl);
        tmpmons.female = get_table_boolean_opt(tbl, 'female', BOOL_RANDOM);
        tmpmons.invis = get_table_boolean_opt(tbl, 'invisible', FALSE);
        tmpmons.cancelled = get_table_boolean_opt(tbl, 'cancelled', FALSE);
        tmpmons.revived = get_table_boolean_opt(tbl, 'revived', FALSE);
        tmpmons.avenge = get_table_boolean_opt(tbl, 'avenge', FALSE);
        tmpmons.fleeing = get_table_int_opt(tbl, 'fleeing', 0);
        tmpmons.blinded = get_table_int_opt(tbl, 'blinded', 0);
        tmpmons.paralyzed = get_table_int_opt(tbl, 'paralyzed', 0);
        tmpmons.stunned = get_table_boolean_opt(tbl, 'stunned', FALSE);
        tmpmons.confused = get_table_boolean_opt(tbl, 'confused', FALSE);
        tmpmons.waiting = get_table_boolean_opt(tbl, 'waiting', FALSE);
        tmpmons.m_lev_adj = get_table_int_opt(tbl, 'm_lev_adj', 0);
        tmpmons.seentraps = 0; /* TODO: list of trap names to bitfield */
        keep_default_invent =
            get_table_boolean_opt(tbl, 'keep_default_invent', -1);

        if (!get_table_boolean_opt(tbl, 'tail', TRUE))
            tmpmons.mm_flags |= MM_NOTAIL;
        if (!get_table_boolean_opt(tbl, 'group', TRUE))
            tmpmons.mm_flags |= MM_NOGRP;
        if (get_table_boolean_opt(tbl, 'adjacentok', FALSE))
            tmpmons.mm_flags |= MM_ADJACENTOK;
        if (get_table_boolean_opt(tbl, 'ignorewater', FALSE))
            tmpmons.mm_flags |= MM_IGNOREWATER;
        if (!get_table_boolean_opt(tbl, 'countbirth', TRUE))
            tmpmons.mm_flags |= MM_NOCOUNTBIRTH;

        const mappear = get_table_str_opt(tbl, 'appear_as', null);
        if (mappear) {
            if (mappear.startsWith('obj:')) {
                tmpmons.appear = M_AP_OBJECT;
            } else if (mappear.startsWith('mon:')) {
                tmpmons.appear = M_AP_MONSTER;
            } else if (mappear.startsWith('ter:')) {
                tmpmons.appear = M_AP_FURNITURE;
            } else {
                nhl_error(null, 'Unknown appear_as type');
            }
            tmpmons.appear_as = mappear.slice(4);
        }

        const xy = get_table_xy_or_coord(tbl);
        mx = xy.x, my = xy.y;

        tmpmons.id = get_table_montype(tbl, mgend);
        /* get_table_montype will return a random gender if the species isn't
         * all-male or all-female; if the level designer specified a certain
         * gender, override that random one now, unless it *is* a one-gender
         * species */
        if (mgend.v !== NEUTRAL
            && (tmpmons.female === BOOL_RANDOM || is_female(mons[tmpmons.id])
                || is_male(mons[tmpmons.id])))
            tmpmons.female = mgend.v;
        /* safety net - if find_montype did not find a gender for this species
         * (should cause a lua error anyway) */
        if (tmpmons.female === BOOL_RANDOM)
            tmpmons.female = 0;

        tmpmons.class = get_table_monclass(tbl);

        if (lua_type(tbl.inventory) !== LUA_TNIL) {
            /* overwrite DEFAULT_INVENT - most times inventory is specified,
             * the monster should not get its species' default inventory. */
            tmpmons.has_invent = CUSTOM_INVENT;
            if (keep_default_invent === TRUE)
                tmpmons.has_invent |= DEFAULT_INVENT;
            invfn = tbl.inventory;
        } else {
            /* if keep_default_invent was explicitly set to false, provide
             * *no* inventory. */
            if (keep_default_invent === FALSE)
                tmpmons.has_invent = NO_INVENT;
        }
    }

    if (mx === -1 && my === -1)
        tmpmons.coord = SP_COORD_PACK_RANDOM(0);
    else
        tmpmons.coord = SP_COORD_PACK(mx, my);

    if (tmpmons.id !== NON_PM && tmpmons.class === -1)
        tmpmons.class = def_monsyms[mons[tmpmons.id].mlet]; /* monsym() */

    create_monster(tmpmons, game.coder.croom);

    if ((tmpmons.has_invent & CUSTOM_INVENT)
        && lua_type(invfn) === LUA_TFUNCTION) {
        /* nhl_pcall_handle(L, 0, 0, "lspo_monster", NHLpa_panic) */
        invfn();
        spo_end_moninvent();
    }

    return 0;
}

// C ref: sp_lev.c spo_end_moninvent()
function spo_end_moninvent() {
    if (invent_carrying_monster)
        m_dowear(invent_carrying_monster, TRUE);
    invent_carrying_monster = null;
}

// C ref: sp_lev.c create_trap()
/*
 * Create a trap in a room.
 */
function create_trap(t, croom) {
    const c = { x: -1, y: -1 };
    let mktrap_flags = MKTRAP_MAZEFLAG;

    if (t.type === VIBRATING_SQUARE) {
        pick_vibrasquare_location();
        maketrap(game.inv_pos.x, game.inv_pos.y, VIBRATING_SQUARE);
        return;
    } else if (croom) {
        get_free_room_loc(c, croom, t.coord);
    } else {
        let trycnt = 0;

        do {
            get_location_coord(c, DRY, croom, t.coord);
        } while ((game.level.at(c.x, c.y).typ === STAIRS
                  || game.level.at(c.x, c.y).typ === LADDER)
                 && ++trycnt <= 100);
        if (trycnt > 100)
            return;
    }

    if (!t.spider_on_web)
        mktrap_flags |= MKTRAP_NOSPIDERONWEB;
    if (t.seen)
        mktrap_flags |= MKTRAP_SEEN;
    if (t.novictim)
        mktrap_flags |= MKTRAP_NOVICTIM;

    const tm = { x: c.x, y: c.y };

    mktrap(t.type, mktrap_flags, null, tm);
}

// C ref: sp_lev.c trap_types[]
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
];

// C ref: sp_lev.c get_table_traptype_opt()
function get_table_traptype_opt(tbl, name, defval) {
    const trapstr = get_table_str_opt(tbl, name, '');
    let res = defval;

    if (trapstr) {
        for (const tt of trap_types)
            if (trapstr.toLowerCase() === tt.name) {
                res = tt.type;
                break;
            }
    }
    return res;
}

// C ref: sp_lev.c get_traptype_byname()
function get_traptype_byname(trapname) {
    for (const tt of trap_types)
        if (trapname.toLowerCase() === tt.name)
            return tt.type;

    return NO_TRAP;
}

// C ref: sp_lev.c lspo_trap()
/* trap({ type = "hole", x = 1, y = 1 }); */
/* trap({ type = "web", spider_on_web = 0 }); */
/* trap("hole", 3, 4); */
/* trap("level teleport", {5, 8}); */
/* trap("rust") */
/* trap(); */
export function lspo_trap(...args) {
    const tmptrap = {};
    let x, y;
    const argc = args.length;

    create_des_coder();

    tmptrap.spider_on_web = TRUE;
    tmptrap.seen = FALSE;
    tmptrap.novictim = FALSE;

    if (argc === 1 && lua_type(args[0]) === LUA_TSTRING) {
        const trapstr = luaL_checkstring(args[0]);

        tmptrap.type = get_traptype_byname(trapstr);
        x = y = -1;
    } else if (argc === 2 && lua_type(args[0]) === LUA_TSTRING
               && lua_type(args[1]) === 5 /* LUA_TTABLE */) {
        const trapstr = luaL_checkstring(args[0]);

        tmptrap.type = get_traptype_byname(trapstr);
        const c = get_coord(args[1]) || { x: -1, y: -1 };
        x = c.x;
        y = c.y;
    } else if (argc === 3) {
        const trapstr = luaL_checkstring(args[0]);

        tmptrap.type = get_traptype_byname(trapstr);
        x = luaL_checkinteger(args[1]);
        y = luaL_checkinteger(args[2]);
    } else {
        const tbl = lcheck_param_table(args);

        ({ x, y } = get_table_xy_or_coord(tbl));
        tmptrap.type = get_table_traptype_opt(tbl, 'type', -1);
        tmptrap.spider_on_web = get_table_boolean_opt(tbl, 'spider_on_web', 1);
        tmptrap.seen = get_table_boolean_opt(tbl, 'seen', FALSE);
        tmptrap.novictim = !get_table_boolean_opt(tbl, 'victim', TRUE);

        if (lua_type(tbl.launchfrom) === 5 /* LUA_TTABLE */) {
            const c = get_coord(tbl.launchfrom) || { x: -1, y: -1 };
            game.launchplace = { x: c.x, y: c.y };
        }

        if (lua_type(tbl.teledest) === 5 /* LUA_TTABLE */) {
            const c = get_coord(tbl.teledest) || { x: -1, y: -1 };
            game.launchplace = { x: c.x, y: c.y };
        }
    }

    if (tmptrap.type === NO_TRAP)
        nhl_error(null, 'Unknown trap type');

    if (x === -1 && y === -1)
        tmptrap.coord = SP_COORD_IS_RANDOM | 0; /* SP_COORD_PACK_RANDOM(0) */
    else
        tmptrap.coord = (x & 0xff) + ((y & 0xff) << 16); /* SP_COORD_PACK(x, y) */

    create_trap(tmptrap, game.coder.croom);
    game.launchplace = { x: 0, y: 0 };

    return 0;
}

// C ref: sp_lev.c get_table_int_or_random()
/* the hash key 'name' is an integer or "random",
   or if not existent, also return rndval */
function get_table_int_or_random(tbl, name, rndval) {
    const v = tbl[name];

    if (lua_type(v) === LUA_TNIL)
        return rndval;
    if (lua_type(v) !== LUA_TNUMBER
        && !(lua_type(v) === LUA_TSTRING && v.trim() !== '' && !isNaN(Number(v)))) {
        const tmp = lua_type(v) === LUA_TSTRING ? v : null;

        if (tmp && !strcmpi("random", tmp))
            return rndval;
        nhl_error(null, `Expected integer or "random" for "${name}", got `
                        + (tmp ? `"${tmp}"` : '<Null>'));
        /*NOTREACHED*/
        return 0;
    }
    return luaL_checkinteger(v);
}

// C ref: sp_lev.c get_table_buc()
function get_table_buc(tbl) {
    const bucs = [
        'random', 'blessed', 'uncursed', 'cursed',
        'not-cursed', 'not-uncursed', 'not-blessed',
    ];
    const bucs2i = [0, 1, 2, 3, 4, 5, 6, 0];
    const curse_state = bucs2i[get_table_option(tbl, 'buc', 'random', bucs)];

    return curse_state;
}

// C ref: sp_lev.c get_table_objclass()
/* the class character (C: its char code), or -1 */
export function get_table_objclass(tbl) {
    const s = get_table_str_opt(tbl, 'class', null);
    let ret = -1;

    if (s && s.length === 1)
        ret = s;
    return ret;
}

// C ref: sp_lev.c find_objtype()
/* find object otyp by text s (optionally considering oclass) */
function find_objtype(s, oclass) {
    if (s) {
        let i;
        let objname;
        let oc = def_char_to_objclass(oclass);

        /* In objects.h, some item classes are defined without prefixes
           (such as "scroll of ") in their names, making some names (such
           as "teleportation") ambiguous.  Get the object class if it is
           specified, and only return an object of the matching class. */
        const class_prefixes = [
            ['ring of ', RING_CLASS],
            ['potion of ', POTION_CLASS],
            ['scroll of ', SCROLL_CLASS],
            ['spellbook of ', SPBOOK_CLASS],
            ['wand of ', WAND_CLASS],
        ];

        if (oc === MAXOCLASSES)
            oc = 0;

        if (strstri(s, ' of ') >= 0) {
            for (const [p, pclass] of class_prefixes) {
                if (!strncmpi(s, p, p.length)) {
                    oc = pclass;
                    s = s.slice(p.length);
                    break;
                }
            }
        }

        /* find by object name */
        for (i = 0; i < NUM_OBJECTS; i++) {
            objname = OBJ_NAME(objects[i]);
            if ((!oc || oc === objects[i].oc_class)
                && objname && !strcmpi(s, objname))
                return i;
        }

        /* find by object description */
        for (i = 0; i < NUM_OBJECTS; i++) {
            objname = OBJ_DESCR(objects[i]);
            if (objname && !strcmpi(s, objname))
                return i;
        }

        nhl_error(null, 'Unknown object id');
    }
    return STRANGE_OBJECT;
}

// C ref: sp_lev.c get_table_objtype()
export function get_table_objtype(tbl) {
    const s = get_table_str_opt(tbl, 'id', null);
    const oclass = get_table_objclass(tbl);
    const ret = find_objtype(s, oclass);

    return ret;
}

// C ref: mkobj.c unbless(), uncurse() — the light-source and inventory
// updates are not needed during level creation
function unbless(otmp) { otmp.blessed = 0; }
function uncurse(otmp) { otmp.cursed = 0; }

// C ref: sp_lev.c create_object()
function create_object(o, croom) {
    let otmp;
    let c;
    const named = o.name ? TRUE : FALSE; /* has a name been supplied in level description? */
    const crd = { x: 0, y: 0 };

    get_location_coord(crd, DRY, croom, o.coord);
    const x = crd.x, y = crd.y;

    if (o.class !== -1) /* C: o->class >= 0 (a class char, or an
                           objects[].oc_class number set by lspo_object) */
        c = o.class;
    else
        c = 0;

    if (!c) {
        otmp = mkobj_at(RANDOM_CLASS, x, y, !named);
    } else if (o.id !== -1) {
        otmp = mksobj_at(o.id, x, y, TRUE, !named);
    } else {
        /*
         * The special levels are compiled with the default "text" object
         * class characters.  We must convert them to the internal format.
         */
        const oclass = def_char_to_objclass(c);

        if (oclass === MAXOCLASSES)
            panic(`create_object:  unexpected object class '${c}'`);

        /* KMH -- Create piles of gold properly */
        if (oclass === COIN_CLASS)
            otmp = mkgold(0, x, y);
        else
            otmp = mkobj_at(oclass, x, y, !named);
    }

    if (o.spe !== -127) /* That means NOT RANDOM! */
        otmp.spe = o.spe;

    switch (o.curse_state) {
    case 1: /* blessed */
        bless(otmp);
        break;
    case 2: /* uncursed */
        unbless(otmp);
        uncurse(otmp);
        break;
    case 3: /* cursed */
        curse(otmp);
        break;
    case 4: /* not cursed */
        uncurse(otmp);
        break;
    case 5: /* not uncursed */
        blessorcurse(otmp, 1);
        break;
    case 6: /* not blessed */
        unbless(otmp);
        break;
    default: /* random */
        break; /* keep what mkobj gave us */
    }

    /* corpsenm is "empty" if -1, random if -2, otherwise specific */
    if (o.corpsenm !== NON_PM) {
        if (o.corpsenm === NON_PM - 1)
            set_corpsenm(otmp, rndmonnum());
        else
            set_corpsenm(otmp, o.corpsenm);
    }
    /* set_corpsenm() took care of egg hatch and corpse timers */

    if (named) {
        otmp = oname(otmp, o.name, ONAME_LEVEL_DEF);
        if (otmp.otyp === SPE_NOVEL) {
            /* needs to be an existing title:
               (void) lookup_novel(o->name.str, &otmp->novelidx) */
            nhl_error(null, 'create_object: lookup_novel() is not ported yet');
        }
    }
    if (o.eroded) {
        if (o.eroded < 0) {
            otmp.oerodeproof = 1;
        } else {
            otmp.oeroded = (o.eroded % 4);
            otmp.oeroded2 = ((o.eroded >> 2) % 4);
        }
    } else {
        otmp.oeroded = otmp.oeroded2 = 0;
        otmp.oerodeproof = 0;
    }
    if (o.recharged)
        otmp.recharged = (o.recharged % 8);
    if (o.locked === 0 || o.locked === 1) {
        otmp.olocked = o.locked;
    } else if (o.broken) {
        otmp.obroken = 1;
        otmp.olocked = 0; /* obj generation may set */
    }
    if (o.trapped === 0 || o.trapped === 1)
        otmp.otrapped = o.trapped;
    if (o.trapped && (o.tknown === 0 || o.tknown === 1))
        otmp.tknown = o.tknown;
    otmp.greased = o.greased ? 1 : 0;

    if (o.quan > 0 && objects[otmp.otyp].oc_merge) {
        otmp.quan = o.quan;
        otmp.owt = weight(otmp);
    }

    /* contents (of a container or monster's inventory) */
    if ((o.containment & SP_OBJ_CONTENT) || invent_carrying_monster) {
        if (!container_idx) {
            if (!invent_carrying_monster) {
                /* don't complain, the monster may be gone legally */
                ; /* ['otmp' remains on floor] */
            } else {
                obj_extract_self(otmp); /* remove_object(otmp) */
                if (otmp.otyp === SADDLE && can_saddle(invent_carrying_monster))
                    put_saddle_on_mon(otmp, invent_carrying_monster);
                else
                    mpickobj(invent_carrying_monster, otmp);
            }
        } else {
            const cobj = container_obj[container_idx - 1];

            obj_extract_self(otmp); /* remove_object(otmp) */
            if (cobj) {
                otmp = add_to_container(cobj, otmp);
                cobj.owt = weight(cobj);
            } else {
                nhl_error(null, 'create_object: obfree() of an orphaned content object is not ported yet');
            }
        }
    }
    /* container */
    if (o.containment & SP_OBJ_CONTAINER) {
        otmp.cobj = null; /* delete_contents() */
        if (container_idx < MAX_CONTAINMENT) {
            container_obj[container_idx] = otmp;
            container_idx++;
        } else
            impossible('create_object: too deeply nested containers.');
    }

    /* Medusa level special case: statues are petrified monsters, so they
     * are not stone-resistant and have monster inventory.  They also lack
     * other contents, but that can be specified as an empty container.
     */
    if (o.id === STATUE && Is_medusa_level(game.u.uz) && o.corpsenm === NON_PM) {
        let was = null;
        let wastyp;
        let i = 0; /* prevent endless loop in case makemon always fails */

        /* Named random statues are of player types, and aren't stone-
         * resistant (if they were, we'd have to reset the name as well as
         * setting corpsenm).
         */
        for (wastyp = otmp.corpsenm; i < 1000; i++, wastyp = rndmonnum()) {
            /* makemon without rndmonst() might create a group */
            was = makemon(mons[wastyp], 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
            if (was) {
                if (!Resists_Elem(was, STONE_RES) /* resists_ston() */
                    && !poly_when_stoned(mons[wastyp])) {
                    propagate(wastyp, TRUE, FALSE);
                    break;
                }
                mongone(was);
                was = null;
            }
        }
        if (was) {
            set_corpsenm(otmp, wastyp);
            /* C takes the head of the minvent chain, its newest object:
               the last one of the JS array (oldest first) */
            while (was.minvent && was.minvent.length) {
                const obj = was.minvent[was.minvent.length - 1];
                obj.owornmask = 0;
                obj_extract_self(obj);
                add_to_container(otmp, obj);
            }
            otmp.owt = weight(otmp);
            mongone(was);
        }
    }

    if (o.achievement) {
        const prize_warning = 'multiple prizes on %s level';
        const topo = game.dungeon_topology;

        if (!game.context) game.context = {};
        if (!game.context.achieveo)
            game.context.achieveo = { mines_prize_oid: 0, mines_prize_otyp: 0,
                                      soko_prize_oid: 0, soko_prize_otyp: 0 };
        const achieveo = game.context.achieveo;
        if (on_level(game.u.uz, topo.d_mineend_level)) { /* Is_mineend_level() */
            if (!achieveo.mines_prize_oid) {
                achieveo.mines_prize_oid = otmp.o_id;
                achieveo.mines_prize_otyp = otmp.otyp;
                /* prevent stacking; cleared when achievement is recorded;
                   will be reset in addinv_core1() */
                otmp.nomerge = 1;
            } else {
                impossible(prize_warning.replace('%s', 'mines end'));
            }
        } else if (on_level(game.u.uz, topo.d_sokoend_level)) { /* Is_sokoend_level() */
            if (!achieveo.soko_prize_oid) {
                achieveo.soko_prize_oid = otmp.o_id;
                achieveo.soko_prize_otyp = otmp.otyp;
                otmp.nomerge = 1; /* redundant; Sokoban prizes don't stack;
                                   * will be reset in addinv_core1() */
            } else {
                impossible(prize_warning.replace('%s', 'sokoban end'));
            }
        } else {
            impossible('create_object: unknown achievement');
        }
    }

    if (!(o.containment & SP_OBJ_CONTENT)) {
        /* stackobj(otmp): floor object chains are not ported yet, so
           there is no pile to merge with */

        if (o.lit)
            nhl_error(null, 'create_object: begin_burn() is not ported yet');

        if (o.buried) {
            const dealloced = { v: false };

            bury_an_obj(otmp, dealloced);
            if (dealloced.v) {
                if (container_idx)
                    container_obj[container_idx - 1] = null;
                otmp = null;
            }
        }
    }
    return otmp;
}

// C ref: dungeon.h Is_medusa_level()
function Is_medusa_level(lev) {
    const z = game.dungeon_topology?.d_medusa_level;
    return !!(z && (z.dlevel || z.dnum) && lev.dnum === z.dnum
              && lev.dlevel === z.dlevel);
}

// C ref: sp_lev.c spo_pop_container()
function spo_pop_container() {
    if (container_idx > 0) {
        container_idx--;
        container_obj[container_idx] = null;
    }
}

// C ref: sp_lev.c lspo_object()
/* object(); */
/* object("sack"); */
/* object("scimitar", 6,7); */
/* object("scimitar", {6,7}); */
/* object({ class = "%" }); */
/* object({ id = "boulder", x = 03, y = 12}); */
/* object({ id = "boulder", coord = {03,12} }); */
export function lspo_object(...args) {
    let quancnt;
    const tmpobj = {
        name: null, corpsenm: 0, id: 0, spe: 0, coord: 0, x: 0, y: 0,
        class: 0, containment: 0, curse_state: 0, quan: 0, buried: 0,
        lit: 0, eroded: 0, locked: 0, trapped: 0, tknown: 0, recharged: 0,
        invis: 0, greased: 0, broken: 0, achievement: 0,
    };
    let ox = -1, oy = -1;
    const argc = args.length;
    let maybe_contents = 0;
    let otmp = null;
    let contents = null;

    create_des_coder();

    tmpobj.name = null;
    tmpobj.spe = -127;
    tmpobj.quan = -1;
    tmpobj.trapped = -1;
    tmpobj.tknown = -1;
    tmpobj.locked = -1;
    tmpobj.corpsenm = NON_PM;

    const from_paramstr = (paramstr) => {
        if (paramstr.length === 1) {
            tmpobj.class = paramstr;
            tmpobj.id = STRANGE_OBJECT;
        } else {
            tmpobj.class = -1;
            tmpobj.id = find_objtype(paramstr, -1);
        }
    };

    if (argc === 1 && lua_type(args[0]) === LUA_TSTRING) {
        from_paramstr(luaL_checkstring(args[0]));
    } else if (argc === 2 && lua_type(args[0]) === LUA_TSTRING
               && lua_type(args[1]) === LUA_TTABLE) {
        const paramstr = luaL_checkstring(args[0]);
        const crd = get_coord(args[1]);
        if (crd)
            ox = crd.x, oy = crd.y;
        from_paramstr(paramstr);
    } else if (argc === 3 && lua_type(args[1]) === LUA_TNUMBER
               && lua_type(args[2]) === LUA_TNUMBER) {
        const paramstr = luaL_checkstring(args[0]);

        ox = luaL_checkinteger(args[1]);
        oy = luaL_checkinteger(args[2]);
        from_paramstr(paramstr);
    } else {
        if (args.length < 1)
            args[0] = {}; /* lcheck_param_table(): lua_createtable() */
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        tmpobj.spe = get_table_int_or_random(tbl, 'spe', -127);
        tmpobj.curse_state = get_table_buc(tbl);
        tmpobj.corpsenm = NON_PM;
        tmpobj.name = get_table_str_opt(tbl, 'name', null);
        tmpobj.quan = get_table_int_or_random(tbl, 'quantity', -1);
        tmpobj.buried = get_table_boolean_opt(tbl, 'buried', 0);
        tmpobj.lit = get_table_boolean_opt(tbl, 'lit', 0);
        tmpobj.eroded = get_table_int_opt(tbl, 'eroded', 0);
        tmpobj.locked = get_table_boolean_opt(tbl, 'locked', -1);
        tmpobj.trapped = get_table_boolean_opt(tbl, 'trapped', -1);
        tmpobj.tknown = get_table_boolean_opt(tbl, 'trap_known', -1);
        tmpobj.recharged = get_table_int_opt(tbl, 'recharged', 0);
        tmpobj.greased = get_table_boolean_opt(tbl, 'greased', 0);
        tmpobj.broken = get_table_boolean_opt(tbl, 'broken', 0);
        tmpobj.achievement = get_table_boolean_opt(tbl, 'achievement', 0);

        const xy = get_table_xy_or_coord(tbl);
        ox = xy.x, oy = xy.y;

        tmpobj.id = get_table_objtype(tbl);
        tmpobj.class = get_table_objclass(tbl);
        maybe_contents = 1;
    }

    if (ox === -1 && oy === -1)
        tmpobj.coord = SP_COORD_PACK_RANDOM(0);
    else
        tmpobj.coord = SP_COORD_PACK(ox, oy);

    if (tmpobj.class === -1 && tmpobj.id > STRANGE_OBJECT)
        tmpobj.class = objects[tmpobj.id].oc_class;
    else if (tmpobj.class !== -1 && tmpobj.id === STRANGE_OBJECT)
        tmpobj.id = -1;

    if (tmpobj.id === STATUE || tmpobj.id === EGG
        || tmpobj.id === CORPSE || tmpobj.id === TIN
        || tmpobj.id === FIGURINE) {
        let pm = null;
        let nonpmobj = FALSE;
        const montype = (lua_type(args[0]) === LUA_TTABLE)
            ? get_table_str_opt(args[0], 'montype', null) : null;

        if (montype) {
            if ((tmpobj.id === TIN && (!strcmpi(montype, 'spinach')
                /* id="tin",montype="empty" produces an empty tin */
                                       || !strcmpi(montype, 'empty')))
                /* id="egg",montype="empty" produces a generic, unhatchable
                   egg rather than an "empty egg" */
                || (tmpobj.id === EGG && !strcmpi(montype, 'empty'))) {
                tmpobj.corpsenm = NON_PM;
                tmpobj.spe = !strcmpi(montype, 'spinach') ? 1 : 0;
                nonpmobj = TRUE;
            } else if (montype.length === 1
                       && def_char_to_monclass(montype) !== MAXMCLASSES) {
                pm = mkclass(def_char_to_monclass(montype),
                             G_NOGEN | G_IGNORE);
            } else {
                for (let i = LOW_PM; i < NUMMONS; i++)
                    if (!strcmpi(mons[i].pmnames[NEUTRAL], montype)
                        || (mons[i].pmnames[MALE]
                            && !strcmpi(mons[i].pmnames[MALE], montype))
                        || (mons[i].pmnames[FEMALE]
                            && !strcmpi(mons[i].pmnames[FEMALE], montype))) {
                        pm = mons[i];
                        break;
                    }
            }
            if (pm)
                tmpobj.corpsenm = monsndx(pm);
            else if (!nonpmobj)
                nhl_error(null, 'Unknown montype');
        }
        if (tmpobj.id === STATUE || tmpobj.id === CORPSE) {
            let lflags = 0;

            if (get_table_boolean_opt(args[0], 'historic', 0))
                lflags |= CORPSTAT_HISTORIC;
            if (get_table_boolean_opt(args[0], 'male', 0))
                lflags |= CORPSTAT_MALE;
            if (get_table_boolean_opt(args[0], 'female', 0))
                lflags |= CORPSTAT_FEMALE;
            tmpobj.spe = lflags;
        } else if (tmpobj.id === EGG) {
            tmpobj.spe = get_table_boolean_opt(args[0], 'laid_by_you', 0) ? 1 : 0;
        } else if (!nonpmobj) { /* tmpobj.spe is already set for nonpmobj */
            tmpobj.spe = 0;
        }
    }

    quancnt = (tmpobj.id > STRANGE_OBJECT) ? tmpobj.quan : 0;

    if (container_idx)
        tmpobj.containment |= SP_OBJ_CONTENT;

    if (maybe_contents) {
        contents = args[0].contents;
        if (lua_type(contents) !== LUA_TNIL)
            tmpobj.containment |= SP_OBJ_CONTAINER;
    }

    do {
        otmp = create_object(tmpobj, game.coder.croom);
        quancnt--;
    } while ((quancnt > 0) && ((tmpobj.id > STRANGE_OBJECT)
                               && !objects[tmpobj.id].oc_merge));

    if (lua_type(contents) === LUA_TFUNCTION) {
        /* nhl_pcall_handle(L, 1, 0, "lspo_object", NHLpa_panic) */
        const saved = game.lua_des_caller;
        game.lua_des_caller = 'object';
        try {
            contents(nhl_push_obj(otmp));
        } finally {
            game.lua_des_caller = saved;
        }
    }

    if ((tmpobj.containment & SP_OBJ_CONTAINER) !== 0)
        spo_pop_container();

    return nhl_push_obj(otmp);
}

// C ref: sp_lev.c lspo_gold()
/* gold(500, 3,5); */
/* gold(500, {5, 6}); */
/* gold({ amount = 500, x = 2, y = 5 });*/
/* gold({ amount = 500, coord = {2, 5} });*/
/* gold(); */
export function lspo_gold(...args) {
    const argc = args.length;
    let x, y;
    let amount;
    let gcoord;
    let gldx, gldy;

    create_des_coder();

    if (argc === 3) {
        amount = luaL_checkinteger(args[0]);
        x = gldx = luaL_checkinteger(args[1]);
        y = gldy = luaL_checkinteger(args[2]);
    } else if (argc === 2 && lua_type(args[1]) === LUA_TTABLE) {
        amount = luaL_checkinteger(args[0]);
        /* (void) get_coord(L, 2, &gldx, &gldy) */
        const c = get_coord(args[1]);
        if (c) {
            gldx = c.x;
            gldy = c.y;
        }
        x = gldx;
        y = gldy;
    } else if (argc === 0 || (argc === 1 && lua_type(args[0]) === LUA_TTABLE)) {
        const tbl = lcheck_param_table(args);

        amount = get_table_int_opt(tbl, 'amount', -1);
        ({ x: gldx, y: gldy } = get_table_xy_or_coord(tbl));
        x = gldx, y = gldy;
    } else {
        nhl_error(null, 'Wrong parameters');
        /*NOTREACHED*/
        return 0;
    }

    if (x === -1 && y === -1)
        gcoord = SP_COORD_PACK_RANDOM(0);
    else
        gcoord = SP_COORD_PACK(gldx, gldy);

    const c = { x, y };
    get_location_coord(c, DRY, game.coder.croom, gcoord);
    if (amount < 0)
        amount = rnd(200);
    mkgold(amount, c.x, c.y);

    return 0;
}

// C ref: sp_lev.c lspo_exclusion()
/* exclusion({ type = "teleport", region = { x1,y1, x2,y2 } }); */
export function lspo_exclusion(tbl) {
    const ez_types = [
        'teleport', 'teleport-up', 'teleport-down', 'monster-generation',
    ];
    const ez_types2i = [LR_TELE, LR_UPTELE, LR_DOWNTELE, LR_MONGEN, 0];
    const ez = {};

    create_des_coder();
    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */
    ez.zonetype = ez_types2i[get_table_option(tbl, 'type', 'teleport',
                                              ez_types)];
    const r = get_table_region(tbl, 'region', FALSE);

    const a = { x: r.x1, y: r.y1 };
    const b = { x: r.x2, y: r.y2 };

    get_location_coord(a, ANY_LOC | NO_LOC_WARN, game.coder.croom,
                       SP_COORD_PACK(a.x, a.y));
    get_location_coord(b, ANY_LOC | NO_LOC_WARN, game.coder.croom,
                       SP_COORD_PACK(b.x, b.y));

    ez.lx = a.x;
    ez.ly = a.y;
    ez.hx = b.x;
    ez.hy = b.y;

    ez.next = game.exclusion_zones || null;
    game.exclusion_zones = ez;
    return 0;
}

// C ref: sp_lev.c cvt_to_abscoord()
/* turn a coordinate relative to the current map or room into an absolute
   svl.level.locations coordinate */
export function cvt_to_abscoord(c) {
    if (game.coder && game.coder.croom) {
        c.x += game.coder.croom.lx;
        c.y += game.coder.croom.ly;
    } else {
        c.x += game.xstart;
        c.y += game.ystart;
    }
}

// C ref: sp_lev.c cvt_to_relcoord()
/* inverse of cvt_to_abscoord; turn an absolute svl.level.locations coordinate
 * into one relative to the current map or room. */
export function cvt_to_relcoord(c) {
    if (game.coder && game.coder.croom) {
        c.x -= game.coder.croom.lx;
        c.y -= game.coder.croom.ly;
    } else {
        c.x -= game.xstart;
        c.y -= game.ystart;
    }
}

// C ref: sp_lev.c lspo_engraving()
/* engraving({ x = 1, y = 1, type="burn", text="Foo" }); */
/* engraving({ coord={1, 1}, type="burn", text="Foo" }); */
/* engraving({x,y}, "engrave", "Foo"); */
export function lspo_engraving(...args) {
    const engrtypes = ['dust', 'engrave', 'burn', 'mark', 'blood'];
    const engrtypes2i = [DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, 0];
    let etyp = DUST;
    let txt = null;
    let ecoord;
    let x = -1, y = -1;
    const argc = args.length;
    let guardobjs = FALSE;
    let wipeout = TRUE;

    create_des_coder();

    if (argc === 1) {
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        ({ x, y } = get_table_xy_or_coord(tbl));
        etyp = engrtypes2i[get_table_option(tbl, 'type', 'engrave', engrtypes)];
        txt = get_table_str(tbl, 'text');
        wipeout = get_table_boolean_opt(tbl, 'degrade', TRUE);
        guardobjs = get_table_boolean_opt(tbl, 'guardobjects', FALSE);
    } else if (argc === 3) {
        const c = get_coord(args[0]);
        x = c ? c.x : 0;
        y = c ? c.y : 0;
        etyp = engrtypes2i[luaL_checkoption(args[1], 'engrave', engrtypes)];
        txt = luaL_checkstring(args[2]);
    } else {
        nhl_error(null, 'Wrong parameters');
    }

    if (x === -1 && y === -1)
        ecoord = SP_COORD_PACK_RANDOM(0);
    else
        ecoord = SP_COORD_PACK(x, y);

    const c = { x, y };
    get_location_coord(c, DRY, game.coder.croom, ecoord);
    x = c.x, y = c.y;
    make_engr_at(x, y, txt, null, 0, etyp);
    const ep = engr_at(x, y);
    if (ep) {
        ep.guardobjects = guardobjs;
        ep.nowipeout = !wipeout;
    }
    return 0;
}

// ── Special level loading (C ref: sp_lev.c load_special() and helpers) ──

// SpLev_Map[x][y] (sp_lev.c static char SpLev_Map[COLNO][ROWNO])
function SpLev_Map_at(x, y) {
    return (game.SpLev_Map && game.SpLev_Map[x] && game.SpLev_Map[x][y]) ? 1 : 0;
}
function SpLev_Map_set(x, y) {
    if (!game.SpLev_Map) game.SpLev_Map = [];
    if (!game.SpLev_Map[x]) game.SpLev_Map[x] = [];
    game.SpLev_Map[x][y] = 1;
}

// C ref: sp_lev.c solidify_map()
function solidify_map() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (IS_STWALL(game.level.at(x, y).typ) && !SpLev_Map_at(x, y))
                game.level.at(x, y).wall_info |= (W_NONDIGGABLE | W_NONPASSWALL);
}

// C ref: trap.c undestroyable_trap()
function undestroyable_trap(ttyp) {
    return (ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE);
}

// C ref: sp_lev.c map_cleanup()
/* do a post-level-creation cleanup of map, such as
   removing boulders and traps from lava */
function map_cleanup() {
    let otmp, ttmp, etmp;

    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const typ = game.level.at(x, y).typ;

            if (IS_LAVA(typ) || IS_POOL(typ)) {
                /* in case any boulders are on liquid, delete them */
                while ((otmp = sobj_at(BOULDER, x, y)) !== null) {
                    obj_extract_self(otmp);
                    /* obfree(otmp, (struct obj *) 0): garbage collected */
                }

                /* traps on liquid? */
                if (((ttmp = t_at(x, y)) !== null)
                    && !undestroyable_trap(ttmp.ttyp))
                    deltrap(ttmp);

                /* engravings? */
                if ((etmp = engr_at(x, y)) !== null)
                    del_engr(etmp);
            }
        }
}

// C ref: sp_lev.c lvlfill_maze_grid()
function lvlfill_maze_grid(x1, y1, x2, y2, filling) {
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            if (game.level.flags.corrmaze)
                game.level.at(x, y).typ = STONE;
            else
                game.level.at(x, y).typ = (y < 2 || ((x % 2) && (y % 2)))
                    ? STONE : filling;
        }
}

// C ref: sp_lev.c lvlfill_solid()
function lvlfill_solid(filling, lit) {
    for (let x = 2; x <= game.x_maze_max; x++)
        for (let y = 0; y <= game.y_maze_max; y++) {
            if (!set_levltyp_lit(x, y, filling, lit))
                continue;
            /* TODO: consolidate this w lspo_map ? */
            const lev = game.level.at(x, y);
            lev.flags = 0;
            lev.horizontal = false;
            lev.roomno = 0;
            lev.edge = false;
        }
}

// C ref: sp_lev.c lvlfill_swamp()
function lvlfill_swamp(fg, bg, lit) {
    const levl = (x, y) => game.level.at(x, y);

    lvlfill_solid(bg, lit);

    /* "relaxed blockwise maze" algorithm, Jamis Buck */
    for (let x = 2; x <= Math.min(game.x_maze_max, COLNO - 2); x += 2)
        for (let y = 0; y <= Math.min(game.y_maze_max, ROWNO - 2); y += 2) {
            let c = 0;

            set_levltyp_lit(x, y, fg, lit);
            if (levl(x + 1, y).typ === bg)
                ++c;
            if (levl(x, y + 1).typ === bg)
                ++c;
            if (levl(x + 1, y + 1).typ === bg)
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

// C ref: sp_lev.c flip_dbridge_horizontal()
function flip_dbridge_horizontal(lev) {
    if (IS_DRAWBRIDGE(lev.typ)) {
        if ((lev.drawbridgemask & DB_DIR) === DB_WEST) {
            lev.drawbridgemask &= ~DB_WEST;
            lev.drawbridgemask |=  DB_EAST;
        } else if ((lev.drawbridgemask & DB_DIR) === DB_EAST) {
            lev.drawbridgemask &= ~DB_EAST;
            lev.drawbridgemask |=  DB_WEST;
        }
    }
}

// C ref: sp_lev.c flip_dbridge_vertical()
function flip_dbridge_vertical(lev) {
    if (IS_DRAWBRIDGE(lev.typ)) {
        if ((lev.drawbridgemask & DB_DIR) === DB_NORTH) {
            lev.drawbridgemask &= ~DB_NORTH;
            lev.drawbridgemask |=  DB_SOUTH;
        } else if ((lev.drawbridgemask & DB_DIR) === DB_SOUTH) {
            lev.drawbridgemask &= ~DB_SOUTH;
            lev.drawbridgemask |=  DB_NORTH;
        }
    }
}

// C ref: hacklib.c swapbits()
function swapbits(val, bita, bitb) {
    const tmp = ((val >> bita) & 1) ^ ((val >> bitb) & 1);

    return (val ^ ((tmp << bita) | (tmp << bitb)));
}

// C ref: sp_lev.c flip_encoded_dir_bits()
/* transpose an encoded direction */
function flip_encoded_dir_bits(flp, val) {
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

// C ref: sp_lev.c flip_level()
/* transpose top with bottom or left with right or both; sometimes called
   for new special levels, or for any level via the #wizfliplevel command */
export function flip_level(flp, extras) {
    let itmp;

    /* nothing to do unless (flp & 1) or (flp & 2) or both */
    if ((flp & 3) === 0)
        return;

    let { xmin: minx, ymin: miny, xmax: maxx, ymax: maxy } = get_level_extends();
    /* get_level_extends() returns -1,-1 to COLNO,ROWNO at max */
    if (miny < 0)
        miny = 0;
    if (minx < 1)
        minx = 1;
    if (maxx >= COLNO)
        maxx = (COLNO - 1);
    if (maxy >= ROWNO)
        maxy = (ROWNO - 1);

    const FlipX = (val) => ((maxx - val) + minx);
    const FlipY = (val) => ((maxy - val) + miny);
    const inFlipArea = (x, y) => (x >= minx && x <= maxx && y >= miny && y <= maxy);
    const Flip_coord = (cc) => {
        if (cc && cc.x && inFlipArea(cc.x, cc.y)) {
            if (flp & 1)
                cc.y = FlipY(cc.y);
            if (flp & 2)
                cc.x = FlipX(cc.x);
        }
    };

    if (extras)
        throw new Error('flip_level(): #wizfliplevel extras not ported yet');

    /* stairs and ladders */
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (flp & 1)
            stway.sy = FlipY(stway.sy);
        if (flp & 2)
            stway.sx = FlipX(stway.sx);
    }

    /* traps */
    for (const ttmp of (game.level.traps || [])) {
        if (!inFlipArea(ttmp.tx, ttmp.ty))
            continue;
        if (flp & 1) {
            ttmp.ty = FlipY(ttmp.ty);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                ttmp.launch.y = FlipY(ttmp.launch.y);
                ttmp.launch2.y = FlipY(ttmp.launch2.y);
            } else if (is_pit(ttmp.ttyp) && ttmp.conjoined) {
                ttmp.conjoined = flip_encoded_dir_bits(flp, ttmp.conjoined);
            }
        }
        if (flp & 2) {
            ttmp.tx = FlipX(ttmp.tx);
            if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
                ttmp.launch.x = FlipX(ttmp.launch.x);
                ttmp.launch2.x = FlipX(ttmp.launch2.x);
            } else if (is_pit(ttmp.ttyp) && ttmp.conjoined) {
                ttmp.conjoined = flip_encoded_dir_bits(flp, ttmp.conjoined);
            }
        }
    }

    /* objects */
    for (const otmp of (game.level.objects || [])) {
        if (!inFlipArea(otmp.ox, otmp.oy))
            continue;
        if (flp & 1)
            otmp.oy = FlipY(otmp.oy);
        if (flp & 2)
            otmp.ox = FlipX(otmp.ox);
    }

    /* buried objects */
    for (const otmp of (game.level.buriedobjlist || [])) {
        if (!inFlipArea(otmp.ox, otmp.oy))
            continue;
        if (flp & 1)
            otmp.oy = FlipY(otmp.oy);
        if (flp & 2)
            otmp.ox = FlipX(otmp.ox);
    }

    /* monsters */
    for (const mtmp of (game.level.monsters || [])) {
        if (mtmp.dead)
            continue;
        if (mtmp.isgd) {
            if (mtmp.mx === 0) /* not on map so don't flip guard->mx,my */
                continue;
        }
        /* skip the occasional earth elemental outside the flip area */
        if (!inFlipArea(mtmp.mx, mtmp.my))
            continue;
        if (flp & 1)
            mtmp.my = FlipY(mtmp.my);
        if (flp & 2)
            mtmp.mx = FlipX(mtmp.mx);

        Flip_coord(mtmp.mgoal);

        if (mtmp.ispriest) {
            Flip_coord(mtmp.mextra?.epri?.shrpos);
        } else if (mtmp.isshk) {
            Flip_coord(mtmp.mextra?.eshk?.shk); /* shk's preferred spot */
            Flip_coord(mtmp.mextra?.eshk?.shd); /* shop door */
        } else if (mtmp.wormno) {
            if (flp & 1)
                flip_worm_segs_vertical(mtmp, miny, maxy);
            if (flp & 2)
                flip_worm_segs_horizontal(mtmp, minx, maxx);
        }
    }

    /* engravings */
    for (let etmp = game.level.head_engr || null; etmp; etmp = etmp.nxt_engr) {
        if (flp & 1)
            etmp.engr_y = FlipY(etmp.engr_y);
        if (flp & 2)
            etmp.engr_x = FlipX(etmp.engr_x);
    }

    /* level (teleport) regions */
    for (const lr of (game.lregions || [])) {
        if (flp & 1) {
            lr.inarea.y1 = FlipY(lr.inarea.y1);
            lr.inarea.y2 = FlipY(lr.inarea.y2);
            if (lr.inarea.y1 > lr.inarea.y2) {
                itmp = lr.inarea.y1;
                lr.inarea.y1 = lr.inarea.y2;
                lr.inarea.y2 = itmp;
            }

            lr.delarea.y1 = FlipY(lr.delarea.y1);
            lr.delarea.y2 = FlipY(lr.delarea.y2);
            if (lr.delarea.y1 > lr.delarea.y2) {
                itmp = lr.delarea.y1;
                lr.delarea.y1 = lr.delarea.y2;
                lr.delarea.y2 = itmp;
            }
        }
        if (flp & 2) {
            lr.inarea.x1 = FlipX(lr.inarea.x1);
            lr.inarea.x2 = FlipX(lr.inarea.x2);
            if (lr.inarea.x1 > lr.inarea.x2) {
                itmp = lr.inarea.x1;
                lr.inarea.x1 = lr.inarea.x2;
                lr.inarea.x2 = itmp;
            }

            lr.delarea.x1 = FlipX(lr.delarea.x1);
            lr.delarea.x2 = FlipX(lr.delarea.x2);
            if (lr.delarea.x1 > lr.delarea.x2) {
                itmp = lr.delarea.x1;
                lr.delarea.x1 = lr.delarea.x2;
                lr.delarea.x2 = itmp;
            }
        }
    }

    /* regions (poison clouds, etc) */
    for (const reg of (game.level.regions || [])) {
        let tmp1, tmp2;
        if (flp & 1) {
            tmp1 = FlipY(reg.bounding_box.ly);
            tmp2 = FlipY(reg.bounding_box.hy);
            reg.bounding_box.ly = Math.min(tmp1, tmp2);
            reg.bounding_box.hy = Math.max(tmp1, tmp2);
            for (let j = 0; j < reg.nrects; j++) {
                tmp1 = FlipY(reg.rects[j].ly);
                tmp2 = FlipY(reg.rects[j].hy);
                reg.rects[j].ly = Math.min(tmp1, tmp2);
                reg.rects[j].hy = Math.max(tmp1, tmp2);
            }
        }
        if (flp & 2) {
            tmp1 = FlipX(reg.bounding_box.lx);
            tmp2 = FlipX(reg.bounding_box.hx);
            reg.bounding_box.lx = Math.min(tmp1, tmp2);
            reg.bounding_box.hx = Math.max(tmp1, tmp2);
            for (let j = 0; j < reg.nrects; j++) {
                tmp1 = FlipX(reg.rects[j].lx);
                tmp2 = FlipX(reg.rects[j].hx);
                reg.rects[j].lx = Math.min(tmp1, tmp2);
                reg.rects[j].hx = Math.max(tmp1, tmp2);
            }
        }
    }

    /* rooms */
    const flip_room = (sroom) => {
        if (flp & 1) {
            sroom.ly = FlipY(sroom.ly);
            sroom.hy = FlipY(sroom.hy);
            if (sroom.ly > sroom.hy) {
                itmp = sroom.ly;
                sroom.ly = sroom.hy;
                sroom.hy = itmp;
            }
        }
        if (flp & 2) {
            sroom.lx = FlipX(sroom.lx);
            sroom.hx = FlipX(sroom.hx);
            if (sroom.lx > sroom.hx) {
                itmp = sroom.lx;
                sroom.lx = sroom.hx;
                sroom.hx = itmp;
            }
        }
    };
    for (let ri = 0; ; ri++) {
        const sroom = game.level.rooms[ri];
        if (!sroom || sroom.hx < 0)
            break;

        flip_room(sroom);

        if (sroom.nsubrooms)
            for (let i = 0; i < sroom.nsubrooms; i++)
                flip_room(sroom.sbrooms[i]);
    }

    /* doors */
    for (let i = 0; i < game.level.doorindex; i++) {
        Flip_coord(game.level.doors[i]);
    }

    /* the map (objects and monsters are kept in lists with their own
       coordinates, flipped above; C's level.objects[][] and
       level.monsters[][] are per-square lookups of those) */
    const locs = game.level.locations;
    if (flp & 1) {
        for (let x = minx; x <= maxx; x++)
            for (let y = miny; y < (miny + Math.trunc((maxy - miny + 1) / 2)); y++) {
                const ny = FlipY(y);

                flip_dbridge_vertical(locs[x][y]);
                flip_dbridge_vertical(locs[x][ny]);

                const trm = locs[x][y];
                locs[x][y] = locs[x][ny];
                locs[x][ny] = trm;
            }
    }
    if (flp & 2) {
        for (let x = minx; x < (minx + Math.trunc((maxx - minx + 1) / 2)); x++)
            for (let y = miny; y <= maxy; y++) {
                const nx = FlipX(x);

                flip_dbridge_horizontal(locs[x][y]);
                flip_dbridge_horizontal(locs[nx][y]);

                const trm = locs[x][y];
                locs[x][y] = locs[nx][y];
                locs[nx][y] = trm;
            }
    }
    /* level.monsters[][] cells holding long worm tail segments */
    flip_wseg_cells(flp, minx, miny, maxx, maxy);

    /* timed effects: MELT_ICE_AWAY level timers are kept on the location
       (levl[x][y].timer, see nhlua.js), so they moved with the map */

    /* exclusion zones */
    for (let ez = game.exclusion_zones; ez; ez = ez.next) {
        if (flp & 1) {
            ez.ly = FlipY(ez.ly);
            ez.hy = FlipY(ez.hy);
            if (ez.ly > ez.hy) {
                itmp = ez.ly;
                ez.ly = ez.hy;
                ez.hy = itmp;
            }
        }
        if (flp & 2) {
            ez.lx = FlipX(ez.lx);
            ez.hx = FlipX(ez.hx);
            if (ez.lx > ez.hx) {
                itmp = ez.lx;
                ez.lx = ez.hx;
                ez.hx = itmp;
            }
        }
    }

    fix_wall_spines(1, 0, COLNO - 1, ROWNO - 1);
    vision_reset();
}

// C ref: sp_lev.c flip_level_rnd()
/* randomly transpose top with bottom or left with right or both;
   caller controls which transpositions are allowed */
export function flip_level_rnd(flp, extras) {
    let c = 0;

    if ((flp & 1) && rn2(2))
        c |= 1;
    if ((flp & 2) && rn2(2))
        c |= 2;

    if (c)
        flip_level(c, extras);
}

// C ref: sp_lev.c sel_set_wall_property()
function sel_set_wall_property(x, y, arg) {
    const prop = arg;
    const lev = game.level.at(x, y);

    if (IS_STWALL(lev.typ) || lev.typ === TREE
        /* 3.6.2: made iron bars eligible to be flagged nondiggable
           (checked by chewing(hack.c) and zap_over_floor(zap.c)) */
        || lev.typ === IRONBARS)
        lev.wall_info |= prop;
}

// C ref: sp_lev.c set_wall_property()
/*
 * Make walls of the area (x1, y1, x2, y2) non diggable/non passwall-able
 */
function set_wall_property(x1, y1, x2, y2, prop) {
    for (let y = Math.max(y1, 0); y <= Math.min(y2, ROWNO - 1); y++)
        for (let x = Math.max(x1, 1); x <= Math.min(x2, COLNO - 1); x++)
            sel_set_wall_property(x, y, prop);
}

// C ref: sp_lev.c remove_boundary_syms()
function remove_boundary_syms() {
    /*
     * If any CROSSWALLs are found, must change to ROOM after REGION's
     * are laid out.  CROSSWALLS are used to specify "invisible"
     * boundaries where DOOR syms look bad or aren't desirable.
     */
    let has_bounds = FALSE;

    for (let x = 0; x < COLNO - 1; x++)
        for (let y = 0; y < ROWNO - 1; y++)
            if (game.level.at(x, y).typ === CROSSWALL) {
                has_bounds = TRUE;
                break;
            }
    if (has_bounds) {
        for (let x = 0; x < game.x_maze_max; x++)
            for (let y = 0; y < game.y_maze_max; y++)
                if ((game.level.at(x, y).typ === CROSSWALL) && SpLev_Map_at(x, y))
                    game.level.at(x, y).typ = ROOM;
    }
}

// C ref: sp_lev.c link_doors_rooms()
function link_doors_rooms() {
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++)
            if (IS_DOOR(game.level.at(x, y).typ) || game.level.at(x, y).typ === SDOOR) {
                /* in case this door was a '+' or 'S' from the
                   MAP...ENDMAP section without an explicit DOOR
                   directive, set/clear levl[][].horizontal for it */
                set_door_orientation(x, y);

                for (let tmpi = 0; tmpi < game.level.nroom; tmpi++) {
                    maybe_add_door(x, y, game.level.rooms[tmpi]);
                    for (let m = 0; m < game.level.rooms[tmpi].nsubrooms; m++) {
                        maybe_add_door(x, y, game.level.rooms[tmpi].sbrooms[m]);
                    }
                }
            }
}

// C ref: sp_lev.c wallify_map()
export function wallify_map(x1, y1, x2, y2) {
    let xx, yy, lo_xx, lo_yy, hi_xx, hi_yy;
    const levl = (x, y) => game.level.at(x, y);

    y1 = Math.max(y1, 0);
    x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1);
    x2 = Math.min(x2, COLNO - 1);
    for (let y = y1; y <= y2; y++) {
        lo_yy = (y > 0) ? y - 1 : 0;
        hi_yy = (y < y2) ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            if (levl(x, y).typ !== STONE)
                continue;
            lo_xx = (x > 1) ? x - 1 : 1;
            hi_xx = (x < x2) ? x + 1 : x2;
            yyloop: for (yy = lo_yy; yy <= hi_yy; yy++)
                for (xx = lo_xx; xx <= hi_xx; xx++)
                    if (IS_ROOM(levl(xx, yy).typ)
                        || levl(xx, yy).typ === CROSSWALL) {
                        levl(x, y).typ = (yy !== y) ? HWALL : VWALL;
                        break yyloop; /* end `yy' and `xx' loops */
                    }
        }
    }
}

// C ref: sp_lev.c maze1xy()
/*
 * Select a random coordinate in the maze.
 *
 * We want a place not 'touched' by the loader.  That is, a place in
 * the maze outside every part of the special level.
 */
function maze1xy(m, humidity) {
    let x, y, tryct = 2000;
    /* tryct:  normally it won't take more than ten or so tries due
       to the circumstances under which we'll be called, but the
       `humidity' screening might drastically change the chances */

    do {
        x = rn1(game.x_maze_max - 3, 3);
        y = rn1(game.y_maze_max - 3, 3);
        if (--tryct < 0)
            break; /* give up */
    } while (!(x % 2) || !(y % 2) || SpLev_Map_at(x, y)
             || !is_ok_location(x, y, humidity));

    m.x = x, m.y = y;
}

// C ref: sp_lev.c rndtrap()
/*
 * Select a random trap
 */
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
            if (!Can_dig_down(game.u.uz))
                rtrap = NO_TRAP;
            break;
        case LEVEL_TELEP:
        case TELEP_TRAP:
            if (game.level.flags.noteleport)
                rtrap = NO_TRAP;
            break;
        case ROLLING_BOULDER_TRAP:
        case ROCKTRAP:
            if (In_endgame(game.u.uz))
                rtrap = NO_TRAP;
            break;
        }
    } while (rtrap === NO_TRAP);
    return rtrap;
}

// C ref: sp_lev.c fill_empty_maze()
/*
 * If there's a significant portion of maze unused by the special level,
 * we don't want it empty.
 *
 * Makes the number of traps, monsters, etc. proportional
 * to the size of the maze.
 */
export function fill_empty_maze() {
    let mapcountmax, mapcount, mapfact;
    let x, y;
    const mm = { x: 0, y: 0 };

    mapcountmax = mapcount = (game.x_maze_max - 2) * (game.y_maze_max - 2);
    mapcountmax = Math.trunc(mapcountmax / 2);

    for (x = 2; x < game.x_maze_max; x++)
        for (y = 0; y < game.y_maze_max; y++)
            if (SpLev_Map_at(x, y))
                mapcount--;

    if ((mapcount > Math.trunc(mapcountmax / 10))) {
        mapfact = Math.trunc((mapcount * 100) / mapcountmax);
        for (x = rnd(Math.trunc((20 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            mkobj_at(rn2(2) ? GEM_CLASS : RANDOM_CLASS, mm.x, mm.y, TRUE);
        }
        for (x = rnd(Math.trunc((12 * mapfact) / 100)); x; x--) {
            let ttmp;

            maze1xy(mm, DRY);
            if ((ttmp = t_at(mm.x, mm.y)) !== null
                && (is_pit(ttmp.ttyp) || is_hole(ttmp.ttyp)))
                continue;
            mksobj_at(BOULDER, mm.x, mm.y, TRUE, FALSE);
        }
        for (x = rn2(2); x; x--) {
            maze1xy(mm, DRY);
            makemon(mons[PM_MINOTAUR], mm.x, mm.y, NO_MM_FLAGS);
        }
        for (x = rnd(Math.trunc((12 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            makemon(null, mm.x, mm.y, NO_MM_FLAGS);
        }
        for (x = rn2(Math.trunc((15 * mapfact) / 100)); x; x--) {
            maze1xy(mm, DRY);
            mkgold(0, mm.x, mm.y);
        }
        for (x = rn2(Math.trunc((15 * mapfact) / 100)); x; x--) {
            let trytrap;

            maze1xy(mm, DRY);
            trytrap = rndtrap();
            if (sobj_at(BOULDER, mm.x, mm.y))
                while (is_pit(trytrap) || is_hole(trytrap))
                    trytrap = rndtrap();
            maketrap(mm.x, mm.y, trytrap);
        }
    }
}

// sp_lev.h LVLINIT_* init styles
const LVLINIT_NONE = 0;
const LVLINIT_SOLIDFILL = 1;
const LVLINIT_MAZEGRID = 2;
const LVLINIT_MAZE = 3;
const LVLINIT_MINES = 4;
const LVLINIT_ROGUE = 5;
const LVLINIT_SWAMP = 6;

// C ref: sp_lev.c splev_initlev()
function splev_initlev(linit) {
    switch (linit.init_style) {
    default:
        impossible('Unrecognized level init style.');
        break;
    case LVLINIT_NONE:
        break;
    case LVLINIT_SOLIDFILL:
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        lvlfill_solid(linit.filling, linit.lit);
        break;
    case LVLINIT_MAZEGRID:
        lvlfill_maze_grid(2, 0, game.x_maze_max, game.y_maze_max, linit.bg);
        break;
    case LVLINIT_MAZE:
        create_maze(linit.corrwid, linit.wallthick, linit.rm_deadends);
        break;
    case LVLINIT_ROGUE:
        throw new Error('splev_initlev(): makeroguerooms() not ported yet');
    case LVLINIT_MINES:
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        if (linit.filling > -1)
            lvlfill_solid(linit.filling, 0);
        linit.icedpools = game.icedpools;
        mkmap(linit);
        break;
    case LVLINIT_SWAMP:
        if (linit.lit === BOOL_RANDOM)
            linit.lit = rn2(2);
        lvlfill_swamp(linit.fg, linit.bg, linit.lit);
        break;
    }
}

// C ref: sp_lev.c lspo_message()
/* des.message("You arrive on the Astral Plane!"): appended to the level's
   arrival message, which deliver_splev_message() (questpgr.c) shows */
function lspo_message(...args) {
    const argc = args.length;

    if (argc < 1) {
        nhl_error(null, 'Wrong parameters');
        /*NOTREACHED*/
        return 0;
    }

    create_des_coder();

    const msg = luaL_checkstring(args[0]);

    /* old message, a newline, then the new one */
    game.lev_message = game.lev_message ? `${game.lev_message}\n${msg}` : msg;
    return 0;
}

// C ref: sp_lev.c lspo_level_flags()
export function lspo_level_flags(...args) {
    const argc = args.length;
    const flags = game.level.flags;

    create_des_coder();
    const coder = game.coder;

    if (argc < 1)
        nhl_error(null, 'expected string params');

    for (let i = 0; i < argc; i++) {
        const s = luaL_checkstring(args[i]);

        if (!strcmpi(s, 'noteleport'))
            flags.noteleport = 1;
        else if (!strcmpi(s, 'hardfloor'))
            flags.hardfloor = 1;
        else if (!strcmpi(s, 'nommap'))
            flags.nommap = 1;
        else if (!strcmpi(s, 'shortsighted'))
            flags.shortsighted = 1;
        else if (!strcmpi(s, 'arboreal'))
            flags.arboreal = 1;
        else if (!strcmpi(s, 'mazelevel'))
            flags.is_maze_lev = 1;
        else if (!strcmpi(s, 'shroud'))
            flags.hero_memory = 1;
        else if (!strcmpi(s, 'graveyard'))
            flags.graveyard = 1;
        else if (!strcmpi(s, 'icedpools'))
            game.icedpools = 1;
        else if (!strcmpi(s, 'corrmaze'))
            flags.corrmaze = 1;
        else if (!strcmpi(s, 'premapped'))
            coder.premapped = 1;
        else if (!strcmpi(s, 'solidify'))
            coder.solidify = 1;
        else if (!strcmpi(s, 'sokoban'))
            flags.sokoban_rules = 1;
        else if (!strcmpi(s, 'inaccessibles'))
            coder.check_inaccessibles = 1;
        else if (!strcmpi(s, 'noflipx'))
            coder.allow_flips &= ~2;
        else if (!strcmpi(s, 'noflipy'))
            coder.allow_flips &= ~1;
        else if (!strcmpi(s, 'noflip'))
            coder.allow_flips = 0;
        else if (!strcmpi(s, 'temperate'))
            flags.temperature = 0;
        else if (!strcmpi(s, 'hot'))
            flags.temperature = 1;
        else if (!strcmpi(s, 'cold'))
            flags.temperature = -1;
        else if (!strcmpi(s, 'nomongen'))
            flags.rndmongen = 0;
        else if (!strcmpi(s, 'nodeathdrops'))
            flags.deathdrops = 0;
        else if (!strcmpi(s, 'noautosearch'))
            flags.noautosearch = 1;
        else if (!strcmpi(s, 'fumaroles'))
            flags.fumaroles = 1;
        else if (!strcmpi(s, 'stormy'))
            flags.stormy = 1;
        else {
            nhl_error(null, `Unknown level flag ${s}`);
        }
    }

    return 0;
}

// C ref: sp_lev.c lspo_level_init()
/* level_init({ style = "solidfill", fg = " " }); */
/* level_init({ style = "mines", fg = ".", bg = "}",
                smoothed=true, joined=true, lit=0 }) */
export function lspo_level_init(tbl) {
    const initstyles = [
        'solidfill', 'mazegrid', 'maze', 'rogue', 'mines', 'swamp',
    ];
    const initstyles2i = [
        LVLINIT_SOLIDFILL, LVLINIT_MAZEGRID, LVLINIT_MAZE, LVLINIT_ROGUE,
        LVLINIT_MINES, LVLINIT_SWAMP, 0,
    ];
    const init_lev = {};

    create_des_coder();

    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    game.splev_init_present = TRUE;

    init_lev.init_style
        = initstyles2i[get_table_option(tbl, 'style', 'solidfill', initstyles)];
    init_lev.fg = get_table_mapchr_opt(tbl, 'fg', ROOM);
    init_lev.bg = get_table_mapchr_opt(tbl, 'bg', INVALID_TYPE);
    init_lev.smoothed = get_table_boolean_opt(tbl, 'smoothed', FALSE);
    init_lev.joined = get_table_boolean_opt(tbl, 'joined', FALSE);
    init_lev.lit = get_table_boolean_opt(tbl, 'lit', BOOL_RANDOM);
    init_lev.walled = get_table_boolean_opt(tbl, 'walled', FALSE);
    init_lev.filling = get_table_mapchr_opt(tbl, 'filling', init_lev.fg);
    init_lev.corrwid = get_table_int_opt(tbl, 'corrwid', -1);
    init_lev.wallthick = get_table_int_opt(tbl, 'wallthick', -1);
    init_lev.rm_deadends = !get_table_boolean_opt(tbl, 'deadends', TRUE);

    game.coder.lvl_is_joined = init_lev.joined;

    if (init_lev.bg === INVALID_TYPE)
        init_lev.bg = (init_lev.init_style === LVLINIT_SWAMP) ? MOAT : STONE;

    splev_initlev(init_lev);

    return 0;
}

// C ref: sp_lev.c good_stair_loc()
function good_stair_loc(x, y) {
    const typ = game.level.at(x, y).typ;

    return (typ === ROOM || typ === CORR || typ === ICE);
}

// C ref: sp_lev.c set_ok_location_func()
function set_ok_location_func(func) {
    game.is_ok_location_func = func;
}

// C ref: sp_lev.c l_create_stairway()
function l_create_stairway(args, using_ladder) {
    const stairdirs = ['down', 'up'];
    const stairdirs2i = [0, 1];
    const argc = args.length;
    let x = -1, y = -1;
    let badtrap;
    let scoord;
    let up = 0; /* default is down */
    const ltype = lua_type(args[0]);

    create_des_coder();

    if (argc === 1 && ltype === LUA_TTABLE) {
        const tbl = args[0];
        ({ x, y } = get_table_xy_or_coord(tbl));
        up = stairdirs2i[get_table_option(tbl, 'dir', 'down', stairdirs)];
    } else {
        let rest = args;
        if (argc > 0 && ltype === LUA_TSTRING) {
            up = stairdirs2i[luaL_checkoption(args[0], 'down', stairdirs)];
            rest = args.slice(1); /* lua_remove(L, 1) */
        }
        /* nhl_get_xy_params(): (x, y) or ({x, y}) */
        if (rest.length === 2) {
            x = Math.trunc(Number(rest[0]) || 0);
            y = Math.trunc(Number(rest[1]) || 0);
        } else if (rest.length === 1 && lua_type(rest[0]) === LUA_TTABLE) {
            ({ x, y } = get_coord(rest[0]));
        }
    }

    if (x === -1 && y === -1) {
        set_ok_location_func(good_stair_loc);
        scoord = SP_COORD_PACK_RANDOM(0);
    } else
        scoord = SP_COORD_PACK(x, y);

    const c = { x, y };
    get_location_coord(c, DRY, game.coder.croom, scoord);
    x = c.x, y = c.y;
    set_ok_location_func(null);
    if ((badtrap = t_at(x, y)) !== null)
        deltrap(badtrap);
    SpLev_Map_set(x, y);

    if (using_ladder) {
        game.level.at(x, y).typ = LADDER;
        if (up) {
            const dest = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel - 1 };
            stairway_add(x, y, TRUE, TRUE, dest);
            game.level.at(x, y).ladder = LA_UP;
        } else {
            const dest = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
            stairway_add(x, y, FALSE, TRUE, dest);
            game.level.at(x, y).ladder = LA_DOWN;
        }
    } else {
        mkstairs(x, y, up, game.coder.croom,
                 !(scoord & SP_COORD_IS_RANDOM));
    }
    return 0;
}

// C ref: sp_lev.c lspo_stair()
/* stair("up"); */
/* stair({ dir = "down" }); */
/* stair({ dir = "down", x = 4, y = 7 }); */
/* stair({ dir = "down", coord = {x,y} }); */
/* stair("down", 4, 7); */
export function lspo_stair(...args) {
    return l_create_stairway(args, FALSE);
}

// C ref: sp_lev.c lspo_ladder()
/* ladder("down"); */
/* ladder("up", 6,10); */
/* ladder({ x=11, y=05, dir="down" }); */
export function lspo_ladder(...args) {
    return l_create_stairway(args, TRUE);
}

// C ref: sp_lev.c create_corridor()
function create_corridor(c) {
    if (c.src.room === -1) {
        makecorridors(); /*makecorridors(c->src.door);*/
        return;
    }
    throw new Error('create_corridor(): des.corridor between given rooms not ported yet');
}

// C ref: sp_lev.c lspo_random_corridors()
export function lspo_random_corridors() {
    const tc = {
        src: { room: -1, door: -1, wall: -1 },
        dest: { room: -1, door: -1, wall: -1 },
    };

    create_des_coder();

    create_corridor(tc);

    return 0;
}

// C ref: sp_lev.c lspo_drawbridge()
/* drawbridge({ dir="east", state="closed", x=05,y=08 }); */
export function lspo_drawbridge(tbl) {
    const mwdirs = ['north', 'south', 'west', 'east', 'random'];
    const mwdirs2i = [DB_NORTH, DB_SOUTH, DB_WEST, DB_EAST, -1, -2];
    const dbopens = ['open', 'closed', 'random'];
    const dbopens2i = [1, 0, -1, -2];

    create_des_coder();

    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    const { x: mx, y: my } = get_table_xy_or_coord(tbl);

    const dir = mwdirs2i[get_table_option(tbl, 'dir', 'random', mwdirs)];
    const dcoord = SP_COORD_PACK(mx, my);
    let db_open = dbopens2i[get_table_option(tbl, 'state', 'random', dbopens)];
    const c = { x: mx, y: my };

    get_location_coord(c, DRY | WET | HOT, game.coder.croom, dcoord);
    const x = c.x, y = c.y;
    if (!isok(mx, my)) {
        nhl_error(null, 'drawbridge coord not ok');
        /*NOTREACHED*/
        return 0;
    }
    if (db_open === -1)
        db_open = !rn2(2);
    if (!create_drawbridge(x, y, dir, db_open ? TRUE : FALSE))
        impossible('Cannot create drawbridge.');
    SpLev_Map_set(x, y);

    return 0;
}

// C ref: sp_lev.c lspo_mazewalk()
/* mazewalk({ x = NN, y = NN, typ = ".", dir = "north", stocked = 0 }); */
/* mazewalk({ coord = {XX, YY}, typ = ".", dir = "north" }); */
/* mazewalk(x,y,dir); */
export function lspo_mazewalk(...args) {
    const mwdirs = ['north', 'south', 'east', 'west', 'random'];
    const mwdirs2i = [W_NORTH, W_SOUTH, W_EAST, W_WEST, W_RANDOM, -2];
    let x, y;
    let mx, my;
    let ftyp = ROOM;
    let fstocked = 1, dir = -1;
    const argc = args.length;
    const levl = (xx, yy) => game.level.at(xx, yy);

    create_des_coder();

    if (argc === 3) {
        mx = luaL_checkinteger(args[0]);
        my = luaL_checkinteger(args[1]);
        dir = mwdirs2i[luaL_checkoption(args[2], 'random', mwdirs)];
    } else {
        const tbl = args[0];
        if (lua_type(tbl) !== LUA_TTABLE)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

        ({ x: mx, y: my } = get_table_xy_or_coord(tbl));
        ftyp = get_table_mapchr_opt(tbl, 'typ', ROOM);
        fstocked = get_table_boolean_opt(tbl, 'stocked', 1);
        dir = mwdirs2i[get_table_option(tbl, 'dir', 'random', mwdirs)];
    }

    const mcoord = SP_COORD_PACK(mx, my);
    const c = { x: mx, y: my };

    get_location_coord(c, ANY_LOC, game.coder.croom, mcoord);
    x = c.x, y = c.y;

    if (!isok(x, y)) {
        nhl_error(null, 'mazewalk coord not ok');
        /*NOTREACHED*/
        return 0;
    }

    if (ftyp < 1) {
        ftyp = game.level.flags.corrmaze ? CORR : ROOM;
    }

    if (dir === W_RANDOM)
        dir = random_wdir();

    /* don't use move() - it doesn't use W_NORTH, etc. */
    switch (dir) {
    case W_NORTH:
        --y;
        break;
    case W_SOUTH:
        y++;
        break;
    case W_EAST:
        x++;
        break;
    case W_WEST:
        --x;
        break;
    default:
        impossible('mazewalk: Bad direction');
    }

    if (!IS_DOOR(levl(x, y).typ)) {
        levl(x, y).typ = ftyp;
        levl(x, y).flags = 0;
    }

    /*
     * We must be sure that the parity of the coordinates for
     * walkfrom() is odd.  But we must also take into account
     * what direction was chosen.
     */
    if (!(x % 2)) {
        if (dir === W_EAST)
            x++;
        else
            x--;

        /* no need for IS_DOOR check; out of map bounds */
        levl(x, y).typ = ftyp;
        levl(x, y).flags = 0;
    }

    if (!(y % 2)) {
        if (dir === W_SOUTH)
            y++;
        else
            y--;
    }

    walkfrom(x, y, ftyp);
    if (fstocked)
        fill_empty_maze();

    return 0;
}

// C ref: sp_lev.c lspo_wall_property()
/* wall_property({ x1=0, y1=0, x2=78, y2=20, property="nondiggable" }); */
/* wall_property({ region = {1,0, 78,20}, property="nonpasswall" }); */
export function lspo_wall_property(tbl) {
    const wprops = ['nondiggable', 'nonpasswall'];
    const wprop2i = [W_NONDIGGABLE, W_NONPASSWALL, -1];

    create_des_coder();

    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

    let { x1: dx1, y1: dy1, x2: dx2, y2: dy2 } = get_table_coords_or_region(tbl);

    const wprop = wprop2i[get_table_option(tbl, 'property', 'nondiggable', wprops)];

    if (dx1 === -1)
        dx1 = game.xstart - 1;
    if (dy1 === -1)
        dy1 = game.ystart - 1;
    if (dx2 === -1)
        dx2 = game.xstart + game.xsize + 1;
    if (dy2 === -1)
        dy2 = game.ystart + game.ysize + 1;

    const c1 = { x: dx1, y: dy1 }, c2 = { x: dx2, y: dy2 };
    get_location(c1, ANY_LOC, null);
    get_location(c2, ANY_LOC, null);

    set_wall_property(c1.x, c1.y, c2.x, c2.y, wprop);

    return 0;
}

// C ref: sp_lev.c set_wallprop_in_selection()
function set_wallprop_in_selection(args, prop) {
    const argc = args.length;
    let sel = null;

    create_des_coder();

    if (argc === 1) {
        sel = l_selection_check(args[0]);
    } else if (argc === 0) {
        sel = selection_new();
        selection_clear(sel, 1);
    }

    if (sel) {
        selection_iterate(sel, sel_set_wall_property, prop);
    }
}

// C ref: sp_lev.c lspo_non_diggable()
/* non_diggable(selection); */
/* non_diggable(); */
export function lspo_non_diggable(...args) {
    set_wallprop_in_selection(args, W_NONDIGGABLE);
    return 0;
}

// C ref: sp_lev.c lspo_non_passwall()
/* non_passwall(selection); */
/* non_passwall(); */
export function lspo_non_passwall(...args) {
    set_wallprop_in_selection(args, W_NONPASSWALL);
    return 0;
}

// C ref: sp_lev.c lspo_wallify()
/* TODO: wallify(selection) */
/* wallify({ x1=NN,y1=NN, x2=NN,y2=NN }); */
/* wallify(); */
export function lspo_wallify(...args) {
    let dx1 = -1, dy1 = -1, dx2 = -1, dy2 = -1;

    create_des_coder();

    if (args.length === 1) {
        dx1 = get_table_int(args[0], 'x1');
        dy1 = get_table_int(args[0], 'y1');
        dx2 = get_table_int(args[0], 'x2');
        dy2 = get_table_int(args[0], 'y2');
    }

    wallify_map(dx1 < 0 ? (game.xstart - 1) : dx1,
                dy1 < 0 ? (game.ystart - 1) : dy1,
                dx2 < 0 ? (game.xstart + game.xsize + 1) : dx2,
                dy2 < 0 ? (game.ystart + game.ysize + 1) : dy2);

    return 0;
}

// C ref: sp_lev.c levregion_add()
function levregion_add(lregion) {
    if (!lregion.in_islev) {
        const c1 = { x: lregion.inarea.x1, y: lregion.inarea.y1 };
        const c2 = { x: lregion.inarea.x2, y: lregion.inarea.y2 };
        get_location(c1, ANY_LOC, null);
        get_location(c2, ANY_LOC, null);
        lregion.inarea = { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
    }

    if (!lregion.del_islev) {
        const c1 = { x: lregion.delarea.x1, y: lregion.delarea.y1 };
        const c2 = { x: lregion.delarea.x2, y: lregion.delarea.y2 };
        get_location(c1, ANY_LOC, null);
        get_location(c2, ANY_LOC, null);
        lregion.delarea = { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
    }
    if (!game.lregions)
        game.lregions = [];
    game.lregions.push(lregion);
    game.num_lregions = game.lregions.length;
}

// C ref: sp_lev.c l_get_lregion()
/* get params from topmost lua hash:
   - region = {x1,y1,x2,y2}
   - exclude = {x1,y1,x2,y2} (optional)
   - region_islev=true, exclude_islev=true (optional)
   - negative x and y are invalid */
function l_get_lregion(tbl, tmplregion) {
    const r = get_table_region(tbl, 'region', FALSE);
    tmplregion.inarea = { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 };

    const d = get_table_region(tbl, 'exclude', TRUE)
        || { x1: -1, y1: -1, x2: -1, y2: -1 };
    tmplregion.delarea = { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 };

    tmplregion.in_islev = get_table_boolean_opt(tbl, 'region_islev', 0);
    tmplregion.del_islev = get_table_boolean_opt(tbl, 'exclude_islev', 0);

    /* if x1 is still negative, exclude wasn't specified, so we should treat
     * it as if there is no exclude region at all. Force exclude_islev to
     * true so the -1,-1,-1,-1 region is safely off the map and won't
     * interfere with branch or portal placement. */
    if (d.x1 < 0)
        tmplregion.del_islev = TRUE;
}

// C ref: sp_lev.c lspo_teleport_region()
/* teleport_region({ region = { x1,y1, x2,y2 } }); */
/* teleport_region({ region = { x1,y1, x2,y2 }, [ region_islev = 1, ]
 *   exclude = { x1,y1, x2,y2 }, [ exclude_islen = 1, ] [ dir = "up" ] }); */
export function lspo_teleport_region(tbl) {
    const teledirs = ['both', 'down', 'up'];
    const teledirs2i = [LR_TELE, LR_DOWNTELE, LR_UPTELE, -1];
    const tmplregion = {};

    create_des_coder();
    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */
    l_get_lregion(tbl, tmplregion);
    tmplregion.rtype = teledirs2i[get_table_option(tbl, 'dir', 'both', teledirs)];
    tmplregion.padding = 0;
    tmplregion.rname = null;

    levregion_add(tmplregion);

    return 0;
}

// C ref: sp_lev.c lspo_levregion()
/* levregion({ region = { x1,y1, x2,y2 }, exclude = { x1,y1, x2,y2 },
 *             type = "portal", name="air" }); */
export function lspo_levregion(tbl) {
    const regiontypes = [
        'stair-down', 'stair-up', 'portal', 'branch',
        'teleport', 'teleport-up', 'teleport-down',
    ];
    const regiontypes2i = [
        LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
        LR_TELE, LR_UPTELE, LR_DOWNTELE, 0,
    ];
    const tmplregion = {};

    create_des_coder();
    if (lua_type(tbl) !== LUA_TTABLE)
        nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */
    l_get_lregion(tbl, tmplregion);
    tmplregion.rtype = regiontypes2i[get_table_option(tbl, 'type', 'stair-down',
                                                      regiontypes)];
    tmplregion.padding = get_table_int_opt(tbl, 'padding', 0);
    tmplregion.rname = get_table_str_opt(tbl, 'name', null);

    levregion_add(tmplregion);
    return 0;
}

// C ref: mklev.c count_level_features()
function count_level_features() {
    const flags = game.level.flags;

    flags.nfountains = flags.nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = game.level.at(x, y).typ;

            if (typ === FOUNTAIN)
                flags.nfountains++;
            else if (typ === SINK)
                flags.nsinks++;
        }
}

// C ref: sp_lev.c floodfillchk_match_accessible()
function floodfillchk_match_accessible(x, y) {
    return (ACCESSIBLE(game.level.at(x, y).typ)
            || game.level.at(x, y).typ === SDOOR
            || game.level.at(x, y).typ === SCORR);
}

// C ref: sp_lev.c generate_way_out_method()
/* give a hero a way out of an inaccessible area: a secret door into the
   reachable part, a hole or trapdoor, or an escape item */
function generate_way_out_method(nx, ny, ov) {
    const escapeitems = [
        PICK_AXE, DWARVISH_MATTOCK, WAN_DIGGING,
        WAN_TELEPORTATION, SCR_TELEPORTATION, RIN_TELEPORTATION,
    ];
    const ov2 = selection_new();
    let ov3;
    const c = { x: 0, y: 0 };
    let res = TRUE;
    const lv = (x, y) => game.level.at(x, y);

    selection_floodfill(ov2, nx, ny, TRUE);
    ov3 = selection_clone(ov2);

    gotitdone: {
        /* try to make a secret door */
        while (selection_rndcoord(ov3, c, TRUE)) {
            const x = c.x, y = c.y;
            if (isok(x + 1, y) && !selection_getpoint(x + 1, y, ov)
                && IS_WALL(lv(x + 1, y).typ)
                && isok(x + 2, y) && selection_getpoint(x + 2, y, ov)
                && ACCESSIBLE(lv(x + 2, y).typ)) {
                lv(x + 1, y).typ = SDOOR;
                break gotitdone;
            }
            if (isok(x - 1, y) && !selection_getpoint(x - 1, y, ov)
                && IS_WALL(lv(x - 1, y).typ)
                && isok(x - 2, y) && selection_getpoint(x - 2, y, ov)
                && ACCESSIBLE(lv(x - 2, y).typ)) {
                lv(x - 1, y).typ = SDOOR;
                break gotitdone;
            }
            if (isok(x, y + 1) && !selection_getpoint(x, y + 1, ov)
                && IS_WALL(lv(x, y + 1).typ)
                && isok(x, y + 2) && selection_getpoint(x, y + 2, ov)
                && ACCESSIBLE(lv(x, y + 2).typ)) {
                lv(x, y + 1).typ = SDOOR;
                break gotitdone;
            }
            if (isok(x, y - 1) && !selection_getpoint(x, y - 1, ov)
                && IS_WALL(lv(x, y - 1).typ)
                && isok(x, y - 2) && selection_getpoint(x, y - 2, ov)
                && ACCESSIBLE(lv(x, y - 2).typ)) {
                lv(x, y - 1).typ = SDOOR;
                break gotitdone;
            }
        }

        /* try to make a hole or a trapdoor */
        if (Can_fall_thru(game.u.uz)) {
            selection_free(ov3, TRUE);
            ov3 = selection_clone(ov2);
            while (selection_rndcoord(ov3, c, TRUE)) {
                if (maketrap(c.x, c.y, rn2(2) ? HOLE : TRAPDOOR))
                    break gotitdone;
            }
        }

        /* generate one of the escape items */
        if (selection_rndcoord(ov2, c, FALSE)) {
            mksobj_at(ROLL_FROM(escapeitems), c.x, c.y, TRUE, FALSE);
            break gotitdone;
        }

        res = FALSE;
    }
    /* gotitdone: */
    selection_free(ov2, TRUE);
    selection_free(ov3, TRUE);
    return res;
}

// C ref: sp_lev.c ensure_way_out()
function ensure_way_out() {
    const ov = selection_new();
    let ret = TRUE;

    set_selection_floodfillchk(floodfillchk_match_accessible);

    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.tolev.dnum === game.u.uz.dnum)
            selection_floodfill(ov, stway.sx, stway.sy, TRUE);
    }

    for (const ttmp of game.level.traps || []) {
        if ((undestroyable_trap(ttmp.ttyp) || is_hole(ttmp.ttyp))
            && !selection_getpoint(ttmp.tx, ttmp.ty, ov))
            selection_floodfill(ov, ttmp.tx, ttmp.ty, TRUE);
    }

    do {
        ret = TRUE;
        outhere:
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++)
                if (ACCESSIBLE(game.level.at(x, y).typ)
                    && !selection_getpoint(x, y, ov)) {
                    if (generate_way_out_method(x, y, ov))
                        selection_floodfill(ov, x, y, TRUE);
                    ret = FALSE;
                    break outhere;
                }
        /* outhere: */
    } while (!ret);
    selection_free(ov, TRUE);
}

// C ref: sp_lev.c load_special()
export function load_special(name) {
    let result = FALSE;
    const sbi = { flags: NHL_SB_SAFE, memlimit: 1 * 1024 * 1024, steps: 0,
                  perpcall: 1 * 1024 * 1024 };

    create_des_coder();

    give_up: {
        if (!load_lua(name, sbi))
            break give_up;

        link_doors_rooms();
        remove_boundary_syms();

        /* TODO: ensure_way_out() needs rewrite */
        if (game.coder.check_inaccessibles)
            ensure_way_out();

        map_cleanup();

        /* FIXME: Ideally, we want this call to only cover areas of the map
         * which were not inserted directly by the special level file (see
         * the insect legs on Baalzebub's level, for instance). Since that
         * is currently not possible, we overload the corrmaze flag for this
         * purpose.
         */
        if (!game.level.flags.corrmaze)
            wallification(1, 0, COLNO - 1, ROWNO - 1);

        flip_level_rnd(game.coder.allow_flips, FALSE);

        count_level_features();

        if (game.coder.solidify)
            solidify_map();

        /* This must be done before premap_detect(),
         * otherwise branch stairs won't be premapped. */
        fixup_special();

        if (game.coder.premapped)
            premap_detect();

        result = TRUE;
    }
    /* give_up: */
    game.coder = null; /* Free(gc.coder) */

    return result;
}


// C ref: sp_lev.c l_register_des() — the des_functions[] names. The
// ported ones are installed below; the others raise a Lua error when called.
const sp_lev_des_names = [
    'message', 'monster', 'object', 'level_flags', 'level_init',
    'engraving', 'mineralize', 'door', 'stair', 'ladder', 'grave', 'altar',
    'map', 'feature', 'terrain', 'replace_terrain', 'room', 'corridor',
    'random_corridors', 'gold', 'trap', 'mazewalk', 'drawbridge', 'region',
    'levregion', 'exclusion', 'wallify', 'wall_property', 'non_diggable',
    'non_passwall', 'teleport_region', 'reset_level', 'finalize_level',
    'gas_cloud',
];

function des_not_ported(name) {
    return function des_not_ported_yet() {
        lua_error(`des.${name}: lspo_${name}() is not ported yet`);
    };
}

// C ref: sp_lev.c l_register_des()
export function l_register_des(L) {
    const des = {};
    for (const name of sp_lev_des_names)
        des[name] = des_not_ported(name);
    des.message = lspo_message;
    des.room = lspo_room;
    des.map = lspo_map;
    des.region = lspo_region;
    des.altar = lspo_altar;
    des.object = lspo_object;
    des.monster = lspo_monster;
    des.exclusion = lspo_exclusion;
    des.trap = lspo_trap;
    des.door = lspo_door;
    des.terrain = lspo_terrain;
    des.feature = lspo_feature;
    des.gas_cloud = lspo_gas_cloud;
    des.replace_terrain = lspo_replace_terrain;
    des.engraving = lspo_engraving;
    des.level_flags = lspo_level_flags;
    des.level_init = lspo_level_init;
    des.stair = lspo_stair;
    des.ladder = lspo_ladder;
    des.random_corridors = lspo_random_corridors;
    des.mazewalk = lspo_mazewalk;
    des.drawbridge = lspo_drawbridge;
    des.levregion = lspo_levregion;
    des.teleport_region = lspo_teleport_region;
    des.wallify = lspo_wallify;
    des.wall_property = lspo_wall_property;
    des.non_diggable = lspo_non_diggable;
    des.non_passwall = lspo_non_passwall;
    des.gold = lspo_gold;
    L.globals.des = des;
}
