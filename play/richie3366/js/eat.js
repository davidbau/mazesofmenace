// eat.js — Eat command (getobj / doeat; fortune cookie + reqtime-1 food +
//           CORPSE eatcorpse / start_eating / eatfood occupation; TIN
//           start_tin / opentin / consume_tin; metallivore non-food).
// C ref: eat.c doeat / floorfood / touchfood / fprefx / eatcorpse /
//         start_eating / bite / eatfood / done_eating / lesshungry /
//         morehungry / vomit / obj_nutrition / is_edible / gethungry
//         (metabolic uhunger-- + accessorytime Regen/encumb/Hunger/Conflict);
//         doeat_nonfood / eatspecial / foodword;
//         start_tin / opentin / consume_tin / tin_variety / use_up_tin;
//         invent.c getobj; attrib.c poison_strdmg / gainstr;
//         potion.c make_vomiting / make_glib;
//         costly_tin → shk costly_alteration; use_tin_opener (D-0940).
// Named omissions: floorfood pool-lava reach gate / cockatrice-feel;
// cpostfx specials (wraith/were/nurse/
// stalker/…); corpse_intrinsic / givit; hallu from AD_STUN/AD_HALU;
// tainted Sick; make_blinded body / Hear_again afternmv;
// sellobj_state on invent-full dropy; costly_alteration COST_BITE;
// ?/* menu; multi-turn choke/newuhs messages; gethungry ring/amulet
// accessorytime + newuhs; losestr setuhpmax / terminal-frailty full
// death path; vomit cantvomit/Sick/FAINTING/acid-breath;
// Fixed_abil Popeye Olive/Bluto;
// eatspecial PAPER/potion/ring/amulet/leash/trident/flint/uwepgone/
// unpunish/vault_gd; still_chewing wall/door shop damage + watch_dig;
// livelog conduct; cprefx revive_corpse after rider death; cprefx
// polymon stone-golem failure polish.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { flush_topl_more, pline, You_feel } from './display.js';
import { yn_function } from './getline.js';
import {
    FOOD_CLASS, COIN_CLASS, WEAPON_CLASS, BALL_CLASS, CHAIN_CLASS,
    objectNames, objects,
} from './objects.js';
import {
    weight, splitobj, objects_at, delobj, stackobj,
    g_at, is_metallic, is_organic, is_flammable, is_rustprone,
    mksobj, obj_extract_self,
} from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';
import {
    singular, xname, doname, the, makeplural, obj_is_pname, thesimpleoname,
} from './objnam.js';
import {
    mons, acidic, poisonous, carnivorous, herbivorous, metallivorous,
    vegan, vegetarian, nohands, verysmall,
    is_rider, is_undead, olfaction,
    flesh_petrifies, slimeproof, your_race, poly_when_stoned,
    PM_LICHEN, PM_ACID_BLOB, PM_MONK, monsterNames, pmnames, G_UNIQ,
} from './monsters.js';
import { same_race } from './mondata.js';
import { were_beastie } from './were.js';
import { monflee } from './monmove.js';
import { dist2 } from './mon.js';
import { set_occupation, can_reach_floor } from './engrave.js';
import {
    OBJ_FLOOR, OBJ_FREE, OBJ_INVENT,
    SLT_ENCUMBER, EXT_ENCUMBER, FROMFORM, W_ARTI, W_WEP, W_RINGL, W_RINGR,
    W_ARMOR, W_TOOL, W_AMUL, W_SADDLE,
    HUNGER, CONFLICT, REGENERATION, SLOW_DIGESTION, PROTECTION,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING,
    TIMEOUT, NON_PM, ROTTEN_TIN, HOMEMADE_TIN, SPINACH_TIN, ismnum,
    KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, Has_contents, NO_PART,
    IRONBARS, W_NONDIGGABLE, BEAR_TRAP, TT_BEARTRAP,
    STONING, DIED, SLIMED, FROMOUTSIDE, Upolyd, NEUTRAL,
    COST_DSTROY, COST_OPEN, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
} from './const.js';
import {
    adjattrib, gainstr, acurr, acurrstr, change_luck, exercise,
    A_STR, A_DEX, A_CHA, A_WIS,
} from './attrib.js';
import { nomul, losehp, still_chewing } from './hack.js';
import { near_capacity, observe_object } from './invent.js';
import {
    make_confused, make_vomiting, make_glib, make_stoned, make_slimed,
} from './potion.js';
import { addinv_nomerge } from './u_init.js';
import { dropy, dropx } from './do.js';
import { type_is_pname, rndmonnam } from './do_name.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { hands_obj } from './weapon.js';
import { t_at, deltrap, reset_utrap, b_trapped } from './trap.js';
import { done, delayed_killer } from './end.js';
import { polymon } from './polyself.js';
import { costly_alteration, costly_spot } from './shk.js';
import { wield_tool } from './wield.js';

/** C hack.h invlet_basic — a-zA-Z slots before invent-full dropy. */
const INVLET_BASIC = 52;

const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const RIN_SLOW_DIGESTION = objectNames.indexOf('RIN_SLOW_DIGESTION');
const RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const BEARTRAP = objectNames.indexOf('BEARTRAP');

/**
 * C ref: gy.youmonst.data via set_uasmon / invent.c basic assign.
 * Full set_uasmon (FROMFORM props) still deferred — diet predicates need
 * role/race form when youmonst is unset (same fallback as wield.js).
 */
function hero_form_data() {
    if (game.youmonst?.data) return game.youmonst.data;
    const mndx = game.u?.umonnum ?? game.urole?.mnum;
    return mons(mndx);
}

