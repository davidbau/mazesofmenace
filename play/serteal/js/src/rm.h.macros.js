/* NetHack 5.0	rm.h	$NHDT-Date: 1745114235 2025/04/19 17:57:15 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.120 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2017. */
/* NetHack may be freely redistributed.  See license for details. */




/*
 * The dungeon presentation graphics code and data structures were rewritten
 * and generalized for NetHack's release 2 by Eric S. Raymond (eric@snark)
 * building on Don G Kneller's MS-DOS implementation. See drawing.c for
 * the code that permits the user to set the contents of the symbol structure.
 *
 * The door representation was changed by
 * Ari Huttunen(ahuttune@niksula.hut.fi).
 */

/*
 * TLCORNER     TDWALL          TRCORNER
 * +-           -+-             -+
 * |             |               |
 *
 * TRWALL       CROSSWALL       TLWALL          HWALL
 * |             |               |
 * +-           -+-             -+              ---
 * |             |               |
 *
 * BLCORNER     TUWALL          BRCORNER        VWALL
 * |             |               |              |
 * +-           -+-             -+              |
 */

/*
 * Level location types, values for 'level.locations[x][y].typ'.
 *
 * These are different from display symbols and while there is
 * similarity between the cmap subset of those, there isn't any
 * one-to-one correspondence between the two encodings.  For instance,
 * the DOOR type has multiple symbols (closed|open|gone); so does the
 * STAIRS type (down|up).  Conversely, DRAWBRIDGE_UP represents the
 * location of the projected span if the drawbridge were down but
 * there is no symbol for that; it is displayed as water, ice, lava, or
 * floor depending on what is at that spot when the bridge is 'closed'.
 *
 * [Some debugging code in src/display.c defines array type_names[]
 * which contains an entry for each of these, so needs to be kept in
 * sync if any new types are added or existing ones renumbered.  The
 * #terrain command also has a menu choice to display each map spot by
 * a letter derived from these numeric values and another choice to
 * display a legend showing the letter-to-type correspondence.  If any
 * types are added, removed, or reordered, that needs to be updated to
 * keep in synch.]
 */








    /* For pretty mazes and special levels */





    /* KMH */



    /* pool that doesn't boil, adjust messages */




    /* KMH */
















    /* for special levels */


    /* these aren't levl[][].typ values, they're additional indices
       into terrain_descr[] for status feedback */












/*
 * Avoid using the level types in inequalities:
 * these types are subject to change.
 * Instead, use one of the macros below.
 */
export function IS_WALL(typ) { return ((((typ) && (typ) <= DBWALL) ? 1 : 0)); }
export function IS_STWALL(typ) { return (+((typ) <= DBWALL)); }
export function IS_OBSTRUCTED(typ) { return (+((typ) < POOL)); }
export function IS_SDOOR(typ) { return (+((typ) == SDOOR)); }
export function IS_DOOR(typ) { return (+((typ) == DOOR)); }
export function IS_DOORJOIN(typ) { return (+(IS_OBSTRUCTED(typ) || (typ) == IRONBARS)); }
export function IS_TREE(typ) { return ((((typ) == TREE || (svl.level.flags.arboreal && (typ) == STONE)) ? 1 : 0)); }

export function ACCESSIBLE(typ) { return (+((typ) >= DOOR)); }
export function IS_ROOM(typ) { return (+((typ) >= ROOM)); }
export function ZAP_POS(typ) { return (+((typ) >= POOL)); }
export function SPACE_POS(typ) { return (+((typ) > DOOR)); }
export function IS_POOL(typ) { return (+((typ) >= POOL && (typ) <= DRAWBRIDGE_UP)); }
export function IS_LAVA(typ) { return (+((typ) == LAVAPOOL || (typ) == LAVAWALL)); }
export function IS_THRONE(typ) { return (+((typ) == THRONE)); }
export function IS_FOUNTAIN(typ) { return (+((typ) == FOUNTAIN)); }
export function IS_SINK(typ) { return (+((typ) == SINK)); }
export function IS_GRAVE(typ) { return (+((typ) == GRAVE)); }
export function IS_ALTAR(typ) { return (+((typ) == ALTAR)); }
export function IS_DRAWBRIDGE(typ) { return (+((typ) == DRAWBRIDGE_UP || (typ) == DRAWBRIDGE_DOWN)); }

