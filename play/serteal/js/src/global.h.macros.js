/* NetHack 5.0	global.h	$NHDT-Date: 1704225560 2024/01/02 19:59:20 $  $NHDT-Branch: keni-luabits2 $:$NHDT-Revision: 1.159 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */




/*
 * Files expected to exist in the playground directory (possibly inside
 * a dlb container file).
 */























/* padding amounts for files that have lines chosen by fseek to random spot,
   advancing to the next line, and using that line; makedefs forces shorter
   lines to be padded to these lengths; value of 0 will inhibit any padding,
   avoiding an increase in files' sizes, but resulting in biased selection;
   used by makedefs while building and by core's callers of get_rnd_text() */



/* Assorted definitions that may depend on selections in config.h. */

/*
 * for DUMB preprocessor and compiler, e.g., cpp and pcc supplied
 * with Microport SysV/AT, which have small symbol tables;
 * DUMB if needed is defined in CFLAGS
 */









/*
 * type xint8: small integers (typedef'd as signed,
 * in the range -127 - 127).
 */

/*
 * type coordxy: integers (typedef'd as signed,
 * in the range -32768 to 32767), mostly coordinates.
 * Note that in 2022, screen coordinates easily
 * surpass an upper limit of 127.
 */

/*
 * type xint16: integers (typedef'd as signed,
 * in the range -32768 to 32767), non-coordinates.
 */



/* Resolve conflict with Qt 5 and MinGW-w32 */
/* 0 or 1 */


/* 0 or 1 */



/* vision seen vectors: viz_array[][] and levl[][].seenv, which use different
   values from each other but are close enough in size to share a type;
   viz_array contains 8-bit bitmasks, lev->seenv is a 5-bit bitfield */
/* no need for uint8_t */

/* Type for third parameter of read(2) */












/*
 * type nhsym: loadable symbols go into this type
 */



/* SAS/C already shifts to stricmp */

export function strcmpi(a, b) { return strncmpi((a), (b), -1); }






/* #define SPECIALIZATION *//* do "specialized" version of new topology */









/* A limit for some NetHack int variables.  It need not, and for comparable
 * scoring should not, depend on the actual limit on integers for a
 * particular machine, although it is set to the minimum required maximum
 * signed integer for C (2^15 -1).
 */




/* define USING_ADDRESS_SANITIZER if ASAN is in use */














/*
 * Automatic inclusions for the subsidiary files.
 * Please don't change the order.  It does matter.
 */



















/* amiconf.h needs to be the last nested #include of config.h because
   'make depend' will turn it into a comment, hiding anything after it */




/* Displayable name of this port; don't redefine if defined in *conf.h */
































/* Check again in case something more specific has been defined above. */
























/* vms_exit() (sys/vms/vmsmisc.c) expects the non-VMS EXIT_xxx values below.
 * these definitions allow all systems to be treated uniformly, provided
 * main() routines do not terminate with return(), whose value is not
 * so massaged.
 */










































export function Strlen(s) { return Strlen_(s,_("Strlen"),0); }






/*
 *  Memory allocation.  Functions are declared here rather than in
 *  extern.h so that source files which use config.h instead of hack.h
 *  will see the declarations.
 *
 *  NetHack does not use malloc() [except to implement alloc() in alloc.c]
 *  or realloc() or calloc().  They return Null if memory runs out and
 *  nethack's code relies on alloc() to intercept that so that a zillion
 *  callers don't need to test for Null result.  alloc() never returns
 *  Null; if memory runs out, it calls panic() and does not return at all.
 */

/* dupstr() is unconditional in alloc.c but not used when MONITOR_HEAP
   is enabled; some utility programs link with alloc.{o,obj} and need it
   if nethack is built with MONITOR_HEAP enabled and they aren't; this
   declaration has been moved out of the '#else' below to avoid getting
   a complaint from -Wmissing-prototypes when building with MONITOR_HEAP */

/* same, but return strlen(string) in extra argument */



