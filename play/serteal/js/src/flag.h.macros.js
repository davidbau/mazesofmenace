/* NetHack 5.0	flag.h	$NHDT-Date: 1744860497 2025/04/16 19:28:17 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.251 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */

/* If you change the flag structure make sure you increment EDITLEVEL in   */
/* patchlevel.h if needed.  Changing the instance_flags structure does     */
/* not require incrementing EDITLEVEL.                                     */




/*
 * Persistent flags that are saved and restored with the game.
 *
 */


    /* allow dungeon sound messages */
    /* show armor info on status lines */
    /* MRKR: Automatically dig */
    /* Automatically fill quiver */
    /* open doors by walking into them */
    /* True early in each game; affects feedback */
    /* enable checking for mail */
    /* allow saving/loading bones */
    /* confirm before hitting tame monsters */
    /* show shadows in lit rooms */
    /* in debugging mode (aka wizard mode) */
export function wizard() { return flags.debug; }
    /* list all own scores */
    /* in exploration mode (aka discover mode) */
export function discover() { return flags.explore; }

    /* it's Friday the 13th */
    /* for BUCX filtering, whether gold is X or U */
    /* look in data file for info about stuff */
    /* show helpful hints? */
    /* ask if player wants tutorial level? */
    /* ignore interrupts */
    /* maybe omit "uncursed" status in inventory */
    /* checkpoint as appropriate; INSURANCE */
    /* let objects keep their inventory symbol */
    /* print game entry "story" */
    /* show a dark corr as lit if it is in sight */
    /* give feedback for unobscured furniture */
    /* give feedback when bumping walls */
    /* `timed_delay' option for display effects */
    /* items you dropped may be autopicked */
    /* OK to send nulls to the terminal */
    /* whether you pickup or move and look */
    /* auto-pickup items stolen by a monster */
    /* auto-pickup items you threw */
    /* When wielding, push old weapon into second slot */
    /* True disables map browsing during random
                              * clairvoyance */
    /* space means rest */
    /* give complete protection to the dog */
    /* prevent wait or search next to hostile */
    /* show experience points */
    /* show score */
    /* show version on status lines */
    /* whether the bell rings or not */
    /* sorted inventory */
    /* show "resisting" special FX (Scott Bigham) */
    /* use standout for --More-- */
    /* show terrain info on status lines */
    /* display elapsed 'time' */
    /* print tombstone */
    /* max battle info */
    /* show weapon info on status lines */
    /* describe desired score list */
    /* locked door/chest action */








    /* alternate confirmation prompting */













    /* flag mask for 'showvers' option */
    /* mask bits for 'versinfo'; numeric order does not match display order
       which is "name branch number" */



    /* maximum burden before prompt */
    /* controls feedback when walking over objects */
    /* order of dodiscovery/doclassdisco output: o,s,c,a */
    /* 'n'=none, 'l'=loot (pickup), 'f'=full ('l'+invent) */
    /* [uint_8] order of vanquished monsters: 0..7 */









    /* disclose various
                                                      info upon exit */
    /* User interface style setting */
    /* don't easily let user overflow fruit limit */

    /* KMH, role patch -- Variables used during startup.
     *
     * If the user wishes to select a role, race, gender, and/or alignment
     * during startup, the choices should be recorded here.  This
     * might be specified through command-line options, environmental
     * variables, a popup dialog box, menus, etc.
     *
     * These values are each an index into an array.  They are not
     * characters or letters, because that limits us to 26 roles.
     * They are not booleans, because someday someone may need a neuter
     * gender.  Negative values are used to indicate that the user
     * hasn't yet specified that particular value.  If you determine
     * that the user wants a random choice, then you should set an
     * appropriate random value; if you just left the negative value,
     * the user would be asked again!
     *
     * These variables are stored here because the u structure is
     * cleared during character initialization, and because the
     * flags structure is restored for saved games.  Thus, we can
     * use the same parameters to build the role entry for both
     * new and restored games.
     *
     * These variables should not be referred to after the character
     * is initialized or restored (specifically, after role_init()
     * is called).
     */
    /* starting role      (index into roles[])   */
    /* starting race      (index into races[])   */
    /* starting gender    (index into genders[]) */
    /* starting alignment (index into aligns[])  */
    /* randomly assign everything not specified */
    /* deity selection for priest character */
    /* Items which were in iflags in 3.4.x to preserve savefile compatibility
     */
    /* use "a/b/c" rather than "o/i/b" when looting */
    /* show hero glyph by race rather than by role */
    /* allow travel command */
    /* update screen display during run moves */











