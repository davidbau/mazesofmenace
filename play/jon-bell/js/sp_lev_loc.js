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
import { rn1 } from './rng.js';
import { rn2 } from './rnd.js';
import { COLNO, ROWNO, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DB_LAVA, DB_MOAT, DB_UNDER, IS_OBSTRUCTED, IS_WALL, SPACE_POS, isok, Is_waterlevel, Is_juiblex_level, } from './const.js';
// ─── is_ok_location ───────────────────────────────────────────────────────────
// Humidity flag constants (sp_lev.h:69-74) — kept local to this module;
// exported for callers that need to pass them.
export const DRY = 0x01;
import { WET } from './const.js';
export { WET };
import { HOT } from './const.js';
export { HOT };
import { SOLID } from './const.js';
export { get_location } from './sp_lev.js'; // relocate-fns
export { _somexy_fn }; // relocate-fns
export { SOLID };
export const ANY_LOC = 0x10;
export const NO_LOC_WARN = 0x20;
export const SPACELOC = 0x40;
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
