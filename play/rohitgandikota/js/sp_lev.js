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
import { get_level_extends, fix_wall_spines } from './mklev.js';
import { selection_iterate } from './selvar.js';
import { rn1, rn2, rnd } from './rng.js';
import { isok } from './hacklib.js';
import { sobj_at, weight, obj_extract_self } from './invent.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { mkobj_at, mksobj_at, add_to_container, set_corpsenm } from './mkobj.js';
import { stock_room } from './shknam.js';
import { fill_zoo } from './mkroom.js';
import { OBJ_NAME, OBJ_DESCR } from './objnam.js';
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
/* var, not let: wired from cmd.js's top level (see the add_room_fn note). */
var mon_fns;
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
import { MFLAGS as MFLAGS_SP } from './monst_data.js';
const G_IGNORE_SP = MFLAGS_SP.G_IGNORE;
import { def_monsyms } from './drawing_data.js';
import { CORPSTAT_HISTORIC } from './const.js';
import { In_mines } from './const.js';
import {
    OROOM, THEMEROOM, VAULT, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST,
    LEPREHALL, MORGUE, BARRACKS, TEMPLE, SWAMP, SHOPBASE, DELPHI,
    FILL_NONE, FILL_NORMAL,
    COLNO, ROWNO, STONE, CORR, ROOM, HWALL, VWALL, DOOR, SDOOR, SCORR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL,
    TLWALL, TRWALL, DBWALL, AIR, CLOUD, FOUNTAIN, THRONE, SINK, MOAT, POOL,
    LAVAPOOL, LAVAWALL, ICE, WATER, TREE, IRONBARS,
    MAX_TYPE, MATCH_WALL, INVALID_TYPE, NO_ROOM, ROOMOFFSET, D_CLOSED,
    MAXNROFROOMS, IS_WALL, IS_DOOR, IS_OBSTRUCTED, IS_STWALL,
    D_ISOPEN, D_NODOOR, D_BROKEN, D_SECRET,
} from './const.js';

/* mklev.js owns add_room/add_door/somexy; they are wired in by sp_lev_wire()
   from mklev.js's TOP LEVEL to avoid an import cycle. This file also sits in
   a cycle with mklev.js through other imports, so WHICH body evaluates first
   is not fixed: index.html boots through Promise.all of five parallel
   dynamic imports, and whichever import's traversal reaches the shared
   subgraph first sets the evaluation order — a fetch-timing race that
   varies run to run and between Node and the browser. On the unlucky order
   mklev.js's body runs while this module's body has not evaluated at all,
   and a `let` here is still in its temporal dead zone AT ANY POSITION IN
   THE FILE, so the wire assignment throws "Cannot access 'add_room_fn'
   before initialization" — which is what made the fork unplayable. Every
   holder assigned by a top-level wire call MUST therefore be a bare `var`:
   var bindings exist from module instantiation, before any body in the
   graph runs, so the assignment is legal in every order; and no initializer
   means this body evaluating second cannot clobber a value the wire already
   installed. One clean load proves nothing — the order is a race. */
var add_room_fn, add_door_fn, somexy_fn;

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
/* add_room_fn/add_door_fn/somexy_fn are declared at the top of this file */
export function sp_lev_wire(addRoom, addDoor, someXY) {
    add_room_fn = addRoom;
    add_door_fn = addDoor;
    somexy_fn = someXY;
}

/* somexy() lives in js/mklev.js and mklev.js imports this file, so importing it
   back directly is a cycle: it resolves to a TDZ error on this module's own
   consts. The established fix here is the wire above, same as add_room. */
/* somexy_fn declared at the top of this file (see note above) */

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

