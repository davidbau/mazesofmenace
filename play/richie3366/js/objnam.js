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
    BALL_CLASS,
    CHAIN_CLASS,
    objectNames,
    objectNameStrs,
    objectDescrs,
    objects,
} from './objects.js';
import {
    monsterNames, mons, vegetarian, is_rider, M2_PNAME, G_UNIQ,
    pmnames, MALE, FEMALE, NEUTRAL, NON_PM, NUMMONS, LOW_PM, NUM_MGENDERS,
} from './monsters.js';
import { BOGUSMON_BUF } from './generated/bogusmon_data.js';
import {
    PM_SAMURAI, PM_CLERIC, PM_LICHEN, PM_ACID_BLOB, PM_LONG_WORM_TAIL,
} from './generated/monsters_data.js';
import {
    ART_ORB_OF_DETECTION, ART_SUNSWORD, artilistRaw, NROFARTIFACTS,
} from './generated/artifacts_data.js';
import {
    W_ARMOR, W_AMUL, W_RING, W_RINGL, W_RINGR, W_QUIVER, W_WEP, W_SWAPWEP,
    W_ARM, W_BALL, W_CHAIN, W_TOOL, W_SADDLE, WARN_OF_MON,
    Has_contents, Is_container, Is_box, P_NONE, P_BOW, P_CROSSBOW, P_SHURIKEN,
    P_DART, P_BOOMERANG,
    OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    ROTTEN_TIN, HOMEMADE_TIN, SPINACH_TIN, ismnum, MV_KNOWS_EGG,
    ONAME, has_oname,
    CXN_NORMAL, CXN_SINGULAR, CXN_NO_PFX, CXN_PFX_THE, CXN_ARTICLE,
    CXN_NOCORPSE,
    CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM,
    BURN_OBJECT, HAND, RIGHT_HANDED,
} from './const.js';

const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');
const BOULDER = objectNames.indexOf('BOULDER');
const POT_OIL = objectNames.indexOf('POT_OIL');
const POT_WATER = objectNames.indexOf('POT_WATER');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const CORPSE = objectNames.indexOf('CORPSE');
const AKLYS = objectNames.indexOf('AKLYS');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky u.Blind). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

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

/** C ref: obj.h Is_candle — local copy (objnam↔timeout cycle). */
function Is_candle_obj(obj) {
    const n = objectNames[obj?.otyp];
    return n === 'TALLOW_CANDLE' || n === 'WAX_CANDLE';
}

/**
 * C ref: timeout.c peek_timer(BURN_OBJECT) — absolute timeout, or 0.
 * Local walk of game._timer_base (objnam↔mkobj cycle).
 */
function peek_burn_object(obj) {
    if (!obj) return 0;
    for (let curr = game._timer_base; curr; curr = curr.next) {
        if ((curr.action | 0) === BURN_OBJECT && curr.obj === obj) {
            return curr.timeout | 0;
        }
    }
    return 0;
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
        // C objects.h BELL_OF_OPENING BITS(..., chrg=1, uniq=1, ...)
        || n === 'BELL_OF_OPENING'
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
    // C objects.h unique/invocation TOOL/AMULET/SPBOOK BITS(..., uskn=1, ...)
    // — generated table omits oc_uses_known (D-0872). Needed so xname can
    // clear known before the_unique_obj picks "the "/"a ".
    if (n === 'BELL_OF_OPENING' || n === 'CANDELABRUM_OF_INVOCATION'
        || n === 'AMULET_OF_YENDOR' || n === 'FAKE_AMULET_OF_YENDOR'
        || n === 'SPE_BOOK_OF_THE_DEAD')
        return true;
    return false;
}

/**
 * C ref: objnam.c xname_flags — when !oc_name_known && oc_uses_known &&
 * oc_unique, clear obj->known so the_unique_obj / doname article cannot
 * leak uniqueness ("the silver bell" vs "a silver bell").
 */
