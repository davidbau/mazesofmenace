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
import { rn2, rn1, rnd, ROLL_FROM } from './rng.js';
import { depth } from './dungeon.js';
import {
    COLNO, ROWNO, OROOM, THEMEROOM, COURT, SWAMP, VAULT, BEEHIVE, MORGUE,
    BARRACKS, ZOO, DELPHI, TEMPLE, ANTHOLE, COCKNEST, LEPREHALL, SHOPBASE,
    ARMORSHOP, SCROLLSHOP, POTIONSHOP, WEAPONSHOP, FOODSHOP, RINGSHOP,
    WANDSHOP, TOOLSHOP, BOOKSHOP, FODDERSHOP, CANDLESHOP, ROOMOFFSET,
    IS_DOOR, SDOOR, isok, TRUE, FALSE, FILL_NONE, FILL_NORMAL,
    STONE, MAX_TYPE, INVALID_TYPE, NO_ROOM, HWALL, IRONBARS, CLOUD, D_CLOSED,
    IS_WALL, MAXNROFROOMS, ROOM, ALTAR, SPACE_POS, IS_OBSTRUCTED,
    IS_POOL, IS_LAVA, AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, AM_MASK,
    Align2amask, A_ORIGINAL, STAIRS, LADDER,
    NO_TRAP, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE,
    MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB, MKTRAP_SEEN, MKTRAP_NOVICTIM,
    STRAT_WAITFORU, D_NODOOR, D_BROKEN, D_ISOPEN, D_LOCKED, D_TRAPPED, D_SECRET, DOOR,
    W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY, W_RANDOM,
} from './const.js';
import { splev_chr2typ, luaL_checkstring } from './nhlua.js';
import { set_levltyp, set_levltyp_lit } from './mkmaze.js';
import { flood_fill_rm, litstate_rnd } from './mkmap.js';
import { selection_new, selection_setpoint } from './selvar.js';
import {
    get_table_int_opt, get_table_str_opt, get_table_option, nhl_error,
    luaL_checkoption, luaL_checkinteger, lua_type, LUA_TNIL, LUA_TSTRING,
    LUA_TBOOLEAN, LUA_TNUMBER, LUA_TFUNCTION, LUA_TTABLE, lua_error,
} from './nhlua.js';
import { create_room, topologize, add_door, add_room, add_subroom, okdoor, somex, somey, somexy, mktrap } from './mklev.js';
import {
    mkgold, mkobj_at, mksobj_at, bless, curse, blessorcurse, set_corpsenm,
    rndmonnum, weight, add_to_container,
} from './mkobj.js';
import {
    NON_PM, MALE, FEMALE, NEUTRAL, G_EXTINCT, G_GONE, LR_TELE, LR_UPTELE,
    LR_DOWNTELE, LR_MONGEN, M_AP_OBJECT, M_AP_MONSTER, M_AP_FURNITURE,
    NO_MM_FLAGS, MM_NOTAIL, MM_NOGRP, MM_ADJACENTOK, MM_IGNOREWATER,
    MM_NOCOUNTBIRTH,
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
} from './objects.js';
import {
    name_to_monplus, is_male, is_female, monsndx, is_vampshifter, is_vampire, is_swimmer, is_flyer,
    is_floater, passes_walls, your_race,
} from './mondata.js';
import {
    def_char_to_monclass, def_monsyms, def_char_to_objclass,
} from './drawing.js';
import { mkclass, makemon, set_malign, m_at } from './makemon.js';
import { enexto } from './teleport.js';
import { strcmpi, strncmpi, strstri } from './hacklib.js';
import { induced_align } from './dungeon.js';
import { nhl_push_obj } from './nhlobj.js';
import { bury_an_obj } from './dig.js';
import { stock_room } from './shknam.js';

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
const ANY_LOC = 0x10; /* even outside the level */
const NO_LOC_WARN = 0x20; /* no complaints and set x & y to -1, if no loc */
const SPACELOC = 0x40; /* like DRY, but accepts furniture too */
/* sp_lev.h SP_COORD_IS_RANDOM */
const SP_COORD_IS_RANDOM = 0x01000000;
/* align.h special-level altar masks */
const AM_SPLEV_CO = 0x20;
const AM_SPLEV_NONCO = 0x40;
const AM_SPLEV_RANDOM = 0x80;

