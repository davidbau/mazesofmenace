/* NetHack 5.0	spell.h	$NHDT-Date: 1646838388 2022/03/09 15:06:28 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.14 $ */
/* Copyright 1986, M. Stephenson                                  */
/* NetHack may be freely redistributed.  See license for details. */







/* spellbook re-use control; used when reading and when polymorphing */



    /* spell id (== object.otyp) */
    /* power level */
    /* knowledge of spell */



    /* known but no longer castable */
    /* not yet known */
    /* castable if various casting criteria are met */
    /* still castable but nearly forgotten */


/* levels of memory destruction with a scroll of amnesia */



export function decrnknow(spell) { return svs.spl_book[spell].sp_know--; }
export function spellid(spell) { return svs.spl_book[spell].sp_id; }
export function spellknow(spell) { return svs.spl_book[spell].sp_know; }

/* how much Pw a spell of level lvl costs to cast? */
export function SPELL_LEV_PW(lvl) { return ((lvl) * 5); }
import { svs } from "./decl.js";
