/* NetHack 5.0	display.h	$NHDT-Date: 1725653008 2024/09/06 20:03:28 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.106 $ */
/* Copyright (c) Dean Luick, with acknowledgements to Kevin Darcy */
/* and Dave Cohrs, 1990.                                          */
/* NetHack may be freely redistributed.  See license for details. */











/*
 * vobj_at()
 *
 * Returns the head of the list of objects that the player can see
 * at location (x,y).  [Vestige of unimplemented invisible objects.]
 */


/*
 * sensemon()
 *
 * Returns true if the hero can sense the given monster.  This includes
 * monsters that are hiding or mimicking other monsters.
 *
 * [5.0] Note: the map doesn't display any monsters when hero is swallowed
 * (or display non-adjacent, non-submerged ones when hero is underwater),
 * so treat those situations as blocking telepathy, detection, and warning
 * even though conceptually they shouldn't do so.
 *
 * [5.0 also] The macros whose name begins with an underscore have been
 * converted to functions in order to have compilers generate smaller code.
 * The retained underscore versions are still used in display.c but should
 * only be used in other situations if the function calls actually produce
 * noticeably slower processing.
 */











/* organized to perform cheaper tests first;
   is_pool() vs is_pool_or_lava(): hero who is underwater can see adjacent
   lava, but presumably any monster there is on top so not sensed */





/*
 * mon_warning() is used to warn of any dangerous monsters in your
 * vicinity, and a glyph representing the warning level is displayed.
 */




/*
 * mon_visible()
 *
 * Returns true if the hero can see the monster.  It is assumed that the
 * hero can physically see the location of the monster.  The function
 * vobj_at() returns a pointer to an object that the hero can see there.
 * Infravision is not taken into account.
 *
 * Note:  not reliable for concealed mimics.  They don't have
 * 'mon->mundetected' set even when mimicking objects or furniture.
 * [Fixing this with a pair of mon->m_ap_type checks here (via either
 * 'typ!=object && typ!=furniture' or 'typ==nothing || typ==monster')
 * will require reviewing every instance of mon_visible(), canseemon(),
 * canspotmon(), is_safemon() and perhaps others.  Fixing it by setting
 * mon->mundetected when concealed would be better but also require
 * reviewing all those instances and also existing mundetected instances.]
 */













/*
 * see_with_infrared()
 *
 * This function is true if the player can see a monster using infravision.
 * The caller must check for invisibility (invisible monsters are also
 * invisible to infravision), because this is usually called from within
 * canseemon() or canspotmon() which already check that.
 */




/*
 * canseemon()
 *
 * This is the globally used canseemon().  It is not called within the display
 * routines.  Like mon_visible(), but it checks to see if the hero sees the
 * location instead of assuming it.  (And also considers worms.)
 */





/*
 * canspotmon(mon)
 *
 * This function checks whether you can either see a monster or sense it by
 * telepathy, and is what you usually call for monsters about which nothing is
 * known.
 */


/* knowninvisible(mon)
 * This one checks to see if you know a monster is both there and invisible.
 * 1) If you can see the monster and have see invisible, it is assumed the
 * monster is transparent, but visible in some manner.  (Earlier versions of
 * Nethack were really inconsistent on this.)
 * 2) If you can't see the monster, but can see its location and you have
 * telepathy that works when you can see, you can tell that there is a
 * creature in an apparently empty spot.
 * Infravision is not relevant; we assume that invisible monsters are also
 * invisible to infravision.
 * [5.0: the macro definition erroneously started with 'mtmp->minvis' for
 * over 20 years.  The one place it's used called it as knowninvisible(mtmp)
 * so worked by coincidence when there was no argument expansion involved
 * on the first line.]
 */







/*
 * is_safemon(mon)
 *
 * A special case check used in attack() and domove().  Placing the
 * definition here is convenient.  No longer limited to pets.
 */




/*
 * canseeself()
 * senseself()
 * canspotself()
 *
 * This returns true if the hero can see her/himself.
 *
 * Sensing yourself by touch is treated as seeing yourself, even if
 * unable to see.  So when blind, being invisible won't affect your
 * self-perception, and when swallowed, the enclosing monster touches.
 */




