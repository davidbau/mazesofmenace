/* NetHack 5.0	wizard.c	$NHDT-Date: 1741407262 2025/03/07 20:14:22 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.116 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2016. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* wizard code - inspired by rogue code from Merlyn Leroy (digi-g!brian) */
/*             - heavily modified to give the wiz balls.  (genat!mike)   */
/*             - dewimped and given some maledictions. -3. */
/*             - generalized for 3.1 (mike@bullns.on01.bull.ca) */




/* other_mon_has_arti() won't blow up if passed a NULL monst,
 * but its caller target_on() passes it a nonnull monst;
 * it may return a NULL monst pointer */

  /* might return NULL obj pointer */




/* adding more neutral creatures will tend to reduce the number of monsters
   summoned by nasty(); adding more lawful creatures will reduce the number
   of monsters summoned by lawfuls; adding more chaotic creatures will reduce
   the number of monsters summoned by chaotics; prior to 3.6.1, there were
   only four lawful candidates, so lawful summoners tended to summon more
   (trying to get lawful or neutral but obtaining chaotic instead) than
   their chaotic counterparts */
export const nasties = [
    /* neutral */
    'PM_COCKATRICE', 'PM_ETTIN', 'PM_STALKER', 'PM_MINOTAUR',
    'PM_OWLBEAR', 'PM_PURPLE_WORM', 'PM_XAN', 'PM_UMBER_HULK',
    'PM_XORN', 'PM_ZRUTY', 'PM_LEOCROTTA', 'PM_BALUCHITHERIUM',
    'PM_CARNIVOROUS_APE', 'PM_FIRE_ELEMENTAL', 'PM_JABBERWOCK',
    'PM_IRON_GOLEM', 'PM_OCHRE_JELLY', 'PM_GREEN_SLIME',
    'PM_DISPLACER_BEAST', 'PM_GENETIC_ENGINEER',
    /* chaotic */
    'PM_BLACK_DRAGON', 'PM_RED_DRAGON', 'PM_ARCH_LICH', 'PM_VAMPIRE_LEADER',
    'PM_MASTER_MIND_FLAYER', 'PM_DISENCHANTER', 'PM_WINGED_GARGOYLE',
    'PM_STORM_GIANT', 'PM_OLOG_HAI', 'PM_ELF_NOBLE', 'PM_ELVEN_MONARCH',
    'PM_OGRE_TYRANT', 'PM_CAPTAIN', 'PM_GREMLIN',
    /* lawful */
    'PM_SILVER_DRAGON', 'PM_ORANGE_DRAGON', 'PM_GREEN_DRAGON',
    'PM_YELLOW_DRAGON', 'PM_GUARDIAN_NAGA', 'PM_FIRE_GIANT',
    'PM_ALEAX', 'PM_COUATL', 'PM_HORNED_DEVIL', 'PM_BARBED_DEVIL',
    /* (Archons, titans, ki-rin, and golden nagas are suitably nasty, but
       they're summoners so would aggravate excessive summoning) */
];

export const wizapp = [
    'PM_HUMAN',      'PM_WATER_DEMON',  'PM_VAMPIRE',       'PM_RED_DRAGON',
    'PM_TROLL',      'PM_UMBER_HULK',   'PM_XORN',          'PM_XAN',
    'PM_COCKATRICE', 'PM_FLOATING_EYE', 'PM_GUARDIAN_NAGA', 'PM_TRAPPER',
];

/* If you've found the Amulet, make the Wizard appear after some time */
/* Also, give hints about portal locations, if amulet is worn/wielded -dlc */
export function amulet()
{
    let mtmp;
    let ttmp;
    let amu;

/* caller takes care of this check */
    if ((((amu = C.uamul) != 0 && amu.otyp == C.AMULET_OF_YENDOR)
         || ((amu = C.uwep) != 0 && amu.otyp == C.AMULET_OF_YENDOR))
        && !C.rn2(15, 73, "amulet")) {
        for (ttmp = C.gf.ftrap; ttmp; ttmp = ttmp.ntrap) {
            if (ttmp.ttyp == C.MAGIC_PORTAL) {
                let du = C.distu(ttmp.tx, ttmp.ty);
                if (du <= 9)
                    C.pline("%s hot!", C.Tobjnam(amu, "feel"));
                else if (du <= 64)
                    C.pline("%s very warm.", C.Tobjnam(amu, "feel"));
                else if (du <= 144)
                    C.pline("%s warm.", C.Tobjnam(amu, "feel"));
                /* else, the amulet feels normal */
                break;
            }
        }
    }

    if (!C.svc.context.no_of_wizards)
        return;
    /* find Wizard, and wake him if necessary */
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.iswiz && mtmp.msleeping && !C.rn2(40, 95, "amulet")) {
            mtmp.msleeping = 0;
            if (!C.m_next2u(mtmp))
                C.You(
      "get the creepy feeling that somebody noticed your taking the Amulet.");
            return;
        }
    }
}

