import { P_CROSSBOW, P_BOW, P_BOOMERANG, P_DART,
         P_SHORT_SWORD, P_SABER } from './const.js';
// obj.js — the object-classification macros.
// C ref: include/obj.h
//
// A header in C, so every file includes it. Keeping these as one module rather
// than per-file copies is what stops the shadowing class of bug: four times in
// this port a function was ported next to an older local copy that kept
// winning, and nothing about that shows up in the score.
//
// Nothing here draws.

import { game } from './gstate.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { MFLAGS, PMNAMES, MONSYMS } from './monst_data.js';
import { humanoid, noncorporeal } from './mondata.js';

// include/objclass.h:36 enum obj_armor_types
export const ARM_SUIT = 0, ARM_SHIELD = 1, ARM_HELM = 2, ARM_GLOVES = 3,
             ARM_BOOTS = 4, ARM_CLOAK = 5, ARM_SHIRT = 6;

const armcat = (otmp) => game.objects[otmp.otyp].oc_armcat;
const is_armor = (otmp) => otmp.oclass === OCLASSES.ARMOR_CLASS;

// include/obj.h:280-298
export const is_shield = (o) => is_armor(o) && armcat(o) === ARM_SHIELD;
export const is_helmet = (o) => is_armor(o) && armcat(o) === ARM_HELM;
export const is_boots  = (o) => is_armor(o) && armcat(o) === ARM_BOOTS;
export const is_gloves = (o) => is_armor(o) && armcat(o) === ARM_GLOVES;
export const is_cloak  = (o) => is_armor(o) && armcat(o) === ARM_CLOAK;
export const is_shirt  = (o) => is_armor(o) && armcat(o) === ARM_SHIRT;
export const is_suit   = (o) => is_armor(o) && armcat(o) === ARM_SUIT;

// include/obj.h:257 bimanual()
export const bimanual = (o) => (o.oclass === OCLASSES.WEAPON_CLASS
                                || o.oclass === OCLASSES.TOOL_CLASS)
                            && !!game.objects[o.otyp].oc_bimanual;

// include/obj.h:418 is_flimsy()
export const is_flimsy = (o) => game.objects[o.otyp].oc_material <= MATERIALS.LEATHER
                             || o.otyp === ONAMES.RUBBER_HOSE;

// include/obj.h:444 WrappingAllowed() — which monsters a mummy wrapping fits.
// Any size from small to huge, so small is what lets hobbits, gnomes and
// kobolds wear all cloaks, while large and huge lets giants wear wrappings but
// nothing else.
export const WrappingAllowed = (mptr) =>
    humanoid(mptr) && mptr.msize >= MFLAGS.MZ_SMALL && mptr.msize <= MFLAGS.MZ_HUGE
    && !noncorporeal(mptr) && mptr.mlet !== MONSYMS.S_CENTAUR
    && mptr.pmidx !== PMNAMES.PM_WINGED_GARGOYLE
    && mptr.pmidx !== PMNAMES.PM_MARILITH;

// include/obj.h:75 — obj->where. These are an enum in all but name, and the
// values are load-bearing: obj_extract_self() switches on them.
export const OBJ_FREE = 0;      /* object not attached to anything */
export const OBJ_FLOOR = 1;     /* object on floor */
export const OBJ_CONTAINED = 2; /* object in a container */
export const OBJ_INVENT = 3;    /* object in the hero's inventory */
export const OBJ_MINVENT = 4;   /* object in a monster inventory */
export const OBJ_MIGRATING = 5; /* object sent off to another level */
export const OBJ_BURIED = 6;    /* object buried */
export const OBJ_ONBILL = 7;    /* object on shk bill */

// include/obj.h:332
export const carried = (o) => o.where === OBJ_INVENT;
// include/obj.h:333
export const mcarried = (o) => o.where === OBJ_MINVENT;

// include/obj.h:327 Is_pudding() — the four glob types by NAME, not by the
// globby flag. mksobj sets globby for exactly these, so the two agree today,
// but the flag is a consequence of being a glob rather than the definition of
// one.
export const Is_pudding = (o) =>
    o.otyp === ONAMES.GLOB_OF_GRAY_OOZE || o.otyp === ONAMES.GLOB_OF_BROWN_PUDDING
    || o.otyp === ONAMES.GLOB_OF_GREEN_SLIME || o.otyp === ONAMES.GLOB_OF_BLACK_PUDDING;

// include/obj.h:337 Is_container()
export const Is_container = (o) =>
    o.otyp >= ONAMES.LARGE_BOX && o.otyp <= ONAMES.BAG_OF_TRICKS;

// include/obj.h:382 Is_candle()
export const Is_candle = (o) =>
    o.otyp === ONAMES.TALLOW_CANDLE || o.otyp === ONAMES.WAX_CANDLE;

