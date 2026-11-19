// sp_lev.js — the special-level coder and the "des" Lua table.
// C ref: sp_lev.c — create_des_coder, sp_level_coder_init, reset_xystart_size,
// update_croom, spo_endroom, build_room, lspo_room, add_doors_to_room,
// maybe_add_door, shared_with_room, get_table_roomtype_opt,
// get_table_xy_or_coord, l_push_mkroom_table, l_register_des.
//
// check_room() and create_room() (also sp_lev.c) live in mklev.js for now,
// next to the room code they share with makerooms().
//
// Ported so far: des.room, des.map, des.region and des.altar as themed rooms use
// them (with their helpers mapfrag_*, sel_set_ter, get_location). The
// other des.* functions are registered by name but raise a Lua error until
// they are ported (their C counterparts are listed in sp_lev_des_names).

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
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
    Align2amask, A_ORIGINAL,
} from './const.js';
import { splev_chr2typ, luaL_checkstring } from './nhlua.js';
import { set_levltyp, set_levltyp_lit } from './mkmaze.js';
import { flood_fill_rm, litstate_rnd } from './mkmap.js';
import { selection_new, selection_setpoint } from './selvar.js';
import {
    get_table_int_opt, get_table_str_opt, get_table_option, nhl_error,
    luaL_checkoption, luaL_checkinteger, lua_type, LUA_TNIL, LUA_TSTRING,
    LUA_TBOOLEAN, LUA_TNUMBER, LUA_TFUNCTION, lua_error,
} from './nhlua.js';
import { create_room, topologize, add_door, add_room, somex, somey, somexy } from './mklev.js';
import { mkgold } from './mkobj.js';

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
            /* stock_room(croom->rtype - SHOPBASE, croom) is not ported yet */
            impossible('fill_special_room: stock_room() is not ported yet');
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

// C ref: sp_lev.c build_room()
function build_room(r, mkr) {
    let okroom;
    let aroom;
    const rtype = (!r.chance || rn2(100) < r.chance) ? r.rtype : OROOM;

    if (mkr) {
        /* create_subroom() is not ported yet */
        nhl_error(null, 'des.room: subrooms are not ported yet');
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
    else if (sp_amask === AM_SPLEV_NONCO || sp_amask === AM_SPLEV_RANDOM)
        /* noncoalignment() and induced_align() are not ported yet */
        nhl_error(null, 'sp_amask_to_amask: random/non-co-aligned altars are not ported yet');
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

// C ref: sp_lev.c l_register_des() — the des_functions[] names. Only
// des.room is ported; the others raise a Lua error when called.
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
    L.globals.des = des;
}
