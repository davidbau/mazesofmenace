/* NetHack 5.0	alloc.c	$NHDT-Date: 1737281026 2025/01/19 02:03:46 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.38 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* JavaScript translation of alloc.c for the active game configuration.
 * All six active function boundaries remain unchanged. ForceAlignedLength
 * expands inline, with >>> 0 preserving C unsigned-int truncation, including
 * overflow to zero. C supplies libc allocation, string and formatting calls;
 * allocation can grow Wasm memory, so bindings must refresh their heap views.
 * The pointer-format buffer pool and its index are per game. Lua integers and
 * unsigned-long-long inputs use BigInt for exact range checks.
 * MONITOR_HEAP and the #if 0 dupstr_n branch are inactive in this build and
 * remain unported C below, commented out explicitly. Only the six active
 * functions are implemented; this does not claim heap-monitoring support.
 */

// #define ALLOC_C
/* comment line for pre-compiled headers */
/* since this file is also used in auxiliary programs, don't include all the
   function declarations for all of nethack */
// #define EXTERN_H
/* comment line for pre-compiled headers */

// #include "config.h"
// #ifndef LUA_INTEGER
// #include "nhlua.h"
// #endif


/*#define FITSint(x) FITSint_(x, __func__, __LINE__)*/
// extern int FITSint_(LUA_INTEGER, const char *, int) NONNULLARG2;
/*#define FITSuint(x) FITSuint_(x, __func__, __LINE__)*/
// extern unsigned FITSuint_(unsigned long long, const char *, int) NONNULLARG2;

// char *fmt_ptr(const genericptr) NONNULL;

// #ifdef MONITOR_HEAP
// #undef alloc
// #undef re_alloc
// #undef free
// extern void free(genericptr_t);
// staticfn void heapmon_init(void);

// static FILE *heaplog = 0;
// static boolean tried_heaplog = FALSE;
// #endif

/*
 * For historical reasons, nethack's alloc() returns 'long *' rather
 * than 'void *' or 'char *'.
 *
 * Some static analysis complains if it can't deduce that the number
 * of bytes being allocated is a multiple of 'sizeof (long)'.  It
 * recognizes that the following manipulation overcomes that via
 * rounding the requested length up to the next long.  NetHack doesn't
 * make a lot of tiny allocations, so this shouldn't waste much memory
 * regardless of whether malloc() does something similar.  NetHack
 * isn't expected to call alloc(0), but if that happens treat it as
 * alloc(sizeof (long)) instead.
 */
// #define ForceAlignedLength(LTH) \
//     do {                                                        \
//         if (!(LTH) || (LTH) % sizeof (long) != 0)               \
//             (LTH) += sizeof (long) - (LTH) % sizeof (long);     \
//     } while (0)

// #ifndef MONITOR_HEAP
// long *alloc(unsigned int) NONNULL;
// long *re_alloc(long *, unsigned int) NONNULL;
// #else
    /* for #if MONITOR_HEAP, alloc() might return Null but only nhalloc()
       should be calling it; nhalloc() never returns Null */
// long *alloc(unsigned int);
// long *re_alloc(long *, unsigned int);
// long *nhalloc(unsigned int, const char *, int) NONNULL;
// long *nhrealloc(long *, unsigned int, const char *, int) NONNULL;
// #endif
// ATTRNORETURN extern void panic(const char *, ...) PRINTF_F(1, 2) NORETURN;

export function alloc(lth)
{
    let ptr;

    do {
        if (!lth || lth % C.LONG_SIZE != 0)
            lth = (lth + C.LONG_SIZE - lth % C.LONG_SIZE) >>> 0;
    } while (0);
    ptr = C.malloc(lth);
    if (!ptr)
        C.panicAlloc(lth);
    /* for #if MONITOR_HEAP, failure is handled in nhalloc() */
    return ptr;
}

/* realloc() call that might get substituted by nhrealloc(p,n,file,line) */
export function re_alloc(oldptr, newlth)
{
    let newptr;

    do {
        if (!newlth || newlth % C.LONG_SIZE != 0)
            newlth = (newlth + C.LONG_SIZE - newlth % C.LONG_SIZE) >>> 0;
    } while (0);
    newptr = C.realloc(oldptr, newlth);
    /* "extend to":  assume it won't ever fail if asked to shrink */
    if (newlth && !newptr)
        C.panicRealloc(newlth);
    /* for #if MONITOR_HEAP, failure is handled in nhrealloc() */
    return newptr;
}

// #ifdef HAS_PTR_FMT
// #define PTR_FMT "%p"
// #define PTR_TYP genericptr_t
// #else
// #define PTR_FMT "%06lx"
// #define PTR_TYP unsigned long
// #endif

/* A small pool of static formatting buffers.
 * PTRBUFSIZ:  We assume that pointers will be formatted as integers in
 * hexadecimal, requiring at least 16+1 characters for each buffer to handle
 * 64-bit systems, but the standard doesn't mandate that encoding and an
 * implementation could do something different for %p, so we make some
 * extra room.
 * PTRBUFCNT:  Number of formatted values which can be in use at the same
 * time.  To have more, callers need to make copies of them as they go.
 */
