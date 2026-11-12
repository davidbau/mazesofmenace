/* NetHack 5.0	hack.h	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.266 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2017. */
/* NetHack may be freely redistributed.  See license for details. */













































export function DUMMY() { return null; }


/* Macros for how a rumor was delivered in outrumor() */





/* bitmask flags for corpse_xname();
   PFX_THE takes precedence over ARTICLE, NO_PFX takes precedence over both */







/* number of turns it takes for vault guard to show up */


/* sellobj_state() states */








export function SHOP_WALL_DMG() { return (10 * ACURRSTR()); }



/* flags for look_here() */




/* max size of a windowtype option */


/* str_or_len from sp_lev.h */
















/* related to breadcrumb struct */








/* types of calls to bhit() */









/* Macros for messages referring to hands, eyes, feet, etc... */


























    /* coordinates of the upper left corner */
    /* the general direction of the bubble's movement */
    /* bubble bit mask */
    /* need to traverse the list up and down */










/*
 * Rudimentary command queue.
 * Allows the code to put keys and extended commands into the queue,
 * and they're executed just as if the user did them.  Time passes
 * normally when doing queued actions.  The queue will get cleared
 * if hero is interrupted.
 */

    /* a literal character, cmdq_add_key() */
    /* extended command, cmdq_add_ec() */
    /* direction, cmdq_add_dir() */
    /* placeholder for user input, cmdq_add_userinput() */
    /* integer value, cmdq_add_int() */












    /* internal canned sequence */
    /* user-inputted, if gi.in_doagain, replayed */



/* Command counts */


/* special key functions */






    /* simulated click for #therecmdmenu; use '_' as
                          * direction to initiate, then getpos() finishing
                          * with ',' (left click) or '.' (right click) */



    /* quick */
    /* once */
    /* verbose */






















/* commands[] is used to directly access cmdlist[] instead of looping
   through it to find the entry for a given input character;
   move_X is the character used for moving one step in direction X;
   alphadirchars corresponds to old sdir,
   dirchars corresponds to ``iflags.num_pad ? ndir : sdir'';
   pcHack_compat and phone_layout only matter when num_pad is on,
   swap_yz only matters when it's off */

    /* incremented after each update */
    /* same as iflags.num_pad except during updates */
    /* for numpad:  affects 5, M-5, and M-0 */
    /* inverted keypad:  1,2,3 above, 7,8,9 below */
    /* QWERTZ keyboards; use z to move NW, y to zap */
    /* current movement/direction characters */
    /* same as dirchars if !numpad */



    /* key that starts an extended command ('#') */























/* alteration types--keep in synch with costly_alteration(mkobj.c) */

    /* standard cancellation */
    /* drain life upon an object */
    /* cursed charging */
    /* unbless (devalues holy water) */
    /* uncurse (devalues unholy water) */
    /* disenchant weapons or armor */
    /* removal of rustproofing, dulling via engraving */
    /* potion dilution */
    /* scroll or spellbook blanking */
    /* dipped into flaming oil */
    /* neutralized via unicorn horn */
    /* wand breaking (bill first, useup later) */
    /* cream pie to own face (ditto) */
    /* start eating food */
    /* open tin */
    /* break box/chest's lock */
    /* rust damage */
    /* rotting attack */
    /* acid damage */
    /* damage to crystal armor */


/* used by unpaid_cost(shk.h) */






/* read.c, create_particular() & create_particular_parse() */



    /* -1, MALE, FEMALE, NEUTRAL */
    /* conflicting gender */






/* dig_check() results */




















/* Dismount: causes for why you are no longer riding */




    /* hero hit for knockback effect */






/* special dungeon levels for speed */

    /* unused */









    /* unused */
    /* unused */
    /* only in goto_level() [do.c] */
















/* macros for accessing the dungeon levels by their old names */
/* clang-format off */
export function oracle_level() { return (svd.dungeon_topology.d_oracle_level); }


export function medusa_level() { return (svd.dungeon_topology.d_medusa_level); }

export function valley_level() { return (svd.dungeon_topology.d_valley_level); }
export function wiz1_level() { return (svd.dungeon_topology.d_wiz1_level); }












