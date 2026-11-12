/* NetHack 5.0	fountain.c	$NHDT-Date: 1699582923 2023/11/10 02:22:03 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.100 $ */
/*      Copyright Scott R. Turner, srt@ucla, 10/27/86 */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* Code for drinking from fountains. */




/* used when trying to dip in or drink from fountain or sink or pool while
   levitating above it, or when trying to move downwards in that state */
export function floating_above(what)
{
    let umsg = "are floating high above the %s.";

    if (C.u.utrap && (C.u.utraptype == C.TT_INFLOOR || C.u.utraptype == C.TT_LAVA)) {
        /* when stuck in floor (not possible at fountain or sink location,
           so must be attempting to move down), override the usual message */
        umsg = "are trapped in the %s.";
        what = C.surface(C.u.ux, C.u.uy); /* probably redundant */
    }
    C.You(umsg, what);
}


/* Fountain of snakes! */
export function dowatersnakes()
{
    let num = (C.rn2(5, 40, 0) + 2);
    let mtmp;

    if (!(C.svm.mvitals[C.PM_WATER_MOCCASIN].mvflags & C.G_GONE)) {
        if (!C.Blind) {
            C.pline("An endless stream of %s pours forth!",
                  C.Hallucination ? C.makeplural(C.rndmonnam(0)) : "snakes");
        } else {
            // C.Soundeffect(se_snakes_hissing, 75) (inactive configured macro)
            C.You_hear("%s hissing!", C.something);
        }
        while (num-- > 0)
            if ((mtmp = C.makemon(C.mons[C.PM_WATER_MOCCASIN], C.u.ux, C.u.uy,
                                C.MM_NOMSG)) != 0
                && C.t_at(mtmp.mx, mtmp.my))
                C.mintrap(mtmp, C.NO_TRAP_FLAGS);
    } else {
        // C.Soundeffect(se_furious_bubbling, 20) (inactive configured macro)
        C.pline_The("fountain bubbles furiously for a moment, then calms.");
    }
}

/* Water demon */
export function dowaterdemon()
{
    let mtmp = C.monsterPointerLocal();

    if (!(C.svm.mvitals[C.PM_WATER_DEMON].mvflags & C.G_GONE)) {
        if ((mtmp.value = C.makemon(C.mons[C.PM_WATER_DEMON], C.u.ux, C.u.uy,
                            C.MM_NOMSG)) != 0) {
            if (!C.Blind)
                C.You("unleash %s!", C.a_monnam(mtmp.value));
            else
                C.You_feel("the presence of evil.");

            /* Give those on low levels a (slightly) better chance of survival
             */
            if (C.rnd(100, 78, 1) > (80 + C.level_difficulty())) {
                C.pline("Grateful for %s release, %s grants you a wish!",
                      C.mhis(mtmp.value), C.mhe(mtmp.value));
                /* give a wish and discard the monster (mtmp set to null) */
                C.mongrantswish(mtmp);
            } else if (C.t_at(mtmp.value.mx, mtmp.value.my))
                C.mintrap(mtmp.value, C.NO_TRAP_FLAGS);
        }
    } else {
        // C.Soundeffect(se_furious_bubbling, 20) (inactive configured macro)
        C.pline_The("fountain bubbles furiously for a moment, then calms.");
    }
}

/* Water Nymph */
export function dowaternymph()
{
    let mtmp;

    if (!(C.svm.mvitals[C.PM_WATER_NYMPH].mvflags & C.G_GONE)
        && (mtmp = C.makemon(C.mons[C.PM_WATER_NYMPH], C.u.ux, C.u.uy,
                           C.MM_NOMSG)) != 0) {
        if (!C.Blind)
            C.You("attract %s!", C.a_monnam(mtmp));
        else
            C.You_hear("a seductive voice.");
        mtmp.msleeping = 0;
        if (C.t_at(mtmp.mx, mtmp.my))
            C.mintrap(mtmp, C.NO_TRAP_FLAGS);
    } else if (!C.Blind) {
        // C.Soundeffect(se_bubble_rising, 50) (inactive configured macro)
        // C.Soundeffect(se_loud_pop, 50) (inactive configured macro)
        C.pline("A large bubble rises to the surface and pops.");
    } else {
        // C.Soundeffect(se_loud_pop, 50) (inactive configured macro)
        C.You_hear("a loud pop.");
    }
}

