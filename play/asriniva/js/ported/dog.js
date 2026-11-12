import {C} from '../c-runtime/context.js';

export const Before_you=0, With_you=1, After_you=2, Wiz_arrive=-1;
/* NetHack 5.0	dog.c	$NHDT-Date: 1753856387 2025/07/29 22:19:47 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.190 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */






export function newedog(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.newmextra();
    if (!C.EDOG(mtmp)) {
        mtmp.mextra.edog = C.edog(C.alloc(C.edogSize));
        C.memset(C.EDOG(mtmp), 0, C.edogSize);
        C.EDOG(mtmp).parentmid = mtmp.m_id;
    }
}

export function free_edog(mtmp)
{
    if (mtmp.mextra && C.EDOG(mtmp)) {
        C.free(C.EDOG(mtmp));
        mtmp.mextra.edog = 0;
    }
    mtmp.mtame = 0;
}

export function initedog(mtmp, everything)
{
    everything = C.boolean(everything);
    let edogp = C.EDOG(mtmp);
    let minhungry = C.long(C.svm.moves + 1000n);
    let minimumtame = C.is_domestic(mtmp.data) ? 10 : 5;

    mtmp.mtame = C.max(minimumtame, mtmp.mtame);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    C.set_malign(mtmp); /* recalc alignment now that it's tamed */
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        edogp.apport = C.ACURR(C.A_CHA);
        edogp.whistletime = 0;
        /* edogp->hungrytime = 0L; // set below */
        edogp.ogoal.x = -1; /* force error if used before set */
        edogp.ogoal.y = -1;
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else {
        if (edogp.apport <= 0)
            edogp.apport = 1;
    }
    /* always set for newly tamed pet or feral former pet; hungrytime might
       already be higher when taming magic affects already tame monst */
    if (edogp.hungrytime < minhungry)
        edogp.hungrytime = minhungry;
    /* livelog first pet, but only if you didn't start with one (the starting
     * pet will be initialized before in_moveloop is true) */
    if (!C.u.uconduct.pets && C.program_state.in_moveloop) {
        /* "obtained" a pet rather than "tamed" it because it might have come
         * from a figurine or some other method in which it was created tame
         * using an() is safe unless it somehow becomes possible to tame a
         * unique monster */
        C.livelog_printf(C.LL_CONDUCT, "obtained %s first pet (%s)",
                       C.uhis(), C.an(C.mon_pmname(mtmp)));
    }
    C.u.uconduct.pets++;
}

export function pet_type()
{
    if (C.gu.urole.petnum != C.NON_PM)
        return  C.gu.urole.petnum;
    else if (C.gp.preferred_pet == 'c'.charCodeAt(0))
        return  C.PM_KITTEN;
    else if (C.gp.preferred_pet == 'd'.charCodeAt(0))
        return  C.PM_LITTLE_DOG;
    else
        return  C.rn2(2, 100, 'pet_type') ? C.PM_KITTEN : C.PM_LITTLE_DOG;
}

export function pick_familiar_pm(otmp, quietly)
{
    quietly = C.boolean(quietly);
    let pm = 0;

    if (otmp) { /* figurine; otherwise spell */
        let mndx = otmp.corpsenm;

        C.assert(C.ismnum(mndx));
        pm = C.mons[mndx];
        /* activating a figurine provides one way to exceed the
           maximum number of the target critter created--unless
           it has a special limit (erinys, Nazgul) */
        if ((C.svm.mvitals[mndx].mvflags & C.G_EXTINCT)
            && C.mbirth_limit(mndx) != C.MAXMONNO) {
            if (!quietly)
                /* have just been given "You <do something with>
                   the figurine and it transforms." message */
                C.pline("... into a pile of dust.");
            return 0;
        }
    } else if (!C.rn2(3, 124, 'pick_familiar_pm')) {
        pm = C.mons[pet_type()];
    } else {
        let skill = C.spell_skilltype(C.SPE_CREATE_FAMILIAR);
        let max = 3 * C.P_SKILL(skill);

        pm = C.rndmonst_adj(0, max);
        if (!pm && !quietly)
            C.There("seems to be nothing available for a familiar.");
    }
    return pm;
}

export function make_familiar(otmp, x, y, quietly)
{
    x = C.coordxy(x); y = C.coordxy(y); quietly = C.boolean(quietly);
    let pm;
    let mtmp = 0;
    let chance, trycnt = 100;
    let reallytame = 1;

    do {
        let mmflags;
        let cgend;

        if (!(pm = pick_familiar_pm(otmp, quietly)))
            break;

        mmflags = C.MM_EDOG | C.MM_IGNOREWATER | C.NO_MINVENT | C.MM_NOMSG;
        cgend = otmp ? (otmp.spe & C.CORPSTAT_GENDER) : 0;
        mmflags |= ((cgend == C.CORPSTAT_FEMALE) ? C.MM_FEMALE
                    : (cgend == C.CORPSTAT_MALE) ? C.MM_MALE : 0);

        mtmp = C.makemon(pm, x, y, mmflags);
        if (otmp) { /* figurine */
            if (!mtmp) {
                /* monster has been genocided or target spot is occupied */
                if (!quietly)
                    C.pline_The(
                           "figurine writhes and then shatters into pieces!");
                break;
            } else if (mtmp.isminion) {
                /* Fixup for figurine of an Angel:  makemon() is willing to
                   create a random Angel as either an ordinary monster or as
                   a minion of random allegiance.  We don't want the latter
                   here in case it successfully becomes a pet. */
                mtmp.isminion = 0;
                C.free_emin(mtmp);
                /* [This could and possibly should be redone as a new
                   MM_flag passed to makemon() to suppress making a minion
                   so that no post-creation fixup would be needed.] */
            }
        }
    } while (!mtmp && --trycnt > 0);

    if (!mtmp)
        return 0;

    if (C.is_pool(mtmp.mx, mtmp.my) && C.minliquid(mtmp))
        return 0;

    if (otmp) { /* figurine; resulting monster might not become a pet */
        chance = C.rn2(10, 186, 'make_familiar'); /* 0==tame, 1==peaceful, 2==hostile */
        if (chance > 2)
            chance = otmp.blessed ? 0 : !otmp.cursed ? 1 : 2;
        /* 0,1,2:  b=80%,10,10; nc=10%,80,10; c=10%,10,80 */
        if (chance > 0) {
            reallytame = 0; /* not tame after all */
            if (chance == 2) {  /* hostile (cursed figurine) */
                if (!quietly)
                    C.You("get a bad feeling about this.");
                mtmp.mpeaceful = 0;
                C.set_malign(mtmp);
            }
        }
        /* if figurine has been named, give same name to the monster */
        if (C.has_oname(otmp))
            mtmp = C.christen_monst(mtmp, C.ONAME(otmp));
    }
    if (reallytame)
        initedog(mtmp, 1);
    mtmp.msleeping = 0;
    C.set_malign(mtmp); /* more alignment changes */
    C.newsym(mtmp.mx, mtmp.my);

    /* must wield weapon immediately since pets will otherwise drop it */
    if (mtmp.mtame && C.attacktype(mtmp.data, C.AT_WEAP)) {
        mtmp.weapon_check = C.NEED_HTH_WEAPON;
        C.mon_wield_item(mtmp);
    }
    return mtmp;
}

