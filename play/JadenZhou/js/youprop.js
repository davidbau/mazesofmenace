// youprop.js -- the hero's property macros.
// C ref: include/youprop.h.  Every macro is one exported function here;
// modules import them instead of keeping local copies.
//
// u.uprops[X].intrinsic / .extrinsic / .blocked are C's HX / EX / BX.
// Macros that C writes as a single field return that field's value (a long
// bit mask or timeout, used as such by some callers); macros that C writes
// with || / && return a boolean, the same truth value as C's int 0/1.

import { game } from './gstate.js';
import {
    FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, DRAIN_RES,
    ANTIMAGIC, ACID_RES, STONE_RES, SICK_RES, INVULNERABLE, STUNNED, CONFUSION,
    BLINDED, SICK, STONED, STRANGLED, VOMITING, GLIB, SLIMED, HALLUC, HALLUC_RES,
    DEAF, FUMBLING, WOUNDED_LEGS, SLEEPY, HUNGER, SEE_INVIS, TELEPAT, BLND_RES,
    WARNING, WARN_OF_MON, WARN_UNDEAD, SEARCHING, CLAIRVOYANT, INFRAVISION,
    DETECT_MONSTERS, ADORNED, INVIS, DISPLACED, STEALTH, AGGRAVATE_MONSTER,
    CONFLICT, JUMPING, TELEPORT, TELEPORT_CONTROL, LEVITATION, FLYING, WWALKING,
    SWIMMING, MAGICAL_BREATHING, PASSES_WALLS, SLOW_DIGESTION, HALF_SPDAM,
    HALF_PHDAM, REGENERATION, ENERGY_REGENERATION, PROTECTION,
    PROT_FROM_SHAPE_CHANGERS, POLYMORPH, POLYMORPH_CONTROL, UNCHANGING, FAST,
    REFLECTING, FREE_ACTION, FIXED_ABIL, LIFESAVED,
    TIMEOUT, FROMOUTSIDE, INTRINSIC, I_SPECIAL, W_ARTI, LOW_PM,
    Upolyd, Is_waterlevel,
} from './const.js';
import { TOWEL } from './objects.js';
import { AD_DISE, M1_AMPHIBIOUS, M1_BREATHLESS } from './monsters.js';
import { defended, hates_silver, is_flyer, is_swimmer } from './mondata.js';
import { is_fainted } from './eat.js';
import { unconscious } from './trap.js';

/* C: u.uprops[p] -- the hero's property entry (HX, EX, BX fields) */
export function uprop(p) { return game.u.uprops[p]; }

/* C: #define maybe_polyd(if_so, if_not) (Upolyd ? (if_so) : (if_not)) */
export function maybe_polyd(if_so, if_not) { return Upolyd() ? if_so : if_not; }

/*** Resistances to troubles ***/
export function Fire_resistance() { const p = uprop(FIRE_RES); return !!(p.intrinsic || p.extrinsic); }
export function Cold_resistance() { const p = uprop(COLD_RES); return !!(p.intrinsic || p.extrinsic); }
export function Sleep_resistance() { const p = uprop(SLEEP_RES); return !!(p.intrinsic || p.extrinsic); }
export function Disint_resistance() { const p = uprop(DISINT_RES); return !!(p.intrinsic || p.extrinsic); }
export function Shock_resistance() { const p = uprop(SHOCK_RES); return !!(p.intrinsic || p.extrinsic); }
export function Poison_resistance() { const p = uprop(POISON_RES); return !!(p.intrinsic || p.extrinsic); }
export function Drain_resistance() { const p = uprop(DRAIN_RES); return !!(p.intrinsic || p.extrinsic); }
/* Hxxx due to FROMFORM only; Exxx due to wielded Magicbane only */
export function Antimagic() { const p = uprop(ANTIMAGIC); return !!(p.intrinsic || p.extrinsic); }
export function Acid_resistance() { const p = uprop(ACID_RES); return !!(p.intrinsic || p.extrinsic); }
export function Stone_resistance() { const p = uprop(STONE_RES); return !!(p.intrinsic || p.extrinsic); }
export function Sick_resistance() {
    const p = uprop(SICK_RES);
    return !!(p.intrinsic || p.extrinsic || defended(game.youmonst, AD_DISE));
}
/* Intrinsics only */
export function Invulnerable() { return uprop(INVULNERABLE).intrinsic; }

