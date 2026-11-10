import {C} from './c-runtime.js';
/* NetHack 5.0	makemon.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.271 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */


/* this assumes that a human quest leader or nemesis is an archetype
   of the corresponding role; that isn't so for some roles (tourist
   for instance) but is for the priests and monks we use it for... */
















export function is_home_elemental(ptr)
{
    if (ptr.mlet == C.S_ELEMENTAL) {
        switch (C.monsndx(ptr)) {
        case C.PM_AIR_ELEMENTAL:
            return C.Is_airlevel(C.u.uz);
        case C.PM_FIRE_ELEMENTAL:
            return C.Is_firelevel(C.u.uz);
        case C.PM_EARTH_ELEMENTAL:
            return C.Is_earthlevel(C.u.uz);
        case C.PM_WATER_ELEMENTAL:
            return C.Is_waterlevel(C.u.uz);
        default:
            break;
        }
    }
    return 0;
}

/*
 * Return true if the given monster cannot exist on this elemental level.
 */

export function wrong_elem_type(ptr)
{
    if (ptr.mlet == C.S_ELEMENTAL) {
        return C.boolean(!C.callLocal(is_home_elemental, ptr));
    } else if (C.Is_earthlevel(C.u.uz)) {
        /* no restrictions? */
    } else if (C.Is_waterlevel(C.u.uz)) {
        /* just monsters that can swim */
        if (!C.is_swimmer(ptr))
            return 1;
    } else if (C.Is_firelevel(C.u.uz)) {
        if (!C.pm_resistance(ptr, C.MR_FIRE))
            return 1;
    } else if (C.Is_airlevel(C.u.uz)) {
        if (!(C.is_flyer(ptr) && ptr.mlet != C.S_TRAPPER) && !C.is_floater(ptr)
            && !C.amorphous(ptr) && !C.noncorporeal(ptr) && !C.is_whirly(ptr))
            return 1;
    }
    return 0;
}

/* make a group just like mtmp */

export function m_initgrp(mtmp, x, y, n, mmflags)
{
    const mm = C.coordLocal();
    let cnt = (C.rngSource(85, "m_initgrp"), C.rnd(n));
    let mon;
/* There is an unresolved problem with several people finding that
     * the game hangs eating CPU; if interrupted and restored, the level
     * will be filled with monsters.  Of those reports giving system type,
     * there were two DG/UX and two HP-UX, all using gcc as the compiler.
     * hcroft@hpopb1.cern.ch, using gcc 2.6.3 on HP-UX, says that the
     * problem went away for him and another reporter-to-newsgroup
     * after adding this debugging code.  This has almost got to be a
     * compiler bug, but until somebody tracks it down and gets it fixed,
     * might as well go with the "but it went away when I tried to find
     * it" code.
     */
    /* Tuning: cut down on swarming at low character levels [mrs] */
    cnt = Math.trunc(cnt / ((C.u.ulevel < 3) ? 4 : (C.u.ulevel < 5) ? 2 : 1));
    if (!cnt)
        cnt++;

    mm.x = x;
    mm.y = y;
    while (cnt--) {
        if (C.callLocal(peace_minded, mtmp.data))
            continue;
        /* Don't create groups of peaceful monsters since they'll get
         * in our way.  If the monster has a percentage chance so some
         * are peaceful and some are not, the result will just be a
         * smaller group.
         */
        if (C.enexto_gpflags(mm, mm.x, mm.y, mtmp.data, mmflags)) {
            mon = C.callLocal(makemon, mtmp.data, mm.x, mm.y, (mmflags | C.MM_NOGRP));
            if (mon) {
                mon.mpeaceful = 0;
                mon.mavenge = 0;
                C.callLocal(set_malign, mon);
                /* Undo the second peace_minded() check in makemon(); if the
                 * monster turned out to be peaceful the first time we
                 * didn't create it at all; we don't want a second check.
                 */
            }
        }
    }
}


export function m_initthrow(mtmp, otyp, oquan)
{
    let otmp;

    otmp = C.mksobj(otyp, 1, 0);
    otmp.quan = C.long((C.rngSource(153, "m_initthrow"), C.rn1(oquan, 3)));
    otmp.owt = C.weight(otmp);
    if (otyp == C.ORCISH_ARROW)
        otmp.opoisoned = 1;
    C.mpickobj(mtmp, otmp);
}


