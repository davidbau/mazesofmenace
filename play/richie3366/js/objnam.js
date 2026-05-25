// objnam.js — Object naming for messages (minimal until objnam.c is ported).
// C ref: objnam.c doname(), doname_with_price(), xname_flags (subset), distant_name(),
// An()/just_an() for floor burn plines.

import { game } from './gstate.js';
import {
    NH5_AMULET_CLASS,
    NH5_ARMOR_CLASS,
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
import { isSpellbookOtyp, spellbookAppearanceNounPhrase } from './spellbook_discovery_lines.js';
import {
    donameArmorLikeC,
    isArmorOtypLikeC,
    tryMakePluralArmorBurnLikeC,
    xnameArmorPhraseNoArticleLikeC,
} from './objnam_armor_like_c.js';
import {
    donameAmuletLikeC,
    donameRingLikeC,
    isAmuletOtypNh5SequentialLikeC,
    isRingOtypInMkobjWalkLikeC,
    tryMakePluralRingAmuletBurnLikeC,
    xnameAmuletPhraseNoArticleLikeC,
    xnameRingPhraseNoArticleLikeC,
} from './objnam_ring_amulet_like_c.js';
import { nh5HeroObjectClass } from './water_damage.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
import { cansee } from './vision.js';
import { OTYP_GLOB_OF_GREEN_SLIME } from './const.js';

/** C: include/objects.h POTION(...) block — NH **5.0.0** contiguous **`objects_nums`** **296..321** (see **`water_damage.js`** **`nh5HeroObjectClass`**). */
const OTYP_POT_FIRST = 296;
const OTYP_POT_LAST = 321;

/** C: OBJ_DESCR — unknown appearance before **`potion of …`**. */
const POTION_DESCR_BY_IX = [
    'ruby',
    'pink',
    'orange',
    'yellow',
    'emerald',
    'dark green',
    'cyan',
    'sky blue',
    'brilliant blue',
    'magenta',
    'purple-red',
    'puce',
    'milky',
    'swirly',
    'bubbly',
    'smoky',
    'cloudy',
    'effervescent',
    'black',
    'golden',
    'brown',
    'fizzy',
    'dark',
    'white',
    'murky',
    'clear',
];

/** C: OBJ actual name — known **`potion of …`** tail. */
const POTION_NAME_BY_IX = [
    'gain ability',
    'restore ability',
    'confusion',
    'blindness',
    'paralysis',
    'speed',
    'levitation',
    'hallucination',
    'invisibility',
    'see invisible',
    'healing',
    'extra healing',
    'gain level',
    'enlightenment',
    'monster detection',
    'object detection',
    'gain energy',
    'sleeping',
    'full healing',
    'polymorph',
    'booze',
    'sickness',
    'fruit juice',
    'acid',
    'oil',
    'water',
];

/** C: `objects.h` WAND(...) — NH **5.0.0** contiguous **`objects_nums`** **409..433** (**`mkobj_wizard_ini_inv_data.js`** **`WAND_CLASS_MKOBJ_OC_PROB_ROWS`**). */
const OTYP_WAND_FIRST = 409;
const OTYP_WAND_LAST = 433;

/** C: WAND macro appearance (**`typ`** / wood or metal). */
const WAND_TYP_BY_IX = [
    'glass',
    'balsa',
    'crystal',
    'maple',
    'pine',
    'redwood',
    'oak',
    'ebony',
    'marble',
    'tin',
    'brass',
    'copper',
    'silver',
    'platinum',
    'iridium',
    'zinc',
    'aluminum',
    'uranium',
    'iron',
    'steel',
    'hexagonal',
    'short',
    'runed',
    'long',
    'curved',
];

/** C: WAND macro **`name`** — known **`wand of …`**. */
const WAND_NAME_BY_IX = [
    'light',
    'secret door detection',
    'enlightenment',
    'create monster',
    'wishing',
    'stasis',
    'nothing',
    'striking',
    'make invisible',
    'slow monster',
    'speed monster',
    'undead turning',
    'polymorph',
    'cancellation',
    'teleportation',
    'opening',
    'locking',
    'probing',
    'digging',
    'magic missile',
    'fire',
    'cold',
    'sleep',
    'death',
    'lightning',
];

/** C: objects.h **`SLIME_MOLD`** index ( **`mkobj_food_class_rng_like_c.js`**). */
const OTYP_SLIME_MOLD = 194;

/** C: **`objects_nums`** **`SPE_NOVEL`** / **`SPE_BOOK_OF_THE_DEAD`** (after **`SPELLBOOK_OTYP`** map in **`spellbook_skill_level_data.js`**). */
const OTYP_SPE_NOVEL = 407;
const OTYP_SPE_BOOK_OF_THE_DEAD = 408;

/** C: **`makeplural`**-style fixes for **`OC_SKILL_ROW_BY_OTYP`** phrases (quan **> 1** **`doname`** only). */
const OC_SKILL_PHRASE_PLURAL = new Map([['worm tooth', 'worm teeth']]);

export {
    discoverScrollOtyp,
    learnscrolltypHeroLikeC,
    learnscrollHeroLikeC,
    trycallHeroLikeC,
} from './discover_scroll.js';
import { discoverWandOtyp } from './discover_wand.js';

export { discoverWandOtyp };

/** C: objects.h GOLD_PIECE (matches mklev.js stub constant). */
const GOLD_PIECE = 466;

/** C: objnam.c vowels[] subset for just_an(). */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** C: xname/doname potion branch — **`dknown`** appearance vs **`potionDiscovery`** known type. */
function donamePotionLikeC(otmp, g, q, overrideId) {
    const otyp = otmp.otyp | 0;
    const ix = otyp - OTYP_POT_FIRST;
    if (ix < 0 || ix > OTYP_POT_LAST - OTYP_POT_FIRST) return q === 1 ? 'a potion' : `${q} potions`;
    const dknown = overrideId || (otmp.dknown | 0);
    if (!dknown) return q === 1 ? 'a potion' : `${q} potions`;
    const known = overrideId || (g?.potionDiscovery instanceof Set && g.potionDiscovery.has(otyp));
    const appe = POTION_DESCR_BY_IX[ix];
    const effect = POTION_NAME_BY_IX[ix];
    if (known) {
        if (q === 1) return `a potion of ${effect}`;
        return `${q} potions of ${effect}`;
    }
    const colored = `${appe} potion`;
    const art = justArticlePrefix(colored);
    if (q === 1) return `${art}${colored}`;
    return `${q} ${appe} potions`;
}

/**
 * C: objnam.c just_an() — returns "", "a ", or "an " (lowercase article only).
 * @param {string} str
 */
export function justArticlePrefix(str) {
    if (!str) return 'a ';
    const c0 = str[0].toLowerCase();
    if (!str[1] || str[1] === ' ') {
        return 'aehilmnosx'.includes(c0) ? 'an ' : 'a ';
    }
    const low = str.toLowerCase();
    if (low.startsWith('the ') || low === 'molten lava' || low === 'iron bars' || low === 'ice') return '';
    if (
        (VOWELS.has(c0) &&
            (!low.startsWith('one') || (str[3] && !'-_ '.includes(str[3]))) &&
            !low.startsWith('eu') &&
            !low.startsWith('uke') &&
            !low.startsWith('ukulele') &&
            !low.startsWith('unicorn') &&
            !low.startsWith('uranium') &&
            !low.startsWith('useful')) ||
        (c0 === 'x' && str[1] && !VOWELS.has(str[1].toLowerCase()))
    )
        return 'an ';
    return 'a ';
}

/** C: xname/doname wand branch — appearance vs known (**`override_ID`** or **`g.wandDiscovery`**). */
function donameWandLikeC(otmp, g, q, overrideId) {
    const otyp = otmp.otyp | 0;
    const ix = otyp - OTYP_WAND_FIRST;
    if (ix < 0 || ix > OTYP_WAND_LAST - OTYP_WAND_FIRST) return q === 1 ? 'a wand' : `${q} wands`;
    const dknown = overrideId || (otmp.dknown | 0);
    if (!dknown) return q === 1 ? 'a wand' : `${q} wands`;
    const known = overrideId || (g?.wandDiscovery instanceof Set && g.wandDiscovery.has(otyp));
    const appe = WAND_TYP_BY_IX[ix];
    const effect = WAND_NAME_BY_IX[ix];
    if (known) {
        if (q === 1) return `a wand of ${effect}`;
        return `${q} wands of ${effect}`;
    }
    const colored = `${appe} wand`;
    const art = justArticlePrefix(colored);
    if (q === 1) return `${art}${colored}`;
    return `${q} ${appe} wands`;
}

/**
 * C: objnam.c An() — article + capitalize first character of result.
 * @param {string} str
 */
export function An(str) {
    if (!str) return 'Something';
    const art = justArticlePrefix(str);
    const out = art ? `${art}${str}` : str;
    return out.charAt(0).toUpperCase() + out.slice(1);
}

export function scrollAppearanceFromOtyp(otyp) {
    const row = OC_SKILL_ROW_BY_OTYP.get(otyp | 0);
    if (!row?.name) return '???';
    let s = row.name;
    if (s.startsWith('SCR_')) s = s.slice(4);
    return s.toLowerCase().replace(/_/g, ' ');
}

function spellbookAppearanceFromOtyp(otyp) {
    const row = OC_SKILL_ROW_BY_OTYP.get(otyp | 0);
    if (!row?.name) return 'parchment';
    let s = row.name;
    if (s.startsWith('SPE_')) s = s.slice(4);
    return s.toLowerCase().replace(/_/g, ' ');
}

/** C: **`objects[]`** **`OBJ_NAME`**-shaped base text — **`OC_SKILL_ROW_BY_OTYP.name`** (**NH5 `objects_nums`** slice). */
function ocSkillRowPhraseFromRow(row) {
    if (!row?.name) return '';
    return String(row.name)
        .toLowerCase()
        .replace(/_/g, ' ');
}

/** C: **`makeplural`** subset for **`doname`** quan **> 1** on **`ocSkillRowPhraseFromRow`** output. */
function ocSkillRowPluralDonameLikeC(phrase, q) {
    const spec = OC_SKILL_PHRASE_PLURAL.get(phrase);
    if (spec) return `${q} ${spec}`;
    if (/\bglass$/i.test(phrase)) return `${q} ${phrase.replace(/\bglass$/i, 'glasses')}`;
    if (phrase.endsWith(' tooth')) return `${q} ${phrase.replace(/ tooth$/, ' teeth')}`;
    return `${q} ${phrase}s`;
}

/**
 * C: **`doname`** / **`minimal_xname`** fallback for **`otyp`** in **`OC_SKILL_ROW_BY_OTYP`** (weapon/tool/gem/rock…).
 * @returns {string|null}
 */
function donameFromOcSkillRowLikeC(otmp, q) {
    const row = OC_SKILL_ROW_BY_OTYP.get(otmp.otyp | 0);
    if (!row) return null;
    const phrase = ocSkillRowPhraseFromRow(row);
    if (!phrase) return null;
    const iq = Math.max(1, q | 0);
    if (iq === 1) {
        const art = justArticlePrefix(phrase);
        return `${art}${phrase}`;
    }
    return ocSkillRowPluralDonameLikeC(phrase, iq);
}

/** C: **`distant_name`** blind/far class stub — subset keyed by **`objclass`**. */
function distantNameOcClassStubLikeC(row) {
    const oc = row.oclass | 0;
    if (oc === NH5_WEAPON_CLASS) return 'weapon';
    if (oc === NH5_TOOL_CLASS) return 'tool';
    if (oc === NH5_WAND_CLASS) return 'wand';
    if (oc === NH5_RING_CLASS) return 'ring';
    if (oc === NH5_AMULET_CLASS) return 'amulet';
    if (oc === NH5_ARMOR_CLASS) return 'armor';
    if (oc === NH5_GEM_CLASS || oc === NH5_ROCK_CLASS) return 'gem';
    return 'item';
}

/**
 * C: xname(obj) core for zap.c burn_floor_objects classes only (no leading article).
 * Uses `obj.dknown` / `g.objectDiscovery` (spellbooks) / `g.scrollDiscovery` (scrolls) / `g.potionDiscovery` (potions) / `g.wandDiscovery` (wands) when wired.
 * @param {{ otyp?: number, oclass?: number, quan?: number, dknown?: number, oartifact?: number }} obj
 * @param {object} [g]
 */
export function xnameBurnFloor(obj, g = game) {
    const t = obj.otyp | 0;
    const oc = nh5HeroObjectClass(obj);
    if (t === OTYP_GLOB_OF_GREEN_SLIME) return 'glob of green slime';
    if (t >= OTYP_POT_FIRST && t <= OTYP_POT_LAST) {
        if (!(obj.dknown | 0)) return 'potion';
        const known = g?.potionDiscovery instanceof Set && g.potionDiscovery.has(t);
        const ix = t - OTYP_POT_FIRST;
        if (known) return `potion of ${POTION_NAME_BY_IX[ix]}`;
        return `${POTION_DESCR_BY_IX[ix]} potion`;
    }
    if ((t >= OTYP_WAND_FIRST && t <= OTYP_WAND_LAST) || oc === NH5_WAND_CLASS) {
        if (!(obj.dknown | 0)) return 'wand';
        const ix = t - OTYP_WAND_FIRST;
        if (ix < 0 || ix > OTYP_WAND_LAST - OTYP_WAND_FIRST) return 'wand';
        const known = g?.wandDiscovery instanceof Set && g.wandDiscovery.has(t);
        if (known) return `wand of ${WAND_NAME_BY_IX[ix]}`;
        return `${WAND_TYP_BY_IX[ix]} wand`;
    }
    if (t === OTYP_SPE_BOOK_OF_THE_DEAD) {
        if (!(obj.dknown | 0)) return 'spellbook';
        return 'Book of the Dead';
    }
    if (t === OTYP_SPE_NOVEL) {
        if (!(obj.dknown | 0)) return 'spellbook';
        return 'novel';
    }
    if (oc === NH5_SCROLL_CLASS) {
        if (!(obj.dknown | 0)) return 'scroll';
        const scrollKnown = g?.scrollDiscovery instanceof Set && g.scrollDiscovery.has(t);
        if (scrollKnown) {
            const tail = scrollAppearanceFromOtyp(t);
            return `scroll of ${tail}`;
        }
        return `scroll labeled ${scrollAppearanceFromOtyp(t)}`;
    }
    if (oc === NH5_SPBOOK_CLASS || isSpellbookOtyp(t)) {
        if (!(obj.dknown | 0)) return 'spellbook';
        const known = g?.objectDiscovery instanceof Set && g.objectDiscovery.has(t);
        if (known) {
            const ph = spellbookAppearanceNounPhrase(t);
            if (ph) return ph;
        }
        return `${spellbookAppearanceFromOtyp(t)} spellbook`;
    }
    const rawOc = obj.oclass != null && obj.oclass !== undefined ? obj.oclass | 0 : -1;
    const armorOnlyTyp = isArmorOtypLikeC(t) && rawOc !== NH5_RING_CLASS;
    const ringTyp =
        isRingOtypInMkobjWalkLikeC(t) &&
        rawOc !== NH5_ARMOR_CLASS &&
        !(rawOc === -1 && armorOnlyTyp);
    const amuletBranch = rawOc === NH5_AMULET_CLASS || isAmuletOtypNh5SequentialLikeC(t);
    if (amuletBranch) {
        const ax = xnameAmuletPhraseNoArticleLikeC(obj, g, false);
        if (ax != null) return ax;
    }
    if (ringTyp) {
        const rx = xnameRingPhraseNoArticleLikeC(obj, g, false);
        if (rx != null) return rx;
    }
    if (armorOnlyTyp) {
        const ph = xnameArmorPhraseNoArticleLikeC(obj, g, false);
        if (ph != null) return ph;
    }
    const ocRow = OC_SKILL_ROW_BY_OTYP.get(t);
    if (ocRow) return ocSkillRowPhraseFromRow(ocRow) || 'item';
    return 'item';
}

/**
 * C: objnam.c distant_name(obj, xname) for floor burn — near tile + cansee uses xname;
 * else blind-at-a-distance style base nouns (subset of gd.distantname path).
 * @param {object} obj
 * @param {number} x
 * @param {number} y
 * @param {object} [g]
 */
export function distantNameBurnFloor(obj, x, y, g = game) {
    const u = g.u;
    if (!u) return xnameBurnFloor(obj, g);
    if ((u.ux | 0) === x && (u.uy | 0) === y) return xnameBurnFloor(obj, g);
    if (obj.oartifact | 0) return xnameBurnFloor(obj, g);

    const dx = (u.ux | 0) - x;
    const dy = (u.uy | 0) - y;
    const dist2 = dx * dx + dy * dy;
    const xr = (u.xray_range | 0) > 2 ? u.xray_range | 0 : 2;
    const neardist = xr * xr * 2 - xr;
    if (cansee(x, y) && dist2 <= neardist) return xnameBurnFloor(obj, g);

    const oc = nh5HeroObjectClass(obj);
    const t = obj.otyp | 0;
    if (t === OTYP_GLOB_OF_GREEN_SLIME) return 'glob of green slime';
    if (t >= OTYP_POT_FIRST && t <= OTYP_POT_LAST) return 'potion';
    if ((t >= OTYP_WAND_FIRST && t <= OTYP_WAND_LAST) || oc === NH5_WAND_CLASS) return 'wand';
    if (t === OTYP_SPE_BOOK_OF_THE_DEAD || t === OTYP_SPE_NOVEL) return 'spellbook';
    if (oc === NH5_RING_CLASS) return 'ring';
    if (oc === NH5_AMULET_CLASS) return 'amulet';
    if (oc === NH5_ARMOR_CLASS) return 'armor';
    if (oc === NH5_SCROLL_CLASS) return 'scroll';
    if (oc === NH5_SPBOOK_CLASS || isSpellbookOtyp(t)) return 'spellbook';
    const ocRow = OC_SKILL_ROW_BY_OTYP.get(t);
    if (ocRow) return distantNameOcClassStubLikeC(ocRow);
    return 'item';
}

/**
 * C: xname pluralization (makeplural) subset for burn_floor_objects buf2.
 * @param {string} s
 */
export function makePluralBurn(s) {
    const armPl = tryMakePluralArmorBurnLikeC(s);
    if (armPl != null) return armPl;
    const raPl = tryMakePluralRingAmuletBurnLikeC(s);
    if (raPl != null) return raPl;
    if (s === 'glob of green slime') return 'globs of green slime';
    if (s === 'potion') return 'potions';
    if (s.endsWith(' potion') && !s.startsWith('potion of ')) {
        const appe = s.slice(0, -' potion'.length);
        return `${appe} potions`;
    }
    if (s.startsWith('potion of ')) return `potions of ${s.slice('potion of '.length)}`;
    if (s === 'wand') return 'wands';
    if (s === 'armor') return 'suits of armor';
    if (s.endsWith(' wand') && !s.startsWith('wand of ')) {
        const appe = s.slice(0, -' wand'.length);
        return `${appe} wands`;
    }
    if (s.startsWith('wand of ')) return `wands of ${s.slice('wand of '.length)}`;
    if (s === 'Book of the Dead') return 'Books of the Dead';
    if (s === 'novel') return 'novels';
    if (s === 'scroll') return 'scrolls';
    if (s === 'spellbook') return 'spellbooks';
    if (s.startsWith('scroll of ')) return `scrolls of ${s.slice('scroll of '.length)}`;
    if (s.startsWith('scroll labeled ')) return `scrolls labeled ${s.slice('scroll labeled '.length)}`;
    if (s.startsWith('spellbook of ')) return `spellbooks of ${s.slice('spellbook of '.length)}`;
    if (s.endsWith(' spellbook')) {
        const base = s.slice(0, -'spellbook'.length);
        return `${base}spellbooks`;
    }
    if (s.endsWith(' tooth')) return s.replace(/ tooth$/, ' teeth');
    if (/\bglass$/i.test(s)) return s.replace(/\bglass$/i, 'glasses');
    return `${s}s`;
}

/**
 * C: doname(obj) — very small subset for invent.c look_here().
 * Spellbooks: if `otyp` is an NH5 spellbook and `g.objectDiscovery` contains it,
 * name like `a spellbook of force bolt` (C appearance after skill_based_spellbook_id).
 * Scrolls: `g.scrollDiscovery` Set drives **`scroll of`** vs **`scroll labeled`** when `dknown`.
 * Potions: NH **5.0.0** **`objects_nums`** **296..321** — appearance vs **`potion of …`** from **`g.potionDiscovery`** when `dknown`.
 * Wands: **`409..433`** — appearance vs **`wand of …`** from **`g.wandDiscovery`** when `dknown` (**`objects.h`** **`WAND`** through **`WAN_LIGHTNING`**).
 * Armor: NH5 otyp 90..173 — appearance and actual names from objnam_armor_like_c.js; g.armorDiscovery when set (discoverArmorOtypHeroLikeC); set of dragon scales, pair of gloves or boots, unknown shield when !dknown like C.
 * Rings and amulets: objnam_ring_amulet_like_c.js — RING() order matches RING_CLASS_MKOBJ_ROWS (173..200); ring of … vs stone appearance plus ring from g.ringDiscovery; amulets 201..213 plus oclass AMULET_CLASS for OTYP_FAKE_AMULET_OF_YENDOR and OTYP_AMULET_OF_YENDOR rows; g.amuletDiscovery.
 * Slime mold / glob: FOOD **`otyp`** subset (**`minimal_xname`** corpsenm suppression not modeled).
 * **`OC_SKILL_ROW_BY_OTYP`** otyps: C **`OBJ_NAME`**-style phrase (**`distant_name`** far uses class stub).
 * @param {{ otyp?: number, quan?: number, oclass?: number, dknown?: number }} otmp
 * @param {object} [g]
 * @param {{ overrideId?: boolean }} [opts] — C **`iflags.override_ID`** for **`minimal_xname`**: force type-known + **`dknown`** for naming only.
 */
export function doname(otmp, g = game, opts) {
    if (!otmp) return 'nothing';
    const overrideId = !!(opts && opts.overrideId);
    const q = otmp.quan ?? 1;
    if (otmp.otyp === GOLD_PIECE) {
        return q === 1 ? 'a gold piece' : `${q} gold pieces`;
    }
    const otyp = otmp.otyp | 0;
    if (otyp === OTYP_GLOB_OF_GREEN_SLIME) {
        return q === 1 ? 'a glob of green slime' : `${q} globs of green slime`;
    }
    if (otyp === OTYP_SLIME_MOLD) {
        return q === 1 ? 'a slime mold' : `${q} slime molds`;
    }
    if (otyp === OTYP_SPE_BOOK_OF_THE_DEAD) {
        return q === 1 ? 'the Book of the Dead' : `${q} Books of the Dead`;
    }
    if (otyp === OTYP_SPE_NOVEL) {
        return q === 1 ? 'a novel' : `${q} novels`;
    }
    const oc = nh5HeroObjectClass(otmp);
    const onPotion = oc === NH5_POTION_CLASS || (otyp >= OTYP_POT_FIRST && otyp <= OTYP_POT_LAST);
    if (onPotion) return donamePotionLikeC(otmp, g, q, overrideId);
    const onWand = oc === NH5_WAND_CLASS || (otyp >= OTYP_WAND_FIRST && otyp <= OTYP_WAND_LAST);
    if (onWand) return donameWandLikeC(otmp, g, q, overrideId);
    const treatAsSpellbook = oc === NH5_SPBOOK_CLASS || isSpellbookOtyp(otyp);
    if (oc === NH5_SCROLL_CLASS) {
        const dknown = overrideId || (otmp.dknown | 0);
        if (!dknown) return q === 1 ? 'a scroll' : `${q} scrolls`;
        const scrollKnown =
            overrideId || (g?.scrollDiscovery instanceof Set && g.scrollDiscovery.has(otyp));
        const tail = scrollAppearanceFromOtyp(otyp);
        if (scrollKnown) {
            if (q === 1) return `a scroll of ${tail}`;
            return `${q} scrolls of ${tail}`;
        }
        if (q === 1) return `a scroll labeled ${tail}`;
        return `${q} scrolls labeled ${tail}`;
    }
    if (treatAsSpellbook && isSpellbookOtyp(otyp)) {
        const known =
            overrideId || (g?.objectDiscovery instanceof Set && g.objectDiscovery.has(otyp));
        const phrase = known ? spellbookAppearanceNounPhrase(otyp) : 'spellbook';
        if (!phrase) return q === 1 ? 'a spellbook' : `${q} spellbooks`;
        if (q === 1) return `a ${phrase}`;
        /* plural: spellbook of X → spellbooks of X */
        if (known && phrase.startsWith('spellbook of ')) {
            const tail = phrase.slice('spellbook of '.length);
            return `${q} spellbooks of ${tail}`;
        }
        return `${q} ${phrase}s`;
    }
    const rawOc = otmp.oclass != null && otmp.oclass !== undefined ? otmp.oclass | 0 : -1;
    const armorOnlyTyp = isArmorOtypLikeC(otyp) && rawOc !== NH5_RING_CLASS;
    const ringTyp =
        isRingOtypInMkobjWalkLikeC(otyp) &&
        rawOc !== NH5_ARMOR_CLASS &&
        !(rawOc === -1 && armorOnlyTyp);
    const amuletBranch =
        rawOc === NH5_AMULET_CLASS || isAmuletOtypNh5SequentialLikeC(otyp);
    if (amuletBranch) {
        const amu = donameAmuletLikeC(otmp, g, q, overrideId, justArticlePrefix);
        if (amu != null) return amu;
    }
    if (ringTyp) {
        const rin = donameRingLikeC(otmp, g, q, overrideId, justArticlePrefix);
        if (rin != null) return rin;
    }
    if (armorOnlyTyp) {
        const armDon = donameArmorLikeC(otmp, g, q, overrideId, justArticlePrefix);
        if (armDon != null) return armDon;
    }
    const ocDon = donameFromOcSkillRowLikeC(otmp, q);
    if (ocDon != null) return ocDon;
    return `an object (${otmp.otyp})`;
}

/**
 * C: objnam.c ansimpleoname(obj) — subset: strip leading indefinite article from **`doname`**.
 * @param {{ otyp?: number, quan?: number, oclass?: number }} otmp
 * @param {object} [g]
 */
export function ansimpleonameLikeC(otmp, g = game) {
    let s = doname(otmp, g);
    if (s.startsWith('an ')) return s.slice(3);
    if (s.startsWith('a ')) return s.slice(2);
    return s;
}

/** C: objnam.c **`minimal_xname`** post-**`distant_name`** — strip leading **`uncursed `** when BUC leaked into **`obuf`**. */
function stripUncursedPrefixLikeC(s) {
    if (s.startsWith('uncursed ')) return s.slice(9);
    return s;
}

/**
 * C: objnam.c **`minimal_xname(obj)`** — temp **`objects[otyp].oc_name_known` / `oc_uname`** + **`bareobj`** (**`quan`** 1, **`dknown`** from **`dknown || override_ID`**) then **`distant_name`(…, **`xname`**)**; JS approximates discovery via **`opts.overrideId`** on **`doname`** (no global **`objects[]`**).
 * @param {{ otyp?: number, oclass?: number, quan?: number, dknown?: number, oartifact?: number }} otmp
 * @param {object} [g]
 * @param {boolean} [overrideId] — C **`iflags.override_ID`** during **`minimal_xname`** / always true in **`actualoname`**.
 * @returns {string}
 */
export function minimalXnameHeroLikeC(otmp, g = game, overrideId = false) {
    if (!otmp) return '';
    const bare = { ...otmp, quan: 1 };
    let s = doname(bare, g, { overrideId });
    s = stripUncursedPrefixLikeC(s);
    return s;
}

/**
 * C: objnam.c **`actualoname(obj)`** — **`iflags.override_ID = TRUE`**, **`res = minimal_xname(obj)`**, **`iflags.override_ID = FALSE`**.
 * JS: **`minimalXnameHeroLikeC(otmp, g, true)`** then strip leading **`a`/`an`** (livelog / caller style; C keeps articles from **`distant_name`** where applicable).
 * @param {{ otyp?: number, oclass?: number, quan?: number, dknown?: number, oartifact?: number }} otmp
 * @param {object} [g]
 */
export function actualonameHeroLikeC(otmp, g = game) {
    if (!otmp) return '';
    let s = minimalXnameHeroLikeC(otmp, g, true);
    if (s.startsWith('an ')) return s.slice(3);
    if (s.startsWith('a ')) return s.slice(2);
    return s;
}

/**
 * C: decl.c **`upstart(str)`** — capitalize first character (ASCII).
 * @param {string} str
 */
export function upstartLikeC(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * C: o_init.c **`discover_object(oindx, mark_as_known, mark_as_encountered, credit_hero)`** — **`disco[]`** slot + **`oc_encountered`** / **`oc_name_known`**.
 * JS: **`g.objectEncountered`** (**`Set<otyp>`**) when **`mark_as_encountered`**; **`partialNameKnown`** uses **`scrollDiscovery`** / **`objectDiscovery`** / **`potionDiscovery`** / **`wandDiscovery`** / **`armorDiscovery`** / **`ringDiscovery`** / **`amuletDiscovery`** like C **`objects[].oc_name_known`** gates for those JS mirrors.
 * Omits **`svb.bases[]`**, Samurai **`Japanese_item_name`**, **`gem_learned`**, **`update_inventory`**, **`exercise`**.
 * @param {import('./gstate.js').game} g
 * @param {number} oindx
 * @param {boolean} markAsKnown
 * @param {boolean} markAsEncountered
 * @param {boolean} [_creditHero]
 */
/** C: `svd.disco[]` slot — list otyp for `#discoveries` without encounter/known flags. */
export function noteDiscoveryOtypLikeC(g, oindx) {
    const t = oindx | 0;
    if (t < 1) return;
    if (!Array.isArray(g.discoOtyps)) g.discoOtyps = [];
    if (!g.discoOtyps.includes(t)) g.discoOtyps.push(t);
}

export function discoverObjectHeroLikeC(g, oindx, markAsKnown, markAsEncountered, _creditHero) {
    const t = oindx | 0;
    if (t < 1) return;

    if (!(g.objectEncountered instanceof Set)) g.objectEncountered = new Set();
    const alreadyEnc = g.objectEncountered.has(t);

    const scrollKnown = g.scrollDiscovery instanceof Set && g.scrollDiscovery.has(t);
    const spellKnown = g.objectDiscovery instanceof Set && g.objectDiscovery.has(t);
    const potKnown = g.potionDiscovery instanceof Set && g.potionDiscovery.has(t);
    const wandKnown = g.wandDiscovery instanceof Set && g.wandDiscovery.has(t);
    const armorKnown = g.armorDiscovery instanceof Set && g.armorDiscovery.has(t);
    const ringKnown = g.ringDiscovery instanceof Set && g.ringDiscovery.has(t);
    const amuletKnown = g.amuletDiscovery instanceof Set && g.amuletDiscovery.has(t);
    const partialNameKnown =
        scrollKnown ||
        spellKnown ||
        potKnown ||
        wandKnown ||
        armorKnown ||
        ringKnown ||
        amuletKnown;

    /* C: outer **`if`** — no **`objects[]`** yet; spell/scroll Sets approximate **`oc_name_known`** for those classes only. */
    const enter = (markAsKnown && !partialNameKnown) || (markAsEncountered && !alreadyEnc);
    if (!enter) return;

    /* C: **`svd.disco[dindx] = oindx`** — ordering deferred. */
    if (!Array.isArray(g.discoOtyps)) g.discoOtyps = [];
    if (!g.discoOtyps.includes(t)) g.discoOtyps.push(t);
    if (markAsEncountered) g.objectEncountered.add(t);

    if (markAsKnown && !partialNameKnown) {
        /* C: **`objects[oindx].oc_name_known`**, **`exercise`**, **`gem_learned`**, **`update_inventory`** — TODO per class. */
        void _creditHero;
    }
}

/**
 * C: o_init.c **`observe_object(obj)`** — **`dknown`** + **`discover_object`** (**`mark_as_encountered`**).
 * JS: **`dknown`** when not hallucinating; **`discover_object(..., FALSE, TRUE, FALSE)`** (**`objectEncountered`**).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, dknown?: number }} obj
 */
export function observeObjectHeroMinimalLikeC(g, obj) {
    const u = g?.u;
    if (!obj || !u) return;
    if ((u.Hallucination | 0) || (u.timed?.hallucination ?? 0) > 0) return;
    const oindx = obj.otyp | 0;
    if (oindx < 1) return;
    obj.dknown = 1;
    discoverObjectHeroLikeC(g, oindx, false, true, false);
}

/**
 * C: zap.c **`learnwand(obj)`** — after observable hero wand effect (**`weffects`** **`disclose`**).
 * JS: spellbooks skipped (**`SPBOOK_CLASS`** fake spell **`obj`**); **`wandDiscovery`** mirrors **`oc_name_known`**;
 * **`observe_object`** / **`makeknown`** (**`discoverWandOtyp`**) per C **`Blind`** / **`dknown`** order.
 * Omits **`update_inventory`**, **`more_experienced`** (**`weffects`** **`was_unkn`** tail).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, oclass?: number, dknown?: number }} obj
 */
export function learnwandHeroLikeC(g, obj) {
    if (!g || !obj) return;
    if ((obj.oclass | 0) === NH5_SPBOOK_CLASS) return;

    const otyp = obj.otyp | 0;
    const wandKnown = g.wandDiscovery instanceof Set && g.wandDiscovery.has(otyp);
    if (wandKnown) {
        observeObjectHeroMinimalLikeC(g, obj);
        return;
    }

    const u = g.u;
    const blind =
        !!u &&
        (!!(u.Blind | 0) || !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0 || (u.timed?.blinded ?? 0) > 0);
    if (!blind) observeObjectHeroMinimalLikeC(g, obj);
    if (obj.dknown | 0) discoverWandOtyp(g, otyp);
}
