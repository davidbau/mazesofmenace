/* NetHack 5.0	monattk.h	$NHDT-Date: 1596498548 2020/08/03 23:49:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.13 $ */
/* NetHack may be freely redistributed.  See license for details. */
/* Copyright 1988, M. Stephenson */




/*      Add new attack types below - ordering affects experience (exper.c).
 *      Attacks > AT_BUTT are worth extra experience.
 */




















export function DISTANCE_ATTK_TYPE(atyp) { return (+((atyp) == AT_SPIT 
                                  || (atyp) == AT_BREA 
                                  || (atyp) == AT_MAGC 
                                  || (atyp) == AT_GAZE)); }

/*      Add new damage types below.
 *
 *      Note that 1-10 correspond to the types of attack used in buzz().
 *      Please don't disturb the order unless you rewrite the buzz() code.
 */























































    /* M_ATTK_DEF_DIED | M_ATTK_AGR_DIED | ... */






/*
 *  Monster-to-monster attacks.  When a monster attacks another (mattackm),
 *  any or all of the following can be returned.  See mattackm() for more
 *  details.
 */
import { AT_BREA } from "./monattk.h.js";
import { AT_GAZE } from "./monattk.h.js";
import { AT_MAGC } from "./monattk.h.js";
import { AT_SPIT } from "./monattk.h.js";
