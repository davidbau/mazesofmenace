/* NetHack 5.0	makemon.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.271 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"

/* this assumes that a human quest leader or nemesis is an archetype
   of the corresponding role; that isn't so for some roles (tourist
   for instance) but is for the priests and monks we use it for... */
export function quest_mon_represents_role(mptr, role_pm) { return (+(mptr.mlet == S_HUMAN && Role_if(role_pm)   
     && (mptr.msound == MS_LEADER || mptr.msound == MS_NEMESIS))); }
















export function m_initsgrp(mtmp, x, y, mmf) { return m_initgrp(mtmp, x, y, 3, mmf); }
export function m_initlgrp(mtmp, x, y, mmf) { return m_initgrp(mtmp, x, y, 10, mmf); }

export function /* boolean */
is_home_elemental(ptr)
{
    if (ptr.mlet == S_ELEMENTAL) {
        switch (monsndx(ptr)) {
        case PM_AIR_ELEMENTAL:
            return Is_airlevel(u.uz);
        case PM_FIRE_ELEMENTAL:
            return Is_firelevel(u.uz);
        case PM_EARTH_ELEMENTAL:
            return Is_earthlevel(u.uz);
        case PM_WATER_ELEMENTAL:
            return Is_waterlevel(u.uz);
        default:
            break;
        }
    }
    return FALSE;
}

/*
 * Return true if the given monster cannot exist on this elemental level.
 */
function /* boolean */
wrong_elem_type(ptr)
{
    if (ptr.mlet == S_ELEMENTAL) {
        return (+!is_home_elemental(ptr));
    } else if (Is_earthlevel(u.uz)) {
        /* no restrictions? */
    } else if (Is_waterlevel(u.uz)) {
        /* just monsters that can swim */
        if (!is_swimmer(ptr))
            return TRUE;
    } else if (Is_firelevel(u.uz)) {
        if (!pm_resistance(ptr, MR_FIRE))
            return TRUE;
    } else if (Is_airlevel(u.uz)) {
        if (!(is_flyer(ptr) && ptr.mlet != S_TRAPPER) && !is_floater(ptr)
            && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr))
            return TRUE;
    }
    return FALSE;
}

/* make a group just like mtmp */
function /* void */
m_initgrp(
    mtmp,
    x, y, n,
    mmflags)
{ const $frame = stack_frame(); try {
    let mm = stack_struct(struct_nhcoord);
    let cnt = rnd(n);
    let mon;


















    /* Tuning: cut down on swarming at low character levels [mrs] */
    cnt = Math.trunc(cnt / ((u.ulevel < 3) ? 4 : (u.ulevel < 5) ? 2 : 1));






    if (!cnt)
        cnt++;







    mm.x = x;
    mm.y = y;
    while (cnt--) {
        if (peace_minded(mtmp.data))
            continue;
        /* Don't create groups of peaceful monsters since they'll get
         * in our way.  If the monster has a percentage chance so some
         * are peaceful and some are not, the result will just be a
         * smaller group.
         */
        if (enexto_gpflags(mm, mm.x, mm.y, mtmp.data, mmflags)) {
            mon = makemon(mtmp.data, mm.x, mm.y, (or64(mmflags, MM_NOGRP)));
            if (mon) {
                mon.mpeaceful = FALSE;
                mon.mavenge = 0;
                set_malign(mon);
                /* Undo the second peace_minded() check in makemon(); if the
                 * monster turned out to be peaceful the first time we
                 * didn't create it at all; we don't want a second check.
                 */
            }
        }
    }
} finally { stack_pop($frame); } }

function /* void */
m_initthrow(mtmp, otyp, oquan)
{
    let otmp;

    otmp = mksobj(otyp, TRUE, FALSE);
    otmp.quan = rn1(oquan, 3);
    otmp.owt = unsigned(weight(otmp));
    if (otyp == ORCISH_ARROW)
        otmp.otrapped = TRUE;
    void mpickobj(mtmp, otmp);
}

function /* void */
m_initweap(mtmp)
{
    let ptr = mtmp.data;
    let mm = monsndx(ptr);
    let otmp;
    let bias, w1, w2;

    if (Is_rogue_level(u.uz))
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
    case S_GIANT:
        if (rn2(2))
            void mongets(mtmp, (mm != PM_ETTIN) ? BOULDER : CLUB);
        if ((mm != PM_ETTIN) && !rn2(5))
            void mongets(mtmp, rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE);
        break;
    case S_HUMAN:
        if (is_mercenary(ptr)) {
            w1 = w2 = 0;
            switch (mm) {
            case PM_WATCHMAN:
            case PM_SOLDIER:
                if (!rn2(3)) {
                    /* lance and dwarvish mattock used to be in midst of
                       the polearms but use different skills from polearms
                       and aren't appropriates choices for human soldiers */
                    do {
                        w1 = rn1(BEC_DE_CORBIN - PARTISAN + 1, PARTISAN);
                    } while (objects[w1].oc_subtyp != P_POLEARMS);
                    w2 = rn2(2) ? DAGGER : KNIFE;
                } else
                    w1 = rn2(2) ? SPEAR : SHORT_SWORD;
                break;
            case PM_SERGEANT:
                w1 = rn2(2) ? FLAIL : MACE;
                break;
            case PM_LIEUTENANT:
                w1 = rn2(2) ? BROADSWORD : LONG_SWORD;
                break;
            case PM_CAPTAIN:
            case PM_WATCH_CAPTAIN:
                w1 = rn2(2) ? LONG_SWORD : SILVER_SABER;
                break;
            default:
                if (!rn2(4))
                    w1 = DAGGER;
                if (!rn2(7))
                    w2 = SPEAR;
                break;
            }
            if (w1)
                void mongets(mtmp, w1);
            if (!w2 && w1 != DAGGER && !rn2(4))
                w2 = KNIFE;
            if (w2)
                void mongets(mtmp, w2);
        } else if (is_elf(ptr)) {
            if (rn2(2))
                void mongets(mtmp,
                               rn2(2) ? ELVEN_MITHRIL_COAT : ELVEN_CLOAK);
            if (rn2(2))
                void mongets(mtmp, ELVEN_LEATHER_HELM);
            else if (!rn2(4))
                void mongets(mtmp, ELVEN_BOOTS);
            if (rn2(2))
                void mongets(mtmp, ELVEN_DAGGER);
            switch (rn2(3)) {
            case 0:
                if (!rn2(4))
                    void mongets(mtmp, ELVEN_SHIELD);
                if (rn2(3))
                    void mongets(mtmp, ELVEN_SHORT_SWORD);
                void mongets(mtmp, ELVEN_BOW);
                m_initthrow(mtmp, ELVEN_ARROW, 12);
                break;
            case 1:
                void mongets(mtmp, ELVEN_BROADSWORD);
                if (rn2(2))
                    void mongets(mtmp, ELVEN_SHIELD);
                break;
            case 2:
                if (rn2(2)) {
                    void mongets(mtmp, ELVEN_SPEAR);
                    void mongets(mtmp, ELVEN_SHIELD);
                }
                break;
            }
            if (mm == PM_ELVEN_MONARCH) {
                if (rn2(3) || (gi.in_mklev && Is_earthlevel(u.uz)))
                    void mongets(mtmp, PICK_AXE);
                if (!rn2(50))
                    void mongets(mtmp, CRYSTAL_BALL);
            }
        } else if (ptr.msound == MS_PRIEST
                   || quest_mon_represents_role(ptr, PM_CLERIC)) {
            otmp = mksobj(MACE, FALSE, FALSE);
            otmp.spe = rnd(3);
            if (!rn2(2))
                curse(otmp);
            void mpickobj(mtmp, otmp);
        } else if (mm == PM_NINJA) { /* extra quest villains */
            void mongets(mtmp, rn2(4) ? SHURIKEN : DART);
            void mongets(mtmp, rn2(4) ? SHORT_SWORD : AXE);
        } else if (ptr.msound == MS_GUARDIAN) {
            /* quest "guardians" */
            switch (mm) {
            case PM_STUDENT:
            case PM_ATTENDANT:
            case PM_ABBOT:
            case PM_ACOLYTE:
            case PM_GUIDE:
            case PM_APPRENTICE:
                if (rn2(2))
                    void mongets(mtmp, rn2(3) ? DAGGER : KNIFE);
                if (rn2(5))
                    void mongets(mtmp, rn2(3) ? LEATHER_JACKET
                                                : LEATHER_CLOAK);
                if (rn2(3))
                    void mongets(mtmp, rn2(3) ? LOW_BOOTS : HIGH_BOOTS);
                if (rn2(3))
                    void mongets(mtmp, POT_HEALING);
                break;
            case PM_CHIEFTAIN:
            case PM_PAGE:
            case PM_ROSHI:
            case PM_WARRIOR:
                void mongets(mtmp, rn2(3) ? LONG_SWORD : SHORT_SWORD);
                void mongets(mtmp, rn2(3) ? CHAIN_MAIL : LEATHER_ARMOR);
                if (rn2(2))
                    void mongets(mtmp, rn2(2) ? LOW_BOOTS : HIGH_BOOTS);
                if (!rn2(3))
                    void mongets(mtmp, LEATHER_CLOAK);
                if (!rn2(3)) {
                    void mongets(mtmp, BOW);
                    m_initthrow(mtmp, ARROW, 12);
                }
                break;
            case PM_HUNTER:
                void mongets(mtmp, rn2(3) ? SHORT_SWORD : DAGGER);
                if (rn2(2))
                    void mongets(mtmp, rn2(2) ? LEATHER_JACKET
                                                : LEATHER_ARMOR);
                void mongets(mtmp, BOW);
                m_initthrow(mtmp, ARROW, 12);
                break;
            case PM_THUG:
                void mongets(mtmp, CLUB);
                void mongets(mtmp, rn2(3) ? DAGGER : KNIFE);
                if (rn2(2))
                    void mongets(mtmp, LEATHER_GLOVES);
                void mongets(mtmp, rn2(2) ? LEATHER_JACKET : LEATHER_ARMOR);
                break;
            case PM_NEANDERTHAL:
                void mongets(mtmp, CLUB);
                void mongets(mtmp, LEATHER_ARMOR);
                break;
            }
        }
        break;

    case S_ANGEL:
        if (humanoid(ptr)) {
            /* create minion stuff; bypass mongets */
            let typ = rn2(3) ? LONG_SWORD : SILVER_MACE;
            let nam = (typ == LONG_SWORD) ? _("Sunsword") : _("Demonbane");

            otmp = mksobj(typ, FALSE, FALSE);
            /* maybe promote weapon to an artifact */
            if ((!rn2(20) || is_lord(ptr))
                 && sgn(mtmp.isminion ? EMIN(mtmp).min_align
                                       : ptr.maligntyp) == A_LAWFUL)
                otmp = oname(otmp, nam, ONAME_RANDOM); /* randomly created */
            /* enhance the weapon */
            bless(otmp);
            otmp.oerodeproof = TRUE;
            /* make long sword be +0 to +3, mace be +3 to +6 to compensate
               for being significantly weaker against large opponents */
            otmp.spe = rn2(4);
            if (typ == SILVER_MACE)
                otmp.spe += 3;
            void mpickobj(mtmp, otmp);

            otmp = mksobj(!rn2(4) || is_lord(ptr) ? SHIELD_OF_REFLECTION
                                                  : LARGE_SHIELD,
                          FALSE, FALSE);
            /* uncurse(otmp); -- mksobj(,FALSE,) item is always uncursed */
            otmp.oerodeproof = TRUE;
            otmp.spe = 0;
            void mpickobj(mtmp, otmp);
        }
        break;

    case S_HUMANOID:
        if (mm == PM_HOBBIT) {
            switch (rn2(3)) {
            case 0:
                void mongets(mtmp, DAGGER);
                break;
            case 1:
                void mongets(mtmp, ELVEN_DAGGER);
                break;
            case 2:
                void mongets(mtmp, SLING);
                m_initthrow(mtmp, !rn2(4) ? FLINT : ROCK, 6);
                break;
            }
            if (!rn2(10))
                void mongets(mtmp, ELVEN_MITHRIL_COAT);
            if (!rn2(10))
                void mongets(mtmp, DWARVISH_CLOAK);
        } else if (is_dwarf(ptr)) {
            if (rn2(7))
                void mongets(mtmp, DWARVISH_CLOAK);
            if (rn2(7))
                void mongets(mtmp, IRON_SHOES);
            if (!rn2(4)) {
                void mongets(mtmp, DWARVISH_SHORT_SWORD);
                /* note: you can't use a mattock with a shield */
                if (rn2(2))
                    void mongets(mtmp, DWARVISH_MATTOCK);
                else {
                    void mongets(mtmp, rn2(2) ? AXE : DWARVISH_SPEAR);
                    void mongets(mtmp, DWARVISH_ROUNDSHIELD);
                }
                void mongets(mtmp, DWARVISH_IRON_HELM);
                if (!rn2(3))
                    void mongets(mtmp, DWARVISH_MITHRIL_COAT);
            } else {
                void mongets(mtmp, !rn2(3) ? PICK_AXE : DAGGER);
            }
        }
        break;
    case S_KOP:
        /* create Keystone Kops with cream pies to
           throw. As suggested by KAA.     [MRS] */
        if (!rn2(4))
            m_initthrow(mtmp, CREAM_PIE, 2);
        if (!rn2(3))
            void mongets(mtmp, (rn2(2)) ? CLUB : RUBBER_HOSE);
        break;
    case S_ORC:
        if (rn2(2))
            void mongets(mtmp, ORCISH_HELM);
        switch ((mm != PM_ORC_CAPTAIN) ? mm
                : rn2(2) ? PM_MORDOR_ORC : PM_URUK_HAI) {
        case PM_MORDOR_ORC:
            if (!rn2(3))
                void mongets(mtmp, SCIMITAR);
            if (!rn2(3))
                void mongets(mtmp, ORCISH_SHIELD);
            if (!rn2(3))
                void mongets(mtmp, KNIFE);
            if (!rn2(3))
                void mongets(mtmp, ORCISH_CHAIN_MAIL);
            break;
        case PM_URUK_HAI:
            if (!rn2(3))
                void mongets(mtmp, ORCISH_CLOAK);
            if (!rn2(3))
                void mongets(mtmp, ORCISH_SHORT_SWORD);
            if (!rn2(3))
                void mongets(mtmp, IRON_SHOES);
            if (!rn2(3)) {
                void mongets(mtmp, ORCISH_BOW);
                m_initthrow(mtmp, ORCISH_ARROW, 12);
            }
            if (!rn2(3))
                void mongets(mtmp, URUK_HAI_SHIELD);
            break;
        default:
            if (mm != PM_ORC_SHAMAN && rn2(2))
                void mongets(mtmp, (mm == PM_GOBLIN || rn2(2) == 0)
                                         ? ORCISH_DAGGER
                                         : SCIMITAR);
        }
        break;
    case S_OGRE:
        if (!rn2(mm == PM_OGRE_TYRANT ? 3 : mm == PM_OGRE_LEADER ? 6 : 12))
            void mongets(mtmp, BATTLE_AXE);
        else
            void mongets(mtmp, CLUB);
        break;
    case S_TROLL:
        if (!rn2(2))
            switch (rn2(4)) {
            case 0:
                void mongets(mtmp, RANSEUR);
                break;
            case 1:
                void mongets(mtmp, PARTISAN);
                break;
            case 2:
                void mongets(mtmp, GLAIVE);
                break;
            case 3:
                void mongets(mtmp, SPETUM);
                break;
            }
        break;
    case S_KOBOLD:
        if (!rn2(4))
            m_initthrow(mtmp, DART, 12);
        break;

    case S_CENTAUR:
        if (rn2(2)) {
            if (ptr == mons[PM_FOREST_CENTAUR]) {
                void mongets(mtmp, BOW);
                m_initthrow(mtmp, ARROW, 12);
            } else {
                void mongets(mtmp, CROSSBOW);
                m_initthrow(mtmp, CROSSBOW_BOLT, 12);
            }
        }
        break;
    case S_WRAITH:
        void mongets(mtmp, KNIFE);
        void mongets(mtmp, LONG_SWORD);
        break;
    case S_ZOMBIE:
        if (!rn2(4))
            void mongets(mtmp, LEATHER_ARMOR);
        if (!rn2(4))
            void mongets(mtmp, (rn2(3) ? KNIFE : SHORT_SWORD));
        break;
    case S_LIZARD:
        if (mm == PM_SALAMANDER)
            void mongets(mtmp,
                           (rn2(7) ? SPEAR : rn2(3) ? TRIDENT : STILETTO));
        break;
    case S_DEMON:
        switch (mm) {
        case PM_BALROG:
            void mongets(mtmp, BULLWHIP);
            void mongets(mtmp, BROADSWORD);
            break;
        case PM_ORCUS:
            void mongets(mtmp, WAN_DEATH); /* the Wand of Orcus */
            break;
        case PM_HORNED_DEVIL:
            void mongets(mtmp, rn2(4) ? TRIDENT : BULLWHIP);
            break;
        case PM_DISPATER:
            void mongets(mtmp, WAN_STRIKING);
            break;
        case PM_YEENOGHU:
            void mongets(mtmp, FLAIL);
            break;
        }
        /* prevent djinn and mail daemons from leaving objects when
         * they vanish
         */
        if (!is_demon(ptr))
            break;
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    default:
        /*
         * Now the general case, some chance of getting some type
         * of weapon for "normal" monsters.  Certain special types
         * of monsters will get a bonus chance or different selections.
         */
        bias = is_lord(ptr) + is_prince(ptr) * 2 + extra_nasty(ptr);
        switch (rnd(14 - (2 * bias))) {
        case 1:
            if (strongmonst(ptr))
                void mongets(mtmp, BATTLE_AXE);
            else
                m_initthrow(mtmp, DART, 12);
            break;
        case 2:
            if (strongmonst(ptr))
                void mongets(mtmp, TWO_HANDED_SWORD);
            else {
                void mongets(mtmp, CROSSBOW);
                m_initthrow(mtmp, CROSSBOW_BOLT, 12);
            }
            break;
        case 3:
            void mongets(mtmp, BOW);
            m_initthrow(mtmp, ARROW, 12);
            break;
        case 4:
            if (strongmonst(ptr))
                void mongets(mtmp, LONG_SWORD);
            else
                m_initthrow(mtmp, DAGGER, 3);
            break;
        case 5:
            if (strongmonst(ptr))
                void mongets(mtmp, LUCERN_HAMMER);
            else
                void mongets(mtmp, AKLYS);
            break;
        default:
            break;
        }
        break;
    }

    if (mtmp.m_lev > rn2(75))
        void mongets(mtmp, rnd_offensive_item(mtmp));
}

