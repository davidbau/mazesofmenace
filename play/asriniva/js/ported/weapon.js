/* NetHack 5.0	weapon.c	$NHDT-Date: 1725227810 2024/09/01 21:56:50 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.128 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 *      This module contains code for calculation of "to hit" and damage
 *      bonuses for any given weapon used, as well as weapons selection
 *      code for monsters.
 */
import { C } from '../c-runtime/context.js';


/* Categories whose names don't come from OBJ_NAME(objects[type])
 */
const PN_BARE_HANDED = (-1); /* includes martial arts */
const PN_TWO_WEAPONS = (-2);
const PN_RIDING = (-3);
const PN_POLEARMS = (-4);
const PN_SABER = (-5);
const PN_HAMMER = (-6);
const PN_WHIP = (-7);
const PN_ATTACK_SPELL = (-8);
const PN_HEALING_SPELL = (-9);
const PN_DIVINATION_SPELL = (-10);
const PN_ENCHANTMENT_SPELL = (-11);
const PN_CLERIC_SPELL = (-12);
const PN_ESCAPE_SPELL = (-13);
const PN_MATTER_SPELL = (-14);

export const skill_names_indices = [
    /* Weapon */
    0, "DAGGER", "KNIFE", "AXE", "PICK_AXE", "SHORT_SWORD", "BROADSWORD", "LONG_SWORD",
    "TWO_HANDED_SWORD", PN_SABER, "CLUB", "MACE", "MORNING_STAR", "FLAIL", PN_HAMMER,
    "QUARTERSTAFF", PN_POLEARMS, "SPEAR", "TRIDENT", "LANCE", "BOW", "SLING", "CROSSBOW",
    "DART", "SHURIKEN", "BOOMERANG", PN_WHIP, "UNICORN_HORN",
    /* Spell */
    PN_ATTACK_SPELL, PN_HEALING_SPELL, PN_DIVINATION_SPELL,
    PN_ENCHANTMENT_SPELL, PN_CLERIC_SPELL, PN_ESCAPE_SPELL, PN_MATTER_SPELL,
    /* Other */
    PN_BARE_HANDED, PN_TWO_WEAPONS, PN_RIDING
];

/* note: entry [0] isn't used */
export const odd_skill_names = [
    "no skill", "bare hands", /* use barehands_or_martial[] instead */
    "two weapon combat", "riding", "polearms", "saber", "hammer", "whip",
    "attack spells", "healing spells", "divination spells",
    "enchantment spells", "clerical spells", "escape spells", "matter spells",
];
/* indexed via is_martial() */
export const barehands_or_martial = [
    "bare handed combat", "martial arts"
];

// Original P_NAME macro expands inline at each source call.

/* targets that provide attacker with small to-hit bonus when using a spear */
export const kebabable = [
    "S_XORN", "S_DRAGON", "S_JABBERWOCK", "S_NAGA", "S_GIANT",  0
];

export function give_may_advance_msg(skill)
{
    C.You_feel("more confident in your %sskills.",
             (skill == C.P_NONE) ? ""
                 : (skill <= C.P_LAST_WEAPON) ? "weapon "
                     : (skill <= C.P_LAST_SPELL) ? "spell casting "
                         : "fighting ");
    C.handle_tip(C.TIP_ENHANCE);
}

/* weapon's skill category name for use as generalized description of weapon;
   mostly used to shorten "you drop your <weapon>" messages when slippery
   fingers or polymorph causes hero to involuntarily drop wielded weapon(s) */
export function weapon_descr(obj)
{
    let skill = weapon_type(obj);
    let descr = ((C.skill_names_indices[skill] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[skill]]) : (skill == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[skill]]);

    /* assorted special cases */
    switch (skill) {
    case C.P_NONE:
        /* not a weapon or weptool: use item class name;
           override class name for things where it sounds strange and
           for things that aren't unexpected to find being wielded:
           corpses, tins, eggs, and globs avoid "food",
           statues and boulders avoid "large rock",
           and towels and tin openers avoid "tool" */
        descr = (obj.otyp == C.CORPSE || obj.otyp == C.TIN || obj.otyp == C.EGG
                 || obj.otyp == C.STATUE || obj.otyp == C.BOULDER
                 || obj.otyp == C.TOWEL || obj.otyp == C.TIN_OPENER)
                ? C.OBJ_NAME(C.objects[obj.otyp])
                : obj.globby ? "glob"
                  : C.def_oc_syms[C.int(obj.oclass)].name;
        break;
    case C.P_SLING:
        if (C.is_ammo(obj))
            descr = (obj.otyp == C.ROCK || C.is_graystone(obj))
                        ? "stone"
                        /* avoid "rock"; what about known glass? */
                        : (obj.oclass == C.GEM_CLASS)
                            ? "gem"
                            /* in case somebody adds odd sling ammo */
                            : C.def_oc_syms[C.int(obj.oclass)].name;
        break;
    case C.P_BOW:
        if (C.is_ammo(obj))
            descr = "arrow";
        break;
    case C.P_CROSSBOW:
        if (C.is_ammo(obj))
            descr = "bolt";
        break;
    case C.P_FLAIL:
        if (obj.otyp == C.GRAPPLING_HOOK)
            descr = "hook";
        break;
    case C.P_PICK_AXE:
        /* even if "dwarvish mattock" hasn't been discovered yet */
        if (obj.otyp == C.DWARVISH_MATTOCK)
            descr = "mattock";
        break;
    default:
        break;
    }
    return C.makesingular(descr);
}

/*
 *      hitval returns an integer representing the "to hit" bonuses
 *      of "otmp" against the monster.
 */
export function hitval(otmp, mon)
{
    let tmp = 0;
    let ptr = mon.data;
    let Is_weapon = (otmp.oclass == C.WEAPON_CLASS || C.is_weptool(otmp));

    if (Is_weapon)
        tmp += otmp.spe;

    /* Put weapon-specific "to hit" bonuses in below: */
    tmp += C.objects[otmp.otyp].oc_hitbon;

    /* Put weapon vs. monster type "to hit" bonuses in below: */

    /* Blessed weapons used against undead or demons */
    if (Is_weapon && otmp.blessed && C.mon_hates_blessings(mon))
        tmp += 2;

    if (C.is_spear(otmp) && C.strchr(C.kebabable, ptr.mlet))
        tmp += 2;

    /* trident is highly effective against swimmers */
    if (otmp.otyp == C.TRIDENT && C.is_swimmer(ptr)) {
        if (C.is_pool(mon.mx, mon.my))
            tmp += 4;
        else if (ptr.mlet == C.S_EEL || ptr.mlet == C.S_SNAKE)
            tmp += 2;
    }

    /* Picks used against xorns and earth elementals */
    if (C.is_pick(otmp) && (C.passes_walls(ptr) && C.thick_skinned(ptr)))
        tmp += 2;

    /* Check specially named weapon "to hit" bonuses */
    if (otmp.oartifact)
        tmp += C.spec_abon(otmp, mon);

    return tmp;
}

/* Historical note: The original versions of Hack used a range of damage
 * which was similar to, but not identical to, the damage used in Advanced
 * Dungeons and Dragons.  I figured that since it was so close, I may as well
 * make it exactly the same as AD&D, adding some more weapons in the process.
 * This has the advantage that it is at least possible that the player would
 * already know the damage of at least some of the weapons.  This was circa
 * 1987 and I used the table from Unearthed Arcana until I got tired of typing
 * them in (leading to something of an imbalance towards weapons early in
 * alphabetical order).  The data structure still doesn't include fields that
 * fully allow the appropriate damage to be described (there's no way to say
 * 3d6 or 1d6+1) so we add on the extra damage in dmgval() if the weapon
 * doesn't do an exact die of damage.
 *
 * Of course new weapons were added later in the development of Nethack.  No
 * AD&D consistency was kept, but most of these don't exist in AD&D anyway.
 *
 * Second edition AD&D came out a few years later; luckily it used the same
 * table.  As of this writing (1999), third edition is in progress but not
 * released.  Let's see if the weapon table stays the same.  --KAA
 * October 2000: It didn't.  Oh, well.
 */

/*
 *      dmgval returns an integer representing the damage bonuses
 *      of "otmp" against the monster.
 */
