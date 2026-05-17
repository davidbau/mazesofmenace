// remove_worn_item_hero.js — steal.c remove_worn_item() subset for migrating objects.
// C ref: steal.c remove_worn_item(); dokick.c ship_object() calls it before breaktest/add_to_migration.

import { refreshEProtectionFromRings } from './wear.js';
import { findAc } from './u_init_find_ac.js';

/**
 * C: **`steal.c`** **`remove_worn_item(obj, unchain_ball)`** — clear **`u.*`** slots that
 * reference **`obj`**, then **`obj.owornmask = 0`**.
 * Omits **`donning`/`cancel_don`**, **`in_use`**, **`Armor_off`** and **`Ring_gone`** side effects,
 * **`unpunish`** (**`W_BALL`/`W_CHAIN`** with **`unchain_ball`**) until punishment is fully ported.
 * @param {import('./gstate.js').game} g
 * @param {*} obj
 * @param {boolean} _unchainBall — C **`unchain_ball`** (**`unpunish`**); reserved
 */
export function removeWornItemHeroShipObjectLikeC(g, obj, _unchainBall) {
    void _unchainBall;
    const u = g?.u;
    if (!u || !obj) return;
    if (!(obj.owornmask | 0)) return;

    if (obj === u.uwep) u.uwep = null;
    if (obj === u.uswapwep) u.uswapwep = null;
    if (obj === u.uquiver) u.uquiver = null;
    if (obj === u.uarm) u.uarm = null;
    if (obj === u.uarmc) u.uarmc = null;
    if (obj === u.uarmf) u.uarmf = null;
    if (obj === u.uarmg) u.uarmg = null;
    if (obj === u.uarmh) u.uarmh = null;
    if (obj === u.uarms) u.uarms = null;
    if (obj === u.uarmu) u.uarmu = null;
    if (obj === u.uamul) u.uamul = null;
    if (obj === u.uleft) u.uleft = null;
    if (obj === u.uright) u.uright = null;
    if (obj === u.ublindf) u.ublindf = null;

    obj.owornmask = 0;
    refreshEProtectionFromRings(u);
    findAc(g);
}
