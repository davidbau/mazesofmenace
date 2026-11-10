import {C} from './c-runtime.js';
/* NetHack 5.0	do.c	$NHDT-Date: 1774269965 2026/03/23 04:46:05 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.404 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */

/* Contains code for 'd', 'D' (drop), '>', '<' (up, down) */

















    /* static boolean badspot(coordxy,coordxy); */

/* the #drop command: drop one inventory item */

export function dodrop()
{
    let result;

    if (C.u.ushops[0])
        C.sellobj_state(C.SELL_DELIBERATE);
    result = C.callLocal(drop, C.getobj("drop", C.any_obj_ok,
                         C.GETOBJ_PROMPT | C.GETOBJ_ALLOWCNT));
    if (C.u.ushops[0])
        C.sellobj_state(C.SELL_NORMAL);
    if (result)
        C.reset_occupations();

    return result;
}

/* Called when a boulder is dropped, thrown, or pushed.  If it ends up
 * in a pool, it either fills the pool up or sinks away.  In either case,
 * it's gone for good...  If the destination is not a pool, returns FALSE.
 */
/* the object falling into a pool or water or lava *//* coordinates of the pool *//* for a boulder, whether or not it is being pushed */
export function boulder_hits_pool(otmp, rx, ry, pushing)
{
    if (!otmp || otmp.otyp != C.BOULDER) {
        C.impossible("Not a boulder?", C.varargs(0));
    } else if (C.is_pool_or_lava(rx, ry)) {
        let lava = C.is_lava(rx, ry), fills_up;
        let what = C.waterbody_name(rx, ry);
        let ltyp = C.levl[rx][ry].typ;
        let chance = C.rn2(10, "boulder_hits_pool", 61); /* water: 90%; lava: 10% */
        let mtmp;

        /* chance for boulder to fill pool:  Plane of Water==0%,
           lava 10%, wall of water==50%, other water==90% */
        fills_up = C.Is_waterlevel(C.addressOf(C.u, "uz")) ? 0
                   : C.IS_WATERWALL(ltyp) ? (chance < 5)
                     : lava ? (chance == 0) : (chance != 0);

        if (fills_up) {
            let ttmp = C.t_at(rx, ry);

            if (ltyp == C.DRAWBRIDGE_UP) {
                C.levl[rx][ry].drawbridgemask &= ~C.DB_UNDER; /* clear lava */
                C.levl[rx][ry].drawbridgemask |= C.DB_FLOOR;
            } else {
                C.levl[rx][ry].typ = C.ROOM, C.levl[rx][ry].flags = 0;
                C.recalc_block_point(rx, ry);
            }
            /* 5.0: normally DEADMONSTER() is used when traversing the fmon
               list--dead monsters usually aren't still at specific map
               locations; however, if ice melts causing a giant to drown,
               that giant would still be on the map when it drops inventory;
               if it was carrying a boulder which now fills the pool, 'mtmp'
               will be dead here; killing it again would yield impossible
               "dmonsfree: N removed doesn't match N+1 pending" when other
               monsters have finished their current turn */
            if ((mtmp = C.m_at(rx, ry)) != 0 && !C.DEADMONSTER(mtmp)
                && !C.m_in_air(mtmp))
                C.mondied(mtmp);

            if (ttmp)
                C.delfloortrap(ttmp);
            C.bury_objs(rx, ry);

            C.newsym(rx, ry);
            if (pushing) {
                const whobuf = C.charArray(C.BUFSZ);

                C.Strcpy(whobuf, "you");
                if (C.u.usteed)
                    C.Strcpy(whobuf, C.y_monnam(C.u.usteed));
                C.pline("%s %s %s into the %s.", C.upstart(whobuf),
                      C.vtense(whobuf, "push"), C.the(C.xname(otmp)), what, C.varargs(1));
                if (C.flags.verbose && !C.Blind)
                    C.pline("Now you can cross it!", C.varargs(2));
                /* no splashing in this case */
            }
        }
        if (!fills_up || !pushing) { /* splashing occurs */
            if (!C.u.uinwater) {
                if (pushing ? !C.Blind : C.cansee(rx, ry)) {
                    C.There("is a large splash as %s %s the %s.",
                          C.the(C.xname(otmp)), fills_up ? "fills" : "falls into",
                          what, C.varargs(3));
                } else if (!C.Deaf) {
                    if (lava) {
                        void 0;
                    } else {
                        void 0;
                    }
                    C.You_hear("a%s splash.", lava ? " sizzling" : "", C.varargs(4));
                }
                C.wake_nearto(rx, ry, 40);
            }

            if (fills_up && C.u.uinwater && C.distu(rx, ry) == 0) {
                C.set_uinwater(0); /* u.uinwater = 0 */
                C.docrt();
                C.gv.vision_full_recalc = 1;
                C.You("find yourself on dry land again!", C.varargs(5));
            } else if (lava && C.next2u(rx, ry)) {
                let dmg;

                C.You("are hit by molten %s%c",
                    C.hliquid("lava"), C.Fire_resistance ? 46 : 33, C.varargs(6));
                C.burn_away_slime();
                dmg = C.d((C.Fire_resistance ? 1 : 3), 6, "boulder_hits_pool", 138);
                C.losehp((C.Half_physical_damage ? C.intDiv(C.int((dmg) + 1), 2) : (dmg)), /* lava damage */
                       "molten lava", C.KILLED_BY);
            } else if (!fills_up && C.flags.verbose
                       && (pushing ? !C.Blind : C.cansee(rx, ry))) {
                C.pline("It sinks without a trace!", C.varargs(7));
            }
        }

        /* boulder is now gone */
        if (pushing)
            C.useupf(otmp, otmp.quan);
        else
            C.obfree(otmp, 0);
        return 1;
    }
    return 0;
}

/* Used for objects which sometimes do special things when dropped; must be
 * called with the object not in any chain.  Returns TRUE if the object goes
 * away.
 */
/* the object landing on the floor *//* map coordinates for spot where it is landing *//* "fall", "drop", "land", &c */
export function flooreffects(obj, x, y, verb)
{
    let t;
    let mtmp;
    let otmp;
    const save_bhitpos = C.localStruct("nhcoord");
    let tseen;
    let ttyp = C.NO_TRAP, res = 0;

    if (obj.where != C.OBJ_FREE)
        C.panic("flooreffects: obj not free", C.varargs(8));

    /* make sure things like water_damage() have no pointers to follow */
    obj.nobj = obj.nexthere = 0;
    /* erode_obj() (called from water_damage() or lava_damage()) needs
       bhitpos, but that was screwing up wand zapping that called us from
       rloco(), so we now restore bhitpos before we return */
    C.copyStruct(save_bhitpos, C.gb.bhitpos);
    C.gb.bhitpos.x = x, C.gb.bhitpos.y = y;

    if (obj.otyp == C.BOULDER && C.callLocal(boulder_hits_pool, obj, x, y, 0)) {
        res = 1;
    } else if (obj.otyp == C.BOULDER && (t = C.t_at(x, y)) != 0
               && (C.is_pit(t.ttyp) || C.is_hole(t.ttyp))) {
        deletedwithboulder: {
        ttyp = t.ttyp;
        tseen = t.tseen ? 1 : 0;
        if (((mtmp = C.m_at(x, y)) && mtmp.mtrapped)
            || (C.u.utrap && C.u_at(x,y))) {
            if (C.loadChar(verb) && (C.cansee(x, y) || C.distu(x, y) == 0))
                C.pline("%s boulder %s into the pit%s.",
                      C.Blind ? "A" : "The",
                      C.vtense(0, verb),
                      mtmp ? "" : " with you", C.varargs(9));
            if (mtmp) {
                if (!C.passes_walls(mtmp.data) && !C.throws_rocks(mtmp.data)) {
                    /* dieroll was rnd(20); 1: maximum chance to hit
                       since trapped target is a sitting duck */
                    let damage, dieroll = 1;

                    /* As of 3.6.2: this was calling hmon() unconditionally
                       so always credited/blamed the hero but the boulder
                       might have been thrown by a giant or launched by
                       a rolling boulder trap triggered by a monster or
                       dropped by a scroll of earth read by a monster */
                    if (C.svc.context.mon_moving) {
                        /* normally we'd use ohitmon() but it can call
                           drop_throw() which calls flooreffects() */
                        damage = C.dmgval(obj, mtmp);
                        mtmp.mhp -= damage;
                        if (C.DEADMONSTER(mtmp)) {
                            if (C.canspotmon(mtmp))
                                C.pline("%s is %s!", C.Monnam(mtmp),
                                      (C.nonliving(mtmp.data)
                                       || C.is_vampshifter(mtmp))
                                      ? "destroyed" : "killed", C.varargs(10));
                            C.mondied(mtmp);
                        }
                    } else {
                        C.hmon(mtmp, obj, C.HMON_THROWN, dieroll);
                    }
                    if (!C.DEADMONSTER(mtmp) && !C.is_whirly(mtmp.data))
                        res = 0; /* still alive, boulder still intact */
                    void res;
                }
                mtmp.mtrapped = 0;
            } else {
                if (!C.Passes_walls && !C.throws_rocks(C.gy.youmonst.data)) {
                    C.losehp((C.Half_physical_damage ? C.intDiv(C.int((C.rnd(15, "flooreffects", 232)) + 1), 2) : (C.rnd(15, "flooreffects", 232))),
                           "squished under a boulder", C.NO_KILLER_PREFIX);
                    break deletedwithboulder;
                } else
                    C.reset_utrap(1);
            }
        }
        if (C.loadChar(verb)) {
            if (C.Blind && C.u_at(x, y)) {
                void 0;
                C.You_hear("a CRASH! beneath you.", C.varargs(11));
            } else if (!C.Blind && C.cansee(x, y)) {
                C.pline_The("boulder %s%s.",
                          (ttyp == C.TRAPDOOR && !tseen) ? "triggers and " : "",
                          (ttyp == C.TRAPDOOR) ? "plugs a trap door"
                          : (ttyp == C.HOLE) ? "plugs a hole"
                            : "fills a pit", C.varargs(12));
            } else {
                void 0;
                C.You_hear("a boulder %s.", verb, C.varargs(13));
            }
        }
        /*
         * Note:  trap might have gone away via ((hmon -> killed -> xkilled)
         *  || mondied) -> mondead -> m_detach -> fill_pit.
         */
        }
        /* creating a pit in ice results in that ice being turned into
           floor so we shouldn't need any special ice handing here */
        if ((t = C.t_at(x, y)) != 0) {
            C.delfloortrap(t);
            if (C.u.utrap && C.u_at(x, y))
                C.reset_utrap(0);
        }
        C.useupf(obj, 1n);
        C.bury_objs(x, y);
        C.newsym(x, y);
        res = 1;
    } else if (C.is_lava(x, y)) {
        res = C.lava_damage(obj, x, y);
    } else if (C.is_pool(x, y)) {
        /* Reasonably bulky objects (arbitrary) splash when dropped.
         * If you're floating above the water even small things make
         * noise.  Stuff dropped near fountains always misses */
        if ((C.Blind || (C.Levitation || C.Flying)) && !C.Deaf && C.u_at(x, y)) {
            if (!C.Underwater) {
                if (C.weight(obj) > C.WT_SPLASH_THRESHOLD) {
                    C.pline("Splash!", C.varargs(14));
                } else if (C.Levitation || C.Flying) {
                    C.pline("Plop!", C.varargs(15));
                }
            }
            C.map_background(x, y, 0);
            C.newsym(x, y);
        }
        res = C.water_damage(obj, 0, 0) == C.ER_DESTROYED;
    } else if (C.u_at(x, y) && (t = C.t_at(x, y)) != 0
               && (C.uteetering_at_seen_pit(t) || C.uescaped_shaft(t))) {
        if (C.is_pit(t.ttyp)) {
            if (C.Blind && !C.Deaf) {
                void 0;
                C.You_hear("%s tumble downwards.", C.the(C.xname(obj)), C.varargs(16));
            } else {
                C.pline("%s into %s pit.", C.Tobjnam(obj, "tumble"),
                      C.the_your[t.madeby_u], C.varargs(17));
            }
        } else if (C.ship_object(obj, x, y, 0)) {
            /* ship_object will print an appropriate "the item falls
             * through the hole" message, so no need to do it here. */
            res = 1;
        }
    } else if (obj.globby) {
        let globbyobj = obj;  /* allow obj to be nonnull arg */

        /* Globby things like puddings might stick together */
        while (globbyobj
               && (otmp = C.obj_nexto_xy(globbyobj, x, y, 1)) != 0) {
            C.pudding_merge_message(globbyobj, otmp);
            /* intentionally not getting the melded object; obj_meld may set
             * obj to null. */
            C.obj_meld(C.reference("obj", () => globbyobj, value => globbyobj = value), C.reference("obj", () => otmp, value => otmp = value));
        }
        res = !globbyobj;
    } else if (C.svc.context.mon_moving && C.IS_ALTAR(C.levl[x][y].typ)
               && C.cansee(x,y)) {
        doaltarobj(obj);
    } else if (obj.oclass == C.POTION_CLASS && C.svl.level.flags.temperature > 0
               && (C.levl[x][y].typ == C.ROOM || C.levl[x][y].typ == C.CORR)) {
        /* Potions are sometimes destroyed when landing on very hot
           ground. The basic odds are 50% for nonblessed potions and
           30% for blessed potions; if you have handled the object
           (i.e. it is or was yours), these odds are adjusted by Luck
           (each Luck point affects them by 2%). Artifact potions
           would not be affected, if any existed.

           Oil is not affected because its boiling point (and flash
           point) are higher than that of water. For example, whale
           oil, one of the substances traditionally used in oil lamps,
           can survive over 100 degrees Centigrade more heat than
           water can.*/
        if (C.cansee(x,y)) {
            /* unconditional "ground" is safe as this only runs for
               room and corridor tiles */
            C.pline("%s up as %s the hot ground.", C.Tobjnam(obj, "heat"),
                  C.is_plural(obj) ? "they hit" : "it hits", C.varargs(18));
        }

        let survival_chance = obj.blessed ? 70 : 50;
        if (obj.invlet)
            survival_chance += C.Luck * 2;
        if (obj.otyp == C.POT_OIL)
            survival_chance = 100;

        if (!C.obj_resists(obj, survival_chance, 100)) {
            if (C.cansee(x,y)) {
                C.pline("%s from the heat!",
                      C.is_plural(obj) ? "They shatter" : "It shatters", C.varargs(19));
            } else {
                C.You_hear("a shattering noise.", C.varargs(20));
            }
            C.breakobj(obj, x, y, 0, 0);
            res = 1;
        }
    }

    C.copyStruct(C.gb.bhitpos, save_bhitpos);
    return res;
}

