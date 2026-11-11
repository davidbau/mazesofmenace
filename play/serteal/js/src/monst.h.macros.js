/* NetHack 5.0	monst.h	$NHDT-Date: 1738640524 2025/02/03 19:42:04 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.67 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2016. */
/* NetHack may be freely redistributed.  See license for details. */




/* start with incomplete types in case these aren't defined yet;
   basic pointers to them don't need to know their details */







/* The weapon_check flag is used two ways:
 * 1) When calling mon_wield_item, is 2-6 depending on what is desired.
 * 2) Between calls to mon_wield_item, is 0 or 1 depending on whether or not
 *    the weapon is known by the monster to be cursed (so it shouldn't bother
 *    trying for another weapon).
 * I originally planned to also use 0 if the monster already had its best
 * weapon, to avoid the overhead of a call to mon_wield_item, but it turns out
 * that there are enough situations which might make a monster change its
 * weapon that this is impractical.  --KAA
 */










/* The following flags are used for the second argument to display_minventory
 * in invent.c:
 *
 * PICK_NONE, PICK_ONE, PICK_ANY (wintype.h)  0, 1, 2
 * MINV_NOLET  If set, don't display inventory letters on monster's inventory.
 * MINV_ALL    If set, display all items in monster's inventory, otherwise
 *             just display wielded weapons and worn items.
 */




/* monster appearance types */

    /* mappearance unused--monster appears as itself */
    /* stairs, a door, an altar, etc. */
    /* an object */
    /* a monster; mostly used for cloned Wizard */















export function U_AP_TYPE() { return (gy.youmonst.m_ap_type & M_AP_TYPMASK); }

export function M_AP_TYPE(m) { return ((m).m_ap_type & M_AP_TYPMASK); }
export function M_AP_FLAG(m) { return ((m).m_ap_type & ~M_AP_TYPMASK); }



    /* Antimagic, AD_MAGM */
    /* Fire_resistance, AD_FIRE */
    /* Cold_resistance, AD_COLD */
    /* Sleep_resistance, AD_SLEE */
    /* Disint_resistance, AD_DISN */
    /* Shock_resistance, AD_ELEC */
    /* AD_DRST */
    /* Acid_resistance, AD_ACID */
    /* reflection, no corresponding AD_foo */


export function m_seenres(mon, mask) { return (and64u((mon).seen_resistance, (mask))); }
export function m_setseenres(mon, mask) { return ((mon).seen_resistance = or64u((mon).seen_resistance, (mask))); }
export function m_clearseenres(mon, mask) { return ((mon).seen_resistance = and64u((mon).seen_resistance, not64u((mask)))); }
export function monstseesu_ad(adtyp) { return monstseesu(cvt_adtyp_to_mseenres(adtyp)); }
export function monstunseesu_ad(adtyp) { return monstunseesu(cvt_adtyp_to_mseenres(adtyp)); }
export function monstunseesu_prop(prop) { return monstunseesu(cvt_prop_to_mseenres(prop)); }





    /* permanent monster index number */
    /* if shapeshifter, orig mons[] idx goes here */
    /* movement points (derived from permonst definition
                           * and added effects */
    /* adjusted difficulty level of monster */
    /* alignment of this monster, relative to the
                           * player (positive = good to kill) */

    /* where the monster thinks you are */

    /* mtrack[0..2] is used to keep extra data when migrating the monster */
    /* monster track */

    /* for undetected mimics and the wiz */
    /* what mappearance is describing, m_ap_types */

    /* level of tameness, implies peaceful */
    /* low 8 correspond to mresists */
    /* low 8 correspond to mresists */
    /* M_SEEN_x; saw you resist an effect */
    /* monster's special ability attack timeout */

    /* is female */
    /* currently invisible */
    /* invisibility blocked */
    /* intrinsic minvis value */
    /* has been cancelled */
    /* has been buried */
    /* not seen in present hiding place;
                               * implies one of M1_CONCEAL or M1_HIDE,
                               * but not mimic (that is, snake, spider,
                               * trapper, piercer, eel) */
    /* cansee 1, temp.blinded 0, blind 0 */

    /* current speed */
    /* intrinsic mspeed value */
    /* has been revived from the dead */
    /* has been cloned from another */
    /* did something to deserve retaliation */
    /* fleeing */

    /* timeout for mflee */
    /* asleep until woken */

    /* cansee 0, temp.blinded n, blind 0 */
    /* stunned (off balance) */


    /* paralysis, similar to mblinded */

    /* confused */
    /* does not attack unprovoked */
    /* trapped in a pit, web or bear trap */
    /* monster is on a leash */
    /* is shopkeeper */
    /* is a minion */
    /* is guard */
    /* is an aligned priest or high priest */

    /* is the Wizard of Yendor */

    /* at most 31 worms on any level */
    /* temporarily seen; only valid during bhit() */
    /* mon has been seen at some point */

    /* mon is currently seen by hero */
    /* mon has experience with wands */
    /* made by the level generation */
    /* 5 spare bits */

    /* for monsters with mflag3: current strategy */















    /* mstrategy unused 0x00ffff00L */


    /* monster strategy, target location */
    /* bitmap of traps we've been trapped in */
    /* for catching up with lost time */
    /* debugging info on monsters stored here */
    /* migrating flags */

    /* mon's inventory */
    /* mon's weapon */
    /* mon's wornmask */
    /* flag for whether to try switching weapons */

    /* monster is eating timeout */
    /* point to mextra struct */


