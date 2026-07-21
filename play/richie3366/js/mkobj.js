// mkobj.js — Object creation.
// C ref: mkobj.c — mkobj, mksobj, mkgold, next_ident, mksobj_init (partial).

import { game } from './gstate.js';
import { rn2, rnd, rn1, rne, rnz } from './rng.js';
import { depth as depth_of_level, level_difficulty as level_difficulty_of } from './hacklib.js';
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
    VENOM_CLASS,
    objectNames,
} from './objects.js';
// objectNames used for known-flag heuristic (oc_uses_known not in table yet)
import { rndmonnum, rndmonnum_adj } from './makemon.js';
import { undead_to_corpse, can_be_hatched, dead_species } from './mon.js';
import { nartifact_exist, mk_artifact } from './artifact.js';
import {
    mons, is_male, is_female, is_neuter, is_human, verysmall, PM_LICHEN, monsterNames,
    G_NOCORPSE, NON_PM as MON_NON_PM,
} from './monsters.js';
import { PM_SAMURAI } from './generated/monsters_data.js';
import { otyp_uses_known, distant_name, doname } from './objnam.js';
import {
    ROT_AGE, TAINT_AGE, TROLL_REVIVE_CHANCE,
    ROT_CORPSE, REVIVE_MON, ZOMBIFY_MON, TIMER_OBJECT,
    HATCH_EGG, MAX_EGG_HATCH_TIME,
    OBJ_FREE, OBJ_FLOOR, OBJ_BURIED, OBJ_MINVENT, OBJ_CONTAINED,
    G_GONE,
    LOST_NONE, LOST_EXPLODING,
    CORPSTAT_NEUTER, CORPSTAT_FEMALE, CORPSTAT_MALE,
    Is_rogue_level,
} from './const.js';
import { recalc_block_point } from './vision.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const BOULDER = objectNames.indexOf('BOULDER');
const STATUE = objectNames.indexOf('STATUE');
const BOOMERANG = objectNames.indexOf('BOOMERANG');
const CORPSE = objectNames.indexOf('CORPSE');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const ELVEN_SHIELD = objectNames.indexOf('ELVEN_SHIELD');
const ORCISH_SHIELD = objectNames.indexOf('ORCISH_SHIELD');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const LARGEST_INT = 32767; // C ref: global.h
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const NON_PM = MON_NON_PM;

// C ref: mkobj.c dknowns[] — classes that start with dknown=0
const DKNOWN_CLEAR_CLASSES = new Set([
    WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS,
    SPBOOK_CLASS, WEAPON_CLASS, TOOL_CLASS, VENOM_CLASS,
]);

// Material constants (objclass.h enum obj_material_types)
const LIQUID = 1;
const CLOTH = 6;
const LEATHER = 7;
const WOOD = 8;
const DRAGON_HIDE = 10;
const IRON = 11;
const COPPER = 13;
const MITHRIL = 17;
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

