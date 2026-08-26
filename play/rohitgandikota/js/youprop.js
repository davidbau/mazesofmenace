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
import { haseyes, is_flyer, resists_cold } from './mondata.js';
import { Upolyd } from './const.js';
import { unconscious } from './trap.js';
import { is_fainted } from './eat.js';

// include/youprop.h:116 HHallucination — u.uprops[HALLUC].intrinsic.
// The C comment above it reads "Hallucination is solely a timeout", which is
// why this is .intrinsic and there is no EHallucination to go with it.
export const HHallucination = () => !!game.u?.uprops?.HALLUC;

// include/youprop.h:117 HHalluc_resistance, :118 EHalluc_resistance,
// :119 Halluc_resistance. The port models uprops as a flat prop -> value map
// rather than C's {intrinsic, extrinsic, blocked} struct, so the two halves
// collapse into the one read; when uprops grows the struct, split them here.
export const Halluc_resistance = () => !!game.u?.uprops?.HALLUC_RES;

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
export const Blind = () => !!game.u?.ublind
                         || !!(Upolyd(game.u) && game.youmonst?.data
                               && !haseyes(game.youmonst.data));

// include/youprop.h:65 Stone_resistance — flat uprops map collapses the
// intrinsic and extrinsic halves into one read.
export const Stone_resistance = () => !!game.u?.uprops?.STONE_RES;

// include/youprop.h:129 Fumbling
export const Fumbling = () => !!game.u?.uprops?.FUMBLING;

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

// include/youprop.h:198 Invis — ((HInvis || EInvis) && !BInvis).
// The flat uprops map has no blocked slot, so the BInvis term has nowhere to
// live yet; nothing blocks invisibility today, so this is right for now and
// the term goes in when uprops grows the struct.
export const Invis = () => !!game.u?.uprops?.INVIS;

// include/youprop.h:240 Levitation — ((HLevitation || ELevitation) && !BLevitation).
export const Levitation = () => !!game.u?.uprops?.LEVITATION;

// include/youprop.h:253 Flying — note the steed term: riding a flying mount
// counts, which is why this cannot be a plain uprops read.
export const Flying = () =>
    !!game.u?.uprops?.FLYING
    || !!(Upolyd(game.u) && is_flyer(game.youmonst.data))
    || !!(game.u?.usteed && is_flyer(game.u.usteed.data));

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
export const Poison_resistance = () =>
    !!(game.u?.intrinsic?.HPoison_resistance || game.u?.uprops?.POISON_RES);
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

// include/youprop.h:113 Reflecting. The flat property value is C's
// EReflecting slot mask, so a nonzero mask means reflection is active.
export const Reflecting = () => !!game.u?.uprops?.REFLECTING;

// include/youprop.h:186 Infravision — HInfravision || EInfravision.
// The intrinsic half comes from the hero's race via set_uasmon().
export const Infravision = () => !!(game.u?.intrinsic?.HInfravision
                                    || game.u?.uprops?.INFRAVISION);
