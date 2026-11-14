// @ts-nocheck
// mkobj.js — Container-fill helpers that mirror nethack-c/src/mklev.c and
// nethack-c/src/mkobj.c logic that mklev.js cannot carry without merge conflicts.
//
// C ref: nethack-c/src/mklev.c:1055-1132 (fill_supply_chest body)
//        nethack-c/src/mkobj.c:2680-2699  (add_to_container)
import { CORPSE, CANDELABRUM_OF_INVOCATION, SCR_SCARE_MONSTER, SPBOOK_FIRST_OTYP } from './const.js';
import { ARMOR_CLASS, FOOD_CLASS, GEM_CLASS, HEAVY_IRON_BALL, POTION_CLASS, POT_EXTRA_HEALING, POT_GAIN_ENERGY, POT_HEALING, POT_SPEED, RING_CLASS, SCROLL_CLASS, SCR_CONFUSE_MONSTER, SCR_ENCHANT_ARMOR, SCR_ENCHANT_WEAPON, SPBOOK_CLASS, SPE_HEALING, TALLOW_CANDLE, WAN_DIGGING, WEAPON_CLASS } from "./const.js"; // shared class/otyp constants
import { rn2 } from './rnd.js';
import { costly_spot, billable, stolen_value } from './shk.js';
import { SHOPBASE } from './const.js';
import { in_rooms } from './hack.js';
import './mklev.js';
import { verbalize } from './pline.js';
import './cmd.js';
import './mklev.js';
import { attach_fig_transform_timeout } from './timeout.js';
import { copy_mextra, dead_species } from './mon.js';
import { impossible } from './pline.js';
import { OBJ_CONTAINED } from './const.js'; // C: obj.h OBJ_CONTAINED
import { permonstTemplate } from './makemon.js';
import { forget_temple_entry } from './priest.js';
import { _cwt } from './weight.js';
import { eaten_stat } from './eat.js';
import { LOW_PM } from './const.js';
import { OC_WEIGHT, OTYP_LARGE_BOX, OTYP_BAG_OF_TRICKS, OTYP_BAG_OF_HOLDING, OTYP_STATUE } from './oc_weight.generated.js';
import corpseData from './eat_corpse_data.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { impossible_sync } from './display.js';
import { simpleonames } from './objnam.js';
import { game } from './gstate.js';
import { weight as weight_w } from './weight.js';
import { newobj } from './game.js';
import { obj_split_timers } from './timeout.js';
import { obj_split_light_source } from './light.js';
import { artifact_light } from './artifact.js';
import { oid_price_adjustment, splitbill } from './shk.js';
import './mklev.js';
import { OBJ_FREE, OBJ_LUAFREE, OBJ_INVENT as _OBJ_INVENT_CA, CONTAINED_TOO, COST_UNCURS, COST_UNBLSS, FIG_TRANSFORM } from './const.js';
function SetVoice(_mon, _a, _b, _c) { /* no sound driver in this port */ }
const LARGEST_INT = 32767; /* C global.h:135 */
const MONS_CWT = /** @type {number[]} */ (corpseData.cwt || []);
/* C monst.h:285 ismnum(): bounded on both ends (const.js ismnum drops the upper bound). */
function _ismnum_cwt(pmidx) {
    return Number.isInteger(pmidx) && pmidx >= LOW_PM && pmidx < MONS_CWT.length;
}
import { COIN_CLASS } from "./const.js"; // objclass.h COIN_CLASS

/* C mkobj.c:1889 weight(obj) — full weight of one object incl. container
 * contents.
 *
 * Unlike C's inv_weight(), which reads the cached otmp->owt, we recompute
 * weight() from objects[].oc_weight because the replay-reconstructed hero
 * inventory carries a placeholder owt (=1), not the live cached value. */
export function weight(obj) {
    if (!obj) return 0;
    const otyp = obj.otyp | 0;
    let wt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;

    /* C mkobj.c:1892,1958,1968: quan stays long through the validity test,
     * corpse product, and coin division; only the coin quotient is cast. */
    if (obj.quan != null && obj.quan < 1) {
        impossible_sync('Calculating weight of %ld %s?', obj.quan, simpleonames(obj));
        return 0; /* C impossible() path */
    }
    /* C: globby → return owt as-is (glob weight managed elsewhere). */
    if (obj.globby) return obj.owt | 0;

    const isContainer = (otyp >= OTYP_LARGE_BOX && otyp <= OTYP_BAG_OF_TRICKS);
    if (isContainer || otyp === OTYP_STATUE) {
        if (otyp === OTYP_STATUE && _ismnum_cwt(obj.corpsenm)) {
            const msize = monMsizePack.msize[obj.corpsenm];
            const minwt = (msize + msize + 1) * 100;
            wt = Math.trunc(3 * _cwt(obj.corpsenm) / 2);
            if (wt < minwt) wt = minwt;
            wt = Math.imul(wt, obj.quan | 0);
        }
        let cwt = 0;
        for (let c = obj.cobj; c; c = c.nobj)
            cwt = (cwt + weight(c)) | 0;
        if (otyp === OTYP_BAG_OF_HOLDING) {
            cwt = obj.cursed ? Math.imul(cwt, 2)
                  : obj.blessed ? Math.trunc(((cwt + 3) | 0) / 4)
                    : Math.trunc(((cwt + 1) | 0) / 2);
        }
        return (wt + cwt) | 0;
    }
    if (otyp === CORPSE && _ismnum_cwt(obj.corpsenm)) {
        const long_wt = obj.quan * _cwt(obj.corpsenm | 0);
        let cwt = (long_wt > LARGEST_INT) ? LARGEST_INT : long_wt;
        if (obj.oeaten | 0)
            cwt = eaten_stat(cwt, obj);
        return cwt;
    }
    if ((obj.oclass | 0) === FOOD_CLASS && (obj.oeaten | 0))
        return eaten_stat(Math.imul(obj.quan, wt), obj);
    if ((obj.oclass | 0) === COIN_CLASS) {
        const cw = Math.trunc((obj.quan + 50) / 100) | 0;
        return Math.max(cw, 1);
    }
    if (otyp === HEAVY_IRON_BALL && (obj.owt | 0) !== 0) {
        return obj.owt | 0;
    }
    if (otyp === CANDELABRUM_OF_INVOCATION && (obj.spe | 0)) {
        return wt + (obj.spe | 0) * (OC_WEIGHT[TALLOW_CANDLE] | 0);
    }
    const quan = obj.quan | 0;
    return wt ? Math.imul(wt, quan) : ((quan + 1) >> 1);
}


/* C mkobj.c curse()/unbless() side-effect arms, each imported from the file that
 * already holds its one real body: */
import { confers_luck } from './attrib.js';   /* artifact.c:524 */
import { obj_to_any } from './hack.js';
import { set_moreluck } from './attrib.js';
import { drop_uswapwep } from './wield.js'; /* attrib.c / wield.c */
import { stop_timer } from './timeout.js';
import { arti_light_radius } from './light.js';
import { bimanual, reset_remarm } from './do_wear.js'; /* mondata.h:69 / do_wear.c */
import { book_cursed } from './spell.js';     /* spell.c:2093 */
import { cansee, Blind } from './vision.js';
import { pline, You_see, You_hear } from './pline.js';
import { Your } from './do_wear.js';
import { makeplural, obj_typename } from './objnam.js';
import { oname } from './do_name.js';
import { HALLUC, HALLUC_RES, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, MON_DETACH, ONAME_SKIP_INVUPD } from './const.js';
import './mklev.js'; // relocate-fns
import { Yname2 } from './objnam.js'; // relocate-fns
import { PLNMSG_OBJ_GLOWS } from './const.js'; // relocate-fns
import { obj_adjust_light_radius } from './light.js'; // relocate-fns
import { otense } from './objnam.js'; // relocate-fns
import { get_obj_location } from './zap.js'; // relocate-fns
import { POT_OIL } from './const.js';
import { stop_occupation } from './allmain.js'; // relocate-fns
import { obj_extract_self_general } from './cmd.js';
import { useupall } from './invent.js'; // relocate-fns
import { OBJ_MIGRATING } from './const.js'; // relocate-fns
import { obfree } from './dokick.js'; // relocate-fns
import { maybe_unhide_at } from './mon.js'; // relocate-fns
import { remove_worn_item } from './steal.js'; // relocate-fns
import { setmnotwielded } from './weapon.js'; // relocate-fns
import { doname } from './objnam.js'; // relocate-fns

// C mkobj.c:113: both gameplay callers overwrite the allocated monst before
// reading it (copy_oextra/save_mtraits). No monster ID or RNG is allocated.
function newomonst(obj) {
    obj.oextra ||= newoextra();
    obj.oextra.omonst ||= {};
}

// C mkobj.c:150. Splitting a stack must not duplicate a ghost association.
export function free_omid(obj) {
    obj.oextra.omid = 0;
    if ('oextra_omid' in obj)
        obj.oextra_omid = 0;
}

// C mkobj.c:156-173. Strings are immutable; replacing the reference is free().
function free_omailcmd(obj) {
    if (obj.oextra?.omailcmd)
        obj.oextra.omailcmd = null;
}
function new_omailcmd(obj, response_cmd) {
    obj.oextra ||= newoextra();
    if (obj.oextra.omailcmd)
        free_omailcmd(obj);
    obj.oextra.omailcmd = response_cmd;
}

// A C struct copy owns its embedded coordinates, but retains pointer fields.
// monst.h:119,190: mtrack[] and mgoal are values, not monster/object pointers.
function copy_monster_traits(dest, src) {
    Object.assign(dest, src);
    if (src.mtrack)
        dest.mtrack = src.mtrack.map(coord => ({ ...coord }));
    if (src.mgoal)
        dest.mgoal = { ...src.mgoal };
    dest.mextra = null;
    if (src.mextra)
        copy_mextra(dest, src);
}

// C mkobj.c:416-448: independent extras for split stacks and shop bill copies.
export async function copy_oextra(dest, src) {
    if (!dest || !src || !src.oextra)
        return;
    dest.oextra ||= newoextra();
    if (src.oextra.oname)
        await oname(dest, src.oextra.oname, ONAME_SKIP_INVUPD);
    if (src.oextra.omonst) {
        newomonst(dest);
        copy_monster_traits(dest.oextra.omonst, src.oextra.omonst);
        dest.oextra.omonst.nmon = null;
    }
    if (src.oextra.omailcmd)
        new_omailcmd(dest, src.oextra.omailcmd);
    if (src.oextra.omid) {
        if (!dest.oextra.omid)
            newomid(dest);
        dest.oextra.omid = src.oextra.omid;
        if ('oextra_omid' in dest)
            dest.oextra_omid = src.oextra.omid;
    }
}

// C mkobj.c:683-695: return the outermost unknown enclosing container.
export function unknwn_contnr_contents(obj) {
    let result = null;
    while (obj.where === OBJ_CONTAINED) {
        obj = obj.ocontainer;
        if (!obj.cknown)
            result = obj;
    }
    return result;
}

// C mkobj.c:1977-2000; same object indices as dig.js's rnd_treefruit_at.
export function is_treefruit(obj) {
    return [277, 278, 279, 281, 276].includes(obj.otyp);
}

