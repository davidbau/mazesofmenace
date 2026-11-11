/* NetHack 5.0	mextra.h	$NHDT-Date: 1720717969 2024/07/11 17:12:49 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.40 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */








/*
 *  Adding new mextra structures:
 *
 *       1. Add the structure definition and any required macros in this
 *          file above the mextra struct.
 *       2. Add a pointer to your new struct to the mextra struct in this
 *          file.
 *       3. Add a referencing macro at bottom of this file after the mextra
 *          struct (see MGIVENNAME, EGD, EPRI, ESHK, EMIN, or EDOG for
 *          examples).
 *       4. If your new field isn't a pointer and requires a non-zero value
 *          on initialization, add code to init_mextra() in src/makemon.c
 *       5. Create a newXX(mtmp) function and possibly a free_XX(mtmp)
 *          function in an appropriate new or existing source file and add
 *          a prototype for it to include/extern.h.
 *
 *              void newXX(struct monst *);
 *              void free_XX(struct monst *);
 *
 *              void
 *              newXX(mtmp)
 *              struct monst *mtmp;
 *              {
 *                  if (!mtmp->mextra)
 *                      mtmp->mextra = newmextra();
 *                  if (!XX(mtmp)) {
 *                      XX(mtmp) = (struct XX *) alloc(sizeof (struct XX));
 *                      (void) memset((genericptr_t) XX(mtmp),
 *                                    0, sizeof (struct XX));
 *                  }
 *              }
 *
 *       6. Consider adding a new makemon flag MM_XX flag to include/hack.h
 *          and a corresponding change to makemon() if you require your
 *          structure to be added at monster creation time.  Initialize your
 *          struct after a successful return from makemon().
 *
 *              src/makemon.c:  if (mmflags & MM_XX) newXX(mtmp);
 *              your new code:  mon = makemon(&mons[mnum], x, y, MM_XX);
 *
 *       7. Adjust size_monst() in src/wizcmds.c appropriately.
 *       8. Adjust dealloc_mextra() in src/mon.c to clean up
 *          properly during monst deallocation.
 *       9. Adjust copy_mextra() in src/mon.c to make duplicate
 *          copies of your struct or data on another monst struct.
 *      10. Adjust restmon() in src/restore.c to deal with your
 *          struct or data during a restore.
 *      11. Adjust savemon() in src/save.c to deal with your
 *          struct or data during a save.
 */

/***
 **     formerly vault.h -- vault guard extension
 */






    /* from struct rm's typ */
    /* also from struct rm; an unsigned 5-bit field there */



    /* make clobber-detection possible */
    /* fcend: first unused pos */
    /* room number of the vault */
    /* goal of guard's walk */
    /* guard's last position */
    /* level (& dungeon) guard was created in */
    /* number of warnings to follow */
    /* number of demands to drop gold */
    /* true iff guard has released player */
    /* the guard saw you do something */




/***
 **     formerly epri.h -- temple priest extension
 */

    /* make clobber-detection possible */
    /* alignment of priest's shrine */
    /* index in rooms */
    /* position of shrine */
    /* level (& dungeon) of shrine */
    /* number of cheapskate donations */
    /* used to limit verbosity  +*/
        /*+ of temple entry messages */
        /* forbidding feeling */
        /* sense of peace */

/* note: roaming priests (no shrine) switch from ispriest to isminion
   (and emin extension) */

/***
 **     formerly eshk.h -- shopkeeper extension
 */






    /* price per unit */
    /* amount used up */



    /* make clobber-detection possible */
    /* amount stolen by most recent customer */
    /* amount credited to customer */
    /* amount of debt for using unpaid items */
    /* shop-gold picked (part of debit) */
    /* the value of svr.rooms[shoproom].rtype */
    /* index in svr.rooms; set by inshop() */
    /* to force alignment for stupid compilers */
    /* following customer since he owes us sth */
    /* angry shk inflates prices */
    /* pacified shk sends kops away */
    /* usual position shopkeeper */
    /* position shop door */
    /* level (& dungeon) of his shop */
    /* no. of entries of bill[] in use */

    /* &(ESHK(shkp)->bill[0]) */
    /* hero_seq value at time of object breakage */
    /* shkp->mpeaceful at start of break_seq */
    /* nr of visits by most recent customer */
    /* most recent customer */



/***
 **     formerly emin.h -- minion extension
 */

    /* make clobber-detection possible */
    /* alignment of minion */
    /* hostile co-aligned priest or Angel */


/***
 **     formerly edog.h -- pet extension
 */
/*      various types of pet food, the lower the value, the better liked */












    /* make clobber-detection possible */
    /* moment dog dropped object */
    /* dist of dropped obj from @ */
    /* amount of training */
    /* last time he whistled */
    /* will get hungry at this time */
    /* previous goal location */
    /* track abuses to this pet */
    /* count pet deaths */
    /* while starving, points reduced */
    /* you attempted to kill him */


/***
 **     extension tracking a player's remnant monster (ghost, mummy etc.)
 */

    /* make clobber-detection possible */
    /* index into roles[] */
    /* index into races[] */
    /* character alignment */
    /* level when dying (m_lev may differ) */
    /* luck when dying */
    /* monster type */
    /* was female */
    /* had killed wiz or invoked */
    /* had been crowned */


/***
 **     mextra.h -- collection of all monster extensions
 */








    /* obj->corpsenm for mimic posing as statue or corpse,
                    * obj->spe (fruit index) for one posing as a slime mold,
                    * or an alignment mask for one posing as an altar */


export function MGIVENNAME(mon) { return ((mon).mextra.mgivenname); }
export function EGD(mon) { return ((mon).mextra.egd); }
export function EPRI(mon) { return ((mon).mextra.epri); }
export function ESHK(mon) { return ((mon).mextra.eshk); }
export function EMIN(mon) { return ((mon).mextra.emin); }
export function EDOG(mon) { return ((mon).mextra.edog); }
export function EBONES(mon) { return ((mon).mextra.ebones); }
export function MCORPSENM(mon) { return ((mon).mextra.mcorpsenm); }

export function has_mgivenname(mon) { return ((((mon).mextra && MGIVENNAME(mon)) ? 1 : 0)); }
export function has_egd(mon) { return ((((mon).mextra && EGD(mon)) ? 1 : 0)); }
export function has_epri(mon) { return ((((mon).mextra && EPRI(mon)) ? 1 : 0)); }
export function has_eshk(mon) { return ((((mon).mextra && ESHK(mon)) ? 1 : 0)); }
export function has_emin(mon) { return ((((mon).mextra && EMIN(mon)) ? 1 : 0)); }
export function has_edog(mon) { return ((((mon).mextra && EDOG(mon)) ? 1 : 0)); }
export function has_ebones(mon) { return ((((mon).mextra && EBONES(mon)) ? 1 : 0)); }
export function has_mcorpsenm(mon) { return ((((mon).mextra && MCORPSENM(mon) != NON_PM) ? 1 : 0)); }
import { NON_PM } from "./monsters.h.js";
