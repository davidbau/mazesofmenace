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
    VENOM_CLASS,
    objectNames,
    objectNameStrs,
    objectDescrs,
} from './objects.js';
import { monsterNames, mons, vegetarian, is_rider } from './monsters.js';
import {
    PM_SAMURAI, PM_CLERIC, PM_LICHEN, PM_ACID_BLOB,
} from './generated/monsters_data.js';
import {
    W_ARMOR, W_AMUL, W_RINGL, W_RINGR, W_QUIVER, W_WEP, W_SWAPWEP,
    Has_contents, Is_container, Is_box, P_NONE, P_BOW, P_CROSSBOW, P_SHURIKEN,
    P_DART, P_BOOMERANG,
    OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    ROTTEN_TIN, HOMEMADE_TIN, SPINACH_TIN, ismnum,
} from './const.js';

const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');

/**
 * C ref: eat.c tintxts[] — variety adjectives (TTSZ-1 fodder entries + "").
 * Only txt is needed for display naming.
 */
const tintxts = [
    { txt: 'rotten' },
    { txt: 'homemade' },
    { txt: 'soup made from' },
    { txt: 'french fried' },
    { txt: 'pickled' },
    { txt: 'boiled' },
    { txt: 'smoked' },
    { txt: 'dried' },
    { txt: 'deep fried' },
    { txt: 'szechuan' },
    { txt: 'broiled' },
    { txt: 'stir fried' },
    { txt: 'sauteed' },
    { txt: 'candied' },
    { txt: 'pureed' },
    { txt: '' },
];

/** C ref: eat.c nonrotting_corpse — local copy (objnam↔eat cycle). */
function nonrotting_corpse_tin(mnum) {
    if (mnum === PM_LIZARD || mnum === PM_LICHEN || mnum === PM_ACID_BLOB) {
        return true;
    }
    return is_rider(mons(mnum));
}

/**
 * C ref: eat.c tin_variety(obj, TRUE) — display path only (no rn2 side
 * effects). Named omission: non-display tin_variety RNG when spe>=0.
 */
