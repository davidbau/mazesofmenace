/* NetHack 5.0	obj.h	$NHDT-Date: 1718999845 2024/06/21 19:57:25 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.116 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */




/* #define obj obj_nh *//* uncomment for SCO UNIX, which has a conflicting
                          * typedef for "obj" in <sys/types.h> */

/* start with incomplete types in case these aren't defined yet;
   basic pointers to them don't need to know their details */




    /* floor location lists */
    /* point back to container */
    /* point back to carrying monst */


/****
 ***    oextra -- collection of all object extensions
 **     (see the note at the bottom of this file before adding oextra fields)
 */

    /* ptr to name of object */
    /* ptr to attached monst struct */
    /* response_cmd for mail delivery */
    /* for corpse: m_id of corpse's ghost; overloaded
                           * for glob: owt at time added to shop's bill */









    /* contents list for containers */


    /* object class number */

    /* number of items */



    /* quality of weapon, weptool, armor, or some rings (+ or -);
                * number of charges for wand or charged tool ( >= -1 );
                * number of candles attached to candelabrum (0..7);
                * magic lamp (1 iff djinni inside => lamp is lightable);
                * oil lamp, tallow/wax candle (1 for no apparent reason?);
                * marks spinach tins (1 iff corpsenm==NON_PM);
                * marks tin variety (various: homemade, stir fried, &c);
                * eggs laid by you (1), eggs upgraded with royal jelly (2);
                * Schroedinger's Box (1) or royal coffers for a court (2);
                * named fruit index;
                * candy bar wrapper index;
                * scroll of scare monster (when uncursed: never picked up==0,
                *   has been picked up==1, turns to dust if picked up again;
                *   when blessed|cursed: flag not checked, set, or cleared);
                * scroll of mail (normal==0, bones or wishing==1, written==2);
                * splash of venom (normal==0, wishing==1);
                * gender for corpses, statues, and figurines (0..3,
                *   CORPSTAT_GENDER),
                * historic flag for statues (4, CORPSTAT_HISTORIC) */
    /* object class */
    /* designation in inventory */
    /* artifact array index */

    /* where the object thinks it is */










    /* note: OBJ_xxx values are used in obj_state_names[] in mkobj.c
       so adding, removing, or renumbering these needs to change that too */

    /* # of fuses (timers) attached to this obj */

    /* Bitfields currently require 5 bytes minimum */
    /* uncursed when neither cursed nor blessed */

    /* owned by shop; valid for objects in hero's
                             * inventory or inside containers there; also,
                             * used for items on the floor only on the shop
                             * boundary (including "free spot") or if moved
                             * from there to inside by wall repairs */
    /* if shk shouldn't charge for this; valid for
                             * items on shop floor or in containers there;
                             * implicit for items at any other location
                             * unless carried and explicitly flagged unpaid */
    /* number of times it's been recharged */

    /* a light-source -- can be lit */

    /* exact nature known (for instance, charge count
                             * or enchantment); many items have this preset if
                             * they lack anything interesting to discover */
    /* description known (item seen "up close");
                             * some types of items always have dknown set;
                             * use observe_object to set to TRUE so that the
                             * discoveries list is still correct */
    /* BUC (blessed/uncursed/cursed) known */
    /* rustproofing status known */
    /* for containers (including statues): the contents
                          * are known; also applicable to tins; also applies
                          * to horn of plenty but only for empty/non-empty */
    /* locked/unlocked status is known; assigned for bags
                          * and for horn of plenty (when tipping) even though
                          * they have no locks */
    /* trap status known for chests */
    /* set temporarily to prevent merging */

    /* rusted/burnt weapon/armor */
    /* corroded/rotted weapon/armor */
export function greatest_erosion(otmp) { return ((otmp).oeroded > (otmp).oeroded2 ? (otmp).oeroded 
                                             : (otmp).oeroded2); }





    /* erodeproof weapon/armor */
    /* object is locked */
    /* lock has been broken */

    /* container is trapped */