export function newmonst() { return view_of(struct_monst, addr_of(alloc(sizeof(struct_monst)))); }

/* these are in mspeed */



export function MON_WEP(mon) { return ((mon).mw); }
export function MON_NOWEP(mon) { return ((mon).mw = null); }

/* dead monsters stay on the fmon list until dmonsfree() at end of turn */
export function DEADMONSTER(mon) { return (+((mon).mhp < 1)); }


export function is_vampshifter(mon) { return (+((mon).cham == PM_VAMPIRE || (mon).cham == PM_VAMPIRE_LEADER 
     || (mon).cham == PM_VLAD_THE_IMPALER)); }

export function vampshifted(mon) { return (+(is_vampshifter((mon)) && !is_vampire((mon).data))); }
/* Vlad might be vampshifted so just checking monst->data is insufficient */
export function is_Vlad(m) { return (+((m).data == mons[PM_VLAD_THE_IMPALER]  
                    || (m).cham == PM_VLAD_THE_IMPALER)); }

/* monsters which cannot be displaced: temple priests, shopkeepers,
   vault guards, the Oracle, quest leader */
export function mundisplaceable(mon) { return ((((mon).ispriest || (mon).isshk                    
     || (mon).isgd || (mon).data == mons[PM_ORACLE]  
     || (mon).m_id == svq.quest_status.leader_m_id) ? 1 : 0)); }


/* mimic appearances that block vision/light */
export function is_lightblocker_mappear(mon) { return (+(is_obj_mappear(mon, BOULDER)                          
     || (M_AP_TYPE(mon) == M_AP_FURNITURE                  
         && ((mon).mappearance == S_hcdoor                
             || (mon).mappearance == S_vcdoor             
             || (mon).mappearance < S_ndoor /* = walls */ 
             || (mon).mappearance == S_tree)))); }

export function is_door_mappear(mon) { return (+(M_AP_TYPE(mon) == M_AP_FURNITURE   
                              && ((mon).mappearance == S_hcdoor 
                                  || (mon).mappearance == S_vcdoor))); }
export function is_obj_mappear(mon, otyp) { return (+(M_AP_TYPE(mon) == M_AP_OBJECT 
                                  && (mon).mappearance == (otyp))); }

/* is mon m (presumably just killed) a troll and obj o Trollsbane? */
export function troll_baned(m, o) { return ((((m).data.mlet == S_TROLL && (o) && (o).oartifact == ART_TROLLSBANE) ? 1 : 0)); }


export function engulfing_u(mon) { return (((u.uswallow && (u.ustuck == (mon))) ? 1 : 0)); }
export function helpless(mon) { return ((((mon).msleeping || !(mon).mcanmove) ? 1 : 0)); }

export function mon_perma_blind(mon) { return (+(!mon.mcansee && !mon.mblinded)); }

