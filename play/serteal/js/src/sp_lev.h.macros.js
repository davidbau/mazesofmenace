/* NetHack 5.0	sp_lev.h	$NHDT-Date: 1622361649 2021/05/30 08:00:49 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.47 $ */
/* Copyright (c) 1989 by Jean-Christophe Collet                   */
/* NetHack may be freely redistributed.  See license for details. */




/* wall directions */







/* MAP limits */



/* Per level flags */
















/* different level layout initializers */










/* max. nested depth of subrooms */


/* When creating objects, we need to know whether
 * it's a container and/or contents.
 */



/* SPO_FILTER types */




/* gradient filter types */




/* Humidity flags for get_location() and friends, used with
 * SP_COORD_PACK_RANDOM() */








/* has_invent flags */




export function SP_COORD_X(l) { return (l & 0xff); }
export function SP_COORD_Y(l) { return ((shr64(l, 16)) & 0xff); }
export function SP_COORD_PACK(x, y) { return (((x) & 0xff) + (((y) & 0xff) << 16)); }
export function SP_COORD_PACK_RANDOM(f) { return (SP_COORD_IS_RANDOM | (f)); }














/*
 * Structures manipulated by the special levels loader & compiler
 */










    /* one of LVLINIT_foo */



























    /* splev amask */









    /* makemon flags */




















    /* splev amask */
import { SP_COORD_IS_RANDOM } from "./sp_lev.h.js";
import { shr64 } from "../rt/int64.js";
