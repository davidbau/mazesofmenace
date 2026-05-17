// objnam_armor_like_c.js — C objnam.c xname/doname ARMOR_CLASS subset (NH5 otyp 90..173).
// C ref: objects.h HELM/CLOAK/SHIELD/GLOVES/BOOTS/ARMOR/DRGN_ARMR; objnam.c xname_flags() ARMOR_CLASS.

import {
    OTYP_ARMOR_FIRST,
    OTYP_ARMOR_LAST,
    OTYP_GRAY_DRAGON_SCALES,
    OTYP_YELLOW_DRAGON_SCALES,
} from './const.js';

/**
 * C: **`OBJ(name, desc)`** — **[`OBJ_DESCR`, `OBJ_NAME`]`** per armor **`otyp`** order (**90..173**).
 * **`NoDes`** rows use the same string twice (**`dn`→`actualn`** in C).
 * @type {readonly [string, string][]}
 */
export const ARMOR_APPEAR_NAME_BY_OTYP_OFFSET = [
    ['leather hat', 'elven leather helm'],
    ['iron skull cap', 'orcish helm'],
    ['hard hat', 'dwarvish iron helm'],
    ['fedora', 'fedora'],
    ['conical hat', 'cornuthaum'],
    ['conical hat', 'dunce cap'],
    ['dented pot', 'dented pot'],
    ['crystal helmet', 'helm of brilliance'],
    ['plumed helmet', 'helmet'],
    ['etched helmet', 'helm of caution'],
    ['crested helmet', 'helm of opposite alignment'],
    ['visored helmet', 'helm of telepathy'],
    ['gray dragon scale mail', 'gray dragon scale mail'],
    ['gold dragon scale mail', 'gold dragon scale mail'],
    ['silver dragon scale mail', 'silver dragon scale mail'],
    ['red dragon scale mail', 'red dragon scale mail'],
    ['white dragon scale mail', 'white dragon scale mail'],
    ['orange dragon scale mail', 'orange dragon scale mail'],
    ['black dragon scale mail', 'black dragon scale mail'],
    ['blue dragon scale mail', 'blue dragon scale mail'],
    ['green dragon scale mail', 'green dragon scale mail'],
    ['yellow dragon scale mail', 'yellow dragon scale mail'],
    ['gray dragon scales', 'gray dragon scales'],
    ['gold dragon scales', 'gold dragon scales'],
    ['silver dragon scales', 'silver dragon scales'],
    ['red dragon scales', 'red dragon scales'],
    ['white dragon scales', 'white dragon scales'],
    ['orange dragon scales', 'orange dragon scales'],
    ['black dragon scales', 'black dragon scales'],
    ['blue dragon scales', 'blue dragon scales'],
    ['green dragon scales', 'green dragon scales'],
    ['yellow dragon scales', 'yellow dragon scales'],
    ['plate mail', 'plate mail'],
    ['crystal plate mail', 'crystal plate mail'],
    ['bronze plate mail', 'bronze plate mail'],
    ['splint mail', 'splint mail'],
    ['banded mail', 'banded mail'],
    ['dwarvish mithril-coat', 'dwarvish mithril-coat'],
    ['elven mithril-coat', 'elven mithril-coat'],
    ['chain mail', 'chain mail'],
    ['crude chain mail', 'orcish chain mail'],
    ['scale mail', 'scale mail'],
    ['studded leather armor', 'studded leather armor'],
    ['ring mail', 'ring mail'],
    ['crude ring mail', 'orcish ring mail'],
    ['leather armor', 'leather armor'],
    ['leather jacket', 'leather jacket'],
    ['Hawaiian shirt', 'Hawaiian shirt'],
    ['T-shirt', 'T-shirt'],
    ['mummy wrapping', 'mummy wrapping'],
    ['faded pall', 'elven cloak'],
    ['coarse mantelet', 'orcish cloak'],
    ['hooded cloak', 'dwarvish cloak'],
    ['slippery cloak', 'oilskin cloak'],
    ['robe', 'robe'],
    ['apron', 'alchemy smock'],
    ['leather cloak', 'leather cloak'],
    ['tattered cape', 'cloak of protection'],
    ['opera cloak', 'cloak of invisibility'],
    ['ornamental cope', 'cloak of magic resistance'],
    ['piece of cloth', 'cloak of displacement'],
    ['wooden shield', 'small shield'],
    ['wooden shield', 'shield of drain resistance'],
    ['wooden shield', 'shield of shock resistance'],
    ['blue and green shield', 'elven shield'],
    ['white-handed shield', 'Uruk-hai shield'],
    ['red-eyed shield', 'orcish shield'],
    ['large shield', 'large shield'],
    ['large round shield', 'dwarvish roundshield'],
    ['polished silver shield', 'shield of reflection'],
    ['old gloves', 'leather gloves'],
    ['padded gloves', 'gauntlets of fumbling'],
    ['riding gloves', 'gauntlets of power'],
    ['fencing gloves', 'gauntlets of dexterity'],
    ['walking shoes', 'low boots'],
    ['hard shoes', 'iron shoes'],
    ['jackboots', 'high boots'],
    ['combat boots', 'speed boots'],
    ['jungle boots', 'water walking boots'],
    ['hiking boots', 'jumping boots'],
    ['mud boots', 'elven boots'],
    ['buckled boots', 'kicking boots'],
    ['riding boots', 'fumble boots'],
    ['snow boots', 'levitation boots'],
];

