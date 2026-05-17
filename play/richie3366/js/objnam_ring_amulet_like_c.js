// objnam_ring_amulet_like_c.js — C objnam.c xname/doname RING_CLASS + AMULET_CLASS (NH5 otyp).
// C ref: objects.h RING()/AMULET(); objnam.c xname_flags() RING_CLASS, AMULET_CLASS.
// Ring otyp order matches **`RING_CLASS_MKOBJ_ROWS`** (frozen **`mkobj_wizard_ini_inv_data.js`**).

import { OTYP_AMULET_OF_YENDOR, OTYP_FAKE_AMULET_OF_YENDOR } from './const.js';
import { RING_CLASS_MKOBJ_ROWS } from './mkobj_wizard_ini_inv_data.js';
import { NH5_AMULET_CLASS, NH5_ARMOR_CLASS, NH5_RING_CLASS } from './nh5_objclass.js';
import { isArmorOtypLikeC } from './objnam_armor_like_c.js';

/**
 * C: **`RING(name, stone, …)`** — **[`stone` appearance, `name` effect]** in **`RING_CLASS_MKOBJ_ROWS`** order.
 * @type {readonly (readonly [string, string])[]}
 */
const RING_STONE_EFFECT_BY_RING_ROW = [
    ['wooden', 'adornment'],
    ['granite', 'gain strength'],
    ['opal', 'gain constitution'],
    ['clay', 'increase accuracy'],
    ['coral', 'increase damage'],
    ['black onyx', 'protection'],
    ['moonstone', 'regeneration'],
    ['tiger eye', 'searching'],
    ['jade', 'stealth'],
    ['bronze', 'sustain ability'],
    ['agate', 'levitation'],
    ['topaz', 'hunger'],
    ['sapphire', 'aggravate monster'],
    ['ruby', 'conflict'],
    ['diamond', 'warning'],
    ['pearl', 'poison resistance'],
    ['iron', 'fire resistance'],
    ['brass', 'cold resistance'],
    ['copper', 'shock resistance'],
    ['twisted', 'free action'],
    ['steel', 'slow digestion'],
    ['silver', 'teleportation'],
    ['gold', 'teleport control'],
    ['ivory', 'polymorph'],
    ['emerald', 'polymorph control'],
    ['wire', 'invisibility'],
    ['engagement', 'see invisible'],
    ['shiny', 'protection from shape changers'],
];

/** @type {Map<number, number>} otyp → row index **0..27** */
const RING_ROW_BY_OTYP = new Map(
    RING_CLASS_MKOBJ_ROWS.map((row, ix) => [row[0] | 0, ix]),
);

/** C: **`AMULET(name, desc, …)`** order after rings — NH5 **201..213** (first ESP … real Yendor). */
const OTYP_AMULET_FIRST = 201;
const OTYP_AMULET_LAST = 213;

/**
 * C: **`OBJ_DESCR`**, **`OBJ_NAME`**-style strings (**`dn`**, **`actualn`** in xname).
 * @type {readonly (readonly [string, string])[]}
 */
const AMULET_APPEAR_NAME_BY_ROW = [
    ['circular', 'amulet of ESP'],
    ['spherical', 'amulet of life saving'],
    ['oval', 'amulet of strangulation'],
    ['triangular', 'amulet of restful sleep'],
    ['pyramidal', 'amulet versus poison'],
    ['square', 'amulet of change'],
    ['concave', 'amulet of unchanging'],
    ['hexagonal', 'amulet of reflection'],
    ['octagonal', 'amulet of magical breathing'],
    ['perforated', 'amulet of guarding'],
    ['cubical', 'amulet of flying'],
    ['Amulet of Yendor', 'cheap plastic imitation of the Amulet of Yendor'],
    ['Amulet of Yendor', 'Amulet of Yendor'],
];

/** @param {number} otyp */
export function isRingOtypInMkobjWalkLikeC(otyp) {
    return RING_ROW_BY_OTYP.has(otyp | 0);
}

/** NH5 contiguous amulets **201..213** (C **`objects.h`** after **`RING`** block). */
export function isAmuletOtypNh5SequentialLikeC(otyp) {
    const t = otyp | 0;
    return t >= OTYP_AMULET_FIRST && t <= OTYP_AMULET_LAST;
}

/**
 * C: xname **`RING_CLASS`** — no leading article.
 * @param {{ otyp?: number, oclass?: number, dknown?: number }} otmp
 * @param {object|null|undefined} g
 * @param {boolean} overrideId
 */
export function xnameRingPhraseNoArticleLikeC(otmp, g, overrideId) {
    const t = otmp.otyp | 0;
    const oc = otmp.oclass | 0;
    if (oc === NH5_ARMOR_CLASS || (oc !== NH5_RING_CLASS && isArmorOtypLikeC(t))) return null;
    if (oc !== NH5_RING_CLASS && !isRingOtypInMkobjWalkLikeC(t)) return null;
    const row = RING_ROW_BY_OTYP.get(t);
    if (row == null) return null;
    const [stone, effect] = RING_STONE_EFFECT_BY_RING_ROW[row];
    const dknown = !!(overrideId || (otmp.dknown | 0));
    const known = !!(
        overrideId ||
        (g && g.ringDiscovery instanceof Set && g.ringDiscovery.has(t))
    );
    if (!dknown) return 'ring';
    if (known) return `ring of ${effect}`;
    return `${stone} ring`;
}

/**
 * @param {{ otyp?: number, oclass?: number, dknown?: number }} otmp
 * @param {object|null|undefined} g
 * @param {number} q
 * @param {boolean} overrideId
 * @param {(s: string) => string} justArticlePrefix
 */
