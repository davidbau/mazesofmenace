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

/*
 * Modified 12 April 1990 by Mark Adler for use on MSDOS systems with
 * Microsoft C and Turbo C.
 *
 * Modified 13 February 1991 by Greg Roelofs for use on VMS systems.  As
 * with the MS-DOS version, the setting of the file mode has been disabled.
 * Compile and link normally (but note that the shared-image link option
 * produces a binary only 6 blocks long, as opposed to the 137-block one
 * produced by an ordinary link).  To set up the VMS symbol to run the
 * program ("run uudecode filename" won't work), do:
 *              uudecode :== "$disk:[directory]uudecode.exe"
 * and don't forget the leading "$" or it still won't work.  The binaries
 * produced by this program are in VMS "stream-LF" format; this makes no
 * difference to VMS when running decoded executables, nor to VMS unzip,
 * but other programs such as zoo or arc may or may not require the file
 * to be "BILFed" (or "unBILFed" or whatever).  Also, unlike the other
 * flavors, VMS files don't get overwritten (a higher version is created).
 *
 * Modified 13 April 1991 by Gary Mussar to be forgiving of systems that
 * appear to be stripping trailing blanks.
 *
 * Modified 28 February 2002 for use on WIN32 systems with Microsoft C.
 *
 * Modified 08 July 2006 to cast strlen() result to int to suppress a
 * warning on platforms where size_t > sizeof(int).
 *
 * Modified 05 Jan 2024 to avoid K&R function declarations, marked KR_PROTO.
 *
 * Modified 09 Apr 2026 to change mode variable from (int) to (unsigned int)
 * to match prototype of sscanf %o.
 *
 * $NHDT-Date: 1775744389 2026/04/09 14:19:49 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.21 $
 */

// #ifndef lint
/* static char sccsid[] = "@(#)uudecode.c 5.5 (Berkeley) 7/6/88"; */
// #endif /* not lint */

// #ifdef __MSDOS__ /* For Turbo C */
// #define MSDOS 1
// #endif

// #ifdef _WIN32
// #undef MSDOS
// #undef __MSDOS__
// #ifndef WIN32
// #define WIN32
// #endif
// #endif

/*
 * uudecode [input]
 *
 * create the specified file, decoding as you go.
 * used with uuencode.
 */
// #include <stdio.h>

// #ifdef VMS
// #include <types.h>
// #include <stat.h>
// #else
// #if !defined(MSDOS) && !defined(WIN32)
// #include <pwd.h>
// #endif
// #include <sys/types.h> /* MSDOS, WIN32, or UNIX */
// #include <sys/stat.h>
// #include <string.h>
// #include <stdlib.h>
// #endif

/* #include "warnings.h" */
// #define DISABLE_WARNING_UNREACHABLE_CODE
// #define RESTORE_WARNINGS

// static void decode(FILE *, FILE *);
// static void outdec(char *, FILE *, int);

/* single-character decode */
// #define DEC(c) (((c) - ' ') & 077)


import { C } from '../ported/c-runtime.js';

