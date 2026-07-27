// youprop.js — the hero-property macros from include/youprop.h.
//
// Same role js/monst.js plays for include/monst.h, js/obj.js for include/obj.h
// and js/mondata.js for include/mondata.h: a header's macros are shared by
// every C file that includes it, so they need one JS home rather than a
// private copy per module.
//
// Hallucination arrived here because two modules wanted it and js/invent.js
// had it as a private `return false` stub. A stub is fine while nothing sets
// the property, but it goes on being quietly wrong after something does, and
// nothing catches that. Reading the real uprops entry costs the same and
// starts telling the truth by itself.
//
// Nothing here draws.

import { game } from './gstate.js';
import { is_flyer } from './mondata.js';
/* C indexes u.uprops BY THESE NUMBERS -- u.uprops[HUNGER] with HUNGER 28.
   Keying by the constant rather than by a string keeps the eventual
   structure an array of LAST_PROP+1 entries, as in the C, instead of a
   bag of string keys with no C counterpart. */
import {
    STONE_RES, FLYING, CLAIRVOYANT, BLINDED, CONFLICT, CONFUSION, DEAF, DETECT_MONSTERS, DISPLACED, FIRE_RES, FUMBLING, HALLUC, HALLUC_RES, HUNGER, INFRAVISION, INVIS, LEVITATION, REGENERATION, SEE_INVIS, SICK, STUNNED, TELEPAT, TELEPORT_CONTROL, VOMITING, WARN_OF_MON, WOUNDED_LEGS, GLIB, FROMOUTSIDE } from './const.js';

export const H = (prop) => !!(game.u?.uprops?.[prop]?.intrinsic);   /* prop is a NUMBER, as in C */
export const E = (prop) => !!(game.u?.uprops?.[prop]?.extrinsic);
export const B = (prop) => !!(game.u?.uprops?.[prop]?.blocked);


// include/youprop.h:116 HHallucination — u.uprops[HALLUC].intrinsic.
// The C comment above it reads "Hallucination is solely a timeout", which is
// why this is .intrinsic and there is no EHallucination to go with it.
export const HHallucination = () => H(HALLUC);

// include/youprop.h:117 HHalluc_resistance, :118 EHalluc_resistance,
// :119 Halluc_resistance. The port models uprops as a flat prop -> value map
// rather than C's {intrinsic, extrinsic, blocked} struct, so the two halves
// collapse into the one read; when uprops grows the struct, split them here.
export const Halluc_resistance = () => H(HALLUC_RES) || E(HALLUC_RES);

// include/youprop.h:120 Hallucination()
export const Hallucination = () => HHallucination() && !Halluc_resistance();

// include/youprop.h:123 HDeaf, :124 EDeaf, :125 Deaf.
// As with HALLUC above, the flat uprops map collapses intrinsic and extrinsic
// into one read. u.uroleplay.deaf is the deaf conduct, chosen at startup.
export const Deaf = () => H(DEAF) || E(DEAF) || !!game.u?.uroleplay?.deaf;

// include/youprop.h:279 Underwater()
export const Underwater = () => !!game.u?.uinwater;

// include/youprop.h:399 Unaware — (gm.multi < 0 && (unconscious() ||
// is_fainted())).
//
// The multi test comes first in the C and it is a real short circuit, not a
// cheap-test-first optimisation: with multi >= 0 the macro is FALSE whatever
// the other two return. So this is exactly right whenever the hero is not in a
// multi-turn occupation, which is the overwhelmingly common case, and only the
// multi < 0 branch is a gap. unconscious() and is_fainted() both need sleep
// and fainting state that is not ported; recording there rather than guessing
// keeps the gap visible instead of burying it in a `return false`.
export const Unaware = () => {
    if (!(game.multi < 0))
        return false;               /* definitively false, nothing to guess */
    (game.unported ||= new Set()).add('youprop:Unaware');
    return false;
};

// include/youprop.h:152 See_invisible — (HSee_invisible || ESee_invisible).
export const See_invisible = () => H(SEE_INVIS) || E(SEE_INVIS);

// include/youprop.h:198 Invis — ((HInvis || EInvis) && !BInvis).
// The flat uprops map has no blocked slot, so the BInvis term has nowhere to
// live yet; nothing blocks invisibility today, so this is right for now and
// the term goes in when uprops grows the struct.
// include/youprop.h:198 Invis — INCOMPLETE, and deliberately flagged.
//
//     #define Invis ((HInvis || EInvis) && !BInvis)
//
// The !BInvis term is MISSING here and cannot be written yet: uprops has no
// {intrinsic, extrinsic, blocked} structure, so there is nothing to read a
// blocked bit from. Today every term is false so the result is right by
// accident; the moment uprops is initialised this will report invisibility
// for a hero whose invisibility is BLOCKED.
//
// Fix this WITH the uprops structure, not before and not after.
export const Invis = () => (H(INVIS) || E(INVIS)) && !B(INVIS);