export function dmgval(otmp, mon)
{
    let tmp = 0, otyp = otmp.otyp;
    let ptr = mon.data;
    let Is_weapon = (otmp.oclass == C.WEAPON_CLASS || C.is_weptool(otmp));

    if (otyp == C.CREAM_PIE)
        return 0;

    if (C.bigmonst(ptr)) {
        if (C.objects[otyp].oc_wldam)
            tmp = C.rnd(C.objects[otyp].oc_wldam, 227, 'dmgval');
        switch (otyp) {
        case C.IRON_CHAIN:
        case C.CROSSBOW_BOLT:
        case C.MORNING_STAR:
        case C.PARTISAN:
        case C.RUNESWORD:
        case C.ELVEN_BROADSWORD:
        case C.BROADSWORD:
            tmp++;
            break;

        case C.FLAIL:
        case C.RANSEUR:
        case C.VOULGE:
            tmp += C.rnd(4, 242, 'dmgval');
            break;

        case C.ACID_VENOM:
        case C.HALBERD:
        case C.SPETUM:
            tmp += C.rnd(6, 248, 'dmgval');
            break;

        case C.BATTLE_AXE:
        case C.BARDICHE:
        case C.TRIDENT:
            tmp += C.d(2, 4, 254, 'dmgval');
            break;

        case C.TSURUGI:
        case C.DWARVISH_MATTOCK:
        case C.TWO_HANDED_SWORD:
            tmp += C.d(2, 6, 260, 'dmgval');
            break;
        }
    } else {
        if (C.objects[otyp].oc_wsdam)
            tmp = C.rnd(C.objects[otyp].oc_wsdam, 265, 'dmgval');
        switch (otyp) {
        case C.IRON_CHAIN:
        case C.CROSSBOW_BOLT:
        case C.MACE:
        case C.SILVER_MACE:
        case C.WAR_HAMMER:
        case C.FLAIL:
        case C.SPETUM:
        case C.TRIDENT:
            tmp++;
            break;

        case C.BATTLE_AXE:
        case C.BARDICHE:
        case C.BILL_GUISARME:
        case C.GUISARME:
        case C.LUCERN_HAMMER:
        case C.MORNING_STAR:
        case C.RANSEUR:
        case C.BROADSWORD:
        case C.ELVEN_BROADSWORD:
        case C.RUNESWORD:
        case C.VOULGE:
            tmp += C.rnd(4, 289, 'dmgval');
            break;

        case C.ACID_VENOM:
            tmp += C.rnd(6, 293, 'dmgval');
            break;
        }
    }
    if (Is_weapon) {
        tmp += otmp.spe;
        /* negative enchantment mustn't produce negative damage */
        if (tmp < 0)
            tmp = 0;
    }

    if (C.objects[otyp].oc_material <= C.LEATHER && C.thick_skinned(ptr))
        /* thick-skinned or scaled creatures don't feel it */
        tmp = 0;
    if (C.samePtr(ptr, C.mons[C.PM_SHADE]) && !C.shade_glare(otmp))
        tmp = 0;

    /* "very heavy iron ball"; weight increase is in increments */
    if (otyp == C.HEAVY_IRON_BALL && tmp > 0) {
        let wt = C.int(C.objects[C.HEAVY_IRON_BALL].oc_weight);

        if (C.int(otmp.owt) > wt) {
            wt = Math.trunc((C.int(otmp.owt) - wt) / C.WT_IRON_BALL_INCR);
            tmp += C.rnd(4 * wt, 316, 'dmgval');
            if (tmp > 25)
                tmp = 25; /* objects[].oc_wldam */
        }
    }

    /* Put weapon vs. monster type damage bonuses in below: */
    if (Is_weapon || otmp.oclass == C.GEM_CLASS || otmp.oclass == C.BALL_CLASS
        || otmp.oclass == C.CHAIN_CLASS) {
        let bonus = 0;

        if (otmp.blessed && C.mon_hates_blessings(mon))
            bonus += C.rnd(4, 328, 'dmgval');
        if (C.is_axe(otmp) && C.is_wooden(ptr))
            bonus += C.rnd(4, 330, 'dmgval');
        if (C.objects[otyp].oc_material == C.SILVER && C.mon_hates_silver(mon))
            bonus += C.rnd(20, 332, 'dmgval');
        if (C.artifact_light(otmp) && otmp.lamplit && C.hates_light(ptr))
            bonus += C.rnd(8, 334, 'dmgval');

        /* if the weapon is going to get a double damage bonus, adjust
           this bonus so that effectively it's added after the doubling */
        if (bonus > 1 && otmp.oartifact && C.spec_dbon(otmp, mon, 25) >= 25)
            bonus = Math.trunc((bonus + 1) / 2);

        tmp += bonus;
    }

    if (tmp > 0) {
        /* It's debatable whether a rusted blunt instrument
           should do less damage than a pristine one, since
           it will hit with essentially the same impact, but
           there ought to some penalty for using damaged gear
           so always subtract erosion even for blunt weapons. */
        tmp -= C.greatest_erosion(otmp);
        if (tmp < 1)
            tmp = 1;
    }

    return  tmp;
}

/* check whether blessed and/or silver damage applies for *non-weapon* hit;
   return value is the amount of the extra damage */
export function special_dmgval(magr, mdef, armask, silverhit_p) /* attacker */ /* defender */ /* armor mask, multiple bits accepted for
                         * W_ARMC|W_ARM|W_ARMU or
                         * W_ARMG|W_RINGL|W_RINGR only */  /* output flag mask for silver bonus */
{
    let obj;
    let left_ring = (armask & C.W_RINGL) ? 1 : 0,
            right_ring = (armask & C.W_RINGR) ? 1 : 0;
    let silverhit = 0n;
    let bonus = 0;

    obj = 0;
    if (armask & (C.W_ARMC | C.W_ARM | C.W_ARMU)) {
        if ((armask & C.W_ARMC) != 0n
            && (obj = C.which_armor(magr, C.W_ARMC)) != 0)
            armask = C.W_ARMC;
        else if ((armask & C.W_ARM) != 0n
                 && (obj = C.which_armor(magr, C.W_ARM)) != 0)
            armask = C.W_ARM;
        else if ((armask & C.W_ARMU) != 0n
                 && (obj = C.which_armor(magr, C.W_ARMU)) != 0)
            armask = C.W_ARMU;
        else
            armask = 0n;
    } else if (armask & (C.W_ARMG | C.W_RINGL | C.W_RINGR)) {
        armask = ((obj = C.which_armor(magr, C.W_ARMG)) != 0) ?  C.W_ARMG : 0n;
    } else {
        obj = C.which_armor(magr, armask);
    }

    if (obj) {
        if (obj.blessed && C.mon_hates_blessings(mdef))
            bonus += C.rnd(4, 396, 'special_dmgval');
        /* the only silver armor is shield of reflection (silver dragon
           scales refer to color, not material) and the only way to hit
           with one--aside from throwing--is to wield it and perform a
           weapon hit, but we include a general check here */
        if (C.objects[obj.otyp].oc_material == C.SILVER
            && C.mon_hates_silver(mdef)) {
            bonus += C.rnd(20, 403, 'special_dmgval');
            silverhit |= armask;
        }

    /* when no gloves we check for silver rings (blessed rings ignored) */
    } else if ((left_ring || right_ring) && C.samePtr(magr, C.gy.youmonst)) {
        if (left_ring && C.uleft) {
            if (C.objects[C.uleft.otyp].oc_material == C.SILVER
                && C.mon_hates_silver(mdef)) {
                bonus += C.rnd(20, 412, 'special_dmgval');
                silverhit |= C.W_RINGL;
            }
        }
        if (right_ring && C.uright) {
            if (C.objects[C.uright.otyp].oc_material == C.SILVER
                && C.mon_hates_silver(mdef)) {
                /* two silver rings don't give double silver damage
                   but 'silverhit' messages might be adjusted for them */
                if (!(silverhit & C.W_RINGL))
                    bonus += C.rnd(20, 422, 'special_dmgval');
                silverhit |= C.W_RINGR;
            }
        }
    }

    if (silverhit_p)
        silverhit_p.value = silverhit;
    return bonus;
}

/* give a "silver <item> sears <target>" message;
   not used for weapon hit, so we only handle rings */
