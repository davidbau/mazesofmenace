// mkobj.js — Object creation.
// C ref: mkobj.c — mkobj, mksobj, mkgold, next_ident, mksobj_init (partial).

import { game } from './gstate.js';
import { rn2, rnd, rn1, rne, rnz } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    RANDOM_CLASS,
    WEAPON_CLASS,
    ARMOR_CLASS,
    RING_CLASS,
    AMULET_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    SPBOOK_CLASS,
    WAND_CLASS,
    COIN_CLASS,
    GEM_CLASS,
    ROCK_CLASS,
    BALL_CLASS,
    CHAIN_CLASS,
    objectNames,
} from './objects.js';
// objectNames used for known-flag heuristic (oc_uses_known not in table yet)
import { rndmonnum } from './makemon.js';
import { undead_to_corpse, can_be_hatched, dead_species } from './mon.js';
import {
    mons, is_male, is_female, is_neuter, verysmall, PM_LICHEN, monsterNames,
    G_NOCORPSE, NON_PM as MON_NON_PM,
} from './monsters.js';
import { PM_SAMURAI } from './generated/monsters_data.js';
import {
    ROT_AGE, TAINT_AGE, TROLL_REVIVE_CHANCE,
    ROT_CORPSE, REVIVE_MON, TIMER_OBJECT,
    OBJ_FREE, OBJ_FLOOR, OBJ_BURIED, OBJ_MINVENT,
    G_GONE,
    LOST_NONE, LOST_EXPLODING,
} from './const.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const BOULDER = objectNames.indexOf('BOULDER');
const STATUE = objectNames.indexOf('STATUE');
const BOOMERANG = objectNames.indexOf('BOOMERANG');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const NON_PM = MON_NON_PM;

// Material constants (objclass.h enum obj_material_types)
const LIQUID = 1;
const CLOTH = 6;
const LEATHER = 7;
const WOOD = 8;
const DRAGON_HIDE = 10;
const IRON = 11;
const COPPER = 13;
const GLASS = 19;
const PLASTIC = 18;