// include/youprop.h:240 Levitation — ((HLevitation || ELevitation) && !BLevitation).
//
// The !BLevitation term is MISSING here, exactly as in Invis above: uprops
// has no blocked field to read yet. Today every term is false so the answer
// is right by accident; once uprops is initialised this reports levitation
// for a hero whose levitation is BLOCKED. Fix it WITH the structure.
export const Levitation = () => (H(LEVITATION) || E(LEVITATION)) && !B(LEVITATION);

// include/youprop.h:253 Flying — note the steed term: riding a flying mount
// counts, which is why this cannot be a plain uprops read.
// include/youprop.h:253 Flying — the steed term is INSIDE the parentheses,
// so a blocked hero is not flying even while riding a flyer:
//     ((HFlying || EFlying || (u.usteed && is_flyer(...))) && !BFlying)
// Writing it as `(H || E || steed) ` without the && !B, or as
// `(H || E) && !B || steed`, both get the riding case wrong.
export const Flying = () =>
    (H(FLYING) || E(FLYING)
     || !!(game.u?.usteed && is_flyer(game.u.usteed.data)))
    && !B(FLYING);

// include/youprop.h Fire_resistance — (HFire_resistance || EFire_resistance).
export const Fire_resistance = () => H(FIRE_RES) || E(FIRE_RES);

// include/youprop.h:147 Hunger — (HHunger || EHunger).
//
// No blocked term, unlike Invis, so this one IS complete in shape: when
// uprops grows the struct, the two halves become
// uprops[HUNGER].intrinsic and .extrinsic and nothing else changes.
export const Hunger = () => H(HUNGER) || E(HUNGER);

// include/youprop.h:182 Clairvoyant — ((HClairvoyant || EClairvoyant)
// && !BClairvoyant).
//
// This one already had its blocked term modelled, unlike Invis: the call
// sites in js/allmain.js and js/attrib.js test a SEPARATE pseudo-property
// key, uprops.BLOCKED_CLAIRVOYANT, standing in for
// uprops[CLAIRVOYANT].blocked. That is a structure the C does not have, so
// when uprops grows the real struct the pseudo-key must be FOLDED IN here
// and deleted rather than left alongside.
export const Clairvoyant = () =>
    (H(CLAIRVOYANT) || E(CLAIRVOYANT)) && !B(CLAIRVOYANT);

// The next block is straight from include/youprop.h. Note the three SHAPES,
// which is why each is written out rather than generated: some combine
// intrinsic and extrinsic, some are intrinsic ONLY, and none of these has a
// blocked term (unlike Invis and Levitation above).

// include/youprop.h:138 Wounded_legs — (HWounded_legs || EWounded_legs)
export const Wounded_legs = () => H(WOUNDED_LEGS) || E(WOUNDED_LEGS);

// include/youprop.h:345 Regeneration — (HRegeneration || ERegeneration)
export const Regeneration = () => H(REGENERATION) || E(REGENERATION);

// include/youprop.h:129 Fumbling — (HFumbling || EFumbling)
export const Fumbling = () => H(FUMBLING) || E(FUMBLING);

// include/youprop.h:81 Stunned — HStun. INTRINSIC ONLY: there is no EStun
// term, so an item cannot confer it. The property key is STUNNED while the
// C intrinsic macro is HStun; do not let the name difference suggest a
// second property.
export const Stunned = () => H(STUNNED);

// include/youprop.h:84 Confusion — HConfusion. Intrinsic only, as Stunned.
export const Confusion = () => H(CONFUSION);

// include/youprop.h:112 Glib — u.uprops[GLIB].intrinsic. Intrinsic only.
//
// The C macro is the raw long, not a truth value, so `Glib & TIMEOUT` is legal
// there and yields the remaining turn count. Every use we have ported so far
// tests it as a condition, which H() answers correctly. A caller that needs the
// timeout must read game.u.uprops[GLIB].intrinsic directly rather than widening
// this, so the boolean readers stay uniform.
export const Glib = () => H(GLIB);

// include/youprop.h:108 Sick — u.uprops[SICK].intrinsic. Intrinsic only,
// and C spells it out rather than going through an HSick macro.
export const Sick = () => H(SICK);