/* despite rather general name, used exclusively for hero's starting pet */
export function makedog()
{
    let mtmp;
    let petname;
    let pettype;

    if (C.gp.preferred_pet == 'n'.charCodeAt(0)) {
        /* static init yields 0 (PM_GIANT_ANT); fix that up now */
        C.svc.context.startingpet_typ = C.NON_PM;
        return (0);
    }

    pettype = C.svc.context.startingpet_typ = pet_type();
    petname = (pettype == C.PM_LITTLE_DOG) ? C.gd.dogname
              : (pettype == C.PM_KITTEN) ? C.gc.catname
                : (pettype == C.PM_PONY) ? C.gh.horsename
                  : "";

    /* default pet names */
    if (!C.loadChar(petname) && pettype == C.PM_LITTLE_DOG) {
        /* All of these names were for dogs. */
        if (C.Role_if(C.PM_CAVE_DWELLER))
            petname = "Slasher"; /* The Warrior */
        if (C.Role_if(C.PM_SAMURAI))
            petname = "Hachi"; /* Shibuya Station */
        if (C.Role_if(C.PM_BARBARIAN))
            petname = "Idefix"; /* Obelix */
        if (C.Role_if(C.PM_RANGER))
            petname = "Sirius"; /* Orion's dog */
    }

    /* specifying NO_MINVENT prevents makemon() from having a 1% chance
       of creating a pony with an already worn saddle; dogs and cats
       aren't affected because they don't have any initial inventory
       [if anybody adds stranger pets that are expected to have such,
       they'll need to modify this] */
    mtmp = C.makemon(C.mons[pettype], C.u.ux, C.u.uy, C.MM_EDOG | C.NO_MINVENT);

    if (!mtmp)
        return (0); /* pets were genocided [how?] */

    if (!C.svc.context.startingpet_mid) {
        C.svc.context.startingpet_mid = mtmp.m_id;
        if (!C.u.uroleplay.pauper) {
            /* initial horses start wearing a saddle (pauper hero excluded) */
            if (pettype == C.PM_PONY) {
                /* NULL obj arg means put_saddle_on_mon()
                 * will carry out the saddle creation */
                C.put_saddle_on_mon(0, mtmp);
            }
        }
        /* starting pet's type has been seen up close (unless PermaBlind)
           and for tourist treat it as having already been photographed */
        C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
        C.gn.notonhead = 0;
        C.see_monster_closeup(mtmp, C.carrying(C.EXPENSIVE_CAMERA) ? 1 : 0);
    } else {
        C.impossible("makedog() when startingpet_mid is already non-zero?");
    }

    if (!C.gp.petname_used++ && C.loadChar(petname))
        mtmp = C.christen_monst(mtmp, petname);

    initedog(mtmp, 1);
    return  mtmp;
}

export function set_mon_lastmove(mtmp)
{
    mtmp.mlstmv = C.svm.moves;
}

/* record `last move time' for all monsters prior to level save so that
   mon_arrive() can catch up for lost time when they're restored later */
export function update_mlstmv()
{
    C.iter_mons(set_mon_lastmove);
}

/* note: always reset when used so doesn't need to be part of struct 'g' */


export function losedogs()
{
    let mtmp, mprev;
    let dismissKops = 0, xyloc;

    C.failed_arrivals = 0;
    /*
     * First, scan gm.migrating_mons for shopkeepers who want to dismiss Kops,
     * and scan gm.mydogs for shopkeepers who want to retain kops.
     * Second, dismiss kops if warranted, making more room for arrival.
     * Third, replace monsters who went onto migrating_mons in order to
     * be accessible from other levels but didn't actually leave the level.
     * Fourth, place monsters accompanying the hero.
     * Last, place migrating monsters coming to this level.
     *
     * Hero might eventually be displaced (due to the third step, but
     * occurring later), which is the main reason to do the second step
     * sooner (in turn necessitating the first step, rather than combining
     * the list scans with monster placement).
     */

    /* check for returning shk(s) */
    for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mux != C.u.uz.dnum || mtmp.muy != C.u.uz.dlevel)
            continue;
        if (mtmp.isshk) {
            if (C.ESHK(mtmp).dismiss_kops) {
                if (dismissKops == 0)
                    dismissKops = 1;
                C.ESHK(mtmp).dismiss_kops = 0; /* reset */
            } else if (!mtmp.mpeaceful) {
                /* an unpacified shk is returning; don't dismiss kops
                   even if another pacified one is willing to do so */
                dismissKops = -1;
                /* [keep looping; later monsters might need ESHK reset] */
            }
        }
    }
    /* make the same check for gm.mydogs */
    for (mtmp = C.gm.mydogs; mtmp && dismissKops >= 0; mtmp = mtmp.nmon) {
        if (mtmp.isshk) {
            /* hostile shk might accompany hero [ESHK(mtmp)->dismiss_kops
               can't be set here; it's only used for gm.migrating_mons] */
            if (!mtmp.mpeaceful)
                dismissKops = -1;
        }
    }

    /* when a hostile shopkeeper chases hero to another level
       and then gets paid off there, get rid of summoned kops
       here now that he has returned to his shop level */
    if (dismissKops > 0)
        C.make_happy_shoppers(1);

    /* put monsters who went onto migrating_mons in order to be accessible
       when other levels are active back to their positions on this level;
       they're handled before mydogs so that monsters accompanying the
       hero can't steal the spot that belongs to them; these migraters
       should always be able to arrive because they were present on the
       level at the time the hero left [if they can't arrive for some
       reason, mon_arrive() will put them on the 'failed_arrivals' list] */
    for (mprev = C.monsterLink(C.gm, "migrating_mons"); (mtmp = mprev.value) != 0; ) {
        xyloc = mtmp.mtrack[0].x; /* (for legibility) */
        if (mtmp.mux == C.u.uz.dnum && mtmp.muy == C.u.uz.dlevel
            && xyloc == C.MIGR_EXACT_XY) {
            /* remove mtmp from migrating_mons */
            mprev.value = mtmp.nmon;
            C.callLocal(mon_arrive, mtmp, Before_you);
        } else {
            mprev = C.monsterLink(mtmp, "nmon");
        }
    }

    /* place pets and/or any other monsters who accompany hero;
       any that fail to arrive (level may be full) will be moved
       first to failed_arrivals, then to migrating_mons scheduled
       to arrive back on this level if hero leaves and returns */
    while ((mtmp = C.gm.mydogs) != 0) {
        C.gm.mydogs = mtmp.nmon;
        C.callLocal(mon_arrive, mtmp, With_you);
    }

    /* time for migrating monsters to arrive; monsters who belong on
       this level but fail to arrive get put on the failed_arrivals list
       temporarily [by mon_arrive()], then back onto the migrating_mons
       list below */
    for (mprev = C.monsterLink(C.gm, "migrating_mons"); (mtmp = mprev.value) != 0; ) {
        xyloc = mtmp.mtrack[0].x;
        if (mtmp.mux == C.u.uz.dnum && mtmp.muy == C.u.uz.dlevel
            && xyloc != C.MIGR_EXACT_XY) {
            /* remove mtmp from migrating_mons */
            mprev.value = mtmp.nmon;
            /* note: if there's no room, it ends up on failed_arrivals list */
            C.callLocal(mon_arrive, mtmp, After_you);
        } else {
            mprev = C.monsterLink(mtmp, "nmon");
        }
    }

    /* put any monsters who couldn't arrive back on migrating_mons,
       clearing out the temporary 'failed_arrivals' list in the process */
    while ((mtmp = C.failed_arrivals) != 0) {
        C.failed_arrivals = mtmp.nmon;
        /* mon_arrive() put mtmp onto fmon, but if there wasn't room to
           arrive, relmon() was used to take it off again; put it back now
           because m_into_limbo() expects it to be there */
        mtmp.nmon = C.fmon;
        C.fmon = mtmp;
        /* set this monster to migrate back to this level if hero leaves
           and then returns */
        C.m_into_limbo(mtmp);
    }
}