export function astral_level() { return (svd.dungeon_topology.d_astral_level); }
export function tower_dnum() { return (svd.dungeon_topology.d_tower_dnum); }
export function sokoban_dnum() { return (svd.dungeon_topology.d_sokoban_dnum); }
export function mines_dnum() { return (svd.dungeon_topology.d_mines_dnum); }
export function quest_dnum() { return (svd.dungeon_topology.d_quest_dnum); }
export function tutorial_dnum() { return (svd.dungeon_topology.d_tutorial_dnum); }
export function qstart_level() { return (svd.dungeon_topology.d_qstart_level); }
export function qlocate_level() { return (svd.dungeon_topology.d_qlocate_level); }

export function knox_level() { return (svd.dungeon_topology.d_knox_level); }


/* clang-format on */

export function dunlev_reached(x) { return (svd.dungeons[(x).dnum].dunlev_ureached); }



    /* for end of game */
    /* for entering endgame */
    /* for leaving tutorial */

























/* symbolic names for capacity levels */


    /* Burdened */
    /* Stressed */
    /* Strained */
    /* Overtaxed */
    /* Overloaded */



    /* youmonst for the player */
    /* must be non-zero for record to be valid */








/*
 * This is the way the game ends.  If these are rearranged, the arrays
 * in end.c and topten.c will need to be changed.  Some parts of the
 * code assume that PANICKED separates the deaths from the non-deaths.
 */



















/* game events log */

    /* turn when this happened */
    /* LL_foo flags */





/* values returned from getobj() callback functions */

    /* generally invalid - can't be used for this purpose. will give a "silly
     * thing" message if the player tries to pick it, unless a more specific
     * failure message is in getobj itself - e.g. "You cannot foo gold". */

    /* invalid because it is not in inventory; used when the hands/self
     * possibility is queried and the player passed up something on the
     * floor before getobj. */

    /* invalid because it is an inaccessible or unwanted piece of gear, but
     * pseudo-valid for the purposes of allowing the player to select it and
     * getobj to return it if there is a prompt instead of getting "silly
     * thing", in order for the getobj caller to present a specific failure
     * message. Other than that, the only thing this does differently from
     * GETOBJ_EXCLUDE is that it inserts an "else" in "You don't have anything
     * else to foo". */

    /* invalid for purposes of not showing a prompt if nothing is valid but
     * pseudo-valid for selecting - identical to GETOBJ_EXCLUDE_INACCESS but
     * without the "else" in "You don't have anything else to foo". */

    /* valid - invlet not presented in the summary or the ? menu as a
     * recommendation, but is selectable if the player enters it anyway.
     * Used for objects that are actually valid but unimportantly so, such
     * as shirts for reading. */

    /* valid - will be shown in summary and ? menu */



/* getpos() return values */

    /* '.' -- ask about "more info?" */
    /* ',' -- skip "more info?" */
    /* ';' -- skip and stop looping */
    /* ':' -- show more info w/o asking */



    /* track dknown, !dknown separately */



/* attack mode for hmon() */

    /* hand-to-hand */
    /* normal ranged (or spitting while poly'd) */
    /* alternate ranged */
    /* polearm, treated as ranged */
    /* attached iron ball, pulled into mon */


/* hunger states - see hu_stat in eat.c */










/* fake inventory letters, not 'a'..'z' or 'A'..'Z' */




/* inventory counts (slots in tty parlance)
 * a...zA..Z    invlet_basic (52)
 * $a...zA..Z#  2 special additions
 */





    /* 2023/11/30 invlet_max is not yet used anywhere */










    /* chain of delayed killers */
    /* uprop keys to ID a delayed killer */
    /* one of the killer formats */



    /* actual killer name */







/* light source */


    /* source's position */
    /* source's current range */

    /* type of light source */
    /* source's identifier */

































/* N_DIRS_Z, minus up & down */

/* direction adjustments */
export function DIR_180(dir) { return (((dir) + 4) % N_DIRS); }
export function DIR_LEFT(dir) { return (((dir) + 7) % N_DIRS); }
export function DIR_RIGHT(dir) { return (((dir) + 1) % N_DIRS); }
export function DIR_LEFT2(dir) { return (((dir) + 6) % N_DIRS); }
export function DIR_RIGHT2(dir) { return (((dir) + 2) % N_DIRS); }
export function DIR_CLAMP(dir) { return (((dir) + N_DIRS) % N_DIRS); }












    /* =0, no capability; otherwise, different numbers.
     * If it's an object, the object is also set (it's 0 otherwise).
     */











/* Lua callback functions */












/* Lua callbacks. TODO: Merge with NHCORE */












    /* one of MSGTYP_foo */









