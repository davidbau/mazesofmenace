/* NetHack 5.0	dokick.c	$NHDT-Date: 1712453347 2024/04/07 01:29:07 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.223 $ */
/* Copyright (c) Izchak Miller, Mike Stephenson, Steve Linhart, 1989. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

// Original is_bigfoot and martial C.TU macros expand at each source expression.


/* gk.kickedobj (decl.c) tracks a kicked object until placed or destroyed */


export const kick_passes_thru = "kick passes harmlessly through";

/* kicking damage when not poly'd into a form with a kick attack */
export function kickdmg(mon, clumsy)
{
    clumsy = C.boolean(clumsy);
    let mdx, mdy;
    let dmg = Math.trunc((C.ACURRSTR + C.ACURR(C.A_DEX) + C.ACURR(C.A_CON)) / 15);
    let specialdmg, kick_skill = C.P_NONE;
    let trapkilled = 0;

    if (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)
        dmg += 5;

    /* excessive wt affects dex, so it affects dmg */
    if (clumsy)
        dmg = Math.trunc(dmg / 2);

    /* kicking a dragon or an elephant will not harm it */
    if (C.thick_skinned(mon.data))
        dmg = 0;

    /* attacking a shade is normally useless */
    if (C.samePtr(mon.data, C.mons[C.PM_SHADE]))
        dmg = 0;

    specialdmg = C.special_dmgval(C.gy.youmonst, mon, C.W_ARMF, 0);

    if (C.samePtr(mon.data, C.mons[C.PM_SHADE]) && !specialdmg) {
        C.pline_The("%s.", kick_passes_thru);
        /* doesn't exercise skill or abuse alignment or frighten pet,
           and shades have no passive counterattack */
        return;
    }

    if (C.M_AP_TYPE(mon))
        C.seemimic(mon);

    C.check_caitiff(mon);

    /* squeeze some guilt feelings... */
    if (mon.mtame) {
        C.abuse_dog(mon);
        if (mon.mtame)
            C.monflee(mon, (dmg ? C.rnd(dmg, 74, 'kickdmg') : 1), 0, 0);
        else
            mon.mflee = 0;
    }

    if (dmg > 0) {
        /* convert potential damage to actual damage */
        dmg = C.rnd(dmg, 81, 'kickdmg');
        if ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS))) {
            if (dmg > 1)
                kick_skill = C.P_MARTIAL_ARTS;
            dmg += C.rn2(Math.trunc(C.ACURR(C.A_DEX) / 2) + 1, 85, 'kickdmg');
        }
        /* a good kick exercises your dex */
        C.exercise(C.A_DEX, 1);
    }
    dmg += specialdmg; /* for blessed (or hypothetically, silver) boots */
    if (C.uarmf)
        dmg += C.uarmf.spe;
    dmg += C.u.udaminc; /* add ring(s) of increase damage */
    if (dmg > 0)
        mon.mhp -= dmg;
    if (!C.DEADMONSTER(mon) && (C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) && !C.bigmonst(mon.data) && !C.rn2(3, 96, 'kickdmg')
        && mon.mcanmove && mon != C.u.ustuck && !mon.mtrapped) {
        /* see if the monster has a place to move into */
        mdx = mon.mx + C.u.dx;
        mdy = mon.my + C.u.dy;
        /* TODO: replace with mhurtle? */
        if (C.goodpos(mdx, mdy, mon, 0)) {
            C.pline("%s reels from the blow.", C.Monnam(mon));
            if (C.m_in_out_region(mon, mdx, mdy)) {
                C.remove_monster(mon.mx, mon.my);
                C.newsym(mon.mx, mon.my);
                C.place_monster(mon, mdx, mdy);
                C.newsym(mon.mx, mon.my);
                C.set_apparxy(mon);
                if (C.mintrap(mon, C.NO_TRAP_FLAGS) == C.Trap_Killed_Mon)
                    trapkilled = 1;
            }
        }
    }

    C.passive(mon, C.uarmf, 1, !C.DEADMONSTER(mon), C.AT_KICK, 0);
    if (C.DEADMONSTER(mon) && !trapkilled)
        C.killed(mon);

    /* may bring up a dialog, so put this after all messages */
    if (kick_skill != C.P_NONE) /* exercise proficiency */
        C.use_skill(kick_skill, 1);
}

export function maybe_kick_monster(mon, x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    if (mon) {
        let save_forcefight = C.svc.context.forcefight;

        C.gb.bhitpos.x = x;
        C.gb.bhitpos.y = y;
        if (!mon.mpeaceful || !C.canspotmon(mon))
            C.svc.context.forcefight = 1; /* attack even if invisible */
        /* kicking might be halted by discovery of hidden monster,
           by player declining to attack peaceful monster,
           or by passing out due to encumbrance */
        if (C.attack_checks(mon, 0) || C.overexertion())
            mon = 0; /* don't kick after all */
        C.svc.context.forcefight = save_forcefight;
    }
    return C.boolean(mon != 0);
}

export function kick_monster(mon, x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    let clumsy = 0;
    let i, j;

    /* anger target even if wild miss will occur */
    C.setmangry(mon, 1);

    if (C.Levitation && !C.rn2(3, 154, 'kick_monster') && C.verysmall(mon.data)
        && !C.is_flyer(mon.data)) {
        C.pline("Floating in the air, you miss wildly!");
        C.exercise(C.A_DEX, 0);
        C.passive(mon, C.uarmf, 0, 1, C.AT_KICK, 0);
        return;
    }

    /* reveal hidden target even if kick ends up missing (note: being
       hidden doesn't affect chance to hit so neither does this reveal) */
    if (mon.mundetected
        || (C.M_AP_TYPE(mon) && C.M_AP_TYPE(mon) != C.M_AP_MONSTER)) {
        if (C.M_AP_TYPE(mon))
            C.seemimic(mon);
        mon.mundetected = 0;
        if (!C.canspotmon(mon))
            C.map_invisible(x, y);
        else
            C.newsym(x, y);
        C.There("is %s here.",
              C.canspotmon(mon) ? C.a_monnam(mon) : "something hidden");
    }

    /* Kick attacks by kicking monsters are normal attacks, not special.
     * This is almost always worthless, since you can either take one turn
     * and do all your kicks, or else take one turn and attack the monster
     * normally, getting all your attacks _including_ all your kicks.
     * If you have >1 kick attack, you get all of them.
     */
    if (C.Upolyd && C.attacktype(C.gy.youmonst.data, C.AT_KICK)) {
        let uattk;
        const armorpenalty = C.intLocal(), attknum = C.intLocal(0);
        let sum, kickdieroll, specialdmg,
            tmp = C.find_roll_to_hit(mon, C.AT_KICK, 0, attknum,
                                   armorpenalty);
        C.mon_maybe_unparalyze(mon);

        for (i = 0; i < C.NATTK; i++) {
            /* first of two kicks might have provoked counterattack
               that has incapacitated the hero (ie, floating eye) */
            if (C.gm.multi < 0)
                break;

            uattk = C.gy.youmonst.data.mattk[i];
            /* we only care about kicking attacks here */
            if (uattk.aatyp != C.AT_KICK)
                continue;

            kickdieroll = C.rnd(20, 202, 'kick_monster');
            specialdmg = C.special_dmgval(C.gy.youmonst, mon, C.W_ARMF,
                                        0);
            if (C.samePtr(mon.data, C.mons[C.PM_SHADE]) && !specialdmg) {
                /* doesn't matter whether it would have hit or missed,
                   and shades have no passive counterattack */
                C.Your("%s %s.", kick_passes_thru, C.mon_nam(mon));
                break; /* skip any additional kicks */
            } else if (tmp > kickdieroll) {
                C.You("kick %s.", C.mon_nam(mon));
                sum = C.damageum(mon, uattk, specialdmg);
                C.passive(mon, C.uarmf, (sum != C.M_ATTK_MISS),
                               !(sum & C.M_ATTK_DEF_DIED), C.AT_KICK, 0);
                if ((sum & C.M_ATTK_DEF_DIED))
                    break; /* Defender died */
            } else {
                C.missum(mon, uattk, (tmp + armorpenalty.value > kickdieroll));
                C.passive(mon, C.uarmf, 0, 1, C.AT_KICK, 0);
            }
        }
        return;
    }

    i = -C.inv_weight();
    j = C.weight_cap();

    /* What the following confusing if statements mean:
     * If you are over 70% of carrying capacity, you go through a "deal no
     * damage" check, and if that fails, a "clumsy kick" check.
     * At this % of carrycap | Chance of no damage | Chance of clumsiness
     *             [70%-80%) |                 1/4 |                  1/3
     *             [80%-90%) |                 1/3 |                  1/2
     *            [90%-100%) |                 1/2 |                   1
     */
    doit: {
    if (i < Math.trunc((j * 3) / 10)) {
        if (!C.rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4, 237, 'kick_monster')) {
            if ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)))
                break doit;
            C.Your("clumsy kick does no damage.");
            C.passive(mon, C.uarmf, 0, 1, C.AT_KICK, 0);
            return;
        }
        if (i < Math.trunc(j / 10))
            clumsy = 1;
        else if (!C.rn2((i < Math.trunc(j / 5)) ? 2 : 3, 246, 'kick_monster'))
            clumsy = 1;
    }

    if (C.Fumbling)
        clumsy = 1;

    else if (C.uarm && C.objects[C.uarm.otyp].oc_bulky && C.ACURR(C.A_DEX) < C.rnd(25, 253, 'kick_monster'))
        clumsy = 1;
    } // doit

    C.You("kick %s.", C.mon_nam(mon));
    if (!C.rn2(clumsy ? 3 : 4, 257, 'kick_monster') && (clumsy || !C.bigmonst(mon.data))
        && mon.mcansee && !mon.mtrapped && !C.thick_skinned(mon.data)
        && mon.data.mlet != C.S_EEL && C.haseyes(mon.data) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && mon.data.mmove >= 12) {
        if (!C.nohands(mon.data) && !C.rn2((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) ? 5 : 3, 262, 'kick_monster')) {
            C.pline("%s blocks your %skick.", C.Monnam(mon),
                  clumsy ? "clumsy " : "");
            C.passive(mon, C.uarmf, 0, 1, C.AT_KICK, 0);
            return;
        } else {
            C.maybe_mnexto(mon);
            if (mon.mx != x || mon.my != y) {
                C.unmap_invisible(x, y);
                C.pline("%s %s, %s evading your %skick.", C.Monnam(mon),
                      (C.can_teleport(mon.data) && !C.noteleport_level(mon))
                          ? "teleports"
                          : C.is_floater(mon.data)
                                ? "floats"
                                : C.is_flyer(mon.data) ? "swoops"
                                                      : (C.nolimbs(mon.data)
                                                         || C.slithy(mon.data))
                                                            ? "slides"
                                                            : "jumps",
                      clumsy ? "easily" : "nimbly", clumsy ? "clumsy " : "");
                C.passive(mon, C.uarmf, 0, 1, C.AT_KICK, 0);
                return;
            }
        }
    }
    kickdmg(mon, clumsy);
}

