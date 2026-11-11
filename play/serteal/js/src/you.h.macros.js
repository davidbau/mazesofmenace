/* NetHack 5.0	you.h	$NHDT-Date: 1702349061 2023/12/12 02:44:21 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.75 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2016. */
/* NetHack may be freely redistributed.  See license for details. */











/*** Substructures ***/


    /* name when character is male */
    /* when female; null if same as male */



    /* "fix" is the fixed amount, "rnd" is the random amount */
    /* at character initialization */
    /* gained per level <  gu.urole.xlev */
    /* gained per level >= gu.urole.xlev */



    /* carrying Amulet   */
    /* carrying Bell     */
    /* carrying Book     */
    /* carrying Candelabrum */
    /* carrying the Quest Artifact */




    /* received at least 1 cheap oracle */
    /*  "  expensive oracle */
    /* read a passage from a novel */
    /* called by Quest leader to do task */
    /* expelled from the Quest dungeon */
    /* successfully completed Quest task */
    /* 1=know about, 2=heard passtune, 3=bridge has
                                * been destroyed so tune has become useless */
    /* opened the drawbridge */
    /* invoked Gate to the Sanctum level */
    /* entered Gehennom via Valley */
    /* became Hand of Elbereth */
    /* killed the wiz */
    /* stepped on "vibrating square" */
    /* has offered the Amulet */

    /* has gained a wish from the Amulet */
    /* 7 free bits */


/*
 * Achievements:  milestones reached during the current game.
 * Numerical order of these matters because they've been encoded in
 * a bitmask in xlogfile.  Reordering would break decoding that.
 * Aside from that, the number isn't significant--they're recorded
 * and eventually disclosed in the order achieved.
 *
 * Since xlogfile could be post-processed by unknown tools, we should
 * limit these to 31 total (it's possible that 32-bit signed longs are
 * the best such tools can offer).  Eventually that is likely to need
 * to change, probably by giving xlogfile an achieve2 field rather
 * than by assuming that 64-bit longs are viable or by squeezing in a
 * 32nd entry by switching to unsigned long.
 */

    /* acquired Bell of Opening */
    /* entered Gehennom */
    /* acquired Candelabrum of Invocation */
    /* acquired Book of the Dead */
    /* performed invocation to gain access to Sanctum */
    /* acquired The Amulet */
    /* entered end game */
    /* entered Astral Plane */
    /* ascended */
    /* acquired Mines' End luckstone */
    /* acquired Sokoban bag or amulet */
    /* killed Medusa */
    /* hero was always blond, no, blind */
    /* hero never wore armor */
    /* 1 through 14 were present in 3.6.x; the rest are newer; first,
       some easier ones so less skilled players can have achievements */
    /* entered Gnomish Mines */
    /* reached Minetown */
    /* entered a shop */
    /* entered a temple */
    /* consulted the Oracle */
    /* read at least one passage from a Discworld novel */
    /* entered Sokoban */
    /* entered Bigroom (not guaranteed to be in every dgn) */
    /* role's rank titles, beyond first (#0 at level one, not an achievement);
       23..30 are negated if hero is female at the time new rank is gained
       so that disclosing them can use the gender which applied at the time */


    /* discovered the castle drawbridge's open/close tune */
    /* allocate room for 31 plus a slot for 0 terminator */

    /*
     * Other potential achievements to track (this comment briefly resided
     * in encodeachieve(topten.c) and has been revised since moving here:
     *  AC <= 0, AC <= -10, AC <= -20 (stop there; lower is better but
     *    not something to encourage with achievements),
     *  got quest summons,
     *  entered quest branch,
     *  chatted with leader,
     *  entered second or lower quest level (implies leader gave the Ok),
     *  entered last quest level,
     *  defeated nemesis (not same as acquiring Bell or artifact),
     *  completed quest (formally, by bringing artifact to leader),
     *  entered rogue level,
     *  entered Fort Ludios level/branch (not guaranteed to be achievable),
     *  entered Medusa level,
     *  entered castle level,
     *  obtained castle wand (handle similarly to mines and sokoban prizes),
     *  passed Valley level (entered-Gehennom already covers Valley itself),
     *  [assorted demon lairs?],
     *  entered Vlad's tower branch,
     *  defeated Vlad (not same as acquiring Candelabrum),
     *  entered Wizard's tower area within relevant level,
     *  defeated Wizard,
     *  found vibrating square,
     *  entered sanctum level (maybe not; too close to performed-invocation),
     *  [defeated Famine, defeated Pestilence, defeated Death]
     */


    /* accumulated playing time in seconds */
    /* time game was started or restored or 'realtime'
                            was last updated (savegamestate for checkpoint) */
    /* end of 'realtime' interval: time of save or
                            end of game; used for topten/logfile/xlogfile */