const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const APPLE = objectNames.indexOf('APPLE');
const PEAR = objectNames.indexOf('PEAR');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const TRIPE_RATION = objectNames.indexOf('TRIPE_RATION');
const K_RATION = objectNames.indexOf('K_RATION');
const C_RATION = objectNames.indexOf('C_RATION');
const CORPSE = objectNames.indexOf('CORPSE');
const TIN = objectNames.indexOf('TIN');
const CLOVE_OF_GARLIC = objectNames.indexOf('CLOVE_OF_GARLIC');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const DAGGER = objectNames.indexOf('DAGGER');
const SILVER_DAGGER = objectNames.indexOf('SILVER_DAGGER');
const ELVEN_DAGGER = objectNames.indexOf('ELVEN_DAGGER');
const ORCISH_DAGGER = objectNames.indexOf('ORCISH_DAGGER');
const ATHAME = objectNames.indexOf('ATHAME');
const KNIFE = objectNames.indexOf('KNIFE');
const STILETTO = objectNames.indexOf('STILETTO');
const CRYSKNIFE = objectNames.indexOf('CRYSKNIFE');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const AXE = objectNames.indexOf('AXE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_COCKATRICE = monsterNames.indexOf('PM_COCKATRICE');
const PM_CHICKATRICE = monsterNames.indexOf('PM_CHICKATRICE');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_NEWT = monsterNames.indexOf('PM_NEWT');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_RUST_MONSTER = monsterNames.indexOf('PM_RUST_MONSTER');
const PM_GHOUL = monsterNames.indexOf('PM_GHOUL');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_DOG = monsterNames.indexOf('PM_DOG');
const PM_LARGE_DOG = monsterNames.indexOf('PM_LARGE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_HOUSECAT = monsterNames.indexOf('PM_HOUSECAT');
const PM_LARGE_CAT = monsterNames.indexOf('PM_LARGE_CAT');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_CAVE_DWELLER = monsterNames.indexOf('PM_CAVE_DWELLER');
const PM_ORC = monsterNames.indexOf('PM_ORC');
const EGG = objectNames.indexOf('EGG');

/** C: eat.c CANNIBAL_ALLOWED — Cave Dweller or orc race. */
function CANNIBAL_ALLOWED() {
    const role = game.urole?.mnum | 0;
    const race = game.urace?.mnum | 0;
    return role === PM_CAVE_DWELLER || race === PM_ORC;
}

/** C objclass.h material enum indices used by foodword / doeat_nonfood. */
const MAT_WAX = 2;
const MAT_PAPER = 5;
const MAT_LEATHER = 7;
const MAT_BONE = 9;
const MAT_DRAGON_HIDE = 10;

/**
 * C ref: eat.c foodwords[] — index by oc_material (objclass.h order).
 */
const foodwords = [
    'meal', 'liquid', 'wax', 'food', 'meat', 'paper',
    'cloth', 'leather', 'wood', 'bone', 'scale', 'metal',
    'metal', 'metal', 'silver', 'gold', 'platinum', 'mithril',
    'plastic', 'glass', 'rich food', 'stone',
];

/** C ref: eat.c foodword — material word; coins → "gold". */
function foodword(otmp) {
    if (!otmp) return 'meal';
    if (otmp.oclass === COIN_CLASS) return 'gold';
    const mat = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    return foodwords[mat] ?? 'meal';
}

/**
 * C ref: eat.c tintxts[] — tin variety adjectives + nutrition / flags.
 * TTSZ includes trailing empty sentinel.
 */
const tintxts = [
    { txt: 'rotten', nut: -50, fodder: 0, greasy: 0 },
    { txt: 'homemade', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'soup made from', nut: 20, fodder: 1, greasy: 0 },
    { txt: 'french fried', nut: 40, fodder: 0, greasy: 1 },
    { txt: 'pickled', nut: 40, fodder: 1, greasy: 0 },
    { txt: 'boiled', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'smoked', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'dried', nut: 55, fodder: 1, greasy: 0 },
    { txt: 'deep fried', nut: 60, fodder: 0, greasy: 1 },
    { txt: 'szechuan', nut: 70, fodder: 1, greasy: 0 },
    { txt: 'broiled', nut: 80, fodder: 0, greasy: 0 },
    { txt: 'stir fried', nut: 80, fodder: 0, greasy: 1 },
    { txt: 'sauteed', nut: 95, fodder: 0, greasy: 0 },
    { txt: 'candied', nut: 100, fodder: 1, greasy: 0 },
    { txt: 'pureed', nut: 500, fodder: 1, greasy: 0 },
    { txt: '', nut: 0, fodder: 0, greasy: 0 },
];
const TTSZ = tintxts.length;
// C ref: monattk.h AT_MAGC
const AT_MAGC = 255;

/**
 * C ref: mondata.h attacktype — true if any mattk slot has aatyp.
 * Local copy to avoid makemon export / import cycles.
 */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C objects.h FOOD nutrition — extractor omits oc_nutrition (named omission).
 * Only otyps exercised by the reqtime-1 / cookie path need entries here.
 */
const FOOD_NUTRITION = {
    FORTUNE_COOKIE: 40,
    APPLE: 50,
    PEAR: 50,
    ORANGE: 80,
    MELON: 100,
    BANANA: 80,
    CARROT: 50,
    FOOD_RATION: 800,
    TRIPE_RATION: 200,
    LEMBAS_WAFER: 800,
    CRAM_RATION: 600,
    K_RATION: 400,
    C_RATION: 300,
    EGG: 80,
    CLOVE_OF_GARLIC: 40,
    SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1,
    CANDY_BAR: 100,
    CREAM_PIE: 100,
    PANCAKE: 200,
    SLIME_MOLD: 250,
    LUMP_OF_ROYAL_JELLY: 200,
};

/**
 * C ref: trap.c unconscious — multi < 0 and (usleep or wake-msg prefixes).
 */
function unconscious() {
    if ((game.multi || 0) >= 0) return false;
    const u = game.u || {};
    if (u.usleep) return true;
    const msg = game.nomovemsg || '';
    return msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci');
}

/**
 * C ref: youprop.h Unaware — multi < 0 && (unconscious || fainted).
 * Fainted (uhs == FAINTED) deferred as always-false until newuhs ports it.
 */
function Unaware() {
    return (game.multi || 0) < 0 && unconscious();
}

/** C ref: youprop.h Slow_digestion */
function Slow_digestion() {
    const u = game.u || {};
    if (u.HSlow_digestion || u.ESlow_digestion) return true;
    const prop = u.uprops?.[SLOW_DIGESTION];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/** C ref: youprop.h Hunger */
function Hunger() {
    const u = game.u || {};
    if (u.HHunger || u.EHunger) return true;
    const prop = u.uprops?.[HUNGER];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/**
 * C ref: eat.c init_uhunger — reset hunger to Not Hungry / 900.
 * ATEMP(A_STR) repair + encumber_msg deferred.
 */
export function init_uhunger() {
    const u = game.u;
    if (!u) return;
    if ((u.uhs ?? NOT_HUNGRY) !== NOT_HUNGRY) {
        if (game.flags) game.flags.botl = true;
    }
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
}

/**
 * C ref: eat.c newuhs — recompute u.uhs from uhunger thresholds.
 * Field update only this iteration: occupation force_save_hs, hunger
 * messages, end_running, ATEMP WEAK crossover, faint/starve deferred.
 * @param {boolean} _incr true when called from metabolism (message tone)
 */
export function newuhs(_incr) {
    const u = game.u;
    if (!u) return;
    const h = u.uhunger ?? 900;
    const newhs = (h > 1000)
        ? SATIATED
        : (h > 150) ? NOT_HUNGRY
            : (h > 50) ? HUNGRY : (h > 0) ? WEAK : FAINTING;
    if (newhs !== (u.uhs ?? NOT_HUNGRY)) {
        if (game.flags) game.flags.botl = true;
    }
    u.uhs = newhs;
    void _incr;
}

/**
 * C ref: eat.c gethungry — metabolic uhunger--, accessorytime burns, newuhs.
 * Branch envelope: ordinary diet burn; odd Regen/encumb; even Hunger/
 * Conflict + ring/amulet accessorytime cases 0/4/8/12/16.
 * Named omissions: newuhs messages / faint / ATEMP; +0 RIN_PROTECTION
 * dual-ring MC polish when EProtection unset; meat-ring edge cases.
 */
export function gethungry() {
    if (game.u?.uinvulnerable) return;
    const u = game.u;

    // C: (!Unaware || !rn2(10)) && eats && !Slow_digestion → uhunger--
    // rn2(10) only when Unaware (|| short-circuit).
    const metabolic_tick = !Unaware() || !rn2(10);
    if (metabolic_tick) {
        const youData = hero_form_data();
        if ((carnivorous(youData) || herbivorous(youData)
                || metallivorous(youData))
            && !Slow_digestion()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    }

    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        // odd — Regeneration / encumbrance
        const HRegen = (u.HRegeneration | 0)
            || (u.uprops?.[REGENERATION]?.intrinsic | 0);
        const ERegen = (u.ERegeneration | 0)
            || (u.uprops?.[REGENERATION]?.extrinsic | 0);
        if ((HRegen & ~FROMFORM) || (ERegen & ~(W_ARTI | W_WEP))) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        if (near_capacity() > SLT_ENCUMBER) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    } else {
        // even — Hunger / Conflict + ring/amulet cases
        if (Hunger()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        const HConf = (u.HConflict | 0)
            || (u.uprops?.[CONFLICT]?.intrinsic | 0);
        const EConf = (u.EConflict | 0)
            || (u.uprops?.[CONFLICT]?.extrinsic | 0);
        if (HConf || (EConf & ~W_ARTI)) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        // C: switch (accessorytime) even cases 0/4/8/12/16
        const uleft = u.uleft;
        const uright = u.uright;
        const uamul = u.uamul;
        const objs = objects();
        const EProt = (u.EProtection | 0)
            || (u.uprops?.[PROTECTION]?.extrinsic | 0);
        switch (accessorytime) {
        case 0:
            // Slow_digestion from non-ring source (e.g. white DSM) burns
            if (Slow_digestion()
                && (!uright || uright.otyp !== RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== RIN_SLOW_DIGESTION)) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 4:
            if (uleft && uleft.otyp !== MEAT_RING
                && ((uleft.spe | 0)
                    || !objs?.[uleft.otyp]?.oc_charged
                    || (uleft.otyp === RIN_PROTECTION
                        && ((EProt & ~W_RINGL) === 0
                            || ((EProt & ~W_RINGL) === W_RINGR
                                && uright && uright.otyp === RIN_PROTECTION
                                && !(uright.spe | 0)))))) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 8:
            if (uamul && uamul.otyp !== FAKE_AMULET_OF_YENDOR) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 12:
            if (uright && uright.otyp !== MEAT_RING
                && ((uright.spe | 0)
                    || !objs?.[uright.otyp]?.oc_charged
                    || (uright.otyp === RIN_PROTECTION
                        && (EProt & ~W_RINGR) === 0))) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 16:
            if (u.uhave?.amulet || u.uhave_amulet) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        default:
            break;
        }
    }
    newuhs(true);
}

/**
 * C ref: eat.c morehungry — nutrition loss after feats of magic / vomit.
 * newuhs field update; hunger messages / faint deferred.
 */
export function morehungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) - (num | 0);
    newuhs(true);
}

/**
 * C ref: eat.c vomit — side effects of vomiting (fountain foul water, etc.).
 * Branch envelope: nomul(-2) when multi >= -2 + You_can_move_again.
 * Named omissions: cantvomit jaw-gape; Sick SICK_VOMITABLE cure; FAINTING
 * dry-heave message; yellow-dragon AT_BREA AD_ACID spew (RNG when poly).
 */
export function vomit() {
    // cantvomit / Sick / uhs FAINTING / acid-breath deferred
    if ((game.multi || 0) >= -2) {
        nomul(-2);
        game.multi_reason = 'vomiting';
        game.nomovemsg = 'You can move again.';
    }
}

/**
 * C ref: eat.c lesshungry — uhunger += num; choke/fullwarn deferred;
 * field-only newuhs(FALSE).
 */
export function lesshungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) + (num | 0);
    newuhs(false);
}

/**
 * C ref: eat.c obj_nutrition — CORPSE uses mons[].cnutrit; FOOD oc_nutrition.
 */
function obj_nutrition(otmp) {
    if (!otmp) return 0;
    if (otmp.otyp === CORPSE) {
        return mons(otmp.corpsenm)?.cnutrit ?? 0;
    }
    if (otmp.globby) return otmp.owt | 0;
    const oc = game.objects?.[otmp.otyp];
    if (oc?.oc_nutrition != null) return oc.oc_nutrition | 0;
    const name = objectNames[otmp.otyp];
    return FOOD_NUTRITION[name] ?? 0;
}

/** C ref: eat.c nonrotting_food */
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}