const MKOBJ_PROBS = [
    { iprob: 10, iclass: WEAPON_CLASS },
    { iprob: 11, iclass: ARMOR_CLASS },
    { iprob: 20, iclass: FOOD_CLASS },
    { iprob: 8, iclass: TOOL_CLASS },
    { iprob: 7, iclass: GEM_CLASS },
    { iprob: 16, iclass: POTION_CLASS },
    { iprob: 16, iclass: SCROLL_CLASS },
    { iprob: 4, iclass: SPBOOK_CLASS },
    { iprob: 4, iclass: WAND_CLASS },
    { iprob: 3, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];

const BOX_PROBS = [
    { iprob: 18, iclass: GEM_CLASS },
    { iprob: 15, iclass: FOOD_CLASS },
    { iprob: 18, iclass: POTION_CLASS },
    { iprob: 18, iclass: SCROLL_CLASS },
    { iprob: 12, iclass: SPBOOK_CLASS },
    { iprob: 7, iclass: COIN_CLASS },
    { iprob: 6, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];

function objs() {
    return game.objects;
}
function bases() {
    return game.bases;
}
function otypName(otyp) {
    return objectNames[otyp] || '';
}

/**
 * C ref: mkobj.c weight() — subset for carried loot (no BoH / corpse cwt).
 */
export function weight(obj) {
    if (!obj) return 0;
    const objects = objs() || [];
    let wt = objects[obj.otyp]?.oc_weight ?? 0;
    const quan = obj.quan || 1;
    if (quan < 1) return 0;
    if (obj.oclass === COIN_CLASS || obj.otyp === GOLD_PIECE) {
        wt = Math.trunc((quan + 50) / 100);
        return Math.max(wt, 1);
    }
    if (!wt) return Math.trunc((quan + 1) / 2);
    return wt * quan;
}

// C ref: mkobj.c next_ident()
export function next_ident() {
    if (!game.context) game.context = {};
    const res = game.context.ident || 1;
    game.context.ident = (game.context.ident || 1) + rnd(2);
    if (!game.context.ident) game.context.ident = rnd(2) + 1;
    return res;
}

/**
 * C ref: mkobj.c splitobj — reduce obj->quan by num; return new stack of num.
 * nextoid shop-price search omitted: ordinary items take first oid then
 * next_ident() (one rnd(2)), matching non-shop dog_invent / throw paths.
 * Deferred: unpaid/splitbill, copy_oextra, timers, light sources, Lua where.
 */
export function splitobj(obj, num) {
    const quan = obj?.quan || 1;
    if (!obj || obj.cobj || num <= 0 || quan <= num) return null;

    const otmp = { ...obj };
    otmp.oextra = null;
    // C: nextoid → next_ident when oid_price_adjustment matches (typical)
    otmp.o_id = next_ident();
    otmp.timed = 0;
    otmp.lamplit = 0;
    otmp.owornmask = 0;
    otmp.lua_ref_cnt = 0;
    otmp.pickup_prev = 0;

    obj.quan = quan - num;
    obj.owt = weight(obj);
    otmp.quan = num;
    otmp.owt = weight(otmp);

    if (!game.context) game.context = {};
    game.context.objsplit = {
        parent_oid: obj.o_id,
        child_oid: otmp.o_id,
    };

    // Insert child just after parent on nobj (and nexthere when on floor)
    otmp.nobj = obj.nobj || null;
    obj.nobj = otmp;
    if (obj.where === OBJ_FLOOR) {
        otmp.nexthere = obj.nexthere || null;
        obj.nexthere = otmp;
    }
    return otmp;
}

export function curse(otmp) {
    if (!otmp) return;
    otmp.cursed = true;
    otmp.blessed = false;
}
export function bless(otmp) {
    if (!otmp) return;
    otmp.blessed = true;
    otmp.cursed = false;
}

// C ref: mkobj.c blessorcurse()
export function blessorcurse(otmp, chance) {
    if (!otmp || otmp.blessed || otmp.cursed) return;
    if (!rn2(chance)) {
        if (!rn2(2)) curse(otmp);
        else bless(otmp);
    }
}

function level_difficulty() {
    return depth_of_level(game.u?.uz) || 1;
}

function otypByName(name) {
    const i = objectNames.indexOf(name);
    return i >= 0 ? i : 0;
}

const O = {
    get CORPSE() { return otypByName('CORPSE'); },
    get STATUE() { return otypByName('STATUE'); },
    get ROCK() { return otypByName('ROCK'); },
    get LOADSTONE() { return otypByName('LOADSTONE'); },
    get LUCKSTONE() { return otypByName('LUCKSTONE'); },
    get KELP_FROND() { return otypByName('KELP_FROND'); },
    get CHEST() { return otypByName('CHEST'); },
    get LARGE_BOX() { return otypByName('LARGE_BOX'); },
    get GOLD_PIECE() { return GOLD_PIECE; },
    get FUMBLE_BOOTS() { return otypByName('FUMBLE_BOOTS'); },
    get LEVITATION_BOOTS() { return otypByName('LEVITATION_BOOTS'); },
    get HELM_OF_OPPOSITE_ALIGNMENT() { return otypByName('HELM_OF_OPPOSITE_ALIGNMENT'); },
    get GAUNTLETS_OF_FUMBLING() { return otypByName('GAUNTLETS_OF_FUMBLING'); },
    get ARROW() { return otypByName('ARROW'); },
    get DART() { return otypByName('DART'); },
    get TALLOW_CANDLE() { return otypByName('TALLOW_CANDLE'); },
    get WAX_CANDLE() { return otypByName('WAX_CANDLE'); },
    get BELL() { return otypByName('BELL'); },
};

// C ref: obj.h is_multigen — WEAPON_CLASS with oc_skill in -P_SHURIKEN..-P_BOW
function is_multigen(otmp) {
    const n = otypName(otmp.otyp);
    return ['ARROW', 'ELVEN_ARROW', 'ORCISH_ARROW', 'SILVER_ARROW', 'YA',
        'CROSSBOW_BOLT', 'DART', 'SHURIKEN'].includes(n);
}

// C ref: obj.h is_poisonable — same missile skill window as is_multigen,
// or permapoisoned (artifact.c; none on ordinary mklev/ini_inv kits).
function is_poisonable(otmp) {
    return is_multigen(otmp);
}

function is_rustprone(otmp) {
    return objs()[otmp.otyp]?.oc_material === IRON;
}
// C ref: mkobj.c is_flammable()
function is_flammable(otmp) {
    const n = otypName(otmp.otyp);
    if (n === 'TALLOW_CANDLE' || n === 'WAX_CANDLE') return false;
    // FIRE_RES / WAN_FIRE rare on mklev loot; skip full prop table for now
    if (n === 'WAN_FIRE') return false;
    const mat = objs()[otmp.otyp]?.oc_material;
    return (mat <= WOOD && mat !== LIQUID) || mat === PLASTIC;
}
// C ref: mkobj.c is_rottable()
function is_rottable(otmp) {
    const mat = objs()[otmp.otyp]?.oc_material;
    return (mat <= WOOD && mat !== LIQUID) || mat === DRAGON_HIDE;
}
// C ref: objclass.h is_corrodeable
function is_corrodeable(otmp) {
    const mat = objs()[otmp.otyp]?.oc_material;
    return mat === COPPER || mat === IRON;
}
// C ref: objclass.h is_crackable — glass armor only
function is_crackable(otmp) {
    return objs()[otmp.otyp]?.oc_material === GLASS
        && objs()[otmp.otyp]?.oc_class === ARMOR_CLASS;
}
// C ref: objnam.c erosion_matters(); tools only if is_weptool (oc_skill != P_NONE)
function is_weptool(otmp) {
    if (objs()[otmp.otyp]?.oc_class !== TOOL_CLASS) return false;
    // oc_skill not in objects table yet — named weptools from objects.h
    const n = otypName(otmp.otyp);
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN'
        || n === 'AKLYS' || n === 'BULLWHIP';
}
function erosion_matters(otmp) {
    const c = objs()[otmp.otyp]?.oc_class;
    if (c === TOOL_CLASS) return is_weptool(otmp);
    return c === WEAPON_CLASS || c === ARMOR_CLASS
        || c === BALL_CLASS || c === CHAIN_CLASS;
}
function is_damageable(otmp) {
    return is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
        || is_corrodeable(otmp) || is_crackable(otmp);
}

// C ref: mkobj.c may_generate_eroded / mkobj_erosions
function may_generate_eroded(otmp) {
    if ((game.moves ?? 0) <= 1 && !game.in_mklev) return false;
    if (otmp.oerodeproof || !erosion_matters(otmp) || !is_damageable(otmp)) return false;
    if (otypName(otmp.otyp) === 'WORM_TOOTH' || otypName(otmp.otyp) === 'UNICORN_HORN') return false;
    if (otmp.oartifact) return false;
    return true;
}

function mkobj_erosions(otmp) {
    if (!may_generate_eroded(otmp)) return;
    if (!rn2(100)) {
        otmp.oerodeproof = 1;
    } else {
        if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp))) {
            do { otmp.oeroded = (otmp.oeroded || 0) + 1; } while (otmp.oeroded < 3 && !rn2(9));
        }
        if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
            do { otmp.oeroded2 = (otmp.oeroded2 || 0) + 1; } while (otmp.oeroded2 < 3 && !rn2(9));
        }
    }
    if (!rn2(1000)) otmp.greased = 1;
}

