/* NetHack 5.0	eat.c	$NHDT-Date: 1740534854 2025/02/25 17:54:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.344 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"











































/* also used to see if you're allowed to eat cats and dogs */
export function CANNIBAL_ALLOWED() { return (+(Role_if(PM_CAVE_DWELLER) || Race_if(PM_ORC))); }

/* Rider corpses are treated as non-rotting so that attempting to eat one
   will be sure to reach the stage of eating where that meal is fatal;
   acid blob corpses eventually rot away to nothing but before that happens
   they can be sacrificed regardless of age which implies that they never
   become rotten */
export function nonrotting_corpse(mnum) { return (+((mnum) == PM_LIZARD || (mnum) == PM_LICHEN 
     || is_rider(mons[mnum])                   
     || (mnum) == PM_ACID_BLOB)); }


/* non-rotting non-corpses; unlike lizard corpses, these items will behave
   as if rotten if they are cursed (fortune cookies handled elsewhere) */
export function nonrotting_food(otyp) { return (+((otyp) == LEMBAS_WAFER || (otyp) == CRAM_RATION)); }


/* see hunger states in hack.h - texts used on bottom line
   Also used in botl.c and insight.c  */
export const hu_stat = static_array("hu_stat", ptr_to(char), null, [
    _("Satiated"), _("        "), _("Hungry  "), _("Weak    "),
    _("Fainting"), _("Fainted "), _("Starved ")
]);

const zero_victual = static_struct("zero_victual", struct_victual_info, { piece: null });

/* used by getobj() callback routines eat_ok()/offer_ok()/tin_ok() to
   indicate whether player was given an opportunity to eat or offer or
   tin an item on the floor and declined, in order to insert "else"
   into the "you don't have anything [else] to {eat | offer | tin}"
   feedback if hero lacks any suitable items in inventory
   [reinitialized every time it's used so does not need to be placed
   in struct instance_globals g for potential bulk reinitialization] */
const getobj_else = static_var("getobj_else", int, 0);

/*
 * Decide whether a particular object can be eaten by the possibly
 * polymorphed character.  Not used for monster checks.
 */
export function /* boolean */
is_edible(obj)
{
    /* protect invocation tools but not Rider corpses (handled elsewhere)*/
    /* if (obj->oclass != FOOD_CLASS && obj_resists(obj, 0, 0)) */
    if (objects[obj.otyp].oc_unique)
        return FALSE;
    /* above also prevents the Amulet from being eaten, so we must never
       allow fake amulets to be eaten either [which is already the case] */

    if (gy.youmonst.data == mons[PM_FIRE_ELEMENTAL]
        && is_flammable(obj))
        return TRUE;

    if (metallivorous(gy.youmonst.data) && is_metallic(obj)
        && (gy.youmonst.data != mons[PM_RUST_MONSTER] || is_rustprone(obj)))
        return TRUE;

    /* Ghouls only eat non-veggy corpses or eggs (see dogfood()) */
    if (u.umonnum == PM_GHOUL)
        return (+((obj.otyp == CORPSE
                          && !vegan(mons[obj.corpsenm]))
                         || (obj.otyp == EGG)));

    if (u.umonnum == PM_GELATINOUS_CUBE && is_organic(obj)
        /* [g-cubes can eat containers and retain all contents
            as engulfed items, but poly'd player can't do that] */
        && !Has_contents(obj))
        return TRUE;

    return (+(obj.oclass == FOOD_CLASS));
}

/* used for hero init, life saving (if choking), and prayer results of fix
   starving, fix weak from hunger, or golden glow boon (if u.uhunger < 900) */
export function /* void */
init_uhunger()
{
    disp.botl = (+(u.uhs != NOT_HUNGRY || ATEMP(A_STR) < 0));
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (ATEMP(A_STR) < 0) {
        (chars[u.atemp.a + A_STR]) = 0;
        encumber_msg();
    }
}

/* tin types [SPINACH_TIN = -1, overrides corpsenm, nut==600] */
  const struct___anon1 = struct("eat.struct___anon1", {
    txt: ptr_to(char),
    nut: int,
    fodder: Bitfield(1),
    greasy: Bitfield(1),
}); const tintxts = static_array("tintxts", struct___anon1, null, [ { txt: _("rotten"), nut: -50, fodder: 0, greasy: 0 },  /* ROTTEN_TIN = 0 */
                { txt: _("homemade"), nut: 50, fodder: 1, greasy: 0 }, /* HOMEMADE_TIN = 1 */
                { txt: _("soup made from"), nut: 20, fodder: 1, greasy: 0 },
                { txt: _("french fried"), nut: 40, fodder: 0, greasy: 1 },
                { txt: _("pickled"), nut: 40, fodder: 1, greasy: 0 },
                { txt: _("boiled"), nut: 50, fodder: 1, greasy: 0 },
                { txt: _("smoked"), nut: 50, fodder: 1, greasy: 0 },
                { txt: _("dried"), nut: 55, fodder: 1, greasy: 0 },
                { txt: _("deep fried"), nut: 60, fodder: 0, greasy: 1 },
                { txt: _("szechuan"), nut: 70, fodder: 1, greasy: 0 },
                { txt: _("broiled"), nut: 80, fodder: 0, greasy: 0 },
                { txt: _("stir fried"), nut: 80, fodder: 0, greasy: 1 },
                { txt: _("sauteed"), nut: 95, fodder: 0, greasy: 0 },
                { txt: _("candied"), nut: 100, fodder: 1, greasy: 0 },
                { txt: _("pureed"), nut: 500, fodder: 1, greasy: 0 },
                { txt: _(""), nut: 0, fodder: 0, greasy: 0 } ]);
export const TTSZ = SIZE(tintxts);

/* called after mimicking is over */
function /* int */
eatmdone()
{
    /* release `eatmbuf' */
    if (ge.eatmbuf) {
        if (gn.nomovemsg == ge.eatmbuf)
            gn.nomovemsg = 0;
        free(ge.eatmbuf), ge.eatmbuf = 0;
    }
    /* update display */
    if (U_AP_TYPE()) {
        gy.youmonst.m_ap_type = M_AP_NOTHING;
        newsym(u.ux, u.uy);
    }
    return 0;
}

/* called when hallucination is toggled */
export function /* void */
eatmupdate()
{
    let altmsg = 0;
    let altapp = 0; /* lint suppression */

    if (!ge.eatmbuf || gn.nomovemsg != ge.eatmbuf)
        return;

    if (is_obj_mappear(gy.youmonst,ORANGE) && !Hallucination()) {
        /* revert from hallucinatory to "normal" mimicking */
        altmsg = _("You now prefer mimicking yourself.");
        altapp = GOLD_PIECE;
    } else if (is_obj_mappear(gy.youmonst,GOLD_PIECE) && Hallucination()) {
        /* won't happen; anything which might make immobilized
           hero begin hallucinating (black light attack, theft
           of Grayswandir) will terminate the mimicry first */
        altmsg = _("Your rind escaped intact.");
        altapp = ORANGE;
    }

    if (altmsg) {
        /* replace end-of-mimicking message */
        let amlen = Strlen(altmsg);
        if (amlen > Strlen(ge.eatmbuf)) {
            free(ge.eatmbuf);
            ge.eatmbuf = addr_of(alloc(unsigned(amlen + 1)));
        }
        gn.nomovemsg = strcpy(ge.eatmbuf, altmsg);
        /* update current image */
        gy.youmonst.mappearance = unsigned(altapp);
        newsym(u.ux, u.uy);
    }
}

/* ``[the(] singular(food, xname) [)]'' */
function /* const char * */
food_xname(food, the_pfx)
{
    let result;

    if (food.otyp == CORPSE) {
        result = corpse_xname(food, 0,
                              CXN_SINGULAR | (the_pfx ? CXN_PFX_THE : 0));
        /* not strictly needed since pname values are capitalized
           and the() is a no-op for them */
        if (type_is_pname(mons[food.corpsenm]))
            the_pfx = FALSE;
    } else {
        /* the ordinary case */
        result = singular(food, xname);
    }
    if (the_pfx)
        result = the(result);
    return result;
}

/* Created by GAN 01/28/87
 * Amended by AKP 09/22/87: if not hard, don't choke, just vomit.
 * Amended by 3.  06/12/89: if not hard, sometimes choke anyway, to keep risk.
 *                11/10/89: if hard, rarely vomit anyway, for slim chance.
 *
 * To a full belly all food is bad. (It.)
 */
function /* void */
choke(food)
{
    /* only happens if you were satiated */
    if (u.uhs != SATIATED) {
        if (!food || food.otyp != AMULET_OF_STRANGULATION)
            return;
    } else if (Role_if(PM_KNIGHT) && u.ualign.type == A_LAWFUL) {
        adjalign(-1); /* gluttony is unchivalrous */
        You_feel(_("like a glutton!"));
    }

    exercise(A_CON, FALSE);

    if (Breathless() || Hunger() || (!Strangled() && !rn2(20))) {
        /* choking by eating AoS doesn't involve stuffing yourself */
        if (food && food.otyp == AMULET_OF_STRANGULATION) {
            You(_("choke, but recover your composure."));
            return;
        }
        You(_("stuff yourself and then vomit voluminously."));
        morehungry(Hunger() ? (u.uhunger - 60) : 1000); /* just got very sick! */
        vomit();
    } else {
        svk.killer.format = KILLED_BY_AN;
        /*
         * Note all "killer"s below read "Choked on %s" on the
         * high score list & tombstone.  So plan accordingly.
         */
        if (food) {
            You(_("choke over your %s."), foodword(food));
            if (food.oclass == COIN_CLASS) {
                void strcpy(svk.killer.name, _("very rich meal"));
            } else {
                svk.killer.format = KILLED_BY;
                void strcpy(svk.killer.name, killer_xname(food));
            }
        } else {
            You(_("choke over it."));
            void strcpy(svk.killer.name, _("quick snack"));
        }
        You(_("die..."));
        done(CHOKING);
    }
}

/* modify victual.piece->owt depending on time spent consuming it */
function /* void */
recalc_wt()
{
    let piece = svc.context.victual.piece;

    if (!piece) {
        impossible(_("recalc_wt without piece"));
        return;
    }
    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Old weight = %d"), piece.owt); iflags.last_msg = save_plnmsg; } } while (0);
    debugpline2(_("Used time = %d, Req'd time = %d"),
                svc.context.victual.usedtime, svc.context.victual.reqtime, __FILE__);
    piece.owt = unsigned(weight(piece));
    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("New weight = %d"), piece.owt); iflags.last_msg = save_plnmsg; } } while (0);
}

/* called when eating interrupted by an event */
export function /* void */
reset_eat()
{
    /* we only set a flag here - the actual reset process is done after
     * the round is spent eating.
     */
    if (svc.context.victual.eating && !svc.context.victual.doreset) {
        debugpline0(_("reset_eat..."), __FILE__);
        svc.context.victual.doreset = 1;
    }
    return;
}

/* base nutrition of a food-class object; this used to include a variation
   of the code that is now in adj_victual_nutrition() and was moved due to
   its affect on weight() */
export function /* unsigned */
obj_nutrition(otmp)
{
    let nut = (otmp.otyp == CORPSE) ? mons[otmp.corpsenm].cnutrit
                      : otmp.globby ? otmp.owt
                         : (objects[otmp.otyp].oc_nutrition);

    return nut;
}

/* nutrition increment for next byte; this used to be factored into
   victual.piece->oeaten but that produced weight change if hero
   polymorphed to or from one of the races which has nutrition adjusted */
function /* int */
adj_victual_nutrition()
{
    let otyp = svc.context.victual.piece.otyp;
    /* note: adj_victual_nutrition() is only called when 'nmod' is negative */
    let nut = -svc.context.victual.nmod; /* convert 'nmod' to positive */

    assert(nut > 0);
    if (otyp == LEMBAS_WAFER) {
        if (((Upolyd() ? (is_elf(gy.youmonst.data)) : (Race_if(PM_ELF)))))
            nut += Math.trunc((nut + 2) / 4); /* 800 -> 1000 */
        else if (((Upolyd() ? (is_orc(gy.youmonst.data)) : (Race_if(PM_ORC)))))
            nut -= Math.trunc((nut + 2) / 4); /* 800 -> 600 */
    } else if (otyp == CRAM_RATION) {
        if (((Upolyd() ? (is_dwarf(gy.youmonst.data)) : (Race_if(PM_DWARF)))))
            nut += Math.trunc((nut + 3) / 6); /* 600 -> 700 */
    }
    nut = max(nut, 1);
    return nut;
}

/* might destroy otmp if hero drops it */
function /* struct obj * */
touchfood(otmp)
{
    if (otmp.quan > 1) {
        if (!carried(otmp))
            void splitobj(otmp, otmp.quan - 1);
        else
            otmp = splitobj(otmp, 1);
        debugpline0(_("split food,"), __FILE__);
    }

    if (!otmp.oeaten) {
        costly_alteration(otmp, COST_BITE);
        otmp.oeaten = obj_nutrition(otmp);
    }

    if (carried(otmp)) {
        freeinv(otmp);
        if (inv_cnt(FALSE) >= invlet_basic) {
            sellobj_state(SELL_DONTSELL);
            dropy(otmp);
            sellobj_state(SELL_NORMAL);
            if (otmp.where == OBJ_DELETED)
                otmp = null;
        } else {
            otmp = addinv_nomerge(otmp);
        }
    }
    return otmp;
}

/* When food decays, in the middle of your meal, we don't want to dereference
 * any dangling pointers, so set it to null (which should still trigger
 * do_reset_eat() at the beginning of eatfood()) and check for null pointers
 * in do_reset_eat().
 */
export function /* void */
food_disappears(obj)
{
    if (obj == svc.context.victual.piece)
        struct_assign(svc.context.victual, zero_victual); /* victual.piece = 0, .o_id = 0 */

    if (obj.timed)
        obj_stop_timers(obj);
}

/* renaming an object used to result in it having a different address,
   so the sequence start eating/opening, get interrupted, name the food,
   resume eating/opening would restart from scratch */
export function /* void */
food_substitution(old_obj, new_obj)
{
    if (old_obj == svc.context.victual.piece) {
        svc.context.victual.piece = new_obj;
        svc.context.victual.o_id = new_obj.o_id;
    }
    if (old_obj == svc.context.tin.tin) {
        svc.context.tin.tin = new_obj;
        svc.context.tin.o_id = new_obj.o_id;
    }
}

function /* void */
do_reset_eat()
{
    debugpline0(_("do_reset_eat..."), __FILE__);
    if (svc.context.victual.piece) {
        let otmp;

        svc.context.victual.o_id = 0;
        otmp = touchfood(svc.context.victual.piece);
        svc.context.victual.piece = otmp;
        if (otmp) {
            svc.context.victual.o_id = otmp.o_id;
            recalc_wt();
        }
    }
    svc.context.victual.fullwarn
        = svc.context.victual.eating
        = svc.context.victual.doreset
        = 0;
    /* Do not set canchoke to FALSE; if we continue eating the same object
     * we need to know if canchoke was set when they started eating it the
     * previous time.  And if we don't continue eating the same object
     * canchoke always gets recalculated anyway.
     */
    stop_occupation();
    newuhs(FALSE);
}

/* if 'prop' is only set because of a timed value (so not an intrinsic
   attribute or because of polymorph shape or worn or carried gear), return
   its timeout, otherwise return 0; used by enlightenment */
export function /* long long */
temp_resist(prop)
{
    let p = u.uprops[prop];
    let timeout = p.intrinsic & TIMEOUT;

    if (timeout
        /* and if not also protected by polymorph form */
        && (p.intrinsic & ~TIMEOUT) == 0
        /* and not by worn gear (dragon armor) */
        && !p.extrinsic
        /* and property is not blocked; we don't expect this, but if it
           is then the timeout doesn't matter so we won't extend that */
        && !p.blocked) {
        return timeout;
    }
    return 0;
}

/* if temporary acid or stoning resistance is timing out while eating
   something which that resistance is protecting against, caller will
   extend resistance's duration so that it times out after meal finishes */
export function /* boolean */
eating_dangerous_corpse(res)
{
    let food;
    let mnum;

    if (go.occupation == eatfood
        && (food = svc.context.victual.piece) != null
        && food.otyp == CORPSE
        && (mnum = food.corpsenm) >= LOW_PM
        && (carried(food) || obj_here(food, u.ux, u.uy))) {

        if (res == ACID_RES && acidic(mons[mnum]))
            return TRUE;
        /* flesh_petrifies() includes Medusa as well as touch_petrifies() */
        if (res == STONE_RES && flesh_petrifies(mons[mnum]))
            return TRUE;
    }
    return FALSE;
}























/* called each move during eating process */
function /* int */
eatfood()
{
    let food = svc.context.victual.piece;

    if (food && !carried(food) && !obj_here(food, u.ux, u.uy))
        food = null;
    if (!food) {
        /* maybe it was stolen? */
        do_reset_eat();
        return 0;
    }
    if (!svc.context.victual.eating)
        return 0;

    if (++svc.context.victual.usedtime <= svc.context.victual.reqtime) {
        if (bite())
            return 0;
        return 1; /* still busy */
    } else {        /* done */
        done_eating(TRUE);
        return 0;
    }
}

function /* void */
done_eating(message)
{
    let piece = svc.context.victual.piece;

    piece.in_use = TRUE;
    go.occupation = null; /* do this early, so newuhs() knows we're done */
    newuhs(FALSE);
    if (gn.nomovemsg) {
        if (message)
            pline1(gn.nomovemsg);
        gn.nomovemsg = 0;
    } else if (message) {
        You(_("finish %s %s."),
            (gy.youmonst.data == mons[PM_FIRE_ELEMENTAL]) ? _("consuming")
            : _("eating"),
            food_xname(piece, TRUE));
    }

    if (piece.otyp == CORPSE || piece.globby)
        cpostfx(piece.corpsenm);
    else
        fpostfx(piece);

    if (carried(piece))
        useup(piece);
    else
        useupf(piece, 1);

    struct_assign(svc.context.victual, zero_victual); /* victual.piece = 0, .o_id = 0 */
}

export function /* void */
eating_conducts(pd)
{
    let ll_conduct = 0;

    if (!u.uconduct.food++) {
        livelog_printf(LL_CONDUCT, _("ate for the first time - %s"),
                       pd.pmnames[NEUTRAL]);
        ll_conduct++;
    }
    if (!vegan(pd)) {
        if (!u.uconduct.unvegan++ && !ll_conduct) {
            livelog_printf(LL_CONDUCT,
                           _("consumed animal products (%s) for the first time"),
                           pd.pmnames[NEUTRAL]);
            ll_conduct++;
        }
    }
    if (!vegetarian(pd)) {
        if (!u.uconduct.unvegetarian && !ll_conduct)
            livelog_printf(LL_CONDUCT, _("tasted meat (%s) for the first time"),
                           pd.pmnames[NEUTRAL]);
        violated_vegetarian();
    }
}

