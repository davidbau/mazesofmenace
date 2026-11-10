import { C } from './c-runtime.js';

/* NetHack 5.0	dogmove.c	$NHDT-Date: 1725733007 2024/09/07 18:16:47 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.156 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */



/* #define DOG_HUNGRY      300 */
const DOG_HUNGRY = 300n;
/* #define DOG_WEAK        500 */
const DOG_WEAK = 500n;
/* #define DOG_STARVE      750 */
const DOG_STARVE = 750n;

/* pick a carried item for pet to drop */
export function droppables(mon)
{


    /*
     * 'key|pickaxe|&c = &dummy' is used to make various creatures
     * that can't use a key/pick-axe/&c behave as if they are already
     * holding one so that any other such item in their inventory will
     * be considered a duplicate and get treated as a normal candidate
     * for dropping.
     *
     * This could be 'auto', but then 'gcc -O2' warns that this function
     * might return the address of a local variable.  It's mistaken,
     * &dummy is never returned.  'static' is simplest way to shut it up.
     */










    const dummy = C.dummy;
    let obj, wep, pickaxe, unihorn, key;

    C.copyRecord(dummy, C.cg.zeroobj, C.sizes.obj);
    dummy.otyp = C.GOLD_PIECE; /* not STRANGE_OBJECT or tools of interest */
    dummy.oartifact = 1; /* so real artifact won't override "don't keep it" */
    pickaxe = unihorn = key = 0;
    wep = C.MON_WEP(mon);

    if (C.is_animal(mon.data) || C.mindless(mon.data)) {
        /* won't hang on to any objects of these types */
        pickaxe = unihorn = key = dummy; /* act as if already have them */
    } else {
        /* don't hang on to pick-axe if can't use one or don't need one */
        if (!C.tunnels(mon.data) || !C.needspick(mon.data))
            pickaxe = dummy;
        /* don't hang on to key if can't open doors */
        if (C.nohands(mon.data) || C.verysmall(mon.data))
            key = dummy;
    }
    if (wep) {
        if (C.is_pick(wep))
            pickaxe = wep;
        if (wep.otyp == C.UNICORN_HORN)
            unihorn = wep;
        /* don't need any wielded check for keys... */
    }

    for (obj = mon.minvent; obj; obj = obj.nobj) {
        switch (obj.otyp) {
        case C.DWARVISH_MATTOCK:
            /* reject mattock if couldn't wield it */
            if (C.which_armor(mon, C.W_ARMS))
                break;
            /* keep mattock in preference to pick unless pick is already
               wielded or is an artifact and mattock isn't */

            if (pickaxe && pickaxe.otyp == C.PICK_AXE && pickaxe != wep
                && (!pickaxe.oartifact || obj.oartifact))
                return pickaxe; /* drop the one we earlier decided to keep */
            
        /*FALLTHRU*/
        case C.PICK_AXE:
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe)
                    return pickaxe;
                pickaxe = obj; /* keep this digging tool */
                continue;
            }
            break;

        case C.UNICORN_HORN:
            /* reject cursed unicorn horns */
            if (obj.cursed)
                break;
            /* keep artifact unihorn in preference to ordinary one */
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn)
                    return unihorn;
                unihorn = obj; /* keep this unicorn horn */
                continue;
            }
            break;

        case C.SKELETON_KEY:
            /* keep key in preference to lock-pick */
            if (key && key.otyp == C.LOCK_PICK
                && (!key.oartifact || obj.oartifact))
                return key; /* drop the one we earlier decided to keep */
            
        /*FALLTHRU*/
        case C.LOCK_PICK:
            /* keep lock-pick in preference to credit card */
            if (key && key.otyp == C.CREDIT_CARD
                && (!key.oartifact || obj.oartifact))
                return key;
            
        /*FALLTHRU*/
        case C.CREDIT_CARD:
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key)
                    return key;
                key = obj; /* keep this unlocking tool */
                continue;
            }
            break;

        default:
            break;
        }

        if (!obj.owornmask && obj != wep)
            return obj;
    }

    return 0; /* don't drop anything */
}

export const nofetch = C => [C.BALL_CLASS, C.CHAIN_CLASS, C.ROCK_CLASS, 0];


export function cursed_object_at(x, y)
{
    x = C.short(x);
    y = C.short(y);

    let otmp;

    for (otmp = C.svl.level.objects[x][y]; otmp; otmp = otmp.nexthere)
        if (otmp.cursed)
            return 1;
    return 0;
}

export function dog_nutrition(mtmp, obj)
{


    let nutrit;

    /*
     * It is arbitrary that the pet takes the same length of time to eat
     * as a human, but gets more nutritional value.
     */



    if (obj.oclass == C.FOOD_CLASS) {
        if (obj.otyp == C.CORPSE) {
            mtmp.meating = 3 + (C.mons[obj.corpsenm].cwt >> 6);
            nutrit = C.mons[obj.corpsenm].cnutrit;
        } else {
            mtmp.meating = C.objects[obj.otyp].oc_delay;
            nutrit = C.objects[obj.otyp].oc_nutrition;
        }
        switch (mtmp.data.msize) {
        case C.MZ_TINY:
            nutrit *= 8;
            break;
        case C.MZ_SMALL:
            nutrit *= 6;
            break;
        default:
        case C.MZ_MEDIUM:
            nutrit *= 5;
            break;
        case C.MZ_LARGE:
            nutrit *= 4;
            break;
        case C.MZ_HUGE:
            nutrit *= 3;
            break;
        case C.MZ_GIGANTIC:
            nutrit *= 2;
            break;
        }
        if (obj.oeaten) {
            mtmp.meating = C.eaten_stat(mtmp.meating, obj);
            nutrit = C.eaten_stat(nutrit, obj);
        }
    } else if (obj.oclass == C.COIN_CLASS) {
        mtmp.meating = C.int(obj.quan / 2000n) + 1;
        if (mtmp.meating < 0)
            mtmp.meating = 1;
        nutrit = C.int(obj.quan / 20n);
        if (nutrit < 0)
            nutrit = 0;
    } else {
        /* Unusual pet such as gelatinous cube eating odd stuff.
         * meating made consistent with wild monsters in mon.c.
         * nutrit made consistent with polymorphed player nutrit in
         * eat.c.  (This also applies to pets eating gold.)
         */




        mtmp.meating = C.idiv(obj.owt, 20) + 1;
        nutrit = 5 * C.objects[obj.otyp].oc_nutrition;
    }
    return nutrit;
}

