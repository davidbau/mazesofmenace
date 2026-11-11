/* NetHack 5.0	skills.h	$NHDT-Date: 1596498559 2020/08/03 23:49:19 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.16 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985-1999. */
/*-Copyright (c) Pasi Kallinen, 2017. */
/* NetHack may be freely redistributed.  See license for details. */




/* Much of this code was taken from you.h.  It is now
 * in a separate file so it can be included in objects.c.
 */


    /* Code to denote that no skill is applicable */


/* Weapon Skills -- Stephen White
 * Order matters and are used in macros.
 * Positive values denote hand-to-hand weapons or launchers.
 * Negative values denote ammunition or missiles.
 * Update weapon.c if you amend any skills.
 * Also used for oc_subtyp.
 */








    /* Curved sword, includes scimitar */
    /* Heavy-shafted bludgeon */

    /* Spiked bludgeon */
    /* Two pieces hinged or chained together */
    /* Heavy head on the end */
    /* Long-shafted bludgeon */
    /* attack two or three steps away */
    /* includes javelin */


    /* launchers */


    /* hand-thrown missiles */


    /* flexible, one-handed */
    /* last weapon, two-handed */

    /* Spell Skills added by Larry Stewart-Zerba */








    /* Other types of combat */
    /* actually weaponless; gloves are ok */
    /* pair of weapons, one in each hand */
    /* How well you control your steed */















/* These roles qualify for a martial arts bonus */
export function martial_bonus() { return (+(Role_if(PM_SAMURAI) || Role_if(PM_MONK))); }

/*
 * These are the standard weapon skill levels.  It is important that
 * the lowest "valid" skill be 1.  The code calculates the
 * previous amount to practice by calling  practice_needed_to_advance()
 * with the current skill-1.  To work out for the UNSKILLED case,
 * a value of 0 needed.
 */

    /* unskilled and can't be advanced */
    /* unskilled so far but can be advanced */
    /* Skill levels Basic/Advanced/Expert had long been used by
       Heroes of Might and Magic (tm) and its sequels... */



    /* when the skill system was adopted into nethack, levels beyond expert
       were unnamed and just used numbers.  Devteam coined them Master and
       Grand Master.  Sometime after that, Heroes of Might and Magic IV (tm)
       was released and had two more levels which use these same names. */
    /* Unarmed combat/martial arts only */
    /* ditto */


export function practice_needed_to_advance(level) { return ((level) * (level) *20); }

/* The hero's skill in various weapons. */






export function P_SKILL(type) { return (u.weapon_skills[type].skill); }
export function P_MAX_SKILL(type) { return (elt(u.weapon_skills, type).max_skill); }
export function P_ADVANCE(type) { return (u.weapon_skills[type].advance); }
export function P_RESTRICTED(type) { return (+(u.weapon_skills[type].skill == P_ISRESTRICTED)); }



/* Initial skill matrix structure; used in u_init.c and weapon.c */
import { PM_MONK } from "./monsters.h.js";
import { PM_SAMURAI } from "./monsters.h.js";
import { P_ISRESTRICTED } from "./skills.h.js";
import { Role_if } from "./you.h.macros.js";
import { elt } from "../rt/struct.js";
import { u } from "./decl.js";