/* handle side-effects of mind flayer's tentacle attack */
export function /* int */
eat_brains(
    magr,
    mdef,
    visflag,
    dmg_p) /* for dishing out extra damage in lieu of Int loss */
{
    let pd = mdef.data;
    let give_nutrit = FALSE;
    let result = M_ATTK_HIT, xtra_dmg = rnd(10);

    /* previous tentacle attack might have triggered fatal passive
       counterattack [callers ought to be updated to avoid this situation] */
    if (magr != gy.youmonst && DEADMONSTER(magr)) {
        return M_ATTK_AGR_DIED;
    }

    if (noncorporeal(pd)) {
        if (visflag)
            pline(_("%s brain is unharmed."),
                  (mdef == gy.youmonst) ? _("Your") : s_suffix(Monnam(mdef)));
        return M_ATTK_MISS; /* side-effects can't occur */
    } else if (magr == gy.youmonst) {
        You(_("eat %s brain!"), s_suffix(mon_nam(mdef)));
    } else if (mdef == gy.youmonst) {
        Your(_("brain is eaten!"));
    } else { /* monster against monster */
        if (visflag && canspotmon(mdef))
            pline(_("%s brain is eaten!"), s_suffix(Monnam(mdef)));
    }

    if (flesh_petrifies(pd)) {
        /* mind flayer has attempted to eat the brains of a petrification
           inducing critter (most likely Medusa; attacking a cockatrice via
           tentacle-touch should have been caught before reaching this far) */
        if (magr == gy.youmonst) {
            if (!Stone_resistance() && !Stoned())
                make_stoned(5, 0, KILLED_BY_AN,
                            pmname(pd, Mgender(mdef)));
        } else {
            /* no need to check for poly_when_stoned or Stone_resistance;
               mind flayers don't have those capabilities */
            if (visflag && canseemon(magr))
                pline(_("%s turns to stone!"), Monnam(magr));
            monstone(magr);
            if (!DEADMONSTER(magr)) {
                /* life-saved; don't continue eating the brains */
                return M_ATTK_MISS;
            } else {
                if (magr.mtame && !visflag)
                    /* parallels mhitm.c's brief_feeling */
                    You(_("have a sad thought for a moment, then it passes."));
                return M_ATTK_AGR_DIED;
            }
        }
    }

    if (magr == gy.youmonst) {
        /*
         * player mind flayer is eating something's brain
         */
        eating_conducts(pd);
        if (mindless(pd)) { /* (cannibalism not possible here) */
            pline(_("%s doesn't notice."), Monnam(mdef));
            /* all done; no extra harm inflicted upon target */
            return M_ATTK_MISS;
        } else if (is_rider(pd)) {
            pline(_("Ingesting that is fatal."));
            void sprintf(svk.killer.name, _("unwisely ate the brain of %s"), pmname(pd, Mgender(mdef)))
;
            svk.killer.format = NO_KILLER_PREFIX;
            done(DIED);
            /* life-saving needed to reach here */
            exercise(A_WIS, FALSE);
            dmg_p[0] += xtra_dmg; /* Rider takes extra damage */
        } else {
            morehungry(-rnd(30)); /* cannot choke */
            if (ABASE(A_INT) < AMAX(A_INT)) {
                /* recover lost Int; won't increase current max */
                (chars[u.acurr.a + A_INT]) += rnd(4);
                if (ABASE(A_INT) > AMAX(A_INT))
                    (chars[u.acurr.a + A_INT]) = AMAX(A_INT);
                disp.botl = TRUE;
            }
            exercise(A_WIS, TRUE);
            dmg_p[0] += xtra_dmg;
        }
        /* targeting another mind flayer or your own underlying species
           is cannibalism */
        void maybe_cannibal(monsndx(pd), TRUE);

    } else if (mdef == gy.youmonst) {
        /*
         * monster mind flayer is eating hero's brain
         */
        /* no such thing as mindless players */
        if (ABASE(A_INT) <= ATTRMIN(A_INT)) {
            let brainlessness = init_string(static_array("eat_brains.brainlessness", char, sizeof_string("brainlessness")), _("brainlessness"), true);

            if (Lifesaved()) {
                void strcpy(svk.killer.name, brainlessness);
                svk.killer.format = KILLED_BY;
                done(DIED);
                /* amulet of life saving has now been used up */
                pline(_("Unfortunately your brain is still gone."));
                /* sanity check against adding other forms of life-saving */
                u.uprops[LIFESAVED].extrinsic =
                    u.uprops[LIFESAVED].intrinsic = 0;
            } else {
                Your(_("last thought fades away."));
            }
            void strcpy(svk.killer.name, brainlessness);
            svk.killer.format = KILLED_BY;
            done(DIED);
            /* can only get here when in wizard or explore mode and user has
               explicitly chosen not to die; arbitrarily boost intelligence */
            (chars[u.acurr.a + A_INT]) = ATTRMIN(A_INT) + 2;
            You_feel(_("like a scarecrow."));
        }
        give_nutrit = TRUE; /* in case a conflicted pet is doing this */
        exercise(A_WIS, FALSE);
        /* caller handles Int and memory loss */

    } else { /* mhitm */
        /*
         * monster mind flayer is eating another monster's brain
         */
        if (mindless(pd)) {
            if (visflag && canspotmon(mdef))
                pline(_("%s doesn't notice."), Monnam(mdef));
            return M_ATTK_MISS;
        } else if (is_rider(pd)) {
            mondied(magr);
            if (DEADMONSTER(magr))
                result = M_ATTK_AGR_DIED;
            /* Rider takes extra damage regardless of whether attacker dies */
            dmg_p[0] += xtra_dmg;
        } else {
            dmg_p[0] += xtra_dmg;
            give_nutrit = TRUE;
            if (dmg_p[0] >= mdef.mhp && visflag && canspotmon(mdef))
                pline(_("%s last thought fades away..."),
                      s_suffix(Monnam(mdef)));
        }
    }

    if (give_nutrit && magr.mtame && !magr.isminion) {
        EDOG(magr).hungrytime += rnd(60);
        magr.mconf = 0;
    }

    return result;
}

/* eating a corpse or egg of one's own species is usually naughty */
function /* boolean */
maybe_cannibal(pm, allowmsg)
{
    let ate_brains = static_var("maybe_cannibal.ate_brains", long, 0);
    let fptr = mons[pm]; /* food type */

    /* when poly'd into a mind flayer, multiple tentacle hits in one
       turn cause multiple digestion checks to occur; avoid giving
       multiple luck penalties for the same attack */
    if (svm.moves == ate_brains[0])
        return FALSE;
    ate_brains[0] = svm.moves; /* ate_anything, not just brains... */

    if (!CANNIBAL_ALLOWED()
        /* non-cannibalistic heroes shouldn't eat own species ever
           and also shouldn't eat current species when polymorphed
           (even if having the form of something which doesn't care
           about cannibalism--hero's innate traits aren't altered) */
        && (your_race(fptr)
            || (Upolyd() && same_race(gy.youmonst.data, fptr))
            || (ismnum(u.ulycn) && were_beastie(pm) == u.ulycn))) {
        if (allowmsg) {
            if (Upolyd() && your_race(fptr))
                You(_("have a bad feeling deep inside."));
            You(_("cannibal!  You will regret this!"));
        }
        u.uprops[AGGRAVATE_MONSTER].intrinsic = or64(u.uprops[AGGRAVATE_MONSTER].intrinsic, FROMOUTSIDE);
        change_luck(-rn1(4, 2)); /* -5..-2 */
        return TRUE;
    }
    return FALSE;
}

function /* void */
cprefx(pm)
{
    void maybe_cannibal(pm, TRUE);
    if (flesh_petrifies(mons[pm])) {
        if (!Stone_resistance()
            && !(poly_when_stoned(gy.youmonst.data)
                 && polymon(PM_STONE_GOLEM))) {
            /* if food was a tin, use it up early to keep it out of bones */
            if (svc.context.tin.tin)
                use_up_tin(svc.context.tin.tin);

            void sprintf(svk.killer.name, _("tasting %s meat"), mons[pm].pmnames[NEUTRAL])
;
            svk.killer.format = KILLED_BY;
            You(_("turn to stone."));
            done(STONING);
            if (svc.context.victual.piece)
                svc.context.victual.eating = 0;
            return; /* lifesaved */
        }
    }

    switch (pm) {
    case PM_LITTLE_DOG:
    case PM_DOG:
    case PM_LARGE_DOG:
    case PM_KITTEN:
    case PM_HOUSECAT:
    case PM_LARGE_CAT:
        /* cannibals are allowed to eat domestic animals without penalty */
        if (!CANNIBAL_ALLOWED()) {
            You_feel(_("that eating the %s was a bad idea."),
                     mons[pm].pmnames[NEUTRAL]);
            u.uprops[AGGRAVATE_MONSTER].intrinsic = or64(u.uprops[AGGRAVATE_MONSTER].intrinsic, FROMOUTSIDE);
        }
        break;
    case PM_LIZARD:
        if (Stoned())
            fix_petrification();
        break;
    case PM_DEATH:
    case PM_PESTILENCE:
    case PM_FAMINE: {
        pline(_("Eating that is instantly fatal."));
        void sprintf(svk.killer.name, _("unwisely ate the body of %s"), mons[pm].pmnames[NEUTRAL])
;
        svk.killer.format = NO_KILLER_PREFIX;
        done(DIED);
        /* life-saving needed to reach here */
        exercise(A_WIS, FALSE);
        /* revive an actual corpse; can't do that if it was a tin;
           5.0: this used to assume that such tins were impossible but
           they can be wished for in wizard mode; they can't make it
           to normal play though because bones creation empties them */
        if (svc.context.victual.piece /* Null for tins */
            && svc.context.victual.piece.otyp == CORPSE /* paranoia */
            && revive_corpse(svc.context.victual.piece))
            struct_assign(svc.context.victual, zero_victual); /* victual.piece=0, .o_id=0 */
        return;
    }
    case PM_GREEN_SLIME:
        if (!Slimed() && !Unchanging() && !slimeproof(gy.youmonst.data)) {
            You(_("don't feel very well."));
            make_slimed(10, 0);
            delayed_killer(SLIMED, KILLED_BY_AN, _(""));
        }
        /* FALLTHROUGH */;
    /* Fall through */
    default:
        if (acidic(mons[pm]) && Stoned())
            fix_petrification();
        break;
    }
}

export function /* void */
fix_petrification()
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);

    if (Hallucination())
        void sprintf(buf, _("What a pity--you just ruined a future piece of %sart!"), ACURR(A_CHA) > 15 ? _("fine ") : _(""));
    else
        void strcpy(buf, _("You feel limber!"))
;
    make_stoned(0, buf, 0, 0);
} finally { stack_pop($frame); } }

/*
 * If you add an intrinsic that can be gotten by eating a monster, add it
 * to intrinsic_possible() and givit().  (It must already be in prop.h to
 * be an intrinsic property.)
 * It would be very easy to make the intrinsics not try to give you one
 * that you already had by checking to see if you have it in
 * intrinsic_possible() instead of givit(), but we're not that nice.
 */

/* intrinsic_possible() returns TRUE iff a monster can give an intrinsic. */
export function /* int */
intrinsic_possible(type, ptr)
{
    let res = 0;










    switch (type) {
    case FIRE_RES:
        res = +((ptr.mconveys & MR_FIRE) != 0);
        do { if (res) debugpline0(_("can get fire resistance"), __FILE__) } while (0);
        break;
    case SLEEP_RES:
        res = +((ptr.mconveys & MR_SLEEP) != 0);
        do { if (res) debugpline0(_("can get sleep resistance"), __FILE__) } while (0);
        break;
    case COLD_RES:
        res = +((ptr.mconveys & MR_COLD) != 0);
        do { if (res) debugpline0(_("can get cold resistance"), __FILE__) } while (0);
        break;
    case DISINT_RES:
        res = +((ptr.mconveys & MR_DISINT) != 0);
        do { if (res) debugpline0(_("can get disintegration resistance"), __FILE__) } while (0);
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        res = +((ptr.mconveys & MR_ELEC) != 0);
        do { if (res) debugpline0(_("can get shock resistance"), __FILE__) } while (0);
        break;
    case POISON_RES:
        res = +((ptr.mconveys & MR_POISON) != 0);
        do { if (res) debugpline0(_("can get poison resistance"), __FILE__) } while (0);
        break;
    case ACID_RES:
        res = +((ptr.mconveys & MR_ACID) != 0);
        do { if (res) debugpline0(_("can get acid resistance temporarily"), __FILE__) } while (0);
        break;
    case STONE_RES:
        res = +((ptr.mconveys & MR_STONE) != 0);
        do { if (res) debugpline0(_("can get stoning resistance temporarily"), __FILE__) } while (0);
        break;
    case TELEPORT:
        res = can_teleport(ptr);
        do { if (res) debugpline0(_("can get teleport"), __FILE__) } while (0);
        break;
    case TELEPORT_CONTROL:
        res = control_teleport(ptr);
        do { if (res) debugpline0(_("can get teleport control"), __FILE__) } while (0);
        break;
    case TELEPAT:
        res = telepathic(ptr);
        do { if (res) debugpline0(_("can get telepathy"), __FILE__) } while (0);
        break;
    default:
        /* res stays 0 */
        break;
    }

    return res;
}

/* The "do we or do we not give the intrinsic" logic from givit(), extracted
 * into its own function. Depends on the monster's level and the type of
 * intrinsic it is trying to give you.
 */
