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
import { PM_SAMURAI } from './generated/monsters_data.js';
import {
    W_ARMOR, W_AMUL, W_RINGL, W_RINGR, W_QUIVER, W_WEP, W_SWAPWEP,
    Has_contents, Is_container, P_BOW, P_CROSSBOW,
} from './const.js';

function Role_if_samurai() {
    return game.urole?.mnum === PM_SAMURAI;
}

/** C ref: obj.h is_ammo — skill window for quiver wording. */
function is_ammo_obj(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== GEM_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

/** C ref: obj.h is_rustprone — iron material. */
function is_rustprone_obj(obj) {
    return (game.objects?.[obj.otyp]?.oc_material ?? 0) === 11; // IRON
}

// C ref: objclass.h enum obj_material_types
const GEMSTONE = 20;
const MINERAL = 21;

/**
 * C ref: objnam.c GemStone(typ) — gems/rocks that append " stone".
 * FLINT always; GEMSTONE material except named crystal exceptions.
 */
function GemStone(typ) {
    if (objectNames[typ] === 'FLINT') return true;
    const mat = game.objects?.[typ]?.oc_material ?? 0;
    if (mat !== GEMSTONE) return false;
    const n = objectNames[typ];
    return n !== 'DILITHIUM_CRYSTAL' && n !== 'RUBY' && n !== 'DIAMOND'
        && n !== 'SAPPHIRE' && n !== 'BLACK_OPAL' && n !== 'EMERALD'
        && n !== 'OPAL';
}

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
    // C ref: objnam.c xname ROCK_CLASS STATUE — "statue of a <pm>"
    if (n === 'STATUE' && obj.corpsenm != null && obj.corpsenm >= 0) {
        const pm = mon_name(obj.corpsenm);
        return `statue of ${an(pm)}`;
    }
    // C: xname potion — "potion of X" when oc_name_known (startup kits are)
    if (n && n.startsWith('POT_')) {
        const rest = n.slice(4).toLowerCase().replace(/_/g, ' ');
        // C: Role_if(PM_SAMURAI) Japanese_item_name for POT_BOOZE → sake
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) return `potion of ${jn}`;
        }
        // C: POT_WATER + bknown + blessed/cursed → "potion of [un]holy water"
        if (n === 'POT_WATER' && obj.bknown && (obj.blessed || obj.cursed)) {
            return `potion of ${obj.blessed ? 'holy' : 'unholy'} water`;
        }
        return `potion of ${rest}`;
    }
    // C ref: objnam.c xname SCROLL_CLASS — "scroll of <actualn>" when known
    if (n && n.startsWith('SCR_')) {
        const actual = objectNameStrs[obj.otyp]
            || n.slice(4).toLowerCase().replace(/_/g, ' ');
        if (obj.dknown && (game.objects?.[obj.otyp]?.oc_name_known || obj.known))
            return `scroll of ${actual}`;
        return 'scroll';
    }
    // C ref: objnam.c xname SPBOOK_CLASS — "spellbook of <actualn>" when known
    if (n && n.startsWith('SPE_')) {
        if (n === 'SPE_NOVEL') return 'book';
        const actual = objectNameStrs[obj.otyp]
            || n.slice(4).toLowerCase().replace(/_/g, ' ');
        if (n === 'SPE_BOOK_OF_THE_DEAD') return actual;
        if (obj.dknown && (game.objects?.[obj.otyp]?.oc_name_known || obj.known))
            return `spellbook of ${actual}`;
        return 'spellbook';
    }
    // C ref: objnam.c xname RING_CLASS — "ring of <actualn>" when known
    if (n && n.startsWith('RIN_')) {
        const actual = objectNameStrs[obj.otyp]
            || n.slice(4).toLowerCase().replace(/_/g, ' ');
        if (obj.dknown && (game.objects?.[obj.otyp]?.oc_name_known || obj.known))
            return `ring of ${actual}`;
        return 'ring';
    }
    // C ref: objnam.c xname WAND_CLASS — "wand of <actualn>" when known
    if (n && n.startsWith('WAN_')) {
        const actual = objectNameStrs[obj.otyp]
            || n.slice(4).toLowerCase().replace(/_/g, ' ');
        if (obj.dknown && (game.objects?.[obj.otyp]?.oc_name_known || obj.known))
            return `wand of ${actual}`;
        return 'wand';
    }
    // C ref: objnam.c xname GEM_CLASS — stone/gem + GemStone " stone"
    if (obj.oclass === GEM_CLASS) {
        const ocl = game.objects?.[obj.otyp];
        const rock = (ocl?.oc_material === MINERAL) ? 'stone' : 'gem';
        const nn = !!(ocl?.oc_name_known);
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : rock);
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        if (!dknown) return rock;
        if (!nn) {
            if (un) return `${rock} called ${un}`;
            return `${dn || 'gray'} ${rock}`;
        }
        if (GemStone(obj.otyp)) return `${actual} stone`;
        return actual;
    }
    let base = PRETTY[n] || (n ? n.toLowerCase().replace(/_/g, ' ') : 'object');
    // C ref: objnam.c xname — Samurai Japanese_item_name overrides actualn
    if (Role_if_samurai()) {
        const jn = Japanese_item_name(obj.otyp, null);
        if (jn) base = jn;
    }
    return base;
}

/**
 * C ref: objnam.c xname — base name with quan pluralization (doname subset).
 */
export function xname(obj) {
    if (!obj) return 'something';
    let base = pretty_base(obj);
    if ((obj.quan || 1) !== 1) base = makeplural(base);
    return base;
}

/**
 * C ref: objnam.c singular — temporarily force quan=1 for naming.
 */