/* called from resurrect() in addition to losedogs() */
export function mon_arrive(mtmp, when)
{
    when = C.int(when);
    let t;
    let xlocale, ylocale, xyloc, xyflags;
    let wander;
    let num_segs;
    let failed_to_place = 0;
    let stway;
    const fromdlev = C.levelLocal();

    mtmp.mstate |= C.MON_STILL_ARRIVING;
    mtmp.nmon = C.fmon;
    C.fmon = mtmp;
    if (mtmp.isshk)
        C.set_residency(mtmp, 0);

    num_segs = mtmp.wormno;
    /* baby long worms have no tail so don't use is_longworm() */
    if (C.samePtr(mtmp.data, C.mons[C.PM_LONG_WORM])) {
        mtmp.wormno = C.get_wormno();
        if (mtmp.wormno)
            C.initworm(mtmp, num_segs);
    } else
        mtmp.wormno = 0;

    /* some monsters might need to do something special upon arrival
       _after_ the current level has been fully set up; see dochug() */
    mtmp.mstrategy |= C.STRAT_ARRIVE;
    mtmp.mstate &= ~(C.MON_MIGRATING | C.MON_LIMBO);

    /* make sure mnexto(rloc_to(set_apparxy())) doesn't use stale data */
    mtmp.mux = C.u.ux, mtmp.muy = C.u.uy;
    xyloc = mtmp.mtrack[0].x;
    xyflags = mtmp.mtrack[0].y;
    xlocale = mtmp.mtrack[1].x;
    ylocale = mtmp.mtrack[1].y;
    fromdlev.dnum = mtmp.mtrack[2].x;
    fromdlev.dlevel = mtmp.mtrack[2].y;
    C.mon_track_clear(mtmp);
    /* in case Protection_from_shape_changers is different now from when
       'mtmp' went onto the migrating monsters list; that's handled in
       getlev() when returning to a previously visited level and by the
       special level code for monsters specified in the level, but needed
       here for monsters migrating to a newly created level */
    C.restore_cham(mtmp);

    if (C.samePtr(mtmp, C.u.usteed))
        return; /* don't place steed on the map */
    if (when == With_you) {
        /* When a monster accompanies you, sometimes it will arrive
           at your intended destination and you'll end up next to
           that spot.  This code doesn't control the final outcome;
           goto_level(do.c) decides who ends up at your target spot
           when there is a monster there too. */
        if (!C.MON_AT(C.u.ux, C.u.uy)
            && !C.rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2, 475, 'mon_arrive'))
            C.rloc_to(mtmp, C.u.ux, C.u.uy);
        else
            C.mnexto(mtmp, C.RLOC_NOMSG);
        mtmp.mstate &= ~C.MON_STILL_ARRIVING;
        return;
    } else if (when == Wiz_arrive) {
        /* resurrect() is bringing existing wizard to harass the hero */
        xyloc = C.MIGR_WITH_HERO;
    }
    /*
     * The monster arrived on this level independently of the player.
     * Its coordinate fields were overloaded for use as flags that
     * specify its final destination.
     */

    if (mtmp.mlstmv < C.long(C.svm.moves - 1n)) {
        /* heal monster for time spent in limbo */
        let nmv = C.long(C.long(C.svm.moves - 1n) - mtmp.mlstmv);

        mon_catchup_elapsed_time(mtmp, nmv);

        /* let monster move a bit on new level (see placement code below) */
        wander = C.short(C.min(nmv, 8n));
    } else
        wander = 0;

    switch (xyloc) {
    case C.MIGR_APPROX_XY: /* {x,y}locale set above */
        break;
    case C.MIGR_EXACT_XY:
        wander = 0;
        break;
    case C.MIGR_WITH_HERO:
        xlocale = C.u.ux, ylocale = C.u.uy;
        break;
    case C.MIGR_STAIRS_UP:
        if ((stway = C.stairway_find_from(fromdlev, 0)) != 0) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case C.MIGR_STAIRS_DOWN:
        if ((stway = C.stairway_find_from(fromdlev, 0)) != 0) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case C.MIGR_LADDER_UP:
        if ((stway = C.stairway_find_from(fromdlev, 1)) != 0) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case C.MIGR_LADDER_DOWN:
        if ((stway = C.stairway_find_from(fromdlev, 1)) != 0) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case C.MIGR_SSTAIRS:
        if ((stway = C.stairway_find(fromdlev)) != 0) {
            xlocale = stway.sx;
            ylocale = stway.sy;
        }
        break;
    case C.MIGR_PORTAL:
        if (C.In_endgame(C.u.uz)) {
            /* there is no arrival portal for endgame levels */
            /* BUG[?]: for simplicity, this code relies on the fact
               that we know that the current endgame levels always
               build upwards and never have any exclusion subregion
               inside their TELEPORT_REGION settings. */
            xlocale = C.rn1(C.svu.updest.hx - C.svu.updest.lx + 1, C.svu.updest.lx, 548, 'mon_arrive');
            ylocale = C.rn1(C.svu.updest.hy - C.svu.updest.ly + 1, C.svu.updest.ly, 549, 'mon_arrive');
            break;
        }
        /* find the arrival portal */
        for (t = C.gf.ftrap; t; t = t.ntrap)
            if (t.ttyp == C.MAGIC_PORTAL)
                break;
        if (t) {
            xlocale = t.tx, ylocale = t.ty;
            break;
        } else if (C.iflags.debug_fuzzer
                   && (stway = C.stairway_find_dir(!C.builds_up(C.u.uz))) != 0) {
            /* debugfuzzer returns from or enters another branch */
            xlocale = stway.sx, ylocale = stway.sy;
            break;
        } else if (!(C.u.uevent.qexpelled
                     && (C.Is_qstart(C.u.uz0) || C.Is_qstart(C.u.uz)))) {
            C.impossible("mon_arrive: no corresponding portal?");
        }
        
        /*FALLTHRU*/
    default:
    case C.MIGR_RANDOM:
        xlocale = ylocale = 0;
        break;
    }

    if ((mtmp.migflags & C.MIGR_LEFTOVERS) != 0n) {
        /* Pick up the rest of the MIGR_TO_SPECIES objects */
        if (C.gm.migrating_objs)
            C.deliver_obj_to_mon(mtmp, 0, C.DF_ALL);
    }

    if (xlocale && wander) {
        /* monster moved a bit; pick a nearby location */
        /* mnearto() deals w/stone, et al */
        let r = C.in_rooms(xlocale, ylocale, 0);

        if (r && C.loadChar(r)) {
            const c = C.coordLocal();

            /* somexy() handles irregular rooms */
            if (C.somexy(C.roomAt(C.loadChar(r) - C.ROOMOFFSET), c))
                xlocale = c.x, ylocale = c.y;
            else
                xlocale = ylocale = 0;
        } else { /* not in a room */
            let i, j;

            i = C.max(1, xlocale - wander);
            j = C.min(C.COLNO - 1, xlocale + wander);
            xlocale = C.rn1(j - i, i, 600, 'mon_arrive');
            i = C.max(0, ylocale - wander);
            j = C.min(C.ROWNO - 1, ylocale + wander);
            ylocale = C.rn1(j - i, i, 603, 'mon_arrive');
        }
    } /* moved a bit */

    mtmp.mx = 0; /*(already is 0)*/
    mtmp.my = xyflags;

    if (xlocale)
        failed_to_place = !C.mnearto(mtmp, xlocale, ylocale, 0, C.RLOC_NOMSG);
    else
        failed_to_place = !C.rloc(mtmp, C.RLOC_NOMSG);

    if (failed_to_place) {
        if (when != Wiz_arrive)
            /* losedogs() will deal with this */
            C.relmon(mtmp, C.failedArrivalsReference());
        else /* when==Wiz_arrive => not being called by losedogs() */
            C.m_into_limbo(mtmp);
    }
    mtmp.mstate &= ~C.MON_STILL_ARRIVING;
}

