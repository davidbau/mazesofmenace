// objnam.js — Object naming for inventory display.
// C ref: objnam.c — doname(), xname(), an(), just_an(), makeplural() (Tourist-kit subset).

import { game } from './gstate.js';
import {
    WEAPON_CLASS,
    ARMOR_CLASS,
    RING_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    COIN_CLASS,
    WAND_CLASS,
    SPBOOK_CLASS,
    AMULET_CLASS,
    GEM_CLASS,
    objectNames,
    objectNameStrs,
    objectDescrs,
} from './objects.js';
import { monsterNames } from './monsters.js';
import {
    W_ARMOR, W_QUIVER, W_WEP, W_SWAPWEP,
    Has_contents, Is_container,
} from './const.js';

const PRETTY = {
    DART: 'dart',
    FOOD_RATION: 'food ration',
    TRIPE_RATION: 'tripe ration',
    APPLE: 'apple',
    FORTUNE_COOKIE: 'fortune cookie',
    CLOVE_OF_GARLIC: 'clove of garlic',
    SLIME_MOLD: 'slime mold',
    TIN: 'tin',
    SCR_MAGIC_MAPPING: 'scroll of magic mapping',
    HAWAIIAN_SHIRT: 'Hawaiian shirt',
    EXPENSIVE_CAMERA: 'expensive camera',
    CREDIT_CARD: 'credit card',
    GOLD_PIECE: 'gold piece',
    WAN_WISHING: 'wand of wishing',
    LOCK_PICK: 'lock pick',
};

// Tools/weapons/wands that use oc_charged-style display.
// C: objects[].oc_charged — WEAPON() macros set chrg=1; table lacks field yet.
function is_charged_otyp(otyp) {
    const n = objectNames[otyp];
    const oc = game.objects?.[otyp];
    if (oc?.oc_charged) return true;
    // All WEAPON_CLASS entries from objects.h WEAPON/PROJECTILE/BOW are charged
    if ((oc?.oc_class ?? 0) === WEAPON_CLASS) return true;
    if (n === 'DART' || n === 'SHURIKEN' || n === 'BOOMERANG'
        || n === 'EXPENSIVE_CAMERA' || n === 'MAGIC_MARKER'
        || n === 'CRYSTAL_BALL')
        return true;
    // Wands always show (recharged:spe) when known (C: WAND_CLASS → charges)
    if (oc?.oc_class === WAND_CLASS) return true;
    if (n && n.startsWith('WAN_')) return true;
    return false;
}

function uses_known_otyp(otyp) {
    const oc = game.objects?.[otyp];
    if (oc?.oc_uses_known) return true;
    const cls = oc?.oc_class ?? 0;
    return cls === WEAPON_CLASS || cls === ARMOR_CLASS || is_charged_otyp(otyp);
}

export function otyp_uses_known(otyp) {
    return uses_known_otyp(otyp);
}

export function otyp_is_charged(otyp) {
    return is_charged_otyp(otyp);
}

function mon_name(mndx) {
    const raw = monsterNames[mndx] || '';
    // generated table uses PM_* enum tokens
    return raw.replace(/^PM_/, '').toLowerCase().replace(/_/g, ' ');
}

/**
 * C ref: eat.c tin_details() — spinach / "of X meat" / vegetarian bare name.
 */
function tin_base(obj) {
    // spinach: corpsenm unset and spe == 1 (set_tin_variety)
    if ((obj.corpsenm == null || obj.corpsenm < 0) && (obj.spe | 0) === 1)
        return 'tin of spinach';
    if (obj.corpsenm == null || obj.corpsenm < 0)
        return 'empty tin';
    const mname = mon_name(obj.corpsenm);
    // C: vegetarian monsters omit " meat"; newt is not vegetarian
    const vegetarian = /^(lichen|fungus|mold|jelly|pudding|blob|jelly)$/i
        .test(mname) || mname.includes('fungus') || mname.includes('mold');
    // Minimal: only the Tourist spinach/newt cases matter for now.
    // Newt → "newt meat"; spinach handled above.
    if (vegetarian) return `tin of ${mname}`;
    return `tin of ${mname} meat`;
}

function pretty_base(obj) {
    const n = objectNames[obj.otyp];
    if (n === 'TIN') return tin_base(obj);
    // C: corpse → "<monster> corpse" when corpsenm known
    if (n === 'CORPSE' && obj.corpsenm != null && obj.corpsenm >= 0)
        return `${mon_name(obj.corpsenm)} corpse`;
    // C: xname potion — "potion of X" when oc_name_known (startup kits are)
    if (n && n.startsWith('POT_')) {
        const rest = n.slice(4).toLowerCase().replace(/_/g, ' ');
        return `potion of ${rest}`;
    }
    return PRETTY[n] || (n ? n.toLowerCase().replace(/_/g, ' ') : 'object');
}