/* create a new stack of gold in monster's inventory */
export function /* void */
mkmonmoney(mtmp, amount)
{
    /* mk_mplayer() passes rn2(1000) so the amount might be 0 */
    if (amount > 0) {
        let gold = mksobj(GOLD_PIECE, FALSE, FALSE);

        gold.quan = amount;
        gold.owt = unsigned(weight(gold));
        add_to_minv(mtmp, gold);
    }
}

function /* void */
m_initinv(mtmp)
{
    let cnt;
    let otmp;
    let ptr = mtmp.data;

    if (Is_rogue_level(u.uz))
        return;
    /*
     *  Soldiers get armour & rations - armour approximates their ac.
     *  Nymphs may get mirror or potion of object detection.
     */
    switch (ptr.mlet) {
    case S_HUMAN:
        if (is_mercenary(ptr)) {
            let mac;

            switch (monsndx(ptr)) {
            case PM_GUARD:
                mac = -1;
                break;
            case PM_SOLDIER:
                mac = 3;
                break;
            case PM_SERGEANT:
                mac = 0;
                break;
            case PM_LIEUTENANT:
                mac = -2;
                break;
            case PM_CAPTAIN:
                mac = -3;
                break;
            case PM_WATCHMAN:
                mac = 3;
                break;
            case PM_WATCH_CAPTAIN:
                mac = -2;
                break;
            default:
                impossible(_("odd mercenary %d?"), monsndx(ptr));
                mac = 0;
                break;
            }





            /* round 1: give them body armor */
            if (mac < -1 && rn2(5))
                otmp = mongets(mtmp, (rn2(5)) ? PLATE_MAIL
                                              : CRYSTAL_PLATE_MAIL);
            else if (mac < 3 && rn2(5))
                otmp = mongets(mtmp, (rn2(3)) ? SPLINT_MAIL : BANDED_MAIL);
            else if (rn2(5))
                otmp = mongets(mtmp, (rn2(3)) ? RING_MAIL
                                              : STUDDED_LEATHER_ARMOR);
            else
                otmp = mongets(mtmp, LEATHER_ARMOR);
            if (otmp) { mac += ARM_BONUS(otmp); } otmp = null;

            /* round 2: helmets */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, HELMET);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, DENTED_POT);
            if (otmp) { mac += ARM_BONUS(otmp); } otmp = null;

            /* round 3: shields */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, SMALL_SHIELD);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, LARGE_SHIELD);
            if (otmp) { mac += ARM_BONUS(otmp); } otmp = null;

            /* round 4: boots */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, LOW_BOOTS);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, HIGH_BOOTS);
            if (otmp) { mac += ARM_BONUS(otmp); } otmp = null;

            /* round 5: gloves + cloak */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, LEATHER_GLOVES);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, LEATHER_CLOAK);
            if (otmp) { mac += ARM_BONUS(otmp); } otmp = null; /* not technically needed */


            (void (mac)); /* suppress 'dead increment' from static analyzer */

            if (ptr == mons[PM_WATCH_CAPTAIN]) {
                ; /* better weapon rather than extra gear here */
            } else if (ptr == mons[PM_WATCHMAN]) {
                if (rn2(3)) /* most watchmen carry a whistle */
                    void mongets(mtmp, TIN_WHISTLE);
            } else if (ptr == mons[PM_GUARD]) {
                /* if hero teleports out of a vault while being confronted
                   by the vault's guard, there is a shrill whistling sound,
                   so guard evidently carries a cursed whistle */
                otmp = mksobj(TIN_WHISTLE, TRUE, FALSE);
                curse(otmp);
                void mpickobj(mtmp, otmp);
            } else { /* soldiers and their officers */
                if (!rn2(3))
                    void mongets(mtmp, K_RATION);
                if (!rn2(2))
                    void mongets(mtmp, C_RATION);
                if (ptr != mons[PM_SOLDIER] && !rn2(3))
                    void mongets(mtmp, BUGLE);
            }
        } else if (ptr == mons[PM_SHOPKEEPER]) {
            void mongets(mtmp, SKELETON_KEY);
            switch (rn2(4)) {
            /* MAJOR fall through ... */
            case 0:
                void mongets(mtmp, WAN_MAGIC_MISSILE);
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case 1:
                void mongets(mtmp, POT_EXTRA_HEALING);
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case 2:
                void mongets(mtmp, POT_HEALING);
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case 3:
                void mongets(mtmp, WAN_STRIKING);
            }
        } else if (ptr.msound == MS_PRIEST
                   || quest_mon_represents_role(ptr, PM_CLERIC)) {
            void mongets(mtmp, rn2(7) ? ROBE
                                        : rn2(3) ? CLOAK_OF_PROTECTION
                                                 : CLOAK_OF_MAGIC_RESISTANCE);
            void mongets(mtmp, SMALL_SHIELD);
            mkmonmoney(mtmp, rn1(10, 20));
        } else if (quest_mon_represents_role(ptr, PM_MONK)) {
            void mongets(mtmp, rn2(11) ? ROBE : CLOAK_OF_MAGIC_RESISTANCE);
        }
        break;
    case S_NYMPH:
        if (!rn2(2))
            void mongets(mtmp, MIRROR);
        if (!rn2(2))
            void mongets(mtmp, POT_OBJECT_DETECTION);
        break;
    case S_GIANT:
        if (ptr == mons[PM_MINOTAUR]) {
            if (!rn2(8) || (gi.in_mklev && Is_earthlevel(u.uz)))
                void mongets(mtmp, WAN_DIGGING);
        } else if (is_giant(ptr)) {
            for (cnt = rn2((Math.trunc(mtmp.m_lev / 2))); cnt; cnt--) {
                otmp = mksobj(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
                              FALSE, FALSE);
                otmp.quan = rn1(2, 3);
                otmp.owt = unsigned(weight(otmp));
                void mpickobj(mtmp, otmp);
            }
        }
        break;
    case S_WRAITH:
        if (ptr == mons[PM_NAZGUL]) {
            otmp = mksobj(RIN_INVISIBILITY, FALSE, FALSE);
            curse(otmp);
            void mpickobj(mtmp, otmp);
        }
        break;
    case S_LICH:
        if (ptr == mons[PM_MASTER_LICH] && !rn2(13))
            void mongets(mtmp, (rn2(7) ? ATHAME : WAN_NOTHING));
        else if (ptr == mons[PM_ARCH_LICH] && !rn2(3)) {
            otmp = mksobj(rn2(3) ? ATHAME : QUARTERSTAFF, TRUE,
                          rn2(13) ? FALSE : TRUE);
            if (otmp.spe < 2)
                otmp.spe = rnd(3);
            if (!rn2(4))
                otmp.oerodeproof = 1;
            void mpickobj(mtmp, otmp);
        }
        break;
    case S_MUMMY:
        if (rn2(7))
            void mongets(mtmp, MUMMY_WRAPPING);
        break;
    case S_QUANTMECH:
        if (!rn2(20) && ptr == mons[PM_QUANTUM_MECHANIC]) {
            let catcorpse;

            otmp = mksobj(LARGE_BOX, FALSE, FALSE);
            /* we used to just set the flag, which resulted in weight()
               treating the box as being heavier by the weight of a cat;
               now we include a cat corpse that won't rot; when opening or
               disclosing the box's contents, the corpse might be revived,
               otherwise it's given a rot timer; weight is now ordinary */
            if ((catcorpse = mksobj(CORPSE, TRUE, FALSE)) != null) {
                otmp.spe = 1; /* flag for special SchroedingersBox */
                set_corpsenm(catcorpse, PM_HOUSECAT);
                void stop_timer(ROT_CORPSE, obj_to_any(catcorpse));
                add_to_container(otmp, catcorpse);
                otmp.owt = unsigned(weight(otmp));
            }
            void mpickobj(mtmp, otmp);
        }
        break;
    case S_LEPRECHAUN:
        mkmonmoney(mtmp, d(level_difficulty(), 30));
        break;
    case S_DEMON:
        /* moved here from m_initweap() because these don't
           have AT_WEAP so m_initweap() is not called for them */
        if (ptr == mons[PM_ICE_DEVIL] && !rn2(4)) {
            void mongets(mtmp, SPEAR);
        } else if (ptr == mons[PM_ASMODEUS]) {
            void mongets(mtmp, WAN_COLD);
            void mongets(mtmp, WAN_FIRE);
        }
        break;
    case S_GNOME:
        if (!rn2((In_mines(u.uz) && gi.in_mklev) ? 20 : 60)) {
            otmp = mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, TRUE, FALSE);
            otmp.quan = 1;
            otmp.owt = unsigned(weight(otmp));
            if (!mpickobj(mtmp, otmp) && !levl()[mtmp.mx][mtmp.my].lit)
                begin_burn(otmp, FALSE);
        }
        break;
    default:
        break;
    }

    /* ordinary soldiers rarely have access to magic (or gold :-) */
    if (ptr == mons[PM_SOLDIER] && rn2(13))
        return;

    if (mtmp.m_lev > rn2(50))
        void mongets(mtmp, rnd_defensive_item(mtmp));
    if (mtmp.m_lev > rn2(100))
        void mongets(mtmp, rnd_misc_item(mtmp));
    if (likes_gold(ptr) && !findgold(mtmp.minvent) && !rn2(5))
        mkmonmoney(mtmp,
                   d(level_difficulty(), mtmp.minvent ? 5 : 10));
}

/* Note: for long worms, always call cutworm (cutworm calls clone_mon) */
export function /* struct monst * */
clone_mon(
    mon,
    x, y) /* clone's preferred location or 0 (near mon) */
{ const $frame = stack_frame(); try {
    let mm = stack_struct(struct_nhcoord);
    let m2;

    /* may be too weak or have been extinguished for population control */
    if (mon.mhp <= 1
        || (svm.mvitals[monsndx(mon.data)].mvflags & G_EXTINCT) != 0)
        return null;

    if (x == 0) {
        mm.x = mon.mx;
        mm.y = mon.my;
    } else {
        mm.x = x;
        mm.y = y;
    }
    if (!isok(mm.x, mm.y)) { /* paranoia */
        impossible(_("clone_mon trying to create a monster at <%d,%d>?"),
                   mm.x, mm.y);
        return null;
    }
    if (MON_AT(mm.x, mm.y)) { /* (always True for the x==0 case) */
        if (!enexto(mm, mm.x, mm.y, mon.data) || MON_AT(mm.x, mm.y))
            return null;
    }

    m2 = newmonst();
    struct_assign(m2, mon); /* copy condition of old monster */
    m2.mextra = null;
    m2.nmon = fmon();
    svl.level.monlist = m2;
    m2.m_id = next_ident();
    m2.mx = mm.x;
    m2.my = mm.y;

    m2.mundetected = 0;
    m2.mtrapped = 0;
    m2.mcloned = 1;
    m2.minvent = null; /* objects don't clone */
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
    mon_track_clear(m2);

    place_monster(m2, m2.mx, m2.my);
    if (emits_light(m2.data))
        new_light_source(m2.mx, m2.my, emits_light(m2.data), LS_MONSTER,
                         monst_to_any(m2));
    /* if 'parent' is named, give the clone the same name */
    if (has_mgivenname(mon)) {
        m2 = christen_monst(m2, MGIVENNAME(mon));
    } else if (mon.isshk) {
        m2 = christen_monst(m2, shkname(mon));
    }

    /* not all clones caused by player are tame or peaceful */
    if (!svc.context.mon_moving && mon.mpeaceful) {
        if (mon.mtame)
            m2.mtame = rn2(max(2 + u.uluck, 2)) ? mon.mtame : 0;
        else if (mon.mpeaceful)
            m2.mpeaceful = rn2(max(2 + u.uluck, 2)) ? 1 : 0;
    }
    /* if guardian angel could be cloned (maybe after polymorph?),
       m2 could be both isminion and mtame; isminion takes precedence */
    if (m2.isminion) {
        let atyp;

        newemin(m2);
        assert(has_emin(m2) && has_emin(mon));
        struct_assign(EMIN(m2), EMIN(mon));
        /* renegade when same alignment as hero but not peaceful or
           when peaceful while being different alignment from hero */
        atyp = EMIN(m2).min_align;
        EMIN(m2).renegade = (+(atyp != u.ualign.type)) ^ +!m2.mpeaceful;
    } else if (m2.mtame) {
        /* Because m2 is a copy of mon it is tame but not init'ed.
           However, tamedog() will not re-tame a tame dog, so m2
           must be made non-tame to get initialized properly. */
        m2.mtame = 0;
        if (tamedog(m2, null, FALSE)) {
            assert(has_edog(m2) && has_edog(mon));
            struct_assign(EDOG(m2), EDOG(mon));
        }
        /* [TODO? some (most? all?) edog fields probably should be
           reinitialized rather that retain the 'parent's values] */
    }
    set_malign(m2);
    newsym(m2.mx, m2.my); /* display the new monster */

    return m2;
} finally { stack_pop($frame); } }

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
export function /* boolean */
propagate(mndx, tally, ghostly)
{
    let gone, result;
    let lim = mbirth_limit(mndx);

    gone = +((svm.mvitals[mndx].mvflags & G_GONE) != 0); /* geno'd|extinct */
    result = ((svm.mvitals[mndx].born) < lim && !gone) ? TRUE : FALSE;

    /* if it's unique, don't ever make it again */
    if ((mons[mndx].geno & G_UNIQ) != 0 && mndx != PM_HIGH_CLERIC)
        svm.mvitals[mndx].mvflags |= G_EXTINCT;

    if (svm.mvitals[mndx].born < 255 && tally && (!ghostly || result))
        svm.mvitals[mndx].born++;
    if ((svm.mvitals[mndx].born) >= lim
        && !(mons[mndx].geno & G_NOGEN)
        && !(svm.mvitals[mndx].mvflags & G_EXTINCT)) {
        if (wizard()) {
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Automatically extinguished %s."), makeplural(mons[mndx].pmnames[NEUTRAL])); iflags.last_msg = save_plnmsg; } } while (0)
;
        }
        svm.mvitals[mndx].mvflags |= G_EXTINCT;
    }
    return result;
}