/* obj is an object dropped on an altar */

export function doaltarobj(obj)
{
    if (C.Blind)
        return;

    if (obj.oclass != C.COIN_CLASS) {
        /* KMH, conduct */
        if (!C.svc.context.mon_moving && !C.u.uconduct.gnostic++)
            C.livelog_printf(C.LL_CONDUCT,
                           "eschewed atheism, by dropping %s on an altar",
                           C.doname(obj), C.varargs(21));
    } else {
        /* coins don't have bless/curse status */
        obj.blessed = obj.cursed = 0;
    }

    if (obj.blessed || obj.cursed) {
        C.There("is %s flash as %s %s the altar.",
              C.an(C.hcolor(obj.blessed ? C.NH_AMBER : C.NH_BLACK)), C.doname(obj),
              C.otense(obj, "hit"), C.varargs(22));
        if (!C.Hallucination)
            obj.bknown = 1; /* ok to bypass set_bknown() */
    } else {
        C.pline("%s %s on the altar.", C.Doname2(obj), C.otense(obj, "land"), C.varargs(23));
        if (obj.oclass != C.COIN_CLASS)
            obj.bknown = 1; /* ok to bypass set_bknown() */
    }
}

/* If obj is neither formally identified nor informally called something
 * already, prompt the player to call its object type. */

export function trycall(obj)
{
    if (!C.objects[obj.otyp].oc_name_known && !C.objects[obj.otyp].oc_uname)
        C.docall(obj);
}

/* Transforms the sink at the player's position into
   a fountain, throne, altar or grave. */

export function polymorph_sink()
{
    let sym = C.S_sink;
    let sinklooted;
    let algn;

    if (C.levl[C.u.ux][C.u.uy].typ != C.SINK)
        return;

    sinklooted = C.levl[C.u.ux][C.u.uy].looted != 0;
    /* svl.level.flags.nsinks--; // set_levltyp() will update this */
    C.levl[C.u.ux][C.u.uy].flags = 0;
    switch (C.rn2(4, "polymorph_sink", 416)) {
    default:
    case 0:
        sym = C.S_fountain;
        C.set_levltyp(C.u.ux, C.u.uy, C.FOUNTAIN); /* updates level.flags.nfountains */
        C.levl[C.u.ux][C.u.uy].blessedftn = 0;
        if (sinklooted)
            C.SET_FOUNTAIN_LOOTED(C.u.ux, C.u.uy);
        break;
    case 1:
        sym = C.S_throne;
        C.set_levltyp(C.u.ux, C.u.uy, C.THRONE);
        if (sinklooted)
            C.levl[C.u.ux][C.u.uy].looted = C.T_LOOTED;
        break;
    case 2:
        sym = C.S_altar;
        C.set_levltyp(C.u.ux, C.u.uy, C.ALTAR);
        /* 3.6.3: this used to pass 'rn2(A_LAWFUL + 2) - 1' to
           Align2amask() but that evaluates its argument more than once */
        algn = C.rn2(3, "polymorph_sink", 436) - 1; /* -1 (A_Cha) or 0 (A_Neu) or +1 (A_Law) */
        C.levl[C.u.ux][C.u.uy].altarmask = ((C.Inhell && C.rn2(3, "polymorph_sink", 437)) ? C.AM_NONE
                                      : C.Align2amask(algn));
        break;
    case 3:
        sym = C.S_room;
        C.set_levltyp(C.u.ux, C.u.uy, C.ROOM);
        C.make_grave(C.u.ux, C.u.uy, 0);
        if (C.levl[C.u.ux][C.u.uy].typ == C.GRAVE)
            sym = C.S_grave;
        break;
    }
    /* give message even if blind; we know we're not levitating,
       so can feel the outcome even if we can't directly see it */
    if (C.levl[C.u.ux][C.u.uy].typ != C.ROOM)
        C.pline_The("sink transforms into %s!", C.an(C.defsyms[sym].explanation), C.varargs(24));
    else
        C.pline_The("sink vanishes.", C.varargs(25));
    C.newsym(C.u.ux, C.u.uy);
}

/* Teleports the sink at the player's position;
   return True if sink teleported. */

export function teleport_sink()
{
    let cx, cy;
    let alreadylooted;
    let trycnt = 0;

    do {
/* this isn't incorrect but it is extremely unlikely that spots
         * on the level's edge will be ROOM so picking such wastes tries */
/* 1..COLNO-1 */
/* 0..ROWNO-1 */
/* use this instead */
        cx = 1 + C.rnd((C.COLNO - 1) - 2, "teleport_sink", 472); /* 2..COLNO-2 */
        cy = 1 + C.rn2(C.ROWNO - 2, "teleport_sink", 473);       /* 1..ROWNO-2 */
        if (C.levl[cx][cy].typ == C.ROOM
            && !C.t_at(cx, cy) && !C.engr_at(cx, cy)
            && (!C.cansee(cx, cy) || C.distu(cx, cy) > 3 * 3)) {
            /* this ends up having set_levltyp() count all sinks and
               fountains on the level twice but that is not a problem */
            alreadylooted = C.levl[C.u.ux][C.u.uy].looted;
            /* remove old sink */
            C.set_levltyp(C.u.ux, C.u.uy, C.ROOM); /* was SINK so updates nsinks */
            C.levl[C.u.ux][C.u.uy].looted = 0;
            C.newsym(C.u.ux, C.u.uy);
            /* create sink at new position */
            C.set_levltyp(cx, cy, C.SINK); /* now SINK so also updates nsinks */
            C.levl[cx][cy].looted = alreadylooted ? 1 : 0;
            C.newsym(cx, cy);
            return 1;
        }
    } while (++trycnt < 200);

    return 0;
}

/* obj is a ring being dropped over a kitchen sink */

export function dosinkring(obj)
{
    let otmp,otmp2;
    let ideed = 1;
    let nosink = 0;

    C.You("drop %s down the drain.", C.doname(obj), C.varargs(26));
    obj.in_use = 1;  /* block free identification via interrupt */
    not_giveback: {
    giveback: {
    switch (obj.otyp) { /* effects that can be noticed without eyes */
    case C.RIN_SEARCHING:
        C.You("thought %s got lost in the sink, but there it is!", C.yname(obj), C.varargs(27));
        break giveback;
    case C.RIN_SLOW_DIGESTION:
        C.pline_The("ring is regurgitated!", C.varargs(28));
        break giveback;
    case C.RIN_LEVITATION:
        C.pline_The("sink quivers upward for a moment.", C.varargs(29));
        break;
    case C.RIN_POISON_RESISTANCE:
        C.You("smell rotten %s.", C.makeplural(C.fruitname(0)), C.varargs(30));
        break;
    case C.RIN_AGGRAVATE_MONSTER:
        C.pline("Several %s buzz angrily around the sink.",
              C.Hallucination ? C.makeplural(C.rndmonnam(0)) : "flies", C.varargs(31));
        break;
    case C.RIN_SHOCK_RESISTANCE:
        C.pline("Static electricity surrounds the sink.", C.varargs(32));
        break;
    case C.RIN_CONFLICT:
        void 0;
        C.You_hear("loud noises coming from the drain.", C.varargs(33));
        break;
    case C.RIN_SUSTAIN_ABILITY: /* KMH */
        C.pline_The("%s flow seems fixed.", C.hliquid("water"), C.varargs(34));
        break;
    case C.RIN_GAIN_STRENGTH:
        C.pline_The("%s flow seems %ser now.",
                  C.hliquid("water"),
                  (obj.spe < 0) ? "weak" : "strong", C.varargs(35));
        break;
    case C.RIN_GAIN_CONSTITUTION:
        C.pline_The("%s flow seems %ser now.",
                  C.hliquid("water"),
                  (obj.spe < 0) ? "less" : "great", C.varargs(36));
        break;
    case C.RIN_INCREASE_ACCURACY: /* KMH */
        C.pline_The("%s flow %s the drain.",
                  C.hliquid("water"),
                  (obj.spe < 0) ? "misses" : "hits", C.varargs(37));
        break;
    case C.RIN_INCREASE_DAMAGE:
        C.pline_The("water's force seems %ser now.",
                  (obj.spe < 0) ? "small" : "great", C.varargs(38));
        break;
    case C.RIN_HUNGER:
        ideed = 0;
        for (otmp = C.svl.level.objects[C.u.ux][C.u.uy]; otmp; otmp = otmp2) {
            otmp2 = otmp.nexthere;
            if (otmp != C.uball && otmp != C.uchain
                && !C.obj_resists(otmp, 1, 99)) {
                if (!C.Blind) {
                    C.pline("Suddenly, %s %s from the sink!", C.doname(otmp),
                          C.otense(otmp, "vanish"), C.varargs(39));
                    ideed = 1;
                }
                C.delobj(otmp);
            }
        }
        break;
    case C.MEAT_RING:
        /* Not the same as aggravate monster; besides, it's obvious. */
        C.pline("Several flies buzz around the sink.", C.varargs(40));
        break;
    case C.RIN_TELEPORTATION:
        nosink = teleport_sink();
        /* give message even if blind; we know we're not levitating,
           so can feel the outcome even if we can't directly see it */
        C.pline_The("sink %svanishes.", nosink ? "" : "momentarily ", C.varargs(41));
        ideed = 0;
        break;
    case C.RIN_POLYMORPH:
        polymorph_sink();
        nosink = 1;
        /* for S_room case, same message as for teleportation is given */
        ideed = (C.levl[C.u.ux][C.u.uy].typ != C.ROOM);
        break;
    default:
        ideed = 0;
        break;
    }
        break not_giveback;
    }
        obj.in_use = 0;
        dropx(obj);
        trycall(obj);
        return;
    }
    if (!C.Blind && !ideed) {
        ideed = 1;
        switch (obj.otyp) { /* effects that need eyes */
        case C.RIN_ADORNMENT:
            C.pline_The("faucets flash brightly for a moment.", C.varargs(42));
            break;
        case C.RIN_REGENERATION:
            C.pline_The("sink looks as good as new.", C.varargs(43));
            break;
        case C.RIN_INVISIBILITY:
            C.You("don't see anything happen to the sink.", C.varargs(44));
            break;
        case C.RIN_FREE_ACTION:
            C.You_see("the ring slide right down the drain!", C.varargs(45));
            break;
        case C.RIN_SEE_INVISIBLE:
            C.You_see("some %s in the sink.",
                    C.Hallucination ? "oxygen molecules" : "air", C.varargs(46));
            break;
        case C.RIN_STEALTH:
            C.pline_The("sink seems to blend into the floor for a moment.", C.varargs(47));
            break;
        case C.RIN_FIRE_RESISTANCE:
            C.pline_The("hot %s faucet flashes brightly for a moment.",
                      C.hliquid("water"), C.varargs(48));
            break;
        case C.RIN_COLD_RESISTANCE:
            C.pline_The("cold %s faucet flashes brightly for a moment.",
                      C.hliquid("water"), C.varargs(49));
            break;
        case C.RIN_PROTECTION_FROM_SHAPE_CHAN:
            C.pline_The("sink looks nothing like a fountain.", C.varargs(50));
            break;
        case C.RIN_PROTECTION:
            C.pline_The("sink glows %s for a moment.",
                      C.hcolor((obj.spe < 0) ? C.NH_BLACK : C.NH_SILVER), C.varargs(51));
            break;
        case C.RIN_WARNING:
            C.pline_The("sink glows %s for a moment.", C.hcolor(C.NH_WHITE), C.varargs(52));
            break;
        case C.RIN_TELEPORT_CONTROL:
            C.pline_The("sink looks like it is being beamed aboard somewhere.", C.varargs(53));
            break;
        case C.RIN_POLYMORPH_CONTROL:
            C.pline_The(
                  "sink momentarily looks like a regularly erupting geyser.", C.varargs(54));
            break;
        default:
            break;
        }
    }
    if (ideed) {
        trycall(obj);
    } else if (!nosink) {
        void 0;
        C.You_hear("the ring bouncing down the drainpipe.", C.varargs(55));
    }
    if (!C.rn2(20, "dosinkring", 649) && !nosink) {
        C.pline_The("sink backs up, leaving %s.", C.doname(obj), C.varargs(56));
        obj.in_use = 0;
        dropx(obj);
    } else if (!C.rn2(5, "dosinkring", 653)) {
        C.freeinv(obj);
        obj.in_use = 0;
        obj.ox = C.u.ux;
        obj.oy = C.u.uy;
        C.add_to_buried(obj);
    } else
        C.useup(obj);
}