/*
 *  Return TRUE if caught (the gold taken care of), FALSE otherwise.
 *  The gold object is *not* attached to the fobj chain!
 */
export function ghitm(mtmp, gold)
{
    let msg_given = 0;

    if (!C.likes_gold(mtmp.data) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !C.is_mercenary(mtmp.data)) {
        C.wakeup(mtmp, 1);
    } else if (!mtmp.mcanmove) {
        /* too light to do real damage */
        if (C.canseemon(mtmp)) {
            C.pline_The("%s harmlessly %s %s.", C.xname(gold),
                      C.otense(gold, "hit"), C.mon_nam(mtmp));
            msg_given = 1;
        }
    } else {
        let was_sleeping = mtmp.msleeping;
        let umoney, value = C.long(gold.quan * BigInt(C.objects[gold.otyp].oc_cost));

        mtmp.msleeping = 0; /* end indeterminate sleep (won't get here
                              * for temporary--counted--sleep since that
                              * uses mfrozen and mfrozen implies !mcanmove) */
        C.finish_meating(mtmp);
        if (!mtmp.isgd && !C.rn2(4, 317, 'ghitm')) /* not always pleasing */
            C.setmangry(mtmp, 1);
        /* greedy monsters catch gold */
        if (C.cansee(mtmp.mx, mtmp.my))
            C.pline("%s %scatches the gold.", C.Monnam(mtmp),
                  was_sleeping ? "awakens and " : "");
        C.mpickobj(mtmp, gold);
        gold = 0; /* obj has been freed */
        if (mtmp.isshk) {
            let robbed = mtmp.mextra.eshk.robbed;

            if (robbed) {
                robbed -= value;
                if (robbed < 0n)
                    robbed = 0n;
                C.pline_The("amount %scovers %s recent losses.",
                          !robbed ? "" : "partially ", C.mhis(mtmp));
                mtmp.mextra.eshk.robbed = robbed;
                if (!robbed)
                    C.make_happy_shk(mtmp, 0);
            } else {
                // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
                if (mtmp.mpeaceful) {
                    mtmp.mextra.eshk.credit += value;
                    C.You("have %ld %s in credit.", mtmp.mextra.eshk.credit,
                        C.currency(mtmp.mextra.eshk.credit));
                } else
                    C.verbalize("Thanks, scum!");
            }
        } else if (mtmp.ispriest) {
            // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
            if (mtmp.mpeaceful)
                C.verbalize("Thank you for your contribution.");
            else
                C.verbalize("Thanks, scum!");
        } else if (mtmp.isgd) {
            umoney = C.money_cnt(C.gi.invent);
            /* Some of these are iffy, because a hostile guard
               won't become peaceful and resume leading hero
               out of the vault.  If he did do that, player
               could try fighting, then weasel out of being
               killed by throwing his/her gold when losing. */
            // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
            C.verbalize(umoney ? "Drop the rest and follow me."
                      : C.hidden_gold(1)
                        ? "You still have hidden gold.  Drop it now."
                        : mtmp.mpeaceful
                          ? "I'll take care of that; please move along."
                          : "I'll take that; now get moving.");
        } else if (C.is_mercenary(mtmp.data)) {
            let was_angry = !mtmp.mpeaceful;
            let goldreqd = 0n;

            if (C.samePtr(mtmp.data, C.mons[C.PM_SOLDIER]))
                goldreqd = 100n;
            else if (C.samePtr(mtmp.data, C.mons[C.PM_SERGEANT]))
                goldreqd = 250n;
            else if (C.samePtr(mtmp.data, C.mons[C.PM_LIEUTENANT]))
                goldreqd = 500n;
            else if (C.samePtr(mtmp.data, C.mons[C.PM_CAPTAIN]))
                goldreqd = 750n;

            if (goldreqd && C.rn2(3, 379, 'ghitm')) {
                umoney = C.money_cnt(C.gi.invent);
                goldreqd += C.long(umoney + BigInt(C.int(C.u.ulevel * C.rn2(5, 381, 'ghitm')))) / BigInt(C.ACURR(C.A_CHA));
                if (value > goldreqd)
                    mtmp.mpeaceful = 1;
            }

            if (!mtmp.mpeaceful) {
                // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
                if (goldreqd)
                    C.verbalize("That's not enough, coward!");
                else /* unbribable (watchman) */
                    C.verbalize("I don't take bribes from scum like you!");
            } else if (was_angry) {
                // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
                C.verbalize("That should do.  Now beat it!");
            } else {
                // SetVoice(mtmp, 0, 80, 0); (inactive sound macro; no argument evaluation)
                C.verbalize("Thanks for the tip, %s.",
                          C.flags.female ? "lady" : "buddy");
            }
        }
        return 1;
    }

    if (!msg_given)
        C.miss(C.xname(gold), mtmp);
    return 0;
}

/* container is kicked, dropped, thrown or otherwise impacted by player.
 * Assumes container is on floor.  Checks contents for possible damage. */
export function container_impact_dmg(obj, x, y) /* coordinates where object was */ /* before the impact, not after */
{
    x = C.coordxy(x);y = C.coordxy(y);
    let shkp;
    let otmp, otmp2;
    let loss = 0n;
    let costly, insider, frominv, wchange = 0;

    /* only consider normal containers */
    if (!C.Is_container(obj) || !C.Has_contents(obj) || C.Is_mbag(obj))
        return;

    costly = (Number(Boolean((shkp = C.shop_keeper(C.charAtRooms(x, y, C.SHOPBASE)))
              && C.costly_spot(x, y))));
    insider = (Number(Boolean(C.loadChar(C.u.ushops) && C.inside_shop(C.u.ux, C.u.uy)
               && C.charAtRooms(x, y, C.SHOPBASE) == C.loadChar(C.u.ushops))));
    /* if dropped or thrown, shop ownership flags are set on this obj */
    frominv = (!C.samePtr(obj, C.gk.kickedobj));

    for (otmp = obj.cobj; otmp; otmp = otmp2) {
        let result = 0;

        otmp2 = otmp.nobj;
        if (C.objects[otmp.otyp].oc_material == C.GLASS
            && otmp.oclass != C.GEM_CLASS && !C.obj_resists(otmp, 33, 100)) {
            result = "shatter";
        } else if (otmp.otyp == C.EGG && !C.rn2(3, 440, 'container_impact_dmg')) {
            result = "cracking";
        }
        if (result) {
            if (otmp.otyp == C.MIRROR)
                C.change_luck(-2);

            /* eggs laid by you.  penalty is -1 per egg, max 5,
             * but it's always exactly 1 that breaks */
            if (otmp.otyp == C.EGG && otmp.spe && C.ismnum(otmp.corpsenm))
                C.change_luck(-1);
            if (otmp.otyp == C.EGG) {
                // Soundeffect(se_egg_cracking, 25); (inactive sound macro; no argument evaluation)
            } else {
                // Soundeffect(se_glass_shattering, 25); (inactive sound macro; no argument evaluation)
            }
            C.You_hear("a muffled %s.", result);
            if (costly) {
                if (frominv && !otmp.unpaid)
                    otmp.no_charge = 1;
                loss +=
                    C.stolen_value(otmp, x, y, C.boolean(shkp.mpeaceful), 1);
            }
            if (otmp.quan > 1n) {
                C.useup(otmp);
            } else {
                C.obj_extract_self(otmp);
                C.obfree(otmp, 0);
            }
            /* contents of this container are no longer known */
            obj.cknown = 0;
            wchange = 1;
        }
    }
    if (wchange)
        obj.owt = C.weight(obj);
    if (costly && loss) {
        if (!insider) {
            C.You("caused %ld %s worth of damage!", loss, C.currency(loss));
            C.make_angry_shk(shkp, x, y);
        } else {
            C.You("owe %s %ld %s for objects destroyed.", C.shkname(shkp), loss,
                C.currency(loss));
        }
    }
}

/* jacket around really_kick_object */
export function kick_object(x, y, kickobjnam)
{
    x = C.coordxy(x);y = C.coordxy(y);kickobjnam = C.charPointer(kickobjnam);
    let res = 0;

    C.storeChar(kickobjnam, 0);
    /* if a pile, the "top" object gets kicked */
    C.gk.kickedobj = C.svl.level.objects[x][y];
    if (C.gk.kickedobj) {
        /* formatted object name matters iff res==0 */
        C.Strcpy(kickobjnam, C.killer_xname(C.gk.kickedobj));
        /* kick object; if fatal, done() will clean up kickedobj */
        res = really_kick_object(x, y);
        C.gk.kickedobj = 0;
    }
    return res;
}

