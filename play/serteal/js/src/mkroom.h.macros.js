/* NetHack 5.0	mkroom.h	$NHDT-Date: 1725653011 2024/09/06 20:03:31 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.33 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2016. */
/* NetHack may be freely redistributed.  See license for details. */




/* mkroom.h - types and structures for room and shop initialization */


    /* usually coordxy, but hx may be -1 */
    /* type of room (zoo, throne, etc...) */
    /* same as rtype, but not zeroed later */
    /* is the room lit ? */
    /* sp_lev: does the room need filling? */
    /* sp_lev: should the room connect to others? */
    /* door count */
    /* index for the first door of the room */
    /* number of subrooms */
    /* true if room is non-rectangular */

    /* Subrooms pointers */
    /* priest/shopkeeper/guard for this room */



    /* name of the shop type */
    /* simpler name for #overview; Null if same */
    /* this identifies the shop type */
    /* the shop type probability in % */
    /* object placement type */




        /* probability of an item type */
        /* item type: if >=0 a class, if < 0 a specific item */

    /* list of shopkeeper names for this type */


/* the normal rooms on the current level are described in svr.rooms[0..n] for
 * some n<MAXNROFROOMS
 * the vault, if any, is described by svr.rooms[n+1]
 * the next svr.rooms entry has hx -1 as a flag
 * there is at most one non-vault special room on a level
 */

/* values for rtype in the room definition structure */

    /* ordinary room */
    /* like OROOM, but never converted to special room */
    /* contains a throne */
    /* contains pools */
    /* detached room usually reached via teleport trap */
    /* contains killer bees and royal jelly */
    /* contains corpses, undead and graves */
    /* contains soldiers and their gear */
    /* floor covered with treasure and monsters */
    /* contains Oracle and peripherals */
    /* contains a shrine (altar attended by priest[ess]) */
    /* leprechaun hall (Tom Proudfoot) */
    /* cockatrice nest (Tom Proudfoot) */
    /* ants (Tom Proudfoot) */
    /* everything above this is a shop */
    /* specific shop defines for level compiler */








    /* health food store */






/* Special type for search_special() */










/* Values for needfill */














export function ROOM_INDEX(x) { return (ptr_diff((x), svr.rooms[0])); }
import { ptr_diff } from "../rt/struct.js";
import { svr } from "./decl.js";
