/* NetHack 5.0	tcap.h	$NHDT-Date: 1596498562 2020/08/03 23:49:22 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.12 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1989. */
/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */
/* NetHack may be freely redistributed.  See license for details. */

/* not named termcap.h because it may conflict with a system header */








/* might display need graphics code? */







/* also declared in decl.h; defined in decl.c */
    /* graphics start and end (tty font swapping) */
    /* lines and columns */







/* defined and set up in termcap.c */




/* some curses.h declare CM etc. */
export function nh_CM() { return tc_lcl_data.tc_CM; }
export function nh_ND() { return tc_lcl_data.tc_ND; }
export function nh_CD() { return tc_lcl_data.tc_CD; }
export function nh_HI() { return tc_lcl_data.tc_HI; }
export function nh_HE() { return tc_lcl_data.tc_HE; }
export function nh_US() { return tc_lcl_data.tc_US; }
export function nh_UE() { return tc_lcl_data.tc_UE; }
export function ul_hack() { return tc_lcl_data.tc_ul_hack; }

/* set up in termcap.c */
import { tc_lcl_data } from "../win/tty/termcap.js";
