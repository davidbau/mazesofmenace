// dogmove_reach.js — C dogmove.c could_reach_item / can_reach_location (goal filters).
// C ref: dogmove.c could_reach_item() ~1362, can_reach_location() ~1379.

import {
    IS_DOOR, CORR, ROOM, IS_STWALL, IS_TREE, W_NONDIGGABLE, Is_rogue_level,
} from './const.js';
import { isPoolCellLikeC, isLavaCellLikeC } from './fillholetyp.js';
import { throwsRocks, passesWalls, swims, likesLava } from './mondata.js';
import { raceptr } from './mondata.js';
import { dist2, distmin } from './hacklib.js';
import { OTYP_BOULDER } from './const.js';
import { floorObjKey } from './floorobj.js';
import { clearPathRayToTargetLikeC } from './mthrow_mon.js';

/** C: dogmove.c cursed_object_at — any cursed member of floor stack at (x,y). */
export function cursedObjectAtDogmoveLikeC(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x | 0, y | 0));
    for (let o = head; o; o = o.nexthere) {
        if (o.cursed) return true;
    }
    return false;
}

/**
 * C: dogmove.c could_reach_item — pool/lava/boulder vs monster capabilities.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} nx
 * @param {number} ny
 */
function sobjAtBoulderLikeC(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x | 0, y | 0));
    for (let o = head; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

/**
 * C: vision.h **`m_cansee(mtmp,x,y)`** — **`clear_path`** from monster (**`dogmove.c:553`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} x
 * @param {number} y
 */
export function mCanseeDogmoveLikeC(g, mtmp, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    /* C: vision.c **`clear_path`** — same square is visible. */
    if (mx === xi && my === yi) return true;
    return clearPathRayToTargetLikeC(g, xi, yi, mx, my, false);
}

/**
 * C: monmove.c **`m_avoid_kicked_loc`** — tame/peaceful pet avoids hero's last kick square.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} nx
 * @param {number} ny
 */
export function mAvoidKickedLocDogmoveLikeC(g, mtmp, nx, ny) {
    const kl = g.kickedloc;
    if (!kl || (kl.x | 0) < 1) return false;
    const u = g.u;
    if (!u) return false;
    if (!((mtmp.mpeaceful | 0) || (mtmp.mtame | 0))) return false;
    if (!(mtmp.mcansee | 0) || (mtmp.mconf | 0) || (mtmp.mstun | 0)) return false;
    if (u.Conflict | 0) return false;
    const xi = nx | 0;
    const yi = ny | 0;
    if (xi !== (kl.x | 0) || yi !== (kl.y | 0)) return false;
    return distmin(xi, yi, u.ux | 0, u.uy | 0) <= 1;
}

/**
 * C: monmove.c **`m_avoid_soko_push_loc`** — sokoban boulder-push avoidance (subset).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} nx
 * @param {number} ny
 */
export function mAvoidSokoPushLocDogmoveLikeC(g, mtmp, nx, ny) {
    if (!g.Sokoban) return false;
    const u = g.u;
    if (!u) return false;
    if (!((mtmp.mpeaceful | 0) || (mtmp.mtame | 0))) return false;
    if ((mtmp.mconf | 0) || (mtmp.mstun | 0) || (u.Conflict | 0)) return false;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const xi = nx | 0;
    const yi = ny | 0;
    if (dist2(xi, yi, ux, uy) !== 4) return false;
    const bx = xi + Math.sign(ux - xi);
    const by = yi + Math.sign(uy - yi);
    const head = g.level?.floorObjHeads?.get(floorObjKey(bx, by));
    for (let o = head; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

export function couldReachItemDogmoveLikeC(g, mtmp, nx, ny) {
    const ptr = raceptr(mtmp);
    if (isPoolCellLikeC(g, nx, ny) && !swims(ptr)) return false;
    if (isLavaCellLikeC(g, nx, ny) && !likesLava(ptr)) return false;
    if (sobjAtBoulderLikeC(g, nx, ny) && !throwsRocks(ptr)) return false;
    return true;
}

function isObstructedDogmoveLikeC(g, typ) {
    return typ < IS_DOOR && (typ | 0) !== CORR && (typ | 0) !== ROOM;
}

/** C: mondata.h **`M1_TUNNEL`**. */
const M1_TUNNEL = 0x00000020;

/** C: mondata.h **`tunnels(ptr)`**. */
function tunnelsPermonstLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_TUNNEL) !== 0;
}

/** C: hack.c **`may_dig`** — STWALL/tree + **`W_NONDIGGABLE`**. */
function mayDigLocDogmoveLikeC(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return true;
    const typ = loc.typ | 0;
    const wi = loc.wall_info | 0;
    if ((IS_STWALL(typ) || IS_TREE(typ)) && (wi & W_NONDIGGABLE)) return false;
    return true;
}

/**
 * C: dogmove.c can_reach_location — recursive reachability for dog_goal filters.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} mx
 * @param {number} my
 * @param {number} fx
 * @param {number} fy
 */
export function canReachLocationDogmoveLikeC(g, mtmp, mx, my, fx, fy) {
    const xi = mx | 0;
    const yi = my | 0;
    const xf = fx | 0;
    const yf = fy | 0;
    if (xi === xf && yi === yf) return true;
    const dist = dist2(xi, yi, xf, yf);
    const ptr = raceptr(mtmp);
    for (let i = xi - 1; i <= xi + 1; i++) {
        for (let j = yi - 1; j <= yi + 1; j++) {
            if (i < 0 || i > 79 || j < 0 || j > 23) continue;
            if (dist2(i, j, xf, yf) >= dist) continue;
            const loc = g.level?.at(i, j);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if (
                isObstructedDogmoveLikeC(g, typ)
                && !passesWalls(ptr)
                && (
                    !mayDigLocDogmoveLikeC(g, i, j)
                    || !tunnelsPermonstLikeC(ptr)
                    || Is_rogue_level(g.u?.uz)
                )
            ) {
                continue;
            }
            if (IS_DOOR(typ) && ((loc.doormask | 0) & 3)) continue;
            if (!couldReachItemDogmoveLikeC(g, mtmp, i, j)) continue;
            if (canReachLocationDogmoveLikeC(g, mtmp, i, j, xf, yf)) return true;
        }
    }
    return false;
}
