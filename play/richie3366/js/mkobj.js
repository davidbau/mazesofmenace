// mkobj.js — Object creation.
// C ref: mkobj.c — mkobj, mksobj, mkgold, next_ident, mksobj_init (partial),
//        hornoplenty / fixup_oil (D-1031).

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
import {
    rndmonnum, rndmonnum_adj,
} from './makemon.js';
import {
    undead_to_corpse, can_be_hatched, dead_species, copy_mextra,
    zombie_form,
} from './mon.js';
import { nartifact_exist, mk_artifact } from './artifact.js';
import {
    mons, is_male, is_female, is_neuter, is_human, verysmall, PM_LICHEN, monsterNames,
    G_NOCORPSE, NON_PM as MON_NON_PM,
} from './monsters.js';
import { PM_SAMURAI } from './generated/monsters_data.js';
import { otyp_uses_known, distant_name, doname, cxname, The, vtense, corpse_xname } from './objnam.js';
import {
    ROT_AGE, TAINT_AGE, TROLL_REVIVE_CHANCE,
    ROT_ORGANIC, ROT_CORPSE, REVIVE_MON, ZOMBIFY_MON,
    TIMER_OBJECT, TIMER_LEVEL, TIMER_GLOBAL, TIMER_MONSTER,
    RANGE_LEVEL,
    MELT_ICE_AWAY, HATCH_EGG, FIG_TRANSFORM, BURN_OBJECT, SHRINK_GLOB,
    MAX_EGG_HATCH_TIME,
    OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, OBJ_BURIED, OBJ_MINVENT, OBJ_CONTAINED,
    OBJ_MIGRATING, OBJ_ONBILL, MIGR_TO_SPECIES, W_WEP,
    G_GONE,
    LOST_NONE, LOST_EXPLODING,
    CORPSTAT_NEUTER, CORPSTAT_FEMALE, CORPSTAT_MALE,
    CXN_NO_PFX,
    Is_rogue_level, isok, ICE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE,
    LS_OBJECT, OMONST, has_omonst, OMID, has_omid, MON_DETACH,
    IRONBARS, ROOM, IS_ALTAR, Is_airlevel, Is_waterlevel,
    MAX_OIL_IN_FLASK, nothing_happens,
} from './const.js';
import { recalc_block_point } from './vision.js';
import { del_light_source } from './light.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const POT_BOOZE = objectNames.indexOf('POT_BOOZE');
const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_SICKNESS = objectNames.indexOf('POT_SICKNESS');
const POT_OIL = objectNames.indexOf('POT_OIL');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const LUMP_OF_ROYAL_JELLY = objectNames.indexOf('LUMP_OF_ROYAL_JELLY');
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const BOULDER = objectNames.indexOf('BOULDER');
const STATUE = objectNames.indexOf('STATUE');
const FIGURINE = objectNames.indexOf('FIGURINE');
const BOOMERANG = objectNames.indexOf('BOOMERANG');
const CORPSE = objectNames.indexOf('CORPSE');
const GLOB_OF_GRAY_OOZE = objectNames.indexOf('GLOB_OF_GRAY_OOZE');
const GLOB_OF_BROWN_PUDDING = objectNames.indexOf('GLOB_OF_BROWN_PUDDING');
const GLOB_OF_GREEN_SLIME = objectNames.indexOf('GLOB_OF_GREEN_SLIME');
const GLOB_OF_BLACK_PUDDING = objectNames.indexOf('GLOB_OF_BLACK_PUDDING');
const ROT_ICE_ADJUSTMENT = 2; // mkobj.c — rotting on ice takes 2× as long
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const ELVEN_SHIELD = objectNames.indexOf('ELVEN_SHIELD');
const ORCISH_SHIELD = objectNames.indexOf('ORCISH_SHIELD');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const LARGEST_INT = 32767; // C ref: global.h
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_GRAY_OOZE = monsterNames.indexOf('PM_GRAY_OOZE');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const NON_PM = MON_NON_PM;

/** C ref: obj.h Is_pudding — four GLOB_* otyps. */
export function Is_pudding(obj) {
    const o = obj?.otyp | 0;
    return o === GLOB_OF_GRAY_OOZE || o === GLOB_OF_BROWN_PUDDING
        || o === GLOB_OF_GREEN_SLIME || o === GLOB_OF_BLACK_PUDDING;
}

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
 * C ref: mkobj.c add_to_minv — merge via invent.c merged(), else prepend.
 * Returns 1 if obj merged (C-freed); 0 if prepended onto minvent.
 * C panics if obj->where != OBJ_FREE; JS extracts like add_to_container.
 */
export function add_to_minv(mon, obj) {
    if (!mon || !obj) return 1;
    if (obj.where && obj.where !== OBJ_FREE) obj_extract_self(obj);
    // C: for (otmp = mon->minvent; otmp; otmp = otmp->nobj)
    //        if (merged(&otmp, &obj)) return 1;
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        const potmp = { obj: otmp };
        const pobj = { obj };
        if (merged(potmp, pobj)) return 1;
    }
    obj.where = OBJ_MINVENT;
    obj.ocarry = mon;
    obj.nobj = mon.minvent;
    mon.minvent = obj;
    return 0;
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
    // C: globby — owt managed by mksobj/obj_absorb/shrink_glob; return as-is
    if (obj.globby) return obj.owt | 0;
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
    // C mkobj.c weight — candelabrum spe * tallow candle (use_candle owt)
    if (obj.otyp === CANDELABRUM_OF_INVOCATION && (obj.spe | 0)) {
        const cwt = objects[TALLOW_CANDLE]?.oc_weight ?? 0;
        return wt + (obj.spe | 0) * (cwt | 0);
    }
    if (!wt) return Math.trunc((quan + 1) / 2);
    return wt * quan;
}

/**
 * C ref: eat.c eaten_stat — scale base by oeaten/obj_nutrition (min 1).
 * Nutrition: CORPSE → mons.cnutrit; else objects.oc_nutrition / food table.
 */
export function eaten_stat(base, obj) {
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
 * Deferred: unpaid/splitbill, copy_oextra, light sources, Lua where.
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
        parent_oid: obj.o_id | 0,
        child_oid: otmp.o_id | 0,
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
    // C: if (obj->timed) obj_split_timers(obj, otmp)
    if (obj.timed) obj_split_timers(obj, otmp);
    return otmp;
}

function objsplit_ctx() {
    if (!game.context) game.context = {};
    if (!game.context.objsplit) {
        game.context.objsplit = { parent_oid: 0, child_oid: 0 };
    }
    return game.context.objsplit;
}

/**
 * C ref: mkobj.c clear_splitobjs — zero parent/child oids before getobj
 * ALLOWCNT (wield.c dowield / doquiver_core).
 */
export function clear_splitobjs() {
    const s = objsplit_ctx();
    s.parent_oid = 0;
    s.child_oid = 0;
}

function find_oid_on_nobj(head, oid) {
    const want = oid | 0;
    for (let o = head; o; o = o.nobj) {
        if ((o.o_id | 0) === want) return o;
    }
    return null;
}

/** JS invent is an array; also walk nobj so a split child not yet spliced is found. */
function find_oid_in_invent(oid) {
    const want = oid | 0;
    const seen = new Set();
    for (const o of game.invent || []) {
        for (let p = o; p && !seen.has(p); p = p.nobj) {
            seen.add(p);
            if ((p.o_id | 0) === want) return p;
        }
    }
    return null;
}

