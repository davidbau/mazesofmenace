import {C} from './c-runtime.js';

/* NetHack 5.0	eat.c	$NHDT-Date: 1740534854 2025/02/25 17:54:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.344 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */


/* also used to see if you're allowed to eat cats and dogs */

/* Rider corpses are treated as non-rotting so that attempting to eat one
   will be sure to reach the stage of eating where that meal is fatal;
   acid blob corpses eventually rot away to nothing but before that happens
   they can be sacrificed regardless of age which implies that they never
   become rotten */

/* non-rotting non-corpses; unlike lizard corpses, these items will behave
   as if rotten if they are cursed (fortune cookies handled elsewhere) */

/* Original TU macro, expanded at its original uses:
#define CANNIBAL_ALLOWED() (Role_if(PM_CAVE_DWELLER) || Race_if(PM_ORC))
*/
/* Original TU macro, expanded at its original uses:
#define nonrotting_corpse(mnum) \
    ((mnum) == PM_LIZARD || (mnum) == PM_LICHEN \
     || is_rider(&mons[mnum])                   \
     || (mnum) == PM_ACID_BLOB)
*/
/* Original TU macro, expanded at its original uses:
#define nonrotting_food(otyp) \
    ((otyp) == LEMBAS_WAFER || (otyp) == CRAM_RATION)
*/
/* Original TU macro, expanded at its original uses:
#define TTSZ SIZE(tintxts)
*/
/* see hunger states in hack.h - texts used on bottom line
   Also used in botl.c and insight.c  */
export const hu_stat = [
    "Satiated", "        ", "Hungry  ", "Weak    ",
    "Fainting", "Fainted ", "Starved "
];

export const zero_victual_initial = 0;

/* used by getobj() callback routines eat_ok()/offer_ok()/tin_ok() to
   indicate whether player was given an opportunity to eat or offer or
   tin an item on the floor and declined, in order to insert "else"
   into the "you don't have anything [else] to {eat | offer | tin}"
   feedback if hero lacks any suitable items in inventory
   [reinitialized every time it's used so does not need to be placed
   in struct instance_globals g for potential bulk reinitialization] */
export const getobj_else_initial = 0;

/*
 * Decide whether a particular object can be eaten by the possibly
 * polymorphed character.  Not used for monster checks.
 */
export function is_edible(obj)

{
    /* [g-cubes can eat containers and retain all contents
            as engulfed items, but poly'd player can't do that] */
    /* protect invocation tools but not Rider corpses (handled elsewhere)*/
    /* if (obj->oclass != FOOD_CLASS && obj_resists(obj, 0, 0)) */
    if (C.objects[obj.otyp].oc_unique)
        return C.int(0);
    /* above also prevents the Amulet from being eaten, so we must never
       allow fake amulets to be eaten either [which is already the case] */

    if (((C.samePtr(C.gy.youmonst.data, C.mons[C.PM_FIRE_ELEMENTAL]) && C.is_flammable(obj)) ? 1 : 0))
        return C.int(1);

    if (((((C.metallivorous(C.gy.youmonst.data) && C.is_metallic(obj)) ? 1 : 0) && ((!C.samePtr(C.gy.youmonst.data, C.mons[C.PM_RUST_MONSTER]) || C.is_rustprone(obj)) ? 1 : 0)) ? 1 : 0))
        return C.int(1);

    /* Ghouls only eat non-veggy corpses or eggs (see dogfood()) */
    if ((C.u.umonnum == C.PM_GHOUL))
        return C.int(C.boolean(((((((obj.otyp == C.CORPSE) && !C.vegan(C.mons[obj.corpsenm])) ? 1 : 0) || (C.long(obj.otyp) == C.long(C.EGG))) ? 1 : 0))));

    if ((((((C.u.umonnum == C.PM_GELATINOUS_CUBE) && C.is_organic(obj)) ? 1 : 0) && !C.Has_contents(obj)) ? 1 : 0))
        return C.int(1);

    return C.int(C.boolean(((obj.oclass == C.FOOD_CLASS))));
}

/* used for hero init, life saving (if choking), and prayer results of fix
   starving, fix weak from hunger, or golden glow boon (if u.uhunger < 900) */
export function init_uhunger()

{
    (C.disp.botl = C.int((((C.u.uhs != C.NOT_HUNGRY) || (C.u.atemp.a[C.A_STR] < 0)) ? 1 : 0)));
    (C.u.uhunger = C.int(900));
    (C.u.uhs = C.uint(C.NOT_HUNGRY));
    if ((C.u.atemp.a[C.A_STR] < 0)) {
        (C.u.atemp.a[C.A_STR] = C.int(0));
        C.encumber_msg();
    }
}

/* tin types [SPINACH_TIN = -1, overrides corpsenm, nut==600] */
/* description */
/* nutrition */
/* stocked by health food shops */
/* causes slippery fingers */
export const tintxts = [ {txt:"rotten",nut:-50,fodder:0,greasy:0},  /* ROTTEN_TIN = 0 */
                {txt:"homemade",nut:50,fodder:1,greasy:0}, /* HOMEMADE_TIN = 1 */
                {txt:"soup made from",nut:20,fodder:1,greasy:0},
                {txt:"french fried",nut:40,fodder:0,greasy:1},
                {txt:"pickled",nut:40,fodder:1,greasy:0},
                {txt:"boiled",nut:50,fodder:1,greasy:0},
                {txt:"smoked",nut:50,fodder:1,greasy:0},
                {txt:"dried",nut:55,fodder:1,greasy:0},
                {txt:"deep fried",nut:60,fodder:0,greasy:1},
                {txt:"szechuan",nut:70,fodder:1,greasy:0},
                {txt:"broiled",nut:80,fodder:0,greasy:0},
                {txt:"stir fried",nut:80,fodder:0,greasy:1},
                {txt:"sauteed",nut:95,fodder:0,greasy:0},
                {txt:"candied",nut:100,fodder:1,greasy:0},
                {txt:"pureed",nut:500,fodder:1,greasy:0},
                {txt:"",nut:0,fodder:0,greasy:0} ];

/* called after mimicking is over */
export function eatmdone()

{
    /* release `eatmbuf' */
    if (C.ge.eatmbuf) {
        if (C.samePtr(C.gn.nomovemsg, C.ge.eatmbuf))
            (C.gn.nomovemsg = 0);
        C.free( C.ge.eatmbuf), (C.ge.eatmbuf = 0);
    }
    /* update display */
    if (C.U_AP_TYPE) {
        (C.gy.youmonst.m_ap_type = C.int(C.M_AP_NOTHING));
        C.newsym(C.u.ux, C.u.uy);
    }
    return C.int(0);
}

/* called when hallucination is toggled */
export function eatmupdate()

{
    let altmsg = 0;
    let altapp = C.int(0); /* lint suppression */

    if (((!C.ge.eatmbuf || !C.samePtr(C.gn.nomovemsg, C.ge.eatmbuf)) ? 1 : 0))
        return;

    if (((C.is_obj_mappear(C.gy.youmonst,C.ORANGE) && !C.Hallucination) ? 1 : 0)) {
        /* revert from hallucinatory to "normal" mimicking */
        (altmsg = "You now prefer mimicking yourself.");
        (altapp = C.int(C.GOLD_PIECE));
    } else if (((C.is_obj_mappear(C.gy.youmonst,C.GOLD_PIECE) && C.Hallucination) ? 1 : 0)) {
        /* won't happen; anything which might make immobilized
           hero begin hallucinating (black light attack, theft
           of Grayswandir) will terminate the mimicry first */
        (altmsg = "Your rind escaped intact.");
        (altapp = C.int(C.ORANGE));
    }

    if (altmsg) {
        /* replace end-of-mimicking message */
        let amlen = C.uint(C.Strlen(altmsg, 0));
        if ((amlen > C.Strlen(C.ge.eatmbuf, 1))) {
            C.free( C.ge.eatmbuf);
            (C.ge.eatmbuf = C.alloc(C.uint((amlen) + (1))));
        }
        (C.gn.nomovemsg = C.strcpy(C.ge.eatmbuf, altmsg));
        /* update current image */
        (C.gy.youmonst.mappearance = C.uint(altapp));
        C.newsym(C.u.ux, C.u.uy);
    }
}

/* ``[the(] singular(food, xname) [)]'' */
export function food_xname(food, the_pfx)

{
    (the_pfx = C.int(C.boolean(the_pfx)));
    let result;

    if ((food.otyp == C.CORPSE)) {
        (result = C.corpse_xname(food, 0,
                              C.int((C.CXN_SINGULAR) | ((the_pfx ? C.CXN_PFX_THE : 0)))));
        /* not strictly needed since pname values are capitalized
           and the() is a no-op for them */
        if (C.type_is_pname(C.mons[food.corpsenm]))
            (the_pfx = C.int(0));
    } else {
        /* the ordinary case */
        (result = C.singular(food, C.xname));
    }
    if (the_pfx)
        (result = C.the(result));
    return result;
}

/* Created by GAN 01/28/87
 * Amended by AKP 09/22/87: if not hard, don't choke, just vomit.
 * Amended by 3.  06/12/89: if not hard, sometimes choke anyway, to keep risk.
 *                11/10/89: if hard, rarely vomit anyway, for slim chance.
 *
 * To a full belly all food is bad. (It.)
 */
export function choke(food)

{
    /* only happens if you were satiated */
    if ((C.u.uhs != C.SATIATED)) {
        if (((!food || (food.otyp != C.AMULET_OF_STRANGULATION)) ? 1 : 0))
            return;
    } else if (((C.Role_if(C.PM_KNIGHT) && (C.u.ualign.type == C.A_LAWFUL)) ? 1 : 0)) {
        C.adjalign(-1); /* gluttony is unchivalrous */
        C.You_feel("like a glutton!");
    }

    C.exercise(C.A_CON, 0);

    if (((((C.Breathless || C.Hunger) ? 1 : 0) || ((!C.Strangled && !C.rn2(20, 258, "choke")) ? 1 : 0)) ? 1 : 0)) {
        /* choking by eating AoS doesn't involve stuffing yourself */
        if (((food && (food.otyp == C.AMULET_OF_STRANGULATION)) ? 1 : 0)) {
            C.You("choke, but recover your composure.");
            return;
        }
        C.You("stuff yourself and then vomit voluminously.");
        morehungry((C.Hunger ? C.int((C.u.uhunger) - (60)) : 1000)); /* just got very sick! */
        vomit();
    } else {
        (C.svk.killer.format = C.int(C.KILLED_BY_AN));
        /*
         * Note all "killer"s below read "Choked on %s" on the
         * high score list & tombstone.  So plan accordingly.
         */
        if (food) {
            C.You("choke over your %s.", foodword(food));
            if ((food.oclass == C.COIN_CLASS)) {
                C.Strcpy(C.svk.killer.name, "very rich meal");
            } else {
                (C.svk.killer.format = C.int(C.KILLED_BY));
                C.Strcpy(C.svk.killer.name, C.killer_xname(food));
            }
        } else {
            C.You("choke over it.");
            C.Strcpy(C.svk.killer.name, "quick snack");
        }
        C.You("die...");
        C.done(C.CHOKING);
    }
}

/* modify victual.piece->owt depending on time spent consuming it */
export function recalc_wt()

{
    let piece = C.svc.context.victual.piece;

    if (!piece) {
        C.impossible("recalc_wt without piece");
        return;
    }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Old weight = %d", piece.owt); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Used time = %d, Req'd time = %d",
                C.svc.context.victual.usedtime, C.svc.context.victual.reqtime); (C.iflags.last_msg = C.int(save_plnmsg)); }
    (piece.owt = C.uint(C.weight(piece)));
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("New weight = %d", piece.owt); (C.iflags.last_msg = C.int(save_plnmsg)); }
}

/* called when eating interrupted by an event */
export function reset_eat()

{
    /* we only set a flag here - the actual reset process is done after
     * the round is spent eating.
     */
    if (((C.svc.context.victual.eating && !C.svc.context.victual.doreset) ? 1 : 0)) {
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("reset_eat..."); (C.iflags.last_msg = C.int(save_plnmsg)); }
        (C.svc.context.victual.doreset = 1);
    }
    return;
}

/* base nutrition of a food-class object; this used to include a variation
   of the code that is now in adj_victual_nutrition() and was moved due to
   its affect on weight() */
export function obj_nutrition(otmp)

{
    let nut = C.uint(((otmp.otyp == C.CORPSE) ? C.mons[otmp.corpsenm].cnutrit : (otmp.globby ? otmp.owt : C.uint(C.objects[otmp.otyp].oc_nutrition))));

    return C.uint(nut);
}

/* nutrition increment for next byte; this used to be factored into
   victual.piece->oeaten but that produced weight change if hero
   polymorphed to or from one of the races which has nutrition adjusted */
export function adj_victual_nutrition()

{
    let otyp = C.int(C.svc.context.victual.piece.otyp);
    /* note: adj_victual_nutrition() is only called when 'nmod' is negative */
    let nut = C.int(-C.svc.context.victual.nmod); /* convert 'nmod' to positive */

    C.assert((nut > 0), 0);
    if ((otyp == C.LEMBAS_WAFER)) {
        if ((C.Upolyd ? C.is_elf(C.gy.youmonst.data) : C.Race_if(C.PM_ELF)))
            (nut = C.int((nut) + (C.int((C.int((nut) + (2))) / (4))))); /* 800 -> 1000 */
        else if ((C.Upolyd ? C.is_orc(C.gy.youmonst.data) : C.Race_if(C.PM_ORC)))
            (nut = C.int((nut) - (C.int((C.int((nut) + (2))) / (4))))); /* 800 -> 600 */
    } else if ((otyp == C.CRAM_RATION)) {
        if ((C.Upolyd ? C.is_dwarf(C.gy.youmonst.data) : C.Race_if(C.PM_DWARF)))
            (nut = C.int((nut) + (C.int((C.int((nut) + (3))) / (6))))); /* 600 -> 700 */
    }
    (nut = C.int(((nut > 1) ? nut : 1)));
    return C.int(nut);
}

/* might destroy otmp if hero drops it */
export function touchfood(otmp)

{
    if ((C.long(otmp.quan) > C.long(1n))) {
        if (!C.carried(otmp))
            C.splitobj(otmp, C.long((C.long(otmp.quan) - C.long(1n))));
        else
            (otmp = C.splitobj(otmp, 1n));
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("split food,"); (C.iflags.last_msg = C.int(save_plnmsg)); }
    }

    if (!otmp.oeaten) {
        C.costly_alteration(otmp, C.COST_BITE);
        (otmp.oeaten = C.uint(obj_nutrition(otmp)));
    }

    if (C.carried(otmp)) {
        C.freeinv(otmp);
        if ((C.inv_cnt(0) >= C.invlet_basic)) {
            C.sellobj_state(C.SELL_DONTSELL);
            C.dropy(otmp);
            C.sellobj_state(C.SELL_NORMAL);
            if ((otmp.where == C.OBJ_DELETED))
                (otmp = 0);
        } else {
            (otmp = C.addinv_nomerge(otmp));
        }
    }
    return otmp;
}

/* When food decays, in the middle of your meal, we don't want to dereference
 * any dangling pointers, so set it to null (which should still trigger
 * do_reset_eat() at the beginning of eatfood()) and check for null pointers
 * in do_reset_eat().
 */
export function food_disappears(obj)

{
    if (C.samePtr(obj, C.svc.context.victual.piece))
        C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece = 0, .o_id = 0 */

    if (obj.timed)
        C.obj_stop_timers(obj);
}

/* renaming an object used to result in it having a different address,
   so the sequence start eating/opening, get interrupted, name the food,
   resume eating/opening would restart from scratch */
export function food_substitution(old_obj, new_obj)

{
    if (C.samePtr(old_obj, C.svc.context.victual.piece)) {
        (C.svc.context.victual.piece = new_obj);
        (C.svc.context.victual.o_id = C.uint(new_obj.o_id));
    }
    if (C.samePtr(old_obj, C.svc.context.tin.tin)) {
        (C.svc.context.tin.tin = new_obj);
        (C.svc.context.tin.o_id = C.uint(new_obj.o_id));
    }
}

export function do_reset_eat()

{
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("do_reset_eat..."); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.svc.context.victual.piece) {
        let otmp;

        (C.svc.context.victual.o_id = C.uint(0));
        (otmp = touchfood(C.svc.context.victual.piece));
        (C.svc.context.victual.piece = otmp);
        if (otmp) {
            (C.svc.context.victual.o_id = C.uint(otmp.o_id));
            recalc_wt();
        }
    }
    (C.svc.context.victual.fullwarn = (C.svc.context.victual.eating = (C.svc.context.victual.doreset = 0)));
    /* Do not set canchoke to FALSE; if we continue eating the same object
     * we need to know if canchoke was set when they started eating it the
     * previous time.  And if we don't continue eating the same object
     * canchoke always gets recalculated anyway.
     */
    C.stop_occupation();
    newuhs(0);
}

/* if 'prop' is only set because of a timed value (so not an intrinsic
   attribute or because of polymorph shape or worn or carried gear), return
   its timeout, otherwise return 0; used by enlightenment */
export function temp_resist(prop)

{
    /* and if not also protected by polymorph form */
    /* and not by worn gear (dragon armor) */
    /* and property is not blocked; we don't expect this, but if it
           is then the timeout doesn't matter so we won't extend that */
    (prop = C.int(C.int(prop)));
    let p = C.u.uprops[prop];
    let timeout = C.long((p.intrinsic & C.TIMEOUT));

    if (((((((timeout && (C.long((p.intrinsic & ~C.TIMEOUT)) == C.long(0n))) ? 1 : 0) && !p.extrinsic) ? 1 : 0) && !p.blocked) ? 1 : 0)) {
        return C.long(timeout);
    }
    return C.long(0n);
}

/* if temporary acid or stoning resistance is timing out while eating
   something which that resistance is protecting against, caller will
   extend resistance's duration so that it times out after meal finishes */
export function eating_dangerous_corpse(res)

{
    (res = C.int(C.int(res)));
    let food;
    let mnum;

    if ((((((((((C.go.occupation == eatfood) && !C.samePtr((food = C.svc.context.victual.piece), 0)) ? 1 : 0) && (food.otyp == C.CORPSE)) ? 1 : 0) && ((mnum = C.int(food.corpsenm)) >= C.LOW_PM)) ? 1 : 0) && ((C.carried(food) || C.obj_here(food, C.u.ux, C.u.uy)) ? 1 : 0)) ? 1 : 0)) {

        if ((((res == C.ACID_RES) && C.acidic(C.mons[mnum])) ? 1 : 0))
            return C.int(1);
        /* flesh_petrifies() includes Medusa as well as touch_petrifies() */
        if ((((res == C.STONE_RES) && C.flesh_petrifies(C.mons[mnum])) ? 1 : 0))
            return C.int(1);
    }
    return C.int(0);
}

/* no longer used */
/* if temp resist against 'prop' is about to timeout, extend it slightly */
/* if hero is being protected from nasty effects of current meal by
       temporary resistance (timed acid resist or timed stoning resist),
       prevent expiration from occurring while the meal is in progress
       so that player doesn't get feedback about becoming more vulnerable
       and then have the hero stay unharmed; has a minor side-effect of
       also extending the protection against other attacks of the sort
       being resisted */


/* called each move during eating process */
export function eatfood()

{
    let food = C.svc.context.victual.piece;

    if (((((food && !C.carried(food)) ? 1 : 0) && !C.obj_here(food, C.u.ux, C.u.uy)) ? 1 : 0))
        (food = 0);
    if (!food) {
        /* maybe it was stolen? */
        do_reset_eat();
        return C.int(0);
    }
    if (!C.svc.context.victual.eating)
        return C.int(0);

    if ((++C.svc.context.victual.usedtime <= C.svc.context.victual.reqtime)) {
        if (bite())
            return C.int(0);
        return C.int(1); /* still busy */
    } else {        /* done */
        done_eating(1);
        return C.int(0);
    }
}

export function done_eating(message)

{
    (message = C.int(C.boolean(message)));
    let piece = C.svc.context.victual.piece;

    (piece.in_use = 1);
    (C.go.occupation = 0); /* do this early, so newuhs() knows we're done */
    newuhs(0);
    if (C.gn.nomovemsg) {
        if (message)
            C.pline1(C.gn.nomovemsg);
        (C.gn.nomovemsg = 0);
    } else if (message) {
        C.You("finish %s %s.",
            (C.samePtr(C.gy.youmonst.data, C.mons[C.PM_FIRE_ELEMENTAL]) ? "consuming" : "eating"),
            food_xname(piece, 1));
    }

    if ((((piece.otyp == C.CORPSE) || piece.globby) ? 1 : 0))
        C.callLocal(cpostfx, piece.corpsenm);
    else
        fpostfx(piece);

    if (C.carried(piece))
        C.useup(piece);
    else
        C.useupf(piece, 1n);

    C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece = 0, .o_id = 0 */
}

export function eating_conducts(pd)

{
    let ll_conduct = C.int(0);

    if (!C.u.uconduct.food++) {
        C.livelog_printf(C.LL_CONDUCT, "ate for the first time - %s",
                       pd.pmnames[C.NEUTRAL]);
        ll_conduct++;
    }
    if (!C.vegan(pd)) {
        if (((!C.u.uconduct.unvegan++ && !ll_conduct) ? 1 : 0)) {
            C.livelog_printf(C.LL_CONDUCT,
                           "consumed animal products (%s) for the first time",
                           pd.pmnames[C.NEUTRAL]);
            ll_conduct++;
        }
    }
    if (!C.vegetarian(pd)) {
        if (((!C.u.uconduct.unvegetarian && !ll_conduct) ? 1 : 0))
            C.livelog_printf(C.LL_CONDUCT, "tasted meat (%s) for the first time",
                           pd.pmnames[C.NEUTRAL]);
        violated_vegetarian();
    }
}