/* some common tests when trying to drop or throw items */

export function canletgo(obj, word)
{
    if (obj.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) {
        if (C.loadChar(word))
            C.Norep("You cannot %s %s you are wearing.", word, C.something, C.varargs(57));
        return 0;
    }
    if (obj == C.uwep && C.welded(C.uwep)) {
        /* no weldmsg(), so uwep->bknown might become set silently
           if word is "" */
        if (C.loadChar(word)) {
            let hand = C.body_part(C.HAND);

            if (C.bimanual(C.uwep))
                hand = C.makeplural(hand);
            C.Norep("You cannot %s %s welded to your %s.", word, C.something,
                  hand, C.varargs(58));
        }
        return 0;
    }
    if (obj.otyp == C.LOADSTONE && obj.cursed) {
        /* getobj() kludge sets corpsenm to user's specified count
           when refusing to split a stack of cursed loadstones */
        if (C.loadChar(word)) {
            /* getobj() ignores a count for throwing since that is
               implicitly forced to be 1; replicate its kludge... */
            if (!C.strcmp(word, "throw") && obj.quan > 1n)
                obj.corpsenm = 1;
            C.pline("For some reason, you cannot %s%s the stone%s!", word,
                  obj.corpsenm ? " any of" : "", C.plur(obj.quan), C.varargs(59));
        }
        obj.corpsenm = 0; /* reset */
        C.set_bknown(obj, 1);
        return 0;
    }
    if (obj.otyp == C.LEASH && obj.leashmon != 0) {
        if (C.loadChar(word))
            C.pline_The("leash is tied around your %s.", C.body_part(C.HAND), C.varargs(60));
        return 0;
    }
    if (obj.owornmask & C.W_SADDLE) {
        if (C.loadChar(word))
            C.You("cannot %s %s you are sitting on.", word, C.something, C.varargs(61));
        return 0;
    }
    return 1;
}


export function drop(obj)
{
    if (!obj)
        return C.ECMD_FAIL;
    if (!canletgo(obj, "drop"))
        return C.ECMD_FAIL;
    if (obj.otyp == C.CORPSE && C.callLocal(better_not_try_to_drop_that, obj))
        return C.ECMD_FAIL;
    if (obj == C.uwep) {
        if (C.welded(C.uwep)) {
            C.weldmsg(obj);
            return C.ECMD_FAIL;
        }
        C.setuwep(0);
    }
    if (obj == C.uquiver) {
        C.setuqwep(0);
    }
    if (obj == C.uswapwep) {
        C.setuswapwep(0);
    }

    if (C.u.uswallow) {
        /* barrier between you and the floor */
        if (C.flags.verbose) {
            let onam_p, mnam_p;
            const monbuf = C.charArray(C.BUFSZ);

            mnam_p = C.mon_nam(C.u.ustuck);
            /* doname can call s_suffix, reusing its buffer */
            if (C.digests(C.u.ustuck.data)) {
                C.Sprintf(monbuf, "%s %s", C.s_suffix(mnam_p),
                        C.mbodypart(C.u.ustuck, C.STOMACH), C.varargs(62));
                mnam_p = monbuf;
            }
            onam_p = C.is_unpaid(obj) ? C.yobjnam(obj, 0) : C.doname(obj);

            C.You("drop %s into %s.", onam_p, mnam_p, C.varargs(63));
        }
    } else {
        if ((obj.oclass == C.RING_CLASS || obj.otyp == C.MEAT_RING)
            && C.IS_SINK(C.levl[C.u.ux][C.u.uy].typ)) {
            dosinkring(obj);
            return C.ECMD_TIME;
        }
        if (!C.can_reach_floor(1)) {
            /* we might be levitating due to #invoke Heart of Ahriman;
               if so, levitation would end during call to freeinv()
               and we want hitfloor() to happen before float_down() */
            let levhack = C.finesse_ahriman(obj);

            if (levhack)
                C.ELevitation = C.W_ART; /* other than W_ARTI */
            if (C.flags.verbose)
                C.You("drop %s.", C.doname(obj), C.varargs(64));
            C.freeinv(obj);
            C.hitfloor(obj, 1);
            if (levhack)
                C.float_down(C.I_SPECIAL | C.TIMEOUT, C.W_ARTI | C.W_ART);
            return C.ECMD_TIME;
        }
        if (!C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ) && C.flags.verbose)
            C.You("drop %s.", C.doname(obj), C.varargs(65));
    }
    obj.how_lost = C.LOST_DROPPED;
    dropx(obj);
    return C.ECMD_TIME;
}

/* dropx - take dropped item out of inventory;
   called in several places - may produce output
   (eg ship_object() and dropy() -> sellobj() both produce output) */

export function dropx(obj)
{
    C.freeinv(obj);
    if (!C.u.uswallow) {
        if (C.ship_object(obj, C.u.ux, C.u.uy, 0))
            return;
        if (C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ))
            doaltarobj(obj); /* set bknown */
    }
    dropy(obj);
}

/* dropy - put dropped object at destination; called from lots of places */

export function dropy(obj)
{
    dropz(obj, 0);
}

/* dropz - really put dropped object at its destination... */

export function dropz(obj, with_impact)
{
    if (obj == C.uwep)
        C.setuwep(0);
    if (obj == C.uquiver)
        C.setuqwep(0);
    if (obj == C.uswapwep)
        C.setuswapwep(0);

    if (C.u.uswallow) {
        /* hero has dropped an item while inside an engulfer */
        if (obj != C.uball) { /* mon doesn't pick up ball */
            /* moving shop item into engulfer's inventory treated as theft */
            if (C.is_unpaid(obj))
                C.stolen_value(obj, C.u.ux, C.u.uy, 1, 0);
            /* add to engulfer's inventory if not immediately eaten */
            if (!engulfer_digests_food(obj))
                C.mpickobj(C.u.ustuck, obj);
        }
    } else {
        if (C.callLocal(flooreffects, obj, C.u.ux, C.u.uy, "drop"))
            return;
        C.place_object(obj, C.u.ux, C.u.uy);
        if (with_impact)
            C.container_impact_dmg(obj, C.u.ux, C.u.uy);
        C.impact_disturbs_zombies(obj, with_impact);
        if (obj == C.uball)
            C.drop_ball(C.u.ux, C.u.uy);
        else if (C.svl.level.flags.has_shop)
            C.sellobj(obj, C.u.ux, C.u.uy);
        C.stackobj(obj);
        if (C.Blind && C.Levitation)
            C.map_object(obj, 0);
        C.newsym(C.u.ux, C.u.uy); /* remap location under self */
    }
    C.encumber_msg();
}

/* when swallowed, move dropped object from OBJ_FREE to u.ustuck's inventory;
   for purple worm, immediately eat any corpse, glob, or special meat item
   from object polymorph; return True if object is used up, False otherwise */

export function engulfer_digests_food(obj)
{
    /* animal swallower (purple worn) eats any
       corpse, glob, or meat <item> but not other types of food */
    if (C.digests(C.u.ustuck.data)
        && (obj.otyp == C.CORPSE || obj.globby
            || obj.otyp == C.MEATBALL || obj.otyp == C.ENORMOUS_MEATBALL
            || obj.otyp == C.MEAT_RING || obj.otyp == C.MEAT_STICK)) {
        let could_petrify = 0,
                could_poly = 0, could_slime = 0,
                could_grow = 0, could_heal = 0;

        if (obj.otyp == C.CORPSE) {
            could_petrify = C.touch_petrifies(C.mons[obj.corpsenm]);
            could_poly = C.polyfood(obj);
            could_grow = (obj.corpsenm == C.PM_WRAITH);
            could_heal = (obj.corpsenm == C.PM_NURSE);
        } else if (obj.otyp == C.GLOB_OF_GREEN_SLIME) {
            could_slime = 1;
        }
        /* see or feel the effect */
        C.pline("%s instantly digested!", C.Tobjnam(obj, "are"), C.varargs(66));

        if (could_poly || could_slime) {
            C.newcham(C.u.ustuck, could_slime ? C.mons[C.PM_GREEN_SLIME] : 0,
                           could_slime ? C.NC_SHOW_MSG : C.NO_NC_FLAGS);
        } else if (could_petrify) {
            C.minstapetrify(C.u.ustuck, 1);
        } else if (could_grow) {
            C.grow_up(C.u.ustuck, 0);
        } else if (could_heal) {
            C.healmon(C.u.ustuck, C.u.ustuck.mhpmax, 0);
            /* False: don't realize that sight is cured from inside */
            C.mcureblindness(C.u.ustuck, 0);
        }
        C.delobj(obj); /* always used up */
        return 1;
    }
    return 0;
}

/* things that must change when not held; recurse into containers.
   Called for both player and monsters */

export function obj_no_longer_held(obj)
{
    if (!obj) {
        return;
    } else if (C.Has_contents(obj)) {
        let contents;

        for (contents = obj.cobj; contents; contents = contents.nobj)
            obj_no_longer_held(contents);
    }
    switch (obj.otyp) {
    case C.CRYSKNIFE:
        /* Normal crysknife reverts to worm tooth when not held by hero
         * or monster; fixed crysknife has only 10% chance of reverting.
         * When a stack of the latter is involved, it could be worthwhile
         * to give each individual crysknife its own separate 10% chance,
         * but we aren't in any position to handle stack splitting here.
         */
        if (!obj.oerodeproof || !C.rn2(10, "obj_no_longer_held", 911)) {
            /* if monsters aren't moving, assume player is responsible */
            if (!C.svc.context.mon_moving && !C.program_state.gameover)
                C.costly_alteration(obj, C.COST_DEGRD);
            obj.otyp = C.WORM_TOOTH;
            obj.oerodeproof = 0;
        }
        break;
    }
}

/* the #droptype command: drop several things */

export function doddrop()
{
    let result = C.ECMD_OK;

    if (!C.gi.invent) {
        C.You("have nothing to drop.", C.varargs(67));
        return C.ECMD_OK;
    }
    C.add_valid_menu_class(0); /* clear any classes already there */
    if (C.u.ushops[0])
        C.sellobj_state(C.SELL_DELIBERATE);
    if (C.flags.menu_style != C.MENU_TRADITIONAL
        || (result = C.ggetobj("drop", drop, 0, 0, 0)) < -1)
        result = menu_drop(result);
    if (C.u.ushops[0])
        C.sellobj_state(C.SELL_NORMAL);
    if (result)
        C.reset_occupations();

    return result;
}