/*
 * Flags that are set each time the game is started.
 * These are not saved with the game.
 *
 */

/* values for iflags.getpos_coords */












































    /* use msg_loc for plined messages */
    /* accessiblemsg: location */
    /* msg when hero notices a monster */
    /* temp disable mon_notices */
    /* msg when hero sees monster move */
    /* msg when map glyphs change */


/* Use notice_mon_off() / notice_mon_on() to temporarily disable
   noticing the monsters in the vision code - perhaps the game
   needs to output some other messages in between.
   Call notice_all_mons() afterwards to catch up. */
export function notice_mon_off() { do { a11y.mon_notices_blocked++; } while(0) }
export function notice_mon_on() { do { if (--a11y.mon_notices_blocked < 0) { 
            impossible(_("mon_notices_blocked<0"));                    
            a11y.mon_notices_blocked = 0;                           
        } } while(0) }







/*
 * Stuff that really isn't option or platform related and does not
 * get saved and restored.  They are set and cleared during the game
 * to control the internal behavior of various NetHack functions
 * and probably warrant a structure of their own elsewhere some day.
 */

    /* X11 hack: askname() might not set svp.plname */
    /* fuzzing requested on command line but not active
                            * yet (to allow interactive initialization prior
                            * to input becoming taken over);
                            * True => enable fuzzer when entering moveloop */
    /* use menu when mouseclick on yourself */
    /* platform should perform a checkpoint update
                              * if waiting for input longer than 10 seconds */
    /* gold symbol is ' '? */
    /* executing a lua script */
    /* doing lua tests */
    /* terminal is gone, abort abort abort */
    /* level change ignores pets (for tutorial) */
    /* extra flag for xname() used when it's called
                                * indirectly so we can't use xname_flags() */
    /* use a menu for yes/no queries */
    /* save getpos() positioning in do-again queue */
    /* unseen pet is dying */
    /* extra message reporting damage hero has taken */
    /* at least one custom. was specified */
    /* fuzz testing */
    /* only valid during end of game disclosure */
    /* also only valid during end of game disclosure */
    /* move_into_trap() -> spoteffects() -> dotrap() */
    /* as input to getdir(): non-zero, accept simulated
                            * click that's not adjacent to or on hero;
                            * as output from getdir(): simulated button used
                            * 0 (none) or CLICK_1 (left) or CLICK_2 (right) */
    /* GFILTER_foo */
    /* hack for Boots_off() */
    /* indicator of last message player saw */
    /* value of 'menu_objsyms' option;
                            * ought to be in flags rather than iflags */
    /* true to force full identification of objects */
    /* hack for parse_config_line() */
    /* # of dead monsters still on fmon list */
    /* count of messages issued before window_inited */
    /* controls doname() for unpaid objects */
    /* for getpos()'s autodescribe during #terrain */






    /* display background colors on a map position */



    /* coordinates for travel_cache */
    /* display travel path (#if DEBUG only) */
    /* true if init_nhwindows() completed */
    /* true if vision is ready */
    /* run sanity checks */
    /* skip next sanity check */
    /* debug: allow overwriting stairs */
    /* debug: prevent monster generation */
    /* debug: prevent hunger */
    /* debug: prevent pline going to UI */
    /* debug: control monster polymorphs */
    /* debug: control monster teleports */
    /* doing the dumplog right now? */
    /* is a command being parsed? */
     /* suppress terminate during options parsing, for --showpaths */


    /* stuff that is related to options and/or user or platform preferences
     */
    /* hint: # of top lines to save */
    /* show coordinates when getting cursor position */
    /* 0 = invert toggles every item;
                           * 1 = invert skips 'all items' item */
    /* index into terrain_descr[] for botl */
    /* CLR_ and ATR_ for menu headings */
    /* store how many colors terminal is capable of */
    /* force use of truecolor */

    /* Alt+c sends ESC c rather than M-c */

    /* autodescribe mode in getpos() */
    /* in cbreak mode, rogue format */
    /* deferred entry into explore mode */
    /* terrain change message vs slipping on ice */
    /* 1 to echo characters */
    /* always menu when handling inventory */
    /* mark piles of objects with a hilite */
    /* Show obj symbol in menu headings; controlled
                               * by 'menuobjsyms' */
    /* Draw menus over the map */
    /* Flag for overloaded use of 'm' prefix
                               * on some non-move commands */
    /* Use tabs to separate option menu fields */
    /* print news */
    /* use numbers for movement commands */
    /* display persistent inventory window */
    /* need to try again */
    /* display price quotes on unIDd objects */
    /* can change hero name during role selection */
    /* we are changing hero name */
    /* master on/off switch for using soundlib */
    /* allow updates to bottom status lines;
                               * disable to avoid excessive noise when using
                               * a screen reader (use ^X to review status) */
    /* ending list in window instead of stdout */
    /* True iff hero is a monk and wearing a suit */
    /* use background glyph when appropriate */
    /* use color in menus; only if wc_color */
    /* use object glyphs in menus, if the port
                               * supports it; controlled by 'menuobjsyms' */

    /* number of moves to leave a temp hilite lit */
    /* time when oldest temp hilite should be unlit */

    /* enable text-to-speech or other talking */
    /* write zero-compressed save files */
    /* alternative to zerocomp; run-length encoding
                               * compression of levels when writing savefile */
    /* ice_descr()'s classification of ice terrain */
    /* 'mention_decor' just mentioned this */
    /* for num_pad==True, controls how 5 behaves
                               * and/or 789456123 vs phone-style 123456789;
                               * for False, qwertY vs qwertZ */
    /* what to display in persistent invent window
                               * 0: nothing, 1: all inventory except gold,
                               * 2: full including gold, 8: in-use items only,
                               * 5|6: 1|2 with invent letters shown in empty
                               * slots (TTY only: 'sparse' modes) */
    /* symbol for boulder display */
    /* type of old message window to use */
    /* extended commands use menu interface */

    /* use IBM or ST BIOS calls when appropriate */


    /* whether can use rawio (IOCTL call) */







    /* has a vga adapter */
    /* use the vga adapter */
    /* has a VESA-capable VGA adapter */
    /* use the VESA-capable VGA adapter */
    /* currently in graphics mode */


    /* mail is initialized */
    /* mail is awaiting display */


    /* output console codes for tile support in TTY */


    /* output console codes for sound support in TTY*/

    /* provide detailed assistance for some comnds */
    /* autowield launcher when using fire-command */
    /* display weight of everything in wizard mode */
    /* test gender info from core in window port */
    /* support customcolors defined in glyphmap */
    /* support customsymbols defined in glyphmap */
    /*
     * Window capability support.
     */
    /* use color graphics                  */
    /* hilight pets                        */
    /* show map using traditional ascii    */
    /* show map using tiles                */
    /* preload tiles into memory           */
    /* tile width                          */
    /* tile height                         */
    /* name of tile file;overrides default */
    /* use inverse video for some things   */
    /*  status win at top|bot|right|left   */
    /* message win at top|bot|right|left   */
    /* show more old messages at a time    */

    /* points to foregrnd color name for menu win   */
    /* points to backgrnd color name for menu win   */
    /* points to foregrnd color name for msg win */
    /* points to backgrnd color name for msg win */
    /* points to foregrnd color name for status   */
    /* points to backgrnd color name for status   */
    /* points to foregrnd color name for text win   */
    /* points to backgrnd color name for text win   */



    /* points to font name for the map win */
    /* points to font name for message win */
    /* points to font name for status win  */
    /* points to font name for menu win    */
    /* points to font name for text win    */
    /* font size for the map win           */
    /* font size for the message window    */
    /* font size for the status window     */
    /* font size for the menu window       */
    /* font size for text windows          */
    /* scroll this amount at scroll_margin */
    /* scroll map when this far from the edge */
    /* specify map viewing options, mostly
                             * for backward compatibility */
    /* method of choosing character */

    /* X resolution of screen */
    /* Y resolution of screen */

    /* display an opening splash screen or not */
    /* put queries in pop up dialogs instead of
                                 * in the message window */
    /* allow eight bit input               */
    /* run fullscreen */
    /* use software keyboard */
    /* wrap text */
    /* display a menu of user's saved games */
    /* try to use dark-gray color for black glyphs */
    /* show graphical bar representing hit points */
    /* allow colours in gui (outside map) */
    /* allow mouse support */
    /* terminal width, in characters */
    /* terminal height, in characters */
    /* default = 2, curses can handle 3 */
    /* display borders on NetHack windows */
    /* text attributes for pet */





    /* copies of values in struct u, used during detection when the
       originals are temporarily cleared; kept here rather than
       locally so that they can be restored during a hangup save */




    /* windowtype can't change from configfile */
    /* pick a windowport and store it in
                                    chosen_windowport[], but do not switch to
                                    it in the midst of options processing */
    /* 'struct obj *'; Mjollnir or aklys */
    /* flag for tracking failed wizmode auth */
    /* ditto for explore mode */
    /* obsolete options can point at this, it isn't used */


