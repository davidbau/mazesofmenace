// peaceful_displace.js — Hero swaps with a peaceful / tame monster on walk.
// C ref: hack.c domove → displaceum (peaceful swap when not attacking).

import { game } from './gstate.js';
import { snapshotUshops0FromHeroTileLikeC } from './shop.js';
import { pline } from './display.js';
import { tAt } from './search.js';
import { terrainBlocksDisplaceForMon, terrainBlocksDisplaceForHero } from './walkable.js';

function monLabel(mtmp) {
    return mtmp?.monnam || mtmp?.data?.mname || 'the peaceful creature';
}

/** C: mon.c mundisplaceable — shopkeeper, priest, vault guard, Oracle, … */
export function mundisplaceable(mtmp) {
    if (!mtmp) return false;
    const m = /** @type {Record<string, unknown>} */ (mtmp);
    return !!(m.isshk || m.ispriest || m.isgd || m.iswiz || m.isminion);
}

/**
 * C: hack.c displace — `!goodpos` for mon on hero tile and hero on mon tile / trap on either cell / `mundisplaceable` / `mtrapped`.
 * @param {{ mtrapped?: number }} mtmp
 * @param {number} heroX
 * @param {number} heroY
 * @param {number} monX
 * @param {number} monY
 */
export function canPeacefullyDisplace(mtmp, heroX, heroY, monX, monY) {
    if (!mtmp) return false;
    if ((mtmp.mtrapped | 0) !== 0) return false;
    if (mundisplaceable(mtmp)) return false;
    if (tAt(heroX, heroY)) return false;
    if (tAt(monX, monY)) return false;
    if (terrainBlocksDisplaceForMon(mtmp, heroX, heroY)) return false;
    if (terrainBlocksDisplaceForHero(monX, monY)) return false;
    return true;
}

/**
 * If `mtmp` is peaceful and displacement is allowed, swap with hero and pline success.
 * Otherwise pline refusal (C: "doesn't want to swap") and leave positions unchanged.
 * @returns {{ swapped: boolean }}
 */
export async function tryPeacefulSwap(mtmp, heroX, heroY, monX, monY) {
    if (!(mtmp.mpeaceful | 0)) return { swapped: false };
    const who = monLabel(mtmp);
    if (!canPeacefullyDisplace(mtmp, heroX, heroY, monX, monY)) {
        await pline(`You stop. ${who} doesn't want to swap places.`);
        return { swapped: false };
    }
    const u = game.u;
    snapshotUshops0FromHeroTileLikeC(game);
    mtmp.mx = heroX;
    mtmp.my = heroY;
    u.ux = monX;
    u.uy = monY;
    await pline(`You swap places with ${who}.`);
    return { swapped: true };
}