function rnd_class(first, last) {
    // C ref: objnam.c rnd_class — weighted by oc_prob
    if (last <= first) return first;
    const objects = objs();
    let sum = 0;
    for (let i = first; i <= last; i++) sum += objects[i]?.oc_prob || 0;
    if (!sum) return rn1(last - first + 1, first);
    let x = rnd(sum);
    for (let i = first; i <= last; i++) {
        x -= objects[i]?.oc_prob || 0;
        if (x <= 0) return i;
    }
    return first;
}

// C: objclass.h — SPBOOK_no_NOVEL = -SPBOOK_CLASS (mkobj excludes novel/BotD)
const SPBOOK_no_NOVEL = 0 - SPBOOK_CLASS;
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');

// C ref: mkobj.c mkbox_cnts
function mkbox_cnts(box) {
    let n;
    const name = otypName(box.otyp);
    switch (name) {
    case 'ICE_BOX':
        n = 20;
        break;
    case 'CHEST':
        n = box.olocked ? 7 : 5;
        break;
    case 'LARGE_BOX':
        n = box.olocked ? 5 : 3;
        break;
    case 'SACK':
    case 'OILSKIN_SACK':
        // C: initial inventory sack starts empty (still rn2(n+1) with n=0)
        if ((game.moves ?? 0) <= 1 && !game.in_mklev) {
            n = 0;
            break;
        }
        // FALLTHROUGH to BAG_OF_HOLDING
    case 'BAG_OF_HOLDING':
        n = 1;
        break;
    default:
        n = 0;
        break;
    }
    const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
    const LOADSTONE = objectNames.indexOf('LOADSTONE');
    for (n = rn2(n + 1); n > 0; n--) {
        let tprob = rnd(100);
        let ip = 0;
        for (; (tprob -= BOX_PROBS[ip].iprob) > 0; ip++) /* advance */;
        const otmp = mkobj(BOX_PROBS[ip].iclass, false);
        if (!otmp) continue;
        if (otmp.oclass === COIN_CLASS) {
            otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
        } else {
            while (otypName(otmp.otyp) === 'ROCK') {
                otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                if ((otmp.quan || 1) > 2) otmp.quan = 1;
            }
        }
        // contents discarded for stub; RNG already consumed
    }
}

