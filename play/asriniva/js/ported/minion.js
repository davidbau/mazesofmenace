/* NetHack 5.0	minion.c	$NHDT-Date: 1762727599 2025/11/09 14:33:19 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.81 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2008. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* used to pick among the four basic elementals without worrying whether
   they've been reordered (difficulty reassessment?) or any new ones have
   been introduced (hybrid types added to 'E'-class?) */
export const elementals_initial = ['PM_AIR_ELEMENTAL', 'PM_FIRE_ELEMENTAL',
    'PM_EARTH_ELEMENTAL', 'PM_WATER_ELEMENTAL'];

export function newemin(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.newmextra();
    if (!mtmp.mextra.emin) {
        mtmp.mextra.emin = C.emin(C.alloc(C.eminSize));
        C.memset(mtmp.mextra.emin, 0, C.eminSize);
        mtmp.mextra.emin.parentmid = mtmp.m_id;
    }
}

export function free_emin(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.emin) {
        C.free(mtmp.mextra.emin);
        mtmp.mextra.emin = 0;
    }
    mtmp.isminion = 0;
}

/* count the number of monsters on the level */
export function monster_census(spotted) /* seen|sensed vs all */
{
    let mtmp;
    let count = 0;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.isgd && mtmp.mx == 0)
            continue;
        if (spotted && !C.canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}

/* mon summons a monster */
export function msummon(mon)
{
    let ptr;
    let dtype = C.NON_PM, cnt = 0, result = 0, census;
    let xlight;
    let atyp;
    let mtmp;

    if (mon) {
        ptr = mon.data;

        if (C.u_wield_art(C.ART_DEMONBANE) && C.is_demon(ptr)) {
            if (C.canseemon(mon))
                C.pline("%s looks puzzled for a moment.", C.Monnam(mon));
            return 0;
        }

        atyp = mon.ispriest ? mon.mextra.epri.shralign
               : mon.isminion ? mon.mextra.emin.min_align
                 : (ptr.maligntyp == C.A_NONE) ? C.A_NONE
                   : C.sgn(ptr.maligntyp);
    } else {
        ptr = C.mons[C.PM_WIZARD_OF_YENDOR];
        atyp = (ptr.maligntyp == C.A_NONE) ? C.A_NONE : C.sgn(ptr.maligntyp);
    }

    if (C.is_dprince(ptr) || (ptr.address == C.mons[C.PM_WIZARD_OF_YENDOR].address)) {
        dtype = (!C.rn2(20, 86, 0)) ? dprince(atyp) : (!C.rn2(4, 86, 0)) ? dlord(atyp)
                                                       : ndemon(atyp);
        cnt = ((dtype != C.NON_PM)
               && !C.rn2(4, 89, 0) && C.is_ndemon(C.mons[dtype])) ? 2 : 1;
    } else if (C.is_dlord(ptr)) {
        dtype = (!C.rn2(50, 91, 0)) ? dprince(atyp) : (!C.rn2(20, 91, 0)) ? dlord(atyp)
                                                        : ndemon(atyp);
        cnt = ((dtype != C.NON_PM)
               && !C.rn2(4, 94, 0) && C.is_ndemon(C.mons[dtype])) ? 2 : 1;
    } else if (ptr.address == C.mons[C.PM_BONE_DEVIL].address) {
        dtype = C.PM_SKELETON;
        cnt = 1;
    } else if (C.is_ndemon(ptr)) {
        dtype = (!C.rn2(20, 99, 0)) ? dlord(atyp) : (!C.rn2(6, 99, 0)) ? ndemon(atyp)
                                                     : C.monsndx(ptr);
        cnt = 1;
    } else if (C.is_lminion(mon)) {
        dtype = (C.is_lord(ptr) && !C.rn2(20, 103, 0))
                    ? llord()
                    : (C.is_lord(ptr) || !C.rn2(6, 105, 0)) ? lminion() : C.monsndx(ptr);
        cnt = ((dtype != C.NON_PM)
               && !C.rn2(4, 107, 0) && !C.is_lord(C.mons[dtype])) ? 2 : 1;
    } else if (ptr.address == C.mons[C.PM_ANGEL].address) {
        /* non-lawful angels can also summon */
        if (!C.rn2(6, 110, 0)) {
            switch (atyp) { /* see summon_minion */
            case C.A_NEUTRAL:
                dtype = C.elementals[C.rn2(C.elementals.length, 113, 0)];
                break;
            case C.A_CHAOTIC:
            case C.A_NONE:
                dtype = ndemon(atyp);
                break;
            }
        } else {
            dtype = C.PM_ANGEL;
        }
        cnt = ((dtype != C.NON_PM)
               && !C.rn2(4, 124, 0) && !C.is_lord(C.mons[dtype])) ? 2 : 1;
    }

    if (dtype == C.NON_PM)
        return 0;

    /* sanity checks */
    if (cnt > 1 && (C.mons[dtype].geno & C.G_UNIQ) != 0)
        cnt = 1;
    /*
     * If this daemon is unique and being re-summoned (the only way we
     * could get this far with an extinct dtype), try another.
     */
    if ((C.svm.mvitals[dtype].mvflags & C.G_GONE) != 0) {
        dtype = ndemon(atyp);
        if (dtype == C.NON_PM)
            return 0;
    }

    /* some candidates can generate a group of monsters, so simple
       count of non-null makemon() result is not sufficient */
    census = monster_census(0);
    xlight = 0;

    while (cnt > 0) {
        mtmp = C.makemon(C.mons[dtype], C.u.ux, C.u.uy, C.MM_EMIN|C.MM_NOMSG);
        if (mtmp) {
            result++;
            /* an angel's alignment should match the summoner */
            if (dtype == C.PM_ANGEL) {
                mtmp.isminion = 1;
                mtmp.mextra.emin.min_align = atyp;
                /* renegade if same alignment but not peaceful
                   or peaceful but different alignment */
                mtmp.mextra.emin.renegade =
                    (atyp != C.u.ualign.type) ^ !mtmp.mpeaceful;
            }

            if (mtmp.data.mlet == C.S_ANGEL && !C.Blind) {
                /* for any 'A', 'cloud of smoke' will be 'flash of light';
                   if more than one monster is being created, that message
                   might be skipped for this monster but show 'mtmp' anyway */
                C.show_transient_light(0, mtmp.mx, mtmp.my);
                xlight = 1;
                /* we don't do this for 'burst of flame' (fire elemental)
                   because those monsters become their own light source */
            }

            if (cnt == 1 && C.canseemon(mtmp)) {
                let cloud = C.pointerLocal();
                cloud.value = 0;
                let what = C.msummon_environ(mtmp.data, cloud);

                C.pline("%s appears in a %s of %s!", C.Amonnam(mtmp),
                      cloud.value, what);
            }
        }
        cnt--;
    }

    if (xlight) {
        /* Note: if we forced --More-- here, the 'A's would be visible for
           long enough to be seen, but like with clairvoyance, some players
           would be annoyed at the disruption of having to acknowledge it */
        C.transient_light_cleanup();
    }

    /* how many monsters exist now compared to before? */
    if (result)
        result = monster_census(0) - census;

    return result;
}