function clear_unique_known_leak(obj) {
    if (!obj) return;
    const ocl = game.objects?.[obj.otyp];
    if (!ocl?.oc_name_known && otyp_uses_known(obj.otyp) && ocl?.oc_unique) {
        obj.known = 0;
    }
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
    // C: FOOD_CLASS globby — "%s %s" size + OBJ_NAME (owt thresholds).
    // Named omit: iflags.partly_eaten_hack (shrink_glob Yname2).
    if (obj.globby) {
        const actualn = objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'glob');
        const owt = obj.owt | 0;
        const size = owt <= 100 ? 'small'
            : owt <= 300 ? 'medium'
                : owt <= 500 ? 'large'
                    : 'very large';
        return `${size} ${actualn}`;
    }
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
    // C ref: objnam.c xname_flags BALL_CLASS —
    // "%sheavy iron ball" with "very " when owt > oc_weight (punish levy).
    if (obj.oclass === BALL_CLASS) {
        const ocw = game.objects?.[obj.otyp]?.oc_weight ?? 0;
        return `${((obj.owt | 0) > ocw) ? 'very ' : ''}heavy iron ball`;
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
 * corpse_xname (doname CXN_ARTICLE|CXN_NOCORPSE; D-1255).
 */
export function xname(obj) {
    if (!obj) return 'something';
    // C xname_flags: !nn && oc_uses_known && oc_unique → known=0 (article leak)
    clear_unique_known_leak(obj);
    // C: Role_if(PM_CLERIC) → obj->bknown = 1 (bypass set_bknown / invent update)
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    // C: if (!Blind && !gd.distantname) observe_object(obj);
    // Prop Blind — sticky u.Blind misses FROMFORM molds (D-0928 #1180).
    if (!Blind() && !(game.distantname | 0) && _xname_observe) {
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
    /* C objnam.c xname ROCK_CLASS :814–823 — BOULDER && next_boulder==1
       formats "next boulder" then clears to 0. Overloaded corpsenm
       defaults to NON_PM (-1); check ==1 not !=0. D-1294. */
    if ((obj.otyp | 0) === BOULDER && (obj.next_boulder | 0) === 1) {
        base = `next ${base}`;
        obj.next_boulder = 0;
    }
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
 * C ref: hacklib.c mungspaces — collapse runs of whitespace; drop trailing.
 */
function mungspaces_objnam(s) {
    return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * C ref: do_name.c obj_pmname — CORPSE/STATUE/FIGURINE pmnames + gender.
 * Aligned-cleric + CORPSTAT_RANDOM remaps to PM_CLERIC (avoid "aligned").
 * Named omit: omonst traits (#if 0 in C).
 */
function obj_pmname_corpse(obj) {
    const otypName = objectNames[obj?.otyp];
    const omndx = obj?.corpsenm;
    if ((otypName === 'CORPSE' || otypName === 'STATUE' || otypName === 'FIGURINE')
        && ismnum(omndx)) {
        const cgend = (obj.spe | 0) & CORPSTAT_GENDER;
        const mgend = cgend === CORPSTAT_MALE ? MALE
            : cgend === CORPSTAT_FEMALE ? FEMALE
                : NEUTRAL;
        let mndx = omndx;
        if (mndx === PM_ALIGNED_CLERIC && cgend === CORPSTAT_RANDOM) {
            mndx = PM_CLERIC;
        }
        const names = pmnames[mndx];
        if (!names) return 'thing';
        let g = mgend;
        if (g < MALE || g >= 3 || !names[g]) g = NEUTRAL;
        return names[g] || names[NEUTRAL] || names[MALE] || names[FEMALE] || 'thing';
    }
    return 'thing';
}

/**
 * C ref: objnam.c corpse_xname — unique/pname possessive + adjective
 * placement (D-1234); glob OBJ_NAME (D-1255). CXN_SINGULAR / NO_PFX /
 * PFX_THE / ARTICLE / NOCORPSE.
 */
export function corpse_xname(obj, adjective, cxn_flags) {
    const flags = cxn_flags | 0;
    const omndx = obj?.corpsenm;
    const ignore_quan = (flags & CXN_SINGULAR) !== 0;
    let no_prefix = (flags & CXN_NO_PFX) !== 0;
    let the_prefix = (flags & CXN_PFX_THE) !== 0;
    let any_prefix = (flags & CXN_ARTICLE) !== 0;
    const omit_corpse = (flags & CXN_NOCORPSE) !== 0;
    let possessive = false;
    const glob = objectNames[obj?.otyp] !== 'CORPSE' && !!obj?.globby;

    let mnam;
    if (glob) {
        // C: OBJ_NAME(objects[otmp->otyp]) — "glob of <monster>"
        mnam = objectNameStrs[obj.otyp]
            || objectNames[obj.otyp]?.toLowerCase().replace(/_/g, ' ')
            || 'glob';
    } else if (omndx == null || omndx < 0 || omndx === NON_PM) {
        mnam = 'thing';
    } else {
        mnam = obj_pmname_corpse(obj);
        const ptr = mons(omndx);
        if (the_unique_pm(ptr) || type_is_pname_objnam(ptr)) {
            mnam = s_suffix_objnam(mnam);
            possessive = true;
            if (type_is_pname_objnam(ptr)) {
                no_prefix = true;
            } else if (the_unique_pm(ptr) && !no_prefix) {
                the_prefix = true;
            }
        }
    }
    if (no_prefix) {
        the_prefix = false;
        any_prefix = false;
    } else if (the_prefix) {
        any_prefix = false;
    }

    let nambuf = the_prefix ? 'the ' : '';
    if (!adjective) {
        nambuf += mnam;
    } else if (possessive) {
        // C: Medusa's cursed partly eaten corpse
        nambuf += `${mnam} ${adjective}`;
        nambuf = mungspaces_objnam(nambuf);
        if (/^\d/.test(adjective)) any_prefix = false;
    } else {
        // C: cursed partly eaten troll corpse
        nambuf += `${adjective} ${mnam}`;
        nambuf = mungspaces_objnam(nambuf);
        if (/^\d/.test(adjective)) any_prefix = false;
    }

    if (glob) {
        // C: omit_corpse doesn't apply; quantity is always 1
    } else if (!omit_corpse) {
        nambuf += ' corpse';
        if ((obj?.quan || 1) > 1 && !ignore_quan) {
            nambuf += 's';
            any_prefix = false;
        }
    }
    if (any_prefix) nambuf = an(nambuf);
    return nambuf;
}

/**
 * C ref: objnam.c cxname — corpse_xname for CORPSE, else xname.
 */
export function cxname(obj) {
    if (obj && objectNames[obj.otyp] === 'CORPSE') {
        return corpse_xname(obj, null, CXN_NORMAL);
    }
    return xname(obj);
}

/**
 * C ref: objnam.c cxname_singular — ignore quantity (sortloot / loot_xname).
 */
export function cxname_singular(obj) {
    if (obj && objectNames[obj.otyp] === 'CORPSE') {
        return corpse_xname(obj, null, CXN_SINGULAR);
    }
    if (!obj) return xname(obj);
    const saveq = obj.quan;
    obj.quan = 1;
    const nam = xname(obj);
    obj.quan = saveq;
    return nam;
}

/** C ref: hacklib.c strstri — case-insensitive substring. */
function strstri_objnam(hay, needle) {
    return String(hay ?? '').toLowerCase().includes(String(needle).toLowerCase());
}

/**
 * C ref: objnam.c bare_artifactname `:2502–2514` — artiname, "The "→"the ".
 * Local copy so objnam does not import artifact.js (invent cycle).
 */
function bare_artifactname_objnam(obj) {
    if (obj?.oartifact) {
        const a = obj.oartifact | 0;
        const name = (a > 0 && a <= NROFARTIFACTS && artilistRaw[a]?.name) || '';
        if (name.slice(0, 4) === 'The ') return `the ${name.slice(4)}`;
        return name || xname(obj);
    }
    return xname(obj);
}

/**
 * C ref: objnam.c killer_xname `:1942–2005` — fully ID'd death-reason name.
 * Temporarily sets known/dknown, clears BUC/poison/uname/oname (not artifacts),
 * formats, applies an()/the(), then restores the object and objects[].
 * Caller uses KILLED_BY. eat choke wired (D-1344); dozap self-zap (D-1345).
 * Remaining dothrow/pickup/wield/invent/mthrowu/do_wear callers named.
 */
export function killer_xname(obj) {
    if (!obj) return 'something';
    // C: bypass object twiddling for artifacts
    if (obj.oartifact) return bare_artifactname_objnam(obj);

    const save_known = obj.known;
    const save_dknown = obj.dknown;
    const save_bknown = obj.bknown;
    const save_rknown = obj.rknown;
    const save_greased = obj.greased;
    const save_blessed = obj.blessed;
    const save_cursed = obj.cursed;
    const save_opoisoned = obj.opoisoned;
    const save_next_boulder = obj.next_boulder;
    const save_oname = has_oname(obj) ? ONAME(obj) : null;

    obj.known = 1;
    obj.dknown = 1;
    obj.bknown = 0;
    obj.rknown = 0;
    obj.greased = 0;
    if ((obj.otyp | 0) !== POT_WATER) {
        obj.blessed = 0;
        obj.cursed = 0;
    } else {
        obj.bknown = 1; // describe holy/unholy water as such
    }
    obj.opoisoned = 0;
    if (!obj.oartifact && save_oname && obj.oextra) {
        obj.oextra.oname = null;
    }

    const ocl = objects()?.[obj.otyp];
    const save_ocknown = ocl ? ocl.oc_name_known : 0;
    const save_ocuname = ocl ? (ocl.oc_uname ?? null) : null;
    if (ocl) {
        ocl.oc_name_known = 1;
        ocl.oc_uname = null; // avoid "foo called bar"
    }

    let buf;
    try {
        if ((obj.otyp | 0) === CORPSE) {
            buf = corpse_xname(obj, null, CXN_NORMAL);
        } else if ((obj.otyp | 0) === SLIME_MOLD) {
            buf = `deadly slime mold${(obj.quan | 0) === 1 ? '' : 's'}`;
        } else {
            buf = xname(obj);
        }
        // C: article iff quan==1 and not already possessive; KILLED_BY caller
        if ((obj.quan | 0) === 1
            && !strstri_objnam(buf, "'s ")
            && !strstri_objnam(buf, "s' ")) {
            buf = (obj_is_pname(obj) || the_unique_obj(obj)) ? the(buf) : an(buf);
        }
    } finally {
        if (ocl) {
            ocl.oc_name_known = save_ocknown;
            ocl.oc_uname = save_ocuname;
        }
        obj.known = save_known;
        obj.dknown = save_dknown;
        obj.bknown = save_bknown;
        obj.rknown = save_rknown;
        obj.greased = save_greased;
        obj.blessed = save_blessed;
        obj.cursed = save_cursed;
        obj.opoisoned = save_opoisoned;
        obj.next_boulder = save_next_boulder;
        if (!obj.oartifact && save_oname) {
            if (!obj.oextra) obj.oextra = {};
            obj.oextra.oname = save_oname;
        }
    }
    return buf;
}

/**
 * C ref: rumors.c CapitalMon / init_CapMons — capitalized type/title names
 * that take "the" (Archon, Oracle, Green-elf) vs pname uniques (Medusa).
 * Named omit: fruit_from_name + artifact_name fruit carve in the() (objnam
 * cannot import artifact.js — invent cycle).
 */
const BOGON_CODES = '-_+|=';
let CapMons = null;

/** C ref: hacklib.c xcrypt — involution; same as rumors.js. */
function xcrypt_objnam(s) {
    let bitmask = 1;
    let out = '';
    for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c & (32 | 64)) c ^= bitmask;
        out += String.fromCharCode(c);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

/** C ref: rumors.c unpadline. */
function unpadline_objnam(line) {
    return String(line ?? '').replace(/_+$/, '');
}

/** C ref: do_name.c bogon_is_pname — "-+=" personal; "_|" type. */
function bogon_is_pname_objnam(code) {
    return !!code && '-+='.includes(code);
}

/** C ref: rumors.c init_CapMons. */
function init_CapMons() {
    const list = [];
    for (let mndx = LOW_PM; mndx < NUMMONS; mndx++) {
        const mptr = mons(mndx);
        if (!mptr) continue;
        if ((mptr.geno & G_UNIQ) !== 0 && !the_unique_pm(mptr)) continue;
        const names = pmnames[mndx];
        if (!names) continue;
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            const nam = names[mgend];
            if (nam && nam[0] && nam[0] !== nam[0].toLowerCase()) list.push(nam);
        }
    }
    // C skips the plaintext don't-edit header; JS BOGUSMON_BUF already omits it.
    const lines = String(BOGUSMON_BUF || '').split('\n');
    for (const enc of lines) {
        if (!enc) continue;
        const xbuf = unpadline_objnam(xcrypt_objnam(enc));
        if (!xbuf) continue;
        let code = '';
        let startp = xbuf;
        if (BOGON_CODES.includes(xbuf[0])) {
            code = xbuf[0];
            startp = xbuf.slice(1);
        }
        if (startp && startp[0] !== startp[0].toLowerCase()
            && !bogon_is_pname_objnam(code)) {
            list.push(startp);
        }
    }
    CapMons = list;
}

/**
 * C ref: rumors.c CapitalMon — prefix match with space/apostrophe/end boundary.
 */
export function CapitalMon(word) {
    if (!word || word[0] === word[0].toLowerCase()) return false;
    if (!CapMons) init_CapMons();
    const wln = word.length;
    for (const nam of CapMons) {
        const nln = nam.length;
        if (wln < nln) continue;
        if (word.slice(0, nln) !== nam) continue;
        const next = word[nln];
        if (!next || next === ' ' || next === "'") return true;
    }
    return false;
}

/**
 * C ref: objnam.c the() — definite article for non-proper names.
 * Named omit: fruit_from_name + artifact_name (invent cycle).
 */
export function the(str) {
    if (!str) return 'the []';
    if (str.length >= 4 && str.slice(0, 4).toLowerCase() === 'the ') {
        const c0 = str.charAt(0);
        const low = (c0 >= 'A' && c0 <= 'Z')
            ? String.fromCharCode(c0.charCodeAt(0) + 32) : c0;
        return low + str.slice(1);
    }
    let insert_the = false;
    const c0 = str.charCodeAt(0);
    if (c0 < 65 || c0 > 90
        || CapitalMon(str)
        /* fruit_from_name(str, TRUE) && artifact_name named omit */) {
        insert_the = true;
    } else {
        let tmp = str.lastIndexOf(' ');
        if (tmp < 0) tmp = str.lastIndexOf('-');
        if (tmp >= 0) {
            const next = str.charCodeAt(tmp + 1);
            if (next < 65 || next > 90) {
                insert_the = !str.includes("'");
            } else {
                const firstSp = str.indexOf(' ');
                if (firstSp >= 0 && firstSp < tmp) {
                    const low = str.toLowerCase();
                    const of = low.indexOf(' of ');
                    let namedAt = low.indexOf(' named ');
                    const called = low.indexOf(' called ');
                    if (called >= 0 && (namedAt < 0 || called < namedAt)) {
                        namedAt = called;
                    }
                    if (of >= 0 && (namedAt < 0 || of < namedAt)) {
                        insert_the = true;
                    } else if (namedAt < 0 && str.length >= 31
                        && str.slice(str.length - 31)
                            === 'Platinum Yendorian Express Card') {
                        insert_the = true;
                    }
                }
            }
        }
    }
    return insert_the ? `the ${str}` : str;
}

/** C ref: objnam.c The — the() with leading capital. */
export function The(str) {
    const t = the(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
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

// C ref: objnam.c as_is[] — makesingular/makeplural leave these plural.
const AS_IS_PLURALS = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales',
    'eyes', 'gauntlets', 'iron bars',
];
// C ref: objnam.c special_subjs[] — also kept as-is by makesingular.
const SPECIAL_SUBJS = [
    'erinys', 'manes', 'Cyclops', 'Hippocrates', 'Pelias', 'aklys',
    'amnesia', 'detect monsters', 'paralysis', 'shape changers', 'nemesis',
];

// C ref: objnam.c singplur_compound — compounds[] (compound_start " -").
const SINGPLUR_COMPOUNDS = [
    ' of ', ' labeled ', ' called ',
    ' named ', ' above', // lurkers above
    ' versus ', ' from ', ' in ',
    ' on ', ' a la ', ' with',
    ' de ', " d'", ' du ',
    ' au ', '-in-', '-at-',
];

/** @returns {number} index of first compound marker, or -1 */
function singplur_compound(str) {
    const lower = str.toLowerCase();
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c !== ' ' && c !== '-') continue;
        for (const cmpd of SINGPLUR_COMPOUNDS) {
            if (lower.startsWith(cmpd.toLowerCase(), i)) return i;
        }
    }
    return -1;
}

/**
 * C ref: objnam.c makesingular — wish/plural → canonical object name.
 * Compound via singplur_compound singularizes the head only; as_is;
 * one_off reverse; -ies/-ves/-es/-s. Named omissions: pronoun genders;
 * craft/mongoose; badman men→man; full Strcasecpy case polish.
 */
export function makesingular(oldstr) {
    if (oldstr == null) return '';
    let s = String(oldstr);
    while (s.startsWith(' ')) s = s.slice(1);
    if (!s) return '';

    // C: singplur_compound — singularize only the part before marker
    let excess = '';
    let bp = s;
    const cmpIdx = singplur_compound(s);
    if (cmpIdx >= 0) {
        excess = s.slice(cmpIdx);
        bp = s.slice(0, cmpIdx);
    }

    const lower = bp.toLowerCase();

    // C: singplur_lookup as_is — keep boots/gloves/gauntlets/scales/…
    for (const as of AS_IS_PLURALS) {
        if (lower === as || (lower.length > as.length && lower.endsWith(as)
            && bp[bp.length - as.length - 1] === ' ')) {
            return bp + excess;
        }
    }
    // C: singplur_lookup special_subjs
    for (const sp of SPECIAL_SUBJS) {
        const sl = sp.toLowerCase();
        if (lower === sl || (lower.length > sl.length && lower.endsWith(sl)
            && bp[bp.length - sl.length - 1] === ' ')) {
            return bp + excess;
        }
    }

    // C: singplur_lookup one_off reverse (plur → sing)
    for (const [sing, plur] of ONE_OFF_PLURALS) {
        const pl = plur.toLowerCase();
        if (lower === pl || (pl.length < lower.length && lower.endsWith(pl))) {
            const stem = bp.slice(0, bp.length - plur.length);
            const matched = bp.slice(bp.length - plur.length);
            let sg = sing;
            if (matched[0] >= 'A' && matched[0] <= 'Z') {
                sg = sing[0].toUpperCase() + sing.slice(1);
            }
            return stem + sg + excess;
        }
    }

    if (bp.length >= 1 && bp[bp.length - 1].toLowerCase() === 's') {
        if (bp.length >= 2 && bp[bp.length - 2].toLowerCase() === 'e') {
            if (bp.length >= 3 && bp[bp.length - 3].toLowerCase() === 'i') {
                // C: cookies/pies/genies/zombies/valkyries → drop s only
                const keepS = /cookies$/i.test(bp)
                    || (/(^| )pies$/i.test(bp))
                    || (/(^| )genies$/i.test(bp))
                    || /mbies$/i.test(bp)
                    || /yries$/i.test(bp);
                if (!keepS) {
                    // ies → y
                    bp = bp.slice(0, -3) + (bp[bp.length - 3] === 'I' ? 'Y' : 'y');
                    return bp + excess;
                }
                // fall through to drop s
            } else if (bp.length >= 4 && /ves$/i.test(bp)
                && /[lraeiuo]$/i.test(bp[bp.length - 4])) {
                // C: wolves etc ves→f; cloves/nerves keep s-drop
                if (!/cloves$/i.test(bp) && !/nerves$/i.test(bp)) {
                    bp = bp.slice(0, -3) + (bp[bp.length - 3] === 'V' ? 'F' : 'f');
                    return bp + excess;
                }
            } else if (/eses$/i.test(bp) || /oxes$/i.test(bp) || /nxes$/i.test(bp)
                || /ches$/i.test(bp) || /uses$/i.test(bp) || /shes$/i.test(bp)
                || /sses$/i.test(bp) || /atoes$/i.test(bp) || /dingoes$/i.test(bp)
                || /Aleaxes$/i.test(bp)) {
                bp = bp.slice(0, -2); // drop es
                return bp + excess;
            }
            // else fall through to drop s (pieces, daggers via -es not special)
        } else if (/us$/i.test(bp)) {
            // C: lotus/fungus keep; tengus/hezrous fall through to drop s
            if (!/tengus$/i.test(bp) && !/hezrous$/i.test(bp)) {
                return bp + excess;
            }
        } else if (/ss$/i.test(bp) || / lens$/i.test(bp) || /^lens$/i.test(bp)) {
            return bp + excess;
        }
        bp = bp.slice(0, -1); // drop s
        return bp + excess;
    }

    // C: men → man (badman defer — leave men as-is when badman)
    if (/men$/i.test(bp) && bp.length >= 3) {
        bp = bp.slice(0, -2) + (bp[bp.length - 2] === 'E' ? 'AN' : 'an');
        return bp + excess;
    }
    if (/matzot$/i.test(bp) || /ae$/i.test(bp) || /eaux$/i.test(bp)) {
        bp = bp.slice(0, -1);
        return bp + excess;
    }

    return bp + excess;
}

/**
 * C ref: objnam.c makeplural — irregular one_off + singplur_compound + ya.
 * Named omissions: pronoun genders; already_plural ae/eaux; man→men;
 * as_is collective; singplur_lookup mongoose/slice edges;
 * full case-preserve polish beyond matched-suffix first letter.
 */
export function makeplural(s) {
    if (s == null || s === '') return 's';
    while (s.startsWith(' ')) s = s.slice(1);
    // C: skip "pair of " → keep as-is (objects use collective "pair")
    if (/^pair of /i.test(s)) return s;
    // C: singplur_compound — pluralize head only ("scrolls labeled KIRJE")
    const cmpIdx = singplur_compound(s);
    if (cmpIdx >= 0) {
        return makeplural(s.slice(0, cmpIdx)) + s.slice(cmpIdx);
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

/** C ref: objnam.c An — an() with leading capital. */
export function An(str) {
    const t = an(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
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
 * Late-bound from do_name.js — C shk.c mon_owns uses y_monnam.
 * Avoids static objnam↔do_name cycle (do_name already imports xname).
 */
let _y_monnam = null;
export function set_y_monnam(fn) {
    _y_monnam = fn;
}

/**
 * Late-bound from do_name.js — C objnam.c doname LEASH uses noit_mon_nam.
 * Same cycle as y_monnam.
 */
let _noit_mon_nam = null;
export function set_noit_mon_nam(fn) {
    _noit_mon_nam = fn;
}

/**
 * Late-bound from polyself.js — C objnam.c doname_base body_part(HAND).
 * Avoids static objnam↔polyself cycle (polyself already imports an).
 * Unset → C mbodypart null-data humanoid "hand".
 */
let _body_part = null;
export function set_body_part(fn) {
    _body_part = fn;
}

/** C polyself.c body_part(HAND) via doname_base W_WEP / W_SWAPWEP / RING. */
function doname_hand() {
    return _body_part ? _body_part(HAND) : 'hand';
}

/** C youprop.h EWarn_of_mon ≡ u.uprops[WARN_OF_MON].extrinsic. */
function EWarn_of_mon() {
    const u = game.u || {};
    const p = u.uprops?.[WARN_OF_MON];
    if (p) return p.extrinsic | 0;
    return u.EWarn_of_mon | 0;
}

// C coloratt.c colornames[] first match. Local — do not import artifact.js
// (artifact→invent→shk calls set_doname_shop_suffix during objnam init).
const DONAME_CLR2COLORNAME = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'no color', 'orange', 'light green', 'yellow', 'light blue',
    'light magenta', 'light cyan', 'white',
];
const DONAME_GLOW_VERBS = ['quiver', 'flicker', 'glimmer', 'gleam'];

/** C artifact.c glow_verb — inlined; keep in sync with artifact.js. */
function doname_glow_verb(count, ingsfx) {
    const n = count | 0;
    const i = (n > 12) ? 3 : (n > 4) ? 2 : (n > 0 ? 1 : 0);
    return DONAME_GLOW_VERBS[i] + (ingsfx ? 'ing' : '');
}

/** C artifact.c glow_color via artilistRaw.acolor; Hallu hcolor named omit. */
function doname_glow_color(arti_indx) {
    const colornum = artilistRaw[arti_indx | 0]?.acolor | 0;
    return DONAME_CLR2COLORNAME[colornum] || '';
}

/**
 * C ref: artifact.c artifact_light — Sunsword + worn gold DSM/scales.
 * Local copy so doname does not import timeout.js (timeout already
 * imports doname). timeout.js keeps the light-source original.
 */
function doname_artifact_light(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if ((t === GOLD_DRAGON_SCALE_MAIL || t === GOLD_DRAGON_SCALES)
        && ((obj.owornmask | 0) & W_ARM) !== 0) {
        return true;
    }
    return (obj.oartifact | 0) === ART_SUNSWORD;
}

/**
 * C ref: light.c arti_light_radius + arti_light_description `:916–931`.
 * timeout.js has the radius used by vision; this is the doname adverb.
 */
function arti_light_description(obj) {
    if (!obj?.lamplit || !doname_artifact_light(obj)) return 'strangely';
    let res = obj.blessed ? 3 : (!obj.cursed ? 2 : 1);
    if (obj === game.u?.uskin) res = 1;
    else if ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL) res++;
    switch (res) {
    case 4: return 'radiantly';
    case 3: return 'brilliantly';
    case 2: return 'brightly';
    case 1: return 'dimly';
    default: return 'strangely';
    }
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

const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');

/** C ref: mondata.h type_is_pname — M2_PNAME. Local to avoid do_name cycle. */
function type_is_pname_objnam(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_PNAME);
}

/**
 * C ref: objnam.c the_unique_pm — G_UNIQ "the Name" article gate.
 * High priest / worm-tail false; Wizard-of-Yendor forced true.
 */
export function the_unique_pm(ptr) {
    if (!ptr || type_is_pname_objnam(ptr)) return false;
    let uniq = !!((ptr.geno | 0) & G_UNIQ);
    if (PM_HIGH_CLERIC >= 0 && (ptr.mndx | 0) === PM_HIGH_CLERIC) uniq = false;
    if ((ptr.mndx | 0) === PM_LONG_WORM_TAIL) uniq = false;
    if (PM_WIZARD_OF_YENDOR >= 0 && (ptr.mndx | 0) === PM_WIZARD_OF_YENDOR) {
        uniq = true;
    }
    return uniq;
}

/** C obj.h carried — where==OBJ_INVENT. */
function carried_objnam(obj) {
    return !!(obj && obj.where === OBJ_INVENT);
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix_objnam(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C ref: shk.c shk_your — trailing space; "your "/"the "/"Foobar's ".
 * Named omit: shk_owns (unpaid / floor costly shopkeeper possessive).
 */
export function shk_your(obj) {
    if (!obj) return 'the ';
    const chk_pm = objectNames[obj.otyp] === 'CORPSE' && ismnum(obj.corpsenm);
    if (chk_pm && type_is_pname_objnam(mons(obj.corpsenm))) return '';
    if (chk_pm && the_unique_pm(mons(obj.corpsenm))) return 'the ';
    // C mon_owns: OBJ_MINVENT → s_suffix(y_monnam(ocarry))
    if (obj.where === OBJ_MINVENT && obj.ocarry) {
        const nam = _y_monnam ? _y_monnam(obj.ocarry) : 'it';
        return `${s_suffix_objnam(nam)} `;
    }
    return carried_objnam(obj) ? 'your ' : 'the ';
}

/**
 * C ref: objnam.c yname — cxname plus shk_your unless carried pname
 * artifact before ART_ORB_OF_DETECTION.
 */
export function yname(obj) {
    const s = cxname(obj);
    if (!carried_objnam(obj) || !obj_is_pname(obj)
        || (obj.oartifact | 0) >= ART_ORB_OF_DETECTION) {
        return `${shk_your(obj)}${s}`;
    }
    return s;
}

/**
 * C ref: objnam.c simpleonames ← minimal_xname — type appearance without
 * quan/BUC. Statue/figurine corpsenm suppressed (C bareobj.corpsenm=NON_PM).
 * C bareobj = zeroobj (owt 0) → BALL_CLASS never gets "very " via this path
 * (xname/doname of the live object still apply punish weight).
 * Named omissions: sack→bag family aliases; full bareobj field subset.
 */
export function simpleonames(obj) {
    if (!obj) return 'object';
    // C minimal_xname: if (otyp != BOULDER) bareobj.corpsenm = NON_PM
    const n = objectNames[obj.otyp];
    if (n === 'STATUE') return 'statue';
    if (n === 'FIGURINE') return 'figurine';
    // C minimal_xname bareobj.owt stays 0 → never "very heavy iron ball"
    if (obj.oclass === BALL_CLASS) return 'heavy iron ball';
    return pretty_base(obj);
}

/**
 * C ref: objnam.c ansimpleoname — an()/the() + simpleonames.
 * Unique named items → "the …"; quan==1 → an(); else bare plural.
 * Named: FAKE_AMULET→AMULET unique remap deferred (uses otyp as-is).
 */
export function ansimpleoname(obj) {
    if (!obj) return 'an object';
    const name = simpleonames(obj);
    const ocl = objects()?.[obj.otyp];
    const actual = objectNameStrs[obj.otyp];
    if (ocl?.oc_unique && actual && name === actual) {
        return the(name);
    }
    if ((obj.quan | 0) === 1) return an(name);
    return name;
}

/**
 * C ref: objnam.c thesimpleoname — "the" + simpleonames.
 */
export function thesimpleoname(obj) {
    return the(simpleonames(obj));
}

/**
 * C ref: objnam.c short_oname — fit a doname-style format into lenlimit.
 * Truncates long uname/oname, then temporarily clears bknown/rknown/greased/
 * oeroded/oeroded2 for formatting only (object restored). Optional altfunc
 * (usually thesimpleoname) if still too long.
 */
export function short_oname(obj, func, altfunc, lenlimit) {
    if (!obj || typeof func !== 'function') return '';
    let outbuf = func(obj);
    if (outbuf.length <= lenlimit) return outbuf;

    const ocl = objects()?.[obj.otyp];
    const save_uname = ocl?.oc_uname ?? null;
    // C: sizeof unamebuf == 12 → truncate when strlen >= 12
    if (save_uname && save_uname.length >= 12) {
        ocl.oc_uname = `${save_uname.slice(0, 8)}...`;
        outbuf = func(obj);
        ocl.oc_uname = save_uname;
        if (outbuf.length <= lenlimit) return outbuf;
    }

    const save_oname = has_oname(obj) ? ONAME(obj) : null;
    if (save_oname && save_oname.length >= 12) {
        obj.oextra.oname = `${save_oname.slice(0, 8)}...`;
        outbuf = func(obj);
        obj.oextra.oname = save_oname;
        if (outbuf.length <= lenlimit) return outbuf;
    }

    if (save_uname && save_uname.length >= 12 && save_oname
        && save_oname.length >= 12) {
        ocl.oc_uname = `${save_uname.slice(0, 8)}...`;
        obj.oextra.oname = `${save_oname.slice(0, 8)}...`;
        outbuf = func(obj);
        if (outbuf.length <= lenlimit) {
            ocl.oc_uname = save_uname;
            obj.oextra.oname = save_oname;
            return outbuf;
        }
    }

    // C: strip name-lengthening attributes; uname/oname stay truncated
    const save_bknown = obj.bknown;
    const save_rknown = obj.rknown;
    const save_greased = obj.greased;
    const save_oeroded = obj.oeroded;
    const save_oeroded2 = obj.oeroded2;
    obj.bknown = 0;
    obj.rknown = 0;
    obj.greased = 0;
    obj.oeroded = 0;
    obj.oeroded2 = 0;
    if (save_uname && save_uname.length >= 12) {
        ocl.oc_uname = `${save_uname.slice(0, 8)}...`;
    }
    if (save_oname && save_oname.length >= 12) {
        obj.oextra.oname = `${save_oname.slice(0, 8)}...`;
    }
    outbuf = func(obj);
    if (typeof altfunc === 'function' && outbuf.length > lenlimit) {
        outbuf = altfunc(obj);
    }
    obj.bknown = save_bknown;
    obj.rknown = save_rknown;
    obj.greased = save_greased;
    obj.oeroded = save_oeroded;
    obj.oeroded2 = save_oeroded2;
    if (save_oname) obj.oextra.oname = save_oname;
    if (save_uname && ocl) ocl.oc_uname = save_uname;
    return outbuf;
}

/**
 * C ref: objnam.c doname() — invent-kit subset (Tourist/Rogue starter lines).
 * C doname_base starts with xname(obj), which forces cleric bknown before
 * the BUC prefix is read; JS doname uses pretty_base so apply the same force.
 */
export function doname(obj) {
    if (!obj) return 'something';

    // C doname_base → xname_flags clears unique known leak before article
    clear_unique_known_leak(obj);
    // C: xname Role_if(PM_CLERIC) obj->bknown=1 before doname_base reads it
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    // C: doname_base → xname → observe_object when !Blind && !distantname
    // Prop Blind — sticky u.Blind misses FROMFORM molds (D-0928 #1180).
    if (!Blind() && !(game.distantname | 0) && _xname_observe) {
        _xname_observe(obj);
    }
    const otyp = obj.otyp;
    const oclass = obj.oclass;
    // C doname_base: switch (is_weptool(obj) ? WEAPON_CLASS : obj->oclass)
    const donameClass = is_weptool(obj) ? WEAPON_CLASS : oclass;
    const known = !!obj.known;
    const bknown = !!obj.bknown;
    const quan = obj.quan || 1;
    const oname = objectNames[otyp];
    let base = pretty_base(obj);
    // C doname_base: xname may start with "poisoned "; strip into prefix
    // so order is article/BUC/poisoned/erosion/spe + bare name.
    let ispoisoned = false;
    if (base.startsWith('poisoned ') && obj.opoisoned) {
        base = base.slice(9);
        ispoisoned = true;
    }
    // C xname CORPSE is bare "corpse"; corpse_xname owns the monster type.
    if (oname === 'CORPSE') {
        base = (quan !== 1) ? makeplural('corpse') : 'corpse';
    } else if (quan !== 1) {
        base = makeplural(base);
    }

    // C ref: objnam.c doname_base — COIN_CLASS uses the same quan/article
    // path as other objects ("a gold piece", "25 gold pieces"), not a bare
    // numeric string. xname for coins is just "gold piece".
    // Article: quan / the_unique_obj|obj_is_pname → "the " / else "a "
    // (then just_an redo). C skips article for CORPSE so corpse_xname
    // can take the BUC/greased/oeaten prefix as its adjective
    // (CXN_ARTICLE|CXN_NOCORPSE; D-1255). Slime-mold fake_arti deferred.
    let prefix = '';
    if (quan !== 1) {
        prefix = `${quan} `;
    } else if (oname === 'CORPSE') {
        // skip article — corpse_xname owns it
    } else if (obj_is_pname(obj) || the_unique_obj(obj)) {
        if (/^the /i.test(base)) base = base.slice(4);
        prefix = 'the ';
    } else {
        prefix = 'a ';
    }

    // C: cknown + (Is_container || STATUE) + !Has_contents → "empty "
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

    // C: doname_base — greased before class switch
    if (obj.greased) prefix += 'greased ';

    // C: WEAPON_CLASS (incl. weptool remap) — poisoned before erosion/spe
    if (donameClass === WEAPON_CLASS && ispoisoned) prefix += 'poisoned ';

    // C ref: objnam.c doname_base — ARMOR falls through to WEAPON for
    // add_erosion_words + spe; BALL/CHAIN also call add_erosion_words.
    if (donameClass === WEAPON_CLASS || donameClass === ARMOR_CLASS
        || donameClass === BALL_CLASS || donameClass === CHAIN_CLASS) {
        prefix += add_erosion_words(obj);
    }

    if (known && (donameClass === WEAPON_CLASS || donameClass === ARMOR_CLASS
        || (donameClass === RING_CLASS && is_charged_otyp(otyp)))) {
        const spe = obj.spe | 0;
        prefix += (spe >= 0 ? `+${spe} ` : `${spe} `);
    }

    // C: FOOD_CLASS — oeaten → "partly eaten " (before just_an redo).
    // CORPSE → corpse_xname(prefix, CXN_ARTICLE|CXN_NOCORPSE) so unique/
    // pname adjectives sit after the possessive (D-1255). EGG →
    // pmnames[NEUTRAL] + optional "(laid by you)" (D-1276). MEAT_RING
    // goto ring worn/+spe (D-1295). TOOL candle partly used / lamp (lit)
    // (D-1308). Candelabrum (n of 7) D-1317. W_TOOL|W_SADDLE worn D-1318.
    // LEASH attached D-1319. POT_OIL (lit) D-1320.
    const isMeatRing = oname === 'MEAT_RING';
    const isCandelabrum = donameClass === TOOL_CLASS
        && oname === 'CANDELABRUM_OF_INVOCATION';
    const isLampOrCandle = donameClass === TOOL_CLASS
        && (oname === 'OIL_LAMP' || oname === 'MAGIC_LAMP'
            || oname === 'BRASS_LANTERN' || Is_candle_obj(obj));
    let eggLaidByYou = false;
    if (donameClass === FOOD_CLASS && obj.oeaten) {
        prefix += 'partly eaten ';
    }
    if (donameClass === FOOD_CLASS && oname === 'CORPSE') {
        const cxarg = ((quan !== 1 ? 0 : CXN_ARTICLE) | CXN_NOCORPSE);
        prefix = `${corpse_xname(obj, prefix, cxarg)} `;
    } else if (donameClass === FOOD_CLASS && oname === 'EGG') {
        // C doname_base FOOD EGG — stale_egg is #if 0 (corpses don't tell).
        const omndx = obj.corpsenm;
        const knowsEgg = !!((game.mvitals?.[omndx]?.mvflags | 0) & MV_KNOWS_EGG);
        if (ismnum(omndx) && (known || knowsEgg)) {
            const mnam = pmnames[omndx]?.[NEUTRAL] || '';
            prefix += `${mnam} `;
            if ((obj.spe | 0) === 1) eggLaidByYou = true;
        }
    } else if (donameClass === FOOD_CLASS && isMeatRing) {
        // C doname_base FOOD MEAT_RING goto ring (objnam.c:1536–1538 /
        // :1492–1503): known && oc_charged → "+spe " on prefix after
        // oeaten. objects.h BITS chrg=0 so this is idle for meat rings.
        if (known && is_charged_otyp(otyp)) {
            const spe = obj.spe | 0;
            prefix += (spe >= 0 ? `+${spe} ` : `${spe} `);
        }
    }
    // C doname_base TOOL_CLASS OIL_LAMP/MAGIC_LAMP/BRASS_LANTERN/Is_candle
    // (objnam.c:1455–1478): candle turns_left = age, lit → += peek_timer
    // (BURN_OBJECT) − moves; turns_left < 20*oc_cost → "partly used ".
    // Then (lit) on bp after prefix+base. Candelabrum is the prior if
    // (objnam.c:1447–1454) and breaks before this arm. Worn W_TOOL|W_SADDLE
    // then LEASH leashmon (D-1319) break before candelabrum/lamp/charges.
    // POTION POT_OIL (lit) is a later class arm (D-1320).
    if (Is_candle_obj(obj) && donameClass === TOOL_CLASS) {
        const full_burn_time = 20 * (game.objects?.[otyp]?.oc_cost | 0);
        let turns_left = obj.age | 0;
        if (obj.lamplit) {
            turns_left += peek_burn_object(obj) - (game.moves | 0);
        }
        if (turns_left < full_burn_time) prefix += 'partly used ';
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
    // C doname_base FOOD EGG Concat(bp, " (laid by you)") after xname
    // (xname already includes " named ").
    if (eggLaidByYou) bp += ' (laid by you)';

    // C: doname_base — cknown && Has_contents → " containing %ld item%s"
    // invent.c count_contents(obj, FALSE, FALSE, TRUE, FALSE): separate
    // stacks, no nest. Inline to avoid invent↔objnam import cycle.
    if (obj.cknown && Has_contents(obj)) {
        let itemcount = 0;
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) itemcount += 1;
        bp += ` containing ${itemcount} item${itemcount !== 1 ? 's' : ''}`;
    }
    // C doname_base TOOL_CLASS W_TOOL|W_SADDLE (objnam.c:1427–1429):
    // Concat " (being worn)" then break — skips leash, candelabrum,
    // lamp/candle, and charges. ublindf (blindfold/towel/lenses) and
    // monster saddle share this mask. Weptools remap to WEAPON_CLASS.
    const toolWorn = donameClass === TOOL_CLASS
        && ((obj.owornmask | 0) & (W_TOOL | W_SADDLE)) !== 0;
    if (toolWorn) bp += ' (being worn)';
    // C doname_base TOOL LEASH (objnam.c:1431–1445): after worn, before
    // candelabrum. find_mid(leashmon, FM_FMON) skips DEADMONSTER
    // (light.c); live → Concat " (attached to %s)" noit_mon_nam;
    // else impossible + leashmon=0. Always break (skips candelabrum /
    // lamp / charges). doname is sync so impossible() pline is named.
    const leashArm = donameClass === TOOL_CLASS
        && oname === 'LEASH'
        && (obj.leashmon | 0) !== 0
        && !toolWorn;
    if (leashArm) {
        const nid = obj.leashmon | 0;
        let mlsh = null;
        for (const m of game.fmon || []) {
            if ((m.mhp | 0) < 1) continue; // C find_mid FM_FMON
            if ((m.m_id | 0) === nid) {
                mlsh = m;
                break;
            }
        }
        if (mlsh && (mlsh.mhp | 0) >= 1) {
            const nam = _noit_mon_nam ? _noit_mon_nam(mlsh) : 'it';
            bp += ` (attached to ${nam})`;
        } else {
            obj.leashmon = 0;
        }
    }
    // C doname_base TOOL CANDELABRUM_OF_INVOCATION (objnam.c:1447–1454):
    // suffix = plur(spe) + (!lamplit ? " attached" : ", lit"); then
    // Concat " (%d of 7 candle%s)" and break (no lamp (lit), no charges).
    if (isCandelabrum && !toolWorn && !leashArm) {
        const spe = obj.spe | 0;
        const plurS = spe === 1 ? '' : 's';
        const litOrAtt = obj.lamplit ? ', lit' : ' attached';
        bp += ` (${spe} of 7 candle${plurS}${litOrAtt})`;
    }
    // C doname_base TOOL lamp/candle Concat " (lit)" (objnam.c:1476–1477).
    if (isLampOrCandle && obj.lamplit && !toolWorn && !leashArm) bp += ' (lit)';
    // C doname_base POTION_CLASS (objnam.c:1488–1491): otyp==POT_OIL &&
    // lamplit → Concat " (lit)". No known/dknown gate. xname stays bare.
    // Post-switch W_WEP/W_QUIVER suffixes still follow (C after the switch).
    if (donameClass === POTION_CLASS && (obj.otyp | 0) === POT_OIL
        && obj.lamplit) {
        bp += ' (lit)';
    }

    if (oclass === ARMOR_CLASS && (obj.owornmask & W_ARMOR))
        bp += ' (being worn)';
    if (obj.owornmask & W_AMUL)
        bp += ' (being worn)';
    // C doname_base RING_CLASS ring: + FOOD MEAT_RING goto ring —
    // " (on right " / " (on left " then body_part(HAND) + ")" (objnam.c:1492–1499).
    if (donameClass === RING_CLASS || isMeatRing) {
        if (obj.owornmask & W_RINGR)
            bp += ' (on right ';
        if (obj.owornmask & W_RINGL)
            bp += ' (on left ';
        if (obj.owornmask & W_RING)
            bp += `${doname_hand()})`;
    }
    // C ref: objnam.c doname_base BALL_CLASS/CHAIN_CLASS —
    // W_BALL → "(chained to you)"; W_CHAIN → "(attached to you)".
    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        bp += ` (${(obj.owornmask & W_BALL) ? 'chained' : 'attached'} to you)`;
    }
    // C ref: objnam.c doname_base W_WEP (objnam.c:1561–1609) — skip when
    // gm.mrg_to_wielded (pickup.c pickup_prinv merge into uwep). Stack/ammo/
    // missile/non-weptool → "(wielded)"; else ConcatF2 " (%s %s)" how-arm
    // tethered? "tethered to" : twoweap_primary? "wielded in" : "weapon in"
    // + body_part(HAND) (bimanual makeplural; else URIGHTY right/left).
    // Then !Blind overwrite closing paren :1599–1609 (D-1347): warn_obj
    // glow else lamplit artifact_light. JS strings do not BUFSZ-truncate
    // so bpspaceleft is always true. ARMOR gloves `:1412` still named.
    if ((obj.owornmask & W_WEP) && !game.mrg_to_wielded) {
        const twoweap_primary = !!(obj === game.u?.uwep && game.u?.twoweap);
        const tethered = (obj.otyp | 0) === AKLYS;
        const alt_wielded = (quan !== 1
            || ((oclass === WEAPON_CLASS)
                ? (is_ammo_obj(obj) || is_missile_obj(obj))
                : !is_weptool(obj)))
            && !twoweap_primary;
        if (alt_wielded) {
            bp += ' (wielded)';
        } else {
            let hand_s = doname_hand();
            if (bimanual(obj)) {
                hand_s = makeplural(hand_s);
            } else {
                const urighty = ((game.u?.uhandedness | 0) === RIGHT_HANDED);
                hand_s = `${urighty ? 'right' : 'left'} ${hand_s}`;
            }
            const how = tethered ? 'tethered to'
                : twoweap_primary ? 'wielded in'
                    : 'weapon in';
            bp += ` (${how} ${hand_s})`;
            // C: if (!Blind && bpspaceleft && bp_eos[-1] == ')')
            if (!Blind() && bp.endsWith(')')) {
                if ((game.warn_obj_cnt | 0) && obj === game.u?.uwep
                    && (EWarn_of_mon() & W_WEP) !== 0) {
                    bp = `${bp.slice(0, -1)}, ${doname_glow_verb(game.warn_obj_cnt | 0, true)} ${doname_glow_color(obj.oartifact | 0)})`;
                } else if (obj.lamplit && doname_artifact_light(obj)) {
                    bp = `${bp.slice(0, -1)}, ${arti_light_description(obj)} lit)`;
                }
            }
        }
    }
    // C: W_SWAPWEP twoweap → "wielded in" opposite URIGHTY + body_part(HAND)
    // (objnam.c:1613–1616); else "(alternate weapon(s); not wielded)".
    if (obj.owornmask & W_SWAPWEP) {
        if (game.u?.twoweap) {
            const urighty = ((game.u?.uhandedness | 0) === RIGHT_HANDED);
            bp += ` (wielded in ${urighty ? 'left' : 'right'} ${doname_hand()})`;
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

    // C TOOL_CLASS charges — weptools remapped to WEAPON so they get +spe.
    // Worn / leash / lamp/candle / candelabrum arms break before charges
    // (objnam.c:1429/1445/1454/1478).
    if (known && is_charged_otyp(otyp) && donameClass === TOOL_CLASS
        && !isLampOrCandle && !isCandelabrum && !toolWorn && !leashArm)
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
