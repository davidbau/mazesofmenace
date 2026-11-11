/* NetHack 5.0	region.h	$NHDT-Date: 1596498557 2020/08/03 23:49:17 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.15 $ */
/* Copyright (c) 1996 by Jean-Christophe Collet                   */
/* NetHack may be freely redistributed.  See license for details. */




/* generic callback function */



/*
 * player_flags
 */


export function hero_inside(r) { return ((r).player_flags & REG_HERO_INSIDE); }
export function heros_fault(r) { return (+!((r).player_flags & REG_NOT_HEROS)); }
export function set_hero_inside(r) { return ((r).player_flags |= REG_HERO_INSIDE); }
export function clear_hero_inside(r) { return ((r).player_flags &= unsigned(~REG_HERO_INSIDE)); }
export function set_heros_fault(r) { return ((r).player_flags &= unsigned(~REG_NOT_HEROS)); }
export function clear_heros_fault(r) { return ((r).player_flags |= REG_NOT_HEROS); }

/*
 * Note: if you change the size/type of any of the fields below,
 *       or add any/remove any fields, you must update the
 *       bwrite() calls in save_regions(), and the
 *       mread() calls in rest_regions() in src/region.c
 *       to reflect the changes.
 */


    /* Bounding box of the region */
    /* Rectangles composing the region */
    /* Number of rectangles  */
    /* Region attached to player ? */
    /* Region attached to monster ? */
    /*struct obj *attach_2_o;*//* Region attached to object ? UNUSED YET */
    /* Message when entering */
    /* Message when leaving */
    /* Time to live. -1 is forever */
    /* Function to call when region's ttl expire */
    /* Function to call to check whether the player
                            * can, or can not, enter the region */
    /* Function to call when the player enters*/
    /* Function to call to check whether the player
                            * can, or can not, leave the region */
    /* Function to call when the player leaves */
    /* Function to call every turn if player's inside */
    /* (see above) */
    /* Monsters currently inside this region */
    /* Number of monsters inside this region */
    /* Maximum number of monsters that can be
                            * listed without having to grow the array */


    /* Should probably do the same thing about objects */

    /* Is the region visible? */
    /* Which glyph to use if visible */
    /* Optional user argument (Ex: strength of
                            * force field, damage of a fire zone, ...*/
import { REG_HERO_INSIDE } from "./region.h.js";
import { REG_NOT_HEROS } from "./region.h.js";
import { unsigned } from "../rt/ctypes.js";