export function donameRingLikeC(otmp, g, q, overrideId, justArticlePrefix) {
    const phrase = xnameRingPhraseNoArticleLikeC(otmp, g, overrideId);
    if (phrase == null) return null;
    const iq = Math.max(1, q | 0);
    if (iq === 1) {
        const art = justArticlePrefix(phrase);
        return `${art}${phrase}`;
    }
    if (phrase === 'ring') return `${iq} rings`;
    if (phrase.startsWith('ring of ')) return `${iq} rings of ${phrase.slice(8)}`;
    if (phrase.endsWith(' ring')) {
        const stone = phrase.slice(0, -' ring'.length);
        return `${iq} ${stone} rings`;
    }
    return `${iq} ${phrase}s`;
}

function amuletRowIndex(otyp, oclass) {
    const t = otyp | 0;
    const oc = oclass != null && oclass !== undefined ? oclass | 0 : -1;
    if (t >= OTYP_AMULET_FIRST && t <= OTYP_AMULET_LAST) return t - OTYP_AMULET_FIRST;
    if (oc === NH5_AMULET_CLASS && t === OTYP_FAKE_AMULET_OF_YENDOR) return 11;
    if (oc === NH5_AMULET_CLASS && t === OTYP_AMULET_OF_YENDOR) return 12;
    return -1;
}

/**
 * C: xname **`AMULET_CLASS`** (no article).
 * @param {{ otyp?: number, oclass?: number, dknown?: number, known?: number }} otmp
 * @param {object|null|undefined} g
 * @param {boolean} overrideId
 */
export function xnameAmuletPhraseNoArticleLikeC(otmp, g, overrideId) {
    const t = otmp.otyp | 0;
    const ix = amuletRowIndex(t, otmp.oclass);
    if (ix < 0) return null;
    const [appe, name] = AMULET_APPEAR_NAME_BY_ROW[ix];
    const dknown = !!(overrideId || (otmp.dknown | 0));
    const known = !!(
        overrideId ||
        (otmp.known | 0) ||
        (g && g.amuletDiscovery instanceof Set && g.amuletDiscovery.has(t))
    );
    if (!dknown) return 'amulet';
    if (t === OTYP_FAKE_AMULET_OF_YENDOR || t === OTYP_AMULET_OF_YENDOR || ix >= 11)
        return known ? name : appe;
    if (known) return name;
    return `${appe} amulet`;
}

/**
 * @param {{ otyp?: number, oclass?: number, dknown?: number, known?: number }} otmp
 * @param {object|null|undefined} g
 * @param {number} q
 * @param {boolean} overrideId
 * @param {(s: string) => string} justArticlePrefix
 */
export function donameAmuletLikeC(otmp, g, q, overrideId, justArticlePrefix) {
    const phrase = xnameAmuletPhraseNoArticleLikeC(otmp, g, overrideId);
    if (phrase == null) return null;
    const iq = Math.max(1, q | 0);
    const t = otmp.otyp | 0;
    const ix = amuletRowIndex(t, otmp.oclass);
    if (iq === 1) {
        if (t === OTYP_AMULET_OF_YENDOR && phrase === 'Amulet of Yendor') return 'the Amulet of Yendor';
        if (t === OTYP_FAKE_AMULET_OF_YENDOR && phrase.startsWith('cheap plastic')) return `the ${phrase}`;
        const art = justArticlePrefix(phrase);
        return `${art}${phrase}`;
    }
    if (phrase === 'amulet') return `${iq} amulets`;
    if (ix === 12 && phrase === 'Amulet of Yendor') return `${iq} Amulets of Yendor`;
    if (ix === 11 && phrase.startsWith('cheap plastic')) return `${iq} cheap plastic imitations of the Amulet of Yendor`;
    if (phrase.startsWith('amulet of ')) return `${iq} amulets of ${phrase.slice('amulet of '.length)}`;
    if (phrase.startsWith('amulet versus ')) return `${iq} amulets versus ${phrase.slice('amulet versus '.length)}`;
    if (phrase.endsWith(' amulet')) {
        const head = phrase.slice(0, -' amulet'.length);
        return `${iq} ${head} amulets`;
    }
    return `${iq} ${phrase}s`;
}

/**
 * @param {string} s
 * @returns {string|null}
 */
export function tryMakePluralRingAmuletBurnLikeC(s) {
    if (s === 'ring') return 'rings';
    if (s === 'amulet') return 'amulets';
    if (s.startsWith('ring of ')) return `rings of ${s.slice(8)}`;
    if (s.endsWith(' ring')) {
        const stone = s.slice(0, -' ring'.length);
        return `${stone} rings`;
    }
    if (s === 'Amulet of Yendor') return 'Amulets of Yendor';
    if (s.startsWith('cheap plastic imitation')) return null;
    if (s.startsWith('amulet of ')) return `amulets of ${s.slice(10)}`;
    if (s.startsWith('amulet versus ')) return `amulets versus ${s.slice(16)}`;
    if (s.endsWith(' amulet')) return `${s.slice(0, -' amulet'.length)} amulets`;
    return null;
}

export function discoverRingOtypHeroLikeC(g, otyp) {
    if (!g) return;
    const t = otyp | 0;
    if (!(g.ringDiscovery instanceof Set)) g.ringDiscovery = new Set();
    g.ringDiscovery.add(t);
}

export function discoverAmuletOtypHeroLikeC(g, otyp) {
    if (!g) return;
    const t = otyp | 0;
    if (!(g.amuletDiscovery instanceof Set)) g.amuletDiscovery = new Set();
    g.amuletDiscovery.add(t);
}