/*
 * random_monster()
 * random_object()
 *
 * Respectively return a random monster or object.
 * random_object() won't return STRANGE_OBJECT or the generic objects.
 * -/+ FIRST_OBJECT is used to skip it and them.
 */



/*
 * what_obj()
 * what_mon()
 *
 * If hallucinating, choose a random object/monster, otherwise, use the one
 * given. Use the given rng to handle hallucination.
 */



/*
 * newsym_rn2
 *
 * An appropriate random number generator for use with newsym(), when
 * randomness is needed there. This is currently hardcoded as
 * rn2_on_display_rng, but is futureproofed for cases where we might
 * want to prevent display-random objects entering the character's
 * memory (this isn't important at present but may be if we need
 * reproducible gameplay for some reason).
 */


/*
 * covers_objects()
 * covers_traps()
 *
 * These routines are true if what is really at the given location will
 * "cover" any objects or traps that might be there.
 */






/*
 * tmp_at() control calls.
 */
export const DISP_BEAM = (-1);
export const DISP_ALL = (-2);
export const DISP_TETHER = (-3);
export const DISP_FLASH = (-4);
export const DISP_ALWAYS = (-5);
export const DISP_CHANGE = (-6);
export const DISP_END = (-7);
export const DISP_FREEMEM = (-8);

/* Total number of cmap indices in the shield_static[] array. */
export const SHIELD_COUNT = 21;
export const BACKTRACK = (-1);

/*
 * display_self()
 *
 * Display the hero.  It is assumed that all checks necessary to determine
 * _if_ the hero can be seen have already been done.
 */
















/*
 * NetHack glyphs
 *
 * A glyph is an abstraction that represents a _unique_ monster, object,
 * dungeon part, or effect.  The uniqueness is important.  For example,
 * It is not enough to have four (one for each "direction") zap beam glyphs,
 * we need a set of four for each beam type.  Why go to so much trouble?
 * Because it is possible that any given window dependent display driver
 * [print_glyph()] can produce something different for each type of glyph.
 * That is, a beam of cold and a beam of fire would not only be different
 * colors, but would also be represented by different symbols.
 */



/* 3.6.3: poison gas zap used to be yellow and acid zap was green,
   which conflicted with the corresponding dragon colors */

    export const zap_color_missile = HI_ZAP;
    export const zap_color_fire = CLR_ORANGE;
    export const zap_color_frost = CLR_WHITE;
    export const zap_color_sleep = HI_ZAP;
    export const zap_color_death = CLR_BLACK;
    export const zap_color_lightning = CLR_WHITE;
    export const zap_color_poison_gas = CLR_GREEN;
    export const zap_color_acid = CLR_YELLOW;



    export const altar_color_unaligned = CLR_RED;

        /* On OSX with TERM=xterm-color256 these render as
         *  white -> tty: gray, curses: ok
         *  gray  -> both tty and curses: black
         *  black -> both tty and curses: blue
         *  red   -> both tty and curses: ok.
         * Since the colors have specific associations (with the
         * unicorns matched with each alignment), we shouldn't use
         * scrambled colors and we don't have sufficient information
         * to handle platform-specific color variations.
         */




    export const altar_color_chaotic = CLR_GRAY;
    export const altar_color_neutral = CLR_GRAY;
    export const altar_color_lawful = CLR_GRAY;

    export const altar_color_other = CLR_BRIGHT_MAGENTA;


/* types of explosions */

    export const EXPL_DARK = 0;
    export const EXPL_NOXIOUS = 1;
    export const EXPL_MUDDY = 2;
    export const EXPL_WET = 3;
    export const EXPL_MAGICAL = 4;
    export const EXPL_FIERY = 5;
    export const EXPL_FROSTY = 6;
    export const EXPL_MAX = 7;