/**
 * C ref: mkobj.c unsplitobj — find the other half of context.objsplit
 * and merged() them. Floor/free/bill/migrating/buried return null.
 * JS mergable rejects owornmask (C does not); clear masks around merged
 * so a split of uwep/uquiver can rejoin, then restore the parent's mask.
 */
export function unsplitobj(obj) {
    if (!obj) return null;
    const where = obj.where;
    if (where === OBJ_FREE || where === OBJ_FLOOR || where === OBJ_ONBILL
        || where === OBJ_MIGRATING || where === OBJ_BURIED
        || (where !== OBJ_INVENT && where !== OBJ_MINVENT
            && where !== OBJ_CONTAINED)) {
        return null;
    }

    const split = objsplit_ctx();
    const childOid = split.child_oid | 0;
    const parentOid = split.parent_oid | 0;
    const oid = obj.o_id | 0;
    let oparent = null;
    let ochild = null;
    let targetOid = 0;

    if (oid && oid === childOid) {
        ochild = obj;
        targetOid = parentOid;
        if (obj.nobj && (obj.nobj.o_id | 0) === targetOid) oparent = obj.nobj;
    } else if (oid && oid === parentOid) {
        oparent = obj;
        targetOid = childOid;
        if (obj.nobj && (obj.nobj.o_id | 0) === targetOid) ochild = obj.nobj;
    }

    if (ochild && !oparent) {
        if (where === OBJ_INVENT) oparent = find_oid_in_invent(targetOid);
        else if (where === OBJ_MINVENT) {
            oparent = find_oid_on_nobj(obj.ocarry?.minvent, targetOid);
        } else {
            oparent = find_oid_on_nobj(obj.ocontainer?.cobj, targetOid);
        }
    } else if (oparent && !ochild) {
        if (where === OBJ_INVENT) ochild = find_oid_in_invent(targetOid);
        else if (where === OBJ_MINVENT) {
            ochild = find_oid_on_nobj(obj.ocarry?.minvent, targetOid);
        } else {
            ochild = find_oid_on_nobj(obj.ocontainer?.cobj, targetOid);
        }
    }

    if (!oparent || !ochild) return null;

    // C invent.c mergable does not reject worn; JS floor-stack subset does.
    const pmask = oparent.owornmask | 0;
    const cmask = ochild.owornmask | 0;
    oparent.owornmask = 0;
    ochild.owornmask = 0;
    const childNext = ochild.nobj || null;
    const parentHadChild = oparent.nobj === ochild;
    const potmp = { obj: oparent };
    const pobj = { obj: ochild };
    const ok = merged(potmp, pobj);
    const kept = potmp.obj;
    if (ok && kept) {
        kept.owornmask = pmask | cmask;
        if (parentHadChild && kept === oparent) kept.nobj = childNext;
        return kept;
    }
    oparent.owornmask = pmask;
    ochild.owornmask = cmask;
    return null;
}

export function curse(otmp) {
    if (!otmp) return;
    otmp.cursed = true;
    otmp.blessed = false;
    // C mkobj.c curse — FIGURINE attach when carried/mcarried + typed
    if ((otmp.otyp | 0) === FIGURINE
        && (otmp.corpsenm | 0) !== NON_PM
        && !dead_species(otmp.corpsenm | 0, true)
        && figurine_is_carried(otmp)) {
        attach_fig_transform_timeout(otmp);
    }
}
export function bless(otmp) {
    if (!otmp) return;
    otmp.blessed = true;
    otmp.cursed = false;
    // C mkobj.c bless — stop FIG_TRANSFORM if figurine timed
    if ((otmp.otyp | 0) === FIGURINE && (otmp.timed | 0)) {
        stop_timer(FIG_TRANSFORM, otmp);
    }
}

/** C ref: mkobj.c unbless — clear blessed only. */
export function unbless(otmp) {
    if (!otmp) return;
    otmp.blessed = false;
}

/**
 * C ref: mkobj.c uncurse — clear cursed; bag weight; figurine stop
 * FIG_TRANSFORM. luck / lamplit adjust still deferred.
 */
export function uncurse(otmp) {
    if (!otmp) return;
    otmp.cursed = false;
    const bag = objectNames.indexOf('BAG_OF_HOLDING');
    if (bag >= 0 && (otmp.otyp | 0) === bag) otmp.owt = weight(otmp);
    else if ((otmp.otyp | 0) === FIGURINE && (otmp.timed | 0)) {
        stop_timer(FIG_TRANSFORM, otmp);
    }
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
 * C ref: timeout.c timer queue (gt.timer_base) — object + level timers.
 * start_timer inserts by absolute timeout (moves+when); run_timers fires
 * when timeout <= moves. Envelope: ROT_CORPSE → rot_corpse floor extract
 * + invent/minvent worn (D-1213); HATCH_EGG queued via
 * attach_egg_hatch_timeout (D-0533); hatch_egg
 * dispatched (D-1036/D-1037); TIMER_LEVEL MELT_ICE_AWAY → melt_ice_away
 * (D-0965); REVIVE_MON / ZOMBIFY_MON → revive_mon / zombify_mon
 * (D-1202). FIG_TRANSFORM → fig_transform (D-1032).
 * save_timers(RANGE_LEVEL) peels local timers on level leave.
 */
function timer_base() {
    if (!game._timer_base) game._timer_base = null;
    return game;
}

/**
 * C ref: timeout.c insert_timer — ordered by timeout ascending; equal
 * timeout inserts before the existing node (curr->timeout >= gnu).
 */
function insert_timer(gnu) {
    const g = timer_base();
    let prev = null;
    let curr = g._timer_base;
    while (curr && curr.timeout < gnu.timeout) {
        prev = curr;
        curr = curr.next;
    }
    gnu.next = curr;
    if (prev) prev.next = gnu;
    else g._timer_base = gnu;
}

/**
 * C ref: timeout.c mon_is_local — not on migrating_mons / mydogs.
 */
function mon_is_local(mon) {
    if (!mon) return false;
    for (const curr of game.migrating_mons || []) {
        if (curr === mon) return false;
    }
    for (const curr of game.mydogs || []) {
        if (curr === mon) return false;
    }
    return true;
}

/**
 * C ref: timeout.c obj_is_local — floor/buried stay; invent/migrating
 * follow the hero; contained/minvent recurse. OBJ_FREE panics in C;
 * JS treats it as non-local so a stale timer is not saved onto a level.
 */
function obj_is_local(obj) {
    if (!obj) return false;
    switch (obj.where | 0) {
    case OBJ_INVENT:
    case OBJ_MIGRATING:
        return false;
    case OBJ_FLOOR:
    case OBJ_BURIED:
        return true;
    case OBJ_CONTAINED:
        return obj_is_local(obj.ocontainer);
    case OBJ_MINVENT:
        return mon_is_local(obj.ocarry);
    default:
        return false;
    }
}

/**
 * C ref: timeout.c timer_is_local — TIMER_LEVEL always; TIMER_OBJECT
 * follows obj_is_local; TIMER_GLOBAL never; TIMER_MONSTER via mon.
 */
function timer_is_local(timer) {
    if (!timer) return false;
    switch (timer.kind | 0) {
    case TIMER_LEVEL:
        return true;
    case TIMER_GLOBAL:
        return false;
    case TIMER_OBJECT:
        return obj_is_local(timer.obj);
    case TIMER_MONSTER:
        return mon_is_local(timer.mon);
    default:
        return false;
    }
}

/**
 * C ref: timeout.c save_timers — peel RANGE_LEVEL locals (or RANGE_GLOBAL
 * non-locals) off gt.timer_base. JS in-memory stash returns the peeled
 * list; no NHFILE. C: !(range==LEVEL xor timer_is_local) → remove.
 */
export function save_timers(range) {
    const wantLocal = (range | 0) === RANGE_LEVEL;
    const saved = [];
    const g = timer_base();
    let prev = null;
    let curr = g._timer_base;
    while (curr) {
        const next = curr.next;
        if (timer_is_local(curr) === wantLocal) {
            if (prev) prev.next = next;
            else g._timer_base = next;
            curr.next = null;
            saved.push(curr);
        } else {
            prev = curr;
        }
        curr = next;
    }
    return saved;
}

/**
 * C ref: timeout.c restore_timers — re-insert saved elements (adjust 0
 * for in-memory getlev; bones ghostly timeout+=adjust deferred).
 */
export function restore_timers(list) {
    if (!list) return;
    for (const t of list) {
        if (!t) continue;
        t.next = null;
        insert_timer(t);
    }
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
 * remaining turns (timeout − moves), or 0 if none. BURN_OBJECT runs
 * cleanup_burn (restore age, del LS_OBJECT, clear lamplit).
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
            const expire = curr.timeout | 0;
            // C: timeout_funcs[BURN_OBJECT].cleanup = cleanup_burn
            if (action === BURN_OBJECT && obj.lamplit) {
                del_light_source(LS_OBJECT, obj);
                obj.age = (obj.age | 0) + (expire - moves);
                obj.lamplit = 0;
            }
            return expire - moves;
        }
        prev = curr;
        curr = next;
    }
    return 0;
}

