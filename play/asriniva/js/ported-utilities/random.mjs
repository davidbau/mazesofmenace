/*
 * Copyright (c) 1983 Regents of the University of California.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms are permitted
 * provided that the above copyright notice and this paragraph are
 * duplicated in all such forms and that any documentation,
 * advertising materials, and other materials related to such
 * distribution and use acknowledge that the software was developed
 * by the University of California, Berkeley.  The name of the
 * University may not be used to endorse or promote products derived
 * from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

/* Several minor changes were made for the NetHack distribution to satisfy
 * non-BSD compilers (by definition BSD compilers do not need to compile
 * this file for NetHack).  These changes consisted of:
 *      - changing the sccsid conditions to nested ifdefs from defined()s
 *      to accommodate stupid preprocessors
 *      - giving srandom() type void instead of allowing it to default to int
 *      - making the first return in initstate() return a value consistent
 *      with its type (instead of no value)
 *      - ANSI function prototyping in extern.h - therefore include hack.h
 *      instead of stdio.h and remove separate declaration of random() from
 *      the beginning of function srandom
 *      - moving sccsid after hack.h to allow precompiled headers, which
 *      means the defined()s would be ok again...
 *      - change fprintf(stderr, "x(%d)y\n", z) to impossible("x(%d)y", z)
 *      - remove useless variable `j' from srandom()
 *      - cast result of pointer subtraction to long since ptrdiff_t could
 *      be bigger than that and trigger warnings when assigning to long
 *
 * $NHDT-Date: 1432512787 2015/05/25 00:13:07 $  $NHDT-Branch: master $:$NHDT-Revision: 1.5 $
 */

import {C,withCEnvironment} from './random-scope.mjs';
export {withCEnvironment};

/* LIBC_SCCS and not lint */

/*
 * random.c:
 * An improved random number generation package.  In addition to the standard
 * rand()/srand() like interface, this package also has a special state info
 * interface.  The initstate() routine is called with a seed, an array of
 * bytes, and a count of how many bytes are being passed in; this array is
 * then
 * initialized to contain information for random number generation with that
 * much state information.  Good sizes for the amount of state information are
 * 32, 64, 128, and 256 bytes.  The state can be switched by calling the
 * setstate() routine with the same array as was initialized with
 * initstate().
 * By default, the package runs with 128 bytes of state information and
 * generates far better random numbers than a linear congruential generator.
 * If the amount of state information is less than 32 bytes, a simple linear
 * congruential R.N.G. is used.
 * Internally, the state information is treated as an array of longs; the
 * zeroeth element of the array is the type of R.N.G. being used (small
 * integer); the remainder of the array is the state information for the
 * R.N.G.  Thus, 32 bytes of state information will give 7 longs worth of
 * state information, which will allow a degree seven polynomial.  (Note: the
 * zeroeth word of state information also has some other information stored
 * in it -- see setstate() for details).
 * The random number generation technique is a linear feedback shift register
 * approach, employing trinomials (since there are fewer terms to sum up that
 * way).  In this approach, the least significant bit of all the numbers in
 * the state table will act as a linear feedback shift register, and will have
 * period 2^deg - 1 (where deg is the degree of the polynomial being used,
 * assuming that the polynomial is irreducible and primitive).  The higher
 * order bits will have longer periods, since their values are also influenced
 * by pseudo-random carries out of the lower bits.  The total period of the
 * generator is approximately deg*(2**deg - 1); thus doubling the amount of
 * state information has a vast influence on the period of the generator.
 * Note: the deg*(2**deg - 1) is an approximation only good for large deg,
 * when the period of the shift register is the dominant factor.  With deg
 * equal to seven, the period is actually much longer than the 7*(2**7 - 1)
 * predicted by this formula.
 */

/*
 * For each of the currently supported random number generators, we have a
 * break value on the amount of state information (you need at least this
 * many bytes of state info to support this random number generator), a degree
 * for the polynomial (actually a trinomial) that the R.N.G. is based on, and
 * the separation between the two lower order coefficients of the trinomial.
 */

/* linear congruential */

/* x**7 + x**3 + 1 */

/* x**15 + x + 1 */

/* x**31 + x**3 + 1 */

/* x**63 + x + 1 */