/* above plus this redundant? */

    export const expl_dark = 0;
    export const expl_noxious = expl_dark + 1;
    export const expl_muddy = expl_noxious + 1;
    export const expl_wet = expl_muddy + 1;
    export const expl_magical = expl_wet + 1;
    export const expl_fiery = expl_magical + 1;
    export const expl_frosty = expl_fiery + 1;



    export const explode_color_dark = CLR_BLACK;
    export const explode_color_noxious = CLR_GREEN;
    export const explode_color_muddy = CLR_BROWN;
    export const explode_color_wet = CLR_BLUE;
    export const explode_color_magical = CLR_MAGENTA;
    export const explode_color_fiery = CLR_ORANGE;
    export const explode_color_frosty = CLR_WHITE;


    export const altar_unaligned = 0;
    export const altar_chaotic = altar_unaligned + 1;
    export const altar_neutral = altar_chaotic + 1;
    export const altar_lawful = altar_neutral + 1;
    export const altar_other = altar_lawful + 1;

export const main_walls = 0; export const mines_walls = main_walls + 1; export const gehennom_walls = mines_walls + 1;
                    export const knox_walls = gehennom_walls + 1; export const sokoban_walls = knox_walls + 1;
/* glyphmod entries */
export const gm_nochange = 0; export const gm_newgame = gm_nochange + 1; export const gm_levelchange = gm_newgame + 1;
                                export const gm_optionchange = gm_levelchange + 1; export const gm_symchange = gm_optionchange + 1;
                                export const gm_accessibility_change = gm_symchange + 1;
export const NUM_ZAP = 8;