import { MAX_OIL_IN_FLASK } from './const.js';
import { _HOP_FOOD_CLASS, _HOP_HORN_OF_PLENTY, _HOP_POTION_CLASS, _IA_TALLOW_CANDLE_OTYP, _IA_WAX_CANDLE_OTYP, _doaltarobj_Doname2, _levlAt, nothing_happens } from './cmd.js';
import { consume_obj_charge } from './invent.js'; // relocate-fns
import { ICE, IRONBARS, IS_ALTAR, Is_airlevel, Is_waterlevel, OBJ_DELETED } from './const.js'; // relocate-fns
import { doaltarobj, dropy } from './do.js'; // relocate-fns
import { encumber_msg } from './do_wear.js'; // relocate-fns
import { hitfloor } from './dothrow.js'; // relocate-fns
import { surface } from './dungeon.js'; // relocate-fns
import { can_reach_floor } from './engrave.js'; // relocate-fns
import { hold_another_object } from './invent.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { makeknown } from './makemon.js'; // relocate-fns
import { rnd_class } from './objnam.js'; // relocate-fns
import { MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js'; // relocate-fns
import { The, aobjnam, vtense } from './objnam.js'; // relocate-fns
import { impossible as real_impossible } from './pline.js'; // relocate-fns
import { addtobill as shk_addtobill, alter_cost as shk_alter_cost, shop_keeper as shk_shop_keeper, subfrombill as shk_subfrombill, unpaid_cost as shk_unpaid_cost } from './shk.js'; // relocate-fns
import { rndmonnumAdj } from './makemon.js'; // relocate-fns
import { artifact_exists, mk_artifact, nartifact_exist } from './artifact.js'; // relocate-fns
import { freeinv } from './invent.js'; // relocate-fns
import { AMULET_CLASS, CORPSTAT_FEMALE, CORPSTAT_INIT, CORPSTAT_MALE, CORPSTAT_NEUTER, CORPSTAT_SPE_VAL, FIRE_RES, G_GONE, HATCH_EGG, In_quest, Is_rogue_level, LS_OBJECT, MIGR_TO_SPECIES, OBJ_BURIED, OBJ_ONBILL, REVIVE_MON, ROT_AGE, ROT_CORPSE, SHRINK_GLOB, TAINT_AGE, TIMER_OBJECT, TOOL_CLASS, TROLL_REVIVE_CHANCE, WAND_CLASS, ZOMBIFY_MON } from './const.js'; // relocate-fns
import { is_ice } from './dbridge.js'; // relocate-fns
import { obj_no_longer_held } from './do.js'; // relocate-fns
import { noveltitle, safe_oname } from './do_name.js'; // relocate-fns
import { In_hell, depth as depth_of_level, level_difficulty } from './dungeon.js'; // relocate-fns
import { mons_cnutrit } from './food_props.js'; // relocate-fns
import { freed_obj_chunks } from './game.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { merged } from './invent.js'; // relocate-fns
import { del_light_source } from './light.js'; // relocate-fns
import { maybe_reset_pick } from './lock.js'; // relocate-fns
import { BOULDER, NON_PM, TIN, levelDifficulty } from './makemon.js'; // relocate-fns
import { AMULET_OF_STRANGULATION, A_NONE, BAG_OF_HOLDING, BELL_OF_OPENING, BRASS_LANTERN, CHEST, EGG, FIGURINE, GLOB_OF_BLACK_PUDDING, GLOB_OF_GREEN_SLIME, GOLD_PIECE, G_NOCORPSE, ICE_BOX, KELP_FROND, LARGE_BOX, LEASH, M2_FEMALE, M2_MALE, M2_NEUTER, MAGIC_LAMP, MONS_ROWS, OC_MERGE, OC_USES_KNOWN, OIL_LAMP, ONAME_NO_FLAGS, PM_DEATH, PM_HUMAN, PM_LICHEN, PM_LIZARD, POT_WATER, RANDOM_CLASS, ROCK, ROCK_CLASS, SLIME_MOLD, SPE_NOVEL, STATUE, S_TROLL, UNICORN_HORN, WAN_LIGHT, WAX_CANDLE, WOOD, WORM_TOOTH, _gm_migrating, is_corrodeable, is_crackable, is_damageable, is_rider_pm, is_rustprone, mons_is_human, mvitals_mvflags, obj_oc_material, obj_sheds_light_mp, special_corpse, uroleMnum } from './mklev.js';
import { erosion_matters } from './objnam.js'; // relocate-fns
import { MKOBJ_OCLASS_PROB_TOTALS, MKOBJ_OC_CLASS, MKOBJ_OC_PROB, MKOBJ_SVB_BASES } from './mkobj_data.js'; // relocate-fns
import { MKOBJ_OC_OPROP, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js'; // relocate-fns
import { can_be_hatched, dealloc_mextra, undead_to_corpse, zombie_form } from './mon.js'; // relocate-fns
import { isWanNothingNodir, oinit } from './o_init.js'; // relocate-fns
import { objName } from './objnam.js'; // relocate-fns
import { init_fruit_chain } from './options.js'; // relocate-fns
import { impossible as lifecycle_impossible } from './pline.js'; // relocate-fns
import { PM_ARCHEOLOGIST, PM_GRAY_OOZE as PM_GRAY_OOZE_MK, PM_WIZARD } from './pm.generated.js'; // relocate-fns
import { pushRngLogEntry, rn1 } from './rng.js';
import { rnd, rne, rnz } from './rnd.js'; // relocate-fns
import { rloco } from './teleport.js'; // relocate-fns
import { attach_egg_hatch_timeout, obj_stop_timers, start_timer } from './timeout.js'; // relocate-fns
import { tt_oname } from './topten.js'; // relocate-fns
import { block_point, recalc_block_point } from './vision.js'; // relocate-fns
import { extract_from_minvent } from './worn.js'; // relocate-fns
// C mkobj.c:2024-2048. Oil age is remaining fuel; other ages are birth turns.
export function fixup_oil(potion, source) {
    if (potion.otyp === POT_OIL) {
        potion.age = source?.otyp === POT_OIL ? source.age : MAX_OIL_IN_FLASK;
    } else if (source?.otyp === POT_OIL) {
        if (potion.age === source.age)
            potion.age = game.moves;
        if (source.age < MAX_OIL_IN_FLASK)
            potion.odiluted = 1;
    }
}

// C mkobj.c:2146-2153: associate a corpse with its ghost.
export function obj_attach_mid(obj, mid) {
    if (!mid || !obj)
        return null;
    newomid(obj);
    obj.oextra.omid = mid;
    obj.oextra_omid = mid;
    return obj;
}

// C mkobj.c:2156-2193: preserve revival traits, not live list membership.
export function save_mtraits(obj, mon) {
    if (mon.ispriest)
        forget_temple_entry(mon);
    newomonst(obj);
    const data = mon.data ?? permonstTemplate(mon.mndx ?? mon.mnum);
    const saved = obj.oextra.omonst;
    copy_monster_traits(saved, mon);
    saved.mnum = data.pmidx;
    saved.nmon = saved.data = saved.minvent = saved.mw = null;
    saved.wormno = 0;
    if (saved.mhpmax <= data.mlevel)
        saved.mhpmax = data.mlevel + 1;
    if (saved.mhp > saved.mhpmax)
        saved.mhp = saved.mhpmax;
    if (saved.mhp < 1)
        saved.mhp = 0;
    saved.mstate = (saved.mstate | 0) & ~MON_DETACH;
    return obj;
}

// C mkobj.c:2200-2220. The borrowed form must never enter a monster chain.
export function get_mtraits(obj, copyof) {
    const saved = obj.oextra?.omonst;
    if (!saved)
        return null;
    let mon = saved;
    if (copyof) {
        mon = {};
        copy_monster_traits(mon, saved);
    }
    mon.data = permonstTemplate(mon.mnum);
    return mon;
}
// ── Object-type constants ────────────────────────────────────────────────────
// All values must match the otyp indices baked into the C build this JS mirrors.
// Object-class constants (oclass values, not otyp)
/** C: SPBOOK_no_NOVEL — mkobj() uses negative oclass to exclude SPE_NOVEL */
export const SPBOOK_no_NOVEL = -10; // 0 - (int)SPBOOK_CLASS
// ── oc_level table for spellbooks ───────────────────────────────────────────
// C ref: nethack-c/include/objects.h SPELL macro 6th param; objclass.h:104
//   #define oc_level oc_oc2
// Spellbooks start at otyp 366 (SPE_DIG = FIRST_SPELL) in this build.
// The 42 entries correspond to otyp 366-407 (SPE_DIG ... SPE_BLANK_PAPER).
// Index i in this array => otyp (366 + i).
// Source: objects.h SPELL rows, column 6 (the "level" field).
const SPBOOK_OC_LEVEL = new Uint8Array([
    /*366 SPE_DIG            */ 5,
    /*367 SPE_MAGIC_MISSILE  */ 2,
    /*368 SPE_FIREBALL       */ 4,
    /*369 SPE_CONE_OF_COLD   */ 4,
    /*370 SPE_SLEEP          */ 3,
    /*371 SPE_FINGER_OF_DEATH*/ 7,
    /*372 SPE_LIGHT          */ 1,
    /*373 SPE_DETECT_MONSTERS*/ 1,
    /*374 SPE_HEALING        */ 1,
    /*375 SPE_KNOCK          */ 1,
    /*376 SPE_FORCE_BOLT     */ 1,
    /*377 SPE_CONFUSE_MONSTER*/ 1,
    /*378 SPE_CURE_BLINDNESS */ 2,
    /*379 SPE_DRAIN_LIFE     */ 2,
    /*380 SPE_SLOW_MONSTER   */ 2,
    /*381 SPE_WIZARD_LOCK    */ 2,
    /*382 SPE_CREATE_MONSTER */ 2,
    /*383 SPE_DETECT_FOOD    */ 2,
    /*384 SPE_CAUSE_FEAR     */ 3,
    /*385 SPE_CLAIRVOYANCE   */ 3,
    /*386 SPE_CURE_SICKNESS  */ 3,
    /*387 SPE_CHARM_MONSTER  */ 5,
    /*388 SPE_HASTE_SELF     */ 3,
    /*389 SPE_DETECT_UNSEEN  */ 3,
    /*390 SPE_LEVITATION     */ 4,
    /*391 SPE_EXTRA_HEALING  */ 3,
    /*392 SPE_RESTORE_ABILITY*/ 4,
    /*393 SPE_INVISIBILITY   */ 4,
    /*394 SPE_DETECT_TREASURE*/ 4,
    /*395 SPE_REMOVE_CURSE   */ 3,
    /*396 SPE_MAGIC_MAPPING  */ 5,
    /*397 SPE_IDENTIFY       */ 3,
    /*398 SPE_TURN_UNDEAD    */ 6,
    /*399 SPE_POLYMORPH      */ 6,
    /*400 SPE_TELEPORT_AWAY  */ 6,
    /*401 SPE_CREATE_FAMILIAR*/ 6,
    /*402 SPE_CANCELLATION   */ 7,
    /*403 SPE_PROTECTION     */ 1,
    /*404 SPE_JUMPING        */ 1,
    /*405 SPE_STONE_TO_FLESH */ 3,
    /*406 SPE_CHAIN_LIGHTNING*/ 2,
    /*407 SPE_BLANK_PAPER    */ 0,
]);
/**
 * Return objects[otyp].oc_level for a spellbook.
 * C ref: nethack-c/include/objclass.h:104  #define oc_level oc_oc2
 * Returns 0 for any otyp outside the spellbook range (safe fallback).
 */
function spbook_oc_level(otyp) {
    const idx = (otyp | 0) - SPBOOK_FIRST_OTYP;
    if (idx < 0 || idx >= SPBOOK_OC_LEVEL.length)
        return 0;
    return SPBOOK_OC_LEVEL[idx];
}
// ── fill_supply_chest ────────────────────────────────────────────────────────
export async function fill_supply_chest(supply_chest, dlevel) {
    // C mklev.c:1055  supply_chest->olocked = !!(rn2(6));
    supply_chest.olocked = !!rn2(6);
    // C mklev.c:1057-1089 — do { ... } while (cursed || !rn2(5))
    // Guarantee at least one non-cursed supply item; reroll cursed items
    // (each cursed item is still added; loop continues until non-cursed + rn2(5)!=0).
    const supply_items = [
        POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING,
    ];
    let tryct = 0;
    let cursed;
    do {
        // C mklev.c:1071  otyp = rn2(2) ? POT_HEALING : ROLL_FROM(supply_items);
        const otyp = rn2(2) ? POT_HEALING : supply_items[rn2(supply_items.length)];
        const otmp = await mksobj(otyp, true, false);
        // C mklev.c:1073-1076
        if (otyp === POT_HEALING && rn2(2)) {
            otmp.quan = 2;
            otmp.owt = weight(otmp); // C mklev.c:1067: quantity changed above.
        }
        cursed = !!(otmp && otmp.cursed);
        // C mklev.c:1078  add_to_container(supply_chest, otmp);
        if (otmp)
            await add_to_container(supply_chest, otmp); /* invent.c add_to_container: merged() scan */
        // C mklev.c:1080-1084
        if (++tryct === 50) {
            await impossible("couldn't generate supply chest item");
            break;
        }
    } while (cursed || !rn2(5));
    // C mklev.c:1094-1129 — maybe add one extra random item biased toward
    // low-level spellbooks; avoid tools (chests don't fit in other chests).
    if (rn2(3)) {
        const extra_classes = [
            FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
            SCROLL_CLASS, POTION_CLASS, RING_CLASS,
            SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL,
        ];
        const oclass = extra_classes[rn2(extra_classes.length)];
        let otmp = await mkobj(oclass, false);
        if (oclass === SPBOOK_no_NOVEL && otmp) {
            // C mklev.c:1110-1126 — bias towards lower level by generating again
            // and taking the lower-level book; repeat maxpass times.
            // C: int pass, maxpass = (depth(&u.uz) > 2) ? 2 : 3;
            const maxpass = (dlevel | 0) > 2 ? 2 : 3;
            for (let pass = 1; pass <= maxpass; pass++) {
                const otmp2 = await mkobj(oclass, false);
                // C mklev.c:1119-1125:
                //   if objects[otmp->otyp].oc_level <= objects[otmp2->otyp].oc_level
                //       dealloc_obj(otmp2); else { dealloc_obj(otmp); otmp = otmp2; }
                if (spbook_oc_level(otmp.otyp) <= spbook_oc_level(otmp2.otyp)) {
                    await dealloc_obj(otmp2);
                } else {
                    await dealloc_obj(otmp);
                    otmp = otmp2;
                }
            }
        }
        // C mklev.c:1128  add_to_container(supply_chest, otmp);
        if (otmp)
            await add_to_container(supply_chest, otmp); /* invent.c add_to_container: merged() scan */
    }
    // C mklev.c:1132  supply_chest->owt = weight(supply_chest);
    // js/weight.js:53 is a full port of C mkobj.c weight(), including the
    // container branch that sums weight() over the cobj chain — the older
    // comment here claimed it was "stubbed to return owt||1" and wrote a
    // literal 1 in its place.  That placeholder is what js/weight.js's own
    // header still apologises for ("the replay-reconstructed hero inventory
    // carries a placeholder owt (=1)"); call the real thing.
    supply_chest.owt = weight(supply_chest);
}

const _BC_COIN_CLASS = 12;      /* objclass.h COIN_CLASS  (js/mklev.js:271) */
const _BC_SPBOOK_CLASS = 10;    /* objclass.h SPBOOK_CLASS (js/mklev.js:269) */
const _BC_BAG_OF_HOLDING = 219; /* objects.h  (js/mklev.js:319) */
const _BC_FIGURINE = 241;       /* objects.h  (js/mklev.js:182) */

/* C obj.h:332: ownership is determined by where, not chain membership. */
function _bc_carried(obj) {
    return obj.where === OBJ_INVENT;
}
/* C mkobj.c:1745-1764 bless(), including inventory, timer, and light updates. */
export async function bless(otmp) {
    if ((otmp.oclass | 0) === _BC_COIN_CLASS)
        return;
    const old_light = otmp.lamplit ? arti_light_radius(otmp) : 0;
    otmp.cursed = 0;
    otmp.blessed = 1;
    if (_bc_carried(otmp) && confers_luck(otmp))
        set_moreluck();
    else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    else if ((otmp.otyp | 0) === _BC_FIGURINE && otmp.timed)
        stop_timer(FIG_TRANSFORM, obj_to_any(otmp));
    if (otmp.lamplit)
        await maybe_adjust_light(otmp, old_light);
}

/* C mkobj.c:1766-1780 unbless(struct obj *otmp). */
export async function unbless(otmp) {
    if (!otmp)
        return;
    const old_light = otmp.lamplit ? arti_light_radius(otmp) : 0;
    otmp.blessed = 0;
    if (_bc_carried(otmp) && confers_luck(otmp))
        set_moreluck();
    else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    if (otmp.lamplit)
        await maybe_adjust_light(otmp, old_light);
}

/* C mkobj.c:1818-1839 uncurse(struct obj *otmp) — the third member of the same
 * family, added here (rather than as a seventh hand-written copy) for the same
 * reason the two above live here: zap.c's cancel_item() ends in
 * `unbless(obj); uncurse(obj);` and had no shared body to call.
 *
 *     otmp->cursed = 0;
 *     if (carried(otmp) && confers_luck(otmp))  set_moreluck();
 *     else if (otmp->otyp == BAG_OF_HOLDING)    otmp->owt = weight(otmp);
 *     else if (otmp->otyp == FIGURINE && otmp->timed)
 *         (void) stop_timer(FIG_TRANSFORM, obj_to_any(otmp));
 *
 * C mkobj.c:1824-1837 also updates artifact light and stops figurine timers. */
export async function uncurse(otmp) {
    if (!otmp)
        return;
    const old_light = otmp.lamplit ? arti_light_radius(otmp) : 0;
    otmp.cursed = 0;
    if (_bc_carried(otmp) && confers_luck(otmp))
        set_moreluck();
    else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    else if ((otmp.otyp | 0) === _BC_FIGURINE && otmp.timed) {
        stop_timer(FIG_TRANSFORM, obj_to_any(otmp));
    }
    if (otmp.lamplit)
        await maybe_adjust_light(otmp, old_light);
}

/* C mkobj.c:1781-1817 curse(struct obj *otmp). */
export async function curse(otmp) {
    if (!otmp)
        return;
    if ((otmp.oclass | 0) === _BC_COIN_CLASS)
        return;                                       /* C:1788-1789 */
    const old_light = otmp.lamplit ? arti_light_radius(otmp) : 0;
    const already_cursed = !!otmp.cursed;             /* C:1792 */
    otmp.blessed = 0;
    otmp.cursed = 1;
    /* C:1795-1797 — welded two-handed weapon interferes with some armor
     * removal. */
    if (otmp === game.u?.uwep && bimanual(game.u.uwep))
        reset_remarm();
    if (otmp === game.u?.uswapwep && game.u.twoweap)
        await drop_uswapwep();
    if (_bc_carried(otmp) && confers_luck(otmp)) {    /* C:1803-1804 */
        set_moreluck();
    } else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING) {
        otmp.owt = weight(otmp);
    } else if ((otmp.otyp | 0) === _BC_FIGURINE) {
        /* C:1807-1810 — a cursed figurine of a still-living species that is
         * carried (by hero or monster) gets a transform timer. */
        if ((otmp.corpsenm | 0) >= 0 && otmp.corpsenm != null
            && !dead_species(otmp.corpsenm | 0, true)
            && (_bc_carried(otmp) || otmp.where === OBJ_MINVENT))
            attach_fig_transform_timeout(otmp);
    } else if ((otmp.oclass | 0) === _BC_SPBOOK_CLASS) {
        /* if book hero is reading becomes cursed, interrupt */
        if (!already_cursed)
            await book_cursed(otmp);
    }
    if (otmp.lamplit)
        await maybe_adjust_light(otmp, old_light);
}

const se_faint_sloshing = 0; /* sounds.h enum */
function Soundeffect(se, vol) { /* C sndprocs.h:272 no-op without USER_SOUNDS */ }

/* C mkobj.c:3816-3849 pudding_merge_message(): give a message if hero
 * notices two globs merging. */
export async function pudding_merge_message(otmp, otmp2) {
    const u = game.u || {};
    const visible = cansee(otmp.ox | 0, otmp.oy | 0)
        || cansee(otmp2.ox | 0, otmp2.oy | 0);
    const onfloor = (otmp.where | 0) === OBJ_FLOOR || (otmp2.where | 0) === OBJ_FLOOR;
    const inpack = (otmp.where | 0) === OBJ_INVENT || (otmp2.where | 0) === OBJ_INVENT;
    const hp = u.uprops && u.uprops[HALLUC];
    const res = u.uprops?.[HALLUC_RES];
    const hallu = !!(hp?.intrinsic && !(res?.intrinsic || res?.extrinsic));

    if ((!Blind() && visible) || inpack) {
        if (hallu) {
            if (onfloor)
                await You_see('parts of the floor melting!');
            else if (inpack)
                await Your('pack reaches out and grabs something!');
        } else if (onfloor || inpack) {
            const adj = ((otmp.ox | 0) !== (u.ux | 0) || (otmp.oy | 0) !== (u.uy | 0))
                && ((otmp2.ox | 0) !== (u.ux | 0) || (otmp2.oy | 0) !== (u.uy | 0));
            await pline('The %s%s coalesce%s.',
                        (onfloor && adj) ? 'adjacent ' : '',
                        makeplural(obj_typename(otmp.otyp | 0)),
                        inpack ? ' inside your pack' : '');
        }
    } else {
        Soundeffect(se_faint_sloshing, 25);
        await You_hear('a faint sloshing sound.');
    }
}


const _TREEFRUITS = [277 /* APPLE */, 278 /* ORANGE */, 279 /* PEAR */,
                     281 /* BANANA */, 276 /* EUCALYPTUS_LEAF */];

export async function rnd_treefruit_at(x, y) {
    return await mksobj_at(_TREEFRUITS[rn2(_TREEFRUITS.length)], x, y, true, false);
}

/* C mkobj.c:1704-1738, used by polyself.c:1967 when scales become armor.
 * Keep the radius change and its message together at the light-source owner. */
export async function maybe_adjust_light(obj, old_range) {
    const new_range = arti_light_radius(obj), delta = new_range - old_range;
    if (delta) {
        await obj_adjust_light_radius(obj, new_range);
        const ox = { value: 0 }, oy = { value: 0 };
        if (!Blind() && get_obj_location(obj, ox, oy, 0)) {
            let buf = '';
            if (game.iflags.last_msg === PLNMSG_OBJ_GLOWS)
                buf = obj.quan === 1 ? 'It' : 'They';
            else if (obj.where === OBJ_INVENT || cansee(ox.value, oy.value))
                buf = Yname2(obj);
            if (buf)
                await pline('%s %s %s%s.', buf, otense(obj, 'shine'),
                    Math.abs(delta) > 1 ? 'much ' : '',
                    delta > 0 ? 'brighter' : 'less brightly');
        }
    }
}

/* C mkobj.c:1672 shrinking_glob_gone — a glob has shrunk away to nothing. */
export async function shrinking_glob_gone(obj) {
    const where = obj.where | 0;
    if (where === OBJ_INVENT) {
        if (obj.owornmask) {
            await remove_worn_item(obj, false);
            await stop_occupation();
        }
        await useupall(obj);
        return;
    }
    if (where === OBJ_MIGRATING)
        obj.owornmask = 0;
    else if (where === OBJ_MINVENT && obj.owornmask && obj.ocarry?.mw === obj)
        setmnotwielded(obj.ocarry, obj);
    obj_extract_self_general(obj);
    if (where === OBJ_FLOOR)
        maybe_unhide_at(obj.ox | 0, obj.oy | 0);
    await obfree(obj, null);
}

function _splitobj_panic(msg) { throw new Error(`panic: ${msg}`); }

// C ref: mkobj.c:536-552 nextoid(oldobj, newobj) — pick an o_id for the split
// stack that preserves any shop price adjustment, then advance context.ident
// (rnd(2), via next_ident) for the next allocation.
// EXPORTED because js/cmd.js's hand-inlined dothrow.c:257 split arm needs the
// SAME body: it used to model nextoid as a bare `context.ident += rnd(2)`,
// which silently drops the price-adjustment search loop (see the commit that
// exported this).  One body, not two.
export function nextoid(oldobj, newobj) {
    const g = game;
    if (g.context == null)
        g.context = {};
    let oid = ((g.context.ident | 0) - 1) >>> 0;
    const olddif = oid_price_adjustment(oldobj, oldobj.o_id | 0);
    let trylimit = 256, newdif;
    do {
        oid = (oid + 1) >>> 0;
        if (!oid)
            oid = (oid + 1) >>> 0;
        newdif = oid_price_adjustment(newobj, oid);
        trylimit--;
    } while (newdif !== olddif && trylimit >= 0);
    g.context.ident = oid;
    void next_ident();
    return oid;
}

// C ref: light.c:761-766 obj_sheds_light(obj) → obj_is_burning(obj) =
// obj->lamplit && (ignitable(obj) || artifact_light(obj)).
// The truthy-lamplit branch used to throw on the grounds that ignitable/
// artifact_light "aren't ported"; artifact_light IS ported now (js/light.js,
// landed with begin_burn), and ignitable is obj.h's otyp macro, so the whole
// predicate is answerable.  otyps from js/oc_name_data.js OC_NAME:
// 224 tallow candle, 225 wax candle, 226 brass lantern, 227 oil lamp,
// 228 magic lamp, 262 Candelabrum of Invocation, 321 oil (POT_OIL).
const _SL_TALLOW_CANDLE = 224, _SL_WAX_CANDLE = 225, _SL_BRASS_LANTERN = 226,
      _SL_OIL_LAMP = 227, _SL_MAGIC_LAMP = 228, _SL_CANDELABRUM = 262,
      _SL_POT_OIL = 321;
/* C obj.h:429-433 ignitable(otmp). */
function _splitobj_ignitable(obj) {
    const t = obj.otyp | 0;
    return t === _SL_BRASS_LANTERN || t === _SL_OIL_LAMP
        || (t === _SL_MAGIC_LAMP && (obj.spe | 0) > 0)
        || t === _SL_CANDELABRUM || t === _SL_TALLOW_CANDLE
        || t === _SL_WAX_CANDLE || t === _SL_POT_OIL;
}
function _splitobj_shedsLight(obj) {
    if (!obj.lamplit)
        return false;
    return _splitobj_ignitable(obj) || artifact_light(obj);
}

// game.fobj/game.invent (same o_id, different JS instance), so match chain
// nodes by o_id as a fallback to reference equality — same convention as
// js/mklev.js remove_object's extract_nobj matched-node splice.
function _splitobj_linkRealChain(obj, otmp) {
    const where = obj.where | 0;
    let head = null;
    if (where === OBJ_FLOOR)
        head = game.fobj;
    else if (where === OBJ_INVENT)
        head = game.invent;
    else
        return;
    for (let o = head; o; o = o.nobj) {
        if (o === obj)
            return;
        if (o.o_id === obj.o_id) {
            otmp.nobj = o.nobj;
            o.nobj = otmp;
            return;
        }
    }
}

// C ref: mkobj.c:458-503 splitobj(obj, num) — split `num` off obj into a
// fresh object inserted just after it in whatever chain obj is on.
export async function splitobj(obj, num) {
    if (obj.cobj || num <= 0 || obj.quan <= num)
        _splitobj_panic(`splitobj [cobj=${obj.cobj ? 'non-empty container' : '(null)'} num=${num} quan=${obj.quan}]`);

    const otmp = newobj(obj);
    otmp.oextra = null;
    otmp.o_id = nextoid(obj, otmp);
    otmp.timed = 0;
    otmp.lamplit = 0;
    otmp.owornmask = 0;
    obj.quan = obj.quan - num;
    obj.owt = weight_w(obj);
    otmp.quan = num;
    otmp.owt = weight_w(otmp);
    otmp.lua_ref_cnt = 0;
    otmp.pickup_prev = 0;

    game.context = game.context || {};
    game.context.objsplit = { parent_oid: obj.o_id, child_oid: otmp.o_id };
    obj.nobj = otmp;
    _splitobj_linkRealChain(obj, otmp);
    if ((obj.where | 0) === OBJ_FLOOR)
        obj.nexthere = otmp;
    /* lua isn't tracking the split off portion even if it happens to be
     * tracking the original */
    if ((otmp.where | 0) === OBJ_LUAFREE)
        otmp.where = OBJ_FREE;
    if (obj.unpaid)
        await splitbill(obj, otmp);
    await copy_oextra(otmp, obj);
    if (otmp.oextra?.omid) free_omid(otmp);
    if (obj.timed)
        obj_split_timers(obj, otmp);
    if (_splitobj_shedsLight(obj))
        obj_split_light_source(obj, otmp);
    return otmp;
}



const COSTLY_ALTERATION_VERBS = [
    'cancel', 'drain', 'uncharge', 'unbless', 'uncurse', 'disenchant',
    'degrade', 'dilute', 'erase', 'burn', 'neutralize', 'destroy', 'splatter',
    'bite', 'open', 'break the lock on', 'rust', 'rot', 'tarnish', 'crack',
];
export async function costly_alteration(obj, alter_type) {
    const u = game.u || {};

    if (alter_type < 0 || alter_type >= COSTLY_ALTERATION_VERBS.length) {
        await impossible("invalid alteration type (%d)", alter_type);
        alter_type = 0;
    }

    let ox = 0, oy = 0, objroom = 0;
    let shkp = null;
    if ((obj.where | 0) === _OBJ_INVENT_CA /* carried() */
        || (obj.where | 0) === OBJ_FREE) {
        /* OBJ_FREE catches obj_no_longer_held()'s crysknife -> worm-tooth
           transformation; the item has left inventory but not necessarily
           landed yet, and 'unpaid' survives the move. */
        if (!obj.unpaid)
            return;
    } else {
        const xp = {}, yp = {};
        if (!get_obj_location(obj, xp, yp, CONTAINED_TOO)) {
            xp.value = u.ux | 0;
            yp.value = u.uy | 0;
        }
        ox = xp.value | 0;
        oy = yp.value | 0;
        if (!costly_spot(ox, oy))
            return;
        objroom = in_rooms(ox, oy, SHOPBASE)[0] | 0;
        const shkpBox = { value: null };
        if (!(await billable(shkpBox, obj, objroom, false)))
            return;
        shkp = shkpBox.value;
    }

    const quan = obj.quan ?? 1;
    const those = quan === 1 ? 'that' : 'those';
    const them = quan === 1 ? 'it' : 'them';

    /* learn_bknown = (alter_type == COST_UNCURS || alter_type == COST_UNBLSS) */
    const learn_bknown = (alter_type === COST_UNCURS || alter_type === COST_UNBLSS);

    switch (obj.where | 0) {
    case OBJ_FREE: /* obj_no_longer_held() */
    case _OBJ_INVENT_CA:
        if (learn_bknown)
            set_bknown(obj, 1);
        if (shkp)
            SetVoice(shkp, 0, 80, 0);
        await verbalize(`You ${COSTLY_ALTERATION_VERBS[alter_type]} ${those} `
            + `${simpleonames(obj)}, you pay for ${them}!`);
        await bill_dummy_object(obj);
        break;
    case OBJ_FLOOR:
        if (learn_bknown)
            obj.bknown = 1;
        if (costly_spot(u.ux | 0, u.uy | 0)
            && objroom === (u.ushops ? u.ushops.charCodeAt(0) : 0)) {
            if (shkp)
                SetVoice(shkp, 0, 80, 0);
            await verbalize(`You ${COSTLY_ALTERATION_VERBS[alter_type]} ${those}, `
                + `you pay for ${them}!`);
            await bill_dummy_object(obj);
        } else {
            await stolen_value(obj, ox, oy, false, false);
        }
        break;
    }
}

// C ref: mkobj.c:3250-3275 insane_obj_bits() via objlist_sanity(invent) only.
// container walks and the other per-object checks are not ported.  fmt_ptr's
// host address cannot be reproduced; o_id stands in for it.
export async function obj_sanity_check() {
    for (let obj = game.invent; obj; obj = obj.nobj) {
        const o_in_use = obj.in_use | 0, o_bypass = obj.bypass | 0;
        const o_nomerge = obj.nomerge | 0;
        if (!(o_in_use || o_bypass || o_nomerge)) continue;
        const infobuf = 'flagged' + (o_in_use ? ' in_use' : '')
            + (o_bypass ? ' bypass' : '') + (o_nomerge ? ' nomerge' : '');
        game.iflags.override_ID = (game.iflags.override_ID | 0) + 1;
        const objnm = await doname(obj);
        game.iflags.override_ID--;
        await impossible('%s obj %s %s: %s', infobuf,
                         '0x' + (obj.o_id | 0).toString(16), 'invent', objnm);
    }
}

const _HOP_POT_BOOZE = 317, _HOP_POT_SICKNESS = 318, _HOP_POT_OIL = 321,
      _HOP_POT_WATER = 322;

const _HOP_FOOD_RATION = 293, _HOP_LUMP_OF_ROYAL_JELLY = 286;

export async function hornoplenty(horn, tipping, targetbox) {
    const g = game;
    const u = g.u || {};
    let objcount = 0;
    if (!horn || (horn.otyp | 0) !== _HOP_HORN_OF_PLENTY) {
        await real_impossible("bad horn o' plenty");
        return objcount;
    }
    if ((horn.spe | 0) < 1) {
        await pline(nothing_happens);
        if (!horn.cknown) {
            horn.cknown = 1;
            update_inventory();
        }
        return objcount;
    }
    const hop_tipping = !!tipping;
    consume_obj_charge(horn, !tipping);
    let obj, what;
    if (!rn2(13)) {
        obj = await mkobj(_HOP_POTION_CLASS, false);
        if (MKOBJ_OC_MAGIC[obj.otyp | 0]) {
            do {
                obj.otyp = rnd_class(_HOP_POT_BOOZE, _HOP_POT_WATER);
            } while ((obj.otyp | 0) === _HOP_POT_SICKNESS);
            /* oil uses obj->age field differently from other potions */
            if ((obj.otyp | 0) === _HOP_POT_OIL)
                fixup_oil(obj, null); /* C mkobj.c:2874-2875 */
        }
        what = ((obj.quan | 0) > 1) ? 'Some potions' : 'A potion';
    } else {
        obj = await mkobj(_HOP_FOOD_CLASS, false);
        if ((obj.otyp | 0) === _HOP_FOOD_RATION && !rn2(7))
            obj.otyp = _HOP_LUMP_OF_ROYAL_JELLY;
        what = 'Some food';
    }
    ++objcount;
    await pline(`${what} ${vtense(what, 'spill')} out.`);
    obj.blessed = horn.blessed;
    obj.cursed = horn.cursed;
    obj.owt = weight(obj);
    g.iflags = g.iflags || {};
    if (horn.unpaid)
        await shk_addtobill(obj, false, false, tipping);
    g.iflags.suppress_price = (g.iflags.suppress_price | 0) + 1;
    if (hop_tipping) {
        /* C mkobj.c:2896-2924 — #loot's tipping arm. */
        if (targetbox) {
            await add_to_container(targetbox, obj);
            targetbox.owt = weight(targetbox);
            if ((targetbox.where | 0) === OBJ_INVENT) {
                await encumber_msg();
                update_inventory();
            }
        } else if (!can_reach_floor(true)) {
            await hitfloor(obj, true);
        } else {
            const levloc = _levlAt(u.ux | 0, u.uy | 0);
            if (levloc && IS_ALTAR(levloc.typ | 0)) {
                await doaltarobj(obj);
            } else {
                const nm = await _doaltarobj_Doname2(obj);
                await pline(`${nm} ${otense(obj, 'drop')} to the ${surface(u.ux | 0, u.uy | 0)}.`);
            }
            await dropy(obj);
        }
        g.iflags.suppress_price = (g.iflags.suppress_price | 0) - 1;
        if (horn.dknown)
            makeknown(_HOP_HORN_OF_PLENTY);
        return objcount;
    }
    const levloc = _levlAt(u.ux | 0, u.uy | 0);
    const dropFmt = u.uswallow
        ? 'Oops!  %s out of your reach!'
        : (Is_airlevel(u.uz) || Is_waterlevel(u.uz)
           || ((levloc ? levloc.typ : 0) | 0) < IRONBARS
           || ((levloc ? levloc.typ : 0) | 0) >= ICE)
          ? 'Oops!  %s away from you!'
          : 'Oops!  %s to the floor!';
    const dropArg = The(aobjnam(obj, 'slip'));
    /* nhUse(obj) is C's unused-variable no-op after hold_another_object may
     * have freed obj on the drop path; nothing to mirror in JS. */
    await hold_another_object(obj, dropFmt, dropArg, null);
    g.iflags.suppress_price = (g.iflags.suppress_price | 0) - 1;
    if (horn.dknown)
        makeknown(_HOP_HORN_OF_PLENTY);
    return objcount;
}

/* C mkobj.c:713 bill_dummy_object().  Altering a shop item must preserve the
 * pre-alteration object on the bill so that later inventory examination can
 * still describe what was bought.  C mkobj.c:724-733 copies extras separately
 * and removes the duplicate ghost association before linking through billobjs. */
export async function bill_dummy_object(obj) {
    if (!obj) return;

    let cost = 0;
    if (obj.unpaid) {
        const shkp = shk_shop_keeper(game.u?.ushops?.charCodeAt?.(0) || 0);
        if (shkp) {
            cost = (await shk_unpaid_cost(obj, 2 /* COST_SINGLEOBJ */)) | 0;
            await shk_subfrombill(obj, shkp);
        }
    }

    const dummy = newobj(obj);
    dummy.oextra = null;
    dummy.where = OBJ_FREE;      // OBJ_FREE until addtobill links it
    dummy.o_id = nextoid(obj, dummy);
    dummy.nobj = null;
    dummy.timed = 0;
    await copy_oextra(dummy, obj);
    if (dummy.oextra?.omid) free_omid(dummy);
    dummy.owornmask = 0;
    if (dummy.otyp === _IA_TALLOW_CANDLE_OTYP || dummy.otyp === _IA_WAX_CANDLE_OTYP)
        dummy.lamplit = 0;

    /* C completes insertion before restoring the pre-alteration price. */
    await shk_addtobill(dummy, false, true, true);

    if (cost && dummy.where !== OBJ_DELETED)
        await shk_alter_cost(dummy, -cost);

    obj.no_charge = (obj.where === OBJ_FLOOR || obj.where === OBJ_CONTAINED) ? 1 : 0;
    obj.unpaid = 0;
}

export function rndmonnum() {
    return rndmonnumAdj(0, 0);
}

/* C mkobj.c:556-622 unsplitobj().  Locate the two stacks named by the most
 * recent split context and merge them through invent.c's canonical merged().
 * The dynamic import avoids makemon <-> hold_another_object initialization
 * recursion; callers await this only on a rejected menu transfer. */
export async function unsplitobj(obj) {
    const split = game.context?.objsplit;
    if (!obj || !split) return null;

    let list = null;
    switch (obj.where | 0) {
    case OBJ_INVENT:
        list = game.invent;
        break;
    case OBJ_MINVENT:
        list = obj.ocarry?.minvent || null;
        break;
    case OBJ_CONTAINED:
        list = obj.ocontainer?.cobj || null;
        break;
    default:
        return null;
    }

    /* C mkobj.c:589-602 — first try the expected case (obj split from
     * another stack, parent probably precedes child), else the alternate
     * (another stack split from obj); either way check obj->nobj first. */
    let parent = null, child = null, target_oid = 0;
    if ((obj.o_id | 0) === (split.child_oid | 0)) {
        child = obj;
        target_oid = split.parent_oid | 0;
        if (obj.nobj && (obj.nobj.o_id | 0) === target_oid)
            parent = obj.nobj;
    } else if ((obj.o_id | 0) === (split.parent_oid | 0)) {
        parent = obj;
        target_oid = split.child_oid | 0;
        if (obj.nobj && (obj.nobj.o_id | 0) === target_oid)
            child = obj.nobj;
    }
    /* C mkobj.c:603-616 — scan obj's list for the missing half */
    if (child && !parent) {
        for (let it = list; it; it = it.nobj)
            if ((it.o_id | 0) === target_oid) {
                parent = it;
                break;
            }
    } else if (parent && !child) {
        for (let it = list; it; it = it.nobj)
            if ((it.o_id | 0) === target_oid) {
                child = it;
                break;
            }
    }
    if (!parent || !child) return null;
    const { merged } = await import('./hold_another_object.js');
    const pparent = { o: parent }, pchild = { o: child };
    return (await merged(pparent, pchild)) ? pparent.o : null;
}

const VENOM_CLASS = 17;

/** C skills.h — ammo/missile skill range for is_multigen / is_poisonable (obj.h) */
const P_BOW = 20;

const P_SHURIKEN = 24;

const SPE_BLANK_PAPER = 407;

/* C objects.h — armor otyps for mksobj_init ARMOR_CLASS (mkobj.c:1088-1091) */
const HELM_OF_OPPOSITE_ALIGNMENT = 99;

const SPLINT_MAIL = 124;

const GAUNTLETS_OF_FUMBLING = 160;

const FUMBLE_BOOTS = 171;

const LEVITATION_BOOTS = 172;

const SACK = 217;

const OILSKIN_SACK = 218;

const BAG_OF_TRICKS = 220;

const EXPENSIVE_CAMERA = 229;

const CRYSTAL_BALL = 231;

const TINNING_KIT = 238;

const CAN_OF_GREASE = 240;

const MAGIC_MARKER = 242;

const MAGIC_FLUTE = 248;

const FROST_HORN = 250;

const FIRE_HORN = 251;

const HORN_OF_PLENTY = 252;

const MAGIC_HARP = 254;

const DRUM_OF_EARTHQUAKE = 258;

const MEAT_RING = 270;

const CANDY_BAR = 288;

/** C obj.h Is_pudding — pudding globs in objects.h order after MEAT_RING */
const GLOB_OF_GRAY_OOZE = 271;

const GLOB_OF_BROWN_PUDDING = 272;

/** C mon.c dead_species / can_be_hatched G_GENOD flag (monflag.h) */
/** C pm.h PM_ACID_BLOB — nonrotting_corpse (eat.c:58) */
const PM_ACID_BLOB = 6;

const DILITHIUM_CRYSTAL = 439;

const LUCKSTONE = 470;

const LOADSTONE = 471;

const WAN_LIGHTNING = 434;

const WAN_CANCELLATION = 423;

/** C objects.h — WAN_FIRE (between WAN_DIGGING and WAN_LIGHTNING) */
const WAN_FIRE = 430;

/** C objects.h — contiguous NODIR wands WAN_LIGHT..WAN_STASIS (mkobj.c:1124–1125) */
const WAN_STASIS = 415;

const WAN_NOTHING = 416;

const WAN_WISHING = 414;

const AMULET_OF_RESTFUL_SLEEP = 204;

const AMULET_OF_CHANGE = 206;

const AMULET_OF_YENDOR = 213;

/** C objclass.h obj_material_types (subset for mkobj_erosions) */
const LIQUID = 1;

const DRAGON_HIDE = 10;

const PLASTIC = 18;

// DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE imported from const.js above.
/** C mondata.h MZ_SMALL — verysmall(ptr) is (msize < MZ_SMALL) */
const MZ_SMALL = 1;

/** @type {number[]} permonst.msize per mons[] index (monflag.h MZ_*) */
const MONS_MSIZE = monMsizePack.msize;

// C ref: mkobj.c mkobjprobs / hellprobs / rogueprobs (iprob sums to 100)
const mkobjprobs = [
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

const rogueprobs = [
    { iprob: 12, iclass: WEAPON_CLASS },
    { iprob: 12, iclass: ARMOR_CLASS },
    { iprob: 22, iclass: FOOD_CLASS },
    { iprob: 22, iclass: POTION_CLASS },
    { iprob: 22, iclass: SCROLL_CLASS },
    { iprob: 5, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
];

const hellprobs = [
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

/* C mkobj.c boxiprobs[] — mkbox_cnts item class pick */
const boxiprobs = [
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

// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================
// C ref: mkobj.c:509-532 next_ident
// Returns the current context.ident value and advances it by rnd(2).
// Handles wrap-to-zero by forcing a non-zero ident (rnd(2)+1).
// Also initializes context.ident to 2 (matching allmain.c:846) if not set.
export function next_ident() {
    const g = game;
    if (g.context == null)
        g.context = {};
    if (g.context.ident == null)
        g.context.ident = 2; /* id 1 is reserved for gy.youmonst */
    const res = g.context.ident;
    if (typeof process !== 'undefined' && ENV?.FF_IDENT_TRACE === '1') {
        const m = g.u?.uz?.dlevel;
        pushRngLogEntry(`^ident_trace[moves=${g.moves} dlevel=${m} ident=${res}]`);
    }
    g.context.ident = (g.context.ident + rnd(2)) >>> 0; /* C unsigned wrap */
    /* if ident has wrapped to 0, force it to be non-zero */
    if (!g.context.ident)
        g.context.ident = rnd(2) + 1; /* id 1 is reserved */
    return res;
}

/** C mkobj.c bcsign (1858–1860): !!blessed - !!cursed (-1 | 0 | 1). */
export function bcsign(otmp) {
    return (!!otmp?.blessed - !!otmp?.cursed) | 0;
}

/** Rings with oc_charged in C OBJECTS BITS (RING macro spec===1): adornment … protection → first 6 rings. */
function ringOcCharged(otyp) {
    const lo = MKOBJ_SVB_BASES[RING_CLASS] | 0;
    return otyp >= lo && otyp <= lo + 5;
}

/** C objects.h numbering from SVB[RING_CLASS] (173); see mkobj.c:1144–1147. */
const RIN_HUNGER = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 11;

const RIN_AGGRAVATE_MONSTER = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 12;

const RIN_TELEPORTATION = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 21;

const RIN_POLYMORPH = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 23;

// C ref: mkobj.c:1841-1855 blessorcurse(otmp, chance)
export function blessorcurse(otmp, chance) {
    if (!otmp || otmp.blessed || otmp.cursed)
        return;
    /* if (!rn2(chance)) { if (!rn2(2)) curse; else bless; } */
    if (!rn2(chance)) {
        if (!rn2(2)) {
            return curse(otmp);
        }
        else {
            return bless(otmp);
        }
    }
}

/* C ref: Role_if(PM_SAMURAI) — true when the hero's player role is Samurai.
 * The Samurai player-role index is initrole 9 (roles.js role table, mnum 9). */
const SAMURAI_INITROLE = 9;

function ROLE_IF_SAMURAI() {
    return (game.flags?.initrole | 0) === SAMURAI_INITROLE
        || (game.urole?.mnum | 0) === SAMURAI_INITROLE;
}

function Is_mbag(o) {
    return o.otyp === BAG_OF_HOLDING || o.otyp === BAG_OF_TRICKS;
}

/* C mkobj.c mkbox_cnts (304–385) — stock containers; RNG must match for mklev */
async function mkbox_cnts(box) {
    let n;
    box.cobj = null;
    switch (box.otyp) {
        case ICE_BOX:
            n = 20;
            break;
        case CHEST:
            n = box.olocked ? 7 : 5;
            break;
        case LARGE_BOX:
            n = box.olocked ? 5 : 3;
            break;
        case SACK:
        case OILSKIN_SACK:
            if ((((game.moves) | 0) <= 1) && !game.in_mklev) {
                n = 0;
                break;
            }
        /* FALLTHRU */
        case BAG_OF_HOLDING:
            n = 1;
            break;
        default:
            n = 0;
            break;
    }
    for (n = rn2(n + 1); n > 0; n--) {
        let otmp;
        if (box.otyp === ICE_BOX) {
            otmp = (await mksobj(CORPSE, true, false));
            otmp.age = 0;
            if (otmp.timed) {
                /* C mkobj.c mkbox_cnts — an ice box's corpses do not rot.
                 * The func_index arguments were the STRINGS 'ROT_CORPSE' etc.,
                 * which no numeric timer entry could ever match; they are the
                 * timeout.h enum members. */
                stop_timer(ROT_CORPSE, obj_to_any(otmp));
                stop_timer(REVIVE_MON, obj_to_any(otmp));
                stop_timer(SHRINK_GLOB, obj_to_any(otmp));
            }
        }
        else {
            let tprob;
            let idx = 0;
            const iprobs = boxiprobs;
            for (tprob = rnd(100); (tprob -= iprobs[idx].iprob) > 0; idx++)
                continue;
            otmp = (await mkobj(iprobs[idx].iclass, false));
            if (!otmp)
                continue;
            if (otmp.oclass === COIN_CLASS) {
                otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
                otmp.owt = weight(otmp);
            }
            else {
                while (otmp.otyp === ROCK) {
                    otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                    if (otmp.quan > 2)
                        otmp.quan = 1;
                    otmp.owt = weight(otmp);
                }
            }
            if (box.otyp === BAG_OF_HOLDING) {
                if (Is_mbag(otmp)) {
                    otmp.otyp = SACK;
                    otmp.spe = 0;
                    otmp.owt = weight(otmp);
                }
                else {
                    while (otmp.otyp === WAN_CANCELLATION)
                        otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
                }
            }
        }
        await add_to_container(box, otmp);
    }
}

function obj_oc_oprop(otyp) {
    return MKOBJ_OC_OPROP[otyp | 0] | 0;
}

/* C obj.h:382-383 — #define Is_candle(otmp) (otmp->otyp == TALLOW_CANDLE || otmp->otyp == WAX_CANDLE) */
function Is_candle(otmp) {
    const otyp = otmp.otyp | 0;
    return otyp === TALLOW_CANDLE || otyp === WAX_CANDLE;
}

export function is_flammable(otmp) {
    const otyp = otmp.otyp | 0;
    if (Is_candle(otmp))
        return false;
    if (obj_oc_oprop(otyp) === FIRE_RES || otyp === WAN_FIRE)
        return false;
    const omat = obj_oc_material(otyp);
    return (omat <= WOOD && omat !== LIQUID) || omat === PLASTIC;
}

export function is_rottable(otmp) {
    const omat = obj_oc_material(otmp.otyp | 0);
    return (omat <= WOOD && omat !== LIQUID) || omat === DRAGON_HIDE;
}

function may_generate_eroded(otmp) {
    const moves = (game.moves) | 0;
    if (moves <= 1 && !game.in_mklev)
        return false;
    if (otmp.oerodeproof || !erosion_matters(otmp) || !is_damageable(otmp))
        return false;
    const ot = otmp.otyp | 0;
    if (ot === WORM_TOOTH || ot === UNICORN_HORN)
        return false;
    if (otmp.oartifact)
        return false;
    return true;
}

/** C mkobj.c mkobj_erosions */
function mkobj_erosions(otmp) {
    if (may_generate_eroded(otmp)) {
        if (!rn2(100)) {
            otmp.oerodeproof = 1;
        }
        else {
            if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp)
                || is_crackable(otmp))) {
                do {
                    otmp.oeroded = (otmp.oeroded | 0) + 1;
                } while ((otmp.oeroded | 0) < 3 && !rn2(9));
            }
            if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
                do {
                    otmp.oeroded2 = (otmp.oeroded2 | 0) + 1;
                } while ((otmp.oeroded2 | 0) < 3 && !rn2(9));
            }
        }
        if (!rn2(1000))
            otmp.greased = 1;
    }
}

/** C mkobj.c rider_revival_time */
export function rider_revival_time(body, retry) {
    const minturn = retry ? 3 : (((body.corpsenm | 0) === PM_DEATH) ? 6 : 12);
    let when = minturn;
    for (; when < 67; when++)
        if (!rn2(3))
            break;
    return when;
}

/**
 * C mkobj.c start_corpse_timeout — rotting jitter uses rnz (see mkobj.c:1414).
 * `when += rnz(rot_adjust) - rot_adjust` — first RNG inside `rnz` is rn2(1000).
 */
export function start_corpse_timeout(body) {
    if (body.corpsenm === PM_LIZARD || body.corpsenm === PM_LICHEN)
        return;
    let action = ROT_CORPSE;
    const rot_adjust = game.in_mklev ? 25 : 10;
    const moves = Math.max((game.moves) | 0, 1);
    let ageTurns = moves - (body.age | 0);
    let when;
    if (ageTurns > ROT_AGE)
        when = rot_adjust;
    else
        when = ROT_AGE - ageTurns;
    when += (rnz(rot_adjust) - rot_adjust) | 0;
    if (is_rider_pm(body.corpsenm | 0)) {
        action = REVIVE_MON;
        when = rider_revival_time(body, false);
    }
    else if ((MONS_ROWS[body.corpsenm | 0][0] | 0) === S_TROLL) {
        for (ageTurns = 2; ageTurns <= TAINT_AGE; ageTurns++)
            if (!rn2(TROLL_REVIVE_CHANCE)) { /* troll revives */
                action = REVIVE_MON;
                when = ageTurns;
                break;
            }
    }
    else if (!!game.flags?.zombify && zombie_form(permonstTemplate(body.corpsenm | 0)) !== NON_PM
        && !(body.norevive | 0)) {
        action = ZOMBIFY_MON;
        when = rn1(15, 5); /* 5..19 */
    }
    /* C mkobj.c:1431 (void) start_timer(when, TIMER_OBJECT, action,
     * obj_to_any(body)) — start_timer does the body.timed++ itself. */
    start_timer(when, TIMER_OBJECT, action, obj_to_any(body));
}

/* C mkobj.c:1473-1491 start_glob_timeout().  A zero delay requests the
 * ordinary randomized 23..27 turn interval; an explicit positive delay is
 * used when an overdue timer is caught up after returning to a level. */
export function start_glob_timeout(obj, when) {
    if (!obj.globby)
        return lifecycle_impossible("start_glob_timeout for non-glob [%d: %s]?",
                                    obj.otyp, simpleonames(obj));
    if (obj.timed)
        stop_timer(SHRINK_GLOB, obj_to_any(obj));
    if ((when | 0) < 1)
        when = 25 + rn2(5) - 2;
    start_timer(when | 0, TIMER_OBJECT, SHRINK_GLOB, obj_to_any(obj));
}

export function set_corpsenm(obj, id) {
    const old_id = obj.corpsenm | 0;
    let when = 0;

    if (obj.timed) {
        if ((obj.otyp | 0) === EGG) {
            /* C mkobj.c:1302 stop_timer(HATCH_EGG, obj_to_any(obj)) — the
             * func_index was `null`, which matched no timer, so this always
             * returned 0 and the re-attach below always redrew the rnd() loop. */
            when = stop_timer(HATCH_EGG, obj_to_any(obj));
        } else {
            when = 0;
            obj_stop_timers(obj); /* corpse or figurine */
        }
    }

    if ((obj.otyp | 0) === CORPSE && (obj.oeaten | 0) !== 0
        && mons_cnutrit(old_id) !== mons_cnutrit(id)) {
        obj.oeaten = Math.trunc(obj.oeaten * mons_cnutrit(id)
                                / mons_cnutrit(old_id)) >>> 0;
    }

    obj.corpsenm = id | 0;
    switch (obj.otyp | 0) {
        case CORPSE:
            start_corpse_timeout(obj);
            obj.owt = weight(obj);
            break;
        case FIGURINE:
            if (obj.corpsenm !== NON_PM && !dead_species_egg(obj.corpsenm | 0)
                && ((obj.where | 0) === OBJ_INVENT || (obj.where | 0) === OBJ_MINVENT))
                attach_fig_transform_timeout(obj);
            obj.owt = weight(obj);
            break;
        case EGG:
            if (obj.corpsenm !== NON_PM && !dead_species_egg(obj.corpsenm | 0))
                attach_egg_hatch_timeout(obj, when);
            break;
        default:
            obj.owt = weight(obj);
            break;
    }
}

// C ref: mkobj.c mksobj — create a specific object
export async function mksobj(otyp, init, artif) {
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '3')
        pushRngLogEntry(`^mksobj[moves=${game.moves | 0} dlevel=${game.u?.uz?.dlevel | 0} otyp=${otyp | 0}]`);
    const oclass = MKOBJ_OC_CLASS[otyp] | 0;
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '1') {
        game.__mkobjTraceCount = (game.__mkobjTraceCount | 0) + 1;
        if ((game.__mkobjTraceCount | 0) <= 512)
            pushRngLogEntry(`^mkobj_trace[n=${game.__mkobjTraceCount | 0} otyp=${otyp | 0}`
                + ` class=${oclass} init=${init ? 1 : 0} artif=${artif ? 1 : 0}`
                + ` moves=${game.moves | 0}]`);
    }
    const mv = Math.max((game.moves) | 0, 1);
    /* `let`, not `const`: C's `struct obj *otmp` is REASSIGNED twice in this
       function's tail — mkobj.c:1248 `otmp = oname(otmp, noveltitle(...), ...)`
       and mkobj.c:1255 `otmp = mk_artifact(...)`.  The mk_artifact line below
       was already written against a `const` and would have thrown
       "Assignment to constant variable" the first time an oc_unique otyp
       reached mksobj(); it had not fired yet only because that path is rare. */
    let otmp = newobj({
        otyp,
        oclass,
        ox: 0,
        oy: 0,
        quan: 1,
        /* C mkobj.c:1150 `*otmp = cg.zeroobj;` — owt starts at ZERO, not 1.
         * mksobj overwrites it at :1258 with weight(otmp), so the initial value
         * is invisible for every otyp EXCEPT the one whose weight() reads it
         * back first: mkobj.c:2101 `if (obj->otyp == HEAVY_IRON_BALL &&
         * obj->owt != 0) return (int) obj->owt;`.  With 1 here that test was
         * true on a brand-new ball, so it weighed 1 instead of oc_weight 480 and
         * never reached "very heavy iron ball" (objnam.c:829) even after
         * punish()'s +160 bumps.  Inert until js/read.js punish() became the
         * first thing in the port that mksobj()s a ball. */
        owt: 0,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        corpsenm: NON_PM,
        age: mv,
        norevive: 0,
        /* C mkobj.c:1186 *otmp = cg.zeroobj — zero-initializes all fields */
        nobj: null, nexthere: null, cobj: null, oextra: null,
        lua_ref_cnt: 0,
        ghostly: 0, named_how: 0,
        owornmask: 0, /* C mkobj.c zeroobj default; new object is not worn */
        oartifact: 0, timed: 0, bypass: 0, unpaid: 0, lamplit: 0,
        oeaten: 0, greased: 0, in_use: 0, globby: 0, oeroded: 0, oeroded2: 0,
        no_charge: 0, nomerge: 0, oerodeproof: 0, invlet: 0, otrapped: 0,
        obroken: 0,
        /* C obj.h:102 Bitfield(recharged, 3) — zero-initialized by
           *otmp = cg.zeroobj (mkobj.c:1188-1189); mksobj never assigns it
           * afterward, so every object starts with recharged=0. */
        recharged: 0,
        pickup_prev: 0, omigr_from_dnum: 0, omigr_from_dlevel: 0,
        usecount: 0, how_lost: 0,
        /* C mkobj.c:1192 otmp->where = OBJ_FREE */
        where: OBJ_FREE, /* OBJ_FREE=0; set by place_object when placed */
    });
    /* C mkobj.c:1188 — otmp->o_id = next_ident() */
    otmp.o_id = next_ident();
    /* C mkobj.c:1193 — unknow_object(otmp): "set up dknown and known: non-0
     * for some things".  Establishes known = oc_uses_known ? 0 : 1 (so wands,
     * rings, potions, scrolls, gems, spellbooks start known=1 for proper
     * merging) plus the dknown/bknown/rknown/cknown/lknown/tknown = 0 baseline.
     * Previously omitted, leaving known=undefined on every mksobj object; this
     * broke not_fully_identified() (objnam.c:1785) for fully-known starting
     * items, spuriously including them in the scroll-of-identify menu. */
    unknow_object(otmp);
    if (init)
        await mksobj_init(otmp, otyp, artif);
    /* C mkobj.c mksobj() after mksobj_init (1201–1230): corpsenm + CORPSTAT_* spe */
    const sw = (oclass === POTION_CLASS && otyp !== POT_OIL) ? POT_WATER : otyp;
    if (sw === CORPSE) {
        if (otmp.corpsenm === NON_PM) {
            otmp.corpsenm = undead_to_corpse(rndmonnum());
            /* C mkobj.c:1208 — svm.mvitals[corpsenm].mvflags & (G_NOCORPSE | G_GONE).
               mvflags is the DYNAMIC per-game state, seeded at start with
               (mons[i].geno & G_NOCORPSE) (allmain.c:853) and gaining G_GONE
               (genocide/extinction) bits at runtime. It is NOT the static
               mons[].geno field — geno's low bits are the G_FREQ creation
               frequency, which must not be misread as a genocide flag. */
            const cm = otmp.corpsenm | 0;
            const mvflags = mvitals_mvflags(cm);
            if ((mvflags & (G_NOCORPSE | G_GONE)) !== 0)
                otmp.corpsenm = uroleMnum();
        }
    }
    if (sw === CORPSE || sw === STATUE || sw === FIGURINE) {
        if (otmp.corpsenm === NON_PM)
            otmp.corpsenm = rndmonnum();
        if (otmp.corpsenm !== NON_PM) {
            const mf2 = MONS_ROWS[otmp.corpsenm][7] | 0;
            otmp.spe = (mf2 & M2_NEUTER) !== 0 ? CORPSTAT_NEUTER
                : (mf2 & M2_FEMALE) !== 0 ? CORPSTAT_FEMALE
                    : (mf2 & M2_MALE) !== 0 ? CORPSTAT_MALE
                        : (rn2(2) ? CORPSTAT_FEMALE : CORPSTAT_MALE);
        }
    }
    /* C mkobj.c:1227–1230 fallthrough sets corpsenm-derived state + corpse timer */
    if (sw === CORPSE || sw === STATUE || sw === FIGURINE || otyp === EGG) {
        set_corpsenm(otmp, otmp.corpsenm);
    }
    /* C mkobj.c:1231–1250 — the remaining switch arms. corpsenm is a union
       (obj.h:160–165: leashmon/fromsink/next_boulder/novelidx all #define to
       corpsenm), so these field=0 assignments overwrite the NON_PM (-1) that
       mksobj set at creation, leaving corpsenm == 0. */
    else if (sw === BOULDER) {
        /* C mkobj.c:1232–1237 — next_boulder overloads corpsenm; default
           NON_PM is non-zero so xname()'s "next boulder" case would fire
           when it shouldn't; explicitly set it to 0. */
        otmp.next_boulder = 0; /* #define next_boulder corpsenm → corpsenm = 0 */
    }
    else if (sw === POT_OIL || sw === POT_WATER) {
        /* C mkobj.c:1238–1245 — POT_OIL sets age then FALLTHRU to POT_WATER.
           sw collapses every non-POT_OIL potion to POT_WATER (line above), so
           this arm covers all POTION_CLASS objects. fromsink overloads
           corpsenm; clearing it leaves corpsenm == 0. */
        if (otyp === POT_OIL)
            otmp.age = MAX_OIL_IN_FLASK; /* amount of oil */
        otmp.fromsink = 0; /* #define fromsink corpsenm → corpsenm = 0 */
    }
    else if (sw === LEASH) {
        /* C mkobj.c:1246–1248 — leashmon overloads corpsenm; clearing it
           leaves corpsenm == 0. */
        otmp.leashmon = 0; /* #define leashmon corpsenm → corpsenm = 0 */
    }
    else if (sw === SPE_NOVEL) {
        otmp.novelidx = -1; /* "none of the above"; will be changed */
        const novidx = { value: otmp.novelidx | 0 }; /* C's `&otmp->novelidx` */
        const title = noveltitle(novidx);
        otmp.novelidx = novidx.value | 0;
        otmp = await oname(otmp, title, ONAME_NO_FLAGS);
    }
    if (game._oc_unique && game._oc_unique[otmp.otyp | 0] && !otmp.oartifact)
        otmp = await mk_artifact(otmp, A_NONE, 99, false);
    /* C mkobj.c:1258 — otmp->owt = weight(otmp); final weight computation
       after all init/corpsenm/switch handling. */
    otmp.owt = weight(otmp);
    return otmp;
}

