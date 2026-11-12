/* NetHack 5.0	trap.h	$NHDT-Date: 1670316586 2022/12/06 08:49:46 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.31 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2016. */
/* NetHack may be freely redistributed.  See license for details. */

/* note for 3.1.0 and later: no longer manipulated by 'makedefs' */





    /* type of object to be triggered */
    /* secondary launch point (for boulders) */
    /* conjoined pit locations */
    /* boards: 12 notes        */





    /* destination for portals/holes/trapdoors */





    /* So monsters may take offence when you trap
                            * them.  Recognizing who made the trap isn't
                            * completely unreasonable; everybody has
                            * their own style.  This flag is also needed
                            * when you untrap a monster.  It would be too
                            * easy to make a monster peaceful if you could
                            * set a trap for it and then untrap it. */







export function newtrap() { return view_of(struct_trap, addr_of(alloc(sizeof(struct_trap)))); }
export function dealloc_trap(trap) { return free(addr_of((trap))); }

/* reasons for statue animation */




/* reasons for animate_statue's failure */




/* Note: if adding/removing a trap, adjust trap_engravings[] in mklev.c */

/* unconditional traps */

    /* mon_knows_traps(), mon_learns_traps() */























    /* not a trap but shown/remembered as if one
                            * once it has been discovered */

    /* trapped door and trapped chest aren't traps on the map, but they
       might be shown/remembered as such after trap detection until hero
       comes in view of them and sees the feature or object;
       key-using or door-busting monsters who survive a door trap learn
       to avoid other such doors [not implemented] */
    /* part of door; not present on map as a trap */
    /* part of object; not on map */




/* some trap-related function return results */





    /* new location, or new level */


/* return codes from immune_to_trap() */







export function is_pit(ttyp) { return (+((ttyp) == PIT || (ttyp) == SPIKED_PIT)); }
export function is_hole(ttyp) { return (+((ttyp) == HOLE || (ttyp) == TRAPDOOR)); }
export function unhideable_trap(ttyp) { return (+((ttyp) == HOLE)); }
export function undestroyable_trap(ttyp) { return (+((ttyp) == MAGIC_PORTAL         
                                  || (ttyp) == VIBRATING_SQUARE)); }
export function is_magical_trap(ttyp) { return (+((ttyp) == TELEP_TRAP     
                               || (ttyp) == LEVEL_TELEP 
                               || (ttyp) == MAGIC_TRAP  
                               || (ttyp) == ANTI_MAGIC  
                               || (ttyp) == POLY_TRAP)); }
/* "transportation" traps */
export function is_xport(ttyp) { return (+((ttyp) >= TELEP_TRAP && (ttyp) <= MAGIC_PORTAL)); }
export function fixed_tele_trap(t) { return ((((t).ttyp == TELEP_TRAP 
                            && isok((t).launch.x,(t).launch.y)) ? 1 : 0)); }
import { ANTI_MAGIC } from "./trap.h.js";
import { HOLE } from "./trap.h.js";
import { LEVEL_TELEP } from "./trap.h.js";
import { MAGIC_PORTAL } from "./trap.h.js";
import { MAGIC_TRAP } from "./trap.h.js";
import { PIT } from "./trap.h.js";
import { POLY_TRAP } from "./trap.h.js";
import { SPIKED_PIT } from "./trap.h.js";
import { TELEP_TRAP } from "./trap.h.js";
import { TRAPDOOR } from "./trap.h.js";
import { VIBRATING_SQUARE } from "./trap.h.js";
import { struct_trap } from "./trap.h.js";
import { sizeof } from "../rt/ctypes.js";
import { free } from "../rt/libc.js";
import { addr_of } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { isok } from "./cmd.js";