/** @param {number} otyp */
function armorRowIndex(otyp) {
    const t = otyp | 0;
    if (t < OTYP_ARMOR_FIRST || t > OTYP_ARMOR_LAST) return -1;
    return t - OTYP_ARMOR_FIRST;
}

/** @param {number} otyp */
export function isArmorOtypLikeC(otyp) {
    return armorRowIndex(otyp) >= 0;
}

/** C: objnam.c **`is_gloves`**. */
function isGlovesOtypLikeC(otyp) {
    const t = otyp | 0;
    return t >= 160 && t <= 163;
}

/** C: objnam.c **`is_boots`**. */
function isBootsOtypLikeC(otyp) {
    const t = otyp | 0;
    return t >= 164 && t <= 173;
}

/** C: shield branch when **`is_shield` && !`dknown`**. */
function shieldUnknownPhraseLikeC(otyp) {
    const t = otyp | 0;
    if (t >= 154 && t <= 156) return 'shield';
    if (t === 159) return 'smooth shield';
    return null;
}

/** Minimal plural tail for armor **`doname`** quan **> 1** (C **`makeplural`** subset). */
function pluralArmorTailLikeC(s) {
    if (!s) return s;
    if (s === 'shield') return 'shields';
    if (s === 'smooth shield') return 'smooth shields';
    if (/\bglass$/i.test(s)) return s.replace(/\bglass$/i, 'glasses');
    if (s.endsWith(' mail')) return `${s}s`;
    if (s.endsWith(' scales')) return s; /* e.g. gray dragon scales */
    if (s.endsWith(' boots') || s.endsWith(' shoes')) return s;
    if (s.endsWith(' gloves')) return s;
    if (s === 'mummy wrapping') return 'mummy wrappings';
    if (s.endsWith(' shield')) return `${s.replace(/ shield$/, '')} shields`;
    if (s.endsWith(' cloak')) return `${s.replace(/ cloak$/, '')} cloaks`;
    if (s.endsWith(' hat')) return `${s.replace(/ hat$/, '')} hats`;
    if (s.endsWith(' cap')) return `${s.replace(/ cap$/, '')} caps`;
    if (s.endsWith(' pot')) return `${s.replace(/ pot$/, '')} pots`;
    if (s.endsWith(' helm')) return `${s.replace(/ helm$/, '')} helms`;
    if (s.endsWith(' jacket')) return `${s.replace(/ jacket$/, '')} jackets`;
    if (s.endsWith(' shirt')) return `${s.replace(/ shirt$/, '')} shirts`;
    if (s.endsWith(' smock')) return `${s.replace(/ smock$/, '')} smocks`;
    if (s.endsWith(' robe')) return `${s.replace(/ robe$/, '')} robes`;
    if (s.endsWith(' coat')) return `${s.replace(/ coat$/, '')} coats`;
    if (s.endsWith(' armor')) return `${s.replace(/ armor$/, '')} armors`;
    if (s.endsWith(' wrapping')) return s;
    return `${s}s`;
}

