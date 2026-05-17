// weapon_kind.js — weapon_type() / is_ammo() / ammo_and_launcher() helpers.
// C ref: weapon.c weapon_type(); include/obj.h is_ammo, matching_launcher, ammo_and_launcher, uslinging.

import {
    P_NONE,
    P_SLING,
    P_BARE_HANDED_COMBAT,
    P_BOW,
    P_CROSSBOW,
    P_PICK_AXE,
} from './const.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
import { NH5_WEAPON_CLASS, NH5_TOOL_CLASS, NH5_GEM_CLASS } from './nh5_objclass.js';

/** C: objects_nums **`SLING`** — sparse **`OC_SKILL_ROW_BY_OTYP`** may omit the bow block. */
const OTYP_SLING = 87;

/** @param {number} otyp */
function objectOcSkill(otyp) {
    return OC_SKILL_ROW_BY_OTYP.get(otyp | 0)?.oc_skill ?? 0;
}

/**
 * C: obj.h **`matching_launcher(a,l)`** — **`objects[a].oc_skill == -objects[l].oc_skill`**.
 * @param {{ otyp?: number, oclass?: number }|null|undefined} ammo
 * @param {{ otyp?: number, oclass?: number }|null|undefined} launcher
 */
export function matchingLauncherLikeC(ammo, launcher) {
    if (!ammo || !launcher) return false;
    const ask = objectOcSkill(ammo.otyp | 0);
    const lsk = objectOcSkill(launcher.otyp | 0);
    return ask === -lsk;
}

/**
 * C: obj.h **`ammo_and_launcher(a,l)`** — **`is_ammo(a) && matching_launcher(a,l)`**.
 */
export function ammoAndLauncherLikeC(ammo, launcher) {
    return isAmmo(ammo) && matchingLauncherLikeC(ammo, launcher);
}

/**
 * C: weapon_type(struct obj *obj)
 * @param {{ otyp?: number, oclass?: number }|null|undefined} obj
 * @returns {number}
 */
export function weaponType(obj) {
    if (!obj) return P_BARE_HANDED_COMBAT;
    const oc = obj.oclass | 0;
    if (oc !== NH5_WEAPON_CLASS && oc !== NH5_TOOL_CLASS && oc !== NH5_GEM_CLASS) return P_NONE;
    const type = objectOcSkill(obj.otyp | 0);
    return type < 0 ? -type : type;
}

/**
 * C: obj.h **`is_pick(otmp)`** — **`WEAPON`/`TOOL`** with **`oc_skill == P_PICK_AXE`**.
 * @param {{ otyp?: number, oclass?: number }|null|undefined} obj
 */
export function isPickLikeC(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== NH5_WEAPON_CLASS && oc !== NH5_TOOL_CLASS) return false;
    return weaponType(obj) === P_PICK_AXE;
}

/**
 * C: is_ammo(otmp) — include/obj.h
 * @param {{ otyp?: number, oclass?: number }|null|undefined} obj
 * @returns {boolean}
 */
export function isAmmo(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== NH5_WEAPON_CLASS && oc !== NH5_GEM_CLASS) return false;
    const sk = objectOcSkill(obj.otyp | 0);
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

/**
 * C: include/obj.h **`uslinging()`** — **`uwep`** && **`objects[uwep->otyp].oc_skill == P_SLING`**.
 * @param {import('./gstate.js').game} g
 * @returns {boolean}
 */
export function uslingingHeroLikeC(g) {
    const w = g?.u?.uwep;
    if (!w) return false;
    const oc = w.oclass | 0;
    if (oc !== NH5_WEAPON_CLASS && oc !== NH5_TOOL_CLASS) return false;
    const sk = OC_SKILL_ROW_BY_OTYP.get(w.otyp | 0)?.oc_skill;
    if (sk !== undefined) return sk === P_SLING;
    return (w.otyp | 0) === OTYP_SLING;
}

/**
 * C: wield.c bimanual(obj) — two-handed wield; stub **false** until **`objects[]`** **`oc_bimanual`** port.
 * @param {{ otyp?: number }|null|undefined} obj
 * @returns {boolean}
 */
export function bimanual(obj) {
    void obj;
    return false;
}
