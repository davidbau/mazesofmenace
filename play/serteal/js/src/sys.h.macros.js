/* NetHack 5.0	sys.h	$NHDT-Date: 1693083207 2023/08/26 20:53:27 $  $NHDT-Branch: keni-crashweb2 $:$NHDT-Revision: 1.41 $ */
/* Copyright (c) Kenneth Lorber, Kensington, Maryland, 2008. */
/* NetHack may be freely redistributed.  See license for details. */





    /* local support contact */
    /* how to run recover - may be overridden by win port */
    /* space-separated list of usernames */
    /* formatted version of wizards; null or "one"
                               or "one or two" or "one, two, or three", &c */
    /* like wizards, but for access to explore mode */
    /* like wizards, for ! command (-DSHELL); also ^Z */
    /* usernames that prompt for user name */
    /* files to show debugplines in. '*' is all. */


    /* where the dump file is saved */

    /*  1: debugfiles comes from getenv("DEBUGFILES")
                       *     so sysconf's DEBUGFILES shouldn't override it;
                       *  0: getenv() hasn't been attempted yet;
                       * -1: getenv() didn't find a value for DEBUGFILES.
                       */


    /* restoring savefile checks UID? */
    /* use plname for checking wizards/explorers/shellers */

    /* LL_foo events to livelog */

    /* record file */






    /* panic options */






    /* save and bones format */
    /* primary and onetime conversion */
    /* primary and onetime conversion */

    /* enable accessibility options */


    /* nethack config for a portable device */


    /* nethack's interactive help menu */
    /* 0: include 'command-line usage' entry in help menu;
                         * 1: suppress it */




export function SYSOPT_SEDUCE() { return sysopt.seduce; }
import { sysopt } from "./sys.js";