/**
 * C ref: timeout.c peek_timer — absolute timeout for this
 * (func_index, obj), or 0 if none. Does not subtract moves
 * (unlike stop_timer remaining). C matches func_index + arg
 * pointer, not kind.
 */
export function peek_timer(type, obj) {
    if (!obj) return 0;
    for (let curr = timer_base()._timer_base; curr; curr = curr.next) {
        if (curr.action === type && curr.obj === obj) {
            return curr.timeout | 0;
        }
    }
    return 0;
}

/**
 * C ref: timeout.c obj_has_timer — peek_timer != 0. Absolute
 * timeout is never 0 for a live entry.
 */
export function obj_has_timer(obj, action) {
    return peek_timer(action, obj) !== 0;
}

/**
 * C ref: timeout.c start_timer — queue timer; timeout = moves+when.
 * TIMER_OBJECT: arg is obj (duplicate same obj+action aborted).
 * TIMER_LEVEL: arg is packed a_long (or `{ a_long }`); used for
 * MELT_ICE_AWAY spot timers (D-0965). tid = svt.timer_id++ (D-1527
 * #timeout print_queue). save/rest timer_id named.
 */
export function start_timer(when, kind, action, arg) {
    const isObj = (kind | 0) === TIMER_OBJECT;
    if (isObj && !arg) return 0;
    const obj = isObj ? arg : null;
    const a_long = isObj
        ? 0
        : (typeof arg === 'number' ? (arg | 0) : (arg?.a_long | 0));
    const g = timer_base();
    for (let dup = g._timer_base; dup; dup = dup.next) {
        if ((dup.kind | 0) !== (kind | 0) || dup.action !== action) continue;
        if (isObj && dup.obj === obj) return 0;
        if (!isObj && (dup.a_long | 0) === a_long) return 0;
    }
    const moves = game.moves | 0;
    /* C timeout.c start_timer: gnu->tid = svt.timer_id++; starts 1UL. */
    if ((game.timer_id | 0) < 1) game.timer_id = 1;
    const gnu = {
        next: null,
        timeout: moves + (when | 0),
        tid: game.timer_id++,
        kind: kind | 0,
        action: action | 0,
        obj,
        a_long,
    };
    insert_timer(gnu);
    if (isObj) obj.timed = (obj.timed | 0) + 1;
    return when;
}

/**
 * C ref: timeout.c obj_split_timers — duplicate every TIMER_OBJECT on
 * src onto dest with the same remaining (timeout − moves). Caller
 * splitobj zeros dest.timed first; start_timer bumps it. Save next
 * because start_timer inserts into the ordered list.
 */
export function obj_split_timers(src, dest) {
    if (!src || !dest) return;
    const g = timer_base();
    const moves = game.moves | 0;
    let curr = g._timer_base;
    while (curr) {
        const next = curr.next;
        if ((curr.kind | 0) === TIMER_OBJECT && curr.obj === src) {
            start_timer((curr.timeout | 0) - moves, TIMER_OBJECT,
                curr.action, dest);
        }
        curr = next;
    }
}

/**
 * C ref: timeout.c spot_time_left — remaining turns for a TIMER_LEVEL
 * action at (x,y), or 0 if none.
 */
export function spot_time_left(x, y, action) {
    const where = (((x | 0) & 0xffff) << 16) | ((y | 0) & 0xffff);
    const moves = game.moves | 0;
    for (let curr = timer_base()._timer_base; curr; curr = curr.next) {
        if ((curr.kind | 0) === TIMER_LEVEL
            && curr.action === action
            && (curr.a_long | 0) === where) {
            return ((curr.timeout | 0) - moves) | 0;
        }
    }
    return 0;
}

/**
 * C ref: timeout.c spot_stop_timers — remove TIMER_LEVEL timers for
 * action at (x,y).
 */
export function spot_stop_timers(x, y, action) {
    const where = (((x | 0) & 0xffff) << 16) | ((y | 0) & 0xffff);
    const g = timer_base();
    let prev = null;
    let curr = g._timer_base;
    while (curr) {
        const next = curr.next;
        if ((curr.kind | 0) === TIMER_LEVEL
            && curr.action === action
            && (curr.a_long | 0) === where) {
            if (prev) prev.next = next;
            else g._timer_base = next;
        } else {
            prev = curr;
        }
        curr = next;
    }
}

/**
 * C ref: timeout.c attach_egg_hatch_timeout — stop prior HATCH_EGG; if
 * when==0 roll rnd(i)>150 for i in 151..MAX_EGG_HATCH_TIME; queue timer.
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
 * C ref: timeout.c kill_egg — stop HATCH_EGG so the egg never hatches.
 */
export function kill_egg(egg) {
    if (!egg) return;
    stop_timer(HATCH_EGG, egg);
}

/**
 * C ref: timeout.c attach_fig_transform_timeout — stop prior FIG_TRANSFORM;
 * queue rnd(9000)+200.
 */
export function attach_fig_transform_timeout(figurine) {
    if (!figurine) return;
    stop_timer(FIG_TRANSFORM, figurine);
    const i = rnd(9000) + 200;
    start_timer(i, TIMER_OBJECT, FIG_TRANSFORM, figurine);
}

/** C invent.c carried / mcarried — invent or monster inventory. */
function figurine_is_carried(obj) {
    if (!obj) return false;
    const where = obj.where | 0;
    if (where === OBJ_INVENT || where === OBJ_MINVENT) return true;
    return (game.invent || []).includes(obj);
}

/**
 * C ref: invent.c carry_obj_effects — cursed figurine starts FIG_TRANSFORM
 * after addinv / mpickobj.
 */
export function carry_obj_effects(obj) {
    if (!obj || (obj.otyp | 0) !== FIGURINE) return;
    if (obj.cursed && (obj.corpsenm | 0) !== NON_PM
        && !dead_species(obj.corpsenm | 0, true)) {
        attach_fig_transform_timeout(obj);
    }
}

