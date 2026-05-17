// scatter_obj_delivery.js — explode.c scatter() subset for dokick.c obj_delivery().
// C ref: explode.c scatter(sx, sy, blastforce, /*scflags*/ 0, obj); dokick.c obj_delivery().

import {
    isok,
    STONE,
    ZAP_POS,
    SINK,
} from './const.js';
import { rn2, rnd } from './rng.js';
import { newsym } from './display.js';
import {
    placeFloorObjectInLevel,
    unlinkFloorObjectInLevel,
    stackObjOnFloorInLevel,
} from './floorobj.js';
import { isClosedDoorLoc } from './walkable.js';

/** C: decl.c **`xdir`/`ydir`** first eight compass indices. */
const XDIR8 = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR8 = [0, -1, -1, -1, 0, 1, 1, 1];

/**
 * C: explode.c **`scatter(sx, sy, blastforce, 0, otmp)`** with **`scflags == 0`**
 * (no MAY_HIT / MAY_DESTROY / MAY_FRACTURE) — movement then place_object + stackobj only.
 * @param {import('./gstate.js').game} g
 * @param {number} sx
 * @param {number} sy
 * @param {number} blastForce — C **`rnd(2)`** in **`obj_delivery`** (1..2)
 * @param {object} otmp
 */
export function scatterObjDeliveryScflags0LikeC(g, sx, sy, blastForce, otmp) {
    if (!g.level) return;
    const xi = sx | 0;
    const yi = sy | 0;
    unlinkFloorObjectInLevel(g, otmp);
    const tmpDir = rn2(8);
    const dx = XDIR8[tmpDir];
    const dy = YDIR8[tmpDir];
    let tmp = (blastForce | 0) - Math.trunc((otmp.owt | 0) / 40);
    if (tmp < 1) tmp = 1;
    let range = rnd(tmp);
    let ox = xi;
    let oy = yi;
    let stopped = false;
    while (range > 0 && !stopped) {
        range--;
        const nx = ox + dx;
        const ny = oy + dy;
        if (!isok(nx, ny)) {
            stopped = true;
            break;
        }
        const loc = g.level?.at(nx, ny);
        const typ = loc ? loc.typ | 0 : STONE;
        if (!ZAP_POS(typ) || isClosedDoorLoc(loc)) {
            stopped = true;
            break;
        }
        if (typ === SINK) {
            stopped = true;
            break;
        }
        ox = nx;
        oy = ny;
    }
    placeFloorObjectInLevel(g, otmp, ox, oy);
    stackObjOnFloorInLevel(g, otmp);
    newsym(ox, oy);
}
