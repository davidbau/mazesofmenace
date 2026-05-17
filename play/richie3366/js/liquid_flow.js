// liquid_flow.js — dig.c liquid_flow() subset (fillholetyp → terrain + floor effects).
// C ref: dig.c liquid_flow(); do_name.c hliquid() non-hallucination returns **`liquidpref`** as-is.

import { pline, newsym } from './display.js';
import { vision_recalc } from './vision.js';
import { delTrap } from './search.js';
import { unearthBuriedChainAt, floorObjKey } from './floorobj.js';
import { delEngrAt } from './engrave.js';
import { LAVAPOOL } from './const.js';
import { fireDamageChain } from './fire_damage.js';
import { waterDamageChain } from './water_damage.js';
import { objIceEffectsDigLiquidFlowLikeC, minliquidMonsterAtCellLikeC } from './melt_ice.js';
import { pooleffectsNewspotLikeC } from './spoteffects.js';
import { isPoolOrLavaCellLikeC } from './fillholetyp.js';

/** C: do_name.c **`hliquid`** when not hallucinating — return **`liquidpref`**. */
function hliquidLikeC(liquidpref) {
    return liquidpref || 'water';
}

function isPoolOrLavaAt(g, x, y) {
    return isPoolOrLavaCellLikeC(g, x | 0, y | 0);
}

function floorObjChainHead(g, x, y) {
    return g.level?.floorObjHeads?.get(floorObjKey(x | 0, y | 0)) ?? null;
}

/**
 * C: dig.c **`liquid_flow(x, y, typ, ttmp, fillmsg)`** — caller has set **`levl[x][y].typ`** to liquid.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} typ — **`POOL`/`MOAT`/`LAVAPOOL`**
 * @param {object|null} ttmp — trap at **`(x,y)`** to remove (**`delfloortrap`**)
 * @param {string|null} fillmsg — printf-style with one **`%s`** for liquid name
 */
export async function liquidFlowHeroDigLikeC(g, x, y, typ, ttmp, fillmsg) {
    const xi = x | 0;
    const yi = y | 0;
    if (!isPoolOrLavaAt(g, xi, yi)) return;

    if (ttmp) delTrap(ttmp);

    objIceEffectsDigLiquidFlowLikeC(g, xi, yi);
    unearthBuriedChainAt(g, xi, yi);
    delEngrAt(xi, yi);

    if (fillmsg) {
        const liq = hliquidLikeC(typ === LAVAPOOL ? 'lava' : 'water');
        await pline(fillmsg.replace('%s', liq));
    }

    const objchain = floorObjChainHead(g, xi, yi);
    if (objchain) {
        if (typ === LAVAPOOL) await fireDamageChain(objchain, true, true, xi, yi, g, null);
        else await waterDamageChain(objchain, true, g, null);
    }

    const u = g.u;
    if (u && (u.ux | 0) === xi && (u.uy | 0) === yi) {
        await pooleffectsNewspotLikeC(g, false, { fromDx: u.dx | 0, fromDy: u.dy | 0 });
    } else {
        const mtmp = g.level?.monsters?.find((m) => (m.mx | 0) === xi && (m.my | 0) === yi);
        if (mtmp) await minliquidMonsterAtCellLikeC(g, mtmp);
    }

    newsym(xi, yi);
    vision_recalc(1);
}
