// @ts-nocheck
// sp_lev_loc.ts — Coordinate-resolution helpers for special-level opcodes.
// C ref: nethack-c/src/sp_lev.c  get_location() (line 1202) and
//        is_ok_location() (line 1280).
//
// These are the two primitives every lspo_* opcode calls to pick and validate
// a placement coordinate on the map.  get_location() translates a packed
// coordinate (CENTER-relative or RANDOM) to absolute (x,y) using an optional
// bounding room; is_ok_location() tests whether that (x,y) satisfies the
// humidity/terrain constraints.
//
// RNG note (Cardinal Rule 2): the only RNG drawn inside these functions is the
// retry loop inside get_location on a RANDOM coord when croom == null:
//   *x = mx + rn2(sx)
//   *y = my + rn2(sy)
// That is 2 rn2 calls per retry iteration, repeated up to 100 times.
// The somexy() call (croom != null path) draws its own RNG; see mklev.ts.
// is_ok_location() itself draws NO RNG.
//
// WIRE_PENDING: sp_lev_loc-001 — callers live in the lspo_* opcode layer
// (currently unported). These exports will be wired when lspo_monster /
// lspo_object / create_monster / create_object / get_location_coord are ported.
import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { COLNO, ROWNO, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DB_LAVA, DB_MOAT, DB_UNDER, IS_OBSTRUCTED, IS_WALL, SPACE_POS, isok, Is_waterlevel, Is_juiblex_level, } from './const.js';
// ─── global accessor helpers ──────────────────────────────────────────────────
// C ref: sp_lev.c gx/gy instance-globals — instance_globals_x / instance_globals_y
// in nethack-c/include/decl.h:1060-1095.
// Stored on game.gx / game.gy; initialised by reset_xystart_size().
/** C ref: sp_lev.c:207-212 reset_xystart_size() */
export function reset_xystart_size() {
    const g = game;
    if (!g.gx)
        g.gx = {};
    if (!g.gy)
        g.gy = {};
    g.gx.xstart = 1; // column [0] is off limits
    g.gy.ystart = 0;
    g.gx.xsize = COLNO - 1; // 1..COLNO-1
    g.gy.ysize = ROWNO; // 0..ROWNO-1
}
// ─── is_ok_location_func hook ─────────────────────────────────────────────────
// C ref: sp_lev.c:1272  static boolean (*is_ok_location_func)(coordxy,coordxy) = NULL;
// Mirrors the C module-level function-pointer used by good_stair_loc et al.
// eslint-disable-next-line prefer-const
let _is_ok_location_func = null;
/** C ref: sp_lev.c:1274  set_ok_location_func() */
export function set_ok_location_func(func) {
    _is_ok_location_func = func;
}
// ─── is_ok_location ───────────────────────────────────────────────────────────
// Humidity flag constants (sp_lev.h:69-74) — kept local to this module;
// exported for callers that need to pass them.
export const DRY = 0x01;
export const WET = 0x02;
export const HOT = 0x04;
export const SOLID = 0x08;
export const ANY_LOC = 0x10;
export const NO_LOC_WARN = 0x20;
export const SPACELOC = 0x40;
/**
 * C ref: sp_lev.c:1280  is_ok_location()
 *
 * Returns true when (x,y) on the current level satisfies the humidity
 * constraints expressed by `humidity`.
 *
 * RNG: draws NONE.
 */