export function IS_FURNITURE(typ) { return (+((typ) >= STAIRS && (typ) <= ALTAR)); }
export function IS_AIR(typ) { return (+((typ) == AIR || (typ) == CLOUD)); }
export function IS_SOFT(typ) { return (+((typ) == AIR || (typ) == CLOUD || IS_POOL(typ))); }
export function IS_WATERWALL(typ) { return (+((typ) == WATER)); }
/* for surface checks when it's unknown whether a drawbridge is involved;
   drawbridge_up is the spot in front of a closed drawbridge and not the
   current surface at that spot; caveat: this evaluates its arguments more
   than once and might make a function call */
export function SURFACE_AT(x, y) { return ((levl()[x][y].typ == DRAWBRIDGE_UP)            
     ? db_under_typ(levl()[x][y].flags)    
     : levl()[x][y].typ); }


/*
 * The structure describing a coordinate position.
 * Before adding fields, remember that this will significantly affect
 * the size of temporary files and save files.
 *
 * Also remember that the run-length encoding for some ports in save.c
 * must be updated to consider the field.
 */

    /* what the hero thinks is there */
    /* what is really there  [why is this signed?] */
    /* seen vector */
    /* extra information for typ */
    /* wall/door/etc is horiz. (more typ info) */
    /* speed hack for lit rooms */
    /* remember if a location was lit */

    /* room # for special rooms */
    /* marks boundaries for special rooms*/
    /* Exception to Can_dig_down; was a trapdoor */


/*
 * rm flags field overloads:
 *
 *         +-------------+-------------+------------+------------+------------+
 *         |   bit5      |     bit4    |    bit3    |    bit2    |     bit1   |
 *         |   0x10      |      0x8    |     0x4    |     0x2    |      0x1   |
 *         +-------------+-------------+------------+------------+------------+
 * wall    |W_NONPASSWALL|W_NONDIGGABLE| W_MASK     | W_MASK     | W_MASK     |
 * door    |D_TRAPPED    | D_LOCKED    | D_CLOSED   | D_ISOPEN   | D_BROKEN   |
 *         |D_WARNED     |             |            |            |            |
 * sdoor   |D_TRAPPED    | D_LOCKED    | W_MASK     | W_MASK     | W_MASK     |
 * drawbr. |DB_FLOOR     | DB_ICE      | DB_LAVA    | DB_DIR     | DB_DIR     |
 * sink    |             |             | S_LRING    | S_LDWASHER | S_LPUDDING |
 * tree    |             |             |            | TREE_SWARM | TREE_LOOTED|
 * throne  |             |             |            |            | T_LOOTED   |
 * fountain|             |             |            | F_WARNED   | F_LOOTED   |
 * ladder  |             |             |            | LA_DOWN    | LA_UP      |
 * pool    |ICED_MOAT    | ICED_POOL   |            |            |            |
 * grave   |             |             |            |            | emptygrave |
 * altar   |AM_SANCTUM   | AM_SHRINE   | AM_MASK    | AM_MASK    | AM_MASK    |
 *         |             |             |            |            |            |
 *         +-------------+-------------+------------+------------+------------+
 *
 *
 * If these get changed or expanded, make sure wizard-mode wishing becomes
 * aware of the new usage
 *
 *      Note:  secret doors (SDOOR) want to use both rm.doormask and
 *      rm.wall_info but those both overload rm.flags.  SDOOR only
 *      has 2 states (closed or locked).  However, it can't specify
 *      D_CLOSED due to that conflicting with WM_MASK (below).  When
 *      a secret door is revealed, the door gets set to D_CLOSED iff
 *      it isn't set to D_LOCKED (see cvt_sdoor_to_door() in detect.c).
 *
 *      D_LOCKED conflicts with W_NONDIGGABLE but the latter is not
 *      expected to be used on door locations.
 *      D_TRAPPED conflicts with W_NONPASSWALL.
 *      D_SECRET would not fit within struct rm's 5-bit 'flags' field.
 */