export function better_not_try_to_drop_that(otmp)
{
    const buf = C.charArray(C.BUFSZ);

    /* u_safe_from_fatal_corpse() with st_all checks for gloves and stoning
     *  resistance before bothering to prompt you.
     */
    if (otmp.otyp == C.CORPSE && !C.u_safe_from_fatal_corpse(otmp, C.st_all)) {
        C.Snprintf(
            buf, C.sizeof(buf),
            "Drop the %s corpse without %s protection on?",
            C.obj_pmname(otmp), C.body_part(C.HAND), C.varargs(68));
        return (C.paranoid_ynq(1, buf, 0) != 121);
    }
    return 0;
}
/* check callers */
export function menudrop_split(otmp, cnt)
{
    if (cnt && cnt < otmp.quan) {
        if (C.welded(otmp)) {
            ; /* don't split */
        } else if (otmp.otyp == C.LOADSTONE && otmp.cursed) {
            /* same kludge as getobj(), for canletgo()'s use */
            otmp.corpsenm = cnt; /* don't split */
        } else {
            otmp = C.splitobj(otmp, cnt);
        }
    }
    return C.callLocal(drop, otmp);
}

/* Drop things from the hero's inventory, using a menu. */

export function menu_drop(retry)
{
    let n, i, n_dropped = 0;
    let otmp,otmp2;
    let pick_list;
    let all_categories = 1, drop_everything = 0, autopick = 0;
    let drop_justpicked = 0;
    let justpicked_quan = 0;

    drop_done: {
    if (retry) {
        all_categories = (retry == -2);
    } else if (C.flags.menu_style == C.MENU_FULL) {
        all_categories = 0;
        n = C.query_category("Drop what type of items?", C.gi.invent,
                           (C.UNPAID_TYPES | C.ALL_TYPES | C.CHOOSE_ALL
                            | C.BUC_BLESSED | C.BUC_CURSED | C.BUC_UNCURSED
                            | C.BUC_UNKNOWN | C.JUSTPICKED | C.INCLUDE_VENOM),
                           C.reference("menuarray", () => pick_list, value => pick_list = value), C.PICK_ANY);
            /* when paranoid_confirm:A is set, 'A' by itself implies
               'A'+'a' which will be followed by a confirmation prompt;
               when that option isn't set, 'A' by itself is rejected
               by query_categorry() and result here will be n==0 */
        if (!n)
            break drop_done; /* no non-autopick category filters specified */

        for (i = 0; i < n; i++) {
            if (pick_list[i].item.a_int == C.ALL_TYPES_SELECTED) {
                all_categories = 1;
            } else if (pick_list[i].item.a_int == 65) {
                drop_everything = autopick = 1;
            } else if (pick_list[i].item.a_int == 80) {
                justpicked_quan = C.max(0, pick_list[i].count);
                drop_justpicked = 1;
                drop_everything = 0;
                C.add_valid_menu_class(pick_list[i].item.a_int);
            } else {
                C.add_valid_menu_class(pick_list[i].item.a_int);
                drop_everything = 0;
            }
        }
        C.free(pick_list);
    } else if (C.flags.menu_style == C.MENU_COMBINATION) {
        let ggoresults = 0;

        all_categories = 0;
        /* Gather valid classes via traditional NetHack method */
        i = C.ggetobj("drop", drop, 0, 1, C.reference("unsigned", () => ggoresults, value => ggoresults = value));
        if (i == -2)
            all_categories = 1;
        if ((ggoresults & C.ALL_FINISHED) != 0) {
            n_dropped = i;
            break drop_done;
        }
    }

    if (autopick) {
        /*
         * Dropping a burning potion of oil while levitating can cause
         * an explosion which might destroy some of hero's inventory,
         * so the old code
         *      for (otmp = gi.invent; otmp; otmp = otmp2) {
         *          otmp2 = otmp->nobj;
         *          n_dropped += drop(otmp);
         *      }
         * was unreliable and could lead to an "object lost" panic.
         *
         * Use the bypass bit to mark items already processed (hence
         * not droppable) and rescan inventory until no unbypassed
         * items remain.
         *
         * FIXME?  if something explodes, or even breaks, we probably
         * ought to halt the traversal or perhaps ask player whether
         * to halt it.
         */
        C.bypass_objlist(C.gi.invent, 0); /* clear bypass bit for invent */
        while ((otmp = C.nxt_unbypassed_obj(C.gi.invent)) != 0) {
            if (drop_everything || all_categories || C.allow_category(otmp))
                n_dropped += ((C.callLocal(drop, otmp) & C.ECMD_TIME) != 0) ? 1 : 0;
        }
        /* we might not have dropped everything (worn armor, welded weapon,
           cursed loadstones), so reset any remaining inventory to normal */
        C.bypass_objlist(C.gi.invent, 0);
    } else if (drop_justpicked && C.count_justpicked(C.gi.invent) == 1) {
        /* drop the just picked item automatically, if only one stack */
        otmp = C.find_justpicked(C.gi.invent);
        if (otmp)
            n_dropped += ((menudrop_split(otmp, justpicked_quan)
                           & C.ECMD_TIME) != 0) ? 1 : 0;
    } else {
        /* should coordinate with perm invent, maybe not show worn items */
        n = C.query_objlist("What would you like to drop?", C.addressOf(C.gi, "invent"),
                          (C.USE_INVLET | C.INVORDER_SORT | C.INCLUDE_VENOM),
                          C.reference("menuarray", () => pick_list, value => pick_list = value), C.PICK_ANY,
                          all_categories ? C.allow_all : C.allow_category);
        if (n > 0) {
            /*
             * picklist[] contains a set of pointers into inventory, but
             * as soon as something gets dropped, they might become stale
             * (see the autopick code above for an explanation).
             * Just checking to see whether one is still in the gi.invent
             * chain is not sufficient validation since destroyed items
             * will be freed and items we've split here might have already
             * reused that memory and put the same pointer value back into
             * gi.invent.  Ditto for using invlet to validate.  So we start
             * by setting bypass on all of gi.invent, then check each pointer
             * to verify that it is in gi.invent and has that bit set.
             */
            C.bypass_objlist(C.gi.invent, 1);
            for (i = 0; i < n; i++) {
                otmp = pick_list[i].item.a_obj;
                for (otmp2 = C.gi.invent; otmp2; otmp2 = otmp2.nobj)
                    if (otmp2 == otmp)
                        break;
                if (!otmp2 || !otmp2.bypass)
                    continue;
                /* found next selected invent item */
                n_dropped += ((menudrop_split(otmp, pick_list[i].count)
                               & C.ECMD_TIME) != 0) ? 1 : 0;
            }
            C.bypass_objlist(C.gi.invent, 0); /* reset gi.invent to normal */
            C.free(pick_list);
        }
    }

    }
    return (n_dropped ? C.ECMD_TIME : C.ECMD_OK);
}


export function u_stuck_cannot_go(updn)
{
    if (C.u.ustuck) {
        if (C.u.uswallow || !C.sticks(C.gy.youmonst.data)) {
            C.You("are %s, and cannot go %s.",
                !C.u.uswallow ? "being held"
                : C.digests(C.u.ustuck.data) ? "swallowed"
                : "engulfed", updn, C.varargs(69));
            return 1;
        } else {
            let mtmp = C.u.ustuck;

            C.set_ustuck(0);
            C.You("release %s.", C.mon_nam(mtmp), C.varargs(70));
        }
    }
    return 0;
}

/* the #down command */

export function dodown()
{
    let trap = 0;
    let stway;
    let stairs_down, ladder_down;

    C.set_move_cmd(C.DIR_DOWN, 0);

    if (C.u_rooted())
        return C.ECMD_TIME;

    if (C.stucksteed(1)) {
        return C.ECMD_OK;
    }

    stairs_down = ladder_down = 0;
    if ((stway = C.stairway_at(C.u.ux, C.u.uy)) != 0 && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    /* Levitation might be blocked, but player can still use '>' to
       turn off controlled levitation */
    if (C.HLevitation || C.ELevitation) {
        if ((C.HLevitation & C.I_SPECIAL) || (C.ELevitation & C.W_ARTI)) {
            /* end controlled levitation */
            if (C.ELevitation & C.W_ARTI) {
                let obj;

                for (obj = C.gi.invent; obj; obj = obj.nobj) {
                    if (obj.oartifact
                        && C.artifact_has_invprop(obj, C.LEVITATION)) {
                        if (obj.age < C.svm.moves)
                            obj.age = C.svm.moves;
                        obj.age += C.long(C.rnz(100, "dodown", 1165));
                    }
                }
            }
            if (C.float_down(C.I_SPECIAL | C.TIMEOUT, C.W_ARTI)) {
                return C.ECMD_TIME; /* came down, so moved */
            } else if (!C.HLevitation && !C.ELevitation) {
                C.Your("latent levitation ceases.", C.varargs(71));
                return C.ECMD_TIME; /* did something, effectively moved */
            }
        }
        if (C.BLevitation) {
            ; /* weren't actually floating after all */
        } else if (C.Blind) {
            /* glyph_to_cmap() is a macro which expands its argument many
               times; use this to do part of its work just once */
            let glyph_at_uxuy = C.levl[C.u.ux][C.u.uy].glyph;

            /* Avoid alerting player to an unknown stair or ladder.
             * Changes the message for a covered, known staircase
             * too; staircase knowledge is not stored anywhere.
             */
            if (stairs_down)
                stairs_down = (C.glyph_to_cmap(glyph_at_uxuy) == C.S_dnstair);
            else if (ladder_down)
                ladder_down = (C.glyph_to_cmap(glyph_at_uxuy) == C.S_dnladder);
        }
        if (C.Is_airlevel(C.addressOf(C.u, "uz")))
            C.You("are floating in the %s.", C.surface(C.u.ux, C.u.uy), C.varargs(72));
        else if (C.Is_waterlevel(C.addressOf(C.u, "uz")))
            C.You("are floating in %s.",
                C.is_pool(C.u.ux, C.u.uy) ? "the water" : "a bubble of air", C.varargs(73));
        else
            C.floating_above(stairs_down ? "stairs"
                           : ladder_down ? "ladder"
                             : C.surface(C.u.ux, C.u.uy));
        return C.ECMD_OK; /* didn't move */
    }

    if (C.Upolyd && C.ceiling_hider(C.mons[C.u.umonnum]) && C.u.uundetected) {
        C.u.uundetected = 0;
        if (C.Flying) { /* lurker above */
            C.You("fly out of hiding.", C.varargs(74));
        } else { /* piercer */
            C.You("drop to the %s.", C.surface(C.u.ux, C.u.uy), C.varargs(75));
            if (C.is_pool_or_lava(C.u.ux, C.u.uy)) {
                C.pooleffects(0);
            } else {
                C.pickup(1);
                if ((trap = C.t_at(C.u.ux, C.u.uy)) != 0)
                    C.dotrap(trap, C.TOOKPLUNGE);
            }
        }
        return C.ECMD_TIME; /* came out of hiding; need '>' again to go down */
    }

    if (u_stuck_cannot_go("down"))
        return C.ECMD_TIME;

    if (!stairs_down && !ladder_down) {
        trap = C.t_at(C.u.ux, C.u.uy);
        if (trap && (C.uteetering_at_seen_pit(trap) || C.uescaped_shaft(trap))) {
            C.dotrap(trap, C.TOOKPLUNGE);
            return C.ECMD_TIME;
        } else if (!trap || !C.is_hole(trap.ttyp)
                   || !C.Can_fall_thru(C.addressOf(C.u, "uz")) || !trap.tseen) {
            if (C.flags.autodig && !C.svc.context.nopick
                && C.uwep && C.is_pick(C.uwep)) {
                return C.use_pick_axe2(C.uwep);
            } else {
                C.You_cant("go down here%s.",
                         (trap && trap.ttyp == C.VIBRATING_SQUARE) ? " yet"
                                                                  : "", C.varargs(76));
                return C.ECMD_OK;
            }
        }
    }
    if (C.on_level(C.addressOf(C, "valley_level"), C.addressOf(C.u, "uz")) && !C.u.uevent.gehennom_entered) {
        C.You("are standing at the gate to Gehennom.", C.varargs(77));
        C.pline("Unspeakable cruelty and harm lurk down there.", C.varargs(78));
        if (C.y_n("Are you sure you want to enter?") != 121)
            return C.ECMD_OK;
        C.pline("So be it.", C.varargs(79));
        C.u.uevent.gehennom_entered = 1; /* don't ask again */
    }

    if (!C.next_to_u()) {
        C.You("are held back by your pet!", C.varargs(80));
        return C.ECMD_OK;
    }

    if (trap) {
        let down_or_thru = trap.ttyp == C.HOLE ? "down" : "through";
        let actn = C.u_locomotion("jump");

        if (C.gy.youmonst.data.msize >= C.MZ_HUGE) {
            const qbuf = C.charArray(C.QBUFSZ);

            C.You("don't fit %s easily.", down_or_thru, C.varargs(81));
            C.Sprintf(qbuf, "Try to squeeze %s?", down_or_thru, C.varargs(82));
            if (C.y_n(qbuf) == 121) {
                if (!C.rn2(3, "dodown", 1266)) {
                    actn = "manage to squeeze";
                    C.losehp((C.Half_physical_damage ? C.intDiv(C.int((C.rnd(4, "dodown", 1268)) + 1), 2) : (C.rnd(4, "dodown", 1268))),
                           "contusion from a small passage", C.KILLED_BY);
                } else {
                    C.You("were unable to fit %s.", down_or_thru, C.varargs(83));
                    return C.ECMD_OK;
                }
            } else {
                return C.ECMD_OK;
            }
        }
        C.You("%s %s the %s.", actn, down_or_thru,
            trap.ttyp == C.HOLE ? "hole" : "trap door", C.varargs(84));
    }
    if (trap && C.Is_stronghold(C.addressOf(C.u, "uz"))) {
        C.goto_hell(0, 1);
    } else if (trap && trap.dst.dlevel != -1) {
        const tdst = C.localStruct("d_level");
        C.assign_level(tdst, trap.dst);
        C.clamp_hole_destination(tdst);
        C.callLocal(goto_level, tdst, 0, 0, 0);
    } else {
        C.ga.at_ladder = (C.levl[C.u.ux][C.u.uy].typ == C.LADDER);
        C.next_level(!trap);
        C.ga.at_ladder = 0;
    }
    return C.ECMD_TIME;
}

/* the #up command - move up a staircase */

export function doup()
{
    let stway = C.stairway_at(C.u.ux,C.u.uy);

    C.set_move_cmd(C.DIR_UP, 0);

    if (C.u_rooted())
        return C.ECMD_TIME;

    /* "up" to get out of a pit... */
    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        C.climb_pit();
        return C.ECMD_TIME;
    }

    if (!stway || (stway && !stway.up)) {
        C.You_cant("go up here.", C.varargs(85));
        return C.ECMD_OK;
    }
    if (C.stucksteed(1)) {
        return C.ECMD_OK;
    }

    if (u_stuck_cannot_go("up"))
        return C.ECMD_TIME;

    if (C.near_capacity() > C.SLT_ENCUMBER) {
        /* No levitation check; inv_weight() already allows for it */
        C.Your("load is too heavy to climb the %s.",
             C.levl[C.u.ux][C.u.uy].typ == C.STAIRS ? "stairs" : "ladder", C.varargs(86));
        return C.ECMD_TIME;
    }
    if (C.ledger_no(C.addressOf(C.u, "uz")) == 1) {
        if (C.iflags.debug_fuzzer)
            return C.ECMD_OK;
        if (C.y_n("Beware, there will be no return!  Still climb?") != 121)
            return C.ECMD_OK;
    }
    if (!C.next_to_u()) {
        C.You("are held back by your pet!", C.varargs(87));
        return C.ECMD_OK;
    }
    C.ga.at_ladder = (C.levl[C.u.ux][C.u.uy].typ == C.LADDER);
    C.prev_level(1);
    C.ga.at_ladder = 0;
    return C.ECMD_TIME;
}