/* or accidental tripped rolling boulder trap */


    /* combines with like types on adjacent squares */
    /* covered with grease */
    /* for magic items before useup items */
    /* mark this as an object to be skipped by bhito() */
    /* was picked up previously */
    /* it just got placed into a bones file */
    /* stolen by mon or thrown, dropped by hero, etc */

    /* source of name per TODO in resetobjs() */

    /* not implemented */
    /* effect known for wands zapped or rings worn when
                          * not seen yet after being picked up while blind
                          * [maybe for remaining stack of used potion too] */
    /* 5 free bits */

    /* 6 free bits */


    /* type of corpse is mons[corpsenm] */







    /* overloaded for various things that tally */


    /* nutrition left in food, if partly eaten */
    /* creation date */
    /* bit mask indicating which equipment slot(s) an
                            * item is worn in [by hero or by monster; could
                            * indicate more than one bit: attached iron ball
                            * that's also wielded];
                            * overloaded for the destination of migrating
                            * objects (which can't be worn at same time) */
    /* # of lua script references for this object */
    /* where obj is migrating from */
    /* where obj is migrating from */
    /* pointer to oextra struct */


export function newobj() { return view_of(struct_obj, addr_of(alloc(sizeof(struct_obj)))); }

/***
 **     oextra referencing and testing macros
 */

export function ONAME(o) { return ((o).oextra.oname); }
export function OMONST(o) { return ((o).oextra.omonst); }
export function OMAILCMD(o) { return ((o).oextra.omailcmd); }
export function OMID(o) { return ((o).oextra.omid); }

export function has_oname(o) { return ((((o).oextra && ONAME(o)) ? 1 : 0)); }
export function has_omonst(o) { return ((((o).oextra && OMONST(o)) ? 1 : 0)); }
export function has_omailcmd(o) { return ((((o).oextra && OMAILCMD(o)) ? 1 : 0)); }
export function has_omid(o) { return ((((o).oextra && OMID(o)) ? 1 : 0)); }

/* Weapons and weapon-tools */
/* KMH -- now based on skill categories.  Formerly:
 *      #define is_sword(otmp)  (otmp->oclass == WEAPON_CLASS && \
 *                       objects[otmp->otyp].oc_wepcat == WEP_SWORD)
 *      #define is_blade(otmp)  (otmp->oclass == WEAPON_CLASS && \
 *                       (objects[otmp->otyp].oc_wepcat == WEP_BLADE || \
 *                        objects[otmp->otyp].oc_wepcat == WEP_SWORD))
 *      #define is_weptool(o)   ((o)->oclass == TOOL_CLASS && \
 *                       objects[(o)->otyp].oc_weptool)
 *      #define is_multigen(otyp) (otyp <= SHURIKEN)
 *      #define is_poisonable(otyp) (otyp <= BEC_DE_CORBIN)
 */
export function is_blade(otmp) { return (+(otmp.oclass == WEAPON_CLASS                
     && objects[otmp.otyp].oc_subtyp >= P_DAGGER 
     && objects[otmp.otyp].oc_subtyp <= P_SABER)); }

export function is_axe(otmp) { return (+((otmp.oclass == WEAPON_CLASS || otmp.oclass == TOOL_CLASS) 
     && objects[otmp.otyp].oc_subtyp == P_AXE)); }

export function is_pick(otmp) { return (+((otmp.oclass == WEAPON_CLASS || otmp.oclass == TOOL_CLASS) 
     && objects[otmp.otyp].oc_subtyp == P_PICK_AXE)); }

export function is_sword(otmp) { return (+(otmp.oclass == WEAPON_CLASS                     
     && objects[otmp.otyp].oc_subtyp >= P_SHORT_SWORD 
     && objects[otmp.otyp].oc_subtyp <= P_SABER)); }

/* Snickersnee is not a polearm, but can hit from distance */
export function is_pole(otmp) { return ((((otmp.oclass == WEAPON_CLASS || otmp.oclass == TOOL_CLASS) 
     && (objects[otmp.otyp].oc_subtyp == P_POLEARMS               
         || objects[otmp.otyp].oc_subtyp == P_LANCE               
         || is_art(otmp, ART_SNICKERSNEE))) ? 1 : 0)); }

