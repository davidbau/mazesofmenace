/* NetHack 5.0  decl.h  $NHDT-Date: 1725653004 2024/09/06 20:03:24 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.377 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2007. */
/* NetHack may be freely redistributed.  See license for details. */




/* The names of the colors used for gems, etc. */


/* lua callback queue names */




export function NH_BLACK() { return c_color_names.c_black; }
export function NH_AMBER() { return c_color_names.c_amber; }
export function NH_GOLDEN() { return c_color_names.c_golden; }
export function NH_LIGHT_BLUE() { return c_color_names.c_light_blue; }
export function NH_RED() { return c_color_names.c_red; }
export function NH_GREEN() { return c_color_names.c_green; }
export function NH_SILVER() { return c_color_names.c_silver; }
export function NH_BLUE() { return c_color_names.c_blue; }
export function NH_PURPLE() { return c_color_names.c_purple; }
export function NH_WHITE() { return c_color_names.c_white; }
export function NH_ORANGE() { return c_color_names.c_orange; }

/* common_strings */

export function nothing_happens() { return c_common_strings.c_nothing_happens; }
export function nothing_seems_to_happen() { return c_common_strings.c_nothing_seems_to_happen; }
export function thats_enough_tries() { return c_common_strings.c_thats_enough_tries; }
export function silly_thing_to() { return c_common_strings.c_silly_thing_to; }
export function shudder_for_moment() { return c_common_strings.c_shudder_for_moment; }
export function something() { return c_common_strings.c_something; }
export function Something() { return c_common_strings.c_Something; }
export function You_can_move_again() { return c_common_strings.c_You_can_move_again; }
export function Never_mind() { return c_common_strings.c_Never_mind; }
export function vision_clears() { return c_common_strings.c_vision_clears; }
export function the_your() { return c_common_strings.c_the_your; }
/* fakename[] used occasionally so vtense() won't be fooled by an assigned
   name ending in 's' */
export function fakename() { return c_common_strings.c_fakename; }

/* default object class symbols */


/* default mon class symbols */




/* empty string that is non-const for parameter use */












/* used by coloratt.c, options.c, utf8map.c, windows.c */


/* material strings */


/* current mon class symbols */


/* current object class symbols */


















    /* under-wear, so to speak */

/* defined only when punished */





/* Window system stuff */





/* also declared in tcap.h */
    /* graphics start and end (tty font swapping) */
    /* lines and columns */

export function AS() { return gt.tc_gbl_data.tc_AS; }
export function AE() { return gt.tc_gbl_data.tc_AE; }
export function LI() { return gt.tc_gbl_data.tc_LI; }
export function CO() { return gt.tc_gbl_data.tc_CO; }







    /* partially redo status line */
    /* print an entirely new bottom line */
    /* context.botl for 'time' (moves) only */