/** C ref: eat.c nonrotting_corpse macro */
function nonrotting_corpse(mnum) {
    if (mnum === PM_LIZARD || mnum === PM_LICHEN || mnum === PM_ACID_BLOB) {
        return true;
    }
    return is_rider(mons(mnum));
}

/** C hack.c rounddiv — same as weapon.js */
function rounddiv(x, y) {
    if (!y) return 0;
    let divsgn = 1;
    let yy = y | 0;
    let xx = x | 0;
    if (yy < 0) { divsgn = -divsgn; yy = -yy; }
    if (xx < 0) { divsgn = -divsgn; xx = -xx; }
    let r = Math.trunc(xx / yy);
    const m = xx % yy;
    if (2 * m >= yy) r++;
    return divsgn * r;
}

/** C ref: mkobj.c peek_at_iced_corpse_age — non-ice returns otmp.age */
function peek_at_iced_corpse_age(otmp) {
    // on_ice ROT_ICE_ADJUSTMENT deferred
    return otmp?.age ?? 0;
}

/**
 * C ref: eat.c food_xname — CORPSE → "[the ]newt corpse".
 */
function food_xname(food, the_pfx) {
    if (!food) return 'food';
    if (food.otyp === CORPSE) {
        const neut = pmnames[food.corpsenm]?.[2] || 'creature';
        const base = `${neut} corpse`;
        return the_pfx ? `the ${base}` : base;
    }
    const base = singular(food, xname);
    return the_pfx ? `the ${base}` : base;
}

/** C ref: eat.c violated_vegetarian — Monk feels guilty + adjalign(-1). */
function violated_vegetarian() {
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.unvegetarian = (game.u.uconduct.unvegetarian | 0) + 1;
    if ((game.urole?.mnum ?? -1) === PM_MONK) {
        // pline deferred to call site when async; sync bump for align
        if (!game.u.ualign) game.u.ualign = { type: 0, record: 0 };
        game.u.ualign.record = (game.u.ualign.record | 0) - 1;
        return true;
    }
    return false;
}

/** C ref: eat.c consume_oeaten — amt>0 → >>= amt; amt<0 → += amt (floor 1). */
function consume_oeaten(obj, amt) {
    if (!obj) return;
    if (!obj_nutrition(obj)) {
        obj.oeaten = 0;
        return;
    }
    if (amt > 0) {
        obj.oeaten = (obj.oeaten | 0) >> amt;
    } else if ((obj.oeaten | 0) > -amt) {
        obj.oeaten = (obj.oeaten | 0) + amt;
    } else {
        obj.oeaten = 0;
    }
    if ((obj.oeaten | 0) === 0) obj.oeaten = 1;
}

/**
 * C ref: eat.c is_edible — unique protect + poly diet predicates + FOOD.
 * Branch envelope: fire-elemental flammable; metallivore metallic
 * (rust monster → rustprone only); ghoul corpse/egg; gel cube organic
 * without contents; else FOOD_CLASS.
 */
function is_edible(obj) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (oc?.oc_unique) return false;

    const form = hero_form_data();
    const fmndx = form?.mndx ?? -1;
    const umon = game.u?.umonnum ?? -1;

    if (fmndx === PM_FIRE_ELEMENTAL && is_flammable(obj)) return true;

    if (metallivorous(form) && is_metallic(obj)
        && (fmndx !== PM_RUST_MONSTER || is_rustprone(obj))) {
        return true;
    }

    if (umon === PM_GHOUL) {
        return (obj.otyp === CORPSE && !vegan(mons(obj.corpsenm)))
            || obj.otyp === EGG;
    }

    if (umon === PM_GELATINOUS_CUBE && is_organic(obj) && !Has_contents(obj)) {
        return true;
    }

    return obj.oclass === FOOD_CLASS;
}

/** Build getobj allow-string of edible inventory letters (e.g. "b-g"). */
function edible_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (is_edible(o) && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    // Compact consecutive runs: b,c,d,e,f,g → b-g
    // C invent.c compactify uses dashes for runs of 3+; short runs stay literal.
    // seed1800 C shows "bcdef" (no dash) — emit uncompacted for ≤5 letters.
    if (lets.length <= 5) return lets.join('');
    let out = lets[0];
    let runStart = lets[0];
    let prev = lets[0];
    for (let i = 1; i < lets.length; i++) {
        const ch = lets[i];
        if (ch.charCodeAt(0) === prev.charCodeAt(0) + 1) {
            prev = ch;
            continue;
        }
        if (prev !== runStart) {
            out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
                ? prev
                : `-${prev}`;
        }
        out += ch;
        runStart = prev = ch;
    }
    if (prev !== runStart) {
        out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
            ? prev
            : `-${prev}`;
    }
    return out;
}

/**
 * C ref: invent.c getobj("eat", is_edible) — yn_function free-letter loop;
 * missing letter → You("don't have that object.") + continue (next
 * yn_function flushes NEED_MORE → --More--). Empty SUGGEST → early
 * "don't have anything to eat."
 */