/* check that we can write out the current level */

export function currentlevel_rewrite()
{
    let nhfp;
    const whynot = C.charArray(C.BUFSZ);

    /* since level change might be a bit slow, flush any buffered screen
     *  output (like "you fall through a trap door") */
    C.mark_synch();

    nhfp = C.create_levelfile(C.ledger_no(C.addressOf(C.u, "uz")), whynot);
    if (!nhfp) {
        /*
         * This is not quite impossible: e.g., we may have
         * exceeded our quota. If that is the case then we
         * cannot leave this level, and cannot save either.
         * Another possibility is that the directory was not
         * writable.
         */
        C.pline1(whynot);
        return 0;
    }

    return nhfp;
}


export function save_currentstate()
{
    let nhfp;

    C.program_state.in_checkpoint++;
    if (C.flags.ins_chkpt) {
        /* write out just-attained level, with pets and everything */
        nhfp = C.callLocal(currentlevel_rewrite);
        if (!nhfp)
            return;
        if (nhfp.structlevel)
            C.bufon(nhfp.fd);
        nhfp.mode = C.WRITING;
        C.savelev(nhfp,C.ledger_no(C.addressOf(C.u, "uz")));
        C.close_nhfile(nhfp);
    }

    /* write out non-level state */
    C.savestateinlock();
    C.program_state.in_checkpoint--;
}

/*
static boolean
badspot(coordxy x, coordxy y)
{
    return (boolean) ((levl[x][y].typ != ROOM
                       && levl[x][y].typ != AIR
                       && levl[x][y].typ != CORR)
                      || MON_AT(x, y));
}
*/

/* when arriving on a level, if hero and a monster are trying to share same
   spot, move one; extracted from goto_level(); also used by wiz_makemap() */

export function u_collide_m(mtmp)
{
    const cc = C.localStruct("nhcoord");

    if (!mtmp || mtmp == C.u.usteed || mtmp != C.m_at(C.u.ux, C.u.uy)) {
        C.impossible("level arrival collision: %s?",
                   !mtmp ? "no monster"
                     : (mtmp == C.u.usteed) ? "steed is on map"
                       : "monster not co-located", C.varargs(88));
        return;
    }

    /* There's a monster at your target destination; it might be one
       which accompanied you--see mon_arrive(dogmove.c)--or perhaps
       it was already here.  Randomly move you to an adjacent spot
       or else the monster to any nearby location.  Prior to 3.3.0
       the latter was done unconditionally. */
    if (!C.rn2(2, "u_collide_m", 1429) && C.enexto(cc, C.u.ux, C.u.uy, C.gy.youmonst.data)
        && C.next2u(cc.x, cc.y))
        C.u_on_newpos(cc.x, cc.y); /*[maybe give message here?]*/
    else
        C.mnexto(mtmp, C.RLOC_NOMSG);

    if ((mtmp = C.m_at(C.u.ux, C.u.uy)) != 0) {
        /* there was an unconditional impossible("mnexto failed")
           here, but it's not impossible and we're prepared to cope
           with the situation, so only say something when debugging */
        if (C.wizard)
            C.pline("(monster in hero's way)", C.varargs(89));
        if (!C.rloc(mtmp, C.RLOC_NOMSG) || (mtmp = C.m_at(C.u.ux, C.u.uy)) != 0)
            /* no room to move it; send it away, to return later */
            C.m_into_limbo(mtmp);
    }
}


export function familiar_level_msg()
{
    const fam_msgs = [
        "You have a sense of deja vu.",
        "You feel like you've been here before.",
        "This place %s familiar...", 0 /* no message */
    ];
    const halu_fam_msgs = [
        "Whoa!  Everything %s different.",
        "You are surrounded by twisty little passages, all alike.",
        "Gee, this %s like uncle Conan's place...", 0 /* no message */
    ];
    let mesg;
    const buf = C.charArray(C.BUFSZ);
    let which = C.rn2(4, "familiar_level_msg", 1462);

    if (C.Hallucination)
        mesg = halu_fam_msgs[which];
    else
        mesg = fam_msgs[which];
    if (mesg && C.strchr(mesg, 37)) {
        void 0;
        C.Sprintf(buf, mesg, !C.Blind ? "looks" : "seems", C.varargs(90));
        void 0;
        mesg = buf;
    }
    if (mesg)
        C.pline1(mesg);
}