// src/sp_lev.c:5055 lspo_replace_terrain() — swap one terrain type for
// another across a region.
//
// **Every MATCHING square draws rn2(100)**, even with the default chance of
// 100 where the replacement always happens. Skipping the draw for a level
// that uses this desynchronises the whole build.
//
// The mapfrag (`mapfragment`) and explicit-`selection` forms are recorded;
// the region + fromterrain form is what the level files use.
export function lspo_replace_terrain(opts) {
    const totyp = splev_chr2typ(opts.toterrain);
    if (totyp === INVALID_TYPE)
        return;
    if (opts.mapfragment || opts.selection) {
        note_unported('replace_terrain:mapfragment_or_selection');
        return;
    }
    const fromtyp = splev_chr2typ(opts.fromterrain);
    const chance = (opts.chance === undefined) ? 100 : opts.chance;
    const r = opts.region || [];
    /* C runs both corners through get_location(), which applies the map's
       xstart/ystart offset; without it the scan covers the wrong columns and
       misses matching squares at the map's right edge. */
    const rx1 = r[0] + game.xstart, ry1 = r[1] + game.ystart;
    const rx2 = r[2] + game.xstart, ry2 = r[3] + game.ystart;

    for (let x = Math.max(1, rx1); x <= Math.min(rx2, COLNO - 1); x++)
        for (let y = Math.max(0, ry1); y <= Math.min(ry2, ROWNO - 1); y++) {
            const loc = game.level?.at(x, y);
            if (!loc)
                continue;
            /* src/sp_lev.c:5130 — the match is
                   (fromtyp == MATCH_WALL && IS_STWALL(levl[x][y].typ))
                   || levl[x][y].typ == fromtyp
               A plain equality test misses MATCH_WALL, the wildcard a level
               file uses to mean "any stone or wall". That made the scan match
               a handful of squares where C matches the whole wall run, so we
               spent one rn2(100) where C spends dozens. */
            if (!((fromtyp === MATCH_WALL && IS_STWALL(loc.typ))
                  || loc.typ === fromtyp))
                continue;
            if (rn2(100) < chance)
                loc.typ = totyp;
        }
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
let is_ok_location_func = null;
/* src/sp_lev.c:1274 set_ok_location_func() */
export function set_ok_location_func(fn) { is_ok_location_func = fn; }

export function is_ok_location(x, y, humidity) {
    const typ = game.level?.at(x, y)?.typ;

    if (typ === undefined)
        return false;

    /* src/sp_lev.c:1287 — an installed filter replaces every other test */
    if (is_ok_location_func)
        return is_ok_location_func(x, y);

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
        /* src/sp_lev.c:4430 — an omitted type is -1, RANDOM (mktrap rolls
           traptype_rnd); only an unknown NAME is an error */
        type: (type === undefined || type === null) ? -1
              : (typeof type === 'string') ? get_traptype_byname(type)
              : type,
        spider_on_web: opts?.spider_on_web !== undefined
                       ? !!opts.spider_on_web : true,
        seen: !!opts?.seen,
        novictim: opts?.victim !== undefined ? !opts.victim : false,
        coord: (x === undefined || x === -1) && (y === undefined || y === -1)
               ? SP_COORD_PACK_RANDOM(0)
               : SP_COORD_PACK(x, y),
    };

    if (t.type === NO_TRAP)
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
        x = Array.isArray(opts.coord) ? opts.coord[0] : opts.coord.x;
        y = Array.isArray(opts.coord) ? opts.coord[1] : opts.coord.y;
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
/* var, not let: wired from mklev.js's top level, which can run before this
   body evaluates in the browser's module order (see add_room_fn above). */
var mktrap_fn;
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
    /* des.object({ id=..., coord=... }) — the whole table as the only arg */
    if (idOrClass && typeof idOrClass === 'object'
        && !Array.isArray(idOrClass)) {
        opts = idOrClass;
        idOrClass = opts.id ?? opts.class;
    }
    const o = {
        class: -1, id: STRANGE_OBJECT, spe: -127, curse_state: 0,
        containment: 0,
        quan: -1, buried: 0, lit: 0, name: opts?.name ?? null,
        contents: opts?.contents ?? null,
        coord: 0,
    };

    /* `coord = {x,y}` or `coord = [x,y]` is the same as positional x,y */
    if (opts?.coord) {
        x = Array.isArray(opts.coord) ? opts.coord[0] : opts.coord.x;
        y = Array.isArray(opts.coord) ? opts.coord[1] : opts.coord.y;
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

    /* src/sp_lev.c:3673 — `montype` names the species a corpse, statue,
       figurine or egg came from. A single-character string is a monster
       CLASS and picks a random member via mkclass(cls, G_NOGEN|G_IGNORE),
       which draws; a full name resolves without any draw. */
    if (opts?.montype !== undefined && opts.montype !== null) {
        if (typeof opts.montype === 'number') {
            o.corpsenm = opts.montype;
        } else if (opts.montype.length === 1
                   && def_monsyms.indexOf(opts.montype) > 0) {
            const pm = mkclass(def_monsyms.indexOf(opts.montype),
                               G_NOGEN | G_IGNORE_SP);
            o.corpsenm = pm ? pm.pmidx ?? game.mons.indexOf(pm) : -1;
        } else {
            o.corpsenm = name_to_mon(opts.montype);
        }
    }

    /* src/sp_lev.c:3707 — statues and corpses carry CORPSTAT flags in spe */
    if (opts?.historic)
        o.spe = CORPSTAT_HISTORIC;

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
export function update_croom() {
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

// src/sp_lev.c:4763 reset_xystart_size() — back to the whole map. Called
// before the themeroom postprocess handlers run, so a coordinate handed to
// Lua there is offset by the map origin (1,0) rather than by whichever
// themeroom happened to be current when generation ended.
export function reset_xystart_size() {
    game.xstart = 1; /* column [0] is off limits */
    game.ystart = 0;
    game.xsize = COLNO - 1; /* 1..COLNO-1 */
    game.ysize = ROWNO; /* 0..ROWNO-1 */
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
    let want = String(name).toLowerCase();

    /* src/sp_lev.c:3480 — class prefixes disambiguate names like
       "teleportation"; strip the prefix and pin the class */
    let klass = 0;
    if (want.includes(' of ')) {
        const prefixes = [
            ['ring of ', OCLASSES.RING_CLASS],
            ['potion of ', OCLASSES.POTION_CLASS],
            ['scroll of ', OCLASSES.SCROLL_CLASS],
            ['spellbook of ', OCLASSES.SPBOOK_CLASS],
            ['wand of ', OCLASSES.WAND_CLASS],
        ];
        for (const [p, c] of prefixes)
            if (want.startsWith(p)) {
                klass = c;
                want = want.slice(p.length);
                break;
            }
    }

    /* find by object name */
    for (let i = 1; i < game.objects.length; i++)
        if ((!klass || klass === game.objects[i].oc_class)
            && (OBJ_NAME(game.objects[i]) || '').toLowerCase() === want)
            return i;
    /* find by object description */
    for (let i = 1; i < game.objects.length; i++) {
        const d = OBJ_DESCR(game.objects[i]);
        if ((!klass || klass === game.objects[i].oc_class)
            && d && d.toLowerCase() === want)
            return i;
    }
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
export function def_char_to_objclass(ch) {
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

    /* src/sp_lev.c:1943 — the alignment resolves FIRST, and the random one
       asks the level via induced_align(80), which draws. Location and
       species come after. */
    const amask = sp_amask_to_amask(m.sp_amask);

    if (m.id !== NON_PM) {
        pm = game.mons[m.id];
        /* the G_UNIQ/G_EXTINCT/G_GONE checks read mvitals, which this port
           does not track; nothing is genocided during level generation. */
    } else if (m.class >= 0 || typeof m.class === 'string') {
        /* src/sp_lev.c:1918 — a one-char class string goes through
           def_char_to_monclass before mkclass */
        const cls = (typeof m.class === 'string')
            ? def_monsyms.indexOf(m.class) : m.class;
        pm = (cls > 0) ? mkclass(cls, G_NOGEN) : null;
        /* pm == 0 here means the class was genocided; settle for random */
    }

    /* src/sp_lev.c:1959 — in the Mines a dwarf or gnome HERO makes every
       same-race monster spend an rn2(3) that can discard the species.
       your_race() and Race_if() need the hero's race; recorded rather than
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

    /* src/sp_lev.c:1977 — try to find a close place if someone else is
       already there. enexto() is enexto_core with GP_CHECKSCARY first, then
       a plain retry; the collect_coords ring shuffles inside are draws. */
    if (mon_fns.m_at(x, y)) {
        const cc = { x: 0, y: 0 };
        if (mklev_fns.enexto && mklev_fns.enexto(cc, x, y, pm)) {
            x = cc.x;
            y = cc.y;
        }
    }

    if (croom && !inside_room(croom, x, y))
        return null;

    if (m.sp_amask !== AM_SPLEV_RANDOM) {
        note_unported('create_monster:mk_roamer');
        return null;
    }
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
        /* src/sp_lev.c:2455 — in_rooms(x, y, TEMPLE): find the temple room
           holding the altar */
        croom = (game.level?.rooms || []).find(r =>
            r.rtype === TEMPLE && pos.x >= r.lx - 1 && pos.x <= r.hx + 1
            && pos.y >= r.ly - 1 && pos.y <= r.hy + 1);
        if (!croom)
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

    /* src/sp_lev.c:2479 — a shrine or sanctum gets its resident priest */
    if (a.shrine) {
        priestini_fn?.(game.u.uz, croom, pos.x, pos.y, a.shrine > 1);
        loc.altarmask |= 8 /* AM_SHRINE */;
        if (a.shrine === 2)
            loc.altarmask |= 16 /* AM_SANCTUM */;
        game.level.flags.has_temple = true;
    }
}

/* priestini lives in js/priest.js, which imports this file; wired. */
let priestini_fn = null;
export function sp_lev_wire_priest(fn) { priestini_fn = fn; }

// src/sp_lev.c sp_amask_to_amask() — the three SPLEV pseudo-alignments resolve
// against the HERO's original alignment, not the level's.
// src/sp_lev.c:1907 sp_amask_to_amask() — the random case asks the level
// (80% chance of the level's own alignment) and DRAWS via induced_align.
function sp_amask_to_amask(sp_amask) {
    if (sp_amask === AM_SPLEV_CO || sp_amask === AM_SPLEV_NONCO) {
        note_unported('sp_amask_to_amask:hero_alignment');
        return 0;
    }
    if (sp_amask === AM_SPLEV_RANDOM)
        return induced_align(80);
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
/* src/sp_lev.c:4041 — the lspo_room alignment keyword tables. */
const SPLEV_LEFT = 1, SPLEV_H_LEFT = 2, SPLEV_CENTER = 3, SPLEV_H_RIGHT = 4,
      SPLEV_RIGHT = 5;
const SPLEV_TOP = 1, SPLEV_BOTTOM = 5;
const L_OR_R = { left: SPLEV_LEFT, 'half-left': SPLEV_H_LEFT,
                 center: SPLEV_CENTER, 'half-right': SPLEV_H_RIGHT,
                 right: SPLEV_RIGHT, none: -1, random: -1 };
const T_OR_B = { top: SPLEV_TOP, center: SPLEV_CENTER, bottom: SPLEV_BOTTOM,
                 none: -1, random: -1 };

/* src/sp_lev.c get_table_roomtype_opt() — name to rtype. */
const ROOMTYPES = { ordinary: OROOM, themed: THEMEROOM, delphi: DELPHI };

export function lspo_room(opts, create_room_fn, topologize_fn) {
    /* level scripts omit the fns; the wire from mklev.js supplies them */
    create_room_fn = create_room_fn ?? mklev_fns.create_room;
    topologize_fn = topologize_fn ?? mklev_fns.topologize;
    /* sp_lev.c:4035 — w and h default to -1 (random). When the Lua computes
       them, e.g. `w = nh.rn2(10)+11`, those draws are ARGUMENTS and are spent
       before lspo_room is entered at all, hence before the chance roll below. */
    const w = opts?.w ?? -1, h = opts?.h ?? -1;
    const x = opts?.x ?? -1, y = opts?.y ?? -1;
    if (game.in_mk_themerooms && game.themeroom_failed)
        return null;

    let rtype = OROOM;
    if (opts?.type !== undefined) {
        if (ROOMTYPES[opts.type] === undefined)
            note_unported(`lspo_room:rtype=${opts.type}`);
        else
            rtype = ROOMTYPES[opts.type];
    }
    const xalign = L_OR_R[opts?.xalign ?? 'random'] ?? -1;
    const yalign = T_OR_B[opts?.yalign ?? 'random'] ?? -1;
    const chance = opts?.chance ?? 100;
    const rlit = (opts?.lit === undefined) ? -1 : (opts.lit ? 1 : 0);
    /* "theme rooms default to unfilled" — sp_lev.c:4049 */
    const needfill = (opts?.filled === undefined)
                     ? (game.in_mk_themerooms ? FILL_NONE : FILL_NORMAL)
                     : (opts.filled ? FILL_NORMAL : FILL_NONE);
    const joined = opts?.joined ?? true;

    /* sp_lev.c:2811 build_room() — `(!chance || rn2(100) < chance)` keeps
       the requested type; the roll is spent whenever chance is non-zero. */
    if (chance && !(rn2(100) < chance))
        rtype = OROOM;

    /* src/sp_lev.c:2813 build_room() — with a parent room open this is a
       SUBROOM, and create_subroom spends its own draws for random parts. */
    const parent = game.coder?.croom ?? null;
    const ok = parent
        ? create_subroom_fn(parent, x, y, w, h, rtype, rlit)
        : create_room_fn(x, y, w, h, xalign, yalign, rtype, rlit);
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
    aroom.needjoining = joined;

    /* src/sp_lev.c:4088 — added a subroom makes the parent irregular */
    if (parent)
        parent.irregular = true;

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
                     locked: D_LOCKED, nodoor: D_NODOOR, broken: D_BROKEN,
                     secret: D_SECRET };
    const WALLS = { random: W_ANY, all: W_ANY, north: W_NORTH,
                    south: W_SOUTH, east: W_EAST, west: W_WEST };
    const msk = STATES[opts?.state ?? 'random'] ?? -1;

    /* src/sp_lev.c:4703 — typ is computed BEFORE the coordinate branch, so
       a random state spends rnddoor()'s draw even on the wall-based form
       (which then passes the still-random mask to create_door anyway). */
    const typ = (msk === -1) ? rnddoor() : msk;

    /* src/sp_lev.c:4704 — the coordinate form stamps the door directly */
    if (opts?.x != null && opts?.y != null) {
        const x = opts.x + (game.xstart | 0), y = opts.y + (game.ystart | 0);
        sel_set_door(x, y, typ);
        return;
    }

    /* src/sp_lev.c:4715 — secret is 1 only for state "secret", NEVER the
       -1 that would make create_door roll rn2(2) for it. */
    const dd = {
        secret: (typ === D_SECRET) ? 1 : 0,
        mask: msk,
        wall: WALLS[opts?.wall ?? 'all'] ?? W_ANY,
        pos: opts?.pos ?? -1,
    };

    const broom = game.coder?.croom;
    if (!broom)
        return;
    create_door(dd, broom);
}

// src/sp_lev.c:4647 sel_set_door()
function sel_set_door(x, y, typ) {
    const loc = game.level.at(x, y);
    if (!loc) return;
    if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR)
        loc.typ = (typ & D_SECRET) ? SDOOR : DOOR;
    if (typ & D_SECRET) {
        typ &= ~D_SECRET;
        if (typ < D_CLOSED)
            typ = D_CLOSED;
    }
    /* set_door_orientation() */
    const left = game.level.at(x - 1, y), right = game.level.at(x + 1, y);
    loc.horizontal = !!((left && (IS_WALL(left.typ) || left.horizontal))
                        || (right && (IS_WALL(right.typ) || right.horizontal)));
    loc.doormask = typ;
    SpLev_Map_set(x, y);
}

// src/sp_lev.c:1148 rnddoor() — ROLL_FROM the five plain door states.
function rnddoor() {
    const state = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
    return state[rn2(state.length)];
}

/* okdoor() lives in js/mklev.js; routed through the wire like somexy.
   var, not let, for all three below: wired from mklev.js's top level
   (see the add_room_fn note). */
var okdoor_fn;
export function sp_lev_wire_okdoor(fn) { okdoor_fn = fn; }

var create_subroom_fn;
export function sp_lev_wire_subroom(fn) { create_subroom_fn = fn; }

/* makecorridors/wallification/mkstairs/litstate live in js/mklev.js; routed
   through the wire like somexy, for the same import-cycle reason. */
var mklev_fns;
export function sp_lev_wire_mklev(fns) { mklev_fns = fns; }

// src/sp_lev.c:3759 lspo_level_flags()
export function lspo_level_flags(...flags) {
    create_des_coder();
    for (const s of flags) {
        switch (s) {
        case 'noteleport': game.level.flags.noteleport = 1; break;
        case 'hardfloor': game.level.flags.hardfloor = 1; break;
        case 'nommap': game.level.flags.nommap = 1; break;
        case 'shortsighted': game.level.flags.shortsighted = 1; break;
        case 'arboreal': game.level.flags.arboreal = 1; break;
        case 'mazelevel': game.level.flags.is_maze_lev = 1; break;
        case 'shroud': game.level.flags.hero_memory = 1; break;
        case 'graveyard': game.level.flags.graveyard = 1; break;
        case 'corrmaze': game.level.flags.corrmaze = 1; break;
        case 'premapped': game.coder.premapped = 1; break;
        case 'solidify': game.coder.solidify = 1; break;
        case 'sokoban': game.level.flags.sokoban_rules = 1; break;
        case 'inaccessibles': game.coder.check_inaccessibles = 1; break;
        case 'noflipx': game.coder.allow_flips &= ~2; break;
        case 'noflipy': game.coder.allow_flips &= ~1; break;
        case 'noflip': game.coder.allow_flips = 0; break;
        case 'temperate': game.level.flags.temperature = 0; break;
        case 'hot': game.level.flags.temperature = 1; break;
        case 'cold': game.level.flags.temperature = -1; break;
        case 'nomongen': game.level.flags.rndmongen = 0; break;
        case 'nodeathdrops': game.level.flags.deathdrops = 0; break;
        case 'noautosearch': game.level.flags.noautosearch = 1; break;
        default:
            note_unported(`lspo_level_flags:${s}`);
            break;
        }
    }
}

// src/sp_lev.c:4844 lspo_feature() — place a fountain/sink/pool/throne/tree.
export function lspo_feature(type, x, y) {
    const FEATURES = { fountain: FOUNTAIN, sink: SINK, pool: POOL,
                       throne: THRONE, tree: TREE };
    create_des_coder();

    const typ = FEATURES[type];
    let fcoord, humidity;
    if (x === undefined || (x === -1 && y === -1)) {
        fcoord = SP_COORD_PACK_RANDOM(0);
        humidity = DRY; /* pick a regular space, no rock or other furniture */
    } else {
        fcoord = SP_COORD_PACK(x, y);
        humidity = ANY_LOC; /* assume the author knows what they're doing */
    }
    const c = get_location_coord(-1, -1, humidity, game.coder?.croom, fcoord);

    if (typ === undefined) {
        note_unported(`lspo_feature:${type}`);
        return;
    }
    /* sel_set_feature() — refuses to overwrite non-floor terrain */
    const loc = game.level.at(c.x, c.y);
    if (loc && (loc.typ === ROOM || loc.typ === CORR)) {
        loc.typ = typ;
        if (typ === FOUNTAIN)
            game.level.flags.nfountains = (game.level.flags.nfountains | 0) + 1;
        if (typ === SINK)
            game.level.flags.nsinks = (game.level.flags.nsinks | 0) + 1;
    }
    /* the looted/warned flag options are absent until a level needs them */
}

// src/sp_lev.c:4147 l_create_stairway() / :4223 lspo_stair()
export function lspo_stair(dir, x, y) {
    create_des_coder();

    const up = (dir === 'up') ? 1 : 0;
    let scoord;
    if (x === undefined || (x === -1 && y === -1)) {
        /* set_ok_location_func(good_stair_loc) narrows the random pick */
        scoord = SP_COORD_PACK_RANDOM(0);
        set_ok_location_func(good_stair_loc);
    } else
        scoord = SP_COORD_PACK(x, y);

    const c = get_location_coord(-1, -1, DRY, game.coder?.croom, scoord);
    set_ok_location_func(null);
    /* deltrap of a pre-existing trap here: no trap can exist yet */
    SpLev_Map_set(c.x, c.y);

    if (mklev_fns.mkstairs)
        mklev_fns.mkstairs(c.x, c.y, up, game.coder?.croom);
    else
        note_unported('lspo_stair:mkstairs');
}

/* src/sp_lev.c good_stair_loc() — a stair spot is a room/ice square that is
   not a boundary. */
function good_stair_loc(x, y) {
    const loc = game.level.at(x, y);
    return !!loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
}

// src/sp_lev.c:2671 create_corridor() with src.room == -1, reached from
// des.random_corridors() (lspo_random_corridors, sp_lev.c:4139).
export function lspo_random_corridors() {
    create_des_coder();
    if (mklev_fns.makecorridors)
        mklev_fns.makecorridors();
    else
        note_unported('lspo_random_corridors');
}

// src/sp_lev.c:1042 set_door_orientation()
function set_door_orientation(x, y) {
    const at = (xx, yy) => game.level.at(xx, yy)?.typ;
    const doorjoin = (t) => t !== undefined
        && (IS_WALL_TYP(t) || IS_DOOR_TYP(t) || t === SDOOR);
    let wleft = isok(x - 1, y) && doorjoin(at(x - 1, y));
    let wright = isok(x + 1, y) && doorjoin(at(x + 1, y));
    let wup = isok(x, y - 1) && doorjoin(at(x, y - 1));
    let wdown = isok(x, y + 1) && doorjoin(at(x, y + 1));
    if (!wleft && !wright && !wup && !wdown) {
        const joinorrock = (xx, yy) => !isok(xx, yy)
            || doorjoin(at(xx, yy)) || at(xx, yy) === STONE;
        wleft = joinorrock(x - 1, y);
        wright = joinorrock(x + 1, y);
        wup = joinorrock(x, y - 1);
        wdown = joinorrock(x, y + 1);
    }
    const loc = game.level.at(x, y);
    if (loc)
        loc.horizontal = ((wleft || wright) && !(wup && wdown)) ? 1 : 0;
}

const IS_WALL_TYP = (t) => (t >= VWALL && t <= DBWALL);
const IS_DOOR_TYP = (t) => (t === DOOR);

// src/sp_lev.c:1090 shared_with_room()
function shared_with_room(x, y, droom, rmno) {
    const roomno = (xx, yy) => game.level.at(xx, yy)?.roomno;
    if (!isok(x, y))
        return false;
    if (roomno(x, y) === rmno && !game.level.at(x, y)?.edge)
        return false;
    if (isok(x - 1, y) && roomno(x - 1, y) === rmno && x - 1 <= droom.hx)
        return true;
    if (isok(x + 1, y) && roomno(x + 1, y) === rmno && x + 1 >= droom.lx)
        return true;
    if (isok(x, y - 1) && roomno(x, y - 1) === rmno && y - 1 <= droom.hy)
        return true;
    if (isok(x, y + 1) && roomno(x, y + 1) === rmno && y + 1 >= droom.ly)
        return true;
    return false;
}

// src/sp_lev.c:1111 maybe_add_door() — full port used by
// link_doors_rooms(); the :326 variant above predates it and stays for the
// map-scan callers until a level exercises both.
function maybe_add_door_full(x, y, droom, rmno) {
    if (droom.hx >= 0
        && ((!droom.irregular && inside_room(droom, x, y))
            || game.level.at(x, y)?.roomno === rmno
            || shared_with_room(x, y, droom, rmno)))
        add_door_fn(x, y, droom);
}

// src/sp_lev.c:1122 link_doors_rooms()
function link_doors_rooms() {
    const ROOMOFFSET_L = 3; /* include/mkroom.h ROOMOFFSET */
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const t = game.level.at(x, y)?.typ;
            if (t === DOOR || t === SDOOR) {
                set_door_orientation(x, y);
                for (let i = 0; i < game.level.nroom; i++) {
                    const room = game.level.rooms[i];
                    maybe_add_door_full(x, y, room, i + ROOMOFFSET_L);
                    for (let m = 0; m < (room.nsubrooms | 0); m++)
                        maybe_add_door_full(x, y, room.sbrooms[m],
                                            room.sbrooms[m].roomnoidx ?? -99);
                }
            }
        }
}

// src/sp_lev.c:1016 remove_boundary_syms()
function remove_boundary_syms() {
    let has_bounds = false;
    for (let x = 0; x < COLNO - 1 && !has_bounds; x++)
        for (let y = 0; y < ROWNO - 1; y++)
            if (game.level.at(x, y)?.typ === CROSSWALL) {
                has_bounds = true;
                break;
            }
    if (has_bounds) {
        for (let x = 0; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level.at(x, y);
                if (loc?.typ === CROSSWALL && SpLev_Map_get(x, y))
                    loc.typ = ROOM;
            }
    }
}

// src/sp_lev.c:328 map_cleanup() — boulders and traps on liquid; nothing a
// current special level puts there, but the walk itself is cheap and the
// deep arms are recorded when reached.
function map_cleanup() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const typ = game.level.at(x, y)?.typ;
            if (typ === LAVAPOOL || typ === POOL || typ === MOAT
                || typ === WATER) {
                if (sobj_at(ONAMES.BOULDER, x, y))
                    note_unported('map_cleanup:boulder_on_liquid');
            }
        }
}

