// sp_lev.js — special level and special room machinery.
// C ref: src/sp_lev.c
//
// Despite living in the file that hosts the Lua level loader, fill_special_room
// is plain C and has nothing to do with the interpreter. It was the first
// divergence in 12 of the 44 public sessions, all of them on the vault case:
// a vault is filled with gold, one pile per square, and each pile draws
// rn1(abs(depth) * 100, 51) — an rn2(100) — plus the next_ident of the object
// itself.

import { game } from './gstate.js';
import { selection_iterate } from './selvar.js';
import { rn1, rn2, rnd } from './rng.js';
import { isok } from './hacklib.js';
import { sobj_at, weight, obj_extract_self } from './invent.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { mkobj_at, mksobj_at, add_to_container, set_corpsenm } from './mkobj.js';
import { stock_room } from './shknam.js';
import { fill_zoo } from './mkroom.js';
import { OBJ_NAME } from './objnam.js';
import { obj_resists } from './zap.js';
import { OBJ_BURIED } from './obj.js';
import { start_timer, TIMER_OBJECT, ROT_ORGANIC } from './timeout.js';
import { make_engr_at, engr_at } from './engrave.js';
import { DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD } from './const.js';

/* is_pool/is_lava/m_at live in js/mon.js, which reaches this file back through
   invent.js -> mkobj.js. A direct import leaves them in TDZ the second time a
   level is generated, so they come in through a wire like somexy and okdoor.
   Declared here, above every use, because a `let` used before its declaration
   line is itself a TDZ error. */
let mon_fns = { is_pool: () => false, is_lava: () => false, m_at: () => null };
export function sp_lev_wire_mon(fns) { mon_fns = fns; }
import { NON_PM, SPACE_POS, ALTAR, STAIRS, LADDER, W_RANDOM, W_ANY, W_NORTH, W_SOUTH,
         W_EAST, W_WEST, D_LOCKED, D_TRAPPED } from './const.js';
import { MONSYMS, PMNAMES, NUMMONS } from './monst_data.js';
import { amphibious, is_swimmer, is_flyer, is_floater, passes_walls,
         noncorporeal, likes_fire } from './mondata.js';
import { def_oc_syms } from './drawing_data.js';
import { ANY_LOC, SOLID, DRY, SPACELOC, WET, HOT,
         NO_LOC_WARN } from './const.js';
import { NO_TRAP, VIBRATING_SQUARE,
         MKTRAP_MAZEFLAG, MKTRAP_SEEN, MKTRAP_NOSPIDERONWEB, MKTRAP_NOVICTIM,
         ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
         ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
         SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP } from './const.js';
import { litstate_rnd, flood_fill_rm } from './mkmap.js';
import { depth, induced_align } from './dungeon.js';
import { mkgold } from './mkobj.js';
import { mkclass, makemon, is_male, is_female } from './makemon.js';
import { In_mines } from './const.js';
import {
    OROOM, THEMEROOM, VAULT, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST,
    LEPREHALL, MORGUE, BARRACKS, TEMPLE, SWAMP, SHOPBASE,
    FILL_NONE, FILL_NORMAL,
    COLNO, ROWNO, STONE, CORR, ROOM, HWALL, VWALL, DOOR, SDOOR, SCORR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL,
    TLWALL, TRWALL, DBWALL, AIR, CLOUD, FOUNTAIN, THRONE, SINK, MOAT, POOL,
    LAVAPOOL, LAVAWALL, ICE, WATER, TREE, IRONBARS,
    MAX_TYPE, MATCH_WALL, INVALID_TYPE, NO_ROOM, ROOMOFFSET, D_CLOSED,
    MAXNROFROOMS, IS_WALL, IS_DOOR, IS_OBSTRUCTED,
    D_ISOPEN, D_NODOOR, D_BROKEN,
} from './const.js';

// src/sp_lev.c:2731 fill_special_room()
export function fill_special_room(croom) {
    if (!croom)
        return;

    /* subrooms first, so an unfilled outer room does not block a special
       subroom and vice versa */
    for (const sub of croom.sbrooms || [])
        fill_special_room(sub);

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            /* src/mklev.c fill_special_room() — a shop's stock and its
               shopkeeper. stock_room sets has_shop itself. */
            stock_room(croom.rtype - SHOPBASE, croom);
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
            /* src/mkroom.c:275 — mkzoo() marked the room; this fills it. */
            fill_zoo(croom);
            break;
        default:
            break;
        }
    }

    /* the level flags are set regardless of needfill */
    const f = game.level.flags;
    switch (croom.rtype) {
    case VAULT:    f.has_vault = true; break;
    case ZOO:      f.has_zoo = true; break;
    case COURT:    f.has_court = true; break;
    case MORGUE:   f.has_morgue = true; break;
    case BEEHIVE:  f.has_beehive = true; break;
    case BARRACKS: f.has_barracks = true; break;
    case TEMPLE:   f.has_temple = true; break;
    case SWAMP:    f.has_swamp = true; break;
    default: break;
    }
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}


// ---------------------------------------------------------------------------
// The themed-room map loader.
//
// dat/themerms.lua describes 19 of its 31 rooms as an ASCII map stamped by
// des.map{}, and those rooms are the first divergence in seven public sessions.
// Nothing below needs a Lua interpreter: each of their `contents` functions is
// one or two calls, transcribed in js/mklev.js from the generated table.
// ---------------------------------------------------------------------------

// src/nhlua.c:343 char2typ[] — special-level map character to level type.
// Order matters only for typ2chr, which we do not need. 'x' maps to MAX_TYPE,
// the "see-through" marker: those cells are skipped, not stamped.
const CHAR2TYP = {
    ' ': STONE, '#': CORR, '.': ROOM, '-': HWALL, '|': VWALL, '+': DOOR,
    'A': AIR, 'C': CLOUD, 'S': SDOOR, 'H': SCORR, '{': FOUNTAIN,
    '\\': THRONE, 'K': SINK, '}': MOAT, 'P': POOL, 'L': LAVAPOOL,
    'Z': LAVAWALL, 'I': ICE, 'W': WATER, 'T': TREE, 'F': IRONBARS,
    'x': MAX_TYPE, 'B': CROSSWALL, 'w': MATCH_WALL,
};

// src/nhlua.c:381 splev_chr2typ()
function splev_chr2typ(c) {
    const t = CHAR2TYP[c];
    return (t === undefined) ? INVALID_TYPE : t;
}

// src/sp_lev.c:227 mapfrag_fromstr() — width is the longest line, height the
// line count. The generated table already carries both.
function mapfrag_get(mf, x, y) {
    const row = mf.rows[y] || '';
    return splev_chr2typ(row[x] ?? ' ');
}

