/* NetHack 5.0	vision.h	$NHDT-Date: 1666478832 2022/10/22 22:47:12 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.15 $ */
/* Copyright (c) Dean Luick, with acknowledgements to Dave Cohrs, 1990. */
/* NetHack may be freely redistributed.  See license for details.       */








/*
 * Light source sources
 */







/*
 *  cansee()    - Returns true if the hero can see the location.
 *
 *  couldsee()  - Returns true if the hero has a clear line of sight to
 *                the location.
 */
export function cansee(x, y) { return (+((uchars[gv.viz_array[y] + x] & IN_SIGHT) != 0)); }
export function couldsee(x, y) { return (+((uchars[gv.viz_array[y] + x] & COULD_SEE) != 0)); }


/*
 *  The following assume the monster is not blind.
 *
 *  m_cansee()  - Returns true if the monster can see the given location.
 *
 *  m_canseeu() - Returns true if the monster could see the hero.  Assumes
 *                that if the hero has a clear line of sight to the monster's
 *                location and the hero is visible, then monster can see the
 *                hero.
 */
export function m_cansee(mtmp, x2, y2) { return clear_path((mtmp).mx, (mtmp).my, (x2), (y2)); }







export function m_canseeu(m) { return (+((!Invis() || perceives((m).data))                      
     && !Underwater()                                        
     && couldsee((m).mx, (m).my))); }



/*
 *  Circle information
 */


/* Use this macro to get a list of distances of the edges (see vision.c). */
export function circle_ptr(z) { return (circle_data.subarray((circle_start[z]))); }

/* howmonseen() bitmask values */
import { perceives } from "./mondata.h.macros.js";
import { COULD_SEE } from "./vision.h.js";
import { IN_SIGHT } from "./vision.h.js";
import { Invis } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { uchars } from "../rt/heap.js";
import { gv } from "./decl.js";
import { circle_data } from "./vision.js";
import { circle_start } from "./vision.js";
import { clear_path } from "./vision.js";