/* guts of kick_object */
export function really_kick_object(x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    let range;
    let mon, shkp = 0;
    let trap;
    let bhitroom;
    let costly, isgold, slide = 0;

    /* gk.kickedobj should always be set due to conditions of call */
    if (!C.gk.kickedobj || C.gk.kickedobj.otyp == C.BOULDER
        || C.samePtr(C.gk.kickedobj, C.uball) || C.samePtr(C.gk.kickedobj, C.uchain))
        return 0;

    if ((trap = C.t_at(x, y)) != 0) {
        if ((C.is_pit(trap.ttyp) && !C.Passes_walls) || trap.ttyp == C.WEB) {
            if (!trap.tseen)
                C.find_trap(trap);
            C.You_cant("kick %s that's in a %s!", C.something,
                     C.Hallucination ? "tizzy"
                         : (trap.ttyp == C.WEB) ? "web"
                             : "pit");
            return 1;
        }
        if (trap.ttyp == C.STATUE_TRAP) {
            C.activate_statue_trap(trap, x, y, 0);
            return 1;
        }
    }

    if (C.Fumbling && !C.rn2(3, 537, 'really_kick_object')) {
        C.Your("clumsy kick missed.");
        return 1;
    }

    if (!C.uarmf && C.gk.kickedobj.otyp == C.CORPSE
        && C.touch_petrifies(C.mons[C.gk.kickedobj.corpsenm])
        && !C.Stone_resistance) {
        C.You("kick %s with your bare %s.",
            C.corpse_xname(C.gk.kickedobj, 0, C.CXN_PFX_THE),
            C.makeplural(C.body_part(C.FOOT)));
        if (C.poly_when_stoned(C.gy.youmonst.data) && C.polymon(C.PM_STONE_GOLEM)) {
            ; /* hero has been transformed but kick continues */
        } else {
            /* normalize body shape here; foot, not body_part(FOOT) */
            C.Sprintf(C.svk.killer.name, "kicking %s barefoot",
                    C.killer_xname(C.gk.kickedobj));
            C.instapetrify(C.svk.killer.name);
        }
    }

    isgold = (C.gk.kickedobj.oclass == C.COIN_CLASS);
    {
        let k_owt = C.int(C.gk.kickedobj.owt);

        /* for non-gold stack, 1 item will be split off below (unless an
           early return occurs, so we aren't moving the split to here);
           calculate the range for that 1 rather than for the whole stack */
        if (C.gk.kickedobj.quan > 1n && !isgold) {
            let save_quan = C.gk.kickedobj.quan;

            C.gk.kickedobj.quan = 1n;
            k_owt = C.weight(C.gk.kickedobj);
            C.gk.kickedobj.quan = save_quan;
        }

        /* range < 2 means the object will not move
           (maybe dexterity should also figure here) */
        range = Math.trunc(C.int(C.ACURRSTR) / 2) - Math.trunc(k_owt / 40);
    }

    if ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)))
        range += C.rnd(3, 579, 'really_kick_object');

    if (C.is_pool(x, y)) {
        /* you're in the water too; significantly reduce range */
        range = Math.trunc(range / 3) + 1; /* {1,2}=>1, {3,4,5}=>2, {6,7,8}=>3 */
    } else if (C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz)) {
        /* you're in air, since is_pool did not match */
        range += C.rnd(3, 586, 'really_kick_object');
    } else {
        if (C.is_ice(x, y))
            range += C.rnd(3, 589, 'really_kick_object'), slide = 1;
        if (C.gk.kickedobj.greased)
            range += C.rnd(3, 591, 'really_kick_object'), slide = 1;
    }

    /* Mjollnir is magically too heavy to kick */
    if (C.is_art(C.gk.kickedobj, C.ART_MJOLLNIR))
        range = 1;

    /* see if the object has a place to move into */
    if (!C.isok(x + C.u.dx, y + C.u.dy)
        || !C.ZAP_POS(C.levl[x + C.u.dx][y + C.u.dy].typ)
        || C.closed_door(x + C.u.dx, y + C.u.dy))
        range = 1;

    /* 5.0: this used to skip 'costly' handling if kickedobj->no_charge
       was set but that optimization could result in no_charge staying set
       for objects kicked out of the shop */
    shkp = C.find_objowner(C.gk.kickedobj, x, y);
    costly = (Number(Boolean(shkp && (C.costly_spot(x, y) || (C.costly_adjacent(shkp, x, y)
                                             && C.gk.kickedobj.unpaid)))));
    /* 5.0: give feedback about the item being kicked; some follow-on
       messages refer to "it" */
    C.Norep("You kick %s.",
          !isgold ? C.singular(C.gk.kickedobj, C.doname) : C.doname(C.gk.kickedobj));

    if (C.IS_OBSTRUCTED(C.levl[x][y].typ) || C.closed_door(x, y)) {
        if ((!(C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) && C.rn2(20, 616, 'really_kick_object') > C.ACURR(C.A_DEX))
            || C.IS_OBSTRUCTED(C.levl[C.u.ux][C.u.uy].typ) || C.closed_door(C.u.ux, C.u.uy)) {
            if (C.Blind)
                C.pline("It doesn't come loose.");
            else
                C.pline("%s %sn't come loose.",
                      C.The(C.distant_name(C.gk.kickedobj, C.xname)),
                      C.otense(C.gk.kickedobj, "do"));
            return (Number(Boolean(!C.rn2(3, 624, 'really_kick_object') || (C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)))));
        }
        if (C.Blind)
            C.pline("It comes loose.");
        else
            C.pline("%s %s loose.", C.The(C.distant_name(C.gk.kickedobj, C.xname)),
                  C.otense(C.gk.kickedobj, "come"));
        C.obj_extract_self(C.gk.kickedobj);
        C.newsym(x, y);
        if (costly && (!C.costly_spot(C.u.ux, C.u.uy)
                       || !C.strchr(C.u.urooms, C.charAtRooms(x, y, C.SHOPBASE)))) {
            if (!C.gk.kickedobj.no_charge)
                C.addtobill(C.gk.kickedobj, 0, 0, 0);
            else /* don't leave no_charge set when outside shop */
                C.gk.kickedobj.no_charge = 0;
        }
        if (!C.flooreffects(C.gk.kickedobj, C.u.ux, C.u.uy, "fall")) {
            C.place_object(C.gk.kickedobj, C.u.ux, C.u.uy);
            C.impact_disturbs_zombies(C.gk.kickedobj, 1);
            C.stackobj(C.gk.kickedobj);
            C.newsym(C.u.ux, C.u.uy);
        }
        return 1;
    }

    /* a box gets a chance of breaking open here */
    if (C.Is_box(C.gk.kickedobj)) {
        let otrp = C.gk.kickedobj.otrapped;

        if (range < 2)
            C.pline("THUD!");
        container_impact_dmg(C.gk.kickedobj, x, y);
        if (C.gk.kickedobj.olocked) {
            if (!C.rn2(5, 657, 'really_kick_object') || ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) && !C.rn2(2, 657, 'really_kick_object'))) {
                C.You("break open the lock!");
                C.breakchestlock(C.gk.kickedobj, 0);
                if (otrp)
                    C.chest_trap(C.gk.kickedobj, C.LEG, 0);
                return 1;
            }
        } else {
            if (!C.rn2(3, 665, 'really_kick_object') || ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) && !C.rn2(2, 665, 'really_kick_object'))) {
                C.pline_The("lid slams open, then falls shut.");
                C.gk.kickedobj.lknown = 1;
                if (otrp)
                    C.chest_trap(C.gk.kickedobj, C.LEG, 0);
                return 1;
            }
        }
        if (range < 2)
            return 1;
        /* else let it fall through to the next cases... */
    }

    /* fragile objects should not be kicked */
    if (C.hero_breaks(C.gk.kickedobj, C.gk.kickedobj.ox, C.gk.kickedobj.oy, 0))
        return 1;

    /* too heavy to move.  range is calculated as potential distance from
     * player, so range == 2 means the object may move up to one square
     * from its current position
     */
    if (range < 2) {
        if (!C.Is_box(C.gk.kickedobj))
            C.pline("Thump!");
        return (Number(Boolean(!C.rn2(3, 689, 'really_kick_object') || (C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)))));
    }

    if (C.gk.kickedobj.quan > 1n) {
        if (!isgold) {
            C.gk.kickedobj = C.splitobj(C.gk.kickedobj, 1n);
        } else {
            if (C.rn2(20, 696, 'really_kick_object')) {
                const flyingcoinmsg = [
                    "scatter the coins", "knock coins all over the place",
                    "send coins flying in all directions",
                ];

                if (!C.Deaf)
                    C.pline1("Thwwpingg!");
                C.You("%s!", flyingcoinmsg[C.rn2(flyingcoinmsg.length, 704, 'really_kick_object')]);
                C.scatter(x, y, C.rnd(3, 705, 'really_kick_object'), C.VIS_EFFECTS | C.MAY_HIT,
                               C.gk.kickedobj);
                C.newsym(x, y);
                return 1;
            }
            if (C.gk.kickedobj.quan > 300n) {
                C.pline("Thump!");
                return (Number(Boolean(!C.rn2(3, 712, 'really_kick_object') || (C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)))));
            }
        }
    }

    if (slide && !C.Blind)
        C.pline("Whee!  %s %s across the %s.", C.Doname2(C.gk.kickedobj),
              C.otense(C.gk.kickedobj, "slide"), C.surface(x, y));

// #if 0   
/* now that 'costly' above includes no_charge items, this would
         * clear their no_charge state (while declining to add to bill)
         * and then costly handling below would end up charging for them
         *
         * [fixme?  if there is anything which won't break when kicked
         * but will be used up with hitting a monster, suppressing this
         * results in the used-up item not being charged for]
         */