/*
 * Array versions of the above information to make code run faster -- relies
 * on fact that TYPE_i == i.
 */

/* max number of types above */

/*
 * Initially, everything is set up as if from :
 *            initstate( 1, &randtbl, 128 );
 * Note that this initialization takes advantage of the fact that srandom()
 * advances the front and rear pointers 10*rand_deg times, and hence the
 * rear pointer which starts at 0 will also end up at zero; thus the zeroeth
 * element of the state information, which contains info about the current
 * position of the rear pointer is just
 *      MAX_TYPES*(rptr - state) + TYPE_3 == TYPE_3.
 */

/*
 * fptr and rptr are two pointers into the state info, a front and a rear
 * pointer.  These two pointers are always rand_sep places aparts, as they
 *cycle
 * cyclically through the state information.  (Yes, this does mean we could
 *get
 * away with just one pointer, but the code for random() is more efficient
 *this
 * way).  The pointers are left positioned as they would be from the call
 *                      initstate( 1, randtbl, 128 )
 * (The position of the rear pointer, rptr, is really 0 (as explained above
 * in the initialization of randtbl) because the state table pointer is set
 * to point to randtbl[1] (as explained below).
 */

/*
 * The following things are the pointer to the state information table,
 * the type of the current generator, the degree of the current polynomial
 * being used, and the separation between the two pointers.
 * Note that for efficiency of random(), we remember the first location of
 * the state information, not the zeroeth.  Hence it is valid to access
 * state[-1], which is used to store the type of the R.N.G.
 * Also, we remember the last location, since this is more efficient than
 * indexing every time to find the address of the last element to see if
 * the front and rear pointers have wrapped.
 */

/*
 * srandom:
 * Initialize the random number generator based on the given seed.  If the
 * type is the trivial no-state-information type, just remember the seed.
 * Otherwise, initializes state[] based on the given "seed" via a linear
 * congruential generator.  Then, the pointers are set to known locations
 * that are exactly rand_sep places apart.  Lastly, it cycles the state
 * information a given number of times to get rid of any initial dependencies
 * introduced by the L.C.R.N.G.
 * Note that the initialization of randtbl[] for default usage relies on
 * values produced by this routine.
 */

export function srandom(x)
{
    let i;
    x = C.uint(x);

    if (C.rand_type == C.TYPE_0) {
        C.state[0] = C.long(x);
    } else {
        C.state[0] = C.long(x);
        for (i = 1; i < C.rand_deg; i++) {
            C.state[i] = 1103515245n * C.state[i - 1] + 12345n;
        }
        C.fptr = C.at(C.state, C.rand_sep);
        C.rptr = C.at(C.state, 0);
        for (i = 0; i < 10 * C.rand_deg; i++)
            random();
    }
}

/*
 * initstate:
 * Initialize the state information in the given array of n bytes for
 * future random number generation.  Based on the number of bytes we
 * are given, and the break values for the different R.N.G.'s, we choose
 * the best (largest) one we can and set things up for it.  srandom() is
 * then called to initialize the state information.
 * Note that on return from srandom(), we set state[-1] to be the type
 * multiplexed with the current value of the rear pointer; this is so
 * successive calls to initstate() won't lose this information and will
 * be able to restart with setstate().
 * Note: the first thing we do is save the current state, if any, just like
 * setstate() so that it doesn't matter when initstate is called.
 * Returns a pointer to the old state.
 */

export function initstate(seed, arg_state, n)