export function /* boolean */
should_givit(type, ptr)
{
    let chance;

    /* some intrinsics are easier to get than others */
    switch (type) {
    case POISON_RES:
        if ((ptr == mons[PM_KILLER_BEE] || ptr == mons[PM_SCORPION])
            && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }

    return (+(ptr.mlevel > rn2(chance)));
}

function /* boolean */
temp_givit(type, ptr)
{
    let chance = (type == STONE_RES) ? 6 : (type == ACID_RES) ? 3 : 0;

    return chance ? (+(ptr.mlevel > rn2(chance))) : FALSE;
}

/* givit() tries to give you an intrinsic based on the monster's level
 * and what type of intrinsic it is trying to give you.
 */
function /* void */
givit(type, ptr)
{
    debugpline1(_("Attempting to give intrinsic %d"), type, __FILE__);

    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    switch (type) {
    case FIRE_RES:
        debugpline0(_("Trying to give fire resistance"), __FILE__);
        if (!(HFire_resistance() & FROMOUTSIDE)) {
            You(Hallucination() ? _("be chillin'.") : _("feel a momentary chill."));
            u.uprops[FIRE_RES].intrinsic = or64(u.uprops[FIRE_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case SLEEP_RES:
        debugpline0(_("Trying to give sleep resistance"), __FILE__);
        if (!(HSleep_resistance() & FROMOUTSIDE)) {
            You_feel(_("wide awake."));
            u.uprops[SLEEP_RES].intrinsic = or64(u.uprops[SLEEP_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case COLD_RES:
        debugpline0(_("Trying to give cold resistance"), __FILE__);
        if (!(HCold_resistance() & FROMOUTSIDE)) {
            You_feel(_("full of hot air."));
            u.uprops[COLD_RES].intrinsic = or64(u.uprops[COLD_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case DISINT_RES:
        debugpline0(_("Trying to give disintegration resistance"), __FILE__);
        if (!(HDisint_resistance() & FROMOUTSIDE)) {
            You_feel(Hallucination() ? _("totally together, man.") : _("very firm."));
            u.uprops[DISINT_RES].intrinsic = or64(u.uprops[DISINT_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        debugpline0(_("Trying to give shock resistance"), __FILE__);
        if (!(HShock_resistance() & FROMOUTSIDE)) {
            if (Hallucination())
                You_feel(_("grounded in reality."));
            else
                Your(_("health currently feels amplified!"));
            u.uprops[SHOCK_RES].intrinsic = or64(u.uprops[SHOCK_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case POISON_RES:
        debugpline0(_("Trying to give poison resistance"), __FILE__);
        if (!(HPoison_resistance() & FROMOUTSIDE)) {
            You_feel(Poison_resistance() ? _("especially healthy.") : _("healthy."));
            u.uprops[POISON_RES].intrinsic = or64(u.uprops[POISON_RES].intrinsic, FROMOUTSIDE);
        }
        break;
    case TELEPORT:
        debugpline0(_("Trying to give teleport"), __FILE__);
        if (!(HTeleportation() & FROMOUTSIDE)) {
            You_feel(Hallucination() ? _("diffuse.") : _("very jumpy."));
            u.uprops[TELEPORT].intrinsic = or64(u.uprops[TELEPORT].intrinsic, FROMOUTSIDE);
        }
        break;
    case TELEPORT_CONTROL:
        debugpline0(_("Trying to give teleport control"), __FILE__);
        if (!(HTeleport_control() & FROMOUTSIDE)) {
            You_feel(Hallucination() ? _("centered in your personal space.")
                                   : _("in control of yourself."));
            u.uprops[TELEPORT_CONTROL].intrinsic = or64(u.uprops[TELEPORT_CONTROL].intrinsic, FROMOUTSIDE);
        }
        break;
    case TELEPAT:
        debugpline0(_("Trying to give telepathy"), __FILE__);
        if (!(HTelepat() & FROMOUTSIDE)) {
            You_feel(Hallucination() ? _("in touch with the cosmos.")
                                   : _("a strange mental acuity."));
            u.uprops[TELEPAT].intrinsic = or64(u.uprops[TELEPAT].intrinsic, FROMOUTSIDE);
            /* If blind, make sure monsters show up. */
            if (Blind())
                see_monsters();
        }
        break;
    case ACID_RES:
        debugpline0(_("Giving timed acid resistance"), __FILE__);
        if (!Acid_resistance())
            You_feel(_("%s."), Hallucination() ? _("secure from flashbacks")
                            : _("less concerned about being harmed by acid"));
        incr_itimeout(ref_of(u.uprops[ACID_RES], "intrinsic"), d(3, 6));
        break;
    case STONE_RES:
        debugpline0(_("Giving timed stoning resistance"), __FILE__);
        if (!Stone_resistance())
            You_feel(_("%s."), Hallucination() ? _("unusually limber")
                            : _("less concerned about becoming petrified"));
        incr_itimeout(ref_of(u.uprops[STONE_RES], "intrinsic"), d(3, 6));
        break;
    default:
        debugpline0(_("Tried to give an impossible intrinsic"), __FILE__);
        break;
    }
}

function /* void */
eye_of_newt_buzz()
{
    /* MRKR: "eye of newt" may give small magical energy boost */
    if (rn2(3) || 3 * u.uen <= 2 * u.uenmax) {
        let old_uen = u.uen;

        u.uen += rnd(3);
        if (u.uen > u.uenmax) {
            if (!rn2(3)) {
                u.uenmax++;
                if (u.uenmax > u.uenpeak)
                    u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen != u.uen) {
            You_feel(_("a mild buzz."));
            disp.botl = TRUE;
        }
    }
}



/* called after completely consuming a corpse */
function /* void */
cpostfx(pm)
{ const $frame = stack_frame(); try {
    let tmp = 0;
    let catch_lycanthropy = NON_PM;
    let check_intrinsics = FALSE;

    /* in case `afternmv' didn't get called for previously mimicking
       gold, clean up now to avoid `eatmbuf' memory leak */
    if (ge.eatmbuf)
        void eatmdone();

    switch (pm) {
    case PM_WRAITH:
        pluslvl(FALSE);
        break;
    case PM_HUMAN_WERERAT:
        catch_lycanthropy = PM_WERERAT;
        break;
    case PM_HUMAN_WEREJACKAL:
        catch_lycanthropy = PM_WEREJACKAL;
        break;
    case PM_HUMAN_WEREWOLF:
        catch_lycanthropy = PM_WEREWOLF;
        break;
    case PM_NURSE:
        if (Upolyd())
            u.mh = u.mhmax;
        else
            u.uhp = u.uhpmax;
        make_blinded(0, +!u.ucreamed);
        disp.botl = TRUE;
        check_intrinsics = TRUE; /* might also convey poison resistance */
        break;
    case PM_STALKER:
        if (!Invis()) {
            set_itimeout(ref_of(u.uprops[INVIS], "intrinsic"), rn1(100, 50));
            if (!Blind() && !BInvis())
                self_invis_message();
        } else {
            if (!(HInvis() & INTRINSIC))
                You_feel(_("hidden!"));
            u.uprops[INVIS].intrinsic = or64(u.uprops[INVIS].intrinsic, FROMOUTSIDE);
            u.uprops[SEE_INVIS].intrinsic = or64(u.uprops[SEE_INVIS].intrinsic, FROMOUTSIDE);
        }
        newsym(u.ux, u.uy);
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        make_stunned((HStun() & TIMEOUT) + 30, FALSE);
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case PM_BAT:
        make_stunned((HStun() & TIMEOUT) + 30, FALSE);
        break;
    case PM_GIANT_MIMIC:
        tmp += 10;
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case PM_LARGE_MIMIC:
        tmp += 20;
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case PM_SMALL_MIMIC:
        tmp += 20;
        if (gy.youmonst.data.mlet != S_MIMIC && !Unchanging()) {
            let buf = stack_array(char, BUFSZ);
            let tempshape = !Hallucination() ? _("a pile of gold")
                                                   : _("an orange");

            if (!u.uconduct.polyselfs++) /* you're changing form */
                livelog_printf(LL_CONDUCT,
                            _("changed form for the first time by mimicking %s"),
                               tempshape);
            You_cant(_("resist the temptation to mimic %s."), tempshape);
            /* A pile of gold can't ride. */
            if (u.usteed)
                dismount_steed(DISMOUNT_FELL);
            nomul(-tmp);
            gm.multi_reason = _("pretending to be a pile of gold");
            void sprintf(buf, Hallucination()
                       ? _("You suddenly dread being peeled and mimic %s again!")
                       : _("You now prefer mimicking %s again."), an(Upolyd() ? pmname(gy.youmonst.data, Ugender())
                              : gu.urace.noun))

;
            ge.eatmbuf = dupstr(buf);
            gn.nomovemsg = ge.eatmbuf;
            ga.afternmv = eatmdone;
            /* ??? what if this was set before? */
            gy.youmonst.m_ap_type = M_AP_OBJECT;
            gy.youmonst.mappearance = Hallucination() ? ORANGE : GOLD_PIECE;
            newsym(u.ux, u.uy);
            curs_on_u();
            /* make gold symbol show up now */
            display_nhwindow()(WIN_MAP, TRUE);
        }
        break;
    case PM_QUANTUM_MECHANIC:
        Your(_("velocity suddenly seems very uncertain!"));
        if (HFast() & INTRINSIC) {
            u.uprops[FAST].intrinsic = and64(u.uprops[FAST].intrinsic, ~INTRINSIC);
            You(_("seem slower."));
        } else {
            u.uprops[FAST].intrinsic = or64(u.uprops[FAST].intrinsic, FROMOUTSIDE);
            You(_("seem faster."));
        }
        break;
    case PM_LIZARD:
        if ((HStun() & TIMEOUT) > 2)
            make_stunned(2, FALSE);
        if ((HConfusion() & TIMEOUT) > 2)
            make_confused(2, FALSE);
        check_intrinsics = TRUE; /* might convey temporary stoning resist */
        break;
    case PM_CHAMELEON:
    case PM_DOPPELGANGER:
    case PM_SANDESTIN: /* moot--they don't leave corpses */
    case PM_GENETIC_ENGINEER:
        if (Unchanging()) {
            You_feel(_("momentarily different.")); /* same as poly trap */
        } else {
            /* polyself() is potentially fatal; if food is a tin, use it up
               early to keep it out of bones */
            if (svc.context.tin.tin) {
                use_up_tin(svc.context.tin.tin);
                /* most tin effects end up being skipped */
                lesshungry(200 + (metallivorous(gy.youmonst.data) ? 5 : 0));
            }

            You(_("%s."), (pm == PM_GENETIC_ENGINEER)
                          ? _("undergo a freakish metamorphosis")
                          : _("feel a change coming over you"));
            polyself(POLY_NOFLAGS);
        }
        break;
    case PM_DISPLACER_BEAST:
        if (!Displaced()) /* give a message (before setting the timeout) */
            toggle_displacement(null, 0, TRUE);
        incr_itimeout(ref_of(u.uprops[DISPLACED], "intrinsic"), d(6, 6));
        break;
    case PM_DISENCHANTER:
        /* picks an intrinsic at random and removes it; there's
           no feedback if hero already lacks the chosen ability */
        debugpline0(_("using attrcurse to strip an intrinsic"), __FILE__);
        void attrcurse();
        break;
    case PM_DEATH:
    case PM_PESTILENCE:
    case PM_FAMINE:
        /* life-saved; don't attempt to confer any intrinsics */
        break;
    case PM_MIND_FLAYER:
    case PM_MASTER_MIND_FLAYER:
        if (ABASE(A_INT) < ATTRMAX(A_INT)) {
            if (!rn2(2)) {
                pline(_("Yum!  That was real brain food!"));
                void adjattrib(A_INT, 1, FALSE);
                break; /* don't give them telepathy, too */
            }
        } else {
            pline(_("For some reason, that tasted bland."));
        }
        /* FALLTHROUGH */;
    /*FALLTHRU*/
    default:
        check_intrinsics = TRUE;
        break;
    }

    /* possibly convey an intrinsic */
    if (check_intrinsics) {
        let ptr = mons[pm];

        if (dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU)
            || pm == PM_VIOLET_FUNGUS) {
            pline(_("Oh wow!  Great stuff!"));
            void make_hallucinated((HHallucination() & TIMEOUT) + 200, FALSE,
                                     0);
        }

        /* Eating magical monsters can give you some magical energy. */
        if (attacktype(ptr, AT_MAGC) || pm == PM_NEWT)
            eye_of_newt_buzz();

        tmp = corpse_intrinsic(ptr);

        /* if something was chosen, give it now (givit() might fail) */
        if (tmp == -1)
            gainstr(null, 0, TRUE);
        else if (tmp > 0)
            givit(tmp, ptr);
    } /* check_intrinsics */

    if (ismnum(catch_lycanthropy)) {
        set_ulycn(catch_lycanthropy);
        retouch_equipment(2);
    }
    return;
} finally { stack_pop($frame); } }



/* Choose (one of) the intrinsics granted by a corpse, and return it.
 * If this corpse gives no intrinsics, return 0.
 * For the special not-real-prop cases of strength gain from giants
 * return fake prop value of -1.
 * Non-deterministic; should only be called once per corpse.
 */
export function /* int */
corpse_intrinsic(ptr)
{
    /* Check the monster for all of the intrinsics.  If this
     * monster can give more than one, pick one to try to give
     * from among all it can give.
     */
    let conveys_STR = is_giant(ptr);
    let i;
    let count = 0; /* number of possible intrinsics */
    let prop = 0;   /* which one we will try to give */

    if (conveys_STR) {
        count = 1;
        prop = -1; /* use -1 as fake prop index for STR */
        debugpline1(_("\"Intrinsic\" strength, %d"), prop, __FILE__);
    }
    for (i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        /* a 1 in count chance of replacing the old choice
           with this one, and a count-1 in count chance
           of keeping the old choice (note that 1 in 1 and
           0 in 1 are what we want for the first candidate) */
        if (!rn2(count)) {
            debugpline2(_("Intrinsic %d replacing %d"), i, prop, __FILE__);
            prop = i;
        }
    }
    /* if strength is the only candidate, give it 50% chance */
    if (conveys_STR && count == 1 && !rn2(2))
        prop = 0;

    return prop;
}

export function /* void */
violated_vegetarian()
{
    u.uconduct.unvegetarian++;
    if (Role_if(PM_MONK)) {
        You_feel(_("guilty."));
        adjalign(-1);
    }
    return;
}

/* common code to check and possibly charge for 1 svc.context.tin.tin,
 * will split() svc.context.tin.tin if necessary */
function /* struct obj * */
costly_tin(alter_type) /* COST_xxx */
{
    let tin = svc.context.tin.tin;

    if (carried(tin) ? tin.unpaid
                     : (costly_spot(tin.ox, tin.oy) && !tin.no_charge)) {
        if (tin.quan > 1) {
            tin = svc.context.tin.tin = splitobj(tin, 1);
            svc.context.tin.o_id = tin.o_id;
        }
        costly_alteration(tin, alter_type);
    }
    return tin;
}

export function /* int */
tin_variety_txt(s, tinvariety)
{
    let k, l;

    if (s && tinvariety) {
        tinvariety[0] = -1;
        for (k = 0; k < TTSZ - 1; ++k) {
            l = int(strlen(tintxts[k].txt));
            if (!strncmpi(s, tintxts[k].txt, l) && (int(strlen(s)) > l)
                && chars[s + l] == ord(' ')) {
                tinvariety[0] = k;
                return (l + 1);
            }
        }
    }
    return 0;
}

/*
 * This assumes that buf already contains the word "tin",
 * as is the case with caller xname().
 */
export function /* void */
tin_details(obj, mnum, buf)
{ const $frame = stack_frame(); try {
    let buf2 = stack_array(char, BUFSZ);

    if (!obj || !buf)
        return;

    let r = tin_variety(obj, TRUE);

    if (r == SPINACH_TIN)
        void strcat(buf, _(" of spinach"));
    else if (mnum == NON_PM)
        void strcpy(buf, _("empty tin"));
    else {
        if ((obj.cknown || iflags.override_ID) && obj.spe < 0) {
            if (r == ROTTEN_TIN || r == HOMEMADE_TIN) {
                /* put these before the word tin */
                void sprintf(buf2, _("%s %s of "), tintxts[r].txt, buf);
                void strcpy(buf, buf2);
            } else {
                void sprintf(eos(buf), _(" of %s "), tintxts[r].txt);
            }
        } else {
            void strcpy(eos(buf), _(" of "));
        }
        if (vegetarian(mons[mnum]))
            void sprintf(eos(buf), _("%s"), mons[mnum].pmnames[NEUTRAL]);
        else
            void sprintf(eos(buf), _("%s meat"), mons[mnum].pmnames[NEUTRAL]);
    }
} finally { stack_pop($frame); } }

export function /* void */
set_tin_variety(obj, forcetype)
{
    let r, mnum = obj.corpsenm;

    if (forcetype == SPINACH_TIN
        || (forcetype == HEALTHY_TIN
            && (mnum == NON_PM /* empty or already spinach */
                || !vegetarian(mons[mnum])))) { /* replace meat */
        obj.corpsenm = NON_PM; /* not based on any monster */
        obj.spe = 1;           /* spinach */
        return;
    } else if (forcetype == HEALTHY_TIN) {
        r = tin_variety(obj, FALSE);
        if (r < 0 || r >= TTSZ)
            r = ROTTEN_TIN; /* shouldn't happen */
        while ((r == ROTTEN_TIN && !obj.cursed) || !tintxts[r].fodder)
            r = rn2(TTSZ - 1);
    } else if (forcetype >= 0 && forcetype < TTSZ - 1) {
        r = forcetype;
    } else {               /* RANDOM_TIN */
        r = rn2(TTSZ - 1); /* take your pick */
        if (r == ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum)))
            r = HOMEMADE_TIN; /* lizards don't rot */
    }
    obj.spe = -(r + 1); /* offset by 1 to allow index 0 */
}

function /* int */
tin_variety(
    obj,
    displ) /* we're just displaying so leave things alone */
{
    let r, mnum = obj.corpsenm;

    if (obj.spe == 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN; /* always rotten if cursed */
    } else if (obj.spe < 0) {
        r = -(obj.spe);
        --r; /* get rid of the offset */
    } else {
        r = rn2(TTSZ - 1);
    }

    if (!displ && r == HOMEMADE_TIN && !obj.blessed && !rn2(7))
        r = ROTTEN_TIN; /* some homemade tins go bad */

    if (r == ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum)))
        r = HOMEMADE_TIN; /* lizards don't rot */
    return r;
}

/* finish consume_tin(); also potentially used by cprefx() and cpostfx() */
function /* void */
use_up_tin(tin)
{
    if (carried(tin))
        useup(tin);
    else
        useupf(tin, 1);
    /* reset tin context */
    svc.context.tin.tin = null;
    svc.context.tin.o_id = 0;
}

function /* void */
consume_tin(mesg)
{
    let what;
    let which, mnum, r, nutamt;
    /* if you've eaten tin itself, chance to not eat contents gets bypassed */
    let always_eat = metallivorous(gy.youmonst.data);
    let tin = svc.context.tin.tin;

    r = tin_variety(tin, FALSE);
    if (tin.otrapped || (tin.cursed && r != HOMEMADE_TIN && !rn2(8))) {
        b_trapped(_("tin"), NO_PART);
        tin = costly_tin(COST_DSTROY);
        use_up_tin(tin);
        return;
    }

    pline1(mesg); /* "You succeed in opening the tin." */

    if (r != SPINACH_TIN) {
        mnum = tin.corpsenm;
        if (mnum == NON_PM) {
            if (Hallucination())
                pline(_("It's full of %s."),
                      rn2(2) ? _("air elemental souffle")
                             : _("dehydrated water"));
            else
                pline(_("It turns out to be empty."));
            observe_object(tin);
            tin.known = 1;
            tin = costly_tin(COST_OPEN);
            use_up_tin(tin);
            if (always_eat)
                lesshungry(5); /* metallivorous hero ate the tin itself */
            return;
        }

        which = 0; /* 0=>plural, 1=>as-is, 2=>"the" prefix */
        if ((mnum == PM_COCKATRICE || mnum == PM_CHICKATRICE)
            && (Stone_resistance() || Hallucination())) {
            what = _("chicken");
            which = 1; /* suppress pluralization */
        } else if (Hallucination()) {
            what = rndmonnam(0);
        } else {
            what = mons[mnum].pmnames[NEUTRAL];
            if (the_unique_pm(mons[mnum]))
                which = 2;
            else if (type_is_pname(mons[mnum]))
                which = 1;
        }
        if (which == 0)
            what = makeplural(what);
        else if (which == 2)
            what = the(what);

        if (!always_eat) {
            pline(_("It smells like %s."), what);
            if (y_n(_("Eat it?")) == ord('n')) {
                if (flags.verbose)
                    You(_("discard the open tin."));
                if (!Hallucination()) {
                    observe_object(tin);
                    tin.known = 1;
                }
                tin = costly_tin(COST_OPEN);
                use_up_tin(tin);
                return;
            }
        }

        /* in case stop_occupation() was called on previous meal */
        struct_assign(svc.context.victual, zero_victual); /* victual.piece = 0, .o_id = 0 */

        You(_("consume %s %s."), tintxts[r].txt, mons[mnum].pmnames[NEUTRAL]);

        eating_conducts(mons[mnum]);

        observe_object(tin);
        tin.known = 1;
        /* charge for one at pre-eating cost */
        tin = svc.context.tin.tin = costly_tin(COST_OPEN);

        /* cprefx() or cpostfx() might use up tin to keep it out of bones */
        cprefx(mnum);
        if (svc.context.tin.tin)
            cpostfx(mnum);
        if (!svc.context.tin.tin)
            return;

        if (tintxts[r].nut < 0) { /* rotten */
            make_vomiting(rn1(15, 10), FALSE);
        } else {
            nutamt = tintxts[r].nut;
            /* nutrition from a homemade tin (made from a single corpse)
               shouldn't be more than nutrition from the corresponding
               corpse; other tinning modes might use more than one corpse
               or add extra ingredients so aren't similarly restricted */
            if (r == HOMEMADE_TIN && nutamt > mons[mnum].cnutrit)
                nutamt = mons[mnum].cnutrit;
            if (always_eat)
                nutamt += 5; /* metallivorous hero ate the tin itself */
            /* use up tin now; lesshungry() could be fatal and produce bones */
            use_up_tin(tin), tin = null;
            lesshungry(nutamt);
        }

        if (tintxts[r].greasy) {
            /* normal hero is !Glib, because you can't open tins when Glib,
               but one poly'd into metallivorous form might already be Glib;
               it's debatable whether a rock mole should have its paws made
               slippery when eating a greasy tin, but we'll go with that... */
            let alreadyglib = (Glib() & TIMEOUT);

            make_glib(alreadyglib + rn1(11, 5)); /* 5..15 */
            pline(_("Eating %s food made your %s %s slippery."),
                  tintxts[r].txt, fingers_or_gloves(TRUE),
                  alreadyglib ? _("even more") : _("very"));
        }

    } else { /* spinach... */
        if (tin.cursed) {
            pline(_("It contains some decaying%s%s substance."),
                  Blind() ? _("") : _(" "), Blind() ? _("") : hcolor(NH_GREEN()));
        } else {
            pline(_("It contains spinach."));
            observe_object(tin);
            tin.known = 1;
        }

        if (!always_eat && y_n(_("Eat it?")) == ord('n')) {
            if (flags.verbose)
                You(_("discard the open tin."));
            tin = costly_tin(COST_OPEN);
            use_up_tin(tin);
            return;
        }

        /*
         * Same order as with non-spinach above:
         * conduct update, side-effects, shop handling, and nutrition.
         */
        /* don't need vegetarian checks for spinach */
        if (!u.uconduct.food++)
            livelog_printf(LL_CONDUCT, _("ate for the first time (spinach)"));
        if (!tin.cursed)
            pline(_("This makes you feel like %s!"),
                  /* "Swee'pea" is a character from the Popeye cartoons */
                  Hallucination() ? _("Swee'pea")
                  /* "feel like Popeye" unless sustain ability suppresses
                     any attribute change; this slightly oversimplifies
                     things:  we want "Popeye" if no strength increase
                     occurs due to already being at maximum, but we won't
                     get it if at-maximum and fixed-abil both apply */
                  : !Fixed_abil() ? _("Popeye")
                  /* no gain, feel like another character from Popeye */
                  : (flags.female ? _("Olive Oyl") : _("Bluto")));
        gainstr(tin, 0, FALSE);

        tin = svc.context.tin.tin = costly_tin(COST_OPEN);
        nutamt = (tin.blessed ? 600                   /* blessed */
                  : !tin.cursed ? (400 + rnd(200))    /* uncursed */
                    : (200 + rnd(400)));               /* cursed */
        if (always_eat)
            nutamt += 5; /* metallivorous hero also eats the tin itself */
        /* use up tin first; lesshungry() could be fatal and produce bones */
        use_up_tin(tin), tin = null;
        lesshungry(nutamt);
    }
    if (tin)
        use_up_tin(tin);
    return;
}

/* called during each move whilst opening a tin */
function /* int */
opentin()
{
    /* perhaps it was stolen (although that should cause interruption) */
    if (!carried(svc.context.tin.tin)
        && (!obj_here(svc.context.tin.tin, u.ux, u.uy)
            || !can_reach_floor(TRUE)))
        return 0; /* %% probably we should use tinoid */
    if (svc.context.tin.usedtime++ >= 50) {
        You(_("give up your attempt to open the tin."));
        return 0;
    }
    if (svc.context.tin.usedtime < svc.context.tin.reqtime)
        return 1; /* still busy */

    consume_tin(_("You succeed in opening the tin."));
    return 0;
}

/* called when starting to open a tin */
function /* void */
start_tin(otmp)
{ let $goto = null;
    var mesg = 0;
    var tmp;

    $goto_no_opener: for (;;) { switch ($goto) { default: case "no_opener": if (!$goto && (metallivorous(gy.youmonst.data))) {
        mesg = _("You bite right into the metal tin...");
        tmp = 0;
    } else if (!$goto && (cantwield(gy.youmonst.data))) { /* nohands || verysmall */
        You(_("cannot handle the tin properly to open it."));
        return;
    } else if (!$goto && (otmp.blessed)) {
        /* 50/50 chance for immediate access vs 1 turn delay (unless
           wielding blessed tin opener which always yields immediate
           access); 1 turn delay case is non-deterministic:  getting
           interrupted and retrying might yield another 1 turn delay
           or might open immediately on 2nd (or 3rd, 4th, ...) try */
        tmp = (uwep && uwep.blessed && uwep.otyp == TIN_OPENER) ? 0
                                                                  : rn2(2);
        if (!tmp)
            mesg = _("The tin opens like magic!");
        else
            pline_The(_("tin seems easy to open."));
    } else if (!$goto && (uwep)) {
        switch (uwep.otyp) {
        case TIN_OPENER:
            mesg = _("You easily open the tin."); /* iff tmp==0 */
            tmp = rn2(uwep.cursed ? 3 : !uwep.blessed ? 2 : 1);
            break;
        case DAGGER:
        case SILVER_DAGGER:
        case ELVEN_DAGGER:
        case ORCISH_DAGGER:
        case ATHAME:
        case KNIFE:
        case STILETTO:
        case CRYSKNIFE:
            tmp = 3;
            break;
        case PICK_AXE:
        case AXE:
            tmp = 6;
            break;
        default:
            { $goto = "no_opener"; continue $goto_no_opener; };
        }
        pline(_("Using %s you try to open the tin."), yobjnam(uwep, 0));
    } else {
 $goto = null;
        pline(_("It is not so easy to open this tin."));
        if (Glib()) {
            pline_The(_("tin slips from your %s."), fingers_or_gloves(FALSE));
            if (otmp.quan > 1) {
                otmp = splitobj(otmp, 1);
            }
            if (carried(otmp))
                dropx(otmp);
            else
                stackobj(otmp);
            return;
        }
        tmp = ((rn2(1 + Math.trunc(500 / ((ACURR(A_DEX) + ACURRSTR())))) + (10)));
    } } break; }

    svc.context.tin.tin = otmp;
    svc.context.tin.o_id = otmp.o_id;
    if (!tmp) {
        consume_tin(mesg); /* begin immediately */
    } else {
        svc.context.tin.reqtime = tmp;
        svc.context.tin.usedtime = 0;
        set_occupation(opentin, _("opening the tin"), 0);
    }
    return;
}

/* called when waking up after fainting */
export function /* int */
Hear_again()
{
    /* Chance of deafness going away while fainted/sleeping/etc. */
    if (!rn2(2)) {
        make_deaf(0, FALSE);
        disp.botl = TRUE;
    }
    return 0;
}

/* called on the "first bite" of rotten food */
function /* int */
rottenfood(obj)
{
    pline(_("Blecch!  %s %s!"),
          is_rottable(obj) ? _("Rotten") : _("Awful"), foodword(obj));
    if (!rn2(4)) {
        if (Hallucination())
            You_feel(_("rather trippy."));
        else
            You_feel(_("rather %s."), body_part(LIGHT_HEADED));
        make_confused(HConfusion() + d(2, 4), FALSE);
    } else if (!rn2(4) && !Blind()) {
        pline(_("Everything suddenly goes dark."));
        /* hero is not Blind, but Blinded timer might be nonzero if
           blindness is being overridden by the Eyes of the Overworld */
        make_blinded(BlindedTimeout() + d(2, 10), FALSE);
        if (!Blind())
            Your1(vision_clears());
    } else if (!rn2(3)) {
        let what, where;
        let duration = rnd(10);

        if (!Blind())
            what = _("goes"), where = _("dark");
        else if (Levitation() || Is_airlevel(u.uz) || Is_waterlevel(u.uz))
            what = _("you lose control of"), where = _("yourself");
        else
            what = _("you slap against the"),
            where = (u.usteed) ? _("saddle") : surface(u.ux, u.uy);
        pline_The(_("world spins and %s %s."), what, where);
        incr_itimeout(ref_of(u.uprops[DEAF], "intrinsic"), duration);
        disp.botl = TRUE;
        nomul(-duration);
        gm.multi_reason = _("unconscious from rotten food");
        gn.nomovemsg = _("You are conscious again.");
        ga.afternmv = Hear_again;
        return 1;
    }
    return 0;
}

/* called when a corpse is selected as food */
function /* int */
eatcorpse(otmp)
{
    let retcode = 0, tp = 0, mnum = otmp.corpsenm;
    let rotted = 0;
    let ll_conduct = 0;
    let stoneable,
            slimeable = (+(mnum == PM_GREEN_SLIME && !Slimed() && !Unchanging()
                         && !slimeproof(gy.youmonst.data))),
            glob = otmp.globby ? TRUE : FALSE;

    assert(ismnum(mnum));
    stoneable = (+(flesh_petrifies(mons[mnum]) && !Stone_resistance()
                 && !poly_when_stoned(gy.youmonst.data)));

    /* KMH, conduct */
    if (!vegan(mons[mnum]))
        if (!u.uconduct.unvegan++) {
            livelog_printf(LL_CONDUCT,
                  _("consumed animal products for the first time, by eating %s"),
                           an(food_xname(otmp, FALSE)));
            ll_conduct++;
        }
    if (!vegetarian(mons[mnum])) {
        if (!u.uconduct.unvegetarian && !ll_conduct)
            livelog_printf(LL_CONDUCT,
                           _("tasted meat for the first time, by eating %s"),
                           an(food_xname(otmp, FALSE)));
        violated_vegetarian();
    }
    if (!nonrotting_corpse(mnum)) {
        let age = peek_at_iced_corpse_age(otmp);

        rotted = Math.trunc((svm.moves - age) / (10 + rn2(20)));
        if (otmp.cursed)
            rotted += 2;
        else if (otmp.blessed)
            rotted -= 2;
    }

    /* 5.0: globs don't become tainted, they shrink away */
    if (!glob && !stoneable && !slimeable && rotted > 5) {
        let cannibal = maybe_cannibal(mnum, FALSE);

        /* tp++; -- early return makes this unnecessary */
        pline(_("Ulch - that %s was tainted%s!"),
              (mons[mnum].mlet == S_FUNGUS) ? _("fungoid vegetation")
              : vegetarian(mons[mnum]) ? _("protoplasm")
                : _("meat"),
              cannibal ? _(", you cannibal") : _(""));
        if (Sick_resistance()) {
            pline(_("It doesn't seem at all sickening, though..."));
        } else {
            let sick_time;

            sick_time = rn1(10, 10);
            /* make sure new ill doesn't result in improvement */
            if (Sick() && (sick_time > Sick()))
                sick_time = (Sick() > 1) ? Sick() - 1 : 1;
            make_sick(sick_time, corpse_xname(otmp, _("rotted"), CXN_NORMAL),
                      TRUE, SICK_VOMITABLE);

            pline(_("(It must have died too long ago to be safe to eat.)"));
        }
        if (carried(otmp))
            useup(otmp);
        else
            useupf(otmp, 1);
        return 2;
    } else if (acidic(mons[mnum]) && !Acid_resistance()) {
        tp++;
        You(_("have a very bad case of stomach acid."));   /* not body_part() */
        losehp(rnd(15), !glob ? _("acidic corpse") : _("acidic glob"),
               KILLED_BY_AN); /* acid damage */
    } else if (poisonous(mons[mnum]) && rn2(5)) {
        tp++;
        pline(_("Ecch - that must have been poisonous!"));
        if (!Poison_resistance()) {
            poison_strdmg(rnd(4), rnd(15),
                          !glob ? _("poisonous corpse") : _("poisonous glob"),
                          KILLED_BY_AN);
        } else
            You(_("seem unaffected by the poison."));

    /* now any corpse left too long will make you mildly ill */
    } else if ((rotted > 5 || (rotted > 3 && rn2(5))) && !Sick_resistance()) {
        tp++;
        You_feel(_("%ssick."), (Sick()) ? _("very ") : _(""));
        losehp(rnd(8), !glob ? _("cadaver") : _("rotted glob"), KILLED_BY_AN);
    }

    /* delay is weight dependent */
    svc.context.victual.reqtime
        = 3 + ((!glob ? mons[mnum].cwt : otmp.owt) >>> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.oeroded || !rn2(7))) {
        if (rottenfood(otmp)) {
            otmp.oeroded = TRUE;
            otmp = touchfood(otmp);
            if (!otmp)
                return 1;
            retcode = 1;
        }

        if (!mons[otmp.corpsenm].cnutrit) {
            /* no nutrition: rots away, no message if you passed out */
            if (!retcode)
                pline_The(_("corpse rots away completely."));
            if (carried(otmp))
                useup(otmp);
            else
                useupf(otmp, 1);
            retcode = 2;
        }

        if (!retcode)
            consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum == PM_COCKATRICE || mnum == PM_CHICKATRICE)
               && (Stone_resistance() || Hallucination())) {
        pline(_("This tastes just like chicken!"));
    } else if (mnum == PM_FLOATING_EYE && u.umonnum == PM_RAVEN) {
        You(_("peck the eyeball with delight."));
    } else if (tp) {
        ; /* we've already delivered a message; don't add "it tastes okay" */
    } else {
        /* yummy is always False for omnivores, palatable always True */
        let yummy = (vegan(mons[mnum])
                            ? (+(!carnivorous(gy.youmonst.data)
                               && herbivorous(gy.youmonst.data)))
                            : (+(carnivorous(gy.youmonst.data)
                               && !herbivorous(gy.youmonst.data)))),
                palatable = ((((vegetarian(mons[mnum])
                              ? herbivorous(gy.youmonst.data)
                              : carnivorous(gy.youmonst.data))
                             && rn2(10)
                             && (rotted < 1 || !rn2(int(rotted) + 1))) ? 1 : 0));
        let pmxnam = food_xname(otmp, FALSE);
        let palatable_msgs = static_array("eatcorpse.palatable_msgs", ptr_to(char), null, [
            /* first char: T = tastes ... , I = is ... */
            /* veggies are always just "okay" */
            _("Tokay"), _("Istringy"), _("Igamey"), _("Ifatty"), _("Itough")
        ]);
        let idx = vegetarian(mons[mnum]) ? 0 : rn2(SIZE(palatable_msgs));
        let palat_msg = palatable_msgs[idx];
        let use_is = (((Hallucination() || (palatable && chars[palat_msg] == ord('I'))) ? 1 : 0));

        if (!strncmpi(pmxnam, _("the "), 4))
            pmxnam += 4;
        pline(_("%s%s %s %s%c"),
              type_is_pname(mons[mnum])
                 ? _("") : the_unique_pm(mons[mnum]) ? _("The ") : _("This "),
              pmxnam,
              use_is ? _("is") : _("tastes"),
                  /* tiger reference is to TV ads for "Frosted Flakes",
                     breakfast cereal targeted at kids by "Tony the tiger" */
              Hallucination()
                 ? (yummy ? ((u.umonnum == PM_TIGER) ? _("gr-r-reat") : _("gnarly"))
                          : palatable ? _("copacetic") : _("grody"))
              : (yummy ? _("delicious") : palatable ?
                 palat_msg + 1 : _("terrible")),
              (yummy || !palatable) ? ord('!') : ord('.'));
    }

    return retcode;
}

/* called as you start to eat */
function /* void */
start_eating(otmp, already_partly_eaten)
{
    let old_nomovemsg, save_nomovemsg;
    let msgbuf = static_array("start_eating.msgbuf", char, BUFSZ);

    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("start_eating: %s (victual = %s)"), fmt_ptr(addr_of(otmp)), fmt_ptr(addr_of(svc.context.victual.piece))); iflags.last_msg = save_plnmsg; } } while (0)




;
    debugpline1(_("reqtime = %d"), svc.context.victual.reqtime, __FILE__);
    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("(original reqtime = %d)"), objects[otmp.otyp].oc_delay); iflags.last_msg = save_plnmsg; } } while (0);
    debugpline1(_("nmod = %d"), svc.context.victual.nmod, __FILE__);
    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("oeaten = %d"), otmp.oeaten); iflags.last_msg = save_plnmsg; } } while (0);
    svc.context.victual.fullwarn = svc.context.victual.doreset = 0;
    svc.context.victual.eating = 1;

    if (otmp.otyp == CORPSE || otmp.globby) {
        cprefx(svc.context.victual.piece.corpsenm);
        if (!svc.context.victual.piece || !svc.context.victual.eating) {
            /* rider revived, or hero died and was lifesaved */
            return;
        }
    }

    old_nomovemsg = gn.nomovemsg;
    if (bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if (++svc.context.victual.usedtime >= svc.context.victual.reqtime) {
            /* don't want done_eating() to issue gn.nomovemsg if it
               is due to vomit() called by bite() */
            save_nomovemsg = gn.nomovemsg;
            if (!old_nomovemsg)
                gn.nomovemsg = 0;
            done_eating(FALSE);
            if (!old_nomovemsg)
                gn.nomovemsg = save_nomovemsg;
        }
        return;
    }

    if (++svc.context.victual.usedtime >= svc.context.victual.reqtime) {
        /* print "finish eating" message if they just resumed -dlc */
        done_eating((svc.context.victual.reqtime > 1
                     || already_partly_eaten) ? TRUE : FALSE);
        return;
    }

    void sprintf(msgbuf, _("eating %s"), food_xname(otmp, TRUE));
    set_occupation(eatfood, msgbuf, 0);
}

/* used by shrink_glob() timer routine */
export function /* boolean */
eating_glob(glob)
{
    return (+(go.occupation == eatfood && glob == svc.context.victual.piece));
}

/* scare nearby monster when hero eats garlic */
function /* void */
garlic_breath(mtmp)
{
    if (olfaction(mtmp.data) && distu(mtmp.mx, mtmp.my) < 7)
        monflee(mtmp, 0, FALSE, FALSE);
}

/*
 * Called on "first bite" of (non-corpse) food, after touchfood() has
 * marked it 'partly eaten'.  Used for non-rotten non-tin non-corpse food.
 * Messages should use present tense since multi-turn food won't be
 * finishing at the time they're issued.
 * Returns FALSE if eating should not succeed for whatever reason.
 */
function /* boolean */
fprefx(otmp)
{ let $goto = null;
    $goto_give_feedback: for (;;) { switch ($goto || (otmp.otyp)) {
    case EGG:
        if (otmp.corpsenm == PM_PYROLISK) {
            if (carried(otmp))
                useup(otmp);
            else
                useupf(otmp, 1);
            explode(u.ux, u.uy, -11, d(3, 6), 0, EXPL_FIERY);
            return FALSE;
        } else if (stale_egg(otmp)) {
            pline(_("Ugh.  Rotten egg.")); /* perhaps others like it */
            /* increasing existing nausea means that it will take longer
               before eventual vomit, but also means that constitution
               will be abused more times before illness completes */
            make_vomiting((Vomiting() & TIMEOUT) + d(10, 4), TRUE);
        } else
            { $goto = "give_feedback"; continue $goto_give_feedback; };
        break;
    case FOOD_RATION: /* nutrition 800 */
        /* 200+800 remains below 1000+1, the satiation threshold */
        if (u.uhunger <= 200)
            pline(_("%s!"), Hallucination() ? _("Oh wow, like, superior, man")
                                       : _("This food really hits the spot"));

        /* 700-1+800 remains below 1500, the choking threshold which
           triggers "you're having a hard time getting it down" feedback */
        else if (u.uhunger < 700)
            pline(_("This satiates your %s!"), body_part(STOMACH));
        /* [satiation message may be inaccurate if eating gets interrupted] */
        break;
    case TRIPE_RATION:
        if (carnivorous(gy.youmonst.data) && !humanoid(gy.youmonst.data)) {
            pline(_("This tripe ration is surprisingly good!"));
        } else if (((Upolyd() ? (is_orc(gy.youmonst.data)) : (Race_if(PM_ORC))))) {
            pline(Hallucination() ? _("Tastes great!  Less filling!")
                                : _("Mmm, tripe... not bad!"));
        } else {
            pline(_("Yak - dog food!"));
            more_experienced(1, 0);
            newexplevel();
            /* not cannibalism, but we use similar criteria
               for deciding whether to be sickened by this meal */
            if (rn2(2) && !CANNIBAL_ALLOWED())
                make_vomiting(rn1(svc.context.victual.reqtime, 14),
                              FALSE);
        }
        break;
    case LEMBAS_WAFER:
        if (((Upolyd() ? (is_orc(gy.youmonst.data)) : (Race_if(PM_ORC))))) {
            pline(_("%s"), _("!#?&* elf kibble!"));
            break;
        } else if (((Upolyd() ? (is_elf(gy.youmonst.data)) : (Race_if(PM_ELF))))) {
            pline(_("A little goes a long way."));
            break;
        }
        { $goto = "give_feedback"; continue $goto_give_feedback; }
    case MEATBALL:
    case MEAT_STICK:
    case ENORMOUS_MEATBALL:
    case MEAT_RING:
        { $goto = "give_feedback"; continue $goto_give_feedback; };
    case CLOVE_OF_GARLIC:
        if (is_undead(gy.youmonst.data)) {
            make_vomiting(rn1(svc.context.victual.reqtime, 5), FALSE);
            break;
        }
        iter_mons(garlic_breath);
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case "give_feedback": default:
        if (!$goto && (otmp.otyp == SLIME_MOLD && !otmp.cursed
            && otmp.spe == svc.context.current_fruit)) {
            pline(_("My, this is a %s %s!"),
                  Hallucination() ? _("primo") : _("yummy"),
                  singular(otmp, xname));
        } else if (!$goto && (otmp.otyp == APPLE && otmp.cursed && !Sleep_resistance())) {
            ; /* skip core joke; feedback deferred til fpostfx() */


        /* KMH -- Why should Unix have all the fun?
           We check MACOS before UNIX to get the Apple-specific apple
           message; the '#if UNIX' code will still kick in for pear. */
        } else if (!$goto && (otmp.otyp == APPLE)) {
            pline(_("Delicious!  Must be a Macintosh!"));



        } else if (!$goto && (otmp.otyp == APPLE || otmp.otyp == PEAR)) {
            if (!Hallucination()) {
                pline(_("Core dumped."));
            } else {
                /* based on an old Usenet joke, a fake a.out manual page */
                var x = rnd(100);

                pline(_("%s -- core dumped."),
                      (x <= 75)
                         ? _("Segmentation fault")
                         : (x <= 99)
                            ? _("Bus error")
                            : _("Yo' mama"));
            }

        } else {
 $goto = null;
            pline(_("This %s is %s"), singular(otmp, xname),
                  otmp.cursed
                     ? (Hallucination() ? _("grody!") : _("terrible!"))
                     : (otmp.otyp == CRAM_RATION
                        || otmp.otyp == K_RATION
                        || otmp.otyp == C_RATION)
                        ? _("bland.")
                        : Hallucination() ? _("gnarly!") : _("delicious!"));
        }
        break; /* default */
    } break; } /* switch */
    return TRUE;
}

/* increment a combat intrinsic with limits on its growth */
function /* int */
bounded_increase(old, inc, typ)
{
    let absold, absinc, sgnold, sgninc;

    /* don't include any amount coming from worn rings (caller handles
       'protection' differently) */
    if (uright && uright.otyp == typ && typ != RIN_PROTECTION)
        old -= uright.spe;
    if (uleft && uleft.otyp == typ && typ != RIN_PROTECTION)
        old -= uleft.spe;
    absold = abs(old), absinc = abs(inc);
    sgnold = sgn(old), sgninc = sgn(inc);

    if (absinc == 0 || sgnold != sgninc || absold + absinc < 10) {
        ; /* use inc as-is */
    } else if (absold + absinc < 20) {
        absinc = rnd(absinc); /* 1..n */
        if (absold + absinc < 10)
            absinc = 10 - absold;
        inc = sgninc * absinc;
    } else if (absold + absinc < 40) {
        absinc = rn2(absinc) ? 1 : 0;
        if (absold + absinc < 20)
            absinc = rnd(20 - absold);
        inc = sgninc * absinc;
    } else {
        inc = 0; /* no further increase allowed via this method */
    }
    /* put amount from worn rings back */
    if (uright && uright.otyp == typ && typ != RIN_PROTECTION)
        old += uright.spe;
    if (uleft && uleft.otyp == typ && typ != RIN_PROTECTION)
        old += uleft.spe;
    return old + inc;
}

function /* void */
accessory_has_effect(otmp)
{
    pline(_("Magic spreads through your body as you digest the %s."),
          (otmp.oclass == RING_CLASS) ? _("ring") : _("amulet"));
}

function /* void */
eataccessory(otmp)
{
    let typ = otmp.otyp;
    let oldprop;

    /* Note: rings are not so common that this is unbalancing. */
    /* (How often do you even _find_ 3 rings of polymorph in a game?) */
    oldprop = u.uprops[objects[typ].oc_oprop].intrinsic;
    if (otmp == uleft || otmp == uright) {
        Ring_gone(otmp);
        if (u.uhp <= 0)
            return; /* died from sink fall */
    }
    observe_object(otmp);
    otmp.known = 1; /* by taste */
    if (!rn2(otmp.oclass == RING_CLASS ? 3 : 5)) {
        switch (otmp.otyp) {
        default:
            if (!objects[typ].oc_oprop)
                break; /* should never happen */

            if (!(u.uprops[objects[typ].oc_oprop].intrinsic & FROMOUTSIDE))
                accessory_has_effect(otmp);

            u.uprops[objects[typ].oc_oprop].intrinsic = or64(u.uprops[objects[typ].oc_oprop].intrinsic, FROMOUTSIDE);

            switch (typ) {
            case RIN_SEE_INVISIBLE:
                set_mimic_blocking();
                see_monsters();
                if (Invis() && !oldprop && !ESee_invisible()
                    && !perceives(gy.youmonst.data) && !Blind()) {
                    newsym(u.ux, u.uy);
                    pline(_("Suddenly you can see yourself."));
                    makeknown(typ);
                }
                break;
            case RIN_INVISIBILITY:
                if (!oldprop && !EInvis() && !BInvis() && !See_invisible()
                    && !Blind()) {
                    newsym(u.ux, u.uy);
                    Your(_("body takes on a %s transparency..."),
                         Hallucination() ? _("normal") : _("strange"));
                    makeknown(typ);
                }
                break;
            case RIN_PROTECTION_FROM_SHAPE_CHAN:
                rescham();
                break;
            case RIN_LEVITATION:
                /* undo the `.intrinsic |= FROMOUTSIDE' done above */
                u.uprops[LEVITATION].intrinsic = oldprop;
                if (!Levitation()) {
                    float_up();
                    incr_itimeout(ref_of(u.uprops[LEVITATION], "intrinsic"), d(10, 20));
                    makeknown(typ);
                }
                break;
            } /* inner switch */
            break; /* default case of outer switch */

        case RIN_ADORNMENT:
            accessory_has_effect(otmp);
            if (adjattrib(A_CHA, otmp.spe, -1))
                makeknown(typ);
            break;
        case RIN_GAIN_STRENGTH:
            accessory_has_effect(otmp);
            if (adjattrib(A_STR, otmp.spe, -1))
                makeknown(typ);
            break;
        case RIN_GAIN_CONSTITUTION:
            accessory_has_effect(otmp);
            if (adjattrib(A_CON, otmp.spe, -1))
                makeknown(typ);
            break;
        case RIN_INCREASE_ACCURACY:
            accessory_has_effect(otmp);
            u.uhitinc = schar(bounded_increase(u.uhitinc, otmp.spe,
                                                 RIN_INCREASE_ACCURACY));
            break;
        case RIN_INCREASE_DAMAGE:
            accessory_has_effect(otmp);
            u.udaminc = schar(bounded_increase(u.udaminc, otmp.spe,
                                                 RIN_INCREASE_DAMAGE));
            break;
        case RIN_PROTECTION:
        case AMULET_OF_GUARDING:
            accessory_has_effect(otmp);
            u.uprops[PROTECTION].intrinsic = or64(u.uprops[PROTECTION].intrinsic, FROMOUTSIDE);
            u.ublessed = bounded_increase(u.ublessed,
                                          (typ == RIN_PROTECTION) ? otmp.spe
                                           : 2, /* fixed amount for amulet */
                                          typ);
            disp.botl = TRUE;
            break;
        case RIN_FREE_ACTION:
            /* Give sleep resistance instead */
            if (!(HSleep_resistance() & FROMOUTSIDE))
                accessory_has_effect(otmp);
            if (!Sleep_resistance())
                You_feel(_("wide awake."));
            u.uprops[SLEEP_RES].intrinsic = or64(u.uprops[SLEEP_RES].intrinsic, FROMOUTSIDE);
            break;
        case AMULET_OF_CHANGE:
            accessory_has_effect(otmp);
            makeknown(typ);
            change_sex();
            You(_("are suddenly very %s!"),
                flags.female ? _("feminine") : _("masculine"));
            disp.botl = TRUE;
            break;
        case AMULET_OF_UNCHANGING:
            /* un-change: it's a pun */
            if (!Unchanging() && Upolyd()) {
                accessory_has_effect(otmp);
                makeknown(typ);
                rehumanize();
            }
            break;
        case AMULET_OF_STRANGULATION: /* bad idea! */
            /* no message--this gives no permanent effect */
            choke(otmp);
            break;
        case AMULET_OF_RESTFUL_SLEEP: { /* another bad idea! */
            let newnap = rnd(100), oldnap = (HSleepy() & TIMEOUT);

            if (!(HSleepy() & FROMOUTSIDE))
                accessory_has_effect(otmp);
            u.uprops[SLEEPY].intrinsic = or64(u.uprops[SLEEPY].intrinsic, FROMOUTSIDE);
            /* might also be wearing one; use shorter of two timeouts */
            if (newnap < oldnap || oldnap == 0)
                u.uprops[SLEEPY].intrinsic = or64((and64(HSleepy(), ~TIMEOUT)), newnap);
            break;
        }
        case RIN_SUSTAIN_ABILITY:
        case AMULET_OF_LIFE_SAVING:
        case AMULET_OF_FLYING:
        case AMULET_OF_REFLECTION: /* nice try */
            /* can't eat Amulet of Yendor or fakes,
             * and no oc_prop even if you could -3.
             */
            break;
        }
    }
}

/* called after eating non-food */
function /* void */
eatspecial()
{
    let otmp = svc.context.victual.piece;

    /* lesshungry wants an occupation to handle choke messages correctly */
    set_occupation(eatfood, _("eating non-food"), 0);
    lesshungry(svc.context.victual.nmod);
    go.occupation = null;
    struct_assign(svc.context.victual, zero_victual); /* victual.piece = 0, .o_id = 0 */

    if (otmp.oclass == COIN_CLASS) {
        if (carried(otmp))
            useupall(otmp);
        else
            useupf(otmp, otmp.quan);
        vault_gd_watching(GD_EATGOLD);
        return;
    }
    if (objects[otmp.otyp].oc_material == PAPER) {

        if (otmp.otyp == SCR_MAIL)
            /* no nutrition */
            pline(_("This junk mail is less than satisfying."));
        else

        if (otmp.otyp == SCR_SCARE_MONSTER)
            /* to eat scroll, hero is currently polymorphed into a monster */
            pline(_("Yuck%c"), otmp.blessed ? ord('!') : ord('.'));
        else if (otmp.oclass == SCROLL_CLASS
                 /* check description after checking for specific scrolls */
                 && objdescr_is(otmp, _("YUM YUM")))
            pline(_("Yum%c"), otmp.blessed ? ord('!') : ord('.'));
        else
            pline(_("Needs salt..."));
    }
    if (otmp.oclass == POTION_CLASS) {
        otmp.quan++; /* dopotion() does a useup() */
        void dopotion(otmp);
    } else if (otmp.oclass == RING_CLASS || otmp.oclass == AMULET_CLASS) {
        eataccessory(otmp);
    } else if (otmp.otyp == LEASH && otmp.corpsenm) {
        o_unleash(otmp);
    }

    /* KMH -- idea by "Tommy the Terrorist" */
    if (otmp.otyp == TRIDENT && !otmp.cursed) {
        /* sugarless chewing gum which used to be heavily advertised on TV */
        pline(Hallucination() ? _("Four out of five dentists agree.")
                            : _("That was pure chewing satisfaction!"));
        exercise(A_WIS, TRUE);
    }
    if (otmp.otyp == FLINT && !otmp.cursed) {
        /* chewable vitamin for kids based on "The Flintstones" TV cartoon */
        pline(_("Yabba-dabba delicious!"));
        exercise(A_CON, TRUE);
    }

    if (otmp == uwep && otmp.quan == 1)
        uwepgone();
    if (otmp == uquiver && otmp.quan == 1)
        uqwepgone();
    if (otmp == uswapwep && otmp.quan == 1)
        uswapwepgone();

    if (otmp == uball)
        unpunish();
    if (otmp == uchain)
        unpunish(); /* but no useup() */
    else if (carried(otmp))
        useup(otmp);
    else
        useupf(otmp, 1);
}

/* NOTE: the order of these words exactly corresponds to the
   order of oc_material values #define'd in objclass.h. */
const foodwords = static_array("foodwords", ptr_to(char), null, [
    _("meal"),    _("liquid"),  _("wax"),       _("food"), _("meat"),     _("paper"),
    _("cloth"),   _("leather"), _("wood"),      _("bone"), _("scale"),    _("metal"),
    _("metal"),   _("metal"),   _("silver"),    _("gold"), _("platinum"), _("mithril"),
    _("plastic"), _("glass"),   _("rich food"), _("stone")
]);

function /* const char * */
foodword(otmp)
{
    if (otmp.oclass == FOOD_CLASS)
        return _("food");
    if (otmp.oclass == GEM_CLASS && objects[otmp.otyp].oc_material == GLASS
        && otmp.dknown)
        makeknown(otmp.otyp);
    return foodwords[objects[otmp.otyp].oc_material];
}

/* called after consuming (non-corpse) food */
function /* void */
fpostfx(otmp)
{
    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        if (ismnum(u.ulycn) || is_were(gy.youmonst.data))
            you_unwere(TRUE);
        break;
    case CARROT:
        if (!u.uswallow
            || !attacktype_fordmg(u.ustuck.data, AT_ENGL, AD_BLND))
            make_blinded(u.ucreamed, TRUE);
        break;
    case FORTUNE_COOKIE:
        outrumor(bcsign(otmp), BY_COOKIE);
        if (!Blind())
            if (!u.uconduct.literate++)
                livelog_printf(LL_CONDUCT,
                    _("became literate by reading the fortune inside a cookie"));
        break;
    case LUMP_OF_ROYAL_JELLY:
        if (gy.youmonst.data == mons[PM_KILLER_BEE] && !Unchanging()
            && polymon(PM_QUEEN_BEE))
            break;

        /* This stuff seems to be VERY healthy! */
        gainstr(otmp, 1, TRUE);
        if (Upolyd()) {
            u.mh += otmp.cursed ? -rnd(20) : rnd(20), disp.botl = TRUE;
            if (u.mh > u.mhmax) {
                if (!rn2(17))
                    setuhpmax(u.mhmax + 1, FALSE);
                u.mh = u.mhmax;
            } else if (u.mh <= 0) {
                rehumanize();
            }
        } else {
            u.uhp += otmp.cursed ? -rnd(20) : rnd(20), disp.botl = TRUE;
            if (u.uhp > u.uhpmax) {
                if (!rn2(17))
                    setuhpmax(u.uhpmax + 1, FALSE);
                u.uhp = u.uhpmax;
            } else if (u.uhp <= 0) {
                svk.killer.format = KILLED_BY_AN;
                void strcpy(svk.killer.name, _("rotten lump of royal jelly"));
                done(POISONING);
            }
        }
        if (!otmp.cursed)
            heal_legs(0);
        break;
    case EGG:
        if (ismnum(otmp.corpsenm)
            && flesh_petrifies(mons[otmp.corpsenm])) {
            if (!Stone_resistance()
                && !(poly_when_stoned(gy.youmonst.data)
                     && polymon(PM_STONE_GOLEM))) {
                if (!Stoned()) {
                    void sprintf(svk.killer.name, _("%s egg"), mons[otmp.corpsenm].pmnames[NEUTRAL])
;
                    make_stoned(5, 0, KILLED_BY_AN,
                                svk.killer.name);
                }
            }
            /* note: no "tastes like chicken" message for eggs */
        }
        break;
    case EUCALYPTUS_LEAF:
        if (Sick() && !otmp.cursed)
            make_sick(0, 0, TRUE, SICK_ALL);
        if (Vomiting() && !otmp.cursed)
            make_vomiting(0, TRUE);
        break;
    case APPLE:
        if (otmp.cursed && !Sleep_resistance()) {
            /* Snow White; 'poisoned' applies to [a subset of] weapons,
               not food, so we substitute cursed; fortunately our hero
               won't have to wait for a prince to be rescued/revived */
            if (Race_if(PM_DWARF) && Hallucination()) {
                verbalize(_("Heigh-ho, ho-hum, I think I'll skip work today."));
            } else if (Deaf() || !flags.acoustics) {
                You(_("fall asleep."));
            } else {
                 ;
                You_hear(_("sinister laughter as you fall asleep..."));
            }
            fall_asleep(-rn1(11, 20), TRUE);
        }
        break;
    }
    return;
}




