/*** Troubles ***/
/* Pseudo-property */
export function Punished() { return !!game.uball; }

/* Those implemented solely as timeouts (we use just intrinsic) */
export function HStun() { return uprop(STUNNED).intrinsic; } /* timed or FROMFORM */
export function Stunned() { return HStun(); }
export function HConfusion() { return uprop(CONFUSION).intrinsic; }
export function Confusion() { return HConfusion(); }

export function HBlinded() { return uprop(BLINDED).intrinsic; } /* TIMEOUT|FROMOUTSIDE|FROMFORM */
export function EBlinded() { return uprop(BLINDED).extrinsic; } /* W_TOOL */
export function BBlinded() { return uprop(BLINDED).blocked; } /* W_TOOL */
export function Blinded() { return !!(HBlinded() && !BBlinded()); }
export function BlindedTimeout() { return HBlinded() & TIMEOUT; }
export function PermaBlind() { return (HBlinded() & FROMOUTSIDE) !== 0; } /* OPTIONS:blind */
export function Blindfolded() { return EBlinded(); }
export function Blindfolded_only() { return !!(Blindfolded() && !Blinded()); }
export function Blind() { return !!((HBlinded() || EBlinded()) && !BBlinded()); }

export function Sick() { return uprop(SICK).intrinsic; }
export function Stoned() { return uprop(STONED).intrinsic; }
export function Strangled() { return uprop(STRANGLED).intrinsic; }
export function Vomiting() { return uprop(VOMITING).intrinsic; }
export function Glib() { return uprop(GLIB).intrinsic; }
export function Slimed() { return uprop(SLIMED).intrinsic; } /* [Tom] */

/* Hallucination is solely a timeout */
export function HHallucination() { return uprop(HALLUC).intrinsic; }
export function Halluc_resistance() { const p = uprop(HALLUC_RES); return !!(p.intrinsic || p.extrinsic); }
export function Hallucination() { return !!(HHallucination() && !Halluc_resistance()); }

/* Deafness is a timeout, or from the deaf roleplay option */
export function Deaf() {
    const p = uprop(DEAF);
    return !!(p.intrinsic || p.extrinsic || game.u.uroleplay.deaf);
}

export function HFumbling() { return uprop(FUMBLING).intrinsic; }
export function EFumbling() { return uprop(FUMBLING).extrinsic; }
export function Fumbling() { return !!(HFumbling() || EFumbling()); }

export function HWounded_legs() { return uprop(WOUNDED_LEGS).intrinsic; }
export function EWounded_legs() { return uprop(WOUNDED_LEGS).extrinsic; }
export function Wounded_legs() { return !!(HWounded_legs() || EWounded_legs()); }

export function HSleepy() { return uprop(SLEEPY).intrinsic; }
export function ESleepy() { return uprop(SLEEPY).extrinsic; }
export function Sleepy() { return !!(HSleepy() || ESleepy()); }

export function HHunger() { return uprop(HUNGER).intrinsic; }
export function EHunger() { return uprop(HUNGER).extrinsic; }
export function Hunger() { return !!(HHunger() || EHunger()); }

/*** Vision and senses ***/
export function HSee_invisible() { return uprop(SEE_INVIS).intrinsic; }
export function ESee_invisible() { return uprop(SEE_INVIS).extrinsic; }
export function See_invisible() { return !!(HSee_invisible() || ESee_invisible()); }

export function HTelepat() { return uprop(TELEPAT).intrinsic; }
export function ETelepat() { return uprop(TELEPAT).extrinsic; }
export function Blind_telepat() { return !!(HTelepat() || ETelepat()); }
export function Unblind_telepat() { return ETelepat(); }

