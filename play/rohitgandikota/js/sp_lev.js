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
import { rn1, rn2 } from './rng.js';
import { isok } from './hacklib.js';
import { sobj_at } from './invent.js';
import { is_pool, is_lava } from './mon.js';
import { ONAMES } from './objects_data.js';
import { ANY_LOC, SOLID, DRY, SPACELOC, WET, HOT,
         NO_LOC_WARN } from './const.js';
import { litstate_rnd, flood_fill_rm } from './mkmap.js';
import { depth } from './dungeon.js';
import { mkgold } from './mkobj.js';
import {
    OROOM, THEMEROOM, VAULT, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST,
    LEPREHALL, MORGUE, BARRACKS, TEMPLE, SWAMP, SHOPBASE,
    FILL_NONE, FILL_NORMAL,
    COLNO, ROWNO, STONE, CORR, ROOM, HWALL, VWALL, DOOR, SDOOR, SCORR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL,
    TLWALL, TRWALL, DBWALL, AIR, CLOUD, FOUNTAIN, THRONE, SINK, MOAT, POOL,
    LAVAPOOL, LAVAWALL, ICE, WATER, TREE, IRONBARS,
    MAX_TYPE, MATCH_WALL, INVALID_TYPE, NO_ROOM, ROOMOFFSET, D_CLOSED,
    MAXNROFROOMS, IS_WALL, IS_DOOR,
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
            /* stock_room() is a separate subsystem (shop inventory); it is
               not reached by any session that currently gets this far. */
            note_unported('stock_room');
            game.level.flags.has_shop = true;
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
            note_unported(`fill_zoo rtype=${croom.rtype}`);
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

    if (contents) contents(troom);
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
    if ((humidity & WET) && is_pool(x, y))
        return true;
    if ((humidity & HOT) && is_lava(x, y))
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