/*
 * return 0 if the food was not dangerous.
 * return 1 if the food was dangerous and you chose to stop.
 * return 2 if the food was dangerous and you chose to eat it anyway.
 */
function /* int */
edibility_prompts(otmp)
{ const $frame = stack_frame(); try {
    /* Blessed food detection grants hero a one-use
     * ability to detect food that is unfit for consumption
     * or dangerous and avoid it.
     */
    let buf = stack_array(char, BUFSZ), foodsmell = stack_array(char, BUFSZ),
         it_or_they = stack_array(char, QBUFSZ);
    /* 5.0: decaying globs don't become tainted anymore; in 3.6, they did */
    let cadaver = (+(otmp.otyp == CORPSE)), stoneorslime = FALSE;
    let material = objects[otmp.otyp].oc_material, mnum = otmp.corpsenm;
    let rotted = 0;

    void strcpy(foodsmell, Tobjnam(otmp, _("smell")));
    void strcpy(it_or_they, (otmp.quan == 1) ? _("it") : _("they"));

    if (cadaver || otmp.otyp == EGG || otmp.otyp == TIN
        || otmp.otyp == GLOB_OF_GREEN_SLIME) {
        /* These checks must match those in eatcorpse() */
        stoneorslime = (+(ismnum(mnum)
                        && flesh_petrifies(mons[mnum])
                        && !Stone_resistance()
                        && !poly_when_stoned(gy.youmonst.data)));

        if (mnum == PM_GREEN_SLIME || otmp.otyp == GLOB_OF_GREEN_SLIME)
            stoneorslime = (+(!Unchanging() && !slimeproof(gy.youmonst.data)));

        if (cadaver && !nonrotting_corpse(mnum)) {
            let age = peek_at_iced_corpse_age(otmp);

            /* worst case rather than random
               in this calculation to force prompt */
            rotted = Math.trunc((svm.moves - age) / (10 + 0 /* was rn2(20) */));
            if (otmp.cursed)
                rotted += 2;
            else if (otmp.blessed)
                rotted -= 2;
        }
    }

    /*
     * These problems with food should be checked in
     * order from most detrimental to least detrimental.
     */
    chars[buf + 0] = ord('\0');
    if (cadaver && rotted > 5 && !Sick_resistance()) {
        /* Tainted meat */
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s could be tainted!"), foodsmell, it_or_they)
;
    } else if (stoneorslime) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s could be something very dangerous!"), foodsmell, it_or_they)

;
    } else if (cadaver && rotted > 5 && Sick_resistance()) {
        /* Tainted meat with Sick_resistance (testing for that is
           redundant; we don't get this far for !Sick_resistance)
           needs to be done now even though there is no danger because
           it can't match after the rotten (cadaver && rotted > 3) test */
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s could be tainted."), foodsmell, it_or_they)
;
    } else if (otmp.oeroded || (cadaver && rotted > 3)) {
        /* Rotten */
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s could be rotten!"), foodsmell, it_or_they)
;
    } else if (cadaver && poisonous(mons[mnum]) && !Poison_resistance()) {
        /* poisonous */
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s might be poisonous!"), foodsmell, it_or_they)
;
    } else if (otmp.otyp == APPLE && otmp.cursed && !Sleep_resistance()) {
        /* causes sleep, for long enough to be dangerous */
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s like %s might have been poisoned."), foodsmell, it_or_they)
;
    } else if (cadaver && !vegetarian(mons[mnum])
               && !u.uconduct.unvegetarian && Role_if(PM_MONK)) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s unhealthy."), foodsmell);
    } else if (cadaver && acidic(mons[mnum]) && !Acid_resistance()) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s rather acidic."), foodsmell);
    } else if (Upolyd() && u.umonnum == PM_RUST_MONSTER && is_metallic(otmp)
               && otmp.oerodeproof) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s disgusting to you right now."), foodsmell)