//     if (costly && !isgold) /* && !gk.kickedobj->no_charge) */
//         C.addtobill(C.gk.kickedobj, 0, 0, 1);
// #endif
    C.obj_extract_self(C.gk.kickedobj);
    C.snuff_candle(C.gk.kickedobj);
    C.newsym(x, y);
    mon = C.bhit(C.u.dx, C.u.dy, range, C.KICKED_WEAPON,
               0,
               0, C.objectPointerField(C.gk, 'kickedobj'));
    if (!C.gk.kickedobj)
        return 1; /* object broken */

    if (mon) {
        if (mon.isshk && C.gk.kickedobj.where == C.OBJ_MINVENT
            && C.gk.kickedobj.ocarry == mon)
            return 1; /* alert shk caught it */
        C.gn.notonhead = (Number(Boolean(mon.mx != C.gb.bhitpos.x || mon.my != C.gb.bhitpos.y)));
        if (isgold ? ghitm(mon, C.gk.kickedobj)      /* caught? */
                   : C.thitmonst(mon, C.gk.kickedobj)) /* hit && used up? */
            return 1;
    }

    /* the object might have fallen down a hole;
       ship_object() will have taken care of shop billing */
    if (C.gk.kickedobj.where == C.OBJ_MIGRATING)
        return 1;

    bhitroom = C.charAtRooms(C.gb.bhitpos.x, C.gb.bhitpos.y, C.SHOPBASE);
    /* if obj is marked no_charge, stolen_value() won't blame hero for
       theft but will clear that flag */
    if (costly && (!C.costly_spot(C.gb.bhitpos.x, C.gb.bhitpos.y)
                   || C.charAtRooms(x, y, C.SHOPBASE) != bhitroom)) {
        /* kicked from inside shop to somewhere outside shop */
        if (isgold)
            C.costly_gold(x, y, C.gk.kickedobj.quan, 0);
        else
            C.stolen_value(C.gk.kickedobj, x, y, C.boolean(shkp.mpeaceful),
                                0);
        costly = 0; /* already billed */
    }

    if (C.flooreffects(C.gk.kickedobj, C.gb.bhitpos.x, C.gb.bhitpos.y, "fall"))
        return 1;
    if (costly) {
        let gtg = 0n;

        /* costly + landed outside shop handled above; must be inside shop */
        if (C.gk.kickedobj.unpaid)
            C.subfrombill(C.gk.kickedobj, shkp);

        /* if billed for contained gold during kick, get a refund now */
        if (C.Has_contents(C.gk.kickedobj)
            && (gtg = C.contained_gold(C.gk.kickedobj, 1)) > 0n)
            C.donate_gold(gtg, shkp, 0);
    }
    C.place_object(C.gk.kickedobj, C.gb.bhitpos.x, C.gb.bhitpos.y);
    C.impact_disturbs_zombies(C.gk.kickedobj, 1);
    C.stackobj(C.gk.kickedobj);
    C.newsym(C.gk.kickedobj.ox, C.gk.kickedobj.oy);
    return 1;
}

/* cause of death if kicking kills kicker */
export function kickstr(buf, kickobjnam)
{
    buf = C.charPointer(buf);kickobjnam = C.charPointer(kickobjnam);
    let what;

    if (C.loadChar(kickobjnam))
        what = kickobjnam;
    else if (C.samePtr(C.gm.maploc, C.gn.nowhere))
        what = "nothing";
    else if (C.IS_DOOR(C.gm.maploc.typ))
        what = "a door";
    else if (C.IS_TREE(C.gm.maploc.typ))
        what = "a tree";
    else if (C.IS_STWALL(C.gm.maploc.typ))
        what = "a wall";
    else if (C.IS_OBSTRUCTED(C.gm.maploc.typ))
        what = "a rock";
    else if (C.IS_THRONE(C.gm.maploc.typ))
        what = "a throne";
    else if (C.IS_FOUNTAIN(C.gm.maploc.typ))
        what = "a fountain";
    else if (C.IS_GRAVE(C.gm.maploc.typ))
        what = "a headstone";
    else if (C.IS_SINK(C.gm.maploc.typ))
        what = "a sink";
    else if (C.IS_ALTAR(C.gm.maploc.typ))
        what = "an altar";
    else if (C.IS_DRAWBRIDGE(C.gm.maploc.typ))
        what = "a drawbridge";
    else if (C.gm.maploc.typ == C.STAIRS)
        what = "the stairs";
    else if (C.gm.maploc.typ == C.LADDER)
        what = "a ladder";
    else if (C.gm.maploc.typ == C.IRONBARS)
        what = "an iron bar";
    else
        what = "something weird";
    return C.strcat(C.strcpy(buf, "kicking "), what);
}

export function watchman_thief_arrest(mtmp)
{
    if (C.is_watch(mtmp.data) && C.couldsee(mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        C.mon_yells(mtmp, "Halt, thief!  You're under arrest!");
        C.angry_guards(0);
        return 1;
    }
    return 0;
}

export function watchman_door_damage(mtmp, x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    if (C.is_watch(mtmp.data) && mtmp.mpeaceful
        && C.couldsee(mtmp.mx, mtmp.my)) {
        if (C.levl[x][y].looted & C.D_WARNED) {
            C.mon_yells(mtmp,
                      "Halt, vandal!  You're under arrest!");
            C.angry_guards(0);
        } else {
            C.mon_yells(mtmp, "Hey, stop damaging that door!");
            C.levl[x][y].looted |= C.D_WARNED;
        }
        return 1;
    }
    return 0;
}

export function kick_dumb(x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    C.exercise(C.A_DEX, 0);
    if ((C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) || C.ACURR(C.A_DEX) >= 16 || C.rn2(3, 867, 'kick_dumb')) {
        C.You("kick at empty space.");
        if (C.Blind)
            C.feel_location(x, y);
    } else {
        C.pline("Dumb move!  You strain a muscle.");
        C.exercise(C.A_STR, 0);
        C.set_wounded_legs(C.RIGHT_SIDE, 5 + C.rnd(5, 874, 'kick_dumb'));
    }
    if ((C.Is_airlevel(C.u.uz) || C.Levitation) && C.rn2(2, 876, 'kick_dumb'))
        C.hurtle(-C.u.dx, -C.u.dy, 1, 1);
}

export function kick_ouch(x, y, kickobjnam)
{
    x = C.coordxy(x);y = C.coordxy(y);kickobjnam = C.charPointer(kickobjnam);
    let dmg;
    const buf = C.stackAlloc(C.BUFSZ);

    C.pline("Ouch!  That hurts!");
    C.exercise(C.A_DEX, 0);
    C.exercise(C.A_STR, 0);
    if (C.isok(x, y)) {
        if (C.Blind)
            C.feel_location(x, y); /* we know we hit it */
        if (C.is_drawbridge_wall(x, y) >= 0) {
            C.pline_The("drawbridge is unaffected.");
            /* update maploc to refer to the drawbridge */
            C.find_drawbridge(C.coordReference(() => x, value => { x = value; }), C.coordReference(() => y, value => { y = value; }));
            C.gm.maploc = C.levl[x][y];
        }
        C.wake_nearto(x, y, 5 * 5);
    }
    if (!C.rn2(3, 900, 'kick_ouch'))
        C.set_wounded_legs(C.RIGHT_SIDE, 5 + C.rnd(5, 901, 'kick_ouch'));
    dmg = C.rnd(C.ACURR(C.A_CON) > 15 ? 3 : 5, 902, 'kick_ouch');
    C.losehp((C.Half_physical_damage ? Math.trunc((dmg + 1) / 2) : dmg), C.callLocal(kickstr, buf, kickobjnam), C.KILLED_BY);
    if (C.Is_airlevel(C.u.uz) || C.Levitation)
        C.hurtle(-C.u.dx, -C.u.dy, C.rn1(2, 4, 905, 'kick_ouch'), 1); /* assume it's heavy */
}

/* kick a door */
export function kick_door(x, y, avrg_attrib)
{
    x = C.coordxy(x);y = C.coordxy(y);avrg_attrib = C.int(avrg_attrib);
    let doorbuster;

    if (C.gm.maploc.doormask == C.D_ISOPEN || C.gm.maploc.doormask == C.D_BROKEN
        || C.gm.maploc.doormask == C.D_NODOOR) {
        kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (C.Levitation) {
        C.callLocal(kick_ouch, x, y, "");
        return;
    }

    C.exercise(C.A_DEX, 1);
    doorbuster = Number(Boolean(C.Upolyd && C.is_giant(C.gy.youmonst.data)));
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (C.rnl(35, 930, 'kick_door') < avrg_attrib + (!(C.martial_bonus() || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SASQUATCH]) || (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)) ? 0 : C.ACURR(C.A_DEX)))) {
        let shopdoor = C.charAtRooms(x, y, C.SHOPBASE) ? 1 : 0;

        /* break the door */
        if (C.gm.maploc.doormask & C.D_TRAPPED) {
            if (C.flags.verbose)
                C.You("kick the door.");
            C.exercise(C.A_STR, 0);
            C.gm.maploc.doormask = C.D_NODOOR;
            C.b_trapped("door", C.FOOT);
        } else if (C.ACURR(C.A_STR) > 18 && !C.rn2(5, 940, 'kick_door') && !shopdoor) {
            // Soundeffect(se_kick_door_it_shatters, 50); (inactive sound macro; no argument evaluation)
            C.pline("As you kick the door, it shatters to pieces!");
            C.exercise(C.A_STR, 1);
            C.gm.maploc.doormask = C.D_NODOOR;
        } else {
            // Soundeffect(se_kick_door_it_crashes_open, 50); (inactive sound macro; no argument evaluation)
            C.pline("As you kick the door, it crashes open!");
            C.exercise(C.A_STR, 1);
            C.gm.maploc.doormask = C.D_BROKEN;
        }
        C.feel_newsym(x, y); /* we know we broke it */
        C.recalc_block_point(x, y); /* vision */
        if (shopdoor) {
            C.add_damage(x, y, C.SHOP_DOOR_COST);
            C.pay_for_damage("break", 0);
        }
        if (C.in_town(x, y))
            C.get_iter_mons(watchman_thief_arrest);
    } else {
        if (C.Blind)
            C.feel_location(x, y); /* we know we hit it */
        C.exercise(C.A_STR, 1);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        C.pline("%s!!", (C.Deaf || !C.rn2(3, 966, 'kick_door')) ? "Thwack" : "Whammm");
        if (C.in_town(x, y))
            C.get_iter_mons_xy(watchman_door_damage, x, y);
    }
}

