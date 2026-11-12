/* NetHack 5.0	dokick.c	$NHDT-Date: 1712453347 2024/04/07 01:29:07 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.223 $ */
/* Copyright (c) Izchak Miller, Mike Stephenson, Steve Linhart, 1989. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"

export function is_bigfoot(x) { return (+((x) == mons[PM_SASQUATCH])); }
export function martial() { return (((martial_bonus() || is_bigfoot(gy.youmonst.data) 
     || (uarmf && uarmf.otyp == KICKING_BOOTS)) ? 1 : 0)); }


/* gk.kickedobj (decl.c) tracks a kicked object until placed or destroyed */

















const kick_passes_thru = init_string(static_array("kick_passes_thru", char, sizeof_string("kick passes harmlessly through")), _("kick passes harmlessly through"), true);

/* kicking damage when not poly'd into a form with a kick attack */
function /* void */
kickdmg(mon, clumsy)
{
    let mdx, mdy;
    let dmg = Math.trunc((ACURRSTR() + ACURR(A_DEX) + ACURR(A_CON)) / 15);
    let specialdmg, kick_skill = P_NONE;
    let trapkilled = FALSE;

    if (uarmf && uarmf.otyp == KICKING_BOOTS)
        dmg += 5;

    /* excessive wt affects dex, so it affects dmg */
    if (clumsy)
        dmg = Math.trunc(dmg / 2);

    /* kicking a dragon or an elephant will not harm it */
    if (thick_skinned(mon.data))
        dmg = 0;

    /* attacking a shade is normally useless */
    if (mon.data == mons[PM_SHADE])
        dmg = 0;

    specialdmg = special_dmgval(gy.youmonst, mon, W_ARMF, null);

    if (mon.data == mons[PM_SHADE] && !specialdmg) {
        pline_The(_("%s."), kick_passes_thru);
        /* doesn't exercise skill or abuse alignment or frighten pet,
           and shades have no passive counterattack */
        return;
    }

    if (M_AP_TYPE(mon))
        seemimic(mon);

    check_caitiff(mon);

    /* squeeze some guilt feelings... */
    if (mon.mtame) {
        abuse_dog(mon);
        if (mon.mtame)
            monflee(mon, (dmg ? rnd(dmg) : 1), FALSE, FALSE);
        else
            mon.mflee = 0;
    }

    if (dmg > 0) {
        /* convert potential damage to actual damage */
        dmg = rnd(dmg);
        if (martial()) {
            if (dmg > 1)
                kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc(ACURR(A_DEX) / 2) + 1);
        }
        /* a good kick exercises your dex */
        exercise(A_DEX, TRUE);
    }
    dmg += specialdmg; /* for blessed (or hypothetically, silver) boots */
    if (uarmf)
        dmg += uarmf.spe;
    dmg += u.udaminc; /* add ring(s) of increase damage */
    if (dmg > 0)
        mon.mhp -= dmg;
    if (!DEADMONSTER(mon) && martial() && !bigmonst(mon.data) && !rn2(3)
        && mon.mcanmove && mon != u.ustuck && !mon.mtrapped) {
        /* see if the monster has a place to move into */
        mdx = mon.mx + u.dx;
        mdy = mon.my + u.dy;
        /* TODO: replace with mhurtle? */
        if (goodpos(mdx, mdy, mon, 0)) {
            pline(_("%s reels from the blow."), Monnam(mon));
            if (m_in_out_region(mon, mdx, mdy)) {
                remove_monster(mon.mx, mon.my);
                newsym(mon.mx, mon.my);
                place_monster(mon, mdx, mdy);
                newsym(mon.mx, mon.my);
                set_apparxy(mon);
                if (mintrap(mon, NO_TRAP_FLAGS) == Trap_Killed_Mon)
                    trapkilled = TRUE;
            }
        }
    }

    void passive(mon, uarmf, TRUE, +!DEADMONSTER(mon), AT_KICK, FALSE);
    if (DEADMONSTER(mon) && !trapkilled)
        killed(mon);

    /* may bring up a dialog, so put this after all messages */
    if (kick_skill != P_NONE) /* exercise proficiency */
        use_skill(kick_skill, 1);
}

function /* boolean */
maybe_kick_monster(mon, x, y)
{
    if (mon) {
        let save_forcefight = svc.context.forcefight;

        gb.bhitpos.x = x;
        gb.bhitpos.y = y;
        if (!mon.mpeaceful || !canspotmon(mon))
            svc.context.forcefight = TRUE; /* attack even if invisible */
        /* kicking might be halted by discovery of hidden monster,
           by player declining to attack peaceful monster,
           or by passing out due to encumbrance */
        if (attack_checks(mon, null) || overexertion())
            mon = null; /* don't kick after all */
        svc.context.forcefight = save_forcefight;
    }
    return (+(mon != null));
}

function /* void */
kick_monster(mon, x, y)
{ const $frame = stack_frame(); try {
    var clumsy = FALSE;
    var i, j;

    /* anger target even if wild miss will occur */
    setmangry(mon, TRUE);

    if (Levitation() && !rn2(3) && verysmall(mon.data)
        && !is_flyer(mon.data)) {
        pline(_("Floating in the air, you miss wildly!"));
        exercise(A_DEX, FALSE);
        void passive(mon, uarmf, FALSE, 1, AT_KICK, FALSE);
        return;
    }

    /* reveal hidden target even if kick ends up missing (note: being
       hidden doesn't affect chance to hit so neither does this reveal) */
    if (mon.mundetected
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) != M_AP_MONSTER)) {
        if (M_AP_TYPE(mon))
            seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon))
            map_invisible(x, y);
        else
            newsym(x, y);
        There(_("is %s here."),
              canspotmon(mon) ? a_monnam(mon) : _("something hidden"));
    }

    /* Kick attacks by kicking monsters are normal attacks, not special.
     * This is almost always worthless, since you can either take one turn
     * and do all your kicks, or else take one turn and attack the monster
     * normally, getting all your attacks _including_ all your kicks.
     * If you have >1 kick attack, you get all of them.
     */
    if (Upolyd() && attacktype(gy.youmonst.data, AT_KICK)) {
        var uattk;
        var sum, kickdieroll, armorpenalty = stack_var(int), specialdmg,
            attknum = stack_var(int, 0),
            tmp = find_roll_to_hit(mon, AT_KICK, null, attknum,
                                   armorpenalty);
        mon_maybe_unparalyze(mon);

        for (i = 0; i < NATTK; i++) {
            /* first of two kicks might have provoked counterattack
               that has incapacitated the hero (ie, floating eye) */
            if (gm.multi < 0)
                break;

            uattk = gy.youmonst.data.mattk[i];
            /* we only care about kicking attacks here */
            if (uattk.aatyp != AT_KICK)
                continue;

            kickdieroll = rnd(20);
            specialdmg = special_dmgval(gy.youmonst, mon, W_ARMF,
                                        null);
            if (mon.data == mons[PM_SHADE] && !specialdmg) {
                /* doesn't matter whether it would have hit or missed,
                   and shades have no passive counterattack */
                Your(_("%s %s."), kick_passes_thru, mon_nam(mon));
                break; /* skip any additional kicks */
            } else if (tmp > kickdieroll) {
                You(_("kick %s."), mon_nam(mon));
                sum = damageum(mon, uattk, specialdmg);
                void passive(mon, uarmf, (+(sum != M_ATTK_MISS)),
                               +!(sum & M_ATTK_DEF_DIED), AT_KICK, FALSE);
                if ((sum & M_ATTK_DEF_DIED))
                    break; /* Defender died */
            } else {
                missum(mon, uattk, (+(tmp + armorpenalty[0] > kickdieroll)));
                void passive(mon, uarmf, FALSE, 1, AT_KICK, FALSE);
            }
        }
        return;
    }

    i = -inv_weight();
    j = weight_cap();

    /* What the following confusing if statements mean:
     * If you are over 70% of carrying capacity, you go through a "deal no
     * damage" check, and if that fails, a "clumsy kick" check.
     * At this % of carrycap | Chance of no damage | Chance of clumsiness
     *             [70%-80%) |                 1/4 |                  1/3
     *             [80%-90%) |                 1/3 |                  1/2
     *            [90%-100%) |                 1/2 |                   1
     */
    doit: { if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial())
                break doit;;
            Your(_("clumsy kick does no damage."));
            void passive(mon, uarmf, FALSE, 1, AT_KICK, FALSE);
            return;
        }
        if (i < Math.trunc(j / 10))
            clumsy = TRUE;
        else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3))
            clumsy = TRUE;
    }

    if (Fumbling())
        clumsy = TRUE;

    else if (uarm && objects[uarm.otyp].oc_big && ACURR(A_DEX) < rnd(25))
        clumsy = TRUE;
 }
    You(_("kick %s."), mon_nam(mon));
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(mon.data))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(mon.data)
        && mon.data.mlet != S_EEL && haseyes(mon.data) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && mon.data.mmove >= 12) {
        if (!nohands(mon.data) && !rn2(martial() ? 5 : 3)) {
            pline(_("%s blocks your %skick."), Monnam(mon),
                  clumsy ? _("clumsy ") : _(""));
            void passive(mon, uarmf, FALSE, 1, AT_KICK, FALSE);
            return;
        } else {
            maybe_mnexto(mon);
            if (mon.mx != x || mon.my != y) {
                void unmap_invisible(x, y);
                pline(_("%s %s, %s evading your %skick."), Monnam(mon),
                      (can_teleport(mon.data) && !noteleport_level(mon))
                          ? _("teleports")
                          : is_floater(mon.data)
                                ? _("floats")
                                : is_flyer(mon.data) ? _("swoops")
                                                      : (nolimbs(mon.data)
                                                         || slithy(mon.data))
                                                            ? _("slides")
                                                            : _("jumps"),
                      clumsy ? _("easily") : _("nimbly"), clumsy ? _("clumsy ") : _(""));
                void passive(mon, uarmf, FALSE, 1, AT_KICK, FALSE);
                return;
            }
        }
    }
    kickdmg(mon, clumsy);
} finally { stack_pop($frame); } }

/*
 *  Return TRUE if caught (the gold taken care of), FALSE otherwise.
 *  The gold object is *not* attached to the fobj chain!
 */
