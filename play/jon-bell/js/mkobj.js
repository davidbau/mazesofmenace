// @ts-nocheck
// mkobj.js — Container-fill helpers that mirror nethack-c/src/mklev.c and
// nethack-c/src/mkobj.c logic that mklev.js cannot carry without merge conflicts.
//
// C ref: nethack-c/src/mklev.c:1055-1132 (fill_supply_chest body)
//        nethack-c/src/mkobj.c:2680-2699  (add_to_container)
import { rn2 } from './rng.js';
import { mksobj, mkobj } from './mklev.js';
import { weight } from './weight.js';
import { game } from './gstate.js';
/* C mkobj.c curse()/unbless() side-effect arms, each imported from the file that
 * already holds its one real body: */
import { confers_luck } from './attrib.js';   /* artifact.c:524 */
import { set_moreluck } from './cmd.js';      /* attrib.c:454 */
import { bimanual, reset_remarm } from './do_wear.js'; /* mondata.h:69 / do_wear.c */
import { book_cursed } from './spell.js';     /* spell.c:2093 */
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
// ── add_to_container ─────────────────────────────────────────────────────────
// C ref: nethack-c/src/mkobj.c:2680-2699
// Mirrors the mklev.js-internal add_to_container exactly.
// (mklev.js does not export add_to_container, so we carry our own copy here.)
const OBJ_CONTAINED = 2; // C: obj.h OBJ_CONTAINED (3 is OBJ_INVENT)
function add_to_container(container, obj) {
    obj.where = OBJ_CONTAINED;
    obj.ocontainer = container;
    obj.nobj = container.cobj;
    container.cobj = obj;
    return obj;
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
            otmp.owt = otmp.owt || 1; // mirrors: otmp->owt = weight(otmp)
        }
        cursed = !!(otmp && otmp.cursed);
        // C mklev.c:1078  add_to_container(supply_chest, otmp);
        if (otmp)
            add_to_container(supply_chest, otmp);
        // C mklev.c:1080-1084
        if (++tryct >= 50)
            break; // impossible() guard
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
                // (dealloc_obj is a no-op stub in JS; we just drop the reference)
                if (otmp2 && spbook_oc_level(otmp2.otyp) < spbook_oc_level(otmp.otyp)) {
                    otmp = otmp2; // prefer lower-level book (C: dealloc the higher one)
                }
                // else: discard otmp2 (C: dealloc_obj(otmp2)) — JS GC handles it
            }
        }
        // C mklev.c:1128  add_to_container(supply_chest, otmp);
        if (otmp)
            add_to_container(supply_chest, otmp);
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

/* C obj.h:373 carried(obj) = (obj->where == OBJ_INVENT).  This port does not
 * carry obj->where on every object, so match the way js/objnam.js:3002 and
 * js/ball.js:305 already answer it: walk gi.invent. */
function _bc_carried(obj) {
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj)
            return true;
    return false;
}
/* C mkobj.c:1766-1780 unbless(struct obj *otmp). */
export function unbless(otmp) {
    if (!otmp)
        return;
    /* C:1770-1771 — if (otmp->lamplit) old_light = arti_light_radius(otmp);
     * omitted, see (a) above. */
    otmp.blessed = 0;
    if (_bc_carried(otmp) && confers_luck(otmp))
        set_moreluck();
    else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    /* C:1778-1779 — if (otmp->lamplit) maybe_adjust_light(otmp, old_light); */
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
 * The lamplit bracket is omitted for reason (a) above.  The FIGURINE arm is
 * the exact mirror of curse()'s figurine arm and is omitted for the same
 * reason recorded there — this port has no FIG_TRANSFORM timer to stop, so
 * there is nothing for stop_timer to cancel.  Both are RNG-free. */
export function uncurse(otmp) {
    if (!otmp)
        return;
    /* C:1822-1823 — lamplit old_light, omitted (a). */
    otmp.cursed = 0;
    if (_bc_carried(otmp) && confers_luck(otmp))
        set_moreluck();
    else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    else if ((otmp.otyp | 0) === _BC_FIGURINE && otmp.timed) {
        /* C:1830-1831 stop_timer(FIG_TRANSFORM, ...) — omitted, see above. */
    }
    /* C:1834-1835 — if (otmp->lamplit) maybe_adjust_light(otmp, old_light); */
}

/* C mkobj.c:1781-1817 curse(struct obj *otmp). */
export function curse(otmp) {
    if (!otmp)
        return;
    if ((otmp.oclass | 0) === _BC_COIN_CLASS)
        return;                                       /* C:1787-1788 */
    /* C:1789-1790 — lamplit old_light, omitted (a). */
    const already_cursed = !!otmp.cursed;             /* C:1791 */
    otmp.blessed = 0;
    otmp.cursed = 1;
    /* C:1793-1795 — welded two-handed weapon interferes with some armor
     * removal. */
    if (otmp === game.u?.uwep && bimanual(game.u.uwep))
        reset_remarm();
    /* C:1796-1799 — `if (otmp == uswapwep && u.twoweap) drop_uswapwep();`
     * omitted, see (b) above. */
    if (_bc_carried(otmp) && confers_luck(otmp)) {    /* C:1801-1802 */
        set_moreluck();
    } else if ((otmp.otyp | 0) === _BC_BAG_OF_HOLDING) {
        otmp.owt = weight(otmp);
    } else if ((otmp.otyp | 0) === _BC_FIGURINE) {
        /* C:1805-1809 — a cursed figurine of a still-living species that is
         * carried (by hero or monster) gets a transform timer:
         *     if (otmp->corpsenm != NON_PM && !dead_species(otmp->corpsenm, TRUE)
         *         && (carried(otmp) || mcarried(otmp)))
         *         attach_fig_transform_timeout(otmp);
         * Omitted for the same reason as (a)/(b): attach_fig_transform_timeout
         * has no real body anywhere in js/ — js/mklev.js:1246 is an empty stub
         * and js/cmd.js:39420 is a throw, and neither is exported.  RNG-free, so
         * the draw order is unaffected; left as a comment rather than a call to
         * a stub so the gap stays visible at the line it belongs on. */
    } else if ((otmp.oclass | 0) === _BC_SPBOOK_CLASS) {
        /* if book hero is reading becomes cursed, interrupt */
        if (!already_cursed)
            book_cursed(otmp);
    }
    /* C:1814-1815 — if (otmp->lamplit) maybe_adjust_light(otmp, old_light); */
}
