/* NetHack 5.0	attrib.h	$NHDT-Date: 1596498527 2020/08/03 23:48:47 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.12 $ */
/* Copyright 1988, Mike Stephenson                                */
/* NetHack may be freely redistributed.  See license for details. */

/*      attrib.h - Header file for character class processing. */












    /* used in rn2() selection of attrib */


export function ABASE(x) { return (chars[u.acurr.a + x]); }
export function ABON(x) { return (chars[u.abon.a + x]); }
export function AEXE(x) { return (chars[u.aexe.a + x]); }
export function ACURR(x) { return (acurr(x)); }
export function ACURRSTR() { return (acurrstr()); }
/* should be: */
/* #define ACURR(x) (ABON(x) + ATEMP(x) + (Upolyd  ? MBASE(x) : ABASE(x)) */

export function AMAX(x) { return (chars[u.amax.a + x]); }


export function ATEMP(x) { return (chars[u.atemp.a + x]); }
export function ATIME(x) { return (chars[u.atime.a + x]); }

/* KMH -- Conveniences when dealing with strength constants */
export function STR18(x) { return (18 + (x)); }
export function STR19(x) { return (100 + (x)); }





export function ATTRMAX(x) { return ((x == A_STR && Upolyd()) ? uasmon_maxStr() : gu.urace.attrmax[x]); }

export function ATTRMIN(x) { return (gu.urace.attrmin[x]); }
import { A_STR } from "./attrib.h.js";
import { Upolyd } from "./you.h.macros.js";
import { chars } from "../rt/heap.js";
import { acurr } from "./attrib.js";
import { acurrstr } from "./attrib.js";
import { gu } from "./decl.js";
import { u } from "./decl.js";
import { uasmon_maxStr } from "./polyself.js";
