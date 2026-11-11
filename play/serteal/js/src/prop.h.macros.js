/* NetHack 5.0	prop.h	$NHDT-Date: 1702274027 2023/12/11 05:53:47 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.24 $ */
/* Copyright (c) 1989 Mike Threepoint                             */
/* NetHack may be freely redistributed.  See license for details. */




/*** What the properties are ***
 *
 * note:  propertynames[] array in timeout.c has string values for these.
 *        Property #0 is not used.
 */
/* Resistances to troubles */









    /* note: the first eight properties above are equivalent to MR_xxx bits
     * MR_FIRE through MR_STONE, and can be directly converted to them: */
export function res_to_mr(r) { return ((FIRE_RES <= (r) && (r) <= STONE_RES) ? uchar((1 << ((r) - 1))) : 0x00); }





    /* Troubles */
















    /* Vision and senses */










    /* Appearance and behavior */






    /* Transportation */









    /* Physical attributes */


















/*** Where the properties come from ***/
/* Definitions were moved here from obj.h and you.h */

    /*** Properties conveyed by objects ***/

/* Armor */








/* Weapons and artifacts */






/* Amulets, rings, tools, and other items */






    /* historical note: originally in slash'em, 'worn' saddle stayed in
       hero's inventory; in nethack, it's kept in the steed's inventory */




    /*** Property is blocked by an object ***/
    /* Same assignments as extrinsic */

    /*** Timeouts, permanent properties, and other flags ***/

/* Timed properties */

/* Permanent properties */




/* Control flags */




/*** Definitions for backwards compatibility ***/
import { FIRE_RES } from "./prop.h.js";
import { STONE_RES } from "./prop.h.js";
import { uchar } from "../rt/ctypes.js";