/*
 * Old, deprecated names
 */


















/* last_msg values
 * Usage:
 *  pline("some message");
 *    pline: vsprintf + putstr + iflags.last_msg = PLNMSG_UNKNOWN;
 *  iflags.last_msg = PLNMSG_some_message;
 * and subsequent code can adjust the next message if it is affected
 * by some_message.  The next message will clear iflags.last_msg.
 */

    /* arbitrary */
    /* "you see <single item> here" */
    /* scroll of fire */
    /* explode() feedback */
    /* create_gas_cloud() feedback */
    /* "the <obj> glows <color>" */
    /* xname/doname only, for #tip */
    /* overriding death in explore/wizard mode */
    /* leaving water */
    /* growl() gave some message */
    /* hero saw a monster hide under something */
    /* thief (nymph, monkey) taking worn item */
    /* 'none of the above' */


/* runmode options */

    /* don't update display until movement stops */
    /* update display every 7 steps */
    /* update display every single step */
    /* walk w/ extra delay after each update */


/* paranoid confirmation prompting */
/* any yes confirmations also require explicit no (or ESC) to reject */
export function ParanoidConfirm() { return (+((flags.paranoia_bits & PARANOID_CONFIRM) != 0)); }
/* quit: yes vs y for "Really quit?" and "Enter explore mode?" */
export function ParanoidQuit() { return (+((flags.paranoia_bits & PARANOID_QUIT) != 0)); }
/* die: yes vs y for "Die?" (dying in explore mode or wizard mode) */
export function ParanoidDie() { return (+((flags.paranoia_bits & PARANOID_DIE) != 0)); }
/* hit: yes vs y for "Save bones?" in wizard mode */
export function ParanoidBones() { return (+((flags.paranoia_bits & PARANOID_BONES) != 0)); }
/* hit: yes vs y for "Really attack <the peaceful monster>?" */
export function ParanoidHit() { return (+((flags.paranoia_bits & PARANOID_HIT) != 0)); }
/* pray: ask "Really pray?" (accepts y answer, doesn't require yes),
   taking over for the old prayconfirm boolean option */