function tin_variety_display(obj) {
    let r;
    const mnum = obj.corpsenm;
    const spe = obj.spe | 0;
    if (spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN;
    } else if (spe < 0) {
        r = -spe;
        --r;
    } else {
        // C: rn2(TTSZ-1) when displ; unused below when spe>=0 (no tintxt).
        r = HOMEMADE_TIN;
    }
    if (r === ROTTEN_TIN && ismnum(mnum) && nonrotting_corpse_tin(mnum)) {
        r = HOMEMADE_TIN;
    }
    return r;
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

function Role_if_samurai() {
    return Role_if(PM_SAMURAI);
}

const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');

/** C ref: obj.h is_ammo — skill window for quiver wording / W_WEP. */
function is_ammo_obj(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== GEM_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

/** C ref: obj.h is_missile — W_WEP "(wielded)" vs hand phrasing. */
function is_missile_obj(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_BOOMERANG && sk <= -P_DART;
}

/**
 * C ref: obj.h is_poisonable — missile skill window (permapoisoned deferred).
 */
function is_poisonable_obj(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_SHURIKEN && sk <= -P_BOW;
}

// C ref: objclass.h enum obj_material_types (subset for erosion naming)
const MAT_LIQUID = 1;
const MAT_WOOD = 8;
const MAT_DRAGON_HIDE = 10;
const MAT_IRON = 11;
const MAT_COPPER = 13;
const MAT_PLASTIC = 18;
const MAT_GLASS = 19;

/** C ref: objclass.h is_rustprone — iron material. */
function is_rustprone_obj(obj) {
    return (game.objects?.[obj.otyp]?.oc_material ?? 0) === MAT_IRON;
}

/** C ref: mkobj.c is_flammable — local copy (objnam↔mkobj cycle). */
function is_flammable_obj(obj) {
    const n = objectNames[obj.otyp];
    if (n === 'TALLOW_CANDLE' || n === 'WAX_CANDLE' || n === 'WAN_FIRE') return false;
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    return (mat <= MAT_WOOD && mat !== MAT_LIQUID) || mat === MAT_PLASTIC;
}

/** C ref: mkobj.c is_rottable — local copy. */
function is_rottable_obj(obj) {
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    return (mat <= MAT_WOOD && mat !== MAT_LIQUID) || mat === MAT_DRAGON_HIDE;
}

/** C ref: objclass.h is_corrodeable — local copy. */
function is_corrodeable_obj(obj) {
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    return mat === MAT_COPPER || mat === MAT_IRON;
}

/** C ref: objclass.h is_crackable — glass armor only. */
function is_crackable_obj(obj) {
    return (game.objects?.[obj.otyp]?.oc_material ?? 0) === MAT_GLASS
        && obj.oclass === ARMOR_CLASS;
}

/** C ref: objclass.h is_damageable. */
function is_damageable_obj(obj) {
    return is_rustprone_obj(obj) || is_flammable_obj(obj) || is_rottable_obj(obj)
        || is_corrodeable_obj(obj) || is_crackable_obj(obj);
}

/**
 * C ref: objnam.c add_erosion_words — oeroded/oeroded2 degrees + rknown proof.
 * Returns prefix fragment (may be empty). Caller gates by oclass.
 */
function add_erosion_words(obj) {
    const iscrys = objectNames[obj.otyp] === 'CRYSKNIFE';
    // C: rknown = (iflags.override_ID == 0) ? obj->rknown : TRUE
    const rknown = (game.iflags?.override_ID | 0) === 0 ? !!obj.rknown : true;
    if (!is_damageable_obj(obj) && !iscrys) return '';

    let s = '';
    const er = obj.oeroded | 0;
    if (er && !iscrys) {
        if (er === 2) s += 'very ';
        else if (er === 3) s += 'thoroughly ';
        s += is_rustprone_obj(obj) ? 'rusty '
            : is_crackable_obj(obj) ? 'cracked '
                : 'burnt ';
    }
    const er2 = obj.oeroded2 | 0;
    if (er2 && !iscrys) {
        if (er2 === 2) s += 'very ';
        else if (er2 === 3) s += 'thoroughly ';
        s += is_corrodeable_obj(obj) ? 'corroded ' : 'rotted ';
    }
    if (rknown && obj.oerodeproof) {
        s += iscrys ? 'fixed '
            : is_rustprone_obj(obj) ? 'rustproof '
                : is_corrodeable_obj(obj) ? 'corrodeproof '
                    : is_flammable_obj(obj) ? 'fireproof '
                        : is_crackable_obj(obj) ? 'tempered '
                            : is_rottable_obj(obj) ? 'rotproof '
                                : '';
    }
    return s;
}

// C ref: objclass.h enum obj_material_types
const GEMSTONE = 20;
const MINERAL = 21;

// C ref: objclass.h ARM_* — oc_skill / oc_subtyp / oc_armcat for armor
const ARM_SHIELD = 1;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;

// C ref: objects.h dragon scales window used by xname / obj_typename
const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const ELVEN_SHIELD = objectNames.indexOf('ELVEN_SHIELD');
const ORCISH_SHIELD = objectNames.indexOf('ORCISH_SHIELD');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');

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

// Tools/weapons/wands/charged-rings that use oc_charged-style display.
// C: objects[].oc_charged — WEAPON() macros set chrg=1; generated table
// omits the bit, so ring/tool names are listed explicitly (objects.h RING
// `spec` / TOOL charged).
function is_charged_otyp(otyp) {
    const n = objectNames[otyp];
    const oc = game.objects?.[otyp];
    if (oc?.oc_charged) return true;
    // All WEAPON_CLASS entries from objects.h WEAPON/PROJECTILE/BOW are charged
    if ((oc?.oc_class ?? 0) === WEAPON_CLASS) return true;
    if (n === 'DART' || n === 'SHURIKEN' || n === 'BOOMERANG'
        || n === 'EXPENSIVE_CAMERA' || n === 'MAGIC_MARKER'
        || n === 'CRYSTAL_BALL'
        // C objects.h TOOL/CONTAINER chg=1 (generated table omits oc_charged)
        || n === 'TINNING_KIT' || n === 'CAN_OF_GREASE' || n === 'BAG_OF_TRICKS'
        || n === 'MAGIC_FLUTE' || n === 'FROST_HORN' || n === 'FIRE_HORN'
        || n === 'HORN_OF_PLENTY' || n === 'MAGIC_HARP'
        || n === 'DRUM_OF_EARTHQUAKE'
        // C WEPTOOL BITS(..., chg=1, ...) — BUC/implicit_uncursed; doname
        // remaps to WEAPON_CLASS for +spe (not (recharged:spe))
        || n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN')
        return true;
    // Wands always show (recharged:spe) when known (C: WAND_CLASS → charges)
    if (oc?.oc_class === WAND_CLASS) return true;
    if (n && n.startsWith('WAN_')) return true;
    // C objects.h RING(..., spec=1, ...) → oc_charged
    if (n === 'RIN_ADORNMENT'
        || n === 'RIN_GAIN_STRENGTH'
        || n === 'RIN_GAIN_CONSTITUTION'
        || n === 'RIN_INCREASE_ACCURACY'
        || n === 'RIN_INCREASE_DAMAGE'
        || n === 'RIN_PROTECTION')
        return true;
    return false;
}

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE (named fallback). */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    if (sk != null && sk !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN';
}

function uses_known_otyp(otyp) {
    const oc = game.objects?.[otyp];
    if (oc?.oc_uses_known) return true;
    const cls = oc?.oc_class ?? 0;
    if (cls === WEAPON_CLASS || cls === ARMOR_CLASS || is_charged_otyp(otyp))
        return true;
    // C objects.h FOOD(..., unk=1, ...) → oc_uses_known; generated table
    // omits the bit (same debt as D-0316 WAND). Egg/tin contents stay
    // hidden until obj.known (open/eat / starter ini_inv).
    const n = objectNames[otyp];
    if (n === 'TIN' || n === 'EGG') return true;
    return false;
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
 * C ref: eat.c tin_details() — spinach / empty / tintxts + meat/veg.
 * Caller must already have decided known (C: xname_flags FOOD TIN && known).
 * Assumes result replaces the bare word "tin" (C mutates buf that holds it).
 */
function tin_details(obj) {
    const r = tin_variety_display(obj);
    if (r === SPINACH_TIN) return 'tin of spinach';
    const mnum = obj.corpsenm;
    if (mnum == null || mnum < 0) return 'empty tin';

    // C: (cknown || iflags.override_ID) && spe < 0 → tintxt adjective
    const showVariety = !!(obj.cknown || game.iflags?.override_ID)
        && (obj.spe | 0) < 0;
    let buf = 'tin';
    if (showVariety) {
        const txt = tintxts[r]?.txt ?? '';
        if (r === ROTTEN_TIN || r === HOMEMADE_TIN) {
            // put before the word tin: "homemade tin of "
            buf = `${txt} ${buf} of `;
        } else {
            buf = `${buf} of ${txt} `;
        }
    } else {
        buf = `${buf} of `;
    }
    const mname = mon_name(mnum);
    // C: vegetarian(&mons[mnum]) omits " meat"
    if (vegetarian(mons(mnum))) return buf + mname;
    return `${buf}${mname} meat`;
}

function pretty_base(obj) {
    const n = objectNames[obj.otyp];
    // C ref: objnam.c xname_flags FOOD_CLASS — Concat(actualn);
    // if (typ == TIN && known) tin_details(...). Unidentified → bare "tin".
    if (n === 'TIN') return obj.known ? tin_details(obj) : 'tin';
    // C: corpse → "<monster> corpse" when corpsenm known
    if (n === 'CORPSE' && obj.corpsenm != null && obj.corpsenm >= 0)
        return `${mon_name(obj.corpsenm)} corpse`;
    // C ref: objnam.c xname ROCK_CLASS STATUE — "statue of a <pm>"
    if (n === 'STATUE' && obj.corpsenm != null && obj.corpsenm >= 0) {
        const pm = mon_name(obj.corpsenm);
        return `statue of ${an(pm)}`;
    }
    // C ref: objnam.c xname POTION_CLASS — known → "potion of X";
    // dknown+!nn → "<descr> potion"; !dknown → "potion"
    // nn is objects[].oc_name_known only (not obj.known).
    if (obj.oclass === POTION_CLASS || (n && n.startsWith('POT_'))) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.slice(4).toLowerCase().replace(/_/g, ' ') : 'potion');
        // C: Role_if(PM_SAMURAI) Japanese_item_name for POT_BOOZE → sake
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        let buf = '';
        if (dknown && obj.odiluted) buf = 'diluted ';
        if (nn || un || !dknown) {
            buf += 'potion';
            if (!dknown) return buf;
            if (nn) {
                // C: POT_WATER + bknown + blessed/cursed → "[un]holy water"
                if (n === 'POT_WATER' && obj.bknown && (obj.blessed || obj.cursed)) {
                    return `${buf} of ${obj.blessed ? 'holy' : 'unholy'} water`;
                }
                return `${buf} of ${actual}`;
            }
            // called-name: "potion called foo"
            return un ? `${buf} called ${un}` : buf;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || 'clear';
        return `${buf}${dn} potion`;
    }
    // C ref: objnam.c xname_flags SCROLL_CLASS —
    // !dknown → "scroll"; nn → "scroll of <actualn>"; un → "scroll called …";
    // oc_magic → "scroll labeled <dn>"; else "<dn> scroll" (blank paper → unlabeled).
    // nn is objects[].oc_name_known only (not obj.known).
    if (obj.oclass === SCROLL_CLASS || (n && n.startsWith('SCR_'))) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.slice(4).toLowerCase().replace(/_/g, ' ') : 'scroll');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        if (!dknown) return 'scroll';
        if (nn) return `scroll of ${actual}`;
        if (un) return `scroll called ${un}`;
        if (ocl?.oc_magic) return `scroll labeled ${dn || 'something'}`;
        return `${dn || 'unlabeled'} scroll`;
    }
    // C ref: objnam.c xname_flags SPBOOK_CLASS —
    // !dknown → "spellbook"; nn → "spellbook of <actualn>" (BOTD bare);
    // un → called; else "<dn> spellbook". nn = oc_name_known only (not obj.known).
    if (obj.oclass === SPBOOK_CLASS || (n && n.startsWith('SPE_'))) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.slice(4).toLowerCase().replace(/_/g, ' ') : 'spellbook');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || actual;
        if (n === 'SPE_NOVEL') {
            // C: SPE_NOVEL tribute arms (partial — hallu/called polish deferred)
            if (!dknown) return 'book';
            if (nn) return actual;
            if (un) return `novel called ${un}`;
            return `${dn} book`;
        }
        if (!dknown) return 'spellbook';
        if (nn) {
            if (n === 'SPE_BOOK_OF_THE_DEAD') return actual;
            return `spellbook of ${actual}`;
        }
        if (un) return `spellbook called ${un}`;
        return `${dn} spellbook`;
    }
    // C ref: objnam.c xname_flags RING_CLASS —
    // !dknown → "ring"; nn → "ring of <actualn>"; un → called; else "<dn> ring".
    // nn is objects[].oc_name_known only (not obj.known — that is spe/charge).
    if (obj.oclass === RING_CLASS || (n && n.startsWith('RIN_'))) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.slice(4).toLowerCase().replace(/_/g, ' ') : 'ring');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        if (!dknown) return 'ring';
        if (nn) return `ring of ${actual}`;
        if (un) return `ring called ${un}`;
        return `${dn || 'strange'} ring`;
    }
    // C ref: objnam.c xname WAND_CLASS —
    // !dknown → "wand"; nn → "wand of <actualn>"; un → called; else "<descr> wand"
    // nn is objects[].oc_name_known only (not obj.known).
    if (obj.oclass === WAND_CLASS || (n && n.startsWith('WAN_'))) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.slice(4).toLowerCase().replace(/_/g, ' ') : 'wand');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        if (!dknown) return 'wand';
        if (nn) return `wand of ${actual}`;
        if (un) return `wand called ${un}`;
        return `${dn || 'iron'} wand`;
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
    // C ref: objnam.c xname AMULET_CLASS —
    // !dknown → "amulet"; Yendor/fake → known?actualn:dn;
    // nn → actualn; un → "amulet called …"; else "<descr> amulet"
    if (obj.oclass === AMULET_CLASS) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const known = !!obj.known;
        const un = ocl?.oc_uname || null;
        let actual = objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'amulet');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        const dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || actual;
        if (!dknown) return 'amulet';
        if (obj.otyp === AMULET_OF_YENDOR || obj.otyp === FAKE_AMULET_OF_YENDOR) {
            return known ? actual : dn;
        }
        if (nn) return actual;
        if (un) return `amulet called ${un}`;
        return `${dn} amulet`;
    }
    // C ref: objnam.c xname WEAPON/VENOM/TOOL —
    // !dknown|!nn → dn (OBJ_DESCR else actualn); nn → actualn; un → called.
    // Shared descrs (tin/magic whistle → "whistle") need !oc_name_known.
    if (obj.oclass === WEAPON_CLASS || obj.oclass === VENOM_CLASS
        || obj.oclass === TOOL_CLASS) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = PRETTY[n] || objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'object');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        let dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        if (!dn) dn = actual;
        if (Role_if_samurai() && (n === 'WOODEN_HARP' || n === 'MAGIC_HARP'))
            dn = 'koto';
        let buf = '';
        // C: WEAPON_CLASS only — is_poisonable && opoisoned → "poisoned "
        // before VENOM/TOOL fallthrough (lenses/towel would overwrite).
        // Named omission: wet-towel moist/wet; figurine " of <pm>";
        // ConcUpdate; permapoisoned.
        if (obj.oclass === WEAPON_CLASS
            && is_poisonable_obj(obj) && obj.opoisoned) {
            buf = 'poisoned ';
        }
        if (n === 'LENSES') buf = 'pair of ';
        if (!dknown) buf += dn;
        else if (nn) buf += actual;
        else if (un) buf += `${dn} called ${un}`;
        else buf += dn;
        return buf;
    }
    // C ref: objnam.c xname_flags ARMOR_CLASS —
    // dragon scales → "set of <actualn>"; boots|gloves → "pair of " + fallthru;
    // shield !dknown → elven…orcish "shield" / reflection "smooth shield";
    // nn → actualn; un → "<simple> called …" (armor_simple_name deferred → dn);
    // else → dn (OBJ_DESCR). Shared descrs need !oc_name_known (orcish helm).
    if (obj.oclass === ARMOR_CLASS) {
        const ocl = game.objects?.[obj.otyp];
        const nn = !!ocl?.oc_name_known;
        const dknown = !!obj.dknown;
        const un = ocl?.oc_uname || null;
        let actual = PRETTY[n] || objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'object');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        let dn = objectDescrs[ocl?.oc_descr_idx ?? obj.otyp] || null;
        if (!dn) dn = actual;
        const typ = obj.otyp;
        if (typ >= GRAY_DRAGON_SCALES && typ <= YELLOW_DRAGON_SCALES) {
            return `set of ${actual}`;
        }
        const armcat = ocl?.oc_skill ?? -1;
        let buf = '';
        if (armcat === ARM_BOOTS || armcat === ARM_GLOVES) {
            buf = 'pair of ';
        } else if (armcat === ARM_SHIELD && !dknown) {
            if (typ >= ELVEN_SHIELD && typ <= ORCISH_SHIELD) return 'shield';
            if (typ === SHIELD_OF_REFLECTION) return 'smooth shield';
        }
        if (nn) buf += actual;
        else if (un) buf += `${dn} called ${un}`; // named omit: armor_simple_name
        else buf += dn;
        return buf;
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
 * C xname_flags: observe_object when !Blind && !gd.distantname (D-0469).
 * Distant formatting must go through distant_name so the flag suppresses
 * discovery; map generic glyphs still observe via display.map_object.
 * C: xname omits monster type for CORPSE ("corpse"); cxname/doname use
 * corpse_xname — pretty_base still carries mon name for doname.
 */