/* The egg=TRUE call shape mksobj/set_corpsenm use.  Kept as a named local so
 * the three call sites below read like C's `dead_species(mndx, TRUE)`. */
function dead_species_egg(mnum) {
    return dead_species(mnum, true);
}

/** C eat.c nonrotting_corpse macro (eat.c:58) */
function nonrotting_corpse_pm(mnum) {
    return mnum === PM_LIZARD || mnum === PM_LICHEN
        || is_rider_pm(mnum) || mnum === PM_ACID_BLOB;
}

/**
 * C eat.c set_tin_variety(otmp, RANDOM_TIN) (eat.c:1480-1485) — rn2(TTSZ-1)=rn2(15).
 * Returns variety index (0=ROTTEN, 1=HOMEMADE, ...).
 */
function tin_variety_random(mnum) {
    const ROTTEN_TIN = 0;
    const HOMEMADE_TIN = 1;
    let r = rn2(15); /* rn2(TTSZ - 1), TTSZ=16 */
    if (r === ROTTEN_TIN && nonrotting_corpse_pm(mnum))
        r = HOMEMADE_TIN;
    return r;
}

// C ref: mkobj.c mksobj_init — initialize object fields with RNG (mkobj.c:870-1176)
async function mksobj_init(otmp, otyp, artif) {
    const oc = MKOBJ_OC_CLASS[otyp] | 0;
    if (oc < WEAPON_CLASS || oc > VENOM_CLASS) // C mkobj.c:1164-1165
        throw new Error(`mksobj tried to make type ${otyp}, class ${oc}.`);
    if (oc === WEAPON_CLASS) {
        /* C mkobj.c mksobj_init WEAPON_CLASS (mkobj.c:877-895)
         * 878: quan = is_multigen(otmp) ? rn1(6, 6) : 1 — hack.h rn1(x,y)=rn2(x)+y so leaf is rn2(6).
         * 887: is_poisonable(otmp) && !rn2(100) — obj.h: missile range or permapoisoned(Grimtooth);
         *    Grimtooth is assigned later via mk_artifact, so only missile-range matters here. */
        const sk = MKOBJ_OC_SKILL[otyp] | 0;
        const is_mgen = sk >= -P_SHURIKEN && sk <= -P_BOW;
        otmp.quan = is_mgen ? rn1(6, 6) : 1;
        if (!rn2(11)) {
            otmp.spe = rne(3);
            otmp.blessed = !!rn2(2);
        }
        else if (!rn2(10)) {
            curse(otmp);
            otmp.spe = -rne(3);
        }
        else {
            blessorcurse(otmp, 10);
        }
        if (is_mgen && !rn2(100))
            otmp.opoisoned = 1;
        if (artif && !rn2(20 + (10 * nartifact_exist())))
            await mk_artifact(otmp, A_NONE, 99, true);
        mkobj_erosions(otmp);
        return;
    }
    if (oc === FOOD_CLASS) {
        /* C mkobj.c mksobj_init FOOD_CLASS (mkobj.c:896-976) */
        otmp.oeaten = 0;
        if (otyp === CORPSE) {
            /* C mkobj.c:899-911 — rndmonnum loop to find non-G_NOCORPSE corpse */
            let tryct = 50;
            do {
                otmp.corpsenm = undead_to_corpse(rndmonnum());
            } while ((mvitals_mvflags(otmp.corpsenm) & G_NOCORPSE) !== 0
                && (--tryct > 0));
            if (tryct === 0)
                otmp.corpsenm = PM_HUMAN;
        }
        else if (otyp === EGG) {
            /* C mkobj.c:914-923 — rn2(3) at mkobj.c:916 is the divergence target */
            otmp.corpsenm = NON_PM; /* generic egg */
            if (!rn2(3))
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = can_be_hatched(rndmonnum());
                    if (mndx !== NON_PM && !dead_species_egg(mndx)) {
                        otmp.corpsenm = mndx; /* typed egg */
                        break;
                    }
                }
        }
        else if (otyp === TIN) {
            /* C mkobj.c:926-940 */
            otmp.corpsenm = NON_PM; /* empty so far */
            if (!rn2(6)) {
                otmp.spe = 1; /* SPINACH_TIN */
            }
            else {
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse(rndmonnum());
                    /* C mkobj.c:932-933:
                     *     if (mons[mndx].cnutrit
                     *         && !(svm.mvitals[mndx].mvflags & G_NOCORPSE))
                     * Both conjuncts are required: 33 of the 383 monsters have
                     * cnutrit == 0, and those that are not G_NOCORPSE (wraith,
                     * barrow wight, Nazgul, non-G_NOCORPSE golems) must be
                     * rejected so C's retry loop draws another rndmonnum(). */
                    if (mons_cnutrit(mndx)
                        && (mvitals_mvflags(mndx) & G_NOCORPSE) === 0) {
                        otmp.corpsenm = mndx;
                        otmp.spe = -(tin_variety_random(mndx) + 1); /* RANDOM_TIN */
                        break;
                    }
                }
            }
            blessorcurse(otmp, 10);
        }
        else if (otyp === SLIME_MOLD) {
            if (!game.ffruit)
                init_fruit_chain();
            otmp.spe = game.svc.context.current_fruit;
            if (!game.flags) game.flags = {};
            game.flags.made_fruit = true;
        }
        else if (otyp === KELP_FROND) {
            /* C mkobj.c:946-948 */
            otmp.quan = rnd(2);
        }
        else if (otyp === CANDY_BAR) {
            /* C read.c:307-308 assign_candy_wrapper — rn2(SIZE(candy_wrappers)-1); 13 entries so SIZE-1=12 */
            otmp.spe = 1 + rn2(12);
        }
        /* C mkobj.c:956-975 Is_pudding check */
        if (otyp === GLOB_OF_GRAY_OOZE || otyp === GLOB_OF_BROWN_PUDDING
            || otyp === GLOB_OF_GREEN_SLIME || otyp === GLOB_OF_BLACK_PUDDING) {
            otmp.globby = 1;
            otmp.quan = 1;
            otmp.owt = OC_WEIGHT[otyp] | 0;
            otmp.known = otmp.dknown = 1;
            otmp.corpsenm = PM_GRAY_OOZE_MK + (otyp - GLOB_OF_GRAY_OOZE); /* mkobj.c:967 */
            start_glob_timeout(otmp, 0);
        }
        else {
            /* C mkobj.c:971-975 — general food quan=2 for non-special cases */
            if (otyp !== CORPSE && otyp !== MEAT_RING && otyp !== KELP_FROND && !rn2(6))
                otmp.quan = 2;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === GEM_CLASS) {
        /* C mkobj.c mksobj_init GEM_CLASS (mkobj.c:977–986) */
        otmp.corpsenm = 0;
        if (otyp === LOADSTONE)
            curse(otmp);
        else if (otyp === ROCK)
            otmp.quan = rn1(6, 6);
        else if (otyp !== LUCKSTONE && !rn2(6))
            otmp.quan = 2;
        else
            otmp.quan = 1;
        mkobj_erosions(otmp);
        return;
    }
    if (oc === ROCK_CLASS && otyp === STATUE) {
        /* C mkobj.c mksobj_init ROCK_CLASS + STATUE (mkobj.c:1151–1158) */
        otmp.corpsenm = rndmonnum();
        const msize = MONS_MSIZE[otmp.corpsenm] | 0;
        if (msize >= MZ_SMALL
            && rn2(Math.trunc(levelDifficulty() / 2) + 10) > 10) {
            await add_to_container(otmp, (await mkobj(SPBOOK_no_NOVEL, false)));
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === ARMOR_CLASS) {
        /* C mkobj.c mksobj_init ARMOR_CLASS (mkobj.c:1086–1115) */
        if (rn2(10)
            && (otyp === FUMBLE_BOOTS
                || otyp === LEVITATION_BOOTS
                || otyp === HELM_OF_OPPOSITE_ALIGNMENT
                || otyp === GAUNTLETS_OF_FUMBLING
                || !rn2(11))) {
            curse(otmp);
            otmp.spe = -rne(3);
        }
        else if (!rn2(10)) {
            otmp.blessed = rn2(2) !== 0;
            otmp.spe = rne(3);
        }
        else {
            blessorcurse(otmp, 10);
        }
        if (artif && !rn2(40 + (10 * nartifact_exist())))
            await mk_artifact(otmp, A_NONE, 99, true);
        /* C ref: mkobj.c:1104-1113 "simulate lacquered armor for samurai":
         *   if (Role_if(PM_SAMURAI) && otmp->otyp == SPLINT_MAIL
         *       && (svm.moves <= 1 || In_quest(&u.uz)))
         *       otmp->oerodeproof = otmp->rknown = 1;
         * Role_if(PM_SAMURAI) is the role-index test (urole.malenum == PM_SAMURAI);
         * the player-role index for Samurai is initrole 9 (roles.js mnum 9).
         * (The "ROLE_INITROLE_TO_PM[] maps to quest-leader pms" note that used
         * to sit here described a DEFECT in that table, not a design: it was the
         * player-role list shifted +7.  Fixed above; the index compare here is
         * still correct and is left alone.) */
        if (ROLE_IF_SAMURAI() && otyp === SPLINT_MAIL
            && (((game.moves | 0) <= 1) || In_quest(game.u?.uz))) {
            otmp.oerodeproof = otmp.rknown = 1;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === TOOL_CLASS) {
        /* C mkobj.c mksobj_init TOOL_CLASS (mkobj.c:988–1059) */
        switch (otyp) {
            case TALLOW_CANDLE:
            case WAX_CANDLE:
                otmp.spe = 1;
                otmp.age = 20 * (otyp === TALLOW_CANDLE ? 10 : 20);
                otmp.lamplit = 0;
                otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
                blessorcurse(otmp, 5);
                break;
            case BRASS_LANTERN:
            case OIL_LAMP:
                otmp.spe = 1;
                otmp.age = rn1(500, 1000);
                otmp.lamplit = 0;
                blessorcurse(otmp, 5);
                break;
            case MAGIC_LAMP:
                otmp.spe = 1;
                otmp.lamplit = 0;
                blessorcurse(otmp, 2);
                break;
            case CHEST:
            case LARGE_BOX:
                otmp.olocked = !!rn2(5);
                otmp.otrapped = !rn2(10);
                otmp.tknown = !!(otmp.otrapped && !rn2(100));
            /* FALLTHRU */
            case ICE_BOX:
            case SACK:
            case OILSKIN_SACK:
            case BAG_OF_HOLDING:
                await mkbox_cnts(otmp);
                break;
            case EXPENSIVE_CAMERA:
            case TINNING_KIT:
            case MAGIC_MARKER:
                otmp.spe = rn1(70, 30);
                break;
            case CAN_OF_GREASE:
                otmp.spe = rn1(21, 5);
                blessorcurse(otmp, 10);
                break;
            case CRYSTAL_BALL:
                otmp.spe = rn1(5, 3);
                blessorcurse(otmp, 2);
                break;
            case HORN_OF_PLENTY:
            case BAG_OF_TRICKS:
                otmp.spe = rn1(18, 3);
                break;
            case FIGURINE: {
                let tryct = 0;
                do {
                    otmp.corpsenm = rndmonnumAdj(5, 10);
                } while (mons_is_human(otmp.corpsenm) && tryct++ < 30);
                blessorcurse(otmp, 4);
                break;
            }
            case BELL_OF_OPENING:
                otmp.spe = 3;
                break;
            case MAGIC_FLUTE:
            case MAGIC_HARP:
            case FROST_HORN:
            case FIRE_HORN:
            case DRUM_OF_EARTHQUAKE:
                otmp.spe = rn1(5, 4);
                break;
            default:
                break;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === RING_CLASS) {
        /* C mkobj.c mksobj_init RING_CLASS (mkobj.c:1129–1150) */
        if (ringOcCharged(otyp)) {
            blessorcurse(otmp, 3);
            if (rn2(10)) {
                if (rn2(10) && bcsign(otmp))
                    otmp.spe = bcsign(otmp) * rne(3);
                else
                    otmp.spe = rn2(2) ? rne(3) : -rne(3);
            }
            if (otmp.spe === 0)
                otmp.spe = rn2(4) - rn2(3);
            if (otmp.spe < 0 && rn2(5))
                curse(otmp);
        }
        else if (rn2(10) && (otyp === RIN_TELEPORTATION
            || otyp === RIN_POLYMORPH
            || otyp === RIN_AGGRAVATE_MONSTER
            || otyp === RIN_HUNGER
            || !rn2(9))) {
            curse(otmp);
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === AMULET_CLASS) {
        /* C mkobj.c mksobj_init AMULET_CLASS (mkobj.c:1061–1070) */
        if (otyp === AMULET_OF_YENDOR) {
            const g = game;
            if (!g.svc)
                g.svc = {};
            if (!g.svc.context)
                g.svc.context = {};
            g.svc.context.made_amulet = true;
        }
        if (rn2(10) && (otyp === AMULET_OF_STRANGULATION
            || otyp === AMULET_OF_CHANGE
            || otyp === AMULET_OF_RESTFUL_SLEEP)) {
            curse(otmp);
        }
        else {
            blessorcurse(otmp, 10);
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === SPBOOK_CLASS) {
        /* C mkobj.c mksobj_init SPBOOK_CLASS (mkobj.c:1082–1085) */
        otmp.spestudied = 0;
        blessorcurse(otmp, 17);
        mkobj_erosions(otmp);
        return;
    }
    if (oc === WAND_CLASS) {
        /* C mkobj.c mksobj_init WAND_CLASS (mkobj.c:1116–1127) */
        if (otyp === WAN_WISHING)
            otmp.spe = 1;
        else if (otyp === WAN_STASIS)
            otmp.spe = rn1(4, 3);
        else {
            const nodir = (otyp >= WAN_LIGHT && otyp <= WAN_STASIS)
                || (otyp === WAN_NOTHING && isWanNothingNodir()); /* o_init.c:234 */
            otmp.spe = rn1(5, nodir ? 11 : 4);
        }
        blessorcurse(otmp, 17);
        otmp.recharged = 0;
        mkobj_erosions(otmp);
        return;
    }
    if (oc === POTION_CLASS || oc === SCROLL_CLASS) {
        const SCR_MAIL = 364;
        if (otyp !== SCR_MAIL)
            blessorcurse(otmp, 4);
    }
    mkobj_erosions(otmp);
}

export function add_to_migration(obj) {
    const g = game;
    const gm = _gm_migrating();

    /* C: if (obj->where != OBJ_FREE) panic(...).  `where` is not written by
     * every js/ object producer, so an absent field is treated as OBJ_FREE
     * (what mksobj leaves behind) rather than as a violation. */
    const where = (obj.where === undefined || obj.where === null) ? OBJ_FREE : (obj.where | 0);
    if (where !== OBJ_FREE)
        throw new Error(`add_to_migration: obj where=${where}, not free`);

    if (obj.unpaid)
        impossible_sync("unpaid object migrating to another level? [%s]", simpleonames(obj));
    /* C: obj->no_charge = 0 — only relevant while inside a shop */
    obj.no_charge = 0;

    /* C: if (Is_container(obj)) maybe_reset_pick(obj) — the lock-picking
     * context goes stale when the container leaves the level.  RNG-free.
     * Is_container(o) is objects[otyp].oc_class == TOOL_CLASS && otyp >=
     * LARGE_BOX && otyp <= BAG_OF_TRICKS; js/ spells the otyp range test three
     * times already (js/makemon.js:3857, js/shk.js:1304, js/mklev.js:4108) —
     * this is the range those agree on. */
    const LARGE_BOX_DK = 214, BAG_OF_TRICKS_DK = 220;
    if ((obj.otyp | 0) >= LARGE_BOX_DK && (obj.otyp | 0) <= BAG_OF_TRICKS_DK)
        maybe_reset_pick(obj);

    obj.where = OBJ_MIGRATING;
    obj.nobj = gm.migrating_objs;
    obj.omigr_from_dnum = (g.u?.uz?.dnum | 0);
    obj.omigr_from_dlevel = (g.u?.uz?.dlevel | 0);
    gm.migrating_objs = obj;
}

/* mksobj_migr_to_species — C ref: mkobj.c:252-266.  "used for extra orctown
 * loot": make the object, park it on the migrating chain, and mark it as owed
 * to the first monster of species `mflags2` that gets created anywhere
 * (makemon.c:1469 -> deliver_obj_to_mon below).
 *
 * C's home for this is mkobj.c (js/mklev.js), but the whole migration
 * machinery it depends on — add_to_migration, obj_extract_self,
 * deliver_obj_to_mon, add_to_minv — already lives in THIS file, and
 * js/mklev.js does not import js/dokick.js (adding that edge would close a
 * module cycle mklev<->dokick that does not exist today).  Kept here with the
 * C reference stated rather than opening the cycle for one function.
 *
 * NOTE obj.h:164 `#define migr_species corpsenm` — in C these are the SAME
 * FIELD.  js/dokick.js's deliver_obj_to_mon reads both spellings (`migr_species`
 * for the species test, `corpsenm` for the "&M2_ORC -> steal the gang name"
 * test), so both must be written or the ORC arm silently reads mksobj's
 * corpsenm = NON_PM (-1), whose & M2_ORC is non-zero — i.e. it would fire for
 * EVERY species. */
export async function mksobj_migr_to_species(otyp, mflags2, init, artif) {
    const otmp = await mksobj(otyp, init, artif);
    add_to_migration(otmp);
    otmp.owornmask = MIGR_TO_SPECIES;
    otmp.migr_species = mflags2 | 0;
    otmp.corpsenm = mflags2 | 0; /* same field in C — see note above */
    return otmp;
}

/* C mkobj.c:239-249 — mksobj_at: make specific object then place it */
export async function mksobj_at(otyp, x, y, init, artif) {
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '2')
        pushRngLogEntry(`^mksobj_at[otyp=${otyp | 0} xy=${x | 0},${y | 0}]`);
    const otmp = await mksobj(otyp, init, artif);
    place_object(otmp, x, y);
    return otmp;
}

// C ref: mkobj.c mkobj (270–302)
// Use == for RANDOM_CLASS: C passes int 0 / FALSE; strict === misses boolean false
// from bad call sites and skips rnd(100), consuming rnd(2) in next_ident instead.
export async function mkobj(oclass, artif) {
    let tprob;
    let i;
    let prob;
    // C invariant: objects[].oc_prob for GEM_CLASS is level-dependent --
    // mklev.c:1264 calls oinit()->setgemprobs(&u.uz) as the FIRST thing
    // the shared table already reflects the current dungeon level. This
    // function's own makelevel() (below) already calls oinit() the same
    // way, so this is a no-op RNG-free recompute in ordinary play -- but a
    // game.u.uz from state_before without re-running that level-entry step,
    // so MKOBJ_OC_PROB can still hold a stale (level-0 default) gem
    // distribution. Refresh it here so the GEM_CLASS walk below sees the
    // were __return__.otyp landing one GEM_CLASS slot off (e.g. obsidian
    await oinit();
    if (oclass == RANDOM_CLASS) {
        const uz = game.u?.uz;
        const iprobs = Is_rogue_level(uz)
            ? rogueprobs
            : In_hell(uz)
                ? hellprobs
                : mkobjprobs;
        let idx = 0;
        for (tprob = rnd(100); (tprob -= iprobs[idx].iprob) > 0; idx++)
            continue;
        oclass = iprobs[idx].iclass;
    }
    if (oclass === SPBOOK_no_NOVEL) {
        i = rnd_class(MKOBJ_SVB_BASES[SPBOOK_CLASS], SPE_BLANK_PAPER);
        oclass = SPBOOK_CLASS;
    }
    else {
        prob = rnd(MKOBJ_OCLASS_PROB_TOTALS[oclass]);
        i = MKOBJ_SVB_BASES[oclass];
        while ((prob -= MKOBJ_OC_PROB[i]) > 0)
            ++i;
    }
    if ((MKOBJ_OC_CLASS[i] | 0) !== oclass || !objName(i)) {
        await lifecycle_impossible("probtype error, oclass=%d i=%d", oclass, i);
        i = MKOBJ_SVB_BASES[oclass];
    }
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '1')
        pushRngLogEntry(`^mkobj_pick[class=${oclass | 0} otyp=${i | 0} artif=${artif ? 1 : 0}]`);
    return await mksobj(i, true, artif);
}

/* C mkobj.c:228-235 — mkobj_at: make random-class object then place it */
export async function mkobj_at(oclass, x, y, artif) {
    const otmp = await mkobj(oclass, artif);
    place_object(otmp, x, y);
    return otmp;
}

/* C mkobj.c:2004-2021 — mkgold: place or merge a gold pile at (x,y). */
export async function mkgold(amount, x, y) {
    const goldTrace = typeof process !== 'undefined' && ENV?.FF_MKGOLD_TRACE === '1';
    if (goldTrace)
        pushRngLogEntry(`^mkgold_enter[amount=${amount | 0} xy=${x | 0},${y | 0}]`);
    if (amount <= 0) {
        // C mkobj.c:2008-2010
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    // C invent.c:1612-1623 g_at(x,y) — walk the per-tile nexthere chain
    // (svl.level.objects[x][y]) for the first COIN_CLASS object. Was a
    // private _goldObjs Map keyed off mkgold's own prior calls in the same
    // is reconstructed from state_before, not from mkgold call history), so
    // the merge branch could never trigger under replay even when C's fobj
    // chain already had a gold pile there — walk the real levelObjects
    // chain instead, exactly like the existing sobj_at() helper.
    let gold = (game.level?.levelObjects?.[x]?.[y]) ?? null;
    while (gold && (gold.oclass | 0) !== COIN_CLASS)
        gold = gold.nexthere ?? null;
    if (goldTrace)
        pushRngLogEntry(`^mkgold_existing[xy=${x | 0},${y | 0} yes=${gold ? 1 : 0}]`);
    if (gold) {
        // C mkobj.c:2012-2014 — merge into existing pile (no new mksobj/next_ident)
        gold.quan += amount;
        // does not emit obroken/usecount/recharged — those ride the narrower
        // OBJ_CHAIN_FIELD_ORDER / STRUCT_FIELDS lists in
        // js/struct_reconstructor.js, neither of which backs this channel — so
        // an existing pile fetched off game.level.levelObjects during replay
        // can read these as `undefined`. C's cg.zeroobj-initialized gold
        // object has always carried them as 0, and nothing in NetHack ever
        // locks/breaks (obroken), recharges (recharged), or "uses"
        // (usecount/wishedfor) a COIN_CLASS object, so 0 is the true and only
        // value they can ever hold here; backfill rather than leave missing.
        if (gold.obroken === undefined) gold.obroken = 0;
        if (gold.usecount === undefined) gold.usecount = 0;
        if (gold.recharged === undefined) gold.recharged = 0;
    }
    else {
        // C mkobj.c:2015-2016 — mksobj_at(GOLD_PIECE, x, y, TRUE, FALSE) then set quan
        gold = (await mksobj_at(GOLD_PIECE, x, y, true, false));
        gold.quan = amount;
    }
    gold.owt = weight(gold);
    return gold;
}

export async function mk_tt_object(objtype, x, y) {
    /* C mkobj.c:2234: player statues never contain books */
    const initialize_it = (objtype !== STATUE);
    /* C mkobj.c:2236 */
    const otmp = await mksobj_at(objtype, x, y, initialize_it, false);

    /* C mkobj.c:2240 — tt_oname() draws its rnd(10) and returns NULL for the
     * empty scoreboard, so the body always runs; the call is NOT skippable. */
    if (!(await tt_oname(otmp))) {
        /* C mkobj.c:2241 */
        const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);

        /* C mkobj.c:2243-2244 — update weight for either, force timer sanity for
         * corpses.  C cannot reach here with a NULL otmp (mksobj_at "never
         * returns Null"); the guard is a JS-side crash shield only and costs
         * no RNG, since tt_oname(NULL) also returns early without drawing. */
        if (otmp)
            set_corpsenm(otmp, pm);
    }

    return otmp;
}

export function place_object(otmp, x, y) {
    if (!otmp)
        return;
    const xi = x | 0;
    const yi = y | 0;
    // C mkobj.c:2328 — otmp2 = svl.level.objects[x][y]
    let otmp2 = (game.level?.levelObjects?.[xi]?.[yi]) ?? null;
    // C mkobj.c:2338-2349 — insert into per-tile nexthere chain.
    // Non-boulder objects go under boulders so that display shows boulder on top
    // without needing to traverse the pile chain.
    if (otmp2 && otmp2.otyp === BOULDER && otmp.otyp !== BOULDER) {
        // C mkobj.c:2341-2342 — advance past all consecutive leading boulders
        while (otmp2.nexthere && otmp2.nexthere.otyp === BOULDER)
            otmp2 = otmp2.nexthere;
        // C mkobj.c:2343-2344 — insert otmp after the last consecutive boulder
        otmp.nexthere = otmp2.nexthere;
        otmp2.nexthere = otmp;
    }
    else {
        // C mkobj.c:2347-2348 — put on top of current pile (normal case)
        otmp.nexthere = otmp2;
        if (game.level?.levelObjects?.[xi])
            game.level.levelObjects[xi][yi] = otmp;
    }
    // C mkobj.c:2352-2354 — set position and ownership marker
    otmp.ox = xi;
    otmp.oy = yi;
    otmp.where = OBJ_FLOOR;
    otmp.nobj = game.fobj;
    game.fobj = otmp;
    if ((otmp.otyp | 0) === BOULDER && (!otmp2 || (otmp2.otyp | 0) !== BOULDER))
        block_point(xi, yi);
    // C mkobj.c:2364-2365: placing a timed corpse on ice changes its decay rate.
    if (otmp.timed)
        obj_timer_checks(otmp, xi, yi, 0);
}

export function remove_object(otmp) {
    const x = otmp.ox | 0;
    const y = otmp.oy | 0;

    if ((otmp.where | 0) !== OBJ_FLOOR)
        throw new Error(`remove_object: obj where=${otmp.where}, not on floor`);
    // C mkobj.c:2627-2645 extract_nexthere(otmp, &svl.level.objects[x][y]).
    // so the real chain's topology (built from the "objects" side-channel)
    // stays intact when otmp is a same-o_id-but-different-instance match.
    {
        const cell = game.level?.levelObjects?.[x];
        const head = cell ? cell[y] : null;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nexthere) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nexthere: object lost');
        if (prev)
            prev.nexthere = match.nexthere;
        else if (cell)
            cell[y] = match.nexthere;
        otmp.nexthere = null;
    }
    // C mkobj.c:2600-2619 extract_nobj(otmp, &fobj) — same matched-node splice.
    {
        const head = game.fobj;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nobj) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nobj: object lost');
        if (prev)
            prev.nobj = match.nobj;
        else
            game.fobj = match.nobj;
        otmp.where = OBJ_FREE;
        otmp.nobj = null;
    }
    if ((otmp.otyp | 0) === BOULDER)
        recalc_block_point(x, y);
    if (otmp.timed)
        obj_timer_checks(otmp, x, y, 0);
}