/* candig is used for floor trap locations so is available for overload
   on walls, doors, secret doors, and furniture */


/*
 * The 5 possible states of doors.
 * For historical reasons they are numbered as mask bits rather than 0..4.
 * The trapped flag is OR'd onto the state and only valid if that state
 * is closed or locked.
 * The no-door state allows egress when moving diagonally, others do not.
 */









/*
 * Thrones should only be looted once.
 */


/*
 * Trees have more than one kick result.
 */



/*
 * Fountains have limits, and special warnings.
 */


export function FOUNTAIN_IS_WARNED(x, y) { return (levl()[x][y].flags & F_WARNED); }
export function FOUNTAIN_IS_LOOTED(x, y) { return (levl()[x][y].flags & F_LOOTED); }





/*
 * doors are even worse :-) The special warning has a side effect
 * of instantly trapping the door, and if it was defined as trapped,
 * the guards consider that you have already been warned!
 */


/*
 * Sinks have 3 different types of loot that shouldn't be abused
 */




/*
 * The four directions for a DrawBridge.
 */






/*
 * What's under a drawbridge.
 */






/*
 * Wall information.  Nondiggable also applies to iron bars.
 */




/*
 * Ladders (in Vlad's tower) may be up or down.
 */



/*
 * Room areas may be iced pools
 */



/* light states for terrain replacements, for set_levltyp_lit */



export function CAN_OVERWRITE_TERRAIN(ttyp) { return (((iflags.debug_overwrite_stairs || !((ttyp) == LADDER || (ttyp) == STAIRS)) ? 1 : 0)); }


/*
 * Add wall angle viewing by defining "modes" for each wall type.  Each
 * mode describes which parts of a wall are finished (seen as wall)
 * and which are unfinished (seen as rock).
 *
 * We use the bottom 3 bits of the flags field for the mode.  This comes
 * in conflict with secret doors, but we avoid problems because until
 * a secret door becomes discovered, we know what sdoor's bottom three
 * bits are.
 *
 * The following should cover all of the cases.
 *
 *      type    mode                            Examples: R=rock, F=finished
 *      -----   ----                            ----------------------------
 *      WALL:   0 none                          hwall, mode 1
 *              1 left/top (1/2 rock)                   RRR
 *              2 right/bottom (1/2 rock)               ---
 *                                                      FFF
 *
 *      CORNER: 0 none                          trcorn, mode 2
 *              1 outer (3/4 rock)                      FFF
 *              2 inner (1/4 rock)                      F+-
 *                                                      F|R
 *
 *      TWALL:  0 none                          tlwall, mode 3
 *              1 long edge (1/2 rock)                  F|F
 *              2 bottom left (on a tdwall)             -+F
 *              3 bottom right (on a tdwall)            R|F
 *
 *      CRWALL: 0 none                          crwall, mode 5
 *              1 top left (1/4 rock)                   R|F
 *              2 top right (1/4 rock)                  -+-
 *              3 bottom left (1/4 rock)                F|R
 *              4 bottom right (1/4 rock)
 *              5 top left & bottom right (1/2 rock)
 *              6 bottom left & top right (1/2 rock)
 */




















/*
 * Seen vector values.  The seen vector is an array of 8 bits, one for each
 * octant around a given center x:
 *
 *              0 1 2
 *              7 x 3
 *              6 5 4
 *
 * In the case of walls, a single wall square can be viewed from 8 possible
 * directions.  If we know the type of wall and the directions from which
 * it has been seen, then we can determine what it looks like to the hero.
 */










/* horizontal applies to walls, doors (including sdoor); also to iron bars
   even though they don't have separate symbols for horizontal and vertical */








    /* from struct rm */
    /* also from struct rm; an unsigned 5-bit field there */