export function is_ok_location(x, y, humidity) {
    const g = game;
    const loc = g.level?.at(x, y);
    const typ = loc?.typ ?? 0;
    // C: if (Is_waterlevel(&u.uz)) return TRUE;
    if (Is_waterlevel(g.u?.uz))
        return true;
    // C: if (is_ok_location_func) return is_ok_location_func(x, y);
    if (_is_ok_location_func !== null)
        return _is_ok_location_func(x, y);
    // C: if (humidity & ANY_LOC) return TRUE;
    if (humidity & ANY_LOC)
        return true;
    // C: if ((humidity & SOLID) && IS_OBSTRUCTED(typ)) return TRUE;
    if ((humidity & SOLID) && IS_OBSTRUCTED(typ))
        return true;
    // C: if ((humidity & (DRY|SPACELOC)) && SPACE_POS(typ)) { ... }
    if ((humidity & (DRY | SPACELOC)) && SPACE_POS(typ)) {
        // C: boolean bould = (sobj_at(BOULDER, x, y) != NULL);
        const bould = _sobj_at_boulder(x, y);
        // C: if (!bould || (bould && (humidity & SOLID))) return TRUE;
        if (!bould || (bould && (humidity & SOLID)))
            return true;
    }
    // C: if ((humidity & WET) && is_pool(x, y)) return TRUE;
    if ((humidity & WET) && _is_pool(x, y))
        return true;
    // C: if ((humidity & HOT) && is_lava(x, y)) return TRUE;
    if ((humidity & HOT) && _is_lava(x, y))
        return true;
    return false;
}
// ─── inline helpers mirroring dbridge.c is_pool / is_lava / is_moat ──────────
// These are called only from is_ok_location; they draw NO RNG.
/**
 * C ref: dbridge.c:100  is_moat()
 * Returns true for MOAT (or drawbridge-over-moat), except on the Juiblex level.
 */
function _is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const g = game;
    const loc = g.level?.at(x, y);
    if (!loc)
        return false;
    const typ = loc.typ;
    if (Is_juiblex_level(g.u?.uz))
        return false;
    if (typ === MOAT)
        return true;
    if (typ === DRAWBRIDGE_UP && ((loc.drawbridgemask ?? loc.flags) & DB_UNDER) === DB_MOAT)
        return true;
    return false;
}
/**
 * C ref: dbridge.c:45  is_pool()
 * Returns true for POOL, MOAT, WATER, or is_moat().
 */
function _is_pool(x, y) {
    if (!isok(x, y))
        return false;
    const g = game;
    const loc = g.level?.at(x, y);
    if (!loc)
        return false;
    const typ = loc.typ;
    if (typ === POOL || typ === MOAT || typ === WATER || _is_moat(x, y))
        return true;
    return false;
}
/**
 * C ref: dbridge.c:61  is_lava()
 * Returns true for LAVAPOOL, LAVAWALL, or drawbridge-over-lava.
 */
function _is_lava(x, y) {
    if (!isok(x, y))
        return false;
    const g = game;
    const loc = g.level?.at(x, y);
    if (!loc)
        return false;
    const typ = loc.typ;
    if (typ === LAVAPOOL || typ === LAVAWALL)
        return true;
    if (typ === DRAWBRIDGE_UP && ((loc.drawbridgemask ?? loc.flags) & DB_UNDER) === DB_LAVA)
        return true;
    return false;
}
/**
 * Stub for sobj_at(BOULDER, x, y) — returns whether a BOULDER object sits
 * at (x,y) in the level's object grid.
 *
 * C ref: invent.c:1466  sobj_at()  — walks level.objects[x][y] nexthere chain.
 * The full implementation is in mklev.ts; we replicate the logic here for the
 * BOULDER case since is_ok_location only ever checks for BOULDER.
 *
 * TODO(sp_lev): wire to the real exported sobj_at once it is available.
 */
// C objects.h BOULDER = 475
const _BOULDER = 475;
function _sobj_at_boulder(x, y) {
    const g = game;
    let obj = g.level?.levelObjects?.[x]?.[y] ?? null;
    while (obj !== null) {
        if (obj.otyp === _BOULDER)
            return true;
        obj = obj.nexthere ?? null;
    }
    return false;
}
// ─── somexy stub ─────────────────────────────────────────────────────────────
// get_location uses somexy() when croom != null and *x < 0 (RANDOM coord).
// The real somexy() is in mklev.ts and draws rn2 internally.
// We forward-declare here; at runtime the caller (get_location_coord / lspo_*)
// will have mklev.ts already evaluated, so we read it lazily from `game`.
/**
 * C ref: mkroom.c:somexy()
 * Finds a random accessible interior cell in croom, writing it into `c`.
 * Returns true on success; false if the room has no usable cells.
 *
 * TODO(sp_lev): inject or import the real somexy from mklev.ts once the
 * sp_lev opcode layer is wired.  For now this is a faithful stub that makes
 * get_location compile; any code path that reaches it at runtime will throw.
 */
