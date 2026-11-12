/* NetHack 5.0	align.h	$NHDT-Date: 1604269810 2020/11/01 22:30:10 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.15 $ */
/* Copyright (c) Mike Stephenson, Izchak Miller  1991.            */
/* NetHack may be freely redistributed.  See license for details. */




/* basic alignment type */

/* alignment & record */





/* bounds for "record" -- respect initial alignments of 10 */
export function ALIGNLIM() { return (10 + (Math.trunc(svm.moves / 200))); }










/* align masks */






/* Some altars are considered shrines, add a flag for that
   for the altarmask field of struct rm. */

/* High altar on Astral plane or Moloch's sanctum */


/* special level flags, gone by the time the level has been loaded */




export function Amask2align(x) { return (((((x) & AM_MASK) == 0) ? A_NONE                
                 : (((x) & AM_MASK) == AM_LAWFUL) ? A_LAWFUL    
                   : (((x) & AM_MASK)) - 2)); }

export function Align2amask(x) { return (unsigned((((x) == A_NONE) ? AM_NONE                      
                 : ((x) == A_LAWFUL) ? AM_LAWFUL                
                   : ((x) + 2)))); }


/* Because clearly Nethack needs more ways to specify alignment...
   Amask2msa(): 1, 2, 4 converted to 1, 2, 3 to fit within a width 2 bitfield;
   Msa2amask(): 1, 2, 3 converted back to 1, 2, 4;
   For Amask2msa(), 'x' might have the shrine bit set so strip that off. */
export function Amask2msa(x) { return ((((x) & AM_MASK) == 4) ? 3 : (x) & AM_MASK); }
export function Msa2amask(x) { return (((x) == 3) ? 4 : (x)); }


/* alignment change reasons for uchangealign(attrib.c) */

    /* permanently converted */
    /* donned helm of opposite alignment */
    /* doffed helm of opposite alignment */
import { AM_LAWFUL } from "./align.h.js";
import { AM_MASK } from "./align.h.js";
import { AM_NONE } from "./align.h.js";
import { A_LAWFUL } from "./align.h.js";
import { A_NONE } from "./align.h.js";
import { unsigned } from "../rt/ctypes.js";
import { svm } from "./decl.js";