/* KMH, conduct --
 * These are voluntary challenges.  Each field denotes the number of
 * times a challenge has been violated.
 */
/* number of times... */
    /* eaten any animal */
    /* ... or any animal byproduct */
    /* ... or any comestible */
    /* used prayer, priest, or altar */
    /* hit a monster with a weapon */
    /* killed a monster yourself */
    /* read something (other than BotD) */
    /* polymorphed an object */
    /* transformed yourself */
    /* used a wish */
    /* wished for an artifact */
    /* hf uses for elbereth;for hf savefile compatiblity */
    /* violated special 'rules' in Sokoban */
    /* obtained a pet */
    /* genocides already listed at end of game */







    /* permanently blind */
    /* has not worn any armor, ever */
    /* permanently deaf */
    /* no starting inventory */
    /* starting inventory/attr rerolling enabled */



    /* # of bones files loaded */
    /* # of rerolls used */


/*** Unified structure containing role information ***/

    /*** Strings that name various things ***/
    /* the role's name (from u_init.c) */
    /* names for experience levels (from botl.c) */
    /* god names (from pray.c) */
    /* abbreviation for use in file names */
    /* quest leader's location (from questpgr.c) */
    /* quest intermediate goal (from questpgr.c) */

    /*** Indices of important monsters and objects ***/
    /* index (PM_) of role (botl.c) */
        /* PM_ of preferred pet (NON_PM == random) */
        /* PM_ of quest leader (questpgr.c) */
        /* PM_ of quest guardians (questpgr.c) */
        /* PM_ of quest nemesis (questpgr.c) */
        /* specific quest enemies (NON_PM == random) */

    /* quest enemies by class (S_) */

    /* index (ART_) of quest artifact (questpgr.c) */

    /*** Bitmasks ***/
    /* bit mask of allowed variations */










    /*** Attributes (from attrib.c and exper.c) ***/
    /* lowest initial attributes */
    /* distribution of initial attributes */
    /* hit point advancement */
    /* energy advancement */
    /* cutoff experience level */
    /* initial alignment record */

    /*** Spell statistics (from spell.c) ***/
    /* base spellcasting penalty */
    /* penalty (-bonus) for healing spells */
    /* penalty for wearing any shield */
    /* penalty for wearing metal armour */
    /* which stat (A_) is used */
    /* spell (SPE_) the class excels at */
    /* penalty (-bonus) for that spell */

    /*** Properties in variable-length arrays ***/
    /* intrinsics (see attrib.c) */
    /* initial inventory (see u_init.c) */
    /* skills (see u_init.c) */

    /*** Don't forget to add... ***/
    /* quest leader, guardians, nemesis (monst.c) */
    /* quest artifact (artilist.h) */
    /* quest dungeon definition (dat/Xyz.dat) */
    /* quest text (dat/quest.txt) */
    /* dictionary entries (dat/data.bas) */


/* table of available roles */
export function Role_if(X) { return (+(gu.urole.mnum == (X))); }
export function Role_switch() { return (gu.urole.mnum); }

/* used during initialization for race, gender, and alignment
   as well as for character class */



/*** Unified structure specifying race information ***/


    /*** Strings that name various things ***/
    /* noun ("human", "elf") */
    /* adjective ("human", "elven") */
    /* collective ("humanity", "elvenkind") */
    /* code for filenames */
    /* individual as a noun ("man", "elf") */

    /*** Indices of important monsters and objects ***/
    /* PM_ as a monster */
        /* PM_ as a mummy */
        /* PM_ as a zombie */

    /*** Bitmasks ***/
    /* bit mask of allowed variations */
    /* your own race's bit mask */
        /* bit mask of always peaceful */
        /* bit mask of always hostile */

    /*** Attributes ***/
    /* minimum allowable attribute */
    /* maximum allowable attribute */
    /* hit point advancement */
    /* energy advancement */

    /* night vision range */
    /* X-ray vision range */


    /*** Properties in variable-length arrays ***/
    /* intrinsics (see attrib.c) */

    /*** Don't forget to add... ***/
    /* quest leader, guardians, nemesis (monst.c) */
    /* quest dungeon definition (dat/Xyz.dat) */
    /* quest text (dat/quest.txt) */
    /* dictionary entries (dat/data.bas) */