export function main(argc, argv)
{
    let in_, out;
    const mode = C.uintLocal();
    const dest = C.charBuffer(128);
    const buf = C.charBuffer(80);

    /* optional input arg */
    if (argc > 1) {
        if ((in_ = C.fopen(C.pointerAt(argv + 8), "r")) == C.NULL) {
            C.perror(C.pointerAt(argv + 8));
            C.exit(1);
        }
        argv += 8;
        argc--;
    } else
        in_ = C.stdin;

    if (argc != 1) {
        C.printf("Usage: uudecode [infile]\n");
        C.exit(2);
    }

    /* search for header line */
    for (;;) {
        if (C.fgets(buf, 80, in_) == C.NULL) {
            C.fprintf(C.stderr, "No begin line\n");
            C.exit(3);
        }
        if (C.strncmp(buf, "begin ", 6) == 0)
            break;
    }
    C.sscanf(buf, "begin %o %s", mode, dest);

    /* handle ~user/file format */
    if (C.charAt(dest) == 126) {
        let sl;
        let user;
        const dnbuf = C.charBuffer(100);
// #ifdef KR_PROTO
//        struct passwd *getpwnam();
//        char *strchr(), *strcat(), *strcpy();
// #endif
        sl = C.strchr(dest, 47);
        if (sl == C.NULL) {
            C.fprintf(C.stderr, "Illegal ~user\n");
            C.exit(3);
        }
        C.storeChar(sl++, 0);
        user = C.getpwnam(dest + 1);
        if (user == C.NULL) {
            C.fprintf(C.stderr, "No such user as %s\n", dest);
            C.exit(4);
        }
        C.strcpy(dnbuf, C.pw_dir(user));
        C.strcat(dnbuf, "/");
        C.strcat(dnbuf, sl);
        C.strcpy(dest, dnbuf);
    }
/* !MSDOS && !VMS && !WIN32 && !__APPLE__  */
    C.storeChar(dest + 128 - 1, 0);

/* create output file */
// out = fopen(dest, "wb"); /* Binary file */
    out = C.fopen(dest, "w");
    if (out == C.NULL) {
        C.perror(dest);
        C.exit(4);
    }
    /* i.e., UNIX */
    C.chmod(dest, mode.value);

    C.callLocal(decode, in_, out);

    if (C.fgets(buf, 80, in_) == C.NULL || C.strcmp(buf, "end\n")) {
        C.fprintf(C.stderr, "No end line\n");
        C.exit(5);
    }
    C.exit(0);
    /*NOTREACHED*/
    return 0;
}

/*
 * copy from in to out, decoding as you go along.
 */
export function decode(in_, out)
{
    const buf = C.charBuffer(80);
    let bp;
    let n, i, expected;

    for (;;) {
        /* for each input line */
        if (C.fgets(buf, 80, in_) == C.NULL) {
            C.printf("Short file\n");
            C.exit(10);
        }
        n = ((C.charAt(buf) - 32) & 0o77);
        if ((n <= 0) || (C.charAt(buf) == 10))
            break;

        /* Calculate expected # of chars and pad if necessary */
        expected = (Math.trunc((n + 2) / 3)) << 2;
        for (i = C.int(C.strlen(buf)) - 1; i <= expected; i++)
            C.storeChar(buf + i, 32);

        bp = buf + 1;
        while (n > 0) {
            outdec(bp, out, n);
            bp += 4;
            n -= 3;
        }
    }
}

/*
 * output a group of 3 bytes (4 input characters).
 * the input chars are pointed to by p, they are to
 * be output to file f.  n is used to tell us not to
 * output all of them at the end of the file.
 */
export function outdec(p, f, n)
{
    let c1, c2, c3;

    c1 = ((C.charAt(p) - 32) & 0o77) << 2 | ((C.charAt(p + 1) - 32) & 0o77) >> 4;
    c2 = ((C.charAt(p + 1) - 32) & 0o77) << 4 | ((C.charAt(p + 2) - 32) & 0o77) >> 2;
    c3 = ((C.charAt(p + 2) - 32) & 0o77) << 6 | ((C.charAt(p + 3) - 32) & 0o77);
    if (n >= 1)
        C.putc(c1, f);
    if (n >= 2)
        C.putc(c2, f);
    if (n >= 3)
        C.putc(c3, f);
}

/*
 * Return the ptr in sp at which the character c appears;
 * NULL if not found
 */
// #ifndef NULL
// #define NULL 0
// #endif
export function index(sp, c)
// char *sp, c;  (original active K&R parameter declaration)
{
    c = C.char(c);
    do {
        if (C.charAt(sp) == c)
            return (sp);
    } while (C.charAt(sp++));
    return (C.NULL);
}