;

    /*
     * Breaks conduct, but otherwise safe.
     */
    } else if (!u.uconduct.unvegan
               && ((material == LEATHER || material == BONE
                    || material == DRAGON_HIDE || material == WAX)
                   || (cadaver && !vegan(mons[mnum])))) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s foul and unfamiliar to you."), foodsmell)
;
    } else if (!u.uconduct.unvegetarian
               && ((material == LEATHER || material == BONE
                    || material == DRAGON_HIDE)
                   || (cadaver && !vegetarian(mons[mnum])))) {
        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s unfamiliar to you."), foodsmell);
    }

    if (chars[buf]) {
        Snprintf(eos(buf), unsigned(sizeof(array_of(char, BUFSZ)) - strlen(buf)), _("  Eat %s anyway?"), (otmp.quan == 1) ? _("it") : _("one"))
;
        return (yn_function(buf, ynchars, ord('n'), TRUE) == ord('n')) ? 1 : 2;
    }
    return 0;
} finally { stack_pop($frame); } }

function /* int */
doeat_nonfood(otmp)
{
    let basenutrit; /* nutrition of full item */
    let ll_conduct = 0;
    let nodelicious = FALSE;
    let material;

    svc.context.victual.reqtime = 1;
    svc.context.victual.piece = otmp;
    svc.context.victual.o_id = otmp.o_id;
    /* Don't split it, we don't need to if it's 1 move */
    svc.context.victual.usedtime = 0;
    svc.context.victual.canchoke = (+(u.uhs == SATIATED));
    /* Note: gold weighs 1 pt. for each 1000 pieces (see
       pickup.c) so gold and non-gold is consistent. */
    if (otmp.oclass == COIN_CLASS)
        basenutrit = ((otmp.quan > 200000) ? 2000
                      : int((Math.trunc(otmp.quan / 100))));
    else if (otmp.oclass == BALL_CLASS || otmp.oclass == CHAIN_CLASS)
        basenutrit = weight(otmp);
    /* oc_nutrition is usually weight anyway */
    else
        basenutrit = objects[otmp.otyp].oc_nutrition;

    if (otmp.otyp == SCR_MAIL) {
        basenutrit = 0;
        nodelicious = TRUE;
    }

    svc.context.victual.nmod = basenutrit;
    svc.context.victual.eating = 1; /* needed for lesshungry() */

    if (!u.uconduct.food++) {
        ll_conduct++;
        livelog_printf(LL_CONDUCT, _("ate for the first time (%s)"),
                       food_xname(otmp, FALSE));
    }
    material = objects[otmp.otyp].oc_material;
    if (material == LEATHER || material == BONE
        || material == DRAGON_HIDE || material == WAX) {
        if (!u.uconduct.unvegan++ && !ll_conduct) {
            livelog_printf(LL_CONDUCT,
                  _("consumed animal products for the first time, by eating %s"),
                           an(food_xname(otmp, FALSE)));
            ll_conduct++;
        }
        if (material != WAX) {
            if (!u.uconduct.unvegetarian && !ll_conduct)
                livelog_printf(LL_CONDUCT,
                   _("tasted meat by-products for the first time, by eating %s"),
                               an(food_xname(otmp, FALSE)));
            violated_vegetarian();
        }
    }

    if (otmp.cursed) {
        void rottenfood(otmp);
        nodelicious = TRUE;
    } else if (objects[otmp.otyp].oc_material == PAPER)
        nodelicious = TRUE;

    if (otmp.oclass == WEAPON_CLASS && otmp.otrapped) {
        pline(_("Ecch - that must have been poisonous!"));
        if (!Poison_resistance()) {
            poison_strdmg(rnd(4), rnd(15), xname(otmp), KILLED_BY_AN);
        } else
            You(_("seem unaffected by the poison."));
    } else if (!nodelicious) {
        pline(_("%s%s is delicious!"),
              (obj_is_pname(otmp)
               && otmp.oartifact < ART_ORB_OF_DETECTION)
              ? _("")
              : _("This "),
              (otmp.oclass == COIN_CLASS)
              ? foodword(otmp)
              : singular(otmp, xname));
    }
    eatspecial();
    return ECMD_TIME;
}

/* the #eat command */
export function /* int */
doeat()
{ const $frame = stack_frame(); try {
    let otmp = stack_var(ptr_to(struct_obj));
    let basenutrit; /* nutrition of full item */
    let dont_start = FALSE,
            already_partly_eaten;
    let ll_conduct = 0;

    if (Strangled()) {
        pline(_("If you can't breathe air, how can you consume solids?"));
        return ECMD_OK;
    }
    if (!(otmp[0] = floorfood(_("eat"), 0)))
        return ECMD_OK;
    if (check_capacity(0))
        return ECMD_OK;

    if (u.uedibility) {
        let res = edibility_prompts(otmp[0]);

        if (res) {
            Your(
               _("%s stops tingling and your sense of smell returns to normal."),
                 body_part(NOSE));
            u.uedibility = 0;
            if (res == 1)
                return ECMD_OK;
        }
    }

    /* from floorfood(), &hands_obj means iron bars at current spot */
    if (otmp[0] == hands_obj) {
        /* hero in metallivore form is eating [diggable] iron bars
           at current location so skip the other assorted checks;
           operates as if digging rather than via the eat occupation */
        if (still_chewing(u.ux, u.uy) && levl()[u.ux][u.uy].typ == IRONBARS) {
            /* this is verbose, but player will see the hero rather than the
               bars so wouldn't know that more turns of eating are required */
            You(_("pause to swallow."));
        }
        return ECMD_TIME;
    }
    /* We have to make non-foods take 1 move to eat, unless we want to
     * do ridiculous amounts of coding to deal with partly eaten plate
     * mails, players who polymorph back to human in the middle of their
     * metallic meal, etc....
     */
    if (!is_edible(otmp[0])) {
        You(_("cannot eat that!"));
        return ECMD_OK;
    } else if ((otmp[0].owornmask & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE))
               != 0) {
        /* let them eat rings */
        You_cant(_("eat %s you're wearing."), something());
        return ECMD_OK;
    } else if (!(carried(otmp[0]) ? retouch_object(otmp, FALSE)
                               : touch_artifact(otmp[0], gy.youmonst))) {
        return ECMD_TIME; /* got blasted so use a turn */
    }
    if (is_metallic(otmp[0]) && u.umonnum == PM_RUST_MONSTER
        && otmp[0].oerodeproof) {
        otmp[0].rknown = TRUE;
        if (otmp[0].quan > 1) {
            if (!carried(otmp[0]))
                void splitobj(otmp[0], otmp[0].quan - 1);
            else
                otmp[0] = splitobj(otmp[0], 1);
        }
        pline(_("Ulch - that %s was rustproofed!"), xname(otmp[0]));
        /* The regurgitated object's rustproofing is gone now */
        otmp[0].oerodeproof = 0;
        make_stunned((HStun() & TIMEOUT) + rn2(10), TRUE);
        /*
         * We don't expect rust monsters to be wielding welded weapons
         * or wearing cursed rings which were rustproofed, but guard
         * against the possibility just in case.
         */
        if (welded(otmp[0]) || (otmp[0].cursed && (otmp[0].owornmask & W_RING))) {
            set_bknown(otmp[0], 1); /* for ring; welded() does this for weapon */
            You(_("spit out %s."), the(xname(otmp[0])));
        } else {
            You(_("spit %s out onto the %s."), the(xname(otmp[0])),
                surface(u.ux, u.uy));
            if (carried(otmp[0])) {
                /* no need to check for leash in use; it's not metallic */
                if (otmp[0].owornmask)
                    remove_worn_item(otmp[0], FALSE);
                freeinv(otmp[0]);
                dropy(otmp[0]);
            }
            stackobj(otmp[0]);
        }
        return ECMD_TIME;
    }
    /* KMH -- Slow digestion is... indigestible */
    if (otmp[0].otyp == RIN_SLOW_DIGESTION) {
        pline(_("This ring is indigestible!"));
        void rottenfood(otmp[0]);
        if (otmp[0].dknown)
            trycall(otmp[0]);
        return ECMD_TIME;
    }
    if (otmp[0].oclass != FOOD_CLASS)
        return doeat_nonfood(otmp[0]);


    if (otmp[0] == svc.context.victual.piece) {
        let one_bite_left = (+(svc.context.victual.usedtime + 1
                                 >= svc.context.victual.reqtime));

        /* If they weren't able to choke, they don't suddenly become able to
         * choke just because they were interrupted.  On the other hand, if
         * they were able to choke before, if they lost food it's possible
         * they shouldn't be able to choke now.
         */
        if (u.uhs != SATIATED)
            svc.context.victual.canchoke = 0;
        svc.context.victual.o_id = 0;
        otmp[0] = touchfood(otmp[0]);
        if (otmp[0]) {
            svc.context.victual.piece = otmp[0];
            svc.context.victual.o_id = otmp[0].o_id;
        } else {
            do_reset_eat();
        }
        /* if there's only one bite left, there sometimes won't be any
           "you finish eating" message when done; use different wording
           for resuming with one bite remaining instead of trying to
           determine whether or not "you finish" is going to be given */
        You(_("%s your meal."),
            !one_bite_left ? _("resume") : _("consume the last bite of"));
        if (otmp[0])
            start_eating(otmp[0], FALSE);
        return ECMD_TIME;
    }

    /* nothing in progress - so try to find something. */
    /* tins are a special case */
    /* tins must also check conduct separately in case they're discarded */
    if (otmp[0].otyp == TIN) {
        start_tin(otmp[0]);
        return ECMD_TIME;
    }

    /* KMH, conduct */
    if (!u.uconduct.food++) {
        livelog_printf(LL_CONDUCT, _("ate for the first time - %s"),
                       food_xname(otmp[0], FALSE));
        ll_conduct++;
    }

    already_partly_eaten = otmp[0].oeaten ? TRUE : FALSE;
    otmp[0] = touchfood(otmp[0]);
    if (otmp[0]) {
        svc.context.victual.piece = otmp[0];
        svc.context.victual.o_id = otmp[0].o_id;
        svc.context.victual.usedtime = 0;
    } else {
        do_reset_eat();
        return ECMD_TIME;
    }

    /* Now we need to calculate delay and nutritional info.
     * The base nutrition calculated here and in eatcorpse() accounts
     * for normal vs. rotten food.  The reqtime and nutrit values are
     * then adjusted in accordance with the amount of food left.
     */
    if (otmp[0].otyp == CORPSE || otmp[0].globby) {
        let tmp = eatcorpse(otmp[0]);

        if (tmp == 2) {
            /* used up */
            struct_assign(svc.context.victual, zero_victual); /* victual.piece=0, .o_id=0 */
            return ECMD_TIME;
        } else if (tmp)
            dont_start = TRUE;
        /* if not used up, eatcorpse sets up reqtime and may modify oeaten */
    } else {
        /* No checks for WAX, LEATHER, BONE, DRAGON_HIDE.  These are
         * all handled in the != FOOD_CLASS case, above.
         */
        switch (objects[otmp[0].otyp].oc_material) {
        case FLESH:
            if (!u.uconduct.unvegan++ && !ll_conduct) {
                livelog_printf(LL_CONDUCT,
                  _("consumed animal products for the first time, by eating %s"),
                               an(food_xname(otmp[0], FALSE)));
                ll_conduct++;
            }
            if (otmp[0].otyp != EGG) {
                if (!u.uconduct.unvegetarian && !ll_conduct)
                    livelog_printf(LL_CONDUCT,
                               _("tasted meat for the first time, by eating %s"),
                                   an(food_xname(otmp[0], FALSE)));

                violated_vegetarian();
            }
            break;
        default:
            if (otmp[0].otyp == PANCAKE || otmp[0].otyp == FORTUNE_COOKIE /*eggs*/
                || otmp[0].otyp == CREAM_PIE || otmp[0].otyp == CANDY_BAR /*milk*/
                || otmp[0].otyp == LUMP_OF_ROYAL_JELLY)
                if (!u.uconduct.unvegan++ && !ll_conduct)
                    livelog_printf(LL_CONDUCT,
                           _("consumed animal products (%s) for the first time"),
                                   food_xname(otmp[0], FALSE));
            break;
        }

        svc.context.victual.reqtime = objects[otmp[0].otyp].oc_delay;
        if (otmp[0].otyp != FORTUNE_COOKIE
            && (otmp[0].cursed || (!nonrotting_food(otmp[0].otyp)
                                 && (svm.moves - otmp[0].age)
                                        > (otmp[0].blessed ? 50 : 30)
                                 && (otmp[0].oeroded || !rn2(7))))) {
            if (rottenfood(otmp[0])) {
                otmp[0].oeroded = TRUE;
                dont_start = TRUE;
            }
            consume_oeaten(otmp[0], 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!fprefx(otmp[0])) {
                do_reset_eat();
                return ECMD_TIME;
            }
        } else {
            You(_("%s %s."),
                (svc.context.victual.reqtime == 1) ? _("eat") : _("begin eating"),
                doname(otmp[0]));
        }
    }

    /* re-calc the nutrition */
    basenutrit = int(obj_nutrition(otmp[0]));

    do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("before rounddiv: victual.reqtime == %d, oeaten == %d, basenutrit == %d"), svc.context.victual.reqtime, otmp[0].oeaten, basenutrit); iflags.last_msg = save_plnmsg; } } while (0)