// src/sp_lev.c:967 flip_level_rnd() — one rn2(2) per allowed axis.
function flip_level_rnd(flp) {
    let c = 0;
    if ((flp & 1) && rn2(2))
        c |= 1;
    if ((flp & 2) && rn2(2))
        c |= 2;
    if (c)
        flip_level(c, false);
}

// src/sp_lev.c:533 flip_level() — mirror the level on one or both axes.
//
// Everything positional moves: the terrain grid, objects, monsters, traps,
// stairways, engravings and doors. This port keeps objects and monsters in
// flat lists rather than per-square chains, so C's grid swap of
// level.objects[][] / level.monsters[][] is implicit once their coordinates
// are flipped -- only the terrain cells need exchanging.
//
// Recorded: the ball-and-chain repositioning, the vault guard's egd,
// migrating monsters, timers and the level-teleport regions. `extras` is
// false for the post-build flip, which is the only caller so far.
export function flip_level(flp, extras) {
    if ((flp & 3) === 0)
        return;
    if (extras)
        note_unported('flip_level:extras');

    const ext = get_level_extends();
    let minx = ext.xmin, miny = ext.ymin, maxx = ext.xmax, maxy = ext.ymax;
    /* get_level_extends() returns -1,-1 to COLNO,ROWNO at max */
    if (miny < 0) miny = 0;
    if (minx < 1) minx = 1;
    if (maxx >= COLNO) maxx = COLNO - 1;
    if (maxy >= ROWNO) maxy = ROWNO - 1;

    const FlipX = (v) => (maxx - v) + minx;
    const FlipY = (v) => (maxy - v) + miny;
    const inFlipArea = (x, y) =>
        (x >= minx && x <= maxx && y >= miny && y <= maxy);

    /* stairs and ladders */
    for (let st = game.stairs; st; st = st.next) {
        if (flp & 1) st.sy = FlipY(st.sy);
        if (flp & 2) st.sx = FlipX(st.sx);
    }

    /* This port also records the up/down stair coordinates separately on the
       level (js/mklev.js sets level.upstair / level.dnstair) and the display
       keys the '<' vs '>' glyph off them, so they have to move too. C reads
       the stairway list for that and has no such record. */
    for (const key of ['upstair', 'dnstair']) {
        const st = game.level?.[key];
        if (!st || !inFlipArea(st.x, st.y)) continue;
        if (flp & 1) st.y = FlipY(st.y);
        if (flp & 2) st.x = FlipX(st.x);
    }

    /* traps */
    for (const t of (game.level?.traps || [])) {
        if (!inFlipArea(t.tx, t.ty)) continue;
        if (flp & 1) t.ty = FlipY(t.ty);
        if (flp & 2) t.tx = FlipX(t.tx);
    }

    /* objects */
    for (const o of (game.level?.objects || [])) {
        if (!inFlipArea(o.ox, o.oy)) continue;
        if (flp & 1) o.oy = FlipY(o.oy);
        if (flp & 2) o.ox = FlipX(o.ox);
    }

    /* monsters */
    for (const m of (game.level?.monsters || [])) {
        if (!inFlipArea(m.mx, m.my)) continue;
        if (flp & 1) m.my = FlipY(m.my);
        if (flp & 2) m.mx = FlipX(m.mx);
    }

    /* engravings */
    for (const e of (game.level?.lev_engr || [])) {
        if (flp & 1) e.y = FlipY(e.y);
        if (flp & 2) e.x = FlipX(e.x);
    }

    /* doors */
    for (const d of (game.level?.doors || [])) {
        if (flp & 1) d.y = FlipY(d.y);
        if (flp & 2) d.x = FlipX(d.x);
    }

    /* the map */
    if (flp & 1) {
        for (let x = minx; x <= maxx; x++)
            for (let y = miny; y < (miny + (((maxy - miny + 1) / 2) | 0)); y++) {
                const ny = FlipY(y);
                const a = game.level.at(x, y), b = game.level.at(x, ny);
                if (!a || !b) continue;
                const tmp = { ...a };
                Object.assign(a, b);
                Object.assign(b, tmp);
            }
    }
    if (flp & 2) {
        for (let x = minx; x < (minx + (((maxx - minx + 1) / 2) | 0)); x++)
            for (let y = miny; y <= maxy; y++) {
                const nx = FlipX(x);
                const a = game.level.at(x, y), b = game.level.at(nx, y);
                if (!a || !b) continue;
                const tmp = { ...a };
                Object.assign(a, b);
                Object.assign(b, tmp);
            }
    }

    /* src/sp_lev.c:915 — the swap moves wall SQUARES but leaves their corner
       and T-junction types pointing the old way; this recomputes them from
       the neighbours. Without it every corner glyph comes out mirrored. */
    fix_wall_spines(1, 0, COLNO - 1, ROWNO - 1);
    /* C ends with vision_reset(); goto_level() already does one right after
       the level is built, so it is left to that caller. */
}