// src/sp_lev.c:6120 lspo_map(), restricted to the shape this file needs: a
// themeroom map with no x/y and no halign/valign, placed outside any room.
//
// The two placement draws come from the map's own dimensions, and the whole
// placement is RE-ROLLED when the footprint would overwrite anything — up to
// 100 times, then the room is abandoned. The retry is why the collision test
// has to be exact: one cell of disagreement changes how many pairs are drawn.
export function lspo_map(mf, contents) {
    if (game.in_mk_themerooms && game.themeroom_failed) return;

    let xstart = 0, ystart = 0, xsize = 0, ysize = 0;
    let tryct = 0;

    for (;;) {                                  /* redo_maploc: */
        xsize = mf.wid;
        ysize = mf.hei;

        const x = 1 + rn2(COLNO - 1 - mf.wid);  /* sp_lev.c:6154 */
        const y = rn2(ROWNO - mf.hei);          /* sp_lev.c:6164 */
        if (!isok(x, y)) { game.themeroom_failed = true; return; }
        xstart = x;
        ystart = y;

        if (ystart < 0 || ystart + ysize > ROWNO) {
            game.themeroom_failed = true;
            return;
        }
        if (xsize <= 1 && ysize <= 1)
            return;

        /* "Themed rooms should never overwrite anything" — the footprint plus
           a one-cell border must be untouched stone, except where the map's own
           glyph already matches. */
        let isokp = true;
        const ylim = Math.min(ROWNO, ystart + ysize) + 1;
        const xlim = Math.min(COLNO, xstart + xsize) + 1;
        outer:
        for (let yy = ystart - 1; yy < ylim; yy++)
            for (let xx = xstart - 1; xx < xlim; xx++) {
                if (!isok(xx, yy)) {
                    isokp = false;
                } else {
                    const loc = game.level.at(xx, yy);
                    if (yy < ystart || yy >= ystart + ysize
                        || xx < xstart || xx >= xstart + xsize) {
                        if (loc.typ !== STONE
                            || (loc.roomno ?? NO_ROOM) !== NO_ROOM)
                            isokp = false;
                    } else {
                        const mptyp = mapfrag_get(mf, xx - xstart, yy - ystart);
                        if (mptyp >= MAX_TYPE) continue;
                        if ((loc.typ !== STONE && loc.typ !== mptyp)
                            || (loc.roomno ?? NO_ROOM) !== NO_ROOM)
                            isokp = false;
                    }
                }
                if (!isokp) break outer;
            }

        if (isokp) break;
        if (tryct++ < 100) continue;            /* goto redo_maploc */
        game.themeroom_failed = true;
        return;
    }

    /* Load the map. `lit` defaults to FALSE for every themeroom map, so
       set_levltyp_lit() leaves the cell unlit and draws nothing. */
    for (let y = ystart; y < Math.min(ROWNO, ystart + ysize); y++)
        for (let x = xstart; x < Math.min(COLNO, xstart + xsize); x++) {
            const mptyp = mapfrag_get(mf, x - xstart, y - ystart);
            if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE) continue;
            const loc = game.level.at(x, y);
            if (!loc) continue;
            /* C's rm struct overloads ONE field: doormask, wall_info, ladder,
               drawbridgemask and altarmask are all #define'd to flags
               (include/rm.h:213-217). So `levl[x][y].flags = 0` clears every
               one of them. In JS they are separate properties and have to be
               cleared individually. */
            loc.flags = 0;
            loc.doormask = 0;
            loc.wall_info = 0;
            loc.ladder = 0;
            loc.drawbridgemask = 0;
            loc.altarmask = 0;
            loc.horizontal = false;
            loc.roomno = NO_ROOM;
            loc.edge = 0;
            sel_set_ter(x, y, mptyp);
        }

    /* the map's own coordinate frame, which its contents() are relative to */
    game.xstart = xstart; game.ystart = ystart;
    game.xsize = xsize; game.ysize = ysize;

    if (contents) contents();
}

// src/sp_lev.c sel_set_ter()
function sel_set_ter(x, y, typ) {
    const loc = game.level.at(x, y);
    loc.typ = typ;
    loc.lit = false;
    if (loc.typ === SDOOR || IS_DOOR(loc.typ)) {
        if (loc.typ === SDOOR) loc.doormask = D_CLOSED;
        const left = game.level.at(x - 1, y);
        if (x && left && (IS_WALL(left.typ) || left.horizontal))
            loc.horizontal = true;
    } else if (loc.typ === HWALL || loc.typ === IRONBARS) {
        loc.horizontal = true;
    }
}

// src/sp_lev.c:5584 lspo_region(), irregular branch — the only one a themeroom
// reaches. Coordinates are relative to the map placed by lspo_map().
export function lspo_region(dx1, dy1, rtype, irregular, needfill, contents,
                            joined = true) {
    let rlit = litstate_rnd(-1);            /* sp_lev.c:5638 */

    const x = (game.xstart ?? 0) + dx1;
    const y = (game.ystart ?? 0) + dy1;

    /* room_not_needed is false here: in_mk_themerooms is set */
    if (game.level.nroom >= MAXNROFROOMS) return null;

    const g = game;
    g.min_rx = g.max_rx = x;
    g.min_ry = g.max_ry = y;
    g.smeq[g.level.nroom] = g.level.nroom;
    flood_fill_rm(x, y, g.level.nroom + ROOMOFFSET, rlit, true);

    add_room_fn(g.min_rx, g.min_ry, g.max_rx, g.max_ry, false, rtype, true);
    const troom = g.level.rooms[g.level.nroom - 1];
    troom.rlit = rlit;
    troom.irregular = true;
    troom.needfill = needfill;
    /* get_table_boolean_opt(L, "joined", TRUE) — filler_region passes no
       `joined` key, so its regions ARE joined by makecorridors. Only
       'Water-surrounded vault' asks for joined = false. */
    troom.needjoining = joined;

    /* src/sp_lev.c:5693 — the region is PUSHED as the current room before its
       contents run, so every des.* verb inside sees it as gc.coder->croom. */
    create_des_coder();
    if (contents) {
        spo_push_room(troom);
        contents(troom);
        spo_endroom();
    }
    add_doors_to_room(troom);
    return troom;
}

// src/sp_lev.c add_doors_to_room()
function add_doors_to_room(croom) {
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = game.level.at(x, y);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                maybe_add_door(x, y, croom);
        }
}

// src/sp_lev.c maybe_add_door() — record a door already stamped by the map.
function maybe_add_door(x, y, croom) {
    const loc = game.level.at(x, y);
    if (!loc) return;
    if (croom.irregular) {
        const rmno = croom.roomnoidx + ROOMOFFSET;
        if (loc.edge && (loc.roomno === rmno || loc.roomno === 1 /*SHARED*/))
            add_door_fn(x, y, croom);
    } else if (x === croom.lx - 1 || x === croom.hx + 1
               || y === croom.ly - 1 || y === croom.hy + 1) {
        add_door_fn(x, y, croom);
    }
}

/* mklev.js owns add_room/add_door; wired at load to avoid an import cycle */
let add_room_fn = () => {}, add_door_fn = () => {};
export function sp_lev_wire(addRoom, addDoor, someXY) {
    add_room_fn = addRoom;
    add_door_fn = addDoor;
    somexy_fn = someXY;
}

/* somexy() lives in js/mklev.js and mklev.js imports this file, so importing it
   back directly is a cycle: it resolves to a TDZ error on this module's own
   consts. The established fix here is the wire above, same as add_room. */
let somexy_fn = null;

// src/sp_lev.c:4978 lspo_terrain() — set the terrain of every square in a
// selection. `des.terrain(sel, "I")` is the argc == 2 form.
//
// No draws. sel_set_ter() is the same per-square worker lspo_map() uses, so a
// terrain change from a themeroom fill and one from a stamped map produce
// identical cells.
export function lspo_terrain(sel, mapchr) {
    const ter = splev_chr2typ(mapchr);

    if (ter === INVALID_TYPE)
        return;                             /* nhl_error("Erroneous map char") */

    selection_iterate(sel, sel_set_ter, ter);
}

// src/sp_lev.c:3059 l_push_mkroom_table() — the shape a `contents` function
// actually receives.
//
// The Lua sees a TABLE, not the C mkroom: width and height are derived, the
// corners come through as a `region`, and rlit arrives as a boolean `lit`. A
// fill written against the C struct reads undefined for every one of them,
// which silently changes how many times its loops run.
export function mkroom_table(tmpr) {
    return {
        width: 1 + (tmpr.hx - tmpr.lx),
        height: 1 + (tmpr.hy - tmpr.ly),
        region: { x1: tmpr.lx, y1: tmpr.ly, x2: tmpr.hx, y2: tmpr.hy },
        lit: !!tmpr.rlit,
        irregular: !!tmpr.irregular,
        needjoining: !!tmpr.needjoining,
        /* the C mkroom itself, for selection_from_mkroom() */
        _mkroom: tmpr,
    };
}