// #define PTRBUFCNT 4
// #define PTRBUFSIZ 32
// static char ptrbuf[PTRBUFCNT][PTRBUFSIZ];
// static int ptrbufidx = 0;

/* format a pointer for display purposes; returns a static buffer */
export function fmt_ptr(ptr)
{
    let buf;

    buf = C.ptrbuf[C.allocState.ptrbufidx];
    if (++C.allocState.ptrbufidx >= C.PTRBUFCNT)
        C.allocState.ptrbufidx = 0;

    C.Sprintf(buf, C.PTR_FMT, ptr);
    return buf;
}

// #ifdef MONITOR_HEAP

/* If ${NH_HEAPLOG} is defined and we can create a file by that name,
   then we'll log the allocation and release information to that file. */
// staticfn void
// heapmon_init(void)
// {
//     char *logname = getenv("NH_HEAPLOG");

//     if (logname && *logname)
//         heaplog = fopen(logname, "w");
//     tried_heaplog = TRUE;
// }

// long *
// nhalloc(unsigned int lth, const char *file, int line)
// {
//     long *ptr = alloc(lth);

//     if (!tried_heaplog)
//         heapmon_init();
//     if (heaplog)
//         (void) fprintf(heaplog, "+%5u %s %4d %s\n", lth,
//                        fmt_ptr((genericptr_t) ptr), line, file);
    /* potential panic in alloc() was deferred til here */
//     if (!ptr)
//         panic("Cannot get %u bytes, line %d of %s", lth, line, file);

//     return ptr;
// }

/* re_alloc() with heap logging; we lack access to the old alloc size  */
// long *
// nhrealloc(
//     long *oldptr,
//     unsigned int newlth,
//     const char *file,
//     int line)
// {
//     long *newptr = re_alloc(oldptr, newlth);

//     if (!tried_heaplog)
//         heapmon_init();
//     if (heaplog) {
//         char op = '*';
/* assume realloc() will change size of previous
                        * allocation rather than make a new one */

//         if (newptr != oldptr) {
            /* if oldptr wasn't Null, realloc() freed it */
//             if (oldptr)
//                 (void) fprintf(heaplog, "%c%5s %s %4d %s\n", '<', "",
//                                fmt_ptr((genericptr_t) oldptr), line, file);
//             op = '>';
/* new allocation rather than size-change of old one */
//         }
//         (void) fprintf(heaplog, "%c%5u %s %4d %s\n", op, newlth,
//                            fmt_ptr((genericptr_t) newptr), line, file);
//     }
    /* potential panic in re_alloc() was deferred til here;
       "extend to":  assume it won't ever fail if asked to shrink;
       even if that assumption happens to be wrong, we lack access to
       the old size so can't use alternate phrasing for that case */
//     if (newlth && !newptr)
//         panic("Cannot extend to %u bytes, line %d of %s", newlth, line, file);

//     return newptr;
// }

// void
// nhfree(genericptr_t ptr, const char *file, int line)
// {
//     if (!tried_heaplog)
//         heapmon_init();
//     if (heaplog)
//         (void) fprintf(heaplog, "-      %s %4d %s\n",
//                        fmt_ptr((genericptr_t) ptr), line, file);

//     free(ptr);
// }

/* strdup() which uses our alloc() rather than libc's malloc(),
   with caller tracking */
// char *
// nhdupstr(const char *string, const char *file, int line)
// {
    /* we've got some info about the caller, so use it instead of __func__ */
//     unsigned len = FITSuint_(strlen(string), file, line);

//     if (FITSuint_(len + 1, file, line) < len)
//         panic("nhdupstr: string length overflow, line %d of %s",
//               line, file);

//     return strcpy((char *) nhalloc(len + 1, file, line), string);
// }
// #undef dupstr

// #endif
/* MONITOR_HEAP */

/* strdup() which uses our alloc() rather than libc's malloc();
   not used when MONITOR_HEAP is enabled, but included unconditionally
   in case utility programs get built using a different setting for that */
export function dupstr(string)
{
    let len = C.strlen(string);

    /* make sure len+1 doesn't overflow plain unsigned (for alloc()) */
    if (len > 0xFFFFFFFE)
        C.panicDupstr();

    return C.strcpy(alloc((len + 1) >>> 0), string);
}

// #if 0
/* suppress this; if included, it will need a MONITOR_HEAP edition */

/* similar for reasonable size strings, but return length of input as well */
// char *
// dupstr_n(const char *string, unsigned int *lenout)
// {
//     size_t len = strlen(string);

//     if (len >= LARGEST_INT)
//         panic("dupstr_n: string too long");
//     *lenout = (unsigned int) len;
//     return strcpy((char *) alloc(len + 1), string);
// }
// #endif

/* cast to int or panic on overflow; use via macro */
export function FITSint_(i, file, line)
{
    let iret = Number(BigInt.asIntN(32, i));

    if (BigInt(iret) != i)
        C.panicOverflow(file, line);
    return iret;
}

export function FITSuint_(ull, file, line)
{
    let uret = Number(BigInt.asUintN(32, ull));

    if (BigInt(uret) != ull)
        C.panicOverflow(file, line);
    return uret;
}

/*alloc.c*/