/* bitmask for callers of hide_unhide_msgtypes() */


/* polyself flags */








/* repossession context */










    /* restoring game state + first pass of current level */
    /* restoring remainder of dungeon */
    /* final pass of restoring current level */







    /* Only meaningful for "real" rooms */












    /* use selection_getbounds() */



/* structure for 'program_state'; not saved and restored */

    /* self-explanatory? */
    /* inhibit further end of game disclosure */

    /* SIGHUP or moral equivalent received
                                 * -- no more screen output */
    /* don't remove level files prior to exit */

    /* in case of panic */
    /* `panic' is in progress */
    /* an exit handler is executing */
    /* creating a save file */
    /* reloading a save file */
    /* in saveobjchn(), mode FREEING */
    /* in getlev() */
    /* normal gameplay in progress */
    /* reporting a warning */
    /* in docrt(): redrawing the whole screen */
    /* processing orphaned level files */
    /* saving insurance checkpoint */
    /* in parseoptions */
    /* role/race/&c selection menus in progress */
    /* inside interface getlin routine */
    /* for impossible() during sanity checking */
    /* config_error_add is ready, available */
    /* set when past savefile loading */
    /* savefile has completed writing */
    /* in the midst of trying to read bones file */

    /* writing a panicloc entry */

    /* starting wizard mode game w/ WIZKIT file */
    /* input_state:  used in the core for the 'altmeta' option to process ESC;
       used in the curses interface to avoid arrow keys when user is doing
       something other than entering a command or direction and in the Qt
       interface to suppress menu commands in similar conditions;
       readchar() always resets it to 'otherInp' prior to returning */
    /* whether next key pressed will be entering a command */
    /* inside early_options processing */

    /* resize_pending only matters when handling a SIGWINCH signal for tty;
       getting_char is used along with that and also separately for UNIX;
       we minimize #if conditionals for them to avoid unnecessary clutter */
    /* set by signal handler */
    /* referenced during signal handling */



/* value of program_state.input_state, significant during readchar();
   get_count() expects digits then a command so sets it to commandInp */

    /* 'other' */
    /* readchar() */
    /* getpos() */
    /* getdir() */


/* sortloot() return type; needed before extern.h */


    /* result of loot_xname(obj) in some cases, otherwise null */
    /* these need to be signed; 'indx' should be big enough to hold a count
       of the largest pile of items, the others fit within char */
    /* index into original list (used as tie-breaker) */
    /* order rather than object class; 0 => not yet init'd */
    /* subclass for some classes */
    /* discovery status */
    /* 0: not in-use or not sorting by inuse_only;
                      * 1: lit candle/lamp or attached leash; 2: worn armor;
                      * 3: wielded weapon (including uswapwep and uquiver);
                      * 4: worn accessory (amulet, rings, blindfold). */










    /* wearing gloves? */
    /* is it a corpse obj? */
    /* does the corpse petrify on touch? */
    /* do you have stoning resistance? */
















/* values for rtype are defined in dungeon.h */
/* lev_region from sp_lev.h */












/* Flags for controlling uptodate */







/* Values for savefile status */























    /* t - traditional: by monster level */
    /* d - by difficulty rating */
    /* a - alphabetical, first uniques, then ordinary */
    /* A - alpha with uniques and ordinary intermixed */
    /* C - by class, high to low within class */
    /* c - by class, low to high within class */
    /* n - by count, high to low */
    /* z - by count, low to high */











/* at most one of `door' and `box' should be non-null at any given time */



    /* key|pick|card for unlock, sharp vs blunt for #force */






/* NetHack ftypes */



/* modes */







/* operations of the various saveXXXchn & co. routines */




/* operations of the various saveXXXchn & co. routines */
export function update_file(nhfp) { return ((nhfp).mode & (COUNTING | WRITING)); }
export function release_data(nhfp) { return ((nhfp).mode & FREEING); }



    /* entire struct, binary, as-is */
    /* each field written out as ascii text */



/* Content types for fieldlevel files */

    /* individual fields */
    /* binary rather than text */



    /* for traditional structlevel binary writes */
    /* holds READING, WRITING, FREEING, CONVERTING modes  */
    /* NHF_LEVELFILE, NHF_SAVEFILE, or NHF_BONESFILE */
    /* index of procs for fieldlevel saves */
    /* read count since opening */
         /* write count since opening */
    /* traditional structure binary saves */
    /* fieldlevel saves each field individually */
    /* if set, some additional context info from core */
    /* place to mark eof reached */
    /* set to true if executing on big-endian machine */
    /* file pointer for fieldlevel default style */
    /* file pointer mapfile for def format */
    /* file pointer logfile */
    /* file pointer debug info */