let _somexy_fn = null;
/**
 * Called by js/mklev.js at module scope to wire the real somexy() in.
 * Registry rather than a direct `import { somexy } from './mklev.js'` for the
 * same reason js/nhlib.js:52 registerNhlibSomexy exists: mklev.js pulls in the
 * whole level-generation graph (mkmaze -> sp_lev -> sp_lev_loc), so importing
 * it from here would close an import cycle back onto this module.
 * Registered on a MODULE-LOCAL, not on `game`: js/gstate.js:4 declares
 * `export let game = {}` and REASSIGNS it on reset, so anything hung off the
 * game object at module-init time is silently dropped on the next new game —
 * which is why the old `game._somexy` hook below never fired.
 */
export function registerSpLevSomexy(fn) {
    _somexy_fn = fn;
}
function _somexy(croom, c) {
    if (typeof _somexy_fn === 'function')
        return _somexy_fn(croom, c);
    /* Standalone sp_lev users may load this module without mklev.js.  Mirror
     * mkroom.c:somexy here so that fallback resolution retains C's draws and
     * room/subroom rejection rules instead of failing or silently desyncing. */
    const g = game;
    const somex = () => rn1((croom.hx | 0) - (croom.lx | 0) + 1, croom.lx | 0);
    const somey = () => rn1((croom.hy | 0) - (croom.ly | 0) + 1, croom.ly | 0);
    const inside = (room, x, y) => {
        if (room.irregular) {
            const idx = room.roomnoidx ?? (g.level?.rooms || []).indexOf(room);
            const loc = g.level?.at(x, y);
            return !!(loc && !loc.edge && (loc.roomno | 0) === ((idx | 0) + 3));
        }
        return x >= (room.lx | 0) - 1 && x <= (room.hx | 0) + 1
            && y >= (room.ly | 0) - 1 && y <= (room.hy | 0) + 1;
    };
    let tries = 0;
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? (g.level?.rooms || []).indexOf(croom);
        const roomno = (idx | 0) + 3;
        while (tries++ < 100) {
            c.x = somex(); c.y = somey();
            const loc = g.level?.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === roomno) return true;
        }
        for (c.x = croom.lx; c.x <= croom.hx; c.x++)
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = g.level?.at(c.x, c.y);
                if (loc && !loc.edge && (loc.roomno | 0) === roomno) return true;
            }
        return false;
    }
    if (!(croom.nsubrooms | 0)) {
        c.x = somex(); c.y = somey();
        return true;
    }
    outer: while (tries++ < 100) {
        c.x = somex(); c.y = somey();
        const loc = g.level?.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        for (let i = 0; i < (croom.nsubrooms | 0); i++)
            if (inside(croom.sbrooms[i], c.x, c.y)) continue outer;
        break;
    }
    return tries < 100;
}
// ─── get_location ─────────────────────────────────────────────────────────────
/**
 * C ref: sp_lev.c:1202  get_location()
 *
 * Translates a packed special-level coordinate into an absolute (x,y) map
 * position, writing the result back through the pointer parameters (here
 * `coord.x` / `coord.y` on a mutable object).
 *
 * @param coord    Mutable {x, y} — in/out.  x<0 means RANDOM; x>=0 is a
 *                 positive offset from the room/level origin.
 * @param humidity Bit-field of DRY/WET/HOT/SOLID/ANY_LOC/NO_LOC_WARN/SPACELOC.
 * @param croom    The bounding room (struct mkroom*), or null for the whole
 *                 level (uses gx.xstart / gy.ystart / gx.xsize / gy.ysize).
 *
 * RNG:  Only drawn on the RANDOM (*x < 0) path when croom is null:
 *         rn2(sx)  then  rn2(sy)  per retry iteration, up to 100 tries.
 *       When croom != null the RANDOM path calls somexy() which draws its
 *       own RNG (rn2 internally in mkroom.c).
 *       The positive-coord path draws NO RNG.
 */