/* kick non-door terrain */
export function kick_nondoor(x, y, avrg_attrib)
{
    x = C.coordxy(x);y = C.coordxy(y);avrg_attrib = C.int(avrg_attrib);
    if (C.gm.maploc.typ == C.SDOOR) {
        if (!C.Levitation && C.rn2(30, 977, 'kick_nondoor') < avrg_attrib) {
            C.cvt_sdoor_to_door(C.gm.maploc); /* ->typ = DOOR */
            // Soundeffect(se_crash_door, 40); (inactive sound macro; no argument evaluation)
            C.pline("Crash!  %s a secret door!",
                  /* don't "kick open" when it's locked
                     unless it also happens to be trapped */
                  ((C.gm.maploc.doormask & (C.D_LOCKED | C.D_TRAPPED))
                   == C.D_LOCKED) ? "Your kick uncovers" : "You kick open");
            C.exercise(C.A_DEX, 1);
            if (C.gm.maploc.doormask & C.D_TRAPPED) {
                C.gm.maploc.doormask = C.D_NODOOR;
                C.b_trapped("door", C.FOOT);
            } else if (C.gm.maploc.doormask != C.D_NODOOR
                       && !(C.gm.maploc.doormask & C.D_LOCKED))
                C.gm.maploc.doormask = C.D_ISOPEN;
            C.feel_newsym(x, y); /* we know it's gone */
            if (C.gm.maploc.doormask == C.D_ISOPEN
                || C.gm.maploc.doormask == C.D_NODOOR)
                C.unblock_point(x, y); /* vision */
            return C.ECMD_TIME;
        } else {
            C.callLocal(kick_ouch, x, y, "");
            return C.ECMD_TIME;
        }
    }
    if (C.gm.maploc.typ == C.SCORR) {
        if (!C.Levitation && C.rn2(30, 1003, 'kick_nondoor') < avrg_attrib) {
            // Soundeffect(se_crash_door, 40); (inactive sound macro; no argument evaluation)
            C.pline("Crash!  You kick open a secret passage!");
            C.exercise(C.A_DEX, 1);
            C.gm.maploc.typ = C.CORR;
            C.feel_newsym(x, y); /* we know it's gone */
            C.unblock_point(x, y); /* vision */
            return C.ECMD_TIME;
        } else {
            C.callLocal(kick_ouch, x, y, "");
            return C.ECMD_TIME;
        }
    }
    if (C.IS_THRONE(C.gm.maploc.typ)) {
        let i;
        if (C.Levitation) {
            kick_dumb(x, y);
            return C.ECMD_TIME;
        }
        if ((C.Luck < 0 || C.gm.maploc.looted) && !C.rn2(3, 1022, 'kick_nondoor')) {
            C.gm.maploc.looted = 0; /* don't leave loose ends.. */
            C.gm.maploc.typ = C.ROOM;
            C.mkgold(C.long(C.rnd(200, 1025, 'kick_nondoor')), x, y);
            // Soundeffect(se_crash_throne_destroyed, 60); (inactive sound macro; no argument evaluation)
            if (C.Blind)
                C.pline("CRASH!  You destroy it.");
            else {
                C.pline("CRASH!  You destroy the throne.");
                C.newsym(x, y);
            }
            C.exercise(C.A_DEX, 1);
            return C.ECMD_TIME;
        } else if (C.Luck > 0 && !C.rn2(3, 1035, 'kick_nondoor') && !C.gm.maploc.looted) {
            C.mkgold(C.long(C.rn1(201, 300, 1036, 'kick_nondoor')), x, y);
            i = C.Luck + 1;
            if (i > 6)
                i = 6;
            while (i--)
                C.mksobj_at(
                       C.rnd_class(C.DILITHIUM_CRYSTAL, C.LUCKSTONE - 1), x, y,
                       0, 1);
            if (C.Blind)
                C.You("kick %s loose!", C.something);
            else {
                C.You("kick loose some ornamental coins and gems!");
                C.newsym(x, y);
            }
            /* prevent endless milking */
            C.gm.maploc.looted = C.T_LOOTED;
            return C.ECMD_TIME;
        } else if (!C.rn2(4, 1053, 'kick_nondoor')) {
            if (C.dunlev(C.u.uz) < C.dunlevs_in_dungeon(C.u.uz)) {
                C.fall_through(0, 0);
                return C.ECMD_TIME;
            } else {
                C.callLocal(kick_ouch, x, y, "");
                return C.ECMD_TIME;
            }
        }
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    if (C.IS_ALTAR(C.gm.maploc.typ)) {
        if (C.Levitation) {
            kick_dumb(x, y);
            return C.ECMD_TIME;
        }
        C.You("kick %s.", (C.Blind ? C.something : "the altar"));
        C.altar_wrath(x, y);
        if (!C.rn2(3, 1072, 'kick_nondoor')) {
            C.callLocal(kick_ouch, x, y, "");
            return C.ECMD_TIME;
        }
        C.exercise(C.A_DEX, 1);
        return C.ECMD_TIME;
    }
    if (C.IS_FOUNTAIN(C.gm.maploc.typ)) {
        if (C.Levitation) {
            kick_dumb(x, y);
            return C.ECMD_TIME;
        }
        C.You("kick %s.", (C.Blind ? C.something : "the fountain"));
        if (!C.rn2(3, 1085, 'kick_nondoor')) {
            C.callLocal(kick_ouch, x, y, "");
            return C.ECMD_TIME;
        }
        /* make metal boots rust */
        if (C.uarmf && C.rn2(3, 1090, 'kick_nondoor'))
            if (C.water_damage(C.uarmf, "metal boots", 1) == C.ER_NOTHING) {
                C.Your("boots get wet.");
                /* could cause short-lived fumbling here */
            }
        C.exercise(C.A_DEX, 1);
        return C.ECMD_TIME;
    }
    if (C.IS_GRAVE(C.gm.maploc.typ)) {
        if (C.Levitation) {
            kick_dumb(x, y);
        } else if (C.rn2(4, 1101, 'kick_nondoor')) {
            /* minor injury */
            C.callLocal(kick_ouch, x, y, "");
        } else if (!C.gm.maploc.disturbed && !C.rn2(2, 1104, 'kick_nondoor')) {
            /* disturb the grave: summon a ghoul (once only), same as
               when engraving */
            C.disturb_grave(x, y);
        } else {
            /* destroy the headstone, implicitly destroying any
               not-yet-created contents (including zombie or mummy);
               any already created contents will still be buried here */
            C.exercise(C.A_WIS, 0);
            if (C.Role_if(C.PM_ARCHEOLOGIST) || C.Role_if(C.PM_SAMURAI)
                || (C.u.ualign.type == C.A_LAWFUL && C.u.ualign.record > -10))
                C.adjalign(-C.sgn(C.u.ualign.type));
            C.gm.maploc.typ = C.ROOM;
            C.gm.maploc.emptygrave = 0; /* clear 'flags' */
            C.gm.maploc.disturbed = 0; /* clear 'horizontal' */
            C.mksobj_at(C.ROCK, x, y, 1, 0);
            C.del_engr_at(x, y);
            if (C.Blind) {
                /* [feel this happen if Deaf?] */
                C.pline("Crack!  %s broke!", C.Something);
            } else {
                C.pline_The("headstone topples over and breaks!");
                C.newsym(x, y);
            }
        }
        return C.ECMD_TIME;
    }
    if (C.gm.maploc.typ == C.IRONBARS) {
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    if (C.IS_TREE(C.gm.maploc.typ)) {
        let treefruit;

        /* nothing, fruit or trouble? 75:23.5:1.5% */
        if (C.rn2(3, 1139, 'kick_nondoor')) {
            if (!C.rn2(6, 1140, 'kick_nondoor') && !(C.svm.mvitals[C.PM_KILLER_BEE].mvflags & C.G_GONE))
                C.You_hear("a low buzzing."); /* a warning */
            C.callLocal(kick_ouch, x, y, "");
            return C.ECMD_TIME;
        }
        if (C.rn2(15, 1145, 'kick_nondoor') && !(C.gm.maploc.looted & C.TREE_LOOTED)
            && (treefruit = C.rnd_treefruit_at(x, y))) {
            let nfruit = 8n - BigInt(C.rnl(7, 1147, 'kick_nondoor')), nfall;
            let frtype = treefruit.otyp;

            treefruit.quan = nfruit;
            treefruit.owt = C.weight(treefruit);
            if (C.is_plural(treefruit))
                C.pline("Some %s fall from the tree!", C.xname(treefruit));
            else
                C.pline("%s falls from the tree!", C.An(C.xname(treefruit)));
            nfall = C.scatter(x, y, 2, C.MAY_HIT, treefruit);
            if (nfall != nfruit) {
                /* scatter left some in the tree, but treefruit
                 * may not refer to the correct object */
                treefruit = C.mksobj(frtype, 1, 0);
                treefruit.quan = nfruit - nfall;
                C.pline("%ld %s got caught in the branches.",
                      nfruit - nfall, C.xname(treefruit));
                C.dealloc_obj(treefruit);
            }
            C.exercise(C.A_DEX, 1);
            C.exercise(C.A_WIS, 1); /* discovered a new food source! */
            C.newsym(x, y);
            C.gm.maploc.looted |= C.TREE_LOOTED;
            return C.ECMD_TIME;
        } else if (!(C.gm.maploc.looted & C.TREE_SWARM)) {
            let cnt = C.rnl(4, 1172, 'kick_nondoor') + 2;
            let made = 0;
            const mm = C.coordLocal();

            mm.x = x;
            mm.y = y;
            while (cnt--) {
                if (C.enexto(mm, mm.x, mm.y, C.mons[C.PM_KILLER_BEE])
                    && C.makemon(C.mons[C.PM_KILLER_BEE], mm.x, mm.y,
                               C.MM_ANGRY|C.MM_NOMSG))
                    made++;
            }
            if (made)
                C.pline("You've attracted the tree's former occupants!");
            else
                C.You("smell stale honey.");
            C.gm.maploc.looted |= C.TREE_SWARM;
            return C.ECMD_TIME;
        }
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    if (C.IS_SINK(C.gm.maploc.typ)) {
        let gend = C.poly_gender();

        if (C.Levitation) {
            kick_dumb(x, y);
            return C.ECMD_TIME;
        }
        if (C.rn2(5, 1201, 'kick_nondoor')) {
            // Soundeffect(se_klunk_pipe, 60); (inactive sound macro; no argument evaluation)
            if (!C.Deaf)
                C.pline("Klunk!  The pipes vibrate noisily.");
            else
                C.pline("Klunk!");
            C.exercise(C.A_DEX, 1);
            return C.ECMD_TIME;
        } else if (!(C.gm.maploc.looted & C.S_LPUDDING) && !C.rn2(3, 1209, 'kick_nondoor')
                   && !(C.svm.mvitals[C.PM_BLACK_PUDDING].mvflags & C.G_GONE)) {
            // Soundeffect(se_gushing_sound, 100); (inactive sound macro; no argument evaluation)
            if (C.Blind) {
                if (!C.Deaf)
                    C.You_hear("a gushing sound.");
            } else {
                C.pline("A %s ooze gushes up from the drain!",
                      C.hcolor(C.NH_BLACK));
            }
            C.makemon(C.mons[C.PM_BLACK_PUDDING], x, y, C.MM_NOMSG);
            C.exercise(C.A_DEX, 1);
            C.newsym(x, y);
            C.gm.maploc.looted |= C.S_LPUDDING;
            return C.ECMD_TIME;
        } else if (!(C.gm.maploc.looted & C.S_LDWASHER) && !C.rn2(3, 1224, 'kick_nondoor')
                   && !(C.svm.mvitals[C.PM_AMOROUS_DEMON].mvflags & C.G_GONE)) {
            /* can't resist... */
            C.pline("%s returns!", (C.Blind ? C.Something : "The dish washer"));
            if (C.makemon(C.mons[C.PM_AMOROUS_DEMON], x, y,
                        C.MM_NOMSG | ((gend == 1 || (gend == 2 && C.rn2(2, 1229, 'kick_nondoor')))
                                    ? C.MM_MALE : C.MM_FEMALE)))
                C.newsym(x, y);
            C.gm.maploc.looted |= C.S_LDWASHER;
            C.exercise(C.A_DEX, 1);
            return C.ECMD_TIME;
        } else if (!C.rn2(3, 1235, 'kick_nondoor')) {
            C.sink_backs_up(x, y);
            return C.ECMD_TIME;
        }
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    if (C.gm.maploc.typ == C.STAIRS || C.gm.maploc.typ == C.LADDER
        || C.IS_STWALL(C.gm.maploc.typ)) {
        if (!C.IS_STWALL(C.gm.maploc.typ) && C.gm.maploc.ladder == C.LA_DOWN) {
            kick_dumb(x, y);
            return C.ECMD_TIME;
        }
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    kick_dumb(x, y);
    return C.ECMD_TIME;
}

/* the #kick command */
export function dokick()
{
    let x, y;
    let avrg_attrib;
    let glyph, oldglyph = -1;
    let mtmp;
    let no_kick = 0;

    if (C.nolimbs(C.gy.youmonst.data) || C.slithy(C.gy.youmonst.data)) {
        C.You("have no legs to kick with.");
        no_kick = 1;
    } else if (C.verysmall(C.gy.youmonst.data)) {
        C.You("are too small to do any kicking.");
        no_kick = 1;
    } else if (C.u.usteed) {
        if (C.yn_function("Kick your steed?", C.ynchars, 121, 1) == 121) {
            C.You("kick %s.", C.mon_nam(C.u.usteed));
            C.kick_steed();
            return C.ECMD_TIME;
        } else {
            return C.ECMD_OK;
        }
    } else if (C.Wounded_legs) {
        C.legs_in_no_shape("kicking", 0);
        no_kick = 1;
    } else if (C.near_capacity() > C.SLT_ENCUMBER) {
        C.Your("load is too heavy to balance yourself for a kick.");
        no_kick = 1;
    } else if (C.gy.youmonst.data.mlet == C.S_LIZARD) {
        C.Your("legs cannot kick effectively.");
        no_kick = 1;
    } else if (C.u.uinwater && !C.rn2(2, 1288, 'dokick')) {
        C.Your("slow motion kick doesn't hit anything.");
        no_kick = 1;
    } else if (C.u.utrap) {
        no_kick = 1;
        switch (C.u.utraptype) {
        case C.TT_PIT:
            if (!C.Passes_walls)
                C.pline("There's not enough room to kick down here.");
            else
                no_kick = 0;
            break;
        case C.TT_WEB:
        case C.TT_BEARTRAP:
            C.You_cant("move your %s!", C.body_part(C.LEG));
            break;
        default:
            break;
        }
    } else if (C.sobj_at(C.BOULDER, C.u.ux, C.u.uy) && !C.Passes_walls) {
        C.pline("There's not enough room to kick in here.");
        no_kick = 1;
    }

    if (no_kick) {
        /* ignore direction typed before player notices kick failed */
        C.display_nhwindow(C.WIN_MESSAGE, 1); /* --More-- */
        return C.ECMD_FAIL;
    }

    if (!C.getdir(0))
        return C.ECMD_CANCEL;
    if (!C.u.dx && !C.u.dy)
        return C.ECMD_CANCEL;

    x = C.u.ux + C.u.dx;
    y = C.u.uy + C.u.dy;
    C.gk.kickedloc.x = x, C.gk.kickedloc.y = y;

    /* KMH -- Kicking boots always succeed */
    if (C.uarmf && C.uarmf.otyp == C.KICKING_BOOTS)
        avrg_attrib = 99;
    else
        avrg_attrib = Math.trunc((C.ACURRSTR + C.ACURR(C.A_DEX) + C.ACURR(C.A_CON)) / 3);

    if (C.u.uswallow) {
        switch (C.rn2(3, 1334, 'dokick')) {
        case 0:
            C.You_cant("move your %s!", C.body_part(C.LEG));
            break;
        case 1:
            if (C.digests(C.u.ustuck.data)) {
                C.pline("%s burps loudly.", C.Monnam(C.u.ustuck));
                break;
            }
            
            /*FALLTHRU*/
        default:
            C.Your("feeble kick has no effect.");
            break;
        }
        return C.ECMD_TIME;
    } else if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        /* must be Passes_walls */
        C.You("kick at the side of the pit.");
        return C.ECMD_TIME;
    }
    if (C.Levitation) {
        let xx, yy;

        xx = C.u.ux - C.u.dx;
        yy = C.u.uy - C.u.dy;
        /* doors can be opened while levitating, so they must be
         * reachable for bracing purposes
         * Possible extension: allow bracing against stuff on the side?
         */
        if (C.isok(xx, yy) && !C.IS_OBSTRUCTED(C.levl[xx][yy].typ)
            && !C.IS_DOOR(C.levl[xx][yy].typ)
            && (!C.Is_airlevel(C.u.uz) || !C.OBJ_AT(xx, yy))) {
            C.You("have nothing to brace yourself against.");
            return C.ECMD_OK;
        }
    }

    mtmp = C.isok(x, y) ? C.m_at(x, y) : 0;
    /* might not kick monster if it is hidden and becomes revealed,
       if it is peaceful and player declines to attack, or if the
       hero passes out due to encumbrance with low hp; svc.context.move
       will be 1 unless player declines to kick peaceful monster */
    if (mtmp) {
        oldglyph = C.glyph_at(x, y);
        if (!maybe_kick_monster(mtmp, x, y))
            return (C.svc.context.move ? C.ECMD_TIME : C.ECMD_OK);
    }

    C.wake_nearby(0);
    C.u_wipe_engr(2);

    if (!C.isok(x, y)) {
        C.gm.maploc = C.gn.nowhere;
        C.callLocal(kick_ouch, x, y, "");
        return C.ECMD_TIME;
    }
    C.gm.maploc = C.levl[x][y];

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
        glyph = C.glyph_at(x, y);
        /* see comment in attack_checks() */
        if (C.DEADMONSTER(mtmp)) { /* DEADMONSTER() */
            /* if we mapped an invisible monster and immediately
               killed it, we don't want to forget what we thought
               was there before the kick */
            if (glyph != oldglyph && C.glyph_is_invisible(glyph))
                C.show_glyph(x, y, oldglyph);
        } else if (!C.canspotmon(mtmp)
                   /* check <x,y>; monster that evades kick by jumping
                      to an unseen square doesn't leave an I behind */
                   && mtmp.mx == x && mtmp.my == y
                   && !C.glyph_is_invisible(glyph)
                   && !C.engulfing_u(mtmp)) {
            C.map_invisible(x, y);
        }
        /* recoil if floating */
        if ((C.Is_airlevel(C.u.uz) || C.Levitation) && C.svc.context.move) {
            let range;

            range =
                (C.int(C.gy.youmonst.data.cwt) + (C.weight_cap() + C.inv_weight()));
            if (range < 1)
                range = 1; /* divide by zero avoidance */
            range = Math.trunc((3 * C.int(mdat.cwt)) / range);

            if (range < 1)
                range = 1;
            C.hurtle(-C.u.dx, -C.u.dy, range, 1);
        }
        return C.ECMD_TIME;
    }
    C.unmap_invisible(x, y);
    if ((Number(Boolean(C.is_pool(x, y) || C.gm.maploc.typ == C.LAVAWALL))) ^ !!C.u.uinwater) {
        /* objects normally can't be removed from water by kicking */
        C.You("splash some %s around.",
            C.hliquid(C.is_pool(x, y) ? "water" : "lava"));
        /* pretend the kick is fast enough for lava not to burn */
        return C.ECMD_TIME;
    }

    if (C.OBJ_AT(x, y) && (!C.Levitation || C.Is_airlevel(C.u.uz)
                         || C.Is_waterlevel(C.u.uz) || C.sobj_at(C.BOULDER, x, y))) {
        const kickobjnam = C.stackAlloc(C.BUFSZ);

        if (C.callLocal(kick_object, x, y, kickobjnam)) {
            if (C.Is_airlevel(C.u.uz))
                C.hurtle(-C.u.dx, -C.u.dy, 1, 1); /* assume it's light */
            return C.ECMD_TIME;
        }
        C.callLocal(kick_ouch, x, y, kickobjnam);
        return C.ECMD_TIME;
    }

    if (C.IS_DOOR(C.gm.maploc.typ))
        kick_door(x, y, avrg_attrib);
    else
        return C.callLocal(kick_nondoor, x, y, avrg_attrib);
    return C.ECMD_TIME;
}

export function drop_to(cc, loc, x, y)
{
    loc = C.char(loc);x = C.coordxy(x);y = C.coordxy(y);
    let stway = C.stairway_at(x, y);

    /* cover all the MIGR_xxx choices generated by down_gate() */
    switch (loc) {
    case C.MIGR_RANDOM: /* trap door or hole */
        if (C.Is_stronghold(C.u.uz)) {
            cc.x = C.valley_level.dnum;
            cc.y = C.valley_level.dlevel;
            break;
        } else if (C.In_endgame(C.u.uz) || C.Is_botlevel(C.u.uz)) {
            cc.y = cc.x = 0;
            break;
        }
        
        /*FALLTHRU*/
    case C.MIGR_STAIRS_UP:
    case C.MIGR_LADDER_UP:
    case C.MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev.dnum;
            cc.y = stway.tolev.dlevel;
        } else {
            cc.x = C.u.uz.dnum;
            cc.y = C.u.uz.dlevel + 1;
        }
        break;
    default:
    case C.MIGR_NOWHERE:
        /* y==0 means "nowhere", in which case x doesn't matter */
        cc.y = cc.x = 0;
        break;
    }
}

/* player or missile impacts location, causing objects to fall down */
export function impact_drop(missile, x, y, dlev) /* caused impact, won't drop itself */ /* location affected */          /* if !0 send to dlev near player */
{
    x = C.coordxy(x);y = C.coordxy(y);dlev = C.coordxy(dlev);
    let toloc;
    let obj, obj2;
    let shkp;
    let oct, dct, price, debit, robbed;
    let angry, costly, isrock;
    const cc = C.coordLocal();

    if (!C.OBJ_AT(x, y))
        return;

    toloc = down_gate(x, y);
    C.callLocal(drop_to, cc, toloc, x, y);
    if (!cc.y)
        return;

    if (dlev) {
        /* send objects next to player falling through trap door.
         * checked in obj_delivery().
         */
        toloc = C.MIGR_WITH_HERO;
        cc.y = dlev;
    }

    costly = C.costly_spot(x, y);
    price = debit = robbed = 0n;
    angry = 0;
    shkp = 0;
    /* if 'costly', we must keep a record of ESHK(shkp) before
     * it undergoes changes through the calls to stolen_value.
     * the angry bit must be reset, if needed, in this fn, since
     * stolen_value is called under the 'silent' flag to avoid
     * unsavory pline repetitions.
     */
    if (costly) {
        if ((shkp = C.shop_keeper(C.charAtRooms(x, y, C.SHOPBASE))) != 0) {
            debit = shkp.mextra.eshk.debit;
            robbed = shkp.mextra.eshk.robbed;
            angry = !shkp.mpeaceful;
        }
    }

    isrock = (Number(Boolean(missile && missile.otyp == C.ROCK)));
    oct = dct = 0n;
    for (obj = C.svl.level.objects[x][y]; obj; obj = obj2) {
        obj2 = obj.nexthere;
        if (C.samePtr(obj, missile))
            continue;
        /* number of objects in the pile */
        oct += obj.quan;
        if (C.samePtr(obj, C.uball) || C.samePtr(obj, C.uchain))
            continue;
        /* boulders can fall too, but rarely & never due to rocks */
        if ((isrock && obj.otyp == C.BOULDER)
            || C.rn2(obj.otyp == C.BOULDER ? 30 : 3, 1569, 'impact_drop'))
            continue;
        C.obj_extract_self(obj);

        if (costly) {
            price += C.stolen_value(obj, x, y,
                                  (Number(Boolean(C.costly_spot(C.u.ux, C.u.uy)
                                   && C.strchr(C.u.urooms,
                                            C.charAtRooms(x, y, C.SHOPBASE))))),
                                  1);
            /* set obj->no_charge to 0 */
            if (C.Has_contents(obj))
                C.picked_container(obj); /* does the right thing */
            if (obj.oclass != C.COIN_CLASS)
                obj.no_charge = 0;
        }

        C.add_to_migration(obj);
        obj.ox = cc.x;
        obj.oy = cc.y;
        obj.owornmask = C.long(toloc);

        /* number of fallen objects */
        dct += obj.quan;
    }

    if (dct && C.cansee(x, y)) { /* at least one object fell */
        let what = (dct == 1n ? "object falls" : "objects fall");

        if (missile)
            C.pline("From the impact, %sother %s.",
                  dct == oct ? "the " : dct == 1n ? "an" : "", what);
        else if (oct == dct)
            C.pline("%s adjacent %s %s.", dct == 1n ? "The" : "All the", what,
                  C.gg.gate_str);
        else
            C.pline("%s adjacent %s %s.",
                  dct == 1n ? "One of the" : "Some of the",
                  dct == 1n ? "objects falls" : what, C.gg.gate_str);
    }

    if (costly && shkp && price) {
        if (shkp.mextra.eshk.robbed > robbed) {
            C.You("removed %ld %s worth of goods!", price, C.currency(price));
            if (C.cansee(shkp.mx, shkp.my)) {
                if (C.loadChar(shkp.mextra.eshk.customer) == 0)
                    C.strncpy(shkp.mextra.eshk.customer, C.svp.plname, C.PL_NSIZ);
                if (angry)
                    C.pline("%s is infuriated!", C.Shknam(shkp));
                else
                    C.pline("\"%s, you are a thief!\"", C.svp.plname);
            } else
                C.You_hear("a scream, \"Thief!\"");
            C.hot_pursuit(shkp);
            C.angry_guards(0);
            return;
        }
        if (shkp.mextra.eshk.debit > debit) {
            let amt = (shkp.mextra.eshk.debit - debit);
            C.You("owe %s %ld %s for goods lost.", C.shkname(shkp), amt,
                C.currency(amt));
        }
    }
}

/* NOTE: ship_object assumes otmp was FREED from fobj or invent.
 * <x,y> is the point of drop.  otmp is _not_ an <x,y> resident:
 * otmp is either a kicked, dropped, or thrown object.
 */
export function ship_object(otmp, x, y, shop_floor_obj)
{
    x = C.coordxy(x);y = C.coordxy(y);shop_floor_obj = C.boolean(shop_floor_obj);
    let toloc;
    let ox, oy;
    const cc = C.coordLocal();
    let obj;
    let t;
    let nodrop, unpaid, container, impact = 0, chainthere = 0;
    let n = 0n;

    if (!otmp)
        return 0;
    if ((toloc = down_gate(x, y)) == C.MIGR_NOWHERE)
        return 0;
    C.callLocal(drop_to, cc, toloc, x, y);
    if (!cc.y)
        return 0;

    /* objects other than attached iron ball always fall down ladder,
       but have a chance of staying otherwise */
    nodrop = Number(Boolean((C.samePtr(otmp, C.uball)) || (C.samePtr(otmp, C.uchain))
             || (toloc != C.MIGR_LADDER_UP && C.rn2(3, 1660, 'ship_object'))));

    container = C.Has_contents(otmp);
    unpaid = C.is_unpaid(otmp);

    if (C.OBJ_AT(x, y)) {
        for (obj = C.svl.level.objects[x][y]; obj; obj = obj.nexthere) {
            if (C.samePtr(obj, C.uchain))
                chainthere = 1;
            else if (!C.samePtr(obj, otmp))
                n += obj.quan;
        }
        if (n)
            impact = 1;
    }
    /* boulders never fall through trap doors, but they might knock
       other things down before plugging the hole */
    if (otmp.otyp == C.BOULDER && ((t = C.t_at(x, y)) != 0)
        && C.is_hole(t.ttyp)) {
        if (impact)
            C.callLocal(impact_drop, otmp, x, y, 0);
        return 0; /* let caller finish the drop */
    }

    if (C.cansee(x, y))
        C.callLocal(otransit_msg, otmp, nodrop, chainthere, n);

    if (nodrop) {
        if (impact) {
            C.callLocal(impact_drop, otmp, x, y, 0);
            C.maybe_unhide_at(x, y);
        }
        return 0;
    }

    if (unpaid || shop_floor_obj) {
        if (unpaid) {
            C.stolen_value(otmp, C.u.ux, C.u.uy, 1, 0);
        } else {
            ox = otmp.ox;
            oy = otmp.oy;
            C.stolen_value(
                otmp, ox, oy,
                (Number(Boolean(C.costly_spot(C.u.ux, C.u.uy)
                 && C.strchr(C.u.urooms, C.charAtRooms(ox, oy, C.SHOPBASE))))),
                0);
        }
        /* set otmp->no_charge to 0 */
        if (container)
            C.picked_container(otmp); /* happens to do the right thing */
        if (otmp.oclass != C.COIN_CLASS)
            otmp.no_charge = 0;
    }

    if (otmp.owornmask)
        C.remove_worn_item(otmp, 1);

    /* some things break rather than ship */
    if (C.breaktest(otmp)) {
        let result;

        if (C.objects[otmp.otyp].oc_material == C.GLASS
            || otmp.otyp == C.EXPENSIVE_CAMERA) {
            if (otmp.otyp == C.MIRROR)
                C.change_luck(-2);
            result = "crash";
        } else {
            /* penalty for breaking eggs laid by you */
            if (otmp.otyp == C.EGG && otmp.spe && C.ismnum(otmp.corpsenm))
                C.change_luck(C.char(-(otmp.quan < 5n ? otmp.quan : 5n)));
            result = "splat";
        }
        if (otmp.otyp == C.EGG) {
            // Soundeffect(se_egg_splatting, 25); (inactive sound macro; no argument evaluation)
        } else {
            // Soundeffect(se_glass_crashing, 25); (inactive sound macro; no argument evaluation)
        }
        C.You_hear("a muffled %s.", result);
        C.obj_extract_self(otmp);
        C.obfree(otmp, 0);
        return 1;
    }

    C.add_to_migration(otmp);
    otmp.ox = cc.x;
    otmp.oy = cc.y;
    otmp.owornmask = C.long(toloc);

    /* boulder from rolling boulder trap, no longer part of the trap */
    if (otmp.otyp == C.BOULDER)
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
        C.callLocal(impact_drop, otmp, x, y, 0);
        C.newsym(x, y);
    }
    return 1;
}

export function obj_delivery(near_hero)
{
    near_hero = C.boolean(near_hero);
    let otmp, otmp2;
    let nx = 0, ny = 0;
    let where;
    let nobreak, noscatter;
    let stway;
    const fromdlev = C.levelLocal();
    let isladder;

    for (otmp = C.gm.migrating_objs; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.ox != C.u.uz.dnum || otmp.oy != C.u.uz.dlevel)
            continue;

        where = C.int(otmp.owornmask & 0x7fffn); /* destination code */
        if ((where & C.MIGR_TO_SPECIES) != 0)
            continue;

        nobreak = (where & C.MIGR_NOBREAK) != 0;
        noscatter = (where & C.MIGR_WITH_HERO) != 0;
        where &= ~(C.MIGR_NOBREAK | C.MIGR_NOSCATTER);

        if (!near_hero ^ (where == C.MIGR_WITH_HERO))
            continue;

        C.obj_extract_self(otmp);
        otmp.owornmask = 0n;
        fromdlev.dnum = otmp.omigr_from_dnum;
        fromdlev.dlevel = otmp.omigr_from_dlevel;

        isladder = 0;

        switch (where) {
        case C.MIGR_LADDER_UP:
            isladder = 1;
            
            /*FALLTHRU*/
        case C.MIGR_STAIRS_UP:
        case C.MIGR_SSTAIRS:
            if ((stway = C.stairway_find_from(fromdlev, isladder)) != 0) {
                nx = stway.sx;
                ny = stway.sy;
            }
            break;
        case C.MIGR_WITH_HERO:
            nx = C.u.ux, ny = C.u.uy;
            break;
        default:
        case C.MIGR_RANDOM:
            nx = ny = 0;
            break;
        }
        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;
        if (nx > 0) {
            C.place_object(otmp, nx, ny);
            if (!nobreak && !C.IS_SOFT(C.levl[nx][ny].typ)) {
                if (where == C.MIGR_WITH_HERO) {
                    if (C.breaks(otmp, nx, ny))
                        continue;
                } else if (C.breaktest(otmp)) {
                    /* assume it broke before player arrived, no messages */
                    C.delobj(otmp);
                    continue;
                }
            }
            C.stackobj(otmp);
            if (!noscatter)
                C.scatter(nx, ny, C.rnd(2, 1838, 'obj_delivery'), 0, otmp);
            else
                C.newsym(nx, ny);
        } else { /* random location */
            /* set dummy coordinates because there's no
               current position for rloco() to update */
            otmp.ox = otmp.oy = 0;
            if (C.rloco(otmp) && !nobreak && C.breaktest(otmp)) {
                /* assume it broke before player arrived, no messages */
                C.delobj(otmp);
            }
        }
    }
}

