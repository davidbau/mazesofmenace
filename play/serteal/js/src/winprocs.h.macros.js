/* NetHack 5.0	winprocs.h	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.83 $ */
/* Copyright (c) David Cohrs, 1992                                */
/* NetHack may be freely redistributed.  See license for details. */


















              // XXX do we need this?  should chainin/out get an id? TBD


/* NB: this MUST match chain_procs below */

    /* Names should start with [a-z].  Names must
                           * not start with '-'.  Names starting with
                           * '+' are reserved for processors. */

    /* window port capability options supported */
    /* additional window port capability options */










































































/*
 * If you wish to only support one window system and not use procedure
 * pointers, add the appropriate #ifdef below.
 * XXX which is what?
 */

export function init_nhwindows() { return (windowprocs.win_init_nhwindows); }
export function player_selection() { return (windowprocs.win_player_selection); }
export function askname() { return (windowprocs.win_askname); }
export function get_nh_event() { return (windowprocs.win_get_nh_event); }
export function exit_nhwindows() { return (windowprocs.win_exit_nhwindows); }
export function suspend_nhwindows() { return (windowprocs.win_suspend_nhwindows); }
export function resume_nhwindows() { return (windowprocs.win_resume_nhwindows); }
export function create_nhwindow() { return (windowprocs.win_create_nhwindow); }
export function clear_nhwindow() { return (windowprocs.win_clear_nhwindow); }
export function display_nhwindow() { return (windowprocs.win_display_nhwindow); }
export function destroy_nhwindow() { return (windowprocs.win_destroy_nhwindow); }
export function curs() { return (windowprocs.win_curs); }
export function putstr() { return (windowprocs.win_putstr); }
export function putmixed() { return (windowprocs.win_putmixed); }
export function display_file() { return (windowprocs.win_display_file); }
export function start_menu() { return (windowprocs.win_start_menu); }
export function end_menu() { return (windowprocs.win_end_menu); }
/* 5.0: There are real add_menu() and select_menu in the core now.
 *      add_menu does some common activities, such as menu_colors.
 *      select_menu does some before and after activities.
 *      add_menu() and select_menu() are in windows.c
 */
/* #define add_menu (*windowprocs.win_add_menu) */
/* #define select_menu (*windowprocs.win_select_menu) */
export function message_menu() { return (windowprocs.win_message_menu); }

export function mark_synch() { return (windowprocs.win_mark_synch); }
export function wait_synch() { return (windowprocs.win_wait_synch); }

export function cliparound() { return (windowprocs.win_cliparound); }




export function print_glyph() { return (windowprocs.win_print_glyph); }
export function raw_print() { return (windowprocs.win_raw_print); }
export function raw_print_bold() { return (windowprocs.win_raw_print_bold); }
export function nhgetch() { return (windowprocs.win_nhgetch); }
export function nh_poskey() { return (windowprocs.win_nh_poskey); }
export function nhbell() { return (windowprocs.win_nhbell); }
export function nh_doprev_message() { return (windowprocs.win_doprev_message); }
/* 5.0: There is a real getlin() in the core now, which does
 *      some before and after activities.
 *      [alternative fix for menu search via ':'.]
 *      getlin() is in windows.c
 */
/* #define getlin (*windowprocs.win_getlin) */
export function get_ext_cmd() { return (windowprocs.win_get_ext_cmd); }
export function number_pad() { return (windowprocs.win_number_pad); }
export function nh_delay_output() { return (windowprocs.win_delay_output); }









/* 3.4.2: There is a real yn_function() in the core now, which does
 *        some buffer length validation on the parameters prior to
 *        invoking the window port routine. yn_function() is in cmd.c
 */
/* #define yn_function (*windowprocs.win_yn_function) */

export function outrip() { return (windowprocs.win_outrip); }
export function preference_update() { return (windowprocs.win_preference_update); }
export function getmsghistory() { return (windowprocs.win_getmsghistory); }
export function putmsghistory() { return (windowprocs.win_putmsghistory); }
/* there is a status_initialize() in botl.c,
 * which calls win_status_init() directly; same with status_finish.
 */
export function status_enablefield() { return (windowprocs.win_status_enablefield); }
export function status_update() { return (windowprocs.win_status_update); }
export function ctrl_nhwindow() { return (windowprocs.win_ctrl_nhwindow); }

/*
 *
 */



/*
 * WINCAP
 * Window port preference capability bits.
 * Some day this might be better in its own wincap.h file.
 */
/* clang-format off */




































                                     /* no free bits */

















/* pline() can overload the display attributes argument passed to putstr()
   with one or more flags and at most one of bold/blink/inverse/&c */







                                   /* 13 free bits */


                                   /* 12 free bits */






/* player_selection */



/* map_mode settings - deprecated */


















/* Macro for the currently active Window Port whose function
   pointers have been loaded */

/* 5.0 The string comparison version isn't used anymore */






/* role selection by player_selection(); this ought to be in the core... */






export function RS_menu_arg(x) { return (ROLE_RANDOM - ((x) + 1)); }

/* Choose_windows() may be called multiple times; these constants tell the
 * init function whether the window system is coming or going. */




/* Setup phases for window chain elements.
        void *  rv = X_procs_chain(int, int, void *, void *, void *);
                Xprivate*          ALLOC n      0       0       0
                -                  INIT  n   self    next    nextdata
   where:
        Xprivate* is anything window chain entry type X wants back
        n is the link count (starting with 1)
        self is the Xprivate* returned earlier
        next is struct winprocs * or struct chainprocs * for the next link
        nextdata is the Xprivate* for the next link in the chain
*/



/* clang-format on */



/* Expose log file for additional debugging. */


    /* Names should start with [a-z].  Names must
                           * not start with '-'.  Names starting with
                           * '+' are reserved for processors. */

    /* window port capability options supported */
    /* additional window port capability options */
import { ROLE_RANDOM } from "./you.h.js";
import { windowprocs } from "./windows.js";