;

    svc.context.victual.reqtime
        = (basenutrit == 0) ? 0
          : rounddiv(svc.context.victual.reqtime * (otmp[0].oeaten),
                     basenutrit);

    debugpline1(_("after rounddiv: victual.reqtime == %d"),
                svc.context.victual.reqtime, __FILE__);
    /*
     * calculate the modulo value (nutrit. units per round eating)
     * note: this isn't exact - you actually lose a little nutrition due
     *       to this method.
     * TODO: add in a "remainder" value to be given at the end of the meal.
     */
    if (svc.context.victual.reqtime == 0 || otmp[0].oeaten == 0)
        /* possible if most has been eaten before */
        svc.context.victual.nmod = 0;
    else if (int((otmp[0].oeaten)) >= svc.context.victual.reqtime)
        svc.context.victual.nmod = -(Math.trunc(int((otmp[0].oeaten))
                                    / svc.context.victual.reqtime));
    else
        svc.context.victual.nmod = int(unsigned(svc.context.victual.reqtime) % otmp[0].oeaten);
    svc.context.victual.canchoke = (+(u.uhs == SATIATED));

    if (!dont_start)
        start_eating(otmp[0], already_partly_eaten);
    else
        otmp[0].owt = unsigned(weight(otmp[0]));
    return ECMD_TIME;
} finally { stack_pop($frame); } }

/* getobj callback for object to be opened with a tin opener */
function /* int */
tinopen_ok(obj)
{
    if (obj && obj.otyp == TIN)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}


export function /* int */
use_tin_opener(obj)
{ const $frame = stack_frame(); try {
    let otmp;
    let res = ECMD_OK;

    if (!carrying(TIN)) {
        You(_("have no tin to open."));
        return ECMD_OK;
    }

    if (obj != uwep) {
        if (obj.cursed && obj.bknown) {
            let qbuf = stack_array(char, QBUFSZ);

            if (yn_function(safe_qbuf(qbuf, _("Really wield "), _("?"),
                              obj, doname, thesimpleoname, _("that")), ynqchars, ord("q"), TRUE) != ord('y'))
                return ECMD_OK;
        }
        if (!wield_tool(obj, _("use")))
            return ECMD_OK;
        res = ECMD_TIME;
    }

    otmp = getobj(_("open"), tinopen_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return (res|ECMD_CANCEL);

    start_tin(otmp);
    return ECMD_TIME;
} finally { stack_pop($frame); } }

/* Take a single bite from a piece of food, checking for choking and
 * modifying usedtime.  Returns 1 if they choked and survived, 0 otherwise.
 */
function /* int */
bite()
{
    /* hack to pacify static analyzer incorporated into gcc 12.2 */
    sa_victual(svc.context.victual);

    if (svc.context.victual.canchoke && u.uhunger >= 2000) {
        choke(svc.context.victual.piece);
        return 1;
    }
    if (svc.context.victual.doreset) {
        do_reset_eat();
        return 0;
    }
    gf.force_save_hs = TRUE;
    if (svc.context.victual.nmod < 0) {
        lesshungry(adj_victual_nutrition(/*-svc.context.victual.nmod*/));
        consume_oeaten(svc.context.victual.piece,
                       svc.context.victual.nmod); /* -= -nmod */
    } else if (svc.context.victual.nmod > 0
               && (svc.context.victual.usedtime % svc.context.victual.nmod)) {
        lesshungry(1);
        consume_oeaten(svc.context.victual.piece, -1); /* -= 1 */
    }
    gf.force_save_hs = FALSE;
    recalc_wt();
    return 0;
}

/* as time goes by - called by moveloop(every move) & domove(melee attack) */
export function /* void */
gethungry()
{
    let accessorytime;

    if (u.uinvulnerable || iflags.debug_hunger)
        return; /* you don't feel hungrier */

    /* being polymorphed into a creature which doesn't eat prevents
       this first uhunger decrement, but to stay in such form the hero
       will need to wear an Amulet of Unchanging so still burn a small
       amount of nutrition in the 'moves % 20' ring/amulet check below */
    if ((!Unaware() || !rn2(10)) /* slow metabolic rate while asleep */
        && (carnivorous(gy.youmonst.data)
            || herbivorous(gy.youmonst.data)
            || metallivorous(gy.youmonst.data))
        && !Slow_digestion())
        u.uhunger--; /* ordinary food consumption */

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
    accessorytime = rn2(20); /* rn2(20) replaces (int) (svm.moves % 20L) */
    if (accessorytime % 2) { /* odd */
        /* Regeneration uses up food, unless due to an artifact */
        if ((HRegeneration() & ~FROMFORM)
            || (ERegeneration() & ~(W_ARTI | W_WEP)))
            u.uhunger--;
        if (near_capacity() > SLT_ENCUMBER)
            u.uhunger--;
    } else { /* even */
        if (Hunger())
            u.uhunger--;
        /* Conflict uses up food too */
        if (HConflict() || (EConflict() & (~W_ARTI)))
            u.uhunger--;
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
            if (Slow_digestion()
                && (!uright || uright.otyp != RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp != RIN_SLOW_DIGESTION))
                u.uhunger--;
            break;
        case 4:
            if (uleft && uleft.otyp != MEAT_RING
                /* more hungry if +/- is nonzero or +/- doesn't apply or
                   +0 ring of protection is only source of protection;
                   need to check whether both rings are +0 protection or
                   they'd both slip by the "is there another source?" test,
                   but don't do that for both rings or they will both be
                   treated as supplying "MC" when only one matters;
                   note: amulet of guarding overrides both +0 rings and
                   is caught by the (EProtection & ~W_RINGx) == 0L tests */
                && (uleft.spe
                    || !objects[uleft.otyp].oc_charged
                    || (uleft.otyp == RIN_PROTECTION
                        && ((EProtection() & ~W_RINGL) == 0
                            || ((and64(EProtection(), ~W_RINGL)) == W_RINGR
                                && uright && uright.otyp == RIN_PROTECTION
                                && !uright.spe)))))
                u.uhunger--;
            break;
        case 8:
            if (uamul && uamul.otyp != FAKE_AMULET_OF_YENDOR)
                u.uhunger--;
            break;
        case 12:
            if (uright && uright.otyp != MEAT_RING
                && (uright.spe
                    || !objects[uright.otyp].oc_charged
                    || (uright.otyp == RIN_PROTECTION
                        && (EProtection() & ~W_RINGR) == 0)))
                u.uhunger--;
            break;
        case 16:
            if (u.uhave.amulet)
                u.uhunger--;
            break;
        default:
            break;
        }
    }
    newuhs(TRUE);
}

/* called after vomiting and after performing feats of magic */
export function /* void */
morehungry(num)
{
    u.uhunger -= num;
    newuhs(TRUE);
}

/* called after eating (and after drinking fruit juice) */
export function /* void */
lesshungry(num)
{
    /* See comments in newuhs() for discussion on force_save_hs */
    let iseating = (((go.occupation == eatfood) || gf.force_save_hs) ? 1 : 0);

    debugpline1(_("lesshungry(%d)"), num, __FILE__);
    u.uhunger += num;
    if (u.uhunger >= 2000) {
        if (!iseating || svc.context.victual.canchoke) {
            if (iseating) {
                choke(svc.context.victual.piece);
                reset_eat();
            } else {
                choke((go.occupation == opentin) ? svc.context.tin.tin : null);
                /* no reset_eat() */
            }
        }
    } else {
        /* Have lesshungry() report when you're nearly full so all eating
         * warns when you're about to choke.
         */
        if (u.uhunger >= 1500 && !Hunger()
            && (!svc.context.victual.eating
                || (svc.context.victual.eating
                    && !svc.context.victual.fullwarn))) {
            pline(_("You're having a hard time getting all of it down."));
            gn.nomovemsg = _("You're finally finished.");
            if (!svc.context.victual.eating) {
                gm.multi = -2;
            } else {
                svc.context.victual.fullwarn = 1;
                if (svc.context.victual.canchoke
                    && (svc.context.victual.reqtime
                        - svc.context.victual.usedtime) > 1) {
                    /* food with one bite left will not survive a stop */
                    if (!paranoid_query(ParanoidEating(), _("Continue eating?"))) {
                        reset_eat();
                        gn.nomovemsg = 0;
                    }
                }
            }
        }
    }
    newuhs(FALSE);
}

function /* int */
unfaint()
{
    void Hear_again();
    if (u.uhs > FAINTING)
        u.uhs = FAINTING;
    stop_occupation();
    disp.botl = TRUE;
    return 0;
}

export function /* boolean */
is_fainted()
{
    return (+(u.uhs == FAINTED));
}

/* call when a faint must be prematurely terminated */
export function /* void */
reset_faint()
{
    if (ga.afternmv == unfaint)
        unmul(_("You revive."));
}

/* compute and comment on your (new?) hunger status */
export function /* void */
newuhs(incr)
{
    let newhs;
    let save_hs = static_var("newuhs.save_hs", unsigned);
    let saved_hs = static_var("newuhs.saved_hs", schar, FALSE);
    let h = u.uhunger;

    newhs = (h > 1000)
                ? SATIATED
                : (h > 150) ? NOT_HUNGRY
                            : (h > 50) ? HUNGRY : (h > 0) ? WEAK : FAINTING;

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
    if (go.occupation == eatfood || gf.force_save_hs) {
        if (!saved_hs[0]) {
            save_hs[0] = u.uhs;
            saved_hs[0] = TRUE;
        }
        u.uhs = newhs;
        return;
    } else {
        if (saved_hs[0]) {
            u.uhs = save_hs[0];
            saved_hs[0] = FALSE;
        }
    }

    if (newhs == FAINTING) {
        /* u,uhunger is likely to be negative at this point */
        let uhunger_div_by_10 = sgn(u.uhunger) * (Math.trunc((abs(u.uhunger) + 5) / 10));

        if (is_fainted())
            newhs = FAINTED;
        if (u.uhs <= WEAK || rn2(20 - uhunger_div_by_10) >= 19) {
            if (!is_fainted() && gm.multi >= 0 /* %% */) {
                let duration = 10 - uhunger_div_by_10;

                /* stop what you're doing, then faint */
                stop_occupation();
                You(_("faint from lack of food."));
                incr_itimeout(ref_of(u.uprops[DEAF], "intrinsic"), duration);
                disp.botl = TRUE;
                nomul(-duration);
                gm.multi_reason = _("fainted from lack of food");
                gn.nomovemsg = _("You regain consciousness.");
                ga.afternmv = unfaint;
                newhs = FAINTED;
                if (!Levitation())
                    selftouch(_("Falling, you"));
            }

        /* this used to be -(200 + 20 * Con) but that was when being asleep
           suppressed per-turn uhunger decrement but being fainted didn't;
           now uhunger becomes more negative at a slower rate */
        } else if (u.uhunger < -(100 + 10 * ACURR(A_CON))) {
            u.uhs = STARVED;
            disp.botl = TRUE;
            bot();
            You(_("die from starvation."));
            svk.killer.format = KILLED_BY;
            void strcpy(svk.killer.name, _("starvation"));
            done(STARVING);
            /* if we return, we lifesaved, and that calls newuhs */
            return;
        }
    }

    if (newhs != u.uhs) {
        if (newhs >= WEAK && u.uhs < WEAK) {
            /* this used to be losestr(1) which had the potential to
               be fatal (still handled below) by reducing HP if it
               tried to take base strength below minimum of 3 */
            (chars[u.atemp.a + A_STR]) = -1; /* temporary loss overrides Fixed_abil */
            /* defer context.botl status update until after hunger message */
        } else if (newhs < WEAK && u.uhs >= WEAK) {
            /* this used to be losestr(-1) which could be abused by
               becoming weak while wearing ring of sustain ability,
               removing ring, eating to 'restore' strength which boosted
               strength by a point each time the cycle was performed;
               substituting "while polymorphed" for sustain ability and
               "rehumanize" for ring removal might have done that too */
            (chars[u.atemp.a + A_STR]) = 0; /* repair of loss also overrides Fixed_abil */
            /* defer context.botl status update until after hunger message */
        }

        switch (newhs) {
        case HUNGRY:
            if (Hallucination()) {
                You(!incr ? _("now have a lesser case of the munchies.")
                    : _("are getting the munchies."));
            } else
                You(_("%s."), !incr ? _("only feel hungry now")
                           : (u.uhunger < 145) ? _("feel hungry")
                             : _("are beginning to feel hungry"));
            if (incr && go.occupation
                && (go.occupation != eatfood && go.occupation != opentin))
                stop_occupation();
            end_running(TRUE);
            break;
        case WEAK:
            if (Hallucination())
                pline(!incr ? _("You still have the munchies.")
              : _("The munchies are interfering with your motor capabilities."));
            else if (incr && (Role_if(PM_WIZARD) || Race_if(PM_ELF)
                              || Role_if(PM_VALKYRIE)))
                pline(_("%s needs food, badly!"),
                      (Role_if(PM_WIZARD) || Role_if(PM_VALKYRIE))
                          ? gu.urole.name.m
                          : _("Elf"));
            else
                You(_("%s weak."), !incr ? _("are still")
                                : (u.uhunger < 45) ? _("feel")
                                  : _("are beginning to feel"));
            if (incr && go.occupation
                && (go.occupation != eatfood && go.occupation != opentin))
                stop_occupation();
            end_running(TRUE);
            break;
        }
        u.uhs = newhs;
        disp.botl = TRUE;
        bot();
        if ((Upolyd() ? u.mh : u.uhp) < 1) {
            You(_("die from hunger and exhaustion."));
            svk.killer.format = KILLED_BY;
            void strcpy(svk.killer.name, _("exhaustion"));
            done(STARVING);
            return;
        }
    }
}