// sp_lev.h alignment codes
const SPLEV_LEFT = 1;
const SPLEV_H_LEFT = 2;
const SPLEV_CENTER = 3;
const SPLEV_H_RIGHT = 4;
const SPLEV_RIGHT = 5;
const TOP = 1;
const BOTTOM = 5;

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
    game.xstart = 1;
    game.ystart = 0;
    game.xsize = COLNO - 1;
    game.ysize = ROWNO;
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
function get_coord(v) {
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
            /* fill_zoo(croom) is not ported yet */
            impossible('fill_special_room: fill_zoo() is not ported yet');
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
function mapfrag_fromstr(str) {
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
        /* del_engr_at(x, y): no engravings exist yet */
    }
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
        const tbl = args[0];
        if (lua_type(tbl) !== 5 /* LUA_TTABLE */)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */
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
            /* place map starting at halign,valign: x_maze_max/y_maze_max
               (mkmaze.c) are not ported yet */
            nhl_error(null, 'des.map: halign/valign placement is not ported yet');
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
function get_table_region(tbl, name, add_xstart) {
    const v = tbl[name];
    if (lua_type(v) !== 5 /* LUA_TTABLE */ || v.length !== 4)
        nhl_error(null, `Region '${name}' is not a table of 4 integers`);
    let x1 = luaL_checkinteger(v[0]);
    let y1 = luaL_checkinteger(v[1]);
    let x2 = luaL_checkinteger(v[2]);
    let y2 = luaL_checkinteger(v[3]);
    if (add_xstart) {
        x1 += game.xstart; y1 += game.ystart;
        x2 += game.xstart; y2 += game.ystart;
    }
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
        /* region(selection, "lit"): selection_do_grow() and
           selection_iterate() are not ported yet */
        nhl_error(null, 'des.region(selection, lit) is not ported yet');
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
        /* light_region(&tmpregion) is not ported yet */
        nhl_error(null, 'des.region: light_region() is not ported yet');
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

    /* Is_waterlevel(&u.uz) and is_ok_location_func: not used by the
       themed rooms ported so far */

    /* TODO: Should perhaps check if wall is diggable/passwall? */
    if (humidity & ANY_LOC)
        return TRUE;

    if ((humidity & SOLID) && IS_OBSTRUCTED(typ))
        return TRUE;

    if ((humidity & (DRY | SPACELOC)) && SPACE_POS(typ)) {
        /* sobj_at(BOULDER, x, y): floor objects are not tracked yet */
        const bould = false;

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
function get_location_coord(c, humidity, croom, crd) {
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
        /* get_location_coord() + in_rooms(x, y, TEMPLE): not ported yet */
        nhl_error(null, 'create_altar: altars outside rooms are not ported yet');
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

    /* priestini() for shrines in temples is not ported yet */
    nhl_error(null, 'create_altar: temple shrines are not ported yet');
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
function SP_COORD_PACK(x, y) { return (x & 0xff) + ((y & 0xff) << 16); }
function SP_COORD_PACK_RANDOM(l) { return SP_COORD_IS_RANDOM | l; }

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
        nhl_error(null, 'create_monster: mk_roamer() is not ported yet');
    else if (PM_ARCHEOLOGIST <= m.id && m.id <= PM_WIZARD)
        nhl_error(null, 'create_monster: mk_mplayer() is not ported yet');
    else
        mtmp = makemon(pm, x, y, m.mm_flags);

    if (mtmp) {
        x = mtmp.mx, y = mtmp.my; /* sanity precaution */
        m.x = x, m.y = y;
        /* handle specific attributes for some special monsters */
        if (m.name)
            nhl_error(null, 'create_monster: christen_monst() is not ported yet');

        if (m.appear_as
            && ((mtmp.data.mlet === S_MIMIC)
                /* shapechanger (chameleons, et al, and vampires) */
                || (mtmp.cham >= LOW_PM && m.appear === M_AP_MONSTER)))
            nhl_error(null, 'create_monster: appear_as is not ported yet');

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
                nhl_error(null, 'create_monster: newcham() is not ported yet');
        }
        if (m.m_lev_adj) {
            if (mtmp.m_lev + m.m_lev_adj > 49)
                mtmp.m_lev = 49;
            else if (mtmp.m_lev + m.m_lev_adj < 0)
                mtmp.m_lev = 0;
            else
                mtmp.m_lev += m.m_lev_adj;
        }
        if (!(m.has_invent & DEFAULT_INVENT))
            nhl_error(null, 'create_monster: mdrop_special_objs()/discard_minvent() are not ported yet');
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
        nhl_error(null, 'lspo_monster: custom monster inventory (spo_end_moninvent) is not ported yet');
    }

    return 0;
}

// C ref: sp_lev.c create_trap()
/*
 * Create a trap in a room.
 */
function create_trap(t, croom) {
    const c = { x: -1, y: -1 };
    let mktrap_flags = MKTRAP_MAZEFLAG;

    if (t.type === VIBRATING_SQUARE) {
        /* pick_vibrasquare_location() is not ported yet */
        nhl_error(null, 'create_trap: vibrating square is not ported yet');
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
        const tbl = args[0];
        if (lua_type(tbl) !== 5 /* LUA_TTABLE */)
            nhl_error(null, 'Wrong parameters'); /* lcheck_param_table() */

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

    if (named)
        nhl_error(null, 'create_object: oname() is not ported yet');
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
                nhl_error(null, 'create_object: monster inventory (mpickobj) is not ported yet');
            }
        } else {
            const cobj = container_obj[container_idx - 1];

            otmp.where = 'OBJ_FREE'; /* remove_object(): no floor chains yet */
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

    /* Medusa level special case: statues are petrified monsters */
    if (o.id === STATUE && Is_medusa_level(game.u.uz) && o.corpsenm === NON_PM)
        nhl_error(null, 'create_object: Medusa statues are not ported yet');

    if (o.achievement)
        nhl_error(null, 'create_object: achievement prizes are not ported yet');

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
    des.room = lspo_room;
    des.map = lspo_map;
    des.region = lspo_region;
    des.altar = lspo_altar;
    des.object = lspo_object;
    des.monster = lspo_monster;
    des.exclusion = lspo_exclusion;
    des.trap = lspo_trap;
    des.door = lspo_door;
    L.globals.des = des;
}