export function singular(obj, func = xname) {
    if (!obj) return func(obj);
    const savequan = obj.quan;
    obj.quan = 1;
    const nam = func(obj);
    obj.quan = savequan;
    return nam;
}

// C ref: objnam.c makeplural — enough for "X of Y" and simple nouns.
function makeplural(s) {
    const of = s.indexOf(' of ');
    if (of > 0) {
        return makeplural(s.slice(0, of)) + s.slice(of);
    }
    // C: "ya" stays "ya" (Samurai bamboo arrows)
    if (s.length === 2 && s.toLowerCase() === 'ya') return s;
    if (s.endsWith(' ya')) return s;
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

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
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

    // C: skip BUC prefix for known holy/unholy water (name encodes BUC)
    const potWaterKnownHoly = oname === 'POT_WATER'
        && !!game.objects?.[otyp]?.oc_name_known
        && (obj.cursed || obj.blessed);
    if (bknown && oclass !== COIN_CLASS && !potWaterKnownHoly) {
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

    // C ref: objnam.c add_erosion_words — rknown + oerodeproof
    if (obj.rknown && obj.oerodeproof) {
        // Branch envelope: rustprone → "rustproof "; other proofs deferred
        if (is_rustprone_obj(obj) || oclass === ARMOR_CLASS || oclass === WEAPON_CLASS) {
            prefix += 'rustproof ';
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
    if (obj.owornmask & W_AMUL)
        bp += ' (being worn)';
    if (obj.owornmask & W_RINGR)
        bp += ' (on right hand)';
    if (obj.owornmask & W_RINGL)
        bp += ' (on left hand)';
    // C ref: objnam.c W_WEP — bimanual → "weapon in hands"; else right/left hand
    if ((obj.owornmask & W_WEP) && quan === 1) {
        const twoweap = !!game.u?.twoweap && obj === game.u?.uwep;
        const right = (game.u?.uhandedness !== 1); // LEFT_HANDED=1
        if (bimanual(obj)) {
            bp += ' (weapon in hands)';
        } else if (twoweap) {
            bp += ` (wielded in ${right ? 'right' : 'left'} hand)`;
        } else {
            bp += ` (weapon in ${right ? 'right' : 'left'} hand)`;
        }
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
    if (obj.owornmask & W_QUIVER) {
        // C ref: objnam.c W_QUIVER — bow ammo → "in quiver"; else "at the ready"
        let Qtyp = 3;
        if (oclass === WEAPON_CLASS) {
            if (!is_ammo_obj(obj)) Qtyp = 3;
            else {
                const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
                Qtyp = (sk !== -P_BOW) ? 2 : 1;
            }
        } else if (oclass === RING_CLASS || oclass === AMULET_CLASS
            || oclass === WAND_CLASS || oclass === COIN_CLASS
            || oclass === GEM_CLASS) {
            Qtyp = 2;
        }
        bp += ` (${Qtyp === 1 ? 'in quiver'
            : Qtyp === 2 ? 'in quiver pouch'
                : 'at the ready'})`;
    }

    if (known && is_charged_otyp(otyp) && oclass === TOOL_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;
    // C ref: objnam.c WAND_CLASS → charges
    if (known && oclass === WAND_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;

    return bp;
}

/**
 * C ref: invent.c xprname(obj, txt, let, dot, cost, quan)
 * Message/prinv paths pass dot=true (trailing period); invent menus omit it.
 */
export function xprname(obj, let_, dot = false) {
    const ilet = let_ ?? obj.invlet ?? '?';
    return `${ilet} - ${doname(obj)}${dot ? '.' : ''}`;
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
 * Covers known + description append + Samurai Japanese_item_name.
 */
export function obj_typename(otyp) {
    const ocl = game.objects?.[otyp];
    if (!ocl) return objectNames[otyp] || 'object?';
    let actualn = objectNameStrs[otyp]
        || (objectNames[otyp] || '').toLowerCase().replace(/_/g, ' ')
        || 'object?';
    let dn = objectDescrs[ocl.oc_descr_idx ?? otyp] || null;
    const un = ocl.oc_uname || null;
    let nn = !!ocl.oc_name_known;

    // C: Role_if(PM_SAMURAI) → Japanese_item_name; harp descr → "koto"
    if (Role_if_samurai()) {
        actualn = Japanese_item_name(otyp, actualn);
        const n = objectNames[otyp];
        if (n === 'WOODEN_HARP' || n === 'MAGIC_HARP') dn = 'koto';
    }
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
            // C ref: objnam.c obj_typename / xname GemStone
            if (GemStone(otyp)) buf += ' stone';
            if (un) buf += ` called ${un}`;
            if (dn) buf += ` (${dn})`;
        } else {
            buf += dn || actualn;
            if (ocl.oc_class === GEM_CLASS) {
                buf += (ocl.oc_material === MINERAL) ? ' stone' : ' gem';
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

/**
 * C ref: o_init.c disco_typename — Samurai Japanese + English in brackets.
 */
export function disco_typename(otyp) {
    let result = obj_typename(otyp);
    if (!Role_if_samurai() || !Japanese_item_name(otyp, null)) return result;
    const ordinary = objectNameStrs[otyp]
        || (objectNames[otyp] || '').toLowerCase().replace(/_/g, ' ')
        || 'object?';
    const n = objectNames[otyp];
    let actualn = ordinary;
    if ((n === 'MAGIC_HARP' || n === 'WOODEN_HARP')
        && !game.objects?.[otyp]?.oc_name_known) {
        actualn = 'harp';
    }
    if (result.includes(' called')) {
        return result.replace(' called', ` [${actualn}] called`);
    }
    if (result.includes(' (')) {
        return result.replace(' (', ` [${actualn}] (`);
    }
    return `${result} [${actualn}]`;
}