async function getobj_eat() {
    for (;;) {
        await flush_topl_more();
        const lets = edible_lets();
        if (!lets) {
            await pline("You don't have anything to eat.");
            return null;
        }
        // C: yn_function(qbuf, NULL, '\0') — any char; leave prompt on line
        const query = `What do you want to eat? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');

        // quitchars: space, Esc, etc.
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // Menu path deferred
            await pline('Never mind.');
            return null;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        return otmp;
    }
}

/**
 * C ref: eat.c floorfood("eat", 0) — yn floor edibles, else invent getobj.
 * Branch envelope: can_reach_floor / !usteed / !menu_requested skip to
 * invent; metallivore beartrap + IRONBARS + floor gold ynq; edible floor
 * FOOD (non-coin) ynq; invent getobj_eat.
 * Named omissions: pool/lava reach gate; will_feel_cockatrice;
 * safe_qbuf ansimpleoname fallback; getobj_else "else" wording;
 * sacrifice/tin corpsecheck arms.
 */
async function floorfood_eat() {
    const u = game.u || {};
    // C: iflags.menu_requested || !can_reach_floor || usteed → skipfloor
    // pool/lava + Wwalking/clinger/Flying deferred (named omission)
    if (!game.flags?.menu_requested && can_reach_floor(true) && !u.usteed) {
        const ux = u.ux | 0;
        const uy = u.uy | 0;
        const form = hero_form_data();
        // C: feeding && metallivorous — beartrap, bars, then gold
        if (metallivorous(form)) {
            const ttmp = t_at(ux, uy);
            if (ttmp && ttmp.tseen && (ttmp.ttyp | 0) === BEAR_TRAP) {
                const u_in_beartrap = !!(u.utrap
                    && (u.utraptype | 0) === TT_BEARTRAP);
                const qbuf = `There is a bear trap here (${
                    u_in_beartrap ? 'holding you' : 'armed'
                }); eat it?`;
                const c = await yn_function(qbuf, 'ynq', 'n');
                if (c === 'y') {
                    deltrap(ttmp);
                    if (u_in_beartrap) reset_utrap(true);
                    const beartrap = mksobj(BEARTRAP, true, false);
                    const msg = `You only manage to ${
                        u_in_beartrap ? 'free yourself from' : 'disarm'
                    } the bear trap.`;
                    if (near_capacity() >= EXT_ENCUMBER && beartrap) {
                        await pline(msg);
                        obj_extract_self(beartrap);
                        await dropy(beartrap);
                        return null;
                    }
                    return beartrap;
                }
                if (c === 'q') return null;
                // 'n' → getobj_else++; continue metallivore arms
            }
            const loc = game.level?.at(ux, uy);
            if (loc && loc.typ === IRONBARS) {
                const wi = (loc.wall_info | 0) | (loc.flags | 0);
                const nodig = (wi & W_NONDIGGABLE) !== 0;
                let c = 'n';
                let qbuf = 'There are iron bars here';
                if (nodig || (u.uhunger | 0) > 1500) {
                    await pline(
                        `${qbuf} but you ${
                            nodig ? 'cannot' : 'are too full to'
                        } eat them.`,
                    );
                } else {
                    const dig = game.context?.digging;
                    const resume = !!(dig?.chew
                        && (dig.pos?.x | 0) === ux
                        && (dig.pos?.y | 0) === uy
                        && dig.level
                        && (dig.level.dnum | 0) === (u.uz?.dnum | 0)
                        && (dig.level.dlevel | 0) === (u.uz?.dlevel | 0));
                    qbuf += resume
                        ? '; resume eating them?'
                        : '; eat them?';
                    c = await yn_function(qbuf, 'ynq', 'n');
                }
                if (c === 'y') return hands_obj;
                if (c === 'q') return null;
            }
            if ((form?.mndx ?? -1) !== PM_RUST_MONSTER) {
                const gold = g_at(ux, uy);
                if (gold) {
                    const quan = gold.quan || 1;
                    const qbuf = quan === 1
                        ? 'There is 1 gold piece here; eat it?'
                        : `There are ${quan} gold pieces here; eat them?`;
                    const c = await yn_function(qbuf, 'ynq', 'n');
                    if (c === 'y') return gold;
                    if (c === 'q') return null;
                }
            }
        }
        for (let otmp = objects_at(ux, uy); otmp; otmp = otmp.nexthere) {
            if (otmp.oclass === COIN_CLASS || !is_edible(otmp)) continue;
            // will_feel_cockatrice deferred
            const one = (otmp.quan || 1) === 1;
            // C: "There is <doname> here; eat it?" (otense + safe_qbuf)
            const qbuf = `There ${one ? 'is' : 'are'} ${doname(otmp)} here; eat ${one ? 'it' : 'one'}?`;
            const c = await yn_function(qbuf, 'ynq', 'n');
            if (c === 'y') return otmp;
            if (c === 'q') return null;
            // 'n' → try next floor edible / fall through to invent
        }
    }
    return getobj_eat();
}

/**
 * C ref: invent.c useup / useupf — consume one; invent or floor.
 * Floor path matches useupf(obj,1): maybe splitobj then delobj →
 * obj_resists(0,0) always rolls rn2(100). Invent useup never rolls.
 *
 * Detect floor via where===OBJ_FLOOR or presence on the floor pile —
 * invent-split children may copy where or be OBJ_FREE without addinv
 * (touchfood freeinv/addinv_nomerge still deferred).
 */
function useup(otmp) {
    if (!otmp) return;
    const inInvent = otmp.where === OBJ_INVENT
        || (game.invent || []).includes(otmp);
    let onFloor = otmp.where === OBJ_FLOOR;
    if (!onFloor && !inInvent && otmp.ox != null && otmp.oy != null) {
        for (let o = objects_at(otmp.ox, otmp.oy); o; o = o.nexthere) {
            if (o === otmp) { onFloor = true; break; }
        }
    }
    if (!onFloor) {
        // Invent / free invent-child: invent.c useup — no obj_resists
        if ((otmp.quan || 1) > 1) {
            otmp.quan--;
            otmp.owt = weight(otmp);
            return;
        }
        const inv = game.invent || [];
        const idx = inv.indexOf(otmp);
        if (idx >= 0) inv.splice(idx, 1);
        otmp.quan = 0;
        otmp.where = OBJ_FREE;
        return;
    }
    // Floor: invent.c useupf(otmp, 1L)
    let victim = otmp;
    if ((otmp.quan || 1) > 1) {
        victim = splitobj(otmp, 1) || otmp;
    }
    delobj(victim);
}

/**
 * C invent.c freeinv subset — splice from game.invent[]; clear nobj link.
 */
function freeinv_touchfood(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    for (const o of inv) {
        if (o.nobj === obj) o.nobj = obj.nobj || null;
    }
    obj.nobj = null;
    obj.pickup_prev = 0;
    obj.where = OBJ_FREE;
}

/**
 * C ref: eat.c touchfood — split stack, set oeaten, freeinv+addinv_nomerge
 * so a bitten piece gets its own invent slot (steal weight / invlet).
 * Named omit: costly_alteration COST_BITE; sellobj_state around invent-full
 * dropy; OBJ_DELETED after drop.
 */
async function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: floor → splitobj(otmp, quan-1); carried → otmp = splitobj(otmp, 1)
        const carried = otmp.where === OBJ_INVENT
            || (game.invent || []).includes(otmp);
        if (!carried) {
            splitobj(otmp, (otmp.quan | 0) - 1);
        } else {
            const child = splitobj(otmp, 1);
            if (child) otmp = child;
        }
    }
    if (!otmp.oeaten) {
        // costly_alteration deferred
        otmp.oeaten = obj_nutrition(otmp);
    }

    // C: carried(otmp) ≡ where == OBJ_INVENT (split child copies where)
    if (otmp.where === OBJ_INVENT || (game.invent || []).includes(otmp)) {
        freeinv_touchfood(otmp);
        // C: inv_cnt(FALSE) after freeinv — non-gold invent letters
        let n = 0;
        for (const o of game.invent || []) {
            if (o.oclass !== COIN_CLASS) n++;
        }
        if (n >= INVLET_BASIC) {
            await dropy(otmp);
            if (otmp.where === OBJ_FREE) return null; // deleted approx
        } else {
            otmp = await addinv_nomerge(otmp);
        }
    }
    return otmp;
}

/**
 * C ref: attrib.c poison_strdmg → losestr + losehp.
 * losestr rn1(4,3) only when ABASE-strloss would go below ATTRMIN.
 */
export async function poison_strdmg(strloss, dmg) {
    const u = game.u || (game.u = {});
    if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
    const amin = game.urace?.attrmin?.[A_STR] ?? 3;
    let n = strloss | 0;
    let ustr = (u.acurr.a[A_STR] | 0) - n;
    let frailty = 0;
    while (ustr < amin) {
        ustr++;
        n--;
        frailty += rn1(4, 3);
    }
    if (frailty) {
        u.uhp = (u.uhp | 0) - frailty;
    }
    if (n > 0) await adjattrib(A_STR, -n, 1);
    u.uhp = (u.uhp | 0) - (dmg | 0);
    if ((u.uhp | 0) < 1) {
        u.uhp = 0;
        if (game.program_state) game.program_state.gameover = true;
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: eat.c garlic_breath — nearby smelling mons flee (untimed).
 */
async function garlic_breath(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = game.u || {};
    const d2 = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
    if (olfaction(mtmp.data) && d2 < 7) {
        await monflee(mtmp, 0, false, false);
    }
}

/**
 * C ref: eat.c fprefx — first-bite messages for non-rotten non-tin food.
 * Contest recorder is MACOS → APPLE "Macintosh!"; UNIX Core dumped deferred.
 * Returns false if eating should abort (egg explode etc. deferred → true).
 */
async function fprefx(otmp) {
    if (otmp.otyp === FOOD_RATION) {
        const hung = game.u?.uhunger ?? 900;
        if (hung <= 200) {
            await pline('This food really hits the spot!');
        } else if (hung < 700) {
            await pline('This satiates your stomach!');
        }
        return true;
    }
    if (otmp.otyp === TRIPE_RATION) {
        await pline('Yak - dog food!');
        return true;
    }
    // C: CLOVE_OF_GARLIC — undead vomit; else scare nearby then fall through
    if (otmp.otyp === CLOVE_OF_GARLIC) {
        if (is_undead(hero_form_data())) {
            // make_vomiting(rn1(reqtime,5)) deferred for undead poly hero
            return true;
        }
        for (const mtmp of game.fmon || []) {
            await garlic_breath(mtmp);
        }
        // FALLTHROUGH to default delicious feedback
    }
    // Contest C build defines MACOS (recorder on macOS).
    if (otmp.otyp === APPLE && !otmp.cursed) {
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (otmp.otyp === PEAR && !otmp.cursed) {
        await pline('Core dumped.');
        return true;
    }
    // default give_feedback
    const cursed = !!otmp.cursed;
    const bland = otmp.otyp === CRAM_RATION
        || otmp.otyp === K_RATION
        || otmp.otyp === C_RATION;
    const adj = cursed ? 'terrible!' : bland ? 'bland.' : 'delicious!';
    await pline(`This ${singular(otmp, xname)} is ${adj}`);
    return true;
}

/**
 * C ref: eat.c bite — nutrition per turn; choke deferred (canchoke always 0).
 * @returns {number} 1 if choked (abort), else 0
 */
function bite() {
    const v = game.context?.victual;
    if (!v?.piece) return 0;
    if (v.doreset) {
        game.context.victual = {};
        return 0;
    }
    if ((v.nmod | 0) < 0) {
        let nut = -(v.nmod | 0);
        if (nut < 1) nut = 1;
        lesshungry(nut);
        consume_oeaten(v.piece, v.nmod | 0);
    } else if ((v.nmod | 0) > 0 && ((v.usedtime | 0) % (v.nmod | 0))) {
        lesshungry(1);
        consume_oeaten(v.piece, -1);
    }
    return 0;
}

/**
 * C ref: eat.c eye_of_newt_buzz — small Pw boost from newt / AT_MAGC corpse.
 */
async function eye_of_newt_buzz() {
    const u = game.u || (game.u = {});
    // C: if (rn2(3) || 3 * u.uen <= 2 * u.uenmax)
    if (rn2(3) || 3 * (u.uen | 0) <= 2 * (u.uenmax | 0)) {
        const old_uen = u.uen | 0;
        u.uen = (u.uen | 0) + rnd(3);
        if ((u.uen | 0) > (u.uenmax | 0)) {
            if (!rn2(3)) {
                u.uenmax = (u.uenmax | 0) + 1;
                if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== (u.uen | 0)) {
            await You_feel('a mild buzz.');
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
        }
    }
}

/**
 * C ref: eat.c cpostfx — post-corpse effects.
 * Branch envelope (D-0492): default check_intrinsics → eye_of_newt_buzz
 * for AT_MAGC || PM_NEWT. Special switch cases, AD_STUN/AD_HALU hallu,
 * corpse_intrinsic / givit deferred.
 */
async function cpostfx(pm) {
    // Ordinary corpses (incl. newt) take C's default check_intrinsics path.
    // Named deferred specials (wraith, were*, nurse body, stalker/bat/mimic,
    // quantum, lizard body, chameleon/doppel/genetic, displacer,
    // disenchanter, riders, mind flayer INT) are no-ops until ported —
    // they must not set check_intrinsics when their bodies land.
    const ptr = mons(pm);
    // C: dmgtype AD_STUN/AD_HALU / violet fungus → make_hallucinated deferred
    if (attacktype(ptr, AT_MAGC) || pm === PM_NEWT) {
        await eye_of_newt_buzz();
    }
    // C: corpse_intrinsic → givit / gainstr deferred (newt conveys none)
}

/**
 * C ref: eat.c done_eating — finish meal; cpostfx for CORPSE; fpostfx cookie.
 */
async function done_eating(message) {
    const piece = game.context?.victual?.piece;
    if (!piece) {
        if (game.context) game.context.victual = {};
        game.occupation = null;
        return;
    }
    // C: occupation = 0 early so newuhs knows we're done
    game.occupation = null;
    newuhs(false);
    if (message) {
        await pline(`You finish eating ${food_xname(piece, true)}.`);
    }
    if (piece.otyp === CORPSE || piece.globby) {
        await cpostfx(piece.corpsenm | 0);
    } else if (piece.otyp === FORTUNE_COOKIE) {
        // C: fpostfx — cookie rumor only (other fpostfx deferred)
        await outrumor(bcsign(piece), BY_COOKIE);
    }
    useup(piece);
    if (game.context) game.context.victual = {};
}

/**
 * C ref: eat.c eatfood — occupation each move while eating.
 * Returns 1 to continue, 0 when done.
 */
async function eatfood() {
    const food = game.context?.victual?.piece;
    if (!food || !game.context?.victual?.eating) {
        if (game.context) game.context.victual = {};
        return 0;
    }
    // floor-moved food: C checks ox/oy still under hero; deferred beyond
    // leaving the square (occupation cancels). Same-cell floor OK.
    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        <= (game.context.victual.reqtime | 0)) {
        if (bite()) return 0;
        return 1;
    }
    await done_eating(true);
    return 0;
}

/**
 * C ref: eat.c start_eating — first bite; occupation if reqtime remains.
 */
async function start_eating(otmp, already_partly_eaten) {
    if (!game.context?.victual) return;
    game.context.victual.fullwarn = 0;
    game.context.victual.doreset = 0;
    game.context.victual.eating = 1;

    // C: cprefx before first bite; may clear victual on death/revive
    if (otmp.otyp === CORPSE || otmp.globby) {
        await cprefx(game.context.victual.piece?.corpsenm | 0);
        if (!game.context?.victual?.piece || !game.context.victual.eating) {
            return;
        }
    }

    if (bite()) {
        game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
        if ((game.context.victual.usedtime | 0)
            >= (game.context.victual.reqtime | 0)) {
            await done_eating(false);
        }
        return;
    }

    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        >= (game.context.victual.reqtime | 0)) {
        await done_eating(
            (game.context.victual.reqtime | 0) > 1 || already_partly_eaten,
        );
        return;
    }

    set_occupation(eatfood, `eating ${food_xname(otmp, true)}`);
}

/**
 * C ref: eat.c Hear_again — afternmv after fainting/rotten-food knock-out.
 * Chance of deafness clearing while out.
 */
function Hear_again() {
    // C: if (!rn2(2)) { make_deaf(0L, FALSE); disp.botl = TRUE; }
    if (!rn2(2)) {
        const u = game.u || (game.u = {});
        u.HDeaf = (u.HDeaf | 0) & ~TIMEOUT;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    }
    return 0;
}

/**
 * C ref: eat.c rottenfood — first bite of rotten food.
 * @returns {number} 1 if fainted (dont_start), else 0
 */
async function rottenfood(obj) {
    // C: "Blecch!  Rotten/Awful foodword!" — foodword poly deferred
    await pline('Blecch!  Rotten food!');
    if (!rn2(4)) {
        const u = game.u || {};
        if (u.Hallucination || u.HHallucination) {
            await pline('You feel rather trippy.');
        } else {
            await pline('You feel rather light headed.');
        }
        // C: make_confused(HConfusion + d(2, 4), FALSE)
        await make_confused((u.HConfusion | 0) + d(2, 4), false);
    } else if (!rn2(4) && !(game.u?.Blind || ((game.u?.HBlinded | 0) & TIMEOUT))) {
        await pline('Everything suddenly goes dark.');
        // C: make_blinded(BlindedTimeout + d(2, 10), FALSE) — body deferred
        d(2, 10);
    } else if (!rn2(3)) {
        const duration = rnd(10);
        await pline('The world spins and goes dark.');
        // C: incr_itimeout(&HDeaf, duration); nomul(-duration); afternmv=Hear_again
        const u = game.u || (game.u = {});
        u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | (((u.HDeaf | 0) & TIMEOUT) + duration);
        nomul(-duration);
        game.multi_reason = 'unconscious from rotten food';
        game.nomovemsg = 'You are conscious again.';
        game.afternmv = Hear_again;
        return 1;
    }
    return 0;
}

/**
 * C ref: eat.c eatcorpse — rotting / acid / poison / taste; sets reqtime.
 * @returns {number} 0 ok, 1 dont_start, 2 used up
 */
async function eatcorpse(otmp) {
    let retcode = 0;
    let tp = 0;
    const mnum = otmp.corpsenm | 0;
    let rotted = 0;
    const ptr = mons(mnum);
    const glob = !!otmp.globby;
    // flesh_petrifies / slimeable deferred — stoneable/slimeable stay false
    // unless green slime without resistances (named omission beyond flag)
    const slimeable = mnum === PM_GREEN_SLIME; // Unchanging/Slimed deferred
    const stoneable = false;

    if (!vegan(ptr)) {
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
    }
    if (!vegetarian(ptr)) {
        if (violated_vegetarian()) {
            await pline('You feel guilty.');
        }
    }

    if (!nonrotting_corpse(mnum)) {
        const age = peek_at_iced_corpse_age(otmp);
        const moves = game.moves ?? 0;
        rotted = Math.trunc((moves - age) / (10 + rn2(20)));
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    if (!glob && !stoneable && !slimeable && rotted > 5) {
        // tainted path — Sick_resistance / make_sick deferred; use up
        await pline(
            `Ulch - that ${
                ptr?.mlet === 'S_FUNGUS' ? 'fungoid vegetation'
                    : vegetarian(ptr) ? 'protoplasm' : 'meat'
            } was tainted!`,
        );
        useup(otmp);
        return 2;
    } else if (acidic(ptr) && !(game.u?.HAcid_resistance || game.u?.EAcid_resistance
        || game.u?.Acid_resistance)) {
        tp++;
        await pline('You have a very bad case of stomach acid.');
        // C: losehp(rnd(15), ...) — inline to avoid eat↔hack import cycle
        // Must call rnd() (logs rnd(N)=…) not 1+rn2 (logs rn2(N)=…).
        if (game.u) {
            const dmg = rnd(15);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    } else if (poisonous(ptr) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        const poisRes = !!(game.u?.HPoison_resistance || game.u?.EPoison_resistance
            || game.u?.Poison_resistance);
        if (!poisRes) {
            // C: poison_strdmg(rnd(4), rnd(15), ...) — clang LTR arg eval
            const strloss = rnd(4);
            const dmg = rnd(15);
            await poison_strdmg(strloss, dmg);
        } else {
            await pline('You seem unaffected by the poison.');
        }
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
        && !(game.u?.HSick_resistance || game.u?.ESick_resistance)) {
        tp++;
        await pline(`You feel ${game.u?.Sick ? 'very ' : ''}sick.`);
        // C: losehp(rnd(8), !glob ? "cadaver" : "rotted glob", KILLED_BY_AN)
        if (game.u) {
            const dmg = rnd(8);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    }

    // delay is weight dependent
    const cwt = glob ? (otmp.owt | 0) : (ptr?.cwt ?? 0);
    if (!game.context) game.context = {};
    if (!game.context.victual) game.context.victual = {};
    game.context.victual.reqtime = 3 + (cwt >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        // C: if (rottenfood(otmp)) { orotten; touchfood; retcode=1; }
        // Non-faint still eats — only faint sets dont_start (D-0443).
        if (await rottenfood(otmp)) {
            otmp.orotten = true;
            otmp = await touchfood(otmp);
            if (!otmp) return 1;
            if (game.context?.victual) game.context.victual.piece = otmp;
            retcode = 1;
        }

        const cm = mons(otmp.corpsenm);
        if (!(cm?.cnutrit)) {
            if (!retcode) await pline('The corpse rots away completely.');
            useup(otmp);
            return 2;
        }
        if (!retcode) consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
        && (game.u?.HStone_resistance || game.u?.Hallucination)) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PM_FLOATING_EYE
        && (game.u?.umonnum ?? -1) === PM_RAVEN) {
        await pline('You peck the eyeball with delight.');
    } else if (tp) {
        // message already delivered
    } else {
        // C: gy.youmonst.data — herbivorous must be true for omnivores so
        // palatable's rn2(10) is not short-circuited away (D-0409).
        const youData = hero_form_data();
        const yummy = vegan(ptr)
            ? (!carnivorous(youData) && herbivorous(youData))
            : (carnivorous(youData) && !herbivorous(youData));
        const palatable = (vegetarian(ptr)
            ? herbivorous(youData)
            : carnivorous(youData))
            && rn2(10)
            && (rotted < 1 || !rn2((rotted | 0) + 1));
        const palatable_msgs = [
            'Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough',
        ];
        const idx = vegetarian(ptr) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = !!(game.u?.Hallucination)
            || (!!palatable && palat_msg[0] === 'I');
        const pmxnam = food_xname(otmp, false);
        const taste = game.u?.Hallucination
            ? (yummy ? 'gnarly' : palatable ? 'copacetic' : 'grody')
            : (yummy ? 'delicious' : palatable
                ? palat_msg.slice(1) : 'terrible');
        const bang = (yummy || !palatable) ? '!' : '.';
        await pline(
            `This ${pmxnam} ${use_is ? 'is' : 'tastes'} ${taste}${bang}`,
        );
    }

    return retcode;
}

/** C ref: mondata.h cantwield — nohands || verysmall. */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/** C invent.c carried — object is in invent[]. */
function carried(obj) {
    if (!obj) return false;
    return (game.invent || []).includes(obj);
}

/** C mkobj.c obj_here — object present at (x,y) floor pile. */
function obj_here(obj, x, y) {
    if (!obj) return false;
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o === obj) return true;
    }
    return false;
}

/**
 * C ref: objnam.c the_unique_pm — G_UNIQ "the Name" article gate.
 * High priest / worm-tail / Wizard-of-Yendor exceptions match C.
 */
function the_unique_pm(ptr) {
    if (!ptr || type_is_pname(ptr)) return false;
    let uniq = !!((ptr.geno | 0) & G_UNIQ);
    if (PM_HIGH_CLERIC >= 0 && ptr === mons(PM_HIGH_CLERIC)) uniq = false;
    if (PM_LONG_WORM_TAIL >= 0 && ptr === mons(PM_LONG_WORM_TAIL)) {
        uniq = false;
    }
    if (PM_WIZARD_OF_YENDOR >= 0 && ptr === mons(PM_WIZARD_OF_YENDOR)) {
        uniq = true;
    }
    return uniq;
}

/** C ref: potion.c / youprop fingers_or_gloves — gloves vs fingers. */
function fingers_or_gloves(_capitalize) {
    return game.u?.uarmg ? 'gloves' : 'fingers';
}

/** C ref: objnam.c yobjnam(obj, NULL) subset — "your dagger". */
function yobjnam(obj) {
    if (!obj) return 'your weapon';
    return `your ${xname(obj)}`;
}

/**
 * C ref: eat.c tin_variety(obj, displ) — gameplay path (displ=false).
 * Homemade→rotten rn2(7) and lizard remap match C.
 */
function tin_variety(obj, displ) {
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
        r = rn2(TTSZ - 1);
    }
    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7)) {
        r = ROTTEN_TIN;
    }
    if (r === ROTTEN_TIN && ismnum(mnum) && nonrotting_corpse(mnum)) {
        r = HOMEMADE_TIN;
    }
    return r;
}

/**
 * C ref: eat.c costly_tin — shop unpaid alteration of tin being opened.
 * Split stack if quan>1; costly_alteration(COST_OPEN/COST_DSTROY).
 */
async function costly_tin(alter_type) {
    let tin = game.context?.tin?.tin;
    if (!tin) return null;
    const unpaidCarried = carried(tin) && tin.unpaid;
    const unpaidFloor = !carried(tin)
        && costly_spot(tin.ox | 0, tin.oy | 0)
        && !tin.no_charge;
    if (unpaidCarried || unpaidFloor) {
        if ((tin.quan | 0) > 1) {
            tin = splitobj(tin, 1) || tin;
            if (!game.context) game.context = {};
            if (!game.context.tin) game.context.tin = {};
            game.context.tin.tin = tin;
            game.context.tin.o_id = tin.o_id | 0;
        }
        await costly_alteration(tin, alter_type);
    }
    return tin;
}

/** C ref: eat.c use_up_tin — invent useup or floor useupf; clear tin ctx. */
function use_up_tin(tin) {
    if (carried(tin)) useup(tin);
    else useup(tin); // floor path via useup's OBJ_FLOOR arm
    if (!game.context) game.context = {};
    game.context.tin = { tin: null, o_id: 0, reqtime: 0, usedtime: 0 };
}

/**
 * C ref: invent.c useupall — remove entire invent stack (setnotworn deferred).
 */
function useupall(otmp) {
    if (!otmp) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: invent.c useupf — consume numused from floor pile (shop bill deferred).
 */
function useupf(otmp, numused) {
    if (!otmp) return;
    let victim = otmp;
    const n = numused | 0;
    if ((otmp.quan || 1) > n) {
        victim = splitobj(otmp, n) || otmp;
    }
    delobj(victim);
}

/**
 * C ref: eat.c eatspecial — finish non-food meal: lesshungry + useup.
 * Named omissions: PAPER messages; dopotion; eataccessory; leash;
 * trident/flint; uwepgone/uqwepgone/uswapwepgone; unpunish ball/chain;
 * vault_gd_watching(GD_EATGOLD).
 */
async function eatspecial() {
    const otmp = game.context?.victual?.piece;
    if (!otmp) return;
    const nmod = game.context.victual.nmod | 0;
    // C: set_occupation(eatfood,…) so lesshungry choke msgs see occupation
    set_occupation(eatfood, 'eating non-food');
    lesshungry(nmod);
    game.occupation = null;
    if (game.context) game.context.victual = {};

    if (otmp.oclass === COIN_CLASS) {
        if (carried(otmp)) useupall(otmp);
        else useupf(otmp, otmp.quan || 1);
        return;
    }
    // PAPER / POTION / RING / AMULET / LEASH / TRIDENT / FLINT deferred
    if (carried(otmp)) useup(otmp);
    else useupf(otmp, 1);
}

/**
 * C ref: eat.c doeat_nonfood — one-turn non-FOOD meal for poly diets.
 * Branch envelope: nutrition from quan/weight/oc_nutrition; vegan/
 * vegetarian conduct for leather/bone/dragon_hide/wax; cursed rottenfood;
 * poisoned weapon; delicious pline; eatspecial.
 * Named omissions: SCR_MAIL; livelog first-time conduct.
 */
async function doeat_nonfood(otmp) {
    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 1,
        canchoke: (game.u?.uhs | 0) === SATIATED ? 1 : 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 1,
        nmod: 0,
    };

    let basenutrit;
    let nodelicious = false;
    if (otmp.oclass === COIN_CLASS) {
        const quan = otmp.quan || 0;
        basenutrit = quan > 200000 ? 2000 : Math.trunc(quan / 100);
    } else if (otmp.oclass === BALL_CLASS || otmp.oclass === CHAIN_CLASS) {
        basenutrit = weight(otmp);
    } else {
        basenutrit = game.objects?.[otmp.otyp]?.oc_nutrition ?? 0;
    }
    game.context.victual.nmod = basenutrit;

    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const material = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    if (material === MAT_LEATHER || material === MAT_BONE
        || material === MAT_DRAGON_HIDE || material === MAT_WAX) {
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
        if (material !== MAT_WAX) violated_vegetarian();
    }

    if (otmp.cursed) {
        await rottenfood(otmp);
        nodelicious = true;
    } else if (material === MAT_PAPER) {
        nodelicious = true;
    }

    if (otmp.oclass === WEAPON_CLASS && otmp.opoisoned) {
        await pline('Ecch - that must have been poisonous!');
        const poisRes = !!(game.u?.HPoison_resistance || game.u?.EPoison_resistance
            || game.u?.Poison_resistance);
        if (!poisRes) {
            await poison_strdmg(rnd(4), rnd(15));
        } else {
            await pline('You seem unaffected by the poison.');
        }
    } else if (!nodelicious) {
        const artSkip = obj_is_pname(otmp)
            && ((otmp.oartifact | 0) < ART_ORB_OF_DETECTION);
        const noun = otmp.oclass === COIN_CLASS
            ? foodword(otmp)
            : singular(otmp, xname);
        await pline(`${artSkip ? '' : 'This '}${noun} is delicious!`);
    }
    await eatspecial();
    return 1;
}

/**
 * C ref: eat.c eating_conducts — food/unvegan/unvegetarian counters.
 * Livelog first-time messages deferred.
 */
function eating_conducts(pd) {
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;
    if (!vegan(pd)) {
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
    }
    if (!vegetarian(pd)) {
        violated_vegetarian();
    }
}

/**
 * C ref: eat.c maybe_cannibal — own-species / poly-form / lycanthrope.
 * Returns true when cannibalism penalty applied (luck + aggravate).
 */
async function maybe_cannibal(pm, allowmsg) {
    const u = game.u || {};
    const moves = game.moves | 0;
    // C: static ate_brains — one penalty per turn (mind flayer multi-hit)
    if ((game.context?.eat_ate_brains | 0) === moves) return false;
    if (!game.context) game.context = {};
    game.context.eat_ate_brains = moves;

    const fptr = mons(pm);
    if (!fptr) return false;
    if (!CANNIBAL_ALLOWED()
        && (your_race(fptr)
            || (Upolyd(u) && same_race(hero_form_data(), fptr))
            || (ismnum(u.ulycn) && were_beastie(pm) === (u.ulycn | 0)))) {
        if (allowmsg) {
            if (Upolyd(u) && your_race(fptr)) {
                await pline('You have a bad feeling deep inside.');
            }
            await pline('You cannibal!  You will regret this!');
        }
        u.HAggravate_monster = (u.HAggravate_monster | 0) | FROMOUTSIDE;
        change_luck(-rn1(4, 2)); // -5..-2
        return true;
    }
    return false;
}

/**
 * C ref: eat.c fix_petrification — clear Stoned via make_stoned(0).
 */
async function fix_petrification() {
    const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
    let buf;
    if (hallu) {
        const fine = acurr(A_CHA) > 15 ? 'fine ' : '';
        buf = `What a pity--you just ruined a future piece of ${fine}art!`;
    } else {
        buf = 'You feel limber!';
    }
    await make_stoned(0, buf, 0, '');
}

/**
 * C ref: eat.c cprefx — pre-corpse / pre-tin-meat effects.
 * Branch envelope: maybe_cannibal; flesh_petrifies → stone / polymon;
 * dog/cat aggravate; lizard unstone; Death/Pestilence/Famine done;
 * green slime; acidic unstone.
 * Named omissions: revive_corpse after rider lifesave; polymon failure
 * detail when stone-golem form unavailable.
 */
async function cprefx(pm) {
    await maybe_cannibal(pm, true);

    const ptr = mons(pm);
    if (ptr && flesh_petrifies(ptr)) {
        const u = game.u || {};
        const Stone_resistance = !!(u.HStone_resistance || u.EStone_resistance
            || u.Stone_resistance);
        const youData = hero_form_data();
        let polyed = false;
        if (!Stone_resistance && poly_when_stoned(youData)) {
            polyed = !!(await polymon(PM_STONE_GOLEM));
        }
        if (!Stone_resistance && !polyed) {
            if (game.context?.tin?.tin) {
                use_up_tin(game.context.tin.tin);
            }
            if (!game.killer) game.killer = { name: '', format: 0 };
            const meat = pmnames[pm]?.[NEUTRAL] || 'strange';
            game.killer.name = `tasting ${meat} meat`;
            game.killer.format = KILLED_BY;
            await pline('You turn to stone.');
            await done(STONING);
            if (game.context?.victual?.piece) {
                game.context.victual.eating = 0;
            }
            return;
        }
    }

    switch (pm | 0) {
    case PM_LITTLE_DOG:
    case PM_DOG:
    case PM_LARGE_DOG:
    case PM_KITTEN:
    case PM_HOUSECAT:
    case PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED()) {
            const nm = pmnames[pm]?.[NEUTRAL] || 'animal';
            await You_feel(`that eating the ${nm} was a bad idea.`);
            const u = game.u || (game.u = {});
            u.HAggravate_monster = (u.HAggravate_monster | 0) | FROMOUTSIDE;
        }
        break;
    case PM_LIZARD:
        if (game.u?.Stoned) await fix_petrification();
        break;
    case PM_DEATH:
    case PM_PESTILENCE:
    case PM_FAMINE: {
        await pline('Eating that is instantly fatal.');
        if (!game.killer) game.killer = { name: '', format: 0 };
        const nm = pmnames[pm]?.[NEUTRAL] || 'a Rider';
        game.killer.name = `unwisely ate the body of ${nm}`;
        game.killer.format = NO_KILLER_PREFIX;
        await done(DIED);
        exercise(A_WIS, false);
        // revive_corpse for corpse (not tin) deferred
        return;
    }
    case PM_GREEN_SLIME: {
        const u = game.u || {};
        const Slimed = !!(u.Slimed & TIMEOUT);
        const Unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
        if (!Slimed && !Unchanging && !slimeproof(hero_form_data())) {
            await pline("You don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN, '');
        }
    }
    // FALLTHROUGH
    default:
        if (ptr && acidic(ptr) && (game.u?.Stoned)) {
            await fix_petrification();
        }
        break;
    }
}

/**
 * C ref: eat.c consume_tin — open tin contents + nutrition / spinach.
 * Branch envelope: ordinary meat tin + spinach; otrapped → b_trapped;
 * cursed trap roll burns rn2; costly_tin shop bill; Fixed_abil
 * Popeye Olive/Bluto deferred (!Fixed_abil → Popeye).
 */
async function consume_tin(mesg) {
    const always_eat = metallivorous(hero_form_data());
    let tin = game.context?.tin?.tin;
    if (!tin) return;

    const r = tin_variety(tin, false);
    // C: otrapped || (cursed && r != HOMEMADE && !rn2(8)) → b_trapped
    if (tin.otrapped || (tin.cursed && r !== HOMEMADE_TIN && !rn2(8))) {
        await b_trapped('tin', NO_PART);
        tin = await costly_tin(COST_DSTROY);
        use_up_tin(tin);
        return;
    }

    await pline(mesg);

    if (r !== SPINACH_TIN) {
        let mnum = tin.corpsenm | 0;
        if (mnum === NON_PM) {
            const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
            if (hallu) {
                await pline(`It's full of ${
                    rn2(2) ? 'air elemental souffle' : 'dehydrated water'
                }.`);
            } else {
                await pline('It turns out to be empty.');
            }
            observe_object(tin);
            tin.known = 1;
            tin = await costly_tin(COST_OPEN);
            use_up_tin(tin);
            if (always_eat) lesshungry(5);
            return;
        }

        let which = 0; // 0 plural, 1 as-is, 2 "the"
        let what;
        const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
        const stoneRes = !!(game.u?.HStone_resistance || game.u?.Stone_resistance);
        if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
            && (stoneRes || hallu)) {
            what = 'chicken';
            which = 1;
        } else if (hallu) {
            what = rndmonnam(null);
        } else {
            what = pmnames[mnum]?.[2] || 'creature';
            const ptr = mons(mnum);
            if (the_unique_pm(ptr)) which = 2;
            else if (type_is_pname(ptr)) which = 1;
        }
        if (which === 0) what = makeplural(what);
        else if (which === 2) what = the(what);

        if (!always_eat) {
            await pline(`It smells like ${what}.`);
            if ((await yn_function('Eat it?', 'yn', 'n')) === 'n') {
                if (game.flags?.verbose) {
                    await pline('You discard the open tin.');
                }
                if (!hallu) {
                    observe_object(tin);
                    tin.known = 1;
                }
                tin = await costly_tin(COST_OPEN);
                use_up_tin(tin);
                return;
            }
        }

        if (!game.context) game.context = {};
        game.context.victual = {};

        const ptr = mons(mnum);
        const meat = pmnames[mnum]?.[2] || 'creature';
        await pline(`You consume ${tintxts[r].txt} ${meat}.`);
        eating_conducts(ptr);
        observe_object(tin);
        tin.known = 1;
        tin = game.context.tin.tin = await costly_tin(COST_OPEN);

        await cprefx(mnum);
        if (game.context?.tin?.tin) await cpostfx(mnum);
        if (!game.context?.tin?.tin) return;

        if (tintxts[r].nut < 0) {
            await make_vomiting(rn1(15, 10), false);
        } else {
            let nutamt = tintxts[r].nut | 0;
            if (r === HOMEMADE_TIN) {
                const cnut = ptr?.cnutrit | 0;
                if (nutamt > cnut) nutamt = cnut;
            }
            if (always_eat) nutamt += 5;
            use_up_tin(tin);
            tin = null;
            lesshungry(nutamt);
        }

        if (tintxts[r].greasy) {
            const alreadyglib = (game.u?.Glib | 0) & TIMEOUT;
            make_glib(alreadyglib + rn1(11, 5));
            await pline(
                `Eating ${tintxts[r].txt} food made your ${
                    fingers_or_gloves(true)
                } ${alreadyglib ? 'even more' : 'very'} slippery.`,
            );
        }
    } else {
        // spinach
        const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
        const blind = !!(game.u?.Blind || (game.u?.HBlinded | 0));
        if (tin.cursed) {
            await pline(
                `It contains some decaying${blind ? '' : ' '}${
                    blind ? '' : 'green'
                } substance.`,
            );
        } else {
            await pline('It contains spinach.');
            observe_object(tin);
            tin.known = 1;
        }

        if (!always_eat
            && (await yn_function('Eat it?', 'yn', 'n')) === 'n') {
            if (game.flags?.verbose) {
                await pline('You discard the open tin.');
            }
            tin = await costly_tin(COST_OPEN);
            use_up_tin(tin);
            return;
        }

        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;
        if (!tin.cursed) {
            // Fixed_abil Olive/Bluto deferred — always Popeye like !Fixed_abil
            await pline(
                `This makes you feel like ${
                    hallu ? "Swee'pea" : 'Popeye'
                }!`,
            );
        }
        await gainstr(tin, 0, false);

        tin = game.context.tin.tin = await costly_tin(COST_OPEN);
        let nutamt = tin.blessed ? 600
            : !tin.cursed ? (400 + rnd(200))
                : (200 + rnd(400));
        if (always_eat) nutamt += 5;
        use_up_tin(tin);
        tin = null;
        lesshungry(nutamt);
    }
    if (tin) use_up_tin(tin);
}

/**
 * C ref: eat.c opentin — occupation tick while opening a tin.
 * @returns {number} 1 continue, 0 done
 */
async function opentin() {
    const tin = game.context?.tin?.tin;
    const u = game.u || {};
    if (!carried(tin)
        && (!obj_here(tin, u.ux | 0, u.uy | 0) || !can_reach_floor(true))) {
        return 0;
    }
    game.context.tin.usedtime = (game.context.tin.usedtime | 0) + 1;
    if ((game.context.tin.usedtime | 0) >= 50) {
        await pline('You give up your attempt to open the tin.');
        return 0;
    }
    if ((game.context.tin.usedtime | 0) < (game.context.tin.reqtime | 0)) {
        return 1;
    }
    await consume_tin('You succeed in opening the tin.');
    return 0;
}

/**
 * C ref: eat.c start_tin — begin opening (immediate or occupation).
 */
async function start_tin(otmp) {
    let mesg = null;
    let tmp = 0;
    const form = hero_form_data();
    const u = game.u || {};
    const uwep = u.uwep;
    let need_no_opener = false;

    if (metallivorous(form)) {
        mesg = 'You bite right into the metal tin...';
        tmp = 0;
    } else if (cantwield(form)) {
        await pline('You cannot handle the tin properly to open it.');
        return;
    } else if (otmp.blessed) {
        tmp = (uwep && uwep.blessed && uwep.otyp === TIN_OPENER) ? 0 : rn2(2);
        if (!tmp) mesg = 'The tin opens like magic!';
        else await pline('The tin seems easy to open.');
    } else if (uwep) {
        switch (uwep.otyp) {
        case TIN_OPENER:
            mesg = 'You easily open the tin.';
            tmp = rn2(uwep.cursed ? 3 : !uwep.blessed ? 2 : 1);
            break;
        case DAGGER:
        case SILVER_DAGGER:
        case ELVEN_DAGGER:
        case ORCISH_DAGGER:
        case ATHAME:
        case KNIFE:
        case STILETTO:
        case CRYSKNIFE:
            tmp = 3;
            break;
        case PICK_AXE:
        case AXE:
            tmp = 6;
            break;
        default:
            need_no_opener = true;
            break;
        }
        if (!need_no_opener) {
            await pline(`Using ${yobjnam(uwep)} you try to open the tin.`);
        }
    } else {
        need_no_opener = true;
    }

    if (need_no_opener) {
        await pline('It is not so easy to open this tin.');
        if (u.Glib) {
            await pline(
                `The tin slips from your ${fingers_or_gloves(false)}.`,
            );
            let tin = otmp;
            if ((tin.quan || 1) > 1) tin = splitobj(tin, 1) || tin;
            if (carried(tin)) await dropx(tin);
            else stackobj(tin);
            return;
        }
        tmp = rn1(
            1 + Math.trunc(500 / ((acurr(A_DEX) | 0) + (acurrstr() | 0))),
            10,
        );
    }

    if (!game.context) game.context = {};
    game.context.tin = {
        tin: otmp,
        o_id: otmp.o_id,
        reqtime: 0,
        usedtime: 0,
    };
    if (!tmp) {
        await consume_tin(mesg);
    } else {
        game.context.tin.reqtime = tmp;
        game.context.tin.usedtime = 0;
        set_occupation(opentin, 'opening the tin');
    }
}

/** C invent getobj ranks (hack.h) — match apply.js / C. */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_SUGGEST = 2;

/** C ref: eat.c tinopen_ok — SUGGEST TIN only. */
function tinopen_ok(obj) {
    if (obj && (obj.otyp | 0) === TIN) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

/** Invent letters with tin SUGGEST (C getobj "open"). */
function tinopen_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && tinopen_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("open", tinopen_ok, GETOBJ_NOFLAGS).
 */
async function getobj_tinopen() {
    for (;;) {
        await flush_topl_more();
        const lets = tinopen_lets();
        if (!lets) {
            await pline("You don't have anything to open.");
            return null;
        }
        const query = `What do you want to open? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (tinopen_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline('You cannot open that!');
            return null;
        }
        return otmp;
    }
}