// C ref: mondata.h is_rider
function is_rider(ptr) {
    const n = ptr?.mndx;
    return n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

/* C ref: mkobj.c special_corpse — lizards/lichen don't rot; trolls/Riders revive */
function special_corpse(num) {
    if (num == null || num < 0) return false;
    if (num === PM_LIZARD || num === PM_LICHEN) return true;
    const ptr = mons(num);
    return !!(ptr && (ptr.mlet === 'S_TROLL' || is_rider(ptr)));
}

// Timer stubs — enough for corpse timeout restart semantics (no fire yet)
function obj_stop_timers(obj) {
    if (!obj) return;
    obj.timed = 0;
    obj._timer_action = 0;
    obj._timer_when = 0;
}

function start_timer(when, _kind, action, obj) {
    if (!obj) return 0;
    obj.timed = 1;
    obj._timer_action = action;
    obj._timer_when = when;
    return when;
}

// C ref: mkobj.c rider_revival_time
function rider_revival_time(body, retry) {
    const minturn = retry ? 3 : (body.corpsenm === PM_DEATH ? 6 : 12);
    let when;
    for (when = minturn; when < 67; when++) {
        if (!rn2(3)) break;
    }
    return when;
}

// C ref: mkobj.c start_corpse_timeout
function start_corpse_timeout(body) {
    if (!body) return;
    /* lizards and lichen don't rot or revive */
    if (body.corpsenm === PM_LIZARD || body.corpsenm === PM_LICHEN) return;

    let action = ROT_CORPSE;
    const rot_adjust = game.in_mklev ? 25 : 10;
    const age = Math.max(game.moves ?? 0, 1) - (body.age ?? 1);
    let when = age > ROT_AGE ? rot_adjust : (ROT_AGE - age);
    when += (rnz(rot_adjust) - rot_adjust);

    const ptr = mons(body.corpsenm);
    if (ptr && is_rider(ptr)) {
        action = REVIVE_MON;
        when = rider_revival_time(body, false);
    } else if (ptr && ptr.mlet === 'S_TROLL') {
        for (let a = 2; a <= TAINT_AGE; a++) {
            if (!rn2(TROLL_REVIVE_CHANCE)) {
                action = REVIVE_MON;
                when = a;
                break;
            }
        }
    }
    /* zombify + zombie_form → ZOMBIFY_MON + rn1(15,5) deferred (no game.zombify yet) */

    start_timer(when, TIMER_OBJECT, action, body);
}

// C ref: mkobj.c mksobj_init (partial — classes hit during fill/mineralize)
function mksobj_init(otmp, artif) {
    const objects = objs();
    const let_ = objects[otmp.otyp]?.oc_class;
    switch (let_) {
    case WEAPON_CLASS:
        otmp.quan = is_multigen(otmp) ? rn1(6, 6) : 1;
        if (!rn2(11)) {
            otmp.spe = rne(3);
            otmp.blessed = rn2(2);
        } else if (!rn2(10)) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else {
            blessorcurse(otmp, 10);
        }
        if (is_poisonable(otmp) && !rn2(100)) otmp.opoisoned = 1;
        if (artif && !rn2(20)) {
            /* mk_artifact stub — rare */
        }
        break;
    case FOOD_CLASS: {
        const name = otypName(otmp.otyp);
        if (name === 'CORPSE') {
            // C ref: mkobj.c mksobj_init FOOD CORPSE — undead_to_corpse + G_NOCORPSE retry
            let tryct = 50;
            do {
                otmp.corpsenm = undead_to_corpse(rndmonnum());
            } while (((game.mvitals?.[otmp.corpsenm]?.mvflags ?? 0) & G_NOCORPSE)
                && (--tryct > 0));
            if (tryct === 0) otmp.corpsenm = monsterNames.indexOf('PM_HUMAN');
        } else if (name === 'EGG') {
            // C ref: mkobj.c mksobj_init FOOD EGG
            otmp.corpsenm = NON_PM; /* generic egg */
            if (!rn2(3)) {
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = can_be_hatched(rndmonnum());
                    if (mndx !== NON_PM && !dead_species(mndx, true)) {
                        otmp.corpsenm = mndx; /* typed egg */
                        break;
                    }
                }
            }
        } else if (name === 'KELP_FROND') {
            otmp.quan = rnd(2);
        } else if (name === 'TIN') {
            // C ref: mkobj.c TIN + eat.c set_tin_variety(RANDOM_TIN)
            if (!rn2(6)) {
                otmp.corpsenm = -1; // SPINACH_TIN
                otmp.spe = 1;
            } else {
                // C ref: mkobj.c TIN — undead_to_corpse(rndmonnum()) until edible
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse(rndmonnum());
                    const ptr = mons(mndx);
                    const mv = game.mvitals?.[mndx]?.mvflags ?? 0;
                    if (ptr && !(mv & G_NOCORPSE)) {
                        otmp.corpsenm = mndx;
                        // set_tin_variety(RANDOM_TIN): rn2(TTSZ-1) with TTSZ=16
                        const r = rn2(15);
                        otmp.spe = -(r + 1);
                        break;
                    }
                }
            }
            blessorcurse(otmp, 10);
        }
        if (name !== 'CORPSE' && name !== 'MEAT_RING' && name !== 'KELP_FROND'
            && !name.startsWith('GLOB_')) {
            if (!rn2(6)) otmp.quan = 2;
        }
        break;
    }
    case GEM_CLASS: {
        const name = otypName(otmp.otyp);
        if (name === 'LOADSTONE') curse(otmp);
        else if (name === 'ROCK') otmp.quan = rn1(6, 6);
        else if (name !== 'LUCKSTONE' && !rn2(6)) otmp.quan = 2;
        else otmp.quan = 1;
        break;
    }
    case TOOL_CLASS: {
        const name = otypName(otmp.otyp);
        if (name === 'CHEST' || name === 'LARGE_BOX') {
            otmp.olocked = !!rn2(5);
            otmp.otrapped = !rn2(10);
            if (otmp.otrapped && !rn2(100)) otmp.tknown = 1;
            mkbox_cnts(otmp);
        } else if (name === 'ICE_BOX' || name === 'SACK' || name === 'OILSKIN_SACK'
            || name === 'BAG_OF_HOLDING') {
            // C ref: mkobj.c TOOL_CLASS — FALLTHROUGH into mkbox_cnts
            mkbox_cnts(otmp);
        } else if (name === 'TALLOW_CANDLE' || name === 'WAX_CANDLE') {
            otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(otmp, 5);
        } else if (name === 'EXPENSIVE_CAMERA' || name === 'TINNING_KIT'
            || name === 'MAGIC_MARKER') {
            // C ref: mkobj.c — spe = rn1(70, 30)
            otmp.spe = rn1(70, 30);
        }
        break;
    }
    case AMULET_CLASS: {
        // C: if (rn2(10) && special) curse; else blessorcurse(10)
        const n = otypName(otmp.otyp);
        if (rn2(10) && (n === 'AMULET_OF_STRANGULATION' || n === 'AMULET_OF_CHANGE'
            || n === 'AMULET_OF_RESTFUL_SLEEP')) {
            curse(otmp);
        } else {
            blessorcurse(otmp, 10);
        }
        break;
    }
    case POTION_CLASS:
    case SCROLL_CLASS:
        blessorcurse(otmp, 4);
        break;
    case SPBOOK_CLASS:
        blessorcurse(otmp, 17);
        break;
    case ARMOR_CLASS:
        if (rn2(10) && (
            otmp.otyp === O.FUMBLE_BOOTS
            || otmp.otyp === O.LEVITATION_BOOTS
            || otmp.otyp === O.HELM_OF_OPPOSITE_ALIGNMENT
            || otmp.otyp === O.GAUNTLETS_OF_FUMBLING
            || !rn2(11)
        )) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else if (!rn2(10)) {
            otmp.blessed = rn2(2);
            otmp.spe = rne(3);
        } else {
            blessorcurse(otmp, 10);
        }
        if (artif && !rn2(40)) {
            /* mk_artifact stub */
        }
        // C ref: mkobj.c ARMOR_CLASS — lacquered armor for Samurai
        if (game.urole?.mnum === PM_SAMURAI
            && otypName(otmp.otyp) === 'SPLINT_MAIL'
            && ((game.moves ?? 0) <= 1 /* || In_quest deferred */)) {
            otmp.oerodeproof = 1;
            otmp.rknown = 1;
        }
        break;
    case RING_CLASS: {
        // C ref: mkobj.c RING_CLASS — charged vs uncharged (oc_charged/spec)
        const n = otypName(otmp.otyp);
        const charged = n === 'RIN_ADORNMENT' || n === 'RIN_GAIN_STRENGTH'
            || n === 'RIN_GAIN_CONSTITUTION' || n === 'RIN_INCREASE_ACCURACY'
            || n === 'RIN_INCREASE_DAMAGE' || n === 'RIN_PROTECTION';
        if (charged) {
            blessorcurse(otmp, 3);
            if (rn2(10)) {
                const sign = otmp.blessed ? 1 : otmp.cursed ? -1 : 0;
                if (rn2(10) && sign)
                    otmp.spe = sign * rne(3);
                else
                    otmp.spe = rn2(2) ? rne(3) : -rne(3);
            }
            if ((otmp.spe | 0) === 0) otmp.spe = rn2(4) - rn2(3);
            if ((otmp.spe | 0) < 0 && rn2(5)) curse(otmp);
        } else if (rn2(10) && (n === 'RIN_TELEPORTATION' || n === 'RIN_POLYMORPH'
            || n === 'RIN_AGGRAVATE_MONSTER' || n === 'RIN_HUNGER' || !rn2(9))) {
            curse(otmp);
        }
        break;
    }
    case WAND_CLASS: {
        // C ref: mkobj.c WAND_CLASS — wishing spe=1; else rn1; blessorcurse(17)
        const n = otypName(otmp.otyp);
        if (n === 'WAN_WISHING') otmp.spe = 1;
        else if (n === 'WAN_STASIS') otmp.spe = rn1(4, 3);
        else {
            const nodir = objs()[otmp.otyp]?.oc_dir === 1; // NODIR
            otmp.spe = rn1(5, nodir ? 11 : 4);
        }
        blessorcurse(otmp, 17);
        break;
    }
    case ROCK_CLASS:
        if (otypName(otmp.otyp) === 'STATUE') {
            // C ref: mkobj.c ROCK_CLASS STATUE — skip book if verysmall
            otmp.corpsenm = rndmonnum();
            const ptr = mons(otmp.corpsenm);
            const thr = Math.trunc(level_difficulty() / 2) + 10;
            if (ptr && !verysmall(ptr) && rn2(thr) > 10) {
                // C: mkobj(SPBOOK_no_NOVEL) — novels excluded via rnd_class
                mkobj(SPBOOK_no_NOVEL, false);
            }
        }
        break;
    case COIN_CLASS:
        break;
    default:
        break;
    }
    mkobj_erosions(otmp);
}