/* C mkobj.c:2748 dealloc_obj: validate ownership, stop timers/lights, clear
 * transient references, then retain Lua-held objects or queue deletion. */
export async function dealloc_obj(obj) {
    if (obj.otyp === BOULDER)
        obj.next_boulder = 0;
    if (obj.where === OBJ_DELETED) {
        await lifecycle_impossible('dealloc_obj: obj already deleted (type=%d)', obj.otyp);
        return;
    } else if (obj.where !== OBJ_FREE && obj.where !== OBJ_LUAFREE) {
        throw new Error(`panic: dealloc_obj: obj not free (type=${obj.otyp}, where=${obj.where})`);
    }
    if (obj.nobj)
        throw new Error('panic: dealloc_obj with nobj');
    if (obj.cobj)
        throw new Error('panic: dealloc_obj with cobj');
    if (obj === game.hands_obj) {
        await lifecycle_impossible('dealloc_obj with hands_obj');
        return;
    }
    if (obj.timed)
        obj_stop_timers(obj);
    if (obj_sheds_light_mp(obj)) {
        del_light_source(LS_OBJECT, { a_obj: obj });
        obj.lamplit = 0;
    }
    if (obj === game.thrownobj)
        game.thrownobj = null;
    if (obj === game.kickedobj)
        game.kickedobj = null;
    if (obj === game.context?.tin?.tin) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
    const split = game.context?.objsplit;
    if (split && (obj.o_id === split.parent_oid || obj.o_id === split.child_oid))
        split.parent_oid = split.child_oid = 0;
    if (obj.lua_ref_cnt) {
        obj.where = OBJ_LUAFREE;
        return;
    }
    if (!game.program_state.freeingdata) {
        obj.where = OBJ_DELETED;
        obj.nobj = game.objs_deleted || null;
        game.objs_deleted = obj;
    } else {
        dealloc_obj_real(obj);
    }
}