/*
 * MONITOR_HEAP is conditionally used for primitive memory leak debugging.
 * When enabled, NH_HEAPLOG (if defined in the environment) is used as the
 * name of a log file to create for capturing allocations and releases.
 * [The 'heaputil' program to analyze that file isn't included in releases.]
 *
 * See alloc.c.
 */

/* plain alloc() is not declared except in alloc.c */





/* this predates C99's __func__; that is trickier to use conditionally
   because it is not implemented as a preprocessor macro; MONITOR_HEAP
   wouldn't gain much benefit from it anyway so continue to live without it;
   if func's caller were accessible, that would be a very different issue */





/* declare alloc.c's alloc(); allocations made with it use ordinary free() */
/* alloc.c */



/* Used for consistency checks of various data files; declare it here so
   that utility programs which include config.h but not hack.h can see it. */

    /* actual version number */
    /* bitmask of config settings */
    /* # of monsters and objects */


/* This is used to store some build-info data that used
   to be present in makedefs-generated header file date.h */

















/*
 * Configurable internal parameters.
 *
 * Please be very careful if you are going to change one of these.  Any
 * changes in these parameters, unless properly done, can render the
 * executable inoperative.
 */

/* size of terminal screen is (at least) (ROWNO+3) by COLNO */












/* COLBUFSZ is the larger of BUFSZ and COLNO */










/* room for "name-role-race-gend-algn" plus 1 character playmode code */


















/*
 * Version 5.0.x has aspirations of portable file formats. We
 * make a distinction between MAIL functionality and MAIL_STRUCTURES
 * so that the underlying structures are consistent, whether MAIL is
 * defined or not.
 */


/* PANICTRACE: Always defined for NH_DEVEL_STATUS != NH_STATUS_RELEASED
   but only for supported platforms. */



/* see end.c */









/* The following are meaningless if PANICTRACE is not defined: */















/* Supply nethack_enter macro if not supplied by port */




/* Supply nhassert macro if not supplied by port */

export function nhassert(expression, __FILE__) { return void ((!!(expression)) || 
        (nhassert_failed(_("gc.command_count != 0"), _(__FILE__), 0), 0)); }


/* Macros for meta and ctrl modifiers:
 *   M and C return the meta/ctrl code for the given character;
 *     e.g., (C('c') is ctrl-c
 */




export function M(c) { return ((c) - 128); }




export function C(c) { return (0x1f & (c)); }


export function unmeta(c) { return (0x7f & (c)); }

/* Game log message type flags */



















/*
 * Lua sandbox
 */
/* Control block for setting up a Lua state with nhl_init(). */

    /* see below */
    /* approximate memory limit */
    /* instruction limit for state OR ... */
    /* ... instruction limit per nhl_pcall */


/* For efficiency, we only check every NHL_SB_STEPSIZE instructions. */




/* High level groups.  Use these flags. */
    /* Safe functions. */

    /* Access to Lua version information. */

    /* Debugging library - mostly unsafe. */


/* Low level groups.  If you need these, you probably need to define
 * a new high level group instead. */



























/* return codes */




/* NHL_pcall_handle action values */






/*
 * option setting restrictions
 */

    /* system config file option only */
    /* config file option only */
    /* may be set via extern program, not seen in game */
    /* may be set via extern program, displayed in game */
    /* may be set via extern program or set in the game */
    /* may be set in the game if wizmode */
    /* wizard-mode only, but not by fuzzer */
    /* placeholder for prefixed entries, never show it  */


/* these aren't the same as set_xxx */


    /* compiled-in default value of an option */
    /* sysconf setting of an option, overrides builtin */
    /* player's run-time config file setting, overrides syscf */
    /* player's environment NETHACKOPTIONS, overrides rc_file */
    /* program invocation command-line, overrides environ */
    /* 'O' command, interactively set so overrides all */



export function SET__IS_VALUE_VALID(s) { return (+((s < set_in_sysconf) || (s > set_wiznofuz))); }
import { set_in_sysconf } from "./global.h.js";
import { set_wiznofuz } from "./global.h.js";
import { _ } from "../rt/strings.js";
import { strncmpi } from "./hacklib.js";
import { nhassert_failed } from "./pline.js";
import { Strlen_ } from "./strutil.js";
