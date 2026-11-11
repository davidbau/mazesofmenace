/* NetHack 5.0	objects.h	$NHDT-Date: 1749097644 2025/06/04 20:27:24 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.30 $ */
/* Copyright (c) Mike Threepoint, 1989.                           */
/* NetHack may be freely redistributed.  See license for details. */

/*
   The data in this file is processed multiple times by its inclusion
   in several places in the code. The results depend on the definition
   of the following:
     OBJECTS_ENUM        to construct object onames enum entries (decl.h).
     OBJECTS_DESCR_INIT to construct obj_descr[] array entries (objects.c).
     OBJECTS_INIT       to construct objects[] array entries (objects.c).
*/


export function NoDes() { return 0; }



export function HARDGEM(n) { return (+(n >= 8)); }




/*
 * Note...
 *  OBJECTS() currently has 15 parameters; it more become needed, some
 *  will need to be combined the way BITS() is used, because compilers
 *  are allowed to impose a limit of 15.
 */








/* notes: 'sub' was once a bitfield but got changed to separate schar when
   it was overloaded to hold negative weapon skill indices; the first zero
   is padding for oc_prediscovered which has variable init at run-time;
   the second zero is oc_spare1 for padding between oc_tough and oc_dir */


/* note: 0UL-1UL is a method of expressing the largest possible
   unsigned long value whilst working around a false-positive warning
   in Microsoft Visual C (which assumes that a negative number was
   intended despite the explicit U suffix) */





























/* dummy object[0] -- description [2nd arg] *must* be NULL */



/* slots [1] through [MAXOCLASSES-1] are indexed by class; some are
   used for display purposes, most aren't used; none are actual objects;
   note that 'real' strange object is in slot [0] but ILLOBJ_CLASS is 1
   so we add a dummy for it in slot [1] to simplify accessing the rest;
   there isn't any entry for RANDOM_CLASS (0) */
/* [1] */
/* [2] */
/* [3] */
/* [4] */
/* [5] */
/* [6] */
/* [7] */
/* [8] */
/* [9] */
/* [10] */
/* [11] */
/* [12] */
/* [13] */
/* [14] bldr+statue */
/* [15] */
/* [16] */
/* [17] */

/* FIRST_OBJECT: it would be simpler just to use MARKER(FIRST_OBJECT,ARROW)
   below but that is vulnerable to neglecting to update the marker enum
   after inserting something in front of arrow */


/* this definition of FIRST_OBJECT advances the default value for next enum;
   backtrack to fix that, otherwise ARROW and the rest would be off by 1 */


/* weapons ... */


















/* Note: for weapons that don't do an even die of damage (ex. 2-7 or 3-18)
   the extra damage is added on in weapon.c, not here! */

/* weapon strike mode overloads the oc_dir field */




/* missiles; materiel reflects the arrowhead, not the shaft */


















/* missiles that don't use a launcher */










/* spears [note: javelin used to have a separate skill from spears,
   because the latter are primarily stabbing weapons rather than
   throwing ones; but for playability, they've been merged together
   under spear skill and spears can now be thrown like javelins] */



















/* spearish; doesn't stack, not intended to be thrown */



        /* +1 small, +2d4 large */

/* blades; all stack */
























/* 3.6: worm teeth and crysknives now stack;
   when a stack of teeth is enchanted at once, they fuse into one crysknife;
   when a stack of crysknives drops, the whole stack reverts to teeth */
/* 5.0: change crysknife from MINERAL to BONE and worm tooth from 0 to BONE */







/* axes */



/* "double-bitted"? */



/* swords */





















        /* +d4 small, +1 large */



        /* +d4 small, +1 large */







        /* +2d6 large */



/* special swords set up for artifacts */




        /* +2d6 large */



        /* +d4 small, +1 large; Stormbringer: +5d2 +d8 from level drain */

/* polearms */
/* spear-type */



        /* +1 large */



        /* +d4 both */



        /* +1 small, +d6 large */



/* axe-type */



        /* +1d6 large */



        /* +1d4 small, +2d4 large */



        /* +d4 both */
/* curved/hooked */






        /* +1d4 small */



        /* +1d4 small */
/* other */



        /* +1d4 small */