/* SpLev_Map — which map squares the special level explicitly touched. */
function SpLev_Map_set(x, y) {
    (game.splev_map ||= new Set()).add(`${x},${y}`);
}
function SpLev_Map_get(x, y) {
    return game.splev_map?.has(`${x},${y}`) ?? false;
}

// src/sp_lev.c:6454 load_special() — run a special level script and the
// fixed post-script sequence. The registry in js/dat/ holds the ported
// levels; a missing entry returns false so makemaz() can record the gap.
export async function load_special(name) {
    const { SPECIAL_LEVELS } = await import('./dat/levels.js');
    const script = SPECIAL_LEVELS[name];
    if (!script)
        return false;

    game.coder = null;
    create_des_coder();
    game.splev_map = new Set();
    game.lregions = [];

    /* sp_level_coder_init() — level flag defaults for a des level */
    game.level.flags.is_maze_lev = 0;
    game.level.flags.temperature =
        (game.dungeons?.[game.u.uz.dnum]?.flags?.hellish) ? 1 : 0;
    game.level.flags.rndmongen = 1;
    game.level.flags.deathdrops = 1;

    /* load_lua(): each level file load re-runs nhlib.lua's align shuffle */
    {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
    }

    await script();

    link_doors_rooms();
    remove_boundary_syms();

    if (game.coder?.check_inaccessibles)
        note_unported('load_special:ensure_way_out');

    map_cleanup();

    if (!game.level.flags.corrmaze) {
        if (mklev_fns.wallification)
            mklev_fns.wallification(1, 0, COLNO - 1, ROWNO - 1);
        else
            note_unported('load_special:wallification');
    }

    flip_level_rnd(game.coder?.allow_flips ?? 0);

    if (mklev_fns.count_level_features)
        mklev_fns.count_level_features();

    if (game.coder?.solidify)
        note_unported('load_special:solidify');

    {
        const { fixup_special } = await import('./mkmaze.js');
        fixup_special();
    }

    if (game.coder?.premapped)
        note_unported('load_special:premap_detect');

    game.coder = null;
    return true;
}