/*
 * Glyphs are grouped for easy accessibility:
 *
 * male monsters    Represents all the wild (not tame) male monsters.
 *                  Count: NUMMONS.
 *
 * female monsters  Represents all the wild (not tame) female monsters.
 *                  Count: NUMMONS.
 *
 * male pets        Represents all of the male tame monsters.
 *                  Count: NUMMONS.
 *
 * female pets      Represents all of the female tame monsters.
 *                  Count: NUMMONS.
 *
 * invisible        Invisible monster placeholder.
 *                  Count: 1.
 *
 * detect (male)    Represents all detected male monsters.
 *                  Count: NUMMONS.
 *
 * detect (female)  Represents all detected female monsters.
 *                  Count: NUMMONS.
 *
 * corpse           One for each monster (male/female not differentiated).
 *                  Count: NUMMONS.
 *
 * ridden (male)    Represents all male monsters being ridden.
 *                  Count: NUMMONS
 *
 * ridden (female)  Represents all female monsters being ridden.
 *                  Count: NUMMONS
 *
 * object           One for each type of object.  The first entry is
 *                  'strange object', the next 1..MAXOCLASSES-1 entries
 *                  are generic (one for each class, including one for
 *                  strange object's 'illobj class'), the rest are
 *                  regular objects.  Some members of the generic
 *                  subset are used to prevent color of potions, gems,
 *                  and spellbooks from being revealed when obj->dknown
 *                  hasn't been set, avoiding a bug which had been
 *                  present since day one of color support.
 *                  Count: NUM_OBJECTS
 *
 * Stone            Stone
 *                  Count: 1
 *
 * main walls       level walls (main)
 *                  Count: (S_trwall - S_vwall) + 1 = 11
 *
 * mines walls      level walls (mines)
 *                  Count: (S_trwall - S_vwall) + 1 = 11
 *
 * gehennom walls   level walls (gehennom)
 *                  Count: (S_trwall - S_vwall) + 1 = 11
 *
 * knox walls       level walls (knox)
 *                  Count: (S_trwall - S_vwall) + 1 = 11
 *
 * sokoban walls    level walls (sokoban)
 *                  Count: (S_trwall - S_vwall) + 1 = 11
 *
 * cmap A           S_ndoor through S_brdnladder
 *                  Count: (S_brdnladder - S_ndoor) + 1 = 19
 *
 * Altars           Altar (unaligned, chaotic, neutral, lawful, other)
 *                  Count: 5
 *
 * cmap B           S_grave through S_arrow_trap + TRAPNUM - 1
 *                  Count: (S_arrow_trap + (TRAPNUM - 1) - S_grave) = 39
 *
 * zap beams        set of four (there are four directions) HI_ZAP.
 *                  Count: 4 * NUM_ZAP
 *
 * cmap C           S_digbeam through S_goodpos
 *                  Count: (S_goodpos - S_digbeam) + 1 = 10
 *
 * swallow          A set of eight for each monster.  The eight positions
 *                  represent those surrounding the hero.  The monster
 *                  number is shifted over 3 positions and the swallow
 *                  position is stored in the lower three bits.
 *                  Count: NUMMONS << 3
 *
 * dark explosions        A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * noxious explosions     A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * muddy explosions       A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * wet explosions         A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * magical explosions     A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * fiery explosions       A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * frosty explosions      A set of nine.
 *                        Count: MAXEXPCHAR
 *
 * warning                A set of six representing the different warning
 *                        levels.
 *                        Count: 6
 *
 * statues (male)         One for each male monster.
 *                        Count: NUMMONS
 *
 * statues (female)       One for each female mo nster.
 *                        Count: NUMMONS
 *
 * objects piletop        Represents the top of a pile as well as
 *                        the object.
 *                        Count: NUM_OBJECTS
 *
 * bodies piletop         Represents the top of a pile as well as
 *                        the object, corpse in this case.
 *                        Count: NUMMONS
 *
 * male statues piletop   Represents the top of a pile as well as
 *                        the statue of a male monster.
 *                        Count: NUMMONS
 *
 * female statues piletop Represents the top of a pile as well as
 *                        the statue of a female monster.
 *                        Count: NUMMONS
 *
 * unexplored             One for unexplored areas of the map
 * nothing                Nothing but background
 *
 * The following are offsets used to convert to and from a glyph.
 */


    export const GLYPH_MON_OFF = 0;
    export const GLYPH_MON_MALE_OFF = (GLYPH_MON_OFF);
    export const GLYPH_MON_FEM_OFF = (NUMMONS + GLYPH_MON_MALE_OFF);
    export const GLYPH_PET_OFF = (NUMMONS + GLYPH_MON_FEM_OFF);
    export const GLYPH_PET_MALE_OFF = (GLYPH_PET_OFF);
    export const GLYPH_PET_FEM_OFF = (NUMMONS + GLYPH_PET_MALE_OFF);
    export const GLYPH_INVIS_OFF = (NUMMONS + GLYPH_PET_FEM_OFF);
    export const GLYPH_DETECT_OFF = (1 + GLYPH_INVIS_OFF);
    export const GLYPH_DETECT_MALE_OFF = (GLYPH_DETECT_OFF);
    export const GLYPH_DETECT_FEM_OFF = (NUMMONS + GLYPH_DETECT_MALE_OFF);
    export const GLYPH_BODY_OFF = (NUMMONS + GLYPH_DETECT_FEM_OFF);
    export const GLYPH_RIDDEN_OFF = (NUMMONS + GLYPH_BODY_OFF);
    export const GLYPH_RIDDEN_MALE_OFF = (GLYPH_RIDDEN_OFF);
    export const GLYPH_RIDDEN_FEM_OFF = (NUMMONS + GLYPH_RIDDEN_MALE_OFF);
    export const GLYPH_OBJ_OFF = (NUMMONS + GLYPH_RIDDEN_FEM_OFF);
    export const GLYPH_CMAP_OFF = (NUM_OBJECTS + GLYPH_OBJ_OFF);
    export const GLYPH_CMAP_STONE_OFF = (GLYPH_CMAP_OFF);
    export const GLYPH_CMAP_MAIN_OFF = (1 + GLYPH_CMAP_STONE_OFF);
    export const GLYPH_CMAP_MINES_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MAIN_OFF);
    export const GLYPH_CMAP_GEH_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MINES_OFF);
    export const GLYPH_CMAP_KNOX_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_GEH_OFF);
    export const GLYPH_CMAP_SOKO_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_KNOX_OFF);
    export const GLYPH_CMAP_A_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_SOKO_OFF);
    export const GLYPH_ALTAR_OFF = (((S_brdnladder - S_ndoor) + 1) + GLYPH_CMAP_A_OFF);
    export const GLYPH_CMAP_B_OFF = (5 + GLYPH_ALTAR_OFF);
    export const GLYPH_ZAP_OFF = ((S_arrow_trap + MAXTCHARS - S_grave) + GLYPH_CMAP_B_OFF);
    export const GLYPH_CMAP_C_OFF = ((NUM_ZAP << 2) + GLYPH_ZAP_OFF);
    export const GLYPH_SWALLOW_OFF = (((S_goodpos - S_digbeam) + 1) + GLYPH_CMAP_C_OFF);
    export const GLYPH_EXPLODE_OFF = ((NUMMONS << 3) + GLYPH_SWALLOW_OFF);
    export const GLYPH_EXPLODE_DARK_OFF = (GLYPH_EXPLODE_OFF);
    export const GLYPH_EXPLODE_NOXIOUS_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_DARK_OFF);
    export const GLYPH_EXPLODE_MUDDY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_NOXIOUS_OFF);
    export const GLYPH_EXPLODE_WET_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MUDDY_OFF);
    export const GLYPH_EXPLODE_MAGICAL_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_WET_OFF);
    export const GLYPH_EXPLODE_FIERY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MAGICAL_OFF);
    export const GLYPH_EXPLODE_FROSTY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FIERY_OFF);
    export const GLYPH_WARNING_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FROSTY_OFF);
    export const GLYPH_STATUE_OFF = (WARNCOUNT + GLYPH_WARNING_OFF);
    export const GLYPH_STATUE_MALE_OFF = (GLYPH_STATUE_OFF);
    export const GLYPH_STATUE_FEM_OFF = (NUMMONS + GLYPH_STATUE_MALE_OFF);
    export const GLYPH_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_FEM_OFF);
    export const GLYPH_OBJ_PILETOP_OFF = (GLYPH_PILETOP_OFF);
    export const GLYPH_BODY_PILETOP_OFF = (NUM_OBJECTS + GLYPH_OBJ_PILETOP_OFF);
    export const GLYPH_STATUE_MALE_PILETOP_OFF = (NUMMONS + GLYPH_BODY_PILETOP_OFF);
    export const GLYPH_STATUE_FEM_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_MALE_PILETOP_OFF);
    export const GLYPH_UNEXPLORED_OFF = (NUMMONS + GLYPH_STATUE_FEM_PILETOP_OFF);
    export const GLYPH_NOTHING_OFF = (GLYPH_UNEXPLORED_OFF + 1);
    export const MAX_GLYPH = GLYPH_NOTHING_OFF + 1;