/* amount of HP to lose from level drain (or gain from Stormbringer) */
export function /* int */
monhp_per_lvl(mon)
{
    let ptr = mon.data;
    let hp = rnd(8); /* default is d8 */

    /* like newmonhp, but home elementals are ignored, riders use normal d8 */
    if (is_golem(ptr)) {
        /* draining usually won't be applicable for these critters */
        hp = Math.trunc(golemhp(monsndx(ptr)) / ptr.mlevel);
    } else if (ptr.mlevel > 49) {
        /* arbitrary; such monsters won't be involved in draining anyway */
        hp = 4 + rnd(4); /* 5..8 */
    } else if (ptr.mlet == S_DRAGON && monsndx(ptr) >= PM_GRAY_DRAGON) {
        /* adult dragons; newmonhp() uses In_endgame(&u.uz) ? 8 : 4 + rnd(4)
         */
        hp = 4 + rn2(5); /* 4..8 */
    } else if (!mon.m_lev) {
        /* level 0 monsters use 1d4 instead of Nd8 */
        hp = rnd(4);
    }
    return hp;
}

/* set up a new monster's initial level and hit points;
   used by newcham() as well as by makemon() */
export function /* void */
newmonhp(mon, mndx)
{
    let ptr = mons[mndx];
    let basehp = 0;

    mon.m_lev = uchar(adj_lev(ptr));
    if (is_golem(ptr)) {
        /* golems have a fixed amount of HP, varying by golem type */
        mon.mhpmax = mon.mhp = golemhp(mndx);
    } else if (is_rider(ptr)) {
        /* we want low HP, but a high mlevel so they can attack well */
        basehp = 10; /* minimum is 1 per false (weaker) level */
        mon.mhpmax = mon.mhp = d(basehp, 8);
    } else if (ptr.mlevel > 49) {
        /* "special" fixed hp monster
         * the hit points are encoded in the mlevel in a somewhat strange
         * way to fit in the 50..127 positive range of a signed character
         * above the 1..49 that indicate "normal" monster levels */
        mon.mhpmax = mon.mhp = 2 * (ptr.mlevel - 6);
        mon.m_lev = uchar(Math.trunc(mon.mhp / 4)); /* approximation */
    } else if (ptr.mlet == S_DRAGON && mndx >= PM_GRAY_DRAGON) {
        /* adult dragons; N*(4+rnd(4)) before endgame, N*8 once there */
        basehp = mon.m_lev; /* not really applicable; isolates cast */
        mon.mhpmax = int(mon.mhp = In_endgame(u.uz) ? (8 * basehp)
                                 : (4 * basehp + d(basehp, 4)));
    } else if (!mon.m_lev) {
        basehp = 1; /* minimum is 1, increased to 2 below */
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        basehp = mon.m_lev; /* minimum possible is one per level */
        mon.mhpmax = mon.mhp = d(basehp, 8);
        if (is_home_elemental(ptr))
            mon.mhpmax = (mon.mhp *= 3); /* leave 'basehp' as-is */
    }

    /* if d(X,8) rolled a 1 all X times, give a boost;
       most beneficial for level 0 and level 1 monsters, making mhpmax
       and starting mhp always be at least 2 */
    if (mon.mhpmax == basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}

const zeromextra = static_struct("zeromextra", struct_mextra, {});

function /* void */
init_mextra(mex)
{
    struct_assign(mex, zeromextra);
    mex.mcorpsenm = NON_PM;
}

export function /* struct mextra * */
newmextra()
{
    let mextra;

    mextra = view_of(struct_mextra, addr_of(alloc(sizeof(struct_mextra))));
    init_mextra(mextra);
    return mextra;
}

function /* boolean */
makemon_rnd_goodpos(
    mon,
    gpflags,
    cc) /* output */
{ let $goto = null;
    var tryct = 0;
    var nx, ny;
    var good;

    gpflags = or64(gpflags, GP_AVOID_MONPOS);
    do {
        nx = rn1(COLNO - 3, 2);
        ny = rn2(ROWNO);
        good = (!gi.in_mklev && cansee(nx,ny)) ? FALSE
                                              : goodpos(nx, ny, mon, gpflags);
    } while ((++tryct < 50) && !good);

    $goto_gotgood: for (;;) { switch ($goto) { default: case "gotgood": if (!$goto && (!good)) {
        /* else go through all map positions, twice, first round
           ignoring positions in sight, and pick first good one.
           skip first round if we're in special level loader or blind */
        var xofs = nx;
        var yofs = ny;
        var dx, dy;
        var bl = (gi.in_mklev || Blind()) ? 1 : 0;

        for ( ; bl < 2; bl++) {
            if (!bl)
                gpflags = and64(gpflags, ~GP_CHECKSCARY); /* perhaps should be a 3rd pass */
            for (dx = 0; dx < COLNO; dx++)
                for (dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl == 0 && cansee(nx,ny))
                        continue;
                    if (goodpos(nx, ny, mon, gpflags))
                        { $goto = "gotgood"; continue $goto_gotgood; };
                }
            if (bl == 0 && (!mon || mon.data.mmove)) {
                var stway = gs.stairs;
                /* all map positions are visible (or not good),
                   try to pick something logical */
                while (stway) {
                    if (stway.tolev.dnum == u.uz.dnum && !rn2(2)) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                    stway = stway.next;
                }
                if (goodpos(nx, ny, mon, gpflags))
                    { $goto = "gotgood"; continue $goto_gotgood; };
            }
        }
    } else {
 $goto = null;
        cc.x = nx;
        cc.y = ny;
        return TRUE;
    } } break; }
    return FALSE;
}

/*
 * called with [x,y] = coordinates;
 *      [0,0] means anyplace
 *      [u.ux,u.uy] means: near player (if !gi.in_mklev)
 *
 *      In case we make a monster group, only return the one at [x,y].
 */