export function /* boolean */
ghitm(mtmp, gold)
{
    let msg_given = FALSE;

    if (!likes_gold(mtmp.data) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !is_mercenary(mtmp.data)) {
        wakeup(mtmp, TRUE);
    } else if (!mtmp.mcanmove) {
        /* too light to do real damage */
        if (canseemon(mtmp)) {
            pline_The(_("%s harmlessly %s %s."), xname(gold),
                      otense(gold, _("hit")), mon_nam(mtmp));
            msg_given = TRUE;
        }
    } else {
        let was_sleeping = mtmp.msleeping;
        let umoney, value = gold.quan * objects[gold.otyp].oc_cost;

        mtmp.msleeping = 0; /* end indeterminate sleep (won't get here
                              * for temporary--counted--sleep since that
                              * uses mfrozen and mfrozen implies !mcanmove) */
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4)) /* not always pleasing */
            setmangry(mtmp, TRUE);
        /* greedy monsters catch gold */
        if (cansee(mtmp.mx, mtmp.my))
            pline(_("%s %scatches the gold."), Monnam(mtmp),
                  was_sleeping ? _("awakens and ") : _(""));
        void mpickobj(mtmp, gold);
        gold = null; /* obj has been freed */
        if (mtmp.isshk) {
            let robbed = ESHK(mtmp).robbed;

            if (robbed) {
                robbed -= value;
                if (robbed < 0)
                    robbed = 0;
                pline_The(_("amount %scovers %s recent losses."),
                          !robbed ? _("") : _("partially "), mhis(mtmp));
                ESHK(mtmp).robbed = robbed;
                if (!robbed)
                    make_happy_shk(mtmp, FALSE);
            } else {
                   ;
                if (mtmp.mpeaceful) {
                    ESHK(mtmp).credit += value;
                    You(_("have %lld %s in credit."), ESHK(mtmp).credit,
                        currency(ESHK(mtmp).credit));
                } else
                    verbalize(_("Thanks, scum!"));
            }
        } else if (mtmp.ispriest) {
               ;
            if (mtmp.mpeaceful)
                verbalize(_("Thank you for your contribution."));
            else
                verbalize(_("Thanks, scum!"));
        } else if (mtmp.isgd) {
            umoney = money_cnt(gi.invent);
            /* Some of these are iffy, because a hostile guard
               won't become peaceful and resume leading hero
               out of the vault.  If he did do that, player
               could try fighting, then weasel out of being
               killed by throwing his/her gold when losing. */
               ;
            verbalize(umoney ? _("Drop the rest and follow me.")
                      : hidden_gold(TRUE)
                        ? _("You still have hidden gold.  Drop it now.")
                        : mtmp.mpeaceful
                          ? _("I'll take care of that; please move along.")
                          : _("I'll take that; now get moving."));
        } else if (is_mercenary(mtmp.data)) {
            let was_angry = +!mtmp.mpeaceful;
            let goldreqd = 0;

            if (mtmp.data == mons[PM_SOLDIER])
                goldreqd = 100;
            else if (mtmp.data == mons[PM_SERGEANT])
                goldreqd = 250;
            else if (mtmp.data == mons[PM_LIEUTENANT])
                goldreqd = 500;
            else if (mtmp.data == mons[PM_CAPTAIN])
                goldreqd = 750;

            if (goldreqd && rn2(3)) {
                umoney = money_cnt(gi.invent);
                goldreqd += Math.trunc((umoney + u.ulevel * rn2(5)) / ACURR(A_CHA));
                if (value > goldreqd)
                    mtmp.mpeaceful = TRUE;
            }

            if (!mtmp.mpeaceful) {
                   ;
                if (goldreqd)
                    verbalize(_("That's not enough, coward!"));
                else /* unbribable (watchman) */
                    verbalize(_("I don't take bribes from scum like you!"));
            } else if (was_angry) {
                   ;
                verbalize(_("That should do.  Now beat it!"));
            } else {
                   ;
                verbalize(_("Thanks for the tip, %s."),
                          flags.female ? _("lady") : _("buddy"));
            }
        }
        return TRUE;
    }

    if (!msg_given)
        miss(xname(gold), mtmp);
    return FALSE;
}

/* container is kicked, dropped, thrown or otherwise impacted by player.
 * Assumes container is on floor.  Checks contents for possible damage. */