export function silver_sears(magr, mdef, silverhit)
{
    const rings = C.stackAlloc(20); /* plenty of room for "rings" */
    let ltyp = ((C.uleft && (silverhit & C.W_RINGL) != 0n)
                ? C.uleft.otyp : C.STRANGE_OBJECT),
        rtyp = ((C.uright && (silverhit & C.W_RINGR) != 0n)
                ? C.uright.otyp : C.STRANGE_OBJECT);
    let both,
        l_dknown = (C.uleft && C.uleft.dknown),
        r_dknown = (C.uright && C.uright.dknown),
        l_ag = (C.objects[ltyp].oc_material == C.SILVER && l_dknown),
        r_ag = (C.objects[rtyp].oc_material == C.SILVER && r_dknown);

    if ((silverhit & (C.W_RINGL | C.W_RINGR)) != 0n) {
        /* plural if both the same type (so not multi_claw and both rings
           are non-Null) and either both known or neither known, or both
           silver (in case there is ever more than one type of silver ring)
           and both known; singular if multi_claw (where one of ltyp or
           rtyp will always be STRANGE_OBJECT) even if both rings are known
           silver [see hmonas(uhitm.c) for explanation of 'multi_claw'] */
        both = ((ltyp == rtyp && l_dknown == r_dknown) || (l_ag && r_ag));
        C.Sprintf(rings, "ring%s", both ? "s" : "");
        C.Your("%s%s %s %s!",
             (l_ag || r_ag) ? "silver "
             : both ? ""
               : ((silverhit & C.W_RINGL) != 0n) ? "left "
                 : "right ",
             rings, C.vtense(rings, "sear"), C.mon_nam(mdef));
    }
}

// Original Oselect macro expands inline at each source call.

export function oselect(mtmp, type)
{
    let otmp;

    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.otyp != type)
            continue;

        /* never select non-cockatrice corpses */
        if ((type == C.CORPSE || type == C.EGG)
            && (otmp.corpsenm == C.NON_PM
                || !C.touch_petrifies(C.mons[otmp.corpsenm])))
            continue;

        if (!C.can_touch_safely(mtmp, otmp))
            continue;

        return otmp;
    }
    return 0;
}

export const rwep = [
    "DWARVISH_SPEAR", "SILVER_SPEAR", "ELVEN_SPEAR", "SPEAR", "ORCISH_SPEAR", "JAVELIN",
    "SHURIKEN", "YA", "SILVER_ARROW", "ELVEN_ARROW", "ARROW", "ORCISH_ARROW",
    "CROSSBOW_BOLT", "SILVER_DAGGER", "ELVEN_DAGGER", "DAGGER", "ORCISH_DAGGER", "KNIFE",
    "FLINT", "ROCK", "LOADSTONE", "LUCKSTONE", "DART", "CREAM_PIE",
];

/* polearms */
export const pwep = [ "HALBERD",       "BARDICHE", "SPETUM",
                                     "BILL_GUISARME", "VOULGE",   "RANSEUR",
                                     "GUISARME",      "GLAIVE",   "LUCERN_HAMMER",
                                     "BEC_DE_CORBIN", "FAUCHARD", "PARTISAN",
                                     "LANCE" ];

// C.AKLYS_LIM = C.BOLT_LIM / 2, resolved from generated metadata for C.arwep.
/* throw-and-return weapons */
export const arwep = [
    /* { BOOMERANG, 5, 0 }, */
    { otyp: "AKLYS", range: "AKLYS_RANGE", tethered: 1 },
];

export function autoreturn_weapon(otmp)
{
    let i;

    for (i = 0; i < C.arwep.length; i++) {
        if (otmp.otyp == C.arwep[i].otyp)
            return C.arwep[i];
    }
    return 0;
}

/* select a ranged weapon for the monster */
export function select_rwep(mtmp)
{
    let otmp;
    let mwep;
    let mweponly;
    let i;

    let mlet = mtmp.data.mlet;

    C.gp.propellor = C.hands_obj;
    do { if ((otmp = oselect(mtmp, C.EGG)) != 0) return otmp; } while (0);      /* cockatrice egg */
    if (mlet == C.S_KOP) /* pies are first choice for Kops */
        do { if ((otmp = oselect(mtmp, C.CREAM_PIE)) != 0) return otmp; } while (0);
    if (C.throws_rocks(mtmp.data)) /* ...boulders for giants */
        do { if ((otmp = oselect(mtmp, C.BOULDER)) != 0) return otmp; } while (0);

    /* Select polearms first; they do more damage and aren't expendable.
       But don't pick one if monster's weapon is welded, because then
       we'd never have a chance to throw non-wielding missiles. */
    /* The limit of 13 here is based on the monster polearm range limit
     * (defined as 5 in mthrowu.c).  5 corresponds to a distance of 2 in
     * one direction and 1 in another; one space beyond that would be 3 in
     * one direction and 2 in another; 3^2+2^2=13.
     */
    mwep = C.MON_WEP(mtmp);
    /* NO_WEAPON_WANTED means we already tried to wield and failed */
    mweponly = (C.mwelded(mwep) && mtmp.weapon_check == C.NO_WEAPON_WANTED);
    if (C.dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 13
        && C.couldsee(mtmp.mx, mtmp.my)) {
        if (C.is_art(mwep, C.ART_SNICKERSNEE)) {
            C.gp.propellor = mwep;
            return mwep;
        }

        for (i = 0; i < C.pwep.length; i++) {
            /* Only strong monsters can wield big (esp. long) weapons.
             * Big weapon is basically the same as bimanual.
             * All monsters can wield the remaining weapons.
             */
            if (((C.strongmonst(mtmp.data)
                  && (mtmp.misc_worn_check & C.W_ARMS) == 0)
                 || !C.objects[C.pwep[i]].oc_bimanual)
                && (C.objects[C.pwep[i]].oc_material != C.SILVER
                    || !C.mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, C.pwep[i])) != 0
                    && (C.samePtr(otmp, mwep) || !mweponly)) {
                    C.gp.propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }
    /* Next, try to select a throw-and-return weapon, since they are
     * also not as expendable. Again, don't pick one if monster's
     * weapon is welded.
     */
    for (i = 0; i < C.arwep.length; i++) {
        let arw = C.arwep[i];

        if (!C.mindless(mtmp.data) && !C.is_animal(mtmp.data) && !mweponly
            && C.dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= arw.range
            && C.couldsee(mtmp.mx, mtmp.my)) {
            if ((((mtmp.misc_worn_check & C.W_ARMS) == 0)
                 || !C.objects[arw.otyp].oc_bimanual)
                && (C.objects[arw.otyp].oc_material != C.SILVER
                    || !C.mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, arw.otyp)) != 0
                    && (C.samePtr(otmp, mwep) || !mweponly)) {
                    C.gp.propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }

    /*
     * other than the specific cases above, always select the
     * most potent ranged weapon to hand.
     */
    for (i = 0; i < C.rwep.length; i++) {
        let prop;

        /* shooting gems from slings; this goes just before the darts */
        /* (shooting rocks is already handled via the rwep[] ordering) */
        if (C.rwep[i] == C.DART && !C.likes_gems(mtmp.data)
            && C.m_carrying(mtmp, C.SLING)) { /* propellor */
            for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
                if (otmp.oclass == C.GEM_CLASS
                    && (otmp.otyp != C.LOADSTONE || !otmp.cursed)) {
                    C.gp.propellor = C.m_carrying(mtmp, C.SLING);
                    return otmp;
                }
        }

        /* KMH -- This belongs here so darts will work */
        C.gp.propellor = C.hands_obj;

        prop = C.objects[C.rwep[i]].oc_skill;
        if (prop < 0) {
            switch (-prop) {
            case C.P_BOW:
                C.gp.propellor = oselect(mtmp, C.YUMI);
                if (!C.gp.propellor)
                    C.gp.propellor = oselect(mtmp, C.ELVEN_BOW);
                if (!C.gp.propellor)
                    C.gp.propellor = oselect(mtmp, C.BOW);
                if (!C.gp.propellor)
                    C.gp.propellor = oselect(mtmp, C.ORCISH_BOW);
                break;
            case C.P_SLING:
                C.gp.propellor = oselect(mtmp, C.SLING);
                break;
            case C.P_CROSSBOW:
                C.gp.propellor = oselect(mtmp, C.CROSSBOW);
            }
            if ((otmp = C.MON_WEP(mtmp)) && C.mwelded(otmp) && !C.samePtr(otmp, C.gp.propellor)
                && mtmp.weapon_check == C.NO_WEAPON_WANTED)
                C.gp.propellor = 0;
        }
        /* propellor = obj, propellor to use
         * propellor = &hands_obj, doesn't need a propellor
         * propellor = 0, needed one and didn't have one
         */
        if (C.gp.propellor != 0) {
            /* Note: cannot use m_carrying for loadstones, since it will
             * always select the first object of a type, and maybe the
             * monster is carrying two but only the first is unthrowable.
             */
            if (C.rwep[i] != C.LOADSTONE) {
                /* Don't throw a cursed weapon-in-hand or an artifact */
                if ((otmp = oselect(mtmp, C.rwep[i])) && !otmp.oartifact
                    && !(C.samePtr(otmp, C.MON_WEP(mtmp)) && C.mwelded(otmp)))
                    return otmp;
            } else
                for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
                    if (otmp.otyp == C.LOADSTONE && !otmp.cursed)
                        return otmp;
                }
        }
    }

    /* failure */
    return 0;
}

/* is 'obj' a type of weapon that any monster knows how to throw? */
export function monmightthrowwep(obj)
{
    let idx;

    for (idx = 0; idx < C.rwep.length; ++idx)
        if (obj.otyp == C.rwep[idx])
            return 1;
    return 0;
}

/* Weapons in order of preference */
export const hwep = [
    "CORPSE", /* cockatrice corpse */
    "TSURUGI", "RUNESWORD", "DWARVISH_MATTOCK", "TWO_HANDED_SWORD", "BATTLE_AXE",
    "KATANA", "UNICORN_HORN", "CRYSKNIFE", "TRIDENT", "LONG_SWORD", "ELVEN_BROADSWORD",
    "BROADSWORD", "SCIMITAR", "SILVER_SABER", "MORNING_STAR", "ELVEN_SHORT_SWORD",
    "DWARVISH_SHORT_SWORD", "SHORT_SWORD", "ORCISH_SHORT_SWORD", "SILVER_MACE", "MACE",
    "AXE", "DWARVISH_SPEAR", "SILVER_SPEAR", "ELVEN_SPEAR", "SPEAR", "ORCISH_SPEAR", "FLAIL",
    "BULLWHIP", "QUARTERSTAFF", "JAVELIN", "AKLYS", "CLUB", "PICK_AXE", "RUBBER_HOSE",
    "WAR_HAMMER", "SILVER_DAGGER", "ELVEN_DAGGER", "DAGGER", "ORCISH_DAGGER", "ATHAME",
    "SCALPEL", "KNIFE", "WORM_TOOTH"
];

/* select a hand to hand weapon for the monster */
export function select_hwep(mtmp)
{
    let otmp;
    let i;
    let strong = C.strongmonst(mtmp.data);
    let wearing_shield = (mtmp.misc_worn_check & C.W_ARMS) != 0;

    /* prefer artifacts to everything else */
    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.oclass == C.WEAPON_CLASS && otmp.oartifact
            && C.touch_artifact(otmp, mtmp)
            && ((strong && !wearing_shield)
                || !C.objects[otmp.otyp].oc_bimanual))
            return otmp;
    }

    if (C.is_giant(mtmp.data)) /* giants just love to use clubs */
        do { if ((otmp = oselect(mtmp, C.CLUB)) != 0) return otmp; } while (0);
    else if (C.samePtr(mtmp.data, C.mons[C.PM_BALROG]) && C.uwep)
        do { if ((otmp = oselect(mtmp, C.BULLWHIP)) != 0) return otmp; } while (0);

    /* only strong monsters can wield big (esp. long) weapons */
    /* big weapon is basically the same as bimanual */
    /* all monsters can wield the remaining weapons */
    for (i = 0; i < C.hwep.length; i++) {
        if (C.hwep[i] == C.CORPSE && !(mtmp.misc_worn_check & C.W_ARMG)
            && !C.resists_ston(mtmp))
            continue;
        if (((strong && !wearing_shield) || !C.objects[C.hwep[i]].oc_bimanual)
            && (C.objects[C.hwep[i]].oc_material != C.SILVER
                || !C.mon_hates_silver(mtmp)))
            do { if ((otmp = oselect(mtmp, C.hwep[i])) != 0) return otmp; } while (0);
    }

    /* failure */
    return 0;
}