/* returns 2 if pet dies, otherwise 1 */
export function dog_eat(mtmp, obj, x, y, devour)
{
    x = C.short(x);
    y = C.short(y);
    devour = C.byte(devour);
/* if unpaid, then thrown or kicked by hero */
/* dog's starting location, */
/* might be different from current */
    let edog = C.EDOG(mtmp);
    let nutrit, res;
    let oprice;
    const objnambuf = C.stackAlloc(C.BUFSZ); let obj_name;

    C.storeChar(objnambuf, 0);
    if (edog.hungrytime < C.svm.moves)
        edog.hungrytime = C.svm.moves;
    nutrit = dog_nutrition(mtmp, obj);

    if (devour) {
        if (mtmp.meating > 1)
            mtmp.meating = C.idiv(mtmp.meating, 2);
        if (nutrit > 1)
            nutrit = C.idiv(nutrit * 3, 4);
    }
    edog.hungrytime += C.long(nutrit);
    mtmp.mconf = 0;
    if (edog.mhpmax_penalty) {
        /* no longer starving */
        mtmp.mhpmax += edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }
    if (mtmp.mflee && mtmp.mfleetim > 1)
        mtmp.mfleetim = C.idiv(mtmp.mfleetim, 2);
    if (mtmp.mtame < 20)
        mtmp.mtame++;
    if (x != mtmp.mx || y != mtmp.my) { /* moved & ate on same turn */
        C.newsym(x, y);
        C.newsym(mtmp.mx, mtmp.my);
    }
    if (mtmp.data == C.mons[C.PM_KILLER_BEE]
        && obj.otyp == C.LUMP_OF_ROYAL_JELLY
        && (res = C.bee_eat_jelly(mtmp, obj)) >= 0)
        /* bypass most of dog_eat(), including apport update */
        return (res + 1); /* 1 -> 2, 0 -> 1; -1, keep going */

    /* food items are eaten one at a time; entire stack for other stuff */
    if (obj.quan > 1n && obj.oclass == C.FOOD_CLASS)
        obj = C.splitobj(obj, 1n);
    if (obj.unpaid)
        C.iflags.suppress_price++;
    if (C.is_pool(mtmp.mx, mtmp.my) && !C.Underwater) {
        /* Don't print obj */
        /* TODO: Reveal presence of sea monster (especially sharks) */
    } else {
        /* food is at monster's current location, <mx,my>;
           <x,y> was monster's location at start of this turn;
           they might be the same but will be different when
           the monster is moving+eating on same turn */



        let seeobj = C.cansee(mtmp.mx, mtmp.my),
                sawpet = C.cansee(x, y) && C.mon_visible(mtmp);

        /* Observe the action if either the food location or the pet
           itself is in view.  When pet which was in view moves to an
           unseen spot to eat the food there, avoid referring to that
           pet as "it".  However, we want "it" if invisible/unsensed
           pet eats visible food. */




        if (sawpet || (seeobj && C.canspotmon(mtmp))) {
            /* call distant_name() for possible side-effects even if the
               result won't be printed */

            obj_name = C.distant_name(obj, C.doname);
            if (C.tunnels(mtmp.data))
                C.pline_mon(mtmp, "%s digs in.", C.noit_Monnam(mtmp));
            else
                C.pline_mon(mtmp, "%s %s %s.", C.noit_Monnam(mtmp),
                      devour ? "devours" : "eats", obj_name);
        } else if (seeobj) {
            obj_name = C.distant_name(obj, C.doname);
            C.pline("It %s %s.", devour ? "devours" : "eats", obj_name);
        }
    }
    if (obj.unpaid) {
        C.Strcpy(objnambuf, C.xname(obj));
        C.iflags.suppress_price--;
    }
    if (mtmp.data == C.mons[C.PM_RUST_MONSTER] && obj.oerodeproof) {
        /* The object's rustproofing is gone now */
        if (obj.unpaid)
            C.costly_alteration(obj, C.COST_DEGRD);
        obj.oerodeproof = 0;
        mtmp.mstun = 1;
        if (C.canseemon(mtmp)) {
            obj_name = C.distant_name(obj, C.doname); /* (see above) */
            if (C.flags.verbose)
                C.pline("%s spits %s out in disgust!",
                      C.Monnam(mtmp), obj_name);
        }
    } else {
        /* It's a reward if it's DOGFOOD and the player dropped/threw it.
           We know the player had it if invlet is set. -dlc */

        if (C.dogfood(mtmp, obj) == C.DOGFOOD && obj.invlet) {
            let prior_apport = edog.apport;

            edog.apport += C.int(200n / (C.long(edog.dropdist) + C.svm.moves
                                           - edog.droptime));
            if (edog.apport <= 0) {
                C.impossible("dog_eat: pet apport <= 0 (%d, %d, %ld, %ld, %d, %u, %u)",
                            edog.apport, edog.dropdist, edog.droptime,
                            C.svm.moves,
                            prior_apport,
                           /* check whether edog struct got clobbered;
                              these two values should always match if
                              edog content is still intact */


                           mtmp.m_id, edog.parentmid);
                edog.apport = 1;
            }
        }
        if (obj.unpaid) {
            /* edible item owned by shop has been thrown or kicked
               by hero and caught by tame or food-tameable monst */

            oprice = C.unpaid_cost(obj, C.COST_CONTENTS);
            C.pline("That %s will cost you %ld %s.", objnambuf, oprice,
                  C.currency(oprice));
            /* m_consume_obj() -> delobj() -> obfree() will handle the shop
               billing update */

        }
        C.m_consume_obj(mtmp, obj);
    }

    return (C.DEADMONSTER(mtmp)) ? 2 : 1;
}

export function dog_starve(mtmp)
{


    if (mtmp.mleashed && mtmp != C.u.usteed)
        C.Your("leash goes slack.");
    else if (C.cansee(mtmp.mx, mtmp.my))
        C.pline_mon(mtmp, "%s starves.", C.Monnam(mtmp));
    else
        C.You_feel("%s for a moment.",
                    C.Hallucination ? "bummed" : "sad");
    C.mondied(mtmp);
}

/* hunger effects -- returns TRUE on starvation */
export function dog_hunger(mtmp, edog)
{


    if (C.svm.moves > edog.hungrytime + DOG_WEAK) {
        if (!C.carnivorous(mtmp.data) && !C.herbivorous(mtmp.data)) {
            edog.hungrytime = C.svm.moves + DOG_WEAK;
            /* but not too high; it might polymorph */
        } else if (!edog.mhpmax_penalty) {
            /* starving pets are limited in healing */
            let newmhpmax = C.idiv(mtmp.mhpmax, 3);
            mtmp.mconf = 1;
            edog.mhpmax_penalty = mtmp.mhpmax - newmhpmax;
            mtmp.mhpmax = newmhpmax;
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhp = mtmp.mhpmax;
            if (C.DEADMONSTER(mtmp)) {
                dog_starve(mtmp);
                return 1;
            }
            if (C.cansee(mtmp.mx, mtmp.my))
                C.pline_mon(mtmp, "%s is confused from hunger.", C.Monnam(mtmp));
            else if (C.couldsee(mtmp.mx, mtmp.my))
                C.beg(mtmp);
            else
                C.You_feel("worried about %s.", C.y_monnam(mtmp));
            C.stop_occupation();
        } else if (C.svm.moves > edog.hungrytime + DOG_STARVE
                   || C.DEADMONSTER(mtmp)) {
            dog_starve(mtmp);
            return 1;
        }
    }
    return 0;
}

/* do something with object (drop, pick up, eat) at current position
 * returns 1 if object eaten (since that counts as dog's move), 2 if died
 */