export function summon_minion(alignment, talk)
{
    let mon;
    let mnum;

    switch (alignment) {
    case C.A_LAWFUL:
        mnum = lminion();
        break;
    case C.A_NEUTRAL:
        mnum = C.elementals[C.rn2(C.elementals.length, 208, 1)];
        break;
    case C.A_CHAOTIC:
    case C.A_NONE:
        mnum = ndemon(alignment);
        break;
    default:
        C.impossible("unaligned player?");
        mnum = ndemon(C.A_NONE);
        break;
    }
    if (mnum == C.NON_PM) {
        mon = 0;
    } else if (mnum == C.PM_ANGEL) {
        mon = C.makemon(C.mons[mnum], C.u.ux, C.u.uy, C.MM_EMIN|C.MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.mextra.emin.min_align = alignment;
            mon.mextra.emin.renegade = 0;
        }
    } else if (mnum != C.PM_SHOPKEEPER && mnum != C.PM_GUARD
               && mnum != C.PM_ALIGNED_CLERIC && mnum != C.PM_HIGH_CLERIC) {
        /* This was mons[mnum].pxlth == 0 but is this restriction
           appropriate or necessary now that the structures are separate? */
        mon = C.makemon(C.mons[mnum], C.u.ux, C.u.uy, C.MM_EMIN|C.MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.mextra.emin.min_align = alignment;
            mon.mextra.emin.renegade = 0;
        }
    } else {
        mon = C.makemon(C.mons[mnum], C.u.ux, C.u.uy, C.MM_NOMSG);
    }
    if (mon) {
        if (talk) {
            if (!C.Deaf)
                C.pline_The("voice of %s booms:", C.align_gname(alignment));
            else
                C.You_feel("%s booming voice:",
                         C.s_suffix(C.align_gname(alignment)));
            // SetVoice(mon, 0, 80, 0); (inactive configured macro)
            C.verbalize("Thou shalt pay for thine indiscretion!");
            if (C.canspotmon(mon))
                C.pline("%s appears before you.", C.Amonnam(mon));
            mon.mstrategy &= ~C.STRAT_APPEARMSG;
        }
        mon.mpeaceful = 0;
        /* don't call set_malign(); player was naughty */
    }
}

