// @ts-nocheck
// mkobj.js — Container-fill helpers that mirror nethack-c/src/mklev.c and
// nethack-c/src/mkobj.c logic that mklev.js cannot carry without merge conflicts.
//
// C ref: nethack-c/src/mklev.c:1055-1132 (fill_supply_chest body)
//        nethack-c/src/mkobj.c:2680-2699  (add_to_container)
import { rn2 } from './rng.js';
import { mksobj, mkobj, add_to_container, dealloc_obj, newoextra, newomid, copy_mextra, attach_fig_transform_timeout, dead_species } from './mklev.js';
import { impossible } from './pline.js';
const OBJ_CONTAINED = 2; // C: obj.h OBJ_CONTAINED
import { permonstTemplate } from './makemon.js';
import { forget_temple_entry } from './priest.js';
import { weight } from './weight.js';
import { game } from './gstate.js';
/* C mkobj.c curse()/unbless() side-effect arms, each imported from the file that
 * already holds its one real body: */
import { confers_luck } from './attrib.js';   /* artifact.c:524 */
import { set_moreluck, drop_uswapwep, obj_to_any } from './cmd.js'; /* attrib.c / wield.c */
import { stop_timer } from './timeout.js';
import { arti_light_radius, maybe_adjust_light } from './light.js';
import { bimanual, reset_remarm } from './do_wear.js'; /* mondata.h:69 / do_wear.c */
import { book_cursed } from './spell.js';     /* spell.c:2093 */
import { cansee, Blind } from './vision.js';
import { pline, You_see, You_hear } from './display.js';
import { Your } from './do_wear.js';
import { makeplural, obj_typename, oname } from './objnam.js';
import { HALLUC, HALLUC_RES, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, MON_DETACH, ONAME_SKIP_INVUPD } from './const.js';

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

// C mkobj.c:2024-2048. Oil age is remaining fuel; other ages are birth turns.
export function fixup_oil(potion, source) {
    const POT_OIL = 321, MAX_OIL_IN_FLASK = 400;
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
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_SPEED = 302;
const POT_GAIN_ENERGY = 313;
const SCR_ENCHANT_WEAPON = 328;
const SCR_ENCHANT_ARMOR = 323;
const SCR_CONFUSE_MONSTER = 325;
const SCR_SCARE_MONSTER = 326;
const WAN_DIGGING = 428;
const SPE_HEALING = 374;
// Object-class constants (oclass values, not otyp)
const FOOD_CLASS = 7;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const GEM_CLASS = 13;
const SCROLL_CLASS = 9;
const POTION_CLASS = 8;
const RING_CLASS = 4;
const SPBOOK_CLASS = 10;
/** C: SPBOOK_no_NOVEL — mkobj() uses negative oclass to exclude SPE_NOVEL */
const SPBOOK_no_NOVEL = -10; // 0 - (int)SPBOOK_CLASS
// ── oc_level table for spellbooks ───────────────────────────────────────────
// C ref: nethack-c/include/objects.h SPELL macro 6th param; objclass.h:104
//   #define oc_level oc_oc2
// Spellbooks start at otyp 366 (SPE_DIG = FIRST_SPELL) in this build.
// The 42 entries correspond to otyp 366-407 (SPE_DIG ... SPE_BLANK_PAPER).
// Index i in this array => otyp (366 + i).
// Source: objects.h SPELL rows, column 6 (the "level" field).
const SPBOOK_FIRST_OTYP = 366;
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
        stop_timer(6 /* FIG_TRANSFORM */, obj_to_any(otmp));
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
        stop_timer(6 /* FIG_TRANSFORM */, obj_to_any(otmp));
    }
    if (otmp.lamplit)
        await maybe_adjust_light(otmp, old_light);
}

/* C mkobj.c:1781-1817 curse(struct obj *otmp). */
export async function curse(otmp) {
    if (!otmp)
        return;
    if ((otmp.oclass | 0) === _BC_COIN_CLASS)
        return;                                       /* C:1787-1788 */
    const old_light = otmp.lamplit ? arti_light_radius(otmp) : 0;
    const already_cursed = !!otmp.cursed;             /* C:1791 */
    otmp.blessed = 0;
    otmp.cursed = 1;
    /* C:1793-1795 — welded two-handed weapon interferes with some armor
     * removal. */
    if (otmp === game.u?.uwep && bimanual(game.u.uwep))
        reset_remarm();
    if (otmp === game.u?.uswapwep && game.u.twoweap)
        await drop_uswapwep();
    if (_bc_carried(otmp) && confers_luck(otmp)) {    /* C:1801-1802 */
        set_moreluck();
    } else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING) {
        otmp.owt = weight(otmp);
    } else if ((otmp.otyp | 0) === _BC_FIGURINE) {
        /* C:1805-1809 — a cursed figurine of a still-living species that is
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

/* C mkobj.c:3843-3870 pudding_merge_message(): give a message if hero
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
        await You_hear('a faint sloshing sound.');
    }
}