/* seed for RNG */
/* pointer to state array */
/* # bytes of state info */
{
    let ostate = C.at(C.state, -1);
    seed = C.uint(seed);
    n = C.int(n);

    if (C.rand_type == C.TYPE_0)
        C.state[-1] = C.rand_type;
    else
        C.state[-1] = C.long(C.MAX_TYPES * C.diff(C.rptr, C.state) + C.rand_type);
    if (n < C.BREAK_1) {
        if (n < C.BREAK_0) {
            C.impossible("initstate: not enough state (%d bytes) with which to do jack; ignored.",
                       n);
            return 0;
        }
        C.rand_type = C.TYPE_0;
        C.rand_deg = C.DEG_0;
        C.rand_sep = C.SEP_0;
    } else {
        if (n < C.BREAK_2) {
            C.rand_type = C.TYPE_1;
            C.rand_deg = C.DEG_1;
            C.rand_sep = C.SEP_1;
        } else {
            if (n < C.BREAK_3) {
                C.rand_type = C.TYPE_2;
                C.rand_deg = C.DEG_2;
                C.rand_sep = C.SEP_2;
            } else {
                if (n < C.BREAK_4) {
                    C.rand_type = C.TYPE_3;
                    C.rand_deg = C.DEG_3;
                    C.rand_sep = C.SEP_3;
                } else {
                    C.rand_type = C.TYPE_4;
                    C.rand_deg = C.DEG_4;
                    C.rand_sep = C.SEP_4;
                }
            }
        }
    }
    C.state = C.at(C.longs(arg_state), 1); /* first location */
    C.end_ptr = C.at(C.state, C.rand_deg);         /* must set end_ptr before srandom */
    srandom(seed);
    if (C.rand_type == C.TYPE_0)
        C.state[-1] = C.rand_type;
    else
        C.state[-1] = C.long(C.MAX_TYPES * C.diff(C.rptr, C.state) + C.rand_type);
    return (ostate);
}

/*
 * setstate:
 * Restore the state from the given state array.
 * Note: it is important that we also remember the locations of the pointers
 * in the current state information, and restore the locations of the pointers
 * from the old state information.  This is done by multiplexing the pointer
 * location into the zeroeth word of the state information.
 * Note that due to the order in which things are done, it is OK to call
 * setstate() with the same state as the current state.
 * Returns a pointer to the old state information.
 */

export function setstate(arg_state)
{
    let new_state = C.longs(arg_state);
    let type = C.int(new_state[0] % C.long(C.MAX_TYPES));
    let rear = C.int(new_state[0] / C.long(C.MAX_TYPES));
    let ostate = C.at(C.state, -1);

    if (C.rand_type == C.TYPE_0)
        C.state[-1] = C.rand_type;
    else
        C.state[-1] = C.long(C.MAX_TYPES * C.diff(C.rptr, C.state) + C.rand_type);
    switch (type) {
    case C.TYPE_0:
    case C.TYPE_1:
    case C.TYPE_2:
    case C.TYPE_3:
    case C.TYPE_4:
        C.rand_type = type;
        C.rand_deg = C.degrees[type];
        C.rand_sep = C.seps[type];
        break;

    default:
        C.impossible("setstate: state info has been munged (%d); not changed.",
                   type);
        break;
    }
    C.state = C.at(new_state, 1);
    if (C.rand_type != C.TYPE_0) {
        C.rptr = C.at(C.state, rear);
        C.fptr = C.at(C.state, (rear + C.rand_sep) % C.rand_deg);
    }
    C.end_ptr = C.at(C.state, C.rand_deg); /* set end_ptr too */
    return (ostate);
}

/*
 * random:
 * If we are using the trivial TYPE_0 R.N.G., just do the old linear
 * congruential bit.  Otherwise, we do our fancy trinomial stuff, which is the
 * same in all the other cases due to all the global variables that have been
 * set up.  The basic operation is to add the number at the rear pointer into
 * the one at the front pointer.  Then both pointers are advanced to the next
 * location cyclically in the table.  The value returned is the sum generated,
 * reduced to 31 bits by throwing away the "least random" low bit.
 * Note: the code takes advantage of the fact that both the front and
 * rear pointers can't wrap on the same call by not testing the rear
 * pointer if the front one has wrapped.
 * Returns a 31-bit random number.
 */

export function random()
{
    let i;

    if (C.rand_type == C.TYPE_0) {
        i = C.state[0] = (C.state[0] * 1103515245n + 12345n) & 0x7fffffffn;
    } else {
        C.fptr[0] += C.rptr[0];
        i = (C.fptr[0] >> 1n) & 0x7fffffffn; /* chucking least random bit */
        if ((C.fptr = C.at(C.fptr, 1)) >= C.end_ptr) {
            C.fptr = C.state;
            (C.rptr = C.at(C.rptr, 1));
        } else {
            if ((C.rptr = C.at(C.rptr, 1)) >= C.end_ptr)
                C.rptr = C.state;
        }
    }
    return (i);
}
/* else defined(USE_ISAAC64) && !defined(RANDOM) */