// Athome expands at its original use below.

/* returns 1 if it won't attack. */
export function demon_talk(mtmp)
{
    let cash, demand, offer;

    if (C.u_wield_art(C.ART_EXCALIBUR) || C.u_wield_art(C.ART_DEMONBANE)) {
        if (C.canspotmon(mtmp))
            C.pline("%s looks very angry.", C.Amonnam(mtmp));
        else
            C.You_feel("tension building.");
        mtmp.mpeaceful = mtmp.mtame = 0;
        C.set_malign(mtmp);
        C.newsym(mtmp.mx, mtmp.my);
        return 0;
    }

    if (C.is_fainted()) {
        C.reset_faint(); /* if fainted - wake up */
    } else {
        C.stop_occupation();
        if (C.gm.multi > 0) {
            C.nomul(0);
            C.unmul(0);
        }
    }

    /* Slight advantage given. */
    if (C.is_dprince(mtmp.data) && mtmp.minvis) {
        let wasunseen = !C.canspotmon(mtmp);

        mtmp.minvis = mtmp.perminvis = 0;
        if (wasunseen && C.canspotmon(mtmp)) {
            C.pline("%s appears before you.", C.Amonnam(mtmp));
            mtmp.mstrategy &= ~C.STRAT_APPEARMSG;
        }
        C.newsym(mtmp.mx, mtmp.my);
    }
    if (C.gy.youmonst.data.mlet == C.S_DEMON) { /* Won't blackmail their own. */
        if (!C.Deaf)
            C.pline("%s says, \"Good hunting, %s.\"", C.Amonnam(mtmp),
                  C.flags.female ? "Sister" : "Brother");
        else if (C.canseemon(mtmp))
            C.pline("%s says something.", C.Amonnam(mtmp));
        if (!C.tele_restrict(mtmp))
            C.rloc(mtmp, C.RLOC_MSG);
        return 1;
    }
    cash = C.money_cnt(C.gi.invent);
    demand = C.long(cash * C.long(C.rnd(80, 310, 2) + 20 * (C.Inhell && (mtmp.cham == C.NON_PM) ? 1 : 0)))
           / C.long(100 * (1 + (C.sgn(C.u.ualign.type) == C.sgn(mtmp.data.maligntyp))));

    if (!demand || C.gm.multi < 0) { /* you have no gold or can't move */
        mtmp.mpeaceful = 0;
        C.set_malign(mtmp);
        return 0;
    } else {
        /* make sure that the demand is unmeetable if the monster
           has the Amulet, preventing monster from being satisfied
           and removed from the game (along with said Amulet...) */
        /* [actually the Amulet is safe; it would be dropped when
           mongone() gets rid of the monster; force combat anyway;
           also make it unmeetable if the player is Deaf, to simplify
           handling that case as player-won't-pay] */
        if (C.mon_has_amulet(mtmp) || C.Deaf)
            /* 125: 5*25 in case hero has maximum possible charisma */
            demand = C.long(cash + C.long((C.rn2(1000, 327, 2) + 125)));

        if (!C.Deaf)
            C.pline("%s demands %ld %s for safe passage.",
                  C.Amonnam(mtmp), demand, C.currency(demand));
        else if (C.canseemon(mtmp))
            C.pline("%s seems to be demanding something.", C.Amonnam(mtmp));
        offer = 0n;
        if (!C.Deaf &&
            ((offer = bribe(mtmp, "How much will you offer?")) >= demand)) {
            C.pline("%s vanishes, laughing about cowardly mortals.",
                  C.Amonnam(mtmp));
        } else if (offer > 0n
                   && C.long(C.rnd(5 * C.ACURR(C.A_CHA), 340, 2)) > C.long(demand - offer)) {
            C.pline("%s scowls at you menacingly, then vanishes.",
                  C.Amonnam(mtmp));
        } else {
            C.pline("%s gets angry...", C.Amonnam(mtmp));
            mtmp.mpeaceful = 0;
            C.set_malign(mtmp);
            return 0;
        }
    }
    /* if 'mtmp' is unrecognizable due to hero's hallucination,
       #chronicle will reveal its true identity -- just live with that;
       also, avoid random hallucinatory currency() units */
    C.livelog_printf(C.LL_UMONST, "bribed %s with %ld %s for safe passage",
                   C.x_monnam(mtmp, C.ARTICLE_A, 0, C.EXACT_NAME, 0),
                   offer, (offer == 1n) ? "zorkmid" : "zorkmids");
    C.mongone(mtmp);
    return 1;
}