/* Called after polymorphing a monster, robbing it, etc....  Monsters
 * otherwise never unwield stuff on their own.  Might print message.
 */
export function possibly_unwield(mon, polyspot)
{
    let obj, mw_tmp;

    if (!(mw_tmp = C.MON_WEP(mon)))
        return;
    for (obj = mon.minvent; obj; obj = obj.nobj)
        if (C.samePtr(obj, mw_tmp))
            break;
    if (!obj) { /* The weapon was stolen or destroyed */
        mon.mw = 0;
        mon.weapon_check = C.NEED_WEAPON;
        return;
    }
    if (!C.attacktype(mon.data, C.AT_WEAP)) {
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = C.NO_WEAPON_WANTED;
        /* if we're going to call distant_name(), do so before extract_self */
        if (C.cansee(mon.mx, mon.my)) {
            C.pline_mon(mon, "%s drops %s.", C.Monnam(mon), C.distant_name(obj, C.doname));
            C.newsym(mon.mx, mon.my);
        }
        C.obj_extract_self(obj);
        /* might be dropping object into water or lava */
        if (!C.flooreffects(obj, mon.mx, mon.my, "drop")) {
            if (polyspot)
                C.bypass_obj(obj);
            C.place_object(obj, mon.mx, mon.my);
            C.stackobj(obj);
        }
        return;
    }
    /* The remaining case where there is a change is where a monster
     * is polymorphed into a stronger/weaker monster with a different
     * choice of weapons.  This has no parallel for players.  It can
     * be handled by waiting until mon_wield_item is actually called.
     * Though the monster still wields the wrong weapon until then,
     * this is OK since the player can't see it.  (FIXME: Not okay since
     * probing can reveal it.)
     * Note that if there is no change, setting the check to NEED_WEAPON
     * is harmless.
     * Possible problem: big monster with big cursed weapon gets
     * polymorphed into little monster.  But it's not quite clear how to
     * handle this anyway....
     */
    if (!(C.mwelded(mw_tmp) && mon.weapon_check == C.NO_WEAPON_WANTED))
        mon.weapon_check = C.NEED_WEAPON;
    return;
}

/* Let a monster try to wield a weapon, based on mon->weapon_check.
 * Returns 1 if the monster took time to do it, 0 if it did not.
 */