/* Monster name articles */





/* x_monnam() monster name suppress masks */









/* pline (et al) for a single string argument (suppress compiler warning) */
export function pline1(cstr) { return pline(_("%s"), cstr); }
export function Your1(cstr) { return Your(_("%s"), cstr); }
export function You1(cstr) { return You(_("%s"), cstr); }
export function verbalize1(cstr) { return verbalize(_("%s"), cstr); }
export function You_hear1(cstr) { return You_hear(_("%s"), cstr); }

export function panic1(cstr) { return panic(_("%s"), cstr); }

/* Some systems want to use full pathnames for some subsets of file names,
 * rather than assuming that they're all in the current directory.  This
 * provides all the subclasses that seem reasonable, and sets up for all
 * prefixes being null.  Port code can set those that it wants.
 */











/* used in files.c; xxconf.h can override if needed */





/* the bare-bones stuff is unconditional above to simplify coding; for
 * ports that actually use prefixes, add some more localized things
 */



/* from options.c */


/* player selection constants */






/* some array sizes for 'g?' */






/* Symbol offsets */







/* The UNDEFINED macros are used to initialize variables whose
   initialized value is not relied upon.
   UNDEFINED_VALUE: used to initialize any scalar type except pointers.
   UNDEFINED_VALUES: used to initialize any non scalar type without pointers.
   UNDEFINED_PTR: can be used only on pointer types. */


export function UNDEFINED_PTR() { return (0); }

/* The UNDEFINED_ROLE macro is used to initialize Role variables */























/* The UNDEFINED_RACE macro is used to initialize Race variables */














export function MATCH_WARN_OF_MON(mon) { return (((Warn_of_mon()                                                        
     && ((svc.context.warntype.obj & (mon).data.mflags2) != 0           
         || (svc.context.warntype.polyd & (mon).data.mflags2) != 0      
         || (svc.context.warntype.species                                 
             && (svc.context.warntype.species == (mon).data)))) ? 1 : 0)); }


/* makemon MM_ flags */


/* flags to control makemon(); goodpos() uses some plus has some of its own*/























/* if more MM_ flag masks are added, skip or renumber the GP_ one(s) */






/* 25 bits used */

/* flags for mhidden_description() (pager.c; used for mimics and hiders) */





/* flags for that_is_a_mimic() */



/* flags for make_corpse() and mkcorpstat(); 0..7 are recorded in obj->spe */






/* note: gender flags have different values from those used for monsters
   so that 0 can be unspecified/random instead of male */





/* flag bits for collect_coords(); combining ring_pairs with unshuffled
   makes no sense--if both are specified unshuffled takes precedence */









/* flags for decide_to_shift() */



/* m_poisongas_ok() return values */




/* flags for deliver_obj_to_mon */




/* special mhpmax value when loading bones monster to flag as extinct or
 * genocided */


/* macro form of adjustments of physical damage based on Half_physical_damage.
 * Can be used on-the-fly with the 1st parameter to losehp() if you don't
 * need to retain the dmg value beyond that call scope.
 * Take care to ensure it doesn't get used more than once in other instances.
 */
export function Maybe_Half_Phys(dmg) { return ((Half_physical_damage()) ? (Math.trunc(((dmg) + 1) / 2)) : (dmg)); }


/* flags for special ggetobj status returns */


/* flags to control query_objlist() */










/* Flags to control query_category() */
/* BY_NEXTHERE and INCLUDE_VENOM are used by query_category() too, so
   skip 0x0001 and 0x0002 */















/* Flags for oname(), artifact_exists(), artifact_origin() */

/*                       0x0001U is reserved for 'exists' */
/* flags indicating where an artifact came from */













/* flag controlling potential livelog event of finding an artifact */

/* flag for suppressing perm_invent update when name gets assigned */


/* Flags to control find_mid() and whereis_mon() */






/* Flags to control pick_[race,role,gend,align] routines in role.c */



/* Flags to control dotrap() and mintrap() in trap.c */










/* Flags to control test_move in hack.c */





/* m_move return values */






