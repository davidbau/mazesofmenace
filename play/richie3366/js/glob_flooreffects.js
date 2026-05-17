// glob_flooreffects.js — mkobj.c obj_nexto_xy / obj_meld / pudding_merge_message subset for do.c flooreffects.
// C ref: mkobj.c obj_nexto_xy(), obj_meld(), obj_absorb(), pudding_merge_message(); invent.c mergable() glob branch.

import { floorObjKey, obliterateObjectInLevel } from './floorobj.js';
import { cansee } from './vision.js';
import { pline, newsym } from './display.js';
import { rn2 } from './rng.js';
import { isok, OTYP_GLOB_OF_GREEN_SLIME } from './const.js';

/**
 * C: **`invent.c`** **`mergable(otmp, obj)`** — **`obj->globby`** early **TRUE** branch (**subset**: same **`otyp`**, **`nomerge`**, b/c).
 * @param {object} otmp
 * @param {object} obj
 */
export function mergableGlobFlooreffectsLikeC(otmp, obj) {
    if (!otmp || !obj || otmp === obj) return false;
    if ((otmp.otyp | 0) !== (obj.otyp | 0)) return false;
    if ((otmp.nomerge | 0) || (obj.nomerge | 0)) return false;
    if ((otmp.cursed | 0) !== (obj.cursed | 0) || (otmp.blessed | 0) !== (obj.blessed | 0)) return false;
    if (obj.globby) return true;
    return !!(otmp.globby);
}

export function isGlobbyObjFlooreffectsLikeC(obj) {
    if (!obj) return false;
    if (obj.globby) return true;
    return (obj.otyp | 0) === OTYP_GLOB_OF_GREEN_SLIME;
}

function floorChainHeadAt(g, x, y) {
    return g.level?.floorObjHeads?.get(floorObjKey(x | 0, y | 0)) ?? null;
}

/**
 * C: **`mkobj.c`** **`sobj_at` + `nxtobj`** scan at **`(x,y)`** for **`mergable`** neighbor (**`obj`** may be **`OBJ_FREE`**).
 * @param {import('./gstate.js').game} g
 */
function sobjMergableGlobAt(g, obj, xi, yi) {
    const typ = obj.otyp | 0;
    for (let o = floorChainHeadAt(g, xi, yi); o; o = o.nexthere) {
        if (o !== obj && (o.otyp | 0) === typ && mergableGlobFlooreffectsLikeC(o, obj)) return o;
    }
    return null;
}

/**
 * C: **`mkobj.c`** **`obj_nexto_xy(obj, x, y, recurs)`** — **`recurs`** **FALSE**: same cell only.
 * @param {import('./gstate.js').game} g
 */
export function objNextoXyGlobLikeC(g, obj, x, y, recurs) {
    const xi = x | 0;
    const yi = y | 0;
    const hit = sobjMergableGlobAt(g, obj, xi, yi);
    if (hit || !recurs) return hit;

    const dx = rn2(2) ? -1 : 1;
    const dy = rn2(2) ? -1 : 1;
    const ex = xi - dx;
    const ey = yi - dy;
    for (let dfx = 0; dfx < 3; dfx++) {
        for (let dfy = 0; dfy < 3; dfy++) {
            const fx = ex + dfx * dx;
            const fy = ey + dfy * dy;
            if (!isok(fx, fy) || (fx === xi && fy === yi)) continue;
            const o = objNextoXyGlobLikeC(g, obj, fx, fy, false);
            if (o) return o;
        }
    }
    return null;
}

function globTypenamePluralLikeC(otyp) {
    if ((otyp | 0) === OTYP_GLOB_OF_GREEN_SLIME) return 'globs of green slime';
    return 'globs';
}

function heroBlindLikeC(g) {
    const u = g.u;
    return !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
}

function heroHallucinatingLikeC(g) {
    return !!((g.u?.Hallucination | 0) || (g.u?.timed?.hallucination ?? 0) > 0);
}

/**
 * C: **`mkobj.c`** **`pudding_merge_message`** (**`Soundeffect`** deferred).
 * @param {import('./gstate.js').game} g
 */
