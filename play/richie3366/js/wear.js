// wear.js — Side effects of worn equipment.
// C ref: do_wear.c set_wear(), prop.c extrinsic masks (subset: EProtection ring hands);
//        find_ac() after ring removal / setnotworn / set_wear refresh (subset).

import { game } from './gstate.js';
import { OTYP_RIN_PROTECTION, W_RING, W_RINGL, W_RINGR } from './const.js';
import { findAc } from './u_init_find_ac.js';

const _RING_PROT_MASK = W_RINGL | W_RINGR;

/**
 * C: do_wear.c **`Ring_gone`** → **`Ring_off_or_gone(obj, TRUE)`** before **`useup`** (**`zap.c`** **`maybe_destroy_item`**).
 * Omits **`svc.context.takeoff`**, full **`setnotworn`** / **`u.uprops`** / **`monstunseesu_prop`**, and **`Ring_off_or_gone`** per-otyp tail (**`adjust_attrib`**, **`float_down`**, …).
 * Non-ring worn clears: **`setnotwornHeroMinimalLikeC`** (C **`maybe_destroy_item`** **`else`** **`setnotworn`** branch).
 * @param {import('./gstate.js').game} g
 * @param {{ owornmask?: number, otyp?: number }} obj
 */
export function ringGoneHeroLikeC(g, obj) {
    const u = g?.u;
    if (!u || !obj) return;
    const wm = obj.owornmask | 0;
    if (!(wm & W_RING)) return;

    if (obj === u.uleft) u.uleft = null;
    if (obj === u.uright) u.uright = null;
    obj.owornmask = wm & ~W_RING;

    if ((obj.otyp | 0) === OTYP_RIN_PROTECTION) refreshEProtectionFromRings(u);

    g.disp = g.disp || {};
    g.disp.botl = true;
    findAc(g);
}

/**
 * C: do_wear.c **`setnotworn(obj)`** — minimal **`u.*`** slot clear when **`obj`** is destroyed (**`zap.c`** **`maybe_destroy_item`**).
 * Omits **`takeoff_mask`**, **`adj_abon`**, **`float_down`**, **`context.takeoff`**, **`monstunseesu_prop`**, blindfold **`Blindf_off`**, …
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 */
export function setnotwornHeroMinimalLikeC(g, obj) {
    const u = g?.u;
    if (!u || !obj) return;
    const slots = [
        'uarm',
        'uarmc',
        'uarmf',
        'uarmg',
        'uarmh',
        'uarms',
        'uarmu',
        'uamul',
        'uleft',
        'uright',
        'uwep',
        'uswapwep',
        'uarmb',
    ];
    for (let i = 0; i < slots.length; i++) {
        const k = slots[i];
        if (u[k] === obj) u[k] = null;
    }
    obj.owornmask = 0;
    if ((obj.otyp | 0) === OTYP_RIN_PROTECTION) refreshEProtectionFromRings(u);
    g.disp = g.disp || {};
    g.disp.botl = true;
    findAc(g);
}

/**
 * C: prop.c — ring of protection on each hand sets W_RINGL / W_RINGR in EProtection
 * (eat.c gethungry cases 4/12 use this for duplicate +0 protection ring hunger).
 * Other EProtection sources (cloak, …) are not ported; preserve their bits if ever set.
 * @param {*} [u] — defaults to **`game.u`**
 */
export function refreshEProtectionFromRings(u) {
    const uu = u ?? game.u;
    if (!uu) return;
    const base = (uu.EProtection | 0) & ~_RING_PROT_MASK;
    let rings = 0;
    if (uu.uleft && (uu.uleft.otyp | 0) === OTYP_RIN_PROTECTION) rings |= W_RINGL;
    if (uu.uright && (uu.uright.otyp | 0) === OTYP_RIN_PROTECTION) rings |= W_RINGR;
    uu.EProtection = base | rings;
}

/**
 * C: set_wear(obj) — if obj is null, refresh all worn slots; else only that obj.
 * gi.initial_don is mirrored as _wearInitialDon until Blindf_on / Ring_on / … exist.
 */
export function setWear(obj) {
    const g = game;
    g._wearInitialDon = !obj;
    if (!obj) {
        /* When ublindf, uright, uarm, … are real obj pointers, call the *_on helpers. */
    }
    refreshEProtectionFromRings();
    findAc(g);
    g._wearInitialDon = false;
}
