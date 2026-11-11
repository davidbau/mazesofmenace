/* NetHack 5.0	panic.c	$NHDT-Date: 1596498262 2020/08/03 23:44:22 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.13 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2015. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 *      This code was adapted from the code in end.c to run in a standalone
 *      mode for the makedefs / drg code.
 */
import { C } from './scope.mjs';

/*VARARGS1*/
export function panic(str)
{
    C.VA_START(str);
    C.VA_INIT(str, 'char *');
    if (C.panicking++)
        C.abort(); /* avoid loops - this should never happen*/

    C.fputs(' ERROR:  ', C.stderr);
    C.Vfprintf(C.stderr, str, C.VA_ARGS);
    C.fflush(C.stderr);
    C.abort(); /* generate core dump */
    C.VA_END();
    /* UNREACHABLE_CODE */
    C.exit(C.EXIT_FAILURE); /* redundant */
}

// Original inactive ALLOCA_HACK source annotation; no body enabled or credited.
/*
 * In case bison-generated foo_yacc.c tries to use alloca(); if we don't
 * have it then just use malloc() instead.  This may not work on some
 * systems, but they should either use yacc or get a real alloca routine.
 */
/*panic.c*/
