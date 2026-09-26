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
    NUM_OBJECTS,
    objectNames,
    objectNameStrs,
    objectDescrs,
    objects,
    is_poisonable,
} from './objects.js';
import {
    monsterNames, mons, vegetarian, is_rider, M2_PNAME, G_UNIQ,
    pmnames, MALE, FEMALE, NEUTRAL, NON_PM, NUMMONS, LOW_PM, NUM_MGENDERS,
} from './monsters.js';
import { BOGUSMON_BUF } from './generated/bogusmon_data.js';
import { upstart, highc, ordin } from './hacklib.js';
import { genders } from './roles.js';
import {
    PM_SAMURAI, PM_CLERIC, PM_ARCHEOLOGIST, PM_LICHEN, PM_ACID_BLOB, PM_LONG_WORM_TAIL,
} from './generated/monsters_data.js';
import {
    ART_ORB_OF_DETECTION, ART_SUNSWORD, ART_EYES_OF_THE_OVERWORLD,
    artilistRaw, NROFARTIFACTS,
} from './generated/artifacts_data.js';
import {
    W_ARMOR, W_AMUL, W_RING, W_RINGL, W_RINGR, W_QUIVER, W_WEP, W_SWAPWEP,
    W_ARM, W_BALL, W_CHAIN, W_TOOL, W_SADDLE, WARN_OF_MON,
    Has_contents, Is_container, Is_box, P_NONE, P_BOW, P_CROSSBOW,
    P_DART, P_BOOMERANG,
    OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    ROTTEN_TIN, HOMEMADE_TIN, SPINACH_TIN, ismnum, MV_KNOWS_EGG,
    ONAME, has_oname, QBUFSZ,
    CXN_NORMAL, CXN_SINGULAR, CXN_NO_PFX, CXN_PFX_THE, CXN_ARTICLE,
    CXN_NOCORPSE,
    CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM,
    CORPSTAT_HISTORIC,
    BURN_OBJECT, HAND, FOOT, FINGER, FINGERTIP, RIGHT_HANDED,
    CONTAINED_SYM, HANDS_SYM,
    M_AP_OBJECT,
    BUFSZ,
    MAX_ERODE,
    GLIB,
} from './const.js';
import { currency } from './invent.js';

const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');
const BOULDER = objectNames.indexOf('BOULDER');
const POT_OIL = objectNames.indexOf('POT_OIL');
const POT_WATER = objectNames.indexOf('POT_WATER');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const CORPSE = objectNames.indexOf('CORPSE');
const AKLYS = objectNames.indexOf('AKLYS');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const T_SHIRT = objectNames.indexOf('T_SHIRT');
const HAWAIIAN_SHIRT = objectNames.indexOf('HAWAIIAN_SHIRT');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');
const CANDY_BAR = objectNames.indexOf('CANDY_BAR');
const TOWEL = objectNames.indexOf('TOWEL');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');

/** C objnam.c PREFIX — bytes reserved ahead of xname buf for doname. */
const XNAME_PREFIX = 80;

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

/**
 * C ref: objclass.h oc_charged / objects.h BITS(..., chrg, ...).
 * Table field from extract-objects.py (D-1690); not a name-list stand-in.
 */
export function otyp_is_charged(otyp) {
    return !!(game.objects?.[otyp]?.oc_charged);
}

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE (named fallback). */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    if (sk != null && sk !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN';
}

/**
 * C ref: objclass.h oc_uses_known / objects.h BITS(..., uskn, ...).
 * Table field from extract-objects.py (D-1674); not a class/name list.
 */
export function otyp_uses_known(otyp) {
    return !!(game.objects?.[otyp]?.oc_uses_known);
}

/**
 * C ref: objnam.c xname_flags — when !oc_name_known && oc_uses_known &&
 * oc_unique, clear obj->known so the_unique_obj / doname article cannot
 * leak uniqueness ("the silver bell" vs "a silver bell").
 */