/* C ref: nethack-c/src/mkobj.c:2834 dobjsfree — free the objs_deleted queue.
 * Iterates go.objs_deleted, calling obj_extract_self + dealloc_obj_real on each. */
export function dobjsfree() {
    let otmp;
    while (game.objs_deleted) {
        otmp = game.objs_deleted;
        game.objs_deleted = otmp.nobj;
        if (otmp.where !== OBJ_DELETED)
            throw new Error(`dobjsfree: obj where=${otmp.where}, not OBJ_DELETED`);
        obj_extract_self(otmp);
        dealloc_obj_real(otmp);
        otmp.freed_chunk = true;
        freed_obj_chunks.push(otmp); /* free(): chunk awaits reuse by newobj() */
    }
}

export function add_to_buried(obj) {
    if (!obj)
        return;
    if ((obj.where | 0) !== OBJ_FREE)
        throw new Error(`panic: add_to_buried: obj where=${obj.where}, not free`);
    obj.where = OBJ_BURIED;
    if (game.level) {
        obj.nobj = game.level.buriedobjlist ?? null;
        game.level.buriedobjlist = obj;
    }
}

/* C mkobj.c:2399-2417 — obj_ice_effects: apply ice effects to objects at (x,y) */
export function obj_ice_effects(x, y, do_buried) {
    let otmp;

    for (otmp = (game.level?.levelObjects?.[x]?.[y]) ?? null; otmp; otmp = otmp.nexthere) {
        if (otmp.timed)
            obj_timer_checks(otmp, x, y, 0);
    }
    if (do_buried) {
        for (otmp = game.level?.buriedobjlist; otmp; otmp = otmp.nobj) {
            if (otmp.ox === x && otmp.oy === y) {
                if (otmp.timed)
                    obj_timer_checks(otmp, x, y, 0);
            }
        }
    }
}