export function mon_wield_item(mon)
{
    let obj;
    let exclaim = 1; /* assume mon is planning to attack */

    /* This case actually should never happen */
    if (mon.weapon_check == C.NO_WEAPON_WANTED)
        return 0;
    switch (mon.weapon_check) {
    case C.NEED_HTH_WEAPON:
        obj = select_hwep(mon);
        break;
    case C.NEED_RANGED_WEAPON:
        select_rwep(mon);
        obj = C.gp.propellor;
        break;
    case C.NEED_PICK_AXE:
        obj = C.m_carrying(mon, C.PICK_AXE);
        /* KMH -- allow other picks */
        if (!obj && !C.which_armor(mon, C.W_ARMS))
            obj = C.m_carrying(mon, C.DWARVISH_MATTOCK);
        exclaim = 0; /* mon is just planning to dig */
        break;
    case C.NEED_AXE:
        /* currently, only 2 types of axe */
        obj = C.m_carrying(mon, C.BATTLE_AXE);
        if (!obj || C.which_armor(mon, C.W_ARMS))
            obj = C.m_carrying(mon, C.AXE);
        exclaim = 0;
        break;
    case C.NEED_PICK_OR_AXE:
        /* prefer pick for fewer switches on most levels */
        obj = C.m_carrying(mon, C.DWARVISH_MATTOCK);
        if (!obj)
            obj = C.m_carrying(mon, C.BATTLE_AXE);
        if (!obj || C.which_armor(mon, C.W_ARMS)) {
            obj = C.m_carrying(mon, C.PICK_AXE);
            if (!obj)
                obj = C.m_carrying(mon, C.AXE);
        }
        exclaim = 0;
        break;
    default:
        C.impossible("weapon_check %d for %s?", mon.weapon_check,
                   C.mon_nam(mon));
        return 0;
    }
    if (obj && !C.samePtr(obj, C.hands_obj)) {
        let mw_tmp = C.MON_WEP(mon);

        if (mw_tmp && mw_tmp.otyp == obj.otyp) {
            /* already wielding it */
            mon.weapon_check = C.NEED_WEAPON;
            return 0;
        }
        /* Actually, this isn't necessary--as soon as the monster
         * wields the weapon, the weapon welds itself, so the monster
         * can know it's cursed and needn't even bother trying.
         * Still....
         */
        if (mw_tmp && C.mwelded(mw_tmp)) {
            if (C.canseemon(mon)) {
                const welded_buf = C.stackAlloc(C.BUFSZ);
                let mon_hand = C.mbodypart(mon, C.HAND);

                if (C.bimanual(mw_tmp))
                    mon_hand = C.makeplural(mon_hand);
                C.Sprintf(welded_buf, "%s welded to %s %s",
                        C.otense(mw_tmp, "are"), C.mhis(mon), mon_hand);

                if (obj.otyp == C.PICK_AXE) {
                    C.pline("Since %s weapon%s %s,", C.s_suffix(C.mon_nam(mon)),
                          C.plur(mw_tmp.quan), welded_buf);
                    C.pline("%s cannot wield that %s.", C.mon_nam(mon),
                          C.xname(obj));
                } else {
                    C.pline_mon(mon, "%s tries to wield %s.", C.Monnam(mon), C.doname(obj));
                    C.pline("%s %s!", C.Yname2(mw_tmp), welded_buf);
                }
                mw_tmp.bknown = 1;
            }
            mon.weapon_check = C.NO_WEAPON_WANTED;
            return 1;
        }
        mon.mw = obj; /* wield obj */
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = C.NEED_WEAPON;
        if (C.canseemon(mon)) {
            let newly_welded;
            let arw;

            C.pline_mon(mon, "%s wields %s%c",
                      C.Monnam(mon), C.doname(obj),
                      exclaim ? 33 : 46);
            if ((arw = autoreturn_weapon(obj)) != 0 && arw.tethered != 0)
                C.pline_mon(mon, "%s secures the tether on %s.", C.Monnam(mon),
                          C.the(C.xname(obj)));

            /* 3.6.3: mwelded() predicate expects the object to have its
               W_WEP bit set in owormmask, but the pline here and for
               artifact_light don't want that because they'd have '(weapon
               in hand/claw)' appended; so we set it for the mwelded test
               and then clear it, until finally setting it for good below */
            obj.owornmask |= C.W_WEP;
            newly_welded = C.mwelded(obj);
            obj.owornmask &= ~C.W_WEP;
            if (newly_welded) {
                let mon_hand = C.mbodypart(mon, C.HAND);

                if (C.bimanual(obj))
                    mon_hand = C.makeplural(mon_hand);
                C.pline("%s %s to %s %s!", C.Tobjnam(obj, "weld"),
                      C.is_plural(obj) ? "themselves" : "itself",
                      C.s_suffix(C.mon_nam(mon)), mon_hand);
                obj.bknown = 1;
            }
        }
        if (C.artifact_light(obj) && !obj.lamplit) {
            C.begin_burn(obj, 0);
            if (C.canseemon(mon))
                C.pline("%s %s in %s %s!", C.Tobjnam(obj, "shine"),
                      C.arti_light_description(obj), C.s_suffix(C.mon_nam(mon)),
                      C.mbodypart(mon, C.HAND));
            /* 3.6.3: artifact might be getting wielded by invisible monst */
            else if (C.cansee(mon.mx, mon.my))
                C.pline("Light begins shining %s.",
                      (C.mdistu(mon) <= 5 * 5) ? "nearby" : "in the distance");
        }
        obj.owornmask = C.W_WEP;
        return 1;
    }
    mon.weapon_check = C.NEED_WEAPON;
    return 0;
}

/* force monster to stop wielding current weapon, if any */
export function mwepgone(mon)
{
    let mwep = C.MON_WEP(mon);

    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = C.NEED_WEAPON;
    }
}

/* attack bonus for strength & dexterity */
export function abon()
{
    let sbon;
    let str = C.ACURR(C.A_STR), dex = C.ACURR(C.A_DEX);

    if (C.Upolyd)
        return (C.adj_lev(C.mons[C.u.umonnum]) - 3);

    /* this used to be '<= 18/50' for bonus of 1 but got changed to '< 18/50'
       so that '18/50' gives a bonus of 2; gnome and orc player characters
       have max Str of 18/50 and giving an extra bonus at that break point
       provides an incentive for them to max out that characteristic */
    if (str < 6)
        sbon = -2;
    else if (str < 8)
        sbon = -1;
    else if (str < 17)
        sbon = 0;
    else if (str < C.STR18(50))
        sbon = 1; /* up to 18/49 */
    else if (str < C.STR18(100))
        sbon = 2;
    else
        sbon = 3;

    /* Game tuning kludge: make it a bit easier for a low level character to
     * hit */
    sbon += (C.u.ulevel < 3) ? 1 : 0;

    if (dex < 4)
        return (sbon - 3);
    else if (dex < 6)
        return (sbon - 2);
    else if (dex < 8)
        return (sbon - 1);
    else if (dex < 14)
        return sbon;
    else
        return (sbon + dex - 14);
}

/* damage bonus for strength */
export function dbon()
{
    let str = C.ACURR(C.A_STR);

    if (C.Upolyd)
        return 0;

    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str == 18)
        return 2; /* up to 18 */
    else if (str <= C.STR18(75))
        return 3; /* up to 18/75 */
    else if (str <= C.STR18(90))
        return 4; /* up to 18/90 */
    else if (str < C.STR18(100))
        return 5; /* up to 18/99 */
    else
        return 6;
}

/* called when wet_a_towel() or dry_a_towel() is changing a towel's wetness */
export function finish_towel_change(obj, newspe)
{
    /* towel wetness is always between 0 (dry) and 7, inclusive */
    newspe = C.min(newspe, 7);
    obj.spe = C.max(newspe, 0);

    /* if hero is wielding this towel, don't give "you begin bashing with
       your [wet] towel" message if it's wet, do give one if it's dry */
    if (C.samePtr(obj, C.uwep))
        C.gu.unweapon = !C.is_wet_towel(obj);

    /* description might change: "towel" vs "moist towel" vs "wet towel" */
    if (C.carried(obj))
        C.update_inventory();
}

/* increase a towel's wetness */
export function wet_a_towel(obj, amt, verbose) /* positive: new val; negative: increment by -amt; zero: no-op */
{
    let newspe = (amt <= 0) ? obj.spe - amt : amt;

    /* new state is only reported if it's an increase */
    if (newspe > obj.spe) {
        if (verbose) {
            let wetness = (newspe < 3)
                                     ? (!obj.spe ? "damp" : "damper")
                                     : (!obj.spe ? "wet" : "wetter");

            if (C.carried(obj))
                C.pline("%s gets %s.", C.Yobjnam2(obj, 0),
                      wetness);
            else if (C.mcarried(obj) && C.canseemon(obj.ocarry))
                C.pline("%s %s gets %s.", C.s_suffix(C.Monnam(obj.ocarry)),
                      C.xname(obj), wetness);
        }
    }

    if (newspe != obj.spe)
        finish_towel_change(obj, newspe);
}

/* decrease a towel's wetness; unlike when wetting, 0 is not a no-op */
export function dry_a_towel(obj, amt, verbose) /* positive or zero: new value; negative: decrement by abs(amt) */
{
    let newspe = (amt < 0) ? obj.spe + amt : amt;

    /* new state is only reported if it's a decrease */
    if (newspe < obj.spe) {
        if (verbose) {
            if (C.carried(obj))
                C.pline("%s dries%s.", C.Yobjnam2(obj, 0),
                      !newspe ? " out" : "");
            else if (C.mcarried(obj) && C.canseemon(obj.ocarry))
                C.pline("%s %s dries%s.", C.s_suffix(C.Monnam(obj.ocarry)),
                      C.xname(obj), !newspe ? " out" : "");
        }
    }

    if (newspe != obj.spe)
        finish_towel_change(obj, newspe);
}

/* copy the skill level name into the given buffer */
export function skill_level_name(skill, buf)
{
    let ptr;

    switch (C.u.weapon_skills[skill].skill) {
    case C.P_UNSKILLED:
        ptr = "Unskilled";
        break;
    case C.P_BASIC:
        ptr = "Basic";
        break;
    case C.P_SKILLED:
        ptr = "Skilled";
        break;
    case C.P_EXPERT:
        ptr = "Expert";
        break;
    /* these are for unarmed combat/martial arts only */
    case C.P_MASTER:
        ptr = "Master";
        break;
    case C.P_GRAND_MASTER:
        ptr = "Grand Master";
        break;
    default:
        ptr = "Unknown";
        break;
    }
    C.Strcpy(buf, ptr);
    return buf;
}

export function skill_name(skill)
{
    return ((C.skill_names_indices[skill] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[skill]]) : (skill == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[skill]]);
}