/* heal monster for time spent elsewhere */
export function mon_catchup_elapsed_time(mtmp, nmv)
/* number of moves */
{
    nmv = C.long(nmv);
    let imv = 0; /* avoid zillions of casts and lint warnings */



    if (nmv < 0n) { /* crash likely... */
        C.panic("catchup from future time?");
        /*NOTREACHED*/
        return;
    } else if (nmv == 0n) { /* safe, but shouldn't happen */
        C.impossible("catchup from now?");
    } else

        if (nmv >= C.LARGEST_INT) /* paranoia */
        imv = C.LARGEST_INT - 1;
    else
        imv = C.int(nmv);

    /* might stop being afraid, blind or frozen */
    /* set to 1 and allow final decrement in movemon() */
    if (mtmp.mblinded) {
        if (imv >= C.int(mtmp.mblinded))
            mtmp.mblinded = 1;
        else
            mtmp.mblinded -= imv;
    }
    if (mtmp.mfrozen) {
        if (imv >= C.int(mtmp.mfrozen))
            mtmp.mfrozen = 1;
        else
            mtmp.mfrozen -= imv;
    }
    if (mtmp.mfleetim) {
        if (imv >= C.int(mtmp.mfleetim))
            mtmp.mfleetim = 1;
        else
            mtmp.mfleetim -= imv;
    }

    /* might recover from temporary trouble */
    if (mtmp.mtrapped && C.rn2(imv + 1, 670, 'mon_catchup_elapsed_time') > 40 / 2)
        mtmp.mtrapped = 0;
    if (mtmp.mconf && C.rn2(imv + 1, 672, 'mon_catchup_elapsed_time') > 50 / 2)
        mtmp.mconf = 0;
    if (mtmp.mstun && C.rn2(imv + 1, 674, 'mon_catchup_elapsed_time') > 10 / 2)
        mtmp.mstun = 0;

    /* might finish eating or be able to use special ability again */
    if (mtmp.meating) {
        if (imv > mtmp.meating)
            C.finish_meating(mtmp);
        else
            mtmp.meating -= imv;
    }
    if (imv > mtmp.mspec_used)
        mtmp.mspec_used = 0;
    else
        mtmp.mspec_used -= imv;

    /* reduce tameness for every 150 moves you are separated */
    if (mtmp.mtame) {
        let wilder = Math.trunc(C.int(imv + 75) / 150);
        if (mtmp.mtame > wilder)
            mtmp.mtame -= wilder; /* less tame */
        else if (mtmp.mtame > C.rn2(wilder, 694, 'mon_catchup_elapsed_time'))
            mtmp.mtame = 0; /* untame */
        else
            mtmp.mtame = mtmp.mpeaceful = 0; /* hostile! */
    }
    /* check to see if it would have died as a pet; if so, go wild instead
     * of dying the next time we call dog_move()
     */
    if (mtmp.mtame && !mtmp.isminion
        && (C.carnivorous(mtmp.data) || C.herbivorous(mtmp.data))) {
        let edog = C.EDOG(mtmp);

        if ((C.svm.moves > C.long(edog.hungrytime + 500n) && mtmp.mhp < 3)
            || (C.svm.moves > C.long(edog.hungrytime + 750n)))
            mtmp.mtame = mtmp.mpeaceful = 0;
    }

    if (!mtmp.mtame && mtmp.mleashed) {
        /* leashed monsters should always be with hero, consequently
           never losing any time to be accounted for later */
        C.impossible("catching up for leashed monster?");
        C.m_unleash(mtmp, 0);
    }

    /* recover lost hit points */
    if (!C.regenerates(mtmp.data))
        imv = Math.trunc(imv / 20);
    C.healmon(mtmp, imv, 0);

    set_mon_lastmove(mtmp);
}

/* bookkeeping when mtmp is about to leave the current level;
   common to keepdogs() and migrate_to_level() */
export function mon_leave(mtmp)
{
    let obj;
    let num_segs = 0; /* return value */

    /* set minvent's obj->no_charge to 0 */
    for (obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (C.Has_contents(obj))
            C.picked_container(obj); /* does the right thing */
        obj.no_charge = 0;
    }

    /* if this is a shopkeeper, clear the 'resident' field of her shop;
       if/when she returns, it will be set back by mon_arrive()  */
    if (mtmp.isshk)
        C.set_residency(mtmp, 1);

    /* if this is a long worm, handle its tail segments before mtmp itself;
       we pass possibly truncated segment count to caller via return value  */
    if (mtmp.wormno) {
        let cnt = C.count_wsegs(mtmp), mx = mtmp.mx, my = mtmp.my;

        /* since monst->wormno is overloaded to hold the number of
           tail segments during migration, a very long worm with
           more segments than can fit in that field gets truncated */
        num_segs = C.min(cnt, C.MAX_NUM_WORMS - 1);
        C.wormgone(mtmp);
        /* put the head back; note: mtmp might not be on the map if this
           is happening during a failed attempt to migrate to this level */
        if (mx)
            C.place_monster(mtmp, mx, my);
    }

    return num_segs;
}