/* Gushing forth along LOS from (u.ux, u.uy) */
export function dogushforth(drinking)
{
    drinking = C.int(drinking);
    let madepool = C.intLocal();
    madepool.value = 0;

    C.do_clear_area(C.u.ux, C.u.uy, 7, gush, madepool);
    if (!madepool.value) {
        if (drinking)
            C.Your("thirst is quenched.");
        else
            C.pline("Water sprays all over you.");
    }
}

export function gush(x, y, poolcnt)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let mtmp;
    let ttmp;

    if (((x + y) % 2) || C.u_at(x, y)
        || (C.rn2(1 + C.distmin(C.u.ux, C.u.uy, x, y), 140, 3)) || (C.levl[x][y].typ != C.ROOM)
        || (C.sobj_at(C.BOULDER, x, y)) || C.nexttodoor(x, y))
        return;

    if ((ttmp = C.t_at(x, y)) != 0 && !C.delfloortrap(ttmp))
        return;

    if (!(poolcnt.value++))
        C.pline("Water gushes forth from the overflowing fountain!");

    /* Put a pool at x, y */
    C.set_levltyp(x, y, C.POOL);
    C.levl[x][y].flags = 0;
    /* No kelp! */
    C.del_engr_at(x, y);
    C.water_damage_chain(C.svl.level.objects[x][y], 1);

    if ((mtmp = C.m_at(x, y)) != 0)
        C.minliquid(mtmp);
    else
        C.newsym(x, y);
}

/* Find a gem in the sparkling waters. */
export function dofindgem()
{
    if (!C.Blind)
        C.You("spot a gem in the sparkling waters!");
    else
        C.You_feel("a gem here!");
    C.mksobj_at(C.rnd_class(C.DILITHIUM_CRYSTAL, C.LUCKSTONE - 1), C.u.ux, C.u.uy,
                     0, 0);
    C.SET_FOUNTAIN_LOOTED(C.u.ux, C.u.uy);
    C.newsym(C.u.ux, C.u.uy);
    C.exercise(C.A_WIS, 1); /* a discovery! */
}

