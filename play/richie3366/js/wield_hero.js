// wield_hero.js — C wield.c doswapweapon / ready_weapon subset.
// C ref: wield.c doswapweapon, ready_weapon prinv before setuwep.

import { W_WEP } from './const.js';
import { prinvLikeC } from './invent_prinv.js';

/**
 * C: wield.c doswapweapon + ready_weapon — fireassist swap uwep↔uswapwep; prinv new uwep.
 * @param {import('./gstate.js').game} g
 * @returns {boolean} true when swap + prinv ran
 */
export async function doswapweaponFireassistLikeC(g) {
    const u = g.u;
    if (!u?.uswapwep) return false;
    const oldwep = u.uwep;
    const oldswap = u.uswapwep;
    u.uwep = oldswap;
    u.uswapwep = oldwep;
    await prinvLikeC('', u.uwep, g, { wornMask: W_WEP, dot: true });
    return true;
}