export function is_spear(otmp) { return (+(otmp.oclass == WEAPON_CLASS && objects[otmp.otyp].oc_subtyp == P_SPEAR)); }

export function is_launcher(otmp) { return (+(otmp.oclass == WEAPON_CLASS && objects[otmp.otyp].oc_subtyp >= P_BOW 
     && objects[otmp.otyp].oc_subtyp <= P_CROSSBOW)); }

export function is_ammo(otmp) { return (+((otmp.oclass == WEAPON_CLASS || otmp.oclass == GEM_CLASS) 
     && objects[otmp.otyp].oc_subtyp >= -P_CROSSBOW              
     && objects[otmp.otyp].oc_subtyp <= -P_BOW)); }

export function matching_launcher(a, l) { return ((((l) && objects[(a).otyp].oc_subtyp == -objects[(l).otyp].oc_subtyp) ? 1 : 0)); }

export function ammo_and_launcher(a, l) { return (((is_ammo(a) && matching_launcher(a, l)) ? 1 : 0)); }
export function is_missile(otmp) { return (+((otmp.oclass == WEAPON_CLASS || otmp.oclass == TOOL_CLASS) 
     && objects[otmp.otyp].oc_subtyp >= -P_BOOMERANG              
     && objects[otmp.otyp].oc_subtyp <= -P_DART)); }

export function is_weptool(o) { return (+((o).oclass == TOOL_CLASS && objects[(o).otyp].oc_subtyp != P_NONE)); }

        /* towel is not a weptool:  spe isn't an enchantment, cursed towel
           doesn't weld to hand, and twoweapon won't work with one */
export function is_blunt_weapon(o) { return (+(((o).oclass == WEAPON_CLASS || is_weptool(o)) 
     && ((objects[(o).otyp].oc_dir & WHACK) != 0))); }

export function is_wet_towel(o) { return (+((o).otyp == TOWEL && (o).spe > 0)); }
export function bimanual(otmp) { return ((((otmp.oclass == WEAPON_CLASS || otmp.oclass == TOOL_CLASS) 
     && objects[otmp.otyp].oc_big) ? 1 : 0)); }

export function is_multigen(otmp) { return (+(otmp.oclass == WEAPON_CLASS                   
     && objects[otmp.otyp].oc_subtyp >= -P_SHURIKEN 
     && objects[otmp.otyp].oc_subtyp <= -P_BOW)); }

export function is_poisonable(otmp) { return ((((otmp.oclass == WEAPON_CLASS                   
      && objects[otmp.otyp].oc_subtyp >= -P_SHURIKEN 
      && objects[otmp.otyp].oc_subtyp <= -P_BOW)     
     || permapoisoned(otmp)) ? 1 : 0)); }

export function uslinging() { return (((uwep && objects[uwep.otyp].oc_subtyp == P_SLING) ? 1 : 0)); }
/* 'is_quest_artifact()' only applies to the current role's artifact */
export function any_quest_artifact(o) { return (+((o).oartifact >= ART_ORB_OF_DETECTION)); }
/* 'missile' aspect is up to the caller and does not imply is_missile();
   rings might be launched as missiles when being scattered by an explosion */
export function stone_missile(o) { return (+((objects[(o).otyp].oc_material == GEMSTONE             
             || (objects[(o).otyp].oc_material == MINERAL))        
         && (o).oclass != RING_CLASS)); }


/* Armor */
export function is_shield(otmp) { return (+(otmp.oclass == ARMOR_CLASS 
     && objects[otmp.otyp].oc_subtyp == ARM_SHIELD)); }

export function is_helmet(otmp) { return (+(otmp.oclass == ARMOR_CLASS && objects[otmp.otyp].oc_subtyp == ARM_HELM)); }

export function is_boots(otmp) { return (+(otmp.oclass == ARMOR_CLASS 
     && objects[otmp.otyp].oc_subtyp == ARM_BOOTS)); }