/* Table of available races */
export function Race_if(X) { return (+(gu.urace.mnum == (X))); }
export function Race_switch() { return (gu.urace.mnum); }

/*** Unified structure specifying gender information ***/

    /* male/female/neuter */
    /* he/she/it */
    /* him/her/it */
    /* his/her/its */
    /* file code */
    /* equivalent ROLE_ mask */




/* table of available genders */
/* pronouns for the hero */

export function uhim() { return (genders[flags.female ? 1 : 0].him); }
export function uhis() { return (genders[flags.female ? 1 : 0].his); }
/* pronoun_gender() flag masks */



/* corresponding pronouns for monsters; yields "it" when mtmp can't be seen */
export function mhe(mtmp) { return (genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he); }
export function mhim(mtmp) { return (genders[pronoun_gender(mtmp, PRONOUN_HALLU)].him); }
export function mhis(mtmp) { return (genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his); }
/* override "it" if reason is lack of visibility rather than neuter species */
export function noit_mhe(mtmp) { return (genders[pronoun_gender(mtmp, (PRONOUN_NO_IT | PRONOUN_HALLU))].he); }

export function noit_mhim(mtmp) { return (genders[pronoun_gender(mtmp, (PRONOUN_NO_IT | PRONOUN_HALLU))].him); }

export function noit_mhis(mtmp) { return (genders[pronoun_gender(mtmp, (PRONOUN_NO_IT | PRONOUN_HALLU))].his); }


/*** Unified structure specifying alignment information ***/

    /* law/balance/chaos */
    /* lawful/neutral/chaotic */
    /* file code */
    /* equivalent ROLE_ mask */
    /* equivalent A_ value */



/* table of available alignments */
















    /* remove portal */
    /* deferred_goto */


/*** Information about the player ***/

    /* current map coordinates */
    /* x,y,z deltas; direction of move (or zap or ... )
                         * usually +1 or 0 or -1 */
    /* destination of travel */
    /* previous ux,uy */
    /* your level on this and the previous turn */
    /* level monster teleported you to, or uz */
    /* bitmask of goto_level() flags for utolev */
    /* level where you came from; used for tutorial */
    /* changed map location (post-move) */
    /* 0: none, 1: half turn, 2: full turn
                         * +: turn right, -: turn left */
    /* 1 to MAXULEV (30) */
    /* highest level, but might go down (to throttle
                         * lost level recovery via blessed full healing) */
    /* really highest level reached; never does down */
    /* trap timeout */
    /* defined if utrap nonzero. one of utraptypes */
    /* rooms (roomno + 3) occupied now */
    /* ditto, for previous position */
    /* rooms (roomno + 3) entered this turn */
    /* shop rooms (roomno + 3) occupied now */
    /* ditto, for previous position */
    /* ditto, shops entered this turn */
    /* ditto, shops exited this turn */

    /* refd only in eat.c and shk.c (also insight.c) */
    /* hunger state - see eat.c */









    /* These ranges can never be more than MAX_RANGE (vision.h). */
    /* current night vision range */
    /* current xray vision range */