// C ref: mkobj.c mksobj()
export function mksobj(otyp, init, artif) {
    const objects = objs();
    // C ref: mkobj.c unknow_object — known = oc_uses_known ? 0 : 1
    // Weapons/armor/charged tools use known for +/- / charges; scrolls/potions
    // start known=1 so ini_inv_use_obj can discover_object them.
    const uskn = (() => {
        const n = objectNames[otyp] || '';
        const cls = objects[otyp]?.oc_class ?? 0;
        if (cls === WEAPON_CLASS || cls === ARMOR_CLASS) return true;
        if (['DART', 'SHURIKEN', 'BOOMERANG', 'EXPENSIVE_CAMERA',
            'MAGIC_MARKER', 'CRYSTAL_BALL'].includes(n)) return true;
        return false;
    })();
    const otmp = {
        otyp,
        oclass: objects[otyp]?.oc_class ?? 0,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        corpsenm: NON_PM,
        age: Math.max(game.moves ?? 0, 1),
        known: uskn ? 0 : 1,
        ox: 0,
        oy: 0,
    };
    next_ident();
    if (init) mksobj_init(otmp, artif);

    // Post-init regardless: CORPSE/STATUE gender + timer
    // C ref: mkobj.c mksobj after mksobj_init
    const name = otypName(otyp);
    if (name === 'CORPSE' || name === 'STATUE' || name === 'FIGURINE') {
        if (name === 'CORPSE' && otmp.corpsenm < 0) {
            otmp.corpsenm = undead_to_corpse(rndmonnum());
            const mv = game.mvitals?.[otmp.corpsenm]?.mvflags ?? 0;
            if (mv & (G_NOCORPSE | G_GONE)) {
                otmp.corpsenm = game.urole?.mnum ?? monsterNames.indexOf('PM_HUMAN');
            }
        } else if (otmp.corpsenm < 0) {
            otmp.corpsenm = rndmonnum();
        }
        const ptr = mons(otmp.corpsenm);
        if (ptr) {
            if (is_neuter(ptr) || is_female(ptr) || is_male(ptr)) {
                /* fixed gender — no rn2 */
            } else {
                rn2(2);
            }
        } else {
            rn2(2);
        }
        if (name === 'CORPSE') start_corpse_timeout(otmp);
    }
    // C: otmp->owt = weight(otmp);
    otmp.owt = weight(otmp);
    return otmp;
}