export async function add_to_container(container, obj) {
    if (obj.where !== OBJ_FREE)
        throw new Error(`panic: add_to_container: obj where=${obj.where}, not free`);
    if (container.where !== OBJ_INVENT && container.where !== OBJ_MINVENT)
        await obj_no_longer_held(obj);
    for (let otmp = container.cobj; otmp; otmp = otmp.nobj) {
        const target = { o: otmp }, source = { o: obj };
        if (await merged(target, source))
            return target.o;
    }
    obj.where = OBJ_CONTAINED;
    obj.ocontainer = container;
    obj.nobj = container.cobj;
    container.cobj = obj;
    return obj;
}

/* C mkobj.c:2068-2120 — mkcorpstat: make corpse/statue at (x,y) or random if x==0&&y==0 */
export async function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    const init = (flags & CORPSTAT_INIT) !== 0;
    if (objtyp !== CORPSE && objtyp !== STATUE)
        await lifecycle_impossible("making corpstat type %d", objtyp);
    let otmp;
    /* C mkobj.c:2079-2084 — x==0&&y==0 means random placement (rloco); otherwise mksobj_at */
    if (x === 0 && y === 0) {
        otmp = (await mksobj(objtyp, init, false));
        await rloco(otmp);
    }
    else {
        otmp = (await mksobj_at(objtyp, x, y, init, false));
    }
    otmp.spe = (flags & CORPSTAT_SPE_VAL) | 0;
    /* C: mkcorpstat_norevive is carried through envrmt, and a cancelled
     * monster's corpse is explicitly marked non-revivable (except riders). */
    otmp.norevive = (game.gm?.mkcorpstat_norevive ? 1 : 0);
    if (mtmp) {
        save_mtraits(otmp, mtmp); // C mkobj.c:2094
        if (pm == null)
            pm = mtmp.data ?? mtmp.mndx ?? mtmp.mnum ?? null;
        const mndx = (pm !== null && typeof pm === 'object')
            ? (pm.pmidx ?? pm.mnum ?? NON_PM) | 0 : (pm | 0);
        if (mtmp.mcan && !is_rider_pm(mndx))
            otmp.norevive = 1;
    }
    if (pm != null) {
        const old_corpsenm = otmp.corpsenm;
        otmp.corpsenm = (pm !== null && typeof pm === 'object') ? (pm.pmidx | 0) : (pm | 0);
        otmp.owt = weight(otmp);
        /* C mkobj.c:2111–2115 — reschedule corpse decay when corpse type has special rotting/revival */
        if (objtyp === CORPSE
            && (!!game.flags?.zombify || special_corpse(old_corpsenm)
                || special_corpse(otmp.corpsenm))) {
            /* C mkcorpstat clears the timer installed by mksobj_at before
             * re-scheduling it for the overridden species. */
            obj_stop_timers(otmp);
            start_corpse_timeout(otmp);
        }
    }
    return otmp;
}