/* return the # of slots required to advance the skill */
export function slots_required(skill)
{
    let tmp = C.u.weapon_skills[skill].skill;

    /* The more difficult the training, the more slots it takes.
     *  unskilled -> basic      1
     *  basic -> skilled        2
     *  skilled -> expert       3
     */
    if (skill <= C.P_LAST_WEAPON || skill == C.P_TWO_WEAPON_COMBAT)
        return tmp;

    /* Fewer slots used up for unarmed or martial.
     *  unskilled -> basic      1
     *  basic -> skilled        1
     *  skilled -> expert       2
     *  expert -> master        2
     *  master -> grand master  3
     */
    return Math.trunc((tmp + 1) / 2);
}

/* return true if this skill can be advanced */
export function can_advance(skill, speedy)
{
    if ((C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED)
        || C.u.weapon_skills[skill].skill >= C.u.weapon_skills[skill].max_skill
        || C.u.skills_advanced >= C.P_SKILL_LIMIT)
        return 0;

    if (C.wizard && speedy)
        return 1;

    return C.bool(C.int(C.u.weapon_skills[skill].advance)
                      >= C.practice_needed_to_advance(C.u.weapon_skills[skill].skill)
                      && C.u.weapon_slots >= slots_required(skill));
}

/* return true if this skill could be advanced if more slots were available */
export function could_advance(skill)
{
    if ((C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED)
        || C.u.weapon_skills[skill].skill >= C.u.weapon_skills[skill].max_skill
        || C.u.skills_advanced >= C.P_SKILL_LIMIT)
        return 0;

    return C.bool(C.int(C.u.weapon_skills[skill].advance)
                      >= C.practice_needed_to_advance(C.u.weapon_skills[skill].skill));
}

/* return true if this skill has reached its maximum and there's been enough
   practice to become eligible for the next step if that had been possible */
export function peaked_skill(skill)
{
    if ((C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED))
        return 0;

    return C.bool(C.u.weapon_skills[skill].skill >= C.u.weapon_skills[skill].max_skill
                      && (C.int(C.u.weapon_skills[skill].advance)
                          >= C.practice_needed_to_advance(C.u.weapon_skills[skill].skill)));
}

export function skill_advance(skill)
{
    C.u.weapon_slots -= slots_required(skill);
    C.u.weapon_skills[skill].skill++;
    C.u.skill_record[C.u.skills_advanced++] = skill;
    /* subtly change the advance message to indicate no more advancement */
    C.You("are now %s skilled in %s.",
        C.u.weapon_skills[skill].skill >= C.u.weapon_skills[skill].max_skill ? "most" : "more",
        ((C.skill_names_indices[skill] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[skill]]) : (skill == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[skill]]));

    /* wizards discover spellbook IDs depending on spell 'school' skill limits;
       this allows them to successfully write books for unknown spells without
       the Luck bias they used to have over other roles */
    if (skill >= C.P_FIRST_SPELL && skill <= C.P_LAST_SPELL)
        C.skill_based_spellbook_id();
}

export const skill_ranges = [
    { first: "P_FIRST_H_TO_H", last: "P_LAST_H_TO_H", name: "Fighting Skills" },
    { first: "P_FIRST_WEAPON", last: "P_LAST_WEAPON", name: "Weapon Skills" },
    { first: "P_FIRST_SPELL", last: "P_LAST_SPELL", name: "Spellcasting Skills" },
];

/* write a list of skills onto the given menu

   if selectable is set, give selection letters for skills that can be
   advanced and leave room for them on skills that can't be advanced */
export function add_skills_to_menu(win, selectable, speedy)
{
    let pass, i, len, longest;
    const any = C.anyLocal();
    const buf = C.stackAlloc(C.BUFSZ), sklnambuf = C.stackAlloc(C.BUFSZ);
    let prefix;
    let clr = C.NO_COLOR;

    /* Find the longest skill name. */
    for (longest = 0, i = 0; i < C.P_NUM_SKILLS; i++) {
        if ((C.u.weapon_skills[i].skill == C.P_ISRESTRICTED))
            continue;
        if ((len = C.Strlen(((C.skill_names_indices[i] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[i]]) : (i == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[i]]))) > longest)
            longest = len;
    }

    /* List the skills, making ones that could be advanced selectable if
       selectable is set.  List the miscellaneous skills first.  Possible
       future enhancement: list spell skills before weapon skills for
       spellcaster roles. */
    for (pass = 0; pass < C.skill_ranges.length; pass++)
        for (i = C.skill_ranges[pass].first; i <= C.skill_ranges[pass].last;
             i++) {
            /* Print headings for skill types */
            C.copyAny(any, C.cg.zeroany);
            if (i == C.skill_ranges[pass].first)
                C.add_menu_heading(win, C.skill_ranges[pass].name);

            if ((C.u.weapon_skills[i].skill == C.P_ISRESTRICTED))
                continue;
            /*
             * Sigh, this assumes a monospaced font unless
             * iflags.menu_tab_sep is set in which case it puts
             * tabs between columns.
             * The 12 is the longest skill level name.
             * The "    " is room for a selection letter and dash, "a - ".
             */
            if (!selectable)
                prefix = "";
            else if (can_advance(i, speedy))
                prefix = ""; /* will be preceded by menu choice */
            else if (could_advance(i))
                prefix = "  * ";
            else if (peaked_skill(i))
                prefix = "  # ";
            else
                prefix = "    ";
            skill_level_name(i, sklnambuf);
            if (C.wizard) {
                if (!C.iflags.menu_tab_sep)
                    C.Snprintf(buf, C.BUFSZ,
                             " %s%-*s %-12s %5d(%4d)", prefix,
                             longest, ((C.skill_names_indices[i] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[i]]) : (i == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[i]]), sklnambuf, C.u.weapon_skills[i].advance,
                             C.practice_needed_to_advance(C.u.weapon_skills[i].skill), 0);
                else
                    C.Snprintf(buf, C.BUFSZ,
                             " %s%s\t%s\t%5d(%4d)", prefix, ((C.skill_names_indices[i] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[i]]) : (i == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[i]]),
                             sklnambuf, C.u.weapon_skills[i].advance,
                             C.practice_needed_to_advance(C.u.weapon_skills[i].skill), 1);
            } else {
                if (!C.iflags.menu_tab_sep)
                    C.Snprintf(buf, C.BUFSZ,
                             " %s %-*s [%s]", prefix, longest,
                             ((C.skill_names_indices[i] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[i]]) : (i == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[i]]), sklnambuf, 2);
                else
                    C.Snprintf(buf, C.BUFSZ,
                             " %s%s\t[%s]", prefix, ((C.skill_names_indices[i] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[i]]) : (i == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[i]]),
                             sklnambuf, 3);
            }
            any.a_int = selectable && can_advance(i, speedy) ? i + 1 : 0;
            C.add_menu(win, C.nul_glyphinfo, any, 0, 0,
                     C.ATR_NONE, clr, buf, C.MENU_ITEMFLAGS_NONE);
        }
}

/* Displays a skill list for dumplog purposes. */
export function show_skills()
{
    let win;
    const selected = C.menuPointerLocal();

    C.pline("Skills:");
    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);
    C.callLocal(add_skills_to_menu, win, 0, 0);
    C.end_menu(win, "");
    C.select_menu(win, C.PICK_NONE, selected);
    C.destroy_nhwindow(win);
}

/*
 * The `#enhance' extended command.  What we _really_ would like is
 * to keep being able to pick things to advance until we couldn't any
 * more.  This is currently not possible -- the menu code has no way
 * to call us back for instant action.  Even if it did, we would also need
 * to be able to update the menu since selecting one item could make
 * others unselectable.
 */