export function xname(obj) {
    if (!obj) return 'something';
    // C: Role_if(PM_CLERIC) → obj->bknown = 1 (bypass set_bknown / invent update)
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    // C: if (!Blind && !gd.distantname) observe_object(obj);
    if (!game.u?.Blind && !(game.distantname | 0) && _xname_observe) {
        _xname_observe(obj);
    }
    const n = objectNames[obj.otyp];
    if (n === 'CORPSE') {
        let base = 'corpse';
        if ((obj.quan || 1) !== 1) base = makeplural(base);
        return base;
    }
    // C: obj_is_pname → goto nameit (bare ONAME) — deferred; partial ID
    // artifacts fall through to actualn + " named ONAME" below.
    let base = pretty_base(obj);
    if ((obj.quan || 1) !== 1) base = makeplural(base);
    // C xname_flags: has_oname && dknown → " named " ONAME
    const onameStr = obj.oextra?.oname;
    if (onameStr && obj.dknown) {
        base += ` named ${onameStr}`;
        // C: artifact "The …" → downcase leading T — deferred
    }
    return base;
}

/**
 * C ref: objnam.c distant_name — format via func; near+cansee uses ordinary
 * xname/doname (observe side-effects); far sets gd.distantname.
 * Named omissions: gameover o_id wipe; artifact find via near path only
 * covered by observe/dknown; get_obj_location buried.
 */