// C ref: objnam.c makeplural — enough for "X of Y" and simple nouns.
function makeplural(s) {
    const of = s.indexOf(' of ');
    if (of > 0) {
        return makeplural(s.slice(0, of)) + s.slice(of);
    }
    if (s.endsWith('s') || s.endsWith('x') || s.endsWith('ch') || s.endsWith('sh'))
        return s + 'es';
    if (s.endsWith('y') && s.length > 1 && !'aeiou'.includes(s[s.length - 2]))
        return s.slice(0, -1) + 'ies';
    return s + 's';
}

function just_an(str) {
    if (!str) return 'a ';
    // skip leading spaces
    let i = 0;
    while (str[i] === ' ') i++;
    const c = (str[i] || 'x').toLowerCase();
    // C: single-letter / "the "/lava/bars/ice article suppression deferred
    return 'aeiou'.includes(c) ? 'an ' : 'a ';
}

/** C ref: objnam.c an() — article + string */
export function an(str) {
    if (!str) return 'an []';
    return just_an(str) + str;
}

/**
 * C ref: objnam.c vtense — plural verb → 3rd-person present for subject.
 * Enough for look_here "There is/are … here." (a/an → singular).
 */
export function vtense(subj, verb) {
    if (subj && (/^a /i.test(subj) || /^an /i.test(subj))) {
        // singular
        if (verb === 'are') return 'is';
        if (verb === 'have') return 'has';
        if (verb.endsWith('y') && verb.length > 1 && !'aeiou'.includes(verb[verb.length - 2]))
            return verb.slice(0, -1) + 'ies';
        if (verb.endsWith('s') || verb.endsWith('x') || verb.endsWith('ch') || verb.endsWith('sh')
            || verb.endsWith('z') || verb.endsWith('o'))
            return verb + 'es';
        return verb + 's';
    }
    return verb;
}

/**
 * C ref: objnam.c doname() — invent-kit subset (Tourist/Rogue starter lines).
 */
