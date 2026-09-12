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
import { FROMOUTSIDE } from './const.js';
import { amphibious, breathless, haseyes, is_flyer, is_swimmer,
         resists_cold, hates_silver } from './mondata.js';
import { Upolyd } from './const.js';
import { unconscious } from './trap.js';
import { is_fainted } from './eat.js';
import { ONAMES } from './objects_data.js';
import { I_SPECIAL, TIMEOUT, W_ARTI } from './const.js';

// include/youprop.h:116 HHallucination — u.uprops[HALLUC].intrinsic.
// The C comment above it reads "Hallucination is solely a timeout", which is
// why this is .intrinsic and there is no EHallucination to go with it.
export const HHallucination = () => !!game.u?.uprops?.HALLUC;

// include/youprop.h:117 HHalluc_resistance, :118 EHalluc_resistance,
// :119 Halluc_resistance. The port models uprops as a flat prop -> value map
// rather than C's {intrinsic, extrinsic, blocked} struct, so the two halves
// collapse into the one read; when uprops grows the struct, split them here.
export const Halluc_resistance = () =>
    !!(game.u?.intrinsic?.HHalluc_resistance || game.u?.uprops?.HALLUC_RES);

// include/youprop.h:120 Hallucination()
export const Hallucination = () => HHallucination() && !Halluc_resistance();

// include/youprop.h:123 HDeaf, :124 EDeaf, :125 Deaf.
// As with HALLUC above, the flat uprops map collapses intrinsic and extrinsic
// into one read. u.uroleplay.deaf is the deaf conduct, chosen at startup.
export const Deaf = () => !!game.u?.intrinsic?.HDeaf
                         || !!game.u?.uprops?.DEAF
                         || !!game.u?.uroleplay?.deaf;

// include/youprop.h:103 Blind. An eyeless polymorph form contributes the
// FROMFORM half of HBlinded in C, alongside timed and equipment blindness.
// include/youprop.h:103 Blind — ((HBlinded || EBlinded) && !BBlinded). Read
// from the property words, not from the cached u.ublind: nh_timeout() tests
// Blind right after decrementing HBlinded to zero, and the C sees no
// blindness there (so a rush is not interrupted by "You can see again.").
// An eyeless polymorph form carries the FROMFORM bit (set_uasmon()).
export const Blind = () => !game.u?.blocked?.BLINDED
    && (!!game.u?.intrinsic?.HBlinded || Blindfolded());

// include/youprop.h:92 Blinded, :96 Blindfolded, :97 Blindfolded_only.
export const Blinded = () => !game.u?.blocked?.BLINDED
    && (!!game.u?.intrinsic?.HBlinded
        || !!(Upolyd(game.u) && game.youmonst?.data && !haseyes(game.youmonst.data)));
export const Blindfolded = () => !!game.u?.ublindf
    && (game.u.ublindf.otyp === ONAMES.BLINDFOLD || game.u.ublindf.otyp === ONAMES.TOWEL);
export const Blindfolded_only = () => Blindfolded() && !Blinded();

// include/youprop.h:65 Stone_resistance — flat uprops map collapses the
// intrinsic and extrinsic halves into one read.
export const Stone_resistance = () =>
    !!(game.u?.intrinsic?.HStone_resistance || game.u?.uprops?.STONE_RES);

// include/youprop.h:129 Fumbling
export const Fumbling = () => !!(game.u?.intrinsic?.HFumbling
                                 || game.u?.uprops?.FUMBLING);

// include/youprop.h:385 Fixed_abil — extrinsic only (ring of sustain ability)
export const Fixed_abil = () => !!game.u?.uprops?.FIXED_ABIL;

// include/youprop.h:132 Glib, the timed slippery-fingers property.
export const Glib = () => !!(game.u?.intrinsic?.HGlib
                             || game.u?.uprops?.GLIB);

// include/youprop.h:279 Underwater()
export const Underwater = () => !!game.u?.uinwater;

// include/youprop.h:399 Unaware — (gm.multi < 0 && (unconscious() ||
// is_fainted())).
//
// The multi test comes first in the C and it is a real short circuit, not a
// cheap-test-first optimisation: with multi >= 0 the macro is FALSE whatever
// the other two return. unconscious() reads u.usleep (set by fall_asleep,
// cleared by unmul) and is_fainted() reads u.uhs; the import cycle with
// eat.js is the same cross-reference youprop.h has with eat.c and resolves
// because both uses are call-time, not module-eval-time.
export const Unaware = () =>
    (game.multi ?? 0) < 0 && (unconscious() || is_fainted());