/* handle side-effects of mind flayer's tentacle attack */
export function eat_brains(
    magr,
    mdef,
    visflag,
    dmg_p)
 /* for dishing out extra damage in lieu of Int loss */
{
    (visflag = C.int(C.boolean(visflag)));
    let pd = mdef.data;
    let give_nutrit = C.int(0);
    let result = C.int(C.M_ATTK_HIT), xtra_dmg = C.int(C.rnd(10, 611, "eat_brains"));

    /* previous tentacle attack might have triggered fatal passive
       counterattack [callers ought to be updated to avoid this situation] */
    if (((!C.samePtr(magr, C.gy.youmonst) && C.DEADMONSTER(magr)) ? 1 : 0)) {
        return C.int(C.M_ATTK_AGR_DIED);
    }

    if (C.noncorporeal(pd)) {
        if (visflag)
            C.pline("%s brain is unharmed.",
                  (C.samePtr(mdef, C.gy.youmonst) ? "Your" : C.s_suffix(C.Monnam(mdef))));
        return C.int(C.M_ATTK_MISS); /* side-effects can't occur */
    } else if (C.samePtr(magr, C.gy.youmonst)) {
        C.You("eat %s brain!", C.s_suffix(C.mon_nam(mdef)));
    } else if (C.samePtr(mdef, C.gy.youmonst)) {
        C.Your("brain is eaten!");
    } else { /* monster against monster */
        if (((visflag && C.canspotmon(mdef)) ? 1 : 0))
            C.pline("%s brain is eaten!", C.s_suffix(C.Monnam(mdef)));
    }

    if (C.flesh_petrifies(pd)) {
        /* mind flayer has attempted to eat the brains of a petrification
           inducing critter (most likely Medusa; attacking a cockatrice via
           tentacle-touch should have been caught before reaching this far) */
        if (C.samePtr(magr, C.gy.youmonst)) {
            if (((!C.Stone_resistance && !C.Stoned) ? 1 : 0))
                C.make_stoned(5n, 0, C.KILLED_BY_AN,
                            C.pmname(pd, C.Mgender(mdef)));
        } else {
            /* no need to check for poly_when_stoned or Stone_resistance;
               mind flayers don't have those capabilities */
            if (((visflag && C.canseemon(magr)) ? 1 : 0))
                C.pline("%s turns to stone!", C.Monnam(magr));
            C.monstone(magr);
            if (!C.DEADMONSTER(magr)) {
                /* life-saved; don't continue eating the brains */
                return C.int(C.M_ATTK_MISS);
            } else {
                if (((magr.mtame && !visflag) ? 1 : 0))
                    /* parallels mhitm.c's brief_feeling */
                    C.You("have a sad thought for a moment, then it passes.");
                return C.int(C.M_ATTK_AGR_DIED);
            }
        }
    }

    if (C.samePtr(magr, C.gy.youmonst)) {
        /*
         * player mind flayer is eating something's brain
         */
        eating_conducts(pd);
        if (C.mindless(pd)) { /* (cannibalism not possible here) */
            C.pline("%s doesn't notice.", C.Monnam(mdef));
            /* all done; no extra harm inflicted upon target */
            return C.int(C.M_ATTK_MISS);
        } else if (C.is_rider(pd)) {
            C.pline("Ingesting that is fatal.");
            C.Sprintf(C.svk.killer.name, "unwisely ate the brain of %s",
                    C.pmname(pd, C.Mgender(mdef)));
            (C.svk.killer.format = C.int(C.NO_KILLER_PREFIX));
            C.done(C.DIED);
            /* life-saving needed to reach here */
            C.exercise(C.A_WIS, 0);
            (dmg_p.value = C.int((dmg_p.value) + (xtra_dmg))); /* Rider takes extra damage */
        } else {
            morehungry(-C.rnd(30, 678, "eat_brains")); /* cannot choke */
            if ((C.u.acurr.a[C.A_INT] < C.u.amax.a[C.A_INT])) {
                /* recover lost Int; won't increase current max */
                (C.u.acurr.a[C.A_INT] = C.int((C.u.acurr.a[C.A_INT]) + (C.rnd(4, 681, "eat_brains"))));
                if ((C.u.acurr.a[C.A_INT] > C.u.amax.a[C.A_INT]))
                    (C.u.acurr.a[C.A_INT] = C.int(C.u.amax.a[C.A_INT]));
                (C.disp.botl = C.int(1));
            }
            C.exercise(C.A_WIS, 1);
            (dmg_p.value = C.int((dmg_p.value) + (xtra_dmg)));
        }
        /* targeting another mind flayer or your own underlying species
           is cannibalism */
        maybe_cannibal(C.monsndx(pd), 1);

    } else if (C.samePtr(mdef, C.gy.youmonst)) {
        /*
         * monster mind flayer is eating hero's brain
         */
        /* no such thing as mindless players */
        if ((C.u.acurr.a[C.A_INT] <= C.ATTRMIN(C.A_INT))) {
            const brainlessness = "brainlessness";

            if (C.Lifesaved) {
                C.Strcpy(C.svk.killer.name, brainlessness);
                (C.svk.killer.format = C.int(C.KILLED_BY));
                C.done(C.DIED);
                /* amulet of life saving has now been used up */
                C.pline("Unfortunately your brain is still gone.");
                /* sanity check against adding other forms of life-saving */
                (C.u.uprops[C.LIFESAVED].extrinsic = C.long((C.u.uprops[C.LIFESAVED].intrinsic = C.long(0n))));
            } else {
                C.Your("last thought fades away.");
            }
            C.Strcpy(C.svk.killer.name, brainlessness);
            (C.svk.killer.format = C.int(C.KILLED_BY));
            C.done(C.DIED);
            /* can only get here when in wizard or explore mode and user has
               explicitly chosen not to die; arbitrarily boost intelligence */
            (C.u.acurr.a[C.A_INT] = C.int((C.ATTRMIN(C.A_INT) + 2)));
            C.You_feel("like a scarecrow.");
        }
        (give_nutrit = C.int(1)); /* in case a conflicted pet is doing this */
        C.exercise(C.A_WIS, 0);
        /* caller handles Int and memory loss */

    } else { /* mhitm */
        /*
         * monster mind flayer is eating another monster's brain
         */
        if (C.mindless(pd)) {
            if (((visflag && C.canspotmon(mdef)) ? 1 : 0))
                C.pline("%s doesn't notice.", C.Monnam(mdef));
            return C.int(C.M_ATTK_MISS);
        } else if (C.is_rider(pd)) {
            C.mondied(magr);
            if (C.DEADMONSTER(magr))
                (result = C.int(C.M_ATTK_AGR_DIED));
            /* Rider takes extra damage regardless of whether attacker dies */
            (dmg_p.value = C.int((dmg_p.value) + (xtra_dmg)));
        } else {
            (dmg_p.value = C.int((dmg_p.value) + (xtra_dmg)));
            (give_nutrit = C.int(1));
            if ((((((dmg_p.value >= mdef.mhp) && visflag) ? 1 : 0) && C.canspotmon(mdef)) ? 1 : 0))
                C.pline("%s last thought fades away...",
                      C.s_suffix(C.Monnam(mdef)));
        }
    }

    if (((((give_nutrit && magr.mtame) ? 1 : 0) && !magr.isminion) ? 1 : 0)) {
        C.EDOG(magr).hungrytime += C.rnd(60, 749, "eat_brains");
        (magr.mconf = 0);
    }

    return C.int(result);
}

/* eating a corpse or egg of one's own species is usually naughty */
export function maybe_cannibal(pm, allowmsg)