/**
 * C: **`xname_flags`** armor core — phrase **without** leading article (**`quan`** 1).
 * @param {{ otyp?: number, dknown?: number }} otmp
 * @param {object|null|undefined} g
 * @param {boolean} overrideId — C **`iflags.override_ID`** (**`oc_name_known`** forced).
 */
export function xnameArmorPhraseNoArticleLikeC(otmp, g, overrideId) {
    const t = otmp.otyp | 0;
    const ix = armorRowIndex(t);
    if (ix < 0) return null;
    const [appe, name] = ARMOR_APPEAR_NAME_BY_OTYP_OFFSET[ix];
    const dknown = !!(overrideId || (otmp.dknown | 0));
    const known = !!(
        overrideId ||
        (g && g.armorDiscovery instanceof Set && g.armorDiscovery.has(t))
    );
    if (!dknown) {
        const sh = shieldUnknownPhraseLikeC(t);
        if (sh) return sh;
    }
    const inner = known ? name : appe;
    if (t >= OTYP_GRAY_DRAGON_SCALES && t <= OTYP_YELLOW_DRAGON_SCALES)
        return `set of ${inner}`;
    if (isGlovesOtypLikeC(t) || isBootsOtypLikeC(t)) return `pair of ${inner}`;
    return inner;
}

/**
 * C: **`doname`** / **`minimal_xname`** via **`distant_name`(…, **`xname`)** — article + optional quan.
 * @param {{ otyp?: number, quan?: number, dknown?: number }} otmp
 * @param {object|null|undefined} g
 * @param {number} q
 * @param {boolean} overrideId
 * @param {(s: string) => string} justArticlePrefix
 * @returns {string|null}
 */
export function donameArmorLikeC(otmp, g, q, overrideId, justArticlePrefix) {
    const t = otmp.otyp | 0;
    if (armorRowIndex(t) < 0) return null;
    const phrase = xnameArmorPhraseNoArticleLikeC(otmp, g, overrideId);
    if (phrase == null) return null;
    const iq = Math.max(1, q | 0);
    if (iq === 1) {
        const art = justArticlePrefix(phrase);
        return `${art}${phrase}`;
    }
    if (phrase.startsWith('pair of ')) {
        const rest = phrase.slice(7);
        return `${iq} pairs of ${rest}`;
    }
    if (phrase.startsWith('set of ')) {
        const rest = phrase.slice(6);
        return `${iq} sets of ${rest}`;
    }
    return `${iq} ${pluralArmorTailLikeC(phrase)}`;
}

/**
 * C: **`makeplural`** subset for **`burn_floor_objects`** when **`xnameBurnFloor`** returned armor.
 * @param {string} s
 * @returns {string|null} plural form, or **`null`** if not a known armor **`xname`** phrase.
 */
export function tryMakePluralArmorBurnLikeC(s) {
    if (s === 'shield' || s === 'smooth shield') return pluralArmorTailLikeC(s);
    for (const [a, n] of ARMOR_APPEAR_NAME_BY_OTYP_OFFSET) {
        if (
            s === a ||
            s === n ||
            s === `set of ${a}` ||
            s === `set of ${n}` ||
            s === `pair of ${a}` ||
            s === `pair of ${n}`
        )
            return s.startsWith('set of ')
                ? `sets of ${s.slice(6)}`
                : s.startsWith('pair of ')
                  ? `pairs of ${s.slice(7)}`
                  : pluralArmorTailLikeC(s);
    }
    return null;
}

/**
 * C: **`o_init.c`** **`objects[].oc_name_known`** mirror for armor type ID (**`#name`** TODO).
 * @param {import('./gstate.js').game} g
 * @param {number} otyp
 */
export function discoverArmorOtypHeroLikeC(g, otyp) {
    if (!g) return;
    const t = otyp | 0;
    if (!(g.armorDiscovery instanceof Set)) g.armorDiscovery = new Set();
    g.armorDiscovery.add(t);
}