// include/youprop.h:152 See_invisible — (HSee_invisible || ESee_invisible).
export const See_invisible = () => !!(game.u?.intrinsic?.HSee_invisible
                                      || game.u?.uprops?.SEE_INVIS);

// include/youprop.h:190 Detect_monsters
export const Detect_monsters = () => !!(game.u?.intrinsic?.HDetect_monsters
                                        || game.u?.uprops?.DETECT_MONSTERS);

// include/youprop.h:198 Invis — ((HInvis || EInvis) && !BInvis).
export const Invis = () => !!(game.u?.intrinsic?.HInvis
                              || game.u?.uprops?.INVIS)
                           && !game.u?.blocked?.INVIS;

// include/youprop.h:199 Invisible, invisibility the hero cannot see.
export const Invisible = () => Invis() && !See_invisible();

// include/youprop.h:205 Displaced
export const Displaced = () => !!(game.u?.intrinsic?.HDisplaced
                                  || game.u?.uprops?.DISPLACED);

// include/youprop.h:143 Sleepy — (HSleepy || ESleepy).
export const Sleepy = () => !!(game.u?.intrinsic?.HSleepy
                               || game.u?.uprops?.SLEEPY);

// include/youprop.h:170 Warn_of_mon — (HWarn_of_mon || EWarn_of_mon).
export const Warn_of_mon = () => !!(game.u?.intrinsic?.HWarn_of_mon
                                    || game.u?.uprops?.WARN_OF_MON);

// include/youprop.h:240 Levitation — ((HLevitation || ELevitation) && !BLevitation).
export const Levitation = () =>
    !!(game.u?.intrinsic?.HLevitation || game.u?.uprops?.LEVITATION)
    && !game.u?.blocked?.LEVITATION;

// include/youprop.h:242 Lev_at_will — levitation the hero can end at will:
// the I_SPECIAL bit (a blessed potion, a spell) or an artifact, with no
// other source in either word.
export const Lev_at_will = () => {
    const h = game.u?.intrinsic?.HLevitation | 0, e = game.u?.uprops?.LEVITATION | 0;
    return ((h & I_SPECIAL) !== 0 || (e & W_ARTI) !== 0)
        && (h & ~(I_SPECIAL | TIMEOUT)) === 0
        && (e & ~W_ARTI) === 0;
};

// include/youprop.h:253 Flying — note the steed term: riding a flying mount
// counts, which is why this cannot be a plain uprops read.
export const Flying = () =>
    !!(game.u?.intrinsic?.HFlying || game.u?.uprops?.FLYING
       || (game.u?.usteed && is_flyer(game.u.usteed.data)))
    && !game.u?.blocked?.FLYING;

// include/youprop.h Fire_resistance — (HFire_resistance || EFire_resistance).
// The H word carries the FROMEXPER/FROMRACE/FROMOUTSIDE source bits (role
// grant, race grant, eaten corpse); the E side is worn equipment (uprops).
export const Fire_resistance = () => !!(game.u?.intrinsic?.HFire_resistance
                                        || game.u?.uprops?.FIRE_RES);

// include/youprop.h — the rest of the H||E property pairs the innate-ability
// tables (src/attrib.c role_abil/race_abil) and corpse intrinsics can set.
export const Cold_resistance = () => !!(game.u?.intrinsic?.HCold_resistance
                                        || game.u?.uprops?.COLD_RES
                                        || (Upolyd(game.u)
                                            && resists_cold(game.youmonst)));
export const Sleep_resistance = () => !!(game.u?.intrinsic?.HSleep_resistance
                                         || game.u?.uprops?.SLEEP_RES);
export const Shock_resistance = () => !!(game.u?.intrinsic?.HShock_resistance
                                         || game.u?.uprops?.SHOCK_RES);
export const Free_action = () => !!(game.u?.intrinsic?.HFree_action
                                    || game.u?.uprops?.FREE_ACTION);
// include/youprop.h:368 Polymorph_control, :372 Unchanging
export const Polymorph_control = () =>
    !!(game.u?.intrinsic?.HPolymorph_control
       || game.u?.uprops?.POLYMORPH_CONTROL);