/* when hero leaves a level, some monsters should be placed on the
   migrating_mons list instead of being stashed inside the level's file */
export function keep_mon_accessible(mon)
{
    /* the Wizard is kept accessible so that his harassment can fetch
       him instead of creating a new instance but also so that he can
       be put back at his current location if hero returns to his level */
    if (mon.iswiz)
        return 1;
    /* monsters with special attachment to a particular level only need
       to be kept accessible when on some other level */
    if (mon.mextra
        && ((mon.isshk && !C.on_level(C.u.uz, C.ESHK(mon).shoplevel))
            || (mon.ispriest && !C.on_level(C.u.uz, C.EPRI(mon).shrlevel))
            || (mon.isgd && !C.on_level(C.u.uz, C.EGD(mon).gdlevel))))
        return 1;
    /* normal monsters go into the level save file instead of being held
       on the migrating_mons list for off-level accessibility */
    return 0;
}

/* called when you move to another level */
export function keepdogs(pets_only)
/* true for ascension or final escape */
{
    pets_only = C.boolean(pets_only);
    let mtmp, mtmp2;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (C.DEADMONSTER(mtmp))
            continue;
        if (pets_only) {
            if (!mtmp.mtame)
                continue; /* reject non-pets */
            /* don't block pets from accompanying hero's dungeon
               escape or ascension simply due to mundane trifles;
               unlike level change for steed, don't bother trying
               to achieve a normal trap escape first */
            mtmp.mtrapped = 0;
            C.finish_meating(mtmp);
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
        if (((C.monnear(mtmp, C.u.ux, C.u.uy) && C.levl_follower(mtmp))
             /* the wiz will level t-port from anywhere to chase
                the amulet; if you don't have it, will chase you
                only if in range. -3. */
             || (C.u.uhave.amulet && mtmp.iswiz))
            && (!C.helpless(mtmp)
                /* eg if level teleport or new trap, steed has no control
                   to avoid following */
                || (C.samePtr(mtmp, C.u.usteed)))
            /* monster won't follow if it hasn't noticed you yet */
            && !(mtmp.mstrategy & C.STRAT_WAITFORU)) {
            let num_segs;
            let stay_behind = 0;

            if (mtmp.mtrapped)
                C.mintrap(mtmp, C.NO_TRAP_FLAGS); /* try to escape */
            if (C.samePtr(mtmp, C.u.usteed)) {
                /* make sure steed is eligible to accompany hero */
                mtmp.mtrapped = 0;       /* escape trap */
                mtmp.meating = 0;        /* terminate eating */
                C.mdrop_special_objs(mtmp); /* drop Amulet */
            } else if (mtmp.meating || mtmp.mtrapped) {
                if (C.canseemon(mtmp))
                    C.pline_mon(mtmp, "%s is still %s.", C.Monnam(mtmp),
                             mtmp.meating ? "eating" : "trapped");
                stay_behind = 1;
            } else if (C.mon_has_amulet(mtmp)) {
                if (C.canseemon(mtmp))
                    C.pline("%s seems very disoriented for a moment.",
                          C.Monnam(mtmp));
                stay_behind = 1;
            }
            if (stay_behind) {
                if (mtmp.mleashed) {
                    C.pline("%s leash suddenly comes loose.",
                          C.humanoid(mtmp.data)
                              ? (mtmp.female ? "Her" : "His")
                              : "Its");
                    C.m_unleash(mtmp, 0);
                }
                if (C.samePtr(mtmp, C.u.usteed)) {
                    /* can't happen unless someone makes a change
                       which scrambles the stay_behind logic above */
                    C.impossible("steed left behind?");
                    C.dismount_steed(C.DISMOUNT_GENERIC);
                }
                continue;
            }

            /* prepare to take mtmp off the map */
            num_segs = mon_leave(mtmp);
            /* take off map and move mtmp from fmon list to mydogs */
            C.relmon(mtmp, C.monsterLink(C.gm, "mydogs")); /* mtmp->mx,my retain current value */
            mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */
            mtmp.wormno = num_segs;
            mtmp.mlstmv = C.svm.moves;
        } else if (keep_mon_accessible(mtmp)) {
            /* we want to be able to find the Wizard when his next
               resurrection chance comes up, but have him resume his
               present location if player returns to this level before
               that time; also needed for monsters (shopkeeper, temple
               priest, vault guard) who have level data in mon->mextra
               in case #wizmakemap is used to replace their home level
               while they're away from it */
            C.callLocal(migrate_to_level, mtmp, C.ledger_no(C.u.uz), C.MIGR_EXACT_XY,
                             0);
        } else if (mtmp.mleashed) {
            /* this can happen if your quest leader ejects you from the
               "home" level while a leashed pet isn't next to you */
            C.pline("%s leash goes slack.", C.s_suffix(C.Monnam(mtmp)));
            C.m_unleash(mtmp, 0);
        }
    }
}

export function migrate_to_level(mtmp, tolev, xyloc, cc)
/* destination level */ /* MIGR_xxx destination xy location: */ /* optional destination coordinates */
{
    tolev = C.short(tolev); xyloc = C.short(xyloc);
    const new_lev = C.levelLocal();
    let xyflags;
    let mx = mtmp.mx, my = mtmp.my; /* <mx,my> needed below */
    let num_segs; /* count of worm segments */

    if (mtmp.mleashed) {
        mtmp.mtame--;
        C.m_unleash(mtmp, 1);
    }

    /* prepare to take mtmp off the map */
    num_segs = mon_leave(mtmp);
    /* take off map and move mtmp from fmon list to migrating_mons */
    C.relmon(mtmp, C.monsterLink(C.gm, "migrating_mons")); /* mtmp->mx,my retain their value */
    mtmp.mstate |= C.MON_MIGRATING;

    new_lev.dnum = C.ledger_to_dnum(C.short(tolev));
    new_lev.dlevel = C.ledger_to_dlev(C.short(tolev));
    /* overload mtmp->[mx,my], mtmp->[mux,muy], and mtmp->mtrack[] as
       destination codes */
    xyflags = (C.depth(new_lev) < C.depth(C.u.uz)); /* 1 => up */
    if (C.In_W_tower(mx, my, C.u.uz))
        xyflags |= 2;
    mtmp.wormno = num_segs;
    mtmp.mlstmv = C.svm.moves;
    mtmp.mtrack[2].x = C.u.uz.dnum; /* migrating from this dungeon */
    mtmp.mtrack[2].y = C.u.uz.dlevel; /* migrating from this dungeon level */
    mtmp.mtrack[1].x = cc ? cc.x : mx;
    mtmp.mtrack[1].y = cc ? cc.y : my;
    mtmp.mtrack[0].x = xyloc;
    mtmp.mtrack[0].y = xyflags;
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */

    /* don't extinguish a mobile light; it still exists but has changed
       from local (monst->mx > 0) to global (mx==0, not on this level) */
    if (C.emits_light(mtmp.data))
        C.vision_recalc(0);
}