export function distant_name(obj, func) {
    if (!obj || typeof func !== 'function') return func ? func(obj) : '';
    const loc = get_obj_loc_for_distant(obj);
    const canSeeLoc = loc && cansee_xy(loc.x, loc.y);
    const near = canSeeLoc && (obj.oartifact || distu_xy(loc.x, loc.y) <= object_neardist());
    if (near) {
        return func(obj);
    }
    game.distantname = (game.distantname | 0) + 1;
    try {
        return func(obj);
    } finally {
        game.distantname = (game.distantname | 0) - 1;
    }
}

/** C ref: display.c / distant_name neardist = (r*r)*2 - r, r = max(xray,2). */
function object_neardist() {
    const xr = game.u?.xray_range | 0;
    const r = xr > 2 ? xr : 2;
    return (r * r) * 2 - r;
}

function distu_xy(x, y) {
    const u = game.u;
    const dx = (x | 0) - (u?.ux | 0);
    const dy = (y | 0) - (u?.uy | 0);
    return dx * dx + dy * dy;
}

function cansee_xy(x, y) {
    return !!_distant_cansee?.(x, y);
}

/**
 * Floor / invent / minvent location for distant_name (zap.c get_obj_location
 * subset, locflags=0 — no buried/contained).
 */
function get_obj_loc_for_distant(obj) {
    if (!obj) return null;
    const where = obj.where;
    if (where === OBJ_INVENT || where === 'INVENT') {
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    }
    if (where === OBJ_FLOOR || where === 'FLOOR') {
        return { x: obj.ox | 0, y: obj.oy | 0 };
    }
    if (where === OBJ_MINVENT || where === 'MINVENT') {
        const mon = obj.ocarry;
        if (mon?.mx) return { x: mon.mx | 0, y: mon.my | 0 };
    }
    return null;
}