export const Unchanging = () => !!(game.u?.intrinsic?.HUnchanging
                                   || game.u?.uprops?.UNCHANGING);
export const Poison_resistance = () =>
    !!(game.u?.intrinsic?.HPoison_resistance || game.u?.uprops?.POISON_RES);
export const Disint_resistance = () =>
    !!(game.u?.intrinsic?.HDisint_resistance || game.u?.uprops?.DISINT_RES);
export const Acid_resistance = () =>
    !!(game.u?.intrinsic?.HAcid_resistance || game.u?.uprops?.ACID_RES);
export const Drain_resistance = () =>
    !!(game.u?.intrinsic?.HDrain_resistance || game.u?.uprops?.DRAIN_RES);
export const Sick_resistance = () =>
    !!(game.u?.intrinsic?.HSick_resistance || game.u?.uprops?.SICK_RES);
// include/youprop.h:291/341
export const Slow_digestion = () =>
    !!(game.u?.intrinsic?.HSlow_digestion || game.u?.uprops?.SLOW_DIGESTION);
export const Half_physical_damage = () =>
    !!(game.u?.intrinsic?.HHalf_physical_damage || game.u?.uprops?.HALF_PHDAM);
// include/youprop.h:405 Half_gas_damage
export const Half_gas_damage = () => !!game.u?.ublindf
    && game.u.ublindf.otyp === ONAMES.TOWEL && game.u.ublindf.spe > 0;
// include/youprop.h:81/84
export const Stunned = () => !!(game.u?.intrinsic?.HStun || game.u?.uprops?.STUNNED);
export const Confusion = () => !!(game.u?.intrinsic?.HConfusion || game.u?.uprops?.CONFUSION);
export const Antimagic = () =>
    !!(game.u?.intrinsic?.HAntimagic || game.u?.uprops?.ANTIMAGIC);
/* #define Stealth ((HStealth || EStealth) && !BStealth) — nothing that sets
   BStealth (riding, sunk in water) is tracked yet */
export const Stealth = () => !!(game.u?.intrinsic?.HStealth
                                || game.u?.uprops?.STEALTH);
export const Searching = () => !!(game.u?.intrinsic?.HSearching
                                  || game.u?.uprops?.SEARCHING);
export const Warning = () => !!(game.u?.intrinsic?.HWarning
                                || game.u?.uprops?.WARNING);
export const Teleport_control = () =>
    !!(game.u?.intrinsic?.HTeleport_control
       || game.u?.uprops?.TELEPORT_CONTROL);
export const Teleportation = () =>
    !!(game.u?.intrinsic?.HTeleportation || game.u?.uprops?.TELEPORT);

// include/youprop.h Wwalking
export const Wwalking = () => !!(game.u?.intrinsic?.HWwalking
                                 || game.u?.uprops?.WWALKING);
export const Swimming = () =>
    !!game.u?.intrinsic?.HSwimming
    || !!game.u?.uprops?.SWIMMING
    || !!(game.u?.usteed && is_swimmer(game.u.usteed.data));
export const Amphibious = () =>
    !!game.u?.intrinsic?.HMagical_breathing
    || !!game.u?.uprops?.MAGICAL_BREATHING
    || !!(game.youmonst?.data && amphibious(game.youmonst.data));
export const Breathless = () =>
    !!game.u?.intrinsic?.HMagical_breathing
    || !!game.u?.uprops?.MAGICAL_BREATHING
    || !!(game.youmonst?.data && breathless(game.youmonst.data));
export const Passes_walls = () =>
    !!(game.u?.intrinsic?.HPasses_walls || game.u?.uprops?.PASSES_WALLS);
export const Regeneration = () =>
    !!(game.u?.intrinsic?.HRegeneration || game.u?.uprops?.REGENERATION);

// include/youprop.h:355 Protection_from_shape_changers. Rings and wizard
// intrinsics share the same flat property entry in this port.
export const Protection_from_shape_changers = () =>
    !!(game.u?.intrinsic?.HProtection_from_shape_changers
       || game.u?.uprops?.PROT_FROM_SHAPE_CHANGERS);

// include/youprop.h:113 Reflecting. The flat property value is C's
// EReflecting slot mask, so a nonzero mask means reflection is active.
export const Reflecting = () =>
    !!(game.u?.intrinsic?.HReflecting || game.u?.uprops?.REFLECTING);