function clear_unique_known_leak(obj) {
    if (!obj) return;
    const ocl = game.objects?.[obj.otyp];
    if (!ocl?.oc_name_known && ocl?.oc_uses_known && ocl?.oc_unique) {
        obj.known = 0;
    }
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

/**
 * C read.c shirt/apron/hawaiian/candy text helpers live next to
 * xname_flags (objnam→read is TDZ on `_body_part`).
 * C ref: read.c shirt_msgs[] in tshirt_text — o_id % SIZE.
 */
const shirt_msgs = [
    'I explored the Dungeons of Doom and all I got was this lousy T-shirt!',
    'Is that Mjollnir in your pocket or are you just happy to see me?',
    "It's not the size of your sword, it's how #enhance'd you are with it.",
    "Madame Elvira's House O' Succubi Lifetime Customer",
    "Madame Elvira's House O' Succubi Employee of the Month",
    'Ludios Vault Guards Do It In Small, Dark Rooms',
    'Yendor Military Soldiers Do It In Large Groups',
    'I survived Yendor Military Boot Camp',
    'Ludios Accounting School Intra-Mural Lacrosse Team',
    'Oracle(TM) Fountains 10th Annual Wet T-Shirt Contest',
    'Hey, black dragon!  Disintegrate THIS!',
    "I'm With Stupid -->",
    "Don't blame me, I voted for Izchak!",
    "Don't Panic",
    'Furinkan High School Athletic Dept.',
    'Hel-LOOO, Nurse!',
    '=^.^=',
    '100% goblin hair - do not wash',
    'Aberzombie and Fitch',
    'cK -- Cockatrice touches the Kop',
    "Don't ask me, I only adventure here",
    'Down with pants!',
    'd, your dog or a killer?',
    'FREE PUG AND NEWT!',
    'Go team ant!',
    'Got newt?',
    'Hello, my darlings!',
    'Hey!  Nymphs!  Steal This T-Shirt!',
    'I <3 Dungeon of Doom',
    'I <3 Maud',
    'I am a Valkyrie.  If you see me running, try to keep up.',
    'I am not a pack rat - I am a collector',
    'I bounced off a rubber tree',
    'Plunder Island Brimstone Beach Club',
    'If you can read this, I can hit you with my polearm',
    "I'm confused!",
    'I scored with the princess',
    'I want to live forever or die in the attempt.',
    'Lichen Park',
    'LOST IN THOUGHT - please send search party',
    'Meat is Mordor',
    'Minetown Better Business Bureau',
    'Minetown Watch',
    "Ms. Palm's House of Negotiable Affection--A Very Reputable House Of Disrepute",
    'Protection Racketeer',
    'Real men love Crom',
    'Somebody stole my Mojo!',
    'The Hellhound Gang',
    'The Werewolves',
    'They Might Be Storm Giants',
    "Weapons don't kill people, I kill people",
    'White Zombie',
    "You're killing me!",
    'Anhur State University - Home of the Fighting Fire Ants!',
    'FREE HUGS',
    'Serial Ascender',
    'Real men are valkyries',
    "Young Men's Cavedigging Association",
    'Occupy Fort Ludios',
    "I couldn't afford this T-shirt so I stole it!",
    'Mind flayers suck',
    "I'm not wearing any pants",
    'Down with the living!',
    'Pudding farmer',
    'Vegetarian',
    "Hello, I'm War!",
    'It is better to light a candle than to curse the darkness',
    'It is easier to curse the darkness than to light a candle',
    'rock--paper--scissors--lizard--Spock!',
    '/Valar morghulis/ -- /Valar dohaeris/',
];

/** C ref: read.c hawaiian_motifs[] in hawaiian_motif. */
const hawaiian_motifs = [
    'flamingo',
    'parrot',
    'toucan',
    'bird of paradise',
    'sea turtle',
    'tropical fish',
    'jellyfish',
    'giant eel',
    'water nymph',
    'plumeria',
    'orchid',
    'hibiscus flower',
    'palm tree',
    'hula dancer',
    'sailboat',
    'ukulele',
];

/** C ref: read.c apron_msgs[] in apron_text. */
const apron_msgs = [
    'Kiss the cook',
    "I'm making SCIENCE!",
    "Don't mess with the chef",
    "Don't make me poison you",
    "Gehennom's Kitchen",
    'Rat: The other white meat',
    "If you can't stand the heat, get out of Gehennom!",
    "If we weren't meant to eat animals, why are they made out of meat?",
    "If you don't like the food, I'll stab you",
    'I am an alchemist; if you see me running, try to catch up...',
];

/**
 * C ref: read.c candy_wrappers[] — index 0 unused; assign_candy_wrapper
 * spe = 1 + rn2(SIZE-1) lives in mkobj.js (do not clone).
 */
const candy_wrappers = [
    '',
    'Apollo',
    'Moon Crunchy',
    'Snacky Cake',
    'Chocolate Nuggie',
    'The Small Bar',
    'Crispy Yum Yum',
    'Nilla Crunchie',
    'Berry Bar',
    'Choco Nummer',
    'Om-nom',
    'Fruity Oaty',
    'Wonka Bar',
];

let _wipeout_text = null;
export function set_wipeout_text(fn) {
    _wipeout_text = fn;
}

/**
 * C ref: read.c erode_obj_text `:88–97` — wipeout_text when eroded.
 * greatest_erosion is obj.h max(oeroded, oeroded2); do not add clone #5.
 * Seed is o_id ^ (unsigned) ubirthday (contest getnow).
 * wipeout_text is late-bound from engrave.js (objnam→engrave TDZ).
 */
function erode_obj_text(otmp, buf) {
    const a = otmp?.oeroded | 0;
    const b = otmp?.oeroded2 | 0;
    const erosion = a > b ? a : b;
    if (!erosion) return buf;
    const cnt = ((String(buf).length * erosion) / (2 * MAX_ERODE)) | 0;
    const seed = ((otmp.o_id >>> 0) ^ (game.ubirthday >>> 0)) >>> 0;
    return _wipeout_text ? _wipeout_text(buf, cnt, seed) : buf;
}

/**
 * C ref: read.c tshirt_text `:99–187` — slogan from o_id % SIZE, then erode.
 */
export function tshirt_text(tshirt) {
    const n = shirt_msgs.length;
    const msg = shirt_msgs[((tshirt?.o_id >>> 0) % n) >>> 0] || shirt_msgs[0];
    return erode_obj_text(tshirt, msg);
}

/**
 * C ref: read.c hawaiian_motif `:189–221` — (o_id ^ ubirthday) % SIZE.
 * Tourist starter shirt o_id is stable; birthday supplies the mix.
 * Named omit: hawaiian_design (doread; different ~ubirthday hash).
 */
export function hawaiian_motif(shirt) {
    const n = hawaiian_motifs.length;
    const motif = ((shirt?.o_id >>> 0) ^ (game.ubirthday >>> 0)) >>> 0;
    return hawaiian_motifs[motif % n] || hawaiian_motifs[0];
}

/**
 * C ref: read.c apron_text `:253–281` — alchemy smock slogan + erode.
 */
export function apron_text(apron) {
    const n = apron_msgs.length;
    const msg = apron_msgs[((apron?.o_id >>> 0) % n) >>> 0] || apron_msgs[0];
    return erode_obj_text(apron, msg);
}

/**
 * C ref: read.c candy_wrapper_text `:295–300` — candy_wrappers[spe % SIZE].
 */
export function candy_wrapper_text(obj) {
    const n = candy_wrappers.length;
    return candy_wrappers[((obj?.spe | 0) % n) >>> 0] || '';
}

/**
 * C ref: objnam.c xcalled `:557–572` — append `pfx + " called " + sfx`
 * at eos(buf). siz is BUFSZ or BUFSZ-PREFIX; C panics if prefix will not
 * fit (named). `%.*s` truncates sfx to remaining room.
 */
function xcalled(buf, siz, pfx, sfx) {
    const base = String(buf ?? '');
    const p = String(pfx ?? '');
    const s = String(sfx ?? '');
    const pfxlen = p.length + 8; /* sizeof " called " - sizeof "" */
    const bufsiz = (siz | 0) - 1 - base.length;
    let take = s;
    if (pfxlen <= bufsiz) {
        const room = bufsiz - pfxlen;
        if (room < s.length) take = s.slice(0, Math.max(0, room));
    }
    return `${base}${p} called ${take}`;
}

function xcalled_xname(buf, pfx, sfx) {
    return xcalled(buf, BUFSZ - XNAME_PREFIX, pfx, sfx);
}

/**
 * C ref: objnam.c xname_flags `:971–996` — gameover disclosure for
 * readable clothing / candy. Dummy o_id==0 (minimal_xname) skips.
 * Named: PREFIX/obuf overflow paniclog; hawaiian_design is doread.
 */
function xname_gameover_suffix(obj) {
    if (!game.program_state?.gameover || !(obj?.o_id | 0)) return '';
    const typ = obj.otyp | 0;
    if (typ === T_SHIRT) {
        return ` with text "${tshirt_text(obj)}"`;
    }
    if (typ === ALCHEMY_SMOCK) {
        return ` with text "${apron_text(obj)}"`;
    }
    if (typ === CANDY_BAR) {
        const lbl = candy_wrapper_text(obj);
        if (lbl) return ` labeled "${lbl}"`;
        return '';
    }
    if (typ === HAWAIIAN_SHIRT) {
        return ` with ${an(hawaiian_motif(obj))} motif`;
    }
    return '';
}

function pretty_base(obj) {
    const n = objectNames[obj.otyp];
    // C ref: objnam.c xname_flags FOOD_CLASS SLIME_MOLD `:747–774` —
    // fruit_from_indx(obj->spe); missing → "fruit" (impossible pline is
    // named: xname/doname are sync). fname only; quan pluralize is in
    // xname/doname (C sets pluralize FALSE after singular→plural ick).
    if ((obj.otyp | 0) === SLIME_MOLD) {
        const f = fruit_from_indx(obj.spe | 0);
        if (!f) return 'fruit';
        return String(f.fname || '');
    }
    // C ref: objnam.c xname_flags FOOD_CLASS — Concat(actualn);
    // if (typ == TIN && known) tin_details(...). Unidentified → bare "tin".
    if (n === 'TIN') return obj.known ? tin_details(obj) : 'tin';
    // C: FOOD_CLASS globby — "%s %s" size + OBJ_NAME (owt thresholds).
    // C objnam.c `:775–781` partly_eaten_hack: shrink_glob() wants xname()
    // (via Yname2) to add "partly eaten" that doname() would otherwise own.
    if (obj.globby) {
        const actualn = objectNameStrs[obj.otyp]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'glob');
        const owt = obj.owt | 0;
        const size = owt <= 100 ? 'small'
            : owt <= 300 ? 'medium'
                : owt <= 500 ? 'large'
                    : 'very large';
        const partly = (game.iflags?.partly_eaten_hack && obj.oeaten) ? 'partly eaten ' : '';
        return `${partly}${size} ${actualn}`;
    }
    // C: corpse → "<monster> corpse" when corpsenm known
    if (n === 'CORPSE' && obj.corpsenm != null && obj.corpsenm >= 0)
        return `${mon_name(obj.corpsenm)} corpse`;
    // C ref: objnam.c xname_flags ROCK_CLASS STATUE `:802-814` —
    // Snprintf "%s%s of %s%s": historic (Role Archeologist + spe HISTORIC),
    // actualn, then pname → "" / unique → "the " / else just_an over
    // obj_pmname (gender-aware, not mon_name).
    if (n === 'STATUE' && obj.corpsenm != null && obj.corpsenm >= 0) {
        const omndx = obj.corpsenm | 0;
        if (omndx === NON_PM || !ismnum(omndx)) return 'statue';
        const statue_pmname = obj_pmname_corpse(obj);
        const ptr = mons(omndx);
        const pmart = type_is_pname_objnam(ptr) ? ''
            : the_unique_pm(ptr) ? 'the '
                : just_an(statue_pmname);
        const historic = (Role_if(PM_ARCHEOLOGIST)
            && ((obj.spe | 0) & CORPSTAT_HISTORIC) !== 0) ? 'historic ' : '';
        return `${historic}statue of ${pmart}${statue_pmname}`;
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
            // C: xcalled(buf, BUFSZ-PREFIX, "", un) after "potion" is in buf
            return un ? xcalled_xname(buf, '', un) : buf;
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
        if (un) return xcalled_xname('scroll', '', un);
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
            if (un) return xcalled_xname('', 'novel', un);
            return `${dn} book`;
        }
        if (!dknown) return 'spellbook';
        if (nn) {
            if (n === 'SPE_BOOK_OF_THE_DEAD') return actual;
            return `spellbook of ${actual}`;
        }
        if (un) return xcalled_xname('', 'spellbook', un);
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
        if (un) return xcalled_xname('', 'ring', un);
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
        if (un) return xcalled_xname('', 'wand', un);
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
            if (un) return xcalled_xname('', rock, un);
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
        if (un) return xcalled_xname('', 'amulet', un);
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
        // before VENOM/TOOL fallthrough (lenses/towel overwrite it per the
        // C note; the two are never simultaneously possible).
        // Named omission: ConcUpdate (buffer mgmt).
        if (obj.oclass === WEAPON_CLASS
            && is_poisonable(obj) && obj.opoisoned) {
            buf = 'poisoned ';
        }
        // C ref: objnam.c xname_flags `:705–707` — LENSES → "pair of ",
        // else is_wet_towel (obj.h `:256`: TOWEL && spe > 0) → moist/wet.
        if (n === 'LENSES') buf = 'pair of ';
        else if (obj.otyp === TOWEL && (obj.spe | 0) > 0) {
            buf = ((obj.spe | 0) < 3) ? 'moist ' : 'wet ';
        }
        if (!dknown) buf += dn;
        else if (nn) buf += actual;
        else if (un) buf = xcalled_xname(buf, dn, un);
        else buf += dn;
        // C ref: objnam.c xname_flags `:709-714` — FIGURINE with a known
        // corpsenm appends " of <pm>" (obj_pmname, gender-aware) after the
        // base name; the STATUE twin lives in the ROCK_CLASS arm above.
        if (n === 'FIGURINE' && obj.corpsenm != null) {
            const omndx = obj.corpsenm | 0;
            if (omndx !== NON_PM && ismnum(omndx)) {
                const pm = obj_pmname_corpse(obj);
                buf += ` of ${just_an(pm)}${pm}`;
            }
        } else if (obj.otyp === TOWEL && (obj.spe | 0) > 0) {
            // C `:719–723` — wizard sees the wetness count (" (%d)").
            // `wizard` is `flags.debug` (append_wizweight_suffix idiom).
            if (game.flags?.debug) buf += ` (${obj.spe | 0})`;
        }
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
        else if (un) buf = xcalled_xname(buf, dn, un); // named omit: armor_simple_name
        else buf += dn;
        return buf;
    }
    // C ref: objnam.c xname_flags COIN_CLASS/CHAIN_CLASS `:788–791` —
    // Strcpy(buf, actualn): bare OBJ_NAME; quan pluralize is the wrapper's.
    if (obj.oclass === COIN_CLASS || obj.oclass === CHAIN_CLASS) {
        let actual = objectNameStrs[obj.otyp]
            || PRETTY[n]
            || (n ? n.toLowerCase().replace(/_/g, ' ') : 'object');
        if (Role_if_samurai()) {
            const jn = Japanese_item_name(obj.otyp, null);
            if (jn) actual = jn;
        }
        return actual;
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
 * C ref: objnam.c xname `:575–578` — `return xname_flags(obj, CXN_NORMAL)`.
 * C xname_flags: observe_object when !Blind && !gd.distantname (D-0469).
 * Distant formatting must go through distant_name so the flag suppresses
 * discovery; map generic glyphs still observe via display.map_object.
 * C: xname omits monster type for CORPSE ("corpse"); cxname/doname use
 * corpse_xname (doname CXN_ARTICLE|CXN_NOCORPSE; D-1255).
 */
export function xname(obj) {
    return xname_flags(obj, CXN_NORMAL);
}

/**
 * C ref: objnam.c xname_flags `:581–1029` — full object base-name
 * formatter. The class switch lives in pretty_base() (same file, one arm
 * per C case, cited per arm); buffer machinery (gx.xnamep = nextobuf(),
 * PREFIX reservation, ConcUpdate/Concat truncation, eos overflow
 * paniclog `:941–969, :1014–1029`) is by-design JS strings (named map).
 * Samurai Japanese_item_name + harp→koto (`:607–626`) apply per arm;
 * !actualn → generic/object? and !dn → actualn (`:627–631`) are the
 * per-arm `|| actual` / `if (!dn) dn = actual` fallbacks; the default
 * glorkum arm (`:933–937`) is unreachable for a valid oclass — the
 * fallthrough base stands in and impossible() (async in JS) is named.
 * SLIME_MOLD impossible() on a bad fruit index is likewise named
 * (xname/doname are sync; precedent D-1511).
 */
export function xname_flags(obj, cxn_flags) {
    if (!obj) return 'something';
    // C `:596` — pluralize on quan != 1 unless CXN_SINGULAR.
    const singular = ((((cxn_flags | 0) & CXN_SINGULAR)) !== 0);
    // C `:632–636` — !nn && oc_uses_known && oc_unique → known=0
    // (article leak).
    clear_unique_known_leak(obj);
    // C `:637` — Role_if(PM_CLERIC) → obj->bknown = 1 (bypass set_bknown
    // and its update_inventory()).
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    // C `:638` — if (!Blind && !gd.distantname) observe_object(obj);
    // Prop Blind — sticky u.Blind misses FROMFORM molds (D-0928 #1180).
    if (!Blind() && !(game.distantname | 0) && _xname_observe) {
        _xname_observe(obj);
    }
    /* C `:640–650` — iflags.override_ID forces known=dknown=bknown=TRUE
       and nn=1 for the switch below. Arms read the obj/ocl fields, so
       stage the C locals there and restore afterwards (sync; finally).
       find_artifact below still gates on the real obj->dknown per the
       C comment, so capture it first. */
    const realDknown = !!obj.dknown;
    const ocl = game.objects?.[obj.otyp];
    let savedID = null;
    if ((game.iflags?.override_ID | 0) !== 0) {
        savedID = {
            known: obj.known, dknown: obj.dknown, bknown: obj.bknown,
            nn: ocl ? ocl.oc_name_known : undefined,
        };
        obj.known = 1; obj.dknown = 1; obj.bknown = 1;
        if (ocl) ocl.oc_name_known = 1;
    }
    try {
        // C `:652–672` — maybe find a previously unseen artifact, gated
        // on the real dknown (not the override_ID variant) so wizard-mode
        // ^I on a blind-picked artifact does not mark it found. After
        // observe_object (which can set dknown), before obj_is_pname.
        if (obj?.oartifact && realDknown && _find_artifact) _find_artifact(obj);
        const n = objectNames[obj.otyp];
        if (n === 'CORPSE') {
            let base = 'corpse';
            if (!singular && (obj.quan || 1) !== 1) base = makeplural(base);
            return base;
        }
        // C `:674–676` — obj_is_pname(obj) → goto nameit (bare ONAME, no
        // base type / poisoned prefix / pluralize / gameover suffix).
        // Partial-ID artifacts fall through to actualn + " named ONAME".
        // Gameover disclosure (end.c possessions identified) takes this
        // arm for every artifact with an oname (obj_is_pname skips ID).
        if (obj_is_pname(obj) && has_oname(obj)) {
            let nm = String(ONAME(obj) ?? '');
            // C `:1004–1008` — downcase "The" in "<item> named The ..."
            // then strip leading "the " (doname re-adds its own).
            if (obj.oartifact && nm.slice(0, 4) === 'The ') nm = `t${nm.slice(1)}`;
            if (nm.length >= 4 && nm.slice(0, 4).toLowerCase() === 'the ') {
                nm = nm.slice(4);
            }
            return nm;
        }
        let base = pretty_base(obj);
        /* C ROCK_CLASS `:814–823` — BOULDER && next_boulder==1 formats
           "next boulder" then clears to 0. Overloaded corpsenm defaults
           to NON_PM (-1); check ==1 not !=0. D-1294. */
        if ((obj.otyp | 0) === BOULDER && (obj.next_boulder | 0) === 1) {
            base = `next ${base}`;
            obj.next_boulder = 0;
        }
        // C FOOD SLIME_MOLD `:765–773` — if (pluralize) singular then
        // plural, then pluralize=FALSE (already-plural fname; D-1511).
        if ((obj.otyp | 0) === SLIME_MOLD) {
            if (!singular && (obj.quan || 1) !== 1) base = makeplural(makesingular(base));
        } else if (!singular && (obj.quan || 1) !== 1) {
            base = makeplural(base);
        }
        // C `:971–996` — gameover disclosure after pluralize, before oname.
        base += xname_gameover_suffix(obj);
        // C `:998–1009` — has_oname && dknown → " named " ONAME (+The fix).
        const onameStr = obj.oextra?.oname;
        if (onameStr && obj.dknown) {
            const nameStart = base.length + ' named '.length;
            base += ` named ${onameStr}`;
            if (obj.oartifact && base.slice(nameStart, nameStart + 4) === 'The ') {
                base = `${base.slice(0, nameStart)}t${base.slice(nameStart + 1)}`;
            }
        }
        // C `:1011–1012` — strip leading "the " (doname_base
        // artifact_name(bp) sees this pointer; D-1521 fake_arti).
        if (base.length >= 4 && base.slice(0, 4).toLowerCase() === 'the ') {
            base = base.slice(4);
        }
        return base;
    } finally {
        if (savedID) {
            obj.known = savedID.known;
            obj.dknown = savedID.dknown;
            obj.bknown = savedID.bknown;
            if (ocl && savedID.nn !== undefined) ocl.oc_name_known = savedID.nn;
        }
    }
}

/**
 * C ref: objnam.c mshot_xname :1090-1102 — "the Nth <xname>" while a
 * multishot volley of the same otyp is in flight (gm.m_shot.n > 1,
 * gm.m_shot.o == obj->otyp); bare xname otherwise. The "the " prefix is
 * for an()/The(), which handle it. C strprepend (objnam.c staticfn :123)
 * is plain prefix concat in JS.
 */
export function mshot_xname(obj) {
    let onm = xname(obj);
    const ms = game.m_shot;
    if (ms && (ms.n | 0) > 1 && (ms.o | 0) === (obj.otyp | 0)) {
        const i = ms.i | 0;
        onm = `the ${i}${ordin(i)} ` + onm;
    }
    return onm;
}

/**
 * C ref: objnam.c distant_name `:345–409` — r/neardist (`:360–378`;
 * xray_range>2 else 2, neardist=(r*r)*2-r); gameover o_id wipe (`:382–383`,
 * restored `:406`); near (get_obj_location+cansee+(oartifact||distu<=neardist))
 * formats directly with observe side-effects; far wraps func in
 * gd.distantname++/-- (`:397–400`, D-2745).
 * Named omissions: artifact find via near path only covered by
 * observe/dknown; get_obj_location buried/contained locflags.
 */
export function distant_name(obj, func) {
    if (!obj || typeof func !== 'function') return func ? func(obj) : '';
    /* C `:373–383` — setting o_id to 0 prevents xname() from adding
       T-shirt/apron slogan, Hawaiian motif, or candy label when
       program_state.gameover is set (html-dump/map-tooltip guard). */
    const save_oid = obj.o_id;
    if (game.program_state?.gameover) obj.o_id = 0;
    try {
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
    } finally {
        obj.o_id = save_oid; /* C `:406` reset to normal */
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
export function obj_pmname_corpse(obj) {
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
 * C ref: objnam.c corpse_xname `:1824–1920` — corpse/glob name with
 * CXN_SINGULAR / NO_PFX / PFX_THE / ARTICLE / NOCORPSE (D-1234, D-1255).
 * Buffer arms by design: C nextobuf/PREFIX + eos/Sprintf + releaseobuf
 * are plain JS strings (D-2483 idiom). `s_suffix`/`type_is_pname`/
 * `mungspaces` use the file-local copies (`s_suffix_objnam`,
 * `type_is_pname_objnam`, `mungspaces_objnam` — bodies identical to the
 * live do_name.js/getline.js exports; local to avoid a do_name/getline
 * cycle: a static edge reorders cycle eval past shk.js:832 and TDZ-faults
 * `let _shk_owns_prefix` at cohort startup — reverted, this iteration).
 */
export function corpse_xname(obj, adjective, cxn_flags) {
    // C :1830–1841: omndx + CXN flag decode (comments verbatim in C).
    const flags = cxn_flags | 0;
    const omndx = obj?.corpsenm;
    const ignore_quan = (flags & CXN_SINGULAR) !== 0;
    let no_prefix = (flags & CXN_NO_PFX) !== 0;
    let the_prefix = (flags & CXN_PFX_THE) !== 0;
    let any_prefix = (flags & CXN_ARTICLE) !== 0;
    const omit_corpse = (flags & CXN_NOCORPSE) !== 0;
    let possessive = false;
    // C :1841: glob = (otmp->otyp != CORPSE && otmp->globby)
    const glob = (obj?.otyp | 0) !== CORPSE && !!obj?.globby;

    let mnam;
    if (glob) {
        // C :1843: mnam = OBJ_NAME(objects[otmp->otyp]) — "glob of <monster>"
        mnam = objectNameStrs[obj.otyp]
            || objectNames[obj.otyp]?.toLowerCase().replace(/_/g, ' ')
            || 'glob';
    } else if (omndx == null || (omndx | 0) < 0 || omndx === NON_PM) {
        // C :1844–1845: omndx == NON_PM (paranoia) → "thing"; the
        // null/negative guard is JS null-safety for unset corpsenm.
        mnam = 'thing';
    } else {
        // C :1847: mnam = obj_pmname(otmp) — do_name.c valid arm
        // (gender-aware pmname + aligned-cleric remap); the impossible/
        // glorkum-seeker fallback is map-named (unreachable for CORPSE).
        mnam = obj_pmname_corpse(obj);
        const ptr = mons(omndx);
        // C :1848: unique or pname → s_suffix possessive
        if (the_unique_pm(ptr) || type_is_pname_objnam(ptr)) {
            mnam = s_suffix_objnam(mnam);
            possessive = true;
            if (type_is_pname_objnam(ptr)) {
                // C :1852–1853: personal name like "Medusa" takes no article
                no_prefix = true;
            } else if (the_unique_pm(ptr) && !no_prefix) {
                // C :1856–1857: non-personal unique like "Oracle" takes "the"
                the_prefix = true;
            }
        }
    }
    // C :1860–1863: prefix mutual exclusion
    if (no_prefix) {
        the_prefix = false;
        any_prefix = false;
    } else if (the_prefix) {
        any_prefix = false;
    }

    // C :1865–1872: *nambuf = '\0'; the_prefix forces "the " (never the(),
    // which would treat capitalized uniques as pnames — C comment).
    let nambuf = the_prefix ? 'the ' : '';

    // C :1874: !adjective || !*adjective — normal case "newt corpse".
    // JS !adjective covers C NULL/"" plus do.c's 0-for-NULL idiom.
    if (!adjective) {
        nambuf += mnam;
    } else if (possessive) {
        // C :1879: "Medusa's cursed partly eaten corpse"
        nambuf += `${mnam} ${adjective}`;
        // C :1884: squeeze a trailing-space adjective
        nambuf = mungspaces_objnam(nambuf);
        // C :1887: doname() count in the adjective → no article;
        // C digit() is ASCII '0'–'9' (hacklib.c:62–65).
        const c0 = String(adjective).charCodeAt(0);
        if (c0 >= 48 && c0 <= 57) any_prefix = false;
    } else {
        // C :1881: "cursed partly eaten troll corpse"
        nambuf += `${adjective} ${mnam}`;
        nambuf = mungspaces_objnam(nambuf);
        const c0 = String(adjective).charCodeAt(0);
        if (c0 >= 48 && c0 <= 57) any_prefix = false;
    }

    if (glob) {
        // C :1890: omit_corpse doesn't apply; quantity is always 1
    } else if (!omit_corpse) {
        // C :1892–1897: Strcat " corpse"; plural appends "s" (not
        // makeplural); quan > 1 clears any_prefix ("a newt corpses").
        nambuf += ' corpse';
        if ((obj?.quan ?? 1) > 1 && !ignore_quan) {
            nambuf += 's';
            any_prefix = false;
        }
    }

    // C :1902–1908: any_prefix → an(); releaseobuf(obufp) frees the an()
    // buffer — by-design no-op in JS (GC strings, D-2483 idiom).
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
 * C ref: objnam.c cxname_singular `:1934–1939` — like cxname but ignores
 * quantity (sortloot / loot_xname): corpse via corpse_xname, else
 * xname_flags(obj, CXN_SINGULAR). C never mutates quan for this.
 */
export function cxname_singular(obj) {
    if (obj && objectNames[obj.otyp] === 'CORPSE') {
        return corpse_xname(obj, null, CXN_SINGULAR);
    }
    return xname_flags(obj, CXN_SINGULAR);
}

/** C ref: hacklib.c strstri — case-insensitive substring. */
function strstri_objnam(hay, needle) {
    return String(hay ?? '').toLowerCase().includes(String(needle).toLowerCase());
}

/**
 * C ref: objnam.c gloves_simple_name `:5531–5547` — "gauntlets" iff
 * dknown and (oc_name_known ? OBJ_NAME : OBJ_DESCR) contains
 * "gauntlets" (strstri). Else "gloves". Callers fingers_or_gloves
 * (apply use_grease / use_towel) and fountain/trap local clones stay.
 */
export function gloves_simple_name(gloves) {
    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp | 0;
        const ocl = game.objects?.[otyp];
        const actualn = objectNameStrs[otyp] || '';
        const descrpn = objectDescrs[otyp] || '';
        const s = ocl?.oc_name_known ? actualn : descrpn;
        if (strstri_objnam(s, 'gauntlets')) return 'gauntlets';
    }
    return 'gloves';
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
 * C ref: rumors.c CapitalMon / init_CapMons / free_CapMons — capitalized
 * type/title names that take "the" (Archon, Oracle, Green-elf) vs pname
 * uniques (Medusa).
 *
 * C rumors.c:56-58 keeps three file-static counters next to the list;
 * CapMonSiz is CapMonstCnt+CapBogonCnt+1 (terminator) when non-zero.
 * C:54-55 notes there is no need to put these into game state.
 */
const BOGON_CODES = '-_+|=';
let CapMons = null;
let CapMonstCnt = 0, CapBogonCnt = 0, CapMonSiz = 0;

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

/**
 * C ref: rumors.c free_CapMons `:938–954` — release the capitalized-name
 * list. C frees the dupstr'd hallucination copies
 * (`CapMons[CapMonstCnt .. CapMonSiz-2]`, :948-949) but not the mons[]
 * literals, then the array itself (:950) and zeroes CapMonSiz (:952 —
 * the counts keep their stale values until the next pass 1). JS strings
 * are GC-managed, so only the list linkage is released here.
 * Exported: C linkage is non-static; the only C caller outside init is
 * save.c freedynamicdata `:1129` (named omission — save-freeing teardown
 * has no JS counterpart, fortress guard).
 */
export function free_CapMons() {
    if (CapMons) {
        CapMons = null; // C :950 `free(CapMons), CapMons = 0`
    }
    CapMonSiz = 0; // C :952
}

/**
 * C ref: rumors.c init_CapMons `:829–935` — one-time two-pass build of
 * CapMons[]: non-unique monsters with a capitalized type name (Green-elf,
 * Archon), uniques whose "name" is a title (Oracle), plus hallucinatory
 * names in either category. Pass 1 counts, allocates, pass 2 populates;
 * the first CapMonstCnt entries are mons[] literals, the next
 * CapBogonCnt are hallucination copies, plus a trailing terminator.
 */
function init_CapMons() {
    // C :833 `dlb_fopen(BOGUSMONFILE, "r")` — the contest port embeds the
    // data file at build time (D-0477, Rule #2: no runtime filesystem);
    // a missing embed is C's NULL file handle.
    const bogonfile = (typeof BOGUSMON_BUF === 'string')
        ? String(BOGUSMON_BUF).split('\n') : null;

    if (CapMons) // C :834-836 sanity precaution
        free_CapMons();

    // C :841 first pass counts, then allocates; second pass populates.
    for (let pass = 1; pass <= 2; ++pass) {
        // C :844-849 the first CapMonstCnt entries come from
        // mons[].pmnames[], the next CapBogonCnt from 'bogusmons'.
        CapMonstCnt = CapBogonCnt = 0;

        // C :852-866 gather applicable actual monsters.
        for (let mndx = LOW_PM; mndx < NUMMONS; ++mndx) {
            const mptr = mons(mndx);
            if (!mptr) continue; // JS guard: sparse table hole (C mons[] is dense)
            if ((mptr.geno & G_UNIQ) !== 0 && !the_unique_pm(mptr)) // C :854-855
                continue;
            const names = pmnames[mndx];
            if (!names) continue; // JS guard (C pmnames[] is dense)
            for (let mgend = MALE; mgend < NUM_MGENDERS; ++mgend) { // C :857
                const nam = names[mgend];
                if (nam && nam[0] && nam[0] !== nam[0].toLowerCase()) { // C :859 `*nam != lowc(*nam)`
                    if (pass === 2) // C :860-861
                        CapMons[CapMonstCnt] = nam;
                    ++CapMonstCnt; // C :862
                }
            }
        }

        // C :868-897 now gather applicable hallucinatory monsters.
        if (bogonfile) { // C :871
            // C :874-875 rewind (no-op for pass 1, essential for pass 2):
            // the embed re-iterates from the first line each pass.
            // C :876-877 skips the "don't edit" header line — the
            // extractor already drops it from the embed.
            for (let li = 0; li < bogonfile.length; ++li) {
                const hline = bogonfile[li];
                if (!hline) continue;
                // C :882-884 strip newline (the split leaves none) then
                // xcrypt + unpadline.
                const xbuf = unpadline_objnam(xcrypt_objnam(hline));
                if (!xbuf) continue; // C :885 empty decodes to no candidate
                let code = '', startp = xbuf; // C :886 ordinary
                if (BOGON_CODES.includes(xbuf[0])) { // C :885 `strchr(bogon_codes, xbuf[0])`
                    code = xbuf[0]; // C :888 special
                    startp = xbuf.slice(1);
                }
                if (startp && startp[0] !== startp[0].toLowerCase() // C :890
                    && !bogon_is_pname_objnam(code)) { // C :890 `!bogon_is_pname(code)`
                    if (pass === 2) // C :891-892
                        CapMons[CapMonstCnt + CapBogonCnt] = startp; // C dupstr folded: JS strings are immutable
                    ++CapBogonCnt; // C :893
                }
            }
        }

        // C :899-908 finish the current pass.
        if (pass === 1) {
            CapMonSiz = CapMonstCnt + CapBogonCnt + 1; // C :900 +1 terminator
            CapMons = new Array(CapMonSiz); // C :901 alloc
        } else { // pass === 2
            // C :903-904 terminator; not strictly needed.
            CapMons[CapMonSiz - 1] = null;
            // C :906-907 dlb_fclose — no handle to close on an embed.
        }
    }
    // C :913-932 `#ifdef DEBUG` wizard explicitdebug("CapMons") window
    // dump — named: no DEBUGFILES/wizard-debug window layer in this port.
}

/**
 * C ref: rumors.c CapitalMon — prefix match with space/apostrophe/end boundary.
 */
export function CapitalMon(word) {
    if (!word || word[0] === word[0].toLowerCase()) return false;
    if (!CapMons) init_CapMons();
    const wln = word.length;
    for (let i = 0; i < CapMonSiz - 1; ++i) { // C rumors.c:806 (skips the terminator)
        const nam = CapMons[i];
        const nln = nam.length;
        if (wln < nln) continue;
        if (word.slice(0, nln) !== nam) continue;
        const next = word[nln];
        if (!next || next === ' ' || next === "'") return true;
    }
    return false;
}

/**
 * C ref: objnam.c fruit_from_indx `:431–439` — look up a named fruit by
 * fid (1..127). First match; NULL if the chain has no such index.
 * Bones goodfruit looks up -id (D-1523).
 */
export function fruit_from_indx(indx) {
    const want = indx | 0;
    let f;
    for (f = game.ffruit; f; f = f.nextf) {
        if ((f.fid | 0) === want) break;
    }
    return f || null;
}

/**
 * C ref: objnam.c fruit_from_name `:443–519` — look up a named fruit.
 * exact True: strcmp then makesingular; False also tries longest prefix
 * and prefix+singularize. Case-sensitive. highest_fid optional out
 * `{ fid }` (only meaningful when not found).
 */
export function fruit_from_name(fname, exact, highest_fid = null) {
    if (highest_fid) highest_fid.fid = 0;
    const name = fname == null ? '' : String(fname);
    let f;
    for (f = game.ffruit; f; f = f.nextf) {
        if (f.fname === name) return f;
        else if (highest_fid && f.fid > highest_fid.fid) highest_fid.fid = f.fid;
    }
    if (!exact) {
        let tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            const k = String(f.fname || '').length;
            if (name.slice(0, k) === f.fname
                && (!name[k] || name[k] === ' ')
                && (!tentativef || k > String(tentativef.fname || '').length)) {
                tentativef = f;
            }
        }
        f = tentativef;
    }
    if (!f) {
        const altfname = makesingular(name);
        for (f = game.ffruit; f; f = f.nextf) {
            if (f.fname === altfname) break;
        }
    }
    if (!f && !exact) {
        const fname_k = name.length;
        let tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            const k0 = String(f.fname || '').length;
            if (fname_k >= k0) {
                const sp = name.indexOf(' ', k0);
                if (sp >= 0) {
                    const altfname = makesingular(name.slice(0, sp));
                    const k = altfname.length;
                    if (f.fname === altfname
                        && (!tentativef
                            || k > String(tentativef.fname || '').length)) {
                        tentativef = f;
                    }
                }
            }
        }
        f = tentativef;
    }
    return f || null;
}

/**
 * C ref: objnam.c reorder_fruit `:521–554` — rebuild gf.ffruit by fid.
 * allfr[1+127]; k = SIZE = 128. Valid fid is 1..127. forward TRUE walks
 * indices high→low so the rebuilt list is low→high (1,2,3…); FALSE is
 * the reverse. Out-of-range or duplicate fid: C impossible() then return
 * without sorting (impossible pline named: this helper is sync). Sole C
 * caller is insight.c `#ifdef DEBUG` wizard explicitdebug("fruit") — not
 * production ^X. fruitadd still prepends (order arbitrary until this
 * sorts).
 */
export function reorder_fruit(forward) {
    const k = 1 + 127; /* C SIZE(allfr) */
    const allfr = new Array(k);
    let i, j, f;

    for (i = 0; i < k; ++i) allfr[i] = null;
    for (f = game.ffruit; f; f = f.nextf) {
        j = f.fid | 0;
        if (j < 1 || j >= k) {
            return;
        } else if (allfr[j]) {
            return;
        }
        allfr[j] = f;
    }
    game.ffruit = null;
    for (i = 1; i < k; ++i) {
        j = forward ? (k - i) : i;
        if (allfr[j]) {
            allfr[j].nextf = game.ffruit;
            game.ffruit = allfr[j];
        }
    }
}

/**
 * C ref: artifact.c artifact_name `:329–353` — strcmpi after stripping
 * leading "the "; fuzzy=FALSE (doname_base / the()). Local copy so
 * objnam does not import artifact.js (invent cycle); fuzzy still lives
 * in artifact.js.
 */
function artifact_name_objnam(name) {
    if (!name) return null;
    let n = name;
    if (n.length >= 4 && n.slice(0, 4).toLowerCase() === 'the ') n = n.slice(4);
    for (let i = 1; i < artilistRaw.length; i++) {
        const a = artilistRaw[i];
        if (!a?.name) continue;
        let aname = a.name;
        if (aname.length >= 4 && aname.slice(0, 4).toLowerCase() === 'the ') {
            aname = aname.slice(4);
        }
        if (n.toLowerCase() === aname.toLowerCase()) return a.name;
    }
    return null;
}

/**
 * C ref: objnam.c the() — definite article for non-proper names.
 * fruit_from_name + artifact_name fruit carve (D-1487).
 * slime-mold spe → fruit_from_indx is D-1511.
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
    let aname;
    if (c0 < 65 || c0 > 90
        || CapitalMon(str)
        || (fruit_from_name(str, true, null)
            && ((aname = artifact_name_objnam(str)) == null
                || aname.slice(0, 4).toLowerCase() === 'the '))) {
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
 * C ref: objnam.c Tobjnam — The(xname) then optional " " + otense(verb).
 */
export function Tobjnam(otmp, verb) {
    let bp = The(xname(otmp));
    if (verb) bp += ` ${otense(otmp, verb)}`;
    return bp;
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
 * Compound via singplur_compound singularizes the head only; as_is +
 * special_subjs + craft + slice/mongoose + badman-men keep
 * (singplur_lookup `:2719–2762` singular arms); one_off reverse;
 * -ies/-ves/-es/-s; men→man (badman gate); matzot/ae/eaux.
 * Named omissions: pronoun they/them/their block; ia→ium
 * (balactherium `:3149–3153`, own row); full Strcasecpy case polish.
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
    /* C objnam.c singplur_lookup `:2732` — "craft" suffix stays as-is
       (aircraft, hovercraft); bare "craft" (len 5) falls through. */
    if (bp.length > 5 && eqCI(bp.slice(bp.length - 5), 'craft')) {
        return bp + excess;
    }
    /* C `:2736–2743` — whole-word only (strcmpi, not suffix): "slice"
       and "mongoose" stay (avoids the one_off lice/goose false hits
       below); the singular arm performs no transform. */
    if (eqCI(bp, 'slice') || eqCI(bp, 'mongoose')) {
        return bp + excess;
    }
    /* C `:2758–2762` men arm — *men with a no_man prefix (abdomen,
       specimen, omen) is already singular: keep, skip all stripping. */
    if (bp.length > 2 && eqCI(bp.slice(bp.length - 3), 'men')
        && badman(bp, false)) {
        return bp + excess;
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

    /* C `:3137–3140` (singplur_lookup `:2758–2762` men arm converse):
       *men → *man unless badman (abdomen/specimen/omen kept above). */
    if (/men$/i.test(bp) && bp.length >= 3 && !badman(bp, false)) {
        bp = bp.slice(0, -2) + (bp[bp.length - 2] === 'E' ? 'AN' : 'an');
        return bp + excess;
    }
    if (/matzot$/i.test(bp) || /ae$/i.test(bp) || /eaux$/i.test(bp)) {
        bp = bp.slice(0, -1);
        return bp + excess;
    }

    return bp + excess;
}

// C ref: decl.c vowels[] `:111` — "aeiouAEIOU"; makeplural lowc's first.
const MAKEPLURAL_VOWELS = 'aeiou';

/** C ref: hacklib.c lowc — ASCII 'A'..'Z' |= 040. */
function plural_lowc(c) {
    const code = c.charCodeAt(0);
    return (code >= 65 && code <= 90) ? String.fromCharCode(code | 0x20) : c;
}

/**
 * C ref: hacklib.c letter() — '@'..'Z' or 'a'..'z' ('@' classes as letter,
 * so '[', '\\', ']', '^', '_' count as letters too).
 */
function plural_letter(c) {
    return (c >= '@' && c <= 'Z') || (c >= 'a' && c <= 'z');
}

/** C ref: hacklib.c strcmpi/strncmpi — ASCII case-insensitive equality. */
function eqCI(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (plural_lowc(a[i]) !== plural_lowc(b[i])) return false;
    }
    return true;
}

/** C ref: hacklib.c chrcasecpy `:300–313` — convert nc into oc's case. */
function chrcasecpy(oc, nc) {
    if (oc >= 'a' && oc <= 'z') {
        if (nc >= 'A' && nc <= 'Z') return String.fromCharCode(nc.charCodeAt(0) + 32);
    } else if (oc >= 'A' && oc <= 'Z') {
        if (nc >= 'a' && nc <= 'z') return String.fromCharCode(nc.charCodeAt(0) - 32);
    }
    return nc;
}

/**
 * C ref: hacklib.c strcasecpy `:322–341` — overwrite at `at` with `src`,
 * each char taking the case of the char it replaces; overrun past the old
 * end takes the case of the last old char (C reads dst[-1] when dst starts
 * empty — unreachable here: every append arm has a non-empty head).
 */
function strcasecpy_at(base, at, src) {
    let out = base.slice(0, at);
    for (let i = 0; i < src.length; i++) {
        const ref = (at + i < base.length) ? base[at + i] : base[at - 1];
        out += chrcasecpy(ref, src[i]);
    }
    return out;
}

// C ref: objnam.c as_is[] `:2689–2713` — collective nouns kept as-is.
// (The first 8 live in AS_IS_PLURALS above; these are the rest.)
const AS_IS_COLLECTIVE = [
    'bison', 'deer', 'elk', 'fish', 'fowl',
    'tuna', 'yaki', '-hai', 'krill', 'manes',
    'moose', 'ninja', 'sheep', 'ronin', 'roshi',
    'shito', 'tengu', 'ki-rin', 'Nazgul', 'gunyoki',
    'piranha', 'samurai', 'shuriken', 'haggis', 'Bordeaux',
];

// C ref: objnam.c already_plural[] `:2905–2909` (ae, eaux, matzot).
const ALREADY_PLURAL = ['ae', 'eaux', 'matzot'];

// C ref: objnam.c badman no_men[] `:3197–3203` — *man without a *men plural.
const NO_MEN_PREFIX = [
    'albu', 'antihu', 'anti', 'ata', 'auto', 'bildungsro', 'cai', 'cay',
    'ceru', 'corner', 'decu', 'des', 'dura', 'fir', 'hanu', 'het',
    'infrahu', 'inhu', 'nonhu', 'otto', 'out', 'prehu', 'protohu',
    'subhu', 'superhu', 'talis', 'unhu', 'sha',
    'hu', 'un', 'le', 're', 'so', 'to', 'at', 'a',
];

// C ref: objnam.c badman no_man[] `:3205–3210` — *men without a *man singular.
const NO_MAN_PREFIX = [
    'abdo', 'acu', 'agno', 'ceru', 'cogno', 'cycla', 'fleh', 'grava',
    'hegu', 'preno', 'sonar', 'speci', 'dai', 'exa', 'fla', 'sta', 'teg',
    'tegu', 'vela', 'da', 'hy', 'lu', 'no', 'nu', 'ra', 'ru', 'se', 'vi',
    'ya', 'o', 'a',
];

/**
 * C ref: objnam.c badman `:3193–3239` — the *man prefix has no *men plural
 * (to_plural) or the *men prefix has no *man singular (!to_plural).
 * The prefix must sit at the string start or right after a space
 * (C `spot == basestr || *(spot - 1) == ' '`).
 */
function badman(base, to_plural) {
    if (!base || base.length < 4) return false;
    const list = to_plural ? NO_MEN_PREFIX : NO_MAN_PREFIX;
    const end = base.length;
    for (const p of list) {
        const spot = end - (p.length + 3);
        if (spot < 0) continue; // C BSTRNCMPI `(ptr) < base`
        let match = true;
        for (let i = 0; i < p.length; i++) {
            if (plural_lowc(base[spot + i]) !== plural_lowc(p[i])) {
                match = false;
                break;
            }
        }
        if (match && (spot === 0 || base[spot - 1] === ' ')) return true;
    }
    return false;
}

// C ref: objnam.c ch_ksound ch_k[] `:3169–3174` — *ch with a k-sound.
const CH_K_SOUND = [
    'monarch', 'poch', 'tech', 'mech', 'stomach', 'psych',
    'amphibrach', 'anarch', 'atriarch', 'azedarach', 'broch',
    'gastrotrich', 'isopach', 'loch', 'oligarch', 'peritrich',
    'sandarach', 'sumach', 'symposiarch',
];

/**
 * C ref: objnam.c ch_ksound `:3167–3191` — k-sound *ch words pluralize
 * with 's', not 'es' (stomachs, monarchs — but arches).
 */
function ch_ksound(base) {
    if (!base || base.length < 4) return false;
    const lo = base.toLowerCase();
    for (const k of CH_K_SOUND) {
        if (lo.endsWith(k)) return true;
    }
    return false;
}

/**
 * C ref: objnam.c singplur_lookup `:2707–2779`, to_plural arm —
 * as_is `:2719`, alt_as_is `:2724`, craft `:2732`, slice/mongoose `:2739`,
 * ox `:2746` (fox→foxes, muskox excepted), badman man `:2753`,
 * one_off same-stays / sing-transforms `:2764`.
 * C mutates in place and returns boolean; here the new head, or null.
 */
function singplur_lookup_plural(head) {
    const len = head.length;
    for (const as of AS_IS_PLURALS) {
        // C BSTRCMPI `:66` — (ptr < base || strcmpi): short heads skip.
        if (len >= as.length && eqCI(head.slice(len - as.length), as)) return head;
    }
    for (const as of AS_IS_COLLECTIVE) {
        if (len >= as.length && eqCI(head.slice(len - as.length), as)) return head;
    }
    for (const as of ALREADY_PLURAL) {
        if (len >= as.length && eqCI(head.slice(len - as.length), as)) return head;
    }
    // C `:2732` — "craft" suffix stays (aircraft); bare "craft" (len 5) does not.
    if (len > 5 && eqCI(head.slice(len - 5), 'craft')) return head;
    // C `:2739` — whole-word only (strcmpi, not suffix): slice→slices.
    if (eqCI(head, 'slice') || eqCI(head, 'mongoose')) {
        return strcasecpy_at(head, len, 's');
    }
    // C `:2746` — *ox→*oxes unless muskox (which reaches one_off ox→oxen).
    if (len > 2 && eqCI(head.slice(len - 2), 'ox')
        && !(len > 5 && eqCI(head.slice(len - 6), 'muskox'))) {
        return strcasecpy_at(head, len, 'es');
    }
    // C `:2753` — badman *man words (human, shaman) just take s.
    if (len > 2 && eqCI(head.slice(len - 3), 'man') && badman(head, true)) {
        return strcasecpy_at(head, len, 's');
    }
    for (const [sing, plur] of ONE_OFF_PLURALS) {
        if (len >= plur.length && eqCI(head.slice(len - plur.length), plur)) {
            return head; // already plural: children, feet, mice …
        }
        if (len >= sing.length && eqCI(head.slice(len - sing.length), sing)) {
            return strcasecpy_at(head, len - sing.length, plur);
        }
    }
    return null;
}

/**
 * C ref: objnam.c makeplural `:2836–3022` — pronoun block, "pair of" skip,
 * singplur_compound head/excess split, trailing-blank strip, single-letter
 * / non-letter "'s", already_plural + ya, man→men (badman guard), f→ves
 * ([aeioulr]f, erf exclusion), ium→ia, alga-type +e, us→i (lotus/wumpus
 * keep es), sis→ses, eau→eaux (bureau keeps s), matzoh/matza→matzot,
 * dex/dix/tex→ices (index keeps es), z/x/s/ch/sh+es (ch_ksound k-words keep
 * s) + tomato/dingo kludge, consonant-y→ies, default +s — all through
 * Strcasecpy case-preserving overwrite.
 * Named omission: impossible("plural of null?") `:2841` log on null/empty
 * (async pline chain; sync makeplural keeps C's "s" return).
 */
export function makeplural(s) {
    if (s == null || s === '') return 's';
    while (s.startsWith(' ')) s = s.slice(1);
    /* C `:2853–2869` — makeplural() is used on monsters as well as
       objects, and monsters get referred to by pronoun, so check those
       first. "her" (genders[1].him and .his) and "it" (genders[2].he and
       .him) are ambiguous; C takes the first match in he/him/his order
       and lets the caller fix things up, which is what monverbself does. */
    const lo = s.toLowerCase();
    for (let i = 0; i <= 2; i++) {
        let str = '';
        if (lo === genders[i].he) str = genders[3].he;       /* "they" */
        else if (lo === genders[i].him) str = genders[3].him; /* "them" */
        else if (lo === genders[i].his) str = genders[3].his; /* "their" */
        if (str) {
            if (s.charAt(0) === highc(s.charAt(0))) {
                str = highc(str.charAt(0)) + str.slice(1);
            }
            return str;
        }
    }
    // C `:2879` — "pair of" stays collective ("3 pair of boots").
    if (/^pair of /i.test(s)) return s;
    // C `:2883–2892` — pluralize the compound head only, re-append excess.
    let head = s, excess = '';
    const cmpIdx = singplur_compound(s);
    if (cmpIdx >= 0) {
        head = s.slice(0, cmpIdx);
        excess = s.slice(cmpIdx);
    }
    // C `:2891–2896` — strip blanks from end; `spot > str` keeps a lone blank.
    let end = head.length - 1;
    while (end > 0 && head[end] === ' ') end--;
    head = head.slice(0, end + 1);
    const len = head.length;
    // C `:2897–2903` — single letters and non-letter endings take "'s".
    if (len === 1 || !plural_letter(head[len - 1])) {
        return head + "'s" + excess;
    }
    // C `:2905–2916` — already-plural words stay via singplur_lookup.
    const looked = singplur_lookup_plural(head);
    if (looked !== null) return looked + excess;
    // C `:2917` — "ya" (Samurai bamboo arrows) never pluralizes.
    if ((len === 2 && eqCI(head, 'ya'))
        || (len >= 3 && eqCI(head.slice(len - 3), ' ya'))) {
        return head + excess;
    }
    // C `:2922–2926` — man→men ("Wiped out all cavemen"); badman keeps s.
    if (len >= 3 && eqCI(head.slice(len - 3), 'man') && !badman(head, true)) {
        return strcasecpy_at(head, len - 2, 'en') + excess;
    }
    // C `:2928–2938` — [aeioulr]f→ves (staff rides one_off); erf falls through.
    if (plural_lowc(head[len - 1]) === 'f') {
        const fprev = plural_lowc(head[len - 2]);
        if (!(len >= 3 && eqCI(head.slice(len - 3), 'erf'))
            && (fprev === 'l' || fprev === 'r' || MAKEPLURAL_VOWELS.includes(fprev))) {
            return strcasecpy_at(head, len - 1, 'ves') + excess;
        }
    }
    // C `:2940–2943` — ium→ia (mycelia, baluchitheria).
    if (len >= 3 && eqCI(head.slice(len - 3), 'ium')) {
        return strcasecpy_at(head, len - 3, 'ia') + excess;
    }
    // C `:2944–2952` — alga/larva/hypha/amoeba/vertebra take +e.
    if ((len >= 4 && eqCI(head.slice(len - 4), 'alga'))
        || (len >= 5 && (eqCI(head.slice(len - 5), 'hypha') || eqCI(head.slice(len - 5), 'larva')))
        || (len >= 6 && eqCI(head.slice(len - 6), 'amoeba'))
        || (len >= 8 && eqCI(head.slice(len - 8), 'vertebra'))) {
        return strcasecpy_at(head, len, 'e') + excess;
    }
    // C `:2954–2960` — us→i, but lotuses and wumpuses keep es.
    if (len > 3 && eqCI(head.slice(len - 2), 'us')
        && !((len >= 5 && eqCI(head.slice(len - 5), 'lotus'))
            || (len >= 6 && eqCI(head.slice(len - 6), 'wumpus')))) {
        return strcasecpy_at(head, len - 2, 'i') + excess;
    }
    // C `:2962–2965` — sis→ses (nemesis rides one_off; oases here).
    if (len >= 3 && eqCI(head.slice(len - 3), 'sis')) {
        return strcasecpy_at(head, len - 2, 'es') + excess;
    }
    // C `:2967–2971` — eau→eaux, but the common "bureaus" keeps s.
    if (len >= 3 && eqCI(head.slice(len - 3), 'eau')
        && (len < 6 || !eqCI(head.slice(len - 6), 'bureau'))) {
        return strcasecpy_at(head, len, 'x') + excess;
    }
    // C `:2973–2985` — matzoh/matzah→matzot; matzo/matza→matzot.
    if (len >= 6 && (eqCI(head.slice(len - 6), 'matzoh') || eqCI(head.slice(len - 6), 'matzah'))) {
        return strcasecpy_at(head, len - 2, 'ot') + excess;
    }
    if (len >= 5 && (eqCI(head.slice(len - 5), 'matzo') || eqCI(head.slice(len - 5), 'matza'))) {
        return strcasecpy_at(head, len - 1, 'ot') + excess;
    }
    const lo_c = plural_lowc(head[len - 1]);
    // C `:2987–2997` — codex→codices and the like (but indexes).
    if (len >= 5
        && (eqCI(head.slice(len - 3), 'dex') || eqCI(head.slice(len - 3), 'dix') || eqCI(head.slice(len - 3), 'tex'))
        && !eqCI(head.slice(len - 5), 'index')) {
        return strcasecpy_at(head, len - 2, 'ices') + excess;
    }
    // C `:3000–3009` — z/x/s/ch/sh take es (k-sound ch keeps s) + tomato/dingo.
    if ('zxs'.includes(lo_c)
        || (len >= 2 && lo_c === 'h' && 'cs'.includes(plural_lowc(head[len - 2]))
            && !(len >= 4 && plural_lowc(head[len - 2]) === 'c' && ch_ksound(head)))
        || (len >= 4 && eqCI(head.slice(len - 3), 'ato'))
        || (len >= 5 && eqCI(head.slice(len - 5), 'dingo'))) {
        return strcasecpy_at(head, len, 'es') + excess;
    }
    // C `:3011–3014` — consonant-y→ies (quy keeps s: u is a vowel).
    if (lo_c === 'y' && !MAKEPLURAL_VOWELS.includes(plural_lowc(head[len - 2]))) {
        return strcasecpy_at(head, len - 1, 'ies') + excess;
    }
    // C `:3016` — default: append s (case follows the last letter).
    return strcasecpy_at(head, len, 's') + excess;
}

/**
 * C ref: objnam.c just_an `:2108–2142` — article prefix only ("a "/"an "/"").
 * x_monnam ARTICLE_A uses this, not an() (C "avoid an() here").
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function just_an(str) {
    const s = str == null ? '' : String(str);
    if (!s) return 'a ';
    const c0 = s.charAt(0).toLowerCase();
    /* single letter; might be used for named fruit or a musical note */
    if (!s[1] || s[1] === ' ') {
        return 'aefhilmnosx'.includes(c0) ? 'an ' : 'a ';
    }
    const sl = s.toLowerCase();
    if (sl.startsWith('the ')
        || sl === 'molten lava'
        || sl === 'iron bars'
        || sl === 'ice') {
        return '';
    }
    const vowels = 'aeiou';
    /* C strncmpi != 0 → keep "an" path; 0 (match) can block it. */
    const ncmp = (t, n) => sl.slice(0, n) !== String(t).slice(0, n);
    const one_ok = ncmp('one', 3) || (s[3] && !'-_ '.includes(s[3]));
    const use_an = (
        (vowels.includes(c0)
            && one_ok
            && ncmp('eu', 2)
            && ncmp('uke', 3) && ncmp('ukulele', 7)
            && ncmp('unicorn', 7) && ncmp('uranium', 7)
            && ncmp('useful', 6))
        || (c0 === 'x' && !vowels.includes(s.charAt(1).toLowerCase()))
    );
    return use_an ? 'an ' : 'a ';
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
 * C ref: hacklib.c strncmpi prefix — case-insensitive `lit` match at `at`;
 * short/overrun tails cannot match (C hits NUL vs `lit` char → nonzero).
 */
function startsWithCI(s, at, lit) {
    if (at + lit.length > s.length) return false;
    for (let k = 0; k < lit.length; k++) {
        if (plural_lowc(s[at + k]) !== lit[k]) return false;
    }
    return true;
}

/**
 * C ref: objnam.c vtense `:2563–2653` — plural verb → 3rd-person present
 * for subj; verb returned as-is when subj reads plural. Null subj takes
 * the singular arm (special case; never the raw verb).
 */
export function vtense(subj, verb) {
    // C `:2581–2582` — "a "/"an " prefix reads singular.
    if (subj) {
        if (startsWithCI(subj, 0, 'a ') || startsWithCI(subj, 0, 'an ')) {
            return vtenseSing(verb);
        }
        // C `:2583–2593` — scan spaces for the first " of "/" from "/
        // " called "/" named "/" labeled " marker; the head ends just
        // before it (guard: a marker at index 0 leaves the whole subj).
        let spot = -1;
        for (let i = subj.indexOf(' '); i !== -1; i = subj.indexOf(' ', i + 1)) {
            if (startsWithCI(subj, i, ' of ') || startsWithCI(subj, i, ' from ')
                || startsWithCI(subj, i, ' called ') || startsWithCI(subj, i, ' named ')
                || startsWithCI(subj, i, ' labeled ')) {
                if (i !== 0) spot = i - 1;
                break;
            }
        }
        // C `:2594–2596` — no marker: head is the whole subj.
        const head = spot >= 0 ? subj.slice(0, spot + 1) : subj;
        const last = head.length - 1;
        // C `:2600–2607` — plural guess: ends in 's' but not '*us'/'*ss'
        // (spot != subj ⇒ head length ≥ 2), or makeplural-style eeth/feet/
        // ia/ae tails (BSTRNCMPI: underrun heads cannot match).
        const prev = last > 0 ? plural_lowc(head[last - 1]) : '';
        let pluralGuess = plural_lowc(head[last]) === 's' && last > 0
            && prev !== 'u' && prev !== 's';
        if (!pluralGuess && last - 3 >= 0) {
            const tail4 = head.slice(last - 3, last + 1);
            pluralGuess = eqCI(tail4, 'eeth') || eqCI(tail4, 'feet');
        }
        if (!pluralGuess && last - 1 >= 0) {
            const tail2 = head.slice(last - 1, last + 1);
            pluralGuess = eqCI(tail2, 'ia') || eqCI(tail2, 'ae');
        }
        if (pluralGuess) {
            // C `:2609–2620` — special_subjs veto: exact head match, or
            // "<prefix> <special_subj>" tail (space-separated) → singular.
            for (const spec of SPECIAL_SUBJS) {
                if (head.length === spec.length && eqCI(head, spec)) {
                    return vtenseSing(verb);
                }
                if (head.length > spec.length
                    && head[head.length - 1 - spec.length] === ' '
                    && eqCI(head.slice(head.length - spec.length), spec)) {
                    return vtenseSing(verb);
                }
            }
            return verb;
        }
        // C `:2625–2627` — 2nd-person singular reads as plural.
        if (eqCI(subj, 'they') || eqCI(subj, 'you')) return verb;
    }

    // C `sing:` label `:2630` convergence.
    return vtenseSing(verb);
}

/**
 * C ref: objnam.c vtense `sing:` `:2630–2652` — conjugate the plural verb
 * to 3rd-person singular via Strcasecpy case-preserving overwrites
 * (strcasecpy_at): are→is, have→has (last-two overwrite), z/x/s/ch/sh +
 * 2-letter -o → +es, consonant-y → -ies, else +s.
 */
function vtenseSing(verb) {
    const buf = String(verb);
    const len = buf.length;
    if (eqCI(buf, 'are')) return strcasecpy_at(buf, 0, 'is');
    if (eqCI(buf, 'have')) return strcasecpy_at(buf, len - 2, 's');
    const last = len > 0 ? plural_lowc(buf[len - 1]) : '';
    const before = len >= 2 ? plural_lowc(buf[len - 2]) : '';
    if ('zxs'.includes(last)
        || (len >= 2 && last === 'h' && 'cs'.includes(before))
        || (len === 2 && last === 'o')) {
        return strcasecpy_at(buf, len, 'es');
    }
    if (last === 'y' && !MAKEPLURAL_VOWELS.includes(before)) {
        return strcasecpy_at(buf, len - 1, 'ies');
    }
    return strcasecpy_at(buf, len, 's');
}

/**
 * Late-bound from artifact.js — C artifact.c undiscovered_artifact.
 * Default TRUE (empty artidisco) until artifact.js registers.
 * Avoids static objnam→artifact (artifact already imports objnam; D-1521).
 */
let _undiscovered_artifact = (_m) => true;
export function set_undiscovered_artifact(fn) {
    _undiscovered_artifact = fn;
}

/**
 * Late-bound from artifact.js — C artifact.c find_artifact `:422–459`.
 * Default null (no livelog) until artifact.js registers.
 * Avoids static objnam→artifact (artifact already imports objnam; D-1521).
 */
let _find_artifact = null;
export function set_find_artifact(fn) {
    _find_artifact = fn;
}

/**
 * C ref: obj.h is_plural — quan != 1L, or discovered Eyes of the Overworld.
 * "the Eyes of the Overworld" are plural; "a pair of lenses named …" is not.
 */
export function is_plural(o) {
    if (!o) return false;
    if ((o.quan ?? 0) !== 1) return true;
    return (o.oartifact | 0) === ART_EYES_OF_THE_OVERWORLD
        && !_undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD);
}

/**
 * C ref: objnam.c otense — plural verb if is_plural(otmp), else
 * vtense(NULL, verb).
 */
export function otense(otmp, verb) {
    if (!is_plural(otmp)) return vtense(null, verb);
    return verb;
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

// C shk.c shk_your: shk_owns lives in shk.js (shk.c home); registered here
// late-bound like _y_monnam so objnam.js keeps no static edge into shk.js
// (a static edge reorders eval onto polyself's top-level set_body_part).
let _shk_owns_prefix = null;
export function set_shk_owns_prefix(fn) {
    _shk_owns_prefix = fn;
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
 * Late-bound from do_wear.js — C do_wear.c doffing/donning for the
 * doname_base ARMOR W_ARMOR arm. do_wear already imports objnam, so a
 * static back-edge would pull do_name's eval-time set_y_monnam into
 * objnam's partial window (TDZ); registration runs at do_wear top-level,
 * which can land while this module is still partial (via invent).
 * `var` (not `let`): hoisted so the early write is kept — the bare
 * redeclaration below is a no-op and never clears it. Unset → plain
 * "(being worn)".
 */
var _doffing_fn, _donning_fn;
export function set_doffing_predicates(doffingFn, donningFn) {
    _doffing_fn = doffingFn;
    _donning_fn = donningFn;
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

/**
 * Seam for modules that cannot import polyself.js (wield: polyself→wield).
 * Not the C-locus name — that is only `polyself.js` `body_part`.
 * Unset → C mbodypart null-data humanoid (HUMANOID_PARTS).
 */
export function body_part_latebound(part) {
    if (_body_part) return _body_part(part);
    const p = part | 0;
    if (p === HAND) return 'hand';
    if (p === FOOT) return 'foot';
    if (p === FINGER) return 'finger';
    if (p === FINGERTIP) return 'fingertip';
    return 'body part';
}

/** C polyself.c body_part(HAND) via doname_base W_WEP / W_SWAPWEP / RING. */
function doname_hand() {
    return body_part_latebound(HAND);
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
 * Exported for weapon.c mon_wield_item's wield-shine pline (import-the-export;
 * timeout.js already imports doname, so the radius original stays there).
 */
export function arti_light_description(obj) {
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
 * Late-bound from invent.js — C objnam.c obj_is_pname calls
 * not_fully_identified (includes undiscovered_artifact). Default is the
 * known/dknown/bknown subset until invent.js registers.
 */
let _not_fully_identified = (obj) => !obj?.known || !obj?.dknown || !obj?.bknown;
export function set_not_fully_identified(fn) {
    _not_fully_identified = fn;
}

/**
 * C ref: objnam.c obj_is_pname — fully identified artifact with oname.
 */
export function obj_is_pname(obj) {
    if (!obj?.oartifact || !has_oname(obj)) return false;
    if (!game.program_state?.gameover && !game.iflags?.override_ID) {
        if (_not_fully_identified(obj)) return false;
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
    // C shk.c shk_your: shk_owns (unpaid / costly floor goods) before mon_owns.
    const own = _shk_owns_prefix ? _shk_owns_prefix(obj) : null;
    if (own) return own;
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
 * C ref: objnam.c Yname2 — highc first character of yname.
 * Pre-existing local clones (do/music/timeout) stay.
 */
export function Yname2(obj) {
    return upstart(yname(obj));
}

/**
 * C ref: objnam.c Doname2 `:2303–2309` — highc first character of doname.
 * Canonical export for pickup `mbag_item_gone` (D-1938); pre-existing
 * local clones (do/dokick/dothrow) stay.
 */
export function Doname2(obj) {
    return upstart(doname(obj));
}

/** C objnam.c aobjnam `:2242–2258` — "count cxname" (quan prefix) + optional otense. */
export function aobjnam(otmp, verb) {
    let bp = cxname(otmp);
    if (((otmp?.quan ?? 1) | 0) !== 1) bp = `${otmp.quan | 0} ${bp}`;
    if (verb) bp += ` ${otense(otmp, verb)}`;
    return bp;
}

/** C objnam.c yobjnam — aobjnam with shk_your (same pname gate as yname). */
export function yobjnam(obj, verb) {
    let s = aobjnam(obj, verb);
    if (!carried_objnam(obj) || !obj_is_pname(obj)
        || (obj.oartifact | 0) >= ART_ORB_OF_DETECTION) {
        s = `${shk_your(obj)}${s}`;
    }
    return s;
}

/** C objnam.c Yobjnam2 — highc(yobjnam). sit.js/wield.js clones stay. */
export function Yobjnam2(obj, verb) {
    return upstart(yobjnam(obj, verb));
}

/**
 * C ref: objnam.c simpleonames `:2428–2442` ← minimal_xname — type
 * appearance without BUC, then makeplural when quan != 1 (doquiver_core
 * "6 orcish daggers", dowield "You have N ... readied"). Statue/figurine
 * corpsenm suppressed (C bareobj.corpsenm=NON_PM). C bareobj = zeroobj
 * (owt 0) → BALL_CLASS never gets "very " via this path (xname/doname of
 * the live object still apply punish weight).
 * Named omissions: sack→bag family aliases; full bareobj field subset.
 * C copies SLIME_MOLD spe onto zeroobj so fruit_from_indx still hits;
 * JS pretty_base reads the live spe. Missing quan is a JS-side unset
 * (C always sets quan) — read as 1, same guard as the iactions clone.
 */
export function simpleonames(obj) {
    if (!obj) return 'object';
    // C minimal_xname: if (otyp != BOULDER) bareobj.corpsenm = NON_PM
    const n = objectNames[obj.otyp];
    if (n === 'STATUE') return 'statue';
    if (n === 'FIGURINE') return 'figurine';
    // C minimal_xname bareobj.owt stays 0 → never "very heavy iron ball"
    if (obj.oclass === BALL_CLASS) return 'heavy iron ball';
    const base = pretty_base(obj);
    // C `:2432` — if (obj->quan != 1L) makeplural(simpleoname)
    if (((obj.quan ?? 1) | 0) !== 1) return makeplural(base);
    return base;
}

/**
 * C ref: objnam.c actualoname `:2488–2498` — minimal_xname with override_ID
 * (iflags.override_ID=TRUE): true type name even when oc_name_known is
 * unset. Mirrors C's save/force/restore on the oc table (`:1045–1052`):
 * suppress oc_uname, force oc_name_known + dknown, xname a singular
 * bknown-0 copy, restore, strip the cleric-forced "uncursed " prefix
 * (`:1084–1086`).
 * Named omissions: bareobj field subset (corpsenm/known/owt/AMULET known —
 * dead arms for the scroll/call use-case; simpleonames above documents the
 * same minimal_xname subset); SLIME_MOLD spe copy (pretty_base reads live
 * spe); distant_name wrapper (identity for carried objects).
 */
export function actualoname(obj) {
    const oc = game.objects?.[obj.otyp | 0];
    const save_uname = oc ? oc.oc_uname : undefined;
    const save_name_known = oc ? oc.oc_name_known : undefined;
    const save_dknown = obj.dknown;
    if (oc) { oc.oc_uname = 0; oc.oc_name_known = 1; }
    obj.dknown = 1;
    let res = xname({ ...obj, quan: 1, bknown: 0 });
    obj.dknown = save_dknown;
    if (oc) { oc.oc_uname = save_uname; oc.oc_name_known = save_name_known; }
    if (res.startsWith('uncursed ')) res = res.slice('uncursed '.length);
    return res;
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
 * C ref: objnam.c ysimple_name — shk_your + minimal_xname.
 * JS simpleonames is the live minimal_xname stand-in (D-0881).
 * Named omit: BUFSZ strncat cap (JS strings); sack→bag aliases.
 * Pre-existing local clones (attrib/pickup) stay.
 */
export function ysimple_name(obj) {
    return `${shk_your(obj)}${simpleonames(obj)}`;
}

/**
 * C ref: objnam.c Ysimple_name2 — highc first character of ysimple_name.
 * Pre-existing local clones (do_name/pickup) stay.
 */
export function Ysimple_name2(obj) {
    return upstart(ysimple_name(obj));
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
 * C ref: objnam.c safe_qbuf `:5624–5698` — prefix + object name + suffix
 * guaranteed to fit in QBUFSZ-1, in C order: unsigned lens (`:5635–5638`)
 * + lenlimit (`:5640`); prefix/suffix/filler impossible() diagnostics
 * (`:5646–5653`, named omit below); prefix arms (`:5657–5667`);
 * last-resort truncation (`:5670–5681`); short_oname format with lastR
 * fallback (`:5682–5695`); return (`:5697`).
 * Named omits: (1) impossible() prefix/suffix/filler diagnostics — async
 * in JS (display.js) while safe_qbuf is sync at 25 call sites, and C
 * continues after them, so they change nothing observable (same omit
 * class as sync doname's impossible note in this file); (2)
 * releaseobuf(bufp) (`:5691`) — GC no-op: short_oname returns a JS
 * string, no obuf pool exists in js/, nothing to release.
 * C lastR is never NULL at the 25 call sites (all pass literals); the
 * null-tolerance below is a harmless JS extension.
 *
 * @param {string|null} [_qbuf] C dest; only its identity matters (alias arm)
 * @param {string|null} qprefix
 * @param {string|null} qsuffix
 * @param {object} obj
 * @param {function} func
 * @param {function} [altfunc]
 * @param {string} lastR
 * @returns {string}
 */
export function safe_qbuf(_qbuf, qprefix, qsuffix, obj, func, altfunc, lastR) {
    // C `:5635–5640` — unsigned lens; lenlimit is QBUFSZ-1. len_qpfx folds
    // into buf.length after the prefix arms (`:5668` len = strlen(qbuf)).
    const lenlimit = QBUFSZ - 1;
    const last = lastR == null ? '' : String(lastR);
    const sfx = qsuffix == null ? '' : String(qsuffix);
    const len_qsfx = sfx.length;
    const len_lastR = last.length;

    let buf;
    if (_qbuf === qprefix && qprefix != null) {
        // C `:5657–5659` — dest aliases the prefix: it is already in the
        // buffer; `*endp = '\0'` truncates at lenlimit. Callers pass the
        // same string twice (e.g. safe_qbuf(qbuf, qbuf, ...)), so this
        // converges with the copy arm; the branch is kept for C order.
        buf = String(qprefix).slice(0, lenlimit);
    } else if (qprefix != null) {
        // C `:5660–5663` — strncpy(qbuf, qprefix, lenlimit) + `*endp='\0'`.
        buf = String(qprefix).slice(0, lenlimit);
    } else {
        // C `:5664–5666` — no prefix; output buffer starts out empty.
        buf = '';
    }
    // C `:5668` — len = strlen(qbuf).
    let len = buf.length;

    if (len + len_lastR + len_qsfx > lenlimit) {
        // C `:5670–5681` — too long; skip formatting, truncated last resort.
        if (len < lenlimit) {
            // C `:5673–5675` — strncpy(&qbuf[len], lastR, lenlimit - len).
            buf = (buf + last).slice(0, lenlimit);
            len = buf.length;
            // C `:5676–5679` — strncpy(&qbuf[len], qsuffix, lenlimit - len).
            if (qsuffix != null && len < lenlimit) {
                buf = (buf + sfx).slice(0, lenlimit);
            }
        }
    } else {
        // C `:5682–5695` — suffix and last resort are guaranteed to fit.
        len += len_qsfx; // C `:5684` — include the pending suffix.
        // C `:5686` — format the object; live short_oname (same module).
        const bufp = short_oname(obj, func, altfunc, lenlimit - len);
        if (len + String(bufp).length <= lenlimit) {
            buf += bufp; // C `:5687–5688` — formatted name fits.
        } else {
            buf += last; // C `:5689–5690` — use last resort.
        }
        // C `:5691` releaseobuf(bufp) — GC no-op (see doc); C `:5693–5694`
        // Strcat(qbuf, qsuffix) — pointer check, empty append is a no-op.
        if (qsuffix != null) buf += sfx;
    }
    // C `:5696–5697` — assert(strlen(qbuf) < QBUFSZ); return qbuf.
    return buf;
}

/**
 * C objnam.c doname_base `:1695–1709` — `wizard && iflags.wizweight`.
 * `wizard` is `flags.debug`. with_price && last char ')' → ConcatF1
 * delta 1 `, %u aum)`; else extra ` (%u aum)`.
 */
export function append_wizweight_suffix(obj, bp, with_price) {
    if (!obj || !game.flags?.debug || !game.iflags?.wizweight) return bp;
    const owt = obj.owt | 0;
    if (with_price && bp.length > 0 && bp.charAt(bp.length - 1) === ')') {
        return `${bp.slice(0, -1)}, ${owt} aum)`;
    }
    return `${bp} (${owt} aum)`;
}

/**
 * C objnam.c doname_base `:1549–1559` — STATUE/CORPSE/FIGURINE when
 * `wizard && iflags.wizmgender`. `genders[mgend].adj` or
 * "unspecified gender" for CORPSTAT_RANDOM.
 */
export function append_wizmgender_suffix(obj, bp) {
    if (!obj || !game.flags?.debug || !game.iflags?.wizmgender) return bp;
    const oname = objectNames[obj.otyp];
    if (oname !== 'STATUE' && oname !== 'CORPSE' && oname !== 'FIGURINE') {
        return bp;
    }
    const cgend = (obj.spe | 0) & CORPSTAT_GENDER;
    const mgend = cgend === CORPSTAT_MALE ? MALE
        : cgend === CORPSTAT_FEMALE ? FEMALE
            : NEUTRAL;
    // C role.c genders[].adj — male / female / neuter
    const adj = mgend === MALE ? 'male'
        : mgend === FEMALE ? 'female'
            : 'neuter';
    const label = cgend !== CORPSTAT_RANDOM ? adj : 'unspecified gender';
    return `${bp} (${label})`;
}

/**
 * C objnam.c `:1217–1219` — doname_base flag bits (file-local in C).
 * DONAME_FOR_MENU is not used anywhere in C yet; its truncation arm is live.
 */
export const DONAME_WITH_PRICE = 1;
export const DONAME_VAGUE_QUAN = 2;
export const DONAME_FOR_MENU = 4;

/** C youprop.h Glib ≡ u.uprops[GLIB].intrinsic (slippery-fingers gloves). */
function Glib() {
    return (((game.u?.uprops?.[GLIB]?.intrinsic) | 0) !== 0);
}

/**
 * C ref: objnam.c doname `:1754–1756` — doname_base with no flags.
 */
export function doname(obj) {
    return doname_base(obj, 0);
}

/**
 * C ref: objnam.c doname_vague_quan `:1768–1782` — "some" instead of a
 * precise quantity when the pile hasn't been seen up close (farlook).
 * C's TODO (a qknown flag overlaying cknown) stays a comment: no such
 * field on either side.
 */
export function doname_vague_quan(obj) {
    return doname_base(obj, DONAME_VAGUE_QUAN);
}

/**
 * C ref: objnam.c doname_base `:1223–1751` — full object description.
 * C doname_base starts with xname(obj), which forces cleric bknown before
 * the BUC prefix is read; JS doname uses pretty_base so apply the same force.
 * Buffer machinery (obuf/xnamep/eos/Concat/strprepend/releaseobuf/sitoa,
 * D-2483 by-design JS strings) is plain concatenation; the once-only
 * doname_full/paniclog overflow path is a named omit, the truncation live.
 */
export function doname_base(obj, doname_flags = 0) {
    if (!obj) return 'something';
    const with_price = ((((doname_flags | 0) & DONAME_WITH_PRICE)) !== 0);
    const vague_quan = ((((doname_flags | 0) & DONAME_VAGUE_QUAN)) !== 0);
    const for_menu = ((((doname_flags | 0) & DONAME_FOR_MENU)) !== 0);
    // C `:1255–1262` — iflags.override_ID forces all five ID flags.
    const overrideID = !!game.iflags?.override_ID;

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
    const known = !!(overrideID || obj.known);
    const dknown = !!(overrideID || obj.dknown);
    const cknown = !!(overrideID || obj.cknown);
    const bknown = !!(overrideID || obj.bknown);
    const lknown = !!(overrideID || obj.lknown);
    const quan = obj.quan || 1;
    const oname = objectNames[otyp];
    // C doname_base `:1247` — bp = xname(obj); pname artifacts arrive as
    // bare ONAME (xname obj_is_pname goto nameit, `:663–664` + `:999–1012`):
    // no base type, no "poisoned " (Grimtooth), no " named ONAME" suffix.
    const isPname = obj_is_pname(obj) && has_oname(obj);
    let base;
    if (isPname) {
        let nm = String(ONAME(obj) ?? '');
        if (obj.oartifact && nm.slice(0, 4) === 'The ') nm = `t${nm.slice(1)}`;
        if (nm.length >= 4 && nm.slice(0, 4).toLowerCase() === 'the ') {
            nm = nm.slice(4);
        }
        base = nm;
    } else {
        base = pretty_base(obj);
    }
    // C doname_base: xname may start with "poisoned "; strip into prefix
    // so order is article/BUC/poisoned/erosion/spe + bare name.
    // Pname base is already bare (no poisoned to strip).
    let ispoisoned = false;
    if (!isPname && base.startsWith('poisoned ') && obj.opoisoned) {
        base = base.slice(9);
        ispoisoned = true;
    }
    // C xname CORPSE is bare "corpse"; corpse_xname owns the monster type.
    if (oname === 'CORPSE') {
        base = (quan !== 1) ? makeplural('corpse') : 'corpse';
    } else if ((obj.otyp | 0) === SLIME_MOLD) {
        // C doname_base starts at xname: fruit ick already applied.
        if (quan !== 1) base = makeplural(makesingular(base));
    } else if (quan !== 1) {
        base = makeplural(base);
    }
    // C doname_base starts at xname_flags: gameover suffix is already in bp
    base += xname_gameover_suffix(obj);

    // C doname_base `:1275–1299` — fruits may be given artifact names
    // (D-1521). bp is xname: fname (+ ick) + optional " named ONAME" then
    // strip leading "the " (`:1011`). JS doname uses pretty_base so rebuild
    // that lookup here; named suffix is still appended after prefix.
    const onameStrForArti = (dknown && obj.oextra?.oname)
        ? String(obj.oextra.oname) : '';
    let bpForArti = onameStrForArti
        ? `${base} named ${onameStrForArti}` : base;
    /* C objnam.c:1006–1008 — bp is xname here, already downcased "The". */
    if (onameStrForArti && obj.oartifact
        && bpForArti.slice(base.length + ' named '.length,
            base.length + ' named '.length + 4) === 'The ') {
        const ns = base.length + ' named '.length;
        bpForArti = `${bpForArti.slice(0, ns)}t${bpForArti.slice(ns + 1)}`;
    }
    if (bpForArti.length >= 4
        && bpForArti.slice(0, 4).toLowerCase() === 'the ') {
        bpForArti = bpForArti.slice(4);
    }
    if ((obj.otyp | 0) === SLIME_MOLD && base.length >= 4
        && base.slice(0, 4).toLowerCase() === 'the ') {
        base = base.slice(4);
    }
    let aname = null;
    const fake_arti = ((obj.otyp | 0) === SLIME_MOLD
        && (aname = artifact_name_objnam(bpForArti)) != null);
    const force_the = !!(fake_arti
        && String(aname).length >= 4
        && String(aname).slice(0, 4).toLowerCase() === 'the ');

    // C ref: objnam.c doname_base — COIN_CLASS uses the same quan/article
    // path as other objects ("a gold piece", "25 gold pieces"), not a bare
    // numeric string. xname for coins is just "gold piece".
    // Article: quan / force_the|obj_is_pname|the_unique_obj → "the " /
    // else if !fake_arti "a " (then just_an redo). C skips article for
    // CORPSE so corpse_xname can take the BUC/greased/oeaten prefix as
    // its adjective (CXN_ARTICLE|CXN_NOCORPSE; D-1255).
    let prefix = '';
    if (quan !== 1) {
        // C `:1283–1289` — vague_quan without dknown prints "some ".
        prefix = (dknown || !vague_quan) ? `${quan} ` : 'some ';
    } else if (oname === 'CORPSE') {
        // skip article — corpse_xname owns it
    } else if (force_the || obj_is_pname(obj) || the_unique_obj(obj)) {
        if (base.length >= 4 && base.slice(0, 4).toLowerCase() === 'the ') {
            base = base.slice(4);
        }
        prefix = 'the ';
    } else if (!fake_arti) {
        prefix = 'a ';
    }

    // C `:1302–1316` — bag of tricks / horn of plenty print "empty " when
    // spe==0 && !known (emptiness discovery never sets known); other
    // containers and statues when cknown with no contents.
    if (cknown
        && (((otyp === BAG_OF_TRICKS || otyp === HORN_OF_PLENTY)
            ? (((obj.spe | 0) === 0) && !known)
            : ((Is_container(obj) || oname === 'STATUE')
                && !Has_contents(obj))))) {
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
            const charged = otyp_is_charged(otyp);
            const implicit = game.flags?.implicit_uncursed !== false;
            const showUncursed = !implicit
                || ((!known || !charged
                    || oclass === ARMOR_CLASS
                    || oclass === RING_CLASS)
                    && oname !== 'SCR_MAIL'
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
    if (lknown && Is_box(obj)) {
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
        || (donameClass === RING_CLASS && otyp_is_charged(otyp)))) {
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
        if (known && otyp_is_charged(otyp)) {
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

    // C: has_oname && dknown → " named Foo" — skipped for pname artifacts:
    // bp is already bare ONAME (xname goto nameit), not "<base> named ONAME".
    const onameStr = obj.oextra?.oname;
    if (onameStr && dknown && !isPname) {
        const nameStart = bp.length + ' named '.length;
        bp += ` named ${onameStr}`;
        /* C objnam.c:1006–1008 — downcase "The" in "<item> named The ..." */
        if (obj.oartifact && bp.slice(nameStart, nameStart + 4) === 'The ') {
            bp = `${bp.slice(0, nameStart)}t${bp.slice(nameStart + 1)}`;
        }
    }
    // C doname_base FOOD EGG Concat(bp, " (laid by you)") after xname
    // (xname already includes " named ").
    if (eggLaidByYou) bp += ' (laid by you)';

    // C: doname_base — cknown && Has_contents → " containing %ld item%s"
    // invent.c count_contents(obj, FALSE, FALSE, TRUE, FALSE): separate
    // stacks, no nest. Inline to avoid invent↔objnam import cycle.
    // C `:1373` adds bpspaceleft > 0 — trivially true for JS strings.
    if (cknown && Has_contents(obj)) {
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

    // C `:1387–1419` ARMOR_CLASS — uskin/doffing/donning variants, then the
    // Glib slippery and lamplit artifact-light paren rewrites. C guards each
    // rewrite on bp_eos[-1]==')' (truncation could drop the paren); JS
    // strings never truncate so the paren is always present.
    if (donameClass === ARMOR_CLASS && ((obj.owornmask | 0) & W_ARMOR) !== 0) {
        const u = game.u || {};
        const isDoffing = _doffing_fn ? !!_doffing_fn(obj) : false;
        const isDonning = !isDoffing && _donning_fn
            ? !!_donning_fn(obj) : false;
        bp += (obj === u.uskin) ? ' (embedded in your skin)'
            : isDoffing ? ' (being doffed)'
            : isDonning ? ' (being donned)'
            : ' (being worn)';
        if (obj === u.uarmg && Glib()) bp = `${bp.slice(0, -1)}; slippery)`;
        if (!Blind() && obj.lamplit && doname_artifact_light(obj)) {
            bp = `${bp.slice(0, -1)}, ${arti_light_description(obj)} lit)`;
        }
    }
    if (donameClass === AMULET_CLASS && ((obj.owornmask | 0) & W_AMUL) !== 0) {
        bp += ' (being worn)';
    }
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
    // C objnam.c doname_base `:1549–1559` — after class switch, before W_WEP.
    bp = append_wizmgender_suffix(obj, bp);
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
    if (known && otyp_is_charged(otyp) && donameClass === TOOL_CLASS
        && !isLampOrCandle && !isCandelabrum && !toolWorn && !leashArm)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;
    // C ref: objnam.c WAND_CLASS → charges
    if (known && donameClass === WAND_CLASS)
        bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;

    // C `:1652–1683` price chain — suppress/restoring skip, then is_unpaid
    // → unpaid_cost, else with_price → shop price, else pricequotes
    // discovery append. Unpaid + trailing pricequotes ride the late-bound
    // shk suffix (objnam↔shk cycle); the for-sale arm is shk.js
    // doname_with_price calling doname_base with DONAME_WITH_PRICE.
    // with_price rides along so the trailing arm fires for plain doname only.
    if (_doname_shop_suffix) bp = _doname_shop_suffix(obj, bp, with_price);
    // C `:1697–1709` — with_price rewrites a trailing ')' for the aum.
    bp = append_wizweight_suffix(obj, bp, with_price);
    // C `:1736–1745` menu truncation (offsetbp=4); the >BUFSZ-1 panic and the
    // once-only doname_full/paniclog path are named omits (D-2483 strings).
    if (bp.length + (for_menu ? 4 : 0) >= (BUFSZ - 1)) {
        bp = bp.slice(0, BUFSZ - 1 - (for_menu ? 4 : 0));
    }
    return bp;
}

/**
 * C ref: objnam.c paydoname `:2313–2355` — doname for itemized buying
 * (billing menus / shk_names_obj) with invent-style price suppressed.
 * buy_container sets no_charge for a just-purchased container so the
 * shk_names_obj call keeps "a/an" rather than "your".
 * C string ops (strncmp/strprepend/Strcat/strlen) are plain JS string
 * ops; strprepend/Strcat need no import.
 */
export function paydoname(obj) {
    // C `:2316` — static " and its contents" tail for unpaid containers.
    const AND_CONTENTS = ' and its contents';
    if (!obj) return ''; // JS-only null guard; C takes NONNULLARG1.
    if (!game.iflags) game.iflags = {};
    // C `:2319–2320` — save cknown and wizweight across the call.
    const save_cknown = obj.cknown;
    const save_wizweight = game.iflags.wizweight;
    // C `:2322–2323` — Has_contents zeros cknown so doname names contents.
    if (Has_contents(obj)) obj.cknown = 0;
    // C `:2325` — hide item weights to unclutter billing's pay-menu.
    game.iflags.wizweight = false;
    // C `:2326–2328` — suppress invent-style price around doname_base
    // (the caller adds billing-style price); doname(obj) would be the
    // same call (doname `:1754–1756` is doname_base(obj, 0)) but C names
    // doname_base(obj, 0U) here.
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    let p = doname_base(obj, 0);
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    game.iflags.wizweight = save_wizweight;

    // C `:2331–2352` — container phrasing for Has_contents holders.
    if (Has_contents(obj)) {
        // C `:2336–2343` — strip the "a "/"an " article, then prepend
        // "an unpaid " (unpaid) or "your "; skipped when buy_container
        // set no_charge on the just-purchased box.
        if (!obj.no_charge) {
            if (p.startsWith('a ')) p = p.slice(2);
            else if (p.startsWith('an ')) p = p.slice(3);
            p = `${obj.unpaid ? 'an unpaid ' : 'your '}${p}`;
        }
        // C `:2345–2351` — cknown stayed 0 (contents undisclosed).
        if (!obj.cknown) {
            if (obj.unpaid) {
                // C `:2347–2350` — append only when it fits in
                // BUFSZ - PREFIX (17 = sizeof and_contents - 1; PREFIX
                // is XNAME_PREFIX = 80 here).
                if (p.length + AND_CONTENTS.length < BUFSZ - XNAME_PREFIX)
                    p += AND_CONTENTS;
            } else {
                // C `:2352` — paid box names the contents, not the box.
                p = `the contents of ${p}`;
            }
        }
    }
    // C `:2354` — restore the caller's cknown.
    obj.cknown = save_cknown;
    return p;
}

/**
 * C ref: invent.c xprname(obj, txt, let, dot, cost, quan) `:2895–2954`.
 * Message/prinv paths pass dot=true (trailing period); invent menus omit it.
 * When quan is non-0, temporarily override obj.quan for doname (pickup
 * partial / merge total_of), then restore.
 * `txt` is C's second arg (hands/xtra_choice, contained, "Total:");
 * when set, doname is skipped.
 * `cost` / `let=='*'` is the Iu/Ix unpaid column (D-1663); Hallu
 * `currency()` ROLL_FROM is invent.c currency (D-1720). menu_tab_sep
 * uses a tab.
 */
export function xprname(obj, let_ = undefined, dot = false, quan = 0, txt = null, cost = 0) {
    let savequan = 0;
    if (quan && obj) {
        savequan = obj.quan || 0;
        obj.quan = quan;
    }
    // C invent.c xprname `:2907–2908` — use_invlet
    const flagOn = game.flags?.invlet_constant;
    const use_invlet = (flagOn !== false && flagOn !== 0)
        && obj
        && let_ !== CONTAINED_SYM && let_ !== HANDS_SYM;
    let ilet = let_ ?? obj?.invlet ?? '?';
    const name = txt != null ? txt : doname(obj);
    const costn = Number(cost);
    const costCol = costn !== 0 || ilet === '*';
    let result;
    if (costCol) {
        // C `:2928–2938` — Iu (dot) vs Ix; "%c - %-45.*s" + " %6ld currency"
        if (dot && use_invlet) ilet = obj.invlet;
        const curr = currency(costn);
        let suffix;
        if (game.iflags?.menu_tab_sep) {
            suffix = `\t${costn} ${curr}`;
        } else {
            suffix = ` ${String(costn).padStart(6)} ${curr}`;
        }
        let shown = name;
        if (!game.iflags?.menu_tab_sep && shown.length < 45) {
            shown += ' '.repeat(45 - shown.length);
        }
        const cap = 256 - 1 - (4 + suffix.length);
        if (shown.length > cap) shown = shown.slice(0, cap);
        result = `${ilet} - ${shown}${suffix}`;
    } else {
        if (use_invlet) ilet = obj.invlet;
        result = `${ilet} - ${name}${dot ? '.' : ''}`;
    }
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
 * C ref: objnam.c readobjnam_postparse3 `:4762–4772` — resolve a wish name
 * against Japanese_items[] (case-insensitive strcmpi walk, `j->item`
 * terminator); the matching otyp, or 0 when no entry matches.
 */
export function japanese_otyp_by_name(name) {
    if (!name) return 0;
    const want = String(name).toLowerCase();
    for (const [oname, jn] of JAPANESE_ITEMS) {
        if (want === String(jn).toLowerCase()) {
            const otyp = objectNames.indexOf(oname);
            if (otyp >= 0) return otyp;
        }
    }
    return 0;
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
        if (un) buf = xcalled(buf, BUFSZ - (dn ? String(dn).length + 3 : 0), '', un);
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
            if (un) buf = xcalled(buf, BUFSZ - (dn ? String(dn).length + 3 : 0), '', un);
            if (dn) buf += ` (${dn})`;
        } else {
            buf += dn || actualn;
            if (ocl.oc_class === GEM_CLASS) {
                buf += (ocl.oc_material === MINERAL) ? ' stone' : ' gem';
            }
            if (un) buf = xcalled(buf, BUFSZ, '', un);
        }
        return buf;
    }
    // ring/scroll/potion/wand/spellbook
    if (nn) {
        if (ocl.oc_unique) buf = actualn;
        else buf += ` of ${actualn}`;
    }
    if (un) buf = xcalled(buf, BUFSZ - (dn ? String(dn).length + 3 : 0), '', un);
    if (dn) buf += ` (${dn})`;
    return buf;
}

/**
 * C ref: objnam.c simple_typename `:296–308` — obj_typename with
 * oc_uname suppressed and the " (description)" tail stripped.
 */
export function simple_typename(otyp) {
    const ocl = game.objects?.[otyp];
    const save = ocl ? ocl.oc_uname : undefined;
    if (ocl) ocl.oc_uname = null;
    let buf = obj_typename(otyp | 0);
    if (ocl) ocl.oc_uname = save;
    const pp = buf.indexOf(' (');
    if (pp >= 0) buf = buf.slice(0, pp);
    return buf;
}

/**
 * C ref: objnam.c safe_typename `:311–330` — otyp forced fully
 * discovered through simple_typename; out-of-range or nameless otyp
 * yields `glorkum[N]` plus an impossible (C `nextobuf`/`Sprintf` need
 * no buffer here: JS strings; sibling simple_typename idiom above).
 * Caller `ball.c` bc_sanity_check `:1065` / `:1078`.
 * Async: the glorkum arm awaits impossible (live `display.js`).
 */
export async function safe_typename(otyp) {
    otyp |= 0;
    if (otyp < STRANGE_OBJECT || otyp >= NUM_OBJECTS || !objectNames[otyp]) {
        const res = `glorkum[${otyp}]`;
        const { impossible } = await import('./display.js');
        await impossible('safe_typename: %s', res);
        return res;
    }
    // C: force it to be treated as fully discovered, then restore.
    const ocl = game.objects?.[otyp];
    const save_nameknown = ocl ? ocl.oc_name_known : undefined;
    if (ocl) ocl.oc_name_known = 1;
    const res = simple_typename(otyp);
    if (ocl) ocl.oc_name_known = save_nameknown;
    return res;
}

/**
 * C ref: objnam.c mimic_obj_name `:5605–5615` — gold / simple_typename
 * / "whatcha-may-callit".
 */
export function mimic_obj_name(mtmp) {
    if ((mtmp?.m_ap_type | 0) === M_AP_OBJECT) {
        if ((mtmp.mappearance | 0) === GOLD_PIECE) return 'gold';
        if ((mtmp.mappearance | 0) !== STRANGE_OBJECT) {
            return simple_typename(mtmp.mappearance | 0);
        }
    }
    return 'whatcha-may-callit';
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

/**
 * C objnam.c releaseobuf `:150–160` (staticfn). Rewind `obufidx` when
 * `bufp` lies inside `obufs[obufidx]` (PREFIX may point into the
 * middle of that buffer). Scored JS names are immutable strings;
 * there is no `obufs[]` / `obufidx`, so the range test is false and
 * the index is not rewound. `nextobuf` stays the by-design string path.
 */
function releaseobuf(_bufp) {
    /* C `:157–159` — no obuf pool to rewind. */
}

/**
 * C objnam.c maybereleaseobuf `:167–198`. The executable body is
 * `releaseobuf`; the rest of the C function is the bullwhip and
 * `hold_another_object` commentary on why the pool must be released
 * before `perm_invent` reformats an item.
 */
export function maybereleaseobuf(obuffer) {
    releaseobuf(obuffer);
}