export function /* void */
container_impact_dmg(
    obj,
    x,
    y) /* before the impact, not after */
{
    let shkp;
    let otmp, otmp2;
    let loss = 0;
    let costly, insider, frominv, wchange = FALSE;

    /* only consider normal containers */
    if (!Is_container(obj) || !Has_contents(obj) || Is_mbag(obj))
        return;

    costly = ((((shkp = shop_keeper(chars[in_rooms(x, y, SHOPBASE)]))
              && costly_spot(x, y)) ? 1 : 0));
    insider = (((chars[u.ushops] && inside_shop(u.ux, u.uy)
               && chars[in_rooms(x, y, SHOPBASE)] == chars[u.ushops]) ? 1 : 0));
    /* if dropped or thrown, shop ownership flags are set on this obj */
    frominv = (+(obj != gk.kickedobj));

    for (otmp = obj.cobj; otmp; otmp = otmp2) {
        let result = 0;

        otmp2 = otmp.nobj;
        if (objects[otmp.otyp].oc_material == GLASS
            && otmp.oclass != GEM_CLASS && !obj_resists(otmp, 33, 100)) {
            result = _("shatter");
        } else if (otmp.otyp == EGG && !rn2(3)) {
            result = _("cracking");
        }
        if (result) {
            if (otmp.otyp == MIRROR)
                change_luck(-2);

            /* eggs laid by you.  penalty is -1 per egg, max 5,
             * but it's always exactly 1 that breaks */
            if (otmp.otyp == EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(-1);
            if (otmp.otyp == EGG) {
                 ;
            } else {
                 ;
            }
            You_hear(_("a muffled %s."), result);
            if (costly) {
                if (frominv && !otmp.unpaid)
                    otmp.no_charge = 1;
                loss +=
                    stolen_value(otmp, x, y, shkp.mpeaceful, TRUE);
            }
            if (otmp.quan > 1) {
                useup(otmp);
            } else {
                obj_extract_self(otmp);
                obfree(otmp, null);
            }
            /* contents of this container are no longer known */
            obj.cknown = 0;
            wchange = TRUE;
        }
    }
    if (wchange)
        obj.owt = unsigned(weight(obj));
    if (costly && loss) {
        if (!insider) {
            You(_("caused %lld %s worth of damage!"), loss, currency(loss));
            make_angry_shk(shkp, x, y);
        } else {
            You(_("owe %s %lld %s for objects destroyed."), shkname(shkp), loss,
                currency(loss));
        }
    }
}

/* jacket around really_kick_object */
function /* int */
kick_object(x, y, kickobjnam)
{
    let res = 0;

    chars[kickobjnam] = ord('\0');
    /* if a pile, the "top" object gets kicked */
    gk.kickedobj = svl.level.objects[x][y];
    if (gk.kickedobj) {
        /* formatted object name matters iff res==0 */
        void strcpy(kickobjnam, killer_xname(gk.kickedobj));
        /* kick object; if fatal, done() will clean up kickedobj */
        res = really_kick_object(x, y);
        gk.kickedobj = null;
    }
    return res;
}

/* guts of kick_object */
function /* int */
really_kick_object(x, y)
{
    let range;
    let mon, shkp = null;
    let trap;
    let bhitroom;
    let costly, isgold, slide = FALSE;

    /* gk.kickedobj should always be set due to conditions of call */
    if (!gk.kickedobj || gk.kickedobj.otyp == BOULDER
        || gk.kickedobj == uball || gk.kickedobj == uchain)
        return 0;

    if ((trap = t_at(x, y)) != null) {
        if ((is_pit(trap.ttyp) && !Passes_walls()) || trap.ttyp == WEB) {
            if (!trap.tseen)
                find_trap(trap);
            You_cant(_("kick %s that's in a %s!"), something(),
                     Hallucination() ? _("tizzy")
                         : (trap.ttyp == WEB) ? _("web")
                             : _("pit"));
            return 1;
        }
        if (trap.ttyp == STATUE_TRAP) {
            activate_statue_trap(trap, x, y, FALSE);
            return 1;
        }
    }

    if (Fumbling() && !rn2(3)) {
        Your(_("clumsy kick missed."));
        return 1;
    }

    if (!uarmf && gk.kickedobj.otyp == CORPSE
        && touch_petrifies(mons[gk.kickedobj.corpsenm])
        && !Stone_resistance()) {
        You(_("kick %s with your bare %s."),
            corpse_xname(gk.kickedobj, 0, CXN_PFX_THE),
            makeplural(body_part(FOOT)));
        if (poly_when_stoned(gy.youmonst.data) && polymon(PM_STONE_GOLEM)) {
            ; /* hero has been transformed but kick continues */
        } else {
            /* normalize body shape here; foot, not body_part(FOOT) */
            void sprintf(svk.killer.name, _("kicking %s barefoot"), killer_xname(gk.kickedobj))
;
            instapetrify(svk.killer.name);
        }
    }

    isgold = (+(gk.kickedobj.oclass == COIN_CLASS));
    {
        let k_owt = int(gk.kickedobj.owt);

        /* for non-gold stack, 1 item will be split off below (unless an
           early return occurs, so we aren't moving the split to here);
           calculate the range for that 1 rather than for the whole stack */
        if (gk.kickedobj.quan > 1 && !isgold) {
            let save_quan = gk.kickedobj.quan;

            gk.kickedobj.quan = 1;
            k_owt = weight(gk.kickedobj);
            gk.kickedobj.quan = save_quan;
        }

        /* range < 2 means the object will not move
           (maybe dexterity should also figure here) */
        range = Math.trunc((ACURRSTR()) / 2) - Math.trunc(k_owt / 40);
    }

    if (martial())
        range += rnd(3);

    if (is_pool(x, y)) {
        /* you're in the water too; significantly reduce range */
        range = Math.trunc(range / 3) + 1; /* {1,2}=>1, {3,4,5}=>2, {6,7,8}=>3 */
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        /* you're in air, since is_pool did not match */
        range += rnd(3);
    } else {
        if (is_ice(x, y))
            range += rnd(3), slide = TRUE;
        if (gk.kickedobj.greased)
            range += rnd(3), slide = TRUE;
    }

    /* Mjollnir is magically too heavy to kick */
    if (is_art(gk.kickedobj, ART_MJOLLNIR))
        range = 1;

    /* see if the object has a place to move into */
    if (!isok(x + u.dx, y + u.dy)
        || !ZAP_POS(levl()[x + u.dx][y + u.dy].typ)
        || closed_door(x + u.dx, y + u.dy))
        range = 1;

    /* 5.0: this used to skip 'costly' handling if kickedobj->no_charge
       was set but that optimization could result in no_charge staying set
       for objects kicked out of the shop */
    shkp = find_objowner(gk.kickedobj, x, y);
    costly = (((shkp && (costly_spot(x, y) || (costly_adjacent(shkp, x, y)
                                             && gk.kickedobj.unpaid))) ? 1 : 0));
    /* 5.0: give feedback about the item being kicked; some follow-on
       messages refer to "it" */
    Norep(_("You kick %s."),
          !isgold ? singular(gk.kickedobj, doname) : doname(gk.kickedobj));

    if (IS_OBSTRUCTED(levl()[x][y].typ) || closed_door(x, y)) {
        if ((!martial() && rn2(20) > ACURR(A_DEX))
            || IS_OBSTRUCTED(levl()[u.ux][u.uy].typ) || closed_door(u.ux, u.uy)) {
            if (Blind())
                pline(_("It doesn't come loose."));
            else
                pline(_("%s %sn't come loose."),
                      The(distant_name(gk.kickedobj, xname)),
                      otense(gk.kickedobj, _("do")));
            return (((!rn2(3) || martial()) ? 1 : 0));
        }
        if (Blind())
            pline(_("It comes loose."));
        else
            pline(_("%s %s loose."), The(distant_name(gk.kickedobj, xname)),
                  otense(gk.kickedobj, _("come")));
        obj_extract_self(gk.kickedobj);
        newsym(x, y);
        if (costly && (!costly_spot(u.ux, u.uy)
                       || !strchr(u.urooms, chars[in_rooms(x, y, SHOPBASE)]))) {
            if (!gk.kickedobj.no_charge)
                addtobill(gk.kickedobj, FALSE, FALSE, FALSE);
            else /* don't leave no_charge set when outside shop */
                gk.kickedobj.no_charge = 0;
        }
        if (!flooreffects(gk.kickedobj, u.ux, u.uy, _("fall"))) {
            place_object(gk.kickedobj, u.ux, u.uy);
            impact_disturbs_zombies(gk.kickedobj, TRUE);
            stackobj(gk.kickedobj);
            newsym(u.ux, u.uy);
        }
        return 1;
    }

    /* a box gets a chance of breaking open here */
    if (Is_box(gk.kickedobj)) {
        let otrp = gk.kickedobj.otrapped;

        if (range < 2)
            pline(_("THUD!"));
        container_impact_dmg(gk.kickedobj, x, y);
        if (gk.kickedobj.olocked) {
            if (!rn2(5) || (martial() && !rn2(2))) {
                You(_("break open the lock!"));
                breakchestlock(gk.kickedobj, FALSE);
                if (otrp)
                    void chest_trap(gk.kickedobj, LEG, FALSE);
                return 1;
            }
        } else {
            if (!rn2(3) || (martial() && !rn2(2))) {
                pline_The(_("lid slams open, then falls shut."));
                gk.kickedobj.lknown = 1;
                if (otrp)
                    void chest_trap(gk.kickedobj, LEG, FALSE);
                return 1;
            }
        }
        if (range < 2)
            return 1;
        /* else let it fall through to the next cases... */
    }

    /* fragile objects should not be kicked */
    if (hero_breaks(gk.kickedobj, gk.kickedobj.ox, gk.kickedobj.oy, 0))
        return 1;

    /* too heavy to move.  range is calculated as potential distance from
     * player, so range == 2 means the object may move up to one square
     * from its current position
     */
    if (range < 2) {
        if (!Is_box(gk.kickedobj))
            pline(_("Thump!"));
        return (((!rn2(3) || martial()) ? 1 : 0));
    }

    if (gk.kickedobj.quan > 1) {
        if (!isgold) {
            gk.kickedobj = splitobj(gk.kickedobj, 1);
        } else {
            if (rn2(20)) {
                let flyingcoinmsg = static_array("really_kick_object.flyingcoinmsg", ptr_to(char), null, [
                    _("scatter the coins"), _("knock coins all over the place"),
                    _("send coins flying in all directions"),
                ]);

                if (!Deaf())
                    pline1(_("Thwwpingg!"));
                You(_("%s!"), ROLL_FROM(flyingcoinmsg));
                void scatter(x, y, rnd(3), VIS_EFFECTS | MAY_HIT,
                               gk.kickedobj);
                newsym(x, y);
                return 1;
            }
            if (gk.kickedobj.quan > 300) {
                pline(_("Thump!"));
                return (((!rn2(3) || martial()) ? 1 : 0));
            }
        }
    }

    if (slide && !Blind())
        pline(_("Whee!  %s %s across the %s."), Doname2(gk.kickedobj),
              otense(gk.kickedobj, _("slide")), surface(x, y));













    obj_extract_self(gk.kickedobj);
    void snuff_candle(gk.kickedobj);
    newsym(x, y);
    mon = bhit(u.dx, u.dy, range, KICKED_WEAPON,
               null,
               null, ref_of(gk, "kickedobj"));
    if (!gk.kickedobj)
        return 1; /* object broken */

    if (mon) {
        if (mon.isshk && gk.kickedobj.where == OBJ_MINVENT
            && gk.kickedobj.v.v_ocarry == mon)
            return 1; /* alert shk caught it */
        gn.notonhead = (+(mon.mx != gb.bhitpos.x || mon.my != gb.bhitpos.y));
        if (isgold ? ghitm(mon, gk.kickedobj)      /* caught? */
                   : thitmonst(mon, gk.kickedobj)) /* hit && used up? */
            return 1;
    }

    /* the object might have fallen down a hole;
       ship_object() will have taken care of shop billing */
    if (gk.kickedobj.where == OBJ_MIGRATING)
        return 1;

    bhitroom = chars[in_rooms(gb.bhitpos.x, gb.bhitpos.y, SHOPBASE)];
    /* if obj is marked no_charge, stolen_value() won't blame hero for
       theft but will clear that flag */
    if (costly && (!costly_spot(gb.bhitpos.x, gb.bhitpos.y)
                   || chars[in_rooms(x, y, SHOPBASE)] != bhitroom)) {
        /* kicked from inside shop to somewhere outside shop */
        if (isgold)
            costly_gold(x, y, gk.kickedobj.quan, FALSE);
        else
            void stolen_value(gk.kickedobj, x, y, shkp.mpeaceful,
                                FALSE);
        costly = FALSE; /* already billed */
    }

    if (flooreffects(gk.kickedobj, gb.bhitpos.x, gb.bhitpos.y, _("fall")))
        return 1;
    if (costly) {
        let gtg = 0;

        /* costly + landed outside shop handled above; must be inside shop */
        if (gk.kickedobj.unpaid)
            subfrombill(gk.kickedobj, shkp);

        /* if billed for contained gold during kick, get a refund now */
        if (Has_contents(gk.kickedobj)
            && (gtg = contained_gold(gk.kickedobj, TRUE)) > 0)
            donate_gold(gtg, shkp, FALSE);
    }
    place_object(gk.kickedobj, gb.bhitpos.x, gb.bhitpos.y);
    impact_disturbs_zombies(gk.kickedobj, TRUE);
    stackobj(gk.kickedobj);
    newsym(gk.kickedobj.ox, gk.kickedobj.oy);
    return 1;
}

/* cause of death if kicking kills kicker */
function /* char * */
kickstr(buf, kickobjnam)
{
    let what;

    if (chars[kickobjnam])
        what = kickobjnam;
    else if (gm.maploc == gn.nowhere)
        what = _("nothing");
    else if (IS_DOOR(gm.maploc.typ))
        what = _("a door");
    else if (IS_TREE(gm.maploc.typ))
        what = _("a tree");
    else if (IS_STWALL(gm.maploc.typ))
        what = _("a wall");
    else if (IS_OBSTRUCTED(gm.maploc.typ))
        what = _("a rock");
    else if (IS_THRONE(gm.maploc.typ))
        what = _("a throne");
    else if (IS_FOUNTAIN(gm.maploc.typ))
        what = _("a fountain");
    else if (IS_GRAVE(gm.maploc.typ))
        what = _("a headstone");
    else if (IS_SINK(gm.maploc.typ))
        what = _("a sink");
    else if (IS_ALTAR(gm.maploc.typ))
        what = _("an altar");
    else if (IS_DRAWBRIDGE(gm.maploc.typ))
        what = _("a drawbridge");
    else if (gm.maploc.typ == STAIRS)
        what = _("the stairs");
    else if (gm.maploc.typ == LADDER)
        what = _("a ladder");
    else if (gm.maploc.typ == IRONBARS)
        what = _("an iron bar");
    else
        what = _("something weird");
    return strcat(strcpy(buf, _("kicking ")), what);
}

function /* boolean */
watchman_thief_arrest(mtmp)
{
    if (is_watch(mtmp.data) && couldsee(mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        mon_yells(mtmp, _("Halt, thief!  You're under arrest!"));
        void angry_guards(FALSE);
        return TRUE;
    }
    return FALSE;
}

function /* boolean */
watchman_door_damage(mtmp, x, y)
{
    if (is_watch(mtmp.data) && mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my)) {
        if (levl()[x][y].flags & D_WARNED) {
            mon_yells(mtmp,
                      _("Halt, vandal!  You're under arrest!"));
            void angry_guards(FALSE);
        } else {
            mon_yells(mtmp, _("Hey, stop damaging that door!"));
            levl()[x][y].flags |= D_WARNED;
        }
        return TRUE;
    }
    return FALSE;
}

function /* void */
kick_dumb(x, y)
{
    exercise(A_DEX, FALSE);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        You(_("kick at empty space."));
        if (Blind())
            feel_location(x, y);
    } else {
        pline(_("Dumb move!  You strain a muscle."));
        exercise(A_STR, FALSE);
        set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    if ((Is_airlevel(u.uz) || Levitation()) && rn2(2))
        hurtle(-u.dx, -u.dy, 1, TRUE);
}

function /* void */
kick_ouch(x$, y$, kickobjnam)
{ const $frame = stack_frame(); try { const x = stack_var(short, x$); const y = stack_var(short, y$);
    let dmg;
    let buf = stack_array(char, BUFSZ);

    pline(_("Ouch!  That hurts!"));
    exercise(A_DEX, FALSE);
    exercise(A_STR, FALSE);
    if (isok(x[0], y[0])) {
        if (Blind())
            feel_location(x[0], y[0]); /* we know we hit it */
        if (is_drawbridge_wall(x[0], y[0]) >= 0) {
            pline_The(_("drawbridge is unaffected."));
            /* update maploc to refer to the drawbridge */
            void find_drawbridge(x, y);
            gm.maploc = levl()[x[0]][y[0]];
        }
        wake_nearto(x[0], y[0], 5 * 5);
    }
    if (!rn2(3))
        set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    losehp(Maybe_Half_Phys(dmg), kickstr(buf, kickobjnam), KILLED_BY);
    if (Is_airlevel(u.uz) || Levitation())
        hurtle(-u.dx, -u.dy, rn1(2, 4), TRUE); /* assume it's heavy */
} finally { stack_pop($frame); } }

/* kick a door */
function /* void */
kick_door(x, y, avrg_attrib)
{
    let doorbuster;

    if (gm.maploc.flags == D_ISOPEN || gm.maploc.flags == D_BROKEN
        || gm.maploc.flags == D_NODOOR) {
        kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (Levitation()) {
        kick_ouch(x, y, _(""));
        return;
    }

    exercise(A_DEX, TRUE);
    doorbuster = +(Upolyd() && is_giant(gy.youmonst.data));
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)))) {
        let shopdoor = chars[in_rooms(x, y, SHOPBASE)] ? TRUE : FALSE;

        /* break the door */
        if (gm.maploc.flags & D_TRAPPED) {
            if (flags.verbose)
                You(_("kick the door."));
            exercise(A_STR, FALSE);
            gm.maploc.flags = D_NODOOR;
            b_trapped(_("door"), FOOT);
        } else if (ACURR(A_STR) > 18 && !rn2(5) && !shopdoor) {
             ;
            pline(_("As you kick the door, it shatters to pieces!"));
            exercise(A_STR, TRUE);
            gm.maploc.flags = D_NODOOR;
        } else {
             ;
            pline(_("As you kick the door, it crashes open!"));
            exercise(A_STR, TRUE);
            gm.maploc.flags = D_BROKEN;
        }
        feel_newsym(x, y); /* we know we broke it */
        recalc_block_point(x, y); /* vision */
        if (shopdoor) {
            add_damage(x, y, SHOP_DOOR_COST);
            pay_for_damage(_("break"), FALSE);
        }
        if (in_town(x, y))
            void get_iter_mons(watchman_thief_arrest);
    } else {
        if (Blind())
            feel_location(x, y); /* we know we hit it */
        exercise(A_STR, TRUE);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        pline(_("%s!!"), (Deaf() || !rn2(3)) ? _("Thwack") : _("Whammm"));
        if (in_town(x, y))
            void get_iter_mons_xy(watchman_door_damage, x, y);
    }
}