// include/youprop.h:111 Vomiting — u.uprops[VOMITING].intrinsic.
export const Vomiting = () => H(VOMITING);

// include/youprop.h Teleport_control — (HTeleport_control || ETeleport_control)
export const Teleport_control = () => H(TELEPORT_CONTROL) || E(TELEPORT_CONTROL);

// include/youprop.h:190 Detect_monsters — (HDetect_monsters || EDetect_monsters)
export const Detect_monsters = () => H(DETECT_MONSTERS) || E(DETECT_MONSTERS);

// include/youprop.h:156 Blind_telepat — (HTelepat || ETelepat). NOTE THE NAME:
// the macro is Blind_telepat while the property key is TELEPAT, and there is
// no separate "Telepat" macro. Reading the key name as the macro name would
// invent one.
export const Blind_telepat = () => H(TELEPAT) || E(TELEPAT);

// include/youprop.h:170 Warn_of_mon — (HWarn_of_mon || EWarn_of_mon)
export const Warn_of_mon = () => H(WARN_OF_MON) || E(WARN_OF_MON);

// include/youprop.h:186 Infravision — (HInfravision || EInfravision)
export const Infravision = () => H(INFRAVISION) || E(INFRAVISION);

// include/youprop.h:218 Conflict — (HConflict || EConflict)
export const Conflict = () => H(CONFLICT) || E(CONFLICT);

// include/youprop.h:204 Displaced — (HDisplaced || EDisplaced)
export const Displaced = () => H(DISPLACED) || E(DISPLACED);

// include/youprop.h:92 Blinded — (HBlinded && !BBlinded).
//
// I first wrote this as "intrinsic only" and that is WRONG: it has a blocked
// term, and it has no extrinsic half, which is a shape none of the others
// use. The !BBlinded term is missing here for the same reason as Invis and
// Levitation -- no blocked field yet. Fix all three WITH the structure.
export const Blinded = () => H(BLINDED) && !B(BLINDED);

// include/youprop.h:96 Blindfolded — EBlinded. A worn blindfold or towel sets
// BLINDED's extrinsic; LENSES deliberately do NOT.
export const Blindfolded = () => E(BLINDED);

// include/youprop.h:97 Blindfolded_only
export const Blindfolded_only = () => Blindfolded() && !Blinded();

// include/youprop.h:94 PermaBlind — the OPTIONS:blind conduct.
export const PermaBlind = () => !!(game.u?.uprops?.[BLINDED]?.intrinsic & FROMOUTSIDE);

// include/youprop.h:103 Blind — ((HBlinded || EBlinded) && !BBlinded).
//
// The C notes that `(Blinded || Blindfolded)` would also work today, because
// BBlinded (from artifact lenses) and Blindfolded are mutually exclusive, but
// applies !BBlinded to BOTH terms deliberately for robustness. Ported as
// written, not as the equivalent-today shortcut.
export const Blind = () => (H(BLINDED) || E(BLINDED)) && !B(BLINDED);

// include/youprop.h:77 Punished — (uball != 0)
export const Punished = () => !!game.u?.uball;


/* ------------------------------------------------------------------------
   The three field readers every youprop.h macro is built from.

   C does not write u.uprops[X].intrinsic at each call site either; it
   defines a per-property macro trio and composes those:

       #define HHunger u.uprops[HUNGER].intrinsic
       #define EHunger u.uprops[HUNGER].extrinsic
       #define Hunger  (HHunger || EHunger)

   These are the generic form of that trio. They are ADDITIVE and unused so
   far: the 28 accessors above still read the VALUE, which is correct while
   uprops is undefined and WRONG the moment it becomes a struct, because an
   object is truthy.

   The atomic change described in docs/plan/STATUS.md is: rewrite each
   accessor in terms of H/E/B per its own C macro, add the three missing
   blocked terms (Invis, Levitation, Blinded), initialise uprops, and score.
   Until all of that lands together these three are just sitting here.
   ------------------------------------------------------------------------ */

// include/youprop.h:65 Stone_resistance — (HStone_resistance || EStone_resistance)
export const Stone_resistance = () => H(STONE_RES) || E(STONE_RES);

/* NOT PORTED and NOT A PROPERTY: include/youprop.h:401 is
       #define Hate_silver (u.ulycn >= LOW_PM || hates_silver(youmonst.data))
   which reads the hero's LYCANTHROPY and current FORM, not u.uprops. I
   recorded it once as "an ordinary property awaiting a writer" and that was
   wrong. It needs u.ulycn and a hates_silver() port, neither of which
   exists; js/artifact.js records it at its call site. */