/*** some utility macros ***/
export function y_n(query) { return yn_function(query, ynchars, ord('n'), TRUE); }
export function ynq(query) { return yn_function(query, ynqchars, ord('q'), TRUE); }
export function ynaq(query) { return yn_function(query, ynaqchars, ord('y'), TRUE); }
export function nyaq(query) { return yn_function(query, ynaqchars, ord('n'), TRUE); }

export function ynNaq(query) { return yn_function(query, ynNaqchars, ord('y'), TRUE); }
/* YN() is same as y_n() except doesn't save the response in do-again buffer */
export function YN(query) { return yn_function(query, ynchars, ord('n'), FALSE); }

/* Macros for scatter */







/* Macros for launching objects */





/* enlightenment control flags */






/* control flags for sortloot() */






/* flags for xkilled() [note: meaning of first bit used to be reversed,
   1 to give message and 0 to suppress] */





/* pline_flags; mask values for custompline()'s first argument */
/* #define PLINE_ORDINARY 0 */








/* get_count flags */






/* rloc() flags */





/* indices for some special tin types */






/* Corpse aging */




/* Some misc definitions */
export function POTION_OCCUPANT_CHANCE(n) { return (13 + 2 * (n)); }


export function BALL_IN_MON() { return (((u.uswallow && uball && uball.where == OBJ_FREE) ? 1 : 0)); }
export function CHAIN_IN_MON() { return (((u.uswallow && uchain && uchain.where == OBJ_FREE) ? 1 : 0)); }
export function NODIAG(monnum) { return (+((monnum) == PM_GRID_BUG)); }

/* Flags to control menus */






/* flags to control teleds() */




/* flags for mktrap() */









/* flags passed to getobj() to control how it responds to player input */






/* flags for hero_breaks() and hits_bars(); BRK_KNOWN* let callers who have
   already called breaktest() prevent it from being called again since it
   has a random factor which makes it be non-deterministic */







/* extended command return values */





/* flags for newcham() */




/* Constant passed to explode() for gas spores because gas spores are weird.
 * Specifically, this is an exception to whole "explode() uses dobuzz types"
 * system (the range -1 to -9 isn't used by it, for some reason), where this
 * is effectively an extra dobuzz type, and some zap.c code needs to be aware
 * of it. */


/* macros for dobuzz() type */
export function BZ_VALID_ADTYP(adtyp) { return (+((adtyp) >= AD_MAGM && (adtyp) <= AD_SPC2)); }

export function BZ_OFS_AD(adtyp) { return (abs((adtyp) - AD_MAGM) % 10); }
export function BZ_OFS_WAN(otyp) { return (abs((otyp) - WAN_MAGIC_MISSILE) % 10); }
export function BZ_OFS_SPE(otyp) { return (abs((otyp) - SPE_MAGIC_MISSILE) % 10); }
/* hero shooting a wand */
export function BZ_U_WAND(bztyp) { return (0 + (bztyp)); }
/* hero casting a spell */
export function BZ_U_SPELL(bztyp) { return (10 + (bztyp)); }
/* hero breathing as a monster */
export function BZ_U_BREATH(bztyp) { return (20 + (bztyp)); }
/* monster casting a spell */
export function BZ_M_SPELL(bztyp) { return (-10 - (bztyp)); }
/* monster breathing */
export function BZ_M_BREATH(bztyp) { return (-20 - (bztyp)); }
/* monster shooting a wand; note: not -9 to -0 because -0 is ambiguous  */
export function BZ_M_WAND(bztyp) { return (-30 - (bztyp)); }

/* pick a random entry from array */
export function ROLL_FROM(array) { return array[rn2(SIZE(array))]; }
/* array with terminator variation */
/* #define ROLL_FROMT(array) array[rn2(SIZE(array) - 1)] */

/* validate index of array */
export function IndexOk(idx, array) { return (+((idx) >= 0 && (idx) < SIZE(array))); }

/* array with terminator variation */
export function IndexOkT(idx, array) { return (+((idx) >= 0 && (idx) < (SIZE(array) - 1))); }


export function FEATURE_NOTICE_VER(major, minor, patch) { return ((shl64(major, 24)) | (shl64(minor, 16)) 
     | (shl64(patch, 8)) | (0)); }


export function FEATURE_NOTICE_VER_MAJ() { return (shr64u(flags.suppress_alert, 24)); }
export function FEATURE_NOTICE_VER_MIN() { return (((0x0000000000FF0000 & flags.suppress_alert)) >> 16); }