export function mon_has_amulet(mtmp)
{
    let otmp;

    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp == C.AMULET_OF_YENDOR)
            return 1;
    return 0;
}

export function mon_has_special(mtmp)
{
    let otmp;

    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp == C.AMULET_OF_YENDOR
            || C.any_quest_artifact(otmp)
            || otmp.otyp == C.BELL_OF_OPENING
            || otmp.otyp == C.CANDELABRUM_OF_INVOCATION
            || otmp.otyp == C.SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}

/*
 *      New for 3.1  Strategy / Tactics for the wiz, as well as other
 *      monsters that are "after" something (defined via mflag3).
 *
 *      The strategy section decides *what* the monster is going
 *      to attempt, the tactics section implements the decision.
 */

// #define C.M_Wants(mask) (mtmp.data.mflags3 & (mask))

export function which_arti(mask)
{
    mask = C.int(mask);
    switch (mask) {
    case C.M3_WANTSAMUL:
        return C.AMULET_OF_YENDOR;
    case C.M3_WANTSBELL:
        return C.BELL_OF_OPENING;
    case C.M3_WANTSCAND:
        return C.CANDELABRUM_OF_INVOCATION;
    case C.M3_WANTSBOOK:
        return C.SPE_BOOK_OF_THE_DEAD;
    default:
        break; /* 0 signifies quest artifact */
    }
    return 0;
}

/*
 *      If "otyp" is zero, it triggers a check for the quest_artifact,
 *      since bell, book, candle, and amulet are all objects, not really
 *      artifacts right now.  [MRS]
 */
export function mon_has_arti(mtmp, otyp)
{
    otyp = C.short(otyp);
    let otmp;

    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if (otmp.otyp == otyp)
                return 1;
        } else if (C.any_quest_artifact(otmp))
            return 1;
    }
    return 0;
}

/*
 * Returns some monster other than mtmp that
 * has artifact, or NULL monst pointer.
 */
export function other_mon_has_arti(mtmp, otyp)
{
    otyp = C.short(otyp);
    let mtmp2;

    for (mtmp2 = C.fmon; mtmp2; mtmp2 = mtmp2.nmon)
        /* no need for !DEADMONSTER check here since they have no inventory */
        if (!C.samePtr(mtmp2, mtmp))
            if (mon_has_arti(mtmp2, otyp))
                return mtmp2;

    return 0;
}

/*
 * Returns obj of type specified if there is one
 * on the ground, otherwise returns NULL obj pointer.
 */
export function on_ground(otyp)
{
    otyp = C.short(otyp);
    let otmp;

    for (otmp = C.fobj; otmp; otmp = otmp.nobj)
        if (otyp) {
            if (otmp.otyp == otyp)
                return otmp;
        } else if (C.any_quest_artifact(otmp))
            return otmp;
    return 0;
}

export function you_have(mask)
{
    mask = C.int(mask);
    switch (mask) {
    case C.M3_WANTSAMUL:
        return C.u.uhave.amulet;
    case C.M3_WANTSBELL:
        return C.u.uhave.bell;
    case C.M3_WANTSCAND:
        return C.u.uhave.menorah;
    case C.M3_WANTSBOOK:
        return C.u.uhave.book;
    case C.M3_WANTSARTI:
        return C.u.uhave.questart;
    default:
        break;
    }
    return 0;
}

