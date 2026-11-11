/* NetHack 5.0	integer.h	$NHDT-Date: 1720397754 2024/07/08 00:15:54 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.13 $ */
/*      Copyright (c) 2016 by Michael Allison          */
/* NetHack may be freely redistributed.  See license for details. */

/* integer.h -- provide sized integer types
 *
 * We try to sort out a way to provide sized integer types
 * in here. The strong preference is to try to let a
 * compiler-supplied header file set up the types.
 *
 * If your compiler is C99 conforming and sets a value of
 * __STDC_VERSION__ >= 199901L, then <stdint.h> is supposed
 * to be available for inclusion.
 *
 * If your compiler doesn't set __STDC_VERSION__ to indicate
 * full conformance to C99, but does actually supply a suitable
 * <stdint.h>, you can pass a compiler flag -DHAS_STDINT_H
 * during build to cause the inclusion of <stdint.h> anyway.
 *
 * If <stdint.h> doesn't get included, then the code in the
 * STDINT_WORKAROUND section of code is not skipped and will
 * be used to set up the types.
 *
 * We acknowledge that some ongoing maintenance may be needed
 * over time if people send us code updates for making the
 * determination of whether <stdint.h> is available, or
 * require adjustments to the base type used for some
 * compiler/platform combinations.
 *
 */




/* DEC C (aka Compaq C for a while, HP C these days) for VMS is
   classified as a freestanding implementation rather than a hosted one
   and even though it claims to be C99, it does not provide <stdint.h>. */






/* The compiler claims to conform to C99. Use stdint.h */



/* The compiler claims to conform to C99. Use inttypes.h */


















/*
 * STDINT_WORKAROUND section begins here
 */






/* Open Watcom providing a 16 bit build for MS-DOS or OS/2 */
/* int is 16 bits; use long for 32 bits */



/* Otherwise, assume either a 32- or 64-bit compiler */
/* long may be 64 bits; use int for 32 bits */




/* The only place where nethack cares about 64-bit integers is in the
   Isaac64 random number generator.  If your environment can't support
   64-bit integers, you should comment out USE_ISAAC64 in config.h so
   that the previous RNG gets used instead.  Then this file will be
   inhibited and it won't matter what the int64_t and uint64_t lines are. */










/* Provide int8, uint8, int16, uint16, int32, uint32, int64 and uint64 */









/* Also provide ushort, uint, ulong */







/* for non-negative L, calculate L * 10 + D, avoiding signed overflow;
   yields -1 if overflow would have happened;
   assumes compiler will optimize the constants */
export function AppendLongDigit(L, D) { return (((L) < Math.trunc(LLONG_MAX / 10)                                      
      || ((L) == Math.trunc(LLONG_MAX / 10) && (D) <= LLONG_MAX % 10))      
     ? (L) * 10 + (D)                                          
     : -1); }


/* add a and b, return max long value if overflow would have occurred;
   assumes that both a and b are non-negative; caller should apply
   cast(s) to (long) in the arguments if any are needed */
export function nowrap_add(a, b) { return ((a) <= (LLONG_MAX - (b)) ? ((a) + (b)) : LLONG_MAX); }
import { LLONG_MAX } from "../rt/libc.js";