// src/sp_lev.c is_ok_location() — may this square host what we are placing?
export function is_ok_location(x, y, humidity) {
    const typ = game.level?.at(x, y)?.typ;

    if (typ === undefined)
        return false;

    if (humidity & ANY_LOC)
        return true;
    if ((humidity & SOLID) && IS_OBSTRUCTED(typ))
        return true;
    if ((humidity & (DRY | SPACELOC)) && SPACE_POS(typ)) {
        const bould = sobj_at(ONAMES.BOULDER, x, y) !== null;

        if (!bould || (bould && (humidity & SOLID)))
            return true;
    }
    if ((humidity & WET) && mon_fns.is_pool(x, y))
        return true;
    if ((humidity & HOT) && mon_fns.is_lava(x, y))
        return true;
    return false;
}

// src/sp_lev.c get_location() — resolve a coordinate, picking at random when
// it is negative.
//
// The random arm retries up to 100 times, spending a somexy() (inside a room)
// or an rn2 PAIR (outside one) each pass, and only stops early when
// is_ok_location() accepts. The exhaustive fallback after 100 tries draws
// nothing at all, so a crowded level costs exactly 100 tries and no more.
export function get_location(x, y, humidity, croom) {
    let cpt = 0;
    let mx, my, sx, sy;

    if (croom) {
        mx = croom.lx;
        my = croom.ly;
        sx = croom.hx - mx + 1;
        sy = croom.hy - my + 1;
    } else {
        mx = game.xstart ?? 0;
        my = game.ystart ?? 0;
        sx = game.xsize ?? COLNO;
        sy = game.ysize ?? ROWNO;
    }

    if (x >= 0) {                       /* normal locations */
        x += mx;
        y += my;
    } else {                            /* random location */
        let found = false;

        do {
            if (croom) {                /* handle irregular areas */
                const tmpc = { x: 0, y: 0 };
                somexy_fn(croom, tmpc);
                x = tmpc.x;
                y = tmpc.y;
            } else {
                x = mx + rn2(sx);
                y = my + rn2(sy);
            }
            if (is_ok_location(x, y, humidity)) {
                found = true;
                break;
            }
        } while (++cpt < 100);

        if (!found && cpt >= 100) {
            /* last try — an exhaustive scan, no draws */
            for (let xx = 0; xx < sx && !found; xx++)
                for (let yy = 0; yy < sy; yy++) {
                    if (is_ok_location(mx + xx, my + yy, humidity)) {
                        x = mx + xx;
                        y = my + yy;
                        found = true;
                        break;
                    }
                }
            if (!found) {
                if (!(humidity & NO_LOC_WARN)) {
                    x = game.x_maze_max ?? COLNO - 1;
                    y = game.y_maze_max ?? ROWNO - 1;
                } else {
                    x = y = -1;
                }
            }
        }
    }

    if (!(humidity & ANY_LOC) && !isok(x, y)) {
        if (!(humidity & NO_LOC_WARN)) {
            x = game.x_maze_max ?? COLNO - 1;
            y = game.y_maze_max ?? ROWNO - 1;
        } else {
            x = y = -1;
        }
    }
    return { x, y };
}

// include/sp_lev.h:66,82-84 — a packed coordinate.
export const SP_COORD_IS_RANDOM = 0x01000000;
export const SP_COORD_X = (l) => l & 0xff;
export const SP_COORD_Y = (l) => (l >> 16) & 0xff;
export const SP_COORD_PACK = (x, y) => ((x & 0xff) + ((y & 0xff) << 16));
export const SP_COORD_PACK_RANDOM = (f) => (SP_COORD_IS_RANDOM | (f));

// src/sp_lev.c get_unpacked_coord() — split a packed coord into x, y and the
// humidity flags. A random coord carries its OWN flags in the low bits and only
// falls back to the caller's default when it has none.
export function get_unpacked_coord(loc, defhumidity) {
    if (loc & SP_COORD_IS_RANDOM) {
        let getloc_flags = loc & ~SP_COORD_IS_RANDOM;
        if (!getloc_flags)
            getloc_flags = defhumidity;
        return { x: -1, y: -1, is_random: 1, getloc_flags };
    }
    return {
        x: SP_COORD_X(loc), y: SP_COORD_Y(loc),
        is_random: 0, getloc_flags: defhumidity,
    };
}

// src/sp_lev.c get_location_coord() — resolve a packed coord.
//
// The retry at the end is the part worth copying exactly: when a RANDOM coord
// resolved to nothing, C calls get_location() a SECOND time with the caller's
// humidity rather than the packed flags. That second call spends its own draws,
// so collapsing the two loses up to 100 tries' worth.
export function get_location_coord(x, y, humidity, croom, crd) {
    const c = get_unpacked_coord(crd, humidity);
    let r = get_location(c.x, c.y,
                         c.getloc_flags | (c.is_random ? NO_LOC_WARN : 0),
                         croom);

    if (r.x === -1 && r.y === -1 && c.is_random)
        r = get_location(c.x, c.y, humidity, croom);

    return r;
}

// src/sp_lev.c:1360 get_room_loc() — a position inside a room; negative means
// random. somexy() may retry inside an irregular room, spending a pair each
// pass; the explicit arm spends at most one rn2 per axis.
export function get_room_loc(x, y, croom) {
    if (x < 0 && y < 0) {
        const c = { x: 0, y: 0 };
        if (somexy_fn(croom, c))
            return { x: c.x, y: c.y };
        return { x, y };                /* panic("can't find a place!") */
    }
    if (x < 0) x = rn2(croom.hx - croom.lx + 1);
    if (y < 0) y = rn2(croom.hy - croom.ly + 1);
    return { x: x + croom.lx, y: y + croom.ly };
}

// src/sp_lev.c get_free_room_loc() — a ROOM square, retrying up to 100 times.
//
// The first get_location_coord() is spent UNCONDITIONALLY; the loop only runs
// if it landed on a non-ROOM square, and each pass costs another get_room_loc().
export function get_free_room_loc(x, y, croom, pos) {
    let t = get_location_coord(x, y, DRY, croom, pos);
    let trycnt = 0;

    if (game.level?.at(t.x, t.y)?.typ !== ROOM) {
        do {
            t = get_room_loc(x, y, croom);
        } while (game.level?.at(t.x, t.y)?.typ !== ROOM && ++trycnt <= 100);
    }
    return t;
}

// src/sp_lev.c:4323 trap_types[] — the des.trap() name table, in C's order.
const trap_types = [
    ['arrow', ARROW_TRAP], ['dart', DART_TRAP], ['falling rock', ROCKTRAP],
    ['board', SQKY_BOARD], ['bear', BEAR_TRAP], ['land mine', LANDMINE],
    ['rolling boulder', ROLLING_BOULDER_TRAP], ['sleep gas', SLP_GAS_TRAP],
    ['rust', RUST_TRAP], ['fire', FIRE_TRAP], ['pit', PIT],
    ['spiked pit', SPIKED_PIT], ['hole', HOLE], ['trap door', TRAPDOOR],
    ['teleport', TELEP_TRAP], ['level teleport', LEVEL_TELEP],
    ['magic portal', MAGIC_PORTAL], ['web', WEB], ['statue', STATUE_TRAP],
    ['magic', MAGIC_TRAP], ['anti magic', ANTI_MAGIC],
    ['polymorph', POLY_TRAP], ['vibrating square', VIBRATING_SQUARE],
    ['random', -1],
];

// src/sp_lev.c:4379 get_traptype_byname() — case-insensitive, NO_TRAP if absent.
export function get_traptype_byname(trapname) {
    for (const [name, type] of trap_types)
        if (name.toLowerCase() === String(trapname).toLowerCase())
            return type;
    return NO_TRAP;
}