export function doname(obj) {
    if (!obj) return 'something';
    const otyp = obj.otyp;
    const oclass = obj.oclass;
    const known = !!obj.known;
    const bknown = !!obj.bknown;
    const quan = obj.quan || 1;
    let base = pretty_base(obj);
    if (quan !== 1) base = makeplural(base);

    // C ref: objnam.c doname_base — COIN_CLASS uses the same quan/article
    // path as other objects ("a gold piece", "25 gold pieces"), not a bare
    // numeric string. xname for coins is just "gold piece".
    // Build prefix like C: start with "a "/count, then empty, then BUC, then +spe;
    // finally recompute a/an from the remainder (so "an empty uncursed …").
    let prefix = '';
    if (quan !== 1) prefix = `${quan} `;
    else prefix = 'a ';

    // C: cknown + (Is_container || STATUE) + !Has_contents → "empty "
    const oname = objectNames[otyp];
    if (obj.cknown
        && ((Is_container(obj) || oname === 'STATUE') && !Has_contents(obj))) {
        prefix += 'empty ';
    }

    if (bknown && oclass !== COIN_CLASS) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else {
            // C: flags.implicit_uncursed (default) — skip "uncursed" when
            // known && oc_charged && not armor/ring (identified +/- implies BUC).
            const charged = is_charged_otyp(otyp);
            const implicit = game.flags?.implicit_uncursed !== false;
            const showUncursed = !implicit
                || (!known || !charged
                    || oclass === ARMOR_CLASS
                    || oclass === RING_CLASS);
            if (showUncursed) prefix += 'uncursed ';
        }
    }

    if (known && (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS)) {
        const spe = obj.spe | 0;
        prefix += (spe >= 0 ? `+${spe} ` : `${spe} `);
    }

    // C ref: objnam.c — redo article based on text after "a "
    if (prefix.startsWith('a ')) {
        const rest = prefix.slice(2);
        prefix = just_an(rest || base) + rest;
    }

    let bp = prefix + base;

    // C: has_oname && dknown → " named Foo"
    const onameStr = obj.oextra?.oname;
    if (onameStr && obj.dknown) {
        bp += ` named ${onameStr}`;
    }

    if (oclass === ARMOR_CLASS && (obj.owornmask & W_ARMOR))
        bp += ' (being worn)';
    // C: W_WEP → "(weapon in right/left hand)" for single non-ammo weapons
    if ((obj.owornmask & W_WEP) && quan === 1) {
        const right = (game.u?.uhandedness !== 1); // LEFT_HANDED=1
        bp += ` (weapon in ${right ? 'right' : 'left'} hand)`;
    }
    // C: W_SWAPWEP, !twoweap → "(alternate weapon(s); not wielded)"
    if (obj.owornmask & W_SWAPWEP) {
        if (game.u?.twoweap) {
            const right = (game.u?.uhandedness !== 1);
            bp += ` (wielded in ${right ? 'left' : 'right'} hand)`;
        } else {
            bp += ` (alternate weapon${quan === 1 ? '' : 's'}; not wielded)`;
        }
    }
    if (obj.owornmask & W_QUIVER)
        bp += ' (at the ready)';

    if (known && is_charged_otyp(otyp) && oclass === TOOL_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;
    // C ref: objnam.c WAND_CLASS → charges
    if (known && oclass === WAND_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;

    return bp;
}

/**
 * C ref: invent.c xprname() — "a - doname" / "$ - doname"
 */
export function xprname(obj, let_) {
    const ilet = let_ ?? obj.invlet ?? '?';
    return `${ilet} - ${doname(obj)}`;
}

// C ref: objnam.c Japanese_items[] / Japanese_item_name()
const JAPANESE_ITEMS = [
    ['SHORT_SWORD', 'wakizashi'],
    ['BROADSWORD', 'ninja-to'],
    ['FLAIL', 'nunchaku'],
    ['GLAIVE', 'naginata'],
    ['LOCK_PICK', 'osaku'],
    ['WOODEN_HARP', 'koto'],
    ['MAGIC_HARP', 'magic koto'],
    ['KNIFE', 'shito'],
    ['PLATE_MAIL', 'tanko'],
    ['HELMET', 'kabuto'],
    ['LEATHER_GLOVES', 'yugake'],
    ['FOOD_RATION', 'gunyoki'],
    ['POT_BOOZE', 'sake'],
];
let _japaneseByOtyp = null;
function japaneseByOtyp() {
    if (_japaneseByOtyp) return _japaneseByOtyp;
    _japaneseByOtyp = new Map();
    for (const [name, jn] of JAPANESE_ITEMS) {
        const otyp = objectNames.indexOf(name);
        if (otyp >= 0) _japaneseByOtyp.set(otyp, jn);
    }
    return _japaneseByOtyp;
}

/** C ref: objnam.c Japanese_item_name — null ordinaryname → truthy iff mapped. */
export function Japanese_item_name(otyp, ordinaryname = null) {
    const jn = japaneseByOtyp().get(otyp);
    if (jn) return jn;
    return ordinaryname;
}

/**
 * C ref: objnam.c obj_typename(otyp) — disco / identify class names.
 * Covers known + description append; display-path Japanese names deferred.
 */
export function obj_typename(otyp) {
    const ocl = game.objects?.[otyp];
    if (!ocl) return objectNames[otyp] || 'object?';
    const actualn = objectNameStrs[otyp]
        || (objectNames[otyp] || '').toLowerCase().replace(/_/g, ' ')
        || 'object?';
    const dn = objectDescrs[ocl.oc_descr_idx ?? otyp] || null;
    const un = ocl.oc_uname || null;
    let nn = !!ocl.oc_name_known;
    let buf = '';

    switch (ocl.oc_class) {
    case COIN_CLASS:
        return actualn;
    case POTION_CLASS:
        buf = 'potion';
        break;
    case SCROLL_CLASS:
        buf = 'scroll';
        break;
    case WAND_CLASS:
        buf = 'wand';
        break;
    case SPBOOK_CLASS: {
        const n = objectNames[otyp] || '';
        if (n !== 'SPE_NOVEL') {
            buf = 'spellbook';
        } else {
            buf = !nn ? 'book' : 'novel';
            nn = false;
        }
        break;
    }
    case RING_CLASS:
        buf = 'ring';
        break;
    case AMULET_CLASS:
        buf = nn ? actualn : 'amulet';
        if (un) buf += ` called ${un}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    case ARMOR_CLASS:
        // pair of / set of deferred (needs oc_armcat / dragon scales)
        // FALLTHROUGH
    default:
        if (nn) {
            buf += actualn;
            // GemStone " stone" deferred
            if (un) buf += ` called ${un}`;
            if (dn) buf += ` (${dn})`;
        } else {
            buf += dn || actualn;
            if (ocl.oc_class === GEM_CLASS) {
                buf += (ocl.oc_material === 21 /* MINERAL */) ? ' stone' : ' gem';
            }
            if (un) buf += ` called ${un}`;
        }
        return buf;
    }
    // ring/scroll/potion/wand/spellbook
    if (nn) {
        if (ocl.oc_unique) buf = actualn;
        else buf += ` of ${actualn}`;
    }
    if (un) buf += ` called ${un}`;
    if (dn) buf += ` (${dn})`;
    return buf;
}