/* destination *//* True if arriving via stairs/ladder *//* when falling to level, objects might tag along *//* True if arriving via magic portal */
export function goto_level(newlevel, at_stairs, falling, portal)
{
    let l_idx, save_mode;
    let nhfp;
    let new_ledger;
    let cant_go_back, great_effort,
            up = (C.depth(newlevel) < C.depth(C.addressOf(C.u, "uz"))),
            newdungeon = (C.u.uz.dnum != newlevel.dnum),
            leaving_tutorial = 0,
            was_in_W_tower = C.In_W_tower(C.u.ux, C.u.uy, C.addressOf(C.u, "uz")),
            familiar = 0,
            new_ = 0; /* made a new level? */
    let mtmp;
    const whynot = C.charArray(C.BUFSZ);
    let dist = C.depth(newlevel) - C.depth(C.addressOf(C.u, "uz"));
    let do_fall_dmg = 0;
    let prev_temperature = C.svl.level.flags.temperature;

    if (C.dunlev(newlevel) > C.dunlevs_in_dungeon(newlevel))
        newlevel.dlevel = C.dunlevs_in_dungeon(newlevel);
    if (newdungeon) {
        if (C.In_endgame(newlevel)) { /* 1st Endgame Level !!! */
            if (!C.u.uhave.amulet)
                return;  /* must have the Amulet */
            if (!C.wizard) /* wizard ^V can bypass Earth level */
                C.assign_level(newlevel, C.addressOf(C, "earth_level")); /* (redundant) */
        } else if (C.In_tutorial(newlevel)) {
            C.tutorial(1); /* entering tutorial */
        } else if (C.In_tutorial(C.addressOf(C.u, "uz"))) {
            C.tutorial(0); /* leaving tutorial */
            up = 0; /* re-enter level 1 as if starting new game */
            leaving_tutorial = 1;
        }
    }
    new_ledger = C.ledger_no(newlevel);
    if (new_ledger <= 0)
        C.done(C.ESCAPED); /* in fact < 0 is impossible */

    /* If you have the amulet and are trying to get out of Gehennom,
     * going up a set of stairs sometimes does some very strange things!
     * Biased against law and towards chaos.  (The chance to be sent
     * down multiple levels when attempting to go up are significantly
     * less than the corresponding comment in older versions indicated
     * due to overlooking the effect of the call to assign_rnd_lvl().)
     *
     * Odds for making it to the next level up, or of being sent down:
     *  "up"    L      N      C
     *   +1   75.0   75.0   75.0
     *    0    6.25   8.33  12.5
     *   -1   11.46  12.50  12.5
     *   -2    5.21   4.17   0.0
     *   -3    2.08   0.0    0.0
     *
     * 5.0.0: the chance for the "mysterious force" to kick in goes down
     * as it kicks in, starting at 25% per climb attempt and dropping off
     * gradually but substantially.  The drop off is greater when hero is
     * sent down farther so benefits lawfuls more than chaotics this time.
     */
    if (C.Inhell && up && C.u.uhave.amulet && !newdungeon && !portal
        && (C.dunlev(C.addressOf(C.u, "uz")) < C.dunlevs_in_dungeon(C.addressOf(C.u, "uz")) - 3)) {
        if (!C.rn2(4 + C.svc.context.mysteryforce, "goto_level", 1543)) {
            let odds = 3 + C.u.ualign.type,   /* 2..4 */
                diff = (odds <= 1) ? 0 : C.rn2(odds, "goto_level", 1545); /* paranoia */

            if (diff != 0) {
                C.assign_rnd_level(newlevel, C.addressOf(C.u, "uz"), diff);
                /* assign_rnd_level() may have used a value less than diff */
                diff = newlevel.dlevel - C.u.uz.dlevel; /* actual descent */
                /* if inside the tower, stay inside */
                if (was_in_W_tower && !C.On_W_tower_level(newlevel))
                    diff = 0;
            }
            if (diff == 0)
                C.assign_level(newlevel, C.addressOf(C.u, "uz"));

            C.pline("A mysterious force momentarily surrounds you...", C.varargs(91));
            /* each time it kicks in, the chance of doing so again may drop;
               that drops faster, on average, when being sent down farther so
               while the impact is reduced for everybody compared to earlier
               versions, it is reduced least for chaotics, most for lawfuls */
            C.svc.context.mysteryforce += C.rn2(diff + 2, "goto_level", 1563); /* L:0-4,N:0-3,C:0-2 */

            if (C.on_level(newlevel, C.addressOf(C.u, "uz"))) {
                C.safe_teleds(C.TELEDS_NO_FLAGS);
                C.next_to_u();
                return;
            }
            new_ledger = C.ledger_no(newlevel);
            at_stairs = C.ga.at_ladder = 0;
        }
    }

    /* Prevent the player from going past the first quest level unless
     * (s)he has been given the go-ahead by the leader.
     */
    if (C.on_level(C.addressOf(C.u, "uz"), C.addressOf(C, "qstart_level")) && !newdungeon && !C.ok_to_quest()) {
        C.pline("A mysterious force prevents you from descending.", C.varargs(92));
        return;
    }

    if (C.on_level(newlevel, C.addressOf(C.u, "uz")))
        return; /* this can happen */

    if (C.gl.luacore && C.nhcb_counts[C.NHCB_LVL_LEAVE]) {
        C.lua_getglobal(C.gl.luacore, "nh_callback_run");
        C.lua_pushstring(C.gl.luacore, C.nhcb_name[C.NHCB_LVL_LEAVE]);
        C.nhl_pcall_handle(C.gl.luacore, 1, 0, "goto_level", C.NHLpa_panic);
        C.lua_settop(C.gl.luacore, 0);
    }

    /* tethered movement makes level change while trapped feasible */
    if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL)
        C.buried_ball_to_punishment(); /* (before we save/leave old level) */

    nhfp = C.callLocal(currentlevel_rewrite);
    if (!nhfp)
        return;

    /* discard context which applies to the level we're leaving;
       for lock-picking, container may be carried, in which case we
       keep context; if on the floor, it's about to be saved+freed and
       maybe_reset_pick() needs to do its carried() check before that */
    C.maybe_reset_pick(0);
    C.reset_trapset(); /* even if to-be-armed trap obj is accompanying hero */
    C.iflags.travelcc.x = C.iflags.travelcc.y = 0; /* travel destination cache */
    C.svc.context.polearm.hitmon = 0; /* polearm target */
    /* digging context is level-aware and can actually be resumed if
       hero returns to the previous level without any intervening dig */

    if (falling) /* assuming this is only trap door or hole */
        C.impact_drop(0, C.u.ux, C.u.uy, newlevel.dlevel);

    C.check_special_room(1); /* probably was a trap door */
    if (C.Punished)
        C.unplacebc();
    C.reset_utrap(0); /* needed in level_tele */
    C.fill_pit(C.u.ux, C.u.uy);
    C.set_ustuck(0); /* clear u.ustuck and u.uswallow */
    C.set_uinwater(0); /* u.uinwater = 0 */
    C.u.uundetected = 0; /* not hidden, even if means are available */
    if (!C.iflags.nofollowers)
        C.keepdogs(0);
    C.recalc_mapseen(); /* recalculate map overview before we leave the level */
    /*
     *  We no longer see anything on the level.  Make sure that this
     *  follows u.uswallow set to null since uswallow overrides all
     *  normal vision.
     */
    C.vision_recalc(2);

    /*
     * Save the level we're leaving.  If we're entering the endgame,
     * we can get rid of all existing levels because they cannot be
     * reached any more.  We still need to use savelev()'s cleanup
     * for the level being left, to recover dynamic memory in use and
     * to avoid dangling timers and light sources.
     */
    cant_go_back = ((newdungeon && C.In_endgame(newlevel)) || leaving_tutorial);
    if (!cant_go_back) {
        C.update_mlstmv(); /* current monsters are becoming inactive */
        if (nhfp.structlevel)
            C.bufon(nhfp.fd);       /* use buffered output */
    } else {
        C.free_luathemes(leaving_tutorial ? C.tut_themes : C.most_themes);
    }
    save_mode = nhfp.mode;
    nhfp.mode = cant_go_back ? C.FREEING : (C.WRITING | C.FREEING);
    C.savelev(nhfp, C.ledger_no(C.addressOf(C.u, "uz")));
    nhfp.mode = save_mode;
    C.close_nhfile(nhfp);
    if (cant_go_back) {
        /* discard unreachable levels; keep #0 */
        for (l_idx = C.maxledgerno(); l_idx > 0; --l_idx)
            if (!leaving_tutorial || C.ledger_to_dnum(l_idx) == C.tutorial_dnum)
                C.delete_levelfile(l_idx);
        /* mark #overview data for all dungeon branches as uninteresting */
        for (l_idx = 0; l_idx < C.svn.n_dgns; ++l_idx)
            if (!leaving_tutorial || l_idx == C.tutorial_dnum)
                C.remdun_mapseen(l_idx);
        /* get rid of mons & objs scheduled to migrate to discarded levels */
        C.discard_migrations();
    }

    if (C.Is_rogue_level(newlevel) || C.Is_rogue_level(C.addressOf(C.u, "uz")))
        C.assign_graphics(C.Is_rogue_level(newlevel) ? C.ROGUESET : C.PRIMARYSET);
    C.check_gold_symbol();
    /* record this level transition as a potential seen branch unless using
     * some non-standard means of transportation (level teleport).
     */
    if ((at_stairs || falling || portal) && (C.u.uz.dnum != newlevel.dnum))
        C.recbranch_mapseen(C.addressOf(C.u, "uz"), newlevel);
    C.assign_level(C.addressOf(C.u, "uz0"), C.addressOf(C.u, "uz"));
    C.assign_level(C.addressOf(C.u, "uz"), newlevel);
    C.assign_level(C.addressOf(C.u, "utolev"), newlevel);
    C.u.utotype = C.UTOTYPE_NONE;
    if (!C.builds_up(C.addressOf(C.u, "uz"))) { /* usual case */
        if (C.dunlev(C.addressOf(C.u, "uz")) > C.dunlevReached(C.u.uz).value)
            C.dunlevReached(C.u.uz).value = C.dunlev(C.addressOf(C.u, "uz"));
    } else {
        if (C.dunlevReached(C.u.uz).value == 0
            || C.dunlev(C.addressOf(C.u, "uz")) < C.dunlevReached(C.u.uz).value)
            C.dunlevReached(C.u.uz).value = C.dunlev(C.addressOf(C.u, "uz"));
    }

    C.stairway_free_all();
    /* set default level change destination areas */
    /* the special level code may override these */
    C.memset(C.addressOf(C.svu, "updest"), 0, C.sizes.dest_area);
    C.memset(C.addressOf(C.svd, "dndest"), 0, C.sizes.dest_area);

    if (!(C.svl.level_info[new_ledger].flags & C.LFILE_EXISTS)) {
        /* entering this level for first time; make it now */
        if (C.svl.level_info[new_ledger].flags & (C.VISITED)) {
            C.impossible("goto_level: returning to discarded level?", C.varargs(93));
            C.svl.level_info[new_ledger].flags &= ~(C.VISITED);
        }
        C.mklev();
        new_ = 1; /* made the level */
        familiar = C.bones_include_name(C.svp.plname);
    } else {
        /* returning to previously visited level; reload it */
        nhfp = C.open_levelfile(new_ledger, whynot);
        if (C.tricked_fileremoved(nhfp, whynot)) {
            /* we'll reach here if running in wizard mode */
            C.error("Cannot continue this game.", C.varargs(94));
        }
        C.reseed_random(C.rn2);
        C.reseed_random(C.rn2_on_display_rng);
        C.getlev(nhfp, C.svh.hackpid, new_ledger);
        C.close_nhfile(nhfp);
        C.oinit(); /* reassign level dependent obj probabilities */
    }
    C.reglyph_darkroom();
    C.set_uinwater(0); /* u.uinwater = 0 */
    /* do this prior to level-change pline messages */
    C.vision_reset();         /* clear old level's line-of-sight */
    C.gv.vision_full_recalc = 0; /* don't let that reenable vision yet */
    C.flush_screen(-1);       /* ensure all map flushes are postponed */

    if (portal && !C.In_endgame(C.addressOf(C.u, "uz"))) {
        /* find the portal on the new level */
        let ttrap;

        for (ttrap = C.gf.ftrap; ttrap; ttrap = ttrap.ntrap)
            if (ttrap.ttyp == C.MAGIC_PORTAL)
                break;

        if (!ttrap) {
            if (C.u.uevent.qexpelled
                && (C.Is_qstart(C.addressOf(C.u, "uz0")) || C.Is_qstart(C.addressOf(C.u, "uz")))) {
                /* we're coming back from or going into the quest home level,
                   after already getting expelled once. The portal back
                   doesn't exist anymore - see expulsion(). */
                C.u_on_rndspot(0);
            } else {
                if (!C.iflags.debug_fuzzer)
                    C.impossible("goto_level: no corresponding portal!", C.varargs(95));
                C.u_on_rndspot(0);
            }
        } else {
            C.seetrap(ttrap);
            C.u_on_newpos(ttrap.tx, ttrap.ty);
        }
    } else if (at_stairs && !C.In_endgame(C.addressOf(C.u, "uz"))) {
        if (up) {
            let stway = C.stairway_find_from(C.addressOf(C.u, "uz0"), C.ga.at_ladder);
            if (stway) {
                C.u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = 1;
            } else if (newdungeon)
                C.u_on_sstairs(1);
            else
                C.u_on_dnstairs();
            /* you climb up the {stairs|ladder};
               fly up the stairs; fly up along the ladder */
            great_effort = (C.Punished && !C.Levitation);
            if (C.flags.verbose || great_effort)
                C.pline("%s %s up%s the %s.",
                      great_effort ? "With great effort, you" : "You",
                      C.u_locomotion("climb"),
                      (C.Flying && C.ga.at_ladder) ? " along" : "",
                      C.ga.at_ladder ? "ladder" : "stairs", C.varargs(96));
        } else { /* down */
            let stway = C.stairway_find_from(C.addressOf(C.u, "uz0"), C.ga.at_ladder);
            if (stway) {
                C.u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = 1;
            } else if (newdungeon)
                C.u_on_sstairs(0);
            else
                C.u_on_upstairs();
            if (!C.u.dz) {
                ; /* stayed on same level? (no transit effects) */
            } else if (C.Flying) {
                if (C.flags.verbose)
                    C.You("fly down %s.",
                        C.ga.at_ladder ? "along the ladder" : "the stairs", C.varargs(97));
            } else if (C.near_capacity() > C.UNENCUMBERED
                       || C.Punished || C.Fumbling) {
                C.You("fall down the %s.", C.ga.at_ladder ? "ladder" : "stairs", C.varargs(98));
                if (C.Punished) {
                    C.drag_down();
                    if (!C.welded(C.uball))
                        C.ballrelease(0);
                }
                /* falling off steed has its own losehp() call */
                if (C.u.usteed)
                    C.dismount_steed(C.DISMOUNT_FELL);
                else
                    C.losehp((C.Half_physical_damage ? C.intDiv(C.int((C.rnd(3, "goto_level", 1792)) + 1), 2) : (C.rnd(3, "goto_level", 1792))),
                           C.ga.at_ladder ? "falling off a ladder"
                                     : "tumbling down a flight of stairs",
                           C.KILLED_BY);
                C.selftouch("Falling, you");
            } else { /* ordinary descent */
                if (C.flags.verbose)
                    C.You("%s.", C.ga.at_ladder ? "climb down the ladder"
                                         : "descend the stairs", C.varargs(99));
            }
        }
    } else { /* trap door or level_tele or In_endgame */
        C.u_on_rndspot((up ? 1 : 0) | (was_in_W_tower ? 2 : 0));
        if (falling) {
            if (C.Punished && !C.welded(C.uball))
                C.ballfall();
            C.selftouch("Falling, you");
            do_fall_dmg = 1;
        }
    }

    if (C.Punished)
        C.placebc();
    C.obj_delivery(0);
    C.losedogs();
    C.kill_genocided_monsters(); /* for those wiped out while in limbo */
    /*
     * Expire all timers that have gone off while away.  Must be
     * after migrating monsters and objects are delivered
     * (losedogs and obj_delivery).
     */
    C.run_timers();

    /* hero might be arriving at a spot containing a monster;
       if so, move one or the other to another location */
    if ((mtmp = C.m_at(C.u.ux, C.u.uy)) != 0)
        C.callLocal(u_collide_m, mtmp);

    /* initial movement of bubbles just before vision_recalc */
    if (C.Is_waterlevel(C.addressOf(C.u, "uz")) || C.Is_airlevel(C.addressOf(C.u, "uz")))
        C.movebubbles();
    else if (C.svl.level.flags.fumaroles)
        C.fumaroles();

    /* Reset the screen. */
    C.vision_reset(); /* reset the blockages */
    C.reset_glyphmap(C.gm_levelchange);
    C.notice_mon_off(); /* not noticing monsters yet! */
    C.docrt(); /* does a full vision recalc */
    C.flush_screen(-1);

    /*
     *  Move all plines beyond the screen reset.
     */

    /* deferred arrival message for level teleport looks odd if given
       after the various messages below, so give it before them;
       [it might have already been delivered via docrt() -> see_monsters()
       -> Sting_effects() -> maybe_lvltport_feedback(), in which case
       'dfr_post_msg' has already been reset to Null];
       if 'dfr_post_msg' is "you materialize on a different level" then
       maybe_lvltport_feedback() will deliver it now and then free it */
    if (C.gd.dfr_post_msg)
        maybe_lvltport_feedback(); /* potentially called by Sting_effects() */

    /* special levels can have a custom arrival message */
    C.deliver_splev_message();

    /* Check whether we just entered Gehennom. */
    if (!C.In_hell(C.addressOf(C.u, "uz0")) && C.Inhell) {
        if (C.Is_valley(C.addressOf(C.u, "uz"))) {
            C.You("arrive at the Valley of the Dead...", C.varargs(100));
            C.pline_The("odor of burnt flesh and decay pervades the air.", C.varargs(101));
            void 0;
            C.You_hear("groans and moans everywhere.", C.varargs(102));
        }

        C.record_achievement(C.ACH_HELL); /* reached Gehennom */
    }
    /* in case we've managed to bypass the Valley's stairway down */
    if (C.Inhell && !C.Is_valley(C.addressOf(C.u, "uz")))
        C.u.uevent.gehennom_entered = 1;

    if (familiar)
        C.callLocal(familiar_level_msg);

    /* special location arrival messages/events */
    if (C.In_endgame(C.addressOf(C.u, "uz"))) {
        if (newdungeon)
            C.record_achievement(C.ACH_ENDG); /* reached endgame */
        if (new_ && C.on_level(C.addressOf(C.u, "uz"), C.astral_level)) {
            final_level(); /* guardian angel,&c */
            C.record_achievement(C.ACH_ASTR); /* reached Astral level */
        } else if (newdungeon && C.u.uhave.amulet) {
            C.resurrect(); /* force confrontation with Wizard */
        }
    } else if (C.In_quest(C.addressOf(C.u, "uz"))) {
        C.onquest(); /* might be reaching locate|goal level */
    } else if (C.Is_knox(C.addressOf(C.u, "uz"))) {
        /* alarm stops working once Croesus has died */
        if (new_ || !C.svm.mvitals[C.PM_CROESUS].died) {
            C.You("have penetrated a high security area!", C.varargs(103));
            void 0;
            C.pline("An alarm sounds!", C.varargs(104));
            for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                if (C.DEADMONSTER(mtmp))
                    continue;
                mtmp.msleeping = 0;
            }
        }
    } else if (C.In_mines(C.addressOf(C.u, "uz"))) {
        if (newdungeon)
            C.record_achievement(C.ACH_MINE);
    } else if (C.In_sokoban(C.addressOf(C.u, "uz"))) {
        if (newdungeon)
            C.record_achievement(C.ACH_SOKO);
    } else {
        if (new_ && C.Is_rogue_level(C.addressOf(C.u, "uz"))) {
            C.You("enter what seems to be an older, more primitive world.", C.varargs(105));
        } else if (new_ && C.Is_bigroom(C.addressOf(C.u, "uz"))) {
            C.record_achievement(C.ACH_BGRM);
        }
        /* main dungeon message from your quest leader */
        if (!C.In_quest(C.addressOf(C.u, "uz0")) && C.at_dgn_entrance("The Quest")
            && !(C.u.uevent.qcompleted || C.u.uevent.qexpelled
                 || C.svq.quest_status.leader_is_dead)) {
            /* [TODO: copy of same TODO below; if an achievement for
               receiving quest call from leader gets added, that should
               come after logging new level entry] */
            if (!C.u.uevent.qcalled) {
                C.u.uevent.qcalled = 1;
                /* main "leader needs help" message */
                C.com_pager("quest_portal");
            } else { /* reminder message */
                C.com_pager(C.Role_if(C.PM_ROGUE) ? "quest_portal_demand"
                                            : "quest_portal_again");
            }
        }
    }

    temperature_change_msg(prev_temperature);

    /* this was originally done earlier; moved here to be logged after
       any achievement related to entering a dungeon branch
       [TODO: if an achievement for receiving quest call from leader
       gets added, that should come after this rather than take place
       where the message is delivered above] */
    if (new_) {
        const dloc = C.charArray(C.QBUFSZ);
        /* Astral is excluded as a major event here because entry to it
           is already one such due to that being an achievement;
           for the quest, listing the start, locate, and goal levels would
           seem reasonable but all quest levels are included for simplicity--
           level 2 (or 3 if hero level teleports after obtaining permission
           to enter) is useful to show since it indicates that hero has
           actually entered the quest rather than just received permission
           to do so, and listing the goal level could be used to figure out
           whether level 5 is the end or there's another level (ESP reveals
           the same thing, but is part of normal game play as opposed to
           #chronicle leaking information that hero hasn't discovered yet) */
        let major = ((C.In_endgame(C.addressOf(C.u, "uz")) && !C.Is_astralevel(C.addressOf(C.u, "uz")))
                         || C.In_quest(C.addressOf(C.u, "uz")));

        C.describe_level(dloc, 2);
        C.livelog_printf(major ? C.LL_ACHIEVE : C.LL_DEBUG, "entered %s", dloc, C.varargs(106));

        if (C.Role_if(C.PM_TOURIST)) {
            C.more_experienced(C.level_difficulty(), 0);
            C.newexplevel();
        }
    }

    C.assign_level(C.addressOf(C.u, "uz0"), C.addressOf(C.u, "uz")); /* reset u.uz0 */
    save_currentstate();
    C.notice_mon_on();
    C.notice_all_mons(1);

    C.print_level_annotation();
    /* give room entrance message, if any */
    C.check_special_room(0);
    /* deliver objects traveling with player */
    C.obj_delivery(1);

    /* assume this will always return TRUE when changing level */
    C.in_out_region(C.u.ux, C.u.uy);
    /* shop repair is normally done when shopkeepers move, but we may
       need to catch up for lost time here; do this before maybe dying
       so bones map will include it */
    if (!new_)
        C.fix_shop_damage();

    /* fall damage? */
    if (do_fall_dmg) {
        let dmg = C.d(C.max(dist, 1), 6, "goto_level", 1990);

        dmg = (C.Half_physical_damage ? C.intDiv(C.int((dmg) + 1), 2) : (dmg));
        C.losehp(dmg, "falling down a mine shaft", C.KILLED_BY);
    }

    C.pickup(1);
    return;
}