// src/sp_lev.c create_trap() — place one trap from a des.trap() spec.
//
// Note it calls mktrap with croom = NULL and an explicit tm, so mktrap's own
// placement retry never runs; the searching happens HERE, and the two paths
// differ. Inside a room it is get_free_room_loc (which retries on non-ROOM
// squares); outside one it retries only while the square is stairs or a
// ladder, up to 100 times.
//
// mktrap_flags starts as MKTRAP_MAZEFLAG, which matters because mktrap tests
// that flag before deciding it has no way to place anything.
export function create_trap(t, croom) {
    let pos;

    if (t.type === VIBRATING_SQUARE) {
        note_unported('create_trap:vibrating square');
        return;
    } else if (croom) {
        pos = get_free_room_loc(-1, -1, croom, t.coord);
    } else {
        let trycnt = 0;
        do {
            pos = get_location_coord(-1, -1, DRY, croom, t.coord);
        } while ((game.level?.at(pos.x, pos.y)?.typ === STAIRS
                  || game.level?.at(pos.x, pos.y)?.typ === LADDER)
                 && ++trycnt <= 100);
        if (trycnt > 100)
            return;
    }

    let mktrap_flags = MKTRAP_MAZEFLAG;
    if (!t.spider_on_web) mktrap_flags |= MKTRAP_NOSPIDERONWEB;
    if (t.seen)           mktrap_flags |= MKTRAP_SEEN;
    if (t.novictim)       mktrap_flags |= MKTRAP_NOVICTIM;

    mktrap_fn(t.type, mktrap_flags, null, { x: pos.x, y: pos.y });
}

// src/sp_lev.c:4397 lspo_trap() — the des.trap() verb.
//
// Defaults come from the C: spider_on_web starts TRUE, seen and novictim
// FALSE. The string and (string, x, y) forms leave them all at those defaults;
// only the table form can change them.
export function lspo_trap(type, x, y, opts) {
    const t = {
        type,
        spider_on_web: opts?.spider_on_web !== undefined
                       ? !!opts.spider_on_web : true,
        seen: !!opts?.seen,
        novictim: opts?.victim !== undefined ? !opts.victim : false,
        coord: (x === undefined || x === -1) && (y === undefined || y === -1)
               ? SP_COORD_PACK_RANDOM(0)
               : SP_COORD_PACK(x, y),
    };

    if (t.type === undefined || t.type === NO_TRAP)
        return;                         /* nhl_error("Unknown trap type") */

    create_trap(t, game.coder?.croom ?? null);
}

// src/sp_lev.c:3881 lspo_engraving() — the des.engraving() verb.
//
// Draws nothing itself. get_location_coord() only spends draws when the coord
// is RANDOM, and make_engr_at() only when the type is <= 0; the table form
// always resolves a real type from engrtypes2i[] and every themeroom caller
// passes a real coord.
//
// C's default type is "engrave", not "dust", even though etyp is initialised to
// DUST -- the initialiser is dead, get_table_option() overwrites it.
const engrtypes = ['dust', 'engrave', 'burn', 'mark', 'blood'];
const engrtypes2i = [DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD];

export function lspo_engraving(opts) {
    let x = -1, y = -1;

    if (opts?.coord) {
        x = opts.coord.x;
        y = opts.coord.y;
    } else if (opts?.x !== undefined || opts?.y !== undefined) {
        x = opts.x ?? -1;
        y = opts.y ?? -1;
    }

    const ti = engrtypes.indexOf(opts?.type ?? 'engrave');
    const etyp = engrtypes2i[ti < 0 ? 1 : ti];
    const txt = opts?.text ?? '';
    /* C: degrade defaults TRUE, guardobjects FALSE */
    const wipeout = opts?.degrade !== undefined ? !!opts.degrade : true;
    const guardobjs = !!opts?.guardobjects;

    const ecoord = (x === -1 && y === -1) ? SP_COORD_PACK_RANDOM(0)
                                          : SP_COORD_PACK(x, y);

    const r = get_location_coord(x, y, DRY, game.coder?.croom ?? null, ecoord);

    make_engr_at(r.x, r.y, txt, null, 0, etyp);

    const ep = engr_at(r.x, r.y);
    if (ep) {
        ep.guardobjects = guardobjs ? 1 : 0;
        ep.nowipeout = !wipeout;
    }
}

/* mktrap() lives in js/mklev.js, which imports this file; routed through the
   wire for the same cycle reason as somexy. */
let mktrap_fn = null;
export function sp_lev_wire_mktrap(fn) { mktrap_fn = fn; }

// src/sp_lev.c:3662 — the class/id fixup lspo_object applies AFTER parsing all
// its argument forms, and before create_object ever runs.
//
// This is load-bearing and 1,400 lines away from the code it fixes up. Every
// argument form sets class = -1 for a multi-character name, which would send
// create_object down its OCLASSES.RANDOM_CLASS arm; this puts the class back from the
// object's own oc_class so mksobj_at is reached instead. The converse arm
// forces id to -1 when a class was given without one, which is what routes
// that case to def_char_to_objclass/mkgold.
export function lspo_object_fixup(o) {
    if (o.class === -1 && o.id > STRANGE_OBJECT)
        o.class = game.objects[o.id].oc_class;
    else if (o.class > -1 && o.id === STRANGE_OBJECT)
        o.id = -1;
    return o;
}

// src/sp_lev.c:2193 create_object() — place one object from a des.object spec.
//
// The three arms draw differently: mkobj_at(OCLASSES.RANDOM_CLASS) picks a class and
// then an object within it, mkobj_at(oclass) picks only the object, and
// mksobj_at knows the type and picks neither. Which arm runs is decided by the
// fixup above, not by what the Lua looks like it asked for.
export function create_object(o, croom) {
    const named = !!o.name;
    const pos = get_location_coord(-1, -1, DRY, croom, o.coord);
    const x = pos.x, y = pos.y;
    const c = (o.class >= 0) ? o.class : 0;
    let otmp;

    if (!c) {
        otmp = mkobj_at(OCLASSES.RANDOM_CLASS, x, y, !named);
    } else if (o.id !== -1) {
        otmp = mksobj_at(o.id, x, y, true, !named);
    } else {
        /* the level description carries the default "text" class characters */
        const oclass = def_char_to_objclass(String.fromCharCode(c));

        if (oclass === OCLASSES.MAXOCLASSES)
            return null;                /* panic("unexpected object class") */

        /* KMH -- Create piles of gold properly */
        if (oclass === OCLASSES.COIN_CLASS)
            otmp = mkgold(0, x, y);
        else
            otmp = mkobj_at(oclass, x, y, !named);
    }

    if (!otmp)
        return null;

    if (o.spe !== -127)                 /* -127 means NOT random */
        otmp.spe = o.spe;

    /* src/sp_lev.c create_object() — get_table_buc's seven states.
       Case 5 is the only one that DRAWS: blessorcurse(otmp, 1) is
       `if (!rn2(1)) { if (!rn2(2)) curse else bless }`, so it spends two calls
       unless the object is already blessed or cursed, in which case it returns
       before drawing at all. */
    switch (o.curse_state) {
    case 1:                                             /* blessed */
        otmp.blessed = 1; otmp.cursed = 0;
        break;
    case 2:                                             /* uncursed */
        otmp.blessed = 0; otmp.cursed = 0;
        break;
    case 3:                                             /* cursed */
        otmp.blessed = 0; otmp.cursed = 1;
        break;
    case 4:                                             /* not cursed */
        otmp.cursed = 0;
        break;
    case 5:                                             /* not uncursed */
        blessorcurse(otmp, 1);
        break;
    case 6:                                             /* not blessed */
        otmp.blessed = 0;
        break;
    default:                                            /* random */
        break;                                  /* keep what mkobj gave us */
    }

    /* src/sp_lev.c:2304 create_object() — containment.
       SP_OBJ_CONTENT puts this object INSIDE the innermost open container;
       SP_OBJ_CONTAINER opens this one for the objects its contents closure
       makes. The stack is what lets `des.object({contents=...})` nest.

       C's outer test is `SP_OBJ_CONTENT || invent_carrying_monster`, and the
       empty-stack arm then either drops the object on the floor or hands it to
       that monster. invent_carrying_monster is not modelled, so the arm this
       port can reach is the floor one, which does nothing. */
    if (o.containment & SP_OBJ_CONTENT) {
        if (container_obj.length) {
            const cobj = container_obj[container_obj.length - 1];

            obj_extract_self(otmp);     /* remove_object() */
            if (cobj) {
                otmp = add_to_container(cobj, otmp);
                cobj.owt = weight(cobj);
            } else {
                /* The slot was cleared because bury_an_obj() freed the
                   container out from under us. C destroys the would-be content
                   rather than dropping it on the floor, and returns NULL. */
                obj_extract_self(otmp);
                if (otmp.oartifact)
                    note_unported('create_object:artifact_exists');
                return null;            /* obfree(otmp, NULL) */
            }
        }
    }

    if (o.containment & SP_OBJ_CONTAINER) {
        otmp.cobj = [];                 /* delete_contents(otmp) */
        if (container_obj.length < MAX_CONTAINMENT)
            container_obj.push(otmp);
        else
            note_unported('create_object:too deeply nested containers');
    }

    /* src/sp_lev.c create_object() — a named montype is applied through
       set_corpsenm(), which starts the corpse's rot timer (its rnz is five
       PRNG calls). Skipping it left that timer unset and its draws unspent. */
    if (o.corpsenm !== undefined && o.corpsenm !== NON_PM)
        set_corpsenm(otmp, o.corpsenm);

    if (!(o.containment & SP_OBJ_CONTENT)) {
        if (o.buried) {
            const dealloced = { v: false };

            bury_an_obj(otmp, dealloced);
            if (dealloced.v) {
                /* C nulls the slot WITHOUT popping it: container_idx keeps its
                   value, so the stack still has to be popped by lspo_object.
                   Assigning past the end here would grow the array, so only
                   touch it when something is actually open. */
                if (container_obj.length)
                    container_obj[container_obj.length - 1] = null;
                otmp = null;
            }
        }
    }

    /* quantity, lit, eroded, locked, trapped and name still record. */
    if (o.quan > 0 || o.lit)
        note_unported('create_object:options');

    return otmp;
}