/* C ref: mkobj.c:626 — clear_splitobjs: reset split object context */
export function clear_splitobjs() {
    // splitobj/unsplitobj store C's svc.context.objsplit in game.context.
    // splitobj() and its callers store C's svc.context in game.context.
    game.context = game.context || {};
    game.context.objsplit = { parent_oid: 0, child_oid: 0 };
}

const ELVEN_SHIELD = 153; /* objects.h ARMOR() ELVEN_SHIELD; was 152 = SHIELD_OF_SHOCK_RESISTANCE */

const ORCISH_SHIELD = 155; /* objects.h ARMOR() ORCISH_SHIELD; was 154 = URUK_HAI_SHIELD */

const SHIELD_OF_REFLECTION = 158;

export function clear_dknown(obj) {
    /* C mkobj.c:829-831 dknowns[] = {WAND_CLASS, RING_CLASS, POTION_CLASS,
     * SCROLL_CLASS, GEM_CLASS, SPBOOK_CLASS, WEAPON_CLASS, TOOL_CLASS,
     * VENOM_CLASS, 0} — objclass.h enum values (defsym.h OBJCLASS list):
     * WEAPON=2, RING=4, TOOL=6, POTION=8, SCROLL=9, SPBOOK=10, WAND=11,
     * GEM=13, VENOM=17. Previous literal had WAND wrongly duplicating
     * WEAPON's 2 (so real wands never hit this branch), TOOL wrongly using
     * CHAIN_CLASS's 16, and VENOM wrongly using the out-of-range 21. */
    const dknowns = [WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS, SPBOOK_CLASS, WEAPON_CLASS, TOOL_CLASS, VENOM_CLASS]; // WAND, RING, POTION, SCROLL, GEM, SPBOOK, WEAPON, TOOL, VENOM (oclass values)

    /* Base dknown setting: if oclass is in dknowns, dknown=0, else dknown=1 */
    let dknown_val = 0;
    for (let i = 0; i < dknowns.length; i++) {
        if (dknowns[i] === obj.oclass) {
            dknown_val = 0;
            break;
        }
        dknown_val = 1;
    }
    obj.dknown = dknown_val;

    /* Shields are never dknown */
    if ((obj.otyp >= ELVEN_SHIELD && obj.otyp <= ORCISH_SHIELD) ||
        obj.otyp === SHIELD_OF_REFLECTION) {
        obj.dknown = 0;
    }

    /* C mkobj.c:841-843 clear_dknown — oc_merge objects (incl. GOLD_PIECE)
     * are always dknown=0 so they merge visually regardless of class. */
    if ((obj.otyp >= 0 && obj.otyp < OC_MERGE.length && OC_MERGE[obj.otyp])) {
        obj.dknown = 0;
    }

    /* Puddings (globs) are always dknown */
    if (obj.otyp === GLOB_OF_GRAY_OOZE ||
        obj.otyp === GLOB_OF_BROWN_PUDDING ||
        obj.otyp === GLOB_OF_GREEN_SLIME ||
        obj.otyp === GLOB_OF_BLACK_PUDDING) {
        obj.dknown = 1;
    }
}

