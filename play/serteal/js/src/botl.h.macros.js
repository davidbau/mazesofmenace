/* NetHack 5.0  botl.h  $NHDT-Date: 1694893330 2023/09/16 19:42:10 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.37 $ */
/* Copyright (c) Michael Allison, 2003                            */
/* NetHack may be freely redistributed.  See license for details. */




/* Note: this comment is about the pre-VIA_WINDOWPORT two line status
 * which is still available but has not added a bunch of conditional
 * extra status conditions (Grab, InLava, Held, Zzz and many others)
 * or the new fields Weapon, Armor, and Terrain.
 *
 * MAXCO must hold longest uncompressed status line, and must be larger
 * than COLNO
 *
 * longest practical second status line at the moment is
Astral Plane \GXXXXNNNN:123456 HP:1234(1234) Pw:1234(1234) AC:-127
 Xp:30/123456789 T:123456  Stone Slime Strngl FoodPois TermIll
 Satiated Overloaded Blind Deaf Stun Conf Hallu Lev Ride
 * -- or about 185 characters.  '$' gets encoded even when it
 * could be used as-is.  The first five status conditions are fatal
 * so it's rare to have more than one at a time.
 *
 * When the full line is wider than the map, the basic status line
 * formatting will move less important fields to the end, so if/when
 * truncation is necessary, it will chop off the least significant
 * information.
 */






/* limit of the player's name in the status window */








    /* alias for BL_STR..BL_CH */
    /* Force everything to redisplay */
    /* Finished cycling through bot fields */
    /*
     * Note: status_sanity_check() in wintty.c has strings for the rest
     * of these, so if any get renumbered or more get added, be sure to
     * keep those in sync.
     */

    /*  1.. 6 */
    /*  7..10 */
    /* 11..15 */
    /* 16..19 */
    /* 20..22 */
    /* 23..25 */
    /*   26   */
    /* [27] */









    /* deprecated -- bl_weapon encompasses this */











    /* bl_terrain encompasses this */










    /* bl_terrain encompasses this */










/* Boolean condition bits for the condition mask */

/* clang-format off */































/* clang-format on */
























/*
 * Possible additional conditions:
 *  major:
 *      grab   - grabbed by eel so about to be drowned ("wrapd"? damage type
 *               is AD_WRAP but message is "<mon> swings itself around you")
 *      digst  - swallowed and being digested
 *      lava   - trapped sinking into lava
 *  in_between: (potentially severe but don't necessarily lead to death;
 *               explains to player why he isn't getting to take any turns)
 *      unconc - unconscious
 *      parlyz - (multi < 0 && (!strncmp(multi_reason, "paralyzed", 9)
 *                              || !strncmp(multi_reason, "frozen", 6)))
 *      asleep - (multi < 0 && !strncmp(multi_reason, "sleeping", 8))
 *      busy   - other multi < 0
 *  minor:
 *      held   - grabbed by non-eel or by eel but not susceptible to drowning
 *      englf  - engulfed or swallowed but not being digested (usually
 *               obvious but the blank symbol set makes that uncertain)
 *      vomit  - vomiting (causes confusion and stun late in countdown)
 *      trap   - trapped in pit, bear trap, web, or floor (solidified lava)
 *      teth   - tethered to buried iron ball
 *      chain  - punished
 *      slip   - slippery fingers
 *      ice    - standing on ice (movement becomes uncertain)
 *     [underwater - movement uncertain, vision truncated, equipment at risk]
 *  other:
 *     [hold      - poly'd into grabber and holding adjacent monster]
 *      Stormbringer - wielded weapon poses risks
 *      Cleaver   - wielded weapon risks unintended consequences
 *      barehand  - not wielding any weapon nor wearing gloves
 *      no-weapon - not wielding any weapon
 *      bow/xbow/sling - wielding a missile launcher of specified type
 *      pole      - wielding a polearm
 *      pick      - wielding a pickaxe
 *      junk      - wielding non-weapon, non-weptool
 *      naked     - no armor
 *      no-gloves - self-explanatory
 *      no-cloak  - ditto
 *     [no-{other armor slots?} - probably much too verbose]
 *  conduct?
 *      [maybe if third status line is added]
 *
 *  Can't add all of these and probably don't want to.  But maybe we
 *  can add some of them and it's not as many as first appears:
 *  lava/trap/teth are mutually exclusive;
 *  digst/grab/englf/held/hold are also mutually exclusive;
 *  Stormbringer/Cleaver/barehand/no-weapon/bow&c/pole/pick/junk too;
 *  naked/no-{any armor slot} likewise.
 */

export function VIA_WINDOWPORT() { return (+((windowprocs.wincap2 & (WC2_HILITE_STATUS | WC2_FLUSH_STATUS)) != 0)); }




/* #ifdef STATUS_HILITES */
/* hilite status field behavior - coloridx values */









                                /* or any CLR_ index (0 - 15) */















































/*
 * Note: If you add/change/remove fields in istat_s, you need to
 * update the initialization of the istat_s struct blstats[][]
 * array in instance_globals_b (decl.c).
 */



    /* moves when this field hilite times out */
    /* need to recalc time? */









    /* the entry, if any, in 'thresholds'
                                   * list that currently applies        */




/* in botl.c */
import { WC2_FLUSH_STATUS } from "./winprocs.h.js";
import { WC2_HILITE_STATUS } from "./winprocs.h.js";
import { windowprocs } from "./windows.js";