export function FEATURE_NOTICE_VER_PATCH() { return (((0x000000000000FF00 & flags.suppress_alert)) >> 8); }



export function max(a, b) { return ((a) > (b) ? (a) : (b)); }


export function min(x, y) { return ((x) < (y) ? (x) : (y)); }

export function plur(x) { return (((x) == 1) ? _("") : _("s")); }

/* Cast to int, but limit value to range. */
export function LIMIT_TO_RANGE_INT(lo, hi, var_) { return (int(((var_) < (lo) ? (lo) : (var_) > (hi) ? (hi) : (var_)))); }


export function ARM_BONUS(obj) { return (objects[(obj).otyp].oc_oc1 + (obj).spe                             
     - min(greatest_erosion(obj), objects[(obj).otyp].oc_oc1)); }


export function makeknown(x) { return discover_object((x), TRUE, TRUE, TRUE); }
export function distu(xx, yy) { return dist2((xx), (yy), u.ux, u.uy); }
export function mdistu(mon) { return distu((mon).mx, (mon).my); }
export function onlineu(xx, yy) { return online2((xx), (yy), u.ux, u.uy); }

export function rn1(x, y) { return (rn2(x) + (y)); }

/* negative armor class is randomly weakened to prevent invulnerability */
export function AC_VALUE(AC) { return ((AC) >= 0 ? (AC) : -rnd(-(AC))); }






/* These may have been defined to platform-specific values in *conf.h
 * or on the compiler command line from a hints file or Makefile */






















/*
 * Harness determinism: replace libc qsort() with a stable wrapper so
 * equal-key ordering does not vary by platform libc behavior.
 */

export function qsort(base, nmemb, size, compar) { return nh_deterministic_qsort((base), (nmemb), (size), (compar)); }



/*
 * PRNG call logging macros (004-prng-logging patch).
 *
 * These use a C preprocessor trick: function-like macros only match
 * when followed by '('.  So `init_random(rn2)` passes the bare function
 * pointer (no parens) and the macro doesn't fire.  But `rn2(42)` does
 * match, setting the caller's __func__, __FILE__:__LINE__ before
 * calling the real rn2 function.
 *
 * The self-reference in the expansion (e.g. rn2 calling rn2) is safe:
 * C99 6.10.3.4 says a macro name found during its own expansion is
 * not replaced again, so it resolves to the real function.
 *
 * Suppressed inside rnd.c itself (RNGLOG_IN_RND_C) so that internal
 * calls (rnz->rn2, rne->rn2, etc) inherit the outer caller's context
 * rather than setting their own.
 */
import { ACURRSTR } from "./attrib.h.macros.js";
import { FALSE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { COUNTING } from "./hack.h.js";
import { FREEING } from "./hack.h.js";
import { N_DIRS } from "./hack.h.js";
import { WRITING } from "./hack.h.js";
import { AD_MAGM } from "./monattk.h.js";
import { AD_SPC2 } from "./monattk.h.js";
import { PM_GRID_BUG } from "./monsters.h.js";
import { OBJ_FREE } from "./obj.h.js";
import { greatest_erosion } from "./obj.h.macros.js";
import { SPE_MAGIC_MISSILE } from "./objects.h.js";
import { WAN_MAGIC_MISSILE } from "./objects.h.js";
import { Half_physical_damage } from "./youprop.h.macros.js";
import { Warn_of_mon } from "./youprop.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { shl64 } from "../rt/int64.js";
import { shr64u } from "../rt/int64.js";
import { abs } from "../rt/libc.js";
import { _ } from "../rt/strings.js";
import { yn_function } from "./cmd.js";
import { flags } from "./decl.js";
import { svc } from "./decl.js";
import { svd } from "./decl.js";
import { u } from "./decl.js";
import { ynNaqchars } from "./decl.js";
import { ynaqchars } from "./decl.js";
import { ynchars } from "./decl.js";
import { ynqchars } from "./decl.js";
import { panic } from "./end.js";
import { dist2 } from "./hacklib.js";
import { nh_deterministic_qsort } from "./hacklib.js";
import { online2 } from "./hacklib.js";
import { discover_object } from "./o_init.js";
import { objects } from "./objects.js";
import { You } from "./pline.js";
import { You_hear } from "./pline.js";
import { Your } from "./pline.js";
import { pline } from "./pline.js";
import { verbalize } from "./pline.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
