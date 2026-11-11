/* NetHack 5.0	objclass.h	$NHDT-Date: 1596498553 2020/08/03 23:49:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.22 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2018. */
/* NetHack may be freely redistributed.  See license for details. */




/* [misnamed] definition of a type of object; many objects are composites
   (liquid potion inside glass bottle, metal arrowhead on wooden shaft)
   and object definitions only specify one type on a best-fit basis */


    /* currently only for venom */

    /* foodstuffs */
    /*   ditto    */





    /* not leather! */
    /* Fe - includes steel */
    /* Sn, &c. */
    /* Cu - includes brass */
    /* Ag */
    /* Au */
    /* Pt */









    /* needed for special wear function */








    /* index of actual name */
    /* description when name unknown */
    /* called by user */
    /* discovered */
    /* merge otherwise equal objects */
    /* obj->known affects full description;
                                     * otherwise, obj->dknown and obj->bknown
                                     * tell all, and obj->known should always
                                     * be set for proper merging behavior. */
    /* hero has observed such an item at least
                                       once (perhaps without naming it) */
    /* inherently magical object */
    /* may have +n or (n) charges */
    /* special one-of-a-kind object */
    /* cannot wish for this object */




    /* hard gems/rings */

    /* padding to align oc_dir + oc_material;
                                     * can be cannibalized for other use;
                                     * aka 6 free bits */


    /* oc_dir: zap style for wands and spells */



    /* overloaded oc_dir: strike mode bit mask for weapons and weptools */



    /* one of obj_material_types */





    /* property (invis, &c.) conveyed */
    /* object class (enum obj_class_types) */
    /* delay when using such an object */
    /* color of the object */

    /* probability, used in mkobj() */
    /* encumbrance (1 cn = 0.1 lb.) */
    /* base cost in shops */
    /* Check the AD&D rules!  The FIRST is small monster damage. */
    /* for weapons, and tools, rocks, and gems useful as weapons */
    /* max small/large monster damage */







    /* food value */














    /* actual name */
    /* description when name unknown */


/*
 * All objects have a class. Make sure that all classes have a corresponding
 * symbol below.
 */








    /* used for generating random objects */






/* Default characters for object classes */






/* for mkobj() use ONLY! odd '-SPBOOK_CLASS' is in case of unsigned enums */








        /* default class symbols */
/* current class symbols */







export function newfruit() { return view_of(struct_fruit, addr_of(alloc(sizeof(struct_fruit)))); }
export function dealloc_fruit(rind) { return free(addr_of((rind))); }











    /* LAST_SPELL is SPE_BLANK_PAPER, guaranteeing that spl_book[] will
       have at least one unused slot at end to be used as a terminator */






export function OBJ_NAME(obj) { return (obj_descr[(obj).oc_name_idx].oc_name); }
export function OBJ_DESCR(obj) { return (obj_descr[(obj).oc_descr_idx].oc_descr); }

export function is_organic(otmp) { return (+(objects[otmp.otyp].oc_material <= WOOD)); }
export function is_metallic(otmp) { return (+(objects[otmp.otyp].oc_material >= IRON            
     && objects[otmp.otyp].oc_material <= MITHRIL)); }


/* primary damage: fire/rust/--- */
/* is_flammable(otmp), is_rottable(otmp) in mkobj.c */
export function is_rustprone(otmp) { return (+(objects[otmp.otyp].oc_material == IRON)); }
export function is_crackable(otmp) { return (+(objects[(otmp).otyp].oc_material == GLASS         
     && (otmp).oclass == ARMOR_CLASS)); }

/* secondary damage: rot/acid/acid */
export function is_corrodeable(otmp) { return (+(objects[otmp.otyp].oc_material == COPPER          
     || objects[otmp.otyp].oc_material == IRON)); }

/* subject to any damage */
export function is_damageable(otmp) { return (((is_rustprone(otmp) || is_flammable(otmp)           
     || is_rottable(otmp) || is_corrodeable(otmp)       
     || is_crackable(otmp)) ? 1 : 0)); }
import { ARMOR_CLASS } from "./defsym.h.js";
import { COPPER } from "./objclass.h.js";
import { GLASS } from "./objclass.h.js";
import { IRON } from "./objclass.h.js";
import { MITHRIL } from "./objclass.h.js";
import { WOOD } from "./objclass.h.js";
import { struct_fruit } from "./objclass.h.js";
import { sizeof } from "../rt/ctypes.js";
import { free } from "../rt/libc.js";
import { addr_of } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { is_flammable } from "./mkobj.js";
import { is_rottable } from "./mkobj.js";
import { obj_descr } from "./objects.js";
import { objects } from "./objects.js";