/* formerly grouped with the polearms but don't use polearms skill;
   lance isn't even two-handed */






        /* +2d10 when jousting with lance as primary weapon,
           +2d2 when jousting with it as secondary when dual wielding */

/* bludgeons */



        /* +1 small */



        /* +1 small */



        /* +d4 small, +1 large */



        /* +1 small */









/* two-piece */






        /* +1 small, +1d4 large */

/* misc */




/* bows */





















/* armor ... */
        /* IRON denotes ferrous metals, including steel.
         * Only IRON weapons and armor can rust.
         * Only COPPER (including brass) corrodes.
         * Some creatures are vulnerable to SILVER.
         */






















/* helmets */














        /* name coined by devteam; confers clairvoyance for wizards,
           blocks clairvoyance if worn by role other than wizard */



        /* sets Int and Wis to fixed value of 6, so actually provides
           protection against death caused by Int being drained below 3 */






        /* used to be iron and shuffled as "etched helmet" but required
           special case for the effect of iron armor on spell casting */

/* with shuffled appearances... */













/* suits of armor */
/*
 * There is code in polyself.c that assumes (1) and (2).
 * There is code in obj.h, objnam.c, mon.c, read.c that assumes (2).
 *      (1) The dragon scale mails and the dragon scales are together.
 *      (2) That the order of the dragon scale mail and dragon scales
 *          is the same as order of dragons defined in monst.c.
 */



/* 3.4.1: dragon scale mail reclassified as "magic" since magic is
   needed to create them */


    /* gold DSM is a light source; there's no property for that */






















/* For now, only dragons leave these. */
/* 3.4.1: dragon scales left classified as "non-magic"; they confer magical
   properties but are produced "naturally"; affects use as polypile fodder */

























/* other suits */














































/* shirts */







/* cloaks */



        /* worn mummy wrapping blocks invisibility */













        /* robe was adopted from slash'em, where it's worn as a suit
           rather than as a cloak and there are several variations */






/* with shuffled appearances... */



        /* cloak of protection is now the only item conferring MC 3 */






        /*  'cope' is not a spelling mistake... leave it be */




/* shields */




























/* gloves */
/* These have their color but not material shuffled, so the IRON must
 * stay CLR_BROWN (== HI_LEATHER) even though it's normally either
 * HI_METAL or CLR_BLACK.  All have shuffled descriptions.
 */













/* boots */






/* with shuffled appearances... */














        /* CLR_BROWN for same reason as gauntlets of power */













/* rings ... */






















        /* 'PROTECTION' intrinsic enhances MC from worn armor by +1,
           regardless of ring's enchantment; wearing a second ring of
           protection (or even one ring of protection combined with
           cloak of protection) doesn't give a second MC boost */




































































/* amulets ... - THE Amulet comes last because it is special */























        /* +2 AC and +2 MC; +2 takes naked hero past 'warded' to 'guarded' */


        /* cubical: some descriptions are already three dimensional and
           parallelogrammatical (real word!) would be way over the top */


/* fixed descriptions; description duplication is deliberate;
 * fake one must come before real one because selection for
 * description shuffling stops when a non-magic amulet is encountered
 */





/* note: description == name */







/* tools ... */
/* tools with weapon characteristics come last */


















/* containers */
















/* lock opening tools */






/* light sources */










/* other tools */






/* eyewear - tools which can be worn on the face; (!mrg, !chg, !mgc)
   worn lenses don't confer the Blinded property, blindfolds and towels do;
   wet towel can be used as a weapon but is not a weptool and uses obj->spe
   differently from weapons and weptools */








/* still other tools */














        /* monster type specified by obj->corpsenm */


/* traps */




/* instruments;
   "If tin whistles are made out of tin, what do they make foghorns out of?" */
















        /* horn, but not an instrument */












/* tools useful as weapons */










        /* 3.4.1: unicorn horn left classified as "magic" */
/* two unique tools;
 * not artifacts, despite the comment which used to be here
 */











/* Comestibles ... */





/* All types of food (except tins & corpses) must have a delay of at least 1.
 * Delay on corpses is computed and is weight dependent.
 * Domestic pets prefer tripe rations above all others.
 * Fortune cookies can be read, using them up without ingesting them.
 * Carrots improve your vision.
 * +0 tins contain monster meat.
 * +1 tins (of spinach) make you stronger (like Popeye).
 * Meatballs/sticks/rings are only created from objects via stone to flesh.
 */