/* give a message when entering a Gehennom level other than the Valley;
   also given if restoring a game in that situation */

export function hellish_smoke_mesg()
{
    if (C.svl.level.flags.temperature)
        C.pline("It is %s here.",
              C.svl.level.flags.temperature > 0 ? "hot" : "cold", C.varargs(107));

    if (C.In_hell(C.addressOf(C.u, "uz")) && C.svl.level.flags.temperature > 0)
        C.You("%s smoke...",
              C.olfaction(C.gy.youmonst.data) ? "smell" : "sense", C.varargs(108));
}

/* give a message when the level temperature is different from previous */

export function temperature_change_msg(prev_temperature)
{
    if (prev_temperature != C.svl.level.flags.temperature) {
        if (C.svl.level.flags.temperature)
            hellish_smoke_mesg();
        else if (prev_temperature > 0)
            C.pline_The("heat %s gone.",
                      C.In_hell(C.addressOf(C.u, "uz0"))
                      ? "and smoke are" : "is", C.varargs(109));
        else if (prev_temperature < 0)
            C.You("are out of the cold.", C.varargs(110));
    }
}

/* usually called from goto_level(); might be called from Sting_effects() */

export function maybe_lvltport_feedback()
{
    if (C.gd.dfr_post_msg
        && !C.strncmpi(C.gd.dfr_post_msg, "You materialize", 15)) {
        /* "You materialize on a different level." */
        C.pline("%s", C.gd.dfr_post_msg, C.varargs(111));
        C.free(C.gd.dfr_post_msg), C.gd.dfr_post_msg = 0;
    }
}


export function final_level()
{
    /* reset monster hostility relative to player */
    C.iter_mons(C.reset_hostility);

    /* create some player-monsters */
    C.create_mplayers(C.rn1(4, 3, "final_level", 2049), 1);

    /* create a guardian angel next to player, if worthy */
    C.gain_guardian_angel();
}

/* change levels at the end of this turn, after monsters finish moving */

export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg)
{
    /* UTOTYPE_DEFERRED is used, so UTOTYPE_NONE can trigger deferred_goto() */
    C.u.utotype = utotype_flags | C.UTOTYPE_DEFERRED;
    /* destination level */
    C.assign_level(C.addressOf(C.u, "utolev"), tolev);

    if (pre_msg)
        C.gd.dfr_pre_msg = C.dupstr(pre_msg);
    if (post_msg)
        C.gd.dfr_post_msg = C.dupstr(post_msg);
}

/* handle something like portal ejection */

export function deferred_goto()
{
    if (!C.on_level(C.addressOf(C.u, "uz"), C.addressOf(C.u, "utolev"))) {
        const dest = C.localStruct("d_level");
        const oldlev = C.localStruct("d_level");
        let typmask = C.u.utotype; /* save it; goto_level zeroes u.utotype */

        C.assign_level(dest, C.addressOf(C.u, "utolev"));
        C.assign_level(oldlev, C.addressOf(C.u, "uz"));
        if (C.gd.dfr_pre_msg)
            C.pline1(C.gd.dfr_pre_msg);
        C.callLocal(goto_level, dest, !!(typmask & C.UTOTYPE_ATSTAIRS),
                   !!(typmask & C.UTOTYPE_FALLING),
                   !!(typmask & C.UTOTYPE_PORTAL));
        if (typmask & C.UTOTYPE_RMPORTAL) { /* remove portal */
            let t = C.t_at(C.u.ux, C.u.uy);

            if (t) {
                C.deltrap(t);
                C.newsym(C.u.ux, C.u.uy);
            }
        }
        if (C.gd.dfr_post_msg && !C.on_level(C.addressOf(C.u, "uz"), oldlev))
            C.pline1(C.gd.dfr_post_msg);
    }
    C.u.utotype = C.UTOTYPE_NONE; /* our caller keys off of this */
    if (C.gd.dfr_pre_msg)
        C.free(C.gd.dfr_pre_msg), C.gd.dfr_pre_msg = 0;
    if (C.gd.dfr_post_msg)
        C.free(C.gd.dfr_post_msg), C.gd.dfr_post_msg = 0;
}

/*
 * Return TRUE if we created a monster for the corpse.  If successful, the
 * corpse is gone.
 */