export function dog_invent(mtmp, edog, udist)
{
    udist = C.int(udist);

    let omx, omy;
    let carryamt = 0;
    let obj, otmp;

    if (C.helpless(mtmp) || mtmp.meating)
        return 0;

    omx = mtmp.mx;
    omy = mtmp.my;

    /* If we are carrying something then we drop it (perhaps near @).
     * Note: if apport == 1 then our behavior is independent of udist.
     * Use udist+1 so steed won't cause divide by zero.
     */



    if (droppables(mtmp)) {
        C.assert(edog.apport > 0);
        if (!C.rn2(() => (udist + 1), 0) || !C.rn2(() => (edog.apport), 1))
            if (C.rn2(() => (10), 2) < edog.apport) {
                C.relobj(mtmp, C.int(mtmp.minvis), 1);
                if (edog.apport > 1)
                    edog.apport--;
                edog.dropdist = udist; /* hpscdi!jon */
                edog.droptime = C.svm.moves;
            }
    } else {
        if ((obj = C.svl.level.objects[omx][omy]) != 0
            && !C.strchr(C.nofetch, obj.oclass)
            && obj.otyp != C.SCR_MAIL
            /* avoid special items; once hero picks them up, they'll cease
               being special and become eligible for normal monst activity */

            && !(C.is_mines_prize(obj) || C.is_soko_prize(obj))) {
            let edible = C.dogfood(mtmp, obj);

            if ((edible <= C.CADAVER
                 /* starving pet is more aggressive about eating */
                 || (edog.mhpmax_penalty && edible == C.ACCFOOD))
                && could_reach_item(mtmp, obj.ox, obj.oy))
                return dog_eat(mtmp, obj, omx, omy, 0);

            carryamt = C.can_carry(mtmp, obj);
            if (carryamt > 0 && !obj.cursed
                && could_reach_item(mtmp, obj.ox, obj.oy)) {
                if (C.rn2(() => (20), 3) < edog.apport + 3) {
                    if (C.rn2(() => (udist), 4) || !C.rn2(() => (edog.apport), 5)) {
                        otmp = obj;
                        if (carryamt != obj.quan)
                            otmp = C.splitobj(obj, carryamt);
                        if (C.cansee(omx, omy)) {
                            /* call distant_name() for possible side-effects
                               even if the result won't be printed; should be
                               done before extract+pickup for distant_name()
                               -> doname() -> xname() -> find_artifact()
                               while otmp is still on floor */




                            let otmpname = C.distant_name(otmp, C.doname);

                            if (C.flags.verbose)
                                C.pline_xy(omx, omy, "%s picks up %s.",
                                      C.Monnam(mtmp), otmpname);
                        }
                        C.obj_extract_self(otmp);
                        C.newsym(omx, omy);
                        C.mpickobj(mtmp, otmp);
                        if (C.attacktype(mtmp.data, C.AT_WEAP)
                            && mtmp.weapon_check == C.NEED_WEAPON) {
                            mtmp.weapon_check = C.NEED_HTH_WEAPON;
                            C.mon_wield_item(mtmp);
                        }
                        C.check_gear_next_turn(mtmp);
                    }
                }
            }
        }
    }
    return 0;
}

/* set dog's goal -- gtyp, gx, gy;
   returns -1/0/1 (dog's desire to approach player) or -2 (abort move) */

export function dog_goal(mtmp, edog, after, udist, whappr)
{
    after = C.int(after);
    udist = C.int(udist);
    whappr = C.int(whappr);

    let omx, omy;
    let in_masters_sight, dog_has_minvent;
    let obj;
    let otyp;
    let appr;

    /* Steeds don't move on their own will */
    if (mtmp == C.u.usteed)
        return -2;

    omx = mtmp.mx;
    omy = mtmp.my;

    in_masters_sight = C.couldsee(omx, omy);
    dog_has_minvent = (droppables(mtmp) != 0);

    if (!edog || mtmp.mleashed) { /* he's not going anywhere... */
        C.gg.gtyp = C.APPORT;
        C.gg.gx = C.u.ux;
        C.gg.gy = C.u.uy;
    } else {
/* #define DDIST(x, y) (dist2(x, y, omx, omy)) */
        const DDIST = (x,y) => C.dist2(x,y,omx,omy);
/* #define SQSRCHRADIUS 5 */
        const SQSRCHRADIUS = 5;
        let min_x, max_x, min_y, max_y;
        let nx, ny;

        C.gg.gtyp = C.UNDEF; /* no goal as yet */
        C.gg.gx = C.gg.gy = 0;  /* suppress 'used before set' message */

        if ((min_x = omx - SQSRCHRADIUS) < 1)
            min_x = 1;
        if ((max_x = omx + SQSRCHRADIUS) >= C.COLNO)
            max_x = C.COLNO - 1;
        if ((min_y = omy - SQSRCHRADIUS) < 0)
            min_y = 0;
        if ((max_y = omy + SQSRCHRADIUS) >= C.ROWNO)
            max_y = C.ROWNO - 1;

        /* nearby food is the first choice, then other objects */
        for (obj = C.fobj; obj; obj = obj.nobj) {
            nx = obj.ox;
            ny = obj.oy;
            if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
                otyp = C.dogfood(mtmp, obj);
                /* skip inferior goals */
                if (otyp > C.gg.gtyp || otyp == C.UNDEF)
                    continue;
                /* avoid cursed items unless starving */
                if (cursed_object_at(nx, ny)
                    && !(edog.mhpmax_penalty && otyp < C.MANFOOD))
                    continue;
                /* skip completely unreachable goals */
                if (!could_reach_item(mtmp, nx, ny)
                    || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny))
                    continue;
                if (otyp < C.MANFOOD) {
                    if (otyp < C.gg.gtyp
                        || DDIST(nx, ny) < DDIST(C.gg.gx, C.gg.gy)) {
                        C.gg.gx = nx;
                        C.gg.gy = ny;
                        C.gg.gtyp = otyp;
                    }
                } else if (C.gg.gtyp == C.UNDEF && in_masters_sight
                           && !dog_has_minvent
                           && (!C.levl[omx][omy].lit || C.levl[C.u.ux][C.u.uy].lit)
                           && (otyp == C.MANFOOD || C.m_cansee(mtmp, nx, ny))
                           && edog.apport > C.rn2(() => (8), 6)
                           && C.can_carry(mtmp, obj) > 0) {
                    C.gg.gx = nx;
                    C.gg.gy = ny;
                    C.gg.gtyp = C.APPORT;
                }
            }
        }
    }

    /* follow player if appropriate */
    if (C.gg.gtyp == C.UNDEF || (C.gg.gtyp != C.DOGFOOD && C.gg.gtyp != C.APPORT
                          && C.svm.moves < edog.hungrytime)) {
        C.gg.gx = C.u.ux;
        C.gg.gy = C.u.uy;
        if (after && udist <= 4 && C.u_at(C.gg.gx, C.gg.gy))
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee) ? -1 : 0;
        if (udist > 1) {
            if (!C.IS_ROOM(C.levl[C.u.ux][C.u.uy].typ) || !C.rn2(() => (4), 7) || whappr
                || (dog_has_minvent && C.rn2(() => (edog.apport), 8)))
                appr = 1;
        }
        /* if you have dog food it'll follow you more closely; if you are
           on stairs (or ladder) or on or next to a magic portal, it will
           behave as if you have dog food */


        if (appr == 0) {
            if (C.On_stairs(C.u.ux, C.u.uy)) {
                appr = 1;
            } else {
                for (obj = C.gi.invent; obj; obj = obj.nobj)
                    if (C.dogfood(mtmp, obj) == C.DOGFOOD) {
                        appr = 1;
                        break;
                    }
                if (appr == 0) {
                    let t;

                    /* assume at most one magic portal per level;
                       [should this be limited to known portals?] */

                    for (t = C.gf.ftrap; t; t = t.ntrap)
                        if (t.ttyp == C.MAGIC_PORTAL) {
                            if (/*t->tseen &&*/ C.distu(t.tx, t.ty) <= 2)
                                appr = 1;
                            break;
                        }
                }
            }
        }
    } else
        appr = 1; /* gtyp != UNDEF */
    if (mtmp.mconf)
        appr = 0;