export function target_on(mask, mtmp)
{
    mask = C.int(mask);
    let otyp;
    let otmp;
    let mtmp2;

    if (!(mtmp.data.mflags3 & mask))
        return C.ulong(C.STRAT_NONE);

    otyp = which_arti(mask);
    if (!mon_has_arti(mtmp, otyp)) {
        if (you_have(mask)) {
            mtmp.mgoal.x = C.u.ux;
            mtmp.mgoal.y = C.u.uy;
            return (C.STRAT_PLAYER | C.ulong(mask));
        } else if ((otmp = on_ground(otyp))) {
            mtmp.mgoal.x = otmp.ox;
            mtmp.mgoal.y = otmp.oy;
            return (C.STRAT_GROUND | C.ulong(mask));
        } else if ((mtmp2 = other_mon_has_arti(mtmp, otyp)) != 0
                 /* when seeking the Amulet, avoid targeting the Wizard
                    or temple priests (to protect Moloch's high priest) */
                 && (otyp != C.AMULET_OF_YENDOR
                     || (!mtmp2.iswiz && !C.inhistemple(mtmp2)))) {
            mtmp.mgoal.x = mtmp2.mx;
            mtmp.mgoal.y = mtmp2.my;
            return (C.STRAT_MONSTR | C.ulong(mask));
        }
    }
    mtmp.mgoal.x = mtmp.mgoal.y = 0;
    return C.ulong(C.STRAT_NONE);
}

export function strategy(mtmp)
{
    let strat, dstrat;

    if (!C.is_covetous(mtmp.data)
        /* perhaps a shopkeeper has been polymorphed into a master
           lich; we don't want it teleporting to the stairs to heal
           because that will leave its shop untended */
        || (mtmp.isshk && C.inhishop(mtmp))
        /* likewise for temple priests */
        || (mtmp.ispriest && C.inhistemple(mtmp)))
        return C.ulong(C.STRAT_NONE);

    switch (C.int(Math.trunc(C.int(mtmp.mhp * 3) / mtmp.mhpmax))) { /* 0-3 */

    default:
    case 0: /* panic time - mtmp is almost snuffed */
        return C.ulong(C.STRAT_HEAL);

    case 1: /* the wiz is less cautious */
        if (!C.samePtr(mtmp.data, C.mons[C.PM_WIZARD_OF_YENDOR]))
            return C.ulong(C.STRAT_HEAL);
        // C.FALLTHROUGH;
        /* FALLTHRU */
    case 2:
        dstrat = C.STRAT_HEAL;
        break;

    case 3:
        dstrat = C.STRAT_NONE;
        break;
    }

    if (C.svc.context.made_amulet)
        if ((strat = target_on(C.M3_WANTSAMUL, mtmp)) != C.STRAT_NONE)
            return strat;

    if (C.u.uevent.invoked) { /* priorities change once gate opened */
        if ((strat = target_on(C.M3_WANTSARTI, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSBOOK, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSBELL, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSCAND, mtmp)) != C.STRAT_NONE)
            return strat;
    } else {
        if ((strat = target_on(C.M3_WANTSBOOK, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSBELL, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSCAND, mtmp)) != C.STRAT_NONE)
            return strat;
        if ((strat = target_on(C.M3_WANTSARTI, mtmp)) != C.STRAT_NONE)
            return strat;
    }
    return dstrat;
}

/* pick a destination for a covetous monster to flee to so that it can
   heal or for guardians (Kops) to congregate at to block hero's progress */
export function choose_stairs(sx, sy, dir)
/* output; left as-is if no spot found */
/* True: forward, False: backtrack (usually up) */
{
    dir = C.boolean(dir);
    let stway;
    let stdir = C.builds_up(C.u.uz) ? dir : !dir;

    /* look for stairs in direction 'stdir' (True: up, False: down) */
    stway = C.stairway_find_type_dir(0, stdir);
    if (!stway) {
        /* no stairs; look for ladder it that direction */
        stway = C.stairway_find_type_dir(1, stdir);
        if (!stway) {
            /* no ladder either; look for branch stairs or ladder in any
               direction */
            for (stway = C.gs.stairs; stway; stway = stway.next)
                if (stway.tolev.dnum != C.u.uz.dnum)
                    break;
            /* if no branch stairs/ladder, check for regular stairs in
               opposite direction, then for regular ladder if necessary */
            if (!stway) {
                stway = C.stairway_find_type_dir(0, !stdir);
                if (!stway)
                    stway = C.stairway_find_type_dir(1, !stdir);
            }
        }
        /* [note: 'stway' could still be Null if the only access to this
           level is via magic portal] */
    }

    if (stway)
        sx.value = stway.sx, sy.value = stway.sy;
}