export function HBlnd_resist() { return uprop(BLND_RES).intrinsic; } /* from form */
export function EBlnd_resist() { return uprop(BLND_RES).extrinsic; } /* wielding Sunsword */
export function Blnd_resist() { return !!(HBlnd_resist() || EBlnd_resist()); }

export function HWarning() { return uprop(WARNING).intrinsic; }
export function EWarning() { return uprop(WARNING).extrinsic; }
export function Warning() { return !!(HWarning() || EWarning()); }

/* Warning for a specific type of monster */
export function HWarn_of_mon() { return uprop(WARN_OF_MON).intrinsic; }
export function EWarn_of_mon() { return uprop(WARN_OF_MON).extrinsic; }
export function Warn_of_mon() { return !!(HWarn_of_mon() || EWarn_of_mon()); }

export function HUndead_warning() { return uprop(WARN_UNDEAD).intrinsic; }
export function Undead_warning() { return HUndead_warning(); }

export function HSearching() { return uprop(SEARCHING).intrinsic; }
export function ESearching() { return uprop(SEARCHING).extrinsic; }
export function Searching() { return !!(HSearching() || ESearching()); }

export function HClairvoyant() { return uprop(CLAIRVOYANT).intrinsic; }
export function EClairvoyant() { return uprop(CLAIRVOYANT).extrinsic; }
export function BClairvoyant() { return uprop(CLAIRVOYANT).blocked; }
export function Clairvoyant() { return !!((HClairvoyant() || EClairvoyant()) && !BClairvoyant()); }

export function HInfravision() { return uprop(INFRAVISION).intrinsic; }
export function EInfravision() { return uprop(INFRAVISION).extrinsic; }
export function Infravision() { return !!(HInfravision() || EInfravision()); }

export function HDetect_monsters() { return uprop(DETECT_MONSTERS).intrinsic; }
export function EDetect_monsters() { return uprop(DETECT_MONSTERS).extrinsic; }
export function Detect_monsters() { return !!(HDetect_monsters() || EDetect_monsters()); }

/*** Appearance and behavior ***/
export function Adornment() { return uprop(ADORNED).extrinsic; }

export function HInvis() { return uprop(INVIS).intrinsic; }
export function EInvis() { return uprop(INVIS).extrinsic; }
export function BInvis() { return uprop(INVIS).blocked; }
export function Invis() { return !!((HInvis() || EInvis()) && !BInvis()); }
export function Invisible() { return !!(Invis() && !See_invisible()); }

/* Displacement is an extrinsic or timed intrinsic */
export function HDisplaced() { return uprop(DISPLACED).intrinsic; } /* timed from corpse */
export function EDisplaced() { return uprop(DISPLACED).extrinsic; } /* worn cloak */
export function Displaced() { return !!(HDisplaced() || EDisplaced()); }

export function HStealth() { return uprop(STEALTH).intrinsic; }
export function EStealth() { return uprop(STEALTH).extrinsic; }
export function BStealth() { return uprop(STEALTH).blocked; }
export function Stealth() { return !!((HStealth() || EStealth()) && !BStealth()); }

export function HAggravate_monster() { return uprop(AGGRAVATE_MONSTER).intrinsic; }
export function EAggravate_monster() { return uprop(AGGRAVATE_MONSTER).extrinsic; }
export function Aggravate_monster() { return !!(HAggravate_monster() || EAggravate_monster()); }

export function HConflict() { return uprop(CONFLICT).intrinsic; }
export function EConflict() { return uprop(CONFLICT).extrinsic; }
export function Conflict() { return !!(HConflict() || EConflict()); }

/*** Transportation ***/
export function HJumping() { return uprop(JUMPING).intrinsic; }
export function EJumping() { return uprop(JUMPING).extrinsic; }
export function Jumping() { return !!(HJumping() || EJumping()); }

export function HTeleportation() { return uprop(TELEPORT).intrinsic; }
export function ETeleportation() { return uprop(TELEPORT).extrinsic; }
export function Teleportation() { return !!(HTeleportation() || ETeleportation()); }