/* meat */










/* formerly "huge chunk of meat" */


/* special case because it's not mergeable */



/* pudding 'corpses' will turn into these and combine;
   must be in same order as the pudding monsters */









/* fruits & veggies */















/* name of slime mold is changed based on player's OPTION=fruit:something
   and bones data might have differently named ones from prior games */



/* people food */
















/* tins have type specified by obj->spe (+1 for spinach, other implies
   flesh; negative specifies preparation method {homemade,boiled,&c})
   and by obj->corpsenm (type of monster flesh) */



/* potions ... */






















































/* fixed description
 */




/* scrolls ... */















































    /* Extra descriptions, shuffled into use at start of new game.
     * Code in win/share/tilemap.c depends on SCR_STINKING_CLOUD preceding
     * these and on how many of them there are.  If a real scroll gets added
     * after stinking cloud or the number of extra descriptions changes,
     * tilemap.c must be modified to match.  Mgc,Prob,Cost are superfluous.
     * SC values must be distinct but are only used by 'nethack --dumpenums'.
     */







/* Illuminati */
/* Kurd Lasswitz */
/* traditional incantation */
/* Portal */
/* Zak McKracken */
/* Zak McKracken */

/* Merseburg Incantations */
/* Merseburg Incantations */
/* pronounced as 'fish',
                                                * George Bernard Shaw */
/* Wizardry */
/* Ultima */
/* Aarne Haapakoski */
/* Czech and Slovak
                                                * tongue-twister */

    /* These must come last because they have special fixed descriptions.
     */






/* spellbooks ... */
    /* Expanding beyond 52 spells would require changes in spellcasting
     * or imposition of a limit on number of spells hero can know because
     * they are currently assigned successive letters, a-zA-Z, when learned.
     * [The existing spell sorting capability could conceivably be extended
     * to enable moving spells from beyond Z to within it, bumping others
     * out in the process, allowing more than 52 spells be known but keeping
     * only 52 be castable at any given time.]
     */





/* Spellbook description normally refers to book covers (primarily color).
   Parchment and vellum would never be used for such, but rather than
   eliminate those, finagle their definitions to refer to the pages
   rather than the cover.  They are made from animal skin (typically of
   a goat or sheep) and books using them for pages generally need heavy
   covers with straps or clamps to tightly close the book in order to
   keep the pages flat.  (However, a wooden cover might itself be covered
   by a sheet of parchment, making this become less of an exception.  Also,
   changing the internal composition from paper to leather makes eating a
   parchment or vellum spellbook break vegetarian conduct, as it should.) */




/* magic missile ... finger of death must be in this order; see buzz() */





















































































































/* from slash'em, create a tame critter which explodes when attacking,
   damaging adjacent creatures--friend or foe--and dying in the process */







/* books with fixed descriptions
 */


/* LAST_SPELL is used to calculate MAXSPELL, allocation size of spl_book[];
   by including blank paper, which has no actual spell, we ensure that
   even if hero learns every spell, spl_book[] will have at least one
   unused slot at end; an unused slot is needed for use as terminator */

/* tribute book added in 3.6 */




/* a special, one of a kind, spellbook */






/* wands ... */











































/* magic missile ... lightning must be in this order; see buzz() */












/* extra descriptions, shuffled into use at start of new game */





/* coins ... - so far, gold is all there is */







/* gems ... - includes stones and rocks but not boulders */













































































/* Placement note: there is a wishable subrange for
 * "gray stones" in the o_ranges[] array in objnam.c
 * that is currently everything between luckstones and flint
 * (inclusive).
 */













/* miscellaneous ... */
/* Note: boulders and rocks are not normally created at random; the
 * probabilities only come into effect when you try to polymorph them.
 * Boulders weigh more than MAX_CARR_CAP; statues use corpsenm to take
 * on a specific type and may act as containers (both affect weight).
 */











        /* +d4 when "very heavy" */



        /* +1 both l & s */

/* Venom is normally a transitory missile (spit by various creatures)
 * but can be wished for in wizard mode so could occur in bones data.
 */






        /* +d6 small or large */


/* fencepost, the deadly Array Terminator -- name [1st arg] *must* be NULL */












/*objects.c*/