/**
 * C ref: objnam.c otense — plural verb if quan != 1; else vtense(null).
 * ART_EYES_OF_THE_OVERWORLD plural named omit.
 */
function otense_corpse(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/**
 * C ref: weapon.c setmnotwielded — MON_NOWEP + clear W_WEP.
 * Named omit: artifact_light end_burn + canseemon shine pline.
 */
function setmnotwielded_rot(mon, obj) {
    if (!obj) return;
    if (mon && mon.mw === obj) mon.mw = null;
    obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
}

/**
 * C ref: dig.c rot_corpse — corpse finished rotting.
 * Envelope (D-1213): OBJ_INVENT verbose Your + owornmask
 * remove_worn_item(TRUE)/stop_occupation; OBJ_MINVENT wielded
 * setmnotwielded; OBJ_MIGRATING owornmask=0; invent extract splice;
 * in_invent update_inventory after rot_organic extract.
 * unique/pname corpse_xname CXN_NO_PFX "the" (D-1234).
 * Named omit: hideunder/mundetected expose; rot_organic contents bury;
 * setmnotwielded artifact_light.
 */
export async function rot_corpse(obj) {
    if (!obj) return;
    const onFloor = obj.where === OBJ_FLOOR;
    const inInvent = obj.where === OBJ_INVENT;
    let x = 0;
    let y = 0;

    if (onFloor) {
        x = obj.ox | 0;
        y = obj.oy | 0;
    } else if (inInvent) {
        if (game.flags?.verbose !== false) {
            const { pline } = await import('./display.js');
            const cname = corpse_xname(obj, null, CXN_NO_PFX);
            const uwep = game.u?.uwep;
            const wielded = obj === uwep ? 'wielded ' : '';
            const verb = otense_corpse(obj, 'rot');
            const punct = obj === uwep ? '!' : '.';
            await pline(`Your ${wielded}${cname} ${verb} away${punct}`);
        }
        if (obj.owornmask) {
            const { remove_worn_item } = await import('./steal.js');
            await remove_worn_item(obj, true);
            const { stop_occupation } = await import('./hack.js');
            await stop_occupation();
        }
    } else if (obj.where === OBJ_MINVENT) {
        if (obj.owornmask && obj === obj.ocarry?.mw) {
            setmnotwielded_rot(obj.ocarry, obj);
        }
    } else if (obj.where === OBJ_MIGRATING) {
        obj.owornmask = 0;
    }

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
    } else if (inInvent) {
        const { update_inventory } = await import('./invent.js');
        update_inventory();
    }
}

/**
 * C ref: timeout.c run_timers — fire due timers at start of list.
 * Called from nh_timeout after intrinsic TIMEOUT handling.
 * Envelope: ROT_CORPSE; ROT_ORGANIC (dig.c); TIMER_LEVEL MELT_ICE_AWAY
 * (D-0965/D-0967); BURN_OBJECT (D-0978); SHRINK_GLOB thin (D-0993);
 * FIG_TRANSFORM (D-1032); REVIVE_MON / ZOMBIFY_MON (D-1202).
 * Named omit: full shrink ice/eat catch-up. Local timers peel via
 * save_timers RANGE_LEVEL on goto_level (D-1037).
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
        } else if (curr.action === ROT_ORGANIC) {
            const { rot_organic } = await import('./dig.js');
            await rot_organic(curr.obj);
        } else if (curr.action === MELT_ICE_AWAY
            && (curr.kind | 0) === TIMER_LEVEL) {
            const { melt_ice_away } = await import('./zap.js');
            await melt_ice_away(curr.a_long | 0);
        } else if (curr.action === BURN_OBJECT && curr.obj) {
            const { burn_object } = await import('./timeout.js');
            await burn_object(curr.obj, curr.timeout | 0);
        } else if (curr.action === SHRINK_GLOB && curr.obj) {
            await shrink_glob(curr.obj);
        } else if (curr.action === FIG_TRANSFORM && curr.obj) {
            const { fig_transform } = await import('./apply.js');
            await fig_transform(curr.obj, curr.timeout | 0);
        } else if (curr.action === HATCH_EGG && curr.obj) {
            const { hatch_egg } = await import('./timeout.js');
            await hatch_egg(curr.obj, curr.timeout | 0);
        } else if (curr.action === REVIVE_MON && curr.obj) {
            const { revive_mon } = await import('./timeout.js');
            await revive_mon(curr.obj, curr.timeout | 0);
        } else if (curr.action === ZOMBIFY_MON && curr.obj) {
            const { zombify_mon } = await import('./timeout.js');
            await zombify_mon(curr.obj, curr.timeout | 0);
        }
    }
}

/**
 * C ref: mkobj.c start_glob_timeout — schedule SHRINK_GLOB (~25 turns).
 */
export function start_glob_timeout(obj, when = 0) {
    if (!obj?.globby) return;
    if (obj.timed) stop_timer(SHRINK_GLOB, obj);
    let w = when | 0;
    if (w < 1) w = 25 + rn2(5) - 2; // 23..27
    start_timer(w, TIMER_OBJECT, SHRINK_GLOB, obj);
}

/**
 * C ref: mkobj.c shrink_glob — thin: −1 owt / destroy at 0; ice/eat/catch-up
 * polish deferred.
 */
async function shrink_glob(obj) {
    if (!obj?.globby) return;
    const owt = (obj.owt | 0) - 1;
    if (owt <= 0) {
        const ox = obj.ox | 0;
        const oy = obj.oy | 0;
        const wasFloor = (obj.where | 0) === OBJ_FLOOR;
        delobj(obj);
        if (wasFloor) {
            try {
                const { newsym } = await import('./display.js');
                newsym(ox, oy);
            } catch { /* optional */ }
        }
        return;
    }
    obj.owt = owt;
    if ((obj.where | 0) === OBJ_CONTAINED && obj.ocontainer) {
        obj.ocontainer.owt = weight(obj.ocontainer);
    }
    start_glob_timeout(obj, 0);
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
    } else if (name === 'FIGURINE') {
        // C mkobj.c set_corpsenm FIGURINE — attach when typed + carried
        if (id !== NON_PM && !dead_species(id, true)
            && figurine_is_carried(obj)) {
            attach_fig_transform_timeout(obj);
        }
        obj.owt = weight(obj);
    } else if (name === 'EGG') {
        // C: attach_egg_hatch_timeout when typed + !dead_species; no owt here
        if (id !== NON_PM && !dead_species(id, true)) {
            attach_egg_hatch_timeout(obj, when);
        }
    } else if (name === 'STATUE' || name === 'TIN') {
        obj.owt = weight(obj);
    }
}