export function get_location(coord, humidity, croom) {
    const g = game;
    // C: int mx, my, sx, sy;
    let mx, my, sx, sy;
    // C: if (croom) { mx=croom->lx; my=croom->ly; sx=croom->hx-mx+1; sy=croom->hy-my+1; }
    //    else       { mx=gx.xstart; my=gy.ystart; sx=gx.xsize; sy=gy.ysize; }
    if (croom) {
        mx = croom.lx | 0;
        my = croom.ly | 0;
        sx = (croom.hx - mx + 1) | 0;
        sy = (croom.hy - my + 1) | 0;
    }
    else {
        if (!g.gx || g.gx.xsize === undefined)
            reset_xystart_size();
        mx = g.gx.xstart | 0;
        my = g.gy.ystart | 0;
        sx = g.gx.xsize | 0;
        sy = g.gy.ysize | 0;
    }
    if (coord.x >= 0) {
        // C: *x += mx; *y += my;   (normal locations — no RNG)
        coord.x += mx;
        coord.y += my;
    }
    else {
        // C: random location — retry loop up to 100 times
        let cpt = 0;
        do {
            if (croom) {
                // C: if (croom) { coord tmpc; (void)somexy(croom,&tmpc); *x=tmpc.x; *y=tmpc.y; }
                const tmpc = { x: 0, y: 0 };
                _somexy(croom, tmpc);
                coord.x = tmpc.x;
                coord.y = tmpc.y;
            }
            else {
                // C: *x = mx + rn2((int)sx); *y = my + rn2((int)sy);
                coord.x = mx + rn2(sx);
                coord.y = my + rn2(sy);
            }
            // C: if (is_ok_location(*x, *y, humidity)) break;
            if (is_ok_location(coord.x, coord.y, humidity))
                break;
        } while (++cpt < 100);
        // C: if (cpt >= 100) { /* last try — exhaustive scan */ }
        if (cpt >= 100) {
            let found = false;
            outer: for (let xx = 0; xx < sx; xx++) {
                for (let yy = 0; yy < sy; yy++) {
                    coord.x = mx + xx;
                    coord.y = my + yy;
                    if (is_ok_location(coord.x, coord.y, humidity)) {
                        found = true;
                        break outer; // C: goto found_it;
                    }
                }
            }
            if (!found) {
                if (!(humidity & NO_LOC_WARN)) {
                    // C: impossible("get_location:  can't find a place!");
                    // TODO(sp_lev): impossible() not yet wired — log to console
                    console.warn('get_location: can\'t find a place!');
                }
                else {
                    // C: *x = *y = -1;
                    coord.x = coord.y = -1;
                }
            }
        }
    }
    // found_it: (C label; TS equivalent is just falling through)
    // C: if (!(humidity & ANY_LOC) && !isok(*x, *y)) { ... }
    if (!(humidity & ANY_LOC) && !isok(coord.x, coord.y)) {
        if (!(humidity & NO_LOC_WARN)) {
            // C: *x = gx.x_maze_max; *y = gy.y_maze_max;
            // (commented-out warning in C; just clamps to maze bounds)
            if (!g.gx)
                reset_xystart_size();
            coord.x = g.gx.x_maze_max ?? ((COLNO - 1) & ~1);
            coord.y = g.gy.y_maze_max ?? ((ROWNO - 1) & ~1);
        }
        else {
            coord.x = coord.y = -1;
        }
    }
}