export function newoextra() {
    return {
        oname: null,
        omonst: null,
        omailcmd: null,
        omid: 0
    };
}

export function newomid(otmp) {
    otmp.oextra ||= newoextra(); /* C mkobj.c:145-146: if (!otmp->oextra) otmp->oextra = newoextra() */
    otmp.oextra.omid = 0;
    if (!otmp.oextra_present)
        otmp.oextra_present = 1;
    otmp.oextra_omid = 0;
}

export function dealloc_oextra(o) {
    const x = o.oextra;
    if (x) {
        if (x.oname)
            x.oname = null;
        if (x.omonst)
            free_omonst(o);
        if (x.omailcmd)
            x.omailcmd = null;
        o.oextra = null;
    }
}

export function unknow_object(obj) {
    clear_dknown(obj); /* obj->dknown = 0; */

    obj.bknown = obj.rknown = 0;
    obj.cknown = obj.lknown = 0;
    obj.tknown = 0;
    /* for an existing object, awareness of charges or enchantment has
       gone poof...  [object types which don't use the known flag have
       it set True for some reason] */
    obj.known = OC_USES_KNOWN[obj.otyp] ? 0 : 1;
}

const _OTC_ROT_ICE_ADJUSTMENT = 2;

export function obj_timer_checks(otmp, x, y, force) {
    let tleft = 0;
    let action = ROT_CORPSE;
    let restart_timer = false;
    const on_floor = (otmp.where | 0) === OBJ_FLOOR;
    const buried = (otmp.where | 0) === OBJ_BURIED;
    const moves = (game.moves) | 0;

    /* Check for corpses just placed on or in ice */
    if ((otmp.otyp | 0) === CORPSE && (on_floor || buried) && is_ice(x, y)) {
        tleft = stop_timer(action, obj_to_any(otmp));
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, obj_to_any(otmp));
        }
        if (tleft !== 0) {
            otmp.on_ice = 1;
            tleft *= _OTC_ROT_ICE_ADJUSTMENT;
            restart_timer = true;
            const age = moves - (otmp.age | 0);
            otmp.age = moves - (age * _OTC_ROT_ICE_ADJUSTMENT);
        }
    /* Check for corpses coming off ice */
    } else if (force < 0 || ((otmp.otyp | 0) === CORPSE && otmp.on_ice
                             && !((on_floor || buried) && is_ice(x, y)))) {
        tleft = stop_timer(action, obj_to_any(otmp));
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, obj_to_any(otmp));
        }
        if (tleft !== 0) {
            otmp.on_ice = 0;
            tleft = Math.trunc(tleft / _OTC_ROT_ICE_ADJUSTMENT);
            restart_timer = true;
            const age = moves - (otmp.age | 0);
            otmp.age = (otmp.age | 0) + Math.trunc(age * (_OTC_ROT_ICE_ADJUSTMENT - 1) / _OTC_ROT_ICE_ADJUSTMENT);
        }
    }

    if (restart_timer)
        start_timer(tleft, TIMER_OBJECT, action, obj_to_any(otmp));
}

/* C mkobj.c:2557-2592. Dispatch by the object's actual owning chain. */
export function obj_extract_self(obj) {
    switch (obj.where) {
    case OBJ_FREE:
    case OBJ_LUAFREE:
    case OBJ_DELETED:
        break;
    case OBJ_FLOOR:
        remove_object(obj);
        break;
    case OBJ_CONTAINED:
        extract_nobj(obj, obj.ocontainer, 'cobj');
        container_weight(obj.ocontainer);
        obj.ocontainer = null;
        break;
    case OBJ_INVENT:
        freeinv(obj);
        break;
    case OBJ_MINVENT:
        extract_nobj(obj, obj.ocarry, 'minvent');
        obj.ocarry = null;
        break;
    case OBJ_MIGRATING:
        extract_nobj(obj, _gm_migrating(), 'migrating_objs');
        break;
    case OBJ_BURIED:
        extract_nobj(obj, game.level, 'buriedobjlist');
        break;
    case OBJ_ONBILL:
        extract_nobj(obj, game, 'billobjs');
        break;
    default:
        throw new Error(`panic: obj_extract_self, where=${obj.where}`);
    }
}

/* C mkobj.c:2596-2615. (owner, key) is the JS address of the chain head.
 * Object identity, not o_id equality, determines which node is extracted. */
export function extract_nobj(obj, owner, key) {
    let curr = owner[key], prev = null;
    for (; curr; prev = curr, curr = curr.nobj) {
        if (curr === obj) {
            if (prev)
                prev.nobj = curr.nobj;
            else
                owner[key] = curr.nobj;
            break;
        }
    }
    if (!curr)
        throw new Error('panic: extract_nobj: object lost');
    obj.where = OBJ_FREE;
    obj.nobj = null;
}

/* C mkobj.c:2733-2738. Recompute each enclosing container after extraction. */
export function container_weight(object) {
    object.owt = weight(object);
    if (object.where === OBJ_CONTAINED)
        container_weight(object.ocontainer);
}

/* C mkobj.c:2834 dealloc_obj_real — JavaScript GC owns the final release. */
function dealloc_obj_real(otmp) {
    /* The object has already been unlinked and marked OBJ_DELETED by obfree. */
    return;
}

/* C ref: mkobj.c:2527-2540 — discard_minvent */
export async function discard_minvent(mtmp, uncreate_artifacts) {
    let otmp;
    while ((otmp = mtmp.minvent) != null) {
        await extract_from_minvent(mtmp, otmp, true, true);
        if (uncreate_artifacts && otmp.oartifact)
            artifact_exists(otmp, safe_oname(otmp), false, ONAME_NO_FLAGS);
        await obfree(otmp, null);
    }
}

export async function add_to_minv(mon, obj) {
    if (obj.where !== OBJ_FREE)
        throw new Error(`panic: add_to_minv: obj where=${obj.where}, not free`);
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        const target = { o: otmp }, source = { o: obj };
        if (await merged(target, source))
            return 1;
    }
    obj.where = OBJ_MINVENT;
    obj.ocarry = mon;
    obj.nobj = mon.minvent;
    mon.minvent = obj;
    return 0;
}

/* C ref: mkobj.c:1865 set_bknown(struct obj *obj, unsigned int onoff) —
 * obj->bknown is `Bitfield(bknown,1)` (obj.h:113), a 1-bit field: the
 * inequality test uses the raw (unmasked) onoff, but the assignment itself
 * narrows to 1 bit. Comment/caller convention documents onoff as always
 * "1 or 0" so this is a no-op for every in-domain caller. */
export function set_bknown(obj, onoff) {
    if (obj.bknown !== onoff) {
        obj.bknown = onoff & 1;
        if (obj.where === OBJ_INVENT && (game.moves) > 1)
            update_inventory();
    }
}

/* C mkobj.c:129-141 — release the monster snapshot stored in an object's
 * oextra.  JavaScript has no free(), so clearing the nested record and its
 * mextra is the observable equivalent of freeing it and nulling OMONST(obj). */
export function free_omonst(otmp) {
    const x = otmp?.oextra;
    const mon = x?.omonst;
    if (!x || !mon)
        return;
    if (mon.mextra)
        dealloc_mextra(mon);
    x.omonst = null;
}
