/* NetHack	5.0	sym.h	$NHDT-Date: $ $NHDT-Branch: $ $NHDT-Revision: $ */
/*      Copyright (c) 2016 by Pasi Kallinen              */
/* NetHack may be freely redistributed.  See license for details. */




/*
 * Default characters for monsters.
 */
/* clang-format off */





/* clang-format on */






    /* number of monster classes */



/* Default characters for dungeon surroundings and furniture */







/*
 * special symbol set handling types ( for invoking callbacks, etc.)
 * Must match the order of the known_handlers strings
 * in drawing.c
 */






    /* obsolete; needed so that the listing of available
                * symsets by 'O' can skip it for !MAC_GRAPHICS_ENV */











    /* start/finish markers */
    /* index into showsyms  */
    /* index into oc_syms   */
    /* index into monsyms   */
    /* misc                 */








/* linked list of symsets and their characteristics */

    /* next in list                         */
    /* ptr to symset name                   */
    /* ptr to description                   */
    /* an index value                       */
    /* known handlers value */
    /* don't use color if set               */
    /* restricted for use as primary set    */
    /* restricted for use as rogue lev set  */
    /* explicit symset set                  */
                              /* 4 free bits */


/*
 *
 */






export function DARKROOMSYM() { return (Is_rogue_level(u.uz) ? S_stone : S_darkroom); }

export function is_cmap_trap(i) { return (+((i) >= S_arrow_trap && (i) < S_arrow_trap + MAXTCHARS)); }
export function is_cmap_drawbridge(i) { return (+((i) >= S_vodbridge && (i) <= S_hcdbridge)); }
export function is_cmap_door(i) { return (+((i) >= S_vodoor && (i) <= S_hcdoor)); }
export function is_cmap_wall(i) { return (+((i) >= S_stone && (i) <= S_trwall)); }
export function is_cmap_room(i) { return (+((i) >= S_room && (i) <= S_darkroom)); }
export function is_cmap_corr(i) { return (+((i) >= S_corr && (i) <= S_litcorr)); }
export function is_cmap_furniture(i) { return (+((i) >= S_upstair && (i) <= S_fountain)); }
export function is_cmap_water(i) { return (+((i) == S_pool || (i) == S_water)); }
export function is_cmap_lava(i) { return (+((i) == S_lava || (i) == S_lavawall)); }

export function is_cmap_engraving(i) { return (+((i) == S_engroom || (i) == S_engrcorr)); }

/* misc symbol definitions */










/*
 * Graphics sets for display symbols
 */


        /* primary graphics set        */
        /* rogue graphics set          */




































/* one set per symset_name */








/* defaults */


export function SYMHANDLING(ht) { return (+(gs.symset[gc.currentgraphics].handling == (ht))); }
import { S_arrow_trap } from "./defsym.h.js";
import { S_corr } from "./defsym.h.js";
import { S_darkroom } from "./defsym.h.js";
import { S_engrcorr } from "./defsym.h.js";
import { S_engroom } from "./defsym.h.js";
import { S_fountain } from "./defsym.h.js";
import { S_hcdbridge } from "./defsym.h.js";
import { S_hcdoor } from "./defsym.h.js";
import { S_lava } from "./defsym.h.js";
import { S_lavawall } from "./defsym.h.js";
import { S_litcorr } from "./defsym.h.js";
import { S_pool } from "./defsym.h.js";
import { S_room } from "./defsym.h.js";
import { S_stone } from "./defsym.h.js";
import { S_trwall } from "./defsym.h.js";
import { S_upstair } from "./defsym.h.js";
import { S_vodbridge } from "./defsym.h.js";
import { S_vodoor } from "./defsym.h.js";
import { S_water } from "./defsym.h.js";
import { Is_rogue_level } from "./dungeon.h.macros.js";
import { MAXTCHARS } from "./sym.h.js";
import { gc } from "./decl.js";
import { gs } from "./decl.js";
import { u } from "./decl.js";
