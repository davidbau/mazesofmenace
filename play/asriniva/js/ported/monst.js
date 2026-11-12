/* NetHack 5.0	monst.c	$NHDT-Date: 1705092160 2024/01/12 20:42:40 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.100 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';
import { mons_init } from './monst-data.js';
export { mons_init } from './monst-data.js';

/* monster type with single name */

/* LVL() and SIZ() collect several fields to cut down on number of args
 * for MON().  Using more than 15 would fail to conform to the C Standard.
 * ATTK() and A() are to avoid braces and commas within args to MON().
 * NAM() and NAMS() are used for both reasons.
 */

/*
     * Array terminator, added to the end of the entries in monsters.h.
     *
     * mons[NUMMONS] used to be all zero except "" instead of Null for
     * the name field.  Then the index field was added and the terminator
     * uses NON_PM for that.  Now, a few monster flags also get set.
     */

/* in hack.h but we're using config.h */

export function monst_globals_init()
{
    C.memcpy(C.mons, mons_init, C.sizeof_mons);
    return;
}

export { c_sa_yes, c_sa_no } from './monst-data.js';

/* for 'onefile' processing where end of this file isn't necessarily the
   end of the source code seen by the compiler */

/*monst.c*/