// include/obj.h:334 Has_contents()
export const Has_contents = (o) => !!(o.cobj && o.cobj.length);

// include/objclass.h:194 is_metallic() — IRON through MITHRIL.
export const is_metallic = (otmp) =>
    game.objects[otmp.otyp].oc_material >= MATERIALS.IRON
    && game.objects[otmp.otyp].oc_material <= MATERIALS.MITHRIL;

// include/objclass.h:201 is_crackable() — GLASS armor only; the oclass test is
// what keeps glass weapons and gems out. Comment there points at
// erosion_matters().
export const is_crackable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
    && otmp.oclass === OCLASSES.ARMOR_CLASS;

// include/obj.h:299 is_elven_armor()
export const is_elven_armor = (otmp) =>
    otmp.otyp === ONAMES.ELVEN_LEATHER_HELM
    || otmp.otyp === ONAMES.ELVEN_MITHRIL_COAT
    || otmp.otyp === ONAMES.ELVEN_CLOAK
    || otmp.otyp === ONAMES.ELVEN_SHIELD
    || otmp.otyp === ONAMES.ELVEN_BOOTS;

// include/obj.h:304 is_orcish_armor()
export const is_orcish_armor = (otmp) =>
    otmp.otyp === ONAMES.ORCISH_HELM
    || otmp.otyp === ONAMES.ORCISH_CHAIN_MAIL
    || otmp.otyp === ONAMES.ORCISH_RING_MAIL
    || otmp.otyp === ONAMES.ORCISH_CLOAK
    || otmp.otyp === ONAMES.URUK_HAI_SHIELD
    || otmp.otyp === ONAMES.ORCISH_SHIELD;

// include/obj.h:309 is_dwarvish_armor()
export const is_dwarvish_armor = (otmp) =>
    otmp.otyp === ONAMES.DWARVISH_IRON_HELM
    || otmp.otyp === ONAMES.DWARVISH_MITHRIL_COAT
    || otmp.otyp === ONAMES.DWARVISH_CLOAK
    || otmp.otyp === ONAMES.DWARVISH_ROUNDSHIELD;

// include/obj.h:314 is_gnomish_armor() — literally (FALSE) in the C. There is
// no gnomish armor type, and the macro exists so the racial-armor checks can be
// written uniformly. Ported as the constant it is, not omitted.
export const is_gnomish_armor = (_otmp) => false;

// include/obj.h:338 Is_box()
export const Is_box = (o) => o.otyp === ONAMES.LARGE_BOX || o.otyp === ONAMES.CHEST;

// include/obj.h:435-436 is_mines_prize() / is_soko_prize()
//
// One-line identity tests against the object id recorded when the Mines or
// Sokoban prize was generated. Monsters skip these on the floor until the
// hero has picked them up, at which point they stop being special.
//
// svc.context.achieveo is not modelled, so both ids are undefined and these
// return false -- which is correct for any level that has not generated a
// prize, and wrong only on the Mines-end and Sokoban-end levels. Recording
// that here rather than in the callers, because the callers cannot tell.
export const is_mines_prize = (o) =>
    o?.o_id !== undefined && o.o_id === game.context?.achieveo?.mines_prize_oid;
export const is_soko_prize = (o) =>
    o?.o_id !== undefined && o.o_id === game.context?.achieveo?.soko_prize_oid;
// include/obj.h:238 is_ammo() — arrows, bolts and the gems a sling fires.
// The oc_skill range is NEGATIVE: -P_CROSSBOW..-P_BOW marks launcher ammo.
export const is_ammo = (o) =>
    (o.oclass === OCLASSES.WEAPON_CLASS || o.oclass === OCLASSES.GEM_CLASS)
    && game.objects[o.otyp].oc_skill >= -P_CROSSBOW
    && game.objects[o.otyp].oc_skill <= -P_BOW;

// include/obj.h:245 is_missile() — thrown weapons: darts, shuriken,
// boomerangs. Also a negative oc_skill range, adjacent to is_ammo's.
export const is_missile = (o) =>
    (o.oclass === OCLASSES.WEAPON_CLASS || o.oclass === OCLASSES.TOOL_CLASS)
    && game.objects[o.otyp].oc_skill >= -P_BOOMERANG
    && game.objects[o.otyp].oc_skill <= -P_DART;

// include/obj.h:223 is_sword() — a WEAPON_CLASS object whose skill falls in
// the sword band. The band is contiguous by design: P_SHORT_SWORD through
// P_SABER, so this is a range test rather than a list, exactly as in C.
//
// Reads game.objects directly, matching bimanual() four lines above rather
// than taking the table as a parameter -- this file already imports game.
export const is_sword = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= P_SHORT_SWORD
    && game.objects[o.otyp].oc_skill <= P_SABER;