// C ref: mkobj.c rider_revival_time
export function rider_revival_time(body, retry) {
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
    } else if (ptr && game.zombify && zombie_form(ptr) !== MON_NON_PM
               && !body.norevive) {
        action = ZOMBIFY_MON;
        when = rn1(15, 5); /* 5..19 */
    }

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
            // C ref: mkobj.c SLIME_MOLD — spe = current_fruit (D-1511 chain)
            if (game.context?.current_fruit != null) {
                otmp.spe = game.context.current_fruit;
            }
            if (game.flags) game.flags.made_fruit = true;
        } else if (name === 'CANDY_BAR') {
            // C ref: mkobj.c CANDY_BAR → read.c assign_candy_wrapper
            assign_candy_wrapper(otmp);
        }
        // C: Is_pudding → globby init (before quan=2 roll)
        if (Is_pudding(otmp)) {
            otmp.globby = 1;
            otmp.quan = 1;
            otmp.owt = objects[otmp.otyp]?.oc_weight ?? 20;
            otmp.known = 1;
            otmp.dknown = 1;
            // C: corpsenm = PM_GRAY_OOZE + (otyp - GLOB_OF_GRAY_OOZE)
            otmp.corpsenm = PM_GRAY_OOZE + ((otmp.otyp | 0) - GLOB_OF_GRAY_OOZE);
            start_glob_timeout(otmp, 0);
        } else if (name !== 'CORPSE' && name !== 'MEAT_RING'
            && name !== 'KELP_FROND') {
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
            // C mkobj.c:992–993 — 20 * oc_cost (tallow 200 / wax 400)
            otmp.age = 20 * (objs()?.[otmp.otyp]?.oc_cost | 0);
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
    // Is_pudding → dknown=1 set in mksobj_init after clear_dknown
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

/**
 * C ref: mkobj.c mksobj_migr_to_species — extra orctown loot onto
 * migrating_objs. owornmask = MIGR_TO_SPECIES; migr_species overlays
 * corpsenm (obj.h). Caller: mkmaze.c migr_booty_item / stolen_booty.
 */
export function mksobj_migr_to_species(otyp, mflags2, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    add_to_migration(otmp);
    otmp.owornmask = MIGR_TO_SPECIES;
    const spec = mflags2 >>> 0;
    otmp.migr_species = spec;
    otmp.corpsenm = spec | 0;
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
    // C: if (otmp->timed) obj_timer_checks(otmp, x, y, 0);
    if (otmp.timed) obj_timer_checks(otmp, x, y, 0);
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
 * C ref: invent.c mergable() — floor-stack subset + globby early TRUE.
 * Named omit: shop/mail/candle polish beyond current checks.
 */
export function mergable(otmp, obj) {
    if (!obj || !otmp || obj === otmp || obj.otyp !== otmp.otyp) return false;
    if (obj.nomerge || otmp.nomerge || !oc_merge_of(obj.otyp)) return false;
    if (obj.oclass === COIN_CLASS) return true;
    // C: globby skip remaining attribute checks
    if (obj.globby) return true;
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
 * Globby → pudding_merge_message + obj_absorb (D-0993).
 */
function merged(potmp, pobj) {
    let otmp = potmp.obj;
    let obj = pobj.obj;
    if (!mergable(otmp, obj)) return false;
    if (obj.globby) {
        // sync callers: fire-and-forget message (flooreffects awaits)
        void pudding_merge_message(otmp, obj);
        const kept = obj_absorb(potmp, pobj);
        potmp.obj = kept;
        pobj.obj = null;
        return !!kept;
    }
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
    // C invent.c merged: "really should merge the timeouts" then
    // obj_stop_timers(obj) so the absorbed object's HATCH_EGG (etc.)
    // does not fire after extract.
    if (obj.timed) obj_stop_timers(obj);
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

/**
 * C ref: invent.c nxtobj — next same-otyp via nobj or nexthere.
 */
export function nxtobj(obj, type, by_nexthere) {
    let otmp = obj;
    do {
        otmp = by_nexthere ? otmp?.nexthere : otmp?.nobj;
        if (!otmp) break;
    } while ((otmp.otyp | 0) !== (type | 0));
    return otmp || null;
}

/**
 * C ref: mkobj.c obj_nexto_xy — find mergable same-otyp at/near (x,y).
 * Under-feet first; if recurs, 3×3 random-order search (burns rn2(2)×2).
 */
export function obj_nexto_xy(obj, x, y, recurs) {
    if (!obj) return null;
    const otyp = obj.otyp | 0;
    let otmp = objects_at(x, y);
    while (otmp) {
        if (otmp !== obj && (otmp.otyp | 0) === otyp && mergable(otmp, obj)) {
            return otmp;
        }
        otmp = nxtobj(otmp, otyp, true);
    }
    if (!recurs) return null;
    const dx = rn2(2) ? -1 : 1;
    const dy = rn2(2) ? -1 : 1;
    const ex = (x | 0) - dx;
    const ey = (y | 0) - dy;
    for (let fx = ex; Math.abs(fx - ex) < 3; fx += dx) {
        for (let fy = ey; Math.abs(fy - ey) < 3; fy += dy) {
            if (isok(fx, fy) && (fx !== (x | 0) || fy !== (y | 0))) {
                const near = obj_nexto_xy(obj, fx, fy, false);
                if (near) return near;
            }
        }
    }
    return null;
}

/** C ref: mkobj.c obj_nexto — wrapper around obj_nexto_xy at obj coords. */
export function obj_nexto(otmp) {
    if (!otmp) return null;
    return obj_nexto_xy(otmp, otmp.ox | 0, otmp.oy | 0, true);
}

/**
 * C ref: shk.c globby_bill_fixup — shop bill when globs merge.
 * Named omit: full unpaid/debit/credit scenarios (no-op when neither unpaid).
 */
function globby_bill_fixup(_absorber, _absorbed) {
    // deferred — unpaid shop merge not exercised by fortress public suite
}

/**
 * C ref: mkobj.c obj_absorb — *obj1 absorbs *obj2; free *obj2.
 * @param {{obj: object|null}} p1 survivor ref
 * @param {{obj: object|null}} p2 absorbed ref (nulled)
 * @returns {object|null} survivor
 */
export function obj_absorb(p1, p2) {
    const otmp1 = p1?.obj;
    const otmp2 = p2?.obj;
    if (!otmp1 || !otmp2 || otmp1 === otmp2) return otmp1 || null;
    globby_bill_fixup(otmp1, otmp2);
    if (!!otmp1.bknown !== !!otmp2.bknown) {
        otmp1.bknown = 0;
        otmp2.bknown = 0;
    }
    if (!!otmp1.rknown !== !!otmp2.rknown) {
        otmp1.rknown = 0;
        otmp2.rknown = 0;
    }
    if (!!otmp1.greased !== !!otmp2.greased) {
        otmp1.greased = 0;
        otmp2.greased = 0;
    }
    if (otmp1.orotten || otmp2.orotten) {
        otmp1.orotten = 1;
        otmp2.orotten = 1;
    }
    const o1wt = otmp1.oeaten ? (otmp1.oeaten | 0) : (otmp1.owt | 0);
    const o2wt = otmp2.oeaten ? (otmp2.oeaten | 0) : (otmp2.owt | 0);
    const moves = game.moves | 0;
    const agetmp = Math.trunc(
        (((moves - (otmp1.age | 0)) * o1wt) + ((moves - (otmp2.age | 0)) * o2wt))
            / (o1wt + o2wt || 1),
    );
    otmp1.age = moves - agetmp;
    otmp1.owt = (otmp1.owt | 0) + o2wt;
    if (otmp1.oeaten || otmp2.oeaten) otmp1.oeaten = o1wt + o2wt;
    otmp1.quan = 1;
    if (otmp1.globby && otmp2.globby) {
        let tm1 = stop_timer(SHRINK_GLOB, otmp1);
        let tm2 = stop_timer(SHRINK_GLOB, otmp2);
        tm1 = Math.trunc(((tm1 || 25) + (tm2 || 25) + 1) / 2);
        start_glob_timeout(otmp1, tm1);
    }
    obj_extract_self(otmp2);
    otmp2.quan = 0;
    otmp2.where = OBJ_FREE;
    p2.obj = null;
    p1.obj = otmp1;
    return otmp1;
}

/**
 * C ref: mkobj.c obj_meld — heavier absorbs lighter (floor+free special).
 * @param {{obj: object|null}} p1
 * @param {{obj: object|null}} p2
 * @returns {object|null}
 */
export function obj_meld(p1, p2) {
    const otmp1 = p1?.obj;
    const otmp2 = p2?.obj;
    if (!otmp1 || !otmp2 || otmp1 === otmp2) return otmp1 || otmp2 || null;
    let ox = 0;
    let oy = 0;
    let result;
    // C: unless (otmp2 floor && otmp1 free), prefer heavier otmp1
    if (!((otmp2.where | 0) === OBJ_FLOOR && (otmp1.where | 0) === OBJ_FREE)
        && ((otmp1.owt | 0) > (otmp2.owt | 0)
            || ((otmp1.owt | 0) === (otmp2.owt | 0) && rn2(2)))) {
        if ((otmp2.where | 0) === OBJ_FLOOR) {
            ox = otmp2.ox | 0;
            oy = otmp2.oy | 0;
        }
        result = obj_absorb(p1, p2);
    } else {
        if ((otmp1.where | 0) === OBJ_FLOOR) {
            ox = otmp1.ox | 0;
            oy = otmp1.oy | 0;
        }
        result = obj_absorb(p2, p1);
    }
    if (ox) {
        void import('./display.js').then(({ newsym }) => newsym(ox, oy));
        // maybe_unhide_at deferred
    }
    return result;
}

/**
 * C ref: mkobj.c pudding_merge_message — hero notices two globs coalesce.
 */
export async function pudding_merge_message(otmp, otmp2) {
    if (!otmp || !otmp2) return;
    const { pline } = await import('./display.js');
    const { cansee } = await import('./vision.js');
    const { obj_typename, makeplural } = await import('./objnam.js');
    const Blind = () => {
        const u = game.u || {};
        if (u.uroleplay?.blind) return true;
        return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
    };
    const Hallucination = () => {
        const u = game.u || {};
        if (u.Hallucination) return true;
        return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
    };
    const carried = (o) => (o.where | 0) === OBJ_INVENT;
    const visible = cansee(otmp.ox | 0, otmp.oy | 0)
        || cansee(otmp2.ox | 0, otmp2.oy | 0);
    const onfloor = (otmp.where | 0) === OBJ_FLOOR
        || (otmp2.where | 0) === OBJ_FLOOR;
    const inpack = carried(otmp) || carried(otmp2);
    if ((!Blind() && visible) || inpack) {
        if (Hallucination()) {
            if (onfloor) await pline('You see parts of the floor melting!');
            else if (inpack) {
                await pline('Your pack reaches out and grabs something!');
            }
        } else if (onfloor || inpack) {
            const u = game.u || {};
            const adj = ((otmp.ox | 0) !== (u.ux | 0) || (otmp.oy | 0) !== (u.uy | 0))
                && ((otmp2.ox | 0) !== (u.ux | 0) || (otmp2.oy | 0) !== (u.uy | 0));
            await pline(
                `The ${
                    (onfloor && adj) ? 'adjacent ' : ''
                }${makeplural(obj_typename(otmp.otyp))} coalesce${
                    inpack ? ' inside your pack' : ''
                }.`,
            );
        }
    } else {
        await pline('You hear a faint sloshing sound.');
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

/** C ref: dbridge.c / rm.h is_ice — ICE or drawbridge-under DB_ICE. */
function is_ice_at(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at?.(x, y);
    if (!lev) return false;
    if ((lev.typ | 0) === ICE) return true;
    return (lev.typ | 0) === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
}

/**
 * C ref: mkobj.c obj_timer_checks — stretch/shrink CORPSE rot/revive timers
 * on/off ice. force: 0 = check, <0 force off, >0 force on.
 */
export function obj_timer_checks(otmp, x, y, force = 0) {
    if (!otmp) return;
    let tleft = 0;
    let action = ROT_CORPSE;
    let restart_timer = false;
    const on_floor = otmp.where === OBJ_FLOOR;
    const buried = otmp.where === OBJ_BURIED;

    if (otmp.otyp === CORPSE && (on_floor || buried) && is_ice_at(x, y)) {
        tleft = stop_timer(action, otmp);
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, otmp);
        }
        if (tleft !== 0) {
            otmp.on_ice = 1;
            tleft *= ROT_ICE_ADJUSTMENT;
            restart_timer = true;
            const age = (game.moves | 0) - (otmp.age | 0);
            otmp.age = (game.moves | 0) - (age * ROT_ICE_ADJUSTMENT);
        }
    } else if ((force | 0) < 0
        || (otmp.otyp === CORPSE && otmp.on_ice
            && !((on_floor || buried) && is_ice_at(x, y)))) {
        tleft = stop_timer(action, otmp);
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, otmp);
        }
        if (tleft !== 0) {
            otmp.on_ice = 0;
            tleft = (tleft / ROT_ICE_ADJUSTMENT) | 0;
            restart_timer = true;
            const age = (game.moves | 0) - (otmp.age | 0);
            otmp.age = (otmp.age | 0)
                + (((age * (ROT_ICE_ADJUSTMENT - 1)) / ROT_ICE_ADJUSTMENT) | 0);
        }
    }
    if (restart_timer) {
        start_timer(tleft, TIMER_OBJECT, action, otmp);
    }
}

/**
 * C ref: mkobj.c obj_ice_effects — recheck floor (+ optional buried) timers
 * when ice appears/vanishes at <x,y>.
 */
export function obj_ice_effects(x, y, do_buried) {
    for (let otmp = objects_at(x, y); otmp; otmp = otmp.nexthere) {
        if (otmp.timed) obj_timer_checks(otmp, x, y, 0);
    }
    if (do_buried) {
        for (let otmp = game.level?.buriedobjlist; otmp; otmp = otmp.nobj) {
            if ((otmp.ox | 0) === (x | 0) && (otmp.oy | 0) === (y | 0)) {
                if (otmp.timed) obj_timer_checks(otmp, x, y, 0);
            }
        }
    }
}

/**
 * C ref: mkobj.c peek_at_iced_corpse_age — effective age if lifted off ice.
 */
export function peek_at_iced_corpse_age(otmp) {
    if (!otmp) return 0;
    let retval = otmp.age | 0;
    if (otmp.otyp === CORPSE && otmp.on_ice) {
        const age = (game.moves | 0) - (otmp.age | 0);
        retval += (((age * (ROT_ICE_ADJUSTMENT - 1)) / ROT_ICE_ADJUSTMENT) | 0);
    }
    return retval;
}

/**
 * C ref: mkobj.c add_to_migration — OBJ_FREE → migrating_objs chain.
 * Named omit: maybe_reset_pick (lock context); unpaid panic (caller
 * should clear unpaid before migrate).
 */
export function add_to_migration(obj) {
    if (!obj) return;
    if (obj.where != null && obj.where !== OBJ_FREE) {
        obj.where = OBJ_FREE;
    }
    obj.no_charge = 0;
    // maybe_reset_pick deferred
    obj.where = OBJ_MIGRATING;
    obj.nobj = game.migrating_objs || null;
    const uz = game.u?.uz;
    obj.omigr_from_dnum = uz?.dnum | 0;
    obj.omigr_from_dlevel = uz?.dlevel | 0;
    game.migrating_objs = obj;
}

export function objects_at(x, y) {
    if (!game._objects_at) return null;
    return game._objects_at.get(`${x},${y}`) || null;
}

/**
 * C ref: mkobj.c replace_object — swap otmp into obj's chain position.
 * Floor + invent used by zap.c poly_obj; minvent/contained named.
 */
export function replace_object(obj, otmp) {
    if (!obj || !otmp) return;
    const where = obj.where;
    otmp.where = where;
    if (where === OBJ_INVENT) {
        /* C :648–651 — otmp.nobj = obj.nobj; extract_nobj(obj, invent). */
        otmp.nobj = obj.nobj || null;
        const inv = game.invent;
        if (Array.isArray(inv)) {
            const i = inv.indexOf(obj);
            if (i >= 0) inv[i] = otmp;
        } else if (inv === obj) {
            game.invent = otmp;
        } else {
            for (let p = inv; p; p = p.nobj) {
                if (p.nobj === obj) {
                    p.nobj = otmp;
                    break;
                }
            }
        }
        obj.nobj = null;
        obj.where = OBJ_FREE;
        return;
    }
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

// C ref: mkobj.c obj_extract_self — floor / invent / minvent / contained /
// migrating / buried. OBJ_ONBILL / LUAFREE / DELETED panic named omit.
export function obj_extract_self(obj) {
    if (!obj) return;
    // Floor: also accept legacy objs with coords but unset where
    if (obj.where === OBJ_FLOOR
        || (obj.where == null && obj.ox != null && obj.oy != null
            && !(obj.ox === 0 && obj.oy === 0))) {
        const ox = obj.ox | 0;
        const oy = obj.oy | 0;
        const wasBoulder = obj.otyp === BOULDER;
        const wasTimed = !!(obj.timed | 0);
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
        obj.nobj = null;
        obj.nexthere = null;
        obj.where = OBJ_FREE;
        // C remove_object: if (otmp->timed) obj_timer_checks(otmp, x, y, 0)
        if (wasTimed) obj_timer_checks(obj, ox, oy, 0);
        return;
    } else if (obj.where === OBJ_INVENT) {
        // C invent.c freeinv via obj_extract_self: extract_nobj(&gi.invent)
        const inv = game.invent;
        if (Array.isArray(inv)) {
            const idx = inv.indexOf(obj);
            if (idx >= 0) inv.splice(idx, 1);
        }
        obj.pickup_prev = 0;
        if ((obj.otyp | 0) === FIGURINE && (obj.timed | 0)) {
            stop_timer(FIG_TRANSFORM, obj);
        }
        // C freeinv also update_inventory(); rot_corpse in_invent tail
        // repeats it. Shared extract skips the extra redraw (perm_invent
        // Off default is a no-op).
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
    } else if (obj.where === OBJ_MIGRATING) {
        // C mkobj.c obj_extract_self OBJ_MIGRATING → extract_nobj(&migrating_objs)
        if (game.migrating_objs === obj) {
            game.migrating_objs = obj.nobj || null;
        } else {
            for (let p = game.migrating_objs; p; p = p.nobj) {
                if (p.nobj === obj) {
                    p.nobj = obj.nobj || null;
                    break;
                }
            }
        }
    } else if (obj.where === OBJ_BURIED) {
        // C: extract_nobj(obj, &svl.level.buriedobjlist)
        const lvl = game.level;
        if (lvl) {
            if (lvl.buriedobjlist === obj) {
                lvl.buriedobjlist = obj.nobj || null;
            } else {
                for (let p = lvl.buriedobjlist; p; p = p.nobj) {
                    if (p.nobj === obj) {
                        p.nobj = obj.nobj || null;
                        break;
                    }
                }
            }
        }
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

/** C ref: obj.h is_mines_prize — o_id == achieveo.mines_prize_oid. */
export function is_mines_prize(o) {
    if (!o) return false;
    return (o.o_id | 0) === ((game.context?.achieveo?.mines_prize_oid) | 0);
}

/** C ref: obj.h is_soko_prize — o_id == achieveo.soko_prize_oid. */
export function is_soko_prize(o) {
    if (!o) return false;
    return (o.o_id | 0) === ((game.context?.achieveo?.soko_prize_oid) | 0);
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
export function mkcorpstat(objtype, mtmp, ptr, x, y, corpstatflags) {
    const init = !!(corpstatflags & 8); // CORPSTAT_INIT
    const otmp = (x || y) ? mksobj_at(objtype, x, y, init, false) : mksobj(objtype, init, false);
    if (!otmp) return otmp;
    otmp.spe = (corpstatflags & 0x07); // CORPSTAT_SPE_VAL
    // C: otmp->norevive = gm.mkcorpstat_norevive
    if (game.mkcorpstat_norevive) otmp.norevive = 1;

    // C: when mtmp non-null — save_mtraits + ptr default + cancelled norevive
    if (mtmp) {
        save_mtraits(otmp, mtmp);
        if (ptr == null) ptr = mtmp.data;
        if (mtmp.mcan && ptr && !is_rider(ptr)) otmp.norevive = 1;
    }

    if (ptr != null) {
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

/**
 * C ref: mkobj.c newoextra — allocate oextra bag on obj.
 */
function newoextra(obj) {
    if (!obj.oextra) obj.oextra = {};
    return obj.oextra;
}

/**
 * C ref: mkobj.c newomonst — attach empty monst shell for saved traits.
 */
export function newomonst(otmp) {
    if (!otmp) return;
    newoextra(otmp);
    if (!otmp.oextra.omonst) otmp.oextra.omonst = {};
}

/**
 * C ref: mkobj.c free_omonst — drop saved traits monst.
 */
export function free_omonst(otmp) {
    if (otmp?.oextra?.omonst) {
        otmp.oextra.omonst = null;
        delete otmp.oextra.omonst;
    }
}

/**
 * C ref: mkobj.c newomid — ensure oextra; OMID starts 0 until assigned.
 */
export function newomid(otmp) {
    if (!otmp) return;
    newoextra(otmp);
    if (otmp.oextra.omid == null) otmp.oextra.omid = 0;
}

/**
 * C ref: mkobj.c free_omid — clear corpse↔ghost link.
 */
export function free_omid(otmp) {
    if (otmp?.oextra) otmp.oextra.omid = 0;
}

/**
 * C ref: mkobj.c obj_attach_mid — lasting association corpse↔ghost m_id.
 */
export function obj_attach_mid(obj, mid) {
    if (!mid || !obj) return null;
    newomid(obj);
    obj.oextra.omid = mid | 0;
    return obj;
}

/**
 * C ref: mkobj.c save_mtraits — snapshot live monst onto corpse/statue omonst.
 * Named omit: forget_temple_entry for ispriest (EPRI still copied).
 */
export function save_mtraits(obj, mtmp) {
    if (!obj || !mtmp) return obj;
    // forget_temple_entry(mtmp) deferred for ispriest
    if (!has_omonst(obj)) newomonst(obj);
    if (!has_omonst(obj)) return obj;

    const baselevel = mtmp.data?.mlevel | 0;
    const mtmp2 = OMONST(obj);
    // C: *mtmp2 = *mtmp then invalidate pointers
    const keys = Object.keys(mtmp);
    for (const k of keys) {
        if (k === 'mextra' || k === 'nmon' || k === 'data'
            || k === 'minvent' || k === 'mw' || k === 'edog') continue;
        mtmp2[k] = mtmp[k];
    }
    mtmp2.mextra = null;
    mtmp2.mnum = mtmp.data?.mndx ?? mtmp.mnum ?? 0;
    mtmp2.nmon = null;
    mtmp2.data = null;
    mtmp2.minvent = null;
    mtmp2.mw = null;
    mtmp2.wormno = 0;
    if (mtmp.mextra || mtmp.edog) copy_mextra(mtmp2, mtmp);
    if ((mtmp2.mhpmax | 0) <= baselevel) mtmp2.mhpmax = baselevel + 1;
    if ((mtmp2.mhp | 0) > (mtmp2.mhpmax | 0)) mtmp2.mhp = mtmp2.mhpmax | 0;
    if ((mtmp2.mhp | 0) < 1) mtmp2.mhp = 0;
    mtmp2.mstate = (mtmp2.mstate | 0) & ~MON_DETACH;
    return obj;
}

/**
 * C ref: mkobj.c get_mtraits — pointer into omonst or deep copy.
 * Never insert non-copy result into fmon.
 */
export function get_mtraits(obj, copyof) {
    if (!has_omonst(obj)) return null;
    const mtmp = OMONST(obj);
    if (!mtmp) return null;
    if (copyof) {
        const mnew = {};
        for (const k of Object.keys(mtmp)) {
            if (k === 'mextra' || k === 'edog') continue;
            mnew[k] = mtmp[k];
        }
        mnew.mextra = null;
        if (mtmp.mextra || mtmp.edog) copy_mextra(mnew, mtmp);
        mnew.data = mons(mnew.mnum | 0);
        return mnew;
    }
    mtmp.data = mons(mtmp.mnum | 0);
    return mtmp;
}

/**
 * C ref: mkobj.c corpse_revive_type — corpsenm or omonst.mnum.
 */
export function corpse_revive_type(obj) {
    let revivetype = obj?.corpsenm | 0;
    if (has_omonst(obj)) {
        const mtmp = get_mtraits(obj, false);
        if (mtmp) revivetype = mtmp.mnum | 0;
    }
    return revivetype;
}

/** C objnam.c otense — plural verb if quan!=1, else vtense(null). */
function otense_horn(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/** C objnam.c aobjnam — count + cxname + optional otense verb. */
function aobjnam_horn(otmp, verb) {
    let bp = cxname(otmp);
    if ((otmp?.quan | 0) !== 1) bp = `${otmp.quan} ${bp}`;
    if (verb) bp = `${bp} ${otense_horn(otmp, verb)}`;
    return bp;
}

/** C objnam.c Doname2 — capitalized doname. */
function Doname2_horn(obj) {
    const s = doname(obj);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** C dungeon.c surface — enough for horn drop/hit messages. */
function surface_horn(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? 0;
    if (IS_ALTAR(typ)) return 'altar';
    if (typ === ICE) return 'ice';
    if (typ === ROOM) return 'floor';
    return 'ground';
}

/**
 * C mkobj.c fixup_oil — potion age when otyp changes to/from POT_OIL.
 * source Null → non-oil becoming oil uses MAX_OIL_IN_FLASK (horn/poly).
 */
export function fixup_oil(potion, source) {
    if (!potion) return;
    if (potion.otyp === POT_OIL) {
        if (source && source.otyp === POT_OIL) {
            potion.age = source.age;
        } else {
            potion.age = MAX_OIL_IN_FLASK;
        }
    } else if (source && source.otyp === POT_OIL) {
        if (potion.age === source.age) potion.age = game.moves | 0;
        if ((source.age | 0) < MAX_OIL_IN_FLASK) potion.odiluted = 1;
    }
}

/**
 * C ref: mkobj.c hornoplenty — apply / tip HORN_OF_PLENTY.
 * consume_obj_charge then rn2(13) potion vs food; magic potions reroll
 * rnd_class(POT_BOOZE, POT_WATER) skipping SICKNESS; FOOD_RATION rn2(7)
 * → royal jelly; copy horn BUC; unpaid addtobill; !tipping
 * hold_another_object; tipping targetbox add_to_container else floor
 * dropy / doaltarobj / hitfloor (D-1263). Named omit: update_inventory /
 * perm_invent.
 * @returns {Promise<number>} objects created (0 or 1)
 */
export async function hornoplenty(horn, tipping = false, targetbox = null) {
    const { pline } = await import('./display.js');
    let objcount = 0;

    if (!horn || horn.otyp !== HORN_OF_PLENTY) {
        return 0;
    }
    if ((horn.spe | 0) < 1) {
        await pline(nothing_happens);
        if (!horn.cknown) horn.cknown = 1;
        return 0;
    }

    const { consume_obj_charge } = await import('./invent.js');
    await consume_obj_charge(horn, !tipping);
    let obj;
    let what;
    if (!rn2(13)) {
        obj = mkobj(POTION_CLASS, false);
        if (game.objects?.[obj.otyp]?.oc_magic) {
            do {
                obj.otyp = rnd_class(POT_BOOZE, POT_WATER);
            } while (obj.otyp === POT_SICKNESS);
            if (obj.otyp === POT_OIL) fixup_oil(obj, null);
        }
        what = ((obj.quan | 0) > 1) ? 'Some potions' : 'A potion';
    } else {
        obj = mkobj(FOOD_CLASS, false);
        if (obj.otyp === FOOD_RATION && !rn2(7)) {
            obj.otyp = LUMP_OF_ROYAL_JELLY;
        }
        what = 'Some food';
    }
    objcount++;
    await pline(`${what} ${vtense(what, 'spill')} out.`);
    obj.blessed = horn.blessed ? 1 : 0;
    obj.cursed = horn.cursed ? 1 : 0;
    obj.owt = weight(obj);

    if (horn.unpaid) {
        const { addtobill } = await import('./shk.js');
        await addtobill(obj, false, false, !!tipping);
    }
    if (!game.iflags) game.iflags = {};
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    try {
        const u = game.u || {};
        if (!tipping) {
            const { hold_another_object } = await import('./invent.js');
            const typ = game.level?.at(u.ux | 0, u.uy | 0)?.typ ?? 0;
            const dropFmt = u.uswallow
                ? 'Oops!  %s out of your reach!'
                : (Is_airlevel(u.uz) || Is_waterlevel(u.uz)
                    || typ < IRONBARS || typ >= ICE)
                    ? 'Oops!  %s away from you!'
                    : 'Oops!  %s to the floor!';
            await hold_another_object(
                obj, dropFmt, The(aobjnam_horn(obj, 'slip')), null,
            );
        } else if (targetbox) {
            add_to_container(targetbox, obj);
            targetbox.owt = weight(targetbox);
            if (targetbox.where === OBJ_INVENT) {
                const { encumber_msg } = await import('./invent.js');
                await encumber_msg();
            }
        } else {
            const { dropy, doaltarobj } = await import('./do.js');
            const { can_reach_floor } = await import('./engrave.js');
            if (!can_reach_floor(true)) {
                const { hitfloor } = await import('./dothrow.js');
                await hitfloor(obj, true);
            } else {
                const typ = game.level?.at(u.ux | 0, u.uy | 0)?.typ ?? 0;
                if (IS_ALTAR(typ)) {
                    await doaltarobj(obj);
                } else {
                    await pline(
                        `${Doname2_horn(obj)} ${otense_horn(obj, 'drop')} to the ${
                            surface_horn(u.ux | 0, u.uy | 0)
                        }.`,
                    );
                }
                await dropy(obj);
            }
        }
    } finally {
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    }
    if (horn.dknown) {
        const { makeknown } = await import('./invent.js');
        makeknown(HORN_OF_PLENTY);
    }
    return objcount;
}

export { O as OBJ };