export function is_gloves(otmp) { return (+(otmp.oclass == ARMOR_CLASS 
     && objects[otmp.otyp].oc_subtyp == ARM_GLOVES)); }

export function is_cloak(otmp) { return (+(otmp.oclass == ARMOR_CLASS 
     && objects[otmp.otyp].oc_subtyp == ARM_CLOAK)); }

export function is_shirt(otmp) { return (+(otmp.oclass == ARMOR_CLASS 
     && objects[otmp.otyp].oc_subtyp == ARM_SHIRT)); }

export function is_suit(otmp) { return (+(otmp.oclass == ARMOR_CLASS && objects[otmp.otyp].oc_subtyp == ARM_SUIT)); }

export function is_elven_armor(otmp) { return (+((otmp).otyp == ELVEN_LEATHER_HELM                                   
     || (otmp).otyp == ELVEN_MITHRIL_COAT || (otmp).otyp == ELVEN_CLOAK 
     || (otmp).otyp == ELVEN_SHIELD || (otmp).otyp == ELVEN_BOOTS)); }












/* Eggs and other food */

export function stale_egg(egg) { return (+((svm.moves - (egg).age) > (2 * MAX_EGG_HATCH_TIME))); }

export function ofood(o) { return (+((o).otyp == CORPSE || (o).otyp == EGG || (o).otyp == TIN)); }
    /* note: sometimes eggs and tins have special corpsenm values that
       shouldn't be used as an index into mons[]                       */
export function polyfood(obj) { return (((ofood(obj) && (obj).corpsenm >= LOW_PM                            
     && (pm_to_cham((obj).corpsenm) != NON_PM                          
         || dmgtype(mons[(obj).corpsenm], AD_POLY))) ? 1 : 0)); }

export function mlevelgain(obj) { return (+(ofood(obj) && (obj).corpsenm == PM_WRAITH)); }
export function mhealup(obj) { return (+(ofood(obj) && (obj).corpsenm == PM_NURSE)); }
export function Is_pudding(o) { return (+(o.otyp == GLOB_OF_GRAY_OOZE || o.otyp == GLOB_OF_BROWN_PUDDING   
     || o.otyp == GLOB_OF_GREEN_SLIME || o.otyp == GLOB_OF_BLACK_PUDDING)); }


/* Containers */
export function carried(o) { return (+((o).where == OBJ_INVENT)); }
export function mcarried(o) { return (+((o).where == OBJ_MINVENT)); }
export function Has_contents(o) { return (/* (Is_container(o) || (o)->otyp == STATUE) && */ 
     +((o).cobj != null)); }

export function Is_container(o) { return (+((o).otyp >= LARGE_BOX && (o).otyp <= BAG_OF_TRICKS)); }
export function Is_box(o) { return (+((o).otyp == LARGE_BOX || (o).otyp == CHEST)); }
export function Is_mbag(o) { return (+((o).otyp == BAG_OF_HOLDING || (o).otyp == BAG_OF_TRICKS)); }
export function SchroedingersBox(o) { return (+((o).otyp == LARGE_BOX && (o).spe == 1)); }
/* usually waterproof; random chance to be subjected to leakage if cursed;
   excludes statues, which aren't vulnerable to water even when cursed */
export function Waterproof_container(o) { return (+((o).otyp == OILSKIN_SACK || (o).otyp == ICE_BOX || Is_box(o))); }


/* dragon gear */
export function Is_dragon_scales(obj) { return (+((obj).otyp >= GRAY_DRAGON_SCALES && (obj).otyp <= YELLOW_DRAGON_SCALES)); }

export function Is_dragon_mail(obj) { return (+((obj).otyp >= GRAY_DRAGON_SCALE_MAIL 
     && (obj).otyp <= YELLOW_DRAGON_SCALE_MAIL)); }

export function Is_dragon_armor(obj) { return (+(Is_dragon_scales(obj) || Is_dragon_mail(obj))); }
export function Dragon_scales_to_pm(obj) { return elt(mons, PM_GRAY_DRAGON + (obj).otyp - GRAY_DRAGON_SCALES); }