export function enhance_weapon_skill()
{
    let i, n, to_advance, eventually_advance, maxxed_cnt;
    const buf = C.stackAlloc(C.BUFSZ);
    const selected = C.menuPointerLocal();
    let win;
    let speedy = 0;

    /* player knows about #enhance, don't show tip anymore */
    C.svc.context.tips |= BigInt(1 << C.TIP_ENHANCE);

    if (C.wizard && C.y_n("Advance skills without practice?") == 121)
        speedy = 1;

    do {
        /* count advanceable skills */
        to_advance = eventually_advance = maxxed_cnt = 0;
        for (i = 0; i < C.P_NUM_SKILLS; i++) {
            if ((C.u.weapon_skills[i].skill == C.P_ISRESTRICTED))
                continue;
            if (can_advance(i, speedy))
                to_advance++;
            else if (could_advance(i))
                eventually_advance++;
            else if (peaked_skill(i))
                maxxed_cnt++;
        }

        win = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(win, C.MENU_BEHAVE_STANDARD);

        /* start with a legend if any entries will be annotated
           with "*" or "#" below */
        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0) {
                C.Sprintf(buf, "(Skill%s flagged by \"*\" may be enhanced %s.)",
                        C.plur(eventually_advance),
                        (C.u.ulevel < C.MAXULEV)
                            ? "when you're more experienced"
                            : "if skill slots become available");
                C.add_menu_str(win, buf);
            }
            if (maxxed_cnt > 0) {
                C.Sprintf(buf,
                 "(Skill%s flagged by \"#\" cannot be enhanced any further.)",
                        C.plur(maxxed_cnt));
                C.add_menu_str(win, buf);
            }
            C.add_menu_str(win, "");
        }

        C.callLocal(add_skills_to_menu,
            win, to_advance + eventually_advance + maxxed_cnt > 0, speedy);

        C.Strcpy(buf, (to_advance > 0) ? "Pick a skill to advance:"
                                     : "Current skills:");
        if (C.wizard && !speedy)
            C.Sprintf(C.eos(buf), "  (%d slot%s available)", C.u.weapon_slots,
                    C.plur(C.u.weapon_slots));
        C.end_menu(win, buf);
        n = C.select_menu(win, to_advance ? C.PICK_ONE : C.PICK_NONE, selected);
        C.destroy_nhwindow(win);
        if (n > 0) {
            n = selected.value[0].item.a_int - 1; /* get item selected */
            C.free(selected.value);
            skill_advance(n);
            /* check for more skills able to advance; if so, then... */
            for (n = i = 0; i < C.P_NUM_SKILLS; i++) {
                if (can_advance(i, speedy)) {
                    if (!speedy)
                        C.You_feel("you could be more dangerous!");
                    n++;
                    break;
                }
            }
        }
    } while (speedy && n > 0);
    return C.ECMD_OK;
}

/*
 * Change from restricted to unrestricted, allowing P_BASIC as max.  This
 * function may be called with with P_NONE.  Used in pray.c as well as below.
 */
export function unrestrict_weapon_skill(skill)
{
    if (skill < C.P_NUM_SKILLS && (C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED)) {
        C.u.weapon_skills[skill].skill = C.P_UNSKILLED;
        C.u.weapon_skills[skill].max_skill = C.P_BASIC;
        C.u.weapon_skills[skill].advance = 0;
    }
}

export function use_skill(skill, degree)
{
    let advance_before;

    if (skill != C.P_NONE && !(C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED)) {
        advance_before = can_advance(skill, 0);
        C.u.weapon_skills[skill].advance += degree;
        if (!advance_before && can_advance(skill, 0))
            give_may_advance_msg(skill);
    }
}

export function add_weapon_skill(n) /* number of slots to gain; normally one */
{
    let i, before, after;

    for (i = 0, before = 0; i < C.P_NUM_SKILLS; i++)
        if (can_advance(i, 0))
            before++;
    C.u.weapon_slots += n;
    for (i = 0, after = 0; i < C.P_NUM_SKILLS; i++)
        if (can_advance(i, 0))
            after++;
    if (before < after)
        give_may_advance_msg(C.P_NONE);
}

export function lose_weapon_skill(n) /* number of slots to lose; normally one */
{
    let skill;

    while (--n >= 0) {
        /* deduct first from unused slots then from last placed one, if any */
        if (C.u.weapon_slots) {
            C.u.weapon_slots--;
        } else if (C.u.skills_advanced) {
            skill = C.u.skill_record[--C.u.skills_advanced];
            if (C.u.weapon_skills[skill].skill <= C.P_UNSKILLED)
                C.panic("lose_weapon_skill (%d)", skill);
            C.u.weapon_skills[skill].skill--; /* drop skill one level */
            /* Lost skill might have taken more than one slot; refund rest. */
            C.u.weapon_slots = slots_required(skill) - 1;
            /* It might now be possible to advance some other pending
               skill by using the refunded slots, but giving a message
               to that effect would seem pretty confusing.... */
        }
    }
}

export function drain_weapon_skill(n) /* number of skills to drain */
{
    let skill;
    let i;
    let curradv;
    let prevadv;
    const tmpskills = new Int32Array(C.P_NUM_SKILLS);

    tmpskills.fill(0);

    while (--n >= 0) {
        if (C.u.skills_advanced) {
            /* Pick a random skill, deleting it from the list. */
            i = C.rn2(C.u.skills_advanced, 1489, 'drain_weapon_skill');
            skill = C.u.skill_record[i];
            tmpskills[skill] = 1;
            for (; i < C.u.skills_advanced - 1; i++) {
                C.u.skill_record[i] = C.u.skill_record[i + 1];
            }
            C.u.skills_advanced--;
            if (C.u.weapon_skills[skill].skill <= C.P_UNSKILLED)
                C.panic("drain_weapon_skill (%d)", skill);
            C.u.weapon_skills[skill].skill--;   /* drop skill one level */
            /* refund slots used for skill */
            C.u.weapon_slots += slots_required(skill);
            /* drain skill training to a value appropriate for new level */
            curradv = C.practice_needed_to_advance(C.u.weapon_skills[skill].skill);
            prevadv = C.practice_needed_to_advance(C.u.weapon_skills[skill].skill - 1);
            if (C.u.weapon_skills[skill].advance >= curradv)
                C.u.weapon_skills[skill].advance = prevadv + C.rn2(curradv - prevadv, 1505, 'drain_weapon_skill');
        }
    }

    for (skill = 0; skill < C.P_NUM_SKILLS; skill++)
        if (tmpskills[skill]) {
            C.You("forget %syour training in %s.",
                C.u.weapon_skills[skill].skill >= C.P_BASIC ? "some of " : "", ((C.skill_names_indices[skill] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[skill]]) : (skill == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[skill]]));
        }
}

export function weapon_type(obj)
{
    /* KMH -- now uses the object table */
    let type;

    if (!obj)
        return C.P_BARE_HANDED_COMBAT; /* Not using a weapon */
    if (obj.oclass != C.WEAPON_CLASS && obj.oclass != C.TOOL_CLASS
        && obj.oclass != C.GEM_CLASS)
        return C.P_NONE; /* Not a weapon, weapon-tool, or ammo */
    type = C.objects[obj.otyp].oc_skill;
    return (type < 0) ? -type : type;
}

export function uwep_skill_type()
{
    if (C.u.twoweap)
        return C.P_TWO_WEAPON_COMBAT;
    return weapon_type(C.uwep);
}

/*
 * Return hit bonus/penalty based on skill of weapon.
 * weapon can be null, meaning bare-handed combat.
 * Treat restricted weapons as unskilled.
 */
export function weapon_hit_bonus(weapon)
{
    let type, wep_type, skill, bonus = 0;
    const bad_skill = "weapon_hit_bonus: bad skill %d";

    wep_type = weapon_type(weapon);
    /* use two weapon skill only if attacking with one of the wielded weapons
     */
    type = (C.u.twoweap && (C.samePtr(weapon, C.uwep) || C.samePtr(weapon, C.uswapwep)))
               ? C.P_TWO_WEAPON_COMBAT
               : wep_type;
    if (type == C.P_NONE) {
        bonus = 0;
    } else if (type <= C.P_LAST_WEAPON) {
        switch (C.u.weapon_skills[type].skill) {
        default:
            C.impossible(bad_skill, C.u.weapon_skills[type].skill);
            
            /* FALLTHRU */
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            bonus = -4;
            break;
        case C.P_BASIC:
            bonus = 0;
            break;
        case C.P_SKILLED:
            bonus = 2;
            break;
        case C.P_EXPERT:
            bonus = 3;
            break;
        }
    } else if (type == C.P_TWO_WEAPON_COMBAT) {
        skill = C.u.weapon_skills[C.P_TWO_WEAPON_COMBAT].skill;
        if (C.u.weapon_skills[wep_type].skill < skill)
            skill = C.u.weapon_skills[wep_type].skill;
        switch (skill) {
        default:
            C.impossible(bad_skill, skill);
            
            /* FALLTHRU */
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            bonus = -9;
            break;
        case C.P_BASIC:
            bonus = -7;
            break;
        case C.P_SKILLED:
            bonus = -5;
            break;
        case C.P_EXPERT:
            bonus = -3;
            break;
        }
    } else if (type == C.P_BARE_HANDED_COMBAT) {
        /*
         *        b.h. m.a.
         * unskl:  +1  n/a
         * basic:  +1   +3
         * skild:  +2   +4
         * exprt:  +2   +5
         * mastr:  +3   +6
         * grand:  +3   +7
         */
        bonus = C.u.weapon_skills[type].skill;
        bonus = C.max(bonus, C.P_UNSKILLED) - 1; /* unskilled => 0 */
        bonus = Math.trunc(((bonus + 2) * (C.martial_bonus() ? 2 : 1)) / 2);
    }

    /* KMH -- It's harder to hit while you are riding */
    if (C.u.usteed) {
        switch (C.u.weapon_skills[C.P_RIDING].skill) {
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            bonus -= 2;
            break;
        case C.P_BASIC:
            bonus -= 1;
            break;
        case C.P_SKILLED:
            break;
        case C.P_EXPERT:
            break;
        }
        if (C.u.twoweap)
            bonus -= 2;
    }

    return bonus;
}