// src/sp_lev.c:3557 lspo_object() — the des.object() verb, simple forms.
export function lspo_object(idOrClass, x, y, opts) {
    const o = {
        class: -1, id: STRANGE_OBJECT, spe: -127, curse_state: 0,
        containment: 0,
        quan: -1, buried: 0, lit: 0, name: opts?.name ?? null,
        contents: opts?.contents ?? null,
        coord: 0,
    };

    /* `coord = {x,y}` in the option table is the same thing as positional x,y */
    if (opts?.coord) {
        x = opts.coord.x;
        y = opts.coord.y;
    }
    o.coord = (x === undefined || x === -1) && (y === undefined || y === -1)
              ? SP_COORD_PACK_RANDOM(0)
              : SP_COORD_PACK(x, y);
    if (opts?.buc !== undefined)
        o.curse_state = get_table_buc(opts.buc);

    if (typeof idOrClass === 'string' && idOrClass.length === 1) {
        o.class = idOrClass.charCodeAt(0);
        o.id = STRANGE_OBJECT;
    } else if (idOrClass !== undefined && idOrClass !== null) {
        o.class = -1;
        o.id = (typeof idOrClass === 'number') ? idOrClass
                                               : find_objtype(idOrClass);
    }

    /* src/sp_lev.c lspo_object() — `montype` names the species a corpse,
       figurine or egg came from. It is resolved WITHOUT a gender draw here,
       unlike des.monster()'s id, and create_object hands it to set_corpsenm,
       which is what starts a corpse's rot timer. */
    if (opts?.montype !== undefined && opts.montype !== null)
        o.corpsenm = (typeof opts.montype === 'number')
                     ? opts.montype : name_to_mon(opts.montype);

    if (opts?.buried) o.buried = 1;
    if (opts?.lit)    o.lit = 1;

    if (opts?.contents) o.containment |= SP_OBJ_CONTAINER;
    if (opts?.inContainer) o.containment |= SP_OBJ_CONTENT;

    lspo_object_fixup(o);
    const otmp = create_object(o, game.coder?.croom ?? null);

    /* The contents closure runs with this object open as the container, then
       the stack is popped. C runs the closure even when create_object returned
       NULL (nhl_push_obj pushes nil), and pops on the CONTAINER flag rather
       than on otmp, so a failed container still balances the stack. */
    if (opts?.contents) {
        opts.contents(otmp);
        spo_pop_container();
    }
    return otmp;
}

// src/sp_lev.c:6334 sp_level_coder_init() / create_des_coder().
//
// gc.coder was never created in this port, so every `game.coder?.croom` read
// was undefined and every des.* verb behaved as though no room were open.
//
// n_subroom starts at ONE, not zero, with tmproomlist[0] left NULL. That is
// why update_croom() reads tmproomlist[n_subroom - 1] and still yields null at
// the top level, and why spo_endroom() pops only while n_subroom > 1.
export function create_des_coder() {
    if (game.coder)
        return;
    game.coder = {
        premapped: false, solidify: false, check_inaccessibles: false,
        allow_flips: 3, croom: null, n_subroom: 1,
        lvl_is_joined: false, room_stack: 0, tmproomlist: [],
    };
    update_croom();
}

// src/sp_lev.c:6323 update_croom() — croom is the top of the room stack.
function update_croom() {
    if (!game.coder)
        return;
    const n = game.coder.n_subroom || 0;
    game.coder.croom = n ? (game.coder.tmproomlist[n - 1] ?? null) : null;
}

export function spo_push_room(troom) {
    if (!game.coder)
        return;
    game.coder.tmproomlist[game.coder.n_subroom] = troom;
    game.coder.n_subroom++;
    update_croom();
}

// src/sp_lev.c spo_endroom()
export function spo_endroom() {
    if (!game.coder)
        return;
    if ((game.coder.n_subroom || 0) > 1) {
        game.coder.n_subroom--;
        game.coder.tmproomlist[game.coder.n_subroom] = null;
    }
    update_croom();
}

// src/sp_lev.c:4772 cvt_to_abscoord() and its inverse cvt_to_relcoord().
//
// These are the other half of croom. Every coordinate handed OUT to the level
// Lua is made room-relative, and get_location() adds the origin back on the
// way IN, so the Lua works in relative coordinates throughout and the round
// trip is exact.
//
// Handing back ABSOLUTE coordinates is correct only while croom is null,
// because then mx/my are xstart/ystart. Setting croom without converting
// offsets every explicit coordinate by the room origin a second time.
export function cvt_to_abscoord(c) {
    if (game.coder && game.coder.croom) {
        c.x += game.coder.croom.lx;
        c.y += game.coder.croom.ly;
    } else {
        c.x += game.xstart ?? 0;
        c.y += game.ystart ?? 0;
    }
}

export function cvt_to_relcoord(c) {
    if (game.coder && game.coder.croom) {
        c.x -= game.coder.croom.lx;
        c.y -= game.coder.croom.ly;
    } else {
        c.x -= game.xstart ?? 0;
        c.y -= game.ystart ?? 0;
    }
}

// src/sp_lev.c:3040 spo_pop_container() — close the innermost container.
//
// C decrements the index and NULLS the slot; it does not shrink an array. That
// distinction matters because create_object's buried-dealloc path writes NULL
// into the top slot WITHOUT decrementing, so "slot is NULL" and "stack is
// empty" are different states that the SP_OBJ_CONTENT arm tells apart.
function spo_pop_container() {
    if (container_obj.length > 0)
        container_obj.pop();
}

// src/sp_lev.c find_objtype() — an object name to its index.
export function find_objtype(name) {
    const want = String(name).toLowerCase();

    for (let i = 1; i < game.objects.length; i++)
        if ((OBJ_NAME(game.objects[i]) || '').toLowerCase() === want)
            return i;
    return STRANGE_OBJECT;
}

// src/mkobj.c blessorcurse() — maybe bless or curse, one chance in `chance`.
// Returns WITHOUT drawing if the object already has a BUC state.
function blessorcurse(otmp, chance) {
    if (otmp.blessed || otmp.cursed)
        return;

    if (!rn2(chance)) {
        if (!rn2(2))
            otmp.cursed = 1;                            /* curse() */
        else
            otmp.blessed = 1;                           /* bless() */
    }
}