export function deliver_obj_to_mon(mtmp, cnt, deliverflags)
{
    cnt = C.int(cnt);deliverflags = C.ulong(deliverflags);
    let otmp, otmp2;
    let where, maxobj = 1;
    let at_crime_scene = C.In_mines(C.u.uz);

    if ((deliverflags & C.DF_RANDOM) && cnt > 1)
        maxobj = C.rnd(cnt, 1861, 'deliver_obj_to_mon');
    else if (deliverflags & C.DF_ALL)
        maxobj = 0;
    else
        maxobj = 1;

const DELIVER_PM = (C.M2_UNDEAD | C.M2_WERE | C.M2_HUMAN | C.M2_ELF | C.M2_DWARF 
                    | C.M2_GNOME | C.M2_ORC | C.M2_DEMON | C.M2_GIANT);

    cnt = 0;
    for (otmp = C.gm.migrating_objs; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        where = C.int(otmp.owornmask & 0x7fffn); /* destination code */
        if ((where & C.MIGR_TO_SPECIES) == 0)
            continue;

        if (otmp.migr_species != C.NON_PM
            && ((mtmp.data.mflags2 & DELIVER_PM)
                == BigInt(C.uint(otmp.migr_species)))) {
            C.obj_extract_self(otmp);
            otmp.owornmask = 0n;
            otmp.ox = otmp.oy = 0;

            /* special treatment for orcs and their kind */
            if ((C.ulong(otmp.corpsenm) & C.M2_ORC) != 0 && C.has_oname(otmp)) {
                if (!C.has_mgivenname(mtmp)) {
                    if (at_crime_scene || !C.rn2(2, 1887, 'deliver_obj_to_mon'))
                        mtmp = C.christen_orc(mtmp,
                                            at_crime_scene ? otmp.oextra.oname
                                                           : 0,
                                            /* bought the stolen goods */
                                            " the Fence");
                }
                C.free_oname(otmp);
            }
            otmp.migr_species = C.NON_PM;
            otmp.omigr_from_dnum = 0;
            otmp.omigr_from_dlevel = 0;
            C.add_to_minv(mtmp, otmp);
            cnt++;
            if (maxobj && cnt >= maxobj)
                break;
            /* getting here implies DF_ALL */
        }
    }
}