export function /* struct monst * */
makemon(
    ptr,
    x, y,
    mmflags)
{ const $frame = stack_frame(); try {
    let mtmp;
    let fakemon = stack_struct(struct_monst);
    let cc = stack_struct(struct_nhcoord);
    let mndx, mcham, ct, mitem;
    let femaleok, maleok,
            anymon = +!ptr,
            byyou = u_at(x, y),
            allow_minvent = (+((mmflags & NO_MINVENT) == 0)),
            countbirth = (+((mmflags & MM_NOCOUNTBIRTH) == 0)),
            allowtail = (+((mmflags & MM_NOTAIL) == 0));
    let gpflags = (((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
                           | GP_CHECKSCARY | GP_AVOID_MONPOS);

    struct_assign(fakemon, cg.zeromonst);
    cc.x = cc.y = 0;

    if (iflags.debug_mongen || (!svl.level.flags.rndmongen && !ptr))
        return null;

    /* if caller wants random location, do it here */
    if (x == 0 && y == 0) {
        fakemon.data = ptr; /* set up for goodpos */
        if (!makemon_rnd_goodpos(ptr ? fakemon : null,
                                 gpflags, cc))
            return null;
        x = cc.x;
        y = cc.y;
    } else if (byyou && !gi.in_mklev) {
        if (!enexto_core(cc, u.ux, u.uy, ptr, gpflags)
            && !enexto_core(cc, u.ux, u.uy, ptr, and64(gpflags, ~GP_CHECKSCARY)))
            return null;
        x = cc.x;
        y = cc.y;
    }

    /* sanity check */
    if (!isok(x, y)) {
        impossible(_("makemon trying to create a monster at <%d,%d>?"), x, y);
        return null;
    }

    /* Does monster already exist at the position? */
    if (MON_AT(x, y)) {
        if (!(mmflags & MM_ADJACENTOK)
            || !enexto_core(cc, x, y, ptr, gpflags))
            return null;
        x = cc.x;
        y = cc.y;
    }

    if (ptr) {
        mndx = monsndx(ptr);
        /* if you are to make a specific monster and it has
           already been genocided, return */
        if (svm.mvitals[mndx].mvflags & G_GENOD)
            return null;
        if (wizard() && (svm.mvitals[mndx].mvflags & G_EXTINCT)) {
            do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Explicitly creating extinct monster %s."), mons[mndx].pmnames[NEUTRAL]); iflags.last_msg = save_plnmsg; } } while (0)
;
        }
    } else {
        /* make a random (common) monster that can survive here.
         * (the special levels ask for random monsters at specific
         * positions, causing mass drowning on the medusa level,
         * for instance.)
         */
        let tryct = 0; /* maybe there are no good choices */

        do {
            if (!(ptr = rndmonst())) {
                debugpline0(_("Warning: no monster."), __FILE__);
                return null; /* no more monsters! */
            }
            fakemon.data = ptr; /* set up for goodpos */
        } while (++tryct <= 50
                 /* in Sokoban, don't accept a giant on first try;
                    after that, boulder carriers are fair game */
                 && ((tryct == 1 && throws_rocks(ptr) && In_sokoban(u.uz))
                     || !goodpos(x, y, fakemon, gpflags)));
        mndx = monsndx(ptr);
    }
    void propagate(mndx, countbirth, FALSE);
    mtmp = newmonst();
    struct_assign(mtmp, cg.zeromonst); /* clear all entries in structure */

    if (mmflags & MM_EGD)
        newegd(mtmp);
    if (mmflags & MM_EPRI)
        newepri(mtmp);
    if (mmflags & MM_ESHK)
        neweshk(mtmp);
    if (mmflags & MM_EMIN)
        newemin(mtmp);
    if (mmflags & MM_EDOG)
        newedog(mtmp);
    if (mmflags & MM_ASLEEP)
        mtmp.msleeping = 1;
    mtmp.nmon = fmon();
    svl.level.monlist = mtmp;
    mtmp.m_id = next_ident();
    set_mon_data(mtmp, ptr); /* mtmp->data = ptr; */
    if (ptr.msound == MS_LEADER && quest_info(MS_LEADER) == mndx)
        svq.quest_status.leader_m_id = mtmp.m_id;
    mtmp.mnum = mndx;

    /* set up level and hit points */
    newmonhp(mtmp, mndx);

    femaleok = (+(!is_male(ptr) && !is_neuter(ptr)));
    maleok = (+(!is_female(ptr) && !is_neuter(ptr)));
    if (is_female(ptr) || ((mmflags & MM_FEMALE) != 0 && femaleok))
        mtmp.female = 1;
    else if (is_male(ptr) || ((mmflags & MM_MALE) != 0 && maleok))
        mtmp.female = 0;

    /* leader and nemesis gender is usually hardcoded in mons[],
       but for ones which can be random, it has already been chosen
       (in role_init(), for possible use by the quest pager code) */
    else if (ptr.msound == MS_LEADER && quest_info(MS_LEADER) == mndx)
        mtmp.female = svq.quest_status.ldrgend;
    else if (ptr.msound == MS_NEMESIS && quest_info(MS_NEMESIS) == mndx)
        mtmp.female = svq.quest_status.nemgend;

    /* female used to be set randomly here even for neuters on the
       grounds that it was ignored, but after corpses were changed to
       retain gender it matters because it affects stacking of corpses */
    else
        mtmp.female = unsigned(femaleok ? rn2(2) : 0);

    if (In_sokoban(u.uz) && !mindless(ptr)) { /* know about traps here */
        mon_learns_traps(mtmp, PIT);
        mon_learns_traps(mtmp, HOLE);
    }
    if (Is_stronghold(u.uz) && !mindless(ptr)) /* know about trap doors */
        mon_learns_traps(mtmp, TRAPDOOR);
    /* quest leader and nemesis both know about all trap types */
    if (ptr.msound == MS_LEADER || ptr.msound == MS_NEMESIS)
        mon_learns_traps(mtmp, ALL_TRAPS);
    /* locations where monsters are already experienced with wands */
    if (Is_stronghold(u.uz) || Is_knox(u.uz) || In_endgame(u.uz) ||
        In_hell(u.uz) || In_V_tower(u.uz) || In_quest(u.uz))
        mtmp.mwandexp = TRUE;

    place_monster(mtmp, x, y);
    mtmp.mcansee = mtmp.mcanmove = TRUE;
    mtmp.mgenmklev = unsigned(gi.in_mklev);
    mtmp.seen_resistance = M_SEEN_NOTHING;
    mtmp.mpeaceful = unsigned((mmflags & MM_ANGRY) ? FALSE : peace_minded(ptr));
    if ((mmflags & MM_MINVIS) != 0) /* for ^G */
        mon_set_minvis(mtmp, FALSE); /* call after place_monster() */

    switch (ptr.mlet) {
    case S_MIMIC:
        set_mimic_sym(mtmp);
        break;
    case S_SPIDER:
    case S_SNAKE:
        if (gi.in_mklev) {
            if (x && y)
                void mkobj_at(RANDOM_CLASS, x, y, TRUE);
            void hideunder(mtmp);
        }
        break;
    case S_LIGHT:
    case S_ELEMENTAL:
        if (mndx == PM_STALKER || mndx == PM_BLACK_LIGHT) {
            mtmp.perminvis = TRUE;
            mtmp.minvis = TRUE;
        }
        break;
    case S_EEL:
        if (gi.in_mklev) {
            void hideunder(mtmp);
        }
        break;
    case S_LEPRECHAUN:
        mtmp.msleeping = 1;
        break;
    case S_JABBERWOCK:
    case S_NYMPH:
        if (rn2(5) && !u.uhave.amulet)
            mtmp.msleeping = 1;
        break;
    case S_ORC:
        if (Race_if(PM_ELF))
            mtmp.mpeaceful = FALSE;
        break;
    case S_UNICORN:
        if (is_unicorn(ptr) && sgn(u.ualign.type) == sgn(ptr.maligntyp))
            mtmp.mpeaceful = TRUE;
        break;
    case S_BAT:
        if (Inhell() && is_bat(ptr))
            mon_adjust_speed(mtmp, 2, null);
        break;
    }
    if ((ct = emits_light(mtmp.data)) > 0)
        new_light_source(mtmp.mx, mtmp.my, ct, LS_MONSTER,
                         monst_to_any(mtmp));
    mitem = STRANGE_OBJECT; /* extra inventory item for this monster */

    if (mndx == PM_VLAD_THE_IMPALER)
        mitem = CANDELABRUM_OF_INVOCATION;
    mtmp.cham = NON_PM; /* default is "not a shapechanger" */
    if (!Protection_from_shape_changers()
        && (mcham = pm_to_cham(mndx)) != NON_PM) {
        /* this is a shapechanger after all */
        mtmp.cham = mcham;
        /* Vlad stays in his normal shape so he can carry the Candelabrum */
        if (mndx != PM_VLAD_THE_IMPALER
            /* Note:  shapechanger's initial form used to be chosen here
               with rndmonst(), yielding a monster which was appropriate
               to the level's difficulty but ignoring the changer's usual
               type selection, so was inappropriate for vampshifters.
               Let newcham() pick the shape. */
            && newcham(mtmp, null, NO_NC_FLAGS))
            allow_minvent = FALSE;
    } else if (mndx == PM_WIZARD_OF_YENDOR) {
        mtmp.iswiz = TRUE;
        svc.context.no_of_wizards++;
        if (svc.context.no_of_wizards == 1 && Is_earthlevel(u.uz))
            mitem = SPE_DIG;
    } else if (mndx == PM_GHOST && !(mmflags & MM_NONAME)) {
        mtmp = christen_monst(mtmp, rndghostname());
    } else if (mndx == PM_CROESUS) {
        mitem = TWO_HANDED_SWORD;
    } else if (ptr.msound == MS_NEMESIS) {
        mitem = BELL_OF_OPENING;
    } else if (mndx == PM_PESTILENCE) {
        mitem = POT_SICKNESS;
    }
    if (mitem != STRANGE_OBJECT && allow_minvent)
        void mongets(mtmp, mitem);

    if (gi.in_mklev) {
        if ((is_ndemon(ptr) || mndx == PM_WUMPUS
             || mndx == PM_LONG_WORM || mndx == PM_GIANT_EEL)
            && !u.uhave.amulet && rn2(5))
            mtmp.msleeping = TRUE;
    } else {
        if (byyou) {
            newsym(mtmp.mx, mtmp.my);
            set_apparxy(mtmp);
        }
    }
    if (is_dprince(ptr) && ptr.msound == MS_BRIBE) {
        mtmp.mpeaceful = mtmp.minvis = mtmp.perminvis = 1;
        mtmp.mavenge = 0;
        if (u_wield_art(ART_EXCALIBUR) || u_wield_art(ART_DEMONBANE))
            mtmp.mpeaceful = mtmp.mtame = FALSE;
    }
    if (mndx == PM_RAVEN && uwep && uwep.otyp == BEC_DE_CORBIN)
        mtmp.mpeaceful = TRUE;
    if (mndx == PM_LONG_WORM && int((mtmp.wormno = unsigned(get_wormno()))) != 0) {
        initworm(mtmp, allowtail ? rn2(5) : 0);
        if (count_wsegs(mtmp))
            place_worm_tail_randomly(mtmp, x, y);
    }
    /* it's possible to create an ordinary monster of some special
       types; make sure their extended data is initialized to
       something sensible if caller hasn't specified MM_EPRI|MM_EMIN
       (when they're specified, caller intends to handle this itself) */
    if ((mndx == PM_ALIGNED_CLERIC || mndx == PM_HIGH_CLERIC)
            ? !(mmflags & (MM_EPRI | MM_EMIN))
            : (mndx == PM_ANGEL && !(mmflags & MM_EMIN) && !rn2(3))) {
        let eminp;

        newemin(mtmp);
        eminp = EMIN(mtmp);

        mtmp.isminion = 1;            /* make priest be a roamer */
        eminp.min_align = rn2(3) - 1; /* no A_NONE */
        eminp.renegade = ((mmflags & MM_ANGRY) ? 1 : +!rn2(3));
        mtmp.mpeaceful = unsigned((eminp.min_align == u.ualign.type)
                              ? +!eminp.renegade
                              : eminp.renegade);
    }
    set_malign(mtmp); /* having finished peaceful changes */
    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3))
                m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else
                m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    if (allow_minvent) {
        if (is_armed(ptr))
            m_initweap(mtmp); /* equip with weapons / armor */
        m_initinv(mtmp); /* add on a few special items incl. more armor */
        m_dowear(mtmp, TRUE);

        if (!rn2(100) && is_domestic(ptr)
            && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE)) {
            /* NULL obj arg means put_saddle_on_mon()
             * will create the saddle itself */
            put_saddle_on_mon(null, mtmp);
        }

    } else {
        /* no initial inventory is allowed */
        if (mtmp.minvent)
            discard_minvent(mtmp, TRUE);
        mtmp.minvent = null; /* caller expects this */
    }
    if (ptr.mflags3 && !(mmflags & MM_NOWAIT)) {
        if (ptr.mflags3 & M3_WAITFORU)
            mtmp.mstrategy = or64u(mtmp.mstrategy, STRAT_WAITFORU);
        if (ptr.mflags3 & M3_CLOSE)
            mtmp.mstrategy = or64u(mtmp.mstrategy, STRAT_CLOSE);
        if (ptr.mflags3 & (M3_WAITMASK | M3_COVETOUS))
            mtmp.mstrategy = or64u(mtmp.mstrategy, STRAT_APPEARMSG);
    }

    if (allow_minvent && gm.migrating_objs)
        deliver_obj_to_mon(mtmp, 1, DF_NONE); /* in case of waiting items */

    if (!gi.in_mklev) {
        newsym(mtmp.mx, mtmp.my); /* make sure the mon shows up */
        if (!(mmflags & MM_NOMSG)) {
            let mbuf = stack_array(char, BUFSZ), what = 0;
            /* MM_NOEXCLAM is used for #wizgenesis (^G) */
            let exclaim = +!(mmflags & MM_NOEXCLAM);

            if ((canseemon(mtmp) && (M_AP_TYPE(mtmp) == M_AP_NOTHING
                                     || M_AP_TYPE(mtmp) == M_AP_MONSTER))
                || sensemon(mtmp)) {
                what = Amonnam(mtmp);
                if (M_AP_TYPE(mtmp) == M_AP_MONSTER)
                    exclaim = TRUE;
            } else if (canseemon(mtmp)) {
                /* mimic masquerading as furniture or object and not sensed */
                mhidden_description(mtmp, MHID_ARTICLE | MHID_ALTMON, mbuf);
                what = upstart(mbuf);
            }
            if (what) {
                set_msg_xy(mtmp.mx, mtmp.my);
                Norep(_("%s%s %s%s%c"), what,
                      exclaim ? _(" suddenly") : _(""),
                      /* 'what' might be "gold pieces" so need plural verb */
                      vtense(what, _("appear")),
                      next2u(x, y) ? _(" next to you")
                      : (distu(x, y) <= (BOLT_LIM * BOLT_LIM)) ? _(" close by")
                        : _(""),
                      exclaim ? ord('!') : ord('.'));
            }
        }
        /* if discernable and a threat, stop fiddling while Rome burns */
        if (go.occupation)
            void dochugw(mtmp, FALSE);

        /* TODO: unify with teleport appears msg */
    }

    return mtmp;
} finally { stack_pop($frame); } }

/* caller rejects makemon()'s result; always returns Null */
export function /* struct monst * */
unmakemon(
    mon,
    mmflags)
{
    let countbirth = (+((mmflags & MM_NOCOUNTBIRTH) == 0));
    let mndx = monsndx(mon.data);

    /* if count has reached the limit of 255, we don't know whether
       that just happened when creating this monster or the threshold
       had already been reached and further increments were suppressed;
       assume the latter */
    if (countbirth && svm.mvitals[mndx].born > 0
        && svm.mvitals[mndx].born < 255)
        svm.mvitals[mndx].born -= 1;
    if ((mon.data.geno & G_UNIQ) != 0)
        svm.mvitals[mndx].mvflags &= ~G_EXTINCT;

    mon.mhp = 0; /* let discard_minvent() know that mon isn't being kept */
    /* uncreate any artifact that the monster was provided with; unlike
       mongone(), this doesn't protect special items like the Amulet
       by dropping them so caller should handle them when applicable */
    discard_minvent(mon, TRUE);

    mongone(mon);
    return null;
}

export function /* int */
mbirth_limit(mndx)
{
    /* There is an implicit limit of 4 for "high priest of <deity>",
     * but aligned priests can grow into high priests, thus they aren't
     * really limited to 4, so leave the default amount in place for them.
     */

    /* assert(MAXMONNO < 255); */
    return (mndx == PM_NAZGUL ? 9 : mndx == PM_ERINYS ? 3 : MAXMONNO);
}

/* used for wand/scroll/spell of create monster */
/* returns TRUE iff you know monsters have been created */
export function /* boolean */
create_critters(
    cnt,
    mptr,
    neverask)
{ const $frame = stack_frame(); try {
    let c = stack_struct(struct_nhcoord);
    let x, y;
    let mon;
    let known = FALSE;
    let ask = (((wizard() && !neverask) ? 1 : 0));

    while (cnt--) {
        if (ask) {
            if (create_particular()) {
                known = TRUE;
                continue;
            } else
                ask = FALSE; /* ESC will shut off prompting */
        }
        x = u.ux, y = u.uy;
        /* if in water, try to encourage an aquatic monster
           by finding and then specifying another wet location */
        if (!mptr && u.uinwater && enexto(c, x, y, mons[PM_GIANT_EEL]))
            x = c.x, y = c.y;

        if ((mon = makemon(mptr, x, y, NO_MM_FLAGS)) == null)
            continue; /* try again [should probably stop instead] */

        if ((canseemon(mon) && (M_AP_TYPE(mon) == M_AP_NOTHING
                                || M_AP_TYPE(mon) == M_AP_MONSTER))
            || sensemon(mon))
            known = TRUE;
    }
    return known;
} finally { stack_pop($frame); } }

function /* boolean */
uncommon(mndx)
{
    if (mons[mndx].geno & (G_NOGEN | G_UNIQ))
        return TRUE;
    if (svm.mvitals[mndx].mvflags & G_GONE)
        return TRUE;
    if (Inhell())
        return (+(mons[mndx].maligntyp > A_NEUTRAL));
    else
        return (+((mons[mndx].geno & G_HELL) != 0));
}

/*
 *      shift the probability of a monster's generation by
 *      comparing the dungeon alignment and monster alignment.
 *      return an integer in the range of 0-5.
 */
function /* int */
align_shift(ptr)
{
    let oldmoves = static_var("align_shift.oldmoves", long, 0); /* != 1, starting value of moves */
    let lev = static_var("align_shift.lev", ptr_to(struct_s_level));
    let alshift;

    if (oldmoves[0] != svm.moves) {
        lev[0] = Is_special(u.uz);
        oldmoves[0] = svm.moves;
    }
    switch ((lev[0]) ? lev[0].flags.align : svd.dungeons[u.uz.dnum].flags.align) {
    default: /* just in case */
    case AM_NONE:
        alshift = 0;
        break;
    case AM_LAWFUL:
        alshift = Math.trunc((ptr.maligntyp + 20) / (2 * ALIGNWEIGHT));
        break;
    case AM_NEUTRAL:
        alshift = Math.trunc((20 - abs(ptr.maligntyp)) / ALIGNWEIGHT);
        break;
    case AM_CHAOTIC:
        alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * ALIGNWEIGHT));
        break;
    }
    return alshift;
}

/* return larger value if monster prefers the level temperature */
function /* int */
temperature_shift(ptr)
{
    if (svl.level.flags.temperature
        && pm_resistance(ptr, (svl.level.flags.temperature > 0)
                         ? MR_FIRE : MR_COLD))
        return 3;
    return 0;
}

/* select a random monster type */
export function /* struct permonst * */
rndmonst()
{
    return rndmonst_adj(0, 0);
}

/* select a random monster type, with adjusted difficulty */
export function /* struct permonst * */
rndmonst_adj(minadj, maxadj)
{
    let ptr;
    let mndx;
    let weight, totalweight, selected_mndx, zlevel, minmlev, maxmlev;
    let elemlevel, upper;

    if (u.uz.dnum == quest_dnum() && rn2(7) && (ptr = qt_montype()) != null)
        return ptr;

    zlevel = level_difficulty();
    minmlev = monmin_difficulty(zlevel) + minadj;
    maxmlev = monmax_difficulty(zlevel) + maxadj;
    upper = Is_rogue_level(u.uz); /* prefer uppercase only on rogue level */
    elemlevel = +(In_endgame(u.uz) && !Is_astralevel(u.uz)); /* elmntl plane */

    /* amount processed so far */
    totalweight = 0;
    selected_mndx = NON_PM;

    for (mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        ptr = mons[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper && !((0 ? isupper(monsym(ptr)) : ((unsigned((unsigned((monsym(ptr))) - ord("A")))) < 26))))
            continue;
        if (elemlevel && wrong_elem_type(ptr))
            continue;
        if (uncommon(mndx))
            continue;
        if (Inhell() && (ptr.geno & G_NOHELL))
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
        weight = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);
        if (weight < 0 || weight > 127) {
            impossible(_("bad weight in rndmonst for mndx %d"), mndx);
            weight = 0;
        }
        /* was unconditional, but if weight==0, rn2() < 0 will always fail;
           also need to avoid rn2(0) if totalweight is still 0 so far */
        if (weight > 0) {
            totalweight += weight; /* totalweight now guaranteed to be > 0 */
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }
    /*
     * Possible modification:  if totalweight is "too low" or nothing
     * viable was picked, expand minmlev..maxmlev range and try again.
     */
    if (selected_mndx == NON_PM || uncommon(selected_mndx)) {
        /* maybe no common monsters left, or all are too weak or too strong */
        if (selected_mndx != NON_PM)
            debugpline1(_("rndmonst returning Null [uncommon 'mndx'=#%d]"),
                        selected_mndx, __FILE__);
        return null;
    }
    return mons[selected_mndx];
}

/* decide whether it's ok to generate a candidate monster by mkclass() */
function /* boolean */
mk_gen_ok(mndx, mvflagsmask, genomask)
{
    let ptr = mons[mndx];

    if (svm.mvitals[mndx].mvflags & mvflagsmask)
        return FALSE;
    if (ptr.geno & genomask)
        return FALSE;
    if (is_placeholder(ptr))
        return FALSE;

    /* special levels might ask for random demon type; reject this one */
    if (ptr == mons[PM_MAIL_DAEMON])
        return FALSE;

    return TRUE;
}