export function mon_offmap(mon) { return (+((mon).mstate != MON_FLOOR)); }

/* Get the maximum difficulty monsters that can currently be generated,
   given the current level difficulty and the hero's level. */
export function monmax_difficulty(levdif) { return (Math.trunc(((levdif) + u.ulevel) / 2)); }
export function monmin_difficulty(levdif) { return (Math.trunc((levdif) / 6)); }
export function monmax_difficulty_lev() { return (monmax_difficulty(level_difficulty())); }

/* Macros for whether a type of monster is too strong for a specific level. */
export function montoostrong(monindx, lev) { return (+(mons[monindx].difficulty > lev)); }
export function montooweak(monindx, lev) { return (+(mons[monindx].difficulty < lev)); }




export function mon_resistancebits(mon) { return ((mon).data.mresists | (mon).mextrinsics | (mon).mintrinsics); }

export function resists_fire(mon) { return Resists_Elem(mon, FIRE_RES); }
export function resists_cold(mon) { return Resists_Elem(mon, COLD_RES); }
export function resists_sleep(mon) { return Resists_Elem(mon, SLEEP_RES); }
export function resists_disint(mon) { return Resists_Elem(mon, DISINT_RES); }
export function resists_elec(mon) { return Resists_Elem(mon, SHOCK_RES); }
export function resists_poison(mon) { return Resists_Elem(mon, POISON_RES); }
export function resists_acid(mon) { return Resists_Elem(mon, ACID_RES); }
export function resists_ston(mon) { return Resists_Elem(mon, STONE_RES); }

export function is_lminion(mon) { return (+(is_minion((mon).data) && mon_aligntyp(mon) == A_LAWFUL)); }


/* x is a valid index into mons[] array */
export function ismnum(x) { return (+((x) >= LOW_PM && (x) < NUMMONS)); }
import { A_LAWFUL } from "./align.h.js";
import { ART_TROLLSBANE } from "./artilist.h.js";
import { S_TROLL } from "./defsym.h.js";
import { S_hcdoor } from "./defsym.h.js";
import { S_ndoor } from "./defsym.h.js";
import { S_tree } from "./defsym.h.js";
import { S_vcdoor } from "./defsym.h.js";
import { is_minion } from "./mondata.h.macros.js";
import { is_vampire } from "./mondata.h.macros.js";
import { MON_FLOOR } from "./monst.h.js";
import { M_AP_FURNITURE } from "./monst.h.js";
import { M_AP_OBJECT } from "./monst.h.js";
import { M_AP_TYPMASK } from "./monst.h.js";
import { struct_monst } from "./monst.h.js";
import { LOW_PM } from "./monsters.h.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_ORACLE } from "./monsters.h.js";
import { PM_VAMPIRE } from "./monsters.h.js";
import { PM_VAMPIRE_LEADER } from "./monsters.h.js";
import { PM_VLAD_THE_IMPALER } from "./monsters.h.js";
import { BOULDER } from "./objects.h.js";
import { ACID_RES } from "./prop.h.js";
import { COLD_RES } from "./prop.h.js";
import { DISINT_RES } from "./prop.h.js";
import { FIRE_RES } from "./prop.h.js";
import { POISON_RES } from "./prop.h.js";
import { SHOCK_RES } from "./prop.h.js";
import { SLEEP_RES } from "./prop.h.js";
import { STONE_RES } from "./prop.h.js";
import { sizeof } from "../rt/ctypes.js";
import { and64u } from "../rt/int64.js";
import { not64u } from "../rt/int64.js";
import { or64u } from "../rt/int64.js";
import { addr_of } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { gy } from "./decl.js";
import { svq } from "./decl.js";
import { u } from "./decl.js";
import { level_difficulty } from "./dungeon.js";
import { Resists_Elem } from "./mondata.js";
import { cvt_adtyp_to_mseenres } from "./mondata.js";
import { cvt_prop_to_mseenres } from "./mondata.js";
import { monstseesu } from "./mondata.js";
import { monstunseesu } from "./mondata.js";
import { mons } from "./monst.js";
import { mon_aligntyp } from "./priest.js";