/* #define FARAWAY (COLNO + 2)  */
    const FARAWAY = C.COLNO + 2;
/* position outside screen */
    if (C.u_at(C.gg.gx, C.gg.gy) && !in_masters_sight) {
        let cp;

        cp = C.gettrack(omx, omy);
        if (cp) {
            C.gg.gx = cp.x;
            C.gg.gy = cp.y;
            if (edog)
                edog.ogoal.x = 0;
        } else {
            /* assume master hasn't moved far, and reuse previous goal */
            if (edog && edog.ogoal.x
                && (edog.ogoal.x != omx || edog.ogoal.y != omy)) {
                C.gg.gx = edog.ogoal.x;
                C.gg.gy = edog.ogoal.y;
                edog.ogoal.x = 0;
            } else {
                let fardist = FARAWAY * FARAWAY;
                C.gg.gx = C.gg.gy = FARAWAY; /* random */
                C.do_clear_area(omx, omy, 9, wantdoor, C.reference("int", () => fardist, value => fardist = value));

                /* here gx == FARAWAY e.g. when dog is in a vault */
                if (C.gg.gx == FARAWAY || (C.gg.gx == omx && C.gg.gy == omy)) {
                    C.gg.gx = C.u.ux;
                    C.gg.gy = C.u.uy;
                } else if (edog) {
                    edog.ogoal.x = C.gg.gx;
                    edog.ogoal.y = C.gg.gy;
                }
            }
        }
    } else if (edog) {
        edog.ogoal.x = 0;
    }
    return appr;
}

export function find_targ(mtmp, dx, dy, maxdist)
{
    dx = C.int(dx);
    dy = C.int(dy);
    maxdist = C.int(maxdist);

    let targ = 0;
    let curx = mtmp.mx, cury = mtmp.my;
    let dist = 0;

    /* Walk outwards */
    for ( ; dist < maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!C.isok(curx, cury))
            break;

        /* FIXME: Check if we hit a wall/door/boulder to
         *        short-circuit unnecessary subsequent checks
         */



        /* If we can't see up to here, forget it - will this
         * mean pets in corridors don't breathe at monsters
         * in rooms? If so, is that necessarily bad?
         */



        if (!C.m_cansee(mtmp, curx, cury))
            break;

        if (curx == mtmp.mux && cury == mtmp.muy)
            return C.gy.youmonst;

        if ((targ = C.m_at(curx, cury)) != 0) {
            /* Is the monster visible to the pet? */
            if ((!targ.minvis || C.perceives(mtmp.data)) && !targ.mundetected
                /* if a long worm, only accept the head as a target */
                && targ.mx == curx && targ.my == cury) /* not tail */
                break;
            /* If the pet can't see it, it assumes it ain't there */
            targ = 0;
        }
    }
    return targ;
}

export function find_friends(mtmp, mtarg, maxdist)
{
    maxdist = C.int(maxdist);

    let pal;
    let dx = C.sgn(mtarg.mx - mtmp.mx),
        dy = C.sgn(mtarg.my - mtmp.my);
    let curx = mtarg.mx, cury = mtarg.my;
    let dist = C.distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my);

    for ( ; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;

        if (!C.isok(curx, cury))
            return 0;

        /* If the pet can't see beyond this point, don't
         * check any farther
         */


        if (!C.m_cansee(mtmp, curx, cury))
            return 0;

        /* Does pet think you're here? */
        if (mtmp.mux == curx && mtmp.muy == cury)
            return 1;

        pal = C.m_at(curx, cury);

        if (pal) {
            if (pal.mtame) {
                /* Pet won't notice invisible pets */
                if (!pal.minvis || C.perceives(mtmp.data))
                    return 1;
            } else {
                /* Quest leaders and guardians are always seen */
                if (pal.data.msound == C.MS_LEADER
                    || pal.data.msound == C.MS_GUARDIAN)
                    return 1;
            }
        }
    }
    return 0;
}

export function score_targ(mtmp, mtarg)
{


    let score = 0n;

    /* If the monster is confused, normal scoring is disrupted -
     * anything may happen
     */



    /* Give 1 in 3 chance of safe breathing even if pet is confused or
     * if you're on the quest start level */

    if (!mtmp.mconf || !C.rn2(() => (3), 9) || C.Is_qstart(C.u.uz)) {
        let mtmp_lev;
        let align1 = C.A_NONE, align2 = C.A_NONE; /* For priests, minions */
        let faith1 = 1,  faith2 = 1;

        if (mtmp.isminion)
            align1 = C.EMIN(mtmp).min_align;
        else if (mtmp.ispriest)
            align1 = C.EPRI(mtmp).shralign;
        else
            faith1 = 0;
        if (mtarg.isminion)
            align2 = C.EMIN(mtarg).min_align; /* MAR */
        else if (mtarg.ispriest)
            align2 = C.EPRI(mtarg).shralign; /* MAR */
        else
            faith2 = 0;

        /* Never target quest friendlies */
        if (mtarg.data.msound == C.MS_LEADER
            || mtarg.data.msound == C.MS_GUARDIAN)
            return -5000n;
        /* D: Fixed angelic beings using gaze attacks on coaligned priests */
        if (faith1 && faith2 && align1 == align2 && mtarg.mpeaceful) {
            score -= 5000n;
            return score;
        }
        /* Is monster adjacent? */
        if (C.distmin(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) <= 1) {
            score -= 3000n;
            return score;
        }
        /* Is the monster peaceful or tame? */
        if (/*mtarg->mpeaceful ||*/ mtarg.mtame || mtarg == C.gy.youmonst) {
            /* Pets will never be targeted */
            score -= 3000n;
            return score;
        }
        /* Is master/pet behind monster? Check up to 15 squares beyond pet. */
        if (find_friends(mtmp, mtarg, 15)) {
            score -= 3000n;
            return score;
        }
        /* Target hostile monsters in preference to peaceful ones */
        if (!mtarg.mpeaceful)
            score += 10n;
        /* Is the monster passive? Don't waste energy on it, if so */
        if (mtarg.data.mattk[0].aatyp == C.AT_NONE)
            score -= 1000n;
        /* Even weak pets with breath attacks shouldn't take on very
           low-level monsters. Wasting breath on lichens is ridiculous. */

        if ((mtarg.m_lev < 2 && mtmp.m_lev > 5)
            || (mtmp.m_lev > 12 && mtarg.m_lev < mtmp.m_lev - 9
                && C.u.ulevel > 8 && mtarg.m_lev < C.u.ulevel - 7))
            score -= 25n;
        /* for strength purposes, a vampshifter in weak form (vampire bat,
           fog cloud, maybe wolf) will attack as if in vampire form;
           otherwise if won't do much and usually wouldn't suffer enough
           damage (from counterattacks) to switch back to vampire form;
           make it be more aggressive by behaving as if stronger */




        mtmp_lev = mtmp.m_lev;
        if (C.is_vampshifter(mtmp) && mtmp.data.mlet != C.S_VAMPIRE) {
            /* is_vampshifter() implies (mtmp->cham >= LOW_PM) */
            mtmp_lev = C.mons[mtmp.cham].mlevel;
            /* actual vampire level would range from 1.0*mlvl to 1.5*mlvl */
            mtmp_lev += C.rn2(() => (C.idiv(mtmp_lev, 2) + 1), 10);
            /* we don't expect actual level in weak form to exceed
               base level of strong form, but handle that if it happens */

            if (mtmp.m_lev > mtmp_lev)
                mtmp_lev = mtmp.m_lev;
        }
        /* And pets will hesitate to attack vastly stronger foes.
           This penalty will be discarded if master's in trouble. */

        if (mtarg.m_lev > C.long(mtmp_lev) + 4n)
            score -= C.long(mtarg.m_lev - mtmp_lev) * 20n;
        /* All things being the same, go for the beefiest monster. This
           bonus should not be large enough to override the pet's aversion
           to attacking much stronger monsters. */


        score += C.long(mtarg.m_lev * 2 + C.idiv(mtarg.mhp, 3));
    }
    /* Fuzz factor to make things less predictable when very
       similar targets are abundant. */

    score += C.long(C.rnd(() => (5), 11));
    /* Pet may decide not to use ranged attack when confused */
    if (mtmp.mconf && !C.rn2(() => (3), 12))
        score -= 1000n;
    return score;
}