/*
 * 'gX' -- instance_globals holds engine state that does not need to be
 * persisted upon game exit.  The initialization state is well defined
 * and set in decl.c during early early engine initialization.
 *
 * Unlike instance_flags, values in the structure can be of any type.
 *
 * Pulled from other files to be grouped in one place.  Some comments
 * which came with them don't make much sense out of their original context.
 */


    /* decl.c */


    /* detect.c */
    /* used to augment first "already found a monster"
                             * message if 'cmdassist' is Off */
    /* do.c */


    /* dog.c */


    /* end.c */


    /* mon.c */
    /* list of PM values for animal monsters */



    /* options.c */



    /* pickup.c */
    /* menustyle:Full plus 'A' response + !paranoid:A */
    /* menustyle:Full plus 'A' response + paranoid:A */


    /* shk.c */


    /* sounds.c */


    /* trap.c */
    /* context for water_damage(), managed by water_damage_chain();
        when more than one stack of potions of acid explode while processing
        a chain of objects, use alternate phrasing after the first message */







    /* botl.c */






    /* decl.c */
    /* place where throw or zap hits or stops */
    /* objects not yet paid for */

    /* files.c */


    /* hack.c */
    /* id of last boulder pushed */
    /* turn that a message was given for pushing
                            * a boulder; used in lieu of Norep() */

    /* mkmaze.c */
    /* for preserving the insect legs when wallifying
                         * baalz level */

    /* pickup.c */


    /* zap.c */
    /* zapper/caster/breather who initiates buzz() */

    /* new */









    /* botl.c */



    /* cmd.c */
    /* flag.h */
    /* Provide a means to redo the last command.  The flag `in_doagain'
       (decl.c below) is set to true while redoing the command.  This flag
       is tested in commands that require additional input (like `throw'
       which requires a thing and a direction), and the input prompt is
       not shown.  Also, while in_doagain is TRUE, no keystrokes can be
       saved into the saveq. */

    /* decl.c */

    /* parse() / rhack() */


    /* some objects need special handling during destruction or placement */
    /* wand currently zapped/applied */

    /* external pager; from getenv() or DEF_PAGER */


    /* dog.c */


    /* end.c */
    // email for crash reports
    // human name for crash reports
    // maximum length for the url of a crash report

    /* symbols.c */


    /* files.c, cfgfiles.c */
    /* set in unixmain.c, used in options.c */





    /* invent.c */
    /* for perm_invent when operating on a partial inventory display, so that
       persistent one doesn't get shrunk during filtering for item selection
       then regrown to full inventory, possibly being resized in process */



    /* options.c */
    /* set in unixmain.c */
    /* alternate set of menu colors */

    /* pickup.c */
    /* current_container is set in use_container(), to be used by the
       callback routines in_container() and out_container() from askchain()
       and use_container().  Also used by menu_loot() and container_gone(). */



    /* questpgr.c */


    /* sounds.c */


    /* sp_lev.c */


    /* uhitm.c */
    /* monster type being digested, set by gulpum */

    /* zap.c */
    /* new */







    /* decl.c */








    /* dig.c */


    /* do.c */
    /* pline() before level change */
    /* pline() after level change */
    /* to augment the no-rest-next-to-monster message */

    /* dog.c */


    /* end.c */
    /* for counting deaths occurring on same hero_seq */

    /* mon.c */


    /* objname.c */
    /* distantname used by distant_name() to pass extra information to
       xname_flags(); it would be much cleaner if this were a parameter,
       but that would require all xname() and doname() calls to be modified */


    /* pickup.c */



    /* new */








    /* cmd.c */


    /* info for rhack() from doextcmd() */

    /* eat.c */
    /* set by cpostfx() */

    /* mkmaze.c */


    /* new stuff */
    /* if raw_prints occurred early prior
                                 to gb.beyond_savefile_load */






    /* decl.c */




    /* eat.c */


    /* mhitm.c */


    /* rumors.c */




    /* shk.c */
    /* last time of follow message */






    /* display.c */




    /* do_name.c */
    /* cursor position in case of async resize */



    /* dog.c */
    /* type of dog's current goal */
    /* x position of dog's current goal */
    /* y position of dog's current goal */

    /* dokick.c */


    /* end.c */
    /* 1st +1: subtracting first from last, 2nd +1: one slot for all glass */


    /* invent.c */


    /* nhlua.c */






    /* pline.c */


    /* region.c */



    /* new stuff */
    /* per-level glyph mapping flags */







    /* decl.c */
    /* name of the game (argv[0] of main) */

    /* where rumors, help, record are */

    /* 'moves*8 + n' where n is updated each hero move during
                    * the current turn */

    /* dog.c */


    /* mhitu.c */








    /* decl.c */





    /* do_wear.c */
    /* starting equipment gets auto-worn at beginning of new game,
       and we don't want stealth or displacement feedback then */
    /* manipulated in set_wear() */

    /* invent.c */





    /* mon.c */
    /* temporary array of all N monsters
                                * on the current level */

    /* restore.c */


    /* sp_lev.c */


    /* new */






    /* apply.c */
    /* current jump result of magic */






    /* location hero just kicked */

    /* decl.c */
    /* object in flight due to kicking */

    /* read.c */







    /* cmd.c */


    /* decl.c (before being incorporated into instance_globals_*) */

    /* max num of simultaneous users */


    /* where levels are */


    /* files.c */



    /* invent.c */
    /* 0 ... 51 (never saved&restored) */

    /* light.c */


    /* mklev.c */


    /* mon.c */
    /* m_id of hides-under mon seen going into hiding */

    /* nhlan.c */





    /* nhlua.c */
    /* lua_State * */




    /* options.c */


    /* save.c */
    /* track uball during save and... */
    /* track uchain since saving might free it */

    /* sp_lev.c */



    /* trap.c */


    /* windows.c */


    /* new stuff */








    /* apply.c */


    /* botl.c */
    /* loaded by max_rank_sz */

    /* decl.c */


    /* note: smaller than usual [BUFSZ] */
    /* for xname handling of multiple shot missile volleys:
       number of shots, index of current one, validity check, shoot vs throw */

    /* weapon picked is merged with wielded one */

    /* objects moving to another dungeon level */

    /* dog.c */
    /* monsters that went down/up together with @ */
    /* monsters moving to another level */

    /* dokick.c */


    /* mhitm.c */
    /* for gas spore explosion when it's swallowed*/

    /* mhitu.c */


    /* mklev.c */
    /* used only during level creation */

    /* mkmap.c */
    /* rectangle bounds for regions */




    /* mkobj.c */
    /* for trolls */

    /* mthrowu.c */
    /* for m_throw()/thitu() 'miss' message */
    /* monster being shot by another monster */
    /* monster that is shooting */

    /* muse.c */
    /* kludge to use mondied instead of killed */


    /* options.c */
    /* Allow the user to map incoming characters to various menu commands. */
    /* exported */


    /* region.c */


    /* trap.c */
    /* set to True by water_damage() if it issues
                              * a message about water; dodip() should make
                              * POT_WATER should become discovered */






    /* botl.c */
    /* 0..1 for array[2][] first index */

    /* decl.c */



    /* dokick.c */


    /* files.c */

    /* run-time option processing: warn once if built
                            * without USER_SOUNDS and config file contains
                            * SOUND=foo or SOUNDDIR=bar */

    /* mhitm.c */


    /* mkmap.c */



    /* options.c */


    /* potion.c */
    /* for long worms */

    /* questpgr.c */


    /* restore.c */


    /* sp_lev.c */


    /* u_init.c */












    /* dbridge.c */


    /* decl.c */


    /* used by object_to_glyph() [otg] */
    /* used by obj_is_piletop() */
    /* defined when occupation != NULL */

    /* symbols.c */
    /* loaded primary symbols          */
    /* loaded rogue symbols           */

    /* invent.c */
    /* query objlist callback: return TRUE if obj is at given location */


    /* o_init.c */


    /* options.c */

    /* builtin_opt, syscf_, rc_file_, environ_, play_opt */



    /* for doset() */







    /* pickup.c */
    /* last encumbrance */

    /* restore.c */


    /* rumors.c */
    /* -1=>don't use, 0=>need init, 1=>init done */

    /* uhitm.c */
    /* Used to flag attacks caused by
                                    * Stormbringer's maliciousness. */
    /* zap.c */







    /* apply.c */



    /* decl.c */
    /* length of plname[] if that came from getlogin() */
    /* character's race */


    /* dog.c */
    /* user preferred pet name has been used */
    /* '\0', 'c', 'd', 'n' (none) */

    /* symbols.c */
    /* loaded primary symbols          */

    /* invent.c */


    /* pickup.c */

    /* when picking up multiple items in a single
                             * operation, encumbrance after previous item */

    /* pline.c */



    /* potion.c */



    /* pray.c */
    /* values calculated when prayer starts, and used when completed */


    /* (-1)-3: (-1)=really naughty, 3=really good */

    /* weapon.c */


    /* zap.c */


    /* new stuff */










    /* symbols.c */
    /* loaded rogue symbols           */

    /* extralev.c */


    /* mkmaze.c */


    /* region.c */


    /* rip.c */


    /* role.c */




    /* shk.c */







    /* artifact.c */
    /* coordinate effects from spec_dbon() with
                              messages in artifact_hit() */

    /* decl.c */


    /* done to monsters hit by 'c' */


    /* do.c */
    /* ? [even back in 3.4.3, only used in bones.c] */

    /* symbols.c */

    /* adds UNICODESET */


    /* symbols to be displayed */

    /* files.c */
    /* for pick-list building only */

    /* SAVESIZE, BONESSIZE, LOCKNAMESIZE are defined in "fnamesiz.h" */
    /* relative path of save file from playground */

    /* holds path of directory for save file */


    /* invent.c */
    /* set by sortloot() for use by sortloot_cmp();
                            * reset by sortloot when done */
    /* mhitm.c */
    /* mind flayer against headless target */

    /* mon.c */


    /* options.c */
    /* files.c will populate this with
                                      * list of available sets */
    /* copy of iflags.use_menu_colors */
    /* copy of gm.menu_colorings */


    /* pickup.c */
    /* True => need sellobj_state(); False => don't */


    /* pline.c */

    /* slot in saved_plines[] to use next */



    /* polyself.c */
    /* controls whether taking on new form or becoming new
                          man can also change sex (ought to be an arg to
                          polymon() and newman() instead) */

    /* shk.c */
    /* auto-response flag for/from "sell foo?" 'a' => 'y', 'q' => 'n' */



    /* spells.c */
    /* index into spl_sortchoices[] */
    /* array of svs.spl_book[] indices */

    /* steal.c */
    /* object to be stolen */
    /* monster doing the stealing */

    /* vision.c */
    /* 'bubble' debugging: clouds and water don't block light */






    /* apply.c */


    /* decl.c */
    /* mthrowu: target x */
    /* mthrowu: target y */

    /* object in flight due to throwing */
    /* Windowing stuff that's really tty oriented, but present for all ports */
    /* AS,AE, LI,CO */

    /* hack.c */



    /* invent.c */
    /* query objlist callback: return TRUE if obj type matches "this_type" */

    /* title for inventory list of specific type */

    /* muse.c */



    /* rumors.c */
    /* rumor size variables are signed so that value -1
                           * can be used as a flag */
    /* rumor start offsets are unsigned due
                                     * to use of %lx format */
    /* rumor end offsets are signed because they're
                          * compared with [dlb_]ftell() */

    /* sp_lev.c */


    /* timeout.c */
    /* ordered timer list */
    /* "active" */

    /* topten.c */


    /* uhitm.c */
    /* 0: single hit; 1: first of 2; 2: second of 2 */






    /* botl.c */


    /* decl.c */


    /* role.c */
    /* player's role. May be munged in role_init() */
    /* player's race. May be munged in role_init() */

    /* save.c */


    /* new stuff */





    /* botl.c */


    /* end.c */


    /* mhitm.c */


    /* mklev.c */



    /* mon.c */


    /* pickup.c */

    /* list of menu classes for query_objlist() and allow_category callback
       (with room for all object classes, 'u'npaid, BUCX, and terminator) */


    /* vision.c */
    /* used in cansee() and couldsee() macros */
    /* min could see indices */
    /* max could see indices */


    /* new stuff */







    /* decl.c */
    /* count of monsters meeting criteria */


    /* do_wear.c */


    /* symbols.c */
    /* the current warning display symbols */

    /* files.c */


    /* hack.c */
    /* current weight_cap(); valid after call to inv_weight() */

    /* mkmaze.c */


    /* new */
    /* wintype.h */
    /* were.c, allmain.c */






    /* decl.c */


    /* lock.c */


    /* objnam.c */
    /* obuf[] returned by xname(), for use in doname() for
                   * bounds checking; differs from xname() return value
                   * due to reserving PREFIX bytes at start and possibly
                   * skipping leading "the " after constructing result */

    /* sp_lev.c */







    /* decl.c */



    /* pline.c */
    /* work buffer for You(), &c and verbalize() */



    /* sp_lev.c */







    /* mon.c */


    /* muse.c */
    /* for wands which use mbhitm and are zapped at
                        * players.  We usually want an oseen local to
                        * the function, but this is impossible since the
                        * function mbhitm has to be compatible with the
                        * normal zap routines, and those routines don't
                        * remember who zapped the wand. */





    /* dungeon.c */
    /* dungeon branch list */
    /* mkmaze.c */

    /* o_init.c */
    /* make bases[MAXOCLASSES+1] available */



    /* decl.c */




    /* dungeon.c */
    /* ini'ed by init_dungeon() */

    /* decl.c */

    /* array of door locations */
    /* doors-array allocated size */
    /* o_init.c */




    /* decl.c */




    /* decl.c */
    /* current process id */



    /* decl.c */




    /* decl.c */




    /* decl.c */
    /* last seen/touched dungeon typ */
    /* level map */




    /* dungeon.c */
    /*DUNGEON_OVERVIEW*/
    /* decl.c */
    /* turn counter */




    /* dungeon.c */
    /* number of dungeons (also used in mklev.c and do.c) */
    /* files.c */

    /* mkroom.c */

    /* region.c */




    /* rumors.c */
    /* oracles are handled differently from rumors... */


    /* other */
    /* level timestamp */



    /* decl.c */
    /* player name */





    /* quest.c */




    /* mkroom.c */




    /* decl.c */





    /* decl.c */

    /* timeout.c */




    /* decl.c */




    /* reserved */





    /* mkmaze.c */
    /* level boundaries x */



    /* mkmaze.c */
    /* level boundaries y */
















































/* flags describing game's current state */


    /* used to zero out a struct obj */
    /* used to zero out a struct monst */
    /* used to zero out union any */
    /* used to zero out NhRect */
import { c_color_names } from "./decl.js";
import { c_common_strings } from "./decl.js";
import { gt } from "./decl.js";