/*
 * These variables are valid globally only when punished and blind.
 */


    /* glyph under the ball */
    /* glyph under the chain */
    /* ball & chain order [see bc_order() in ball.c] */
    /* mask for ball/chain being felt */

    /* hero's "real" monster num */
    /* current monster number */

    /* current and max hit points when polyd */
        /* no. of turns until polymorph times out */
    /* for monster attribs */
                   /* for monster attribs */
    /* lycanthrope type */


    /* time you have been swallowed */

    /* true if swallowed */
    /* if you're currently in water (only
                                   underwater possible currently) */
    /* if you're a hiding monster/piercer */
    /* saved human value of flags.female */
    /* you're invulnerable (praying) */
    /* you're buried */
    /* blessed food detect; sense unsafe food */
    /* There is no advantage for either handedness.
                                 The distinction is only for flavor variation
                                 and for use in messages. */



    /* how long you have been demigod */
    /* certain events have happened */
    /* you're carrying special objects */
    /* KMH, conduct */

    /* your current attributes (eg. str)*/
                    /* for gain/loss via "exercise" */
                    /* your bonus attributes (eg. str) */
                    /* your max attributes (eg. str) */
                   /* used for temporary loss/gain */
                   /* used for loss/gain countdown */
    /* character alignment */



    /* for ualign conversion record */
    /* luck and luck bonus */
    /* default u.uluck is 0 except on special days (full moon: +1, Fri 13: -1,
       both: 0); equilibrium for luck timeout is changed to those values,
       but Luck max and min stay at 10+3 and -10-3 even on those days */
export function Luck() { return (u.uluck + u.moreluck); }








    /* protection by SPE_PROTECTION */
    /* #moves until uspellprot-- */
    /* #moves between uspellprot-- */
    /* hit points, aka health */
        /* highest value of uhpmax so far */
    /* magical energy, aka spell power */
        /* highest value of uenmax so far */
    /* increases to uhpmax for each level gain */
          /* increases to uenmax for each level gain */
    /* if the gods are angry at you */
    /* number of artifacts bestowed */
    /* blessing/duration from #pray */


    /* exper pts for gaining levels and for score */
    /* to record moves when player was cleansed */
    /* sleeping; monstermove you last started */

    /* engulfer or grabber, maybe grabbee if Upolyd */
    /* mount when riding */
    /* u.ustuck->m_id, used during save/restore */
    /* u.usteed->m_id, used during save/restore */
    /* turns steed will run after being kicked */
    /* time spent riding, for skill advancement */
    /* how many times you died */
    /* you die and become something aside from a ghost */
    /* unused skill slots */
    /* # of advances made so far */
    /* skill advancements */

    /* KMH -- Using two-weapon combat */
    /* vampire mndx if shapeshifted to bat/cloud */
    /* instead of youmonst.movement */
    /* list of achievements in the order attained */
    /* for future conversion of &gy.youmonst to u.umonst */
/* end of `struct you' */


/* _hitmon_data: Info for when hero hits a monster */
/* The basic reason we need all these booleans is that we don't want
 * a "hit" message when a monster dies, so we have to know how much
 * damage it did _before_ outputting a hit message, but any messages
 * associated with the damage don't come out until _after_ outputting
 * a hit message.
 *
 * More complications:  first_weapon_hit() should be called before
 * xkilled() in order to have the gamelog messages in the right order.
 * So it can't be deferred until end of known_hitum() as was originally
 * done.
 */

    /* damage */

    /* 0: 1 of 1; 1: 1 of 2; 2: 2 of 2 */



























export function Upolyd() { return (+(u.umonnum != u.umonster)); }
export function Ugender() { return ((Upolyd() ? u.mfemale : flags.female) ? 1 : 0); }

/* point px,py is adjacent to (or same location as) hero */
export function next2u(px, py) { return (+(distu((px),(py)) <= 2)); }
/* is monster on top of or next to hero? */
export function m_next2u(m) { return (+(distu((m).mx,(m).my) <= 2)); }
/* hero at (x,y)? */
export function u_at(x, y) { return (+((x) == u.ux && (y) == u.uy)); }

export function URIGHTY() { return (+(u.uhandedness == RIGHT_HANDED)); }
export function ULEFTY() { return (+(u.uhandedness == LEFT_HANDED)); }
export function RING_ON_PRIMARY() { return (ULEFTY() ? uleft : uright); }
export function RING_ON_SECONDARY() { return (ULEFTY() ? uright : uleft); }
import { distu } from "./hack.h.macros.js";
import { LEFT_HANDED } from "./you.h.js";
import { PRONOUN_HALLU } from "./you.h.js";
import { PRONOUN_NO_IT } from "./you.h.js";
import { RIGHT_HANDED } from "./you.h.js";
import { flags } from "./decl.js";
import { gu } from "./decl.js";
import { u } from "./decl.js";
import { pronoun_gender } from "./mondata.js";
import { genders } from "./role.js";
