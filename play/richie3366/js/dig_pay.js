// dig_pay.js — dig.c shop billing tail after add_damage (dighole / zap dig paths).
// C ref: dig.c pay_for_damage(shopdoor ? "destroy" : "dig into", FALSE) after hero
//        shop wall/door dig; callers must have merged damagelist via shk.c add_damage.
//        dig.c dig() shop wall/door: **`add_damage`** then **`pay_for_damage("damage"|"break", FALSE)`**;
//        hack.h **`SHOP_WALL_DMG`**.

import { payForDamage } from './shop.js';
import { acurrstrLikeC } from './attr_acurr_like_c.js';

/**
 * C: hack.h **`SHOP_WALL_DMG`** — **`10L * ACURRSTR`** (hero hand-dig through shop wall).
 * @param {import('./gstate.js').game} g
 */
export function shopWallHandDigDamageCostLikeC(g) {
    return 10 * (acurrstrLikeC(g) | 0);
}

/**
 * C: dig.c **`dig()`** — caller has **`add_damage(dpx,dpy, SHOP_WALL_DMG)`** when shop wall cut.
 * @param {import('./gstate.js').game} g
 */
export async function payAfterHeroHandDigShopWallDamageLikeC(g) {
    await payForDamage(g, 'damage', false);
}

/**
 * C: dig.c **`dig()`** — caller has **`add_damage(dpx,dpy, SHOP_DOOR_COST)`** when shop door broken.
 * @param {import('./gstate.js').game} g
 */
export async function payAfterHeroHandDigShopDoorBreakLikeC(g) {
    await payForDamage(g, 'break', false);
}

/**
 * C: dig.c — after **`add_damage`** for shop wall/door, **`pay_for_damage`** once per dig.
 * @param {import('./gstate.js').game} g
 * @param {boolean} shopdoor
 * @param {boolean} shopwall
 */
export async function payAfterHeroDigShopHoleLikeC(g, shopdoor, shopwall) {
    if (!shopdoor && !shopwall) return;
    await payForDamage(g, shopdoor ? 'destroy' : 'dig into', false);
}