/* for bones levels:  identify the dead character, who might have died on
   an existing bones level; if so, most recent victim will be first in list */

    /* next struct is previous dead character... */
    /* "svp.plname" + "-ROLe" + "-RACe" + "-GENder" + "-ALIgnment" + \0 */

    /* death reason, same as in score/log file */
    /* [DTHSZ+1] */
    /* date+time in string of digits rather than binary */
    /* "YYYYMMDDhhmmss\0" */
    /* final resting place spot */





    /* number of fountains on level */
    /* number of sinks on the level */
    /* Several flags that give hints about what's on the level */













    /* hero has memory */
    /* monsters are shortsighted */
    /* has_morgue, but remains set */
    /* fill pits and holes w/ boulders */



    /* Trees replace rock */
    /* level contains a town */
    /* set if level came from a bones file
                                * which was created in wizard mode (or
                                * normal mode descendant of such) */
    /* Whether corridors are used for the maze
                                * rather than ROOM */
    /* random monster generation allowed? */
    /* monsters may drop corpses/death drops */

    /* automatic searching disabled */
    /* lava emits poison gas at random */
    /* clouds create lightning bolts at random */

    /* +1 == hot, -1 == cold */
    /* wand of stasis effect lasts until when? */














/*
 * Macros for compatibility with old code. Someday these will go away.
 */
export function levl() { return svl.level.locations; }
export function fobj() { return svl.level.objlist; }
export function fmon() { return svl.level.monlist; }

/*
 * Convert a trap number into the defsym graphics array.
 * Convert a defsym number into a trap number.
 * Assumes that arrow trap will always be the first trap.
 */
export function trap_to_defsym(t) { return (S_arrow_trap + (t) - 1); }
export function defsym_to_trap(d) { return ((d) - S_arrow_trap + 1); }

export function OBJ_AT(x, y) { return (+(svl.level.objects[x][y] != null)); }
/*
 * Macros for encapsulation of level.monsters references.
 */

/* these wouldn't allow buried monster and surface monster at same location */









export function MON_AT(x, y) { return (+(svl.level.monsters[x][y] != null)); }
export function m_at(x, y) { return (svl.level.monsters[x][y]); }
















export function place_worm_seg(m, x, y) { return svl.level.monsters[x][y] = m; }
export function remove_monster(x, y) { return svl.level.monsters[x][y] = null; }


/* restricted movement, potential luck penalties */
export function Sokoban() { return svl.level.flags.sokoban_rules; }

/*
 * These prototypes are in extern.h but some of the code which uses them
 * includes config.h instead of hack.h so doesn't see extern.h.
 */
/* ### drawing.c ### */
import { S_arrow_trap } from "./defsym.h.js";
import { AIR } from "./rm.h.js";
import { ALTAR } from "./rm.h.js";
import { CLOUD } from "./rm.h.js";
import { DBWALL } from "./rm.h.js";
import { DOOR } from "./rm.h.js";
import { DRAWBRIDGE_DOWN } from "./rm.h.js";
import { DRAWBRIDGE_UP } from "./rm.h.js";
import { FOUNTAIN } from "./rm.h.js";
import { F_LOOTED } from "./rm.h.js";
import { F_WARNED } from "./rm.h.js";
import { GRAVE } from "./rm.h.js";
import { IRONBARS } from "./rm.h.js";
import { LADDER } from "./rm.h.js";
import { LAVAPOOL } from "./rm.h.js";
import { LAVAWALL } from "./rm.h.js";
import { POOL } from "./rm.h.js";
import { ROOM } from "./rm.h.js";
import { SDOOR } from "./rm.h.js";
import { SINK } from "./rm.h.js";
import { STAIRS } from "./rm.h.js";
import { STONE } from "./rm.h.js";
import { THRONE } from "./rm.h.js";
import { TREE } from "./rm.h.js";
import { WATER } from "./rm.h.js";
import { db_under_typ } from "./dbridge.js";
import { iflags } from "./decl.js";
import { svl } from "./decl.js";