export async function puddingMergeMessageLikeC(g, otmp, otmp2) {
    const u = g.u;
    const ox1 = otmp?.ox | 0;
    const oy1 = otmp?.oy | 0;
    const ox2 = otmp2?.ox | 0;
    const oy2 = otmp2?.oy | 0;
    const visible = cansee(ox1, oy1) || cansee(ox2, oy2);
    const onfloor = (otmp?.ox ?? -1) >= 0 || (otmp2?.ox ?? -1) >= 0;
    const inpack = false; /* C **`carried`** — hero **`flooreffects`** drop is **`OBJ_FREE`** */

    if ((!heroBlindLikeC(g) && visible) || inpack) {
        if (heroHallucinatingLikeC(g)) {
            if (onfloor) await pline('You see parts of the floor melting!');
            else if (inpack) await pline('Your pack reaches out and grabs something!');
        } else if (onfloor || inpack) {
            const ux = u?.ux | 0;
            const uy = u?.uy | 0;
            const adj =
                (ox1 !== ux || oy1 !== uy) && (ox2 !== ux || oy2 !== uy);
            const noun = globTypenamePluralLikeC(otmp?.otyp | 0);
            await pline(
                `The ${adj ? 'adjacent ' : ''}${noun} coalesce${inpack ? ' inside your pack' : ''}.`,
            );
        }
    } else {
        await pline('You hear a faint sloshing sound.');
    }
}

/**
 * C: **`mkobj.c`** **`obj_absorb`** — glob **subset** (**`globby_bill_fixup`**, shrink timers, **`rknown`** omitted).
 * @param {import('./gstate.js').game} g
 */
function objAbsorbFreeGlobIntoFloorLikeC(g, floorGlob, freeGlob) {
    if (!floorGlob || !freeGlob || floorGlob === freeGlob) return floorGlob;
    if ((floorGlob.bknown | 0) !== (freeGlob.bknown | 0)) {
        floorGlob.bknown = 0;
        freeGlob.bknown = 0;
    }
    if ((floorGlob.orotten | 0) || (freeGlob.orotten | 0)) floorGlob.orotten = 1;

    const o1wt = floorGlob.oeaten ? floorGlob.oeaten | 0 : floorGlob.owt | 0;
    const o2wt = freeGlob.oeaten ? freeGlob.oeaten | 0 : freeGlob.owt | 0;
    const moves = g.moves | 0;
    const agetmp = Math.trunc(
        ((moves - (floorGlob.age | 0)) * o1wt + (moves - (freeGlob.age | 0)) * o2wt) / Math.max(1, o1wt + o2wt),
    );
    floorGlob.age = moves - agetmp;
    floorGlob.owt = Math.max(1, o1wt + o2wt);
    if ((floorGlob.oeaten | 0) || (freeGlob.oeaten | 0)) floorGlob.oeaten = o1wt + o2wt;
    floorGlob.quan = 1;

    obliterateObjectInLevel(g, freeGlob);
    return floorGlob;
}

/**
 * C: **`mkobj.c`** **`obj_meld`** — **`OBJ_FLOOR` + `OBJ_FREE`** (**`do.c`** **`flooreffects`** else): **`obj_absorb(floor, free)`**.
 */
export function objMeldFloorAndFreeGlobLikeC(g, floorGlob, freeGlob) {
    if (!floorGlob || !freeGlob || floorGlob === freeGlob) return null;
    return objAbsorbFreeGlobIntoFloorLikeC(g, floorGlob, freeGlob);
}

/**
 * C: **`do.c`** **`flooreffects`** glob **`while`**.
 * @returns {Promise<boolean>} **true** if **`dropped`** was merged away (**`!globbyobj`** in C)
 */
export async function flooreffectsGlobMergeChainLikeC(g, dropped, xi, yi) {
    if (!isGlobbyObjFlooreffectsLikeC(dropped)) return false;

    let globbyRef = dropped;
    let anyMerge = false;
    while (globbyRef) {
        const otmp = objNextoXyGlobLikeC(g, globbyRef, xi, yi, true);
        if (!otmp) break;
        anyMerge = true;
        await puddingMergeMessageLikeC(g, globbyRef, otmp);
        objMeldFloorAndFreeGlobLikeC(g, otmp, globbyRef);
        globbyRef = null;
        await newsym(otmp.ox | 0, otmp.oy | 0);
    }
    return anyMerge;
}