export function watchman_warn_fountain(mtmp)
{
    if (C.is_watch(mtmp.data) && C.couldsee(mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        if (!C.Deaf) {
            C.pline("%s yells:", C.Amonnam(mtmp));
            C.verbalize("Hey, stop using that fountain!");
        } else {
            C.pline("%s earnestly %s %s %s!",
                  C.Amonnam(mtmp),
                  C.nolimbs(mtmp.data) ? "shakes" : "waves",
                  C.mhis(mtmp),
                  C.nolimbs(mtmp.data)
                  ? C.mbodypart(mtmp, C.HEAD)
                  : C.makeplural(C.mbodypart(mtmp, C.ARM)));
        }
        return 1;
    }
    return 0;
}

export function dryup(x, y, isyou)
{
    isyou = C.boolean(isyou);
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (C.IS_FOUNTAIN(C.levl[x][y].typ)
        && (!C.rn2(3, 204, 5) || C.FOUNTAIN_IS_WARNED(x, y))) {
        if (isyou && C.in_town(x, y) && !C.FOUNTAIN_IS_WARNED(x, y)) {
            let mtmp;

            C.SET_FOUNTAIN_WARNED(x, y);
            /* Warn about future fountain use. */
            mtmp = C.get_iter_mons(watchman_warn_fountain);
            /* You can see or hear this effect */
            if (!mtmp)
                C.pline_The("flow reduces to a trickle.");
            return;
        }
        if (isyou && C.wizard) {
            if (C.y_n("Dry up fountain?") == 'n'.charCodeAt(0))
                return;
        }
        /* FIXME: sight-blocking clouds should use block_point() when
           being created and unblock_point() when going away, then this
           glyph hackery wouldn't be necessary */
        if (C.cansee(x, y)) {
            let glyph = C.glyph_at(x, y);

            if (!C.glyph_is_cmap(glyph) || C.glyph_to_cmap(glyph) != C.S_cloud)
                C.pline_The("fountain dries up!");
        }
        /* replace the fountain with ordinary floor */
        C.set_levltyp(x, y, C.ROOM); /* updates level.flags.nfountains */
        C.levl[x][y].flags = 0;
        C.levl[x][y].blessedftn = 0;
        /* The location is seen if the hero/monster is invisible
           or felt if the hero is blind. */
        C.newsym(x, y);
        if (isyou && C.in_town(x, y))
            C.angry_guards(0);
    }
}

/* quaff from a fountain when standing on its location */
export function drinkfountain()
{
    /* What happens when you drink from a fountain? */
    let mgkftn = (C.levl[C.u.ux][C.u.uy].blessedftn == 1);
    let fate = C.rnd(30, 247, 6);

    if (C.Levitation) {
        floating_above("fountain");
        return;
    }

    if (mgkftn && C.u.uluck >= 0 && fate >= 10) {
        let i, ii, littleluck = (C.u.uluck < 4);

        C.pline("Wow!  This makes you feel great!");
        /* blessed restore ability */
        for (ii = 0; ii < C.A_MAX; ii++)
            if (C.u.acurr.a[ii] < C.u.amax.a[ii]) {
                C.u.acurr.a[ii] = C.u.amax.a[ii];
                C.disp.botl = 1;
            }
        /* gain ability, blessed if "natural" luck is high */
        i = C.rn2(C.A_MAX, 265, 6); /* start at a random attribute */
        for (ii = 0; ii < C.A_MAX; ii++) {
            if (C.adjattrib(i, 1, littleluck ? -1 : 0) && littleluck)
                break;
            if (++i >= C.A_MAX)
                i = 0;
        }
        C.display_nhwindow(C.WIN_MESSAGE, 0);
        C.pline("A wisp of vapor escapes the fountain...");
        C.exercise(C.A_WIS, 1);
        C.levl[C.u.ux][C.u.uy].blessedftn = 0;
        return;
    }

    if (fate < 10) {
        C.pline_The("cool draught refreshes you.");
        C.u.uhunger += C.rnd(10, 281, 6); /* don't choke on water */
        C.newuhs(0);
        if (mgkftn)
            return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            C.You_feel("self-knowledgeable...");
            C.display_nhwindow(C.WIN_MESSAGE, 0);
            C.enlightenment(C.MAGICENLIGHTENMENT, C.ENL_GAMEINPROGRESS);
            C.exercise(C.A_WIS, 1);
            C.pline_The("feeling subsides.");
            break;
        case 20: /* Foul water */
            C.pline_The("water is foul!  You gag and vomit.");
            C.morehungry((C.rn2(20, 296, 6) + 11));
            C.vomit();
            break;
        case 21: /* Poisonous */
            C.pline_The("water is contaminated!");
            if (C.Poison_resistance) {
                C.pline("Perhaps it is runoff from the nearby %s farm.",
                      C.fruitname(0));
                C.losehp(C.rnd(4, 304, 6), "unrefrigerated sip of juice", C.KILLED_BY_AN);
                break;
            }
            C.poison_strdmg((C.rn2(4, 307, 6) + 3), C.rnd(10, 307, 6), "contaminated water",
                          C.KILLED_BY);
            C.exercise(C.A_CON, 0);
            break;
        case 22: /* Fountain of snakes! */
            dowatersnakes();
            break;
        case 23: /* Water demon */
            dowaterdemon();
            break;
        case 24: { /* Maybe curse some items */
            let obj, nextobj;
            let buc_changed = 0;

            C.pline("This water's no good!");
            C.morehungry((C.rn2(20, 322, 6) + 11));
            C.exercise(C.A_CON, 0);
            /* this is more severe than rndcurse() */
            for (obj = C.gi.invent; obj; obj = nextobj) {
                nextobj = obj.nobj;
                if (obj.oclass != C.COIN_CLASS && !obj.cursed && !C.rn2(5, 327, 6)) {
                    C.curse(obj);
                    ++buc_changed;
                }
            }
            if (buc_changed)
                C.update_inventory();
            break;
        }
        case 25: /* See invisible */
            if (C.Blind) {
                if (C.Invisible) {
                    C.You("feel transparent.");
                } else {
                    C.You("feel very self-conscious.");
                    C.pline("Then it passes.");
                }
            } else {
                C.You_see("an image of someone stalking you.");
                C.pline("But it disappears.");
            }
            C.HSee_invisible |= C.FROMOUTSIDE;
            C.newsym(C.u.ux, C.u.uy);
            C.exercise(C.A_WIS, 1);
            break;
        case 26: /* See Monsters */
            if (C.monster_detect(0, 0))
                C.pline_The("%s tastes like nothing.", C.hliquid("water"));
            C.exercise(C.A_WIS, 1);
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!C.FOUNTAIN_IS_LOOTED(C.u.ux, C.u.uy)) {
                dofindgem();
                break;
            }
            // FALLTHROUGH;
            /*FALLTHRU*/
        case 28: /* Water Nymph */
            dowaternymph();
            break;
        case 29: /* Scare */
        {
            let mtmp;

            C.pline("This %s gives you bad breath!",
                  C.hliquid("water"));
            for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                if (C.DEADMONSTER(mtmp))
                    continue;
                C.monflee(mtmp, 0, 0, 0);
            }
            break;
        }
        case 30: /* Gushing forth in this room */
            dogushforth(1);
            break;
        default:
            C.pline("This tepid %s is tasteless.",
                  C.hliquid("water"));
            break;
        }
    }
    dryup(C.u.ux, C.u.uy, 1);
}