// include/youprop.h:186 Infravision — HInfravision || EInfravision.
// The intrinsic half comes from the hero's race via set_uasmon().
export const Infravision = () => !!(game.u?.intrinsic?.HInfravision
                                    || game.u?.uprops?.INFRAVISION);

// include/youprop.h:401 Hate_silver
export const Hate_silver = () => (game.u?.ulycn ?? -1) >= 0
    || hates_silver(game.youmonst.data);

// include/youprop.h:156 Blind_telepat (HTelepat || ETelepat)
export const Blind_telepat = () => !!(game.u?.intrinsic?.HTelepat
                                     || game.u?.uprops?.TELEPAT);

// include/youprop.h Wounded_legs — HWounded_legs || EWounded_legs
export const Wounded_legs = () =>
    ((game.u?.intrinsic?.HWounded_legs || 0) > 0) || !!(game.u?.EWounded_legs || 0);

// include/youprop.h Jumping — HJumping || EJumping
export const Jumping = () =>
    !!(game.u?.intrinsic?.HJumping) || !!(game.u?.uprops?.JUMPING);

// include/youprop.h Conflict — HConflict || EConflict
export const Conflict = () =>
    !!(game.u?.intrinsic?.HConflict || game.u?.uprops?.CONFLICT);

// include/youprop.h:77 Punished — (uball != 0).
export const Punished = () => !!game.u?.uball;

// include/you.h:464 Luck — (u.uluck + u.moreluck).
export const Luck = () => (game.u?.uluck | 0) + (game.u?.moreluck | 0);

// include/youprop.h:73 Invulnerable — u.uprops[INVULNERABLE].intrinsic
export const Invulnerable = () => !!game.u?.intrinsic?.HInvulnerable;

// include/youprop.h:94 PermaBlind — ((HBlinded & FROMOUTSIDE) != 0L)
export const PermaBlind = () =>
    ((game.u?.intrinsic?.HBlinded | 0) & FROMOUTSIDE) !== 0;

// include/youprop.h:155 Telepat — (HTelepat || ETelepat)
export const Telepat = () => !!(game.u?.intrinsic?.HTelepat
                                || game.u?.uprops?.TELEPAT);

// include/youprop.h:161 Blnd_resist — (HBlnd_resist || EBlnd_resist)
export const Blnd_resist = () => !!(game.u?.intrinsic?.HBlnd_resist
                                    || game.u?.uprops?.BLND_RES);

// include/youprop.h:173 Undead_warning — (HUndead_warning)
export const Undead_warning = () => !!game.u?.intrinsic?.HUndead_warning;

// include/youprop.h:182 Clairvoyant
//     ((HClairvoyant || EClairvoyant) && !BClairvoyant)
export const Clairvoyant = () => !!(game.u?.intrinsic?.HClairvoyant
                                    || game.u?.uprops?.CLAIRVOYANT)
                                 && !game.u?.blocked?.CLAIRVOYANT;

// include/youprop.h:193 Adornment — u.uprops[ADORNED].extrinsic
export const Adornment = () => !!game.u?.uprops?.ADORNED;

// include/youprop.h:214 Aggravate_monster
//     (HAggravate_monster || EAggravate_monster)
export const Aggravate_monster = () =>
    !!(game.u?.intrinsic?.HAggravate_monster
       || game.u?.uprops?.AGGRAVATE_MONSTER);

// include/youprop.h:295 Half_spell_damage
//     (HHalf_spell_damage || EHalf_spell_damage)
export const Half_spell_damage = () =>
    !!(game.u?.intrinsic?.HHalf_spell_damage || game.u?.uprops?.HALF_SPDAM);

// include/youprop.h:353 Protection — (HProtection || EProtection)
export const Protection = () => !!(game.u?.intrinsic?.HProtection
                                   || game.u?.uprops?.PROTECTION);

// include/youprop.h:364 Polymorph — (HPolymorph || EPolymorph)
export const Polymorph = () => !!(game.u?.intrinsic?.HPolymorph
                                  || game.u?.uprops?.POLYMORPH);

// include/youprop.h:387 Lifesaved — u.uprops[LIFESAVED].extrinsic
export const Lifesaved = () => !!game.u?.uprops?.LIFESAVED;

// include/display.h:175 senseself() — (Unblind_telepat || Detect_monsters);
// Unblind_telepat is ETelepat alone
export const senseself = () => !!(game.u?.uprops?.TELEPAT || Detect_monsters());