/* kick non-door terrain */
function /* int */
kick_nondoor(x, y, avrg_attrib)
{ const $frame = stack_frame(); try {
    if (gm.maploc.typ == SDOOR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(gm.maploc); /* ->typ = DOOR */
             ;
            pline(_("Crash!  %s a secret door!"),
                  /* don't "kick open" when it's locked
                     unless it also happens to be trapped */
                  ((gm.maploc.flags & (D_LOCKED | D_TRAPPED))
                   == D_LOCKED) ? _("Your kick uncovers") : _("You kick open"));
            exercise(A_DEX, TRUE);
            if (gm.maploc.flags & D_TRAPPED) {
                gm.maploc.flags = D_NODOOR;
                b_trapped(_("door"), FOOT);
            } else if (gm.maploc.flags != D_NODOOR
                       && !(gm.maploc.flags & D_LOCKED))
                gm.maploc.flags = D_ISOPEN;
            feel_newsym(x, y); /* we know it's gone */
            if (gm.maploc.flags == D_ISOPEN
                || gm.maploc.flags == D_NODOOR)
                unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            kick_ouch(x, y, _(""));
            return ECMD_TIME;
        }
    }
    if (gm.maploc.typ == SCORR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
             ;
            pline(_("Crash!  You kick open a secret passage!"));
            exercise(A_DEX, TRUE);
            gm.maploc.typ = CORR;
            feel_newsym(x, y); /* we know it's gone */
            unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            kick_ouch(x, y, _(""));
            return ECMD_TIME;
        }
    }
    if (IS_THRONE(gm.maploc.typ)) {
        let i;
        if (Levitation()) {
            kick_dumb(x, y);
            return ECMD_TIME;
        }
        if ((Luck() < 0 || gm.maploc.flags) && !rn2(3)) {
            gm.maploc.flags = 0; /* don't leave loose ends.. */
            gm.maploc.typ = ROOM;
            void mkgold(rnd(200), x, y);
             ;
            if (Blind())
                pline(_("CRASH!  You destroy it."));
            else {
                pline(_("CRASH!  You destroy the throne."));
                newsym(x, y);
            }
            exercise(A_DEX, TRUE);
            return ECMD_TIME;
        } else if (Luck() > 0 && !rn2(3) && !gm.maploc.flags) {
            void mkgold(rn1(201, 300), x, y);
            i = Luck() + 1;
            if (i > 6)
                i = 6;
            while (i--)
                void mksobj_at(
                       rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), x, y,
                       FALSE, TRUE);
            if (Blind())
                You(_("kick %s loose!"), something());
            else {
                You(_("kick loose some ornamental coins and gems!"));
                newsym(x, y);
            }
            /* prevent endless milking */
            gm.maploc.flags = T_LOOTED;
            return ECMD_TIME;
        } else if (!rn2(4)) {
            if (dunlev(u.uz) < dunlevs_in_dungeon(u.uz)) {
                fall_through(FALSE, 0);
                return ECMD_TIME;
            } else {
                kick_ouch(x, y, _(""));
                return ECMD_TIME;
            }
        }
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    if (IS_ALTAR(gm.maploc.typ)) {
        if (Levitation()) {
            kick_dumb(x, y);
            return ECMD_TIME;
        }
        You(_("kick %s."), (Blind() ? something() : _("the altar")));
        altar_wrath(x, y);
        if (!rn2(3)) {
            kick_ouch(x, y, _(""));
            return ECMD_TIME;
        }
        exercise(A_DEX, TRUE);
        return ECMD_TIME;
    }
    if (IS_FOUNTAIN(gm.maploc.typ)) {
        if (Levitation()) {
            kick_dumb(x, y);
            return ECMD_TIME;
        }
        You(_("kick %s."), (Blind() ? something() : _("the fountain")));
        if (!rn2(3)) {
            kick_ouch(x, y, _(""));
            return ECMD_TIME;
        }
        /* make metal boots rust */
        if (uarmf && rn2(3))
            if (water_damage(uarmf, _("metal boots"), TRUE) == ER_NOTHING) {
                Your(_("boots get wet."));
                /* could cause short-lived fumbling here */
            }
        exercise(A_DEX, TRUE);
        return ECMD_TIME;
    }
    if (IS_GRAVE(gm.maploc.typ)) {
        if (Levitation()) {
            kick_dumb(x, y);
        } else if (rn2(4)) {
            /* minor injury */
            kick_ouch(x, y, _(""));
        } else if (!gm.maploc.horizontal && !rn2(2)) {
            /* disturb the grave: summon a ghoul (once only), same as
               when engraving */
            disturb_grave(x, y);
        } else {
            /* destroy the headstone, implicitly destroying any
               not-yet-created contents (including zombie or mummy);
               any already created contents will still be buried here */
            exercise(A_WIS, FALSE);
            if (Role_if(PM_ARCHEOLOGIST) || Role_if(PM_SAMURAI)
                || (u.ualign.type == A_LAWFUL && u.ualign.record > -10))
                adjalign(-sgn(u.ualign.type));
            gm.maploc.typ = ROOM;
            gm.maploc.flags = 0; /* clear 'flags' */
            gm.maploc.horizontal = 0; /* clear 'horizontal' */
            void mksobj_at(ROCK, x, y, TRUE, FALSE);
            del_engr_at(x, y);
            if (Blind()) {
                /* [feel this happen if Deaf?] */
                pline(_("Crack!  %s broke!"), Something());
            } else {
                pline_The(_("headstone topples over and breaks!"));
                newsym(x, y);
            }
        }
        return ECMD_TIME;
    }
    if (gm.maploc.typ == IRONBARS) {
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    if (IS_TREE(gm.maploc.typ)) {
        let treefruit;

        /* nothing, fruit or trouble? 75:23.5:1.5% */
        if (rn2(3)) {
            if (!rn2(6) && !(svm.mvitals[PM_KILLER_BEE].mvflags & G_GONE))
                You_hear(_("a low buzzing.")); /* a warning */
            kick_ouch(x, y, _(""));
            return ECMD_TIME;
        }
        if (rn2(15) && !(gm.maploc.flags & TREE_LOOTED)
            && (treefruit = rnd_treefruit_at(x, y))) {
            let nfruit = 8 - rnl(7), nfall;
            let frtype = treefruit.otyp;

            treefruit.quan = nfruit;
            treefruit.owt = unsigned(weight(treefruit));
            if (is_plural(treefruit))
                pline(_("Some %s fall from the tree!"), xname(treefruit));
            else
                pline(_("%s falls from the tree!"), An(xname(treefruit)));
            nfall = scatter(x, y, 2, MAY_HIT, treefruit);
            if (nfall != nfruit) {
                /* scatter left some in the tree, but treefruit
                 * may not refer to the correct object */
                treefruit = mksobj(frtype, TRUE, FALSE);
                treefruit.quan = nfruit - nfall;
                pline(_("%lld %s got caught in the branches."),
                      nfruit - nfall, xname(treefruit));
                dealloc_obj(treefruit);
            }
            exercise(A_DEX, TRUE);
            exercise(A_WIS, TRUE); /* discovered a new food source! */
            newsym(x, y);
            gm.maploc.flags |= TREE_LOOTED;
            return ECMD_TIME;
        } else if (!(gm.maploc.flags & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            let mm = stack_struct(struct_nhcoord);

            mm.x = x;
            mm.y = y;
            while (cnt--) {
                if (enexto(mm, mm.x, mm.y, mons[PM_KILLER_BEE])
                    && makemon(mons[PM_KILLER_BEE], mm.x, mm.y,
                               MM_ANGRY|MM_NOMSG))
                    made++;
            }
            if (made)
                pline(_("You've attracted the tree's former occupants!"));
            else
                You(_("smell stale honey."));
            gm.maploc.flags |= TREE_SWARM;
            return ECMD_TIME;
        }
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    if (IS_SINK(gm.maploc.typ)) {
        let gend = poly_gender();

        if (Levitation()) {
            kick_dumb(x, y);
            return ECMD_TIME;
        }
        if (rn2(5)) {
             ;
            if (!Deaf())
                pline(_("Klunk!  The pipes vibrate noisily."));
            else
                pline(_("Klunk!"));
            exercise(A_DEX, TRUE);
            return ECMD_TIME;
        } else if (!(gm.maploc.flags & S_LPUDDING) && !rn2(3)
                   && !(svm.mvitals[PM_BLACK_PUDDING].mvflags & G_GONE)) {
             ;
            if (Blind()) {
                if (!Deaf())
                    You_hear(_("a gushing sound."));
            } else {
                pline(_("A %s ooze gushes up from the drain!"),
                      hcolor(NH_BLACK()));
            }
            void makemon(mons[PM_BLACK_PUDDING], x, y, MM_NOMSG);
            exercise(A_DEX, TRUE);
            newsym(x, y);
            gm.maploc.flags |= S_LPUDDING;
            return ECMD_TIME;
        } else if (!(gm.maploc.flags & S_LDWASHER) && !rn2(3)
                   && !(svm.mvitals[PM_AMOROUS_DEMON].mvflags & G_GONE)) {
            /* can't resist... */
            pline(_("%s returns!"), (Blind() ? Something() : _("The dish washer")));
            if (makemon(mons[PM_AMOROUS_DEMON], x, y,
                        MM_NOMSG | ((gend == 1 || (gend == 2 && rn2(2)))
                                    ? MM_MALE : MM_FEMALE)))
                newsym(x, y);
            gm.maploc.flags |= S_LDWASHER;
            exercise(A_DEX, TRUE);
            return ECMD_TIME;
        } else if (!rn2(3)) {
            sink_backs_up(x, y);
            return ECMD_TIME;
        }
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    if (gm.maploc.typ == STAIRS || gm.maploc.typ == LADDER
        || IS_STWALL(gm.maploc.typ)) {
        if (!IS_STWALL(gm.maploc.typ) && gm.maploc.flags == LA_DOWN) {
            kick_dumb(x, y);
            return ECMD_TIME;
        }
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    kick_dumb(x, y);
    return ECMD_TIME;
} finally { stack_pop($frame); } }

/* the #kick command */
export function /* int */
dokick()
{ const $frame = stack_frame(); try {
    let x, y;
    let avrg_attrib;
    let glyph, oldglyph = -1;
    let mtmp;
    let no_kick = FALSE;

    if (nolimbs(gy.youmonst.data) || slithy(gy.youmonst.data)) {
        You(_("have no legs to kick with."));
        no_kick = TRUE;
    } else if (verysmall(gy.youmonst.data)) {
        You(_("are too small to do any kicking."));
        no_kick = TRUE;
    } else if (u.usteed) {
        if (yn_function(_("Kick your steed?"), ynchars, ord('y'), TRUE) == ord('y')) {
            You(_("kick %s."), mon_nam(u.usteed));
            kick_steed();
            return ECMD_TIME;
        } else {
            return ECMD_OK;
        }
    } else if (Wounded_legs()) {
        legs_in_no_shape(_("kicking"), FALSE);
        no_kick = TRUE;
    } else if (near_capacity() > SLT_ENCUMBER) {
        Your(_("load is too heavy to balance yourself for a kick."));
        no_kick = TRUE;
    } else if (gy.youmonst.data.mlet == S_LIZARD) {
        Your(_("legs cannot kick effectively."));
        no_kick = TRUE;
    } else if (u.uinwater && !rn2(2)) {
        Your(_("slow motion kick doesn't hit anything."));
        no_kick = TRUE;
    } else if (u.utrap) {
        no_kick = TRUE;
        switch (u.utraptype) {
        case TT_PIT:
            if (!Passes_walls())
                pline(_("There's not enough room to kick down here."));
            else
                no_kick = FALSE;
            break;
        case TT_WEB:
        case TT_BEARTRAP:
            You_cant(_("move your %s!"), body_part(LEG));
            break;
        default:
            break;
        }
    } else if (sobj_at(BOULDER, u.ux, u.uy) && !Passes_walls()) {
        pline(_("There's not enough room to kick in here."));
        no_kick = TRUE;
    }

    if (no_kick) {
        /* ignore direction typed before player notices kick failed */
        display_nhwindow()(WIN_MESSAGE, TRUE); /* --More-- */
        return ECMD_FAIL;
    }

    if (!getdir(0))
        return ECMD_CANCEL;
    if (!u.dx && !u.dy)
        return ECMD_CANCEL;

    x = u.ux + u.dx;
    y = u.uy + u.dy;
    gk.kickedloc.x = x, gk.kickedloc.y = y;

    /* KMH -- Kicking boots always succeed */
    if (uarmf && uarmf.otyp == KICKING_BOOTS)
        avrg_attrib = 99;
    else
        avrg_attrib = Math.trunc((ACURRSTR() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    if (u.uswallow) {
        switch (rn2(3)) {
        case 0:
            You_cant(_("move your %s!"), body_part(LEG));
            break;
        case 1:
            if (digests(u.ustuck.data)) {
                pline(_("%s burps loudly."), Monnam(u.ustuck));
                break;
            }
            /* FALLTHROUGH */;
            /*FALLTHRU*/
        default:
            Your(_("feeble kick has no effect."));
            break;
        }
        return ECMD_TIME;
    } else if (u.utrap && u.utraptype == TT_PIT) {
        /* must be Passes_walls */
        You(_("kick at the side of the pit."));
        return ECMD_TIME;
    }
    if (Levitation()) {
        let xx, yy;

        xx = u.ux - u.dx;
        yy = u.uy - u.dy;
        /* doors can be opened while levitating, so they must be
         * reachable for bracing purposes
         * Possible extension: allow bracing against stuff on the side?
         */
        if (isok(xx, yy) && !IS_OBSTRUCTED(levl()[xx][yy].typ)
            && !IS_DOOR(levl()[xx][yy].typ)
            && (!Is_airlevel(u.uz) || !OBJ_AT(xx, yy))) {
            You(_("have nothing to brace yourself against."));
            return ECMD_OK;
        }
    }

    mtmp = isok(x, y) ? m_at(x, y) : null;
    /* might not kick monster if it is hidden and becomes revealed,
       if it is peaceful and player declines to attack, or if the
       hero passes out due to encumbrance with low hp; svc.context.move
       will be 1 unless player declines to kick peaceful monster */
    if (mtmp) {
        oldglyph = glyph_at(x, y);
        if (!maybe_kick_monster(mtmp, x, y))
            return (svc.context.move ? ECMD_TIME : ECMD_OK);
    }

    wake_nearby(FALSE);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        gm.maploc = gn.nowhere;
        kick_ouch(x, y, _(""));
        return ECMD_TIME;
    }
    gm.maploc = levl()[x][y];

    /*
     * The next five tests should stay in their present order:
     * monsters, pools, objects, non-doors, doors.
     *
     * [FIXME:  Monsters who are hidden underneath objects or
     * in pools should lead to hero kicking the concealment
     * rather than the monster, probably exposing the hidden
     * monster in the process.  And monsters who are hidden on
     * ceiling shouldn't be kickable (unless hero is flying?);
     * kicking toward them should just target whatever is on
     * the floor at that spot.]
     */

    if (mtmp) {
        /* save mtmp->data (for recoil) in case mtmp gets killed */
        let mdat = mtmp.data;

        kick_monster(mtmp, x, y);
        glyph = glyph_at(x, y);
        /* see comment in attack_checks() */
        if (DEADMONSTER(mtmp)) { /* DEADMONSTER() */
            /* if we mapped an invisible monster and immediately
               killed it, we don't want to forget what we thought
               was there before the kick */
            if (glyph != oldglyph && glyph_is_invisible(glyph))
                show_glyph(x, y, oldglyph);
        } else if (!canspotmon(mtmp)
                   /* check <x,y>; monster that evades kick by jumping
                      to an unseen square doesn't leave an I behind */
                   && mtmp.mx == x && mtmp.my == y
                   && !glyph_is_invisible(glyph)
                   && !engulfing_u(mtmp)) {
            map_invisible(x, y);
        }
        /* recoil if floating */
        if ((Is_airlevel(u.uz) || Levitation()) && svc.context.move) {
            let range;

            range =
                (int(gy.youmonst.data.cwt) + (weight_cap() + inv_weight()));
            if (range < 1)
                range = 1; /* divide by zero avoidance */
            range = Math.trunc((3 * int(mdat.cwt)) / range);

            if (range < 1)
                range = 1;
            hurtle(-u.dx, -u.dy, range, TRUE);
        }
        return ECMD_TIME;
    }
    void unmap_invisible(x, y);
    if ((((is_pool(x, y) || gm.maploc.typ == LAVAWALL) ? 1 : 0)) ^ +!!u.uinwater) {
        /* objects normally can't be removed from water by kicking */
        You(_("splash some %s around."),
            hliquid(is_pool(x, y) ? _("water") : _("lava")));
        /* pretend the kick is fast enough for lava not to burn */
        return ECMD_TIME;
    }

    if (OBJ_AT(x, y) && (!Levitation() || Is_airlevel(u.uz)
                         || Is_waterlevel(u.uz) || sobj_at(BOULDER, x, y))) {
        let kickobjnam = stack_array(char, BUFSZ);

        if (kick_object(x, y, kickobjnam)) {
            if (Is_airlevel(u.uz))
                hurtle(-u.dx, -u.dy, 1, TRUE); /* assume it's light */
            return ECMD_TIME;
        }
        kick_ouch(x, y, kickobjnam);
        return ECMD_TIME;
    }

    if (IS_DOOR(gm.maploc.typ))
        kick_door(x, y, avrg_attrib);
    else
        return kick_nondoor(x, y, avrg_attrib);
    return ECMD_TIME;
} finally { stack_pop($frame); } }

function /* void */
drop_to(cc, loc, x, y)
{
    let stway = stairway_at(x, y);

    /* cover all the MIGR_xxx choices generated by down_gate() */
    switch (loc) {
    case MIGR_RANDOM: /* trap door or hole */
        if (Is_stronghold(u.uz)) {
            cc.x = valley_level().dnum;
            cc.y = valley_level().dlevel;
            break;
        } else if (In_endgame(u.uz) || Is_botlevel(u.uz)) {
            cc.y = cc.x = 0;
            break;
        }
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev.dnum;
            cc.y = stway.tolev.dlevel;
        } else {
            cc.x = u.uz.dnum;
            cc.y = u.uz.dlevel + 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        /* y==0 means "nowhere", in which case x doesn't matter */
        cc.y = cc.x = 0;
        break;
    }
}

/* player or missile impacts location, causing objects to fall down */
export function /* void */
impact_drop(
    missile,
    x, y,
    dlev)          /* if !0 send to dlev near player */
{ const $frame = stack_frame(); try {
    let toloc;
    let obj, obj2;
    let shkp;
    let oct, dct, price, debit, robbed;
    let angry, costly, isrock;
    let cc = stack_struct(struct_nhcoord);

    if (!OBJ_AT(x, y))
        return;

    toloc = down_gate(x, y);
    drop_to(cc, toloc, x, y);
    if (!cc.y)
        return;

    if (dlev) {
        /* send objects next to player falling through trap door.
         * checked in obj_delivery().
         */
        toloc = MIGR_WITH_HERO;
        cc.y = dlev;
    }

    costly = costly_spot(x, y);
    price = debit = robbed = 0;
    angry = FALSE;
    shkp = null;
    /* if 'costly', we must keep a record of ESHK(shkp) before
     * it undergoes changes through the calls to stolen_value.
     * the angry bit must be reset, if needed, in this fn, since
     * stolen_value is called under the 'silent' flag to avoid
     * unsavory pline repetitions.
     */
    if (costly) {
        if ((shkp = shop_keeper(chars[in_rooms(x, y, SHOPBASE)])) != null) {
            debit = ESHK(shkp).debit;
            robbed = ESHK(shkp).robbed;
            angry = +!shkp.mpeaceful;
        }
    }

    isrock = (((missile && missile.otyp == ROCK) ? 1 : 0));
    oct = dct = 0;
    for (obj = svl.level.objects[x][y]; obj; obj = obj2) {
        obj2 = obj.v.v_nexthere;
        if (obj == missile)
            continue;
        /* number of objects in the pile */
        oct += obj.quan;
        if (obj == uball || obj == uchain)
            continue;
        /* boulders can fall too, but rarely & never due to rocks */
        if ((isrock && obj.otyp == BOULDER)
            || rn2(obj.otyp == BOULDER ? 30 : 3))
            continue;
        obj_extract_self(obj);

        if (costly) {
            price += stolen_value(obj, x, y,
                                  (((costly_spot(u.ux, u.uy)
                                   && strchr(u.urooms,
                                            chars[in_rooms(x, y, SHOPBASE)])) ? 1 : 0)),
                                  TRUE);
            /* set obj->no_charge to 0 */
            if (Has_contents(obj))
                picked_container(obj); /* does the right thing */
            if (obj.oclass != COIN_CLASS)
                obj.no_charge = 0;
        }

        add_to_migration(obj);
        obj.ox = cc.x;
        obj.oy = cc.y;
        obj.owornmask = toloc;

        /* number of fallen objects */
        dct += obj.quan;
    }

    if (dct && cansee(x, y)) { /* at least one object fell */
        let what = (dct == 1 ? _("object falls") : _("objects fall"));

        if (missile)
            pline(_("From the impact, %sother %s."),
                  dct == oct ? _("the ") : dct == 1 ? _("an") : _(""), what);
        else if (oct == dct)
            pline(_("%s adjacent %s %s."), dct == 1 ? _("The") : _("All the"), what,
                  gg.gate_str);
        else
            pline(_("%s adjacent %s %s."),
                  dct == 1 ? _("One of the") : _("Some of the"),
                  dct == 1 ? _("objects falls") : what, gg.gate_str);
    }

    if (costly && shkp && price) {
        if (ESHK(shkp).robbed > robbed) {
            You(_("removed %lld %s worth of goods!"), price, currency(price));
            if (cansee(shkp.mx, shkp.my)) {
                if (chars[ESHK(shkp).customer + 0] == 0)
                    void strncpy(ESHK(shkp).customer, svp.plname, PL_NSIZ);
                if (angry)
                    pline(_("%s is infuriated!"), Shknam(shkp));
                else
                    pline(_("\"%s, you are a thief!\""), svp.plname);
            } else
                You_hear(_("a scream, \"Thief!\""));
            hot_pursuit(shkp);
            void angry_guards(FALSE);
            return;
        }
        if (ESHK(shkp).debit > debit) {
            let amt = (ESHK(shkp).debit - debit);
            You(_("owe %s %lld %s for goods lost."), shkname(shkp), amt,
                currency(amt));
        }
    }
} finally { stack_pop($frame); } }

/* NOTE: ship_object assumes otmp was FREED from fobj or invent.
 * <x,y> is the point of drop.  otmp is _not_ an <x,y> resident:
 * otmp is either a kicked, dropped, or thrown object.
 */
export function /* boolean */
ship_object(otmp, x, y, shop_floor_obj)
{ const $frame = stack_frame(); try {
    let toloc;
    let ox, oy;
    let cc = stack_struct(struct_nhcoord);
    let obj;
    let t;
    let nodrop, unpaid, container, impact = FALSE, chainthere = FALSE;
    let n = 0;

    if (!otmp)
        return FALSE;
    if ((toloc = down_gate(x, y)) == MIGR_NOWHERE)
        return FALSE;
    drop_to(cc, toloc, x, y);
    if (!cc.y)
        return FALSE;

    /* objects other than attached iron ball always fall down ladder,
       but have a chance of staying otherwise */
    nodrop = (((otmp == uball) || (otmp == uchain)
             || (toloc != MIGR_LADDER_UP && rn2(3))) ? 1 : 0);

    container = Has_contents(otmp);
    unpaid = is_unpaid(otmp);

    if (OBJ_AT(x, y)) {
        for (obj = svl.level.objects[x][y]; obj; obj = obj.v.v_nexthere) {
            if (obj == uchain)
                chainthere = TRUE;
            else if (obj != otmp)
                n += obj.quan;
        }
        if (n)
            impact = TRUE;
    }
    /* boulders never fall through trap doors, but they might knock
       other things down before plugging the hole */
    if (otmp.otyp == BOULDER && ((t = t_at(x, y)) != null)
        && is_hole(t.ttyp)) {
        if (impact)
            impact_drop(otmp, x, y, 0);
        return FALSE; /* let caller finish the drop */
    }

    if (cansee(x, y))
        otransit_msg(otmp, nodrop, chainthere, n);

    if (nodrop) {
        if (impact) {
            impact_drop(otmp, x, y, 0);
            maybe_unhide_at(x, y);
        }
        return FALSE;
    }

    if (unpaid || shop_floor_obj) {
        if (unpaid) {
            void stolen_value(otmp, u.ux, u.uy, TRUE, FALSE);
        } else {
            ox = otmp.ox;
            oy = otmp.oy;
            void stolen_value(
                otmp, ox, oy,
                (((costly_spot(u.ux, u.uy)
                 && strchr(u.urooms, chars[in_rooms(ox, oy, SHOPBASE)])) ? 1 : 0)),
                FALSE);
        }
        /* set otmp->no_charge to 0 */
        if (container)
            picked_container(otmp); /* happens to do the right thing */
        if (otmp.oclass != COIN_CLASS)
            otmp.no_charge = 0;
    }

    if (otmp.owornmask)
        remove_worn_item(otmp, TRUE);

    /* some things break rather than ship */
    if (breaktest(otmp)) {
        let result;

        if (objects[otmp.otyp].oc_material == GLASS
            || otmp.otyp == EXPENSIVE_CAMERA) {
            if (otmp.otyp == MIRROR)
                change_luck(-2);
            result = _("crash");
        } else {
            /* penalty for breaking eggs laid by you */
            if (otmp.otyp == EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(schar((-min(otmp.quan, 5))));
            result = _("splat");
        }
        if (otmp.otyp == EGG) {
             ;
        } else {
             ;
        }
        You_hear(_("a muffled %s."), result);
        obj_extract_self(otmp);
        obfree(otmp, null);
        return TRUE;
    }

    add_to_migration(otmp);
    otmp.ox = cc.x;
    otmp.oy = cc.y;
    otmp.owornmask = toloc;

    /* boulder from rolling boulder trap, no longer part of the trap */
    if (otmp.otyp == BOULDER)
        otmp.otrapped = 0;

    if (impact) {
        /* the objs impacted may be in a shop other than
         * the one in which the hero is located.  another
         * check for a shk is made in impact_drop.  it is, e.g.,
         * possible to kick/throw an object belonging to one
         * shop into another shop through a gap in the wall,
         * and cause objects belonging to the other shop to
         * fall down a trap door--thereby getting two shopkeepers
         * angry at the hero in one shot.
         */
        impact_drop(otmp, x, y, 0);
        newsym(x, y);
    }
    return TRUE;
} finally { stack_pop($frame); } }

export function /* void */
obj_delivery(near_hero)
{ const $frame = stack_frame(); try {
    let otmp, otmp2;
    let nx = 0, ny = 0;
    let where;
    let nobreak, noscatter;
    let stway;
    let fromdlev = stack_struct(struct_d_level);
    let isladder;

    for (otmp = gm.migrating_objs; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.ox != u.uz.dnum || otmp.oy != u.uz.dlevel)
            continue;

        where = (otmp.owornmask & 0x7fff); /* destination code */
        if ((where & MIGR_TO_SPECIES) != 0)
            continue;

        nobreak = +((where & MIGR_NOBREAK) != 0);
        noscatter = +((where & MIGR_WITH_HERO) != 0);
        where &= ~(MIGR_NOBREAK | MIGR_NOSCATTER);

        if (+!near_hero ^ (+(where == MIGR_WITH_HERO)))
            continue;

        obj_extract_self(otmp);
        otmp.owornmask = 0;
        fromdlev.dnum = otmp.omigr_from_dnum;
        fromdlev.dlevel = otmp.omigr_from_dlevel;

        isladder = FALSE;

        switch (where) {
        case MIGR_LADDER_UP:
            isladder = TRUE;
            /* FALLTHROUGH */;
            /*FALLTHRU*/
        case MIGR_STAIRS_UP:
        case MIGR_SSTAIRS:
            if ((stway = stairway_find_from(fromdlev, isladder)) != null) {
                nx = stway.sx;
                ny = stway.sy;
            }
            break;
        case MIGR_WITH_HERO:
            nx = u.ux, ny = u.uy;
            break;
        default:
        case MIGR_RANDOM:
            nx = ny = 0;
            break;
        }
        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;
        if (nx > 0) {
            place_object(otmp, nx, ny);
            if (!nobreak && !IS_SOFT(levl()[nx][ny].typ)) {
                if (where == MIGR_WITH_HERO) {
                    if (breaks(otmp, nx, ny))
                        continue;
                } else if (breaktest(otmp)) {
                    /* assume it broke before player arrived, no messages */
                    delobj(otmp);
                    continue;
                }
            }
            stackobj(otmp);
            if (!noscatter)
                void scatter(nx, ny, rnd(2), 0, otmp);
            else
                newsym(nx, ny);
        } else { /* random location */
            /* set dummy coordinates because there's no
               current position for rloco() to update */
            otmp.ox = otmp.oy = 0;
            if (rloco(otmp) && !nobreak && breaktest(otmp)) {
                /* assume it broke before player arrived, no messages */
                delobj(otmp);
            }
        }
    }
} finally { stack_pop($frame); } }

export function /* void */
deliver_obj_to_mon(mtmp, cnt, deliverflags)
{
    let otmp, otmp2;
    let where, maxobj = 1;
    let at_crime_scene = In_mines(u.uz);

    if ((deliverflags & DF_RANDOM) && cnt > 1)
        maxobj = rnd(cnt);
    else if (deliverflags & DF_ALL)
        maxobj = 0;
    else
        maxobj = 1;




    cnt = 0;
    for (otmp = gm.migrating_objs; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        where = (otmp.owornmask & 0x7fff); /* destination code */
        if ((where & MIGR_TO_SPECIES) == 0)
            continue;

        if (otmp.corpsenm != NON_PM
            && ((mtmp.data.mflags2 & DELIVER_PM)
                == unsigned(otmp.corpsenm))) {
            obj_extract_self(otmp);
            otmp.owornmask = 0;
            otmp.ox = otmp.oy = 0;

            /* special treatment for orcs and their kind */
            if ((otmp.corpsenm & M2_ORC) != 0 && has_oname(otmp)) {
                if (!has_mgivenname(mtmp)) {
                    if (at_crime_scene || !rn2(2))
                        mtmp = christen_orc(mtmp,
                                            at_crime_scene ? ONAME(otmp)
                                                           : 0,
                                            /* bought the stolen goods */
                                            _(" the Fence"));
                }
                free_oname(otmp);
            }
            otmp.corpsenm = NON_PM;
            otmp.omigr_from_dnum = 0;
            otmp.omigr_from_dlevel = 0;
            void add_to_minv(mtmp, otmp);
            cnt++;
            if (maxobj && cnt >= maxobj)
                break;
            /* getting here implies DF_ALL */
        }
    }
} export const DELIVER_PM = (M2_UNDEAD | M2_WERE | M2_HUMAN | M2_ELF | M2_DWARF                      | M2_GNOME | M2_ORC | M2_DEMON | M2_GIANT);

function /* void */
otransit_msg(otmp, nodrop, chainthere, num)
{ const $frame = stack_frame(); try {
    let optr = 0, obuf = stack_array(char, BUFSZ), xbuf = stack_array(char, BUFSZ);

    if (otmp.otyp == CORPSE) {
        /* Tobjnam() calls xname() and would yield "The corpse";
           we want more specific "The newt corpse" or "Medusa's corpse" */
        optr = upstart(corpse_xname(otmp, 0, CXN_PFX_THE));
    } else {
        optr = Tobjnam(otmp, 0);
    }
    void strcpy(obuf, optr);

    if (num || chainthere) {
        /* As of 3.6.2: use a separate buffer for the suffix to avoid risk of
           overrunning obuf[] (let pline() handle truncation if necessary) */
        if (num) { /* means: other objects are impacted */
            void sprintf(xbuf, _(" %s %s object%s"), otense(otmp, _("hit")), (num == 1) ? _("another") : _("other"), (num > 1) ? _("s") : _(""))
;
        } else { /* chain-only msg */
            void sprintf(xbuf, _(" %s your chain"), otense(otmp, _("rattle")));
        }
        if (nodrop)
            void sprintf(eos(xbuf), _("."));
        else
            void sprintf(eos(xbuf), _(" and %s %s."), otense(otmp, _("fall")), gg.gate_str)
;
        pline(_("%s%s"), obuf, xbuf);
    } else if (!nodrop)
        pline(_("%s %s %s."), obuf, otense(otmp, _("fall")), gg.gate_str);
} finally { stack_pop($frame); } }

/* migration destination for objects which fall down to next level */
export function /* schar */
down_gate(x, y)
{
    let ttmp;
    let stway = stairway_at(x, y);

    gg.gate_str = 0;
    /* this matches the player restriction in goto_level() */
    if (on_level(u.uz, (svd.dungeon_topology.d_qstart_level)) && !ok_to_quest()) {
        return MIGR_NOWHERE;
    }
    if (stway && !stway.up && !stway.isladder) {
        gg.gate_str = _("down the stairs");
        return (stway.tolev.dnum == u.uz.dnum) ? MIGR_STAIRS_UP
                                                : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        gg.gate_str = _("down the ladder");
        return MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap drop might or might not */
    if ((ttmp = t_at(x, y)) != null && ttmp.tseen && is_hole(ttmp.ttyp)) {
        gg.gate_str = (ttmp.ttyp == TRAPDOOR) ? _("through the trap door")
                                              : _("through the hole");
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

/*dokick.c*/
import { A_LAWFUL } from "./align.h.js";
import { ART_MJOLLNIR } from "./artilist.h.js";
import { A_CHA } from "./attrib.h.js";
import { A_CON } from "./attrib.h.js";
import { A_DEX } from "./attrib.h.js";
import { A_STR } from "./attrib.h.js";
import { A_WIS } from "./attrib.h.js";
import { ACURR } from "./attrib.h.macros.js";
import { ACURRSTR } from "./attrib.h.macros.js";
import { struct_nhcoord } from "./coord.h.js";
import { NH_BLACK } from "./decl.h.macros.js";
import { Something } from "./decl.h.macros.js";
import { something } from "./decl.h.macros.js";
import { COIN_CLASS } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { S_EEL } from "./defsym.h.js";
import { S_LIZARD } from "./defsym.h.js";
import { canspotmon } from "./display.h.macros.js";
import { glyph_is_invisible } from "./display.h.macros.js";
import { MIGR_LADDER_UP } from "./dungeon.h.js";
import { MIGR_NOBREAK } from "./dungeon.h.js";
import { MIGR_NOSCATTER } from "./dungeon.h.js";
import { MIGR_NOWHERE } from "./dungeon.h.js";
import { MIGR_RANDOM } from "./dungeon.h.js";
import { MIGR_SSTAIRS } from "./dungeon.h.js";
import { MIGR_STAIRS_UP } from "./dungeon.h.js";
import { MIGR_TO_SPECIES } from "./dungeon.h.js";
import { MIGR_WITH_HERO } from "./dungeon.h.js";
import { struct_d_level } from "./dungeon.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { Is_airlevel } from "./dungeon.h.macros.js";
import { Is_stronghold } from "./dungeon.h.macros.js";
import { Is_waterlevel } from "./dungeon.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { PL_NSIZ } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { CXN_PFX_THE } from "./hack.h.js";
import { DF_ALL } from "./hack.h.js";
import { DF_RANDOM } from "./hack.h.js";
import { ECMD_CANCEL } from "./hack.h.js";
import { ECMD_FAIL } from "./hack.h.js";
import { ECMD_OK } from "./hack.h.js";
import { ECMD_TIME } from "./hack.h.js";
import { FOOT } from "./hack.h.js";
import { KICKED_WEAPON } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { LEG } from "./hack.h.js";
import { MAY_HIT } from "./hack.h.js";
import { MM_ANGRY } from "./hack.h.js";
import { MM_FEMALE } from "./hack.h.js";
import { MM_MALE } from "./hack.h.js";
import { MM_NOMSG } from "./hack.h.js";
import { NO_TRAP_FLAGS } from "./hack.h.js";
import { SHOP_DOOR_COST } from "./hack.h.js";
import { SLT_ENCUMBER } from "./hack.h.js";
import { VIS_EFFECTS } from "./hack.h.js";
import { Maybe_Half_Phys } from "./hack.h.macros.js";
import { ROLL_FROM } from "./hack.h.macros.js";
import { min } from "./hack.h.macros.js";
import { pline1 } from "./hack.h.macros.js";
import { rn1 } from "./hack.h.macros.js";
import { valley_level } from "./hack.h.macros.js";
import { ESHK } from "./mextra.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { SHOPBASE } from "./mkroom.h.js";
import { AT_KICK } from "./monattk.h.js";
import { M_ATTK_DEF_DIED } from "./monattk.h.js";
import { M_ATTK_MISS } from "./monattk.h.js";
import { bigmonst } from "./mondata.h.macros.js";
import { can_teleport } from "./mondata.h.macros.js";
import { digests } from "./mondata.h.macros.js";
import { haseyes } from "./mondata.h.macros.js";
import { is_floater } from "./mondata.h.macros.js";
import { is_flyer } from "./mondata.h.macros.js";
import { is_giant } from "./mondata.h.macros.js";
import { is_mercenary } from "./mondata.h.macros.js";
import { is_watch } from "./mondata.h.macros.js";
import { likes_gold } from "./mondata.h.macros.js";
import { nohands } from "./mondata.h.macros.js";
import { nolimbs } from "./mondata.h.macros.js";
import { slithy } from "./mondata.h.macros.js";
import { thick_skinned } from "./mondata.h.macros.js";
import { touch_petrifies } from "./mondata.h.macros.js";
import { verysmall } from "./mondata.h.macros.js";
import { G_GONE } from "./monflag.h.js";
import { M2_DEMON } from "./monflag.h.js";
import { M2_DWARF } from "./monflag.h.js";
import { M2_ELF } from "./monflag.h.js";
import { M2_GIANT } from "./monflag.h.js";
import { M2_GNOME } from "./monflag.h.js";
import { M2_HUMAN } from "./monflag.h.js";
import { M2_ORC } from "./monflag.h.js";
import { M2_UNDEAD } from "./monflag.h.js";
import { M2_WERE } from "./monflag.h.js";
import { M_AP_MONSTER } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { M_AP_TYPE } from "./monst.h.macros.js";
import { engulfing_u } from "./monst.h.macros.js";
import { ismnum } from "./monst.h.macros.js";
import { NON_PM } from "./monsters.h.js";
import { PM_AMOROUS_DEMON } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_BLACK_PUDDING } from "./monsters.h.js";
import { PM_CAPTAIN } from "./monsters.h.js";
import { PM_KILLER_BEE } from "./monsters.h.js";
import { PM_LIEUTENANT } from "./monsters.h.js";
import { PM_SAMURAI } from "./monsters.h.js";
import { PM_SASQUATCH } from "./monsters.h.js";
import { PM_SERGEANT } from "./monsters.h.js";
import { PM_SHADE } from "./monsters.h.js";
import { PM_SOLDIER } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { ER_NOTHING } from "./obj.h.js";
import { OBJ_MIGRATING } from "./obj.h.js";
import { OBJ_MINVENT } from "./obj.h.js";
import { Has_contents } from "./obj.h.macros.js";
import { Is_box } from "./obj.h.macros.js";
import { Is_container } from "./obj.h.macros.js";
import { Is_mbag } from "./obj.h.macros.js";
import { ONAME } from "./obj.h.macros.js";
import { has_oname } from "./obj.h.macros.js";
import { is_plural } from "./obj.h.macros.js";
import { GLASS } from "./objclass.h.js";
import { BOULDER } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { DILITHIUM_CRYSTAL } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { EXPENSIVE_CAMERA } from "./objects.h.js";
import { KICKING_BOOTS } from "./objects.h.js";
import { LUCKSTONE } from "./objects.h.js";
import { MIRROR } from "./objects.h.js";
import { ROCK } from "./objects.h.js";
import { NATTK } from "./permonst.h.js";
import { RIGHT_SIDE } from "./prop.h.js";
import { W_ARMF } from "./prop.h.js";
import { CORR } from "./rm.h.js";
import { D_BROKEN } from "./rm.h.js";
import { D_ISOPEN } from "./rm.h.js";
import { D_LOCKED } from "./rm.h.js";
import { D_NODOOR } from "./rm.h.js";
import { D_TRAPPED } from "./rm.h.js";
import { D_WARNED } from "./rm.h.js";
import { IRONBARS } from "./rm.h.js";
import { LADDER } from "./rm.h.js";
import { LAVAWALL } from "./rm.h.js";
import { LA_DOWN } from "./rm.h.js";
import { ROOM } from "./rm.h.js";
import { SCORR } from "./rm.h.js";
import { SDOOR } from "./rm.h.js";
import { STAIRS } from "./rm.h.js";
import { S_LDWASHER } from "./rm.h.js";
import { S_LPUDDING } from "./rm.h.js";
import { TREE_LOOTED } from "./rm.h.js";
import { TREE_SWARM } from "./rm.h.js";
import { T_LOOTED } from "./rm.h.js";
import { IS_ALTAR } from "./rm.h.macros.js";
import { IS_DOOR } from "./rm.h.macros.js";
import { IS_DRAWBRIDGE } from "./rm.h.macros.js";
import { IS_FOUNTAIN } from "./rm.h.macros.js";
import { IS_GRAVE } from "./rm.h.macros.js";
import { IS_OBSTRUCTED } from "./rm.h.macros.js";
import { IS_SINK } from "./rm.h.macros.js";
import { IS_SOFT } from "./rm.h.macros.js";
import { IS_STWALL } from "./rm.h.macros.js";
import { IS_THRONE } from "./rm.h.macros.js";
import { IS_TREE } from "./rm.h.macros.js";
import { OBJ_AT } from "./rm.h.macros.js";
import { ZAP_POS } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { remove_monster } from "./rm.h.macros.js";
import { P_MARTIAL_ARTS } from "./skills.h.js";
import { P_NONE } from "./skills.h.js";
import { martial_bonus } from "./skills.h.macros.js";
import { STATUE_TRAP } from "./trap.h.js";
import { TRAPDOOR } from "./trap.h.js";
import { Trap_Killed_Mon } from "./trap.h.js";
import { WEB } from "./trap.h.js";
import { is_hole } from "./trap.h.macros.js";
import { is_pit } from "./trap.h.macros.js";
import { cansee } from "./vision.h.macros.js";
import { couldsee } from "./vision.h.macros.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { TT_BEARTRAP } from "./you.h.js";
import { TT_PIT } from "./you.h.js";
import { TT_WEB } from "./you.h.js";
import { Luck } from "./you.h.macros.js";
import { Role_if } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { mhis } from "./you.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { Deaf } from "./youprop.h.macros.js";
import { Fumbling } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Levitation } from "./youprop.h.macros.js";
import { Passes_walls } from "./youprop.h.macros.js";
import { Stone_resistance } from "./youprop.h.macros.js";
import { Wounded_legs } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { schar } from "../rt/ctypes.js";
import { short } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strncpy } from "../rt/libc.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { ptr_to } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { snuff_candle } from "./apply.js";
import { is_art } from "./artifact.js";
import { adjalign } from "./attrib.js";
import { change_luck } from "./attrib.js";
import { exercise } from "./attrib.js";
import { getdir } from "./cmd.js";
import { isok } from "./cmd.js";
import { yn_function } from "./cmd.js";
import { find_drawbridge } from "./dbridge.js";
import { is_drawbridge_wall } from "./dbridge.js";
import { is_ice } from "./dbridge.js";
import { is_pool } from "./dbridge.js";
import { flags } from "./decl.js";
import { gb } from "./decl.js";
import { gg } from "./decl.js";
import { gi } from "./decl.js";
import { gk } from "./decl.js";
import { gm } from "./decl.js";
import { gn } from "./decl.js";
import { gy } from "./decl.js";
import { svc } from "./decl.js";
import { svd } from "./decl.js";
import { svk } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { svp } from "./decl.js";
import { u } from "./decl.js";
import { ynchars } from "./decl.js";
import { cvt_sdoor_to_door } from "./detect.js";
import { find_trap } from "./detect.js";
import { canseemon } from "./display.js";
import { feel_location } from "./display.js";
import { feel_newsym } from "./display.js";
import { glyph_at } from "./display.js";
import { map_invisible } from "./display.js";
import { newsym } from "./display.js";
import { show_glyph } from "./display.js";
import { unmap_invisible } from "./display.js";
import { flooreffects } from "./do.js";
import { legs_in_no_shape } from "./do.js";
import { set_wounded_legs } from "./do.js";
import { Monnam } from "./do_name.js";
import { a_monnam } from "./do_name.js";
import { christen_orc } from "./do_name.js";
import { free_oname } from "./do_name.js";
import { hcolor } from "./do_name.js";
import { hliquid } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { abuse_dog } from "./dog.js";
import { finish_meating } from "./dogmove.js";
import { breaks } from "./dothrow.js";
import { breaktest } from "./dothrow.js";
import { hero_breaks } from "./dothrow.js";
import { hurtle } from "./dothrow.js";
import { thitmonst } from "./dothrow.js";
import { In_mines } from "./dungeon.js";
import { Is_botlevel } from "./dungeon.js";
import { dunlev } from "./dungeon.js";
import { dunlevs_in_dungeon } from "./dungeon.js";
import { on_level } from "./dungeon.js";
import { surface } from "./dungeon.js";
import { del_engr_at } from "./engrave.js";
import { disturb_grave } from "./engrave.js";
import { u_wipe_engr } from "./engrave.js";
import { scatter } from "./explode.js";
import { sink_backs_up } from "./fountain.js";
import { impact_disturbs_zombies } from "./hack.js";
import { in_rooms } from "./hack.js";
import { in_town } from "./hack.js";
import { inv_weight } from "./hack.js";
import { losehp } from "./hack.js";
import { money_cnt } from "./hack.js";
import { near_capacity } from "./hack.js";
import { overexertion } from "./hack.js";
import { weight_cap } from "./hack.js";
import { eos } from "./hacklib.js";
import { sgn } from "./hacklib.js";
import { upstart } from "./hacklib.js";
import { currency } from "./invent.js";
import { delobj } from "./invent.js";
import { sobj_at } from "./invent.js";
import { stackobj } from "./invent.js";
import { useup } from "./invent.js";
import { breakchestlock } from "./lock.js";
import { makemon } from "./makemon.js";
import { add_to_migration } from "./mkobj.js";
import { add_to_minv } from "./mkobj.js";
import { dealloc_obj } from "./mkobj.js";
import { mkgold } from "./mkobj.js";
import { mksobj } from "./mkobj.js";
import { mksobj_at } from "./mkobj.js";
import { obj_extract_self } from "./mkobj.js";
import { place_object } from "./mkobj.js";
import { rnd_treefruit_at } from "./mkobj.js";
import { splitobj } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { angry_guards } from "./mon.js";
import { get_iter_mons } from "./mon.js";
import { get_iter_mons_xy } from "./mon.js";
import { killed } from "./mon.js";
import { maybe_mnexto } from "./mon.js";
import { maybe_unhide_at } from "./mon.js";
import { seemimic } from "./mon.js";
import { setmangry } from "./mon.js";
import { wake_nearby } from "./mon.js";
import { wake_nearto } from "./mon.js";
import { wakeup } from "./mon.js";
import { attacktype } from "./mondata.js";
import { poly_when_stoned } from "./mondata.js";
import { closed_door } from "./monmove.js";
import { mon_yells } from "./monmove.js";
import { monflee } from "./monmove.js";
import { set_apparxy } from "./monmove.js";
import { mons } from "./monst.js";
import { objects } from "./objects.js";
import { An } from "./objnam.js";
import { Doname2 } from "./objnam.js";
import { The } from "./objnam.js";
import { Tobjnam } from "./objnam.js";
import { corpse_xname } from "./objnam.js";
import { distant_name } from "./objnam.js";
import { doname } from "./objnam.js";
import { killer_xname } from "./objnam.js";
import { makeplural } from "./objnam.js";
import { otense } from "./objnam.js";
import { rnd_class } from "./objnam.js";
import { singular } from "./objnam.js";
import { xname } from "./objnam.js";
import { Norep } from "./pline.js";
import { There } from "./pline.js";
import { You } from "./pline.js";
import { You_cant } from "./pline.js";
import { You_hear } from "./pline.js";
import { Your } from "./pline.js";
import { pline } from "./pline.js";
import { pline_The } from "./pline.js";
import { verbalize } from "./pline.js";
import { body_part } from "./polyself.js";
import { poly_gender } from "./polyself.js";
import { polymon } from "./polyself.js";
import { altar_wrath } from "./pray.js";
import { ok_to_quest } from "./quest.js";
import { m_in_out_region } from "./region.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { rnl } from "./rnd.js";
import { add_damage } from "./shk.js";
import { addtobill } from "./shk.js";
import { contained_gold } from "./shk.js";
import { costly_adjacent } from "./shk.js";
import { costly_gold } from "./shk.js";
import { costly_spot } from "./shk.js";
import { donate_gold } from "./shk.js";
import { find_objowner } from "./shk.js";
import { hot_pursuit } from "./shk.js";
import { inside_shop } from "./shk.js";
import { is_unpaid } from "./shk.js";
import { make_angry_shk } from "./shk.js";
import { make_happy_shk } from "./shk.js";
import { obfree } from "./shk.js";
import { pay_for_damage } from "./shk.js";
import { picked_container } from "./shk.js";
import { shop_keeper } from "./shk.js";
import { stolen_value } from "./shk.js";
import { subfrombill } from "./shk.js";
import { Shknam } from "./shknam.js";
import { shkname } from "./shknam.js";
import { stairway_at } from "./stairs.js";
import { stairway_find_from } from "./stairs.js";
import { mpickobj } from "./steal.js";
import { remove_worn_item } from "./steal.js";
import { kick_steed } from "./steed.js";
import { place_monster } from "./steed.js";
import { enexto } from "./teleport.js";
import { goodpos } from "./teleport.js";
import { noteleport_level } from "./teleport.js";
import { rloco } from "./teleport.js";
import { activate_statue_trap } from "./trap.js";
import { b_trapped } from "./trap.js";
import { chest_trap } from "./trap.js";
import { fall_through } from "./trap.js";
import { instapetrify } from "./trap.js";
import { mintrap } from "./trap.js";
import { t_at } from "./trap.js";
import { water_damage } from "./trap.js";
import { attack_checks } from "./uhitm.js";
import { check_caitiff } from "./uhitm.js";
import { damageum } from "./uhitm.js";
import { find_roll_to_hit } from "./uhitm.js";
import { missum } from "./uhitm.js";
import { mon_maybe_unparalyze } from "./uhitm.js";
import { passive } from "./uhitm.js";
import { hidden_gold } from "./vault.js";
import { recalc_block_point } from "./vision.js";
import { unblock_point } from "./vision.js";
import { special_dmgval } from "./weapon.js";
import { use_skill } from "./weapon.js";
import { bhit } from "./zap.js";
import { miss } from "./zap.js";
import { obj_resists } from "./zap.js";
