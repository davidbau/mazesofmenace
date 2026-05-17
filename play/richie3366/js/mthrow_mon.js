// mthrow_mon.js — Monster ranged throw at hero (`mthrowu.c` **`m_throw`** / **`lined_up`** subset).
// C ref: mthrowu.c **`lined_up`**, **`m_lined_up`**, **`m_throw`** (hero **`u_at`** hit via **`mthrowAtHeroUxyThituLikeC`**);
//        **`mon.c`** **`m_move`** (via **`m_move_mon.js`**) per monster.
//
// Omits **`Upolyd`** **`rn2(25)`** concealment, **`throws_rocks`** / **`WAN_STRIKING`** boulder **`ignore`**, full
// **`boulderhandling==2`** **`rn2`** branch, **`MON_WEP`** pole **`m_throw`** path, **`obj_extract_self`**.

import { isok, BOLT_LIM, OTYP_BOULDER, ZAP_POS } from './const.js';
import { distmin } from './hacklib.js';
import { isClosedDoorLoc } from './walkable.js';
import { couldsee } from './vision.js';
import { mthrowAtHeroUxyThituLikeC, OBJ_ARROW, OBJ_DART, OBJ_ROCK } from './mthrowu.js';

/**
 * C: **`mthrowu.c`** **`clear_path`** along an 8-way ray from **`(bx,by)`** toward **`(ax,ay)`** (exclusive start).
 * @param {import('./gstate.js').game} g
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {boolean} blockBoulders — C **`boulderhandling==0`**
 */
export function clearPathRayToTargetLikeC(g, ax, ay, bx, by, blockBoulders) {
    const dx = Math.sign(ax - bx);
    const dy = Math.sign(ay - by);
    if (!dx && !dy) return false;
    let x = bx;
    let y = by;
    for (;;) {
        x += dx;
        y += dy;
        if (!isok(x, y)) return false;
        if (x === ax && y === ay) return true;
        const loc = g.level?.at(x, y);
        if (!loc) return false;
        const typ = loc.typ | 0;
        if (!ZAP_POS(typ) || isClosedDoorLoc(loc)) return false;
        if (blockBoulders) {
            for (const o of g.level?.objects ?? []) {
                if ((o.ox | 0) === x && (o.oy | 0) === y && (o.otyp | 0) === OTYP_BOULDER) return false;
            }
        }
    }
}

/**
 * C: **`mthrowu.c`** **`lined_up(mtmp)`** / **`m_lined_up(&youmonst, mtmp)`** — straight line within **`BOLT_LIM`**,
 * **`couldsee(mon)`**, **`clear_path`** with boulders blocking (**`boulderhandling`** 0 subset).
 * @param {import('./gstate.js').game} g
 * @param {*} mon
 */
export function linedUpMonsterToHeroLikeC(g, mon) {
    const u = g?.u;
    if (!u || !mon) return false;
    const ax = u.ux | 0;
    const ay = u.uy | 0;
    const bx = mon.mx | 0;
    const by = mon.my | 0;
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;
    if (!(!tbx || !tby || Math.abs(tbx) === Math.abs(tby))) return false;
    if (distmin(ax, ay, bx, by) >= BOLT_LIM) return false;
    if (!couldsee(bx, by)) return false;
    return clearPathRayToTargetLikeC(g, ax, ay, bx, by, true);
}

/**
 * C: **`muse.c`** / **`mon.c`** style pick — first dart / arrow / rock in **`minvent`** (subset).
 * @param {*} mon
 * @returns {object|null}
 */
export function pickMonsterMinventThrowableLikeC(mon) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        const t = o.otyp | 0;
        if (t === OBJ_DART || t === OBJ_ARROW || t === OBJ_ROCK) return o;
    }
    return null;
}

/**
 * Shallow missile copy for **`thitu`** / catch (**`obj_extract_self`** not ported).
 * @param {object} src
 */
function shallowMissileFromMinventLikeC(src) {
    return {
        otyp: src.otyp | 0,
        oclass: src.oclass | 0,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: src.owt | 0,
        spe: src.spe | 0,
        blessed: src.blessed | 0,
        cursed: src.cursed | 0,
        opoisoned: src.opoisoned | 0,
        oc_material: src.oc_material | 0,
    };
}

/**
 * C: **`mthrowu.c`** **`m_throw`** at hero — called from **`m_move`** when **`lined_up`** and **`minvent`** has a dart/arrow/rock.
 * @param {import('./gstate.js').game} g
 * @param {*} m
 */
export async function mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, m) {
    if (!m) return;
    if ((m.mpeaceful | 0) !== 0) return;
    if ((m.msleeping | 0) !== 0) return;
    const src = pickMonsterMinventThrowableLikeC(m);
    if (!src) return;
    if (!linedUpMonsterToHeroLikeC(g, m)) return;

    const ref = { o: shallowMissileFromMinventLikeC(src) };
    await mthrowAtHeroUxyThituLikeC(g, m, ref, false);
}