export function Dragon_mail_to_pm(obj) { return elt(mons, PM_GRAY_DRAGON + (obj).otyp - GRAY_DRAGON_SCALE_MAIL); }



/* Elven gear */
export function is_elven_weapon(otmp) { return (+((otmp).otyp == ELVEN_ARROW || (otmp).otyp == ELVEN_SPEAR           
     || (otmp).otyp == ELVEN_DAGGER || (otmp).otyp == ELVEN_SHORT_SWORD 
     || (otmp).otyp == ELVEN_BROADSWORD || (otmp).otyp == ELVEN_BOW)); }



/* Orcish gear */





/* Dwarvish gear */





/* Gnomish gear */


/* Light sources */
export function Is_candle(otmp) { return (+(otmp.otyp == TALLOW_CANDLE || otmp.otyp == WAX_CANDLE)); }



/* age field of this is relative age rather than absolute; does not include
   magic lamp */
export function age_is_relative(otmp) { return (+((otmp).otyp == BRASS_LANTERN || (otmp).otyp == OIL_LAMP      
     || (otmp).otyp == CANDELABRUM_OF_INVOCATION                   
     || (otmp).otyp == TALLOW_CANDLE || (otmp).otyp == WAX_CANDLE 
     || (otmp).otyp == POT_OIL)); }

/* object can be ignited; magic lamp used to excluded here too but all
   usage of this macro ended up testing
     (ignitable(obj) || obj->otyp == MAGIC_LAMP)
   so include it; brass lantern can be lit but not by fire */
export function ignitable(otmp) { return (+((otmp).otyp == BRASS_LANTERN || (otmp).otyp == OIL_LAMP      
     || ((otmp).otyp == MAGIC_LAMP && (otmp).spe > 0)             
     || (otmp).otyp == CANDELABRUM_OF_INVOCATION                   
     || (otmp).otyp == TALLOW_CANDLE || (otmp).otyp == WAX_CANDLE 
     || (otmp).otyp == POT_OIL)); }


/* things that can be read */







/* special stones */
export function is_graystone(obj) { return (+((obj).otyp == LUCKSTONE || (obj).otyp == LOADSTONE 
     || (obj).otyp == FLINT || (obj).otyp == TOUCHSTONE)); }


/* misc helpers, simple enough to be macros */
export function is_flimsy(otmp) { return (+(objects[(otmp).otyp].oc_material <= LEATHER 
     || (otmp).otyp == RUBBER_HOSE)); }

export function is_plural(o) { return (+((o).quan != 1                                                    
     /* "the Eyes of the Overworld" are plural, but                     
        "a pair of lenses named the Eyes of the Overworld" is not */    
     || ((o).oartifact == ART_EYES_OF_THE_OVERWORLD                    
         && !undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD)))); }

export function pair_of(o) { return (+((o).otyp == LENSES || is_gloves(o) || is_boots(o))); }

export function unpolyable(o) { return (+((o).otyp == WAN_POLYMORPH 
                       || (o).otyp == SPE_POLYMORPH 
                       || (o).otyp == POT_POLYMORPH 
                       || (o).otyp == AMULET_OF_UNCHANGING)); }

/* achievement tracking; 3.6.x did this differently */
export function is_mines_prize(o) { return (+((o).o_id == svc.context.achieveo.mines_prize_oid)); }
export function is_soko_prize(o) { return (+((o).o_id == svc.context.achieveo.soko_prize_oid)); }

/* is_art() is now a function in artifact.c */
/* #define is_art(o,art) ((o) && (o)->oartifact == (art)) */

export function u_wield_art(art) { return is_art(uwep, art); }

/* mummy wrappings are more versatile sizewise than other cloaks */
export function WrappingAllowed(mptr) { return (+(humanoid(mptr) && (mptr).msize >= MZ_SMALL && (mptr).msize <= MZ_HUGE 
     && !noncorporeal(mptr) && (mptr).mlet != S_CENTAUR                     
     && (mptr) != mons[PM_WINGED_GARGOYLE] && (mptr) != mons[PM_MARILITH])); }