export function otransit_msg(otmp, nodrop, chainthere, num)
{
    nodrop = C.boolean(nodrop);chainthere = C.boolean(chainthere);num = C.long(num);
    let optr = 0; const obuf = C.stackAlloc(C.BUFSZ), xbuf = C.stackAlloc(C.BUFSZ);

    if (otmp.otyp == C.CORPSE) {
        /* Tobjnam() calls xname() and would yield "The corpse";
           we want more specific "The newt corpse" or "Medusa's corpse" */
        optr = C.upstart(C.corpse_xname(otmp, 0, C.CXN_PFX_THE));
    } else {
        optr = C.Tobjnam(otmp, 0);
    }
    C.Strcpy(obuf, optr);

    if (num || chainthere) {
        /* As of 3.6.2: use a separate buffer for the suffix to avoid risk of
           overrunning obuf[] (let pline() handle truncation if necessary) */
        if (num) { /* means: other objects are impacted */
            C.Sprintf(xbuf, " %s %s object%s", C.otense(otmp, "hit"),
                    (num == 1n) ? "another" : "other", (num > 1n) ? "s" : "");
        } else { /* chain-only msg */
            C.Sprintf(xbuf, " %s your chain", C.otense(otmp, "rattle"));
        }
        if (nodrop)
            C.Sprintf(C.eos(xbuf), ".");
        else
            C.Sprintf(C.eos(xbuf), " and %s %s.",
                    C.otense(otmp, "fall"), C.gg.gate_str);
        C.pline("%s%s", obuf, xbuf);
    } else if (!nodrop)
        C.pline("%s %s %s.", obuf, C.otense(otmp, "fall"), C.gg.gate_str);
}

/* migration destination for objects which fall down to next level */
export function down_gate(x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    let ttmp;
    let stway = C.stairway_at(x, y);

    C.gg.gate_str = 0;
    /* this matches the player restriction in goto_level() */
    if (C.on_level(C.u.uz, C.qstart_level) && !C.ok_to_quest()) {
        return C.MIGR_NOWHERE;
    }
    if (stway && !stway.up && !stway.isladder) {
        C.gg.gate_str = "down the stairs";
        return (stway.tolev.dnum == C.u.uz.dnum) ? C.MIGR_STAIRS_UP
                                                : C.MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        C.gg.gate_str = "down the ladder";
        return C.MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap drop might or might not */
    if ((ttmp = C.t_at(x, y)) != 0 && ttmp.tseen && C.is_hole(ttmp.ttyp)) {
        C.gg.gate_str = (ttmp.ttyp == C.TRAPDOOR) ? "through the trap door"
                                              : "through the hole";
        return C.MIGR_RANDOM;
    }
    return C.MIGR_NOWHERE;
}

/*dokick.c*/