/* monsters in order by mlet & difficulty for mkclass() */
const mongen_order = static_array("mongen_order", int, NUMMONS);
const mclass_maxf = static_array("mclass_maxf", schar, MAXMCLASSES);
const mongen_order_init = static_var("mongen_order_init", schar, FALSE);

function /* int QSORTCALLBACK */
cmp_init_mongen_order(p1, p2)
{
    let i1 = (ref_to(int, p1))[0], i2 = (ref_to(int, p2))[0];
 




    let offset1 = 0, offset2 = 0;


    /* incorporate the mlet into the sort values for comparison */
    let difficulty1 = ((mons[i1].difficulty + offset1) | ((mons[i1].mlet) << 8)),
        difficulty2 = ((mons[i2].difficulty + offset2) | ((mons[i2].mlet) << 8));


    return difficulty1 - difficulty2;
}



























/* initialize monster order for mkclass */
function /* void */
init_mongen_order()
{
    let i, mlet;

    if (mongen_order_init[0])
        return;

    mongen_order_init[0] = TRUE;
    for (i = LOW_PM; i < NUMMONS; i++) {
        mongen_order[i] = i;
        mlet = mons[i].mlet;
        if ((mons[i].geno & G_FREQ) > chars[mclass_maxf + mlet])
            chars[mclass_maxf + mlet] = (mons[i].geno & G_FREQ);
    }



    qsort(addr_of(mongen_order), SPECIAL_PM, sizeof(int), cmp_init_mongen_order);



}

export function MONSi(i) { return (mongen_order[i]); }

  /* allmain.c */

export function /* void */
dump_mongen()
{ const $frame = stack_frame(); try {
    let mlet, prev_mlet = 0;
    let i, nmwidth = 27, special;
    let nmbuf = stack_array(char, 80);

    monst_globals_init();
    init_mongen_order();
    raw_printf(_("int mongen_order[] = {"));
    for (i = LOW_PM; i < SPECIAL_PM; ++i) {
        special = (mons[MONSi(i)].geno & (G_NOGEN | G_UNIQ));
        mlet = def_monsyms[(mons[MONSi(i)].mlet)].sym;
        if (prev_mlet && prev_mlet != mlet)
            raw_print()(_(""));
        Snprintf(nmbuf, sizeof(array_of(char, 80)), _("PM_%s%s"), monsdump[MONSi(i)].nm, (i == SPECIAL_PM - 1) ? _("") : _(","))

;
        raw_printf(_("    %*s /* %c seq=%3d, idx=%3d, sym='%c', diff=%2d, freq=%2d[%d] %s */"),
                   -nmwidth, nmbuf, (i == MONSi(i)) ? ord(' ') : ord('.'), i, MONSi(i),
                   mlet, (mons[MONSi(i)].difficulty),
                   (mons[MONSi(i)].geno & G_FREQ),
                   (chars[mclass_maxf + (mons[MONSi(i)].mlet)]),
                   (special == (G_NOGEN | G_UNIQ)) ? _("(G_NOGEN | G_UNIQ)")
                   : (special == G_NOGEN)          ? _("(G_NOGEN)")
                   : (special == G_UNIQ)           ? _("(G_UNIQ)")
                                                   : _(""));
        prev_mlet = mlet;
    }
    raw_print()(_("};"));
    raw_print()(_(""));
    freedynamicdata();
} finally { stack_pop($frame); } }

/* Make one of the multiple types of a given monster class.
   The second parameter specifies a special casing bit mask
   to allow the normal genesis masks to be deactivated.
   Returns Null if no monsters in that class can be made. */
export function /* struct permonst * */
mkclass(class_, spc)
{
    return mkclass_aligned(class_, spc, A_NONE);
}

/* mkclass() with alignment restrictions; used by ndemon() */
export function /* struct permonst * */
mkclass_aligned(class_, spc,
                atyp)
{ const $frame = stack_frame(); try {
    let first, last, num = 0;
    let k, nums = stack_array(int, SPECIAL_PM + 1); /* +1: insurance for final return value */
    let maxmlev, gehennom = +(Inhell() != 0);
    let mv_mask, gn_mask;
    let zero_freq_for_entire_class;

    void memset(addr_of(nums), 0, sizeof(array_of(int, SPECIAL_PM + 1)));
    maxmlev = level_difficulty() >> 1;
    if (class_ < 1 || class_ >= MAXMCLASSES) {
        impossible(_("mkclass called with bad class!"));
        return null;
    }

    init_mongen_order();
    /* the following must come after init_mongen_order() */
    zero_freq_for_entire_class = (+(chars[mclass_maxf + class_] == 0));

    /*  Assumption #1:  monsters of a given class are contiguous in the
     *                  mons[] array.  Player monsters and quest denizens
     *                  are an exception; mkclass() won't pick them.
     *                  SPECIAL_PM is long worm tail and separates the
     *                  regular monsters from the exceptions.
     */
    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (mons[MONSi(first)].mlet == class_)
            break;
    if (first == SPECIAL_PM) {
        impossible(_("mkclass found no class %d monsters"), class_);
        return null;
    }

    mv_mask = G_GONE; /* G_GENOD | G_EXTINCT */
    if ((spc & G_IGNORE) != 0) {
        mv_mask = 0; /* mv_mask &= ~G_GONE; */
        /* G_IGNORE is not a mons[].geno mask so get rid of it now */
        spc &= ~G_IGNORE;
    }

    /*  Assumption #2:  monsters of a given class are presented in ascending
     *                  order of strength.
     */
    for (last = first; last < SPECIAL_PM && mons[MONSi(last)].mlet == class_;
         last++) {
        if (atyp != A_NONE && sgn(mons[MONSi(last)].maligntyp) != sgn(atyp))
            continue;
        /* traditionally mkclass() ignored hell-only and never-in-hell;
           now we usually honor those but not all the time, mostly so that
           the majority of major demons aren't constrained to Gehennom;
           arch- and master liches are always so constrained (for creation;
           lesser liches might grow up into them elsewhere) */
        gn_mask = (G_NOGEN | G_UNIQ);
        if (rn2(9) || class_ == S_LICH)
            gn_mask = unsigned(gn_mask | (gehennom ? G_NOHELL : G_HELL));
        gn_mask = unsigned(gn_mask & unsigned(~spc));

        if (mk_gen_ok(MONSi(last), mv_mask, gn_mask)) {
            /* consider it; don't reject a toostrong() monster if we
               don't have anything yet (num==0) or if it is the same
               (or lower) difficulty as preceding candidate (non-zero
               'num' implies last > first so mons[last-1] is safe);
               sometimes accept it even if high difficulty */
            if (num && montoostrong(MONSi(last), maxmlev)
                && mons[MONSi(last)].difficulty > mons[MONSi(last - 1)].difficulty
                && rn2(2))
                break;
            if ((k = (mons[MONSi(last)].geno & G_FREQ)) > 0
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
                nums[MONSi(last)] = k + 1 - (+(adj_lev(mons[MONSi(last)]) > (u.ulevel * 2)));
                num += nums[MONSi(last)];
            }
        }
    }
    if (!num)
        return null;

    /* the hard work has already been done; 'num' should hit 0 before
       first reaches last (which is actually one past our last candidate) */
    for (num = rnd(num); first < last; first++)
        if ((num -= nums[MONSi(first)]) <= 0)
            break;

    return nums[MONSi(first)] ? mons[MONSi(first)] : null;
} finally { stack_pop($frame); } }



/* like mkclass(), but excludes difficulty considerations; used when
   player with polycontrol picks a class instead of a specific type;
   genocided types are avoided but extinct ones are acceptable; we don't
   check polyok() here--caller accepts some choices !polyok() would reject */
export function /* int */
mkclass_poly(class_)
{
    let first, last, num = 0;
    let gmask;

    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (mons[first].mlet == class_)
            break;
    if (first == SPECIAL_PM)
        return NON_PM;

    gmask = (G_NOGEN | G_UNIQ);
    /* mkclass() does this on a per monster type basis, but doing that here
       would make the two loops inconsistent with each other for non L */
    if (rn2(9) || class_ == S_LICH)
        gmask = unsigned(gmask | (Inhell() ? G_NOHELL : G_HELL));

    for (last = first; last < SPECIAL_PM && mons[last].mlet == class_; last++)
        if (mk_gen_ok(last, G_GENOD, gmask))
            num += mons[last].geno & G_FREQ;
    if (!num)
        return NON_PM;

    for (num = rnd(num); num > 0; first++)
        if (mk_gen_ok(first, G_GENOD, gmask))
            num -= mons[first].geno & G_FREQ;
    first--; /* correct an off-by-one error */

    return first;
}

/* adjust strength of monsters based on u.uz and u.ulevel */
export function /* int */
adj_lev(ptr)
{
    let tmp, tmp2;

    if (ptr == mons[PM_WIZARD_OF_YENDOR]) {
        /* does not depend on other strengths, but does get stronger
         * every time he is killed
         */
        tmp = ptr.mlevel + svm.mvitals[PM_WIZARD_OF_YENDOR].died;
        if (tmp > 49)
            tmp = 49;
        return tmp;
    }

    if ((tmp = ptr.mlevel) > 49)
        return 50; /* "special" demons/devils */
    tmp2 = (level_difficulty() - tmp);
    if (tmp2 < 0)
        tmp--; /* if mlevel > u.uz decrement tmp */
    else
        tmp += (Math.trunc(tmp2 / 5)); /* else increment 1 per five diff */

    tmp2 = (u.ulevel - ptr.mlevel); /* adjust vs. the player */
    if (tmp2 > 0)
        tmp += (Math.trunc(tmp2 / 4)); /* level as well */

    tmp2 = Math.trunc((3 * (ptr.mlevel)) / 2); /* crude upper limit */
    if (tmp2 > 49)
        tmp2 = 49;                                      /* hard upper limit */
    return ((tmp > tmp2) ? tmp2 : (tmp > 0 ? tmp : 0)); /* 0 lower limit */
}

/* monster earned experience and will gain some hit points; it might also
   grow into a bigger monster (baby to adult, soldier to officer, etc) */
export function /* struct permonst * */
grow_up(mtmp, victim)
{ const $frame = stack_frame(); try {
    let oldtype, newtype, max_increase, cur_increase, lev_limit, hp_threshold;
    let fem;
    let ptr = mtmp.data;

    /* monster died after killing enemy but before calling this function */
    /* currently possible if killing a gas spore */
    if (DEADMONSTER(mtmp))
        return null;

    /* note:  none of the monsters with special hit point calculations
       have both little and big forms (killer bee can't grow into queen
       bee by just killing things, so isn't in the little_to_big list) */
    oldtype = monsndx(ptr);
    newtype = (oldtype == PM_KILLER_BEE && !victim) ? PM_QUEEN_BEE
                                                    : little_to_big(oldtype);






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
        else if (is_golem(ptr)) /* strange creatures */
            hp_threshold = ((Math.trunc(mtmp.mhpmax / 10)) + 1) * 10 - 1;
        else if (is_home_elemental(ptr))
            hp_threshold *= 3;
        lev_limit = Math.trunc(3 * ptr.mlevel / 2); /* same as adj_lev() */
        /* If they can grow up, be sure the level is high enough for that */
        if (oldtype != newtype && mons[newtype].mlevel > lev_limit)
            lev_limit = (mons[newtype].mlevel);
        /* number of hit points to gain; unlike for the player, we put
           the limit at the bottom of the next level rather than the top */
        max_increase = rnd(victim.m_lev + 1);
        if (mtmp.mhpmax + max_increase > hp_threshold + 1)
            max_increase = max((hp_threshold + 1) - mtmp.mhpmax, 0);
        cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
    } else {
        /* a gain level potion or wraith corpse; always go up a level
           unless already at maximum (49 is hard upper limit except
           for demon lords, who start at 50 and can't go any higher) */
        max_increase = cur_increase = rnd(8);
        hp_threshold = 0; /* smaller than `mhpmax + max_increase' */
        lev_limit = 50;   /* recalc below */
    }

    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold)
        return ptr; /* doesn't gain a level */

    if (is_mplayer(ptr))
        lev_limit = 30; /* same as player */
    else if (lev_limit < 5)
        lev_limit = 5; /* arbitrary */
    else if (lev_limit > 49)
        lev_limit = (ptr.mlevel > 49 ? 50 : 49);

    if ((++mtmp.m_lev) >= mons[newtype].mlevel && newtype != oldtype) {
        ptr = mons[newtype];
        /* new form might force gender change */
        fem = is_male(ptr) ? 0 : is_female(ptr) ? 1 : mtmp.female;

        if (svm.mvitals[newtype].mvflags & G_GENOD) { /* allow G_EXTINCT */
            if (canspotmon(mtmp))
                pline(_("As %s grows up into %s, %s %s!"), mon_nam(mtmp),
                      an(pmname(ptr, Mgender(mtmp))), mhe(mtmp),
                      nonliving(ptr) ? _("expires") : _("dies"));
            set_mon_data(mtmp, ptr); /* keep svm.mvitals[] accurate */
            mondied(mtmp);
            return null;
        } else if (canspotmon(mtmp)) {
            let buf = stack_array(char, BUFSZ);

            /* 3.6.1:
             * Temporary (?) hack to fix growing into opposite gender.
             */
            void sprintf(buf, _("%s%s"), (mtmp.female && !fem) ? _("male ")
                        /* or a male gnome becoming a gnome lady
                           (can't happen with 3.6.0 mons[], but perhaps
                           slightly less sexist if prepared for it...) */
                      : (fem && !mtmp.female) ? _("female ") : _(""), pmname(ptr, int(fem)))


;
            pline_mon(mtmp, _("%s %s %s."), YMonnam(mtmp),
                      (fem != mtmp.female) ? _("changes into")
                                            : humanoid(ptr) ? _("becomes")
                                                            : _("grows up into"),
                      an(buf));
        }
        set_mon_data(mtmp, ptr);
        if (mtmp.cham == oldtype && is_shapeshifter(ptr))
            mtmp.cham = newtype; /* vampire growing into vampire lord */
        newsym(mtmp.mx, mtmp.my);    /* color may change */
        lev_limit = mtmp.m_lev; /* never undo increment */

        mtmp.female = fem; /* gender might be changing */
        /* if 'mtmp' is leashed, persistent inventory window needs updating */
        if (mtmp.mleashed)
            update_inventory(); /* x - leash (attached to a <mon>) */
    }

    /* sanity checks */
    if (mtmp.m_lev > lev_limit) {
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
} finally { stack_pop($frame); } }