/* Flags for get_obj_location(). */



/* object erosion types */







/* erosion flags for erode_obj() */






/* erosion return values for erode_obj(), water_damage() */





/* propeller method for potionhit() */





/* tracking how an item left your inventory via how_lost field */







/* tracking how a name got acquired by an object in named_how field */



/*
 *  Notes for adding new oextra structures:
 *
 *       1. Add the structure definition and any required macros in an
 *          appropriate header file that precedes this one.
 *       2. Add a pointer to your new struct to oextra struct in this file.
 *       3. Add a referencing macro to this file after the newobj macro above
 *          (see ONAME, OMONST, OMAILCMD, or OMIN for examples).
 *       4. Add a testing macro after the set of referencing macros
 *          (see has_oname(), has_omonst(), has_omailcmd(), and has_omin(),
 *          for examples).
 *       5. If your new field isn't a pointer and requires a non-zero value
 *          on initialization, add code to init_oextra() in src/mkobj.c.
 *       6. Create newXX(otmp) function and possibly free_XX(otmp) function
 *          in an appropriate new or existing source file and add a prototype
 *          for it to include/extern.h.  The majority of these are currently
 *          located in mkobj.c for convenience.
 *
 *          void newXX(struct obj *);
 *          void free_XX(struct obj *);
 *
 *          void
 *          newxx(otmp)
 *          struct obj *otmp;
 *          {
 *              if (!otmp->oextra)
 *                  otmp->oextra = newoextra();
 *              if (!XX(otmp)) {
 *                  XX(otmp) = (struct XX *) alloc(sizeof (struct xx));
 *                  (void) memset((genericptr_t) XX(otmp),
 *                                0, sizeof (struct xx));
 *              }
 *         }
 *
 *       7. Adjust size_obj() in src/cmd.c appropriately.
 *       8. Adjust dealloc_oextra() in src/mkobj.c to clean up
 *          properly during obj deallocation.
 *       9. Adjust copy_oextra() in src/mkobj.c to make duplicate
 *          copies of your struct or data onto another obj struct.
 *      10. Adjust restobj() in src/restore.c to deal with your
 *          struct or data during a restore.
 *      11. Adjust saveobj() in src/save.c to deal with your
 *          struct or data during a save.
 */