export function mksobj_at(otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    if (otmp) place_object(otmp, x, y);
    return otmp;
}

// C ref: mkobj.c mkobj()
export function mkobj(oclass, artif) {
    const objects = objs();
    const b = bases();
    let oclass_ = oclass;
    let i;
    if (oclass_ === RANDOM_CLASS) {
        let tprob = rnd(100);
        let ip = 0;
        for (; (tprob -= MKOBJ_PROBS[ip].iprob) > 0; ip++) /* advance */;
        oclass_ = MKOBJ_PROBS[ip].iclass;
    }
    if (oclass_ === SPBOOK_no_NOVEL) {
        // C: rnd_class(bases[SPBOOK], SPE_BLANK_PAPER) — excludes SPE_NOVEL
        i = rnd_class(b[SPBOOK_CLASS], SPE_BLANK_PAPER);
        oclass_ = SPBOOK_CLASS;
    } else {
        const total = game.oclass_prob_totals[oclass_] || 1;
        let prob = rnd(total);
        i = b[oclass_] || 0;
        while ((prob -= (objects[i]?.oc_prob || 0)) > 0) i++;
    }
    return mksobj(i, true, artif);
}

export function mkobj_at(oclass, x, y, artif) {
    const otmp = mkobj(oclass, artif);
    if (otmp) place_object(otmp, x, y);
    return otmp;
}