/** C invent.c carrying — first invent[] match by otyp. */
function carrying_otyp(otyp) {
    return (game.invent || []).find((o) => (o.otyp | 0) === (otyp | 0)) || null;
}

/**
 * C ref: eat.c use_tin_opener — apply tin opener; wield if needed; start_tin.
 * Named omit: safe_qbuf doname/thesimpleoname polish (simple qbuf).
 * @returns {number} ECMD_*
 */
export async function use_tin_opener(obj) {
    let res = ECMD_OK;
    if (!carrying_otyp(TIN)) {
        await pline('You have no tin to open.');
        return ECMD_OK;
    }
    const u = game.u || {};
    if (obj !== u.uwep) {
        if (obj.cursed && obj.bknown) {
            const qbuf = `Really wield ${doname(obj) || thesimpleoname(obj) || 'that'}?`;
            if ((await yn_function(qbuf, 'ynq', 'n')) !== 'y') {
                return ECMD_OK;
            }
        }
        if (!(await wield_tool(obj, 'use'))) return ECMD_OK;
        res = ECMD_TIME;
    }
    const otmp = await getobj_tinopen();
    if (!otmp) return res | ECMD_CANCEL;
    await start_tin(otmp);
    return ECMD_TIME;
}

/**
 * C ref: eat.c doeat() — food-class path incl. TIN + multi-turn rations.
 * Ordinary rotten food via rottenfood + Hear_again (D-0911).
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    // C: floorfood("eat", 0) — floor yn then invent getobj
    const otmp0 = await floorfood_eat();
    if (!otmp0) return 0;

    // C ref: eat.c doeat — check_capacity((char *)0) before is_edible
    // (hack.c: near_capacity >= EXT_ENCUMBER → You_cant carry stuff).
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return 0;
    }

    // C: floorfood &hands_obj → metallivore chewing IRONBARS via still_chewing
    if (otmp0 === hands_obj) {
        const u = game.u || {};
        const loc = game.level?.at(u.ux | 0, u.uy | 0);
        if ((await still_chewing(u.ux | 0, u.uy | 0))
            && loc && loc.typ === IRONBARS) {
            await pline('You pause to swallow.');
        }
        return 1;
    }

    if (otmp0.oclass === COIN_CLASS && !is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }
    if (!is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }

    // C: worn armor/tool/amulet/saddle — rings allowed
    const worn = otmp0.owornmask | 0;
    if (worn & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) {
        await pline("You can't eat something you're wearing.");
        return 0;
    }

    // KMH — Slow digestion ring is indigestible
    if (otmp0.otyp === RIN_SLOW_DIGESTION) {
        await pline('This ring is indigestible!');
        await rottenfood(otmp0);
        return 1;
    }

    if (otmp0.oclass !== FOOD_CLASS) {
        return doeat_nonfood(otmp0);
    }

    // C: tins are a special case — start_tin; conduct inside consume_tin
    if (otmp0.otyp === TIN) {
        await start_tin(otmp0);
        return 1;
    }

    // KMH, conduct
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const already_partly_eaten = !!otmp0.oeaten;
    let otmp = await touchfood(otmp0);
    if (!otmp) return 1;

    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 0,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 0,
        nmod: 0,
    };

    let dont_start = false;

    if (otmp.otyp === CORPSE || otmp.globby) {
        const tmp = await eatcorpse(otmp);
        if (tmp === 2) {
            game.context.victual = {};
            return 1;
        }
        if (tmp) dont_start = true;
        // eatcorpse set reqtime / may have modified oeaten
    } else {
        const oc = game.objects?.[otmp.otyp];
        game.context.victual.reqtime = oc?.oc_delay ?? 1;

        // C: rotten check — FORTUNE_COOKIE skipped; nonrotting_food skips age gate
        const moves = game.moves ?? 0;
        const age = otmp.age ?? moves;
        if (otmp.otyp !== FORTUNE_COOKIE
            && (otmp.cursed
                || (!nonrotting_food(otmp.otyp)
                    && (moves - age) > (otmp.blessed ? 50 : 30)
                    && (otmp.orotten || !rn2(7))))) {
            if (await rottenfood(otmp)) {
                otmp.orotten = true;
                dont_start = true;
            }
            consume_oeaten(otmp, 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!(await fprefx(otmp))) {
                game.context.victual = {};
                return 1;
            }
        } else {
            const req = game.context.victual.reqtime;
            await pline(
                `You ${req === 1 ? 'eat' : 'begin eating'} ${doname(otmp)}.`,
            );
        }
    }

    const basenutrit = obj_nutrition(otmp) | 0;
    const oeaten = otmp.oeaten | 0;
    if (basenutrit === 0) {
        game.context.victual.reqtime = 0;
    } else {
        game.context.victual.reqtime = rounddiv(
            (game.context.victual.reqtime | 0) * oeaten,
            basenutrit,
        );
    }
    const reqtime = game.context.victual.reqtime | 0;
    if (reqtime === 0 || oeaten === 0) {
        game.context.victual.nmod = 0;
    } else if (oeaten >= reqtime) {
        game.context.victual.nmod = -Math.trunc(oeaten / reqtime);
    } else {
        game.context.victual.nmod = reqtime % oeaten;
    }
    game.context.victual.canchoke = 0; // u.uhs == SATIATED deferred

    if (dont_start) {
        otmp.owt = weight(otmp);
        return 1;
    }

    // C: start_eating handles reqtime>1 via eatfood occupation (rations etc.)
    await start_eating(otmp, already_partly_eaten);
    return 1;
}