export function m_initweap(mtmp)
{
    let ptr = mtmp.data;
    let mm = C.monsndx(ptr);
    let otmp;
    let bias, w1, w2;

    if (C.Is_rogue_level(C.u.uz))
        return;
    /*
     *  First a few special cases:
     *          giants get a boulder to throw sometimes
     *          ettins get clubs
     *          kobolds get darts to throw
     *          centaurs get some sort of bow & arrows or bolts
     *          soldiers get all sorts of things
     *          kops get clubs & cream pies.
     */
    switch (ptr.mlet) {
    case C.S_GIANT:
        if ((C.rngSource(181, "m_initweap"), C.rn2(2)))
            C.callLocal(mongets, mtmp, (mm != C.PM_ETTIN) ? C.BOULDER : C.CLUB);
        if ((mm != C.PM_ETTIN) && !(C.rngSource(183, "m_initweap"), C.rn2(5)))
            C.callLocal(mongets, mtmp, (C.rngSource(184, "m_initweap"), C.rn2(2)) ? C.TWO_HANDED_SWORD : C.BATTLE_AXE);
        break;
    case C.S_HUMAN:
        if (C.is_mercenary(ptr)) {
            w1 = w2 = 0;
            switch (mm) {
            case C.PM_WATCHMAN:
            case C.PM_SOLDIER:
                if (!(C.rngSource(192, "m_initweap"), C.rn2(3))) {
                    /* lance and dwarvish mattock used to be in midst of
                       the polearms but use different skills from polearms
                       and aren't appropriates choices for human soldiers */
                    do {
                        w1 = (C.rngSource(197, "m_initweap"), C.rn1(C.BEC_DE_CORBIN - C.PARTISAN + 1, C.PARTISAN));
                    } while (C.objects[w1].oc_skill != C.P_POLEARMS);
                    w2 = (C.rngSource(199, "m_initweap"), C.rn2(2)) ? C.DAGGER : C.KNIFE;
                } else
                    w1 = (C.rngSource(201, "m_initweap"), C.rn2(2)) ? C.SPEAR : C.SHORT_SWORD;
                break;
            case C.PM_SERGEANT:
                w1 = (C.rngSource(204, "m_initweap"), C.rn2(2)) ? C.FLAIL : C.MACE;
                break;
            case C.PM_LIEUTENANT:
                w1 = (C.rngSource(207, "m_initweap"), C.rn2(2)) ? C.BROADSWORD : C.LONG_SWORD;
                break;
            case C.PM_CAPTAIN:
            case C.PM_WATCH_CAPTAIN:
                w1 = (C.rngSource(211, "m_initweap"), C.rn2(2)) ? C.LONG_SWORD : C.SILVER_SABER;
                break;
            default:
                if (!(C.rngSource(214, "m_initweap"), C.rn2(4)))
                    w1 = C.DAGGER;
                if (!(C.rngSource(216, "m_initweap"), C.rn2(7)))
                    w2 = C.SPEAR;
                break;
            }
            if (w1)
                C.callLocal(mongets, mtmp, w1);
            if (!w2 && w1 != C.DAGGER && !(C.rngSource(222, "m_initweap"), C.rn2(4)))
                w2 = C.KNIFE;
            if (w2)
                C.callLocal(mongets, mtmp, w2);
        } else if (C.is_elf(ptr)) {
            if ((C.rngSource(227, "m_initweap"), C.rn2(2)))
                C.callLocal(mongets, mtmp,
                               (C.rngSource(229, "m_initweap"), C.rn2(2)) ? C.ELVEN_MITHRIL_COAT : C.ELVEN_CLOAK);
            if ((C.rngSource(230, "m_initweap"), C.rn2(2)))
                C.callLocal(mongets, mtmp, C.ELVEN_LEATHER_HELM);
            else if (!(C.rngSource(232, "m_initweap"), C.rn2(4)))
                C.callLocal(mongets, mtmp, C.ELVEN_BOOTS);
            if ((C.rngSource(234, "m_initweap"), C.rn2(2)))
                C.callLocal(mongets, mtmp, C.ELVEN_DAGGER);
            switch ((C.rngSource(236, "m_initweap"), C.rn2(3))) {
            case 0:
                if (!(C.rngSource(238, "m_initweap"), C.rn2(4)))
                    C.callLocal(mongets, mtmp, C.ELVEN_SHIELD);
                if ((C.rngSource(240, "m_initweap"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.ELVEN_SHORT_SWORD);
                C.callLocal(mongets, mtmp, C.ELVEN_BOW);
                C.callLocal(m_initthrow, mtmp, C.ELVEN_ARROW, 12);
                break;
            case 1:
                C.callLocal(mongets, mtmp, C.ELVEN_BROADSWORD);
                if ((C.rngSource(247, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, C.ELVEN_SHIELD);
                break;
            case 2:
                if ((C.rngSource(251, "m_initweap"), C.rn2(2))) {
                    C.callLocal(mongets, mtmp, C.ELVEN_SPEAR);
                    C.callLocal(mongets, mtmp, C.ELVEN_SHIELD);
                }
                break;
            }
            if (mm == C.PM_ELVEN_MONARCH) {
                if ((C.rngSource(258, "m_initweap"), C.rn2(3)) || (C.gi.in_mklev && C.Is_earthlevel(C.u.uz)))
                    C.callLocal(mongets, mtmp, C.PICK_AXE);
                if (!(C.rngSource(260, "m_initweap"), C.rn2(50)))
                    C.callLocal(mongets, mtmp, C.CRYSTAL_BALL);
            }
        } else if (ptr.msound == C.MS_PRIEST
                   || C.quest_mon_represents_role(ptr, C.PM_CLERIC)) {
            otmp = C.mksobj(C.MACE, 0, 0);
            otmp.spe = (C.rngSource(266, "m_initweap"), C.rnd(3));
            if (!(C.rngSource(267, "m_initweap"), C.rn2(2)))
                C.curse(otmp);
            C.mpickobj(mtmp, otmp);
        } else if (mm == C.PM_NINJA) { /* extra quest villains */
            C.callLocal(mongets, mtmp, (C.rngSource(271, "m_initweap"), C.rn2(4)) ? C.SHURIKEN : C.DART);
            C.callLocal(mongets, mtmp, (C.rngSource(272, "m_initweap"), C.rn2(4)) ? C.SHORT_SWORD : C.AXE);
        } else if (ptr.msound == C.MS_GUARDIAN) {
            /* quest "guardians" */
            switch (mm) {
            case C.PM_STUDENT:
            case C.PM_ATTENDANT:
            case C.PM_ABBOT:
            case C.PM_ACOLYTE:
            case C.PM_GUIDE:
            case C.PM_APPRENTICE:
                if ((C.rngSource(282, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, (C.rngSource(283, "m_initweap"), C.rn2(3)) ? C.DAGGER : C.KNIFE);
                if ((C.rngSource(284, "m_initweap"), C.rn2(5)))
                    C.callLocal(mongets, mtmp, (C.rngSource(285, "m_initweap"), C.rn2(3)) ? C.LEATHER_JACKET
                                                : C.LEATHER_CLOAK);
                if ((C.rngSource(287, "m_initweap"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, (C.rngSource(288, "m_initweap"), C.rn2(3)) ? C.LOW_BOOTS : C.HIGH_BOOTS);
                if ((C.rngSource(289, "m_initweap"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.POT_HEALING);
                break;
            case C.PM_CHIEFTAIN:
            case C.PM_PAGE:
            case C.PM_ROSHI:
            case C.PM_WARRIOR:
                C.callLocal(mongets, mtmp, (C.rngSource(296, "m_initweap"), C.rn2(3)) ? C.LONG_SWORD : C.SHORT_SWORD);
                C.callLocal(mongets, mtmp, (C.rngSource(297, "m_initweap"), C.rn2(3)) ? C.CHAIN_MAIL : C.LEATHER_ARMOR);
                if ((C.rngSource(298, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, (C.rngSource(299, "m_initweap"), C.rn2(2)) ? C.LOW_BOOTS : C.HIGH_BOOTS);
                if (!(C.rngSource(300, "m_initweap"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.LEATHER_CLOAK);
                if (!(C.rngSource(302, "m_initweap"), C.rn2(3))) {
                    C.callLocal(mongets, mtmp, C.BOW);
                    C.callLocal(m_initthrow, mtmp, C.ARROW, 12);
                }
                break;
            case C.PM_HUNTER:
                C.callLocal(mongets, mtmp, (C.rngSource(308, "m_initweap"), C.rn2(3)) ? C.SHORT_SWORD : C.DAGGER);
                if ((C.rngSource(309, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, (C.rngSource(310, "m_initweap"), C.rn2(2)) ? C.LEATHER_JACKET
                                                : C.LEATHER_ARMOR);
                C.callLocal(mongets, mtmp, C.BOW);
                C.callLocal(m_initthrow, mtmp, C.ARROW, 12);
                break;
            case C.PM_THUG:
                C.callLocal(mongets, mtmp, C.CLUB);
                C.callLocal(mongets, mtmp, (C.rngSource(317, "m_initweap"), C.rn2(3)) ? C.DAGGER : C.KNIFE);
                if ((C.rngSource(318, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, C.LEATHER_GLOVES);
                C.callLocal(mongets, mtmp, (C.rngSource(320, "m_initweap"), C.rn2(2)) ? C.LEATHER_JACKET : C.LEATHER_ARMOR);
                break;
            case C.PM_NEANDERTHAL:
                C.callLocal(mongets, mtmp, C.CLUB);
                C.callLocal(mongets, mtmp, C.LEATHER_ARMOR);
                break;
            }
        }
        break;

    case C.S_ANGEL:
        if (C.humanoid(ptr)) {
            /* create minion stuff; bypass mongets */
            let typ = (C.rngSource(333, "m_initweap"), C.rn2(3)) ? C.LONG_SWORD : C.SILVER_MACE;
            let nam = (typ == C.LONG_SWORD) ? "Sunsword" : "Demonbane";

            otmp = C.mksobj(typ, 0, 0);
            /* maybe promote weapon to an artifact */
            if ((!(C.rngSource(338, "m_initweap"), C.rn2(20)) || C.is_lord(ptr))
                 && C.sgn(mtmp.isminion ? C.EMIN(mtmp).min_align
                                       : ptr.maligntyp) == C.A_LAWFUL)
                otmp = C.oname(otmp, nam, C.ONAME_RANDOM); /* randomly created */
            /* enhance the weapon */
            C.bless(otmp);
            otmp.oerodeproof = 1;
            /* make long sword be +0 to +3, mace be +3 to +6 to compensate
               for being significantly weaker against large opponents */
            otmp.spe = (C.rngSource(347, "m_initweap"), C.rn2(4));
            if (typ == C.SILVER_MACE)
                otmp.spe += 3;
            C.mpickobj(mtmp, otmp);

            otmp = C.mksobj(!(C.rngSource(352, "m_initweap"), C.rn2(4)) || C.is_lord(ptr) ? C.SHIELD_OF_REFLECTION
                                                  : C.LARGE_SHIELD,
                          0, 0);
            /* uncurse(otmp); -- mksobj(,FALSE,) item is always uncursed */
            otmp.oerodeproof = 1;
            otmp.spe = 0;
            C.mpickobj(mtmp, otmp);
        }
        break;

    case C.S_HUMANOID:
        if (mm == C.PM_HOBBIT) {
            switch ((C.rngSource(364, "m_initweap"), C.rn2(3))) {
            case 0:
                C.callLocal(mongets, mtmp, C.DAGGER);
                break;
            case 1:
                C.callLocal(mongets, mtmp, C.ELVEN_DAGGER);
                break;
            case 2:
                C.callLocal(mongets, mtmp, C.SLING);
                C.callLocal(m_initthrow, mtmp, !(C.rngSource(373, "m_initweap"), C.rn2(4)) ? C.FLINT : C.ROCK, 6);
                break;
            }
            if (!(C.rngSource(376, "m_initweap"), C.rn2(10)))
                C.callLocal(mongets, mtmp, C.ELVEN_MITHRIL_COAT);
            if (!(C.rngSource(378, "m_initweap"), C.rn2(10)))
                C.callLocal(mongets, mtmp, C.DWARVISH_CLOAK);
        } else if (C.is_dwarf(ptr)) {
            if ((C.rngSource(381, "m_initweap"), C.rn2(7)))
                C.callLocal(mongets, mtmp, C.DWARVISH_CLOAK);
            if ((C.rngSource(383, "m_initweap"), C.rn2(7)))
                C.callLocal(mongets, mtmp, C.IRON_SHOES);
            if (!(C.rngSource(385, "m_initweap"), C.rn2(4))) {
                C.callLocal(mongets, mtmp, C.DWARVISH_SHORT_SWORD);
                /* note: you can't use a mattock with a shield */
                if ((C.rngSource(388, "m_initweap"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, C.DWARVISH_MATTOCK);
                else {
                    C.callLocal(mongets, mtmp, (C.rngSource(391, "m_initweap"), C.rn2(2)) ? C.AXE : C.DWARVISH_SPEAR);
                    C.callLocal(mongets, mtmp, C.DWARVISH_ROUNDSHIELD);
                }
                C.callLocal(mongets, mtmp, C.DWARVISH_IRON_HELM);
                if (!(C.rngSource(395, "m_initweap"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.DWARVISH_MITHRIL_COAT);
            } else {
                C.callLocal(mongets, mtmp, !(C.rngSource(398, "m_initweap"), C.rn2(3)) ? C.PICK_AXE : C.DAGGER);
            }
        }
        break;
    case C.S_KOP:
        /* create Keystone Kops with cream pies to
           throw. As suggested by KAA.     [MRS] */
        if (!(C.rngSource(405, "m_initweap"), C.rn2(4)))
            C.callLocal(m_initthrow, mtmp, C.CREAM_PIE, 2);
        if (!(C.rngSource(407, "m_initweap"), C.rn2(3)))
            C.callLocal(mongets, mtmp, ((C.rngSource(408, "m_initweap"), C.rn2(2))) ? C.CLUB : C.RUBBER_HOSE);
        break;
    case C.S_ORC:
        if ((C.rngSource(411, "m_initweap"), C.rn2(2)))
            C.callLocal(mongets, mtmp, C.ORCISH_HELM);
        switch ((mm != C.PM_ORC_CAPTAIN) ? mm
                : (C.rngSource(414, "m_initweap"), C.rn2(2)) ? C.PM_MORDOR_ORC : C.PM_URUK_HAI) {
        case C.PM_MORDOR_ORC:
            if (!(C.rngSource(416, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.SCIMITAR);
            if (!(C.rngSource(418, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.ORCISH_SHIELD);
            if (!(C.rngSource(420, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.KNIFE);
            if (!(C.rngSource(422, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.ORCISH_CHAIN_MAIL);
            break;
        case C.PM_URUK_HAI:
            if (!(C.rngSource(426, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.ORCISH_CLOAK);
            if (!(C.rngSource(428, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.ORCISH_SHORT_SWORD);
            if (!(C.rngSource(430, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.IRON_SHOES);
            if (!(C.rngSource(432, "m_initweap"), C.rn2(3))) {
                C.callLocal(mongets, mtmp, C.ORCISH_BOW);
                C.callLocal(m_initthrow, mtmp, C.ORCISH_ARROW, 12);
            }
            if (!(C.rngSource(436, "m_initweap"), C.rn2(3)))
                C.callLocal(mongets, mtmp, C.URUK_HAI_SHIELD);
            break;
        default:
            if (mm != C.PM_ORC_SHAMAN && (C.rngSource(440, "m_initweap"), C.rn2(2)))
                C.callLocal(mongets, mtmp, (mm == C.PM_GOBLIN || (C.rngSource(441, "m_initweap"), C.rn2(2)) == 0)
                                         ? C.ORCISH_DAGGER
                                         : C.SCIMITAR);
        }
        break;
    case C.S_OGRE:
        if (!(C.rngSource(447, "m_initweap"), C.rn2(mm == C.PM_OGRE_TYRANT ? 3 : mm == C.PM_OGRE_LEADER ? 6 : 12)))
            C.callLocal(mongets, mtmp, C.BATTLE_AXE);
        else
            C.callLocal(mongets, mtmp, C.CLUB);
        break;
    case C.S_TROLL:
        if (!(C.rngSource(453, "m_initweap"), C.rn2(2)))
            switch ((C.rngSource(454, "m_initweap"), C.rn2(4))) {
            case 0:
                C.callLocal(mongets, mtmp, C.RANSEUR);
                break;
            case 1:
                C.callLocal(mongets, mtmp, C.PARTISAN);
                break;
            case 2:
                C.callLocal(mongets, mtmp, C.GLAIVE);
                break;
            case 3:
                C.callLocal(mongets, mtmp, C.SPETUM);
                break;
            }
        break;
    case C.S_KOBOLD:
        if (!(C.rngSource(470, "m_initweap"), C.rn2(4)))
            C.callLocal(m_initthrow, mtmp, C.DART, 12);
        break;

    case C.S_CENTAUR:
        if ((C.rngSource(475, "m_initweap"), C.rn2(2))) {
            if (C.samePtr(ptr, C.mons[C.PM_FOREST_CENTAUR])) {
                C.callLocal(mongets, mtmp, C.BOW);
                C.callLocal(m_initthrow, mtmp, C.ARROW, 12);
            } else {
                C.callLocal(mongets, mtmp, C.CROSSBOW);
                C.callLocal(m_initthrow, mtmp, C.CROSSBOW_BOLT, 12);
            }
        }
        break;
    case C.S_WRAITH:
        C.callLocal(mongets, mtmp, C.KNIFE);
        C.callLocal(mongets, mtmp, C.LONG_SWORD);
        break;
    case C.S_ZOMBIE:
        if (!(C.rngSource(490, "m_initweap"), C.rn2(4)))
            C.callLocal(mongets, mtmp, C.LEATHER_ARMOR);
        if (!(C.rngSource(492, "m_initweap"), C.rn2(4)))
            C.callLocal(mongets, mtmp, ((C.rngSource(493, "m_initweap"), C.rn2(3)) ? C.KNIFE : C.SHORT_SWORD));
        break;
    case C.S_LIZARD:
        if (mm == C.PM_SALAMANDER)
            C.callLocal(mongets, mtmp,
                           ((C.rngSource(498, "m_initweap"), C.rn2(7)) ? C.SPEAR : (C.rngSource(498, "m_initweap"), C.rn2(3)) ? C.TRIDENT : C.STILETTO));
        break;
    case C.S_DEMON:
        switch (mm) {
        case C.PM_BALROG:
            C.callLocal(mongets, mtmp, C.BULLWHIP);
            C.callLocal(mongets, mtmp, C.BROADSWORD);
            break;
        case C.PM_ORCUS:
            C.callLocal(mongets, mtmp, C.WAN_DEATH); /* the Wand of Orcus */
            break;
        case C.PM_HORNED_DEVIL:
            C.callLocal(mongets, mtmp, (C.rngSource(510, "m_initweap"), C.rn2(4)) ? C.TRIDENT : C.BULLWHIP);
            break;
        case C.PM_DISPATER:
            C.callLocal(mongets, mtmp, C.WAN_STRIKING);
            break;
        case C.PM_YEENOGHU:
            C.callLocal(mongets, mtmp, C.FLAIL);
            break;
        }
        /* prevent djinn and mail daemons from leaving objects when
         * they vanish
         */
        if (!C.is_demon(ptr))
            break;
        
        /*FALLTHRU*/
    default:
        /*
         * Now the general case, some chance of getting some type
         * of weapon for "normal" monsters.  Certain special types
         * of monsters will get a bonus chance or different selections.
         */
        bias = C.is_lord(ptr) + C.is_prince(ptr) * 2 + C.extra_nasty(ptr);
        switch ((C.rngSource(533, "m_initweap"), C.rnd(14 - (2 * bias)))) {
        case 1:
            if (C.strongmonst(ptr))
                C.callLocal(mongets, mtmp, C.BATTLE_AXE);
            else
                C.callLocal(m_initthrow, mtmp, C.DART, 12);
            break;
        case 2:
            if (C.strongmonst(ptr))
                C.callLocal(mongets, mtmp, C.TWO_HANDED_SWORD);
            else {
                C.callLocal(mongets, mtmp, C.CROSSBOW);
                C.callLocal(m_initthrow, mtmp, C.CROSSBOW_BOLT, 12);
            }
            break;
        case 3:
            C.callLocal(mongets, mtmp, C.BOW);
            C.callLocal(m_initthrow, mtmp, C.ARROW, 12);
            break;
        case 4:
            if (C.strongmonst(ptr))
                C.callLocal(mongets, mtmp, C.LONG_SWORD);
            else
                C.callLocal(m_initthrow, mtmp, C.DAGGER, 3);
            break;
        case 5:
            if (C.strongmonst(ptr))
                C.callLocal(mongets, mtmp, C.LUCERN_HAMMER);
            else
                C.callLocal(mongets, mtmp, C.AKLYS);
            break;
        default:
            break;
        }
        break;
    }

    if (C.int(mtmp.m_lev) > (C.rngSource(570, "m_initweap"), C.rn2(75)))
        C.callLocal(mongets, mtmp, C.rnd_offensive_item(mtmp));
}

/* create a new stack of gold in monster's inventory */

export function mkmonmoney(mtmp, amount)
{
    /* mk_mplayer() passes rn2(1000) so the amount might be 0 */
    if (amount > 0n) {
        let gold = C.mksobj(C.GOLD_PIECE, 0, 0);

        gold.quan = amount;
        gold.owt = C.weight(gold);
        C.add_to_minv(mtmp, gold);
    }
}


export function m_initinv(mtmp)
{
    let cnt;
    let otmp;
    let ptr = mtmp.data;

    if (C.Is_rogue_level(C.u.uz))
        return;
    /*
     *  Soldiers get armour & rations - armour approximates their ac.
     *  Nymphs may get mirror or potion of object detection.
     */
    switch (ptr.mlet) {
    case C.S_HUMAN:
        if (C.is_mercenary(ptr)) {
            let mac;

            switch (C.monsndx(ptr)) {
            case C.PM_GUARD:
                mac = -1;
                break;
            case C.PM_SOLDIER:
                mac = 3;
                break;
            case C.PM_SERGEANT:
                mac = 0;
                break;
            case C.PM_LIEUTENANT:
                mac = -2;
                break;
            case C.PM_CAPTAIN:
                mac = -3;
                break;
            case C.PM_WATCHMAN:
                mac = 3;
                break;
            case C.PM_WATCH_CAPTAIN:
                mac = -2;
                break;
            default:
                C.impossible("odd mercenary %d?", C.monsndx(ptr));
                mac = 0;
                break;
            }


            /* round 1: give them body armor */
            if (mac < -1 && (C.rngSource(639, "m_initinv"), C.rn2(5)))
                otmp = C.callLocal(mongets, mtmp, ((C.rngSource(640, "m_initinv"), C.rn2(5))) ? C.PLATE_MAIL
                                              : C.CRYSTAL_PLATE_MAIL);
            else if (mac < 3 && (C.rngSource(642, "m_initinv"), C.rn2(5)))
                otmp = C.callLocal(mongets, mtmp, ((C.rngSource(643, "m_initinv"), C.rn2(3))) ? C.SPLINT_MAIL : C.BANDED_MAIL);
            else if ((C.rngSource(644, "m_initinv"), C.rn2(5)))
                otmp = C.callLocal(mongets, mtmp, ((C.rngSource(645, "m_initinv"), C.rn2(3))) ? C.RING_MAIL
                                              : C.STUDDED_LEATHER_ARMOR);
            else
                otmp = C.callLocal(mongets, mtmp, C.LEATHER_ARMOR);
            if (otmp) { mac += C.ARM_BONUS(otmp); } otmp = 0;

            /* round 2: helmets */
            if (mac < 10 && (C.rngSource(652, "m_initinv"), C.rn2(3)))
                otmp = C.callLocal(mongets, mtmp, C.HELMET);
            else if (mac < 10 && (C.rngSource(654, "m_initinv"), C.rn2(2)))
                otmp = C.callLocal(mongets, mtmp, C.DENTED_POT);
            if (otmp) { mac += C.ARM_BONUS(otmp); } otmp = 0;

            /* round 3: shields */
            if (mac < 10 && (C.rngSource(659, "m_initinv"), C.rn2(3)))
                otmp = C.callLocal(mongets, mtmp, C.SMALL_SHIELD);
            else if (mac < 10 && (C.rngSource(661, "m_initinv"), C.rn2(2)))
                otmp = C.callLocal(mongets, mtmp, C.LARGE_SHIELD);
            if (otmp) { mac += C.ARM_BONUS(otmp); } otmp = 0;

            /* round 4: boots */
            if (mac < 10 && (C.rngSource(666, "m_initinv"), C.rn2(3)))
                otmp = C.callLocal(mongets, mtmp, C.LOW_BOOTS);
            else if (mac < 10 && (C.rngSource(668, "m_initinv"), C.rn2(2)))
                otmp = C.callLocal(mongets, mtmp, C.HIGH_BOOTS);
            if (otmp) { mac += C.ARM_BONUS(otmp); } otmp = 0;

            /* round 5: gloves + cloak */
            if (mac < 10 && (C.rngSource(673, "m_initinv"), C.rn2(3)))
                otmp = C.callLocal(mongets, mtmp, C.LEATHER_GLOVES);
            else if (mac < 10 && (C.rngSource(675, "m_initinv"), C.rn2(2)))
                otmp = C.callLocal(mongets, mtmp, C.LEATHER_CLOAK);
            if (otmp) { mac += C.ARM_BONUS(otmp); } otmp = 0; /* not technically needed */

            C.nhUse(mac); /* suppress 'dead increment' from static analyzer */

            if (C.samePtr(ptr, C.mons[C.PM_WATCH_CAPTAIN])) {
                ; /* better weapon rather than extra gear here */
            } else if (C.samePtr(ptr, C.mons[C.PM_WATCHMAN])) {
                if ((C.rngSource(685, "m_initinv"), C.rn2(3))) /* most watchmen carry a whistle */
                    C.callLocal(mongets, mtmp, C.TIN_WHISTLE);
            } else if (C.samePtr(ptr, C.mons[C.PM_GUARD])) {
                /* if hero teleports out of a vault while being confronted
                   by the vault's guard, there is a shrill whistling sound,
                   so guard evidently carries a cursed whistle */
                otmp = C.mksobj(C.TIN_WHISTLE, 1, 0);
                C.curse(otmp);
                C.mpickobj(mtmp, otmp);
            } else { /* soldiers and their officers */
                if (!(C.rngSource(695, "m_initinv"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.K_RATION);
                if (!(C.rngSource(697, "m_initinv"), C.rn2(2)))
                    C.callLocal(mongets, mtmp, C.C_RATION);
                if (!C.samePtr(ptr, C.mons[C.PM_SOLDIER]) && !(C.rngSource(699, "m_initinv"), C.rn2(3)))
                    C.callLocal(mongets, mtmp, C.BUGLE);
            }
        } else if (C.samePtr(ptr, C.mons[C.PM_SHOPKEEPER])) {
            C.callLocal(mongets, mtmp, C.SKELETON_KEY);
            switch ((C.rngSource(704, "m_initinv"), C.rn2(4))) {
            /* MAJOR fall through ... */
            case 0:
                C.callLocal(mongets, mtmp, C.WAN_MAGIC_MISSILE);
                
                /*FALLTHRU*/
            case 1:
                C.callLocal(mongets, mtmp, C.POT_EXTRA_HEALING);
                
                /*FALLTHRU*/
            case 2:
                C.callLocal(mongets, mtmp, C.POT_HEALING);
                
                /*FALLTHRU*/
            case 3:
                C.callLocal(mongets, mtmp, C.WAN_STRIKING);
            }
        } else if (ptr.msound == C.MS_PRIEST
                   || C.quest_mon_represents_role(ptr, C.PM_CLERIC)) {
            C.callLocal(mongets, mtmp, (C.rngSource(723, "m_initinv"), C.rn2(7)) ? C.ROBE
                                        : (C.rngSource(724, "m_initinv"), C.rn2(3)) ? C.CLOAK_OF_PROTECTION
                                                 : C.CLOAK_OF_MAGIC_RESISTANCE);
            C.callLocal(mongets, mtmp, C.SMALL_SHIELD);
            C.callLocal(mkmonmoney, mtmp, C.long((C.rngSource(727, "m_initinv"), C.rn1(10, 20))));
        } else if (C.quest_mon_represents_role(ptr, C.PM_MONK)) {
            C.callLocal(mongets, mtmp, (C.rngSource(729, "m_initinv"), C.rn2(11)) ? C.ROBE : C.CLOAK_OF_MAGIC_RESISTANCE);
        }
        break;
    case C.S_NYMPH:
        if (!(C.rngSource(733, "m_initinv"), C.rn2(2)))
            C.callLocal(mongets, mtmp, C.MIRROR);
        if (!(C.rngSource(735, "m_initinv"), C.rn2(2)))
            C.callLocal(mongets, mtmp, C.POT_OBJECT_DETECTION);
        break;
    case C.S_GIANT:
        if (C.samePtr(ptr, C.mons[C.PM_MINOTAUR])) {
            if (!(C.rngSource(740, "m_initinv"), C.rn2(8)) || (C.gi.in_mklev && C.Is_earthlevel(C.u.uz)))
                C.callLocal(mongets, mtmp, C.WAN_DIGGING);
        } else if (C.is_giant(ptr)) {
            for (cnt = (C.rngSource(743, "m_initinv"), C.rn2(C.int((Math.trunc(mtmp.m_lev / 2))))); cnt; cnt--) {
                otmp = C.mksobj(C.rnd_class(C.DILITHIUM_CRYSTAL, C.LUCKSTONE - 1),
                              0, 0);
                otmp.quan = C.long((C.rngSource(746, "m_initinv"), C.rn1(2, 3)));
                otmp.owt = C.weight(otmp);
                C.mpickobj(mtmp, otmp);
            }
        }
        break;
    case C.S_WRAITH:
        if (C.samePtr(ptr, C.mons[C.PM_NAZGUL])) {
            otmp = C.mksobj(C.RIN_INVISIBILITY, 0, 0);
            C.curse(otmp);
            C.mpickobj(mtmp, otmp);
        }
        break;
    case C.S_LICH:
        if (C.samePtr(ptr, C.mons[C.PM_MASTER_LICH]) && !(C.rngSource(760, "m_initinv"), C.rn2(13)))
            C.callLocal(mongets, mtmp, ((C.rngSource(761, "m_initinv"), C.rn2(7)) ? C.ATHAME : C.WAN_NOTHING));
        else if (C.samePtr(ptr, C.mons[C.PM_ARCH_LICH]) && !(C.rngSource(762, "m_initinv"), C.rn2(3))) {
            otmp = C.mksobj((C.rngSource(763, "m_initinv"), C.rn2(3)) ? C.ATHAME : C.QUARTERSTAFF, 1,
                          (C.rngSource(764, "m_initinv"), C.rn2(13)) ? 0 : 1);
            if (otmp.spe < 2)
                otmp.spe = (C.rngSource(766, "m_initinv"), C.rnd(3));
            if (!(C.rngSource(767, "m_initinv"), C.rn2(4)))
                otmp.oerodeproof = 1;
            C.mpickobj(mtmp, otmp);
        }
        break;
    case C.S_MUMMY:
        if ((C.rngSource(773, "m_initinv"), C.rn2(7)))
            C.callLocal(mongets, mtmp, C.MUMMY_WRAPPING);
        break;
    case C.S_QUANTMECH:
        if (!(C.rngSource(777, "m_initinv"), C.rn2(20)) && C.samePtr(ptr, C.mons[C.PM_QUANTUM_MECHANIC])) {
            let catcorpse;

            otmp = C.mksobj(C.LARGE_BOX, 0, 0);
            /* we used to just set the flag, which resulted in weight()
               treating the box as being heavier by the weight of a cat;
               now we include a cat corpse that won't rot; when opening or
               disclosing the box's contents, the corpse might be revived,
               otherwise it's given a rot timer; weight is now ordinary */
            if ((catcorpse = C.mksobj(C.CORPSE, 1, 0)) != 0) {
                otmp.spe = 1; /* flag for special SchroedingersBox */
                C.set_corpsenm(catcorpse, C.PM_HOUSECAT);
                C.stop_timer(C.ROT_CORPSE, C.obj_to_any(catcorpse));
                C.add_to_container(otmp, catcorpse);
                otmp.owt = C.weight(otmp);
            }
            C.mpickobj(mtmp, otmp);
        }
        break;
    case C.S_LEPRECHAUN:
        C.callLocal(mkmonmoney, mtmp, C.long((C.rngSource(797, "m_initinv"), C.d(C.level_difficulty(), 30))));
        break;
    case C.S_DEMON:
        /* moved here from m_initweap() because these don't
           have AT_WEAP so m_initweap() is not called for them */
        if (C.samePtr(ptr, C.mons[C.PM_ICE_DEVIL]) && !(C.rngSource(802, "m_initinv"), C.rn2(4))) {
            C.callLocal(mongets, mtmp, C.SPEAR);
        } else if (C.samePtr(ptr, C.mons[C.PM_ASMODEUS])) {
            C.callLocal(mongets, mtmp, C.WAN_COLD);
            C.callLocal(mongets, mtmp, C.WAN_FIRE);
        }
        break;
    case C.S_GNOME:
        if (!(C.rngSource(810, "m_initinv"), C.rn2((C.In_mines(C.u.uz) && C.gi.in_mklev) ? 20 : 60))) {
            otmp = C.mksobj((C.rngSource(811, "m_initinv"), C.rn2(4)) ? C.TALLOW_CANDLE : C.WAX_CANDLE, 1, 0);
            otmp.quan = 1;
            otmp.owt = C.weight(otmp);
            if (!C.mpickobj(mtmp, otmp) && !C.levl[mtmp.mx][mtmp.my].lit)
                C.begin_burn(otmp, 0);
        }
        break;
    default:
        break;
    }

    /* ordinary soldiers rarely have access to magic (or gold :-) */
    if (C.samePtr(ptr, C.mons[C.PM_SOLDIER]) && (C.rngSource(823, "m_initinv"), C.rn2(13)))
        return;

    if (C.int(mtmp.m_lev) > (C.rngSource(826, "m_initinv"), C.rn2(50)))
        C.callLocal(mongets, mtmp, C.rnd_defensive_item(mtmp));
    if (C.int(mtmp.m_lev) > (C.rngSource(828, "m_initinv"), C.rn2(100)))
        C.callLocal(mongets, mtmp, C.rnd_misc_item(mtmp));
    if (C.likes_gold(ptr) && !C.findgold(mtmp.minvent) && !(C.rngSource(830, "m_initinv"), C.rn2(5)))
        C.callLocal(mkmonmoney, mtmp,
                   C.long((C.rngSource(832, "m_initinv"), C.d(C.level_difficulty(), mtmp.minvent ? 5 : 10))));
}

/* Note: for long worms, always call cutworm (cutworm calls clone_mon) */

export function clone_mon(mon, x, y)
/* clone's preferred location or 0 (near mon) */
{
    const mm = C.coordLocal();
    let m2;

    /* may be too weak or have been extinguished for population control */
    if (mon.mhp <= 1
        || (C.svm.mvitals[C.monsndx(mon.data)].mvflags & C.G_EXTINCT) != 0)
        return 0;

    if (x == 0) {
        mm.x = mon.mx;
        mm.y = mon.my;
    } else {
        mm.x = x;
        mm.y = y;
    }
    if (!C.isok(mm.x, mm.y)) { /* paranoia */
        C.impossible("clone_mon trying to create a monster at <%d,%d>?",
                   mm.x, mm.y);
        return 0;
    }
    if (C.MON_AT(mm.x, mm.y)) { /* (always True for the x==0 case) */
        if (!C.enexto(mm, mm.x, mm.y, mon.data) || C.MON_AT(mm.x, mm.y))
            return 0;
    }

    m2 = C.newmonst();
    C.copyRecord(m2, mon, C.monsterSize); /* copy condition of old monster */
    m2.mextra = 0;
    m2.nmon = C.fmon;
    C.fmon = m2;
    m2.m_id = C.next_ident();
    m2.mx = mm.x;
    m2.my = mm.y;

    m2.mundetected = 0;
    m2.mtrapped = 0;
    m2.mcloned = 1;
    m2.minvent = 0; /* objects don't clone */
    m2.mleashed = 0;
    /* Max HP the same, but current HP halved for both.  The caller
     * might want to override this by halving the max HP also.
     * When current HP is odd, the original keeps the extra point.
     * We know original has more than 1 HP, so both end up with at least 1.
     */
    m2.mhpmax = mon.mhpmax;
    m2.mhp = Math.trunc(mon.mhp / 2);
    mon.mhp -= m2.mhp;

    /* clone doesn't have mextra so mustn't retain special monster flags */
    m2.isshk = 0;
    m2.isgd = 0;
    m2.ispriest = 0;
    /* ms->isminion handled below */

    /* clone shouldn't be reluctant to move on spots 'parent' just moved on */
    C.mon_track_clear(m2);

    C.place_monster(m2, m2.mx, m2.my);
    if (C.emits_light(m2.data))
        C.new_light_source(m2.mx, m2.my, C.emits_light(m2.data), C.LS_MONSTER,
                         C.monst_to_any(m2));
    /* if 'parent' is named, give the clone the same name */
    if (C.has_mgivenname(mon)) {
        m2 = C.christen_monst(m2, C.MGIVENNAME(mon));
    } else if (mon.isshk) {
        m2 = C.christen_monst(m2, C.shkname(mon));
    }

    /* not all clones caused by player are tame or peaceful */
    if (!C.svc.context.mon_moving && mon.mpeaceful) {
        if (mon.mtame)
            m2.mtame = (C.rngSource(912, "clone_mon"), C.rn2(C.max(2 + C.u.uluck, 2))) ? mon.mtame : 0;
        else if (mon.mpeaceful)
            m2.mpeaceful = (C.rngSource(914, "clone_mon"), C.rn2(C.max(2 + C.u.uluck, 2))) ? 1 : 0;
    }
    /* if guardian angel could be cloned (maybe after polymorph?),
       m2 could be both isminion and mtame; isminion takes precedence */
    if (m2.isminion) {
        let atyp;

        C.newemin(m2);
        if (!(C.has_emin(m2) && C.has_emin(mon))) C.assertFail("has_emin(m2) && has_emin(mon)", "makemon.c", 922, "clone_mon");
        C.copyRecord(C.EMIN(m2), C.EMIN(mon), C.eminSize);
        /* renegade when same alignment as hero but not peaceful or
           when peaceful while being different alignment from hero */
        atyp = C.EMIN(m2).min_align;
        C.EMIN(m2).renegade = (atyp != C.u.ualign.type) ^ !m2.mpeaceful;
    } else if (m2.mtame) {
        /* Because m2 is a copy of mon it is tame but not init'ed.
           However, tamedog() will not re-tame a tame dog, so m2
           must be made non-tame to get initialized properly. */
        m2.mtame = 0;
        if (C.tamedog(m2, 0, 0)) {
            if (!(C.has_edog(m2) && C.has_edog(mon))) C.assertFail("has_edog(m2) && has_edog(mon)", "makemon.c", 934, "clone_mon");
            C.copyRecord(C.EDOG(m2), C.EDOG(mon), C.edogSize);
        }
        /* [TODO? some (most? all?) edog fields probably should be
           reinitialized rather that retain the 'parent's values] */
    }
    C.callLocal(set_malign, m2);
    C.newsym(m2.mx, m2.my); /* display the new monster */

    return m2;
}

/*
 * Propagate a species
 *
 * Once a certain number of monsters are created, don't create any more
 * at random (i.e. make them extinct).  The previous (3.2) behavior was
 * to do this when a certain number had _died_, which didn't make
 * much sense.
 *
 * Returns FALSE propagation unsuccessful
 *         TRUE  propagation successful
 */

export function propagate(mndx, tally, ghostly)
{
    let gone, result;
    let lim = C.callLocal(mbirth_limit, mndx);

    gone = (C.svm.mvitals[mndx].mvflags & C.G_GONE) != 0; /* geno'd|extinct */
    result = (C.int(C.svm.mvitals[mndx].born) < lim && !gone) ? 1 : 0;

    /* if it's unique, don't ever make it again */
    if ((C.mons[mndx].geno & C.G_UNIQ) != 0 && mndx != C.PM_HIGH_CLERIC)
        C.svm.mvitals[mndx].mvflags |= C.G_EXTINCT;

    if (C.svm.mvitals[mndx].born < 255 && tally && (!ghostly || result))
        C.svm.mvitals[mndx].born++;
    if (C.int(C.svm.mvitals[mndx].born) >= lim
        && !(C.mons[mndx].geno & C.G_NOGEN)
        && !(C.svm.mvitals[mndx].mvflags & C.G_EXTINCT)) {
        if (C.wizard) {
            do { if (C.showdebug("makemon.c")) { let save_plnmsg = C.iflags.last_msg; C.pline("Automatically extinguished %s.",
                        C.makeplural(C.mons[mndx].pmnames[C.NEUTRAL])); C.iflags.last_msg = save_plnmsg; } } while (0);
        }
        C.svm.mvitals[mndx].mvflags |= C.G_EXTINCT;
    }
    return result;
}

/* amount of HP to lose from level drain (or gain from Stormbringer) */

export function monhp_per_lvl(mon)
{
    let ptr = mon.data;
    let hp = (C.rngSource(989, "monhp_per_lvl"), C.rnd(8)); /* default is d8 */

    /* like newmonhp, but home elementals are ignored, riders use normal d8 */
    if (C.is_golem(ptr)) {
        /* draining usually won't be applicable for these critters */
        hp = Math.trunc(C.callLocal(golemhp, C.monsndx(ptr)) / C.int(ptr.mlevel));
    } else if (ptr.mlevel > 49) {
        /* arbitrary; such monsters won't be involved in draining anyway */
        hp = 4 + (C.rngSource(997, "monhp_per_lvl"), C.rnd(4)); /* 5..8 */
    } else if (ptr.mlet == C.S_DRAGON && C.monsndx(ptr) >= C.PM_GRAY_DRAGON) {
        /* adult dragons; newmonhp() uses In_endgame(&u.uz) ? 8 : 4 + rnd(4)
         */
        hp = 4 + (C.rngSource(1001, "monhp_per_lvl"), C.rn2(5)); /* 4..8 */
    } else if (!mon.m_lev) {
        /* level 0 monsters use 1d4 instead of Nd8 */
        hp = (C.rngSource(1004, "monhp_per_lvl"), C.rnd(4));
    }
    return hp;
}

/* set up a new monster's initial level and hit points;
   used by newcham() as well as by makemon() */

export function newmonhp(mon, mndx)
{
    let ptr = C.mons[mndx];
    let basehp = 0;

    mon.m_lev = C.callLocal(adj_lev, ptr);
    if (C.is_golem(ptr)) {
        /* golems have a fixed amount of HP, varying by golem type */
        mon.mhpmax = C.assignField(mon, "mhp", C.callLocal(golemhp, mndx));
    } else if (C.is_rider(ptr)) {
        /* we want low HP, but a high mlevel so they can attack well */
        basehp = 10; /* minimum is 1 per false (weaker) level */
        mon.mhpmax = C.assignField(mon, "mhp", (C.rngSource(1024, "newmonhp"), C.d(basehp, 8)));
    } else if (ptr.mlevel > 49) {
        /* "special" fixed hp monster
         * the hit points are encoded in the mlevel in a somewhat strange
         * way to fit in the 50..127 positive range of a signed character
         * above the 1..49 that indicate "normal" monster levels */
        mon.mhpmax = C.assignField(mon, "mhp", 2 * (ptr.mlevel - 6));
        mon.m_lev = Math.trunc(mon.mhp / 4); /* approximation */
    } else if (ptr.mlet == C.S_DRAGON && mndx >= C.PM_GRAY_DRAGON) {
        /* adult dragons; N*(4+rnd(4)) before endgame, N*8 once there */
        basehp = C.int(mon.m_lev); /* not really applicable; isolates cast */
        mon.mhpmax = C.assignField(mon, "mhp", C.In_endgame(C.u.uz) ? (8 * basehp)
                                 : (4 * basehp + (C.rngSource(1036, "newmonhp"), C.d(basehp, 4))));
    } else if (!mon.m_lev) {
        basehp = 1; /* minimum is 1, increased to 2 below */
        mon.mhpmax = C.assignField(mon, "mhp", (C.rngSource(1039, "newmonhp"), C.rnd(4)));
    } else {
        basehp = C.int(mon.m_lev); /* minimum possible is one per level */
        mon.mhpmax = C.assignField(mon, "mhp", (C.rngSource(1042, "newmonhp"), C.d(basehp, 8)));
        if (C.callLocal(is_home_elemental, ptr))
            mon.mhpmax = C.assignField(mon, "mhp", mon.mhp * 3); /* leave 'basehp' as-is */
    }

    /* if d(X,8) rolled a 1 all X times, give a boost;
       most beneficial for level 0 and level 1 monsters, making mhpmax
       and starting mhp always be at least 2 */
    if (mon.mhpmax == basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}




export function init_mextra(mex)
{
    C.copyRecord(mex, C.zeromextra, C.mextraSize);
    mex.mcorpsenm = C.NON_PM;
}


export function newmextra()
{
    let mextra;

    mextra = C.mextra(C.alloc(C.mextraSize));
    C.callLocal(init_mextra, mextra);
    return mextra;
}


export function makemon_rnd_goodpos(mon, gpflags, cc)
/* output */
{
    let tryct = 0;
    let nx, ny;
    let good;

    gpflags |= C.GP_AVOID_MONPOS;
    do {
        nx = (C.rngSource(1087, "makemon_rnd_goodpos"), C.rn1(C.COLNO - 3, 2));
        ny = (C.rngSource(1088, "makemon_rnd_goodpos"), C.rn2(C.ROWNO));
        good = (!C.gi.in_mklev && C.cansee(nx,ny)) ? 0
                                              : C.goodpos(nx, ny, mon, gpflags);
    } while ((++tryct < 50) && !good);

    gotgood: {
    if (!good) {
        /* else go through all map positions, twice, first round
           ignoring positions in sight, and pick first good one.
           skip first round if we're in special level loader or blind */
        let xofs = nx;
        let yofs = ny;
        let dx,dy;
        let bl = (C.gi.in_mklev || C.Blind) ? 1 : 0;

        for ( ; bl < 2; bl++) {
            if (!bl)
                gpflags &= ~C.GP_CHECKSCARY; /* perhaps should be a 3rd pass */
            for (dx = 0; dx < C.COLNO; dx++)
                for (dy = 0; dy < C.ROWNO; dy++) {
                    nx = ((dx + xofs) % (C.COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (C.ROWNO - 1)) + 1;
                    if (bl == 0 && C.cansee(nx,ny))
                        continue;
                    if (C.goodpos(nx, ny, mon, gpflags))
                        break gotgood;
                }
            if (bl == 0 && (!mon || mon.data.mmove)) {
                let stway = C.gs.stairs;
                /* all map positions are visible (or not good),
                   try to pick something logical */
                while (stway) {
                    if (stway.tolev.dnum == C.u.uz.dnum && !(C.rngSource(1119, "makemon_rnd_goodpos"), C.rn2(2))) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                    stway = stway.next;
                }
                if (C.goodpos(nx, ny, mon, gpflags))
                    break gotgood;
            }
        }
    } else {
        break gotgood;
    }
    return 0;
    }

        cc.x = nx;
        cc.y = ny;
        return 1;

}

/*
 * called with [x,y] = coordinates;
 *      [0,0] means anyplace
 *      [u.ux,u.uy] means: near player (if !gi.in_mklev)
 *
 *      In case we make a monster group, only return the one at [x,y].
 */

export function makemon(ptr, x, y, mmflags)
{
    let mtmp;
    const fakemon = C.monsterLocal();
    const cc = C.coordLocal();
    let mndx, mcham, ct, mitem;
    let femaleok, maleok,
            anymon = !ptr,
            byyou = C.u_at(x, y),
            allow_minvent = ((mmflags & C.NO_MINVENT) == 0),
            countbirth = ((mmflags & C.MM_NOCOUNTBIRTH) == 0),
            allowtail = ((mmflags & C.MM_NOTAIL) == 0);
    let gpflags = (((mmflags & C.MM_IGNOREWATER) ? C.MM_IGNOREWATER : 0)
                           | C.GP_CHECKSCARY | C.GP_AVOID_MONPOS);

    C.copyRecord(fakemon, C.cg.zeromonst, C.monsterSize);
    cc.x = cc.y = 0;

    if (C.iflags.debug_mongen || (!C.svl.level.flags.rndmongen && !ptr))
        return 0;

    /* if caller wants random location, do it here */
    if (x == 0 && y == 0) {
        fakemon.data = ptr; /* set up for goodpos */
        if (!C.callLocal(makemon_rnd_goodpos, ptr ? fakemon : 0,
                                 gpflags, cc))
            return 0;
        x = cc.x;
        y = cc.y;
    } else if (byyou && !C.gi.in_mklev) {
        if (!C.enexto_core(cc, C.u.ux, C.u.uy, ptr, gpflags)
            && !C.enexto_core(cc, C.u.ux, C.u.uy, ptr, gpflags & ~C.GP_CHECKSCARY))
            return 0;
        x = cc.x;
        y = cc.y;
    }

    /* sanity check */
    if (!C.isok(x, y)) {
        C.impossible("makemon trying to create a monster at <%d,%d>?", x, y);
        return 0;
    }

    /* Does monster already exist at the position? */
    if (C.MON_AT(x, y)) {
        if (!(mmflags & C.MM_ADJACENTOK)
            || !C.enexto_core(cc, x, y, ptr, gpflags))
            return 0;
        x = cc.x;
        y = cc.y;
    }

    if (ptr) {
        mndx = C.monsndx(ptr);
        /* if you are to make a specific monster and it has
           already been genocided, return */
        if (C.svm.mvitals[mndx].mvflags & C.G_GENOD)
            return 0;
        if (C.wizard && (C.svm.mvitals[mndx].mvflags & C.G_EXTINCT)) {
            do { if (C.showdebug("makemon.c")) { let save_plnmsg = C.iflags.last_msg; C.pline("Explicitly creating extinct monster %s.",
                        C.mons[mndx].pmnames[C.NEUTRAL]); C.iflags.last_msg = save_plnmsg; } } while (0);
        }
    } else {
        /* make a random (common) monster that can survive here.
         * (the special levels ask for random monsters at specific
         * positions, causing mass drowning on the medusa level,
         * for instance.)
         */
        let tryct = 0; /* maybe there are no good choices */

        do {
            if (!(ptr = C.callLocal(rndmonst))) {
                do { if (C.showdebug("makemon.c")) { let save_plnmsg = C.iflags.last_msg; C.pline("Warning: no monster."); C.iflags.last_msg = save_plnmsg; } } while (0);
                return 0; /* no more monsters! */
            }
            fakemon.data = ptr; /* set up for goodpos */
        } while (++tryct <= 50
                 /* in Sokoban, don't accept a giant on first try;
                    after that, boulder carriers are fair game */
                 && ((tryct == 1 && C.throws_rocks(ptr) && C.In_sokoban(C.u.uz))
                     || !C.goodpos(x, y, fakemon, gpflags)));
        mndx = C.monsndx(ptr);
    }
    C.callLocal(propagate, mndx, countbirth, 0);
    mtmp = C.newmonst();
    C.copyRecord(mtmp, C.cg.zeromonst, C.monsterSize); /* clear all entries in structure */

    if (mmflags & C.MM_EGD)
        C.newegd(mtmp);
    if (mmflags & C.MM_EPRI)
        C.newepri(mtmp);
    if (mmflags & C.MM_ESHK)
        C.neweshk(mtmp);
    if (mmflags & C.MM_EMIN)
        C.newemin(mtmp);
    if (mmflags & C.MM_EDOG)
        C.newedog(mtmp);
    if (mmflags & C.MM_ASLEEP)
        mtmp.msleeping = 1;
    mtmp.nmon = C.fmon;
    C.fmon = mtmp;
    mtmp.m_id = C.next_ident();
    C.set_mon_data(mtmp, ptr); /* mtmp->data = ptr; */
    if (ptr.msound == C.MS_LEADER && C.quest_info(C.MS_LEADER) == mndx)
        C.svq.quest_status.leader_m_id = mtmp.m_id;
    mtmp.mnum = mndx;

    /* set up level and hit points */
    C.callLocal(newmonhp, mtmp, mndx);

    femaleok = Number(Boolean(!C.is_male(ptr) && !C.is_neuter(ptr)));
    maleok = Number(Boolean(!C.is_female(ptr) && !C.is_neuter(ptr)));
    if (C.is_female(ptr) || ((mmflags & C.MM_FEMALE) != 0 && femaleok))
        mtmp.female = 1;
    else if (C.is_male(ptr) || ((mmflags & C.MM_MALE) != 0 && maleok))
        mtmp.female = 0;

    /* leader and nemesis gender is usually hardcoded in mons[],
       but for ones which can be random, it has already been chosen
       (in role_init(), for possible use by the quest pager code) */
    else if (ptr.msound == C.MS_LEADER && C.quest_info(C.MS_LEADER) == mndx)
        mtmp.female = C.svq.quest_status.ldrgend;
    else if (ptr.msound == C.MS_NEMESIS && C.quest_info(C.MS_NEMESIS) == mndx)
        mtmp.female = C.svq.quest_status.nemgend;

    /* female used to be set randomly here even for neuters on the
       grounds that it was ignored, but after corpses were changed to
       retain gender it matters because it affects stacking of corpses */
    else
        mtmp.female = femaleok ? (C.rngSource(1279, "makemon"), C.rn2(2)) : 0;

    if (C.In_sokoban(C.u.uz) && !C.mindless(ptr)) { /* know about traps here */
        C.mon_learns_traps(mtmp, C.PIT);
        C.mon_learns_traps(mtmp, C.HOLE);
    }
    if (C.Is_stronghold(C.u.uz) && !C.mindless(ptr)) /* know about trap doors */
        C.mon_learns_traps(mtmp, C.TRAPDOOR);
    /* quest leader and nemesis both know about all trap types */
    if (ptr.msound == C.MS_LEADER || ptr.msound == C.MS_NEMESIS)
        C.mon_learns_traps(mtmp, C.ALL_TRAPS);
    /* locations where monsters are already experienced with wands */
    if (C.Is_stronghold(C.u.uz) || C.Is_knox(C.u.uz) || C.In_endgame(C.u.uz) ||
        C.In_hell(C.u.uz) || C.In_V_tower(C.u.uz) || C.In_quest(C.u.uz))
        mtmp.mwandexp = 1;

    C.place_monster(mtmp, x, y);
    mtmp.mcansee = mtmp.mcanmove = 1;
    mtmp.mgenmklev = C.gi.in_mklev;
    mtmp.seen_resistance = C.M_SEEN_NOTHING;
    mtmp.mpeaceful = (mmflags & C.MM_ANGRY) ? 0 : C.callLocal(peace_minded, ptr);
    if ((mmflags & C.MM_MINVIS) != 0) /* for ^G */
        C.mon_set_minvis(mtmp, 0); /* call after place_monster() */

    switch (ptr.mlet) {
    case C.S_MIMIC:
        C.callLocal(set_mimic_sym, mtmp);
        break;
    case C.S_SPIDER:
    case C.S_SNAKE:
        if (C.gi.in_mklev) {
            if (x && y)
                C.mkobj_at(C.RANDOM_CLASS, x, y, 1);
            C.hideunder(mtmp);
        }
        break;
    case C.S_LIGHT:
    case C.S_ELEMENTAL:
        if (mndx == C.PM_STALKER || mndx == C.PM_BLACK_LIGHT) {
            mtmp.perminvis = 1;
            mtmp.minvis = 1;
        }
        break;
    case C.S_EEL:
        if (C.gi.in_mklev) {
            C.hideunder(mtmp);
        }
        break;
    case C.S_LEPRECHAUN:
        mtmp.msleeping = 1;
        break;
    case C.S_JABBERWOCK:
    case C.S_NYMPH:
        if ((C.rngSource(1332, "makemon"), C.rn2(5)) && !C.u.uhave.amulet)
            mtmp.msleeping = 1;
        break;
    case C.S_ORC:
        if (C.Race_if(C.PM_ELF))
            mtmp.mpeaceful = 0;
        break;
    case C.S_UNICORN:
        if (C.is_unicorn(ptr) && C.sgn(C.u.ualign.type) == C.sgn(ptr.maligntyp))
            mtmp.mpeaceful = 1;
        break;
    case C.S_BAT:
        if (C.Inhell && C.is_bat(ptr))
            C.mon_adjust_speed(mtmp, 2, 0);
        break;
    }
    if ((ct = C.emits_light(mtmp.data)) > 0)
        C.new_light_source(mtmp.mx, mtmp.my, ct, C.LS_MONSTER,
                         C.monst_to_any(mtmp));
    mitem = C.STRANGE_OBJECT; /* extra inventory item for this monster */

    if (mndx == C.PM_VLAD_THE_IMPALER)
        mitem = C.CANDELABRUM_OF_INVOCATION;
    mtmp.cham = C.NON_PM; /* default is "not a shapechanger" */
    if (!C.Protection_from_shape_changers
        && (mcham = C.pm_to_cham(mndx)) != C.NON_PM) {
        /* this is a shapechanger after all */
        mtmp.cham = mcham;
        /* Vlad stays in his normal shape so he can carry the Candelabrum */
        if (mndx != C.PM_VLAD_THE_IMPALER
            /* Note:  shapechanger's initial form used to be chosen here
               with rndmonst(), yielding a monster which was appropriate
               to the level's difficulty but ignoring the changer's usual
               type selection, so was inappropriate for vampshifters.
               Let newcham() pick the shape. */
            && C.newcham(mtmp, 0, C.NO_NC_FLAGS))
            allow_minvent = 0;
    } else if (mndx == C.PM_WIZARD_OF_YENDOR) {
        mtmp.iswiz = 1;
        C.svc.context.no_of_wizards++;
        if (C.svc.context.no_of_wizards == 1 && C.Is_earthlevel(C.u.uz))
            mitem = C.SPE_DIG;
    } else if (mndx == C.PM_GHOST && !(mmflags & C.MM_NONAME)) {
        mtmp = C.christen_monst(mtmp, C.rndghostname());
    } else if (mndx == C.PM_CROESUS) {
        mitem = C.TWO_HANDED_SWORD;
    } else if (ptr.msound == C.MS_NEMESIS) {
        mitem = C.BELL_OF_OPENING;
    } else if (mndx == C.PM_PESTILENCE) {
        mitem = C.POT_SICKNESS;
    }
    if (mitem != C.STRANGE_OBJECT && allow_minvent)
        C.callLocal(mongets, mtmp, mitem);

    if (C.gi.in_mklev) {
        if ((C.is_ndemon(ptr) || mndx == C.PM_WUMPUS
             || mndx == C.PM_LONG_WORM || mndx == C.PM_GIANT_EEL)
            && !C.u.uhave.amulet && (C.rngSource(1389, "makemon"), C.rn2(5)))
            mtmp.msleeping = 1;
    } else {
        if (byyou) {
            C.newsym(mtmp.mx, mtmp.my);
            C.set_apparxy(mtmp);
        }
    }
    if (C.is_dprince(ptr) && ptr.msound == C.MS_BRIBE) {
        mtmp.mpeaceful = mtmp.minvis = mtmp.perminvis = 1;
        mtmp.mavenge = 0;
        if (C.u_wield_art(C.ART_EXCALIBUR) || C.u_wield_art(C.ART_DEMONBANE))
            mtmp.mpeaceful = mtmp.mtame = 0;
    }
    if (mndx == C.PM_RAVEN && C.uwep && C.uwep.otyp == C.BEC_DE_CORBIN)
        mtmp.mpeaceful = 1;
    if (mndx == C.PM_LONG_WORM && (C.assignField(mtmp, "wormno", C.get_wormno())) != 0) {
        C.initworm(mtmp, allowtail ? (C.rngSource(1406, "makemon"), C.rn2(5)) : 0);
        if (C.count_wsegs(mtmp))
            C.place_worm_tail_randomly(mtmp, x, y);
    }
    /* it's possible to create an ordinary monster of some special
       types; make sure their extended data is initialized to
       something sensible if caller hasn't specified MM_EPRI|MM_EMIN
       (when they're specified, caller intends to handle this itself) */
    if ((mndx == C.PM_ALIGNED_CLERIC || mndx == C.PM_HIGH_CLERIC)
            ? !(mmflags & (C.MM_EPRI | C.MM_EMIN))
            : (mndx == C.PM_ANGEL && !(mmflags & C.MM_EMIN) && !(C.rngSource(1416, "makemon"), C.rn2(3)))) {
        let eminp;

        C.newemin(mtmp);
        eminp = C.EMIN(mtmp);

        mtmp.isminion = 1;            /* make priest be a roamer */
        eminp.min_align = (C.rngSource(1423, "makemon"), C.rn2(3)) - 1; /* no A_NONE */
        eminp.renegade = C.boolean(((mmflags & C.MM_ANGRY) ? 1 : !(C.rngSource(1424, "makemon"), C.rn2(3))));
        mtmp.mpeaceful = (eminp.min_align == C.u.ualign.type)
                              ? !eminp.renegade
                              : eminp.renegade;
    }
    C.callLocal(set_malign, mtmp); /* having finished peaceful changes */
    if (anymon && !(mmflags & C.MM_NOGRP)) {
        if ((ptr.geno & C.G_SGROUP) && (C.rngSource(1431, "makemon"), C.rn2(2))) {
            C.callLocal(m_initgrp, mtmp, mtmp.mx, mtmp.my, 3, mmflags);
        } else if (ptr.geno & C.G_LGROUP) {
            if ((C.rngSource(1434, "makemon"), C.rn2(3)))
                C.callLocal(m_initgrp, mtmp, mtmp.mx, mtmp.my, 10, mmflags);
            else
                C.callLocal(m_initgrp, mtmp, mtmp.mx, mtmp.my, 3, mmflags);
        }
    }

    if (allow_minvent) {
        if (C.is_armed(ptr))
            C.callLocal(m_initweap, mtmp); /* equip with weapons / armor */
        C.callLocal(m_initinv, mtmp); /* add on a few special items incl. more armor */
        C.m_dowear(mtmp, 1);

        if (!(C.rngSource(1447, "makemon"), C.rn2(100)) && C.is_domestic(ptr)
            && C.can_saddle(mtmp) && !C.which_armor(mtmp, C.W_SADDLE)) {
            /* NULL obj arg means put_saddle_on_mon()
             * will create the saddle itself */
            C.put_saddle_on_mon(0, mtmp);
        }

    } else {
        /* no initial inventory is allowed */
        if (mtmp.minvent)
            C.discard_minvent(mtmp, 1);
        mtmp.minvent = 0; /* caller expects this */
    }
    if (ptr.mflags3 && !(mmflags & C.MM_NOWAIT)) {
        if (ptr.mflags3 & C.M3_WAITFORU)
            mtmp.mstrategy |= C.STRAT_WAITFORU;
        if (ptr.mflags3 & C.M3_CLOSE)
            mtmp.mstrategy |= C.STRAT_CLOSE;
        if (ptr.mflags3 & (C.M3_WAITMASK | C.M3_COVETOUS))
            mtmp.mstrategy |= C.STRAT_APPEARMSG;
    }

    if (allow_minvent && C.gm.migrating_objs)
        C.deliver_obj_to_mon(mtmp, 1, C.DF_NONE); /* in case of waiting items */

    if (!C.gi.in_mklev) {
        C.newsym(mtmp.mx, mtmp.my); /* make sure the mon shows up */
        if (!(mmflags & C.MM_NOMSG)) {
            let mbuf = C.stackAlloc(C.BUFSZ), what = 0;
            /* MM_NOEXCLAM is used for #wizgenesis (^G) */
            let exclaim = !(mmflags & C.MM_NOEXCLAM);

            if ((C.canseemon(mtmp) && (C.M_AP_TYPE(mtmp) == C.M_AP_NOTHING
                                     || C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER))
                || C.sensemon(mtmp)) {
                what = C.Amonnam(mtmp);
                if (C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER)
                    exclaim = 1;
            } else if (C.canseemon(mtmp)) {
                /* mimic masquerading as furniture or object and not sensed */
                C.mhidden_description(mtmp, C.MHID_ARTICLE | C.MHID_ALTMON, mbuf);
                what = C.upstart(mbuf);
            }
            if (what) {
                C.set_msg_xy(mtmp.mx, mtmp.my);
                C.Norep("%s%s %s%s%c", what,
                      exclaim ? " suddenly" : "",
                      /* 'what' might be "gold pieces" so need plural verb */
                      C.vtense(what, "appear"),
                      C.next2u(x, y) ? " next to you"
                      : (C.distu(x, y) <= (C.BOLT_LIM * C.BOLT_LIM)) ? " close by"
                        : "",
                      exclaim ? 33 : 46);
            }
        }
        /* if discernable and a threat, stop fiddling while Rome burns */
        if (C.go.occupation)
            C.dochugw(mtmp, 0);

        /* TODO: unify with teleport appears msg */
    }

    return mtmp;
}

/* caller rejects makemon()'s result; always returns Null */

export function unmakemon(mon, mmflags)
{
    let countbirth = ((mmflags & C.MM_NOCOUNTBIRTH) == 0);
    let mndx = C.monsndx(mon.data);

    /* if count has reached the limit of 255, we don't know whether
       that just happened when creating this monster or the threshold
       had already been reached and further increments were suppressed;
       assume the latter */
    if (countbirth && C.svm.mvitals[mndx].born > 0
        && C.svm.mvitals[mndx].born < 255)
        C.svm.mvitals[mndx].born -= 1;
    if ((mon.data.geno & C.G_UNIQ) != 0)
        C.svm.mvitals[mndx].mvflags &= ~C.G_EXTINCT;

    mon.mhp = 0; /* let discard_minvent() know that mon isn't being kept */
    /* uncreate any artifact that the monster was provided with; unlike
       mongone(), this doesn't protect special items like the Amulet
       by dropping them so caller should handle them when applicable */
    C.discard_minvent(mon, 1);

    C.mongone(mon);
    return 0;
}


export function mbirth_limit(mndx)
{
    /* There is an implicit limit of 4 for "high priest of <deity>",
     * but aligned priests can grow into high priests, thus they aren't
     * really limited to 4, so leave the default amount in place for them.
     */

    /* assert(MAXMONNO < 255); */
    return (mndx == C.PM_NAZGUL ? 9 : mndx == C.PM_ERINYS ? 3 : C.MAXMONNO);
}

/* used for wand/scroll/spell of create monster */
/* returns TRUE iff you know monsters have been created */
/* usually null; used for confused reading */
export function create_critters(cnt, mptr, neverask)
{
    const c = C.coordLocal();
    let x, y;
    let mon;
    let known = 0;
    let ask = Number(Boolean(C.wizard && !neverask));

    while (cnt--) {
        if (ask) {
            if (C.create_particular()) {
                known = 1;
                continue;
            } else
                ask = 0; /* ESC will shut off prompting */
        }
        x = C.u.ux, y = C.u.uy;
        /* if in water, try to encourage an aquatic monster
           by finding and then specifying another wet location */
        if (!mptr && C.u.uinwater && C.enexto(c, x, y, C.mons[C.PM_GIANT_EEL]))
            x = c.x, y = c.y;

        if ((mon = C.callLocal(makemon, mptr, x, y, C.NO_MM_FLAGS)) == 0)
            continue; /* try again [should probably stop instead] */

        if ((C.canseemon(mon) && (C.M_AP_TYPE(mon) == C.M_AP_NOTHING
                                || C.M_AP_TYPE(mon) == C.M_AP_MONSTER))
            || C.sensemon(mon))
            known = 1;
    }
    return known;
}


export function uncommon(mndx)
{
    if (C.mons[mndx].geno & (C.G_NOGEN | C.G_UNIQ))
        return 1;
    if (C.svm.mvitals[mndx].mvflags & C.G_GONE)
        return 1;
    if (C.Inhell)
        return C.boolean((C.mons[mndx].maligntyp > C.A_NEUTRAL));
    else
        return C.boolean(((C.mons[mndx].geno & C.G_HELL) != 0));
}

/*
 *      shift the probability of a monster's generation by
 *      comparing the dungeon alignment and monster alignment.
 *      return an integer in the range of 0-5.
 */

export function align_shift(ptr)
{
     /* != 1, starting value of moves */
    
    let alshift;

    if (C.oldmoves != C.svm.moves) {
        C.lev = C.Is_special(C.u.uz);
        C.oldmoves = C.svm.moves;
    }
    switch ((C.lev) ? C.lev.flags.align : C.svd.dungeons[C.u.uz.dnum].flags.align) {
    default: /* just in case */
    case C.AM_NONE:
        alshift = 0;
        break;
    case C.AM_LAWFUL:
        alshift = Math.trunc((ptr.maligntyp + 20) / (2 * C.ALIGNWEIGHT));
        break;
    case C.AM_NEUTRAL:
        alshift = Math.trunc((20 - C.abs(ptr.maligntyp)) / C.ALIGNWEIGHT);
        break;
    case C.AM_CHAOTIC:
        alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * C.ALIGNWEIGHT));
        break;
    }
    return alshift;
}

/* return larger value if monster prefers the level temperature */

export function temperature_shift(ptr)
{
    if (C.svl.level.flags.temperature
        && C.pm_resistance(ptr, (C.svl.level.flags.temperature > 0)
                         ? C.MR_FIRE : C.MR_COLD))
        return 3;
    return 0;
}

/* select a random monster type */

export function rndmonst()
{
    return C.callLocal(rndmonst_adj, 0, 0);
}

/* select a random monster type, with adjusted difficulty */

export function rndmonst_adj(minadj, maxadj)
{
    let ptr;
    let mndx;
    let weight, totalweight, selected_mndx, zlevel, minmlev, maxmlev;
    let elemlevel, upper;

    if (C.u.uz.dnum == C.quest_dnum && (C.rngSource(1666, "rndmonst_adj"), C.rn2(7)) && (ptr = C.qt_montype()) != 0)
        return ptr;

    zlevel = C.level_difficulty();
    minmlev = C.monmin_difficulty(zlevel) + minadj;
    maxmlev = C.monmax_difficulty(zlevel) + maxadj;
    upper = C.Is_rogue_level(C.u.uz); /* prefer uppercase only on rogue level */
    elemlevel = Number(Boolean(C.In_endgame(C.u.uz) && !C.Is_astralevel(C.u.uz))); /* elmntl plane */

    /* amount processed so far */
    totalweight = 0;
    selected_mndx = C.NON_PM;

    for (mndx = C.LOW_PM; mndx < C.SPECIAL_PM; ++mndx) {
        ptr = C.mons[mndx];

        if (C.montooweak(mndx, minmlev) || C.montoostrong(mndx, maxmlev))
            continue;
        if (upper && !C.isupper(C.monsym(ptr)))
            continue;
        if (elemlevel && C.callLocal(wrong_elem_type, ptr))
            continue;
        if (C.callLocal(uncommon, mndx))
            continue;
        if (C.Inhell && (ptr.geno & C.G_NOHELL))
            continue;

        /*
         * Weighted reservoir sampling:  select ptr with a
         * (ptr weight)/(total of all weights so far including ptr's)
         * probability.  For example, if the previous total is 10, and
         * this is now looking at acid blobs with a frequency of 2, it
         * has a 2/12 chance of abandoning ptr's previous value in favor
         * of acid blobs, and 10/12 chance of keeping whatever it was.
         *
         * This does not bias results towards either the earlier or the
         * later monsters:  the smaller pool and better odds from being
         * earlier are exactly canceled out by having more monsters to
         * potentially steal its spot.
         */
        weight = C.int((ptr.geno & C.G_FREQ)) + C.callLocal(align_shift, ptr);
        weight += C.callLocal(temperature_shift, ptr);
        if (weight < 0 || weight > 127) {
            C.impossible("bad weight in rndmonst for mndx %d", mndx);
            weight = 0;
        }
        /* was unconditional, but if weight==0, rn2() < 0 will always fail;
           also need to avoid rn2(0) if totalweight is still 0 so far */
        if (weight > 0) {
            totalweight += weight; /* totalweight now guaranteed to be > 0 */
            if ((C.rngSource(1716, "rndmonst_adj"), C.rn2(totalweight)) < weight)
                selected_mndx = mndx;
        }
    }
    /*
     * Possible modification:  if totalweight is "too low" or nothing
     * viable was picked, expand minmlev..maxmlev range and try again.
     */
    if (selected_mndx == C.NON_PM || C.callLocal(uncommon, selected_mndx)) {
        /* maybe no common monsters left, or all are too weak or too strong */
        if (selected_mndx != C.NON_PM)
            do { if (C.showdebug("makemon.c")) { let save_plnmsg = C.iflags.last_msg; C.pline("rndmonst returning Null [uncommon 'mndx'=#%d]",
                        selected_mndx); C.iflags.last_msg = save_plnmsg; } } while (0);
        return 0;
    }
    return C.mons[selected_mndx];
}

/* decide whether it's ok to generate a candidate monster by mkclass() */

export function mk_gen_ok(mndx, mvflagsmask, genomask)
{
    let ptr = C.mons[mndx];

    if (C.svm.mvitals[mndx].mvflags & mvflagsmask)
        return 0;
    if (ptr.geno & genomask)
        return 0;
    if (C.is_placeholder(ptr))
        return 0;
    /* special levels might ask for random demon type; reject this one */
    if (C.samePtr(ptr, C.mons[C.PM_MAIL_DAEMON]))
        return 0;
    return 1;
}

/* monsters in order by mlet & difficulty for mkclass() */





export function cmp_init_mongen_order(p1, p2)
{
    let i1 = C.intLoad(p1), i2 = C.intLoad(p2);
/* This will cause these to be moved last in the mlet sort order */
    let offset1 = 0, offset2 = 0;

    /* incorporate the mlet into the sort values for comparison */
    let difficulty1 =
        ((C.mons[i1].difficulty + offset1) | (C.int(C.mons[i1].mlet) << 8)),
        difficulty2 =
        ((C.mons[i2].difficulty + offset2) | (C.int(C.mons[i2].mlet) << 8));
    return difficulty1 - difficulty2;
}

/* check that monsters are in correct difficulty order for mkclass() */

/* initialize monster order for mkclass */

export function init_mongen_order()
{
    let i, mlet;

    if (C.mongen_order_init)
        return;

    C.mongen_order_init = 1;
    for (i = C.LOW_PM; i < C.NUMMONS; i++) {
        C.mongen_order[i] = i;
        mlet = C.mons[i].mlet;
        if (C.char((C.mons[i].geno & C.G_FREQ)) > C.mclass_maxf[mlet])
            C.mclass_maxf[mlet] = C.char((C.mons[i].geno & C.G_FREQ));
    }
    C.qsort(C.mongen_order, C.SPECIAL_PM, 4, cmp_init_mongen_order);
}
  /* allmain.c */


export function dump_mongen()
{
    let mlet, prev_mlet = 0;
    let i, nmwidth = 27, special;
    let nmbuf = C.stackAlloc(80);

    C.monst_globals_init();
    C.callLocal(init_mongen_order);
    C.raw_printf("int mongen_order[] = {");
    for (i = C.LOW_PM; i < C.SPECIAL_PM; ++i) {
        special = (C.mons[C.mongenOrderAt(i)].geno & (C.G_NOGEN | C.G_UNIQ));
        mlet = C.def_monsyms[C.int(C.mons[C.mongenOrderAt(i)].mlet)].sym;
        if (prev_mlet && prev_mlet != mlet)
            C.raw_print("");
        C.Snprintf("dump_mongen", 1851, nmbuf, 80, "PM_%s%s",
                 C.monsdump[C.mongenOrderAt(i)].nm,
                 (i == C.SPECIAL_PM - 1) ? "" : ",");
        C.raw_printf("    %*s /* %c seq=%3d, idx=%3d, sym='%c', diff=%2d, freq=%2d[%d] %s */",
                   -nmwidth, nmbuf, (i == C.mongenOrderAt(i)) ? 32 : 46, i, C.mongenOrderAt(i),
                   mlet, C.int(C.mons[C.mongenOrderAt(i)].difficulty),
                   C.int((C.mons[C.mongenOrderAt(i)].geno & C.G_FREQ)),
                   C.int(C.mclass_maxf[C.int(C.mons[C.mongenOrderAt(i)].mlet)]),
                   (special == (C.G_NOGEN | C.G_UNIQ)) ? "(G_NOGEN | G_UNIQ)"
                   : (special == C.G_NOGEN)          ? "(G_NOGEN)"
                   : (special == C.G_UNIQ)           ? "(G_UNIQ)"
                                                   : "");
        prev_mlet = mlet;
    }
    C.raw_print("};");
    C.raw_print("");
    C.freedynamicdata();
}

/* Make one of the multiple types of a given monster class.
   The second parameter specifies a special casing bit mask
   to allow the normal genesis masks to be deactivated.
   Returns Null if no monsters in that class can be made. */

export function mkclass(class_, spc)
{
    return C.callLocal(mkclass_aligned, class_, spc, C.A_NONE);
}

/* mkclass() with alignment restrictions; used by ndemon() */
/* special mons[].geno handling */
export function mkclass_aligned(class_, spc, atyp)
{
    let first, last, num = 0;
    let k, nums = C.intArrayLocal(C.SPECIAL_PM + 1); /* +1: insurance for final return value */
    let maxmlev, gehennom = C.Inhell != 0;
    let mv_mask, gn_mask;
    let zero_freq_for_entire_class;

    C.memset(nums, 0, ((C.SPECIAL_PM + 1) * 4));
    maxmlev = C.level_difficulty() >> 1;
    if (class_ < 1 || class_ >= C.MAXMCLASSES) {
        C.impossible("mkclass called with bad class!");
        return 0;
    }

    C.callLocal(init_mongen_order);
    /* the following must come after init_mongen_order() */
    zero_freq_for_entire_class = (C.mclass_maxf[C.int(class_)] == 0);

    /*  Assumption #1:  monsters of a given class are contiguous in the
     *                  mons[] array.  Player monsters and quest denizens
     *                  are an exception; mkclass() won't pick them.
     *                  SPECIAL_PM is long worm tail and separates the
     *                  regular monsters from the exceptions.
     */
    for (first = C.LOW_PM; first < C.SPECIAL_PM; first++)
        if (C.mons[C.mongenOrderAt(first)].mlet == class_)
            break;
    if (first == C.SPECIAL_PM) {
        C.impossible("mkclass found no class %d monsters", class_);
        return 0;
    }

    mv_mask = C.G_GONE; /* G_GENOD | G_EXTINCT */
    if ((spc & C.G_IGNORE) != 0) {
        mv_mask = 0; /* mv_mask &= ~G_GONE; */
        /* G_IGNORE is not a mons[].geno mask so get rid of it now */
        spc &= ~C.G_IGNORE;
    }

    /*  Assumption #2:  monsters of a given class are presented in ascending
     *                  order of strength.
     */
    for (last = first; last < C.SPECIAL_PM && C.mons[C.mongenOrderAt(last)].mlet == class_;
         last++) {
        if (atyp != C.A_NONE && C.sgn(C.mons[C.mongenOrderAt(last)].maligntyp) != C.sgn(atyp))
            continue;
        /* traditionally mkclass() ignored hell-only and never-in-hell;
           now we usually honor those but not all the time, mostly so that
           the majority of major demons aren't constrained to Gehennom;
           arch- and master liches are always so constrained (for creation;
           lesser liches might grow up into them elsewhere) */
        gn_mask = (C.G_NOGEN | C.G_UNIQ);
        if ((C.rngSource(1934, "mkclass_aligned"), C.rn2(9)) || class_ == C.S_LICH)
            gn_mask |= (gehennom ? C.G_NOHELL : C.G_HELL);
        gn_mask &= ~spc;

        if (C.callLocal(mk_gen_ok, C.mongenOrderAt(last), mv_mask, gn_mask)) {
            /* consider it; don't reject a toostrong() monster if we
               don't have anything yet (num==0) or if it is the same
               (or lower) difficulty as preceding candidate (non-zero
               'num' implies last > first so mons[last-1] is safe);
               sometimes accept it even if high difficulty */
            if (num && C.montoostrong(C.mongenOrderAt(last), maxmlev)
                && C.mons[C.mongenOrderAt(last)].difficulty > C.mons[C.mongenOrderAt(last - 1)].difficulty
                && (C.rngSource(1946, "mkclass_aligned"), C.rn2(2)))
                break;
            if ((k = (C.mons[C.mongenOrderAt(last)].geno & C.G_FREQ)) > 0
                || (k = (zero_freq_for_entire_class ? 1 : 0)) > 0) {
                /* skew towards lower value monsters at lower exp. levels
                   (this used to be done in the next loop, but that didn't
                   work well when multiple species had the same level and
                   were followed by one that was past the bias threshold;
                   cited example was succubus and incubus, where the bias
                   against picking the next demon resulted in incubus
                   being picked nearly twice as often as succubus);
                   we need the '+1' in case the entire set is too high
                   level (really low svl.level hero) */
                nums[C.mongenOrderAt(last)] = k + 1 - (C.callLocal(adj_lev, C.mons[C.mongenOrderAt(last)]) > (C.u.ulevel * 2));
                num += nums[C.mongenOrderAt(last)];
            }
        }
    }
    if (!num)
        return 0;

    /* the hard work has already been done; 'num' should hit 0 before
       first reaches last (which is actually one past our last candidate) */
    for (num = (C.rngSource(1969, "mkclass_aligned"), C.rnd(num)); first < last; first++)
        if ((num -= nums[C.mongenOrderAt(first)]) <= 0)
            break;

    return nums[C.mongenOrderAt(first)] ? C.mons[C.mongenOrderAt(first)] : 0;
}


/* like mkclass(), but excludes difficulty considerations; used when
   player with polycontrol picks a class instead of a specific type;
   genocided types are avoided but extinct ones are acceptable; we don't
   check polyok() here--caller accepts some choices !polyok() would reject */

export function mkclass_poly(class_)
{
    let first, last, num = 0;
    let gmask;

    for (first = C.LOW_PM; first < C.SPECIAL_PM; first++)
        if (C.mons[first].mlet == class_)
            break;
    if (first == C.SPECIAL_PM)
        return C.NON_PM;

    gmask = (C.G_NOGEN | C.G_UNIQ);
    /* mkclass() does this on a per monster type basis, but doing that here
       would make the two loops inconsistent with each other for non L */
    if ((C.rngSource(1997, "mkclass_poly"), C.rn2(9)) || class_ == C.S_LICH)
        gmask |= (C.Inhell ? C.G_NOHELL : C.G_HELL);

    for (last = first; last < C.SPECIAL_PM && C.mons[last].mlet == class_; last++)
        if (C.callLocal(mk_gen_ok, last, C.G_GENOD, gmask))
            num += C.mons[last].geno & C.G_FREQ;
    if (!num)
        return C.NON_PM;

    for (num = (C.rngSource(2006, "mkclass_poly"), C.rnd(num)); num > 0; first++)
        if (C.callLocal(mk_gen_ok, first, C.G_GENOD, gmask))
            num -= C.mons[first].geno & C.G_FREQ;
    first--; /* correct an off-by-one error */

    return first;
}

/* adjust strength of monsters based on u.uz and u.ulevel */

export function adj_lev(ptr)
{
    let tmp, tmp2;

    if (C.samePtr(ptr, C.mons[C.PM_WIZARD_OF_YENDOR])) {
        /* does not depend on other strengths, but does get stronger
         * every time he is killed
         */
        tmp = ptr.mlevel + C.svm.mvitals[C.PM_WIZARD_OF_YENDOR].died;
        if (tmp > 49)
            tmp = 49;
        return tmp;
    }

    if ((tmp = ptr.mlevel) > 49)
        return 50; /* "special" demons/devils */
    tmp2 = (C.level_difficulty() - tmp);
    if (tmp2 < 0)
        tmp--; /* if mlevel > u.uz decrement tmp */
    else
        tmp += (Math.trunc(tmp2 / 5)); /* else increment 1 per five diff */

    tmp2 = (C.u.ulevel - ptr.mlevel); /* adjust vs. the player */
    if (tmp2 > 0)
        tmp += (Math.trunc(tmp2 / 4)); /* level as well */

    tmp2 = Math.trunc((3 * (C.int(ptr.mlevel))) / 2); /* crude upper limit */
    if (tmp2 > 49)
        tmp2 = 49;                                      /* hard upper limit */
    return ((tmp > tmp2) ? tmp2 : (tmp > 0 ? tmp : 0)); /* 0 lower limit */
}

/* monster earned experience and will gain some hit points; it might also
   grow into a bigger monster (baby to adult, soldier to officer, etc) */

export function grow_up(mtmp, victim)
{
    let oldtype, newtype, max_increase, cur_increase, lev_limit, hp_threshold;
    let fem;
    let ptr = mtmp.data;

    /* monster died after killing enemy but before calling this function */
    /* currently possible if killing a gas spore */
    if (C.DEADMONSTER(mtmp))
        return 0;

    /* note:  none of the monsters with special hit point calculations
       have both little and big forms (killer bee can't grow into queen
       bee by just killing things, so isn't in the little_to_big list) */
    oldtype = C.monsndx(ptr);
    newtype = (oldtype == C.PM_KILLER_BEE && !victim) ? C.PM_QUEEN_BEE
                                                    : C.little_to_big(oldtype);
/* gender-neutral PM_CLERIC now */

    /* growth limits differ depending on method of advancement */
    if (victim) {                       /* killed a monster */
        /*
         * The HP threshold is the maximum number of hit points for the
         * current level; once exceeded, a level will be gained.
         * Possible bug: if somehow the hit points are already higher
         * than that, monster will gain a level without any increase in HP.
         */
        hp_threshold = mtmp.m_lev * 8; /* normal limit */
        if (!mtmp.m_lev)
            hp_threshold = 4;
        else if (C.is_golem(ptr)) /* strange creatures */
            hp_threshold = ((Math.trunc(mtmp.mhpmax / 10)) + 1) * 10 - 1;
        else if (C.callLocal(is_home_elemental, ptr))
            hp_threshold *= 3;
        lev_limit = Math.trunc(3 * C.int(ptr.mlevel) / 2); /* same as adj_lev() */
        /* If they can grow up, be sure the level is high enough for that */
        if (oldtype != newtype && C.mons[newtype].mlevel > lev_limit)
            lev_limit = C.int(C.mons[newtype].mlevel);
        /* number of hit points to gain; unlike for the player, we put
           the limit at the bottom of the next level rather than the top */
        max_increase = (C.rngSource(2095, "grow_up"), C.rnd(C.int(victim.m_lev) + 1));
        if (mtmp.mhpmax + max_increase > hp_threshold + 1)
            max_increase = C.max((hp_threshold + 1) - mtmp.mhpmax, 0);
        cur_increase = (max_increase > 1) ? (C.rngSource(2098, "grow_up"), C.rn2(max_increase)) : 0;
    } else {
        /* a gain level potion or wraith corpse; always go up a level
           unless already at maximum (49 is hard upper limit except
           for demon lords, who start at 50 and can't go any higher) */
        max_increase = cur_increase = (C.rngSource(2103, "grow_up"), C.rnd(8));
        hp_threshold = 0; /* smaller than `mhpmax + max_increase' */
        lev_limit = 50;   /* recalc below */
    }

    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold)
        return ptr; /* doesn't gain a level */

    if (C.is_mplayer(ptr))
        lev_limit = 30; /* same as player */
    else if (lev_limit < 5)
        lev_limit = 5; /* arbitrary */
    else if (lev_limit > 49)
        lev_limit = (ptr.mlevel > 49 ? 50 : 49);

    if (C.int(C.assignField(mtmp, "m_lev", mtmp.m_lev + 1)) >= C.mons[newtype].mlevel && newtype != oldtype) {
        ptr = C.mons[newtype];
        /* new form might force gender change */
        fem = C.is_male(ptr) ? 0 : C.is_female(ptr) ? 1 : mtmp.female;

        if (C.svm.mvitals[newtype].mvflags & C.G_GENOD) { /* allow G_EXTINCT */
            if (C.canspotmon(mtmp))
                C.pline("As %s grows up into %s, %s %s!", C.mon_nam(mtmp),
                      C.an(C.pmname(ptr, C.Mgender(mtmp))), C.mhe(mtmp),
                      C.nonliving(ptr) ? "expires" : "dies");
            C.set_mon_data(mtmp, ptr); /* keep svm.mvitals[] accurate */
            C.mondied(mtmp);
            return 0;
        } else if (C.canspotmon(mtmp)) {
            let buf = C.stackAlloc(C.BUFSZ);

            /* 3.6.1:
             * Temporary (?) hack to fix growing into opposite gender.
             */
            C.Sprintf(buf, "%s%s",
                    /* deal with female gnome becoming a gnome lord */
                    (mtmp.female && !fem) ? "male "
                        /* or a male gnome becoming a gnome lady
                           (can't happen with 3.6.0 mons[], but perhaps
                           slightly less sexist if prepared for it...) */
                      : (fem && !mtmp.female) ? "female " : "",
                    C.pmname(ptr, fem));
            C.pline_mon(mtmp, "%s %s %s.", C.YMonnam(mtmp),
                      (fem != mtmp.female) ? "changes into"
                                            : C.humanoid(ptr) ? "becomes"
                                                            : "grows up into",
                      C.an(buf));
        }
        C.set_mon_data(mtmp, ptr);
        if (mtmp.cham == oldtype && C.is_shapeshifter(ptr))
            mtmp.cham = newtype; /* vampire growing into vampire lord */
        C.newsym(mtmp.mx, mtmp.my);    /* color may change */
        lev_limit = C.int(mtmp.m_lev); /* never undo increment */

        mtmp.female = fem; /* gender might be changing */
        /* if 'mtmp' is leashed, persistent inventory window needs updating */
        if (mtmp.mleashed)
            C.update_inventory(); /* x - leash (attached to a <mon>) */
    }

    /* sanity checks */
    if (C.int(mtmp.m_lev) > lev_limit) {
        mtmp.m_lev--; /* undo increment */
        /* HP might have been allowed to grow when it shouldn't */
        if (mtmp.mhpmax == hp_threshold + 1)
            mtmp.mhpmax--;
    }
    if (mtmp.mhpmax > 50 * 8)
        mtmp.mhpmax = 50 * 8; /* absolute limit */
    if (mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;

    return ptr;
}


export function mongets(mtmp, otyp)
{
    let otmp;

    if (!otyp)
        return 0;
    otmp = C.mksobj(otyp, 1, 0);
    if (otmp) {
        if (mtmp.data.mlet == C.S_DEMON) {
            /* demons never get blessed objects */
            if (otmp.blessed)
                C.curse(otmp);
        } else if (C.is_lminion(mtmp)) {
            /* lawful minions don't get cursed, bad, or rusting objects */
            otmp.cursed = 0;
            if (otmp.spe < 0)
                otmp.spe = 0;
            otmp.oerodeproof = 1;
            otmp.oeroded = otmp.oeroded2 = 0;
        } else if (C.is_mplayer(mtmp.data) && C.is_sword(otmp)) {
            otmp.spe = (3 + (C.rngSource(2201, "mongets"), C.rn2(4)));
        }

        if (otmp.otyp == C.CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0n;
            otmp.lamplit = 0;
            otmp.blessed = otmp.cursed = 0;
        } else if (otmp.otyp == C.BELL_OF_OPENING) {
            otmp.blessed = otmp.cursed = 0;
        } else if (otmp.otyp == C.SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = 0;
            otmp.cursed = 1;
        }

        /* leaders don't tolerate inferior quality battle gear */
        if (C.is_prince(mtmp.data)) {
            if (otmp.oclass == C.WEAPON_CLASS && otmp.spe < 1)
                otmp.spe = 1;
            else if (otmp.oclass == C.ARMOR_CLASS && otmp.spe < 0)
                otmp.spe = 0;
        }

        if (C.mpickobj(mtmp, otmp)) {
            /* otmp was freed via merging with something else */
            otmp = 0;
        }
    }
    return otmp;
}


export function golemhp(type)
{
    switch (type) {
    case C.PM_STRAW_GOLEM:
        return 20;
    case C.PM_PAPER_GOLEM:
        return 20;
    case C.PM_ROPE_GOLEM:
        return 30;
    case C.PM_LEATHER_GOLEM:
        return 40;
    case C.PM_GOLD_GOLEM:
        return 60;
    case C.PM_WOOD_GOLEM:
        return 50;
    case C.PM_FLESH_GOLEM:
        return 40;
    case C.PM_CLAY_GOLEM:
        return 70;
    case C.PM_STONE_GOLEM:
        return 100;
    case C.PM_GLASS_GOLEM:
        return 80;
    case C.PM_IRON_GOLEM:
        return 120;
    default:
        return 0;
    }
}

/*
 *      Alignment vs. yours determines monster's attitude to you.
 *      (Some "animal" types are co-aligned, but also hungry.)
 */

export function peace_minded(ptr)
{
    let mal = ptr.maligntyp, ual = C.u.ualign.type;

    if (C.always_peaceful(ptr))
        return 1;
    if (C.always_hostile(ptr))
        return 0;
    if (ptr.msound == C.MS_LEADER || ptr.msound == C.MS_GUARDIAN)
        return 1;
    if (ptr.msound == C.MS_NEMESIS)
        return 0;
    if (C.samePtr(ptr, C.mons[C.PM_ERINYS]))
        return !C.u.ualign.abuse;

    if (C.race_peaceful(ptr))
        return 1;
    if (C.race_hostile(ptr))
        return 0;

    /* the monster is hostile if its alignment is different from the
     * player's */
    if (C.sgn(mal) != C.sgn(ual))
        return 0;

    /* Negative monster hostile to player with Amulet. */
    if (mal < C.A_NEUTRAL && C.u.uhave.amulet)
        return 0;

    /* minions are hostile to players that have strayed at all */
    if (C.is_minion(ptr))
        return C.boolean((C.u.ualign.record >= 0));

    /* Last case:  a chance of a co-aligned monster being
     * hostile.  This chance is greater if the player has strayed
     * (u.ualign.record negative) or the monster is not strongly aligned.
     */
    return C.boolean((!!(C.rngSource(2306, "peace_minded"), C.rn2(16 + (C.u.ualign.record < -15 ? -15
                                                        : C.u.ualign.record)))
                      && !!(C.rngSource(2307, "peace_minded"), C.rn2(2 + C.abs(mal)))));
}

/* Set malign to have the proper effect on player alignment if monster is
 * killed.  Negative numbers mean it's bad to kill this monster; positive
 * numbers mean it's good.  Since there are more hostile monsters than
 * peaceful monsters, the penalty for killing a peaceful monster should be
 * greater than the bonus for killing a hostile monster to maintain balance.
 * Rules:
 *   it's bad to kill peaceful monsters, potentially worse to kill always-
 *      peaceful monsters;
 *   it's never bad to kill a hostile monster, although it may not be good.
 */

export function set_malign(mtmp)
{
    let mal = mtmp.data.maligntyp;
    let coaligned;

    if (mtmp.ispriest || mtmp.isminion) {
        /* some monsters have individual alignments; check them */
        if (mtmp.ispriest && C.EPRI(mtmp))
            mal = C.EPRI(mtmp).shralign;
        else if (mtmp.isminion && C.EMIN(mtmp))
            mal = C.EMIN(mtmp).min_align;
        /* unless alignment is none, set mal to -5,0,5 */
        /* (see align.h for valid aligntyp values)     */
        if (mal != C.A_NONE)
            mal *= 5;
    }

    coaligned = (C.sgn(mal) == C.sgn(C.u.ualign.type));
    if (mtmp.data.msound == C.MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal == C.A_NONE) {
        if (mtmp.mpeaceful)
            mtmp.malign = 0;
        else
            mtmp.malign = 20; /* really hostile */
    } else if (C.always_peaceful(mtmp.data)) {
        let absmal = C.abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * C.max(5, absmal);
        else
            mtmp.malign = 3 * C.max(5, absmal); /* renegade */
    } else if (C.always_hostile(mtmp.data)) {
        let absmal = C.abs(mal);
        if (coaligned)
            mtmp.malign = 0;
        else
            mtmp.malign = C.max(5, absmal);
    } else if (coaligned) {
        let absmal = C.abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * C.max(3, absmal);
        else /* renegade */
            mtmp.malign = C.max(3, absmal);
    } else /* not coaligned and therefore hostile */
        mtmp.malign = C.abs(mal);
}

/* allocate a new mcorpsenm field for a monster; only need mextra itself */

export function newmcorpsenm(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.callLocal(newmextra);
    mtmp.mextra.mcorpsenm = C.NON_PM; /* not initialized yet */
}

/* release monster's mcorpsenm field; basically a no-op */

export function freemcorpsenm(mtmp)
{
    if (C.has_mcorpsenm(mtmp))
        mtmp.mextra.mcorpsenm = C.NON_PM;
}

export const syms = [
    "MAXOCLASSES",  "MAXOCLASSES",     "RING_CLASS",   "WAND_CLASS",   "WEAPON_CLASS",
    "FOOD_CLASS",   "COIN_CLASS",      "SCROLL_CLASS", "POTION_CLASS", "ARMOR_CLASS",
    "AMULET_CLASS", "TOOL_CLASS",      "ROCK_CLASS",   "GEM_CLASS",    "SPBOOK_CLASS",
    "S_MIMIC_DEF",  "S_MIMIC_DEF",
];


export function set_mimic_sym(mtmp)
{
    let typ, roomno, rt;
    let appear, ap_type;
    let s_sym;
    let otmp;
    let mx, my;

    if (!mtmp || C.Protection_from_shape_changers)
        return;
    mx = mtmp.mx;
    my = mtmp.my;
    typ = C.levl[mx][my].typ;
    /* only valid for INSIDE of room */
    roomno = C.levl[mx][my].roomno - C.ROOMOFFSET;
    if (roomno >= 0)
        rt = C.svr.rooms[roomno].rtype;
    else
        rt = 0; /* roomno < 0 case for GCC_WARN */

    chosen_sym: {
    assign_sym: {
    if (C.OBJ_AT(mx, my)) {
        ap_type = C.M_AP_OBJECT;
        appear = C.svl.level.objects[mx][my].otyp;
    } else if (C.IS_DOOR(typ) || C.IS_WALL(typ) || typ == C.SDOOR || typ == C.SCORR) {
        ap_type = C.M_AP_FURNITURE;
        /*
         *  If there is a wall to the left that connects to this
         *  location, then the mimic mimics a horizontal closed door.
         *  This does not allow doors to be in corners of rooms.
         *  Since rogue has no closed doors, mimic a wall there
         *  (yes, mimics can end up on this level by various means).
         */
        if (mx != 0 && (C.levl[mx - 1][my].typ == C.HWALL
                        || C.levl[mx - 1][my].typ == C.TLCORNER
                        || C.levl[mx - 1][my].typ == C.TRWALL
                        || C.levl[mx - 1][my].typ == C.BLCORNER
                        || C.levl[mx - 1][my].typ == C.TDWALL
                        || C.levl[mx - 1][my].typ == C.CROSSWALL
                        || C.levl[mx - 1][my].typ == C.TUWALL))
            appear = C.Is_rogue_level(C.u.uz) ? C.S_hwall : C.S_hcdoor;
        else
            appear = C.Is_rogue_level(C.u.uz) ? C.S_vwall : C.S_vcdoor;
    } else if (C.svl.level.flags.is_maze_lev
               && !(C.In_mines(C.u.uz) && C.in_town(C.u.ux, C.u.uy))
               && !C.In_sokoban(C.u.uz) && (C.rngSource(2441, "set_mimic_sym"), C.rn2(2))) {
        ap_type = C.M_AP_OBJECT;
        appear = C.STATUE;
    } else if (roomno < 0 && !C.t_at(mx, my)) {
        ap_type = C.M_AP_OBJECT;
        appear = C.BOULDER;
    } else if (rt == C.ZOO || rt == C.VAULT) {
        ap_type = C.M_AP_OBJECT;
        appear = C.GOLD_PIECE;
    } else if (rt == C.DELPHI) {
        if ((C.rngSource(2451, "set_mimic_sym"), C.rn2(2))) {
            ap_type = C.M_AP_OBJECT;
            appear = C.STATUE;
        } else {
            ap_type = C.M_AP_FURNITURE;
            appear = C.S_fountain;
        }
    } else if (rt == C.TEMPLE) {
        ap_type = C.M_AP_FURNITURE;
        appear = C.S_altar;

    /*
     * We won't bother with beehives, morgues, barracks, throne rooms
     * since they shouldn't contain too many mimics anyway...
     */

    } else if (rt >= C.SHOPBASE) {
        if ((C.rngSource(2468, "set_mimic_sym"), C.rn2(10)) >= C.depth(C.u.uz)) {
            s_sym = C.S_MIMIC_DEF; /* -> STRANGE_OBJECT */
            break assign_sym;
        }
        s_sym = C.get_shop_item(rt - C.SHOPBASE);
        if (s_sym < 0) {
            ap_type = C.M_AP_OBJECT;
            appear = -s_sym;
        } else if (rt == C.FODDERSHOP && s_sym > C.MAXOCLASSES) {
            /* health food store usually generates pseudo-class
               VEGETARIAN_CLASS which is MAXOCLASSES+1; we don't bother
               trying to select among all possible vegetarian food items */
            ap_type = C.M_AP_OBJECT;
            appear = (C.rngSource(2481, "set_mimic_sym"), C.rn2(2)) ? C.LUMP_OF_ROYAL_JELLY : C.SLIME_MOLD;
        } else {
            if (s_sym == C.RANDOM_CLASS || s_sym >= C.MAXOCLASSES)
                s_sym = C.syms[(C.rngSource(2484, "set_mimic_sym"), C.rn2(C.syms.length - 2)) + 2];
            break assign_sym;
        }
    } else {
        s_sym = C.syms[(C.rngSource(2488, "set_mimic_sym"), C.rn2(C.syms.length))];
        break assign_sym;
    }
    break chosen_sym;
    }

        if (s_sym == C.MAXOCLASSES) {
            const furnsyms = [
                C.S_upstair, C.S_upstair, C.S_dnstair, C.S_dnstair,
                C.S_altar, C.S_grave, C.S_throne, C.S_sink
            ];

            ap_type = C.M_AP_FURNITURE;
            appear = furnsyms[(C.rngSource(2497, "set_mimic_sym"), C.rn2(furnsyms.length))];
        } else {
            ap_type = C.M_AP_OBJECT;
            if (s_sym == C.S_MIMIC_DEF) {
                appear = C.STRANGE_OBJECT;
            } else if (s_sym == C.COIN_CLASS) {
                appear = C.GOLD_PIECE;
            } else {
                otmp = C.mkobj(C.char(s_sym), 0);
                appear = otmp.otyp;
                /* make sure container contents are free'ed */
                C.obfree(otmp, 0);
            }
        }
    }
    mtmp.m_ap_type = ap_type;
    mtmp.mappearance = appear;
    /* when appearing as an object based on a monster type, pick a shape */
    if (ap_type == C.M_AP_OBJECT
        && (appear == C.STATUE || appear == C.FIGURINE
            || appear == C.CORPSE || appear == C.EGG || appear == C.TIN)) {
        let mndx = C.rndmonnum(),
            nocorpse_ndx = (C.svm.mvitals[mndx].mvflags & C.G_NOCORPSE) != 0;

        if (appear == C.CORPSE && nocorpse_ndx)
            mndx = (C.rngSource(2522, "set_mimic_sym"), C.rn1(C.PM_WIZARD - C.PM_ARCHEOLOGIST + 1, C.PM_ARCHEOLOGIST));
        else if ((appear == C.EGG && !C.can_be_hatched(mndx))
                 || (appear == C.TIN && nocorpse_ndx))
            mndx = C.NON_PM; /* revert to generic egg or empty tin */

        C.callLocal(newmcorpsenm, mtmp);
        mtmp.mextra.mcorpsenm = mndx;
    } else if (ap_type == C.M_AP_OBJECT && appear == C.SLIME_MOLD) {
        C.callLocal(newmcorpsenm, mtmp);
        mtmp.mextra.mcorpsenm = C.svc.context.current_fruit;
        /* if no objects of this fruit type have been created yet,
           context.current_fruit is available for re-use when the player
           assigns a new fruit name; override that--having a mimic as the
           current_fruit is equivalent to creating an instance of that
           fruit (no-op if a fruit of this type has actually been made) */
        C.flags.made_fruit = 1;
    } else if (ap_type == C.M_AP_FURNITURE && appear == C.S_altar) {
        let algn = (C.rngSource(2539, "set_mimic_sym"), C.rn2(3)) - 1; /* -1 (A_Cha) or 0 (A_Neu) or +1 (A_Law) */

        C.callLocal(newmcorpsenm, mtmp);
        mtmp.mextra.mcorpsenm = (C.Inhell && (C.rngSource(2542, "set_mimic_sym"), C.rn2(3))) ? C.AM_NONE : C.Align2amask(algn);
    } else if (C.has_mcorpsenm(mtmp)) {
        /* don't retain stale value from a previously mimicked shape */
        mtmp.mextra.mcorpsenm = C.NON_PM;
    }

    if (C.does_block(mx, my, C.levl[mx][my]))
        C.block_point(mx, my);
}

/* release monster from bag of tricks; return number of monsters created */
/* caller emptying entirely; affects shop handling */
export function bagotricks(bag, tipping, seencount)
/* secondary output */
{
    let moncount = 0;

    if (!bag || bag.otyp != C.BAG_OF_TRICKS) {
        C.impossible("bad bag o' tricks");
    } else if (bag.spe < 1) {
        /* if tipping known empty bag, give normal empty container message */
        C.pline1((tipping && bag.cknown) ? "It's empty." : C.nothing_happens);
        /* now known to be empty if sufficiently discovered */
        if (bag.dknown && C.objects[bag.otyp].oc_name_known) {
            bag.cknown = 1;
            C.update_inventory(); /* for perm_invent */
        }
    } else {
        let mtmp;
        let creatcnt = 1, seecount = 0;

        C.consume_obj_charge(bag, !tipping);

        if (!(C.rngSource(2577, "bagotricks"), C.rn2(23)))
            creatcnt += (C.rngSource(2578, "bagotricks"), C.rnd(7));
        do {
            mtmp = C.callLocal(makemon, 0, C.u.ux, C.u.uy, C.NO_MM_FLAGS);
            if (mtmp) {
                ++moncount;
                if ((C.canseemon(mtmp) && (C.M_AP_TYPE(mtmp) == C.M_AP_NOTHING
                                         || C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER))
                    || C.sensemon(mtmp))
                    ++seecount;
            }
        } while (--creatcnt > 0);
        if (seecount) {
            if (seencount)
                seencount.value += seecount;
            if (bag.dknown) {
                C.makeknown(C.BAG_OF_TRICKS);
                C.update_inventory(); /* for perm_invent */
            }
        } else if (!tipping) {
            C.pline1(!moncount ? C.nothing_happens : C.nothing_seems_to_happen);
        }
    }
    return moncount;
}

/* create some or all remaining erinyes around the player */

export function summon_furies(limit)
/* number to create, or 0 to create until extinct */
{
    let i = 0;
    while (C.callLocal(mk_gen_ok, C.PM_ERINYS, C.G_GONE, 0) && (i < limit || !limit)) {
        C.callLocal(makemon, C.mons[C.PM_ERINYS], C.u.ux, C.u.uy, C.MM_ADJACENTOK | C.MM_NOWAIT);
        i++;
    }
}

/*makemon.c*/
