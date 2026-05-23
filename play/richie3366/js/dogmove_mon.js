// dogmove_mon.js — Pet movement RNG subset (dogmove.c dog_goal, dog_move).
// C ref: monmove.c m_move → dog_move(); dogmove.c dog_goal() ~554, dog_move() ~1256.

import { MMOVE_NOTHING, NORMAL_SPEED } from './const.js';
import { EDOG, has_edog } from './const.js';
import { couldsee } from './vision.js';
import { dist2 } from './hacklib.js';
import { rn2 } from './rng.js';
import { objResists } from './obj_resists.js';
import {
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
} from './mfndpos_mon.js';
import { ensureMonsterMtrack } from './monflee.js';

const SQSRCHRADIUS = 5;

/**
 * C: dog.c dogfood — subset for floor scan in dog_goal (obj_resists @ zap.c:1469).
 * @param {Record<string, unknown>} obj
 * @returns {boolean} true when dogfood would call obj_resists
 */
function dogfoodMayObjResistsLikeC(obj) {
    if (!obj || (obj.opoisoned | 0)) return false;
    return !((obj.cursed | 0) !== 0);
}

/**
 * C: dogmove.c dog_goal — floor object loop; APPORT uses **`edog->apport > rn2(8)`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function dogGoalFloorScanRngLikeC(g, mtmp) {
    const edog = EDOG(mtmp);
    const u = g.u;
    if (!edog || !u) return;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(79, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(23, omy + SQSRCHRADIUS);
    const floor = g.level?.objects;
    if (!floor) return;
    const inSight = couldsee(omx, omy);
    const hasMinvent = false; /* NO_MINVENT starting pet */
    for (const obj of floor) {
        if (!obj) continue;
        const nx = obj.ox | 0;
        const ny = obj.oy | 0;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        if (dogfoodMayObjResistsLikeC(obj)) objResists(obj, 0, 95);
        if (
            inSight
            && !hasMinvent
            && (edog.apport | 0) > rn2(8)
        ) {
            /* C: APPORT branch — one rn2(8) per qualifying object */
        }
    }
}

/**
 * C: dogmove.c dog_move — position pick **`rn2(++chcnt)`** when **`chcnt`** reaches 1.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {number}
 */
function dogMovePositionPickRngLikeC(g, mtmp) {
    const u = g.u;
    if (!u) return MMOVE_NOTHING;
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt <= 0) return MMOVE_NOTHING;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    let chcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        const ndist = dist2(nx, ny, ux, uy);
        const nidist = dist2(mtmp.mx | 0, mtmp.my | 0, ux, uy);
        const j = (ndist - nidist);
        if ((j === 0 && !rn2(++chcnt)) || j < 0) {
            if (j < 0) chcnt = 0;
        }
    }
    return MMOVE_NOTHING;
}

/**
 * C: first **`#search`** with adjacent hostile — pet **`dog_move`** after near mon gate
 * (no **`distfleeck`** in session log between gate and **`dog_goal`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function dogMoveSearchPassNearHeroLikeC(g, mtmp) {
    if (!(mtmp.mtame | 0) || !has_edog(mtmp)) return;
    if ((mtmp.mhp | 0) <= 0) return;
    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    dogGoalFloorScanRngLikeC(g, mtmp);
    /* C: dogmove.c dog_move — one **`rn2(1)`** position trial on first **`#search`** pass. */
    rn2(1);
    ensureMonsterMtrack(mtmp);
}