export const NO_GLYPH = MAX_GLYPH;
export const GLYPH_INVISIBLE = GLYPH_INVIS_OFF;
export const GLYPH_UNEXPLORED = GLYPH_UNEXPLORED_OFF;
export const GLYPH_NOTHING = GLYPH_NOTHING_OFF;















/* treat unaligned as the default instead of explicitly checking for it;
   altar alignment uses 3 bits with 4 defined values and 4 unused ones */












/* not used, nor is it correct
#define zap_to_glyph(zaptype, cmap_idx) \
    ((((cmap_idx) - S_vbeam) + 1) + GLYPH_ZAP_OFF)
*/

/* EXPL_FIERY is the default explosion type */









/* cmap_walls_to_glyph(): return the glyph number for specified wall
   symbol; result varies by dungeon branch */








/* cmap_D0walls_to_glyph(): simpler version of cmap_walls_to_glyph()
   which returns the glyph that would be used in the main dungeon,
   regardless of hero's current location */



























/* Not affected by hallucination.  Gives a generic body for CORPSE */
/* MRKR: ...and the generic statue */














/* The hero's glyph when seen as a monster.
 */




/*
 * Change the given glyph into its given type.  Note:
 *      1) Pets, detected, and ridden monsters are animals and are converted
 *         to the proper monster number.
 *      2) Bodies are all mapped into the generic CORPSE object
 *      3) If handed a glyph out of range for the type, these functions
 *         will return NO_GLYPH (see exception below)
 *      4) glyph_to_swallow() does not return a showsyms[] index, but an
 *         offset from the first swallow symbol.  If handed something
 *         out of range, it will return zero (for lack of anything better
 *         to return).
 */































































/*
 * Return true if the given glyph is what we want.  Note that bodies are
 * considered objects.
 */






































/* final NUMMONS is legal array index because of trailing fencepost entry */



















/* boulder hides pile except when on top of another boulder;
   the otg_otmp assignment might occur multiple times in the same
   expression but there will always be sequence points in between */