export function best_target(mtmp, forced)
{
    forced = C.byte(forced);
/* Pet */
    let dx, dy;
    let bestscore = -40000n, currscore;
    let best_targ = 0, temp_targ = 0;

    /* Help! */
    if (!mtmp)
        return 0;

    /* If the pet is blind, it's not going to see any target */
    if (!mtmp.mcansee)
        return 0;

    /* Search for any monsters lined up with the pet, within an arbitrary
     * distance from the pet (7 squares, even along diagonals). Monsters
     * are assigned scores and the best score is chosen.
     */



    for (dy = -1; dy < 2; ++dy) {
        for (dx = -1; dx < 2; ++dx) {
            if (!dx && !dy)
                continue;
            /* Traverse the line to find the first monster within 7
             * squares. Invisible monsters are skipped (if the
             * pet doesn't have see invisible).
             */



            temp_targ = find_targ(mtmp, dx, dy, 7);

            /* Nothing in this line? */
            if (!temp_targ)
                continue;

            /* Decide how attractive the target is */
            currscore = score_targ(mtmp, temp_targ);

            if (currscore > bestscore) {
                bestscore = currscore;
                best_targ = temp_targ;
            }
        }
    }

    /* Filter out targets the pet doesn't like */
    if (!forced && bestscore < 0n)
        best_targ = 0;

    return best_targ;
}

/* Pet considers and maybe executes a ranged attack */
export function pet_ranged_attk(mtmp, forced)
{
    forced = C.byte(forced);

    let mtarg;
    let hungry = 0;

    /* How hungry is the pet? */
    if (!mtmp.isminion) {
        let dog = C.EDOG(mtmp);

        hungry = (C.svm.moves > (dog.hungrytime + DOG_HUNGRY));
    }

    /* Identify the best target in a straight line from the pet;
     * if there is such a target, we'll let the pet attempt an attack.
     */


    mtarg = best_target(mtmp, forced);

    /* Hungry pets are unlikely to use breath/spit attacks */
    if (mtarg && (!hungry || !C.rn2(() => (5), 13))) {
        let mstatus = C.M_ATTK_MISS;

        if (mtarg == C.gy.youmonst) {
            if (C.mattacku(mtmp))
                return C.MMOVE_DIED;
            /* Treat this as the pet having initiated an attack even if it
             * didn't, so it will lose its move.  This isn't entirely fair,
             * but mattacku doesn't distinguish between "did not attack"
             * and "attacked but didn't die" cases, and this is preferable
             * to letting the pet attack the player and continuing to move.
             */





            mstatus = C.M_ATTK_HIT;
        } else {
            C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
            C.gn.notonhead = 0;
            mstatus = C.mattackm(mtmp, mtarg);

            /* Shouldn't happen, really */
            if (mstatus & C.M_ATTK_AGR_DIED)
                return C.MMOVE_DIED;

            /* Allow the targeted nasty to strike back - if
             * the targeted beast doesn't have a ranged attack,
             * nothing will happen.
             */



            if ((mstatus & C.M_ATTK_HIT) && !(mstatus & C.M_ATTK_DEF_DIED)
                && C.rn2(() => (4), 14) && mtarg != C.gy.youmonst) {

                /* Can monster see?  If it can, it can retaliate
                 * even if the pet is invisible, since it'll see
                 * the direction from which the ranged attack came;
                 * if it's blind or unseeing, it can't retaliate
                 */




                if (mtarg.mcansee && C.haseyes(mtarg.data)) {
                    let mresp;

                    C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
                    C.gn.notonhead = 0;
                    mresp = C.mattackm(mtarg, mtmp);
                    if (mresp & C.M_ATTK_DEF_DIED)
                        return C.MMOVE_DIED;
                }
            }
        }
        /* Only return 3 if the pet actually made a ranged attack, and
         * thus should lose the rest of its move.
         * There's a chain of assumptions here:
         * 1. score_targ and best_target will never select a monster
         *    that can be attacked in melee, so the mattackm call can
         *    only ever try ranged options
         * 2. if the only attacks available to mattackm are ranged
         *    options, and the monster cannot make a ranged attack, it
         *    will return M_ATTK_MISS.
         */









        if (mstatus != C.M_ATTK_MISS)
            return C.MMOVE_DONE;
    } else if (forced)
        C.domonnoise(mtmp);
    return C.MMOVE_NOTHING;
}

/* Return values (same as m_move):
 * 0: did not move, but can still attack and do other stuff.
 * 1: moved, possibly can attack.
 * 2: monster died.
 * 3: did not move, and can't do anything else either.
 *    (may have attacked something)
 */