// C ref: mkobj.c rogueprobs / hellprobs
const ROGUE_PROBS = [
    { iprob: 12, iclass: WEAPON_CLASS },
    { iprob: 12, iclass: ARMOR_CLASS },
    { iprob: 22, iclass: FOOD_CLASS },
    { iprob: 22, iclass: POTION_CLASS },
    { iprob: 22, iclass: SCROLL_CLASS },
    { iprob: 5, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
];

const HELL_PROBS = [
    { iprob: 20, iclass: WEAPON_CLASS },
    { iprob: 20, iclass: ARMOR_CLASS },
    { iprob: 16, iclass: FOOD_CLASS },
    { iprob: 12, iclass: TOOL_CLASS },
    { iprob: 10, iclass: GEM_CLASS },
    { iprob: 1, iclass: POTION_CLASS },
    { iprob: 1, iclass: SCROLL_CLASS },
    { iprob: 8, iclass: WAND_CLASS },
    { iprob: 8, iclass: RING_CLASS },
    { iprob: 4, iclass: AMULET_CLASS },
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

/** C ref: obj.h Is_container — LARGE_BOX..BAG_OF_TRICKS inclusive. */
function Is_container(obj) {
    if (!obj) return false;
    const n = otypName(obj.otyp);
    return n === 'LARGE_BOX' || n === 'CHEST' || n === 'ICE_BOX'
        || n === 'SACK' || n === 'OILSKIN_SACK' || n === 'BAG_OF_HOLDING'
        || n === 'BAG_OF_TRICKS';
}

/**
 * C ref: mkobj.c add_to_container — merge via invent.c merged(), else prepend.
 * Named omissions: shop obj_no_longer_held beyond free extract.
 */
export function add_to_container(container, obj) {
    if (!container || !obj) return null;
    if (obj.where && obj.where !== OBJ_FREE) obj_extract_self(obj);
    // C: for (otmp = container->cobj; otmp; otmp = otmp->nobj)
    //        if (merged(&otmp, &obj)) return otmp;
    for (let otmp = container.cobj; otmp; otmp = otmp.nobj) {
        const potmp = { obj: otmp };
        const pobj = { obj };
        if (merged(potmp, pobj)) return potmp.obj;
    }
    obj.where = OBJ_CONTAINED;
    obj.ocontainer = container;
    obj.nobj = container.cobj || null;
    container.cobj = obj;
    return obj;
}

/**
 * C ref: mkobj.c weight() — subset; containers sum cobj; BoH factor deferred.
 */
export function weight(obj) {
    if (!obj) return 0;
    const objects = objs() || [];
    let wt = objects[obj.otyp]?.oc_weight ?? 0;
    const quan = obj.quan || 1;
    if (quan < 1) return 0;
    // C: Is_container || STATUE — contents weight (BoH cursed/blessed factor deferred)
    if (Is_container(obj) || obj.otyp === STATUE) {
        let cwt = 0;
        for (let contents = obj.cobj; contents; contents = contents.nobj) {
            cwt += weight(contents);
        }
        return wt + cwt;
    }
    if (obj.oclass === COIN_CLASS || obj.otyp === GOLD_PIECE) {
        wt = Math.trunc((quan + 50) / 100);
        return Math.max(wt, 1);
    }
    // C ref: mkobj.c weight — CORPSE uses mons[corpsenm].cwt (not oc_weight)
    if (obj.otyp === CORPSE && (obj.corpsenm ?? -1) >= 0) {
        const cwt = mons(obj.corpsenm)?.cwt ?? 0;
        let longWt = quan * cwt;
        if (longWt > LARGEST_INT) longWt = LARGEST_INT;
        if (obj.oeaten) return eaten_stat(longWt | 0, obj);
        return longWt | 0;
    }
    // C: FOOD_CLASS && oeaten → eaten_stat(quan * oc_weight)
    if (obj.oclass === FOOD_CLASS && obj.oeaten) {
        return eaten_stat((quan * wt) | 0, obj);
    }
    // HEAVY_IRON_BALL punish-levy owt preserve deferred (C owt!=0 short-circuit);
    // callers that must keep levy must not assign owt=weight(ball) after incr.
    if (!wt) return Math.trunc((quan + 1) / 2);
    return wt * quan;
}

/**
 * C ref: eat.c eaten_stat — scale base by oeaten/obj_nutrition (min 1).
 * Nutrition: CORPSE → mons.cnutrit; else objects.oc_nutrition / food table.
 */
function eaten_stat(base, obj) {
    let full_amount;
    if (obj.otyp === CORPSE) {
        full_amount = mons(obj.corpsenm)?.cnutrit ?? 0;
    } else if (obj.globby) {
        full_amount = obj.owt | 0;
    } else {
        const oc = objs()?.[obj.otyp];
        full_amount = oc?.oc_nutrition | 0;
        if (!full_amount) {
            // objects table may omit oc_nutrition; match eat.js FOOD_NUTRITION
            const name = objectNames[obj.otyp];
            full_amount = FOOD_NUTRITION_WT[name] ?? 0;
        }
    }
    let uneaten_amt = obj.oeaten | 0;
    if (uneaten_amt > full_amount) uneaten_amt = full_amount;
    base = full_amount
        ? Math.trunc((base * uneaten_amt) / full_amount)
        : 0;
    return base < 1 ? 1 : base;
}

// Subset of eat.c FOOD_NUTRITION for weight() when oc_nutrition absent.
const FOOD_NUTRITION_WT = {
    FORTUNE_COOKIE: 40, APPLE: 50, PEAR: 50, ORANGE: 80, MELON: 100,
    BANANA: 80, CARROT: 50, FOOD_RATION: 800, TRIPE_RATION: 200,
    LEMBAS_WAFER: 800, CRAM_RATION: 600, K_RATION: 400, C_RATION: 300,
    EGG: 80, CLOVE_OF_GARLIC: 40, SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1, CANDY_BAR: 100, CREAM_PIE: 100, PANCAKE: 200,
    SLIME_MOLD: 250, LUMP_OF_ROYAL_JELLY: 200,
};

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

    // Insert child just after parent on nobj (and nexthere when on floor).
    // C invent is the nobj list; JS keeps a parallel game.invent[] — do NOT
    // splice the child into invent[] here. A carried split copies where=
    // OBJ_INVENT via {...obj} but stays off invent[] until eat.c touchfood
    // freeinv+addinv_nomerge (or another addinv path) assigns a letter.
    // Premature invent[] insert left duplicate invlets and broke seed0002
    // pet dogfood/obj_resists (D-0924).
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

/**
 * C ref: mkobj.c uncurse — clear cursed; bag weight / luck / figurine /
 * lamplit adjust deferred beyond BAG_OF_HOLDING owt.
 */
export function uncurse(otmp) {
    if (!otmp) return;
    otmp.cursed = false;
    const bag = objectNames.indexOf('BAG_OF_HOLDING');
    if (bag >= 0 && (otmp.otyp | 0) === bag) otmp.owt = weight(otmp);
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
    return level_difficulty_of(game.u?.uz) || 1;
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

export function is_rustprone(otmp) {
    return objs()[otmp.otyp]?.oc_material === IRON;
}
// C ref: mkobj.c is_flammable()
export function is_flammable(otmp) {
    const n = otypName(otmp.otyp);
    if (n === 'TALLOW_CANDLE' || n === 'WAX_CANDLE') return false;
    // FIRE_RES / WAN_FIRE rare on mklev loot; skip full prop table for now
    if (n === 'WAN_FIRE') return false;
    const mat = objs()[otmp.otyp]?.oc_material;
    return (mat <= WOOD && mat !== LIQUID) || mat === PLASTIC;
}
// C ref: mkobj.c is_rottable()
export function is_rottable(otmp) {
    const mat = objs()[otmp.otyp]?.oc_material;
    return (mat <= WOOD && mat !== LIQUID) || mat === DRAGON_HIDE;
}
// C ref: objclass.h is_corrodeable
export function is_corrodeable(otmp) {
    const mat = objs()[otmp.otyp]?.oc_material;
    return mat === COPPER || mat === IRON;
}
// C ref: objclass.h is_crackable — glass armor only
export function is_crackable(otmp) {
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
export function erosion_matters(otmp) {
    const c = objs()[otmp.otyp]?.oc_class;
    if (c === TOOL_CLASS) return is_weptool(otmp);
    return c === WEAPON_CLASS || c === ARMOR_CLASS
        || c === BALL_CLASS || c === CHAIN_CLASS;
}
export function is_damageable(otmp) {
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

/** C ref: objnam.c rnd_class — weighted by oc_prob */
export function rnd_class(first, last) {
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

// C ref: mkobj.c mkbox_cnts — ICE_BOX → mksobj(CORPSE); else boxiprobs.
// Deferred: BAG_OF_HOLDING Is_mbag→SACK / WAN_CANCELLATION re-roll.
function mkbox_cnts(box) {
    let n;
    const name = otypName(box.otyp);
    box.cobj = null;
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
        let otmp;
        if (name === 'ICE_BOX') {
            // C: mksobj(CORPSE, TRUE, FALSE); age=0; stop rot/revive timers
            otmp = mksobj(CORPSE, true, false);
            if (!otmp) continue;
            otmp.age = 0;
            if (otmp.timed) obj_stop_timers(otmp);
        } else {
            let tprob = rnd(100);
            let ip = 0;
            for (; (tprob -= BOX_PROBS[ip].iprob) > 0; ip++) /* advance */;
            otmp = mkobj(BOX_PROBS[ip].iclass, false);
            if (!otmp) continue;
            if (otmp.oclass === COIN_CLASS) {
                otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
                otmp.owt = weight(otmp);
            } else {
                while (otypName(otmp.otyp) === 'ROCK') {
                    otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                    if ((otmp.quan || 1) > 2) otmp.quan = 1;
                    otmp.owt = weight(otmp);
                }
            }
            // BAG_OF_HOLDING nested-bag / cancellation wand rewrite deferred
        }
        add_to_container(box, otmp);
    }
    // caller (mksobj) updates box.owt via weight()
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

/**
 * C ref: timeout.c timer queue (gt.timer_base) — object timers only.
 * start_timer inserts by absolute timeout (moves+when); run_timers fires
 * when timeout <= moves. Envelope: ROT_CORPSE → rot_corpse floor extract;
 * HATCH_EGG queued via attach_egg_hatch_timeout (D-0533) but hatch_egg
 * callback deferred; REVIVE_MON / ZOMBIFY_MON / burn / fig / melt deferred
 * (no-op fire clears the queue entry).
 */
function timer_base() {
    if (!game._timer_base) game._timer_base = null;
    return game;
}

export function obj_stop_timers(obj) {
    if (!obj) return;
    const g = timer_base();
    let prev = null;
    let curr = g._timer_base;
    while (curr) {
        const next = curr.next;
        if (curr.kind === TIMER_OBJECT && curr.obj === obj) {
            if (prev) prev.next = next;
            else g._timer_base = next;
            // cleanup_burn deferred
        } else {
            prev = curr;
        }
        curr = next;
    }
    obj.timed = 0;
}

/**
 * C ref: timeout.c stop_timer — remove one (action,obj) timer; return
 * remaining turns (timeout − moves), or 0 if none. cleanup_burn deferred.
 */
export function stop_timer(action, obj) {
    if (!obj) return 0;
    const g = timer_base();
    const moves = game.moves | 0;
    let prev = null;
    let curr = g._timer_base;
    while (curr) {
        const next = curr.next;
        if (curr.kind === TIMER_OBJECT && curr.action === action && curr.obj === obj) {
            if (prev) prev.next = next;
            else g._timer_base = next;
            obj.timed = Math.max(0, (obj.timed | 0) - 1);
            return (curr.timeout | 0) - moves;
        }
        prev = curr;
        curr = next;
    }
    return 0;
}

/**
 * C ref: timeout.c start_timer — queue object timer; timeout = moves+when.
 * Duplicate (same obj + action) aborted like C (no second insert).
 */
export function start_timer(when, kind, action, obj) {
    if (!obj) return 0;
    const g = timer_base();
    for (let dup = g._timer_base; dup; dup = dup.next) {
        if (dup.kind === kind && dup.action === action && dup.obj === obj) {
            return 0;
        }
    }
    const moves = game.moves | 0;
    const gnu = {
        next: null,
        timeout: moves + (when | 0),
        kind: kind | 0,
        action: action | 0,
        obj,
    };
    let prev = null;
    let curr = g._timer_base;
    while (curr && curr.timeout < gnu.timeout) {
        prev = curr;
        curr = curr.next;
    }
    gnu.next = curr;
    if (prev) prev.next = gnu;
    else g._timer_base = gnu;
    if (kind === TIMER_OBJECT) obj.timed = (obj.timed | 0) + 1;
    return when;
}

/**
 * C ref: timeout.c attach_egg_hatch_timeout — stop prior HATCH_EGG; if
 * when==0 roll rnd(i)>150 for i in 151..MAX_EGG_HATCH_TIME; queue timer.
 * hatch_egg body deferred (run_timers drops HATCH_EGG entries).
 */
export function attach_egg_hatch_timeout(egg, when = 0) {
    if (!egg) return;
    stop_timer(HATCH_EGG, egg);
    when = when | 0;
    if (!when) {
        for (let i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++) {
            if (rnd(i) > 150) {
                when = i;
                break;
            }
        }
    }
    if (when) start_timer(when, TIMER_OBJECT, HATCH_EGG, egg);
}

/**
 * C ref: dig.c rot_corpse — corpse finished rotting.
 * Envelope: OBJ_FLOOR extract + newsym; invent/minvent/worn plines deferred.
 */
async function rot_corpse(obj) {
    if (!obj) return;
    const onFloor = obj.where === OBJ_FLOOR;
    const x = obj.ox | 0;
    const y = obj.oy | 0;
    // C: rot_organic — contents bury deferred; extract + obfree
    obj_extract_self(obj);
    obj.quan = 0;
    obj.where = OBJ_FREE;
    obj.timed = 0;
    if (onFloor) {
        // hideunder / mundetected expose deferred
        // Dynamic import avoids display.js ↔ mkobj.js cycle (objects_at).
        const { newsym } = await import('./display.js');
        newsym(x, y);
    }
}

/**
 * C ref: timeout.c run_timers — fire due timers at start of list.
 * Called from nh_timeout after intrinsic TIMEOUT handling.
 */
export async function run_timers() {
    const g = timer_base();
    const moves = game.moves | 0;
    while (g._timer_base && g._timer_base.timeout <= moves) {
        const curr = g._timer_base;
        g._timer_base = curr.next;
        if (curr.kind === TIMER_OBJECT && curr.obj) {
            curr.obj.timed = Math.max(0, (curr.obj.timed | 0) - 1);
        }
        if (curr.action === ROT_CORPSE) {
            await rot_corpse(curr.obj);
        }
        // REVIVE_MON / ZOMBIFY_MON / BURN_OBJECT / … deferred — entry dropped
    }
}

// C ref: mkobj.c set_corpsenm — stop timers, set id, restart CORPSE/EGG timeouts
export function set_corpsenm(obj, id) {
    if (!obj) return;
    let when = 0;
    if (obj.timed) {
        // C: EGG preserves remaining hatch via stop_timer(HATCH_EGG); else clear all
        if (otypName(obj.otyp) === 'EGG') {
            when = stop_timer(HATCH_EGG, obj);
        } else {
            obj_stop_timers(obj);
        }
    }
    obj.corpsenm = id;
    const name = otypName(obj.otyp);
    if (name === 'CORPSE') {
        start_corpse_timeout(obj);
        obj.owt = weight(obj);
    } else if (name === 'EGG') {
        // C: attach_egg_hatch_timeout when typed + !dead_species; no owt here
        if (id !== NON_PM && !dead_species(id, true)) {
            attach_egg_hatch_timeout(obj, when);
        }
    } else if (name === 'STATUE' || name === 'FIGURINE' || name === 'TIN') {
        obj.owt = weight(obj);
    }
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

// C ref: read.c candy_wrappers[] — index 0 unused; SIZE-1 == 12 brands
const CANDY_WRAPPER_COUNT = 12;

// C ref: read.c assign_candy_wrapper — spe = 1 + rn2(SIZE(candy_wrappers)-1)
function assign_candy_wrapper(obj) {
    if (otypName(obj.otyp) === 'CANDY_BAR') {
        obj.spe = 1 + rn2(CANDY_WRAPPER_COUNT);
    }
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
        // C: artif && !rn2(20 + 10 * nartifact_exist())
        if (artif && !rn2(20 + (10 * nartifact_exist()))) {
            // C: mk_artifact(otmp, A_NONE, 99, TRUE) — mutates / same ptr
            mk_artifact(otmp);
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
        } else if (name === 'SLIME_MOLD') {
            // C ref: mkobj.c SLIME_MOLD — spe = current_fruit; fruit chain deferred
            if (game.context?.current_fruit != null) {
                otmp.spe = game.context.current_fruit;
            }
            if (game.flags) game.flags.made_fruit = true;
        } else if (name === 'CANDY_BAR') {
            // C ref: mkobj.c CANDY_BAR → read.c assign_candy_wrapper
            assign_candy_wrapper(otmp);
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
        // C ref: mkobj.c mksobj_init TOOL_CLASS switch
        const name = otypName(otmp.otyp);
        if (name === 'TALLOW_CANDLE' || name === 'WAX_CANDLE') {
            otmp.spe = 1;
            // age = 20 * oc_cost available on objects[] (D-0447); candle
            // start-age wiring still deferred
            otmp.lamplit = 0;
            otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(otmp, 5);
        } else if (name === 'BRASS_LANTERN' || name === 'OIL_LAMP') {
            otmp.spe = 1;
            otmp.age = rn1(500, 1000);
            otmp.lamplit = 0;
            blessorcurse(otmp, 5);
        } else if (name === 'MAGIC_LAMP') {
            otmp.spe = 1;
            otmp.lamplit = 0;
            blessorcurse(otmp, 2);
        } else if (name === 'CHEST' || name === 'LARGE_BOX') {
            otmp.olocked = !!rn2(5);
            otmp.otrapped = !rn2(10);
            if (otmp.otrapped && !rn2(100)) otmp.tknown = 1;
            mkbox_cnts(otmp);
        } else if (name === 'ICE_BOX' || name === 'SACK' || name === 'OILSKIN_SACK'
            || name === 'BAG_OF_HOLDING') {
            // C FALLTHROUGH into mkbox_cnts
            mkbox_cnts(otmp);
        } else if (name === 'EXPENSIVE_CAMERA' || name === 'TINNING_KIT'
            || name === 'MAGIC_MARKER') {
            otmp.spe = rn1(70, 30);
        } else if (name === 'CAN_OF_GREASE') {
            otmp.spe = rn1(21, 5);
            blessorcurse(otmp, 10);
        } else if (name === 'CRYSTAL_BALL') {
            otmp.spe = rn1(5, 3);
            blessorcurse(otmp, 2);
        } else if (name === 'HORN_OF_PLENTY' || name === 'BAG_OF_TRICKS') {
            otmp.spe = rn1(18, 3);
        } else if (name === 'BELL_OF_OPENING') {
            otmp.spe = 3;
        } else if (name === 'MAGIC_FLUTE' || name === 'MAGIC_HARP'
            || name === 'FROST_HORN' || name === 'FIRE_HORN'
            || name === 'DRUM_OF_EARTHQUAKE') {
            otmp.spe = rn1(5, 4);
        } else if (name === 'FIGURINE') {
            // C ref: mkobj.c TOOL_CLASS FIGURINE — harder monsters, skip humans
            let tryct = 0;
            do {
                otmp.corpsenm = rndmonnum_adj(5, 10);
            } while (is_human(mons(otmp.corpsenm)) && tryct++ < 30);
            blessorcurse(otmp, 4);
        }
        break;
    }
    case AMULET_CLASS: {
        // C ref: mkobj.c mksobj_init AMULET_CLASS
        const n = otypName(otmp.otyp);
        if (n === 'AMULET_OF_YENDOR') {
            if (!game.context) game.context = {};
            game.context.made_amulet = true;
        }
        // C: if (rn2(10) && special) curse; else blessorcurse(10)
        if (rn2(10) && (n === 'AMULET_OF_STRANGULATION' || n === 'AMULET_OF_CHANGE'
            || n === 'AMULET_OF_RESTFUL_SLEEP')) {
            curse(otmp);
        } else {
            blessorcurse(otmp, 10);
        }
        break;
    }
    case POTION_CLASS: /* note: potions get some additional init below */
    case SCROLL_CLASS:
        // C: MAIL_STRUCTURES — SCR_MAIL skips blessorcurse (D-0848 / D-0862)
        if (otmp.oclass !== SCROLL_CLASS || otmp.otyp !== SCR_MAIL) {
            blessorcurse(otmp, 4);
        }
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
        // C: artif && !rn2(40 + 10 * nartifact_exist())
        if (artif && !rn2(40 + (10 * nartifact_exist()))) {
            mk_artifact(otmp);
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
                // C: add_to_container(otmp, mkobj(SPBOOK_no_NOVEL, FALSE))
                add_to_container(otmp, mkobj(SPBOOK_no_NOVEL, false));
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

// C ref: do_name.c sir_Terry_novels[] / noveltitle
const SIR_TERRY_NOVELS = [
    'The Colour of Magic', 'The Light Fantastic', 'Equal Rites', 'Mort',
    'Sourcery', 'Wyrd Sisters', 'Pyramids', 'Guards! Guards!', 'Eric',
    'Moving Pictures', 'Reaper Man', 'Witches Abroad', 'Small Gods',
    'Lords and Ladies', 'Men at Arms', 'Soul Music', 'Interesting Times',
    'Maskerade', 'Feet of Clay', 'Hogfather', 'Jingo', 'The Last Continent',
    'Carpe Jugulum', 'The Fifth Elephant', 'The Truth', 'Thief of Time',
    'The Last Hero', 'The Amazing Maurice and His Educated Rodents',
    'Night Watch', 'The Wee Free Men', 'Monstrous Regiment',
    'A Hat Full of Sky', 'Going Postal', 'Thud!', 'Wintersmith',
    'Making Money', 'Unseen Academicals', 'I Shall Wear Midnight', 'Snuff',
    'Raising Steam', "The Shepherd's Crown",
];

/** C ref: do_name.c noveltitle — pick/store Discworld novel title index. */
function noveltitle(otmp) {
    const k = SIR_TERRY_NOVELS.length;
    let j = rn2(k);
    if (otmp) {
        if ((otmp.novelidx | 0) === -1) otmp.novelidx = j;
        else if ((otmp.novelidx | 0) >= 0 && (otmp.novelidx | 0) < k) {
            j = otmp.novelidx | 0;
        }
    }
    return SIR_TERRY_NOVELS[j];
}

// C ref: mkobj.c clear_dknown — amulets/food/armor start dknown=1 unless
// shield-range / oc_merge. oc_merge not extracted yet → deferred (food and
// other mergeables may keep dknown=1 where C clears it).
function clear_dknown(obj) {
    if (!obj) return;
    const cls = obj.oclass ?? 0;
    obj.dknown = DKNOWN_CLEAR_CLASSES.has(cls) ? 0 : 1;
    const otyp = obj.otyp ?? 0;
    if ((ELVEN_SHIELD >= 0 && otyp >= ELVEN_SHIELD && otyp <= ORCISH_SHIELD)
        || otyp === SHIELD_OF_REFLECTION) {
        obj.dknown = 0;
    }
    // Is_pudding → dknown=1 deferred (globby path)
}

// C ref: mkobj.c mksobj()
export function mksobj(otyp, init, artif) {
    const objects = objs();
    // C ref: mkobj.c unknow_object — known = oc_uses_known ? 0 : 1
    // Weapons/armor/wands/charged tools/rings use known for +/- / charges;
    // scrolls/potions start known=1 so ini_inv_use_obj can discover_object.
    const uskn = otyp_uses_known(otyp);
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
        where: OBJ_FREE, // C newobj → OBJ_FREE until place/addinv
        ox: 0,
        oy: 0,
    };
    // C: unknow_object(otmp) — dknown + known; known heuristic above
    clear_dknown(otmp);
    otmp.o_id = next_ident();
    if (init) mksobj_init(otmp, artif);

    // Post-init regardless: CORPSE/STATUE/FIGURINE gender + timer; EGG hatch
    // C ref: mkobj.c mksobj after mksobj_init — FALLTHROUGH to set_corpsenm
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
        // C: otmp->spe = neuter/female/male / rn2(2)?FEMALE:MALE;
        // then set_corpsenm (timer). Gender must be on spe so mergable()
        // keeps same-species opposite-sex corpses as separate stacks.
        if ((otmp.corpsenm ?? NON_PM) !== NON_PM) {
            const ptr = mons(otmp.corpsenm);
            otmp.spe = is_neuter(ptr) ? CORPSTAT_NEUTER
                : is_female(ptr) ? CORPSTAT_FEMALE
                    : is_male(ptr) ? CORPSTAT_MALE
                        : (rn2(2) ? CORPSTAT_FEMALE : CORPSTAT_MALE);
        }
        // C FALLTHROUGH → set_corpsenm (CORPSE starts rot timer)
        set_corpsenm(otmp, otmp.corpsenm);
    } else if (name === 'EGG') {
        // C: case EGG: set_corpsenm → attach_egg_hatch_timeout for typed eggs
        set_corpsenm(otmp, otmp.corpsenm);
    } else if (name === 'SPE_NOVEL') {
        // C ref: mkobj.c mksobj SPE_NOVEL — even when !init
        otmp.novelidx = -1;
        const title = noveltitle(otmp);
        otmp.oname = title;
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
        // C: Is_rogue_level → rogueprobs; Inhell → hellprobs; else mkobjprobs
        const inhell = !!(game.dungeons?.[game.u?.uz?.dnum | 0]?.flags?.hellish);
        const iprobs = Is_rogue_level(game.u?.uz) ? ROGUE_PROBS
            : inhell ? HELL_PROBS
            : MKOBJ_PROBS;
        let tprob = rnd(100);
        let ip = 0;
        for (; (tprob -= iprobs[ip].iprob) > 0; ip++) /* advance */;
        oclass_ = iprobs[ip].iclass;
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
    if (!game._objects_at) game._objects_at = new Map();
    const key = `${x},${y}`;
    let otmp2 = game._objects_at.get(key) || null;
    const firstBoulder = otmp.otyp === BOULDER
        && (!otmp2 || otmp2.otyp !== BOULDER);
    otmp.ox = x;
    otmp.oy = y;
    otmp.where = OBJ_FLOOR;
    otmp.nobj = game.fobj || null;
    game.fobj = otmp;
    // C: non-boulder goes under last consecutive boulder
    if (otmp2 && otmp2.otyp === BOULDER && otmp.otyp !== BOULDER) {
        while (otmp2.nexthere && otmp2.nexthere.otyp === BOULDER) {
            otmp2 = otmp2.nexthere;
        }
        otmp.nexthere = otmp2.nexthere || null;
        otmp2.nexthere = otmp;
    } else {
        otmp.nexthere = otmp2;
        game._objects_at.set(key, otmp);
    }
    // C block_point is incremental; JS rebuilds via does_block after place
    if (firstBoulder) recalc_block_point(x, y);
}

/**
 * C ref: steal.c relobj(mtmp, show, FALSE) via mon.c m_detach(due_to_death)
 * → mdrop_obj per minvent head. Vault-guard gold and flooreffects omitted;
 * caller issues newsym.
 *
 * C mdrop_obj calls distant_name(obj, doname) *before* extract for observe
 * side-effects (disco order = minvent order, not reverse pile order).
 */
export function relobj_on_death(mtmp) {
    if (!mtmp) return;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    while (mtmp.minvent) {
        const otmp = mtmp.minvent;
        // C: distant_name even when !verbosely — observe while still MINVENT
        distant_name(otmp, doname);
        obj_extract_self(otmp);
        if (otmp.owornmask) otmp.owornmask = 0;
        if (mtmp.mw === otmp) mtmp.mw = null;
        place_object(otmp, omx, omy);
        stackobj(otmp);
    }
}

/**
 * C ref: invent.c objects[].oc_merge — table field not yet extracted;
 * approximate from C BITS defaults. SPELL() uses mrg=0 — spellbooks
 * never stack (D-0679). Wands similarly non-merge in C BITS.
 */
export function oc_merge_of(otyp) {
    const od = game.objects?.[otyp];
    if (od && typeof od.oc_merge === 'number') return od.oc_merge !== 0;
    if (otyp === BOULDER || otyp === STATUE || otyp === BOOMERANG) return false;
    const oc = od?.oc_class ?? 0;
    // C SPELL()/WAND BITS mrg=0 — do not treat SPBOOK/WAND as mergeable
    return oc === WEAPON_CLASS || oc === GEM_CLASS || oc === FOOD_CLASS
        || oc === POTION_CLASS || oc === SCROLL_CLASS
        || oc === COIN_CLASS;
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
    // C invent.c mergable — FOOD oeaten/orotten must match (partly eaten)
    if (obj.oclass === FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0)
            || !!obj.orotten !== !!otmp.orotten)) {
        return false;
    }
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

/**
 * C ref: mkobj.c replace_object — swap otmp into obj's chain position.
 * Floor arm used by zap.c poly_obj; invent/minvent/contained deferred.
 */
export function replace_object(obj, otmp) {
    if (!obj || !otmp) return;
    const where = obj.where;
    otmp.where = where;
    if (where === OBJ_FLOOR) {
        otmp.nobj = obj.nobj || null;
        otmp.nexthere = obj.nexthere || null;
        otmp.ox = obj.ox | 0;
        otmp.oy = obj.oy | 0;
        // C: splice otmp after obj, then extract obj from both chains
        obj.nobj = otmp;
        obj.nexthere = otmp;
        // extract from fobj (nobj chain) — skip otmp which is obj.nobj
        if (game.fobj === obj) {
            game.fobj = otmp;
        } else {
            for (let p = game.fobj; p; p = p.nobj) {
                if (p.nobj === obj) {
                    p.nobj = otmp;
                    break;
                }
            }
        }
        obj.nobj = null;
        // extract from nexthere pile — skip otmp which is obj.nexthere
        const key = `${otmp.ox},${otmp.oy}`;
        if (!game._objects_at) game._objects_at = new Map();
        const head = game._objects_at.get(key) || null;
        if (head === obj) {
            game._objects_at.set(key, otmp);
        } else {
            for (let p = head; p; p = p.nexthere) {
                if (p.nexthere === obj) {
                    p.nexthere = otmp;
                    break;
                }
            }
        }
        obj.nexthere = null;
        obj.where = OBJ_FREE;
        obj.ox = 0;
        obj.oy = 0;
    } else {
        // invent/minvent/contained — place as free until callers need them
        otmp.where = OBJ_FREE;
    }
}

// C ref: mkobj.c obj_extract_self — floor / minvent (invent/contained omitted)
export function obj_extract_self(obj) {
    if (!obj) return;
    // Floor: also accept legacy objs with coords but unset where
    if (obj.where === OBJ_FLOOR
        || (obj.where == null && obj.ox != null && obj.oy != null
            && !(obj.ox === 0 && obj.oy === 0))) {
        const ox = obj.ox | 0;
        const oy = obj.oy | 0;
        const wasBoulder = obj.otyp === BOULDER;
        const key = `${ox},${oy}`;
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
        // C remove_object: boulder → recalc_block_point
        if (wasBoulder) recalc_block_point(ox, oy);
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
    } else if (obj.where === OBJ_CONTAINED) {
        // C: extract_nobj(obj, &obj->ocontainer->cobj); container_weight
        const cont = obj.ocontainer;
        if (cont) {
            if (cont.cobj === obj) {
                cont.cobj = obj.nobj || null;
            } else {
                for (let p = cont.cobj; p; p = p.nobj) {
                    if (p.nobj === obj) {
                        p.nobj = obj.nobj || null;
                        break;
                    }
                }
            }
            cont.owt = weight(cont);
        }
        obj.ocontainer = null;
    }
    obj.nobj = null;
    obj.nexthere = null;
    obj.where = OBJ_FREE;
    // C remove_object / extract_nobj: do NOT clear ox/oy — drag_ball and
    // move_bc read uball->ox after pickup (D-0911). place_object overwrites.
}

/**
 * C ref: invent.c delobj / delobj_core — obj_resists(0,0) then extract+free.
 * Invocation-item protection deferred; always rolls rn2(100) like C.
 */
export function delobj(obj) {
    if (!obj) return;
    // C: obj_resists(obj, 0, 0) — rolls rn2(100); returns true only for
    // Amulet / Book / Candelabrum / Bell / Rider corpse
    const n = objectNames[obj.otyp];
    const special = n === 'AMULET_OF_YENDOR'
        || n === 'SPE_BOOK_OF_THE_DEAD'
        || n === 'CANDELABRUM_OF_INVOCATION'
        || n === 'BELL_OF_OPENING';
    if (special) return;
    rn2(100); // ochance 0 → never resists, but always consumes
    obj_extract_self(obj);
    // obfree — drop references; GC reclaim
    obj.quan = 0;
    obj.where = OBJ_FREE;
}

/** C ref: invent.c g_at — first COIN_CLASS on pile. */
export function g_at(x, y) {
    for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
        if (obj.oclass === COIN_CLASS) return obj;
    }
    return null;
}

/** C ref: objclass.h is_metallic — IRON..MITHRIL inclusive. */
export function is_metallic(otmp) {
    if (!otmp) return false;
    const mat = objs()[otmp.otyp]?.oc_material ?? 0;
    return mat >= IRON && mat <= MITHRIL;
}

/** C ref: objclass.h is_organic — material <= WOOD. */
export function is_organic(otmp) {
    if (!otmp) return false;
    const mat = objs()[otmp.otyp]?.oc_material ?? 0;
    return mat <= WOOD;
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