// C ref: mkobj.c place_object — thread onto fobj + level.objects[x][y]
export function place_object(otmp, x, y) {
    if (!otmp) return;
    otmp.ox = x;
    otmp.oy = y;
    otmp.where = OBJ_FLOOR;
    otmp.nobj = game.fobj || null;
    game.fobj = otmp;
    // nexthere pile at location
    if (!game._objects_at) game._objects_at = new Map();
    const key = `${x},${y}`;
    otmp.nexthere = game._objects_at.get(key) || null;
    game._objects_at.set(key, otmp);
}

/**
 * C ref: invent.c objects[].oc_merge — table field not yet extracted;
 * approximate from C BITS defaults (ammo/gems/coins merge; boulder does not).
 */
function oc_merge_of(otyp) {
    const od = game.objects?.[otyp];
    if (od && typeof od.oc_merge === 'number') return od.oc_merge !== 0;
    if (otyp === BOULDER || otyp === STATUE || otyp === BOOMERANG) return false;
    const oc = od?.oc_class ?? 0;
    return oc === WEAPON_CLASS || oc === GEM_CLASS || oc === FOOD_CLASS
        || oc === POTION_CLASS || oc === SCROLL_CLASS || oc === SPBOOK_CLASS
        || oc === WAND_CLASS || oc === COIN_CLASS;
}

/**
 * C ref: invent.c mergable() — floor-stack subset (no shop/mail/globby/candle).
 */
export function mergable(otmp, obj) {
    if (!obj || !otmp || obj === otmp || obj.otyp !== otmp.otyp) return false;
    if (obj.nomerge || otmp.nomerge || !oc_merge_of(obj.otyp)) return false;
    if (obj.oclass === COIN_CLASS) return true;
    if (!!obj.cursed !== !!otmp.cursed || !!obj.blessed !== !!otmp.blessed)
        return false;
    const hl = obj.how_lost ?? LOST_NONE;
    const ohl = otmp.how_lost ?? LOST_NONE;
    if (hl === LOST_EXPLODING || ohl === LOST_EXPLODING) return false;
    if (ohl !== LOST_NONE && hl !== ohl) return false;
    if ((obj.spe | 0) !== (otmp.spe | 0)) return false;
    if ((obj.corpsenm ?? -1) !== (otmp.corpsenm ?? -1)) return false;
    // C: dknown must match; known may differ and is reconciled in merged()
    if (!!obj.dknown !== !!otmp.dknown) return false;
    if ((obj.owornmask | 0) || (otmp.owornmask | 0)) return false;
    return true;
}

/**
 * C ref: invent.c merged() — absorb *pobj into *potmp; free *pobj.
 * stackobj passes (&newObj, &existing) so the newly placed object survives.
 */
function merged(potmp, pobj) {
    let otmp = potmp.obj;
    let obj = pobj.obj;
    if (!mergable(otmp, obj)) return false;
    if (!obj.lamplit && !obj.globby) {
        const oq = otmp.quan || 1;
        const nq = obj.quan || 1;
        const oa = otmp.age ?? 0;
        const na = obj.age ?? 0;
        otmp.age = Math.trunc((oa * oq + na * nq) / (oq + nq));
    }
    if (!otmp.globby) otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
    if (otmp.oclass === COIN_CLASS) {
        otmp.owt = weight(otmp);
        otmp.bknown = 0;
    } else {
        otmp.owt = weight(otmp);
    }
    obj_extract_self(obj);
    if (obj.known !== otmp.known) otmp.known = 1;
    if (obj.bknown !== otmp.bknown) otmp.bknown = 1;
    if (obj.rknown !== otmp.rknown) otmp.rknown = 1;
    if (obj.bypass) otmp.bypass = 1;
    obj.where = OBJ_FREE;
    potmp.obj = otmp;
    pobj.obj = null;
    return true;
}

/**
 * C ref: invent.c stackobj() — merge newly placed floor object into pile.
 */
