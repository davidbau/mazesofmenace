/* NetHack 5.0	color.h	$NHDT-Date: 1682205020 2023/04/22 23:10:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.18 $ */
/* Copyright (c) Steve Linhart, Eric Raymond, 1989. */
/* NetHack may be freely redistributed.  See license for details. */




/*
 * The color scheme used is tailored for an IBM PC.  It consists of the
 * standard 8 colors, followed by their bright counterparts.  There are
 * exceptions, these are listed below.	Bright black doesn't mean very
 * much, so it is used as the "default" foreground color of the screen.
 */


















/* The "half-way" point for tty-based color systems.  This is used in */
/* the tty color setup code.  (IMHO, it should be removed - dean).    */


/* color aliases used in monsters.h and display.c  */




/* these can be configured */

















export function COLORVAL(x) { return ((x) & 0xFFFFFF); }



















/*color.h*/