export function bribe(mtmp, prompt)
{
    let buf = C.stackAlloc(C.BUFSZ);
    C.HEAPU8.fill(0, buf, buf + C.BUFSZ);
    let offer = C.longLocal();
    let umoney = C.money_cnt(C.gi.invent);

    C.getlin(prompt, buf);
    if (C.sscanf(buf, "%ld", offer.address) != 1)
        offer.value = 0n;

    /*Michael Paddon -- fix for negative offer to monster*/
    /*JAR880815 - */
    if (offer.value < 0n) {
        C.You("try to shortchange %s, but fumble.", C.mon_nam(mtmp));
        return 0n;
    } else if (offer.value == 0n) {
        C.You("refuse.");
        return 0n;
    } else if (offer.value >= umoney) {
        C.You("give %s all your gold.", C.mon_nam(mtmp));
        offer.value = umoney;
    } else {
        C.You("give %s %ld %s.", C.mon_nam(mtmp), offer.value, C.currency(offer.value));
    }
    C.money2mon(mtmp, offer.value);
    C.disp.botl = 1;
    return offer.value;
}

export function dprince(atyp)
{
    let tryct, pm;

    for (tryct = !C.In_endgame(C.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        pm = (C.rn2(C.PM_DEMOGORGON + 1 - C.PM_ORCUS, 396, 3) + C.PM_ORCUS);
        if (!(C.svm.mvitals[pm].mvflags & C.G_GONE)
            && (atyp == C.A_NONE || C.sgn(C.mons[pm].maligntyp) == C.sgn(atyp)))
            return pm;
    }
    return dlord(atyp); /* approximate */
}

export function dlord(atyp)
{
    let tryct, pm;

    for (tryct = !C.In_endgame(C.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        pm = (C.rn2(C.PM_YEENOGHU + 1 - C.PM_JUIBLEX, 410, 4) + C.PM_JUIBLEX);
        if (!(C.svm.mvitals[pm].mvflags & C.G_GONE)
            && (atyp == C.A_NONE || C.sgn(C.mons[pm].maligntyp) == C.sgn(atyp)))
            return pm;
    }
    return ndemon(atyp); /* approximate */
}

/* create lawful (good) lord */
export function llord()
{
    if (!(C.svm.mvitals[C.PM_ARCHON].mvflags & C.G_GONE))
        return C.PM_ARCHON;

    return lminion(); /* approximate */
}

export function lminion()
{
    let tryct;
    let ptr;

    for (tryct = 0; tryct < 20; tryct++) {
        ptr = C.mkclass(C.S_ANGEL, 0);
        if (ptr && !C.is_lord(ptr))
            return C.monsndx(ptr);
    }

    return C.NON_PM;
}

export function ndemon(atyp) /* A_NONE is used for 'any alignment' */
{
    let ptr;

    /*
     * 3.6.2:  [fixed #H2204, 22-Dec-2010, eight years later...]
     * pick a correctly aligned demon in one try.  This used to
     * use mkclass() to choose a random demon type and keep trying
     * (up to 20 times) until it got one with the desired alignment.
     * mkclass_aligned() skips wrongly aligned potential candidates.
     * [The only neutral demons are djinni and mail daemon and
     * mkclass() won't pick them, but call it anyway in case either
     * aspect of that changes someday.]
     */
// #if 0
//    if (atyp == C.A_NEUTRAL)
//        return C.NON_PM;
// #endif
    ptr = C.mkclass_aligned(C.S_DEMON, 0, atyp);
    return (ptr && C.is_ndemon(ptr)) ? C.monsndx(ptr) : C.NON_PM;
}

/* guardian angel has been affected by conflict so is abandoning hero */
export function lose_guardian_angel(mon) /* if Null, angel hasn't been created yet */
{
    let mm = C.coordLocal();
    let i;

    if (mon) {
        if (C.canspotmon(mon)) {
            if (!C.Deaf) {
                C.pline("%s rebukes you, saying:", C.Monnam(mon));
                // SetVoice(mon, 0, 80, 0); (inactive configured macro)
                C.verbalize("Since you desire conflict, have some more!");
            } else {
                C.pline("%s vanishes!", C.Monnam(mon));
            }
        }
        C.mongone(mon);
    }
    /* create 2 to 4 hostile angels to replace the lost guardian */
    for (i = (C.rn2(3, 487, 5) + 2); i > 0; --i) {
        mm.x = C.u.ux;
        mm.y = C.u.uy;
        if (C.enexto(mm, mm.x, mm.y, C.mons[C.PM_ANGEL]))
            C.mk_roamer(C.mons[C.PM_ANGEL], C.u.ualign.type, mm.x, mm.y,
                             0);
    }
}

/* just entered the Astral Plane; receive tame guardian angel if worthy */
export function gain_guardian_angel()
{
    let mtmp;
    let otmp;
    let mm = C.coordLocal();

    C.Hear_again(); /* attempt to cure any deafness now (divine
                     message will be heard even if that fails) */
    if (C.Conflict) {
       if (!C.Deaf)
            C.pline("A voice booms:");
        else
            C.You_feel("a booming voice:");
        // SetVoice((struct monst *) 0, 0, 80, voice_deity); (inactive configured macro)
        C.verbalize("Thy desire for conflict shall be fulfilled!");
        /* send in some hostile angels instead */
        lose_guardian_angel(0);
    } else if (C.u.ualign.record > 8) { /* fervent */
        if (!C.Deaf)
            C.pline("A voice whispers:");
        else
            C.You_feel("a soft voice:");
        // SetVoice((struct monst *) 0, 0, 80, voice_deity); (inactive configured macro)
        C.verbalize("Thou hast been worthy of me!");
        mm.x = C.u.ux;
        mm.y = C.u.uy;
        if (C.enexto(mm, mm.x, mm.y, C.mons[C.PM_ANGEL])
            && (mtmp = C.mk_roamer(C.mons[C.PM_ANGEL], C.u.ualign.type, mm.x, mm.y,
                                 1)) != 0) {
            mtmp.mstrategy &= ~C.STRAT_APPEARMSG;
            /* guardian angel -- the one case mtame doesn't imply an
             * edog structure, so we don't want to call tamedog().
             * [Note: this predates mon->mextra which allows a monster
             * to have both emin and edog at the same time.]
             */
            /* Too nasty for the game to unexpectedly break petless conduct on
             * the final level of the game. The angel will still appear, but
             * won't be tamed. */
            if (C.u.uconduct.pets) {
                mtmp.mtame = 10;
                C.u.uconduct.pets++;
            }
            /* for 'hilite_pet'; after making tame, before next message */
            C.newsym(mtmp.mx, mtmp.my);
            if (!C.Blind)
                C.pline("An angel appears near you.");
            else
                C.You_feel("the presence of a friendly angel near you.");
            /* make him strong enough vs. endgame foes */
            mtmp.m_lev = (C.rn2(8, 547, 6) + 15);
            mtmp.mhp = mtmp.mhpmax =
                C.int(C.d(mtmp.m_lev, 10, 549, 6) + 30 + C.rnd(30, 549, 6));
            if ((otmp = C.select_hwep(mtmp)) == 0) {
                otmp = C.mksobj(C.SILVER_SABER, 0, 0);
                if (C.mpickobj(mtmp, otmp))
                    C.panic("merged weapon?");
            }
            C.bless(otmp);
            if (otmp.spe < 4)
                otmp.spe += C.rnd(4, 557, 6);
            if ((otmp = C.which_armor(mtmp, C.W_ARMS)) == 0
                || otmp.otyp != C.SHIELD_OF_REFLECTION) {
                C.mongets(mtmp, C.AMULET_OF_REFLECTION);
                C.m_dowear(mtmp, 1);
            }
        }
    }
}

/*minion.c*/