/*
 * Return damage bonus/penalty based on skill of weapon.
 * weapon can be null, meaning bare-handed combat.
 * Treat restricted weapons as unskilled.
 */
export function weapon_dam_bonus(weapon)
{
    let type, wep_type, skill, bonus = 0;

    wep_type = weapon_type(weapon);
    /* use two weapon skill only if attacking with one of the wielded weapons
     */
    type = (C.u.twoweap && (C.samePtr(weapon, C.uwep) || C.samePtr(weapon, C.uswapwep)))
               ? C.P_TWO_WEAPON_COMBAT
               : wep_type;
    if (type == C.P_NONE) {
        bonus = 0;
    } else if (type <= C.P_LAST_WEAPON) {
        switch (C.u.weapon_skills[type].skill) {
        default:
            C.impossible("weapon_dam_bonus: bad skill %d", C.u.weapon_skills[type].skill);
            
        /* FALLTHRU */
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            bonus = -2;
            break;
        case C.P_BASIC:
            bonus = 0;
            break;
        case C.P_SKILLED:
            bonus = 1;
            break;
        case C.P_EXPERT:
            bonus = 2;
            break;
        }
    } else if (type == C.P_TWO_WEAPON_COMBAT) {
        skill = C.u.weapon_skills[C.P_TWO_WEAPON_COMBAT].skill;
        if (C.u.weapon_skills[wep_type].skill < skill)
            skill = C.u.weapon_skills[wep_type].skill;
        switch (skill) {
        default:
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            bonus = -3;
            break;
        case C.P_BASIC:
            bonus = -1;
            break;
        case C.P_SKILLED:
            bonus = 0;
            break;
        case C.P_EXPERT:
            bonus = 1;
            break;
        }
    } else if (type == C.P_BARE_HANDED_COMBAT) {
        /*
         *        b.h. m.a.
         * unskl:   0  n/a
         * basic:  +1   +3
         * skild:  +1   +4
         * exprt:  +2   +6
         * mastr:  +2   +7
         * grand:  +3   +9
         */
        bonus = C.u.weapon_skills[type].skill;
        bonus = C.max(bonus, C.P_UNSKILLED) - 1; /* unskilled => 0 */
        bonus = Math.trunc(((bonus + 1) * (C.martial_bonus() ? 3 : 1)) / 2);
    }

    /* KMH -- Riding gives some thrusting damage */
    if (C.u.usteed && type != C.P_TWO_WEAPON_COMBAT) {
        switch (C.u.weapon_skills[C.P_RIDING].skill) {
        case C.P_ISRESTRICTED:
        case C.P_UNSKILLED:
            break;
        case C.P_BASIC:
            break;
        case C.P_SKILLED:
            bonus += 1;
            break;
        case C.P_EXPERT:
            bonus += 2;
            break;
        }
    }

    return bonus;
}

/*
 * Initialize weapon skill array for the game.  Start by setting all
 * skills to restricted, then set the skill for every weapon the
 * hero is holding, finally reading the given array that sets
 * maximums.
 */
export function skill_init(class_skill)
{
    let obj;
    let skmax, skill;

    /* initialize skill array; by default, everything is restricted */
    for (skill = 0; skill < C.P_NUM_SKILLS; skill++) {
        C.u.weapon_skills[skill].skill = C.P_ISRESTRICTED;
        C.u.weapon_skills[skill].max_skill = C.P_ISRESTRICTED;
        C.u.weapon_skills[skill].advance = 0;
    }

    /* Set skill for all weapons in inventory to be basic */
    for (obj = C.gi.invent; obj; obj = obj.nobj) {
        /* don't give skill just because of carried ammo, wait until
           we see the relevant launcher (prevents an archeologist's
           touchstone from inadvertently providing skill in sling) */
        if (C.is_ammo(obj))
            continue;

        skill = weapon_type(obj);
        if (skill != C.P_NONE)
            C.u.weapon_skills[skill].skill = C.P_BASIC;
    }

    /* set skills for magic */
    if (C.Role_if(C.PM_HEALER) || C.Role_if(C.PM_MONK)) {
        C.u.weapon_skills[C.P_HEALING_SPELL].skill = C.P_BASIC;
    } else if (C.Role_if(C.PM_CLERIC)) {
        C.u.weapon_skills[C.P_CLERIC_SPELL].skill = C.P_BASIC;
    } else if (C.Role_if(C.PM_WIZARD)) {
        C.u.weapon_skills[C.P_ATTACK_SPELL].skill = C.P_BASIC;
        C.u.weapon_skills[C.P_ENCHANTMENT_SPELL].skill = C.P_BASIC;
    }

    /* walk through array to set skill maximums */
    for (; class_skill.skill != C.P_NONE; class_skill = C.defSkillNext(class_skill)) {
        skmax = class_skill.skmax;
        skill = class_skill.skill;

        C.u.weapon_skills[skill].max_skill = skmax;
        if (C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED) /* skill pre-set */
            C.u.weapon_skills[skill].skill = C.P_UNSKILLED;
    }

    /* High potential fighters already know how to use their hands. */
    if (C.u.weapon_skills[C.P_BARE_HANDED_COMBAT].max_skill > C.P_EXPERT)
        C.u.weapon_skills[C.P_BARE_HANDED_COMBAT].skill = C.P_BASIC;

    /* Roles that start with a horse know how to ride it */
    if (C.gu.urole.petnum == C.PM_PONY)
        C.u.weapon_skills[C.P_RIDING].skill = C.P_BASIC;

    /*
     * Make sure we haven't missed setting the max on a skill
     * & set advance
     */
    for (skill = 0; skill < C.P_NUM_SKILLS; skill++) {
        if (!(C.u.weapon_skills[skill].skill == C.P_ISRESTRICTED)) {
            if (C.u.weapon_skills[skill].max_skill < C.u.weapon_skills[skill].skill) {
                C.impossible("skill_init: curr > max: %s", ((C.skill_names_indices[skill] > 0) ? C.OBJ_NAME(C.objects[C.skill_names_indices[skill]]) : (skill == C.P_BARE_HANDED_COMBAT) ? C.barehands_or_martial[C.martial_bonus()] : C.odd_skill_names[-C.skill_names_indices[skill]]));
                C.u.weapon_skills[skill].max_skill = C.u.weapon_skills[skill].skill;
            }
            C.u.weapon_skills[skill].advance = C.practice_needed_to_advance(C.u.weapon_skills[skill].skill - 1);
        }
    }

    /* each role has a special spell; allow at least basic for its type
       (despite the function name, this works for spell skills too) */
    unrestrict_weapon_skill(C.spell_skilltype(C.gu.urole.spelspec));

    if (!C.u.uroleplay.pauper) /* paupers lack advanced access to books */
        C.skill_based_spellbook_id();
}

export function setmnotwielded(mon, obj)
{
    if (!obj)
        return;
    if (C.artifact_light(obj) && obj.lamplit) {
        C.end_burn(obj, 0);
        if (C.canseemon(mon))
            C.pline("%s in %s %s %s shining.", C.The(C.xname(obj)),
                  C.s_suffix(C.mon_nam(mon)), C.mbodypart(mon, C.HAND),
                  C.otense(obj, "stop"));
    }
    if (C.samePtr(C.MON_WEP(mon), obj))
        mon.mw = 0;
    obj.owornmask &= ~C.W_WEP;
}


/*weapon.c*/
