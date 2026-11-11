/* NetHack 5.0	dungeon.h	$NHDT-Date: 1685863327 2023/06/04 07:22:07 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.47 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */




/* basic dungeon level element */
    /* dungeon number */
    /* level number */




/* dungeon/level type flags */
    /* is this a town? (levels only) */
    /* is this part of hell? */
    /* is this a maze? */
    /* is this an old-fashioned presentation? */
    /* dungeon alignment. */
    /* dungeon not connected to any branch */


/* special dungeon level element */

    /* dungeon & level numbers */
    /* name of prototype file (eg. "tower") */
    /* character to id level in bones files */
    /* no. of randomly available similar levels */
    /* type flags */


/* level region types */











/* non-stairway level change identifier */
    /* "lower" left corner (near [0,0]) */
    /* "upper" right corner (near [COLNO,ROWNO]) */
    /* outline of invalid area */
    /* opposite corner of invalid area */


/* teleportation exclusion zones in the level */

    /* level_region_types */





/* basic dungeon identifier */
    /* name of the dungeon (eg. "Hell") */
    /* name of prototype file (eg. "tower") */
    /* name of "fill" level protype file */
    /* lua file name containing themed rooms */
    /* character to id dungeon in bones files */
    /* dungeon flags */
    /* entry level */
    /* number of levels in this dungeon */
    /* how deep you have been in this dungeon */
    /* the starting depth in "real" terms */
        /* the starting depth in "logical" terms */


/*
 * A branch structure defines the connection between two dungeons.  They
 * will be ordered by the dungeon number/level number of 'end1'.  Ties
 * are resolved by 'end2'.  'Type' uses 'end1' arbitrarily as the primary
 * point.
 */

    /* next in the branch chain */
    /* branch identifier */
    /* type of branch */
    /* "primary" end point */
    /* other end point */
    /* does end1 go up? */


/* branch types */







/* A particular dungeon contains num_dunlevs d_levels with dlevel 1..
 * num_dunlevs.  Ledger_start and depth_start are bases that are added
 * to the dlevel of a particular d_level to get the effective ledger_no
 * and depth for that d_level.
 *
 * Ledger_no is a bookkeeping number that gives a unique identifier for a
 * particular d_level (for level.?? files, e.g.).
 *
 * Depth corresponds to the number of floors below the surface.
 */

/* These both can't be zero, or dungeon_topology isn't init'd / restored */
export function Lassigned(y) { return ((((y).dlevel || (y).dnum) ? 1 : 0)); }
export function Lcheck(x, z) { return (((Lassigned(z) && on_level(x, z)) ? 1 : 0)); }

export function Is_astralevel(x) { return (Lcheck(x, (svd.dungeon_topology.d_astral_level))); }
export function Is_earthlevel(x) { return (Lcheck(x, (svd.dungeon_topology.d_earth_level))); }
export function Is_waterlevel(x) { return (Lcheck(x, (svd.dungeon_topology.d_water_level))); }
export function Is_firelevel(x) { return (Lcheck(x, (svd.dungeon_topology.d_fire_level))); }
export function Is_airlevel(x) { return (Lcheck(x, (svd.dungeon_topology.d_air_level))); }
export function Is_medusa_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_medusa_level))); }
export function Is_oracle_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_oracle_level))); }
export function Is_valley(x) { return (Lcheck(x, (svd.dungeon_topology.d_valley_level))); }
export function Is_juiblex_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_juiblex_level))); }


export function Is_wiz1_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_wiz1_level))); }
export function Is_wiz2_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_wiz2_level))); }
export function Is_wiz3_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_wiz3_level))); }
export function Is_sanctum(x) { return (Lcheck(x, (svd.dungeon_topology.d_sanctum_level))); }

export function Is_rogue_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_rogue_level))); }
export function Is_stronghold(x) { return (Lcheck(x, (svd.dungeon_topology.d_stronghold_level))); }
export function Is_bigroom(x) { return (Lcheck(x, (svd.dungeon_topology.d_bigroom_level))); }
export function Is_qstart(x) { return (Lcheck(x, (svd.dungeon_topology.d_qstart_level))); }
export function Is_qlocate(x) { return (Lcheck(x, (svd.dungeon_topology.d_qlocate_level))); }
export function Is_nemesis(x) { return (Lcheck(x, (svd.dungeon_topology.d_nemesis_level))); }
export function Is_knox(x) { return (Lcheck(x, (svd.dungeon_topology.d_knox_level))); }
export function Is_mineend_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_mineend_level))); }
export function Is_sokoend_level(x) { return (Lcheck(x, (svd.dungeon_topology.d_sokoend_level))); }

export function In_sokoban(x) { return (+((x).dnum == sokoban_dnum())); }
export function Inhell() { return In_hell(u.uz); }
export function In_endgame(x) { return (+((x).dnum == astral_level().dnum)); }
export function In_tutorial(x) { return (+((x).dnum == tutorial_dnum())); }

export function within_bounded_area(X, Y, LX, LY, HX, HY) { return (+((X) >= (LX) && (X) <= (HX) && (Y) >= (LY) && (Y) <= (HY))); }


/* monster and object migration codes */
















/* level information (saved via ledger number) */




/* 0x02 was FORGOTTEN, when amnesia made you forget maps */

        /* Note:  VISITED and LFILE_EXISTS are currently almost always
         * set at the same time.  However, they _mean_ different things.
         */


/* types and structures for dungeon map recording
 *
 * It is designed to eliminate the need for an external notes file for some
 * mundane dungeon elements.  "Where was the last altar I passed?" etc...
 * Presumably the character can remember this sort of thing even if, months
 * later in real time picking up an old save game, I can't.
 *
 * To be consistent, one can assume that this map is in the player's mind and
 * has no physical correspondence (eliminating illiteracy/blind/hands/hands
 * free concerns).  Therefore, this map is not exhaustive nor detailed ("some
 * fountains").  This makes it also subject to player conditions (amnesia).
 */

/* what the player knows about a single dungeon level */
/* initialized in mklev() */

    /* feature knowledge that must be calculated from levl array */











    /* calculated from rooms array */


    /* altar alignment; MSA_NONE if there is more than one and
       they aren't all the same */





    /* can't get back to this level */
    /* player has forgotten about this level */
    /* player aware of bones */




    /* add tune hint to castle annotation */





    /* quest annotations: quest_summons is for main dungeon level
       with entry portal and is reset once quest has been finished;
       questing is for quest home (level 1) */
    /* heard summons from leader */
    /* quest leader has unlocked quest stairs */
    /* "gateway to sanctum" */
    /* found vibrating square 'trap';
                                    * flag cleared once the msanctum
                                    * annotation has been added (on
                                    * the next dungeon level; temple
                                    * entered or high altar mapped) */
    /* not used */




    /* flag for shop without shk */



    /* next map in the chain */
    /* knows about branch via taking it in goto_level */
    /* corresponding dungeon level */


    /* custom naming */


    /* same size as svr.rooms[] */
    /* dead heroes; might not have graves or ghosts */
    /* same as level.bonesinfo */
import { astral_level } from "./hack.h.macros.js";
import { sokoban_dnum } from "./hack.h.macros.js";
import { tutorial_dnum } from "./hack.h.macros.js";
import { svd } from "./decl.js";
import { u } from "./decl.js";
import { In_hell } from "./dungeon.js";
import { on_level } from "./dungeon.js";