export function revive_corpse(corpse)
{
    let mtmp,mcarry;
    let is_uwep, chewed;
    let where;
    const cname = C.charArray(C.BUFSZ);
    let container = 0;
    let container_where = 0;
    let montype;
    let is_zomb;
    let corpsex, corpsey;

    where = corpse.where;
    montype = corpse.corpsenm;
    /* treat buried auto-reviver (troll, Rider?) like a zombie
       so that it can dig itself out of the ground if it revives */
    is_zomb = (C.mons[montype].mlet == C.S_ZOMBIE
               || (where == C.OBJ_BURIED && C.is_reviver(C.mons[montype])));
    is_uwep = (corpse == C.uwep);
    chewed = (corpse.oeaten != 0);
    C.Strcpy(cname, C.corpse_xname(corpse,
                               chewed ? "bite-covered" : 0,
                               C.CXN_SINGULAR));
    mcarry = (where == C.OBJ_MINVENT) ? corpse.ocarry : 0;
    /* mcarry is NULL for (where == OBJ_BURIED and OBJ_CONTAINED) now */

    C.get_obj_location(corpse, C.reference("coordxy", () => corpsex, value => corpsex = value), C.reference("coordxy", () => corpsey, value => corpsey = value),
                            C.CONTAINED_TOO | C.BURIED_TOO);

    if (where == C.OBJ_CONTAINED) {
        let mtmp2;

        container = corpse.ocontainer;
        mtmp2 = C.get_container_location(container, C.reference("int", () => container_where, value => container_where = value),
                                       0);
        /* container_where is outermost container's location even if nested */
        if (container_where == C.OBJ_MINVENT && mtmp2)
            mcarry = mtmp2;
    }
    mtmp = C.revive(corpse, 0); /* corpse is gone if successful */

    if (mtmp) {
        switch (where) {
        case C.OBJ_INVENT:
            if (is_uwep)
                C.pline_The("%s writhes out of your grasp!", cname, C.varargs(112));
            else
                C.You_feel("squirming in your backpack!", C.varargs(113));
            break;

        case C.OBJ_FLOOR:
            if (C.cansee(corpsex, corpsey) || C.canseemon(mtmp)) {
                let effect = "";

                if (mtmp.data == C.mons[C.PM_DEATH])
                    effect = " in a whirl of spectral skulls";
                else if (mtmp.data == C.mons[C.PM_PESTILENCE])
                    effect = " in a churning pillar of flies";
                else if (mtmp.data == C.mons[C.PM_FAMINE])
                    effect = " in a ring of withered crops";

                if (C.canseemon(mtmp)) {
                    C.pline("%s rises from the dead%s!",
                          chewed ? C.Adjmonnam(mtmp, "bite-covered")
                                 : C.Monnam(mtmp),
                          effect, C.varargs(114));
                } else {
                    C.pline("%s disappears%s!", C.The(cname), effect, C.varargs(115));
                }
            }
            break;

        case C.OBJ_MINVENT: /* probably a nymph's */
            if (C.cansee(mtmp.mx, mtmp.my)) {
                if (mcarry && C.canseemon(mcarry))
                    C.pline("Startled, %s drops %s as it %s!",
                          C.mon_nam(mcarry), C.an(cname),
                          C.canspotmon(mtmp) ? "revives" : "disappears", C.varargs(116));
                else if (C.canspotmon(mtmp))
                    C.pline("%s suddenly appears!",
                          chewed ? C.Adjmonnam(mtmp, "bite-covered")
                                 : C.Monnam(mtmp), C.varargs(117));
            }
            break;
        case C.OBJ_CONTAINED: {
            const sackname = C.charArray(C.BUFSZ);
            /* Could use x_monnam(..., AUGMENT_IT) but that'd say "someone"
               for humanoid monsters, which seems like a distinction the hero
               doesn't have knowledge to make here. */
            let mnam = C.canspotmon(mtmp) ? C.Amonnam(mtmp) : C.Something;

            if (!container) {
                C.impossible("reviving corpse from non-existent container", C.varargs(118));
            } else if (mcarry && C.canseemon(mcarry)) {
                C.pline("%s writhes out of %s!", mnam, C.yname(container), C.varargs(119));
            } else if (container_where == C.OBJ_INVENT) {
                C.Strcpy(sackname, C.an(C.xname(container)));
                C.pline("%s %s out of %s in your pack!", mnam,
                      C.locomotion(mtmp.data, "writhes"), sackname, C.varargs(120));
            } else if (container_where == C.OBJ_FLOOR
                       && C.cansee(corpsex, corpsey)) {
                C.Strcpy(sackname, C.an(C.xname(container)));
                C.pline("%s escapes from %s!", mnam, sackname, C.varargs(121));
            }
            break;
        }
        case C.OBJ_BURIED:
            if (is_zomb) {
                C.maketrap(mtmp.mx, mtmp.my, C.PIT);
                if (C.cansee(mtmp.mx, mtmp.my)) {
                    let ttmp;

                    ttmp = C.t_at(mtmp.mx, mtmp.my);
                    if (ttmp)
                        ttmp.tseen = 1;
                    C.pline("%s claws itself out of the ground!",
                          C.canspotmon(mtmp) ? C.Amonnam(mtmp) : C.Something, C.varargs(122));
                    C.newsym(mtmp.mx, mtmp.my);
                } else if (C.mdistu(mtmp) < 5*5) {
                    void 0;
                    C.You_hear("scratching noises.", C.varargs(123));
                }
                C.fill_pit(mtmp.mx, mtmp.my);
                break;
            }
            void 0;
            /*FALLTHRU*/
        default:
            /* we should be able to handle the other cases... */
            C.impossible("revive_corpse: lost corpse @ %d", where, C.varargs(124));
            break;
        }
        return 1;
    }
    return 0;
}

/* Revive the corpse via a timeout. */
/*ARGSUSED*/

export function revive_mon(arg, timeout)
{
    let body = arg.a_obj;
    let mptr = C.mons[body.corpsenm];
    let mtmp;
    let x, y;

    /* corpse will revive somewhere else if there is a monster in the way;
       Riders get a chance to try to bump the obstacle out of their way */
    if (C.is_displacer(mptr) && body.where == C.OBJ_FLOOR
        && C.get_obj_location(body, C.reference("coordxy", () => x, value => x = value), C.reference("coordxy", () => y, value => y = value), 0) && (mtmp = C.m_at(x, y)) != 0 &&
        C.svl.level.flags.stasis_until < C.svm.moves) {
        let notice_it = C.canseemon(mtmp); /* before rloc() */
        let monname = C.Monnam(mtmp);

        if (C.rloc(mtmp, C.RLOC_NOMSG)) {
            if (notice_it && !C.canseemon(mtmp))
                C.pline("%s vanishes.", monname, C.varargs(125));
            else if (!notice_it && C.canseemon(mtmp))
                C.pline("%s appears.", C.Monnam(mtmp), C.varargs(126)); /* not pre-rloc monname */
            else if (notice_it && C.dist2(mtmp.mx, mtmp.my, x, y) > 2)
                C.pline("%s teleports.", monname, C.varargs(127)); /* saw it and still see it */
        }
    }

    /* if we succeed, the corpse is gone */
    if (!C.callLocal(revive_corpse, body)) {
        let when;
        let action;

        if (C.is_rider(mptr) && C.rn2(99, "revive_mon", 2281)) { /* Rider usually tries again */
            action = C.REVIVE_MON;
            when = C.rider_revival_time(body, 1);
        } else { /* rot this corpse away */
            if (!C.obj_has_timer(body, C.ROT_CORPSE))
                C.You_feel("%sless hassled.", C.is_rider(mptr) ? "much " : "", C.varargs(128));
            action = C.ROT_CORPSE;
            when = C.long(C.d(5, 50, "revive_mon", 2288)) - (C.svm.moves - body.age);
            if (when < 1n)
                when = 1n;
        }
        if (!C.obj_has_timer(body, action))
            C.start_timer(when, C.TIMER_OBJECT, action, arg);
    }
}

/* Timeout callback. Revive the corpse as a zombie. */

export function zombify_mon(arg, timeout)
{
    let body = arg.a_obj;
    let zmon = C.zombie_form(C.mons[body.corpsenm]);

    if (zmon != C.NON_PM && !(C.svm.mvitals[zmon].mvflags & C.G_GENOD)) {
        if (C.has_omid(body))
            C.free_omid(body);
        if (C.has_omonst(body))
            C.free_omonst(body);

        C.set_corpsenm(body, zmon);
        revive_mon(arg, timeout);
    } else {
        C.rot_corpse(arg, timeout);
    }
}

/* return TRUE if hero properties are dangerous to hero */

export function danger_uprops()
{
    return +(!!(C.Stoned || C.Slimed || C.Strangled || C.Sick));
}


export function cmd_safety_prevention(ucverb, cmddesc, act, flagcounter)
{
    if (C.flags.safe_wait && !C.iflags.menu_requested && !C.gm.multi) {
        const buf = C.charArray(C.QBUFSZ);

        buf[0] = 0;
        if (C.iflags.cmdassist || !flagcounter.value++)
            C.Sprintf(buf, "  Use '%s' prefix to force %s.",
                    C.visctrl(C.cmd_from_func(C.do_reqmenu)), cmddesc, C.varargs(129));

        if (C.monster_nearby()) {
            C.Norep("%s%s", act, buf, C.varargs(130));
            return 1;
        } else if (danger_uprops()) {
            C.Norep("%s doesn't feel like a good idea right now.", ucverb, C.varargs(131));
            return 1;
        }
    }
    flagcounter.value = 0;
    return 0;
}

/* '.' command: do nothing == rest; also the
   ' ' command iff 'rest_on_space' option is On */

export function donull()
{
    if (C.callLocal(cmd_safety_prevention, "Waiting", "a no-op (to rest)",
                          "Are you waiting to get hit?",
                          C.addressOf(C.gd, "did_nothing_flag")))
        return C.ECMD_OK;
    return C.ECMD_TIME; /* Do nothing, but let other things happen */
}


export function wipeoff()
{
    let udelta = C.u.ucreamed;
    let ldelta = C.BlindedTimeout;

    if (udelta > 4)
        udelta = 4;
    C.u.ucreamed -= udelta; /*u.ucreamed -= min(u.ucreamed,4);*/
    if (ldelta > 4n)
        ldelta = 4n;
    C.incr_itimeout(C.propertyAddress("HBlinded"), -ldelta); /*HBlinded -= min(BlindedTimeout,4L);*/

    if (!C.HBlinded) {
        C.pline("You've got the glop off.", C.varargs(132));
        C.u.ucreamed = 0;
        if (!C.gulp_blnd_check()) {
            C.set_itimeout(C.propertyAddress("HBlinded"), 1n);
            C.make_blinded(0n, 1);
        }
        return 0;
    } else if (!C.u.ucreamed) {
        C.Your("%s feels clean now.", C.body_part(C.FACE), C.varargs(133));
        return 0;
    }
    return 1; /* still busy */
}

/* the #wipe command - wipe off your face */

export function dowipe()
{
    if (C.u.ucreamed) {
        const buf = C.staticBuffer(39);

        C.Sprintf(buf, "wiping off your %s", C.body_part(C.FACE), C.varargs(134));
        C.set_occupation(wipeoff, buf, 0);
        /* Not totally correct; what if they change back after now
         * but before they're finished wiping?
         */
        return C.ECMD_TIME;
    }
    C.Your("%s is already clean.", C.body_part(C.FACE), C.varargs(135));
    return C.ECMD_TIME;
}

/* common wounded legs feedback */
/* jumping, kicking, riding */
export function legs_in_no_shape(for_what, by_steed)
{
    if (by_steed && C.u.usteed) {
        C.pline("%s is in no shape for %s.", C.Monnam(C.u.usteed), for_what, C.varargs(136));
    } else {
        let wl = (C.EWounded_legs & C.BOTH_SIDES);
        let bp = C.body_part(C.LEG);

        if (wl == C.BOTH_SIDES)
            bp = C.makeplural(bp);
        C.Your("%s%s %s in no shape for %s.",
             (wl == C.LEFT_SIDE) ? "left " : (wl == C.RIGHT_SIDE) ? "right " : "",
             bp, (wl == C.BOTH_SIDES) ? "are" : "is", for_what, C.varargs(137));
    }
}


export function set_wounded_legs(side, timex)
{
    /* KMH -- STEED
     * If you are riding, your steed gets the wounded legs instead.
     * You still call this function, but don't lose hp.
     * Caller is also responsible for adjusting messages.
     */
    C.disp.botl = 1;
    if (!C.Wounded_legs)
        C.u.atemp.a[C.A_DEX]--;

    if (!C.Wounded_legs || (C.HWounded_legs & C.TIMEOUT) < C.long(timex))
        C.set_itimeout(C.propertyAddress("HWounded_legs"), C.long(timex));
    /* the leg being wounded and its timeout might differ from one
       attack to the next, but we don't track the legs separately;
       5.0: both legs will ultimately heal together; this used to use
       direct assignment instead of bitwise-OR so getting wounded in
       one leg mysteriously healed the other */
    C.EWounded_legs |= side;
    C.encumber_msg();
}

/* 0: ordinary, 1: dismounting steed, 2: limbs turn to stone */
export function heal_legs(how)
{
    if (C.Wounded_legs) {
        C.disp.botl = 1;
        if (C.u.atemp.a[C.A_DEX] < 0)
            C.u.atemp.a[C.A_DEX]++;

        /* when mounted, wounded legs applies to the steed;
           during petrification countdown, "your limbs turn to stone"
           before the final stages and that calls us (how==2) to cure
           wounded legs, but we want to suppress the feel better message */
        if (!C.u.usteed && how != 2) {
            let legs = C.body_part(C.LEG);

            if ((C.EWounded_legs & C.BOTH_SIDES) == C.BOTH_SIDES)
                legs = C.makeplural(legs);
            /* this used to say "somewhat better" but that was
               misleading since legs are being fully healed */
            C.Your("%s %s better.", legs, C.vtense(legs, "feel"), C.varargs(138));
        }

        C.HWounded_legs = C.EWounded_legs = 0n;

        /* Wounded_legs reduces carrying capacity, so we want
           an encumbrance check when they're healed.  However,
           while dismounting, first steed's legs get healed,
           then hero is dropped to floor and a new encumbrance
           check is made [in dismount_steed()].  So don't give
           encumbrance feedback during the dismount stage
           because it could seem to be shown out of order and
           it might be immediately contradicted [able to carry
           more when steed becomes healthy, then possible floor
           feedback, then able to carry less when back on foot]. */
        if (how == 0)
            C.encumber_msg();
    }
}

/*do.c*/