/* ==== the map-based special-level verbs the castle needs ==== */

import { W_NONDIGGABLE, W_NONPASSWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
         DB_NORTH, DB_SOUTH, DB_WEST, DB_EAST, DB_MOAT,
         IS_DOOR as C_IS_DOOR, IS_WALL as C_IS_WALL } from './const.js';
const C_STONE = STONE, C_HWALL = HWALL, C_ROOM = ROOM, C_CORR = CORR,
      C_MAX_TYPE = MAX_TYPE;

/* decl.c g_init_x/y — the maze bounds are static */
export const x_maze_max = 78;   /* (COLNO - 1) & ~1 */
export const y_maze_max = 20;   /* (ROWNO - 1) & ~1 */

// src/sp_lev.c:358 lvlfill_maze_grid()
function lvlfill_maze_grid(x1, y1, x2, y2, filling) {
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = game.level.at(x, y);
            if (!loc) continue;
            if (game.level.flags?.corrmaze)
                loc.typ = C_STONE;
            else
                loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? C_STONE : filling;
        }
}

// src/sp_lev.c:3837 lspo_level_init() — the mazegrid and solidfill styles.
export function lspo_level_init(opts) {
    game.splev_init_present = true;
    const style = opts.style;
    if (style === 'mazegrid') {
        const bg = CHAR2TYP[opts.bg ?? '-'] ?? C_HWALL;
        lvlfill_maze_grid(2, 0, x_maze_max, y_maze_max, bg);
    } else if (style === 'solidfill') {
        let lit = opts.lit ?? -1;
        if (lit === -1) lit = rn2(2);
        const fg = CHAR2TYP[opts.fg ?? ' '] ?? C_STONE;
        for (let x = 2; x <= x_maze_max; x++)
            for (let y = 0; y <= y_maze_max; y++) {
                const loc = game.level.at(x, y);
                if (!loc) continue;
                loc.typ = fg; loc.lit = !!lit;
                loc.flags = 0; loc.horizontal = false;
                loc.roomno = 0; loc.edge = 0;
            }
    } else {
        note_unported(`lspo_level_init:${style}`);
    }
}