export function /* struct obj * */
mongets(mtmp, otyp)
{
    let otmp;

    if (!otyp)
        return null;
    otmp = mksobj(otyp, TRUE, FALSE);
    if (otmp) {
        if (mtmp.data.mlet == S_DEMON) {
            /* demons never get blessed objects */
            if (otmp.blessed)
                curse(otmp);
        } else if (is_lminion(mtmp)) {
            /* lawful minions don't get cursed, bad, or rusting objects */
            otmp.cursed = FALSE;
            if (otmp.spe < 0)
                otmp.spe = 0;
            otmp.oerodeproof = 1;
            otmp.oeroded = otmp.oeroded2 = 0;
        } else if (is_mplayer(mtmp.data) && is_sword(otmp)) {
            otmp.spe = (3 + rn2(4));
        }

        if (otmp.otyp == CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0;
            otmp.lamplit = FALSE;
            otmp.blessed = otmp.cursed = FALSE;
        } else if (otmp.otyp == BELL_OF_OPENING) {
            otmp.blessed = otmp.cursed = FALSE;
        } else if (otmp.otyp == SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = FALSE;
            otmp.cursed = TRUE;
        }

        /* leaders don't tolerate inferior quality battle gear */
        if (is_prince(mtmp.data)) {
            if (otmp.oclass == WEAPON_CLASS && otmp.spe < 1)
                otmp.spe = 1;
            else if (otmp.oclass == ARMOR_CLASS && otmp.spe < 0)
                otmp.spe = 0;
        }

        if (mpickobj(mtmp, otmp)) {
            /* otmp was freed via merging with something else */
            otmp = null;
        }
    }
    return otmp;
}

export function /* int */
golemhp(type)
{
    switch (type) {
    case PM_STRAW_GOLEM:
        return 20;
    case PM_PAPER_GOLEM:
        return 20;
    case PM_ROPE_GOLEM:
        return 30;
    case PM_LEATHER_GOLEM:
        return 40;
    case PM_GOLD_GOLEM:
        return 60;
    case PM_WOOD_GOLEM:
        return 50;
    case PM_FLESH_GOLEM:
        return 40;
    case PM_CLAY_GOLEM:
        return 70;
    case PM_STONE_GOLEM:
        return 100;
    case PM_GLASS_GOLEM:
        return 80;
    case PM_IRON_GOLEM:
        return 120;
    default:
        return 0;
    }
}

/*
 *      Alignment vs. yours determines monster's attitude to you.
 *      (Some "animal" types are co-aligned, but also hungry.)
 */
