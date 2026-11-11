/* NetHack 5.0	engrave.h	$NHDT-Date: 1596498535 2020/08/03 23:48:55 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.10 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */
/* NetHack may be freely redistributed.  See license for details. */











export function engr_text_space(ep) { return (addr_of((ptr_add((ep), 1)))); }





    /* length of text including trailing NUL */
    /* for save & restore; not length of text */
    /* moment engraving was (will be) finished */








    /* if engr_txt is "Elbereth", it is effective
                                * against monsters when an object is present
                                * even when hero isn't (so behaves similarly
                                * to how Elbereth did in 3.4.3) */
    /* this engraving will not degrade */
    /* refers to the engaving text: read or felt */
    /* refers to engraving map symbol: revealed */
    /* 4 free bits */


export function newengr(lth) { return view_of(struct_engr, addr_of(alloc(unsigned((lth) + sizeof(struct_engr))))); }

export function dealloc_engr(engr) { return free(addr_of((engr))); }

export function engraving_to_defsym(ep) { return ((levl()[(ep).engr_x][(ep).engr_y].typ == CORR) ? S_engrcorr : S_engroom); }


export function spot_shows_engravings(x, y) { return (+(levl()[(x)][(y)].typ == CORR         
     || levl()[(x)][(y)].typ == ICE       
     || levl()[(x)][(y)].typ == ROOM)); }
import { S_engrcorr } from "./defsym.h.js";
import { S_engroom } from "./defsym.h.js";
import { struct_engr } from "./engrave.h.js";
import { CORR } from "./rm.h.js";
import { ICE } from "./rm.h.js";
import { ROOM } from "./rm.h.js";
import { levl } from "./rm.h.macros.js";
import { sizeof } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { free } from "../rt/libc.js";
import { addr_of } from "../rt/struct.js";
import { ptr_add } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