// src/sp_lev.c:6074 lspo_map(), plain-string form: centered on the maze
// bounds with odd-parity nudging, no draws.
export function lspo_map_full(mapstr, contents) {
    const lines = mapstr.replace(/^\n/, '').replace(/\n$/, '').split('\n');
    const wid = Math.max(...lines.map(l => l.length));
    const hei = lines.length;

    /* SPLEV_CENTER placement (sp_lev.c:6203/6215) */
    let xstart = 2 + (((x_maze_max - 2 - wid) / 2) | 0);
    let ystart = 2 + (((y_maze_max - 2 - hei) / 2) | 0);
    if (!(xstart % 2)) xstart++;
    if (!(ystart % 2)) ystart++;
    if (ystart < 0 || ystart + hei > 21) {
        /* src/sp_lev.c:6233 — try to move the start a bit, but a
           full-height map goes flush to the top */
        ystart += (ystart > 0) ? -2 : 2;
        if (hei === 21) ystart = 0;
        if (ystart < 0 || ystart + hei > 21) ystart = 0;
    }

    for (let y = ystart; y < Math.min(21, ystart + hei); y++)
        for (let x = xstart; x < Math.min(80, xstart + wid); x++) {
            const ch = lines[y - ystart][x - xstart] ?? ' ';
            const mptyp = CHAR2TYP[ch] ?? C_MAX_TYPE;
            if (mptyp >= C_MAX_TYPE) continue;
            const loc = game.level.at(x, y);
            if (!loc) continue;
            loc.flags = 0; loc.doormask = 0; loc.wall_info = 0;
            loc.ladder = 0; loc.drawbridgemask = 0; loc.altarmask = 0;
            loc.horizontal = false; loc.roomno = 0; loc.edge = 0;
            SpLev_Map_set(x, y);
            sel_set_ter(x, y, mptyp);
        }

    game.xstart = xstart; game.ystart = ystart;
    game.xsize = wid; game.ysize = hei;

    if (contents) contents({ width: wid, height: hei });
}

// src/sp_lev.c:5405 lspo_teleport_region() / :5449 lspo_levregion() share
// l_get_lregion + levregion_add; regions without *_islev are map-relative.
function levregion_add(tmpl) {
    const abs = (pt, islev) => islev ? pt : pt + 0; /* adjusted below */
    if (!tmpl.in_islev) {
        tmpl.inarea.x1 += game.xstart; tmpl.inarea.y1 += game.ystart;
        tmpl.inarea.x2 += game.xstart; tmpl.inarea.y2 += game.ystart;
    }
    if (!tmpl.del_islev) {
        tmpl.delarea.x1 += game.xstart; tmpl.delarea.y1 += game.ystart;
        tmpl.delarea.x2 += game.xstart; tmpl.delarea.y2 += game.ystart;
    }
    (game.lregions ||= []).push(tmpl);
}

function l_get_lregion(opts) {
    const r = opts.region;
    const e = opts.exclude || [-1, -1, -1, -1];
    const tmpl = {
        inarea: { x1: r[0], y1: r[1], x2: r[2], y2: r[3] },
        delarea: { x1: e[0], y1: e[1], x2: e[2], y2: e[3] },
        in_islev: !!opts.region_islev,
        del_islev: !!opts.exclude_islev,
    };
    if (e[0] < 0)
        tmpl.del_islev = true;
    return tmpl;
}

export function lspo_teleport_region(opts) {
    const dirs = { both: 0 /* LR_TELE */, down: 2 /* LR_DOWNTELE */,
                   up: 1 /* LR_UPTELE */ };
    const tmpl = l_get_lregion(opts);
    tmpl.rtype = dirs[opts.dir ?? 'both'] ?? 0;
    tmpl.padding = 0;
    levregion_add(tmpl);
}

export function lspo_levregion(opts) {
    const types = { 'stair-down': 6, 'stair-up': 5, 'portal': 3, 'branch': 4,
                    'teleport': 0, 'teleport-up': 1, 'teleport-down': 2 };
    const tmpl = l_get_lregion(opts);
    tmpl.rtype = types[opts.type ?? 'stair-down'] ?? 6;
    tmpl.padding = opts.padding ?? 0;
    tmpl.rname = opts.name ?? null;
    levregion_add(tmpl);
}

