// dodiscovered.js — C o_init.c dodiscovered / knows_class / knows_object / obj_typename (overlay subset).
// C ref: o_init.c dodiscovered, interesting_to_discover, u_init.c knows_class/knows_object;
//        objnam.c obj_typename; options.c def_inv_order.

import { objectDescrAtOtypLikeC } from './o_init.js';
import {
    O_INIT_NUM_OBJECTS,
    O_INIT_OCLASS_BASES,
    O_INIT_OC_CLASS,
    O_INIT_OC_MAGIC,
    O_INIT_OC_NAME,
} from './o_init_objects_meta.js';
import {
    NH5_AMULET_CLASS,
    NH5_ARMOR_CLASS,
    NH5_BALL_CLASS,
    NH5_CHAIN_CLASS,
    NH5_COIN_CLASS,
    NH5_FOOD_CLASS,
    NH5_GEM_CLASS,
    NH5_POTION_CLASS,
    NH5_RING_CLASS,
    NH5_ROCK_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_TOOL_CLASS,
    NH5_WAND_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';
import { isAmmo, isLauncherLikeC, isPoleLikeC, isSpearLikeC, weaponType } from './weapon_kind.js';
import { P_DAGGER } from './const.js';
import { discoverObjectHeroLikeC } from './objnam.js';

/** C: options.c def_inv_order (COIN first; VENOM appended in dodiscovered when absent). */
const DEFAULT_INV_ORDER = [
    NH5_COIN_CLASS,
    NH5_AMULET_CLASS,
    NH5_WEAPON_CLASS,
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_POTION_CLASS,
    NH5_RING_CLASS,
    NH5_WAND_CLASS,
    NH5_TOOL_CLASS,
    NH5_GEM_CLASS,
    NH5_ROCK_CLASS,
    NH5_BALL_CLASS,
    NH5_CHAIN_CLASS,
];

/** C: let_to_name(oclass, FALSE, FALSE) menu headings. */
const OCLASS_TITLE = {
    [NH5_WEAPON_CLASS]: 'Weapons',
    [NH5_ARMOR_CLASS]: 'Armor',
    [NH5_FOOD_CLASS]: 'Comestibles',
    [NH5_POTION_CLASS]: 'Potions',
    [NH5_SCROLL_CLASS]: 'Scrolls',
    [NH5_SPBOOK_CLASS]: 'Spellbooks',
    [NH5_RING_CLASS]: 'Rings',
    [NH5_WAND_CLASS]: 'Wands',
    [NH5_TOOL_CLASS]: 'Tools',
    [NH5_GEM_CLASS]: 'Gems',
    [NH5_ROCK_CLASS]: 'Rocks',
    [NH5_BALL_CLASS]: 'Iron balls',
    [NH5_CHAIN_CLASS]: 'Chains',
    [NH5_AMULET_CLASS]: 'Amulets',
    [NH5_COIN_CLASS]: 'Gold',
};

/** @param {import('./gstate.js').game} g */
function objectNameKnownLikeC(g, otyp) {
    return g.objectNameKnownOtyps instanceof Set && g.objectNameKnownOtyps.has(otyp | 0);
}

/** @param {import('./gstate.js').game} g @param {number} otyp */
function objectEncounteredLikeC(g, otyp) {
    return g.objectEncountered instanceof Set && g.objectEncountered.has(otyp | 0);
}

/**
 * C: o_init.c **`interesting_to_discover(i)`** — Samurai Japanese names omitted.
 * @param {import('./gstate.js').game} g
 * @param {number} otyp
 */
export function interestingToDiscoverLikeC(g, otyp) {
    const t = otyp | 0;
    const dn = objectDescrAtOtypLikeC(t);
    const hasDescr = dn != null && dn !== '';
    const known = objectNameKnownLikeC(g, t);
    const enc = objectEncounteredLikeC(g, t);
    return (known || enc) && hasDescr;
}

/**
 * C: objnam.c **`obj_typename(otyp)`** — default/armor branch when name known.
 * Omits Samurai **`Japanese_item_name`**, gem stone suffix edge cases, xcalled uname.
 * @param {import('./gstate.js').game} g
 * @param {number} otyp
 */
export function objTypenameLikeC(g, otyp) {
    const t = otyp | 0;
    const oclass = O_INIT_OC_CLASS[t] | 0;
    const actualn = O_INIT_OC_NAME[t];
    const dn = objectDescrAtOtypLikeC(t);
    const nn = objectNameKnownLikeC(g, t);

    if (oclass === NH5_COIN_CLASS) return actualn || 'gold piece';

    if (oclass === NH5_POTION_CLASS) {
        let buf = 'potion';
        if (nn && actualn) buf += ` of ${actualn}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    }
    if (oclass === NH5_SCROLL_CLASS) {
        let buf = 'scroll';
        if (nn && actualn) buf += ` of ${actualn}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    }
    if (oclass === NH5_WAND_CLASS) {
        let buf = 'wand';
        if (nn && actualn) buf += ` of ${actualn}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    }
    if (oclass === NH5_RING_CLASS) {
        let buf = 'ring';
        if (nn && actualn) buf += ` of ${actualn}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    }
    if (oclass === NH5_AMULET_CLASS) {
        if (nn && actualn) {
            let buf = actualn;
            if (dn) buf += ` (${dn})`;
            return buf;
        }
        return dn ? `amulet (${dn})` : 'amulet';
    }

    if (nn && actualn) {
        let buf = actualn;
        if (dn) buf += ` (${dn})`;
        return buf;
    }
    return dn || actualn || 'object?';
}

/**
 * C: u_init.c **`knows_object(obj, override_pauper)`** — discover without encounter.
 * @param {import('./gstate.js').game} g
 * @param {number} otyp
 * @param {boolean} [overridePauper]
 */
export function knowsObjectLikeC(g, otyp, overridePauper = false) {
    if (g.u?.uroleplay?.pauper && !overridePauper) return;
    discoverObjectHeroLikeC(g, otyp | 0, true, false, false);
}

/**
 * C: u_init.c **`knows_class(sym)`** — non-magic objects per role filters.
 * @param {import('./gstate.js').game} g
 * @param {number} sym — objclass index
 */
export function knowsClassLikeC(g, sym) {
    if (g.u?.uroleplay?.pauper) return;
    const oclass = sym | 0;
    const lo = O_INIT_OCLASS_BASES[oclass] | 0;
    const hi = O_INIT_OCLASS_BASES[oclass + 1] | 0;
    const abbr = g.urole?.abbr;
    const odummy = { oclass, otyp: 0 };

    for (let ct = lo; ct < hi && ct < O_INIT_NUM_OBJECTS; ct++) {
        if ((O_INIT_OC_CLASS[ct] | 0) !== oclass) continue;
        if ((O_INIT_OC_MAGIC[ct] | 0) !== 0) continue;
        odummy.otyp = ct;

        if (oclass === NH5_WEAPON_CLASS) {
            if (abbr !== 'Kni' && abbr !== 'Sam' && isPoleLikeC(odummy)) continue;
            if (abbr === 'Ran' && !isLauncherLikeC(odummy) && !isAmmo(odummy) && !isSpearLikeC(odummy)) {
                continue;
            }
            if (abbr === 'Rog' && weaponType(odummy) !== P_DAGGER) continue;
        }

        knowsObjectLikeC(g, ct, false);
    }
}

/**
 * C: o_init.c **`dodiscovered`** — default sort (`flags.discosort == 'o'`), no relics/artifacts.
 * @param {import('./gstate.js').game} g
 * @returns {Array<{ title: string, lines: string[] }>}
 */
export function dodiscoveredGroupsLikeC(g) {
    /** @type {Array<{ title: string, lines: string[] }>} */
    const groups = [];
    const slots = g.discoSlots;
    if (!slots) return groups;

    for (const oclass of DEFAULT_INV_ORDER) {
        const lo = O_INIT_OCLASS_BASES[oclass] | 0;
        const hi = O_INIT_OCLASS_BASES[oclass + 1] | 0;
        /** @type {string[]} */
        const lines = [];
        for (let i = lo; i < hi && i < O_INIT_NUM_OBJECTS; i++) {
            if ((O_INIT_OC_CLASS[i] | 0) !== oclass) continue;
            const dis = slots[i] | 0;
            if (!dis || !interestingToDiscoverLikeC(g, dis)) continue;
            const prefix = objectEncounteredLikeC(g, dis) ? '  ' : '* ';
            lines.push(`${prefix}${objTypenameLikeC(g, dis)}`);
        }
        if (lines.length) {
            groups.push({ title: OCLASS_TITLE[oclass] || 'Objects', lines });
        }
    }
    return groups;
}