{
    /* non-cannibalistic heroes shouldn't eat own species ever
           and also shouldn't eat current species when polymorphed
           (even if having the form of something which doesn't care
           about cannibalism--hero's innate traits aren't altered) */
    (pm = C.int(C.int(pm))); (allowmsg = C.int(C.boolean(allowmsg)));
    const ate_brains = C.staticCell("maybe_cannibal.ate_brains", "BigInt64");
    let fptr = C.mons[pm]; /* food type */

    /* when poly'd into a mind flayer, multiple tentacle hits in one
       turn cause multiple digestion checks to occur; avoid giving
       multiple luck penalties for the same attack */
    if ((C.long(C.svm.moves) == C.long(ate_brains.value)))
        return C.int(0);
    (ate_brains.value = C.long(C.svm.moves)); /* ate_anything, not just brains... */

    if (((!(((C.Role_if(C.PM_CAVE_DWELLER) || C.Race_if(C.PM_ORC)) ? 1 : 0)) && ((((C.your_race(fptr) || ((C.Upolyd && C.same_race(C.gy.youmonst.data, fptr)) ? 1 : 0)) ? 1 : 0) || ((C.ismnum(C.u.ulycn) && (C.were_beastie(pm) == C.u.ulycn)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) {
        if (allowmsg) {
            if (((C.Upolyd && C.your_race(fptr)) ? 1 : 0))
                C.You("have a bad feeling deep inside.");
            C.You("cannibal!  You will regret this!");
        }
        (C.HAggravate_monster = C.long(C.long(C.long(C.HAggravate_monster) | C.long(C.FROMOUTSIDE))));
        C.change_luck(-C.int(C.int((C.rn2(4, 784, "maybe_cannibal")) + (2)))); /* -5..-2 */
        return C.int(1);
    }
    return C.int(0);
}

export function cprefx(pm)

{
    /* Null for tins */
    /* paranoia */
    (pm = C.int(C.int(pm)));
    maybe_cannibal(pm, 1);
    if (C.flesh_petrifies(C.mons[pm])) {
        if (((!C.Stone_resistance && !(((C.poly_when_stoned(C.gy.youmonst.data) && C.polymon(C.PM_STONE_GOLEM)) ? 1 : 0))) ? 1 : 0)) {
            /* if food was a tin, use it up early to keep it out of bones */
            if (C.svc.context.tin.tin)
                use_up_tin(C.svc.context.tin.tin);

            C.Sprintf(C.svk.killer.name, "tasting %s meat",
                    C.mons[pm].pmnames[C.NEUTRAL]);
            (C.svk.killer.format = C.int(C.KILLED_BY));
            C.You("turn to stone.");
            C.done(C.STONING);
            if (C.svc.context.victual.piece)
                (C.svc.context.victual.eating = 0);
            return; /* lifesaved */
        }
    }

    switch (pm) {
    case C.PM_LITTLE_DOG:
    case C.PM_DOG:
    case C.PM_LARGE_DOG:
    case C.PM_KITTEN:
    case C.PM_HOUSECAT:
    case C.PM_LARGE_CAT:
        /* cannibals are allowed to eat domestic animals without penalty */
        if (!(((C.Role_if(C.PM_CAVE_DWELLER) || C.Race_if(C.PM_ORC)) ? 1 : 0))) {
            C.You_feel("that eating the %s was a bad idea.",
                     C.mons[pm].pmnames[C.NEUTRAL]);
            (C.HAggravate_monster = C.long(C.long(C.long(C.HAggravate_monster) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.PM_LIZARD:
        if (C.Stoned)
            C.callLocal(fix_petrification);
        break;
    case C.PM_DEATH:
    case C.PM_PESTILENCE:
    case C.PM_FAMINE: {
        C.pline("Eating that is instantly fatal.");
        C.Sprintf(C.svk.killer.name, "unwisely ate the body of %s",
                C.mons[pm].pmnames[C.NEUTRAL]);
        (C.svk.killer.format = C.int(C.NO_KILLER_PREFIX));
        C.done(C.DIED);
        /* life-saving needed to reach here */
        C.exercise(C.A_WIS, 0);
        /* revive an actual corpse; can't do that if it was a tin;
           5.0: this used to assume that such tins were impossible but
           they can be wished for in wizard mode; they can't make it
           to normal play though because bones creation empties them */
        if (((((C.svc.context.victual.piece && (C.svc.context.victual.piece.otyp == C.CORPSE)) ? 1 : 0) && C.revive_corpse(C.svc.context.victual.piece)) ? 1 : 0))
            C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece=0, .o_id=0 */
        return;
    }
    case C.PM_GREEN_SLIME:
        if (((((!C.Slimed && !C.Unchanging) ? 1 : 0) && !C.slimeproof(C.gy.youmonst.data)) ? 1 : 0)) {
            C.You("don't feel very well.");
            C.make_slimed(10n, 0);
            C.delayed_killer(C.SLIMED, C.KILLED_BY_AN, "");
        }
        
    /* Fall through */
    default:
        if (((C.acidic(C.mons[pm]) && C.Stoned) ? 1 : 0))
            C.callLocal(fix_petrification);
        break;
    }
}

export function fix_petrification()

{
    const buf=C.stackAlloc(C.BUFSZ);

    if (C.Hallucination)
        C.Sprintf(buf, "What a pity--you just ruined a future piece of %sart!",
                ((C.ACURR(C.A_CHA) > 15) ? "fine " : ""));
    else
        C.Strcpy(buf, "You feel limber!");
    C.make_stoned(0n, buf, 0, 0);
}

/*
 * If you add an intrinsic that can be gotten by eating a monster, add it
 * to intrinsic_possible() and givit().  (It must already be in prop.h to
 * be an intrinsic property.)
 * It would be very easy to make the intrinsics not try to give you one
 * that you already had by checking to see if you have it in
 * intrinsic_possible() instead of givit(), but we're not that nice.
 */

/* intrinsic_possible() returns TRUE iff a monster can give an intrinsic. */
/* Original TU macro, expanded at its original uses:
#define ifdebugresist(Msg)      \
    do {                        \
        if (res)                \
            debugpline0(Msg);   \
    } while (0)
*/
export function intrinsic_possible(type, ptr)

{
    (type = C.int(C.int(type)));
    let res = C.int(0);

    switch (type) {
    case C.FIRE_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_FIRE)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get fire resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.SLEEP_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_SLEEP)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get sleep resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.COLD_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_COLD)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get cold resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.DISINT_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_DISINT)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get disintegration resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.SHOCK_RES: /* shock (electricity) resistance */
        (res = C.int((C.int((ptr.mconveys) & (C.MR_ELEC)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get shock resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.POISON_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_POISON)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get poison resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.ACID_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_ACID)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get acid resistance temporarily"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.STONE_RES:
        (res = C.int((C.int((ptr.mconveys) & (C.MR_STONE)) != 0)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get stoning resistance temporarily"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.TELEPORT:
        (res = C.int(C.can_teleport(ptr)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get teleport"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.TELEPORT_CONTROL:
        (res = C.int(C.control_teleport(ptr)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get teleport control"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    case C.TELEPAT:
        (res = C.int(C.telepathic(ptr)));
        if (((res && C.debugcore("eat.c",1)) ? 1 : 0)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("can get telepathy"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    default:
        /* res stays 0 */
        break;
    }
    return C.int(res);
}

/* The "do we or do we not give the intrinsic" logic from givit(), extracted
 * into its own function. Depends on the monster's level and the type of
 * intrinsic it is trying to give you.
 */
export function should_givit(type, ptr)

{
    (type = C.int(C.int(type)));
    let chance;

    /* some intrinsics are easier to get than others */
    switch (type) {
    case C.POISON_RES:
        if (((((C.samePtr(ptr, C.mons[C.PM_KILLER_BEE]) || C.samePtr(ptr, C.mons[C.PM_SCORPION])) ? 1 : 0) && !C.rn2(4, 969, "should_givit")) ? 1 : 0))
            (chance = C.int(1));
        else
            (chance = C.int(15));
        break;
    case C.TELEPORT:
        (chance = C.int(10));
        break;
    case C.TELEPORT_CONTROL:
        (chance = C.int(12));
        break;
    case C.TELEPAT:
        (chance = C.int(1));
        break;
    default:
        (chance = C.int(15));
        break;
    }

    return C.int((ptr.mlevel > C.rn2(chance, 988, "should_givit")));
}

export function temp_givit(type, ptr)

{
    (type = C.int(C.int(type)));
    let chance = C.int(((type == C.STONE_RES) ? 6 : ((type == C.ACID_RES) ? 3 : 0)));

    return C.int((chance ? (ptr.mlevel > C.rn2(chance, 996, "temp_givit")) : 0));
}

/* givit() tries to give you an intrinsic based on the monster's level
 * and what type of intrinsic it is trying to give you.
 */
export function givit(type, ptr)

{
    (type = C.int(C.int(type)));
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Attempting to give intrinsic %d", type); (C.iflags.last_msg = C.int(save_plnmsg)); }

    if (((!should_givit(type, ptr) && !temp_givit(type, ptr)) ? 1 : 0))
        return;

    switch (type) {
    case C.FIRE_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give fire resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HFire_resistance) & C.long(C.FROMOUTSIDE))))) {
            C.You((C.Hallucination ? "be chillin'." : "feel a momentary chill."));
            (C.HFire_resistance = C.long(C.long(C.long(C.HFire_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.SLEEP_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give sleep resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HSleep_resistance) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel("wide awake.");
            (C.HSleep_resistance = C.long(C.long(C.long(C.HSleep_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.COLD_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give cold resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HCold_resistance) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel("full of hot air.");
            (C.HCold_resistance = C.long(C.long(C.long(C.HCold_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.DISINT_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give disintegration resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HDisint_resistance) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel((C.Hallucination ? "totally together, man." : "very firm."));
            (C.HDisint_resistance = C.long(C.long(C.long(C.HDisint_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.SHOCK_RES: /* shock (electricity) resistance */
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give shock resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HShock_resistance) & C.long(C.FROMOUTSIDE))))) {
            if (C.Hallucination)
                C.You_feel("grounded in reality.");
            else
                C.Your("health currently feels amplified!");
            (C.HShock_resistance = C.long(C.long(C.long(C.HShock_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.POISON_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give poison resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HPoison_resistance) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel((C.Poison_resistance ? "especially healthy." : "healthy."));
            (C.HPoison_resistance = C.long(C.long(C.long(C.HPoison_resistance) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.TELEPORT:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give teleport"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HTeleportation) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel((C.Hallucination ? "diffuse." : "very jumpy."));
            (C.HTeleportation = C.long(C.long(C.long(C.HTeleportation) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.TELEPORT_CONTROL:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give teleport control"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HTeleport_control) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel((C.Hallucination ? "centered in your personal space." : "in control of yourself."));
            (C.HTeleport_control = C.long(C.long(C.long(C.HTeleport_control) | C.long(C.FROMOUTSIDE))));
        }
        break;
    case C.TELEPAT:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Trying to give telepathy"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!(C.long((C.long(C.HTelepat) & C.long(C.FROMOUTSIDE))))) {
            C.You_feel((C.Hallucination ? "in touch with the cosmos." : "a strange mental acuity."));
            (C.HTelepat = C.long(C.long(C.long(C.HTelepat) | C.long(C.FROMOUTSIDE))));
            /* If blind, make sure monsters show up. */
            if (C.Blind)
                C.see_monsters();
        }
        break;
    case C.ACID_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Giving timed acid resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!C.Acid_resistance)
            C.You_feel("%s.", (C.Hallucination ? "secure from flashbacks" : "less concerned about being harmed by acid"));
        C.incr_itimeout(C.propertyReference("HAcid_resistance"), C.d(3, 6, 1087, "givit"));
        break;
    case C.STONE_RES:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Giving timed stoning resistance"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        if (!C.Stone_resistance)
            C.You_feel("%s.", (C.Hallucination ? "unusually limber" : "less concerned about becoming petrified"));
        C.incr_itimeout(C.propertyReference("HStone_resistance"), C.d(3, 6, 1094, "givit"));
        break;
    default:
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Tried to give an impossible intrinsic"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        break;
    }
}

export function eye_of_newt_buzz()

{
    /* MRKR: "eye of newt" may give small magical energy boost */
    if (((C.rn2(3, 1106, "eye_of_newt_buzz") || (Math.imul(3, C.u.uen) <= Math.imul(2, C.u.uenmax))) ? 1 : 0)) {
        let old_uen = C.int(C.u.uen);

        (C.u.uen = C.int((C.u.uen) + (C.rnd(3, 1109, "eye_of_newt_buzz"))));
        if ((C.u.uen > C.u.uenmax)) {
            if (!C.rn2(3, 1111, "eye_of_newt_buzz")) {
                C.u.uenmax++;
                if ((C.u.uenmax > C.u.uenpeak))
                    (C.u.uenpeak = C.int(C.u.uenmax));
            }
            (C.u.uen = C.int(C.u.uenmax));
        }
        if ((old_uen != C.u.uen)) {
            C.You_feel("a mild buzz.");
            (C.disp.botl = C.int(1));
        }
    }
}

// DISABLE_WARNING_FORMAT_NONLITERAL

/* called after completely consuming a corpse */
export function cpostfx(pm)

{
    (pm = C.int(C.int(pm)));
    let tmp = C.int(0);
    let catch_lycanthropy = C.int(C.NON_PM);
    let check_intrinsics = C.int(0);

    /* in case `afternmv' didn't get called for previously mimicking
       gold, clean up now to avoid `eatmbuf' memory leak */
    if (C.ge.eatmbuf)
        eatmdone();

    switch (pm) {
    case C.PM_WRAITH:
        C.pluslvl(0);
        break;
    case C.PM_HUMAN_WERERAT:
        (catch_lycanthropy = C.int(C.PM_WERERAT));
        break;
    case C.PM_HUMAN_WEREJACKAL:
        (catch_lycanthropy = C.int(C.PM_WEREJACKAL));
        break;
    case C.PM_HUMAN_WEREWOLF:
        (catch_lycanthropy = C.int(C.PM_WEREWOLF));
        break;
    case C.PM_NURSE:
        if (C.Upolyd)
            (C.u.mh = C.int(C.u.mhmax));
        else
            (C.u.uhp = C.int(C.u.uhpmax));
        C.make_blinded(0n, !C.u.ucreamed);
        (C.disp.botl = C.int(1));
        (check_intrinsics = C.int(1)); /* might also convey poison resistance */
        break;
    case C.PM_STALKER:
        if (!C.Invis) {
            C.set_itimeout(C.propertyReference("HInvis"), C.long(C.int(C.int((C.rn2(100, 1164, "cpostfx")) + (50)))));
            if (((!C.Blind && !C.BInvis) ? 1 : 0))
                C.self_invis_message();
        } else {
            if (!(C.long((C.long(C.HInvis) & C.long(C.INTRINSIC)))))
                C.You_feel("hidden!");
            (C.HInvis = C.long(C.long(C.long(C.HInvis) | C.long(C.FROMOUTSIDE))));
            (C.HSee_invisible = C.long(C.long(C.long(C.HSee_invisible) | C.long(C.FROMOUTSIDE))));
        }
        C.newsym(C.u.ux, C.u.uy);
        
        /*FALLTHRU*/
    case C.PM_YELLOW_LIGHT:
    case C.PM_GIANT_BAT:
        C.make_stunned(C.long((C.long(C.long((C.long(C.HStun) & C.long(C.TIMEOUT)))) + C.long(30n))), 0);
        
        /*FALLTHRU*/
    case C.PM_BAT:
        C.make_stunned(C.long((C.long(C.long((C.long(C.HStun) & C.long(C.TIMEOUT)))) + C.long(30n))), 0);
        break;
    case C.PM_GIANT_MIMIC:
        (tmp = C.int((tmp) + (10)));
        
        /*FALLTHRU*/
    case C.PM_LARGE_MIMIC:
        (tmp = C.int((tmp) + (20)));
        
        /*FALLTHRU*/
    case C.PM_SMALL_MIMIC:
        (tmp = C.int((tmp) + (20)));
        if ((((C.gy.youmonst.data.mlet != C.S_MIMIC) && !C.Unchanging) ? 1 : 0)) {
            const buf=C.stackAlloc(C.BUFSZ);
            let tempshape = (!C.Hallucination ? "a pile of gold" : "an orange");

            if (!C.u.uconduct.polyselfs++) /* you're changing form */
                C.livelog_printf(C.LL_CONDUCT,
                            "changed form for the first time by mimicking %s",
                               tempshape);
            C.You_cant("resist the temptation to mimic %s.", tempshape);
            /* A pile of gold can't ride. */
            if (C.u.usteed)
                C.dismount_steed(C.DISMOUNT_FELL);
            C.nomul(-tmp);
            (C.gm.multi_reason = "pretending to be a pile of gold");
            C.Sprintf(buf,
                    (C.Hallucination ? "You suddenly dread being peeled and mimic %s again!" : "You now prefer mimicking %s again."),
                    C.an((C.Upolyd ? C.pmname(C.gy.youmonst.data, C.Ugender) : C.gu.urace.noun)));
            (C.ge.eatmbuf = C.dupstr(buf));
            (C.gn.nomovemsg = C.ge.eatmbuf);
            (C.ga.afternmv = eatmdone);
            /* ??? what if this was set before? */
            (C.gy.youmonst.m_ap_type = C.int(C.M_AP_OBJECT));
            (C.gy.youmonst.mappearance = C.uint((C.Hallucination ? C.ORANGE : C.GOLD_PIECE)));
            C.newsym(C.u.ux, C.u.uy);
            C.curs_on_u();
            /* make gold symbol show up now */
            C.display_nhwindow(C.WIN_MAP, 1);
        }
        break;
    case C.PM_QUANTUM_MECHANIC:
        C.Your("velocity suddenly seems very uncertain!");
        if (C.long((C.long(C.HFast) & C.long(C.INTRINSIC)))) {
            (C.HFast = C.long(C.long(C.long(C.HFast) & C.long(~C.INTRINSIC))));
            C.You("seem slower.");
        } else {
            (C.HFast = C.long(C.long(C.long(C.HFast) | C.long(C.FROMOUTSIDE))));
            C.You("seem faster.");
        }
        break;
    case C.PM_LIZARD:
        if ((C.long(C.long((C.long(C.HStun) & C.long(C.TIMEOUT)))) > C.long(2)))
            C.make_stunned(2n, 0);
        if ((C.long(C.long((C.long(C.HConfusion) & C.long(C.TIMEOUT)))) > C.long(2)))
            C.make_confused(2n, 0);
        (check_intrinsics = C.int(1)); /* might convey temporary stoning resist */
        break;
    case C.PM_CHAMELEON:
    case C.PM_DOPPELGANGER:
    case C.PM_SANDESTIN: /* moot--they don't leave corpses */
    case C.PM_GENETIC_ENGINEER:
        if (C.Unchanging) {
            C.You_feel("momentarily different."); /* same as poly trap */
        } else {
            /* polyself() is potentially fatal; if food is a tin, use it up
               early to keep it out of bones */
            if (C.svc.context.tin.tin) {
                use_up_tin(C.svc.context.tin.tin);
                /* most tin effects end up being skipped */
                lesshungry(C.int((200) + ((C.metallivorous(C.gy.youmonst.data) ? 5 : 0))));
            }

            C.You("%s.", ((pm == C.PM_GENETIC_ENGINEER) ? "undergo a freakish metamorphosis" : "feel a change coming over you"));
            C.polyself(C.POLY_NOFLAGS);
        }
        break;
    case C.PM_DISPLACER_BEAST:
        if (!C.Displaced) /* give a message (before setting the timeout) */
            C.toggle_displacement(0, 0n, 1);
        C.incr_itimeout(C.propertyReference("HDisplaced"), C.d(6, 6, 1268, "cpostfx"));
        break;
    case C.PM_DISENCHANTER:
        /* picks an intrinsic at random and removes it; there's
           no feedback if hero already lacks the chosen ability */
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("using attrcurse to strip an intrinsic"); (C.iflags.last_msg = C.int(save_plnmsg)); }
        C.attrcurse();
        break;
    case C.PM_DEATH:
    case C.PM_PESTILENCE:
    case C.PM_FAMINE:
        /* life-saved; don't attempt to confer any intrinsics */
        break;
    case C.PM_MIND_FLAYER:
    case C.PM_MASTER_MIND_FLAYER:
        if ((C.u.acurr.a[C.A_INT] < C.ATTRMAX(C.A_INT))) {
            if (!C.rn2(2, 1284, "cpostfx")) {
                C.pline("Yum!  That was real brain food!");
                C.adjattrib(C.A_INT, 1, 0);
                break; /* don't give them telepathy, too */
            }
        } else {
            C.pline("For some reason, that tasted bland.");
        }
        
    /*FALLTHRU*/
    default:
        (check_intrinsics = C.int(1));
        break;
    }

    /* possibly convey an intrinsic */
    if (check_intrinsics) {
        let ptr = C.mons[pm];

        if (((((C.dmgtype(ptr, C.AD_STUN) || C.dmgtype(ptr, C.AD_HALU)) ? 1 : 0) || (pm == C.PM_VIOLET_FUNGUS)) ? 1 : 0)) {
            C.pline("Oh wow!  Great stuff!");
            C.make_hallucinated(C.long((C.long(C.long((C.long(C.HHallucination) & C.long(C.TIMEOUT)))) + C.long(200n))), 0,
                                     0n);
        }

        /* Eating magical monsters can give you some magical energy. */
        if (((C.attacktype(ptr, C.AT_MAGC) || (pm == C.PM_NEWT)) ? 1 : 0))
            eye_of_newt_buzz();

        (tmp = C.int(corpse_intrinsic(ptr)));

        /* if something was chosen, give it now (givit() might fail) */
        if ((tmp == -1))
            C.gainstr(0, 0, 1);
        else if ((tmp > 0))
            givit(tmp, ptr);
    } /* check_intrinsics */

    if (C.ismnum(catch_lycanthropy)) {
        C.set_ulycn(catch_lycanthropy);
        C.retouch_equipment(2);
    }
    return;
}

// RESTORE_WARNING_FORMAT_NONLITERAL

/* Choose (one of) the intrinsics granted by a corpse, and return it.
 * If this corpse gives no intrinsics, return 0.
 * For the special not-real-prop cases of strength gain from giants
 * return fake prop value of -1.
 * Non-deterministic; should only be called once per corpse.
 */
export function corpse_intrinsic(ptr)

{
    /* Check the monster for all of the intrinsics.  If this
     * monster can give more than one, pick one to try to give
     * from among all it can give.
     */
    let conveys_STR = C.int(C.is_giant(ptr));
    let i;
    let count = C.int(0); /* number of possible intrinsics */
    let prop = C.int(0);   /* which one we will try to give */

    if (conveys_STR) {
        (count = C.int(1));
        (prop = C.int(-1)); /* use -1 as fake prop index for STR */
        if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("\"Intrinsic\" strength, %d", prop); (C.iflags.last_msg = C.int(save_plnmsg)); }
    }
    for ((i = C.int(1)); (i <= C.LAST_PROP); i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        /* a 1 in count chance of replacing the old choice
           with this one, and a count-1 in count chance
           of keeping the old choice (note that 1 in 1 and
           0 in 1 are what we want for the first candidate) */
        if (!C.rn2(count, 1363, "corpse_intrinsic")) {
            if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("Intrinsic %d replacing %d", i, prop); (C.iflags.last_msg = C.int(save_plnmsg)); }
            (prop = C.int(i));
        }
    }
    /* if strength is the only candidate, give it 50% chance */
    if (((((conveys_STR && (count == 1)) ? 1 : 0) && !C.rn2(2, 1369, "corpse_intrinsic")) ? 1 : 0))
        (prop = C.int(0));

    return C.int(prop);
}

export function violated_vegetarian()

{
    C.u.uconduct.unvegetarian++;
    if (C.Role_if(C.PM_MONK)) {
        C.You_feel("guilty.");
        C.adjalign(-1);
    }
    return;
}

/* common code to check and possibly charge for 1 svc.context.tin.tin,
 * will split() svc.context.tin.tin if necessary */
export function costly_tin(alter_type)
 /* COST_xxx */
{
    (alter_type = C.int(C.int(alter_type)));
    let tin = C.svc.context.tin.tin;

    if ((C.carried(tin) ? tin.unpaid : ((C.costly_spot(tin.ox, tin.oy) && !tin.no_charge) ? 1 : 0))) {
        if ((C.long(tin.quan) > C.long(1n))) {
            (tin = (C.svc.context.tin.tin = C.splitobj(tin, 1n)));
            (C.svc.context.tin.o_id = C.uint(tin.o_id));
        }
        C.costly_alteration(tin, alter_type);
    }
    return tin;
}

export function tin_variety_txt(s, tinvariety)

{
    let k, l;

    if (((s && tinvariety) ? 1 : 0)) {
        (tinvariety.value = C.int(-1));
        for ((k = C.int(0)); (k < (C.tintxts.length - 1)); ++k) {
            (l = C.int(C.int(C.strlen(C.tintxts[k].txt))));
            if (((((!C.strncmpi(s, C.tintxts[k].txt, l) && (C.int(C.strlen(s)) > l)) ? 1 : 0) && (C.loadChar((s + l)) == 32)) ? 1 : 0)) {
                (tinvariety.value = C.int(k));
                return C.int(C.int((l) + (1)));
            }
        }
    }
    return C.int(0);
}

/*
 * This assumes that buf already contains the word "tin",
 * as is the case with caller xname().
 */
export function tin_details(obj, mnum, buf)

{
    (mnum = C.int(C.int(mnum)));
    const buf2=C.stackAlloc(C.BUFSZ);

    if (((!obj || !buf) ? 1 : 0))
        return;

    let r = C.int(tin_variety(obj, 1));

    if ((r == C.SPINACH_TIN))
        C.Strcat(buf, " of spinach");
    else if ((mnum == C.NON_PM))
        C.Strcpy(buf, "empty tin");
    else {
        if (((((obj.cknown || C.iflags.override_ID) ? 1 : 0) && (obj.spe < 0)) ? 1 : 0)) {
            if ((((r == C.ROTTEN_TIN) || (C.long(r) == C.long(C.HOMEMADE_TIN))) ? 1 : 0)) {
                /* put these before the word tin */
                C.Sprintf(buf2, "%s %s of ", C.tintxts[r].txt, buf);
                C.Strcpy(buf, buf2);
            } else {
                C.Sprintf(C.eos(buf), " of %s ", C.tintxts[r].txt);
            }
        } else {
            C.Strcpy(C.eos(buf), " of ");
        }
        if (C.vegetarian(C.mons[mnum]))
            C.Sprintf(C.eos(buf), "%s", C.mons[mnum].pmnames[C.NEUTRAL]);
        else
            C.Sprintf(C.eos(buf), "%s meat", C.mons[mnum].pmnames[C.NEUTRAL]);
    }
}

export function set_tin_variety(obj, forcetype)

{
    /* empty or already spinach */
    (forcetype = C.int(C.int(forcetype)));
    let r, mnum = C.int(obj.corpsenm);

    if ((((forcetype == C.SPINACH_TIN) || (((C.long(forcetype) == C.long(C.HEALTHY_TIN)) && (((mnum == C.NON_PM) || !C.vegetarian(C.mons[mnum])) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) { /* replace meat */
        (obj.corpsenm = C.int(C.NON_PM)); /* not based on any monster */
        (obj.spe = C.int(1));           /* spinach */
        return;
    } else if ((C.long(forcetype) == C.long(C.HEALTHY_TIN))) {
        (r = C.int(tin_variety(obj, 0)));
        if ((((r < 0) || (r >= C.tintxts.length)) ? 1 : 0))
            (r = C.int(C.ROTTEN_TIN)); /* shouldn't happen */
        while ((((((r == C.ROTTEN_TIN) && !obj.cursed) ? 1 : 0) || !C.tintxts[r].fodder) ? 1 : 0))
            (r = C.int(C.rn2((C.tintxts.length - 1), 1477, "set_tin_variety")));
    } else if ((((forcetype >= 0) && (forcetype < (C.tintxts.length - 1))) ? 1 : 0)) {
        (r = C.int(forcetype));
    } else {               /* RANDOM_TIN */
        (r = C.int(C.rn2((C.tintxts.length - 1), 1481, "set_tin_variety"))); /* take your pick */
        if ((((r == C.ROTTEN_TIN) && ((C.ismnum(mnum) && (((((((mnum == C.PM_LIZARD) || (mnum == C.PM_LICHEN)) ? 1 : 0) || C.is_rider(C.mons[mnum])) ? 1 : 0) || (mnum == C.PM_ACID_BLOB)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
            (r = C.int(C.HOMEMADE_TIN)); /* lizards don't rot */
    }
    (obj.spe = C.int(-(C.int((r) + (1))))); /* offset by 1 to allow index 0 */
}

export function tin_variety(
    obj,
    displ)
 /* we're just displaying so leave things alone */
{
    (displ = C.int(C.boolean(displ)));
    let r, mnum = C.int(obj.corpsenm);

    if ((obj.spe == 1)) {
        (r = C.int(C.SPINACH_TIN));
    } else if (obj.cursed) {
        (r = C.int(C.ROTTEN_TIN)); /* always rotten if cursed */
    } else if ((obj.spe < 0)) {
        (r = C.int(-(obj.spe)));
        --r; /* get rid of the offset */
    } else {
        (r = C.int(C.rn2((C.tintxts.length - 1), 1503, "tin_variety")));
    }

    if (((((((!displ && (C.long(r) == C.long(C.HOMEMADE_TIN))) ? 1 : 0) && !obj.blessed) ? 1 : 0) && !C.rn2(7, 1506, "tin_variety")) ? 1 : 0))
        (r = C.int(C.ROTTEN_TIN)); /* some homemade tins go bad */

    if ((((r == C.ROTTEN_TIN) && ((C.ismnum(mnum) && (((((((mnum == C.PM_LIZARD) || (mnum == C.PM_LICHEN)) ? 1 : 0) || C.is_rider(C.mons[mnum])) ? 1 : 0) || (mnum == C.PM_ACID_BLOB)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
        (r = C.int(C.HOMEMADE_TIN)); /* lizards don't rot */
    return C.int(r);
}

/* finish consume_tin(); also potentially used by cprefx() and cpostfx() */
export function use_up_tin(tin)

{
    if (C.carried(tin))
        C.useup(tin);
    else
        C.useupf(tin, 1n);
    /* reset tin context */
    (C.svc.context.tin.tin = 0);
    (C.svc.context.tin.o_id = C.uint(0));
}

export function consume_tin(mesg)

{
    /* "feel like Popeye" unless sustain ability suppresses
                     any attribute change; this slightly oversimplifies
                     things:  we want "Popeye" if no strength increase
                     occurs due to already being at maximum, but we won't
                     get it if at-maximum and fixed-abil both apply */
    /* no gain, feel like another character from Popeye */
    /* blessed */
    /* uncursed */
    let what;
    let which, mnum, r, nutamt;
    /* if you've eaten tin itself, chance to not eat contents gets bypassed */
    let always_eat = C.int(C.metallivorous(C.gy.youmonst.data));
    let tin = C.svc.context.tin.tin;

    (r = C.int(tin_variety(tin, 0)));
    if (((tin.otrapped || ((((tin.cursed && (C.long(r) != C.long(C.HOMEMADE_TIN))) ? 1 : 0) && !C.rn2(8, 1537, "consume_tin")) ? 1 : 0)) ? 1 : 0)) {
        C.b_trapped("tin", C.NO_PART);
        (tin = costly_tin(C.COST_DSTROY));
        use_up_tin(tin);
        return;
    }

    C.pline1(mesg); /* "You succeed in opening the tin." */

    if ((r != C.SPINACH_TIN)) {
        (mnum = C.int(tin.corpsenm));
        if ((mnum == C.NON_PM)) {
            if (C.Hallucination)
                C.pline("It's full of %s.",
                      (C.rn2(2, 1551, "consume_tin") ? "air elemental souffle" : "dehydrated water"));
            else
                C.pline("It turns out to be empty.");
            C.observe_object(tin);
            (tin.known = 1);
            (tin = costly_tin(C.COST_OPEN));
            use_up_tin(tin);
            if (always_eat)
                lesshungry(5); /* metallivorous hero ate the tin itself */
            return;
        }

        (which = C.int(0)); /* 0=>plural, 1=>as-is, 2=>"the" prefix */
        if ((((((mnum == C.PM_COCKATRICE) || (mnum == C.PM_CHICKATRICE)) ? 1 : 0) && ((C.Stone_resistance || C.Hallucination) ? 1 : 0)) ? 1 : 0)) {
            (what = "chicken");
            (which = C.int(1)); /* suppress pluralization */
        } else if (C.Hallucination) {
            (what = C.rndmonnam(0));
        } else {
            (what = C.mons[mnum].pmnames[C.NEUTRAL]);
            if (C.the_unique_pm(C.mons[mnum]))
                (which = C.int(2));
            else if (C.type_is_pname(C.mons[mnum]))
                (which = C.int(1));
        }
        if ((which == 0))
            (what = C.makeplural(what));
        else if ((which == 2))
            (what = C.the(what));

        if (!always_eat) {
            C.pline("It smells like %s.", what);
            if ((C.y_n("Eat it?") == 110)) {
                if (C.flags.verbose)
                    C.You("discard the open tin.");
                if (!C.Hallucination) {
                    C.observe_object(tin);
                    (tin.known = 1);
                }
                (tin = costly_tin(C.COST_OPEN));
                use_up_tin(tin);
                return;
            }
        }

        /* in case stop_occupation() was called on previous meal */
        C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece = 0, .o_id = 0 */

        C.You("consume %s %s.", C.tintxts[r].txt, C.mons[mnum].pmnames[C.NEUTRAL]);

        eating_conducts(C.mons[mnum]);

        C.observe_object(tin);
        (tin.known = 1);
        /* charge for one at pre-eating cost */
        (tin = (C.svc.context.tin.tin = costly_tin(C.COST_OPEN)));

        /* cprefx() or cpostfx() might use up tin to keep it out of bones */
        cprefx(mnum);
        if (C.svc.context.tin.tin)
            C.callLocal(cpostfx, mnum);
        if (!C.svc.context.tin.tin)
            return;

        if ((C.tintxts[r].nut < 0)) { /* rotten */
            C.make_vomiting(C.long(C.int(C.int((C.rn2(15, 1618, "consume_tin")) + (10)))), 0);
        } else {
            (nutamt = C.int(C.tintxts[r].nut));
            /* nutrition from a homemade tin (made from a single corpse)
               shouldn't be more than nutrition from the corresponding
               corpse; other tinning modes might use more than one corpse
               or add extra ingredients so aren't similarly restricted */
            if ((((C.long(r) == C.long(C.HOMEMADE_TIN)) && (nutamt > C.mons[mnum].cnutrit)) ? 1 : 0))
                (nutamt = C.int(C.mons[mnum].cnutrit));
            if (always_eat)
                (nutamt = C.int((nutamt) + (5))); /* metallivorous hero ate the tin itself */
            /* use up tin now; lesshungry() could be fatal and produce bones */
            use_up_tin(tin), (tin = 0);
            lesshungry(nutamt);
        }

        if (C.tintxts[r].greasy) {
            /* normal hero is !Glib, because you can't open tins when Glib,
               but one poly'd into metallivorous form might already be Glib;
               it's debatable whether a rock mole should have its paws made
               slippery when eating a greasy tin, but we'll go with that... */
            let alreadyglib = C.int(C.int((C.long((C.long(C.Glib) & C.long(C.TIMEOUT))))));

            C.make_glib(C.int((alreadyglib) + (C.int(C.int((C.rn2(11, 1641, "consume_tin")) + (5)))))); /* 5..15 */
            C.pline("Eating %s food made your %s %s slippery.",
                  C.tintxts[r].txt, C.fingers_or_gloves(1),
                  (alreadyglib ? "even more" : "very"));
        }

    } else { /* spinach... */
        if (tin.cursed) {
            C.pline("It contains some decaying%s%s substance.",
                  (C.Blind ? "" : " "), (C.Blind ? "" : C.hcolor(C.NH_GREEN)));
        } else {
            C.pline("It contains spinach.");
            C.observe_object(tin);
            (tin.known = 1);
        }

        if (((!always_eat && (C.y_n("Eat it?") == 110)) ? 1 : 0)) {
            if (C.flags.verbose)
                C.You("discard the open tin.");
            (tin = costly_tin(C.COST_OPEN));
            use_up_tin(tin);
            return;
        }

        /*
         * Same order as with non-spinach above:
         * conduct update, side-effects, shop handling, and nutrition.
         */
        /* don't need vegetarian checks for spinach */
        if (!C.u.uconduct.food++)
            C.livelog_printf(C.LL_CONDUCT, "ate for the first time (spinach)");
        if (!tin.cursed)
            C.pline("This makes you feel like %s!",
                  /* "Swee'pea" is a character from the Popeye cartoons */
                  (C.Hallucination ? "Swee'pea" : (!C.Fixed_abil ? "Popeye" : (C.flags.female ? "Olive Oyl" : "Bluto"))));
        C.gainstr(tin, 0, 0);

        (tin = (C.svc.context.tin.tin = costly_tin(C.COST_OPEN)));
        (nutamt = C.int((tin.blessed ? 600 : (!tin.cursed ? C.int((400) + (C.rnd(200, 1688, "consume_tin"))) : C.int((200) + (C.rnd(400, 1689, "consume_tin")))))));               /* cursed */
        if (always_eat)
            (nutamt = C.int((nutamt) + (5))); /* metallivorous hero also eats the tin itself */
        /* use up tin first; lesshungry() could be fatal and produce bones */
        use_up_tin(tin), (tin = 0);
        lesshungry(nutamt);
    }
    if (tin)
        use_up_tin(tin);
    return;
}

/* called during each move whilst opening a tin */
export function opentin()

{
    /* perhaps it was stolen (although that should cause interruption) */
    if (((!C.carried(C.svc.context.tin.tin) && ((!C.obj_here(C.svc.context.tin.tin, C.u.ux, C.u.uy) || !C.can_reach_floor(1)) ? 1 : 0)) ? 1 : 0))
        return C.int(0); /* %% probably we should use tinoid */
    if ((C.svc.context.tin.usedtime++ >= 50)) {
        C.You("give up your attempt to open the tin.");
        return C.int(0);
    }
    if ((C.svc.context.tin.usedtime < C.svc.context.tin.reqtime))
        return C.int(1); /* still busy */

    consume_tin("You succeed in opening the tin.");
    return C.int(0);
}

/* called when starting to open a tin */
export function start_tin(otmp)

{
    let mesg = 0;
    let tmp;

    opened: {
    no_opener: {
    if (C.metallivorous(C.gy.youmonst.data)) {
        (mesg = "You bite right into the metal tin...");
        (tmp = C.int(0));
    } else if (C.cantwield(C.gy.youmonst.data)) { /* nohands || verysmall */
        C.You("cannot handle the tin properly to open it.");
        return;
    } else if (otmp.blessed) {
        /* 50/50 chance for immediate access vs 1 turn delay (unless
           wielding blessed tin opener which always yields immediate
           access); 1 turn delay case is non-deterministic:  getting
           interrupted and retrying might yield another 1 turn delay
           or might open immediately on 2nd (or 3rd, 4th, ...) try */
        (tmp = C.int((((((C.uwep && C.uwep.blessed) ? 1 : 0) && (C.uwep.otyp == C.TIN_OPENER)) ? 1 : 0) ? 0 : C.rn2(2, 1741, "start_tin"))));
        if (!tmp)
            (mesg = "The tin opens like magic!");
        else
            C.pline_The("tin seems easy to open.");
    } else if (C.uwep) {
        switch (C.uwep.otyp) {
        case C.TIN_OPENER:
            (mesg = "You easily open the tin."); /* iff tmp==0 */
            (tmp = C.int(C.rn2((C.uwep.cursed ? 3 : (!C.uwep.blessed ? 2 : 1)), 1750, "start_tin")));
            break;
        case C.DAGGER:
        case C.SILVER_DAGGER:
        case C.ELVEN_DAGGER:
        case C.ORCISH_DAGGER:
        case C.ATHAME:
        case C.KNIFE:
        case C.STILETTO:
        case C.CRYSKNIFE:
            (tmp = C.int(3));
            break;
        case C.PICK_AXE:
        case C.AXE:
            (tmp = C.int(6));
            break;
        default:
            break no_opener;
        }
        C.pline("Using %s you try to open the tin.", C.yobjnam(C.uwep, 0));
    } else {
        break no_opener;
    }
    break opened;
    }

        C.pline("It is not so easy to open this tin.");
        if (C.Glib) {
            C.pline_The("tin slips from your %s.", C.fingers_or_gloves(0));
            if ((C.long(otmp.quan) > C.long(1n))) {
                (otmp = C.splitobj(otmp, 1n));
            }
            if (C.carried(otmp))
                C.dropx(otmp);
            else
                C.stackobj(otmp);
            return;
        }
        (tmp = C.int(C.int(C.int((C.rn2(C.int((1) + (C.int((500) / (C.int(((C.ACURR(C.A_DEX) + C.ACURRSTR))))))), 1784, "start_tin")) + (10)))));
    
    }

    (C.svc.context.tin.tin = otmp);
    (C.svc.context.tin.o_id = C.uint(otmp.o_id));
    if (!tmp) {
        consume_tin(mesg); /* begin immediately */
    } else {
        (C.svc.context.tin.reqtime = C.int(tmp));
        (C.svc.context.tin.usedtime = C.int(0));
        C.set_occupation(opentin, "opening the tin", 0);
    }
    return;
}

/* called when waking up after fainting */
export function Hear_again()

{
    /* Chance of deafness going away while fainted/sleeping/etc. */
    if (!C.rn2(2, 1804, "Hear_again")) {
        C.make_deaf(0n, 0);
        (C.disp.botl = C.int(1));
    }
    return C.int(0);
}

/* called on the "first bite" of rotten food */
export function rottenfood(obj)

{
    C.pline("Blecch!  %s %s!",
          (C.is_rottable(obj) ? "Rotten" : "Awful"), foodword(obj));
    if (!C.rn2(4, 1817, "rottenfood")) {
        if (C.Hallucination)
            C.You_feel("rather trippy.");
        else
            C.You_feel("rather %s.", C.body_part(C.LIGHT_HEADED));
        C.make_confused(C.long((C.long(C.HConfusion) + C.long(C.d(2, 4, 1822, "rottenfood")))), 0);
    } else if (((!C.rn2(4, 1823, "rottenfood") && !C.Blind) ? 1 : 0)) {
        C.pline("Everything suddenly goes dark.");
        /* hero is not Blind, but Blinded timer might be nonzero if
           blindness is being overridden by the Eyes of the Overworld */
        C.make_blinded(C.long((C.long(C.BlindedTimeout) + C.long(C.long(C.d(2, 10, 1827, "rottenfood"))))), 0);
        if (!C.Blind)
            C.Your1(C.vision_clears);
    } else if (!C.rn2(3, 1830, "rottenfood")) {
        let what, where;
        let duration = C.int(C.rnd(10, 1832, "rottenfood"));

        if (!C.Blind)
            (what = "goes"), (where = "dark");
        else if (((((C.Levitation || C.Is_airlevel(C.u.uz)) ? 1 : 0) || C.Is_waterlevel(C.u.uz)) ? 1 : 0))
            (what = "you lose control of"), (where = "yourself");
        else
            (what = "you slap against the"),
            (where = (C.u.usteed ? "saddle" : C.surface(C.u.ux, C.u.uy)));
        C.pline_The("world spins and %s %s.", what, where);
        C.incr_itimeout(C.propertyReference("HDeaf"), duration);
        (C.disp.botl = C.int(1));
        C.nomul(-duration);
        (C.gm.multi_reason = "unconscious from rotten food");
        (C.gn.nomovemsg = "You are conscious again.");
        (C.ga.afternmv = Hear_again);
        return C.int(1);
    }
    return C.int(0);
}

/* called when a corpse is selected as food */
export function eatcorpse(otmp)

{
    let retcode = C.int(0), tp = C.int(0), mnum = C.int(otmp.corpsenm);
    let rotted = C.long(0n);
    let ll_conduct = C.int(0);
    let stoneable,
            slimeable = (C.int((((((((mnum == C.PM_GREEN_SLIME) && !C.Slimed) ? 1 : 0) && !C.Unchanging) ? 1 : 0) && !C.slimeproof(C.gy.youmonst.data)) ? 1 : 0))),
            glob = C.int((otmp.globby ? 1 : 0));

    C.assert(C.ismnum(mnum), 1);
    (stoneable = C.int(((((C.flesh_petrifies(C.mons[mnum]) && !C.Stone_resistance) ? 1 : 0) && !C.poly_when_stoned(C.gy.youmonst.data)) ? 1 : 0)));

    /* KMH, conduct */
    if (!C.vegan(C.mons[mnum]))
        if (!C.u.uconduct.unvegan++) {
            C.livelog_printf(C.LL_CONDUCT,
                  "consumed animal products for the first time, by eating %s",
                           C.an(food_xname(otmp, 0)));
            ll_conduct++;
        }
    if (!C.vegetarian(C.mons[mnum])) {
        if (((!C.u.uconduct.unvegetarian && !ll_conduct) ? 1 : 0))
            C.livelog_printf(C.LL_CONDUCT,
                           "tasted meat for the first time, by eating %s",
                           C.an(food_xname(otmp, 0)));
        violated_vegetarian();
    }
    if (!((((((((mnum == C.PM_LIZARD) || (mnum == C.PM_LICHEN)) ? 1 : 0) || C.is_rider(C.mons[mnum])) ? 1 : 0) || (mnum == C.PM_ACID_BLOB)) ? 1 : 0))) {
        let age = C.long(C.peek_at_iced_corpse_age(otmp));

        (rotted = C.long(C.long((C.long(C.long((C.long(C.svm.moves) - C.long(age)))) / C.long(C.long((C.long(10n) + C.long(C.rn2(20, 1887, "eatcorpse")))))))));
        if (otmp.cursed)
            (rotted = C.long(C.long(C.long(rotted) + C.long(2n))));
        else if (otmp.blessed)
            (rotted = C.long(C.long(C.long(rotted) - C.long(2n))));
    }

    /* 5.0: globs don't become tainted, they shrink away */
    if (((((((!glob && !stoneable) ? 1 : 0) && !slimeable) ? 1 : 0) && (C.long(rotted) > C.long(5n))) ? 1 : 0)) {
        let cannibal = C.int(maybe_cannibal(mnum, 0));

        /* tp++; -- early return makes this unnecessary */
        C.pline("Ulch - that %s was tainted%s!",
              ((C.mons[mnum].mlet == C.S_FUNGUS) ? "fungoid vegetation" : (C.vegetarian(C.mons[mnum]) ? "protoplasm" : "meat")),
              (cannibal ? ", you cannibal" : ""));
        if (C.Sick_resistance) {
            C.pline("It doesn't seem at all sickening, though...");
        } else {
            let sick_time;

            (sick_time = C.long(C.long(C.int(C.int((C.rn2(10, 1909, "eatcorpse")) + (10))))));
            /* make sure new ill doesn't result in improvement */
            if (((C.Sick && (C.long(sick_time) > C.long(C.Sick))) ? 1 : 0))
                (sick_time = C.long(((C.long(C.Sick) > C.long(1n)) ? C.long((C.long(C.Sick) - C.long(1n))) : 1n)));
            C.make_sick(sick_time, C.corpse_xname(otmp, "rotted", C.CXN_NORMAL),
                      1, C.SICK_VOMITABLE);

            C.pline("(It must have died too long ago to be safe to eat.)");
        }
        if (C.carried(otmp))
            C.useup(otmp);
        else
            C.useupf(otmp, 1n);
        return C.int(2);
    } else if (((C.acidic(C.mons[mnum]) && !C.Acid_resistance) ? 1 : 0)) {
        tp++;
        C.You("have a very bad case of stomach acid.");   /* not body_part() */
        C.losehp(C.rnd(15, 1926, "eatcorpse"), (!glob ? "acidic corpse" : "acidic glob"),
               C.KILLED_BY_AN); /* acid damage */
    } else if (((C.poisonous(C.mons[mnum]) && C.rn2(5, 1928, "eatcorpse")) ? 1 : 0)) {
        tp++;
        C.pline("Ecch - that must have been poisonous!");
        if (!C.Poison_resistance) {
            C.poison_strdmg(C.rnd(4, 1932, "eatcorpse"), C.rnd(15, 1932, "eatcorpse"),
                          (!glob ? "poisonous corpse" : "poisonous glob"),
                          C.KILLED_BY_AN);
        } else
            C.You("seem unaffected by the poison.");

    /* now any corpse left too long will make you mildly ill */
    } else if ((((((C.long(rotted) > C.long(5n)) || (((C.long(rotted) > C.long(3n)) && C.rn2(5, 1939, "eatcorpse")) ? 1 : 0)) ? 1 : 0) && !C.Sick_resistance) ? 1 : 0)) {
        tp++;
        C.You_feel("%ssick.", (C.Sick ? "very " : ""));
        C.losehp(C.rnd(8, 1942, "eatcorpse"), (!glob ? "cadaver" : "rotted glob"), C.KILLED_BY_AN);
    }

    /* delay is weight dependent */
    (C.svc.context.victual.reqtime = C.int(C.uint((3) + (C.uint(((!glob ? C.mons[mnum].cwt : otmp.owt)) >>> (6))))));

    if (((((!tp && !((((((((mnum == C.PM_LIZARD) || (mnum == C.PM_LICHEN)) ? 1 : 0) || C.is_rider(C.mons[mnum])) ? 1 : 0) || (mnum == C.PM_ACID_BLOB)) ? 1 : 0))) ? 1 : 0) && ((otmp.orotten || !C.rn2(7, 1949, "eatcorpse")) ? 1 : 0)) ? 1 : 0)) {
        if (rottenfood(otmp)) {
            (otmp.orotten = 1);
            (otmp = touchfood(otmp));
            if (!otmp)
                return C.int(1);
            (retcode = C.int(1));
        }

        if (!C.mons[otmp.corpsenm].cnutrit) {
            /* no nutrition: rots away, no message if you passed out */
            if (!retcode)
                C.pline_The("corpse rots away completely.");
            if (C.carried(otmp))
                C.useup(otmp);
            else
                C.useupf(otmp, 1n);
            (retcode = C.int(2));
        }

        if (!retcode)
            C.callLocal(consume_oeaten, otmp, 2); /* oeaten >>= 2 */
    } else if ((((((mnum == C.PM_COCKATRICE) || (mnum == C.PM_CHICKATRICE)) ? 1 : 0) && ((C.Stone_resistance || C.Hallucination) ? 1 : 0)) ? 1 : 0)) {
        C.pline("This tastes just like chicken!");
    } else if ((((mnum == C.PM_FLOATING_EYE) && (C.u.umonnum == C.PM_RAVEN)) ? 1 : 0)) {
        C.You("peck the eyeball with delight.");
    } else if (tp) {
        ; /* we've already delivered a message; don't add "it tastes okay" */
    } else {
        /* yummy is always False for omnivores, palatable always True */
        let yummy = (C.int((C.vegan(C.mons[mnum]) ? ((!C.carnivorous(C.gy.youmonst.data) && C.herbivorous(C.gy.youmonst.data)) ? 1 : 0) : ((C.carnivorous(C.gy.youmonst.data) && !C.herbivorous(C.gy.youmonst.data)) ? 1 : 0)))),
                palatable = (C.int((((((C.vegetarian(C.mons[mnum]) ? C.herbivorous(C.gy.youmonst.data) : C.carnivorous(C.gy.youmonst.data)) && C.rn2(10, 1988, "eatcorpse")) ? 1 : 0) && (((C.long(rotted) < C.long(1)) || !C.rn2(C.int((C.int(rotted)) + (1)), 1989, "eatcorpse")) ? 1 : 0)) ? 1 : 0)));
        let pmxnam = food_xname(otmp, 0);
        const palatable_msgs = [
            /* first char: T = tastes ... , I = is ... */
            /* veggies are always just "okay" */
            "Tokay", "Istringy", "Igamey", "Ifatty", "Itough"
        ];
        let idx = C.int((C.vegetarian(C.mons[mnum]) ? 0 : C.rn2(palatable_msgs.length, 1996, "eatcorpse")));
        let palat_msg = C.literal(palatable_msgs[idx]);
        let use_is = (C.int(((C.Hallucination || ((palatable && (C.loadChar(palat_msg) == 73)) ? 1 : 0)) ? 1 : 0)));

        if (!C.strncmpi(pmxnam, "the ", 4))
            pmxnam += 4;
        C.pline("%s%s %s %s%c",
              (C.type_is_pname(C.mons[mnum]) ? "" : (C.the_unique_pm(C.mons[mnum]) ? "The " : "This ")),
              pmxnam,
              (use_is ? "is" : "tastes"),
                  /* tiger reference is to TV ads for "Frosted Flakes",
                     breakfast cereal targeted at kids by "Tony the tiger" */
              (C.Hallucination ? (yummy ? ((C.u.umonnum == C.PM_TIGER) ? "gr-r-reat" : "gnarly") : (palatable ? "copacetic" : "grody")) : (yummy ? "delicious" : (palatable ? (palat_msg + 1) : "terrible"))),
              (((yummy || !palatable) ? 1 : 0) ? 33 : 46));
    }

    return C.int(retcode);
}

/* called as you start to eat */
export function start_eating(otmp, already_partly_eaten)

{
    (already_partly_eaten = C.int(C.boolean(already_partly_eaten)));
    let old_nomovemsg, save_nomovemsg;
    const msgbuf = C.msgbuf;

    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("start_eating: %s (victual = %s)",
                /* note: fmt_ptr() returns a static buffer but supports
                   several such so we don't need to copy the first result
                   before calling it a second time */
                C.fmt_ptr( otmp),
                C.fmt_ptr( C.svc.context.victual.piece)); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("reqtime = %d", C.svc.context.victual.reqtime); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("(original reqtime = %d)", C.objects[otmp.otyp].oc_delay); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("nmod = %d", C.svc.context.victual.nmod); (C.iflags.last_msg = C.int(save_plnmsg)); }
    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("oeaten = %d", otmp.oeaten); (C.iflags.last_msg = C.int(save_plnmsg)); }
    (C.svc.context.victual.fullwarn = (C.svc.context.victual.doreset = 0));
    (C.svc.context.victual.eating = 1);

    if ((((otmp.otyp == C.CORPSE) || otmp.globby) ? 1 : 0)) {
        cprefx(C.svc.context.victual.piece.corpsenm);
        if (((!C.svc.context.victual.piece || !C.svc.context.victual.eating) ? 1 : 0)) {
            /* rider revived, or hero died and was lifesaved */
            return;
        }
    }

    (old_nomovemsg = C.gn.nomovemsg);
    if (bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if ((++C.svc.context.victual.usedtime >= C.svc.context.victual.reqtime)) {
            /* don't want done_eating() to issue gn.nomovemsg if it
               is due to vomit() called by bite() */
            (save_nomovemsg = C.gn.nomovemsg);
            if (!old_nomovemsg)
                (C.gn.nomovemsg = 0);
            done_eating(0);
            if (!old_nomovemsg)
                (C.gn.nomovemsg = save_nomovemsg);
        }
        return;
    }

    if ((++C.svc.context.victual.usedtime >= C.svc.context.victual.reqtime)) {
        /* print "finish eating" message if they just resumed -dlc */
        done_eating(((((C.svc.context.victual.reqtime > 1) || already_partly_eaten) ? 1 : 0) ? 1 : 0));
        return;
    }

    C.Sprintf(msgbuf, "eating %s", food_xname(otmp, 1));
    C.set_occupation(eatfood, msgbuf, 0);
}

/* used by shrink_glob() timer routine */
export function eating_glob(glob)

{
    return C.int((((C.go.occupation == eatfood) && C.samePtr(glob, C.svc.context.victual.piece)) ? 1 : 0));
}

/* scare nearby monster when hero eats garlic */
export function garlic_breath(mtmp)

{
    if (((C.olfaction(mtmp.data) && (C.distu(mtmp.mx, mtmp.my) < 7)) ? 1 : 0))
        C.monflee(mtmp, 0, 0, 0);
}

/*
 * Called on "first bite" of (non-corpse) food, after touchfood() has
 * marked it 'partly eaten'.  Used for non-rotten non-tin non-corpse food.
 * Messages should use present tense since multi-turn food won't be
 * finishing at the time they're issued.
 * Returns FALSE if eating should not succeed for whatever reason.
 */
export function fprefx(otmp)

{
    feedback_done: {
    give_feedback: {
    switch (otmp.otyp) {
    case C.EGG:
        if ((otmp.corpsenm == C.PM_PYROLISK)) {
            if (C.carried(otmp))
                C.useup(otmp);
            else
                C.useupf(otmp, 1n);
            C.explode(C.u.ux, C.u.uy, -11, C.d(3, 6, 2108, "fprefx"), 0, C.EXPL_FIERY);
            return C.int(0);
        } else if (C.stale_egg(otmp)) {
            C.pline("Ugh.  Rotten egg."); /* perhaps others like it */
            /* increasing existing nausea means that it will take longer
               before eventual vomit, but also means that constitution
               will be abused more times before illness completes */
            C.make_vomiting(C.long((C.long(C.long((C.long(C.Vomiting) & C.long(C.TIMEOUT)))) + C.long(C.long(C.d(10, 4, 2115, "fprefx"))))), 1);
        } else
            break give_feedback;
        break;
    case C.FOOD_RATION: /* nutrition 800 */
        /* 200+800 remains below 1000+1, the satiation threshold */
        if ((C.u.uhunger <= 200))
            C.pline("%s!", (C.Hallucination ? "Oh wow, like, superior, man" : "This food really hits the spot"));

        /* 700-1+800 remains below 1500, the choking threshold which
           triggers "you're having a hard time getting it down" feedback */
        else if ((C.u.uhunger < 700))
            C.pline("This satiates your %s!", C.body_part(C.STOMACH));
        /* [satiation message may be inaccurate if eating gets interrupted] */
        break;
    case C.TRIPE_RATION:
        if (((C.carnivorous(C.gy.youmonst.data) && !C.humanoid(C.gy.youmonst.data)) ? 1 : 0)) {
            C.pline("This tripe ration is surprisingly good!");
        } else if ((C.Upolyd ? C.is_orc(C.gy.youmonst.data) : C.Race_if(C.PM_ORC))) {
            C.pline((C.Hallucination ? "Tastes great!  Less filling!" : "Mmm, tripe... not bad!"));
        } else {
            C.pline("Yak - dog food!");
            C.more_experienced(1, 0);
            C.newexplevel();
            /* not cannibalism, but we use similar criteria
               for deciding whether to be sickened by this meal */
            if (((C.rn2(2, 2143, "fprefx") && !(((C.Role_if(C.PM_CAVE_DWELLER) || C.Race_if(C.PM_ORC)) ? 1 : 0))) ? 1 : 0))
                C.make_vomiting(C.long(C.int(C.int((C.rn2(C.svc.context.victual.reqtime, 2144, "fprefx")) + (14)))),
                              0);
        }
        break;
    case C.LEMBAS_WAFER:
        if ((C.Upolyd ? C.is_orc(C.gy.youmonst.data) : C.Race_if(C.PM_ORC))) {
            C.pline("%s", "!#?&* elf kibble!");
            break;
        } else if ((C.Upolyd ? C.is_elf(C.gy.youmonst.data) : C.Race_if(C.PM_ELF))) {
            C.pline("A little goes a long way.");
            break;
        }
        break give_feedback;
    case C.MEATBALL:
    case C.MEAT_STICK:
    case C.ENORMOUS_MEATBALL:
    case C.MEAT_RING:
        break give_feedback;
    case C.CLOVE_OF_GARLIC:
        if (C.is_undead(C.gy.youmonst.data)) {
            C.make_vomiting(C.long(C.int(C.int((C.rn2(C.svc.context.victual.reqtime, 2164, "fprefx")) + (5)))), 0);
            break;
        }
        C.iter_mons(garlic_breath);
        
        /*FALLTHRU*/
    default:
        if ((((((otmp.otyp == C.SLIME_MOLD) && !otmp.cursed) ? 1 : 0) && (otmp.spe == C.svc.context.current_fruit)) ? 1 : 0)) {
            C.pline("My, this is a %s %s!",
                  (C.Hallucination ? "primo" : "yummy"),
                  C.singular(otmp, C.xname));
        } else if ((((((otmp.otyp == C.APPLE) && otmp.cursed) ? 1 : 0) && !C.Sleep_resistance) ? 1 : 0)) {
            ; /* skip core joke; feedback deferred til fpostfx() */

        /* KMH -- Why should Unix have all the fun?
           We check MACOS before UNIX to get the Apple-specific apple
           message; the '#if UNIX' code will still kick in for pear. */
        } else if ((otmp.otyp == C.APPLE)) {
            C.pline("Delicious!  Must be a Macintosh!");

        } else if ((((otmp.otyp == C.APPLE) || (otmp.otyp == C.PEAR)) ? 1 : 0)) {
            if (!C.Hallucination) {
                C.pline("Core dumped.");
            } else {
                /* based on an old Usenet joke, a fake a.out manual page */
                let x = C.int(C.rnd(100, 2193, "fprefx"));

                C.pline("%s -- core dumped.",
                      ((x <= 75) ? "Segmentation fault" : ((x <= 99) ? "Bus error" : "Yo' mama")));
            }
        } else {
            break give_feedback;
        }
        break; /* default */
    }
    break feedback_done;
    }

            C.pline("This %s is %s", C.singular(otmp, C.xname),
                  (otmp.cursed ? (C.Hallucination ? "grody!" : "terrible!") : ((((((otmp.otyp == C.CRAM_RATION) || (otmp.otyp == C.K_RATION)) ? 1 : 0) || (otmp.otyp == C.C_RATION)) ? 1 : 0) ? "bland." : (C.Hallucination ? "gnarly!" : "delicious!"))));
    } /* switch */
    return C.int(1);
}

/* increment a combat intrinsic with limits on its growth */
export function bounded_increase(old, inc, typ)

{
    (old = C.int(C.int(old))); (inc = C.int(C.int(inc))); (typ = C.int(C.int(typ)));
    let absold, absinc, sgnold, sgninc;

    /* don't include any amount coming from worn rings (caller handles
       'protection' differently) */
    if (((((C.uright && (C.uright.otyp == typ)) ? 1 : 0) && (typ != C.RIN_PROTECTION)) ? 1 : 0))
        (old = C.int((old) - (C.uright.spe)));
    if (((((C.uleft && (C.uleft.otyp == typ)) ? 1 : 0) && (typ != C.RIN_PROTECTION)) ? 1 : 0))
        (old = C.int((old) - (C.uleft.spe)));
    (absold = C.int(C.abs(old))), (absinc = C.int(C.abs(inc)));
    (sgnold = C.int(C.sgn(old))), (sgninc = C.int(C.sgn(inc)));

    if ((((((absinc == 0) || (sgnold != sgninc)) ? 1 : 0) || (C.int((absold) + (absinc)) < 10)) ? 1 : 0)) {
        ; /* use inc as-is */
    } else if ((C.int((absold) + (absinc)) < 20)) {
        (absinc = C.int(C.rnd(absinc, 2237, "bounded_increase"))); /* 1..n */
        if ((C.int((absold) + (absinc)) < 10))
            (absinc = C.int(C.int((10) - (absold))));
        (inc = C.int(Math.imul(sgninc, absinc)));
    } else if ((C.int((absold) + (absinc)) < 40)) {
        (absinc = C.int((C.rn2(absinc, 2242, "bounded_increase") ? 1 : 0)));
        if ((C.int((absold) + (absinc)) < 20))
            (absinc = C.int(C.rnd(C.int((20) - (absold)), 2244, "bounded_increase")));
        (inc = C.int(Math.imul(sgninc, absinc)));
    } else {
        (inc = C.int(0)); /* no further increase allowed via this method */
    }
    /* put amount from worn rings back */
    if (((((C.uright && (C.uright.otyp == typ)) ? 1 : 0) && (typ != C.RIN_PROTECTION)) ? 1 : 0))
        (old = C.int((old) + (C.uright.spe)));
    if (((((C.uleft && (C.uleft.otyp == typ)) ? 1 : 0) && (typ != C.RIN_PROTECTION)) ? 1 : 0))
        (old = C.int((old) + (C.uleft.spe)));
    return C.int(C.int((old) + (inc)));
}

export function accessory_has_effect(otmp)

{
    C.pline("Magic spreads through your body as you digest the %s.",
          ((otmp.oclass == C.RING_CLASS) ? "ring" : "amulet"));
}

export function eataccessory(otmp)

{
    let typ = C.int(otmp.otyp);
    let oldprop;

    /* Note: rings are not so common that this is unbalancing. */
    /* (How often do you even _find_ 3 rings of polymorph in a game?) */
    (oldprop = C.long(C.u.uprops[C.objects[typ].oc_oprop].intrinsic));
    if (((C.samePtr(otmp, C.uleft) || C.samePtr(otmp, C.uright)) ? 1 : 0)) {
        C.Ring_gone(otmp);
        if ((C.u.uhp <= 0))
            return; /* died from sink fall */
    }
    C.observe_object(otmp);
    (otmp.known = 1); /* by taste */
    if (!C.rn2(((otmp.oclass == C.RING_CLASS) ? 3 : 5), 2280, "eataccessory")) {
        switch (otmp.otyp) {
        default:
            if (!C.objects[typ].oc_oprop)
                break; /* should never happen */

            if (!(C.long((C.long(C.u.uprops[C.objects[typ].oc_oprop].intrinsic) & C.long(C.FROMOUTSIDE)))))
                accessory_has_effect(otmp);

            (C.u.uprops[C.objects[typ].oc_oprop].intrinsic = C.long(C.long(C.long(C.u.uprops[C.objects[typ].oc_oprop].intrinsic) | C.long(C.FROMOUTSIDE))));

            switch (typ) {
            case C.RIN_SEE_INVISIBLE:
                C.set_mimic_blocking();
                C.see_monsters();
                if (((((((((C.Invis && !oldprop) ? 1 : 0) && !C.ESee_invisible) ? 1 : 0) && !C.perceives(C.gy.youmonst.data)) ? 1 : 0) && !C.Blind) ? 1 : 0)) {
                    C.newsym(C.u.ux, C.u.uy);
                    C.pline("Suddenly you can see yourself.");
                    C.makeknown(typ);
                }
                break;
            case C.RIN_INVISIBILITY:
                if (((((((((!oldprop && !C.EInvis) ? 1 : 0) && !C.BInvis) ? 1 : 0) && !C.See_invisible) ? 1 : 0) && !C.Blind) ? 1 : 0)) {
                    C.newsym(C.u.ux, C.u.uy);
                    C.Your("body takes on a %s transparency...",
                         (C.Hallucination ? "normal" : "strange"));
                    C.makeknown(typ);
                }
                break;
            case C.RIN_PROTECTION_FROM_SHAPE_CHAN:
                C.rescham();
                break;
            case C.RIN_LEVITATION:
                /* undo the `.intrinsic |= FROMOUTSIDE' done above */
                (C.u.uprops[C.LEVITATION].intrinsic = C.long(oldprop));
                if (!C.Levitation) {
                    C.float_up();
                    C.incr_itimeout(C.propertyReference("HLevitation"), C.d(10, 20, 2319, "eataccessory"));
                    C.makeknown(typ);
                }
                break;
            } /* inner switch */
            break; /* default case of outer switch */

        case C.RIN_ADORNMENT:
            accessory_has_effect(otmp);
            if (C.adjattrib(C.A_CHA, otmp.spe, -1))
                C.makeknown(typ);
            break;
        case C.RIN_GAIN_STRENGTH:
            accessory_has_effect(otmp);
            if (C.adjattrib(C.A_STR, otmp.spe, -1))
                C.makeknown(typ);
            break;
        case C.RIN_GAIN_CONSTITUTION:
            accessory_has_effect(otmp);
            if (C.adjattrib(C.A_CON, otmp.spe, -1))
                C.makeknown(typ);
            break;
        case C.RIN_INCREASE_ACCURACY:
            accessory_has_effect(otmp);
            (C.u.uhitinc = C.int(C.char(bounded_increase(C.int(C.u.uhitinc), otmp.spe,
                                                 C.RIN_INCREASE_ACCURACY))));
            break;
        case C.RIN_INCREASE_DAMAGE:
            accessory_has_effect(otmp);
            (C.u.udaminc = C.int(C.char(bounded_increase(C.int(C.u.udaminc), otmp.spe,
                                                 C.RIN_INCREASE_DAMAGE))));
            break;
        case C.RIN_PROTECTION:
        case C.AMULET_OF_GUARDING:
            accessory_has_effect(otmp);
            (C.HProtection = C.long(C.long(C.long(C.HProtection) | C.long(C.FROMOUTSIDE))));
            (C.u.ublessed = C.int(bounded_increase(C.u.ublessed,
                                          ((typ == C.RIN_PROTECTION) ? otmp.spe : 2), /* fixed amount for amulet */
                                          typ)));
            (C.disp.botl = C.int(1));
            break;
        case C.RIN_FREE_ACTION:
            /* Give sleep resistance instead */
            if (!(C.long((C.long(C.HSleep_resistance) & C.long(C.FROMOUTSIDE)))))
                accessory_has_effect(otmp);
            if (!C.Sleep_resistance)
                C.You_feel("wide awake.");
            (C.HSleep_resistance = C.long(C.long(C.long(C.HSleep_resistance) | C.long(C.FROMOUTSIDE))));
            break;
        case C.AMULET_OF_CHANGE:
            accessory_has_effect(otmp);
            C.makeknown(typ);
            C.change_sex();
            C.You("are suddenly very %s!",
                (C.flags.female ? "feminine" : "masculine"));
            (C.disp.botl = C.int(1));
            break;
        case C.AMULET_OF_UNCHANGING:
            /* un-change: it's a pun */
            if (((!C.Unchanging && C.Upolyd) ? 1 : 0)) {
                accessory_has_effect(otmp);
                C.makeknown(typ);
                C.rehumanize();
            }
            break;
        case C.AMULET_OF_STRANGULATION: /* bad idea! */
            /* no message--this gives no permanent effect */
            choke(otmp);
            break;
        case C.AMULET_OF_RESTFUL_SLEEP: { /* another bad idea! */
            let newnap = C.long(C.long(C.rnd(100, 2390, "eataccessory"))), oldnap = (C.long(C.long((C.long(C.HSleepy) & C.long(C.TIMEOUT)))));

            if (!(C.long((C.long(C.HSleepy) & C.long(C.FROMOUTSIDE)))))
                accessory_has_effect(otmp);
            (C.HSleepy = C.long(C.long(C.long(C.HSleepy) | C.long(C.FROMOUTSIDE))));
            /* might also be wearing one; use shorter of two timeouts */
            if ((((C.long(newnap) < C.long(oldnap)) || (C.long(oldnap) == C.long(0n))) ? 1 : 0))
                (C.HSleepy = C.long(C.long((C.long(C.long((C.long(C.HSleepy) & C.long(~C.TIMEOUT)))) | C.long(newnap)))));
            break;
        }
        case C.RIN_SUSTAIN_ABILITY:
        case C.AMULET_OF_LIFE_SAVING:
        case C.AMULET_OF_FLYING:
        case C.AMULET_OF_REFLECTION: /* nice try */
            /* can't eat Amulet of Yendor or fakes,
             * and no oc_prop even if you could -3.
             */
            break;
        }
    }
}

/* called after eating non-food */
export function eatspecial()

{
    /* check description after checking for specific scrolls */
    let otmp = C.svc.context.victual.piece;

    /* lesshungry wants an occupation to handle choke messages correctly */
    C.set_occupation(eatfood, "eating non-food", 0);
    lesshungry(C.svc.context.victual.nmod);
    (C.go.occupation = 0);
    C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece = 0, .o_id = 0 */

    if ((otmp.oclass == C.COIN_CLASS)) {
        if (C.carried(otmp))
            C.useupall(otmp);
        else
            C.useupf(otmp, otmp.quan);
        C.vault_gd_watching(C.GD_EATGOLD);
        return;
    }
    if ((C.objects[otmp.otyp].oc_material == C.PAPER)) {
        if ((otmp.otyp == C.SCR_MAIL))
            /* no nutrition */
            C.pline("This junk mail is less than satisfying.");
        else
        if ((otmp.otyp == C.SCR_SCARE_MONSTER))
            /* to eat scroll, hero is currently polymorphed into a monster */
            C.pline("Yuck%c", (otmp.blessed ? 33 : 46));
        else if ((((otmp.oclass == C.SCROLL_CLASS) && C.objdescr_is(otmp, "YUM YUM")) ? 1 : 0))
            C.pline("Yum%c", (otmp.blessed ? 33 : 46));
        else
            C.pline("Needs salt...");
    }
    if ((otmp.oclass == C.POTION_CLASS)) {
        otmp.quan++; /* dopotion() does a useup() */
        C.dopotion(otmp);
    } else if ((((otmp.oclass == C.RING_CLASS) || (otmp.oclass == C.AMULET_CLASS)) ? 1 : 0)) {
        eataccessory(otmp);
    } else if ((((otmp.otyp == C.LEASH) && otmp.leashmon) ? 1 : 0)) {
        C.o_unleash(otmp);
    }

    /* KMH -- idea by "Tommy the Terrorist" */
    if ((((otmp.otyp == C.TRIDENT) && !otmp.cursed) ? 1 : 0)) {
        /* sugarless chewing gum which used to be heavily advertised on TV */
        C.pline((C.Hallucination ? "Four out of five dentists agree." : "That was pure chewing satisfaction!"));
        C.exercise(C.A_WIS, 1);
    }
    if ((((otmp.otyp == C.FLINT) && !otmp.cursed) ? 1 : 0)) {
        /* chewable vitamin for kids based on "The Flintstones" TV cartoon */
        C.pline("Yabba-dabba delicious!");
        C.exercise(C.A_CON, 1);
    }

    if (((C.samePtr(otmp, C.uwep) && (C.long(otmp.quan) == C.long(1n))) ? 1 : 0))
        C.uwepgone();
    if (((C.samePtr(otmp, C.uquiver) && (C.long(otmp.quan) == C.long(1n))) ? 1 : 0))
        C.uqwepgone();
    if (((C.samePtr(otmp, C.uswapwep) && (C.long(otmp.quan) == C.long(1n))) ? 1 : 0))
        C.uswapwepgone();

    if (C.samePtr(otmp, C.uball))
        C.unpunish();
    if (C.samePtr(otmp, C.uchain))
        C.unpunish(); /* but no useup() */
    else if (C.carried(otmp))
        C.useup(otmp);
    else
        C.useupf(otmp, 1n);
}

/* NOTE: the order of these words exactly corresponds to the
   order of oc_material values #define'd in objclass.h. */
export const foodwords = [
    "meal",    "liquid",  "wax",       "food", "meat",     "paper",
    "cloth",   "leather", "wood",      "bone", "scale",    "metal",
    "metal",   "metal",   "silver",    "gold", "platinum", "mithril",
    "plastic", "glass",   "rich food", "stone"
];

export function foodword(otmp)

{
    if ((otmp.oclass == C.FOOD_CLASS))
        return "food";
    if ((((((otmp.oclass == C.GEM_CLASS) && (C.objects[otmp.otyp].oc_material == C.GLASS)) ? 1 : 0) && otmp.dknown) ? 1 : 0))
        C.makeknown(otmp.otyp);
    return C.foodwords[C.objects[otmp.otyp].oc_material];
}

/* called after consuming (non-corpse) food */
export function fpostfx(otmp)

{
    switch (otmp.otyp) {
    case C.SPRIG_OF_WOLFSBANE:
        if (((C.ismnum(C.u.ulycn) || C.is_were(C.gy.youmonst.data)) ? 1 : 0))
            C.you_unwere(1);
        break;
    case C.CARROT:
        if (((!C.u.uswallow || !C.attacktype_fordmg(C.u.ustuck.data, C.AT_ENGL, C.AD_BLND)) ? 1 : 0))
            C.make_blinded(C.long(C.u.ucreamed), 1);
        break;
    case C.FORTUNE_COOKIE:
        C.outrumor(C.bcsign(otmp), C.BY_COOKIE);
        if (!C.Blind)
            if (!C.u.uconduct.literate++)
                C.livelog_printf(C.LL_CONDUCT,
                    "became literate by reading the fortune inside a cookie");
        break;
    case C.LUMP_OF_ROYAL_JELLY:
        if (((((C.samePtr(C.gy.youmonst.data, C.mons[C.PM_KILLER_BEE]) && !C.Unchanging) ? 1 : 0) && C.polymon(C.PM_QUEEN_BEE)) ? 1 : 0))
            break;

        /* This stuff seems to be VERY healthy! */
        C.gainstr(otmp, 1, 1);
        if (C.Upolyd) {
            (C.u.mh = C.int((C.u.mh) + ((otmp.cursed ? -C.rnd(20, 2537, "fpostfx") : C.rnd(20, 2537, "fpostfx"))))), (C.disp.botl = C.int(1));
            if ((C.u.mh > C.u.mhmax)) {
                if (!C.rn2(17, 2539, "fpostfx"))
                    C.setuhpmax(C.int((C.u.mhmax) + (1)), 0);
                (C.u.mh = C.int(C.u.mhmax));
            } else if ((C.u.mh <= 0)) {
                C.rehumanize();
            }
        } else {
            (C.u.uhp = C.int((C.u.uhp) + ((otmp.cursed ? -C.rnd(20, 2546, "fpostfx") : C.rnd(20, 2546, "fpostfx"))))), (C.disp.botl = C.int(1));
            if ((C.u.uhp > C.u.uhpmax)) {
                if (!C.rn2(17, 2548, "fpostfx"))
                    C.setuhpmax(C.int((C.u.uhpmax) + (1)), 0);
                (C.u.uhp = C.int(C.u.uhpmax));
            } else if ((C.u.uhp <= 0)) {
                (C.svk.killer.format = C.int(C.KILLED_BY_AN));
                C.Strcpy(C.svk.killer.name, "rotten lump of royal jelly");
                C.done(C.POISONING);
            }
        }
        if (!otmp.cursed)
            C.heal_legs(0);
        break;
    case C.EGG:
        if (((C.ismnum(otmp.corpsenm) && C.flesh_petrifies(C.mons[otmp.corpsenm])) ? 1 : 0)) {
            if (((!C.Stone_resistance && !(((C.poly_when_stoned(C.gy.youmonst.data) && C.polymon(C.PM_STONE_GOLEM)) ? 1 : 0))) ? 1 : 0)) {
                if (!C.Stoned) {
                    C.Sprintf(C.svk.killer.name, "%s egg",
                            C.mons[otmp.corpsenm].pmnames[C.NEUTRAL]);
                    C.make_stoned(5n, 0, C.KILLED_BY_AN,
                                C.svk.killer.name);
                }
            }
            /* note: no "tastes like chicken" message for eggs */
        }
        break;
    case C.EUCALYPTUS_LEAF:
        if (((C.Sick && !otmp.cursed) ? 1 : 0))
            C.make_sick(0n, 0, 1, C.SICK_ALL);
        if (((C.Vomiting && !otmp.cursed) ? 1 : 0))
            C.make_vomiting(0n, 1);
        break;
    case C.APPLE:
        if (((otmp.cursed && !C.Sleep_resistance) ? 1 : 0)) {
            /* Snow White; 'poisoned' applies to [a subset of] weapons,
               not food, so we substitute cursed; fortunately our hero
               won't have to wait for a prince to be rescued/revived */
            if (((C.Race_if(C.PM_DWARF) && C.Hallucination) ? 1 : 0)) {
                C.verbalize("Heigh-ho, ho-hum, I think I'll skip work today.");
            } else if (((C.Deaf || !C.flags.acoustics) ? 1 : 0)) {
                C.You("fall asleep.");
            } else {
                
                C.You_hear("sinister laughter as you fall asleep...");
            }
            C.fall_asleep(-C.int(C.int((C.rn2(11, 2595, "fpostfx")) + (20))), 1);
        }
        break;
    }
    return;
}

/* intended for eating a spellbook while polymorphed, but not used;
   "leather" applied to appearance, not composition, and has been
   changed to "leathery" to reflect that */


/*
 * return 0 if the food was not dangerous.
 * return 1 if the food was dangerous and you chose to stop.
 * return 2 if the food was dangerous and you chose to eat it anyway.
 */
export function edibility_prompts(otmp)

{
    /* was rn2(20) */
    /* Blessed food detection grants hero a one-use
     * ability to detect food that is unfit for consumption
     * or dangerous and avoid it.
     */
    const buf=C.stackAlloc(C.BUFSZ),foodsmell=C.stackAlloc(C.BUFSZ),it_or_they=C.stackAlloc(C.QBUFSZ);
    /* 5.0: decaying globs don't become tainted anymore; in 3.6, they did */
    let cadaver = (C.int((otmp.otyp == C.CORPSE))), stoneorslime = C.int(0);
    let material = C.int(C.objects[otmp.otyp].oc_material), mnum = C.int(otmp.corpsenm);
    let rotted = C.long(0n);

    C.Strcpy(foodsmell, C.Tobjnam(otmp, "smell"));
    C.Strcpy(it_or_they, ((C.long(otmp.quan) == C.long(1n)) ? "it" : "they"));

    if (((((((cadaver || (C.long(otmp.otyp) == C.long(C.EGG))) ? 1 : 0) || (otmp.otyp == C.TIN)) ? 1 : 0) || (otmp.otyp == C.GLOB_OF_GREEN_SLIME)) ? 1 : 0)) {
        /* These checks must match those in eatcorpse() */
        (stoneorslime = C.int(((((((C.ismnum(mnum) && C.flesh_petrifies(C.mons[mnum])) ? 1 : 0) && !C.Stone_resistance) ? 1 : 0) && !C.poly_when_stoned(C.gy.youmonst.data)) ? 1 : 0)));

        if ((((mnum == C.PM_GREEN_SLIME) || (otmp.otyp == C.GLOB_OF_GREEN_SLIME)) ? 1 : 0))
            (stoneorslime = C.int(((!C.Unchanging && !C.slimeproof(C.gy.youmonst.data)) ? 1 : 0)));

        if (((cadaver && !((((((((mnum == C.PM_LIZARD) || (mnum == C.PM_LICHEN)) ? 1 : 0) || C.is_rider(C.mons[mnum])) ? 1 : 0) || (mnum == C.PM_ACID_BLOB)) ? 1 : 0))) ? 1 : 0)) {
            let age = C.long(C.peek_at_iced_corpse_age(otmp));

            /* worst case rather than random
               in this calculation to force prompt */
            (rotted = C.long(C.long((C.long(C.long((C.long(C.svm.moves) - C.long(age)))) / C.long(C.long((C.long(10n) + C.long(0))))))));
            if (otmp.cursed)
                (rotted = C.long(C.long(C.long(rotted) + C.long(2n))));
            else if (otmp.blessed)
                (rotted = C.long(C.long(C.long(rotted) - C.long(2n))));
        }
    }

    /*
     * These problems with food should be checked in
     * order from most detrimental to least detrimental.
     */
    C.storeChar(buf, 0);
    if (((((cadaver && (C.long(rotted) > C.long(5n))) ? 1 : 0) && !C.Sick_resistance) ? 1 : 0)) {
        /* Tainted meat */
        C.Snprintf(buf, C.BUFSZ, "%s like %s could be tainted!",
                 foodsmell, it_or_they, 0);
    } else if (stoneorslime) {
        C.Snprintf(buf, C.BUFSZ,
                 "%s like %s could be something very dangerous!",
                 foodsmell, it_or_they, 1);
    } else if (((((cadaver && (C.long(rotted) > C.long(5n))) ? 1 : 0) && C.Sick_resistance) ? 1 : 0)) {
        /* Tainted meat with Sick_resistance (testing for that is
           redundant; we don't get this far for !Sick_resistance)
           needs to be done now even though there is no danger because
           it can't match after the rotten (cadaver && rotted > 3) test */
        C.Snprintf(buf, C.BUFSZ, "%s like %s could be tainted.",
                 foodsmell, it_or_they, 2);
    } else if (((otmp.orotten || ((cadaver && (C.long(rotted) > C.long(3n))) ? 1 : 0)) ? 1 : 0)) {
        /* Rotten */
        C.Snprintf(buf, C.BUFSZ, "%s like %s could be rotten!",
                 foodsmell, it_or_they, 3);
    } else if (((((cadaver && C.poisonous(C.mons[mnum])) ? 1 : 0) && !C.Poison_resistance) ? 1 : 0)) {
        /* poisonous */
        C.Snprintf(buf, C.BUFSZ, "%s like %s might be poisonous!",
                 foodsmell, it_or_they, 4);
    } else if ((((((otmp.otyp == C.APPLE) && otmp.cursed) ? 1 : 0) && !C.Sleep_resistance) ? 1 : 0)) {
        /* causes sleep, for long enough to be dangerous */
        C.Snprintf(buf, C.BUFSZ, "%s like %s might have been poisoned.",
                 foodsmell, it_or_they, 5);
    } else if (((((((cadaver && !C.vegetarian(C.mons[mnum])) ? 1 : 0) && !C.u.uconduct.unvegetarian) ? 1 : 0) && C.Role_if(C.PM_MONK)) ? 1 : 0)) {
        C.Snprintf(buf, C.BUFSZ, "%s unhealthy.", foodsmell, 6);
    } else if (((((cadaver && C.acidic(C.mons[mnum])) ? 1 : 0) && !C.Acid_resistance) ? 1 : 0)) {
        C.Snprintf(buf, C.BUFSZ, "%s rather acidic.", foodsmell, 7);
    } else if (((((((C.Upolyd && (C.u.umonnum == C.PM_RUST_MONSTER)) ? 1 : 0) && C.is_metallic(otmp)) ? 1 : 0) && otmp.oerodeproof) ? 1 : 0)) {
        C.Snprintf(buf, C.BUFSZ, "%s disgusting to you right now.",
                 foodsmell, 8);

    /*
     * Breaks conduct, but otherwise safe.
     */
    } else if (((!C.u.uconduct.unvegan && (((((((((material == C.LEATHER) || (C.long(material) == C.long(C.BONE))) ? 1 : 0) || (material == C.DRAGON_HIDE)) ? 1 : 0) || (material == C.WAX)) ? 1 : 0) || ((cadaver && !C.vegan(C.mons[mnum])) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) {
        C.Snprintf(buf, C.BUFSZ, "%s foul and unfamiliar to you.",
                 foodsmell, 9);
    } else if (((!C.u.uconduct.unvegetarian && (((((((material == C.LEATHER) || (C.long(material) == C.long(C.BONE))) ? 1 : 0) || (material == C.DRAGON_HIDE)) ? 1 : 0) || ((cadaver && !C.vegetarian(C.mons[mnum])) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) {
        C.Snprintf(buf, C.BUFSZ, "%s unfamiliar to you.", foodsmell, 10);
    }

    if (C.loadChar(buf)) {
        C.Snprintf(C.eos(buf), C.ulong((C.ulong(C.BUFSZ) - C.ulong(C.strlen(buf)))), "  Eat %s anyway?",
                 ((C.long(otmp.quan) == C.long(1n)) ? "it" : "one"), 11);
        return C.int(((C.yn_function(buf, C.ynchars, 110, 1) == 110) ? 1 : 2));
    }
    return C.int(0);
}

export function doeat_nonfood(otmp)

{
    let basenutrit; /* nutrition of full item */
    let ll_conduct = C.int(0);
    let nodelicious = C.int(0);
    let material;

    (C.svc.context.victual.reqtime = C.int(1));
    (C.svc.context.victual.piece = otmp);
    (C.svc.context.victual.o_id = C.uint(otmp.o_id));
    /* Don't split it, we don't need to if it's 1 move */
    (C.svc.context.victual.usedtime = C.int(0));
    (C.svc.context.victual.canchoke = (C.u.uhs == C.SATIATED));
    /* Note: gold weighs 1 pt. for each 1000 pieces (see
       pickup.c) so gold and non-gold is consistent. */
    if ((otmp.oclass == C.COIN_CLASS))
        (basenutrit = C.int(((C.long(otmp.quan) > C.long(200000n)) ? 2000 : C.int((C.long((C.long(otmp.quan) / C.long(100n))))))));
    else if ((((C.long(otmp.oclass) == C.long(C.BALL_CLASS)) || (otmp.oclass == C.CHAIN_CLASS)) ? 1 : 0))
        (basenutrit = C.int(C.weight(otmp)));
    /* oc_nutrition is usually weight anyway */
    else
        (basenutrit = C.int(C.objects[otmp.otyp].oc_nutrition));
    if ((otmp.otyp == C.SCR_MAIL)) {
        (basenutrit = C.int(0));
        (nodelicious = C.int(1));
    }
    (C.svc.context.victual.nmod = C.int(basenutrit));
    (C.svc.context.victual.eating = 1); /* needed for lesshungry() */

    if (!C.u.uconduct.food++) {
        ll_conduct++;
        C.livelog_printf(C.LL_CONDUCT, "ate for the first time (%s)",
                       food_xname(otmp, 0));
    }
    (material = C.int(C.objects[otmp.otyp].oc_material));
    if ((((((((material == C.LEATHER) || (C.long(material) == C.long(C.BONE))) ? 1 : 0) || (material == C.DRAGON_HIDE)) ? 1 : 0) || (material == C.WAX)) ? 1 : 0)) {
        if (((!C.u.uconduct.unvegan++ && !ll_conduct) ? 1 : 0)) {
            C.livelog_printf(C.LL_CONDUCT,
                  "consumed animal products for the first time, by eating %s",
                           C.an(food_xname(otmp, 0)));
            ll_conduct++;
        }
        if ((material != C.WAX)) {
            if (((!C.u.uconduct.unvegetarian && !ll_conduct) ? 1 : 0))
                C.livelog_printf(C.LL_CONDUCT,
                   "tasted meat by-products for the first time, by eating %s",
                               C.an(food_xname(otmp, 0)));
            violated_vegetarian();
        }
    }

    if (otmp.cursed) {
        rottenfood(otmp);
        (nodelicious = C.int(1));
    } else if ((C.objects[otmp.otyp].oc_material == C.PAPER))
        (nodelicious = C.int(1));

    if ((((otmp.oclass == C.WEAPON_CLASS) && otmp.opoisoned) ? 1 : 0)) {
        C.pline("Ecch - that must have been poisonous!");
        if (!C.Poison_resistance) {
            C.poison_strdmg(C.rnd(4, 2798, "doeat_nonfood"), C.rnd(15, 2798, "doeat_nonfood"), C.xname(otmp), C.KILLED_BY_AN);
        } else
            C.You("seem unaffected by the poison.");
    } else if (!nodelicious) {
        C.pline("%s%s is delicious!",
              (((C.obj_is_pname(otmp) && (otmp.oartifact < C.ART_ORB_OF_DETECTION)) ? 1 : 0) ? "" : "This "),
              ((otmp.oclass == C.COIN_CLASS) ? foodword(otmp) : C.singular(otmp, C.xname)));
    }
    eatspecial();
    return C.int(C.ECMD_TIME);
}

/* the #eat command */
export function doeat()

{
    /*eggs*/
    /*milk*/
    let otmp;
    let basenutrit; /* nutrition of full item */
    let dont_start = C.int(0),
            already_partly_eaten;
    let ll_conduct = C.int(0);

    if (C.Strangled) {
        C.pline("If you can't breathe air, how can you consume solids?");
        return C.int(C.ECMD_OK);
    }
    if (!((otmp = C.callLocal(floorfood, "eat", 0))))
        return C.int(C.ECMD_OK);
    if (C.check_capacity(0))
        return C.int(C.ECMD_OK);

    if (C.u.uedibility) {
        let res = C.int(C.callLocal(edibility_prompts, otmp));

        if (res) {
            C.Your(
               "%s stops tingling and your sense of smell returns to normal.",
                 C.body_part(C.NOSE));
            (C.u.uedibility = 0);
            if ((res == 1))
                return C.int(C.ECMD_OK);
        }
    }

    /* from floorfood(), &hands_obj means iron bars at current spot */
    if (C.samePtr(otmp, C.hands_obj)) {
        /* hero in metallivore form is eating [diggable] iron bars
           at current location so skip the other assorted checks;
           operates as if digging rather than via the eat occupation */
        if (((C.still_chewing(C.u.ux, C.u.uy) && (C.levl[C.u.ux][C.u.uy].typ == C.IRONBARS)) ? 1 : 0)) {
            /* this is verbose, but player will see the hero rather than the
               bars so wouldn't know that more turns of eating are required */
            C.You("pause to swallow.");
        }
        return C.int(C.ECMD_TIME);
    }
    /* We have to make non-foods take 1 move to eat, unless we want to
     * do ridiculous amounts of coding to deal with partly eaten plate
     * mails, players who polymorph back to human in the middle of their
     * metallic meal, etc....
     */
    if (!is_edible(otmp)) {
        C.You("cannot eat that!");
        return C.int(C.ECMD_OK);
    } else if ((C.ulong(C.ulong((C.ulong(otmp.owornmask) & C.ulong(C.ulong((C.ulong(C.ulong((C.ulong(C.ulong((C.ulong(C.W_ARMOR) | C.ulong(C.W_TOOL)))) | C.ulong(C.W_AMUL)))) | C.ulong(C.W_SADDLE))))))) != C.ulong(0))) {
        /* let them eat rings */
        C.You_cant("eat %s you're wearing.", C.something);
        return C.int(C.ECMD_OK);
    } else if (!((C.carried(otmp) ? C.retouch_object(C.objectReference(() => otmp, value => { (otmp = value); }), 0) : C.touch_artifact(otmp, C.gy.youmonst)))) {
        return C.int(C.ECMD_TIME); /* got blasted so use a turn */
    }
    if (((((C.is_metallic(otmp) && (C.u.umonnum == C.PM_RUST_MONSTER)) ? 1 : 0) && otmp.oerodeproof) ? 1 : 0)) {
        (otmp.rknown = 1);
        if ((C.long(otmp.quan) > C.long(1n))) {
            if (!C.carried(otmp))
                C.splitobj(otmp, C.long((C.long(otmp.quan) - C.long(1n))));
            else
                (otmp = C.splitobj(otmp, 1n));
        }
        C.pline("Ulch - that %s was rustproofed!", C.xname(otmp));
        /* The regurgitated object's rustproofing is gone now */
        (otmp.oerodeproof = 0);
        C.make_stunned(C.long((C.long(C.long((C.long(C.HStun) & C.long(C.TIMEOUT)))) + C.long(C.long(C.rn2(10, 2888, "doeat"))))), 1);
        /*
         * We don't expect rust monsters to be wielding welded weapons
         * or wearing cursed rings which were rustproofed, but guard
         * against the possibility just in case.
         */
        if (((C.welded(otmp) || ((otmp.cursed && C.ulong((C.ulong(otmp.owornmask) & C.ulong(C.W_RING)))) ? 1 : 0)) ? 1 : 0)) {
            C.set_bknown(otmp, 1); /* for ring; welded() does this for weapon */
            C.You("spit out %s.", C.the(C.xname(otmp)));
        } else {
            C.You("spit %s out onto the %s.", C.the(C.xname(otmp)),
                C.surface(C.u.ux, C.u.uy));
            if (C.carried(otmp)) {
                /* no need to check for leash in use; it's not metallic */
                if (otmp.owornmask)
                    C.remove_worn_item(otmp, 0);
                C.freeinv(otmp);
                C.dropy(otmp);
            }
            C.stackobj(otmp);
        }
        return C.int(C.ECMD_TIME);
    }
    /* KMH -- Slow digestion is... indigestible */
    if ((otmp.otyp == C.RIN_SLOW_DIGESTION)) {
        C.pline("This ring is indigestible!");
        rottenfood(otmp);
        if (otmp.dknown)
            C.trycall(otmp);
        return C.int(C.ECMD_TIME);
    }
    if ((otmp.oclass != C.FOOD_CLASS))
        return C.int(doeat_nonfood(otmp));


    if (C.samePtr(otmp, C.svc.context.victual.piece)) {
        let one_bite_left = (C.int((C.int((C.svc.context.victual.usedtime) + (1)) >= C.svc.context.victual.reqtime)));

        /* If they weren't able to choke, they don't suddenly become able to
         * choke just because they were interrupted.  On the other hand, if
         * they were able to choke before, if they lost food it's possible
         * they shouldn't be able to choke now.
         */
        if ((C.u.uhs != C.SATIATED))
            (C.svc.context.victual.canchoke = 0);
        (C.svc.context.victual.o_id = C.uint(0));
        (otmp = touchfood(otmp));
        if (otmp) {
            (C.svc.context.victual.piece = otmp);
            (C.svc.context.victual.o_id = C.uint(otmp.o_id));
        } else {
            do_reset_eat();
        }
        /* if there's only one bite left, there sometimes won't be any
           "you finish eating" message when done; use different wording
           for resuming with one bite remaining instead of trying to
           determine whether or not "you finish" is going to be given */
        C.You("%s your meal.",
            (!one_bite_left ? "resume" : "consume the last bite of"));
        if (otmp)
            start_eating(otmp, 0);
        return C.int(C.ECMD_TIME);
    }

    /* nothing in progress - so try to find something. */
    /* tins are a special case */
    /* tins must also check conduct separately in case they're discarded */
    if ((otmp.otyp == C.TIN)) {
        start_tin(otmp);
        return C.int(C.ECMD_TIME);
    }

    /* KMH, conduct */
    if (!C.u.uconduct.food++) {
        C.livelog_printf(C.LL_CONDUCT, "ate for the first time - %s",
                       food_xname(otmp, 0));
        ll_conduct++;
    }

    (already_partly_eaten = C.int((otmp.oeaten ? 1 : 0)));
    (otmp = touchfood(otmp));
    if (otmp) {
        (C.svc.context.victual.piece = otmp);
        (C.svc.context.victual.o_id = C.uint(otmp.o_id));
        (C.svc.context.victual.usedtime = C.int(0));
    } else {
        do_reset_eat();
        return C.int(C.ECMD_TIME);
    }

    /* Now we need to calculate delay and nutritional info.
     * The base nutrition calculated here and in eatcorpse() accounts
     * for normal vs. rotten food.  The reqtime and nutrit values are
     * then adjusted in accordance with the amount of food left.
     */
    if ((((otmp.otyp == C.CORPSE) || otmp.globby) ? 1 : 0)) {
        let tmp = C.int(eatcorpse(otmp));

        if ((tmp == 2)) {
            /* used up */
            C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece=0, .o_id=0 */
            return C.int(C.ECMD_TIME);
        } else if (tmp)
            (dont_start = C.int(1));
        /* if not used up, eatcorpse sets up reqtime and may modify oeaten */
    } else {
        /* No checks for WAX, LEATHER, BONE, DRAGON_HIDE.  These are
         * all handled in the != FOOD_CLASS case, above.
         */
        switch (C.objects[otmp.otyp].oc_material) {
        case C.FLESH:
            if (((!C.u.uconduct.unvegan++ && !ll_conduct) ? 1 : 0)) {
                C.livelog_printf(C.LL_CONDUCT,
                  "consumed animal products for the first time, by eating %s",
                               C.an(food_xname(otmp, 0)));
                ll_conduct++;
            }
            if ((C.long(otmp.otyp) != C.long(C.EGG))) {
                if (((!C.u.uconduct.unvegetarian && !ll_conduct) ? 1 : 0))
                    C.livelog_printf(C.LL_CONDUCT,
                               "tasted meat for the first time, by eating %s",
                                   C.an(food_xname(otmp, 0)));

                violated_vegetarian();
            }
            break;
        default:
            if ((((((((((otmp.otyp == C.PANCAKE) || (otmp.otyp == C.FORTUNE_COOKIE)) ? 1 : 0) || (otmp.otyp == C.CREAM_PIE)) ? 1 : 0) || (otmp.otyp == C.CANDY_BAR)) ? 1 : 0) || (otmp.otyp == C.LUMP_OF_ROYAL_JELLY)) ? 1 : 0))
                if (((!C.u.uconduct.unvegan++ && !ll_conduct) ? 1 : 0))
                    C.livelog_printf(C.LL_CONDUCT,
                           "consumed animal products (%s) for the first time",
                                   food_xname(otmp, 0));
            break;
        }

        (C.svc.context.victual.reqtime = C.int(C.objects[otmp.otyp].oc_delay));
        if ((((otmp.otyp != C.FORTUNE_COOKIE) && ((otmp.cursed || ((((!((((otmp.otyp == C.LEMBAS_WAFER) || (otmp.otyp == C.CRAM_RATION)) ? 1 : 0)) && (C.long(C.long((C.long(C.svm.moves) - C.long(otmp.age)))) > C.long((otmp.blessed ? 50n : 30n)))) ? 1 : 0) && ((otmp.orotten || !C.rn2(7, 3031, "doeat")) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) {
            if (rottenfood(otmp)) {
                (otmp.orotten = 1);
                (dont_start = C.int(1));
            }
            C.callLocal(consume_oeaten, otmp, 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!fprefx(otmp)) {
                do_reset_eat();
                return C.int(C.ECMD_TIME);
            }
        } else {
            C.You("%s %s.",
                ((C.svc.context.victual.reqtime == 1) ? "eat" : "begin eating"),
                C.doname(otmp));
        }
    }

    /* re-calc the nutrition */
    (basenutrit = C.int(C.int(obj_nutrition(otmp))));

    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline(
     "before rounddiv: victual.reqtime == %d, oeaten == %d, basenutrit == %d",
                C.svc.context.victual.reqtime, otmp.oeaten, basenutrit); (C.iflags.last_msg = C.int(save_plnmsg)); }

    (C.svc.context.victual.reqtime = C.int(((basenutrit == 0) ? 0 : C.rounddiv(C.long((C.long(C.svc.context.victual.reqtime) * C.long(C.long(otmp.oeaten)))),
                     basenutrit))));

    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("after rounddiv: victual.reqtime == %d",
                C.svc.context.victual.reqtime); (C.iflags.last_msg = C.int(save_plnmsg)); }
    /*
     * calculate the modulo value (nutrit. units per round eating)
     * note: this isn't exact - you actually lose a little nutrition due
     *       to this method.
     * TODO: add in a "remainder" value to be given at the end of the meal.
     */
    if ((((C.svc.context.victual.reqtime == 0) || (otmp.oeaten == 0)) ? 1 : 0))
        /* possible if most has been eaten before */
        (C.svc.context.victual.nmod = C.int(0));
    else if ((C.int(otmp.oeaten) >= C.svc.context.victual.reqtime))
        (C.svc.context.victual.nmod = C.int(-(C.int((C.int(otmp.oeaten)) / (C.svc.context.victual.reqtime)))));
    else
        (C.svc.context.victual.nmod = C.int((C.svc.context.victual.reqtime % otmp.oeaten)));
    (C.svc.context.victual.canchoke = (C.u.uhs == C.SATIATED));

    if (!dont_start)
        start_eating(otmp, already_partly_eaten);
    else
        (otmp.owt = C.uint(C.weight(otmp)));
    return C.int(C.ECMD_TIME);
}

/* getobj callback for object to be opened with a tin opener */
export function tinopen_ok(obj)

{
    if (((obj && (obj.otyp == C.TIN)) ? 1 : 0))
        return C.int(C.GETOBJ_SUGGEST);

    return C.int(C.GETOBJ_EXCLUDE);
}


export function use_tin_opener(obj)

{
    let otmp;
    let res = C.int(C.ECMD_OK);

    if (!C.carrying(C.TIN)) {
        C.You("have no tin to open.");
        return C.int(C.ECMD_OK);
    }

    if (!C.samePtr(obj, C.uwep)) {
        if (((obj.cursed && obj.bknown) ? 1 : 0)) {
            const qbuf=C.stackAlloc(C.QBUFSZ);

            if ((C.ynq(C.safe_qbuf(qbuf, "Really wield ", "?",
                              obj, C.doname, C.thesimpleoname, "that")) != 121))
                return C.int(C.ECMD_OK);
        }
        if (!C.wield_tool(obj, "use"))
            return C.int(C.ECMD_OK);
        (res = C.int(C.ECMD_TIME));
    }

    (otmp = C.getobj("open", tinopen_ok, C.GETOBJ_NOFLAGS));
    if (!otmp)
        return C.int(C.long((C.long(res) | C.long(C.ECMD_CANCEL))));

    start_tin(otmp);
    return C.int(C.ECMD_TIME);
}

/* Take a single bite from a piece of food, checking for choking and
 * modifying usedtime.  Returns 1 if they choked and survived, 0 otherwise.
 */
export function bite()

{
    /* hack to pacify static analyzer incorporated into gcc 12.2 */
    C.sa_victual(C.svc.context.victual);

    if (((C.svc.context.victual.canchoke && (C.u.uhunger >= 2000)) ? 1 : 0)) {
        choke(C.svc.context.victual.piece);
        return C.int(1);
    }
    if (C.svc.context.victual.doreset) {
        do_reset_eat();
        return C.int(0);
    }
    (C.gf.force_save_hs = C.int(1));
    if ((C.svc.context.victual.nmod < 0)) {
        lesshungry(adj_victual_nutrition(/*-svc.context.victual.nmod*/));
        C.callLocal(consume_oeaten, C.svc.context.victual.piece,
                       C.svc.context.victual.nmod); /* -= -nmod */
    } else if ((((C.svc.context.victual.nmod > 0) && (C.svc.context.victual.usedtime % C.svc.context.victual.nmod)) ? 1 : 0)) {
        lesshungry(1);
        C.callLocal(consume_oeaten, C.svc.context.victual.piece, -1); /* -= 1 */
    }
    (C.gf.force_save_hs = C.int(0));
    recalc_wt();
    return C.int(0);
}

/* as time goes by - called by moveloop(every move) & domove(melee attack) */
export function gethungry()

{
    /* slow metabolic rate while asleep */
    /* more hungry if +/- is nonzero or +/- doesn't apply or
                   +0 ring of protection is only source of protection;
                   need to check whether both rings are +0 protection or
                   they'd both slip by the "is there another source?" test,
                   but don't do that for both rings or they will both be
                   treated as supplying "MC" when only one matters;
                   note: amulet of guarding overrides both +0 rings and
                   is caught by the (EProtection & ~W_RINGx) == 0L tests */
    let accessorytime;

    if (((C.u.uinvulnerable || C.iflags.debug_hunger) ? 1 : 0))
        return; /* you don't feel hungrier */

    /* being polymorphed into a creature which doesn't eat prevents
       this first uhunger decrement, but to stay in such form the hero
       will need to wear an Amulet of Unchanging so still burn a small
       amount of nutrition in the 'moves % 20' ring/amulet check below */
    if (((((((!C.Unaware || !C.rn2(10, 3174, "gethungry")) ? 1 : 0) && ((((C.carnivorous(C.gy.youmonst.data) || C.herbivorous(C.gy.youmonst.data)) ? 1 : 0) || C.metallivorous(C.gy.youmonst.data)) ? 1 : 0)) ? 1 : 0) && !C.Slow_digestion) ? 1 : 0))
        C.u.uhunger--; /* ordinary food consumption */

    /*
     * 5.0:  trigger is randomized instead of (moves % N).  Makes
     * ring juggling (using the 'time' option to see the turn counter
     * in order to time swapping of a pair of rings of slow digestion,
     * wearing one on one hand, then putting on the other and taking
     * off the first, then vice versa, over and over and over and ...
     * to avoid any hunger from wearing a ring) become ineffective.
     * Also causes melee-induced hunger to vary from turn-based hunger
     * instead of just replicating that.
     */
    (accessorytime = C.int(C.rn2(20, 3191, "gethungry"))); /* rn2(20) replaces (int) (svm.moves % 20L) */
    if ((accessorytime % 2)) { /* odd */
        /* Regeneration uses up food, unless due to an artifact */
        if (((C.long((C.long(C.HRegeneration) & C.long(~C.FROMFORM))) || C.ulong((C.ulong(C.ERegeneration) & C.ulong(~(C.ulong((C.ulong(C.W_ARTI) | C.ulong(C.W_WEP)))))))) ? 1 : 0))
            C.u.uhunger--;
        if ((C.near_capacity() > C.SLT_ENCUMBER))
            C.u.uhunger--;
    } else { /* even */
        if (C.Hunger)
            C.u.uhunger--;
        /* Conflict uses up food too */
        if (((C.HConflict || C.long((C.long(C.EConflict) & C.long(~C.W_ARTI)))) ? 1 : 0))
            C.u.uhunger--;
        /*
         * +0 charged rings don't do anything, so don't affect hunger.
         * Slow digestion cancels movement and melee hunger but still
         * causes ring hunger.
         * Possessing the real Amulet imposes a separate hunger penalty
         * from wearing an amulet (so gets a double penalty when worn).
         *
         * 5.0.0:  Worn meat rings don't affect hunger.
         * Same with worn cheap plastic imitation of the Amulet.
         * +0 ring of protection might do something (enhanced "magical
         * cancellation") if hero doesn't have protection from some
         * other source (cloak or second ring).
         *
         * [If wearing duplicate rings whose effects don't stack,
         * should they both consume nutrition, or just one of them?
         * Two +0 rings of protection are treated as if only one,
         * but this could apply to most rings.]
         */
        switch (accessorytime) { /* note: use even cases among 0..19 only */
        case 0:
            /* 5.0: if not wearing a ring of slow digestion, obtaining
               that property from worn armor (white dragon scales/mail)
               causes the armor to burn nutrition; since it's not
               actually a ring, we don't check for it on the ring
               turns; because of that, wearing two (non-slow digestion)
               rings plus the armor consumes more nutrition that one
               non-slow digestion ring plus ring of slow digestion */
            if (((((C.Slow_digestion && ((!C.uright || (C.uright.otyp != C.RIN_SLOW_DIGESTION)) ? 1 : 0)) ? 1 : 0) && ((!C.uleft || (C.uleft.otyp != C.RIN_SLOW_DIGESTION)) ? 1 : 0)) ? 1 : 0))
                C.u.uhunger--;
            break;
        case 4:
            if (((((C.uleft && (C.uleft.otyp != C.MEAT_RING)) ? 1 : 0) && ((((C.uleft.spe || !C.objects[C.uleft.otyp].oc_charged) ? 1 : 0) || (((C.uleft.otyp == C.RIN_PROTECTION) && (((C.ulong(C.ulong((C.ulong(C.EProtection) & C.ulong(~C.W_RINGL)))) == C.ulong(0n)) || (((((((C.ulong(C.ulong((C.ulong(C.EProtection) & C.ulong(~C.W_RINGL)))) == C.ulong(C.W_RINGR)) && C.uright) ? 1 : 0) && (C.uright.otyp == C.RIN_PROTECTION)) ? 1 : 0) && !C.uright.spe) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
                C.u.uhunger--;
            break;
        case 8:
            if (((C.uamul && (C.uamul.otyp != C.FAKE_AMULET_OF_YENDOR)) ? 1 : 0))
                C.u.uhunger--;
            break;
        case 12:
            if (((((C.uright && (C.uright.otyp != C.MEAT_RING)) ? 1 : 0) && ((((C.uright.spe || !C.objects[C.uright.otyp].oc_charged) ? 1 : 0) || (((C.uright.otyp == C.RIN_PROTECTION) && (C.ulong(C.ulong((C.ulong(C.EProtection) & C.ulong(~C.W_RINGR)))) == C.ulong(0n))) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
                C.u.uhunger--;
            break;
        case 16:
            if (C.u.uhave.amulet)
                C.u.uhunger--;
            break;
        default:
            break;
        }
    }
    newuhs(1);
}

/* called after vomiting and after performing feats of magic */
export function morehungry(num)

{
    (num = C.int(C.int(num)));
    (C.u.uhunger = C.int((C.u.uhunger) - (num)));
    newuhs(1);
}

/* called after eating (and after drinking fruit juice) */
export function lesshungry(num)

{
    (num = C.int(C.int(num)));
    /* See comments in newuhs() for discussion on force_save_hs */
    let iseating = C.int((((C.go.occupation == eatfood) || C.gf.force_save_hs) ? 1 : 0));

    if (C.debugcore("eat.c",1)) { let save_plnmsg=C.int(C.iflags.last_msg); C.pline("lesshungry(%d)", num); (C.iflags.last_msg = C.int(save_plnmsg)); }
    (C.u.uhunger = C.int((C.u.uhunger) + (num)));
    if ((C.u.uhunger >= 2000)) {
        if (((!iseating || C.svc.context.victual.canchoke) ? 1 : 0)) {
            if (iseating) {
                choke(C.svc.context.victual.piece);
                reset_eat();
            } else {
                choke(((C.go.occupation == opentin) ? C.svc.context.tin.tin : 0));
                /* no reset_eat() */
            }
        }
    } else {
        /* Have lesshungry() report when you're nearly full so all eating
         * warns when you're about to choke.
         */
        if ((((((C.u.uhunger >= 1500) && !C.Hunger) ? 1 : 0) && ((!C.svc.context.victual.eating || ((C.svc.context.victual.eating && !C.svc.context.victual.fullwarn) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) {
            C.pline("You're having a hard time getting all of it down.");
            (C.gn.nomovemsg = "You're finally finished.");
            if (!C.svc.context.victual.eating) {
                (C.gm.multi = C.long(-2));
            } else {
                (C.svc.context.victual.fullwarn = 1);
                if (((C.svc.context.victual.canchoke && (C.int((C.svc.context.victual.reqtime) - (C.svc.context.victual.usedtime)) > 1)) ? 1 : 0)) {
                    /* food with one bite left will not survive a stop */
                    if (!C.paranoid_query(C.ParanoidEating, "Continue eating?")) {
                        reset_eat();
                        (C.gn.nomovemsg = 0);
                    }
                }
            }
        }
    }
    newuhs(0);
}

export function unfaint()

{
    Hear_again();
    if ((C.u.uhs > C.FAINTING))
        (C.u.uhs = C.uint(C.FAINTING));
    C.stop_occupation();
    (C.disp.botl = C.int(1));
    return C.int(0);
}

export function is_fainted()

{
    return C.int(C.boolean(((C.u.uhs == C.FAINTED))));
}

/* call when a faint must be prematurely terminated */
export function reset_faint()

{
    if ((C.ga.afternmv == unfaint))
        C.unmul("You revive.");
}

/* compute and comment on your (new?) hunger status */
export function newuhs(incr)

{
    (incr = C.int(C.boolean(incr)));
    let newhs;
    const save_hs = C.staticCell("newuhs.save_hs", "Uint32");
    const saved_hs = C.staticCell("newuhs.saved_hs", "Int8");
    let h = C.int(C.u.uhunger);

    (newhs = C.uint(((h > 1000) ? C.SATIATED : ((h > 150) ? C.NOT_HUNGRY : ((h > 50) ? C.HUNGRY : ((h > 0) ? C.WEAK : C.FAINTING))))));

    /* While you're eating, you may pass from WEAK to HUNGRY to NOT_HUNGRY.
     * This should not produce the message "you only feel hungry now";
     * that message should only appear if HUNGRY is an endpoint.  Therefore
     * we check to see if we're in the middle of eating.  If so, we save
     * the first hunger status, and at the end of eating we decide what
     * message to print based on the _entire_ meal, not on each little bit.
     */
    /* It is normally possible to check if you are in the middle of a meal
     * by checking occupation == eatfood, but there is one special case:
     * start_eating() can call bite() for your first bite before it
     * sets the occupation.
     * Anyone who wants to get that case to work _without_ an ugly static
     * force_save_hs variable, feel free.
     */
    /* Note: If you become a certain hunger status in the middle of the
     * meal, and still have that same status at the end of the meal,
     * this will incorrectly print the associated message at the end of
     * the meal instead of the middle.  Such a case is currently
     * impossible, but could become possible if a message for SATIATED
     * were added or if HUNGRY and WEAK were separated by a big enough
     * gap to fit two bites.
     */
    if ((((C.go.occupation == eatfood) || C.gf.force_save_hs) ? 1 : 0)) {
        if (!saved_hs.value) {
            (save_hs.value = C.int(C.u.uhs));
            (saved_hs.value = C.int(1));
        }
        (C.u.uhs = C.uint(newhs));
        return;
    } else {
        if (saved_hs.value) {
            (C.u.uhs = C.uint(save_hs.value));
            (saved_hs.value = C.int(0));
        }
    }

    if ((newhs == C.FAINTING)) {
        /* u,uhunger is likely to be negative at this point */
        let uhunger_div_by_10 = C.int(Math.imul(C.sgn(C.u.uhunger), C.int((C.int((C.abs(C.u.uhunger)) + (5))) / (10))));

        if (is_fainted())
            (newhs = C.uint(C.FAINTED));
        if ((((C.u.uhs <= C.WEAK) || (C.rn2(C.int((20) - (uhunger_div_by_10)), 3416, "newuhs") >= 19)) ? 1 : 0)) {
            if (((!is_fainted() && (C.long(C.gm.multi) >= C.long(0))) ? 1 : 0) /* %% */) {
                let duration = C.int(C.int((10) - (uhunger_div_by_10)));

                /* stop what you're doing, then faint */
                C.stop_occupation();
                C.You("faint from lack of food.");
                C.incr_itimeout(C.propertyReference("HDeaf"), duration);
                (C.disp.botl = C.int(1));
                C.nomul(-duration);
                (C.gm.multi_reason = "fainted from lack of food");
                (C.gn.nomovemsg = "You regain consciousness.");
                (C.ga.afternmv = unfaint);
                (newhs = C.uint(C.FAINTED));
                if (!C.Levitation)
                    C.selftouch("Falling, you");
            }

        /* this used to be -(200 + 20 * Con) but that was when being asleep
           suppressed per-turn uhunger decrement but being fainted didn't;
           now uhunger becomes more negative at a slower rate */
        } else if ((C.u.uhunger < -(C.int((100) + (Math.imul(10, C.int(C.ACURR(C.A_CON)))))))) {
            (C.u.uhs = C.uint(C.STARVED));
            (C.disp.botl = C.int(1));
            C.bot();
            C.You("die from starvation.");
            (C.svk.killer.format = C.int(C.KILLED_BY));
            C.Strcpy(C.svk.killer.name, "starvation");
            C.done(C.STARVING);
            /* if we return, we lifesaved, and that calls newuhs */
            return;
        }
    }

    if ((newhs != C.u.uhs)) {
        if ((((newhs >= C.WEAK) && (C.u.uhs < C.WEAK)) ? 1 : 0)) {
            /* this used to be losestr(1) which had the potential to
               be fatal (still handled below) by reducing HP if it
               tried to take base strength below minimum of 3 */
            (C.u.atemp.a[C.A_STR] = C.int(-1)); /* temporary loss overrides Fixed_abil */
            /* defer context.botl status update until after hunger message */
        } else if ((((newhs < C.WEAK) && (C.u.uhs >= C.WEAK)) ? 1 : 0)) {
            /* this used to be losestr(-1) which could be abused by
               becoming weak while wearing ring of sustain ability,
               removing ring, eating to 'restore' strength which boosted
               strength by a point each time the cycle was performed;
               substituting "while polymorphed" for sustain ability and
               "rehumanize" for ring removal might have done that too */
            (C.u.atemp.a[C.A_STR] = C.int(0)); /* repair of loss also overrides Fixed_abil */
            /* defer context.botl status update until after hunger message */
        }

        switch (newhs) {
        case C.HUNGRY:
            if (C.Hallucination) {
                C.You((!incr ? "now have a lesser case of the munchies." : "are getting the munchies."));
            } else
                C.You("%s.", (!incr ? "only feel hungry now" : ((C.u.uhunger < 145) ? "feel hungry" : "are beginning to feel hungry")));
            if (((((incr && C.go.occupation) ? 1 : 0) && (((C.go.occupation != eatfood) && (C.go.occupation != opentin)) ? 1 : 0)) ? 1 : 0))
                C.stop_occupation();
            C.end_running(1);
            break;
        case C.WEAK:
            if (C.Hallucination)
                C.pline((!incr ? "You still have the munchies." : "The munchies are interfering with your motor capabilities."));
            else if (((incr && ((((C.Role_if(C.PM_WIZARD) || C.Race_if(C.PM_ELF)) ? 1 : 0) || C.Role_if(C.PM_VALKYRIE)) ? 1 : 0)) ? 1 : 0))
                C.pline("%s needs food, badly!",
                      (((C.Role_if(C.PM_WIZARD) || C.Role_if(C.PM_VALKYRIE)) ? 1 : 0) ? C.gu.urole.name.m : "Elf"));
            else
                C.You("%s weak.", (!incr ? "are still" : ((C.u.uhunger < 45) ? "feel" : "are beginning to feel")));
            if (((((incr && C.go.occupation) ? 1 : 0) && (((C.go.occupation != eatfood) && (C.go.occupation != opentin)) ? 1 : 0)) ? 1 : 0))
                C.stop_occupation();
            C.end_running(1);
            break;
        }
        (C.u.uhs = C.uint(newhs));
        (C.disp.botl = C.int(1));
        C.bot();
        if (((C.Upolyd ? C.u.mh : C.u.uhp) < 1)) {
            C.You("die from hunger and exhaustion.");
            (C.svk.killer.format = C.int(C.KILLED_BY));
            C.Strcpy(C.svk.killer.name, "exhaustion");
            C.done(C.STARVING);
            return;
        }
    }
}

/* getobj callback for object to eat - effectively just wraps is_edible() */
export function eat_ok(obj)

{
    /* 'getobj_else' will be non-zero if floor food is present and
       player declined to eat that; used to insert "else" into
       "you don't have anything [else] to eat" if not carrying any food */
    if (!obj)
        return C.int((C.getobj_else ? C.GETOBJ_EXCLUDE_NONINVENT : C.GETOBJ_EXCLUDE));

    if (is_edible(obj))
        return C.int(C.GETOBJ_SUGGEST);

    /* make sure to exclude, not downplay, gold (if not is_edible) in order to
     * produce the "You cannot eat gold" message in getobj */
    if ((obj.oclass == C.COIN_CLASS))
        return C.int(C.GETOBJ_EXCLUDE);

    return C.int(C.GETOBJ_EXCLUDE_SELECTABLE);
}

/* getobj callback for object to be offered (corpses and things that look like
 * the Amulet only */
export function offer_ok(obj)

{
    if (!obj)
        return C.int((C.getobj_else ? C.GETOBJ_EXCLUDE_NONINVENT : C.GETOBJ_EXCLUDE));

    if ((((obj.oclass != C.FOOD_CLASS) && (obj.oclass != C.AMULET_CLASS)) ? 1 : 0))
        return C.int(C.GETOBJ_EXCLUDE);

    if ((((((obj.otyp != C.CORPSE) && (obj.otyp != C.AMULET_OF_YENDOR)) ? 1 : 0) && (obj.otyp != C.FAKE_AMULET_OF_YENDOR)) ? 1 : 0))
        return C.int(C.GETOBJ_EXCLUDE_SELECTABLE);

    /* suppress corpses on astral, amulets elsewhere
     * (!astral && amulet) || (astral && !amulet) */
    if ((C.Is_astralevel(C.u.uz) ^ (obj.oclass == C.AMULET_CLASS)))
        return C.int(C.GETOBJ_DOWNPLAY);

    return C.int(C.GETOBJ_SUGGEST);
}

/* getobj callback for object to be tinned */
export function tin_ok(obj)

{
    if (!obj)
        return C.int((C.getobj_else ? C.GETOBJ_EXCLUDE_NONINVENT : C.GETOBJ_EXCLUDE));

    if ((obj.oclass != C.FOOD_CLASS))
        return C.int(C.GETOBJ_EXCLUDE);

    if ((((obj.otyp != C.CORPSE) || !C.tinnable(obj)) ? 1 : 0))
        return C.int(C.GETOBJ_EXCLUDE_SELECTABLE);

    return C.int(C.GETOBJ_SUGGEST);
}

/* Returns an object representing food.
 * Object may be either on floor or in inventory.
 */
export function floorfood(
    verb,
    corpsecheck)
 /* 0, no check, 1, corpses, 2, tinnable corpses */
{
    (corpsecheck = C.int(C.int(corpsecheck)));
    let otmp;
    const qbuf=C.stackAlloc(C.QBUFSZ);
    let c;
    let uptr = C.gy.youmonst.data;
    let feeding = C.int(!C.strcmp(verb, "eat")),        /* corpsecheck==0 */
            offering = C.int(!C.strcmp(verb, "sacrifice")); /* corpsecheck==1 */

    (C.getobj_else = C.int(0)); /* haven't asked about floor food; is used to vary
                      * "you don't have anything [else] to eat" when
                      * floor food has been declined and inventory lacks
                      * any suitable items */
    /* if we can't touch floor objects then use invent food only;
       same when 'm' prefix is used--for #eat, it means "skip floor food" */
    skipfloor: {
    if (((((((C.iflags.menu_requested || !C.can_reach_floor(1)) ? 1 : 0) || ((feeding && C.u.usteed) ? 1 : 0)) ? 1 : 0) || ((C.is_pool_or_lava(C.u.ux, C.u.uy) && ((((C.Wwalking || C.is_clinger(uptr)) ? 1 : 0) || ((C.Flying && !C.Breathless) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
        break skipfloor;

    if (((feeding && C.metallivorous(uptr)) ? 1 : 0)) {
        let gold;
        let ttmp = C.t_at(C.u.ux, C.u.uy);

        if (((((ttmp && ttmp.tseen) ? 1 : 0) && (ttmp.ttyp == C.BEAR_TRAP)) ? 1 : 0)) {
            let u_in_beartrap = (C.int(((C.u.utrap && (C.u.utraptype == C.TT_BEARTRAP)) ? 1 : 0)));

            /* If not already stuck in the trap, perhaps there should
               be a chance to becoming trapped?  Probably not, because
               then the trap would just get eaten on the _next_ turn... */
            C.Sprintf(qbuf, "There is a bear trap here (%s); eat it?",
                    (u_in_beartrap ? "holding you" : "armed"));
            if (((c = C.int(C.yn_function(qbuf, C.ynqchars, 110, 1))) == 121)) {
                let beartrap;

                C.deltrap(ttmp);
                if (u_in_beartrap)
                    C.reset_utrap(1);
                (beartrap = C.mksobj(C.BEARTRAP, 1, 0));
                C.Sprintf(qbuf,"You only manage to %s the bear trap.",
                        (u_in_beartrap ? "free yourself from" : "disarm"));
                if (((C.check_capacity(qbuf) && beartrap) ? 1 : 0)) {
                    C.obj_extract_self(beartrap);
                    C.dropy(beartrap);           /* put it on the floor */
                    return 0;
                }
                return beartrap;
            } else if ((c == 113)) {
                return 0;
            }
            ++C.getobj_else;
        }
        if ((C.levl[C.u.ux][C.u.uy].typ == C.IRONBARS)) {
            /* already verified that hero is metallivorous above */
            let nodig = C.int((C.ulong((C.levl[C.u.ux][C.u.uy].wall_info & C.W_NONDIGGABLE)) != C.ulong(0)));

            (c = C.int(110));
            C.Strcpy(qbuf, "There are iron bars here");
            if (((nodig || (C.u.uhunger > 1500)) ? 1 : 0)) {
                C.pline("%s but you %s eat them.", qbuf,
                      (nodig ? "cannot" : "are too full to"));
            } else {
                C.Strcat(qbuf, (((((!C.svc.context.digging.chew || !C.u_at(C.svc.context.digging.pos.x,
                                       C.svc.context.digging.pos.y)) ? 1 : 0) || !C.on_level(C.svc.context.digging.level, C.u.uz)) ? 1 : 0) ? "; eat them?" : "; resume eating them?"));
                (c = C.int(C.yn_function(qbuf, C.ynqchars, 110, 1)));
            }
            if ((c == 121))
                return C.hands_obj;
            else if ((c == 113))
                return 0;
            ++C.getobj_else;
        }
        if (((!C.samePtr(uptr, C.mons[C.PM_RUST_MONSTER]) && !C.samePtr((gold = C.g_at(C.u.ux, C.u.uy)), 0)) ? 1 : 0)) {
            if ((C.long(gold.quan) == C.long(1n)))
                C.Sprintf(qbuf, "There is 1 gold piece here; eat it?");
            else
                C.Sprintf(qbuf, "There are %ld gold pieces here; eat them?",
                        gold.quan);
            if (((c = C.int(C.yn_function(qbuf, C.ynqchars, 110, 1))) == 121)) {
                return gold;
            } else if ((c == 113)) {
                return 0;
            }
            ++C.getobj_else;
        }
    }

    /* Is there some food (probably a heavy corpse) here on the ground? */
    for ((otmp = C.svl.level.objects[C.u.ux][C.u.uy]); otmp; (otmp = otmp.nexthere)) {
        if ((corpsecheck ? (((otmp.otyp == C.CORPSE) && (((corpsecheck == 1) || C.tinnable(otmp)) ? 1 : 0)) ? 1 : 0) : (feeding ? (((otmp.oclass != C.COIN_CLASS) && is_edible(otmp)) ? 1 : 0) : (otmp.oclass == C.FOOD_CLASS)))) {
            const qsfx=C.stackAlloc(C.QBUFSZ);
            let one = (C.int((C.long(otmp.quan) == C.long(1n))));

            /* if blind and without gloves, attempting to eat (or tin or
               offer) a cockatrice corpse is fatal before asking whether
               or not to use it; otherwise, 'm<dir>' followed by 'e' could
               be used to locate cockatrice corpses without touching them */
            if ((((otmp.otyp == C.CORPSE) && C.will_feel_cockatrice(otmp, 0)) ? 1 : 0)) {
                C.feel_cockatrice(otmp, 0);
                /* if life-saved (or poly'd into stone golem), terminate
                   attempt to eat off floor */
                return 0;
            }
            /* "There is <an object> here; <verb> it?" or
               "There are <N objects> here; <verb> one?" */
            C.Sprintf(qbuf, "There %s ", C.otense(otmp, "are"));
            C.Sprintf(qsfx, " here; %s %s?", verb, (one ? "it" : "one"));
            C.safe_qbuf(qbuf, qbuf, qsfx, otmp, C.doname, C.ansimpleoname,
                             (one ? C.something : "things"));
            if (((c = C.int(C.yn_function(qbuf, C.ynqchars, 110, 1))) == 121))
                return otmp;
            else if ((c == 113))
                return 0;
            ++C.getobj_else;
        }
    }

    }
    /* We cannot use GETOBJ_PROMPT since we don't want a prompt in the case
       where nothing edible is being carried. */
    if (feeding) {
        (otmp = C.getobj("eat", eat_ok, C.GETOBJ_NOFLAGS));
    } else if (offering) {
        (otmp = C.getobj("sacrifice", offer_ok, C.GETOBJ_NOFLAGS));
    } else if ((corpsecheck == 2)) {
        (otmp = C.getobj(verb, tin_ok, C.GETOBJ_NOFLAGS));
    } else {
        C.impossible("floorfood: unknown request (%s)", verb);
        (otmp = 0);
    }
    if (((((otmp && corpsecheck) ? 1 : 0) && !(((offering && (otmp.oclass == C.AMULET_CLASS)) ? 1 : 0))) ? 1 : 0)) {
        if ((((otmp.otyp != C.CORPSE) || (((corpsecheck == 2) && !C.tinnable(otmp)) ? 1 : 0)) ? 1 : 0)) {
            C.You_cant("%s that!", verb);
            (otmp = 0);
        }
    }
    /* resetting 'getobj_else' here isn't essential; it will be cleared the
       next time it needs to be used */
    (C.getobj_else = C.int(0));
    return otmp;
}

/* Side effects of vomiting */
/* added nomul (MRS) - it makes sense, you're too busy being sick! */
export function vomit()
 /* A good idea from David Neves */
{
    let spewed = C.int(0);

    if (C.cantvomit(C.gy.youmonst.data)) {
        /* doesn't cure food poisoning; message assumes that we aren't
           dealing with some esoteric body_part() */
        C.Your("jaw gapes convulsively.");
    } else {
        if (((C.Sick && ((C.u.usick_type & C.SICK_VOMITABLE) != 0)) ? 1 : 0))
            C.make_sick(0n, 0, 1, C.SICK_VOMITABLE);
        /* if not enough in stomach to actually vomit then dry heave;
           vomiting_dialog() gives a vomit message when its countdown
           reaches 0, but only if u.uhs < FAINTING (and !cantvomit()) */
        if ((C.u.uhs >= C.FAINTING))
            C.Your("%s heaves convulsively!", C.body_part(C.STOMACH));
        else
            (spewed = C.int(1));
    }

    /* nomul()/You_can_move_again used to be unconditional, which was
       viable while eating but not for Vomiting countdown where hero might
       be immobilized for some other reason at the time vomit() is called */
    if ((C.long(C.gm.multi) >= C.long(-2))) {
        C.nomul(-2);
        (C.gm.multi_reason = "vomiting");
        (C.gn.nomovemsg = C.You_can_move_again);
    }

    if (spewed) {
        let mattk = C.attacktype_fordmg(C.gy.youmonst.data, C.AT_BREA, C.AD_ACID);

        /* currently, only yellow dragons can breathe acid */
        if (mattk) {
            C.You("breathe acid on yourself..."); /* [why?] */
            C.ubreatheu(mattk);
        }
        /* vomiting on an altar is, all things considered, rather impolite */
        if (C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ))
            C.altar_wrath(C.u.ux, C.u.uy);
        /* if poly'd into acidic form, stomach acid is stronger than normal */
        if (C.acidic(C.gy.youmonst.data)) {
            /* TODO: if there's a web here, destroy that too (before ice) */
            if (C.is_ice(C.u.ux, C.u.uy))
                C.melt_ice(C.u.ux, C.u.uy,
                         "Your stomach acid melts straight through the ice!");
        }
    }
}

export function eaten_stat(base, obj)

{
    (base = C.int(C.int(base)));
    let uneaten_amt, full_amount;

    /* get full_amount first; obj_nutrition() might modify obj->oeaten */
    (full_amount = C.long(C.long(obj_nutrition(obj))));
    (uneaten_amt = C.long(C.long(obj.oeaten)));
    if ((C.long(uneaten_amt) > C.long(full_amount))) {
        C.impossible(
          "partly eaten food (%ld) more nutritious than untouched food (%ld)",
                   uneaten_amt, full_amount);
        (uneaten_amt = C.long(full_amount));
    }

    (base = C.int(C.int(((full_amount ? C.long((C.long(C.long((C.long(C.long(base)) * C.long(uneaten_amt)))) / C.long(full_amount))) : 0n)))));
    return C.int(((base < 1) ? 1 : base));
}

/* reduce obj's oeaten field, making sure it never hits or passes 0 */
export function consume_oeaten(obj, amt)

{
    (amt = C.int(C.int(amt)));
    if (!obj_nutrition(obj)) {
        const itembuf=C.stackAlloc(40);
        let otyp = C.int(obj.otyp);

        if ((((((otyp == C.CORPSE) || (C.long(otyp) == C.long(C.EGG))) ? 1 : 0) || (otyp == C.TIN)) ? 1 : 0)) {
            C.Strcpy(itembuf, ((otyp == C.CORPSE) ? "corpse" : ((C.long(otyp) == C.long(C.EGG)) ? "egg" : ((otyp == C.TIN) ? "tin" : "other?"))));
            C.Sprintf(C.eos(itembuf), " [%d]", obj.corpsenm);
        } else {
            C.Sprintf(itembuf, "%d", otyp);
        }
        C.impossible(
            "oeaten: attempting to set 0 nutrition food (%s) partially eaten",
                   itembuf);
        return;
    }

    /*
     * This is a hack to try to squelch several long standing mystery
     * food bugs.  A better solution would be to rewrite the entire
     * victual handling mechanism from scratch using a less complex
     * model.  Alternatively, this routine could call done_eating()
     * or food_disappears() but its callers would need revisions to
     * cope with svc.context.victual.piece unexpectedly going away.
     *
     * Multi-turn eating operates by setting the food's oeaten field
     * to its full nutritional value and then running a counter which
     * independently keeps track of whether there is any food left.
     * The oeaten field can reach exactly zero on the last turn, and
     * the object isn't removed from inventory until the next turn
     * when the "you finish eating" message gets delivered, so the
     * food would be restored to the status of untouched during that
     * interval.  This resulted in unexpected encumbrance messages
     * at the end of a meal (if near enough to a threshold) and would
     * yield full food if there was an interruption on the critical
     * turn.  Also, there have been reports over the years of food
     * becoming massively heavy or producing unlimited satiation;
     * this would occur if reducing oeaten via subtraction attempted
     * to drop it below 0 since its unsigned type would produce a
     * huge positive value instead.  So far, no one has figured out
     * _why_ that inappropriate subtraction might sometimes happen.
     */

    if ((amt > 0)) {
        /* bit shift to divide the remaining amount of food */
        (obj.oeaten = C.uint((obj.oeaten) >>> (amt)));
    } else {
        /* simple decrement; value is negative so we actually add it */
        if ((C.int(obj.oeaten) > -amt))
            (obj.oeaten = C.uint((obj.oeaten) + (amt)));
        else
            (obj.oeaten = C.uint(0));
    }

    /* mustn't let partly-eaten drop all the way to 0 or the item would
       become restored to untouched; set to no bites left */
    if ((obj.oeaten == 0)) {
        if (C.samePtr(obj, C.svc.context.victual.piece)) /* always true unless wishing */
            (C.svc.context.victual.reqtime = C.int(C.svc.context.victual.usedtime));
        (obj.oeaten = C.uint(1)); /* smallest possible positive value */
    }
}

/* called when eatfood occupation has been interrupted,
   or in the case of theft, is about to be interrupted */
export function maybe_finished_meal(stopping)

{
    (stopping = C.int(C.boolean(stopping)));
    /* in case consume_oeaten() has decided that the food is all gone */
    if ((((C.go.occupation == eatfood) && (C.svc.context.victual.usedtime >= C.svc.context.victual.reqtime)) ? 1 : 0)) {
        if (stopping)
            (C.go.occupation = 0); /* for do_reset_eat */
        /* eatfood() calls done_eating() to use up svc.context.victual.piece */
        eatfood();
        return C.int(1);
    }
    return C.int(0);
}

/* called by revive(); sort of the opposite of maybe_finished_meal() */
export function cant_finish_meal(corpse)

{
    /*
     * When a corpse gets resurrected, the makemon() for that might
     * call stop_occupation().  If that happens, prevent it from using
     * up the corpse via maybe_finished_meal() when there's not enough
     * left for another bite.  revive() needs continued access to the
     * corpse and will delete it when done.
     */
    if ((((C.go.occupation == eatfood) && C.samePtr(C.svc.context.victual.piece, corpse)) ? 1 : 0)) {
        /* normally performed by done_eating() */
        C.copyStruct(C.svc.context.victual,C.zero_victual,C.victualSize); /* victual.piece = 0, .o_id = 0 */

        if (!corpse.oeaten)
            (corpse.oeaten = C.uint(1)); /* [see consume_oeaten()] */
        (C.go.occupation = C.donull); /* any non-Null other than eatfood() */
        C.stop_occupation();
        newuhs(0);
    }
}

/* Tin of <something> to the rescue?  Decide whether current occupation
   is an attempt to eat a tin of something capable of saving hero's life.
   We don't care about consumption of non-tinned food here because special
   effects there take place on first bite rather than at end of occupation.
   [Popeye the Sailor gets out of trouble by eating tins of spinach. :-] */
export function Popeye(threat)

{
    (threat = C.int(C.int(threat)));
    let otin;
    let mndx;

    if ((C.go.occupation != opentin))
        return C.int(0);
    (otin = C.svc.context.tin.tin);
    /* make sure hero still has access to tin */
    if (((!C.carried(otin) && ((!C.obj_here(otin, C.u.ux, C.u.uy) || !C.can_reach_floor(1)) ? 1 : 0)) ? 1 : 0))
        return C.int(0);
    /* unknown tin is assumed to be helpful */
    if (!otin.known)
        return C.int(1);
    /* known tin is helpful if it will stop life-threatening problem */
    (mndx = C.int(otin.corpsenm));
    switch (threat) {
    /* note: not used; hunger code bypasses stop_occupation() when eating */
    case C.HUNGER:
        return C.int(C.boolean(((((mndx != C.NON_PM) || (otin.spe == 1)) ? 1 : 0))));
    /* flesh from lizards and acidic critters stops petrification */
    case C.STONED:
        return C.int(C.boolean((((C.ismnum(mndx) && (((mndx == C.PM_LIZARD) || C.acidic(C.mons[mndx])) ? 1 : 0)) ? 1 : 0))));
    /* polymorph into a fiery monster */
    case C.SLIMED:
        return C.int(C.boolean(C.polyfood(otin)));
    /* no tins can cure these (yet?) */
    case C.SICK:
    case C.VOMITING:
        break;
    default:
        break;
    }
    return C.int(0);
}

/* the hero has swallowed a monster whole as a purple worm or similar, and has
   finished digesting its corpse (called via ga.afternmv) */
export function Finish_digestion()

{
    if ((C.gc.corpsenm_digested != C.NON_PM)) {
        C.callLocal(cpostfx, C.gc.corpsenm_digested);
        (C.gc.corpsenm_digested = C.int(C.NON_PM));
    }
    return C.int(0);
}

/*eat.c*/

/*empty*/