// src/dbridge.c create_drawbridge() — terrain only, no draws.
export function lspo_drawbridge(opts) {
    const dirs2i = { north: DB_NORTH, south: DB_SOUTH,
                     west: DB_WEST, east: DB_EAST };
    let x = (opts.x ?? opts.coord?.[0]) + game.xstart;
    let y = (opts.y ?? opts.coord?.[1]) + game.ystart;
    const dir = dirs2i[opts.dir] ?? DB_EAST;
    let db_open = opts.state === 'open' ? 1 : opts.state === 'closed' ? 0 : -1;
    if (db_open === -1) db_open = !rn2(2) ? 1 : 0;

    /* src/dbridge.c:394 create_drawbridge() — x,y is the span; x2,y2 the
       gate (portcullis) square, one step in `dir` */
    let x2 = x, y2 = y;
    if (dir === DB_NORTH) y2--;
    else if (dir === DB_SOUTH) y2++;
    else if (dir === DB_WEST) x2--;
    else x2++;

    const span = game.level.at(x, y), gate = game.level.at(x2, y2);
    if (!span || !gate) return;
    if (db_open) {
        span.typ = DRAWBRIDGE_DOWN;
        gate.typ = DOOR;
        gate.doormask = D_NODOOR;
    } else {
        span.typ = DRAWBRIDGE_UP;
        gate.typ = DBWALL;
        gate.horizontal = (dir === DB_NORTH || dir === DB_SOUTH);
    }
    span.drawbridgemask = (dir | (db_open ? 0 : 0)) | DB_MOAT;
    SpLev_Map_set(x, y);
}

// src/sp_lev.c:5769 lspo_mazewalk()
export function lspo_mazewalk(mx, my, dirname) {
    const mwdirs2i = { north: W_NORTH, south: W_SOUTH,
                       east: W_EAST, west: W_WEST };
    let ftyp = game.level.flags?.corrmaze ? C_CORR : C_ROOM;
    let dir = mwdirs2i[dirname];
    let x = mx + game.xstart, y = my + game.ystart;

    /* castle passes absolute-ish edge coords relative to the map; C's
       get_location_coord with ANY_LOC adds xstart/ystart the same way */

    if (dir == null) dir = W_EAST;

    if (dir === W_NORTH) --y;
    else if (dir === W_SOUTH) y++;
    else if (dir === W_EAST) x++;
    else --x;

    const first = game.level.at(x, y);
    if (first && !C_IS_DOOR(first.typ)) {
        first.typ = ftyp;
        first.flags = 0;
    }

    /* odd-parity adjustment for walkfrom */
    if (!(x % 2)) {
        if (dir === W_EAST) x++;
        else x--;
        const loc = game.level.at(x, y);
        if (loc) { loc.typ = ftyp; loc.flags = 0; }
    }
    if (!(y % 2)) {
        if (dir === W_SOUTH) y++;
        else y--;
    }

    walkfrom_fn(x, y, ftyp);
    fill_empty_maze();
}

/* var, not let: wired from mklev.js's top level (see the add_room_fn note). */
var walkfrom_fn;
export function sp_lev_wire_walkfrom(fn) { walkfrom_fn = fn; }

// src/sp_lev.c:2900 maze1xy() — random untouched maze spot.
function maze1xy(humidity) {
    let x, y, tryct = 2000;
    do {
        x = rn1(x_maze_max - 3, 3);
        y = rn1(y_maze_max - 3, 3);
        if (--tryct < 0) break;
    } while (!(x % 2) || !(y % 2) || SpLev_Map_get(x, y)
             || !is_ok_location(x, y, humidity));
    return { x, y };
}

// src/sp_lev.c:1159 rndtrap() — a random trap legal for this level.
// The trap ids come from include/trap.h's enum, via js/const.js.
function rndtrap_sp() {
    const HOLE = 13, VIBRATING_SQUARE = 23, MAGIC_PORTAL = 17,
          TRAPDOOR = 14, LEVEL_TELEP = 16, TELEP_TRAP = 15,
          ROLLING_BOULDER_TRAP = 7, ROCKTRAP = 3, NO_TRAP = 0, TRAPNUM = 26;
    let rtrap;
    do {
        rtrap = rnd(TRAPNUM - 1);
        switch (rtrap) {
        case HOLE: case VIBRATING_SQUARE: case MAGIC_PORTAL:
            rtrap = NO_TRAP; break;
        case TRAPDOOR:
            if (!Can_dig_down_sp()) rtrap = NO_TRAP;
            break;
        case LEVEL_TELEP: case TELEP_TRAP:
            if (game.level.flags?.noteleport) rtrap = NO_TRAP;
            break;
        case ROLLING_BOULDER_TRAP: case ROCKTRAP:
            /* In_endgame: not reachable here */
            break;
        }
    } while (rtrap === NO_TRAP);
    return rtrap;
}

// src/sp_lev.c:2926 fill_empty_maze()
export function fill_empty_maze() {
    const DRY = 0x1;
    let mapcountmax, mapcount, mapfact;
    mapcountmax = mapcount = (x_maze_max - 2) * (y_maze_max - 2);
    mapcountmax = (mapcountmax / 2) | 0;

    for (let x = 2; x < x_maze_max; x++)
        for (let y = 0; y < y_maze_max; y++)
            if (SpLev_Map_get(x, y))
                mapcount--;

    if (mapcount > ((mapcountmax / 10) | 0)) {
        mapfact = ((mapcount * 100) / mapcountmax) | 0;
        for (let x = rnd(((20 * mapfact) / 100) | 0); x; x--) {
            const mm = maze1xy(DRY);
            mkobj_at(rn2(2) ? OCLASSES.GEM_CLASS : 0 /* RANDOM_CLASS */,
                     mm.x, mm.y, true);
        }
        for (let x = rnd(((12 * mapfact) / 100) | 0); x; x--) {
            const mm = maze1xy(DRY);
            const ttmp = (game.level.traps || [])
                .find(t => t.tx === mm.x && t.ty === mm.y);
            if (ttmp && (is_pit_sp(ttmp.ttyp) || is_hole_sp(ttmp.ttyp)))
                continue;
            mksobj_at(ONAMES.BOULDER, mm.x, mm.y, true, false);
        }
        for (let x = rn2(2); x; x--) {
            const mm = maze1xy(DRY);
            mklev_fns?.makemon_at?.(PMNAMES.PM_MINOTAUR, mm.x, mm.y);
        }
        for (let x = rnd(((12 * mapfact) / 100) | 0); x; x--) {
            const mm = maze1xy(DRY);
            mklev_fns?.makemon_at?.(null, mm.x, mm.y);
        }
        for (let x = rn2(((15 * mapfact) / 100) | 0); x; x--) {
            const mm = maze1xy(DRY);
            mklev_fns?.mkgold?.(0, mm.x, mm.y);
        }
        for (let x = rn2(((15 * mapfact) / 100) | 0); x; x--) {
            const mm = maze1xy(DRY);
            let trytrap = rndtrap_sp();
            if (sobj_at(ONAMES.BOULDER, mm.x, mm.y))
                while (is_pit_sp(trytrap) || is_hole_sp(trytrap))
                    trytrap = rndtrap_sp();
            mklev_fns?.maketrap?.(mm.x, mm.y, trytrap);
        }
    }
}

/* src/dungeon.c Can_dig_down() — hardfloor, the dungeon's bottom level,
   and the invocation level all refuse; the castle is the main dungeon's
   bottom level, which is what makes its rndtrap re-roll every TRAPDOOR. */