/**
 * C ref: objnam.c corpse_xname — "<monster> corpse" (CXN_SINGULAR / article deferred).
 */
function corpse_xname(obj, _adjective, singular) {
    const omndx = obj?.corpsenm;
    const mnam = (omndx == null || omndx < 0) ? 'thing' : mon_name(omndx);
    let base = `${mnam} corpse`;
    if (!singular && (obj.quan || 1) !== 1) base = makeplural(base);
    return base;
}

/**
 * C ref: objnam.c cxname — corpse_xname for CORPSE, else xname.
 */
export function cxname(obj) {
    if (obj && objectNames[obj.otyp] === 'CORPSE') {
        return corpse_xname(obj, null, false);
    }
    return xname(obj);
}

/**
 * C ref: objnam.c cxname_singular — ignore quantity (sortloot / loot_xname).
 */
export function cxname_singular(obj) {
    if (obj && objectNames[obj.otyp] === 'CORPSE') {
        return corpse_xname(obj, null, true);
    }
    if (!obj) return xname(obj);
    const saveq = obj.quan;
    obj.quan = 1;
    const nam = xname(obj);
    obj.quan = saveq;
    return nam;
}

/**
 * C ref: objnam.c the() — definite article for non-proper names.
 * Named omissions: CapitalMon, fruit_from_name, artifact "of"/named arms,
 * Platinum Yendorian Express Card special-case.
 */
