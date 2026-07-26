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