// src/sp_lev.c get_table_buc() — the buc option's seven states, in C's order.
const BUC_STATES = ['random', 'blessed', 'uncursed', 'cursed',
                    'not-cursed', 'not-uncursed', 'not-blessed'];
export const get_table_buc = (v) => {
    const i = BUC_STATES.indexOf(String(v));
    return i < 0 ? 0 : i;
};

// include/sp_lev.h — containment bits, and the open-container stack
// create_object pushes to. C caps it at MAX_CONTAINMENT and complains past it.
const SP_OBJ_CONTENT = 0x01, SP_OBJ_CONTAINER = 0x02;
// src/sp_lev.c:195 MAX_CONTAINMENT
const MAX_CONTAINMENT = 10;
const container_obj = [];

// src/dig.c bury_an_obj() — move an object into the buried list.
//
// The draw that matters here is obj_resists(otmp, 0, 0). With both chances 0
// the test `chance < 0` can never be true, so it always returns FALSE -- and it
// STILL spends its rn2(100). Skipping the call because its answer is known is
// the "computed and discarded" trap: the answer is constant, the draw is not.
//
// The second is start_timer's rnd(250) for organic material, gated on another
// obj_resists(otmp, 5, 95) which draws whether or not it passes.
//
// `dealloced` is C's out-parameter, and it is load-bearing rather than
// informational: ROCK and BOULDER are FREED here, they merge into the burying
// material rather than joining the buried list. Every caller that can bury an
// object it still holds a pointer to has to be told, or it keeps using freed
// memory. create_object is one such caller -- see the container_obj clear at
// its call site.
//
// C also returns otmp2 (the pile's nexthere, read before the extract so the
// caller can keep walking a chain it is mutating). This port keeps object
// piles as a flat list rather than a nexthere chain (see js/invent.js:141), and
// the only caller of that return value is bury_objs(), which is not ported, so
// there is nothing here to return it from.
export function bury_an_obj(otmp, dealloced) {
    if (dealloced)
        dealloced.v = false;

    if (obj_resists(otmp, 0, 0))
        return;                         /* Riders, Amulet, invocation tools */

    obj_extract_self(otmp);

    const under_ice = game.level?.at(otmp.ox, otmp.oy)?.typ === ICE;

    if ((otmp.otyp === ONAMES.ROCK && !under_ice)
        || otmp.otyp === ONAMES.BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.v = true;
        return;                         /* obfree() */
    }

    if (otmp.otyp === ONAMES.CORPSE) {
        /* already handled; should cancel the timer if under ice */
    } else if ((under_ice ? (otmp.oclass === OCLASSES.POTION_CLASS)
                          : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        start_timer((under_ice ? 0 : 250) + rnd(250),
                    TIMER_OBJECT, ROT_ORGANIC, otmp);
    }

    (game.level.buriedobjs ||= []).push(otmp);   /* add_to_buried() */
    otmp.where = OBJ_BURIED;
}

// include/obj.h is_organic()
const is_organic = (o) => game.objects[o.otyp].oc_material <= MATERIALS.WOOD;

const STRANGE_OBJECT = 0;

// src/drawing.c def_char_to_objclass() — a class symbol to its class index.
function def_char_to_objclass(ch) {
    for (let i = 1; i < OCLASSES.MAXOCLASSES; i++)
        if (def_oc_syms[i] === ch)
            return i;
    return OCLASSES.MAXOCLASSES;
}

// src/mkroom.c inside_room() — is (x,y) in this room, counting its wall ring?
//
// The rectangular arm is deliberately GENEROUS: it accepts lx-1 through hx+1,
// i.e. the walls as well as the floor. Only an irregular room uses the exact
// roomno test. create_monster rejects a monster placed outside this, so
// tightening it to the floor would reject placements C accepts.
export function inside_room(croom, x, y) {
    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        const loc = game.level?.at(x, y);
        return !!loc && !loc.edge && loc.roomno === i;
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

// src/mon.c pm_to_humidity() — which terrain this species may be placed on.
//
// The flags ACCUMULATE: a flying eel is WET from the first test and gains
// HOT|WET from the second, so the humidity a monster searches with is often
// several bits, and get_location's is_ok_location accepts any of them.
// src/sp_lev.c:1311 pm_good_location()
export function pm_good_location(x, y, pm) {
    return is_ok_location(x, y, pm_to_humidity(pm));
}

export function pm_to_humidity(pm) {
    let loc = DRY;

    if (!pm)
        return loc;
    if (pm.mlet === MONSYMS.S_EEL || amphibious(pm) || is_swimmer(pm))
        loc = WET;
    if (is_flyer(pm) || is_floater(pm))
        loc |= (HOT | WET);
    if (passes_walls(pm) || noncorporeal(pm))
        loc |= SOLID;
    if (likes_fire(pm))
        loc |= HOT;
    return loc;
}

// src/sp_lev.c create_monster() — place one monster from a des.monster spec.
//
// Two draw details that a natural translation loses:
//
//   1. A monster whose humidity is not DRY gets TWO full get_location_coord
//      calls when the first finds nothing: once with its own humidity plus
//      NO_LOC_WARN, then again with DRY added. Each can spend up to 100 tries.
//      Only the pm == 0 arm makes a single call.
//   2. In the Mines, a dwarf or gnome HERO makes every same-race monster spend
//      an rn2(3) that can discard the species entirely. The gate is on the
//      hero's race, not the monster's.
export function create_monster(m, croom) {
    let pm = null;

    if (m.id !== NON_PM) {
        pm = game.mons[m.id];
        /* the G_UNIQ/G_EXTINCT/G_GONE checks read mvitals, which this port
           does not track; nothing is genocided during level generation. */
    } else {
        pm = mkclass(m.class, G_NOGEN);
        /* pm == 0 here means the class was genocided; settle for random */
    }

    /* src/sp_lev.c — in the Mines a dwarf or gnome HERO makes every same-race
       monster spend an rn2(3) that can discard the species. your_race() and
       Race_if() need the hero's race, which is in u_init; recorded rather than
       assumed, because guessing false skips a draw C spends. */
    if (In_mines(game.u?.uz) && pm)
        note_unported('create_monster:mines_race_check');

    let pos;
    if (pm) {
        let loc = pm_to_humidity(pm);

        /* If water-liking monster, first try is without DRY */
        pos = get_location_coord(-1, -1, loc | NO_LOC_WARN, croom, m.coord);
        if (pos.x === -1 && pos.y === -1) {
            loc |= DRY;
            pos = get_location_coord(-1, -1, loc, croom, m.coord);
        }
    } else {
        pos = get_location_coord(-1, -1, DRY, croom, m.coord);
    }

    let { x, y } = pos;

    /* try to find a close place if someone else is already there.
       enexto() needs enexto_core/goodpos; when C's enexto FAILS it leaves x,y
       untouched, so recording and leaving them is the faithful gap. Returning
       false from a stub would silently relocate nothing; returning true would
       silently relocate everything. */
    if (mon_fns.m_at(x, y))
        note_unported('create_monster:enexto');

    if (croom && !inside_room(croom, x, y))
        return null;

    /* src/sp_lev.c create_monster() — a spec that named an alignment resolves
       it directly; anything else asks the LEVEL, and that draws. */
    let amask;
    if (m.sp_amask !== AM_SPLEV_RANDOM) {
        amask = sp_amask_to_amask(m.sp_amask);
        note_unported('create_monster:mk_roamer');
        return null;
    }
    amask = induced_align(80);
    if (m.id >= PMNAMES.PM_ARCHEOLOGIST && m.id <= PMNAMES.PM_WIZARD) {
        note_unported('create_monster:mk_mplayer');
        return null;
    }

    const mtmp = makemon(pm, x, y, m.mm_flags);

    if (mtmp) {
        /* src/sp_lev.c create_monster() — both are plain state, no draws.
           BOOL_RANDOM is -1 (include/global.h:103), so "leave it to makemon"
           and "explicitly awake" are DIFFERENT values and the test is `>`. */
        if (m.asleep > BOOL_RANDOM)
            mtmp.msleeping = m.asleep;

        if (m.appear_as) {
            /* "obj:chest" -> M_AP_OBJECT with the object's index */
            const [kind, what] = m.appear_as.split(':');
            if (kind === 'obj') {
                let i = 0;
                for (; i < game.objects.length; i++)
                    if (OBJ_NAME(game.objects[i]) === what)
                        break;
                if (i < game.objects.length) {
                    mtmp.m_ap_type = M_AP_OBJECT;
                    mtmp.mappearance = i;
                } /* else impossible("can't find object") */
            } else {
                note_unported(`create_monster:appear_as:${kind}`);
            }
        }
    }
    return mtmp;
}

// include/global.h:103 BOOL_RANDOM, include/monst.h:54 M_AP_OBJECT.
const BOOL_RANDOM = -1, M_AP_OBJECT = 2;

// include/monflag.h:214 enum mgender
const MALE = 0, FEMALE = 1, NEUTRAL = 2, NUM_MGENDERS = 3;
// include/permonst.h:15 — LOW_PM = NON_PM + 1, and NON_PM is -1.
const LOW_PM = 0;

// src/sp_lev.c:3142 find_montype() — resolve a monster NAME to its index and
// settle its gender.
//
// The gender settling DRAWS. A species that is male-only or female-only takes
// its own, and a name that carried a gender prefix keeps that, but anything
// else spends an rn2(2). The port resolved the name with name_to_mon() and
// never made that draw, so every des.monster("some name") in a themeroom was
// one call short.
//
// name_to_monplus() is name_to_mon() plus the gender-prefix parsing; no
// themeroom name currently carries one.
function find_montype(s, mgender) {
    let mgend = NEUTRAL;

    const i = name_to_mon(s, mgender);
    if (i >= LOW_PM && i < NUMMONS) {
        const ptr = game.mons[i];
        if (is_male(ptr) || is_female(ptr))
            mgend = is_female(ptr) ? FEMALE : MALE;
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

// src/sp_lev.c:3214 lspo_monster() — the des.monster() verb, simple forms.
export function lspo_monster(idOrClass, x, y, opts) {
    const m = {
        id: NON_PM, class: -1, coord: 0,
        sp_amask: AM_SPLEV_RANDOM,
        mm_flags: 0, peaceful: -1, asleep: BOOL_RANDOM, appear_as: null,
    };

    if (typeof idOrClass === 'string' && idOrClass.length === 1)
        m.class = idOrClass;
    else if (typeof idOrClass === 'number')
        m.id = idOrClass;
    else if (idOrClass) {
        const mgend = { v: NEUTRAL };
        m.id = find_montype(idOrClass, mgend);
        m.mgender = mgend.v;
    }

    if (opts?.class) m.class = opts.class;
    m.coord = (x === undefined || x === -1) && (y === undefined || y === -1)
              ? SP_COORD_PACK_RANDOM(0)
              : SP_COORD_PACK(x, y);

    m.asleep = (opts?.asleep === undefined) ? BOOL_RANDOM : (opts.asleep ? 1 : 0);
    m.appear_as = opts?.appear_as ?? null;

    return create_monster(m, game.coder?.croom ?? null);
}

// include/align.h:44 AM_SPLEV_RANDOM, include/monflag.h:197 G_NOGEN.
//
// Both were written from assumption first and were wrong: AM_SPLEV_RANDOM is
// 0x80, not 0, so `m.sp_amask !== AM_SPLEV_RANDOM` was true for every monster
// and sent them all down the mk_roamer arm; G_NOGEN is 0x0200, not 0x1000.
// src/mondata.c name_to_mon() — a monster name to its index.
// src/mondata.c:1038 name_to_monplus(), core loop.
//
// A permonst carries pmnames[] INDEXED BY GENDER, not a single name, and for
// many species only one slot is filled: a ghost is
// pmnames = [null, null, "ghost"], i.e. the NEUTRAL slot alone. Reading a
// scalar `pmname` therefore matched nothing at all for those, so every
// des.monster("ghost") in a themeroom silently fell through to a RANDOM
// monster and spent rndmonst's draws instead of the named species'.
//
// C takes the LONGEST match rather than the first, because names prefix each
// other ("ettin" against "ettin zombie"), and accepts a trailing word or a
// plural/possessive suffix so that "ettin zombie corpse" resolves. `matchgend`
// is the gender the matched slot implies, which is what find_montype reads
// before deciding whether to spend its rn2(2).
//
// Not ported: the leading article strip, the alternate-names table (about
// sixty entries: "genie", "high priestess", "wood elf" and so on), and
// title_to_mon. Every name the themerooms use is a plain pmnames[] entry.
export function name_to_mon(name, gender_name_var) {
    const str = String(name).toLowerCase();
    const slen = str.length;
    let mntmp = NON_PM, len = 0, matchgend = -1, exact_match = false;

    for (let i = LOW_PM; i < game.mons.length; i++) {
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            const nm = game.mons[i]?.pmnames?.[mgend];
            if (!nm)
                continue;

            const m_i_len = nm.length;
            if (m_i_len > len && str.startsWith(nm.toLowerCase())) {
                if (m_i_len === slen) {
                    mntmp = i; len = m_i_len; matchgend = mgend;
                    exact_match = true;
                    break;
                } else if (slen > m_i_len) {
                    const rest = str.slice(m_i_len);
                    if (rest[0] === ' ' || rest === 's' || rest.startsWith('s ')
                        || rest === "'" || rest.startsWith("' ")
                        || rest === "'s" || rest.startsWith("'s ")
                        || rest === 'es' || rest.startsWith('es ')) {
                        mntmp = i; len = m_i_len; matchgend = mgend;
                    }
                }
            }
        }
        if (exact_match)
            break;
    }

    if (gender_name_var && matchgend !== -1) {
        /* do not override a caller's male/female with a matched neuter name */
        if (!(matchgend === NEUTRAL
              && (gender_name_var.v === MALE || gender_name_var.v === FEMALE)))
            gender_name_var.v = matchgend;
    }
    return mntmp;
}

const AM_SPLEV_RANDOM = 0x80;
const G_NOGEN = 0x0200;

// src/sp_lev.c create_altar() — place one altar from a des.altar spec.
//
// Its only draw is `if (a->shrine < 0) a->shrine = rn2(2)`, and that fires
// only for a RANDOM shrine type. lspo_altar's `type` option defaults to
// "altar" (index 0), so an altar with no type spends nothing -- which is what
// Temple of the gods does three times.
export function create_altar(a, croom) {
    let croom_is_temple = true;
    let pos;

    if (croom) {
        pos = get_free_room_loc(-1, -1, croom, a.coord);
        if (croom.rtype !== TEMPLE)
            croom_is_temple = false;
    } else {
        pos = get_location_coord(-1, -1, DRY, croom, a.coord);
        /* in_rooms(x, y, TEMPLE) needs the room-type index; without it we
           cannot tell a temple from an ordinary room here. */
        croom_is_temple = false;
    }

    const loc = game.level?.at(pos.x, pos.y);
    if (!loc)
        return;

    /* check for existing features — set_levltyp refuses non-SPACE_POS terrain */
    if (!SPACE_POS(loc.typ))
        return;
    loc.typ = ALTAR;

    loc.altarmask = sp_amask_to_amask(a.sp_amask);

    if (a.shrine < 0)
        a.shrine = rn2(2);              /* handle random case */

    if (!croom_is_temple || !a.shrine)
        return;

    note_unported('create_altar:shrine');
}

// src/sp_lev.c sp_amask_to_amask() — the three SPLEV pseudo-alignments resolve
// against the HERO's original alignment, not the level's.
function sp_amask_to_amask(sp_amask) {
    if (sp_amask === AM_SPLEV_CO || sp_amask === AM_SPLEV_NONCO
        || sp_amask === AM_SPLEV_RANDOM) {
        note_unported('sp_amask_to_amask:hero_alignment');
        return 0;
    }
    return sp_amask & AM_MASK;
}

// src/sp_lev.c:4029 lspo_altar() — the des.altar() verb.
export function lspo_altar(opts) {
    const SHRINES = ['altar', 'shrine', 'sanctum'];
    const a = {
        coord: SP_COORD_PACK_RANDOM(0),
        sp_amask: opts?.align ?? AM_SPLEV_RANDOM,
        shrine: Math.max(0, SHRINES.indexOf(opts?.type ?? 'altar')),
    };

    if (opts?.x !== undefined && opts?.y !== undefined)
        a.coord = SP_COORD_PACK(opts.x, opts.y);

    return create_altar(a, game.coder?.croom ?? null);
}

const AM_SPLEV_CO = 0x20, AM_SPLEV_NONCO = 0x40, AM_MASK = 0x07;

// src/sp_lev.c:4028 lspo_room() — the des.room() verb, as a real function so it
// can NEST. The option handling used to live inline in themerooms_generate's
// switch, which could only ever build the top-level room.
//
// Two things at the top of the C that are easy to miss:
//
//   if (gi.in_mk_themerooms && gt.themeroom_failed) return 0;
//
// a failed themeroom short-circuits EVERY later des.room in the same theme, so
// the inner rooms of "Room in a room" are skipped wholesale rather than
// attempted individually; and n_subroom > MAX_NESTED_ROOMS panics, so the
// depth is bounded.
//
// build_room() dispatches on whether a parent room is open: with one it calls
// create_subroom(), without it create_room(). Using create_room for both makes
// the inner room a sibling instead of a subroom.
export function lspo_room(opts, create_room_fn, topologize_fn) {
    /* sp_lev.c:4035 — w and h default to -1 (random). When the Lua computes
       them, e.g. `w = nh.rn2(10)+11`, those draws are ARGUMENTS and are spent
       before lspo_room is entered at all, hence before the chance roll below. */
    const w = opts?.w ?? -1, h = opts?.h ?? -1;
    if (game.in_mk_themerooms && game.themeroom_failed)
        return null;

    const rtype = (opts?.type === 'themed') ? THEMEROOM : OROOM;
    const rlit = (opts?.lit === undefined) ? -1 : (opts.lit ? 1 : 0);
    /* "theme rooms default to unfilled" — sp_lev.c:4049 */
    const needfill = (opts?.filled === undefined)
                     ? (game.in_mk_themerooms ? FILL_NONE : FILL_NORMAL)
                     : (opts.filled ? FILL_NORMAL : FILL_NONE);

    /* sp_lev.c:2811 build_room() — chance defaults to 100, so the roll is
       always spent and always passes. */
    rn2(100);

    /* src/sp_lev.c:2811 build_room() — with a parent room open this is a
       SUBROOM, and create_subroom spends four rnd() draws of its own. */
    const parent = game.coder?.croom ?? null;
    const ok = parent
        ? create_subroom_fn(parent, -1, -1, w, h, rtype, rlit)
        : create_room_fn(-1, -1, w, h, -1, -1, rtype, rlit);
    if (!ok) {
        if (game.in_mk_themerooms)
            game.themeroom_failed = true;
        return null;
    }

    /* the room just built: a subroom went into its own array */
    const aroom = parent
        ? game.level.subrooms[game.level.subrooms.length - 1]
        : game.level.rooms[game.level.nroom - 1];
    if (!aroom)
        return null;

    topologize_fn(aroom);
    aroom.needfill = needfill;

    /* src/sp_lev.c:4091 — lspo_room pushes the room onto the coder's stack
       and calls update_croom(), the same mechanism lspo_region uses. C calls
       create_des_coder() at the top of every des.* verb. */
    create_des_coder();
    if (opts?.contents) {
        spo_push_room(aroom);
        opts.contents(mkroom_table(aroom));
        spo_endroom();
    }
    return aroom;
}

// src/sp_lev.c create_door() — the des.door() verb's worker.
//
// Twelve draw sites. Two structures matter:
//
//  1. The mask cascade is NESTED, so the number of draws depends on which way
//     each one falls: a non-secret door spends rn2(3), then on a 0 spends
//     rn2(5), possibly rn2(6), and possibly rn2(25). Flattening it into one
//     roll per property would spend a fixed count where C spends a variable one.
//  2. The placement loop spends rn2(4) EVERY pass, before the wall test that
//     may `continue`. A pass that rejects the wall still cost its draw, and the
//     position rn2 is only spent on a pass that gets past that test.
export function create_door(dd, broom) {
    if (dd.secret === -1)
        dd.secret = rn2(2);

    if (dd.wall === W_RANDOM)
        dd.wall = W_ANY;                /* speeds up the loop below */

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
            } else {
                dd.mask = D_NODOOR;
            }
        } else {
            if (!rn2(5))
                dd.mask = D_LOCKED;
            else
                dd.mask = D_CLOSED;

            if (!rn2(20))
                dd.mask |= D_TRAPPED;
        }
    }

    let x = 0, y = 0, trycnt;
    for (trycnt = 0; trycnt < 100; ++trycnt) {
        const dwall = dd.wall, dpos = dd.pos;
        const span = (a, b) => (dpos === -1) ? rn2(1 + b - a) : dpos;
        let ok = false;

        switch (rn2(4)) {
        case 0:
            if (!(dwall & W_NORTH)) continue;
            y = broom.ly - 1;
            x = broom.lx + span(broom.lx, broom.hx);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(game.level.at(x, y - 1)?.typ))
                continue;
            ok = true; break;
        case 1:
            if (!(dwall & W_SOUTH)) continue;
            y = broom.hy + 1;
            x = broom.lx + span(broom.lx, broom.hx);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(game.level.at(x, y + 1)?.typ))
                continue;
            ok = true; break;
        case 2:
            if (!(dwall & W_WEST)) continue;
            x = broom.lx - 1;
            y = broom.ly + span(broom.ly, broom.hy);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(game.level.at(x - 1, y)?.typ))
                continue;
            ok = true; break;
        case 3:
            if (!(dwall & W_EAST)) continue;
            x = broom.hx + 1;
            y = broom.ly + span(broom.ly, broom.hy);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(game.level.at(x + 1, y)?.typ))
                continue;
            ok = true; break;
        }
        if (ok && okdoor_fn(x, y))
            break;
    }
    if (trycnt >= 100)
        return;                         /* impossible("can't find a place") */

    const loc = game.level?.at(x, y);
    if (!loc || !SPACE_POS(loc.typ))
        return;                         /* set_levltyp refuses */
    loc.typ = dd.secret ? SDOOR : DOOR;
    loc.doormask = dd.mask;
}

// src/sp_lev.c:3729 lspo_door() — the des.door() verb. No draws of its own.
export function lspo_door(opts) {
    const STATES = { random: -1, open: D_ISOPEN, closed: D_CLOSED,
                     locked: D_LOCKED, nodoor: D_NODOOR, broken: D_BROKEN };
    const WALLS = { random: W_RANDOM, all: W_ANY, north: W_NORTH,
                    south: W_SOUTH, east: W_EAST, west: W_WEST };
    const dd = {
        secret: opts?.secret === undefined ? -1 : (opts.secret ? 1 : 0),
        mask: STATES[opts?.state ?? 'random'] ?? -1,
        wall: WALLS[opts?.wall ?? 'random'] ?? W_RANDOM,
        pos: opts?.pos ?? -1,
    };

    const broom = game.coder?.croom;
    if (!broom)
        return;
    create_door(dd, broom);
}

/* okdoor() lives in js/mklev.js; routed through the wire like somexy. */
let okdoor_fn = () => true;
export function sp_lev_wire_okdoor(fn) { okdoor_fn = fn; }

let create_subroom_fn = null;
export function sp_lev_wire_subroom(fn) { create_subroom_fn = fn; }