/* getobj callback for object to eat - effectively just wraps is_edible() */
function /* int */
eat_ok(obj)
{
    /* 'getobj_else' will be non-zero if floor food is present and
       player declined to eat that; used to insert "else" into
       "you don't have anything [else] to eat" if not carrying any food */
    if (!obj)
        return getobj_else[0] ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (is_edible(obj))
        return GETOBJ_SUGGEST;

    /* make sure to exclude, not downplay, gold (if not is_edible) in order to
     * produce the "You cannot eat gold" message in getobj */
    if (obj.oclass == COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_EXCLUDE_SELECTABLE;
}

/* getobj callback for object to be offered (corpses and things that look like
 * the Amulet only */
function /* int */
offer_ok(obj)
{
    if (!obj)
        return getobj_else[0] ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (obj.oclass != FOOD_CLASS && obj.oclass != AMULET_CLASS)
        return GETOBJ_EXCLUDE;

    if (obj.otyp != CORPSE && obj.otyp != AMULET_OF_YENDOR
        && obj.otyp != FAKE_AMULET_OF_YENDOR)
        return GETOBJ_EXCLUDE_SELECTABLE;

    /* suppress corpses on astral, amulets elsewhere
     * (!astral && amulet) || (astral && !amulet) */
    if (Is_astralevel(u.uz) ^ (+(obj.oclass == AMULET_CLASS)))
        return GETOBJ_DOWNPLAY;

    return GETOBJ_SUGGEST;
}

/* getobj callback for object to be tinned */
function /* int */
tin_ok(obj)
{
    if (!obj)
        return getobj_else[0] ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (obj.oclass != FOOD_CLASS)
        return GETOBJ_EXCLUDE;

    if (obj.otyp != CORPSE || !tinnable(obj))
        return GETOBJ_EXCLUDE_SELECTABLE;

    return GETOBJ_SUGGEST;
}

/* Returns an object representing food.
 * Object may be either on floor or in inventory.
 */
export function /* struct obj * */
floorfood(
    verb,
    corpsecheck) /* 0, no check, 1, corpses, 2, tinnable corpses */
{ const $frame = stack_frame(); try {
    var otmp;
    var qbuf = stack_array(char, QBUFSZ);
    var c;
    var uptr = gy.youmonst.data;
    var feeding = +!strcmp(verb, _("eat")),
            offering = +!strcmp(verb, _("sacrifice")); /* corpsecheck==1 */

    getobj_else[0] = 0; /* haven't asked about floor food; is used to vary
                      * "you don't have anything [else] to eat" when
                      * floor food has been declined and inventory lacks
                      * any suitable items */
    /* if we can't touch floor objects then use invent food only;
       same when 'm' prefix is used--for #eat, it means "skip floor food" */
    skipfloor: { if (iflags.menu_requested
        || !can_reach_floor(TRUE) || (feeding && u.usteed)
        || (is_pool_or_lava(u.ux, u.uy)
            && (Wwalking() || is_clinger(uptr) || (Flying() && !Breathless()))))
        break skipfloor;;

    if (feeding && metallivorous(uptr)) {
        var gold;
        var ttmp = t_at(u.ux, u.uy);

        if (ttmp && ttmp.tseen && ttmp.ttyp == BEAR_TRAP) {
            var u_in_beartrap = (((u.utrap && u.utraptype == TT_BEARTRAP) ? 1 : 0));

            /* If not already stuck in the trap, perhaps there should
               be a chance to becoming trapped?  Probably not, because
               then the trap would just get eaten on the _next_ turn... */
            void sprintf(qbuf, _("There is a bear trap here (%s); eat it?"), u_in_beartrap ? _("holding you") : _("armed"))
;
            if ((c = yn_function(qbuf, ynqchars, ord('n'), TRUE)) == ord('y')) {
                var beartrap;

                deltrap(ttmp);
                if (u_in_beartrap)
                    reset_utrap(TRUE);
                beartrap = mksobj(BEARTRAP, TRUE, FALSE);
                void sprintf(qbuf, _("You only manage to %s the bear trap."), u_in_beartrap ? _("free yourself from") : _("disarm"))
;
                if (check_capacity(qbuf) && beartrap) {
                    obj_extract_self(beartrap);
                    dropy(beartrap);           /* put it on the floor */
                    return null;
                }
                return beartrap;
            } else if (c == ord('q')) {
                return null;
            }
            ++getobj_else[0];
        }
        if (levl()[u.ux][u.uy].typ == IRONBARS) {
            /* already verified that hero is metallivorous above */
            var nodig = +((levl()[u.ux][u.uy].flags & W_NONDIGGABLE) != 0);

            c = ord('n');
            void strcpy(qbuf, _("There are iron bars here"));
            if (nodig || u.uhunger > 1500) {
                pline(_("%s but you %s eat them."), qbuf,
                      nodig ? _("cannot") : _("are too full to"));
            } else {
                void strcat(qbuf, (!svc.context.digging.chew
                              || !u_at(svc.context.digging.pos.x,
                                       svc.context.digging.pos.y)
                              || !on_level(svc.context.digging.level, u.uz))
                              ? _("; eat them?")
                              : _("; resume eating them?"));
                c = yn_function(qbuf, ynqchars, ord('n'), TRUE);
            }
            if (c == ord('y'))
                return hands_obj;
            else if (c == ord('q'))
                return null;
            ++getobj_else[0];
        }
        if (uptr != mons[PM_RUST_MONSTER]
            && (gold = g_at(u.ux, u.uy)) != null) {
            if (gold.quan == 1)
                void sprintf(qbuf, _("There is 1 gold piece here; eat it?"));
            else
                void sprintf(qbuf, _("There are %lld gold pieces here; eat them?"), gold.quan)
;
            if ((c = yn_function(qbuf, ynqchars, ord('n'), TRUE)) == ord('y')) {
                return gold;
            } else if (c == ord('q')) {
                return null;
            }
            ++getobj_else[0];
        }
    }

    /* Is there some food (probably a heavy corpse) here on the ground? */
    for (otmp = svl.level.objects[u.ux][u.uy]; otmp; otmp = otmp.v.v_nexthere) {
        if (corpsecheck
                ? (otmp.otyp == CORPSE
                   && (corpsecheck == 1 || tinnable(otmp)))
                : feeding ? (otmp.oclass != COIN_CLASS && is_edible(otmp))
                          : otmp.oclass == FOOD_CLASS) {
            var qsfx = stack_array(char, QBUFSZ);
            var one = (+(otmp.quan == 1));

            /* if blind and without gloves, attempting to eat (or tin or
               offer) a cockatrice corpse is fatal before asking whether
               or not to use it; otherwise, 'm<dir>' followed by 'e' could
               be used to locate cockatrice corpses without touching them */
            if (otmp.otyp == CORPSE && will_feel_cockatrice(otmp, FALSE)) {
                feel_cockatrice(otmp, FALSE);
                /* if life-saved (or poly'd into stone golem), terminate
                   attempt to eat off floor */
                return null;
            }
            /* "There is <an object> here; <verb> it?" or
               "There are <N objects> here; <verb> one?" */
            void sprintf(qbuf, _("There %s "), otense(otmp, _("are")));
            void sprintf(qsfx, _(" here; %s %s?"), verb, one ? _("it") : _("one"));
            void safe_qbuf(qbuf, qbuf, qsfx, otmp, doname, ansimpleoname,
                             one ? something() : _("things"));
            if ((c = yn_function(qbuf, ynqchars, ord('n'), TRUE)) == ord('y'))
                return  otmp;
            else if (c == ord('q'))
                return null;
            ++getobj_else[0];
        }
    }

 }
    /* We cannot use GETOBJ_PROMPT since we don't want a prompt in the case
       where nothing edible is being carried. */
    if (feeding) {
        otmp = getobj(_("eat"), eat_ok, GETOBJ_NOFLAGS);
    } else if (offering) {
        otmp = getobj(_("sacrifice"), offer_ok, GETOBJ_NOFLAGS);
    } else if (corpsecheck == 2) {
        otmp = getobj(verb, tin_ok, GETOBJ_NOFLAGS);
    } else {
        impossible(_("floorfood: unknown request (%s)"), verb);
        otmp = null;
    }
    if (otmp && corpsecheck && !(offering && otmp.oclass == AMULET_CLASS)) {
        if (otmp.otyp != CORPSE || (corpsecheck == 2 && !tinnable(otmp))) {
            You_cant(_("%s that!"), verb);
            otmp = null;
        }
    }
    /* resetting 'getobj_else' here isn't essential; it will be cleared the
       next time it needs to be used */
    getobj_else[0] = 0;
    return otmp;
} finally { stack_pop($frame); } }

/* Side effects of vomiting */
/* added nomul (MRS) - it makes sense, you're too busy being sick! */
export function /* void */
vomit() /* A good idea from David Neves */
{
    let spewed = FALSE;

    if (cantvomit(gy.youmonst.data)) {
        /* doesn't cure food poisoning; message assumes that we aren't
           dealing with some esoteric body_part() */
        Your(_("jaw gapes convulsively."));
    } else {
        if (Sick() && (u.usick_type & SICK_VOMITABLE) != 0)
            make_sick(0, 0, TRUE, SICK_VOMITABLE);
        /* if not enough in stomach to actually vomit then dry heave;
           vomiting_dialog() gives a vomit message when its countdown
           reaches 0, but only if u.uhs < FAINTING (and !cantvomit()) */
        if (u.uhs >= FAINTING)
            Your(_("%s heaves convulsively!"), body_part(STOMACH));
        else
            spewed = TRUE;
    }

    /* nomul()/You_can_move_again used to be unconditional, which was
       viable while eating but not for Vomiting countdown where hero might
       be immobilized for some other reason at the time vomit() is called */
    if (gm.multi >= -2) {
        nomul(-2);
        gm.multi_reason = _("vomiting");
        gn.nomovemsg = You_can_move_again();
    }

    if (spewed) {
        let mattk = attacktype_fordmg(gy.youmonst.data, AT_BREA, AD_ACID);


        /* currently, only yellow dragons can breathe acid */
        if (mattk) {
            You(_("breathe acid on yourself...")); /* [why?] */
            ubreatheu(mattk);
        }
        /* vomiting on an altar is, all things considered, rather impolite */
        if (IS_ALTAR(levl()[u.ux][u.uy].typ))
            altar_wrath(u.ux, u.uy);
        /* if poly'd into acidic form, stomach acid is stronger than normal */
        if (acidic(gy.youmonst.data)) {
            /* TODO: if there's a web here, destroy that too (before ice) */
            if (is_ice(u.ux, u.uy))
                melt_ice(u.ux, u.uy,
                         _("Your stomach acid melts straight through the ice!"));
        }
    }
}

export function /* int */
eaten_stat(base, obj)
{
    let uneaten_amt, full_amount;

    /* get full_amount first; obj_nutrition() might modify obj->oeaten */
    full_amount = obj_nutrition(obj);
    uneaten_amt = obj.oeaten;
    if (uneaten_amt > full_amount) {
        impossible(
          _("partly eaten food (%lld) more nutritious than untouched food (%lld)"),
                   uneaten_amt, full_amount);
        uneaten_amt = full_amount;
    }

    base = int((full_amount ? Math.trunc(base * uneaten_amt / full_amount) : 0));
    return (base < 1) ? 1 : base;
}

/* reduce obj's oeaten field, making sure it never hits or passes 0 */
export function /* void */
consume_oeaten(obj, amt)
{ const $frame = stack_frame(); try {
    if (!obj_nutrition(obj)) {
        let itembuf = stack_array(char, 40);
        let otyp = obj.otyp;

        if (otyp == CORPSE || otyp == EGG || otyp == TIN) {
            void strcpy(itembuf, (otyp == CORPSE) ? _("corpse")
                            : (otyp == EGG) ? _("egg")
                              : (otyp == TIN) ? _("tin") : _("other?"));
            void sprintf(eos(itembuf), _(" [%d]"), obj.corpsenm);
        } else {
            void sprintf(itembuf, _("%d"), otyp);
        }
        impossible(
            _("oeaten: attempting to set 0 nutrition food (%s) partially eaten"),
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

    if (amt > 0) {
        /* bit shift to divide the remaining amount of food */
        obj.oeaten = obj.oeaten >>> amt;
    } else {
        /* simple decrement; value is negative so we actually add it */
        if (int(obj.oeaten) > -amt)
            obj.oeaten += unsigned(amt);
        else
            obj.oeaten = 0;
    }

    /* mustn't let partly-eaten drop all the way to 0 or the item would
       become restored to untouched; set to no bites left */
    if (obj.oeaten == 0) {
        if (obj == svc.context.victual.piece) /* always true unless wishing */
            svc.context.victual.reqtime = svc.context.victual.usedtime;
        obj.oeaten = 1; /* smallest possible positive value */
    }
} finally { stack_pop($frame); } }

/* called when eatfood occupation has been interrupted,
   or in the case of theft, is about to be interrupted */
export function /* boolean */
maybe_finished_meal(stopping)
{
    /* in case consume_oeaten() has decided that the food is all gone */
    if (go.occupation == eatfood
        && svc.context.victual.usedtime >= svc.context.victual.reqtime) {
        if (stopping)
            go.occupation = null; /* for do_reset_eat */
        /* eatfood() calls done_eating() to use up svc.context.victual.piece */
        void eatfood();
        return TRUE;
    }
    return FALSE;
}

/* called by revive(); sort of the opposite of maybe_finished_meal() */
export function /* void */
cant_finish_meal(corpse)
{
    /*
     * When a corpse gets resurrected, the makemon() for that might
     * call stop_occupation().  If that happens, prevent it from using
     * up the corpse via maybe_finished_meal() when there's not enough
     * left for another bite.  revive() needs continued access to the
     * corpse and will delete it when done.
     */
    if (go.occupation == eatfood && svc.context.victual.piece == corpse) {
        /* normally performed by done_eating() */
        struct_assign(svc.context.victual, zero_victual); /* victual.piece = 0, .o_id = 0 */

        if (!corpse.oeaten)
            corpse.oeaten = 1; /* [see consume_oeaten()] */
        go.occupation = donull; /* any non-Null other than eatfood() */
        stop_occupation();
        newuhs(FALSE);
    }
}

/* Tin of <something> to the rescue?  Decide whether current occupation
   is an attempt to eat a tin of something capable of saving hero's life.
   We don't care about consumption of non-tinned food here because special
   effects there take place on first bite rather than at end of occupation.
   [Popeye the Sailor gets out of trouble by eating tins of spinach. :-] */
export function /* boolean */
Popeye(threat)
{
    let otin;
    let mndx;

    if (go.occupation != opentin)
        return FALSE;
    otin = svc.context.tin.tin;
    /* make sure hero still has access to tin */
    if (!carried(otin)
        && (!obj_here(otin, u.ux, u.uy) || !can_reach_floor(TRUE)))
        return FALSE;
    /* unknown tin is assumed to be helpful */
    if (!otin.known)
        return TRUE;
    /* known tin is helpful if it will stop life-threatening problem */
    mndx = otin.corpsenm;
    switch (threat) {
    /* note: not used; hunger code bypasses stop_occupation() when eating */
    case HUNGER:
        return (+(mndx != NON_PM || otin.spe == 1));
    /* flesh from lizards and acidic critters stops petrification */
    case STONED:
        return (+(ismnum(mndx)
                          && (mndx == PM_LIZARD || acidic(mons[mndx]))));
    /* polymorph into a fiery monster */
    case SLIMED:
        return polyfood(otin);
    /* no tins can cure these (yet?) */
    case SICK:
    case VOMITING:
        break;
    default:
        break;
    }
    return FALSE;
}

/* the hero has swallowed a monster whole as a purple worm or similar, and has
   finished digesting its corpse (called via ga.afternmv) */
export function /* int */
Finish_digestion()
{
    if (gc.corpsenm_digested != NON_PM) {
        cpostfx(gc.corpsenm_digested);
        gc.corpsenm_digested = NON_PM;
    }
    return 0;
}

/*eat.c*/
import { A_LAWFUL } from "./align.h.js";
import { ART_ORB_OF_DETECTION } from "./artilist.h.js";
import { A_CHA } from "./attrib.h.js";
import { A_CON } from "./attrib.h.js";
import { A_DEX } from "./attrib.h.js";
import { A_INT } from "./attrib.h.js";
import { A_STR } from "./attrib.h.js";
import { A_WIS } from "./attrib.h.js";
import { ABASE } from "./attrib.h.macros.js";
import { ACURR } from "./attrib.h.macros.js";
import { ACURRSTR } from "./attrib.h.macros.js";
import { AMAX } from "./attrib.h.macros.js";
import { ATEMP } from "./attrib.h.macros.js";
import { ATTRMAX } from "./attrib.h.macros.js";
import { ATTRMIN } from "./attrib.h.macros.js";
import { struct_victual_info } from "./context.h.js";
import { NH_GREEN } from "./decl.h.macros.js";
import { You_can_move_again } from "./decl.h.macros.js";
import { something } from "./decl.h.macros.js";
import { vision_clears } from "./decl.h.macros.js";
import { AMULET_CLASS } from "./defsym.h.js";
import { BALL_CLASS } from "./defsym.h.js";
import { CHAIN_CLASS } from "./defsym.h.js";
import { COIN_CLASS } from "./defsym.h.js";
import { FOOD_CLASS } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { POTION_CLASS } from "./defsym.h.js";
import { RING_CLASS } from "./defsym.h.js";
import { SCROLL_CLASS } from "./defsym.h.js";
import { S_FUNGUS } from "./defsym.h.js";
import { S_MIMIC } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { EXPL_FIERY } from "./display.h.js";
import { canspotmon } from "./display.h.macros.js";
import { Is_airlevel } from "./dungeon.h.macros.js";
import { Is_astralevel } from "./dungeon.h.macros.js";
import { Is_waterlevel } from "./dungeon.h.macros.js";
import { ParanoidEating } from "./flag.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { LL_CONDUCT } from "./global.h.js";
import { QBUFSZ } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { Strlen } from "./global.h.macros.js";
import { BY_COOKIE } from "./hack.h.js";
import { CHOKING } from "./hack.h.js";
import { COST_BITE } from "./hack.h.js";
import { COST_DSTROY } from "./hack.h.js";
import { COST_OPEN } from "./hack.h.js";
import { CXN_NORMAL } from "./hack.h.js";
import { CXN_PFX_THE } from "./hack.h.js";
import { CXN_SINGULAR } from "./hack.h.js";
import { DIED } from "./hack.h.js";
import { DISMOUNT_FELL } from "./hack.h.js";
import { ECMD_CANCEL } from "./hack.h.js";
import { ECMD_OK } from "./hack.h.js";
import { ECMD_TIME } from "./hack.h.js";
import { FAINTED } from "./hack.h.js";
import { FAINTING } from "./hack.h.js";
import { GETOBJ_DOWNPLAY } from "./hack.h.js";
import { GETOBJ_EXCLUDE } from "./hack.h.js";
import { GETOBJ_EXCLUDE_NONINVENT } from "./hack.h.js";
import { GETOBJ_EXCLUDE_SELECTABLE } from "./hack.h.js";
import { GETOBJ_NOFLAGS } from "./hack.h.js";
import { GETOBJ_SUGGEST } from "./hack.h.js";
import { HEALTHY_TIN } from "./hack.h.js";
import { HOMEMADE_TIN } from "./hack.h.js";
import { HUNGRY } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { KILLED_BY_AN } from "./hack.h.js";
import { LIGHT_HEADED } from "./hack.h.js";
import { NOSE } from "./hack.h.js";
import { NOT_HUNGRY } from "./hack.h.js";
import { NO_KILLER_PREFIX } from "./hack.h.js";
import { NO_PART } from "./hack.h.js";
import { POISONING } from "./hack.h.js";
import { POLY_NOFLAGS } from "./hack.h.js";
import { ROTTEN_TIN } from "./hack.h.js";
import { SATIATED } from "./hack.h.js";
import { SELL_DONTSELL } from "./hack.h.js";
import { SELL_NORMAL } from "./hack.h.js";
import { SLT_ENCUMBER } from "./hack.h.js";
import { SPINACH_TIN } from "./hack.h.js";
import { STARVED } from "./hack.h.js";
import { STARVING } from "./hack.h.js";
import { STOMACH } from "./hack.h.js";
import { STONING } from "./hack.h.js";
import { WEAK } from "./hack.h.js";
import { invlet_basic } from "./hack.h.js";
import { Your1 } from "./hack.h.macros.js";
import { distu } from "./hack.h.macros.js";
import { makeknown } from "./hack.h.macros.js";
import { max } from "./hack.h.macros.js";
import { pline1 } from "./hack.h.macros.js";
import { rn1 } from "./hack.h.macros.js";
import { y_n } from "./hack.h.macros.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { debugpline0 } from "./lint.h.macros.js";
import { debugpline1 } from "./lint.h.macros.js";
import { debugpline2 } from "./lint.h.macros.js";
import { showdebug } from "./lint.h.macros.js";
import { GD_EATGOLD } from "./mextra.h.js";
import { EDOG } from "./mextra.h.macros.js";
import { AD_ACID } from "./monattk.h.js";
import { AD_BLND } from "./monattk.h.js";
import { AD_HALU } from "./monattk.h.js";
import { AD_STUN } from "./monattk.h.js";
import { AT_BREA } from "./monattk.h.js";
import { AT_ENGL } from "./monattk.h.js";
import { AT_MAGC } from "./monattk.h.js";
import { M_ATTK_AGR_DIED } from "./monattk.h.js";
import { M_ATTK_HIT } from "./monattk.h.js";
import { M_ATTK_MISS } from "./monattk.h.js";
import { acidic } from "./mondata.h.macros.js";
import { can_teleport } from "./mondata.h.macros.js";
import { cantwield } from "./mondata.h.macros.js";
import { carnivorous } from "./mondata.h.macros.js";
import { control_teleport } from "./mondata.h.macros.js";
import { flesh_petrifies } from "./mondata.h.macros.js";
import { herbivorous } from "./mondata.h.macros.js";
import { humanoid } from "./mondata.h.macros.js";
import { is_clinger } from "./mondata.h.macros.js";
import { is_dwarf } from "./mondata.h.macros.js";
import { is_elf } from "./mondata.h.macros.js";
import { is_giant } from "./mondata.h.macros.js";
import { is_orc } from "./mondata.h.macros.js";
import { is_rider } from "./mondata.h.macros.js";
import { is_undead } from "./mondata.h.macros.js";
import { is_were } from "./mondata.h.macros.js";
import { metallivorous } from "./mondata.h.macros.js";
import { mindless } from "./mondata.h.macros.js";
import { monsndx } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { perceives } from "./mondata.h.macros.js";
import { poisonous } from "./mondata.h.macros.js";
import { slimeproof } from "./mondata.h.macros.js";
import { telepathic } from "./mondata.h.macros.js";
import { type_is_pname } from "./mondata.h.macros.js";
import { vegan } from "./mondata.h.macros.js";
import { vegetarian } from "./mondata.h.macros.js";
import { your_race } from "./mondata.h.macros.js";
import { MR_ACID } from "./monflag.h.js";
import { MR_COLD } from "./monflag.h.js";
import { MR_DISINT } from "./monflag.h.js";
import { MR_ELEC } from "./monflag.h.js";
import { MR_FIRE } from "./monflag.h.js";
import { MR_POISON } from "./monflag.h.js";
import { MR_SLEEP } from "./monflag.h.js";
import { MR_STONE } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { M_AP_NOTHING } from "./monst.h.js";
import { M_AP_OBJECT } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { U_AP_TYPE } from "./monst.h.macros.js";
import { is_obj_mappear } from "./monst.h.macros.js";
import { ismnum } from "./monst.h.macros.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { PM_ACID_BLOB } from "./monsters.h.js";
import { PM_BAT } from "./monsters.h.js";
import { PM_CAVE_DWELLER } from "./monsters.h.js";
import { PM_CHAMELEON } from "./monsters.h.js";
import { PM_CHICKATRICE } from "./monsters.h.js";
import { PM_COCKATRICE } from "./monsters.h.js";
import { PM_DEATH } from "./monsters.h.js";
import { PM_DISENCHANTER } from "./monsters.h.js";
import { PM_DISPLACER_BEAST } from "./monsters.h.js";
import { PM_DOG } from "./monsters.h.js";
import { PM_DOPPELGANGER } from "./monsters.h.js";
import { PM_DWARF } from "./monsters.h.js";
import { PM_ELF } from "./monsters.h.js";
import { PM_FAMINE } from "./monsters.h.js";
import { PM_FIRE_ELEMENTAL } from "./monsters.h.js";
import { PM_FLOATING_EYE } from "./monsters.h.js";
import { PM_GELATINOUS_CUBE } from "./monsters.h.js";
import { PM_GENETIC_ENGINEER } from "./monsters.h.js";
import { PM_GHOUL } from "./monsters.h.js";
import { PM_GIANT_BAT } from "./monsters.h.js";
import { PM_GIANT_MIMIC } from "./monsters.h.js";
import { PM_GREEN_SLIME } from "./monsters.h.js";
import { PM_HOUSECAT } from "./monsters.h.js";
import { PM_HUMAN_WEREJACKAL } from "./monsters.h.js";
import { PM_HUMAN_WERERAT } from "./monsters.h.js";
import { PM_HUMAN_WEREWOLF } from "./monsters.h.js";
import { PM_KILLER_BEE } from "./monsters.h.js";
import { PM_KITTEN } from "./monsters.h.js";
import { PM_KNIGHT } from "./monsters.h.js";
import { PM_LARGE_CAT } from "./monsters.h.js";
import { PM_LARGE_DOG } from "./monsters.h.js";
import { PM_LARGE_MIMIC } from "./monsters.h.js";
import { PM_LICHEN } from "./monsters.h.js";
import { PM_LITTLE_DOG } from "./monsters.h.js";
import { PM_LIZARD } from "./monsters.h.js";
import { PM_MASTER_MIND_FLAYER } from "./monsters.h.js";
import { PM_MIND_FLAYER } from "./monsters.h.js";
import { PM_MONK } from "./monsters.h.js";
import { PM_NEWT } from "./monsters.h.js";
import { PM_NURSE } from "./monsters.h.js";
import { PM_ORC } from "./monsters.h.js";
import { PM_PESTILENCE } from "./monsters.h.js";
import { PM_PYROLISK } from "./monsters.h.js";
import { PM_QUANTUM_MECHANIC } from "./monsters.h.js";
import { PM_QUEEN_BEE } from "./monsters.h.js";
import { PM_RAVEN } from "./monsters.h.js";
import { PM_RUST_MONSTER } from "./monsters.h.js";
import { PM_SANDESTIN } from "./monsters.h.js";
import { PM_SCORPION } from "./monsters.h.js";
import { PM_SMALL_MIMIC } from "./monsters.h.js";
import { PM_STALKER } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { PM_TIGER } from "./monsters.h.js";
import { PM_VALKYRIE } from "./monsters.h.js";
import { PM_VIOLET_FUNGUS } from "./monsters.h.js";
import { PM_WEREJACKAL } from "./monsters.h.js";
import { PM_WERERAT } from "./monsters.h.js";
import { PM_WEREWOLF } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PM_WRAITH } from "./monsters.h.js";
import { PM_YELLOW_LIGHT } from "./monsters.h.js";
import { OBJ_DELETED } from "./obj.h.js";
import { struct_obj } from "./obj.h.js";
import { Has_contents } from "./obj.h.macros.js";
import { carried } from "./obj.h.macros.js";
import { polyfood } from "./obj.h.macros.js";
import { stale_egg } from "./obj.h.macros.js";
import { BONE } from "./objclass.h.js";
import { DRAGON_HIDE } from "./objclass.h.js";
import { FLESH } from "./objclass.h.js";
import { GLASS } from "./objclass.h.js";
import { LEATHER } from "./objclass.h.js";
import { PAPER } from "./objclass.h.js";
import { WAX } from "./objclass.h.js";
import { is_metallic } from "./objclass.h.macros.js";
import { is_organic } from "./objclass.h.macros.js";
import { is_rustprone } from "./objclass.h.macros.js";
import { AMULET_OF_CHANGE } from "./objects.h.js";
import { AMULET_OF_FLYING } from "./objects.h.js";
import { AMULET_OF_GUARDING } from "./objects.h.js";
import { AMULET_OF_LIFE_SAVING } from "./objects.h.js";
import { AMULET_OF_REFLECTION } from "./objects.h.js";
import { AMULET_OF_RESTFUL_SLEEP } from "./objects.h.js";
import { AMULET_OF_STRANGULATION } from "./objects.h.js";
import { AMULET_OF_UNCHANGING } from "./objects.h.js";
import { AMULET_OF_YENDOR } from "./objects.h.js";
import { APPLE } from "./objects.h.js";
import { ATHAME } from "./objects.h.js";
import { AXE } from "./objects.h.js";
import { BEARTRAP } from "./objects.h.js";
import { CANDY_BAR } from "./objects.h.js";
import { CARROT } from "./objects.h.js";
import { CLOVE_OF_GARLIC } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { CRAM_RATION } from "./objects.h.js";
import { CREAM_PIE } from "./objects.h.js";
import { CRYSKNIFE } from "./objects.h.js";
import { C_RATION } from "./objects.h.js";
import { DAGGER } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_DAGGER } from "./objects.h.js";
import { ENORMOUS_MEATBALL } from "./objects.h.js";
import { EUCALYPTUS_LEAF } from "./objects.h.js";
import { FAKE_AMULET_OF_YENDOR } from "./objects.h.js";
import { FLINT } from "./objects.h.js";
import { FOOD_RATION } from "./objects.h.js";
import { FORTUNE_COOKIE } from "./objects.h.js";
import { GLOB_OF_GREEN_SLIME } from "./objects.h.js";
import { GOLD_PIECE } from "./objects.h.js";
import { KNIFE } from "./objects.h.js";
import { K_RATION } from "./objects.h.js";
import { LEASH } from "./objects.h.js";
import { LEMBAS_WAFER } from "./objects.h.js";
import { LUMP_OF_ROYAL_JELLY } from "./objects.h.js";
import { MEATBALL } from "./objects.h.js";
import { MEAT_RING } from "./objects.h.js";
import { MEAT_STICK } from "./objects.h.js";
import { ORANGE } from "./objects.h.js";
import { ORCISH_DAGGER } from "./objects.h.js";
import { PANCAKE } from "./objects.h.js";
import { PEAR } from "./objects.h.js";
import { PICK_AXE } from "./objects.h.js";
import { RIN_ADORNMENT } from "./objects.h.js";
import { RIN_FREE_ACTION } from "./objects.h.js";
import { RIN_GAIN_CONSTITUTION } from "./objects.h.js";
import { RIN_GAIN_STRENGTH } from "./objects.h.js";
import { RIN_INCREASE_ACCURACY } from "./objects.h.js";
import { RIN_INCREASE_DAMAGE } from "./objects.h.js";
import { RIN_INVISIBILITY } from "./objects.h.js";
import { RIN_LEVITATION } from "./objects.h.js";
import { RIN_PROTECTION } from "./objects.h.js";
import { RIN_PROTECTION_FROM_SHAPE_CHAN } from "./objects.h.js";
import { RIN_SEE_INVISIBLE } from "./objects.h.js";
import { RIN_SLOW_DIGESTION } from "./objects.h.js";
import { RIN_SUSTAIN_ABILITY } from "./objects.h.js";
import { SCR_MAIL } from "./objects.h.js";
import { SCR_SCARE_MONSTER } from "./objects.h.js";
import { SILVER_DAGGER } from "./objects.h.js";
import { SLIME_MOLD } from "./objects.h.js";
import { SPRIG_OF_WOLFSBANE } from "./objects.h.js";
import { STILETTO } from "./objects.h.js";
import { TIN } from "./objects.h.js";
import { TIN_OPENER } from "./objects.h.js";
import { TRIDENT } from "./objects.h.js";
import { TRIPE_RATION } from "./objects.h.js";
import { ACID_RES } from "./prop.h.js";
import { AGGRAVATE_MONSTER } from "./prop.h.js";
import { COLD_RES } from "./prop.h.js";
import { DEAF } from "./prop.h.js";
import { DISINT_RES } from "./prop.h.js";
import { DISPLACED } from "./prop.h.js";
import { FAST } from "./prop.h.js";
import { FIRE_RES } from "./prop.h.js";
import { FROMFORM } from "./prop.h.js";
import { FROMOUTSIDE } from "./prop.h.js";
import { HUNGER } from "./prop.h.js";
import { INTRINSIC } from "./prop.h.js";
import { INVIS } from "./prop.h.js";
import { LAST_PROP } from "./prop.h.js";
import { LEVITATION } from "./prop.h.js";
import { LIFESAVED } from "./prop.h.js";
import { POISON_RES } from "./prop.h.js";
import { PROTECTION } from "./prop.h.js";
import { SEE_INVIS } from "./prop.h.js";
import { SHOCK_RES } from "./prop.h.js";
import { SICK } from "./prop.h.js";
import { SLEEPY } from "./prop.h.js";
import { SLEEP_RES } from "./prop.h.js";
import { SLIMED } from "./prop.h.js";
import { STONED } from "./prop.h.js";
import { STONE_RES } from "./prop.h.js";
import { TELEPAT } from "./prop.h.js";
import { TELEPORT } from "./prop.h.js";
import { TELEPORT_CONTROL } from "./prop.h.js";
import { TIMEOUT } from "./prop.h.js";
import { VOMITING } from "./prop.h.js";
import { W_AMUL } from "./prop.h.js";
import { W_ARMOR } from "./prop.h.js";
import { W_ARTI } from "./prop.h.js";
import { W_RING } from "./prop.h.js";
import { W_RINGL } from "./prop.h.js";
import { W_RINGR } from "./prop.h.js";
import { W_SADDLE } from "./prop.h.js";
import { W_TOOL } from "./prop.h.js";
import { W_WEP } from "./prop.h.js";
import { IRONBARS } from "./rm.h.js";
import { W_NONDIGGABLE } from "./rm.h.js";
import { IS_ALTAR } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { BEAR_TRAP } from "./trap.h.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { SICK_ALL } from "./you.h.js";
import { SICK_VOMITABLE } from "./you.h.js";
import { TT_BEARTRAP } from "./you.h.js";
import { Race_if } from "./you.h.macros.js";
import { Role_if } from "./you.h.macros.js";
import { Ugender } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { Acid_resistance } from "./youprop.h.macros.js";
import { BInvis } from "./youprop.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { BlindedTimeout } from "./youprop.h.macros.js";
import { Breathless } from "./youprop.h.macros.js";
import { Deaf } from "./youprop.h.macros.js";
import { Displaced } from "./youprop.h.macros.js";
import { EConflict } from "./youprop.h.macros.js";
import { EInvis } from "./youprop.h.macros.js";
import { EProtection } from "./youprop.h.macros.js";
import { ERegeneration } from "./youprop.h.macros.js";
import { ESee_invisible } from "./youprop.h.macros.js";
import { Fixed_abil } from "./youprop.h.macros.js";
import { Flying } from "./youprop.h.macros.js";
import { Glib } from "./youprop.h.macros.js";
import { HCold_resistance } from "./youprop.h.macros.js";
import { HConflict } from "./youprop.h.macros.js";
import { HConfusion } from "./youprop.h.macros.js";
import { HDisint_resistance } from "./youprop.h.macros.js";
import { HFast } from "./youprop.h.macros.js";
import { HFire_resistance } from "./youprop.h.macros.js";
import { HHallucination } from "./youprop.h.macros.js";
import { HInvis } from "./youprop.h.macros.js";
import { HPoison_resistance } from "./youprop.h.macros.js";
import { HRegeneration } from "./youprop.h.macros.js";
import { HShock_resistance } from "./youprop.h.macros.js";
import { HSleep_resistance } from "./youprop.h.macros.js";
import { HSleepy } from "./youprop.h.macros.js";
import { HStun } from "./youprop.h.macros.js";
import { HTelepat } from "./youprop.h.macros.js";
import { HTeleport_control } from "./youprop.h.macros.js";
import { HTeleportation } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Hunger } from "./youprop.h.macros.js";
import { Invis } from "./youprop.h.macros.js";
import { Levitation } from "./youprop.h.macros.js";
import { Lifesaved } from "./youprop.h.macros.js";
import { Poison_resistance } from "./youprop.h.macros.js";
import { See_invisible } from "./youprop.h.macros.js";
import { Sick } from "./youprop.h.macros.js";
import { Sick_resistance } from "./youprop.h.macros.js";
import { Sleep_resistance } from "./youprop.h.macros.js";
import { Slimed } from "./youprop.h.macros.js";
import { Slow_digestion } from "./youprop.h.macros.js";
import { Stone_resistance } from "./youprop.h.macros.js";
import { Stoned } from "./youprop.h.macros.js";
import { Strangled } from "./youprop.h.macros.js";
import { Unaware } from "./youprop.h.macros.js";
import { Unchanging } from "./youprop.h.macros.js";
import { Vomiting } from "./youprop.h.macros.js";
import { Wwalking } from "./youprop.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { schar } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { and64 } from "../rt/int64.js";
import { or64 } from "../rt/int64.js";
import { abs } from "../rt/libc.js";
import { assert } from "../rt/libc.js";
import { free } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_struct } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { Bitfield } from "../rt/struct.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { struct } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { stop_occupation } from "./allmain.js";
import { alloc } from "./alloc.js";
import { dupstr } from "./alloc.js";
import { fmt_ptr } from "./alloc.js";
import { o_unleash } from "./apply.js";
import { tinnable } from "./apply.js";
import { retouch_equipment } from "./artifact.js";
import { retouch_object } from "./artifact.js";
import { touch_artifact } from "./artifact.js";
import { adjalign } from "./attrib.js";
import { adjattrib } from "./attrib.js";
import { change_luck } from "./attrib.js";
import { exercise } from "./attrib.js";
import { gainstr } from "./attrib.js";
import { poison_strdmg } from "./attrib.js";
import { setuhpmax } from "./attrib.js";
import { bot } from "./botl.js";
import { paranoid_query } from "./cmd.js";
import { set_occupation } from "./cmd.js";
import { yn_function } from "./cmd.js";
import { is_ice } from "./dbridge.js";
import { is_pool_or_lava } from "./dbridge.js";
import { disp } from "./decl.js";
import { flags } from "./decl.js";
import { ga } from "./decl.js";
import { gc } from "./decl.js";
import { ge } from "./decl.js";
import { gf } from "./decl.js";
import { gm } from "./decl.js";
import { gn } from "./decl.js";
import { go } from "./decl.js";
import { gu } from "./decl.js";
import { gy } from "./decl.js";
import { hands_obj } from "./decl.js";
import { iflags } from "./decl.js";
import { sa_victual } from "./decl.js";
import { svc } from "./decl.js";
import { svk } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { u } from "./decl.js";
import { ynchars } from "./decl.js";
import { ynqchars } from "./decl.js";
import { canseemon } from "./display.js";
import { curs_on_u } from "./display.js";
import { newsym } from "./display.js";
import { see_monsters } from "./display.js";
import { set_mimic_blocking } from "./display.js";
import { donull } from "./do.js";
import { dropx } from "./do.js";
import { dropy } from "./do.js";
import { heal_legs } from "./do.js";
import { revive_corpse } from "./do.js";
import { trycall } from "./do.js";
import { Mgender } from "./do_name.js";
import { Monnam } from "./do_name.js";
import { hcolor } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { pmname } from "./do_name.js";
import { rndmonnam } from "./do_name.js";
import { Ring_gone } from "./do_wear.js";
import { fingers_or_gloves } from "./do_wear.js";
import { toggle_displacement } from "./do_wear.js";
import { on_level } from "./dungeon.js";
import { surface } from "./dungeon.js";
import { delayed_killer } from "./end.js";
import { done } from "./end.js";
import { can_reach_floor } from "./engrave.js";
import { more_experienced } from "./exper.js";
import { newexplevel } from "./exper.js";
import { pluslvl } from "./exper.js";
import { explode } from "./explode.js";
import { check_capacity } from "./hack.js";
import { end_running } from "./hack.js";
import { inv_cnt } from "./hack.js";
import { losehp } from "./hack.js";
import { near_capacity } from "./hack.js";
import { nomul } from "./hack.js";
import { rounddiv } from "./hack.js";
import { still_chewing } from "./hack.js";
import { unmul } from "./hack.js";
import { eos } from "./hacklib.js";
import { s_suffix } from "./hacklib.js";
import { sgn } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { addinv_nomerge } from "./invent.js";
import { carrying } from "./invent.js";
import { feel_cockatrice } from "./invent.js";
import { freeinv } from "./invent.js";
import { g_at } from "./invent.js";
import { getobj } from "./invent.js";
import { obj_here } from "./invent.js";
import { stackobj } from "./invent.js";
import { useup } from "./invent.js";
import { useupall } from "./invent.js";
import { useupf } from "./invent.js";
import { will_feel_cockatrice } from "./invent.js";
import { bcsign } from "./mkobj.js";
import { costly_alteration } from "./mkobj.js";
import { is_flammable } from "./mkobj.js";
import { is_rottable } from "./mkobj.js";
import { mksobj } from "./mkobj.js";
import { obj_extract_self } from "./mkobj.js";
import { peek_at_iced_corpse_age } from "./mkobj.js";
import { set_bknown } from "./mkobj.js";
import { splitobj } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { iter_mons } from "./mon.js";
import { mondied } from "./mon.js";
import { monstone } from "./mon.js";
import { rescham } from "./mon.js";
import { attacktype } from "./mondata.js";
import { attacktype_fordmg } from "./mondata.js";
import { cantvomit } from "./mondata.js";
import { dmgtype } from "./mondata.js";
import { olfaction } from "./mondata.js";
import { poly_when_stoned } from "./mondata.js";
import { same_race } from "./mondata.js";
import { monflee } from "./monmove.js";
import { mons } from "./monst.js";
import { objdescr_is } from "./o_init.js";
import { observe_object } from "./o_init.js";
import { objects } from "./objects.js";
import { Tobjnam } from "./objnam.js";
import { an } from "./objnam.js";
import { ansimpleoname } from "./objnam.js";
import { corpse_xname } from "./objnam.js";
import { doname } from "./objnam.js";
import { killer_xname } from "./objnam.js";
import { makeplural } from "./objnam.js";
import { obj_is_pname } from "./objnam.js";
import { otense } from "./objnam.js";
import { safe_qbuf } from "./objnam.js";
import { singular } from "./objnam.js";
import { the } from "./objnam.js";
import { the_unique_pm } from "./objnam.js";
import { thesimpleoname } from "./objnam.js";
import { xname } from "./objnam.js";
import { yobjnam } from "./objnam.js";
import { encumber_msg } from "./pickup.js";
import { You } from "./pline.js";
import { You_cant } from "./pline.js";
import { You_feel } from "./pline.js";
import { You_hear } from "./pline.js";
import { Your } from "./pline.js";
import { impossible } from "./pline.js";
import { livelog_printf } from "./pline.js";
import { pline } from "./pline.js";
import { pline_The } from "./pline.js";
import { verbalize } from "./pline.js";
import { body_part } from "./polyself.js";
import { change_sex } from "./polyself.js";
import { polymon } from "./polyself.js";
import { polyself } from "./polyself.js";
import { rehumanize } from "./polyself.js";
import { dopotion } from "./potion.js";
import { incr_itimeout } from "./potion.js";
import { make_blinded } from "./potion.js";
import { make_confused } from "./potion.js";
import { make_deaf } from "./potion.js";
import { make_glib } from "./potion.js";
import { make_hallucinated } from "./potion.js";
import { make_sick } from "./potion.js";
import { make_slimed } from "./potion.js";
import { make_stoned } from "./potion.js";
import { make_stunned } from "./potion.js";
import { make_vomiting } from "./potion.js";
import { self_invis_message } from "./potion.js";
import { set_itimeout } from "./potion.js";
import { altar_wrath } from "./pray.js";
import { unpunish } from "./read.js";
import { d } from "./rnd.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { outrumor } from "./rumors.js";
import { costly_spot } from "./shk.js";
import { sellobj_state } from "./shk.js";
import { attrcurse } from "./sit.js";
import { remove_worn_item } from "./steal.js";
import { dismount_steed } from "./steed.js";
import { fall_asleep } from "./timeout.js";
import { obj_stop_timers } from "./timeout.js";
import { b_trapped } from "./trap.js";
import { deltrap } from "./trap.js";
import { float_up } from "./trap.js";
import { reset_utrap } from "./trap.js";
import { selftouch } from "./trap.js";
import { t_at } from "./trap.js";
import { vault_gd_watching } from "./vault.js";
import { set_ulycn } from "./were.js";
import { were_beastie } from "./were.js";
import { you_unwere } from "./were.js";
import { uqwepgone } from "./wield.js";
import { uswapwepgone } from "./wield.js";
import { uwepgone } from "./wield.js";
import { welded } from "./wield.js";
import { wield_tool } from "./wield.js";
import { melt_ice } from "./zap.js";
import { ubreatheu } from "./zap.js";
const __FILE__ = "eat.c";