function Can_dig_down_sp() {
    if (game.level.flags?.hardfloor) return false;
    const uz = game.u.uz, dgn = game.dungeons?.[uz.dnum];
    if (dgn && uz.dlevel === dgn.num_dunlevs) return false; /* Is_botlevel */
    if (game.inv_pos && uz.dnum === game.inv_pos.dnum
        && uz.dlevel === game.inv_pos.dlevel) return false;
    return true;
}

const is_pit_sp = (t) => t === 11 /* PIT */ || t === 12 /* SPIKED_PIT */;
const is_hole_sp = (t) => t === 13 /* HOLE */ || t === 14 /* TRAPDOOR */;

// src/sp_lev.c:1006 lspo_non_passwall() — W_NONPASSWALL over a selection.
//
// C routes both this and non_diggable through set_wallprop_in_selection(), so
// the per-cell test is sel_set_wall_property()'s (sp_lev.c:986):
//     IS_STWALL(typ) || IS_TREE(typ) || typ == IRONBARS
// Draws nothing.
export function lspo_non_passwall(x1, y1, x2, y2) {
    for (let x = x1 + game.xstart; x <= x2 + game.xstart; x++)
        for (let y = y1 + game.ystart; y <= y2 + game.ystart; y++) {
            const loc = game.level.at(x, y);
            if (loc && (IS_STWALL(loc.typ) || loc.typ === TREE
                        || loc.typ === IRONBARS))
                loc.wall_info = (loc.wall_info | 0) | W_NONPASSWALL;
        }
}

/* src/sp_lev.c:1090 lspo_exclusion() — record an exclusion zone. C keeps these
   on sve.exclusion_zones and consults them when placing monsters, teleport
   destinations and so on (sp_lev.c:877). Draws nothing; the region corners go
   through get_location_coord, i.e. the map's xstart/ystart offset. */
const EZ_TYPES = { teleport: 0, 'teleport-up': 1, 'teleport-down': 2,
                   'monster-generation': 3 };

export function lspo_exclusion(opts) {
    const r = opts.region || [];
    (game.exclusion_zones ||= []).push({
        zonetype: EZ_TYPES[opts.type ?? 'teleport'] ?? 0,
        lx: r[0] + game.xstart, ly: r[1] + game.ystart,
        hx: r[2] + game.xstart, hy: r[3] + game.ystart,
    });
}

// src/sp_lev.c lspo_non_diggable() — W_NONDIGGABLE on every wall in the area
// (absolute selection).
export function lspo_non_diggable(x1, y1, x2, y2) {
    for (let x = x1 + game.xstart; x <= x2 + game.xstart; x++)
        for (let y = y1 + game.ystart; y <= y2 + game.ystart; y++) {
            const loc = game.level.at(x, y);
            if (loc && (C_IS_WALL(loc.typ) || loc.typ === DBWALL
                        || loc.typ === SDOOR))
                loc.wall_info = (loc.wall_info | 0) | W_NONDIGGABLE;
        }
}

// src/sp_lev.c:5584 lspo_region(), the two castle forms: a plain lit/unlit
// area, or a typed room record with a fill mode.
export function lspo_region_full(opts) {
    if (Array.isArray(opts.area)) {
        /* region(selection.area(...), "lit"/"unlit") */
        const [ax1, ay1, ax2, ay2] = opts.area;
        const rlit = opts.lit ? 1 : 0;
        let x1 = ax1 + game.xstart, y1 = ay1 + game.ystart,
            x2 = ax2 + game.xstart, y2 = ay2 + game.ystart;
        if (rlit) {   /* selection_do_grow(W_ANY) then sel_set_lit */
            x1 = Math.max(x1 - 1, 1); x2 = Math.min(x2 + 1, 79);
            y1 = Math.max(y1 - 1, 0); y2 = Math.min(y2 + 1, 20);
        }
        for (let x = x1; x <= x2; x++)
            for (let y = y1; y <= y2; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.lit = !!rlit;
            }
        return;
    }

    /* region({ region={x1,y1,x2,y2}, lit=1, type=..., filled=N }) */
    const [rx1, ry1, rx2, ry2] = opts.region;
    const rtypeMap = { ordinary: 0, throne: COURT, barracks: BARRACKS,
                       swamp: SWAMP, court: COURT, morgue: MORGUE,
                       beehive: BEEHIVE, zoo: ZOO, temple: TEMPLE };
    const rtype = rtypeMap[opts.type ?? 'ordinary'] ?? 0;
    const needfill = opts.filled ?? 0;
    let rlit = opts.lit ?? -1;
    if (rlit === -1) rlit = (rnd(1 + Math.abs(depth(game.u.uz))) < 11
                             && rn2(77)) ? 1 : 0;   /* litstate_rnd */
    const dx1 = rx1 + game.xstart, dy1 = ry1 + game.ystart;
    const dx2 = rx2 + game.xstart, dy2 = ry2 + game.ystart;

    /* room_not_needed shortcut: a plain lit rectangle */
    if (rtype === 0) {
        /* light_region() */
        let lowx = dx1, hix = dx2, lowy = dy1, hiy = dy2;
        if (rlit) {
            lowx = Math.max(lowx - 1, 1); hix = Math.min(hix + 1, 79);
            lowy = Math.max(lowy - 1, 0); hiy = Math.min(hiy + 1, 20);
        }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.lit = !!rlit;
            }
        return;
    }

    /* a real room record: add_room + needfill for the later fill sweep */
    let troom;
    if (opts.irregular) {
        /* src/sp_lev.c:5676 — flood-fill the connected floor from the
           region's corner to paint roomno, then add the bounding room
           marked irregular so fills skip non-room squares */
        const g = game;
        g.min_rx = g.max_rx = dx1;
        g.min_ry = g.max_ry = dy1;
        g.smeq = g.smeq || {};
        g.smeq[g.level.nroom] = g.level.nroom;
        flood_fill_rm(dx1, dy1, g.level.nroom + ROOMOFFSET, rlit, true);
        troom = mklev_fns?.add_room_return?.(g.min_rx, g.min_ry,
                                             g.max_rx, g.max_ry,
                                             false, rtype, true);
        if (troom) {
            troom.rlit = rlit;
            troom.irregular = true;
        }
    } else {
        troom = mklev_fns?.add_room_return?.(dx1, dy1, dx2, dy2,
                                             !!rlit, rtype, true);
    }
    if (troom) {
        troom.needfill = needfill;
        game.level.flags.is_maze_lev = true;
        /* src/sp_lev.c:5710 — a region's room record collects the doors
           bordering it; fill_zoo's irregular arm skips squares within one
           step of svd.doors[fdoor], so an unlinked room fills too many. */
        add_doors_to_room(troom);
    }
}

// l_selection: selection.area(x1,y1,x2,y2):rndcoord(1) — one rn2 draw over
// the remaining points; '1' removes the picked point from the selection.
export function selection_area_obj(x1, y1, x2, y2) {
    const pts = [];
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
            pts.push({ x, y });
    return {
        pts,
        set(x, y) { this.pts.push({ x, y }); },
        rndcoord(removeit) {
            if (!this.pts.length) return { x: -1, y: -1 };
            const i = rn2(this.pts.length);
            const c = this.pts[i];
            if (removeit) this.pts.splice(i, 1);
            /* the coord is map-relative like every other script coord */
            return { x: c.x, y: c.y };
        },
    };
}