export function /* boolean */
peace_minded(ptr)
{
    let mal = ptr.maligntyp, ual = u.ualign.type;

    if (always_peaceful(ptr))
        return TRUE;
    if (always_hostile(ptr))
        return FALSE;
    if (ptr.msound == MS_LEADER || ptr.msound == MS_GUARDIAN)
        return TRUE;
    if (ptr.msound == MS_NEMESIS)
        return FALSE;
    if (ptr == mons[PM_ERINYS])
        return +!u.ualign.abuse;

    if (race_peaceful(ptr))
        return TRUE;
    if (race_hostile(ptr))
        return FALSE;

    /* the monster is hostile if its alignment is different from the
     * player's */
    if (sgn(mal) != sgn(ual))
        return FALSE;

    /* Negative monster hostile to player with Amulet. */
    if (mal < A_NEUTRAL && u.uhave.amulet)
        return FALSE;

    /* minions are hostile to players that have strayed at all */
    if (is_minion(ptr))
        return (+(u.ualign.record >= 0));

    /* Last case:  a chance of a co-aligned monster being
     * hostile.  This chance is greater if the player has strayed
     * (u.ualign.record negative) or the monster is not strongly aligned.
     */
    return (+(!!rn2(16 + (u.ualign.record < -15 ? -15
                                                        : u.ualign.record))
                      && !!rn2(2 + abs(mal))));
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
export function /* void */
set_malign(mtmp)
{
    let mal = mtmp.data.maligntyp;
    let coaligned;

    if (mtmp.ispriest || mtmp.isminion) {
        /* some monsters have individual alignments; check them */
        if (mtmp.ispriest && EPRI(mtmp))
            mal = EPRI(mtmp).shralign;
        else if (mtmp.isminion && EMIN(mtmp))
            mal = EMIN(mtmp).min_align;
        /* unless alignment is none, set mal to -5,0,5 */
        /* (see align.h for valid aligntyp values)     */
        if (mal != A_NONE)
            mal *= 5;
    }

    coaligned = (+(sgn(mal) == sgn(u.ualign.type)));
    if (mtmp.data.msound == MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal == A_NONE) {
        if (mtmp.mpeaceful)
            mtmp.malign = 0;
        else
            mtmp.malign = 20; /* really hostile */
    } else if (always_peaceful(mtmp.data)) {
        let absmal = abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * max(5, absmal);
        else
            mtmp.malign = 3 * max(5, absmal); /* renegade */
    } else if (always_hostile(mtmp.data)) {
        let absmal = abs(mal);
        if (coaligned)
            mtmp.malign = 0;
        else
            mtmp.malign = max(5, absmal);
    } else if (coaligned) {
        let absmal = abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * max(3, absmal);
        else /* renegade */
            mtmp.malign = max(3, absmal);
    } else /* not coaligned and therefore hostile */
        mtmp.malign = abs(mal);
}

/* allocate a new mcorpsenm field for a monster; only need mextra itself */
export function /* void */
newmcorpsenm(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    ((mtmp).mextra.mcorpsenm) = NON_PM; /* not initialized yet */
}

/* release monster's mcorpsenm field; basically a no-op */
export function /* void */
freemcorpsenm(mtmp)
{
    if (has_mcorpsenm(mtmp))
        ((mtmp).mextra.mcorpsenm) = NON_PM;
}

const syms = static_array("syms", char, null, [
    MAXOCLASSES,  MAXOCLASSES,     RING_CLASS,   WAND_CLASS,   WEAPON_CLASS,
    FOOD_CLASS,   COIN_CLASS,      SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS,
    AMULET_CLASS, TOOL_CLASS,      ROCK_CLASS,   GEM_CLASS,    SPBOOK_CLASS,
    S_MIMIC_DEF,  S_MIMIC_DEF,
]);

export function /* void */
set_mimic_sym(mtmp)
{ let $goto = null; var furnsyms = static_array("set_mimic_sym.furnsyms", int, null, [ S_upstair, S_upstair, S_dnstair, S_dnstair, S_altar, S_grave, S_throne, S_sink ]);
    var typ, roomno, rt;
    var appear, ap_type;
    var s_sym;
    var otmp;
    var mx, my;

    if (!mtmp || Protection_from_shape_changers())
        return;
    mx = mtmp.mx;
    my = mtmp.my;
    typ = levl()[mx][my].typ;
    /* only valid for INSIDE of room */
    roomno = levl()[mx][my].roomno - ROOMOFFSET;
    if (roomno >= 0)
        rt = svr.rooms[roomno].rtype;




    else
        rt = 0; /* roomno < 0 case for GCC_WARN */

    $goto_assign_sym: for (;;) { switch ($goto) { default: case "assign_sym": if (!$goto && (OBJ_AT(mx, my))) {
        ap_type = M_AP_OBJECT;
        appear = unsigned(svl.level.objects[mx][my].otyp);
    } else if (!$goto && (IS_DOOR(typ) || IS_WALL(typ) || typ == SDOOR || typ == SCORR)) {
        ap_type = M_AP_FURNITURE;
        /*
         *  If there is a wall to the left that connects to this
         *  location, then the mimic mimics a horizontal closed door.
         *  This does not allow doors to be in corners of rooms.
         *  Since rogue has no closed doors, mimic a wall there
         *  (yes, mimics can end up on this level by various means).
         */
        if (mx != 0 && (levl()[mx - 1][my].typ == HWALL
                        || levl()[mx - 1][my].typ == TLCORNER
                        || levl()[mx - 1][my].typ == TRWALL
                        || levl()[mx - 1][my].typ == BLCORNER
                        || levl()[mx - 1][my].typ == TDWALL
                        || levl()[mx - 1][my].typ == CROSSWALL
                        || levl()[mx - 1][my].typ == TUWALL))
            appear = Is_rogue_level(u.uz) ? S_hwall : S_hcdoor;
        else
            appear = Is_rogue_level(u.uz) ? S_vwall : S_vcdoor;
    } else if (!$goto && (svl.level.flags.is_maze_lev
               && !(In_mines(u.uz) && in_town(u.ux, u.uy))
               && !In_sokoban(u.uz) && rn2(2))) {
        ap_type = M_AP_OBJECT;
        appear = STATUE;
    } else if (!$goto && (roomno < 0 && !t_at(mx, my))) {
        ap_type = M_AP_OBJECT;
        appear = BOULDER;
    } else if (!$goto && (rt == ZOO || rt == VAULT)) {
        ap_type = M_AP_OBJECT;
        appear = GOLD_PIECE;
    } else if (!$goto && (rt == DELPHI)) {
        if (rn2(2)) {
            ap_type = M_AP_OBJECT;
            appear = STATUE;
        } else {
            ap_type = M_AP_FURNITURE;
            appear = S_fountain;
        }
    } else if (!$goto && (rt == TEMPLE)) {
        ap_type = M_AP_FURNITURE;
        appear = S_altar;

    /*
     * We won't bother with beehives, morgues, barracks, throne rooms
     * since they shouldn't contain too many mimics anyway...
     */

    } else if (!$goto && (rt >= SHOPBASE)) {
        if (rn2(10) >= depth(u.uz)) {
            s_sym = S_MIMIC_DEF; /* -> STRANGE_OBJECT */
            { $goto = "assign_sym"; continue $goto_assign_sym; }
        }
        s_sym = get_shop_item(rt - SHOPBASE);
        if (s_sym < 0) {
            ap_type = M_AP_OBJECT;
            appear = unsigned(-s_sym);
        } else if (rt == FODDERSHOP && s_sym > MAXOCLASSES) {
            /* health food store usually generates pseudo-class
               VEGETARIAN_CLASS which is MAXOCLASSES+1; we don't bother
               trying to select among all possible vegetarian food items */
            ap_type = M_AP_OBJECT;
            appear = rn2(2) ? LUMP_OF_ROYAL_JELLY : SLIME_MOLD;
        } else {
            if (s_sym == RANDOM_CLASS || s_sym >= MAXOCLASSES)
                s_sym = chars[syms + (rn2((Math.trunc((static_sizeof("syms") / sizeof(char)))) - 2) + 2)];
            { $goto = "assign_sym"; continue $goto_assign_sym; }
        }
    } else {
        switch ($goto) { default: s_sym = chars[syms + rn2((Math.trunc((static_sizeof("syms") / sizeof(char)))))];
 case "assign_sym": $goto = null;
        if (s_sym == MAXOCLASSES) {
            




            ap_type = M_AP_FURNITURE;
            appear = unsigned(ROLL_FROM(furnsyms));
        } else {
            ap_type = M_AP_OBJECT;
            if (s_sym == S_MIMIC_DEF) {
                appear = STRANGE_OBJECT;
            } else if (s_sym == COIN_CLASS) {
                appear = GOLD_PIECE;
            } else {
                otmp = mkobj(char(s_sym), FALSE);
                appear = unsigned(otmp.otyp);
                /* make sure container contents are free'ed */
                obfree(otmp, null);
            }
        } }
    } } break; }
    mtmp.m_ap_type = uchar(ap_type);
    mtmp.mappearance = appear;
    /* when appearing as an object based on a monster type, pick a shape */
    if (ap_type == M_AP_OBJECT
        && (appear == STATUE || appear == FIGURINE
            || appear == CORPSE || appear == EGG || appear == TIN)) {
        var mndx = rndmonnum(),
            nocorpse_ndx = +((svm.mvitals[mndx].mvflags & G_NOCORPSE) != 0);

        if (appear == CORPSE && nocorpse_ndx)
            mndx = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        else if ((appear == EGG && !can_be_hatched(mndx))
                 || (appear == TIN && nocorpse_ndx))
            mndx = NON_PM; /* revert to generic egg or empty tin */

        newmcorpsenm(mtmp);
        ((mtmp).mextra.mcorpsenm) = mndx;
    } else if (ap_type == M_AP_OBJECT && appear == SLIME_MOLD) {
        newmcorpsenm(mtmp);
        ((mtmp).mextra.mcorpsenm) = svc.context.current_fruit;
        /* if no objects of this fruit type have been created yet,
           context.current_fruit is available for re-use when the player
           assigns a new fruit name; override that--having a mimic as the
           current_fruit is equivalent to creating an instance of that
           fruit (no-op if a fruit of this type has actually been made) */
        flags.made_fruit = TRUE;
    } else if (ap_type == M_AP_FURNITURE && appear == S_altar) {
        var algn = rn2(3) - 1; /* -1 (A_Cha) or 0 (A_Neu) or +1 (A_Law) */

        newmcorpsenm(mtmp);
        ((mtmp).mextra.mcorpsenm) = int((Inhell() && rn2(3)) ? AM_NONE : Align2amask(algn));
    } else if (has_mcorpsenm(mtmp)) {
        /* don't retain stale value from a previously mimicked shape */
        ((mtmp).mextra.mcorpsenm) = NON_PM;
    }

    if (does_block(mx, my, levl()[mx][my]))
        block_point(mx, my);
}

/* release monster from bag of tricks; return number of monsters created */
export function /* int */
bagotricks(
    bag,
    tipping,
    seencount)  /* secondary output */
{
    let moncount = 0;

    if (!bag || bag.otyp != BAG_OF_TRICKS) {
        impossible(_("bad bag o' tricks"));
    } else if (bag.spe < 1) {
        /* if tipping known empty bag, give normal empty container message */
        pline1((tipping && bag.cknown) ? _("It's empty.") : nothing_happens());
        /* now known to be empty if sufficiently discovered */
        if (bag.dknown && objects[bag.otyp].oc_name_known) {
            bag.cknown = 1;
            update_inventory(); /* for perm_invent */
        }
    } else {
        let mtmp;
        let creatcnt = 1, seecount = 0;

        consume_obj_charge(bag, +!tipping);

        if (!rn2(23))
            creatcnt += rnd(7);
        do {
            mtmp = makemon(null, u.ux, u.uy, NO_MM_FLAGS);
            if (mtmp) {
                ++moncount;
                if ((canseemon(mtmp) && (M_AP_TYPE(mtmp) == M_AP_NOTHING
                                         || M_AP_TYPE(mtmp) == M_AP_MONSTER))
                    || sensemon(mtmp))
                    ++seecount;
            }
        } while (--creatcnt > 0);
        if (seecount) {
            if (seencount)
                seencount[0] += seecount;
            if (bag.dknown) {
                makeknown(BAG_OF_TRICKS);
                update_inventory(); /* for perm_invent */
            }
        } else if (!tipping) {
            pline1(!moncount ? nothing_happens() : nothing_seems_to_happen());
        }
    }
    return moncount;
}

/* create some or all remaining erinyes around the player */
export function /* void */
summon_furies(limit) /* number to create, or 0 to create until extinct */
{
    let i = 0;
    while (mk_gen_ok(PM_ERINYS, G_GONE, 0) && (i < limit || !limit)) {
        makemon(mons[PM_ERINYS], u.ux, u.uy, MM_ADJACENTOK | MM_NOWAIT);
        i++;
    }
}

/*makemon.c*/
import { AM_CHAOTIC } from "./align.h.js";
import { AM_LAWFUL } from "./align.h.js";
import { AM_NEUTRAL } from "./align.h.js";
import { AM_NONE } from "./align.h.js";
import { A_LAWFUL } from "./align.h.js";
import { A_NEUTRAL } from "./align.h.js";
import { A_NONE } from "./align.h.js";
import { Align2amask } from "./align.h.macros.js";
import { ART_DEMONBANE } from "./artilist.h.js";
import { ART_EXCALIBUR } from "./artilist.h.js";
import { struct_nhcoord } from "./coord.h.js";
import { nothing_happens } from "./decl.h.macros.js";
import { nothing_seems_to_happen } from "./decl.h.macros.js";
import { AMULET_CLASS } from "./defsym.h.js";
import { ARMOR_CLASS } from "./defsym.h.js";
import { COIN_CLASS } from "./defsym.h.js";
import { FOOD_CLASS } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { MAXMCLASSES } from "./defsym.h.js";
import { MAXOCLASSES } from "./defsym.h.js";
import { POTION_CLASS } from "./defsym.h.js";
import { RANDOM_CLASS } from "./defsym.h.js";
import { RING_CLASS } from "./defsym.h.js";
import { ROCK_CLASS } from "./defsym.h.js";
import { SCROLL_CLASS } from "./defsym.h.js";
import { SPBOOK_CLASS } from "./defsym.h.js";
import { S_ANGEL } from "./defsym.h.js";
import { S_BAT } from "./defsym.h.js";
import { S_CENTAUR } from "./defsym.h.js";
import { S_DEMON } from "./defsym.h.js";
import { S_DRAGON } from "./defsym.h.js";
import { S_EEL } from "./defsym.h.js";
import { S_ELEMENTAL } from "./defsym.h.js";
import { S_GIANT } from "./defsym.h.js";
import { S_GNOME } from "./defsym.h.js";
import { S_HUMAN } from "./defsym.h.js";
import { S_HUMANOID } from "./defsym.h.js";
import { S_JABBERWOCK } from "./defsym.h.js";
import { S_KOBOLD } from "./defsym.h.js";
import { S_KOP } from "./defsym.h.js";
import { S_LEPRECHAUN } from "./defsym.h.js";
import { S_LICH } from "./defsym.h.js";
import { S_LIGHT } from "./defsym.h.js";
import { S_LIZARD } from "./defsym.h.js";
import { S_MIMIC } from "./defsym.h.js";
import { S_MIMIC_DEF } from "./defsym.h.js";
import { S_MUMMY } from "./defsym.h.js";
import { S_NYMPH } from "./defsym.h.js";
import { S_OGRE } from "./defsym.h.js";
import { S_ORC } from "./defsym.h.js";
import { S_QUANTMECH } from "./defsym.h.js";
import { S_SNAKE } from "./defsym.h.js";
import { S_SPIDER } from "./defsym.h.js";
import { S_TRAPPER } from "./defsym.h.js";
import { S_TROLL } from "./defsym.h.js";
import { S_UNICORN } from "./defsym.h.js";
import { S_WRAITH } from "./defsym.h.js";
import { S_ZOMBIE } from "./defsym.h.js";
import { S_altar } from "./defsym.h.js";
import { S_dnstair } from "./defsym.h.js";
import { S_fountain } from "./defsym.h.js";
import { S_grave } from "./defsym.h.js";
import { S_hcdoor } from "./defsym.h.js";
import { S_hwall } from "./defsym.h.js";
import { S_sink } from "./defsym.h.js";
import { S_throne } from "./defsym.h.js";
import { S_upstair } from "./defsym.h.js";
import { S_vcdoor } from "./defsym.h.js";
import { S_vwall } from "./defsym.h.js";
import { TOOL_CLASS } from "./defsym.h.js";
import { WAND_CLASS } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { canspotmon } from "./display.h.macros.js";
import { struct_s_level } from "./dungeon.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { In_sokoban } from "./dungeon.h.macros.js";
import { Inhell } from "./dungeon.h.macros.js";
import { Is_airlevel } from "./dungeon.h.macros.js";
import { Is_astralevel } from "./dungeon.h.macros.js";
import { Is_earthlevel } from "./dungeon.h.macros.js";
import { Is_firelevel } from "./dungeon.h.macros.js";
import { Is_knox } from "./dungeon.h.macros.js";
import { Is_rogue_level } from "./dungeon.h.macros.js";
import { Is_stronghold } from "./dungeon.h.macros.js";
import { Is_waterlevel } from "./dungeon.h.macros.js";
import { wizard } from "./flag.h.macros.js";
import { ALIGNWEIGHT } from "./global.h.js";
import { BUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { MAXMONNO } from "./global.h.js";
import { ROWNO } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { BOLT_LIM } from "./hack.h.js";
import { DF_NONE } from "./hack.h.js";
import { GP_AVOID_MONPOS } from "./hack.h.js";
import { GP_CHECKSCARY } from "./hack.h.js";
import { MHID_ALTMON } from "./hack.h.js";
import { MHID_ARTICLE } from "./hack.h.js";
import { MM_ADJACENTOK } from "./hack.h.js";
import { MM_ANGRY } from "./hack.h.js";
import { MM_ASLEEP } from "./hack.h.js";
import { MM_EDOG } from "./hack.h.js";
import { MM_EGD } from "./hack.h.js";
import { MM_EMIN } from "./hack.h.js";
import { MM_EPRI } from "./hack.h.js";
import { MM_ESHK } from "./hack.h.js";
import { MM_FEMALE } from "./hack.h.js";
import { MM_IGNOREWATER } from "./hack.h.js";
import { MM_MALE } from "./hack.h.js";
import { MM_MINVIS } from "./hack.h.js";
import { MM_NOCOUNTBIRTH } from "./hack.h.js";
import { MM_NOEXCLAM } from "./hack.h.js";
import { MM_NOGRP } from "./hack.h.js";
import { MM_NOMSG } from "./hack.h.js";
import { MM_NONAME } from "./hack.h.js";
import { MM_NOTAIL } from "./hack.h.js";
import { MM_NOWAIT } from "./hack.h.js";
import { NO_MINVENT } from "./hack.h.js";
import { NO_MM_FLAGS } from "./hack.h.js";
import { NO_NC_FLAGS } from "./hack.h.js";
import { ONAME_RANDOM } from "./hack.h.js";
import { ARM_BONUS } from "./hack.h.macros.js";
import { ROLL_FROM } from "./hack.h.macros.js";
import { distu } from "./hack.h.macros.js";
import { makeknown } from "./hack.h.macros.js";
import { max } from "./hack.h.macros.js";
import { pline1 } from "./hack.h.macros.js";
import { qsort } from "./hack.h.macros.js";
import { quest_dnum } from "./hack.h.macros.js";
import { rn1 } from "./hack.h.macros.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { debugpline0 } from "./lint.h.macros.js";
import { debugpline1 } from "./lint.h.macros.js";
import { showdebug } from "./lint.h.macros.js";
import { struct_mextra } from "./mextra.h.js";
import { EDOG } from "./mextra.h.macros.js";
import { EMIN } from "./mextra.h.macros.js";
import { EPRI } from "./mextra.h.macros.js";
import { MGIVENNAME } from "./mextra.h.macros.js";
import { has_edog } from "./mextra.h.macros.js";
import { has_emin } from "./mextra.h.macros.js";
import { has_mcorpsenm } from "./mextra.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { DELPHI } from "./mkroom.h.js";
import { FODDERSHOP } from "./mkroom.h.js";
import { ROOMOFFSET } from "./mkroom.h.js";
import { SHOPBASE } from "./mkroom.h.js";
import { TEMPLE } from "./mkroom.h.js";
import { VAULT } from "./mkroom.h.js";
import { ZOO } from "./mkroom.h.js";
import { always_hostile } from "./mondata.h.macros.js";
import { always_peaceful } from "./mondata.h.macros.js";
import { amorphous } from "./mondata.h.macros.js";
import { emits_light } from "./mondata.h.macros.js";
import { extra_nasty } from "./mondata.h.macros.js";
import { humanoid } from "./mondata.h.macros.js";
import { is_armed } from "./mondata.h.macros.js";
import { is_bat } from "./mondata.h.macros.js";
import { is_demon } from "./mondata.h.macros.js";
import { is_domestic } from "./mondata.h.macros.js";
import { is_dprince } from "./mondata.h.macros.js";
import { is_dwarf } from "./mondata.h.macros.js";
import { is_elf } from "./mondata.h.macros.js";
import { is_female } from "./mondata.h.macros.js";
import { is_floater } from "./mondata.h.macros.js";
import { is_flyer } from "./mondata.h.macros.js";
import { is_giant } from "./mondata.h.macros.js";
import { is_golem } from "./mondata.h.macros.js";
import { is_lord } from "./mondata.h.macros.js";
import { is_male } from "./mondata.h.macros.js";
import { is_mercenary } from "./mondata.h.macros.js";
import { is_minion } from "./mondata.h.macros.js";
import { is_mplayer } from "./mondata.h.macros.js";
import { is_ndemon } from "./mondata.h.macros.js";
import { is_neuter } from "./mondata.h.macros.js";
import { is_placeholder } from "./mondata.h.macros.js";
import { is_prince } from "./mondata.h.macros.js";
import { is_rider } from "./mondata.h.macros.js";
import { is_shapeshifter } from "./mondata.h.macros.js";
import { is_swimmer } from "./mondata.h.macros.js";
import { is_unicorn } from "./mondata.h.macros.js";
import { is_whirly } from "./mondata.h.macros.js";
import { likes_gold } from "./mondata.h.macros.js";
import { mindless } from "./mondata.h.macros.js";
import { monsndx } from "./mondata.h.macros.js";
import { monsym } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { nonliving } from "./mondata.h.macros.js";
import { pm_resistance } from "./mondata.h.macros.js";
import { race_hostile } from "./mondata.h.macros.js";
import { race_peaceful } from "./mondata.h.macros.js";
import { strongmonst } from "./mondata.h.macros.js";
import { throws_rocks } from "./mondata.h.macros.js";
import { G_EXTINCT } from "./monflag.h.js";
import { G_FREQ } from "./monflag.h.js";
import { G_GENOD } from "./monflag.h.js";
import { G_GONE } from "./monflag.h.js";
import { G_HELL } from "./monflag.h.js";
import { G_IGNORE } from "./monflag.h.js";
import { G_LGROUP } from "./monflag.h.js";
import { G_NOCORPSE } from "./monflag.h.js";
import { G_NOGEN } from "./monflag.h.js";
import { G_NOHELL } from "./monflag.h.js";
import { G_SGROUP } from "./monflag.h.js";
import { G_UNIQ } from "./monflag.h.js";
import { M3_CLOSE } from "./monflag.h.js";
import { M3_COVETOUS } from "./monflag.h.js";
import { M3_WAITFORU } from "./monflag.h.js";
import { M3_WAITMASK } from "./monflag.h.js";
import { MR_COLD } from "./monflag.h.js";
import { MR_FIRE } from "./monflag.h.js";
import { MS_BRIBE } from "./monflag.h.js";
import { MS_GUARDIAN } from "./monflag.h.js";
import { MS_LEADER } from "./monflag.h.js";
import { MS_NEMESIS } from "./monflag.h.js";
import { MS_PRIEST } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { M_AP_FURNITURE } from "./monst.h.js";
import { M_AP_MONSTER } from "./monst.h.js";
import { M_AP_NOTHING } from "./monst.h.js";
import { M_AP_OBJECT } from "./monst.h.js";
import { M_SEEN_NOTHING } from "./monst.h.js";
import { STRAT_APPEARMSG } from "./monst.h.js";
import { STRAT_CLOSE } from "./monst.h.js";
import { STRAT_WAITFORU } from "./monst.h.js";
import { struct_monst } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { M_AP_TYPE } from "./monst.h.macros.js";
import { is_lminion } from "./monst.h.macros.js";
import { monmax_difficulty } from "./monst.h.macros.js";
import { monmin_difficulty } from "./monst.h.macros.js";
import { montoostrong } from "./monst.h.macros.js";
import { montooweak } from "./monst.h.macros.js";
import { newmonst } from "./monst.h.macros.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_ABBOT } from "./monsters.h.js";
import { PM_ACOLYTE } from "./monsters.h.js";
import { PM_AIR_ELEMENTAL } from "./monsters.h.js";
import { PM_ALIGNED_CLERIC } from "./monsters.h.js";
import { PM_ANGEL } from "./monsters.h.js";
import { PM_APPRENTICE } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_ARCH_LICH } from "./monsters.h.js";
import { PM_ASMODEUS } from "./monsters.h.js";
import { PM_ATTENDANT } from "./monsters.h.js";
import { PM_BALROG } from "./monsters.h.js";
import { PM_BLACK_LIGHT } from "./monsters.h.js";
import { PM_CAPTAIN } from "./monsters.h.js";
import { PM_CHIEFTAIN } from "./monsters.h.js";
import { PM_CLAY_GOLEM } from "./monsters.h.js";
import { PM_CLERIC } from "./monsters.h.js";
import { PM_CROESUS } from "./monsters.h.js";
import { PM_DISPATER } from "./monsters.h.js";
import { PM_EARTH_ELEMENTAL } from "./monsters.h.js";
import { PM_ELF } from "./monsters.h.js";
import { PM_ELVEN_MONARCH } from "./monsters.h.js";
import { PM_ERINYS } from "./monsters.h.js";
import { PM_ETTIN } from "./monsters.h.js";
import { PM_FIRE_ELEMENTAL } from "./monsters.h.js";
import { PM_FLESH_GOLEM } from "./monsters.h.js";
import { PM_FOREST_CENTAUR } from "./monsters.h.js";
import { PM_GHOST } from "./monsters.h.js";
import { PM_GIANT_EEL } from "./monsters.h.js";
import { PM_GLASS_GOLEM } from "./monsters.h.js";
import { PM_GOBLIN } from "./monsters.h.js";
import { PM_GOLD_GOLEM } from "./monsters.h.js";
import { PM_GRAY_DRAGON } from "./monsters.h.js";
import { PM_GUARD } from "./monsters.h.js";
import { PM_GUIDE } from "./monsters.h.js";
import { PM_HIGH_CLERIC } from "./monsters.h.js";
import { PM_HOBBIT } from "./monsters.h.js";
import { PM_HORNED_DEVIL } from "./monsters.h.js";
import { PM_HOUSECAT } from "./monsters.h.js";
import { PM_HUNTER } from "./monsters.h.js";
import { PM_ICE_DEVIL } from "./monsters.h.js";
import { PM_IRON_GOLEM } from "./monsters.h.js";
import { PM_KILLER_BEE } from "./monsters.h.js";
import { PM_LEATHER_GOLEM } from "./monsters.h.js";
import { PM_LIEUTENANT } from "./monsters.h.js";
import { PM_LONG_WORM } from "./monsters.h.js";
import { PM_MAIL_DAEMON } from "./monsters.h.js";
import { PM_MASTER_LICH } from "./monsters.h.js";
import { PM_MINOTAUR } from "./monsters.h.js";
import { PM_MONK } from "./monsters.h.js";
import { PM_MORDOR_ORC } from "./monsters.h.js";
import { PM_NAZGUL } from "./monsters.h.js";
import { PM_NEANDERTHAL } from "./monsters.h.js";
import { PM_NINJA } from "./monsters.h.js";
import { PM_OGRE_LEADER } from "./monsters.h.js";
import { PM_OGRE_TYRANT } from "./monsters.h.js";
import { PM_ORCUS } from "./monsters.h.js";
import { PM_ORC_CAPTAIN } from "./monsters.h.js";
import { PM_ORC_SHAMAN } from "./monsters.h.js";
import { PM_PAGE } from "./monsters.h.js";
import { PM_PAPER_GOLEM } from "./monsters.h.js";
import { PM_PESTILENCE } from "./monsters.h.js";
import { PM_QUANTUM_MECHANIC } from "./monsters.h.js";
import { PM_QUEEN_BEE } from "./monsters.h.js";
import { PM_RAVEN } from "./monsters.h.js";
import { PM_ROPE_GOLEM } from "./monsters.h.js";
import { PM_ROSHI } from "./monsters.h.js";
import { PM_SALAMANDER } from "./monsters.h.js";
import { PM_SERGEANT } from "./monsters.h.js";
import { PM_SHOPKEEPER } from "./monsters.h.js";
import { PM_SOLDIER } from "./monsters.h.js";
import { PM_STALKER } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { PM_STRAW_GOLEM } from "./monsters.h.js";
import { PM_STUDENT } from "./monsters.h.js";
import { PM_THUG } from "./monsters.h.js";
import { PM_URUK_HAI } from "./monsters.h.js";
import { PM_VLAD_THE_IMPALER } from "./monsters.h.js";
import { PM_WARRIOR } from "./monsters.h.js";
import { PM_WATCHMAN } from "./monsters.h.js";
import { PM_WATCH_CAPTAIN } from "./monsters.h.js";
import { PM_WATER_ELEMENTAL } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PM_WIZARD_OF_YENDOR } from "./monsters.h.js";
import { PM_WOOD_GOLEM } from "./monsters.h.js";
import { PM_WUMPUS } from "./monsters.h.js";
import { PM_YEENOGHU } from "./monsters.h.js";
import { SPECIAL_PM } from "./monsters.h.js";
import { is_sword } from "./obj.h.macros.js";
import { u_wield_art } from "./obj.h.macros.js";
import { AKLYS } from "./objects.h.js";
import { ARROW } from "./objects.h.js";
import { ATHAME } from "./objects.h.js";
import { AXE } from "./objects.h.js";
import { BAG_OF_TRICKS } from "./objects.h.js";
import { BANDED_MAIL } from "./objects.h.js";
import { BATTLE_AXE } from "./objects.h.js";
import { BEC_DE_CORBIN } from "./objects.h.js";
import { BELL_OF_OPENING } from "./objects.h.js";
import { BOULDER } from "./objects.h.js";
import { BOW } from "./objects.h.js";
import { BROADSWORD } from "./objects.h.js";
import { BUGLE } from "./objects.h.js";
import { BULLWHIP } from "./objects.h.js";
import { CANDELABRUM_OF_INVOCATION } from "./objects.h.js";
import { CHAIN_MAIL } from "./objects.h.js";
import { CLOAK_OF_MAGIC_RESISTANCE } from "./objects.h.js";
import { CLOAK_OF_PROTECTION } from "./objects.h.js";
import { CLUB } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { CREAM_PIE } from "./objects.h.js";
import { CROSSBOW } from "./objects.h.js";
import { CROSSBOW_BOLT } from "./objects.h.js";
import { CRYSTAL_BALL } from "./objects.h.js";
import { CRYSTAL_PLATE_MAIL } from "./objects.h.js";
import { C_RATION } from "./objects.h.js";
import { DAGGER } from "./objects.h.js";
import { DART } from "./objects.h.js";
import { DENTED_POT } from "./objects.h.js";
import { DILITHIUM_CRYSTAL } from "./objects.h.js";
import { DWARVISH_CLOAK } from "./objects.h.js";
import { DWARVISH_IRON_HELM } from "./objects.h.js";
import { DWARVISH_MATTOCK } from "./objects.h.js";
import { DWARVISH_MITHRIL_COAT } from "./objects.h.js";
import { DWARVISH_ROUNDSHIELD } from "./objects.h.js";
import { DWARVISH_SHORT_SWORD } from "./objects.h.js";
import { DWARVISH_SPEAR } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_ARROW } from "./objects.h.js";
import { ELVEN_BOOTS } from "./objects.h.js";
import { ELVEN_BOW } from "./objects.h.js";
import { ELVEN_BROADSWORD } from "./objects.h.js";
import { ELVEN_CLOAK } from "./objects.h.js";
import { ELVEN_DAGGER } from "./objects.h.js";
import { ELVEN_LEATHER_HELM } from "./objects.h.js";
import { ELVEN_MITHRIL_COAT } from "./objects.h.js";
import { ELVEN_SHIELD } from "./objects.h.js";
import { ELVEN_SHORT_SWORD } from "./objects.h.js";
import { ELVEN_SPEAR } from "./objects.h.js";
import { FIGURINE } from "./objects.h.js";
import { FLAIL } from "./objects.h.js";
import { FLINT } from "./objects.h.js";
import { GLAIVE } from "./objects.h.js";
import { GOLD_PIECE } from "./objects.h.js";
import { HELMET } from "./objects.h.js";
import { HIGH_BOOTS } from "./objects.h.js";
import { IRON_SHOES } from "./objects.h.js";
import { KNIFE } from "./objects.h.js";
import { K_RATION } from "./objects.h.js";
import { LARGE_BOX } from "./objects.h.js";
import { LARGE_SHIELD } from "./objects.h.js";
import { LEATHER_ARMOR } from "./objects.h.js";
import { LEATHER_CLOAK } from "./objects.h.js";
import { LEATHER_GLOVES } from "./objects.h.js";
import { LEATHER_JACKET } from "./objects.h.js";
import { LONG_SWORD } from "./objects.h.js";
import { LOW_BOOTS } from "./objects.h.js";
import { LUCERN_HAMMER } from "./objects.h.js";
import { LUCKSTONE } from "./objects.h.js";
import { LUMP_OF_ROYAL_JELLY } from "./objects.h.js";
import { MACE } from "./objects.h.js";
import { MIRROR } from "./objects.h.js";
import { MUMMY_WRAPPING } from "./objects.h.js";
import { ORCISH_ARROW } from "./objects.h.js";
import { ORCISH_BOW } from "./objects.h.js";
import { ORCISH_CHAIN_MAIL } from "./objects.h.js";
import { ORCISH_CLOAK } from "./objects.h.js";
import { ORCISH_DAGGER } from "./objects.h.js";
import { ORCISH_HELM } from "./objects.h.js";
import { ORCISH_SHIELD } from "./objects.h.js";
import { ORCISH_SHORT_SWORD } from "./objects.h.js";
import { PARTISAN } from "./objects.h.js";
import { PICK_AXE } from "./objects.h.js";
import { PLATE_MAIL } from "./objects.h.js";
import { POT_EXTRA_HEALING } from "./objects.h.js";
import { POT_HEALING } from "./objects.h.js";
import { POT_OBJECT_DETECTION } from "./objects.h.js";
import { POT_SICKNESS } from "./objects.h.js";
import { QUARTERSTAFF } from "./objects.h.js";
import { RANSEUR } from "./objects.h.js";
import { RING_MAIL } from "./objects.h.js";
import { RIN_INVISIBILITY } from "./objects.h.js";
import { ROBE } from "./objects.h.js";
import { ROCK } from "./objects.h.js";
import { RUBBER_HOSE } from "./objects.h.js";
import { SCIMITAR } from "./objects.h.js";
import { SHIELD_OF_REFLECTION } from "./objects.h.js";
import { SHORT_SWORD } from "./objects.h.js";
import { SHURIKEN } from "./objects.h.js";
import { SILVER_MACE } from "./objects.h.js";
import { SILVER_SABER } from "./objects.h.js";
import { SKELETON_KEY } from "./objects.h.js";
import { SLIME_MOLD } from "./objects.h.js";
import { SLING } from "./objects.h.js";
import { SMALL_SHIELD } from "./objects.h.js";
import { SPEAR } from "./objects.h.js";
import { SPETUM } from "./objects.h.js";
import { SPE_BOOK_OF_THE_DEAD } from "./objects.h.js";
import { SPE_DIG } from "./objects.h.js";
import { SPLINT_MAIL } from "./objects.h.js";
import { STATUE } from "./objects.h.js";
import { STILETTO } from "./objects.h.js";
import { STRANGE_OBJECT } from "./objects.h.js";
import { STUDDED_LEATHER_ARMOR } from "./objects.h.js";
import { TALLOW_CANDLE } from "./objects.h.js";
import { TIN } from "./objects.h.js";
import { TIN_WHISTLE } from "./objects.h.js";
import { TRIDENT } from "./objects.h.js";
import { TWO_HANDED_SWORD } from "./objects.h.js";
import { URUK_HAI_SHIELD } from "./objects.h.js";
import { WAN_COLD } from "./objects.h.js";
import { WAN_DEATH } from "./objects.h.js";
import { WAN_DIGGING } from "./objects.h.js";
import { WAN_FIRE } from "./objects.h.js";
import { WAN_MAGIC_MISSILE } from "./objects.h.js";
import { WAN_NOTHING } from "./objects.h.js";
import { WAN_STRIKING } from "./objects.h.js";
import { WAX_CANDLE } from "./objects.h.js";
import { W_SADDLE } from "./prop.h.js";
import { BLCORNER } from "./rm.h.js";
import { CROSSWALL } from "./rm.h.js";
import { HWALL } from "./rm.h.js";
import { SCORR } from "./rm.h.js";
import { SDOOR } from "./rm.h.js";
import { TDWALL } from "./rm.h.js";
import { TLCORNER } from "./rm.h.js";
import { TRWALL } from "./rm.h.js";
import { TUWALL } from "./rm.h.js";
import { IS_DOOR } from "./rm.h.macros.js";
import { IS_WALL } from "./rm.h.macros.js";
import { MON_AT } from "./rm.h.macros.js";
import { OBJ_AT } from "./rm.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { P_POLEARMS } from "./skills.h.js";
import { ROT_CORPSE } from "./timeout.h.js";
import { ALL_TRAPS } from "./trap.h.js";
import { HOLE } from "./trap.h.js";
import { PIT } from "./trap.h.js";
import { TRAPDOOR } from "./trap.h.js";
import { LS_MONSTER } from "./vision.h.js";
import { cansee } from "./vision.h.macros.js";
import { raw_print } from "./winprocs.h.macros.js";
import { Race_if } from "./you.h.macros.js";
import { Role_if } from "./you.h.macros.js";
import { mhe } from "./you.h.macros.js";
import { next2u } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { Protection_from_shape_changers } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { schar } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { uchar } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { and64 } from "../rt/int64.js";
import { or64 } from "../rt/int64.js";
import { or64u } from "../rt/int64.js";
import { abs } from "../rt/libc.js";
import { assert } from "../rt/libc.js";
import { isupper } from "../rt/libc.js";
import { memset } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_sizeof } from "../rt/locals.js";
import { static_struct } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_to } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { isok } from "./cmd.js";
import { cg } from "./decl.js";
import { flags } from "./decl.js";
import { gi } from "./decl.js";
import { gm } from "./decl.js";
import { go } from "./decl.js";
import { gs } from "./decl.js";
import { iflags } from "./decl.js";
import { svc } from "./decl.js";
import { svd } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { svq } from "./decl.js";
import { svr } from "./decl.js";
import { u } from "./decl.js";
import { canseemon } from "./display.js";
import { newsym } from "./display.js";
import { sensemon } from "./display.js";
import { Amonnam } from "./do_name.js";
import { Mgender } from "./do_name.js";
import { YMonnam } from "./do_name.js";
import { christen_monst } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { oname } from "./do_name.js";
import { pmname } from "./do_name.js";
import { rndghostname } from "./do_name.js";
import { newedog } from "./dog.js";
import { tamedog } from "./dog.js";
import { deliver_obj_to_mon } from "./dokick.js";
import { def_monsyms } from "./drawing.js";
import { In_V_tower } from "./dungeon.js";
import { In_hell } from "./dungeon.js";
import { In_mines } from "./dungeon.js";
import { In_quest } from "./dungeon.js";
import { Is_special } from "./dungeon.js";
import { depth } from "./dungeon.js";
import { level_difficulty } from "./dungeon.js";
import { monsdump } from "./earlyarg.js";
import { in_town } from "./hack.js";
import { monst_to_any } from "./hack.js";
import { obj_to_any } from "./hack.js";
import { sgn } from "./hacklib.js";
import { upstart } from "./hacklib.js";
import { consume_obj_charge } from "./invent.js";
import { update_inventory } from "./invent.js";
import { new_light_source } from "./light.js";
import { newemin } from "./minion.js";
import { add_to_container } from "./mkobj.js";
import { add_to_minv } from "./mkobj.js";
import { bless } from "./mkobj.js";
import { curse } from "./mkobj.js";
import { discard_minvent } from "./mkobj.js";
import { mkobj } from "./mkobj.js";
import { mkobj_at } from "./mkobj.js";
import { mksobj } from "./mkobj.js";
import { next_ident } from "./mkobj.js";
import { rndmonnum } from "./mkobj.js";
import { set_corpsenm } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { can_be_hatched } from "./mon.js";
import { hideunder } from "./mon.js";
import { mondied } from "./mon.js";
import { mongone } from "./mon.js";
import { newcham } from "./mon.js";
import { pm_to_cham } from "./mon.js";
import { little_to_big } from "./mondata.js";
import { mon_learns_traps } from "./mondata.js";
import { set_mon_data } from "./mondata.js";
import { dochugw } from "./monmove.js";
import { mon_track_clear } from "./monmove.js";
import { set_apparxy } from "./monmove.js";
import { mons } from "./monst.js";
import { monst_globals_init } from "./monst.js";
import { rnd_defensive_item } from "./muse.js";
import { rnd_misc_item } from "./muse.js";
import { rnd_offensive_item } from "./muse.js";
import { objects } from "./objects.js";
import { an } from "./objnam.js";
import { makeplural } from "./objnam.js";
import { rnd_class } from "./objnam.js";
import { vtense } from "./objnam.js";
import { mhidden_description } from "./pager.js";
import { Norep } from "./pline.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { pline_mon } from "./pline.js";
import { raw_printf } from "./pline.js";
import { set_msg_xy } from "./pline.js";
import { newepri } from "./priest.js";
import { qt_montype } from "./questpgr.js";
import { quest_info } from "./questpgr.js";
import { create_particular } from "./read.js";
import { d } from "./rnd.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { freedynamicdata } from "./save.js";
import { obfree } from "./shk.js";
import { get_shop_item } from "./shknam.js";
import { neweshk } from "./shknam.js";
import { shkname } from "./shknam.js";
import { findgold } from "./steal.js";
import { mpickobj } from "./steal.js";
import { can_saddle } from "./steed.js";
import { place_monster } from "./steed.js";
import { put_saddle_on_mon } from "./steed.js";
import { enexto } from "./teleport.js";
import { enexto_core } from "./teleport.js";
import { enexto_gpflags } from "./teleport.js";
import { goodpos } from "./teleport.js";
import { begin_burn } from "./timeout.js";
import { stop_timer } from "./timeout.js";
import { t_at } from "./trap.js";
import { newegd } from "./vault.js";
import { block_point } from "./vision.js";
import { does_block } from "./vision.js";
import { count_wsegs } from "./worm.js";
import { get_wormno } from "./worm.js";
import { initworm } from "./worm.js";
import { place_worm_tail_randomly } from "./worm.js";
import { m_dowear } from "./worn.js";
import { mon_adjust_speed } from "./worn.js";
import { mon_set_minvis } from "./worn.js";
import { which_armor } from "./worn.js";
const __FILE__ = "makemon.c";