export function stackobj(obj) {
    if (!obj || obj.where !== OBJ_FLOOR) return;
    for (let otmp = objects_at(obj.ox, obj.oy); otmp; otmp = otmp.nexthere) {
        if (otmp === obj) continue;
        const potmp = { obj };
        const pobj = { obj: otmp };
        if (merged(potmp, pobj)) break;
        // C may reassign *potmp; keep local binding current
        obj = potmp.obj;
    }
}

// C ref: mkobj.c add_to_buried — not on fobj; dog_goal only scans fobj
export function add_to_buried(obj) {
    if (!obj) return;
    if (obj.where != null && obj.where !== OBJ_FREE) {
        // C panics; keep free-list invariant without aborting the session
        obj.where = OBJ_FREE;
    }
    obj.where = OBJ_BURIED;
    if (!game.level) game.level = {};
    obj.nobj = game.level.buriedobjlist || null;
    game.level.buriedobjlist = obj;
}

export function objects_at(x, y) {
    if (!game._objects_at) return null;
    return game._objects_at.get(`${x},${y}`) || null;
}

// C ref: mkobj.c obj_extract_self — floor / minvent (invent/contained omitted)
export function obj_extract_self(obj) {
    if (!obj) return;
    // Floor: also accept legacy objs with coords but unset where
    if (obj.where === OBJ_FLOOR
        || (obj.where == null && obj.ox != null && obj.oy != null
            && !(obj.ox === 0 && obj.oy === 0))) {
        const key = `${obj.ox},${obj.oy}`;
        if (game._objects_at) {
            let head = game._objects_at.get(key) || null;
            if (head === obj) {
                game._objects_at.set(key, obj.nexthere || null);
            } else {
                for (let p = head; p; p = p.nexthere) {
                    if (p.nexthere === obj) {
                        p.nexthere = obj.nexthere || null;
                        break;
                    }
                }
            }
        }
        if (game.fobj === obj) {
            game.fobj = obj.nobj || null;
        } else {
            for (let p = game.fobj; p; p = p.nobj) {
                if (p.nobj === obj) {
                    p.nobj = obj.nobj || null;
                    break;
                }
            }
        }
    } else if (obj.where === OBJ_MINVENT || obj.where === 'MINVENT') {
        // C: extract_nobj(obj, &obj->ocarry->minvent); clear ocarry
        const mon = obj.ocarry;
        if (mon) {
            if (mon.minvent === obj) {
                mon.minvent = obj.nobj || null;
            } else {
                for (let p = mon.minvent; p; p = p.nobj) {
                    if (p.nobj === obj) {
                        p.nobj = obj.nobj || null;
                        break;
                    }
                }
            }
        }
        obj.ocarry = null;
    }
    obj.nobj = null;
    obj.nexthere = null;
    obj.where = OBJ_FREE;
    obj.ox = 0;
    obj.oy = 0;
}

function g_at(x, y) {
    // C ref: invent.c g_at — first COIN_CLASS on pile
    for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
        if (obj.oclass === COIN_CLASS) return obj;
    }
    return null;
}

// C ref: mkobj.c mkgold()
export function mkgold(amount, x, y) {
    if (amount <= 0) {
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    let gold = g_at(x, y);
    if (gold) {
        gold.quan = (gold.quan || 0) + amount;
    } else {
        gold = mksobj_at(GOLD_PIECE, x, y, true, false);
        if (gold) gold.quan = amount;
    }
    if (gold) gold.owt = weight(gold);
    return gold;
}

// C ref: mkobj.c mkcorpstat()
export function mkcorpstat(objtype, _mtmp, ptr, x, y, corpstatflags) {
    const init = !!(corpstatflags & 8); // CORPSTAT_INIT
    const otmp = (x || y) ? mksobj_at(objtype, x, y, init, false) : mksobj(objtype, init, false);
    if (otmp) otmp.spe = (corpstatflags & 0x07); // CORPSTAT_SPE_VAL
    if (ptr != null && otmp) {
        // Override random corpsenm — ptr may be mndx number or mons struct
        const mndx = typeof ptr === 'number' ? ptr : (ptr.mndx ?? NON_PM);
        const old_corpsenm = otmp.corpsenm;
        otmp.corpsenm = mndx;
        otmp.owt = weight(otmp);
        // C: restart timer when zombify or either type is special_corpse
        if (otypName(otmp.otyp) === 'CORPSE'
            && (game.zombify || special_corpse(old_corpsenm) || special_corpse(mndx))) {
            obj_stop_timers(otmp);
            start_corpse_timeout(otmp);
        }
    }
    return otmp;
}

export { O as OBJ };