export function tactics(mtmp)
{
    let strat = strategy(mtmp);
    let sx = C.coordxyLocal(), sy = C.coordxyLocal(), mx, my;
    sx.value = sy.value = 0;

    mtmp.mstrategy =
        (mtmp.mstrategy & (C.STRAT_WAITMASK | C.STRAT_APPEARMSG)) | strat;

    switch (strat) {
    case C.STRAT_HEAL: /* hide and recover */
        mx = mtmp.mx, my = mtmp.my;

        if (C.u.uswallow && C.samePtr(C.u.ustuck, mtmp))
            C.expels(mtmp, mtmp.data, 1);

        /* if wounded, hole up on or near the stairs (to block them) */
        choose_stairs(sx, sy, (mtmp.m_id % 2));
        mtmp.mavenge = 1; /* covetous monsters attack while fleeing */
        if (C.In_W_tower(mx, my, C.u.uz)
            || (mtmp.iswiz && !sx.value && !mon_has_amulet(mtmp))) {
            if (!C.noteleport_level(mtmp) &&
                !C.rn2(C.int(3 + Math.trunc(mtmp.mhp / 10)), 390, "tactics"))
                C.rloc(mtmp, C.RLOC_MSG);
        } else if (sx.value && (mx != sx.value || my != sy.value)) {
            if (!C.noteleport_level(mtmp) &&
                !C.mnearto(mtmp, sx.value, sy.value, 1, C.RLOC_MSG)) {
                /* couldn't move to the target spot for some reason,
                   so stay where we are (don't actually need rloc_to()
                   because mtmp is still on the map at <mx,my>... */
                C.rloc_to(mtmp, mx, my);
                return 0;
            }
            mx = mtmp.mx, my = mtmp.my; /* update cached location */
        }
        /* if you're not around, cast healing spells */
        if (C.distu(mx, my) > (C.BOLT_LIM * C.BOLT_LIM))
            if (mtmp.mhp <= mtmp.mhpmax - 8) {
                C.healmon(mtmp, C.rnd(8, 406, "tactics"), 0);
                return 1;
            }
        // C.FALLTHROUGH;
        /*FALLTHRU*/

    case C.STRAT_NONE: /* harass */
        if (!C.noteleport_level(mtmp) && !C.rn2(!mtmp.mflee ? 5 : 33, 413, "tactics"))
            C.mnexto(mtmp, C.RLOC_MSG);
        return 0;

    default: /* kill, maim, pillage! */
    {
        let where = (strat & C.STRAT_STRATMASK);
        let tx = mtmp.mgoal.x, ty = mtmp.mgoal.y;
        let targ = C.int(strat & C.STRAT_GOAL);
        let otmp;

        if (!targ || !C.isok(tx, ty)) { /* simply wants you to close */
            return 0;
        }
        if (C.noteleport_level(mtmp) && !C.monnear(mtmp, tx, ty))
            return 0;
        if (C.u_at(tx, ty) || where == C.STRAT_PLAYER) {
            /* player is standing on it (or has it) */
            mx = mtmp.mx, my = mtmp.my;
            if (C.noteleport_level(mtmp) ||
                !C.mnearto(mtmp, tx, ty, 0, C.RLOC_MSG))
                C.rloc_to(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
        if (where == C.STRAT_GROUND) {
            if (!C.MON_AT(tx, ty) || (mtmp.mx == tx && mtmp.my == ty)) {
                /* teleport to it and pick it up */
                C.rloc_to(mtmp, tx, ty); /* clean old pos */

                if ((otmp = on_ground(which_arti(targ))) != 0) {
                    if (C.cansee(mtmp.mx, mtmp.my))
                        C.pline("%s picks up %s.", C.Monnam(mtmp),
                              C.distant_name(otmp, C.doname));
                    C.obj_extract_self(otmp);
                    C.mpickobj(mtmp, otmp);
                    return 1;
                } else
                    return 0;
            } else {
                /* a monster is standing on it - cause some trouble */
                if (!C.rn2(5, 453, "tactics") && !C.noteleport_level(mtmp))
                    C.mnexto(mtmp, C.RLOC_MSG);
                return 0;
            }
        } else { /* a monster has it - 'port beside it. */
            mx = mtmp.mx, my = mtmp.my;
            if (!C.noteleport_level(mtmp) &&
                !C.mnearto(mtmp, tx, ty, 0, C.RLOC_MSG))
                C.rloc_to(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
    } /* default case */
    } /* switch */
    /*NOTREACHED*/
    return 0;
}



/* are there any monsters mon could aggravate? */
export function has_aggravatables(mon)
{
    let mtmp;
    let in_w_tower = C.In_W_tower(mon.mx, mon.my, C.u.uz);

    if (in_w_tower != C.In_W_tower(C.u.ux, C.u.uy, C.u.uz))
        return 0;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (in_w_tower != C.In_W_tower(mtmp.mx, mtmp.my, C.u.uz))
            continue;
        if ((mtmp.mstrategy & C.STRAT_WAITFORU) != 0 || C.helpless(mtmp))
            return 1;
    }
    return 0;
}

export function aggravate()
{
    let mtmp;
    let in_w_tower = C.In_W_tower(C.u.ux, C.u.uy, C.u.uz);

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (in_w_tower != C.In_W_tower(mtmp.mx, mtmp.my, C.u.uz))
            continue;
        mtmp.mstrategy &= ~(C.STRAT_WAITFORU | C.STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !C.rn2(5, 506, "aggravate")) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

/* "Double Trouble" spell cast by the Wizard; caller is responsible for
   only casting this when there is currently one wizard in existence;
   the clone can't use it unless/until its creator has been killed off */
export function clonewiz()
{
    let mtmp2;

    if ((mtmp2 = C.makemon(C.mons[C.PM_WIZARD_OF_YENDOR], C.u.ux, C.u.uy, C.MM_NOWAIT))
        != 0) {
        mtmp2.msleeping = mtmp2.mtame = mtmp2.mpeaceful = 0;
        if (!C.u.uhave.amulet && C.rn2(2, 524, "clonewiz")) { /* give clone a fake */
            C.add_to_minv(mtmp2,
                               C.mksobj(C.FAKE_AMULET_OF_YENDOR, 1, 0));
        }
        if (!C.Protection_from_shape_changers) {
            mtmp2.m_ap_type = C.M_AP_MONSTER;
            mtmp2.mappearance = C.wizapp[C.rn2(C.wizapp.length, 530, "clonewiz")];
        }
        C.newsym(mtmp2.mx, mtmp2.my);
    }
}

/* also used by newcham() */
export function pick_nasty(difcap)
/* if non-zero, try to make difficulty be lower than this */
{
    difcap = C.int(difcap);
    let alt, res = C.nasties[C.rn2(C.nasties.length, 541, "pick_nasty")];

    /* To do?  Possibly should filter for appropriate forms when
     * in the elemental planes or surrounded by water or lava.
     *
     * We want monsters represented by uppercase on rogue level,
     * but we don't try very hard.
     */
    if (C.Is_rogue_level(C.u.uz)
        && !('A'.charCodeAt(0) <= C.monsym(C.mons[res]) && C.monsym(C.mons[res]) <= 'Z'.charCodeAt(0)))
        res = C.nasties[C.rn2(C.nasties.length, 551, "pick_nasty")];

    /* if genocided or too difficult or out of place, try a substitute
       when a suitable one exists
           arch-lich -> master lich,
           master mind flayer -> mind flayer,
       but the substitutes are likely to be genocided too */
    alt = res;
    if ((C.svm.mvitals[res].mvflags & C.G_GENOD) != 0
        || (difcap > 0 && C.mons[res].difficulty >= difcap)
         /* note: nasty() -> makemon() ignores G_HELL|G_NOHELL;
            arch-lich and master lich are both flagged as hell-only;
            this filtering demotes arch-lich to master lich when
            outside of Gehennom (unless the latter has been genocided) */
        || (C.mons[res].geno & (C.Inhell ? C.G_NOHELL : C.G_HELL)) != 0)
        alt = C.big_to_little(res);
    if (alt != res && (C.svm.mvitals[alt].mvflags & C.G_GENOD) == 0) {
        let mnam = C.mons[alt].pmnames[C.NEUTRAL], lastspace = C.strrchr(mnam, ' '.charCodeAt(0));

        /* only non-juveniles can become alternate choice */
        if (C.strncmp(mnam, "baby ", 5)
            && (!lastspace
                || (C.strcmp(lastspace, " hatchling")
                    && C.strcmp(lastspace, " pup")
                    && C.strcmp(lastspace, " cub"))))
            res = alt;
    }

    return res;
}

/* create some nasty monsters, aligned with the caster or neutral; chaotic
   and unaligned are treated as equivalent; if summoner is Null, this is
   for late-game harassment (after the Wizard has been killed at least once
   or the invocation ritual has been performed), in which case we treat
   'summoner' as neutral, since that will produce the greatest number of
   creatures on average (in 3.6.0 and earlier, Null was treated as chaotic);
   returns the number of monsters created */
export function nasty(summoner)
{
    let mtmp;
    let bypos = C.coordLocal();
    let i, j, count, census, tmp, makeindex,
        s_cls, m_cls, difcap, trylimit, castalign;
    /* when a monster casts the "summon nasties" spell, it gives feedback;
       when random post-Wizard harassment casts that, we give feedback */
    let mmflags = summoner ? C.MM_NOMSG : C.NO_MM_FLAGS;

const MAXNASTIES = 10; /* more than this can be created */

    /* some candidates may be created in groups, so simple count
       of non-null makemon() return is inadequate */
    census = C.monster_census(0);

    if (!C.rn2(10, 607, "nasty") && C.Inhell) {
        /* this might summon a demon prince or lord */
        count = C.msummon(0); /* summons like WoY */
    } else {
        count = 0;
        s_cls = summoner ? summoner.data.mlet : 0;
        difcap = summoner ? summoner.data.difficulty : 0; /* spellcasters */
        castalign = summoner ? C.sgn(summoner.data.maligntyp) : 0;
        tmp = (C.u.ulevel > 3) ? Math.trunc(C.u.ulevel / 3) : 1;
        /* if we don't have a casting monster, nasties appear around hero,
           otherwise they'll appear around spot summoner thinks she's at */
        bypos.x = C.u.ux;
        bypos.y = C.u.uy;
        for (i = C.rnd(tmp, 620, "nasty"); i > 0 && count < MAXNASTIES; --i) {
            /* Of the 44 nasties[], 10 are lawful, 14 are chaotic,
             * and 20 are neutral.  [These numbers are up date for
             * 5.0.0; the ones in the next paragraph are not....]
             *
             * Neutral caster, used for late-game harassment,
             * has 18/42 chance to stop the inner loop on each
             * critter, 24/42 chance for another iteration.
             * Lawful caster has 28/42 chance to stop unless the
             * summoner is an angel or demon, in which case the
             * chance is 26/42.
             * Chaotic or unaligned caster has 32/42 chance to
             * stop, so will summon fewer creatures on average.
             *
             * The outer loop potentially gives chaotic/unaligned
             * a chance to even things up since others will hit
             * MAXNASTIES sooner, but its number of iterations is
             * randomized so it won't always do so.
             */
            nextj: for (j = 0; j < 20; j++) {
                /* Don't create more spellcasters of the monster's level or
                 * higher--avoids chain summoners filling up the level.
                 */
                trylimit = 10 + 1; /* 10 tries */
                do {
                    if (!--trylimit)
                        continue nextj; /* break this loop, continue outer one */
                    makeindex = pick_nasty(difcap);
                    m_cls = C.mons[makeindex].mlet;
                } while ((difcap > 0 && C.mons[makeindex].difficulty >= difcap
                          && C.attacktype(C.mons[makeindex], C.AT_MAGC))
                         || (s_cls == C.S_DEMON && m_cls == C.S_ANGEL)
                         || (s_cls == C.S_ANGEL && m_cls == C.S_DEMON));
                /* do this after picking the monster to place */
                if (summoner && !C.enexto(bypos, summoner.mux, summoner.muy,
                                        C.mons[makeindex]))
                    continue;
                /* this honors genocide but overrides extinction; it ignores
                   inside-hell-only (G_HELL) & outside-hell-only (G_NOHELL) */
                if ((mtmp = C.makemon(C.mons[makeindex], bypos.x, bypos.y,
                                    mmflags)) != 0) {
                    mtmp.msleeping = mtmp.mpeaceful = mtmp.mtame = 0;
                    C.set_malign(mtmp);
                } else {
                    /* random monster to substitute for geno'd selection;
                       unlike direct choice, not forced to be hostile [why?];
                       limit spellcasters to inhibit chain summoning */
                    if ((mtmp = C.makemon(0,
                                        bypos.x, bypos.y, mmflags)) != 0) {
                        m_cls = mtmp.data.mlet;
                        if ((difcap > 0 && mtmp.data.difficulty >= difcap
                             /* always capping for substitutes made wanton
                                genocide become too strong in the endgame */
                             && C.rn2(C.In_endgame(C.u.uz) ? 3 : 7, 673, "nasty") /* usually */
                             && C.attacktype(mtmp.data, C.AT_MAGC))
                            || (s_cls == C.S_DEMON && m_cls == C.S_ANGEL)
                            || (s_cls == C.S_ANGEL && m_cls == C.S_DEMON))
                            mtmp = C.unmakemon(mtmp, C.NO_MM_FLAGS); /* Null */
                    }
                }

                if (mtmp) {
                    /* if creating an arch-lich or Archon, further directly
                       selected nasties will have to be less difficult, and
                       substitues for geno victims will usually be less
                       (note: Archon is not in nasties[] but could be chosen
                       as random replacement for a genocided selection) */
                    if (C.samePtr(mtmp.data, C.mons[C.PM_ARCH_LICH])
                        || C.samePtr(mtmp.data, C.mons[C.PM_ARCHON])) {
                        tmp = C.min(C.mons[C.PM_ARCHON].difficulty, /* A:26 */
                                  C.mons[C.PM_ARCH_LICH].difficulty); /* L:31 */
                        if (!difcap || difcap > tmp)
                            difcap = tmp; /* rest must be lower difficulty */
                    }
                    /* delay first use of spell or breath attack */
                    mtmp.mspec_used = C.rnd(4, 695, "nasty");

                    if (++count >= MAXNASTIES
                        || mtmp.data.maligntyp == 0
                        || C.sgn(mtmp.data.maligntyp) == castalign)
                        break;
                }
                ; /* empty; label must be followed by a statement */
            } /* for j */
        } /* for i */
    }

    if (count)
        count = C.monster_census(0) - census;
    return count;
}

/* Let's resurrect the Wizard, for some unexpected fun. */
export function resurrect()
{
    let mtmp, mmtmp;
    let elapsed;
    let verb;

    if (!C.svc.context.no_of_wizards) {
        /* make a new Wizard */
        verb = "kill";
        mtmp = C.makemon(C.mons[C.PM_WIZARD_OF_YENDOR], C.u.ux, C.u.uy, C.MM_NOWAIT);
        /* affects experience; he's not coming back from a corpse
           but is subject to repeated killing like a revived corpse */
        if (mtmp)
            mtmp.mrevived = 1;
    } else {
        /* look for a migrating Wizard */
        verb = "elude";
        mmtmp = C.migratingRef();
        while ((mtmp = mmtmp.value) != 0) {
            if (mtmp.iswiz
                /* if he has the Amulet, he won't bring it to you */
                && !mon_has_amulet(mtmp)
                && (elapsed = C.long(C.svm.moves - mtmp.mlstmv)) > 0n) {
                C.mon_catchup_elapsed_time(mtmp, elapsed);
                if (elapsed >= C.LARGEST_INT)
                    elapsed = C.long(C.LARGEST_INT - 1);
                elapsed = C.long(elapsed / 50n);
                if (mtmp.msleeping && C.rn2(C.int(C.int(elapsed) + 1), 742, "resurrect"))
                    mtmp.msleeping = 0;
                if (mtmp.mfrozen == 1) /* would unfreeze on next move */
                    mtmp.mfrozen = 0, mtmp.mcanmove = 1;
                if (!C.helpless(mtmp)) {
                    mmtmp.value = mtmp.nmon;
                    C.mon_arrive(mtmp, -1); /* -1: Wiz_arrive (dog.c) */
                    /* mx: mon_arrive() might have sent mtmp into limbo */
                    if (!mtmp.mx)
                        mtmp = 0;
                    /* note: there might be a second Wizard; if so,
                       he'll have to wait until the next resurrection */
                    break;
                }
            }
            mmtmp = C.nextMonRef(mtmp);
        }
    }

    if (mtmp) {
        /* FIXME: when a new wizard is created by makemon(), it gives
           a "<mon> appears" message, delivered after he's been placed
           on the map; however, when an existing wizard comes off
           migrating_mons, he ends up triggering "<mon> vanishes and
           reappears" on his first move (tactics when hero is carrying
           the Amulet); setting STRAT_WAITMASK suppresses that but then
           he just sits wherever he is, "meditating", contradicting the
           threatening message below */
        mtmp.mstrategy &= ~C.STRAT_WAITMASK;

        mtmp.mtame = 0, mtmp.mpeaceful = 0; /* paranoia */
        C.set_malign(mtmp);
        if (!C.Deaf) {
            C.pline("A voice booms out...");
            // C.SetVoice(mtmp, 0, 80, 0);
            C.verbalize("So thou thought thou couldst %s me, fool.", verb);
        }
    }
}

/* Here, we make trouble for the poor shmuck who actually
   managed to do in the Wizard. */
export function intervene()
{
    let which = C.Is_astralevel(C.u.uz) ? C.rnd(4, 787, "intervene") : C.rn2(6, 787, "intervene");

    /* cases 0 and 5 don't apply on the Astral level */
    switch (which) {
    case 0:
    case 1:
        C.You_feel("vaguely nervous.");
        break;
    case 2:
        if (!C.Blind)
            C.You("notice a %s glow surrounding you.", C.hcolor(C.NH_BLACK));
        C.rndcurse();
        break;
    case 3:
        aggravate();
        break;
    case 4:
        C.callLocal(nasty, 0);
        break;
    case 5:
        resurrect();
        break;
    }
}

/* Wizard of Yendor is being removed from play (dead or escaped the dungeon);
   keep the bookkeeping for him up to date */
export function wizdeadorgone()
{
    C.svc.context.no_of_wizards--;
    if (!C.u.uevent.udemigod) {
        C.u.uevent.udemigod = 1;
        C.u.udg_cnt = C.rn1(250, 50, 820, "wizdeadorgone");
    }
}

export const random_insult = [
    "antic",      "blackguard",   "caitiff",    "chucklehead",
    "coistrel",   "craven",       "cretin",     "cur",
    "dastard",    "demon fodder", "dimwit",     "dolt",
    "fool",       "footpad",      "imbecile",   "knave",
    "maledict",   "miscreant",    "niddering",  "poltroon",
    "rattlepate", "reprobate",    "scapegrace", "varlet",
    "villein", /* (sic.) */
    "wittol",     "worm",         "wretch",
];

export const random_malediction = [
    "Hell shall soon claim thy remains,", "I chortle at thee, thou pathetic",
    "Prepare to die, thou", "Resistance is useless,",
    "Surrender or die, thou", "There shall be no mercy, thou",
    "Thou shalt repent of thy cunning,", "Thou art as a flea to me,",
    "Thou art doomed,", "Thy fate is sealed,",
    "Verily, thou shalt be one dead"
];

/* Insult or intimidate the player */
export function cuss(mtmp)
{
    if (C.Deaf)
        return;
    if (mtmp.iswiz) {
        if (!C.rn2(5, 851, "cuss")) { /* typical bad guy action */
            C.pline("%s laughs fiendishly.", C.Monnam(mtmp));
        } else if (C.u.uhave.amulet && !C.rn2(C.random_insult.length, 853, "cuss")) {
            // C.SetVoice(mtmp, 0, 80, 0);
            C.verbalize("Relinquish the amulet, %s!",
                      C.random_insult[C.rn2(C.random_insult.length, 856, "cuss")]);
        } else if (C.u.uhp < 5 && !C.rn2(2, 857, "cuss")) { /* Panic */
            // C.SetVoice(mtmp, 0, 80, 0);
            C.verbalize(C.rn2(2, 859, "cuss") ? "Even now thy life force ebbs, %s!"
                             : "Savor thy breath, %s, it be thy last!",
                      C.random_insult[C.rn2(C.random_insult.length, 861, "cuss")]);
        } else if (mtmp.mhp < 5 && !C.rn2(2, 862, "cuss")) { /* Parthian shot */
            // C.SetVoice(mtmp, 0, 80, 0);
            C.verbalize(C.rn2(2, 864, "cuss") ? "I shall return." : "I'll be back.");
        } else {
            // C.SetVoice(mtmp, 0, 80, 0);
            C.verbalize("%s %s!",
                      C.random_malediction[C.rn2(C.random_malediction.length, 868, "cuss")],
                      C.random_insult[C.rn2(C.random_insult.length, 869, "cuss")]);
        }
    } else if (C.is_lminion(mtmp)
               && !(mtmp.isminion && C.EMIN(mtmp).renegade)) {
        C.com_pager("angel_cuss"); /* TODO: the Hallucination msg */
        /*com_pager(rn2(QTN_ANGELIC - 1 + (Hallucination ? 1 : 0))
          + QT_ANGELIC);*/
    } else {
        if (!C.rn2(C.is_minion(mtmp.data) ? 100 : 5, 877, "cuss"))
            C.pline("%s casts aspersions on your ancestry.", C.Monnam(mtmp));
        else
            C.com_pager("demon_cuss");
    }
    C.wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}

/*wizard.c*/