export function the(str) {
    if (!str) return 'the []';
    if (/^the /i.test(str)) {
        return `the${str.slice(3)}`;
    }
    const c0 = str.charCodeAt(0);
    // lowercase / non-A–Z → always "the "
    if (c0 < 65 || c0 > 90) return `the ${str}`;
    // Capitalized: insert "the" when last word/hyphen segment is lowercase
    // (Unique's corpse apostrophe → no article). Full CapitalMon deferred.
    const sp = str.lastIndexOf(' ');
    const hy = str.lastIndexOf('-');
    const tmp = Math.max(sp, hy);
    if (tmp >= 0) {
        const next = str.charCodeAt(tmp + 1);
        if (next < 65 || next > 90) {
            if (!str.includes("'")) return `the ${str}`;
        } else if (sp >= 0 && sp < tmp) {
            const of = str.toLowerCase().indexOf(' of ');
            const named = str.toLowerCase().indexOf(' named ');
            const called = str.toLowerCase().indexOf(' called ');
            let namedAt = named >= 0 ? named : -1;
            if (called >= 0 && (namedAt < 0 || called < namedAt)) namedAt = called;
            if (of >= 0 && (namedAt < 0 || of < namedAt)) return `the ${str}`;
        }
    }
    return str;
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
// C ref: objnam.c one_off[] — irregular sing↔plur (word or suffix).
const ONE_OFF_PLURALS = [
    ['child', 'children'],
    ['cubus', 'cubi'],
    ['culus', 'culi'],
    ['Cyclops', 'Cyclopes'],
    ['djinni', 'djinn'],
    ['erinys', 'erinyes'],
    ['foot', 'feet'],
    ['fungus', 'fungi'],
    ['goose', 'geese'],
    ['knife', 'knives'],
    ['labrum', 'labra'],
    ['louse', 'lice'],
    ['mouse', 'mice'],
    ['mumak', 'mumakil'],
    ['nemesis', 'nemeses'],
    ['ovum', 'ova'],
    ['ox', 'oxen'],
    ['passerby', 'passersby'],
    ['rtex', 'rtices'],
    ['serum', 'sera'],
    ['staff', 'staves'],
    ['tooth', 'teeth'],
];

/**
 * C ref: objnam.c makeplural — irregular one_off + compound "of" + ya.
 * Named omissions: pronoun genders; already_plural ae/eaux; man→men;
 * as_is collective; singplur_lookup mongoose/slice edges;
 * full case-preserve polish beyond matched-suffix first letter.
 */
export function makeplural(s) {
    if (s == null || s === '') return 's';
    while (s.startsWith(' ')) s = s.slice(1);
    // C: skip "pair of " → keep as-is (objects use collective "pair")
    if (/^pair of /i.test(s)) return s;
    const of = s.indexOf(' of ');
    if (of > 0) {
        return makeplural(s.slice(0, of)) + s.slice(of);
    }
    // C: "ya" stays "ya" (Samurai bamboo arrows)
    if (s.length === 2 && s.toLowerCase() === 'ya') return s;
    if (s.endsWith(' ya')) return s;

    // C: fox → foxes (not oxen); muskox still reaches one_off ox→oxen
    const lower = s.toLowerCase();
    if (lower.length > 2 && lower.endsWith('ox')
        && !(lower.length > 5 && lower.endsWith('muskox'))) {
        return s + 'es';
    }

    for (const [sing, plur] of ONE_OFF_PLURALS) {
        const sl = sing.toLowerCase();
        // C singplur_lookup: suffix match on one_off; "ox" alone is len 2
        if (lower === sl || lower.endsWith(sl)) {
            const stem = s.slice(0, s.length - sing.length);
            const matched = s.slice(s.length - sing.length);
            let pl = plur;
            if (matched[0] >= 'A' && matched[0] <= 'Z') {
                pl = plur[0].toUpperCase() + plur.slice(1);
            }
            return stem + pl;
        }
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
    const s = str.slice(i);
    if (!s) return 'a ';
    const c0 = s[0].toLowerCase();
    // C: single letter OR letter+' ' (fruit / musical note) → aefhilmnosx
    if (!s[1] || s[1] === ' ') {
        return 'aefhilmnosx'.includes(c0) ? 'an ' : 'a ';
    }
    // C: "the "/lava/bars/ice → no article (doname paths deferred for most)
    if (/^the /i.test(s) || /^molten lava$/i.test(s)
        || /^iron bars$/i.test(s) || /^ice$/i.test(s)) {
        return '';
    }
    // normal vowel/consonant; named omissions: one-/eu-/uke-/unicorn exceptions
    return 'aeiou'.includes(c0) ? 'an ' : 'a ';
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
    // C ref: objnam.c vtense — plural verb → 3rd-person present for subject.
    // Plural if ends in 's' (not *us/*ss); a/an prefix → singular; else singular.
    // C: null subj → singular 3rd-person (special case; do not return raw verb).
    let plural = false;
    if (subj) {
        if (/^a /i.test(subj) || /^an /i.test(subj)) {
            plural = false;
        } else {
            const len = subj.length;
            const spot = len ? subj[len - 1].toLowerCase() : '';
            const prev = len > 1 ? subj[len - 2].toLowerCase() : '';
            // C: ends in 's' and not *us/*ss → plural
            plural = spot === 's' && len > 1 && prev !== 'u' && prev !== 's';
        }
        if (plural) return verb;
    }
    // singular (incl. null subj)
    if (verb === 'are') return 'is';
    if (verb === 'have') return 'has';
    if (verb.endsWith('y') && verb.length > 1 && !'aeiou'.includes(verb[verb.length - 2]))
        return verb.slice(0, -1) + 'ies';
    if (verb.endsWith('s') || verb.endsWith('x') || verb.endsWith('ch') || verb.endsWith('sh')
        || verb.endsWith('z') || verb.endsWith('o'))
        return verb + 'es';
    return verb + 's';
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/**
 * Late-bound from shk.js — C doname_base unpaid / (with_price) shop suffix.
 * Avoids static objnam↔shk import cycle (shk already imports doname).
 */
let _doname_shop_suffix = null;
export function set_doname_shop_suffix(fn) {
    _doname_shop_suffix = fn;
}

/**
 * Late-bound from invent.js — C xname_flags observe_object.
 * Avoids static objnam↔invent cycle (invent imports doname/xname).
 */
let _xname_observe = null;
export function set_xname_observe(fn) {
    _xname_observe = fn;
}

/** Late-bound cansee for distant_name (vision↔objnam cycle). */
let _distant_cansee = null;
export function set_distant_cansee(fn) {
    _distant_cansee = fn;
}

/**
 * C ref: objnam.c the_unique_obj — "the unique_item" vs "a unique_item".
 * Named omissions: iflags.override_ID ID-reveal paths.
 */
export function the_unique_obj(obj) {
    if (!obj) return false;
    const known = !!(obj.known || game.iflags?.override_ID);
    if (!obj.dknown && !game.iflags?.override_ID) return false;
    if (obj.otyp === FAKE_AMULET_OF_YENDOR && !known) return true; // lie
    const ocl = game.objects?.[obj.otyp];
    return !!(ocl?.oc_unique && (known || obj.otyp === AMULET_OF_YENDOR));
}

/**
 * C ref: objnam.c obj_is_pname — fully identified artifact with oname.
 * Named omissions: program_state.gameover; full not_fully_identified.
 */
export function obj_is_pname(obj) {
    if (!obj?.oartifact || !obj.oextra?.oname) return false;
    if (!game.program_state?.gameover && !game.iflags?.override_ID) {
        // not_fully_identified subset: known + dknown + bknown
        if (!obj.known || !obj.dknown || !obj.bknown) return false;
    }
    return true;
}

/**
 * C ref: objnam.c doname() — invent-kit subset (Tourist/Rogue starter lines).
 * C doname_base starts with xname(obj), which forces cleric bknown before
 * the BUC prefix is read; JS doname uses pretty_base so apply the same force.
 */
export function doname(obj) {
    if (!obj) return 'something';

    // C: xname Role_if(PM_CLERIC) obj->bknown=1 before doname_base reads it
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    // C: doname_base → xname → observe_object when !Blind && !distantname
    if (!game.u?.Blind && !(game.distantname | 0) && _xname_observe) {
        _xname_observe(obj);
    }
    const otyp = obj.otyp;
    const oclass = obj.oclass;
    // C doname_base: switch (is_weptool(obj) ? WEAPON_CLASS : obj->oclass)
    const donameClass = is_weptool(obj) ? WEAPON_CLASS : oclass;
    const known = !!obj.known;
    const bknown = !!obj.bknown;
    const quan = obj.quan || 1;
    let base = pretty_base(obj);
    // C doname_base: xname may start with "poisoned "; strip into prefix
    // so order is article/BUC/poisoned/erosion/spe + bare name.
    let ispoisoned = false;
    if (base.startsWith('poisoned ') && obj.opoisoned) {
        base = base.slice(9);
        ispoisoned = true;
    }
    if (quan !== 1) base = makeplural(base);

    // C ref: objnam.c doname_base — COIN_CLASS uses the same quan/article
    // path as other objects ("a gold piece", "25 gold pieces"), not a bare
    // numeric string. xname for coins is just "gold piece".
    // Article: quan / the_unique_obj|obj_is_pname → "the " / else "a "
    // (then just_an redo). C skips article for CORPSE (corpse_xname owns
    // it) — deferred until callers stop relying on doname's "a "/"an ".
    // Slime-mold fake_arti deferred.
    let prefix = '';
    if (quan !== 1) {
        prefix = `${quan} `;
    } else if (obj_is_pname(obj) || the_unique_obj(obj)) {
        if (/^the /i.test(base)) base = base.slice(4);
        prefix = 'the ';
    } else {
        prefix = 'a ';
    }

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
            // known && oc_charged && not armor/ring (identified +/- implies BUC),
            // or always for clerics / real|fake Amulet of Yendor.
            const charged = is_charged_otyp(otyp);
            const implicit = game.flags?.implicit_uncursed !== false;
            const showUncursed = !implicit
                || ((!known || !charged
                    || oclass === ARMOR_CLASS
                    || oclass === RING_CLASS)
                    && otyp !== FAKE_AMULET_OF_YENDOR
                    && otyp !== AMULET_OF_YENDOR
                    && !Role_if(PM_CLERIC));
            if (showUncursed) prefix += 'uncursed ';
        }
    }

    // C ref: objnam.c doname_base — box trap/lock prefixes (before greased)
    if (Is_box(obj) && obj.otrapped && obj.tknown && obj.dknown) {
        prefix += 'trapped ';
    }
    if (obj.lknown && Is_box(obj)) {
        if (obj.obroken) prefix += 'broken ';
        else if (obj.olocked) prefix += 'locked ';
        else prefix += 'unlocked ';
    }

    // C: WEAPON_CLASS (incl. weptool remap) — poisoned before erosion/spe
    if (donameClass === WEAPON_CLASS && ispoisoned) prefix += 'poisoned ';

    // C ref: objnam.c doname_base — ARMOR falls through to WEAPON for
    // add_erosion_words + spe; BALL/CHAIN also call add_erosion_words.
    if (donameClass === WEAPON_CLASS || donameClass === ARMOR_CLASS) {
        prefix += add_erosion_words(obj);
    }

    if (known && (donameClass === WEAPON_CLASS || donameClass === ARMOR_CLASS
        || (donameClass === RING_CLASS && is_charged_otyp(otyp)))) {
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

    // C: doname_base — cknown && Has_contents → " containing %ld item%s"
    // invent.c count_contents(obj, FALSE, FALSE, TRUE, FALSE): separate
    // stacks, no nest. Inline to avoid invent↔objnam import cycle.
    if (obj.cknown && Has_contents(obj)) {
        let itemcount = 0;
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) itemcount += 1;
        bp += ` containing ${itemcount} item${itemcount !== 1 ? 's' : ''}`;
    }

    if (oclass === ARMOR_CLASS && (obj.owornmask & W_ARMOR))
        bp += ' (being worn)';
    if (obj.owornmask & W_AMUL)
        bp += ' (being worn)';
    if (obj.owornmask & W_RINGR)
        bp += ' (on right hand)';
    if (obj.owornmask & W_RINGL)
        bp += ' (on left hand)';
    // C ref: objnam.c doname_base W_WEP — stack/ammo/missile/non-weptool →
    // "(wielded)"; else "weapon in"/"wielded in" hand(s). mrg_to_wielded,
    // AKLYS tethered, warn_obj/artifact_light paren rewrite deferred.
    if (obj.owornmask & W_WEP) {
        const twoweap_primary = !!(obj === game.u?.uwep && game.u?.twoweap);
        const alt_wielded = (quan !== 1
            || ((oclass === WEAPON_CLASS)
                ? (is_ammo_obj(obj) || is_missile_obj(obj))
                : !is_weptool(obj)))
            && !twoweap_primary;
        if (alt_wielded) {
            bp += ' (wielded)';
        } else {
            const right = (game.u?.uhandedness !== 1); // LEFT_HANDED=1
            if (bimanual(obj)) {
                bp += ' (weapon in hands)';
            } else if (twoweap_primary) {
                bp += ` (wielded in ${right ? 'right' : 'left'} hand)`;
            } else {
                bp += ` (weapon in ${right ? 'right' : 'left'} hand)`;
            }
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

    // C TOOL_CLASS charges — weptools remapped to WEAPON so they get +spe
    if (known && is_charged_otyp(otyp) && donameClass === TOOL_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;
    // C ref: objnam.c WAND_CLASS → charges
    if (known && donameClass === WAND_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;

    // C doname_base: is_unpaid → unpaid_cost suffix (D-0461); with_price=0
    if (_doname_shop_suffix) bp = _doname_shop_suffix(obj, bp, false);
    return bp;
}

/**
 * C ref: objnam.c paydoname — doname with invent-style price suppressed
 * (billing menus / shk_names_obj). Named omissions: Has_contents cknown
 * dance; "an unpaid "/"your " container rewrite; wizweight toggle.
 */
export function paydoname(obj) {
    if (!game.iflags) game.iflags = {};
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    const p = doname(obj);
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    return p;
}

/**
 * C ref: invent.c xprname(obj, txt, let, dot, cost, quan)
 * Message/prinv paths pass dot=true (trailing period); invent menus omit it.
 * When quan is non-0, temporarily override obj.quan for doname (pickup
 * partial / merge total_of), then restore.
 * Named omissions: txt override; cost/Iu/Ix unpaid columns; HANDS/CONTAINED
 * let symbols.
 */
export function xprname(obj, let_, dot = false, quan = 0) {
    let savequan = 0;
    if (quan && obj) {
        savequan = obj.quan || 0;
        obj.quan = quan;
    }
    const ilet = let_ ?? obj?.invlet ?? '?';
    const result = `${ilet} - ${doname(obj)}${dot ? '.' : ''}`;
    if (savequan) obj.quan = savequan;
    return result;
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
        // C ref: objnam.c obj_typename ARMOR — pair of / set of prefixes
        if ((ocl.oc_skill ?? -1) === ARM_GLOVES
            || (ocl.oc_skill ?? -1) === ARM_BOOTS) {
            buf = 'pair of ';
        } else if (otyp >= GRAY_DRAGON_SCALES && otyp <= YELLOW_DRAGON_SCALES) {
            buf = 'set of ';
        }
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