export function HTeleport_control() { return uprop(TELEPORT_CONTROL).intrinsic; }
export function ETeleport_control() { return uprop(TELEPORT_CONTROL).extrinsic; }
export function Teleport_control() { return !!(HTeleport_control() || ETeleport_control()); }

/* HLevitation has I_SPECIAL set if levitating due to opening a cursed bag;
   BLevitation has I_SPECIAL set if trapped in the floor, FROMOUTSIDE set
   if inside solid rock (or in water on Plane of Water) */
export function HLevitation() { return uprop(LEVITATION).intrinsic; }
export function ELevitation() { return uprop(LEVITATION).extrinsic; }
export function BLevitation() { return uprop(LEVITATION).blocked; }
export function Levitation() { return !!((HLevitation() || ELevitation()) && !BLevitation()); }
/* Can't touch surface, can't go under water; overrides all others */
export function Lev_at_will() {
    return ((HLevitation() & I_SPECIAL) !== 0 || (ELevitation() & W_ARTI) !== 0)
           && (HLevitation() & ~(I_SPECIAL | TIMEOUT)) === 0
           && (ELevitation() & ~W_ARTI) === 0;
}

/* Flying is overridden by Levitation */
export function HFlying() { return uprop(FLYING).intrinsic; }
export function EFlying() { return uprop(FLYING).extrinsic; }
/* BFlying has I_SPECIAL set if levitating or trapped in the floor or both,
   FROMOUTSIDE set if inside solid rock (or in water on Plane of Water) */
export function BFlying() { return uprop(FLYING).blocked; }
export function Flying() {
    return !!((HFlying() || EFlying() || (game.u.usteed && is_flyer(game.u.usteed.data)))
              && !BFlying());
}
/* May touch surface; does not override any others */

export function HWwalking() { return uprop(WWALKING).intrinsic; } /* see lava_effects() */
export function EWwalking() { return uprop(WWALKING).extrinsic; }
export function Wwalking() { return !!((HWwalking() || EWwalking()) && !Is_waterlevel(game.u.uz)); }
/* Don't get wet, can't go under water; overrides others except levitation */
/* Wwalking is meaningless on water level */

export function HSwimming() { return uprop(SWIMMING).intrinsic; }
export function ESwimming() { return uprop(SWIMMING).extrinsic; } /* [Tom] */
export function Swimming() {
    return !!(HSwimming() || ESwimming() || (game.u.usteed && is_swimmer(game.u.usteed.data)));
}
/* Get wet, don't go under water unless if amphibious */

export function HMagical_breathing() { return uprop(MAGICAL_BREATHING).intrinsic; }
export function EMagical_breathing() { return uprop(MAGICAL_BREATHING).extrinsic; }
export function Amphibious() {
    return !!(HMagical_breathing() || EMagical_breathing()
              /* amphibious(gy.youmonst.data) */
              || (game.youmonst.data.mflags1 & M1_AMPHIBIOUS) !== 0);
}
/* Get wet, may go under surface */

export function Breathless() {
    return !!(HMagical_breathing() || EMagical_breathing()
              /* breathless(gy.youmonst.data) */
              || (game.youmonst.data.mflags1 & M1_BREATHLESS) !== 0);
}

export function Underwater() { return game.u.uinwater; }
/* Note that Underwater and u.uinwater are both used in code.
   The latter form is for later implementation of other in-water
   states, like swimming, wading, etc. */

export function HPasses_walls() { return uprop(PASSES_WALLS).intrinsic; }
export function EPasses_walls() { return uprop(PASSES_WALLS).extrinsic; }
export function Passes_walls() { return !!(HPasses_walls() || EPasses_walls()); }

/*** Physical attributes ***/
export function HSlow_digestion() { return uprop(SLOW_DIGESTION).intrinsic; }
export function ESlow_digestion() { return uprop(SLOW_DIGESTION).extrinsic; }
export function Slow_digestion() { return !!(HSlow_digestion() || ESlow_digestion()); } /* KMH */