export function dog_move(mtmp, after)
{
    after = C.int(after);
/* pet */
/* this is extra fast monster movement */
    let omx, omy; /* original mtmp position */
    let appr, whappr, udist;
    let i, j, k;
    let edog = (mtmp.mtame && C.has_edog(mtmp)) ? C.EDOG(mtmp) : 0;
    let obj = 0;
    let otyp;
    const cursemsg = new Int8Array(9); let do_eat = 0;
    let better_with_displacing = 0, ranged_only;
    let nix, niy;      /* position mtmp is (considering) moving to */
    let nx, ny; /* temporary coordinates */
    let cnt, uncursedcnt, chcnt;
    let chi = -1, nidist, ndist;
    let allowflags;
    const mfp = C.recordLocal("mfndposdata");
/* #define GDIST(x, y) (dist2(x, y, gg.gx, gg.gy)) */
    const GDIST = (x,y) => C.dist2(x,y,C.gg.gx,C.gg.gy);

    /*
     * Tame Angels have isminion set and an ispriest structure instead of
     * an edog structure.  Fortunately, guardian Angels need not worry
     * about mundane things like eating and fetching objects, and can
     * spend all their energy defending the player.  (They are the only
     * monsters with other structures that can be tame.)
     */






    if (!edog && !mtmp.isminion) {
        C.impossible("dog_move for non-pet?");
        return C.MMOVE_NOTHING;
    }

    omx = mtmp.mx;
    omy = mtmp.my;
    if (edog && dog_hunger(mtmp, edog))
        return C.MMOVE_DIED; /* starved */

    udist = C.distu(omx, omy);
    /* Let steeds eat and maybe throw rider during Conflict */
    if (mtmp == C.u.usteed) {
        if (C.Conflict && !C.resist_conflict(mtmp)) {
            C.dismount_steed(C.DISMOUNT_THROWN);
            return C.MMOVE_MOVED;
        }
        udist = 1;
    } else if (!udist) {
        /* maybe we tamed him while being swallowed --jgm */
        return C.MMOVE_NOTHING;
    }

    nix = omx; /* set before newdogpos */
    niy = omy;
    cursemsg[0] = 0; /* lint suppression */

    newdogpos: {
    if (edog) {
        j = dog_invent(mtmp, edog, udist);
        if (j == 2 || C.mon_offmap(mtmp))
            return C.DEADMONSTER(mtmp) ? C.MMOVE_DIED : C.MMOVE_DONE;
        else if (j == 1)
            break newdogpos; /* eating something */

        whappr = (C.svm.moves - edog.whistletime < 5);
    } else
        whappr = 0;

    appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr == -2)
        return C.MMOVE_NOTHING;

    if (C.Conflict && !C.resist_conflict(mtmp)) {
        if (!edog) {
            /* Guardian angel refuses to be conflicted; rather,
             * it disappears, angrily, and sends in some nasties
             */


            C.lose_guardian_angel(mtmp);
            return C.MMOVE_DIED; /* current monster is gone */
        }
    }
/* [this is now handled in dochug()] */
/* swallowed case handled above */
    allowflags = C.mon_allowflags(mtmp);
    cnt = C.mfndpos(mtmp, mfp, allowflags);

    /* Normally dogs don't step on cursed items, but if they have no
     * other choice they will.  This requires checking ahead of time
     * to see how many uncursed item squares are around.
     */



    uncursedcnt = 0;
    for (i = 0; i < cnt; i++) {
        nx = mfp.poss[i].x;
        ny = mfp.poss[i].y;
        if (C.MON_AT(nx, ny) && !((mfp.info[i] & C.ALLOW_M) || mfp.info[i] & C.ALLOW_MDISP))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    better_with_displacing = C.should_displace(mtmp, mfp,
                                             C.gg.gx, C.gg.gy);

    chcnt = 0;
    chi = -1;
    nidist = GDIST(nix, niy);

    candidates: for (i = 0; i < cnt; i++) {
        nx = mfp.poss[i].x;
        ny = mfp.poss[i].y;
        cursemsg[i] = 0;

        /* if leashed, we drag him along. */
        if (mtmp.mleashed && C.distu(nx, ny) > 4)
            continue;

        /* if a guardian, try to stay close by choice */
        if (!edog && (j = C.distu(nx, ny)) > 16 && j >= udist)
            continue;

        ranged_only = 0;

        if ((mfp.info[i] & C.ALLOW_M) && C.MON_AT(nx, ny)) {
            let mstatus;
            let mtmp2 = C.m_at(nx, ny);
            /* weight the audacity of the pet to attack a differently-leveled
             * foe based on its fraction of max HP:
             *       100%: up to level + 2
             * 80% and up: up to level + 1
             * 60% to 80%: up to level
             * 40% to 60%: up to level - 1
             * 25% to 40%: up to level - 2
             *  below 25%: won't attack peacefuls of any level (different case)
             *  below 20%: up to level - 3
             *
             * note that balk's maximum value is +3, as it is the lowest level
             * the pet will balk at attacking rather than the highest level
             * they are willing to attack; note the >= used when comparing it.
             */













            let balk = mtmp.m_lev + C.idiv(5 * mtmp.mhp, mtmp.mhpmax) - 2;

            if (C.int(mtmp2.m_lev) >= balk
                || (mtmp2.mtame && mtmp.mtame && !C.Conflict)
                || (C.max_passive_dmg(mtmp2, mtmp) >= mtmp.mhp)
                || ((mtmp.mhp * 4 < mtmp.mhpmax
                     || mtmp2.data.msound == C.MS_GUARDIAN
                     || mtmp2.data.msound == C.MS_LEADER)
                    && mtmp2.mpeaceful && !C.Conflict)) {
                continue;
            }
            if ((mtmp2.data == C.mons[C.PM_FLOATING_EYE] && C.rn2(() => (10), 15)
                 && mtmp.mcansee && C.haseyes(mtmp.data) && mtmp2.mcansee
                 && (!mtmp2.minvis || C.perceives(mtmp.data))
                 && !C.mon_reflects(mtmp, 0))
                || (mtmp2.data == C.mons[C.PM_GELATINOUS_CUBE] && C.rn2(() => (10), 16))
                || (C.touch_petrifies(mtmp2.data) && !C.resists_ston(mtmp))) {
                /* only skip this foe if a ranged attack isn't viable */
                if (C.dist2(mtmp.mx, mtmp.my, mtmp2.mx, mtmp2.my) <= 2
                    || best_target(mtmp, 0) != mtmp2)
                    continue;
                ranged_only = 1;
            }
            /** FIXME: 'ranged_only' isn't used as intended yet **/
            if (ranged_only)
                continue;

            if (after)
                return C.MMOVE_NOTHING; /* hit only once each move */

            C.gb.bhitpos.x = nx, C.gb.bhitpos.y = ny;
            C.gn.notonhead = mtmp2.mx != nx || mtmp2.my != ny;
            mstatus = C.mattackm(mtmp, mtmp2);

            /* aggressor (pet) died */
            if (mstatus & C.M_ATTK_AGR_DIED)
                return C.MMOVE_DIED;

            if ((mstatus & (C.M_ATTK_HIT | C.M_ATTK_DEF_DIED)) == C.M_ATTK_HIT
                && C.rn2(() => (4), 17)
                && mtmp2.mlstmv != C.svm.moves
                && !C.onscary(mtmp.mx, mtmp.my, mtmp2)
                /* monnear check needed: long worms hit on tail */
                && C.monnear(mtmp2, mtmp.mx, mtmp.my)) {
                C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
                C.gn.notonhead = 0;
                mstatus = C.mattackm(mtmp2, mtmp); /* return attack */
                if (mstatus & C.M_ATTK_DEF_DIED)
                    return C.MMOVE_DIED;
            }
            return C.MMOVE_DONE;
        }
        if ((mfp.info[i] & C.ALLOW_MDISP) && C.MON_AT(nx, ny)
            && better_with_displacing && !C.undesirable_disp(mtmp, nx, ny)) {
            let mstatus;
            let mtmp2 = C.m_at(nx, ny);

            mstatus = C.mdisplacem(mtmp, mtmp2, 0); /* displace monster */
            if (mstatus & C.M_ATTK_DEF_DIED)
                return C.MMOVE_DIED;
            return C.MMOVE_NOTHING;
        }

        /* avoid a location hero just kicked */
        if (C.m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (C.m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        {
            /* Dog avoids harmful traps, but perhaps it has to pass one
             * in order to follow player.  (Non-harmful traps do not
             * have ALLOW_TRAPS in info[].)  The dog only avoids the
             * trap if you've seen it, unlike enemies who avoid traps
             * if they've seen some trap of that type sometime in the
             * past.  (Neither behavior is really realistic.)
             */






            let trap;

            if ((mfp.info[i] & C.ALLOW_TRAPS) && (trap = C.t_at(nx, ny))) {
                if (mtmp.mleashed) {
                    if (!C.Deaf)
                        C.whimper(mtmp);
                } else {
                    /* 1/40 chance of stepping on it anyway, in case
                     * it has to pass one to follow the player...
                     */


                    if (trap.tseen && C.rn2(() => (40), 18))
                        continue;
                }
            }
        }

        /* dog eschews cursed objects, but likes dog food */
        /* (minion isn't interested; `cursemsg' stays FALSE) */
        if (edog) {
            let can_reach_food = could_reach_item(mtmp, nx, ny);

            for (obj = C.svl.level.objects[nx][ny]; obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg[i] = 1;
                } else if (can_reach_food
                           && (otyp = C.dogfood(mtmp, obj)) < C.MANFOOD
                           && (otyp < C.ACCFOOD
                               || edog.hungrytime <= C.svm.moves)) {
                    /* Note: our dog likes the food so much that he
                     * might eat it even when it conceals a cursed object */

                    nix = nx;
                    niy = ny;
                    chi = i;
                    do_eat = 1;
                    cursemsg[i] = 0; /* not reluctant */
                    break newdogpos;
                }
            }
        }
        /* didn't find something to eat; if we saw a cursed item and
           aren't being forced to walk on it, usually keep looking */

        if (cursemsg[i] && !mtmp.mleashed && uncursedcnt > 0
            && C.rn2(() => (13 * uncursedcnt), 19))
            continue;

        /*
         * Lessen the chance of backtracking to previous position(s).
         * This causes unintended issues for pets trying to follow the
         * hero.  Thus, only run it if not leashed and >5 tiles away.
         */




        if (!mtmp.mleashed && C.distmin(mtmp.mx, mtmp.my, C.u.ux, C.u.uy) > 5) {
            k = edog ? uncursedcnt : cnt;
            for (j = 0; j < C.MTSZ && j < k - 1; j++)
                if (nx == mtmp.mtrack[j].x && ny == mtmp.mtrack[j].y)
                    if (C.rn2(() => (C.MTSZ * (k - j)), 20))
                        continue candidates;
        }

        j = ((ndist = GDIST(nx, ny)) - nidist) * appr;
        if ((j == 0 && !C.rn2(() => (++chcnt), 21)) || j < 0
            || (j > 0 && !whappr
                && ((omx == nix && omy == niy && !C.rn2(() => (3), 22)) || !C.rn2(() => (12), 23)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0)
                chcnt = 0;
            chi = i;
        }

        ;
    }

    /* Pet hasn't attacked anything but is considering moving -
     * now's the time for ranged attacks. Note that the pet can move
     * after it performs its ranged attack. Should this be changed?
     */



    if ((i = pet_ranged_attk(mtmp, 0)) != C.MMOVE_NOTHING)
        return i;

    }

    if (nix != omx || niy != omy) {
        let wasseen;

        if (mfp.info[chi] & C.ALLOW_U) {
            if (mtmp.mleashed) { /* play it safe */
                C.pline_mon(mtmp, "%s breaks loose of %s leash!",
                         C.Monnam(mtmp), C.mhis(mtmp));
                C.m_unleash(mtmp, 0);
            }
            C.mattacku(mtmp);
            return C.MMOVE_DONE;
        }
        if (!C.m_in_out_region(mtmp, nix, niy))
            return C.MMOVE_MOVED;
        if (C.m_digweapon_check(mtmp, nix,niy))
            return C.MMOVE_NOTHING;

        /* insert a worm_move() if worms ever begin to eat things */
        wasseen = C.canseemon(mtmp);
        C.remove_monster(omx, omy);
        C.place_monster(mtmp, nix, niy);
        if (cursemsg[chi] && (wasseen || C.canseemon(mtmp))) {
            /* describe top item of pile, not necessarily cursed item itself;
               don't use glyph_at() here--it would return the pet but we want
               to know whether an object is remembered at this map location */


            let o = (!C.Hallucination && C.svl.level.flags.hero_memory
                             && C.glyph_is_object(C.levl[nix][niy].glyph))
                               ? C.vobj_at(nix, niy) : 0;
            let what = o ? C.distant_name(o, C.doname) : C.something;

            C.pline_mon(mtmp, "%s %s reluctantly %s %s.", C.noit_Monnam(mtmp),
                  C.vtense(0, C.locomotion(mtmp.data, "step")),
                  (C.is_flyer(mtmp.data) || C.is_floater(mtmp.data)) ? "over"
                                                                   : "onto",
                  what);
        }
        C.mon_track_add(mtmp, omx, omy);
        /* We have to know if the pet's going to do a combined eat and
         * move before moving it, but it can't eat until after being
         * moved.  Thus the do_eat flag.
         */



        if (do_eat) {
            if (dog_eat(mtmp, obj, omx, omy, 0) == 2)
                return C.MMOVE_DIED;
        }
    } else if (mtmp.mleashed && C.distu(omx, omy) > 4) {
        /* an incredible kludge, but the only way to keep pooch near
         * after it spends time eating or in a trap, etc.
         */


        const cc = C.recordLocal("nhcoord");

        nx = C.sgn(omx - C.u.ux);
        ny = C.sgn(omy - C.u.uy);
        cc.x = C.u.ux + nx;
        cc.y = C.u.uy + ny;
        dognext: {
        if (C.goodpos(cc.x, cc.y, mtmp, 0))
            break dognext;

        i = C.xytodir(nx, ny);
        for (j = C.DIR_LEFT(i); j < C.DIR_RIGHT(i); j++) {
            C.dirtocoord(cc, j);
            if (C.goodpos(cc.x, cc.y, mtmp, 0))
                break dognext;
        }
        for (j = C.DIR_LEFT2(i); j < C.DIR_RIGHT2(i); j++) {
            C.dirtocoord(cc, j);
            if (C.goodpos(cc.x, cc.y, mtmp, 0))
                break dognext;
        }
        cc.x = mtmp.mx;
        cc.y = mtmp.my;
        }

        if (!C.m_in_out_region(mtmp, nix, niy))
            return C.MMOVE_MOVED;
        C.remove_monster(mtmp.mx, mtmp.my);
        C.place_monster(mtmp, cc.x, cc.y);
        C.newsym(cc.x, cc.y);
        C.set_apparxy(mtmp);
    }
    return C.MMOVE_MOVED;
}

/* check if a monster could pick up objects from a location */
export function could_reach_item(mon, nx, ny)
{
    nx = C.short(nx);
    ny = C.short(ny);

    if ((!C.is_pool(nx, ny) || C.is_swimmer(mon.data))
        && (!C.is_lava(nx, ny) || C.likes_lava(mon.data))
        && (!C.sobj_at(C.BOULDER, nx, ny) || C.throws_rocks(mon.data)))
        return 1;
    return 0;
}

/* Hack to prevent a dog from being endlessly stuck near an object that
 * it can't reach, such as caught in a teleport scroll niche.  It recursively
 * checks to see if the squares in between are good.  The checking could be
 * a little smarter; a full check would probably be useful in m_move() too.
 * Since the maximum food distance is 5, this should never be more than 5
 * calls deep.
 */






export function can_reach_location(mon, mx, my, fx, fy)
{
    mx = C.short(mx);
    my = C.short(my);
    fx = C.short(fx);
    fy = C.short(fy);

    let i, j;
    let dist;

    if (mx == fx && my == fy)
        return 1;
    if (!C.isok(mx, my))
        return 0; /* should not happen */

    dist = C.dist2(mx, my, fx, fy);
    for (i = mx - 1; i <= mx + 1; i++) {
        for (j = my - 1; j <= my + 1; j++) {
            if (!C.isok(i, j))
                continue;
            if (C.dist2(i, j, fx, fy) >= dist)
                continue;
            if (C.IS_OBSTRUCTED(C.levl[i][j].typ) && !C.passes_walls(mon.data)
                && (!C.may_dig(i, j) || !C.tunnels(mon.data)
                    /* tunnelling monsters can't do that on the rogue level */
                    || C.Is_rogue_level(C.u.uz)))
                continue;
            if (C.IS_DOOR(C.levl[i][j].typ)
                && (C.levl[i][j].doormask & (C.D_CLOSED | C.D_LOCKED)))
                continue;
            if (!could_reach_item(mon, i, j))
                continue;
            if (can_reach_location(mon, i, j, fx, fy))
                return 1;
        }
    }
    return 0;
}

/* do_clear_area client */
export function wantdoor(x, y, distance)
{
    x = C.short(x);
    y = C.short(y);

    let ndist; const dist_ptr = C.intPointer(distance);

    if (dist_ptr.value > (ndist = C.distu(x, y))) {
        C.gg.gx = x;
        C.gg.gy = y;
        dist_ptr.value = ndist;
    }
}

/* type of pet, 0 means any  */
/* symbol of pet, 0 means any */
/* mimic this */
/* what is the thing it is mimicking? */
export const qm = C => [
    /* Things that some pets might be thinking about at the time */
    {mndx:C.PM_LITTLE_DOG, mlet:0, mappearance:C.PM_KITTEN, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_DOG, mlet:0, mappearance:C.PM_HOUSECAT, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_LARGE_DOG, mlet:0, mappearance:C.PM_LARGE_CAT, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_KITTEN, mlet:0, mappearance:C.PM_LITTLE_DOG, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_HOUSECAT, mlet:0, mappearance:C.PM_DOG, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_LARGE_CAT, mlet:0, mappearance:C.PM_LARGE_DOG, m_ap_type:C.M_AP_MONSTER},
    {mndx:C.PM_HOUSECAT, mlet:0, mappearance:C.PM_GIANT_RAT, m_ap_type:C.M_AP_MONSTER},
    {mndx:0, mlet:C.S_DOG, mappearance:C.S_sink, m_ap_type:C.M_AP_FURNITURE}, /* sorry, no fire hydrants */
    {mndx:0, mlet:0, mappearance:C.TRIPE_RATION, m_ap_type:C.M_AP_OBJECT}, /* leave this at end */
];

export function finish_meating(mtmp)
{


    mtmp.meating = 0;
    if (C.M_AP_TYPE(mtmp) != C.M_AP_NOTHING && mtmp.data.mlet != C.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = C.M_AP_NOTHING;
        mtmp.mappearance = 0;
        C.newsym(mtmp.mx, mtmp.my);
    }
}

/*
 * variation of leashable() that takes a PM_ index */

export function mnum_leashable(mnum)
{
    mnum = C.int(mnum);

    return ((mnum >= C.LOW_PM && mnum <= C.HIGH_PM)
            && mnum != C.PM_LONG_WORM && !C.unsolid(C.mons[mnum])
            && (!C.nolimbs(C.mons[mnum]) || C.has_head(C.mons[mnum])))
               ? 1
               : 0;
}

export function quickmimic(mtmp)
{


    let idx = 0, trycnt = 5, spotted, seeloc;
    let was_leashed = mtmp.mleashed;
    const buf = C.stackAlloc(C.BUFSZ);

    if (C.Protection_from_shape_changers || !mtmp.meating)
        return;

    /* with polymorph, the steed's equipment would be re-checked and its
       saddle would come off, triggering DISMOUNT_FELL, but mimicking
       doesn't impact monster's equipment; normally DISMOUNT_POLY is for
       rider taking on an unsuitable shape, but its message works fine
       for this and also avoids inflicting damage during forced dismount;
       do this before changing so that dismount refers to original shape */





    if (mtmp == C.u.usteed)
        C.dismount_steed(C.DISMOUNT_POLY);

    do {
        idx = C.rn2(() => (C.qm.length), 24);
        if (C.qm[idx].mndx != 0 && C.monsndx(mtmp.data) == C.qm[idx].mndx)
            break;
        if (C.qm[idx].mlet != 0 && mtmp.data.mlet == C.qm[idx].mlet)
            break;
        if (C.qm[idx].mndx == 0 && C.qm[idx].mlet == 0)
            break;
    } while (--trycnt > 0);
    if (trycnt == 0)
        idx = C.qm.length - 1;

    C.Strcpy(buf, C.y_monnam(mtmp)); /* "your <pet>" or "the <mon>" or "Fang" */
    spotted = C.canspotmon(mtmp);
    seeloc = C.cansee(mtmp.mx, mtmp.my);

    mtmp.m_ap_type = C.qm[idx].m_ap_type;
    mtmp.mappearance = C.qm[idx].mappearance;

    if (spotted || seeloc || C.canspotmon(mtmp)) {
        let prev_glyph = C.glyph_at(mtmp.mx, mtmp.my);
        let what = (C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE)
                           ? C.defsyms[mtmp.mappearance].explanation
                           : (C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT
                              && C.OBJ_DESCR(C.objects[mtmp.mappearance]))
                             ? C.OBJ_DESCR(C.objects[mtmp.mappearance])
                             : (C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT
                                && C.OBJ_NAME(C.objects[mtmp.mappearance]))
                               ? C.OBJ_NAME(C.objects[mtmp.mappearance])
                               : (C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER)
                                 ? C.pmname(C.mons[mtmp.mappearance],
                                          C.Mgender(mtmp))
                                 : C.something;

        C.newsym(mtmp.mx, mtmp.my);
        if (was_leashed
            && (C.M_AP_TYPE(mtmp) != C.M_AP_MONSTER
                || !mnum_leashable(mtmp.mappearance))) {
            C.Your("leash goes slack.");
            C.m_unleash(mtmp, 0);
        }
        if (C.glyph_at(mtmp.mx, mtmp.my) != prev_glyph)
            C.You("%s %s %s where %s was!",
                seeloc ? "see" : "sense that",
                (what != C.something) ? C.an(what) : what,
                seeloc ? "appear" : "has appeared", buf);
        else
            C.You("sense that %s feels rather %s-ish.", buf, what);

        C.display_nhwindow(C.WIN_MAP, 1);
    }
}


/*dogmove.c*/