/* dip an object into a fountain when standing on its location */
export function dipfountain(obj)
{
    let er = C.ER_NOTHING;
    let is_hands = (obj.address == C.hands_obj.address);

    if (C.Levitation) {
        floating_above("fountain");
        return;
    }

    if (obj.otyp == C.LONG_SWORD && C.u.ulevel >= 5
        && !C.rn2(C.Role_if(C.PM_KNIGHT) ? 6 : 30, 405, 7)
        /* once upon a time it was possible to poly N daggers into N swords */
        && obj.quan == 1n && !obj.oartifact
        && !C.exist_artifact(C.LONG_SWORD, C.artiname(C.ART_EXCALIBUR))) {
        const lady = "Lady of the Lake";

        if (C.u.ualign.type != C.A_LAWFUL) {
            /* Ha!  Trying to cheat her. */
            C.pline("A freezing mist rises from the %s" +
                  " and envelopes the sword.",
                  C.hliquid("water"));
            C.pline_The("fountain disappears!");
            C.curse(obj);
            if (obj.spe > -6 && !C.rn2(3, 418, 7))
                obj.spe--;
            obj.oerodeproof = 0;
            C.exercise(C.A_WIS, 0);
            C.livelog_printf(C.LL_ARTIFACT,
                           "was denied %s!  The %s has deemed %s unworthy",
                           C.artiname(C.ART_EXCALIBUR), lady, C.uhim());
        } else {
            /* The lady of the lake acts! - Eric Backus */
            /* Be *REAL* nice */
            C.pline(
              "From the murky depths, a hand reaches up to bless the sword.");
            C.pline("As the hand retreats, the fountain disappears!");
            obj = C.oname(obj, C.artiname(C.ART_EXCALIBUR),
                        C.ONAME_VIA_DIP | C.ONAME_KNOW_ARTI);
            C.discover_artifact(C.ART_EXCALIBUR);
            C.bless(obj);
            obj.oeroded = obj.oeroded2 = 0;
            obj.oerodeproof = 1;
            C.exercise(C.A_WIS, 1);
            C.livelog_printf(C.LL_ARTIFACT, "was given %s by the %s",
                           C.artiname(C.ART_EXCALIBUR), lady);
        }
        C.update_inventory();
        C.set_levltyp(C.u.ux, C.u.uy, C.ROOM); /* updates level.flags.nfountains */
        C.levl[C.u.ux][C.u.uy].flags = 0;
        C.newsym(C.u.ux, C.u.uy);
        if (C.in_town(C.u.ux, C.u.uy))
            C.angry_guards(0);
        return;
    } else if (is_hands || obj.address == (C.uarmg?.address ?? 0)) {
        er = wash_hands();
    } else {
        er = C.water_damage(obj, 0, 1);
    }

    if (er == C.ER_DESTROYED || (er != C.ER_NOTHING && !C.rn2(2, 454, 7))) {
        return; /* no further effect */
    }

    switch (C.rnd(30, 458, 7)) {
    case 16: /* Curse the item */
        if (!is_hands && obj.oclass != C.COIN_CLASS && !obj.cursed) {
            C.curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: /* Uncurse the item */
        if (!is_hands && obj.cursed) {
            if (!C.Blind)
                C.pline_The("%s glows for a moment.", C.hliquid("water"));
            C.uncurse(obj);
        } else {
            C.pline("A feeling of loss comes over you.");
        }
        break;
    case 21: /* Water Demon */
        dowaterdemon();
        break;
    case 22: /* Water Nymph */
        dowaternymph();
        break;
    case 23: /* an Endless Stream of Snakes */
        dowatersnakes();
        break;
    case 24: /* Find a gem */
        if (!C.FOUNTAIN_IS_LOOTED(C.u.ux, C.u.uy)) {
            dofindgem();
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 25: /* Water gushes forth */
        dogushforth(0);
        break;
    case 26: /* Strange feeling */
        C.pline("A strange tingling runs up your %s.", C.body_part(C.ARM));
        break;
    case 27: /* Strange feeling */
        C.You_feel("a sudden chill.");
        break;
    case 28: /* Strange feeling */
        C.pline("An urge to take a bath overwhelms you.");
        {
            let money = C.money_cnt(C.gi.invent);
            let otmp, nextobj;

            if (money > 10n) {
                /* Amount to lose.  Might get rounded up as fountains don't
                 * pay change... */
                money = C.somegold(money) / 10n;
                for (otmp = C.gi.invent; otmp && money > 0n; otmp = nextobj) {
                    nextobj = otmp.nobj;
                    if (otmp.oclass == C.COIN_CLASS) {
                        let denomination = C.objects[otmp.otyp].oc_cost;
                        let coin_loss =
                            C.long(money + BigInt(denomination) - 1n) / BigInt(denomination);
                        coin_loss = C.min(coin_loss, otmp.quan);
                        otmp.quan -= coin_loss;
                        money = C.long(money - coin_loss * BigInt(denomination));
                        if (!otmp.quan)
                            C.delobj(otmp);
                    }
                }
                C.You("lost some of your gold in the fountain!");
                C.CLEAR_FOUNTAIN_LOOTED(C.u.ux, C.u.uy);
                C.exercise(C.A_WIS, 0);
            }
        }
        break;
    case 29: /* You see coins */
        /* We make fountains have more coins the closer you are to the
         * surface.  After all, there will have been more people going
         * by.  Just like a shopping mall!  Chris Woodbury  */

        if (C.FOUNTAIN_IS_LOOTED(C.u.ux, C.u.uy))
            break;
        C.SET_FOUNTAIN_LOOTED(C.u.ux, C.u.uy);
        C.mkgold(C.long(C.rnd((C.dunlevs_in_dungeon(C.u.uz) - C.dunlev(C.u.uz)
                                   + 1) * 2, 539, 7) + 5),
                      C.u.ux, C.u.uy);
        if (!C.Blind)
            C.pline("Far below you, you see coins glistening in the %s.",
                  C.hliquid("water"));
        C.exercise(C.A_WIS, 1);
        C.newsym(C.u.ux, C.u.uy);
        break;
    default:
        if (er == C.ER_NOTHING)
            C.pline1(C.nothing_seems_to_happen);
        break;
    }
    C.update_inventory();
    dryup(C.u.ux, C.u.uy, 1);
}

/* dipping '-' in fountain, pool, or sink */
export function wash_hands()
{
    let hands = C.makeplural(C.body_part(C.HAND));
    let res = C.ER_NOTHING;
    let was_glib = !!C.Glib;

    C.You("wash your %s%s in the %s.", C.uarmg ? "gloved " : "", hands,
        C.hliquid("water"));
    if (C.Glib) {
        C.make_glib(0);
        C.Your("%s are no longer slippery.", C.fingers_or_gloves(1));
    }
    if (C.uarmg)
        res = C.water_damage(C.uarmg, 0, 1);
    /* not what ER_GREASED is for, but the checks in dipfountain just
       compare the result to ER_DESTROYED and ER_NOTHING, so it works */
    if (was_glib && res == C.ER_NOTHING)
        res = C.ER_GREASED;
    return res;
}

/* convert a sink into a fountain */
export function breaksink(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    if (C.cansee(x, y) || C.u_at(x, y))
        C.pline_The("pipes break!  Water spurts out!");
    /* updates level.flags.nsinks and level.flags.nfountains */
    C.set_levltyp(x, y, C.FOUNTAIN);
    C.levl[x][y].looted = 0;
    C.levl[x][y].blessedftn = 0;
    C.SET_FOUNTAIN_LOOTED(x, y);
    C.newsym(x, y);
}

/* quaff from a sink while standing on its location */
export function drinksink()
{
    let otmp;
    let mtmp;

    if (C.Levitation) {
        floating_above("sink");
        return;
    }
    switch (C.rn2(20, 604, 8)) {
    case 0:
        C.You("take a sip of very cold %s.", C.hliquid("water"));
        break;
    case 1:
        C.You("take a sip of very warm %s.", C.hliquid("water"));
        break;
    case 2:
        C.You("take a sip of scalding hot %s.", C.hliquid("water"));
        if (C.Fire_resistance) {
            C.pline("It seems quite tasty.");
            C.monstseesu(C.M_SEEN_FIRE);
        } else {
            C.losehp(C.rnd(6, 617, 8), "sipping boiling water", C.KILLED_BY);
            C.monstunseesu(C.M_SEEN_FIRE);
        }
        /* boiling water burns considered fire damage */
        break;
    case 3:
        if (C.svm.mvitals[C.PM_SEWER_RAT].mvflags & C.G_GONE)
            C.pline_The("sink seems quite dirty.");
        else {
            mtmp = C.makemon(C.mons[C.PM_SEWER_RAT], C.u.ux, C.u.uy, C.MM_NOMSG);
            if (mtmp)
                C.pline("Eek!  There's %s in the sink!",
                      (C.Blind || !C.canspotmon(mtmp)) ? "something squirmy"
                                                   : C.a_monnam(mtmp));
        }
        break;
    case 4:
        for (;;) {
            otmp = C.mkobj(C.POTION_CLASS, 0);
            if (otmp.otyp != C.POT_WATER)
                break;
            /* reject water and try again */
            C.obfree(otmp, 0);
        }
        otmp.cursed = otmp.blessed = 0;
        C.pline("Some %s liquid flows from the faucet.",
              C.Blind ? "odd" : C.hcolor(C.OBJ_DESCR(C.objects[otmp.otyp])));
        if(!(C.Blind || C.Hallucination))
            C.observe_object(otmp);
        otmp.quan++;       /* Avoid panic upon useup() */
        otmp.fromsink = 1; /* kludge for docall() */
        C.dopotion(otmp);
        C.obfree(otmp, 0);
        break;
    case 5:
        if (!(C.levl[C.u.ux][C.u.uy].looted & C.S_LRING)) {
            C.You("find a ring in the sink!");
            C.mkobj_at(C.RING_CLASS, C.u.ux, C.u.uy, 1);
            C.levl[C.u.ux][C.u.uy].looted |= C.S_LRING;
            C.exercise(C.A_WIS, 1);
            C.newsym(C.u.ux, C.u.uy);
        } else
            C.pline("Some dirty %s backs up in the drain.", C.hliquid("water"));
        break;
    case 6:
        breaksink(C.u.ux, C.u.uy);
        break;
    case 7:
        C.pline_The("%s moves as though of its own will!", C.hliquid("water"));
        if ((C.svm.mvitals[C.PM_WATER_ELEMENTAL].mvflags & C.G_GONE)
            || !C.makemon(C.mons[C.PM_WATER_ELEMENTAL], C.u.ux, C.u.uy, C.MM_NOMSG))
            C.pline("But it quiets down.");
        break;
    case 8:
        C.pline("Yuk, this %s tastes awful.", C.hliquid("water"));
        C.more_experienced(1, 0);
        C.newexplevel();
        break;
    case 9:
        C.pline("Gaggg... this tastes like sewage!  You vomit.");
        C.morehungry((C.rn2(30 - C.ACURR(C.A_CON), 677, 8) + 11));
        C.vomit();
        break;
    case 10:
        C.pline("This %s contains toxic wastes!", C.hliquid("water"));
        if (!C.Unchanging) {
            C.You("undergo a freakish metamorphosis!");
            C.polyself(C.POLY_NOFLAGS);
        }
        break;
    /* more odd messages --JJB */
    case 11:
        // C.Soundeffect(se_clanking_pipe, 50) (inactive configured macro)
        C.You_hear("clanking from the pipes...");
        break;
    case 12:
        // C.Soundeffect(se_sewer_song, 100) (inactive configured macro)
        C.You_hear("snatches of song from among the sewers...");
        break;
    case 13:
        C.pline("Ew, what a stench!");
        C.create_gas_cloud(C.u.ux, C.u.uy, 1, 4);
        break;
    case 19:
        if (C.Hallucination) {
            C.pline("From the murky drain, a hand reaches up... --oops--");
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    default:
        C.You("take a sip of %s %s.",
            C.rn2(3, 709, 8) ? (C.rn2(2, 709, 8) ? "cold" : "warm") : "hot",
            C.hliquid("water"));
    }
}

/* for #dip(potion.c) when standing on a sink */
export function dipsink(obj)
{
    let try_call = 0,
            not_looted_yet = (C.levl[C.u.ux][C.u.uy].looted & C.S_LRING) == 0,
            is_hands = (obj.address == C.hands_obj.address || (C.uarmg && obj.address == (C.uarmg?.address ?? 0)));

    if (!C.rn2(not_looted_yet ? 25 : 15, 722, 9)) {
        /* can't rely on using sink for unlimited scroll blanking; however,
           since sink will be converted into a fountain, hero can dip again */
        breaksink(C.u.ux, C.u.uy); /* "The pipes break!  Water spurts out!" */
        if (C.Glib && is_hands)
            C.Your("%s are still slippery.", C.fingers_or_gloves(1));
        return;
    } else if (is_hands) {
        wash_hands();
        return;
    } else if (obj.oclass != C.POTION_CLASS) {
        C.You("hold %s under the tap.", C.the(C.xname(obj)));
        if (C.water_damage(obj, 0, 1) == C.ER_NOTHING)
            C.pline1(C.nothing_seems_to_happen);
        return;
    }

    /* at this point the object must be a potion */
    C.You("pour %s%s down the drain.", (obj.quan > 1n ? "one of " : ""),
        C.the(C.xname(obj)));
    switch (obj.otyp) {
    case C.POT_POLYMORPH:
        C.polymorph_sink();
        try_call = 1;
        break;
    case C.POT_OIL:
        if (!C.Blind) {
            C.pline("It leaves an oily film on the basin.");
            try_call = 1;
        } else {
            C.pline1(C.nothing_seems_to_happen);
        }
        break;
    case C.POT_ACID:
        /* acts like a drain cleaner product */
        try_call = 1;
        if (!C.Blind) {
            C.pline_The("drain seems less clogged.");
        } else if (!C.Deaf) {
            C.You_hear("a sucking sound.");
        } else {
            C.pline1(C.nothing_seems_to_happen);
            try_call = 0;
        }
        break;
    case C.POT_LEVITATION:
        sink_backs_up(C.u.ux, C.u.uy);
        try_call = 1;
        break;
    case C.POT_OBJECT_DETECTION:
        if (!(C.levl[C.u.ux][C.u.uy].looted & C.S_LRING)) {
            C.You("sense a ring lost down the drain.");
            try_call = 1;
            break;
        }
        // FALLTHROUGH;
        /* FALLTHRU */
    case C.POT_GAIN_LEVEL:
    case C.POT_GAIN_ENERGY:
    case C.POT_MONSTER_DETECTION:
    case C.POT_FRUIT_JUICE:
    case C.POT_WATER:
        /* potions with no potionbreathe() effects, plus water.  if effects
           are added to potionbreathe these should go to that instead (except
           for water). */
        C.pline1(C.nothing_seems_to_happen);
        break;
    default:
        /* hero can feel the vapor on her skin, so no need to check Blind or
           breathless for this message */
        C.pline("A wisp of vapor rises up...");
        /* NB: potionbreathe calls trycall or makeknown as appropriate */
        if (!C.breathless(C.gy.youmonst.data) || C.haseyes(C.gy.youmonst.data))
            C.potionbreathe(obj);
        break;
    }
    if (try_call && obj.dknown)
        C.trycall(obj);
    C.useup(obj);
}

/* find a ring in a sink */
export function sink_backs_up(x, y)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    let buf = C.stackAlloc(C.BUFSZ);

    if (!C.Blind)
        C.Strcpy(buf, "Muddy waste pops up from the drain");
    else if (!C.Deaf)
        C.Strcpy(buf, "You hear a sloshing sound"); /* Deaf-aware */
    else
        C.Sprintf(buf, "Something splashes you in the %s", C.body_part(C.FACE));
    C.pline("%s%s.", !C.Deaf ? "Flupp!  " : "", buf);

    if (!(C.levl[x][y].looted & C.S_LRING)) { /* once per sink */
        if (!C.Blind)
            C.You_see("a ring shining in its midst.");
        C.mkobj_at(C.RING_CLASS, x, y, 1);
        C.newsym(x, y);
        C.exercise(C.A_DEX, 1);
        C.exercise(C.A_WIS, 1); /* a discovery! */
        C.levl[x][y].looted |= C.S_LRING;
    }
}

/*fountain.c*/