import { ART_EYES_OF_THE_OVERWORLD } from "./artilist.h.js";
import { ART_ORB_OF_DETECTION } from "./artilist.h.js";
import { ART_SNICKERSNEE } from "./artilist.h.js";
import { ARMOR_CLASS } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { RING_CLASS } from "./defsym.h.js";
import { S_CENTAUR } from "./defsym.h.js";
import { TOOL_CLASS } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { AD_POLY } from "./monattk.h.js";
import { humanoid } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { MZ_HUGE } from "./monflag.h.js";
import { MZ_SMALL } from "./monflag.h.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { PM_GRAY_DRAGON } from "./monsters.h.js";
import { PM_MARILITH } from "./monsters.h.js";
import { PM_NURSE } from "./monsters.h.js";
import { PM_WINGED_GARGOYLE } from "./monsters.h.js";
import { PM_WRAITH } from "./monsters.h.js";
import { MAX_EGG_HATCH_TIME } from "./obj.h.js";
import { OBJ_INVENT } from "./obj.h.js";
import { OBJ_MINVENT } from "./obj.h.js";
import { struct_obj } from "./obj.h.js";
import { ARM_BOOTS } from "./objclass.h.js";
import { ARM_CLOAK } from "./objclass.h.js";
import { ARM_GLOVES } from "./objclass.h.js";
import { ARM_HELM } from "./objclass.h.js";
import { ARM_SHIELD } from "./objclass.h.js";
import { ARM_SHIRT } from "./objclass.h.js";
import { ARM_SUIT } from "./objclass.h.js";
import { GEMSTONE } from "./objclass.h.js";
import { LEATHER } from "./objclass.h.js";
import { MINERAL } from "./objclass.h.js";
import { WHACK } from "./objclass.h.js";
import { AMULET_OF_UNCHANGING } from "./objects.h.js";
import { BAG_OF_HOLDING } from "./objects.h.js";
import { BAG_OF_TRICKS } from "./objects.h.js";
import { BRASS_LANTERN } from "./objects.h.js";
import { CANDELABRUM_OF_INVOCATION } from "./objects.h.js";
import { CHEST } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_ARROW } from "./objects.h.js";
import { ELVEN_BOOTS } from "./objects.h.js";
import { ELVEN_BOW } from "./objects.h.js";
import { ELVEN_BROADSWORD } from "./objects.h.js";
import { ELVEN_CLOAK } from "./objects.h.js";
import { ELVEN_DAGGER } from "./objects.h.js";
import { ELVEN_LEATHER_HELM } from "./objects.h.js";
import { ELVEN_MITHRIL_COAT } from "./objects.h.js";
import { ELVEN_SHIELD } from "./objects.h.js";
import { ELVEN_SHORT_SWORD } from "./objects.h.js";
import { ELVEN_SPEAR } from "./objects.h.js";
import { FLINT } from "./objects.h.js";
import { GLOB_OF_BLACK_PUDDING } from "./objects.h.js";
import { GLOB_OF_BROWN_PUDDING } from "./objects.h.js";
import { GLOB_OF_GRAY_OOZE } from "./objects.h.js";
import { GLOB_OF_GREEN_SLIME } from "./objects.h.js";
import { GRAY_DRAGON_SCALES } from "./objects.h.js";
import { GRAY_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { ICE_BOX } from "./objects.h.js";
import { LARGE_BOX } from "./objects.h.js";
import { LENSES } from "./objects.h.js";
import { LOADSTONE } from "./objects.h.js";
import { LUCKSTONE } from "./objects.h.js";
import { MAGIC_LAMP } from "./objects.h.js";
import { OILSKIN_SACK } from "./objects.h.js";
import { OIL_LAMP } from "./objects.h.js";
import { POT_OIL } from "./objects.h.js";
import { POT_POLYMORPH } from "./objects.h.js";
import { RUBBER_HOSE } from "./objects.h.js";
import { SPE_POLYMORPH } from "./objects.h.js";
import { TALLOW_CANDLE } from "./objects.h.js";
import { TIN } from "./objects.h.js";
import { TOUCHSTONE } from "./objects.h.js";
import { TOWEL } from "./objects.h.js";
import { WAN_POLYMORPH } from "./objects.h.js";
import { WAX_CANDLE } from "./objects.h.js";
import { YELLOW_DRAGON_SCALES } from "./objects.h.js";
import { YELLOW_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { P_AXE } from "./skills.h.js";
import { P_BOOMERANG } from "./skills.h.js";
import { P_BOW } from "./skills.h.js";
import { P_CROSSBOW } from "./skills.h.js";
import { P_DAGGER } from "./skills.h.js";
import { P_DART } from "./skills.h.js";
import { P_LANCE } from "./skills.h.js";
import { P_NONE } from "./skills.h.js";
import { P_PICK_AXE } from "./skills.h.js";
import { P_POLEARMS } from "./skills.h.js";
import { P_SABER } from "./skills.h.js";
import { P_SHORT_SWORD } from "./skills.h.js";
import { P_SHURIKEN } from "./skills.h.js";
import { P_SLING } from "./skills.h.js";
import { P_SPEAR } from "./skills.h.js";
import { sizeof } from "../rt/ctypes.js";
import { addr_of } from "../rt/struct.js";
import { elt } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { is_art } from "./artifact.js";
import { permapoisoned } from "./artifact.js";
import { undiscovered_artifact } from "./artifact.js";
import { svc } from "./decl.js";
import { svm } from "./decl.js";
import { pm_to_cham } from "./mon.js";
import { dmgtype } from "./mondata.js";
import { mons } from "./monst.js";
import { objects } from "./objects.js";