/* used to hide info such as potion and gem color when not seen yet;
   stones and rock are excluded for gem class; LAST_SPELL includes blank
   spellbook but excludes novel and the Book of the Dead */































/* generic objects are after strange object (GLYPH_OBJ_OFF) and before
   other objects (GLYPH_OBJ_OFF + FIRST_OBJECT) */










































/* briefly used for Qt's "paper doll" inventory which shows map tiles for
   equipped objects; those vary like floor items during hallucination now
   so this isn't used anywhere [note: out of date since generic objs added] */

















/* final NUM_OBJECTS is legal array idx because of trailing fencepost entry */





























/* This has the unfortunate side effect of needing a global variable
   to store a result. 'otg_temp' is defined and declared in decl.{ch}.  */














/* MRKR: Statues now have glyphs corresponding to the monster they    */
/*       represent and look like monsters when you are hallucinating. */





















export const GLYPH_TRAP_OFF = (GLYPH_CMAP_B_OFF + (S_arrow_trap - S_grave));



















/* mgflags for altering map_glyphinfo() internal behavior */

export const MG_FLAG_NOOVERRIDE = 0x01;

/* Special mapped glyphflags encoded by reset_glyphmap() + map_glyphinfo() */
export const MG_HERO = 0x00001;
export const MG_CORPSE = 0x00002;
export const MG_INVIS = 0x00004;
export const MG_DETECT = 0x00008;
export const MG_PET = 0x00010;
export const MG_RIDDEN = 0x00020;
export const MG_STATUE = 0x00040;
export const MG_OBJPILE = 0x00080;
export const MG_BW_LAVA = 0x00100;

export const MG_BW_ICE = 0x00200;
export const MG_BW_SINK = 0x00200;

export const MG_BW_ENGR = 0x00200;
export const MG_NOTHING = 0x00400;
export const MG_UNEXPL = 0x00800;
export const MG_MALE = 0x01000;
export const MG_FEMALE = 0x02000;
export const MG_BADXY = 0x04000;

/* docrt(): re-draw whole screen; docrt_flags(): docrt() with more control */

    export const docrtRecalc = 0; /* full docrt(), recalculate what the map should show */
    export const docrtRefresh = 1; /* redraw_map(), draw what we think the map shows */
    export const docrtMapOnly = 2; /* ORed with Recalc or Refresh; draw the map but not
                       * status or perminv */
    export const docrtNocls = 4;


export const gbuf_entry = struct("gbuf_entry", {
    gnew: xint8, /* perhaps move this bit into the rm structure. */
    glyphinfo: "struct_glyphinfo",
});






/* If TILES_IN_GLYPHMAP is defined during build, this is defined
 * in the generated tile.c, complete with appropriate tile references in
 * the initialization.  Otherwise, it gets defined in display.c.
 */
import { CLR_BLACK } from "./color.h.js";
import { CLR_BLUE } from "./color.h.js";
import { CLR_BRIGHT_MAGENTA } from "./color.h.js";
import { CLR_BROWN } from "./color.h.js";
import { CLR_GRAY } from "./color.h.js";
import { CLR_GREEN } from "./color.h.js";
import { CLR_MAGENTA } from "./color.h.js";
import { CLR_ORANGE } from "./color.h.js";
import { CLR_RED } from "./color.h.js";
import { CLR_WHITE } from "./color.h.js";
import { CLR_YELLOW } from "./color.h.js";
import { HI_ZAP } from "./color.h.js";
import { S_arrow_trap } from "./defsym.h.js";
import { S_brdnladder } from "./defsym.h.js";
import { S_digbeam } from "./defsym.h.js";
import { S_goodpos } from "./defsym.h.js";
import { S_grave } from "./defsym.h.js";
import { S_ndoor } from "./defsym.h.js";
import { S_trwall } from "./defsym.h.js";
import { S_vwall } from "./defsym.h.js";
import { xint8 } from "./global.h.js";
import { NUMMONS } from "./monsters.h.js";
import { NUM_OBJECTS } from "./objects.h.js";
import { MAXEXPCHARS } from "./sym.h.js";
import { MAXTCHARS } from "./sym.h.js";
import { WARNCOUNT } from "./sym.h.js";
import { struct } from "../rt/struct.js";
