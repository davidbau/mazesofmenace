// hero_hands.js — Hero hand checks: pickup.c u_handsy; engrave.c freehand; wield.c welded/will_weld; mondata.h nohands.
// C ref: pickup.c u_handsy(); engrave.c freehand(); wield.c welded()/will_weld/erodeable_wep; mondata.h nohands(ptr); obj.h is_weptool.

import { pline } from './display.js';
import { raceptr } from './mondata.js';
import { bimanual, weaponType } from './weapon_kind.js';
import { NH5_TOOL_CLASS, NH5_WEAPON_CLASS } from './nh5_objclass.js';
import { OTYP_HEAVY_IRON_BALL, OTYP_IRON_CHAIN, P_NONE } from './const.js';

/** C: monflag.h `M1_NOHANDS`. */
const M1_NOHANDS = 0x00002000;
/** C: objects.h `TIN_OPENER` otyp (NH5 tool). */
const OTYP_TIN_OPENER = 240;

/**
 * C: mondata.h **`nohands(ptr)`** — **`M1_NOHANDS`**.
 * @param {import('./mondata.js').Permonst|null|undefined} ptr
 */
export function nohandsPermonstLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_NOHANDS) !== 0;
}

/**
 * C: obj.h **`is_weptool(o)`** — tool with non-**`P_NONE`** weapon skill (towel excluded).
 * @param {{ oclass?: number, otyp?: number }|null|undefined} obj
 */
export function isWeptoolObjLikeC(obj) {
    if (!obj) return false;
    if ((obj.oclass | 0) !== NH5_TOOL_CLASS) return false;
    return weaponType(obj) !== P_NONE;
}

/**
 * C: wield.c **`erodeable_wep(optr)`** (minus full **`is_weptool`** table parity).
 * @param {{ oclass?: number, otyp?: number }|null|undefined} obj
 */
function erodeableWeaponWeldLikeC(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    const ot = obj.otyp | 0;
    if (oc === NH5_WEAPON_CLASS) return true;
    if (isWeptoolObjLikeC(obj)) return true;
    if (ot === OTYP_HEAVY_IRON_BALL || ot === OTYP_IRON_CHAIN) return true;
    return false;
}

/**
 * C: wield.c **`will_weld(optr)`**.
 * @param {{ cursed?: number, oclass?: number, otyp?: number }|null|undefined} obj
 */
function willWeldObjLikeC(obj) {
    if (!obj || !(obj.cursed | 0)) return false;
    const ot = obj.otyp | 0;
    return erodeableWeaponWeldLikeC(obj) || ot === OTYP_TIN_OPENER;
}

/**
 * C: wield.c **`welded(obj)`** — **`obj == uwep`** && **`will_weld`**; **`set_bknown(obj, 1)`**.
 * @param {import('./gstate.js').game} g
 * @param {object|null|undefined} obj
 */
export function weldedUwepLikeC(g, obj) {
    const u = g?.u;
    if (!obj || !u || obj !== u.uwep) return false;
    if (!willWeldObjLikeC(obj)) return false;
    obj.bknown = 1;
    return true;
}

/**
 * C: engrave.c **`freehand()`** — **`!uwep || !welded(uwep) || (!bimanual(uwep) && (!uarms || !uarms->cursed))`**.
 * @param {import('./gstate.js').game} g
 */
export function freehandHeroLikeC(g) {
    const uwep = g?.u?.uwep;
    if (!uwep) return true;
    if (!weldedUwepLikeC(g, uwep)) return true;
    const uarms = g.u?.uarms;
    return !bimanual(uwep) && (!uarms || !(uarms.cursed | 0));
}

/**
 * C: pickup.c **`u_handsy()`** — **`nohands`** then **`freehand`** (**`You()`** messages).
 * @param {import('./gstate.js').game} g
 */
export async function uHandsyHeroLikeC(g) {
    const ptr = raceptr(g?.youmonst);
    if (nohandsPermonstLikeC(ptr)) {
        await pline('You have no hands!');
        return false;
    }
    if (!freehandHeroLikeC(g)) {
        await pline('You have no free hand.');
        return false;
    }
    return true;
}