/* when entering the endgame, levels from the dungeon and its branches are
   discarded because they can't be reached again; do the same for monsters
   and objects scheduled to migrate to those levels */
export function discard_migrations()
{
    let mtmp, mprev;
    let otmp, oprev;
    const dest = C.levelLocal();

    for (mprev = C.monsterLink(C.gm, "migrating_mons"); (mtmp = mprev.value) != 0; ) {
        dest.dnum = mtmp.mux;
        dest.dlevel = mtmp.muy;
        /* the Wizard is kept regardless of location so that he is
           ready to be brought back; nothing should be scheduled to
           migrate to the endgame but if we find such, we'll keep it */
        if (mtmp.iswiz || C.In_endgame(dest)) {
            mprev = C.monsterLink(mtmp, "nmon"); /* keep mtmp on migrating_mons */
        } else {
            mprev.value = mtmp.nmon; /* remove mtmp from migrating_mons */
            mtmp.nmon = 0;
            C.discard_minvent(mtmp, 0);
            /* bypass mongone() and its call to m_detach() plus dmonsfree() */
            if (C.emits_light(mtmp.data))
                C.del_light_source(C.LS_MONSTER, C.monst_to_any(mtmp));
            C.dealloc_monst(mtmp);
        }
    }

    /* objects get similar treatment */
    for (oprev = C.objectLink(C.gm, "migrating_objs"); (otmp = oprev.value) != 0; ) {
        dest.dnum = otmp.ox;
        dest.dlevel = otmp.oy;
        /* there is no special case like the Wizard (certainly not the
           Amulet; the hero has to be carrying it to enter the endgame
           which triggers the call to this routine); again we don't
           expect any objects to be migrating to the endgame but will
           keep any we find so that they could be delivered */
        if (C.In_endgame(dest)) {
            oprev = C.objectLink(otmp, "nobj"); /* keep otmp on migrating_objs */
        } else {
            /* bypass obj_extract_self() */
            oprev.value = otmp.nobj; /* remove otmp from migrating_objs */
            otmp.nobj = 0;
            otmp.where = C.OBJ_FREE;
            otmp.owornmask = 0n; /* overloaded for destination usage;
                                   * obfree() will complain if nonzero */
            /*
             * obfree(otmp,)
             *  -> dealloc_obj(otmp)
             *      -> obj_stop_timers(otmp)
             *      -> del_light_source(LS_OBJECT, obj_to_any(otmp))
             */
            C.obfree(otmp, 0); /* releases any contents too */
        }
    }
}

/* returns the quality of an item of food; the lower the better;
   fungi and ghouls will eat even tainted food */
export function dogfood(mon, obj)
{
    let mptr = mon.data, fptr;
    let carni = C.carnivorous(mptr), herbi = C.herbivorous(mptr),
            starving, mblind;
    let fx;

    if (obj.opoisoned && !C.resists_poison(mon))
        return C.POISON;
    if (C.is_quest_artifact(obj) || C.obj_resists(obj, 0, 95))
        return obj.cursed ? C.TABU : C.APPORT;

    switch (obj.oclass) {
    case C.FOOD_CLASS:
        fx = (obj.otyp == C.CORPSE || obj.otyp == C.TIN || obj.otyp == C.EGG)
                /* corpsenm might be NON_PM (special tin, unhatchable egg) */
                ? obj.corpsenm
                : C.NON_PM;
        /* mons[NUMMONS] is a valid array entry, though not a valid monster;
         * predicate tests against it will fail */
        fptr = C.mons[(C.ismnum(fx)) ? fx : C.NUMMONS];

        if (obj.otyp == C.CORPSE && C.is_rider(fptr))
            return C.TABU;
        if ((obj.otyp == C.CORPSE || obj.otyp == C.EGG)
            && C.flesh_petrifies(fptr) /* c*ckatrice or Medusa */
            && !C.resists_ston(mon))
            return C.POISON;
        if (obj.otyp == C.LUMP_OF_ROYAL_JELLY
            && C.samePtr(mon.data, C.mons[C.PM_KILLER_BEE])) {
            let mtmp = C.find_pmmonst(C.PM_QUEEN_BEE);

            /* if there's a queen bee on the level, don't eat royal jelly;
               if there isn't, do eat it and grow into a queen */
            return !mtmp ? C.DOGFOOD : C.TABU;
        }
        if (!carni && !herbi)
            return obj.cursed ? C.UNDEF : C.APPORT;

        /* a starving pet will eat almost anything */
        starving = (mon.mtame && !mon.isminion
                    && C.EDOG(mon).mhpmax_penalty);
        /* even carnivores will eat carrots if they're temporarily blind */
        mblind = (!mon.mcansee && C.haseyes(mon.data));

        /* ghouls prefer old corpses and unhatchable eggs, yum!
           they'll eat fresh non-veggy corpses and hatchable eggs
           when starving; they never eat stone-to-flesh'd meat */
        if (C.samePtr(mptr, C.mons[C.PM_GHOUL])) {
            if (obj.otyp == C.CORPSE)
                return (C.long(C.peek_at_iced_corpse_age(obj) + 50n) <= C.svm.moves
                        && !(fx == C.PM_LIZARD || fx == C.PM_LICHEN)) ? C.DOGFOOD
                       : (starving && !C.vegan(fptr)) ? C.ACCFOOD
                         : C.POISON;
            if (obj.otyp == C.EGG)
                return C.stale_egg(obj) ? C.CADAVER : starving ? C.ACCFOOD : C.POISON;
            return C.TABU;
        }

        switch (obj.otyp) {
        case C.TRIPE_RATION:
        case C.MEATBALL:
        case C.MEAT_RING:
        case C.MEAT_STICK:
        case C.ENORMOUS_MEATBALL:
            return carni ? C.DOGFOOD : C.MANFOOD;
        case C.EGG:
            if (obj.corpsenm == C.PM_PYROLISK && !C.likes_fire(mptr))
                return C.POISON;
            return carni ? C.CADAVER : C.MANFOOD;
        case C.CORPSE:
            if ((C.long(C.peek_at_iced_corpse_age(obj) + 50n) <= C.svm.moves
                 && !(fx == C.PM_LIZARD || fx == C.PM_LICHEN)
                 && mptr.mlet != C.S_FUNGUS)
                || (C.acidic(fptr) && !C.resists_acid(mon))
                || (C.poisonous(fptr) && !C.resists_poison(mon)))
                return C.POISON;
            /* avoid polymorph unless starving or abused (in which case the
               pet will consider it for a chance to become more powerful) */
            else if (C.polyfood(obj) && mon.mtame > 1 && !starving)
                return C.MANFOOD;
            else if (C.vegan(fptr))
                return herbi ? C.CADAVER : C.MANFOOD;
            /* most humanoids will avoid cannibalism unless starving;
               arbitrary: elves won't eat other elves even then */
            else if (C.humanoid(mptr) && C.same_race(mptr, fptr)
                     && (!C.is_undead(mptr) && fptr.mlet != C.S_KOBOLD
                         && fptr.mlet != C.S_ORC && fptr.mlet != C.S_OGRE))
                return (starving && carni && !C.is_elf(mptr)) ? C.ACCFOOD : C.TABU;
            else
                return carni ? C.CADAVER : C.MANFOOD;
        case C.GLOB_OF_GREEN_SLIME: /* other globs use the default case */
            /* turning into slime is preferable to starvation */
            return (starving || C.slimeproof(mon.data)) ? C.ACCFOOD : C.POISON;
        case C.CLOVE_OF_GARLIC:
            return (C.is_undead(mptr) || C.is_vampshifter(mon)) ? C.TABU
                   : (herbi || starving) ? C.ACCFOOD
                     : C.MANFOOD;
        case C.TIN:
            return C.metallivorous(mptr) ? C.ACCFOOD : C.MANFOOD;
        case C.APPLE:
            return herbi ? C.DOGFOOD : starving ? C.ACCFOOD : C.MANFOOD;
        case C.CARROT:
            return (herbi || mblind) ? C.DOGFOOD : starving ? C.ACCFOOD : C.MANFOOD;
        case C.BANANA:
            /* monkeys and apes (tamable) plus sasquatch prefer these,
               yetis will only will only eat them if starving */
            return (mptr.mlet == C.S_YETI && herbi) ? C.DOGFOOD
                   : (herbi || starving) ? C.ACCFOOD
                     : C.MANFOOD;
        default:
            if (starving)
                return C.ACCFOOD;
            return (obj.otyp > C.SLIME_MOLD) ? (carni ? C.ACCFOOD : C.MANFOOD)
                                            : (herbi ? C.ACCFOOD : C.MANFOOD);
        }
    default:
        if (obj.otyp == C.AMULET_OF_STRANGULATION
            || obj.otyp == C.RIN_SLOW_DIGESTION)
            return C.TABU;
        if (C.mon_hates_silver(mon) && C.objects[obj.otyp].oc_material == C.SILVER)
            return C.TABU;
        if (C.samePtr(mptr, C.mons[C.PM_GELATINOUS_CUBE]) && C.is_organic(obj))
            return C.ACCFOOD;
        if (C.metallivorous(mptr) && C.is_metallic(obj)
            && (C.is_rustprone(obj) || !C.samePtr(mptr, C.mons[C.PM_RUST_MONSTER]))) {
            /* Non-rustproofed ferrous-based metals are preferred. */
            return (C.is_rustprone(obj) && !obj.oerodeproof) ? C.DOGFOOD
                                                            : C.ACCFOOD;
        }
        if (!obj.cursed
            && obj.oclass != C.BALL_CLASS
            && obj.oclass != C.CHAIN_CLASS)
            return C.APPORT;
        
        /*FALLTHRU*/
    case C.ROCK_CLASS:
        return C.UNDEF;
    }
}

