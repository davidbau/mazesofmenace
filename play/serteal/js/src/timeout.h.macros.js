/* NetHack 5.0	timeout.h	$NHDT-Date: 1705087443 2024/01/12 19:24:03 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.23 $ */
/* Copyright 1994, Dean Luick                                     */
/* NetHack may be freely redistributed.  See license for details. */




/* generic timeout function */


/* kind of timer */


    /* event specific to level [melting ice] */
    /* event follows current play [not used] */
    /* event follows an object [various] */
    /* event follows a monster [not used] */
    /* 5 */


/* save/restore timer ranges */



/*
 * Timeout functions.  Add an enum here, then put it in the table
 * in timeout.c.  "One more level of indirection will fix everything."
 * Also add it to timerstr[] in nhl_get_timertype(nhlua.c); the entries
 * there match these but are spelled differently.
 *
 * Note:  if any are inserted, removed, or reordered then EDITLEVEL
 * needs to be incremented because timeout indices get written into save
 * and bones files if any timers are present while saving.  (Adding new
 * ones at the end isn't restricted this way since new indices won't be
 * present in old data.)
 */

    /* for buried organics */












export function timer_is_pos(ttype) { return (+((ttype) == MELT_ICE_AWAY)); }
export function timer_is_obj(ttype) { return (+((ttype) == ROT_ORGANIC      
                             || (ttype) == ROT_CORPSE    
                             || (ttype) == REVIVE_MON    
                             || (ttype) == ZOMBIFY_MON   
                             || (ttype) == BURN_OBJECT   
                             || (ttype) == HATCH_EGG     
                             || (ttype) == FIG_TRANSFORM 
                             || (ttype) == SHRINK_GLOB)); }

/* used in timeout.c */

    /* next item in chain */
    /* when we time out */
    /* timer ID */
    /* kind of use */
    /* what to call when we time out */
    /* pointer to timeout argument */
    /* does arg need to be patched? */
import { BURN_OBJECT } from "./timeout.h.js";
import { FIG_TRANSFORM } from "./timeout.h.js";
import { HATCH_EGG } from "./timeout.h.js";
import { MELT_ICE_AWAY } from "./timeout.h.js";
import { REVIVE_MON } from "./timeout.h.js";
import { ROT_CORPSE } from "./timeout.h.js";
import { ROT_ORGANIC } from "./timeout.h.js";
import { SHRINK_GLOB } from "./timeout.h.js";
import { ZOMBIFY_MON } from "./timeout.h.js";