export function ParanoidPray() { return (+((flags.paranoia_bits & PARANOID_PRAY) != 0)); }
/* remove: remove ('R') and takeoff ('T') commands prompt for an inventory
   item even when only one accessory or piece of armor is currently worn */
export function ParanoidRemove() { return (+((flags.paranoia_bits & PARANOID_REMOVE) != 0)); }
/* breakwand: Applying a wand */
export function ParanoidBreakwand() { return (+((flags.paranoia_bits & PARANOID_BREAKWAND) != 0)); }
/* werechange: accepting randomly timed werecreature change to transform
   from human to creature or vice versa while having polymorph control */
export function ParanoidWerechange() { return (+((flags.paranoia_bits & PARANOID_WERECHANGE) != 0)); }
/* continue eating: prompt given _after_first_bite_ when eating something
   while satiated */
export function ParanoidEating() { return (+((flags.paranoia_bits & PARANOID_EATING) != 0)); }
/* Prevent going into lava or water without explicitly forcing it */
export function ParanoidSwim() { return (+((flags.paranoia_bits & PARANOID_SWIM) != 0)); }
/* Prevent going onto/into known trap unless it is harmless */
export function ParanoidTrap() { return (+((flags.paranoia_bits & PARANOID_TRAP) != 0)); }
/* Require confirmation for choosing 'A' in class menu for menustyle:Full */
export function ParanoidAutoAll() { return (+((flags.paranoia_bits & PARANOID_AUTOALL) != 0)); }

/* command parsing, mainly dealing with number_pad handling;
   not saved and restored */


/* forward declaration sufficient to declare pointers */
/* from func_tab.h */
import { PARANOID_AUTOALL } from "./flag.h.js";
import { PARANOID_BONES } from "./flag.h.js";
import { PARANOID_BREAKWAND } from "./flag.h.js";
import { PARANOID_CONFIRM } from "./flag.h.js";
import { PARANOID_DIE } from "./flag.h.js";
import { PARANOID_EATING } from "./flag.h.js";
import { PARANOID_HIT } from "./flag.h.js";
import { PARANOID_PRAY } from "./flag.h.js";
import { PARANOID_QUIT } from "./flag.h.js";
import { PARANOID_REMOVE } from "./flag.h.js";
import { PARANOID_SWIM } from "./flag.h.js";
import { PARANOID_TRAP } from "./flag.h.js";
import { PARANOID_WERECHANGE } from "./flag.h.js";
import { _ } from "../rt/strings.js";
import { a11y } from "./decl.js";
import { flags } from "./decl.js";
import { impossible } from "./pline.js";