/*
 * tamedog() used to return the monster, which might have changed address
 * if a new one was created in order to allocate the edog extension.
 * With the separate mextra structure added in 3.6.x it always operates
 * on the original mtmp.  It now returns TRUE if the taming succeeded.
 */
export function tamedog(mtmp, obj, givemsg)
/* food or scroll/spell */
{
    givemsg = C.boolean(givemsg);
    let blessed_scroll = 0;

    if (obj && (obj.oclass == C.SCROLL_CLASS || obj.oclass == C.SPBOOK_CLASS)) {
        blessed_scroll = obj.blessed ? 1 : 0;
        /* the rest of this routine assumes 'obj' represents food */
        obj = 0;
    }
    /* reduce timed sleep or paralysis, leaving mtmp->mcanmove as-is
       (note: if mtmp is donning armor, this will reduce its busy time) */
    if (mtmp.mfrozen)
        mtmp.mfrozen = Math.trunc((mtmp.mfrozen + 1) / 2);
    /* end indefinite sleep; using distance==1 limits the waking to mtmp */
    if (mtmp.msleeping)
        C.wake_nearto(mtmp.mx, mtmp.my, 1); /* [different from wakeup()] */

    /* The Wiz, Medusa and the quest nemeses aren't even made peaceful. */
    if (mtmp.iswiz || C.samePtr(mtmp.data, C.mons[C.PM_MEDUSA])
        || (mtmp.data.mflags3 & C.M3_WANTSARTI))
        return 0;

    /* worst case, at least it'll be peaceful. */
    if (givemsg && !mtmp.mpeaceful && C.canspotmon(mtmp)) {
        C.pline_mon(mtmp, "%s seems %s.", C.Monnam(mtmp),
              C.Hallucination ? "really chill" : "more amiable");
        givemsg = 0; /* don't give another message below */
    }
    mtmp.mpeaceful = 1;
    C.set_malign(mtmp);
    if (C.flags.moonphase == C.FULL_MOON && C.night() && C.rn2(6, 1176, 'tamedog') && obj
        && mtmp.data.mlet == C.S_DOG)
        return 0;

    /* If we cannot tame it, at least it's no longer afraid. */
    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    /* make grabber let go now, whether it becomes tame or not */
    if (C.samePtr(mtmp, C.u.ustuck)) {
        if (C.u.uswallow)
            C.expels(mtmp, mtmp.data, 1);
        else if (!(C.Upolyd && C.sticks(C.gy.youmonst.data)))
            C.unstuck(mtmp);
    }

    /* feeding it treats makes it tamer */
    if (mtmp.mtame && obj) {
        let tasty;

        if (mtmp.mcanmove && !mtmp.mconf && !mtmp.meating
            && ((tasty = dogfood(mtmp, obj)) == C.DOGFOOD
                || (tasty <= C.ACCFOOD
                    && C.EDOG(mtmp).hungrytime <= C.svm.moves))) {
            /* pet will "catch" and eat this thrown food */
            if (C.canseemon(mtmp)) {
                let big_corpse =
                    (obj.otyp == C.CORPSE && C.ismnum(obj.corpsenm)
                     && C.mons[obj.corpsenm].msize > mtmp.data.msize);
                C.pline_mon(mtmp, "%s catches %s%s",
                          C.Monnam(mtmp), C.the(C.xname(obj)),
                         !big_corpse ? "." : ", or vice versa!");
            } else if (C.cansee(mtmp.mx, mtmp.my))
                C.pline("%s.", C.Tobjnam(obj, "stop"));
            /* dog_eat expects a floor object */
            C.place_object(obj, mtmp.mx, mtmp.my);
            C.dog_eat(mtmp, obj, mtmp.mx, mtmp.my, 0);
            /* eating might have killed it, but that doesn't matter here;
               a non-null result suppresses "miss" message for thrown
               food and also implies that the object has been deleted */
            return 1;
        } else
            return 0;
    }

    /* maximum tameness is 20, only reachable via eating; if already tame but
       less than 10, taming magic might make it become tamer; blessed scroll
       or skilled spell raises low tameness by 2 or 3, uncursed by 0 or 1 */
    if (mtmp.mtame && mtmp.mtame < 10) {
        if (mtmp.mtame < C.rnd(10, 1225, 'tamedog'))
            mtmp.mtame++;
        if (blessed_scroll) {
            mtmp.mtame += 2;
            if (mtmp.mtame > 10)
                mtmp.mtame = 10;
        }
        return 0; /* didn't just get tamed */
    }
    /* pacify angry shopkeeper but don't tame him/her/it/them */
    if (mtmp.isshk) {
        C.make_happy_shk(mtmp, 0);
        return 0;
    }

    if (!mtmp.mcanmove
        /* monsters with conflicting structures cannot be tamed
           [note: the various mextra structures don't actually conflict
           with each other anymore] */
        || mtmp.isshk || mtmp.isgd || mtmp.ispriest || mtmp.isminion
        || C.is_covetous(mtmp.data) || C.is_human(mtmp.data)
        || (C.is_demon(mtmp.data) && !C.is_demon(C.gy.youmonst.data))
        || (obj && dogfood(mtmp, obj) >= C.MANFOOD))
        return 0;

    if (mtmp.m_id == C.svq.quest_status.leader_m_id)
        return 0;

    /* add the pet extension */
    if (!C.has_edog(mtmp)) {
        newedog(mtmp);
        initedog(mtmp, 1);
    } else {
        initedog(mtmp, 0);
    }

    if (obj) { /* thrown food */
        /* defer eating until the edog extension has been set up */
        C.place_object(obj, mtmp.mx, mtmp.my); /* put on floor */
        /* devour the food (might grow into larger, genocided monster) */
        if (C.dog_eat(mtmp, obj, mtmp.mx, mtmp.my, 1) == 2)
            return 1; /* oops, it died... */
        /* `obj' is now obsolete */
    }

    if (givemsg && C.canspotmon(mtmp))
        C.pline_mon(mtmp, "%s seems quite %s.", C.Monnam(mtmp),
              C.Hallucination ? "approachable" : "friendly");

    C.newsym(mtmp.mx, mtmp.my);
    if (mtmp.wormno)
        C.redraw_worm(mtmp);
    if (C.attacktype(mtmp.data, C.AT_WEAP)) {
        mtmp.weapon_check = C.NEED_HTH_WEAPON;
        C.mon_wield_item(mtmp);
    }
    return 1;
}

