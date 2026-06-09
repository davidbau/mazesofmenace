// ini_inv_adjust_like_c.js — C u_init.c ini_inv() helpers: trquan(), ini_inv_adjust_obj() weapon/tool quan.
// C ref: u_init.c trquan(), ini_inv_adjust_obj() WEAPON_CLASS / TOOL_CLASS branch (~1226–1228).

import { rn2 } from './rng.js';

/**
 * C: u_init.c `trquan(const struct trobj *trop)` — `!trquan_min` → 1, else `min + rn2(max - min + 1)`.
 * @param {number} trquanMin
 * @param {number} trquanMax
 * @returns {number}
 */
export function trquanTrobjLikeC(trquanMin, trquanMax) {
    const min = trquanMin | 0;
    const max = trquanMax | 0;
    if (!min) return 1;
    return min + rn2(max - min + 1);
}

/**
 * C: u_init.c `ini_inv_adjust_obj` — `WEAPON_CLASS` / `TOOL_CLASS` sets `obj->quan = trquan(trop)` and returns TRUE.
 * @param {number} trquanMin
 * @param {number} trquanMax
 * @returns {number} stack quan after adjust
 */
export function iniInvAdjustObjWeaponToolTrquanLikeC(trquanMin, trquanMax) {
    return trquanTrobjLikeC(trquanMin, trquanMax);
}