export function HHalf_spell_damage() { return uprop(HALF_SPDAM).intrinsic; }
export function EHalf_spell_damage() { return uprop(HALF_SPDAM).extrinsic; }
export function Half_spell_damage() { return !!(HHalf_spell_damage() || EHalf_spell_damage()); }

export function HHalf_physical_damage() { return uprop(HALF_PHDAM).intrinsic; }
export function EHalf_physical_damage() { return uprop(HALF_PHDAM).extrinsic; }
export function Half_physical_damage() {
    return !!(HHalf_physical_damage() || EHalf_physical_damage());
}

export function HRegeneration() { return uprop(REGENERATION).intrinsic; }
export function ERegeneration() { return uprop(REGENERATION).extrinsic; }
export function Regeneration() { return !!(HRegeneration() || ERegeneration()); }

export function HEnergy_regeneration() { return uprop(ENERGY_REGENERATION).intrinsic; }
export function EEnergy_regeneration() { return uprop(ENERGY_REGENERATION).extrinsic; }
export function Energy_regeneration() {
    return !!(HEnergy_regeneration() || EEnergy_regeneration());
}

export function HProtection() { return uprop(PROTECTION).intrinsic; }
export function EProtection() { return uprop(PROTECTION).extrinsic; }
export function Protection() { return !!(HProtection() || EProtection()); }

export function HProtection_from_shape_changers() {
    return uprop(PROT_FROM_SHAPE_CHANGERS).intrinsic;
}
export function EProtection_from_shape_changers() {
    return uprop(PROT_FROM_SHAPE_CHANGERS).extrinsic;
}
export function Protection_from_shape_changers() {
    return !!(HProtection_from_shape_changers() || EProtection_from_shape_changers());
}

export function HPolymorph() { return uprop(POLYMORPH).intrinsic; }
export function EPolymorph() { return uprop(POLYMORPH).extrinsic; }
export function Polymorph() { return !!(HPolymorph() || EPolymorph()); }

export function HPolymorph_control() { return uprop(POLYMORPH_CONTROL).intrinsic; }
export function EPolymorph_control() { return uprop(POLYMORPH_CONTROL).extrinsic; }
export function Polymorph_control() { return !!(HPolymorph_control() || EPolymorph_control()); }

export function HUnchanging() { return uprop(UNCHANGING).intrinsic; }
export function EUnchanging() { return uprop(UNCHANGING).extrinsic; }
export function Unchanging() { return !!(HUnchanging() || EUnchanging()); } /* KMH */

export function HFast() { return uprop(FAST).intrinsic; }
export function EFast() { return uprop(FAST).extrinsic; }
export function Fast() { return !!(HFast() || EFast()); }
export function Very_fast() { return !!((HFast() & ~INTRINSIC) || EFast()); }

export function HReflecting() { return uprop(REFLECTING).intrinsic; }
export function EReflecting() { return uprop(REFLECTING).extrinsic; }
export function Reflecting() { return !!(HReflecting() || EReflecting()); }

export function Free_action() { return uprop(FREE_ACTION).extrinsic; } /* [Tom] */

export function Fixed_abil() { return uprop(FIXED_ABIL).extrinsic; } /* KMH */

export function Lifesaved() { return uprop(LIFESAVED).extrinsic; }

/*
 * Some pseudo-properties.
 */

/* unconscious() includes u.usleep but not is_fainted(); the multi test is
   redundant but allows the function calls to be skipped most of the time */
export function Unaware() { return game.multi < 0 && (unconscious() || is_fainted()); }

export function Hate_silver() { return game.u.ulycn >= LOW_PM || hates_silver(game.youmonst.data); }

/* _The_Hitchhikers_Guide_to_the_Galaxy_ on uses for 'towel': "wrap it round
   your head to ward off noxious fumes" [we require it to be damp or wet] */
export function Half_gas_damage() {
    return !!(game.ublindf && game.ublindf.otyp === TOWEL && game.ublindf.spe > 0);
}