/*
 * Called during pet revival or pet life-saving.
 * If you killed the pet, it revives wild.
 * If you abused the pet a lot while alive, it revives wild.
 * If you abused the pet at all while alive, it revives untame.
 * If the pet wasn't abused and was very tame, it might revive tame.
 */
export function wary_dog(mtmp, was_dead)
{
    was_dead = C.boolean(was_dead);
    let edog;
    let quietly = was_dead;

    C.finish_meating(mtmp);

    if (!mtmp.mtame)
        return;
    edog = !mtmp.isminion ? C.EDOG(mtmp) : 0;

    /* if monster was starving when it died, undo that now */
    if (edog && edog.mhpmax_penalty) {
        mtmp.mhpmax += edog.mhpmax_penalty;
        mtmp.mhp += edog.mhpmax_penalty; /* heal it */
        edog.mhpmax_penalty = 0;
    }

    if (edog && (edog.killed_by_u == 1 || edog.abuse > 2)) {
        mtmp.mpeaceful = mtmp.mtame = 0;
        if (edog.abuse >= 0 && edog.abuse < 10)
            if (!C.rn2(edog.abuse + 1, 1313, 'wary_dog'))
                mtmp.mpeaceful = 1;
        if (!quietly && C.cansee(mtmp.mx, mtmp.my)) {
            if (C.haseyes(C.gy.youmonst.data)) {
                if (C.haseyes(mtmp.data))
                    C.pline_mon(mtmp,
                             "%s %s to look you in the %s.", C.Monnam(mtmp),
                             mtmp.mpeaceful ? "seems unable" : "refuses",
                             C.body_part(C.EYE));
                else
                    C.pline_mon(mtmp, "%s avoids your gaze.", C.Monnam(mtmp));
            }
        }
    } else {
        /* chance it goes wild anyway - Pet Sematary */
        mtmp.mtame = C.rn2(mtmp.mtame + 1, 1328, 'wary_dog');
        if (!mtmp.mtame)
            mtmp.mpeaceful = C.rn2(2, 1330, 'wary_dog');
    }

    if (!mtmp.mtame) {
        if (!quietly && C.canspotmon(mtmp))
            C.pline_mon(mtmp, "%s %s.", C.Monnam(mtmp),
                  mtmp.mpeaceful ? "is no longer tame" : "has become feral");
        C.newsym(mtmp.mx, mtmp.my);
        /* a life-saved monster might be leashed;
           don't leave it that way if it's no longer tame */
        if (mtmp.mleashed)
            C.m_unleash(mtmp, 1);
        if (C.samePtr(mtmp, C.u.usteed))
            C.dismount_steed(C.DISMOUNT_THROWN);
    } else if (edog) {
        /* it's still a pet; start a clean pet-slate now */
        edog.revivals++;
        edog.killed_by_u = 0;
        edog.abuse = 0;
        edog.ogoal.x = edog.ogoal.y = -1;
        if (was_dead || edog.hungrytime < C.long(C.svm.moves + 500n))
            edog.hungrytime = C.long(C.svm.moves + 500n);
        if (was_dead) {
            edog.droptime = 0n;
            edog.dropdist = 10000;
            edog.whistletime = 0n;
            edog.apport = 5;
        } /* else lifesaved, so retain current values */
    }
}

export function abuse_dog(mtmp)
{
    if (!mtmp.mtame)
        return;

    if (C.Aggravate_monster || C.Conflict)
        mtmp.mtame = Math.trunc(mtmp.mtame / 2);
    else
        mtmp.mtame--;

    if (mtmp.mtame && !mtmp.isminion)
        C.EDOG(mtmp).abuse++;

    if (!mtmp.mtame && mtmp.mleashed)
        C.m_unleash(mtmp, 1);

    /* don't make a sound if pet is in the middle of leaving the level */
    /* newsym isn't necessary in this case either */
    if (mtmp.mx != 0) {
        if (mtmp.mtame && C.rn2(mtmp.mtame, 1381, 'abuse_dog'))
            C.yelp(mtmp);
        else
            C.growl(mtmp); /* give them a moment's worry */

        if (!mtmp.mtame) {
            C.newsym(mtmp.mx, mtmp.my);
            if (mtmp.wormno) {
                C.redraw_worm(mtmp);
            }
        }
    }
}

/*dog.c*/

/* monsters kept on migrating_mons for accessibility;
                      * they haven't actually left their level */

/* pets and level followers */

/* regular migrating monsters */

/* resurrect(wizard.c) */
