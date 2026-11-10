/* NetHack 5.0	attrib.c	$NHDT-Date: 1777000050 2026/04/23 19:07:30 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.137 $ */
/*      Copyright 1988, 1989, 1990, 1992, M. Stephenson           */
/* NetHack may be freely redistributed.  See license for details. */

/*  attribute modification routines. */

import { C } from './c-runtime.js';

/* part of the output on gain or loss of attribute */
export const plusattr = [ "strong", "smart", "wise",
                          "agile",  "tough", "charismatic" ],
    minusattr = [ "weak",    "stupid",
                           "foolish", "clumsy",
                           "fragile", "repulsive" ];
/* also used by enlightenment in insight.c for non-abbreviated status info */


export const attrname = [ "strength", "intelligence", "wisdom",
                          "dexterity", "constitution", "charisma" ];

export const arc_abil = [ [ 1, "HSearching", "", "" ],
                 [ 5, "HStealth", "stealthy", "" ],
                 [ 10, "HFast", "quick", "slow" ],
                 [ 0, 0, 0, 0 ] ];

  export const bar_abil = [ [ 1, "HPoison_resistance", "", "" ],
                 [ 7, "HFast", "quick", "slow" ],
                 [ 15, "HStealth", "stealthy", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const cav_abil = [ [ 7, "HFast", "quick", "slow" ],
                 [ 15, "HWarning", "sensitive", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const hea_abil = [ [ 1, "HPoison_resistance", "", "" ],
                 [ 15, "HWarning", "sensitive", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const kni_abil = [ [ 7, "HFast", "quick", "slow" ], [ 0, 0, 0, 0 ] ];

  export const mon_abil = [ [ 1, "HFast", "", "" ],
                 [ 1, "HSleep_resistance", "", "" ],
                 [ 1, "HSee_invisible", "", "" ],
                 [ 3, "HPoison_resistance", "healthy", "" ],
                 [ 5, "HStealth", "stealthy", "" ],
                 [ 7, "HWarning", "sensitive", "" ],
                 [ 9, "HSearching", "perceptive", "unaware" ],
                 [ 11, "HFire_resistance", "cool", "warmer" ],
                 [ 13, "HCold_resistance", "warm", "cooler" ],
                 [ 15, "HShock_resistance", "insulated", "conductive" ],
                 [ 17, "HTeleport_control", "controlled", "uncontrolled" ],
                 [ 0, 0, 0, 0 ] ];

  export const pri_abil = [ [ 15, "HWarning", "sensitive", "" ],
                 [ 20, "HFire_resistance", "cool", "warmer" ],
                 [ 0, 0, 0, 0 ] ];

  export const ran_abil = [ [ 1, "HSearching", "", "" ],
                 [ 7, "HStealth", "stealthy", "" ],
                 [ 15, "HSee_invisible", "", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const rog_abil = [ [ 1, "HStealth", "", "" ],
                 [ 10, "HSearching", "perceptive", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const sam_abil = [ [ 1, "HFast", "", "" ],
                 [ 15, "HStealth", "stealthy", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const tou_abil = [ [ 10, "HSearching", "perceptive", "" ],
                 [ 20, "HPoison_resistance", "hardy", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const val_abil = [ [ 1, "HCold_resistance", "", "" ],
                 [ 3, "HStealth", "stealthy", "" ],
                 [ 7, "HFast", "quick", "slow" ],
                 [ 0, 0, 0, 0 ] ];

  export const wiz_abil = [ [ 15, "HWarning", "sensitive", "" ],
                 [ 17, "HTeleport_control", "controlled", "uncontrolled" ],
                 [ 0, 0, 0, 0 ] ];

  /* Intrinsics conferred by race */
  export const dwa_abil = [ [ 1, "HInfravision", "", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const elf_abil = [ [ 1, "HInfravision", "", "" ],
                 [ 4, "HSleep_resistance", "awake", "tired" ],
                 [ 0, 0, 0, 0 ] ];

  export const gno_abil = [ [ 1, "HInfravision", "", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const orc_abil = [ [ 1, "HInfravision", "", "" ],
                 [ 1, "HPoison_resistance", "", "" ],
                 [ 0, 0, 0, 0 ] ];

  export const hum_abil = [ [ 0, 0, 0, 0 ] ];









/* adjust an attribute; return TRUE if change is made, FALSE otherwise */
export function adjattrib(ndx, incr, msgflg)
/* which characteristic */
/* amount of change */
/* positive => no message, zero => message, and */
{               /* negative => conditional (msg if change made) */
    let old_acurr, old_abase, old_amax, decr;
    let abonflg;
    let attrstr;

    if (C.Fixed_abil || !incr)
        return C.FALSE;

    if ((ndx == C.A_INT || ndx == C.A_WIS) && C.uarmh && C.uarmh.otyp == C.DUNCE_CAP) {
        if (msgflg == 0)
            C.Your("cap constricts briefly, then relaxes again.");
        return C.FALSE;
    }

    old_acurr = acurr(ndx);
    old_abase = C.ABASE[ndx];
    old_amax = C.AMAX[ndx];
    C.ABASE[ndx] += incr; /* when incr is negative, this reduces ABASE() */
    if (incr > 0) {
        if (C.ABASE[ndx] > C.AMAX[ndx]) {
            C.AMAX[ndx] = C.ABASE[ndx];
            if (C.AMAX[ndx] > C.ATTRMAX(ndx))
                C.ABASE[ndx] = C.AMAX[ndx] = C.ATTRMAX(ndx);
        }
        attrstr = plusattr[ndx];
        abonflg = (C.ABON[ndx] < 0);
    } else { /* incr is negative */
        if (C.ABASE[ndx] < C.ATTRMIN(ndx)) {
            /*
             * If base value has dropped so low that it is trying to be
             * taken below the minimum, reduce max value (peak reached)
             * instead.  That means that restore ability and repeated
             * applications of unicorn horn will not be able to recover
             * all the lost value.  As of 3.6.2, we only take away
             * some (average half, possibly zero) of the excess from max
             * instead of all of it, but without intervening recovery, it
             * can still eventually drop to the minimum allowed.  After
             * that, it can't be recovered, only improved with new gains.
             *
             * This used to assign a new negative value to incr and then
             * add it, but that could affect messages below, possibly
             * making a large decrease be described as a small one.
             *
             * decr = rn2(-(ABASE - ATTRMIN) + 1);
             */
            decr = C.rn2(C.ATTRMIN(ndx) - C.ABASE[ndx] + 1, 166, "adjattrib");
            C.ABASE[ndx] = C.ATTRMIN(ndx);
            C.AMAX[ndx] -= decr;
            if (C.AMAX[ndx] < C.ATTRMIN(ndx))
                C.AMAX[ndx] = C.ATTRMIN(ndx);
        }
        attrstr = minusattr[ndx];
        abonflg = (C.ABON[ndx] > 0);
    }
    if (acurr(ndx) == old_acurr) {
        if (msgflg == 0 && C.flags.verbose) {
            if (C.ABASE[ndx] == old_abase && C.AMAX[ndx] == old_amax) {
                C.pline("You're %s as %s as you can get.",
                      abonflg ? "currently" : "already", attrstr);
            } else {
                /* current stayed the same but base value changed, or
                   base is at minimum and reduction caused max to drop */
                C.Your("innate %s has %s.", attrname[ndx],
                     (incr > 0) ? "improved" : "declined");
            }
        }
        return C.FALSE;
    }

    /* Any successful change also resets abuse / exercise level */
    C.AEXE[ndx] = 0;

    C.disp.botl = C.TRUE;
    if (msgflg <= 0)
        C.You_feel("%s%s!", (incr > 1 || incr < -1) ? "very " : "", attrstr);
    if (C.program_state.in_moveloop && (ndx == C.A_STR || ndx == C.A_CON))
        C.encumber_msg();
    return C.TRUE;
}

/* strength gain */
export function gainstr(otmp, incr, givemsg)
{
    let num = incr;

    if (!num) {
        if (C.ABASE[C.A_STR] < 18)
            num = (C.rn2(4, 209, "gainstr") ? 1 : C.rnd(6, 209, "gainstr"));
        else if (C.ABASE[C.A_STR] < C.STR18(85))
            num = C.rnd(10, 211, "gainstr");
        else
            num = 1;
    }
    adjattrib(C.A_STR, (otmp && otmp.cursed) ? -num : num,
                     givemsg ? -1 : 1);
}

/* strength loss, may kill you; cause may be poison or monster like 'a' */
export function losestr(num, knam, k_format)
{
    let uhpmin = minuhpmax(1), olduhpmax = C.u.uhpmax;
    let ustr = C.ABASE[C.A_STR] - num, amt, dmg;
    let waspolyd = C.Upolyd;

    if (num <= 0 || C.ABASE[C.A_STR] < C.ATTRMIN(C.A_STR)) {
        C.impossible("losestr: %d - %d", C.ABASE[C.A_STR], num);
        return;
    }
    dmg = 0;
    while (ustr < C.ATTRMIN(C.A_STR)) {
        ++ustr;
        --num;
        amt = C.rn1(4, 3, 235, "losestr"); /* (0..(4-1))+3 => 3..6; used to use flat 6 here */
        dmg += amt;
    }
    if (dmg) {
        /* in case damage is fatal and caller didn't supply killer reason */
        if (!knam || !C.loadChar(knam)) {
            knam = "terminal frailty";
            k_format = C.KILLED_BY;
        }
        C.losehp(dmg, knam, k_format);

        if (C.Upolyd) {
            /* when still poly'd, reduce you-as-monst maxHP; never below 1 */
            setuhpmax(C.max(C.u.mhmax - dmg, 1), C.FALSE); /* acts as setmhmax() */
        } else if (!waspolyd) {
            /* not polymorphed now and didn't rehumanize when taking damage;
               reduce max HP, but not below uhpmin */
            if (C.u.uhpmax > uhpmin)
                setuhpmax(C.max(C.u.uhpmax - dmg, uhpmin), C.FALSE);
        }
        C.disp.botl = C.TRUE;
    }
/* only possible if uhpmax was already less than uhpmin */
/* won't be fatal when no 'drainer' is supplied */

    C.nhUse(olduhpmax);

    /* 'num' could have been reduced to 0 in the minimum strength loop;
       '(Upolyd || !waspolyd)' is True unless damage caused rehumanization */
    if (num > 0 && (C.Upolyd || !waspolyd))
        adjattrib(C.A_STR, -num, 1);
}

/* combined strength loss and damage from some poisons */
export function poison_strdmg(strloss, dmg, knam, k_format)
{
    losestr(strloss, knam, k_format);
    C.losehp(dmg, knam, k_format);
}

const poiseff = [
    { delivery_func: "You_feel", effect_msg: "weaker" },             /* A_STR */
    { delivery_func: "Your", effect_msg: "brain is on fire" },       /* A_INT */
    { delivery_func: "Your", effect_msg: "judgement is impaired" },  /* A_WIS */
    { delivery_func: "Your", effect_msg: "muscles won't obey you" }, /* A_DEX */
    { delivery_func: "You_feel", effect_msg: "very sick" },          /* A_CON */
    { delivery_func: "You", effect_msg: "break out in hives" }       /* A_CHA */
];

/* feedback for attribute loss due to poisoning */
export function poisontell(typ, exclaim)
/* which attribute */
/* emphasis */
{
    let func = C[poiseff[typ].delivery_func];
    let msg_txt = poiseff[typ].effect_msg;

    /*
     * "You feel weaker" or "you feel very sick" aren't appropriate when
     * wearing or wielding something (gauntlets of power, Ogresmasher)
     * which forces the attribute to maintain its maximum value.
     * Phrasing for other attributes which might have fixed values
     * (dunce cap) is such that we don't need message fixups for them.
     */
    if (typ == C.A_STR && acurr(C.A_STR) == C.STR19(25))
        msg_txt = "innately weaker";
    else if (typ == C.A_CON && acurr(C.A_CON) == 25)
        msg_txt = "sick inside";

    func("%s%c", msg_txt, exclaim ? 33 : 46);
}

/* called when an attack or trap has poisoned hero (used to be in mon.c) */
export function poisoned(reason, typ, pkiller, fatal, thrown_weapon)
/* controls what messages we display */
/* for score+log file if fatal */
/* if fatal is 0, limit damage to adjattrib */
/* thrown weapons are less deadly */
{
    let i, loss, kprefix = C.KILLED_BY_AN;
    let blast = !C.strcmp(reason, "blast");

    /* inform player about being poisoned unless that's already been done;
       "blast" has given a "blast of poison gas" message; "poison arrow",
       "poison dart", etc have implicitly given poison messages too... */
    if (!blast && !C.strstri(reason, "poison")) {
        let plural = (C.loadChar(C.address(reason) + Number(C.strlen(reason)) - 1) == 115) ? 1 : 0;

        /* avoid "The" Orcus's sting was poisoned... */
        C.pline("%s%s %s poisoned!",
              C.isupper(C.loadChar(reason) & 255) ? "" : "The ", reason,
              plural ? "were" : "was");
    }
    if (C.Poison_resistance) {
        if (blast)
            C.shieldeff(C.u.ux, C.u.uy);
        C.pline_The("poison doesn't seem to affect you.");
        return;
    }

    /* suppress killer prefix if it already has one */
    i = C.name_to_mon(pkiller,  0);
    if (C.ismnum(i) && (C.mons[i].geno & C.G_UNIQ)) {
        kprefix = C.KILLED_BY;
        if (!C.type_is_pname(C.mons[i]))
            pkiller = C.the(pkiller);
    } else if (!C.strncmpi(pkiller, "the ", 4) || !C.strncmpi(pkiller, "an ", 3)
               || !C.strncmpi(pkiller, "a ", 2)) {
        /*[ does this need a plural check too? ]*/
        kprefix = C.KILLED_BY;
    }

    /*
     * FIXME:
     *  this operates on u.uhp[max] even when hero is polymorphed....
     */

    i = !fatal ? 1 : C.rn2(fatal + (thrown_weapon ? 20 : 0), 362, "poisoned");
    if (i == 0 && typ != C.A_CHA) {
        /* sometimes survivable instant kill */
        loss = 6 + C.d(4, 6, 365, "poisoned"); /* 6 + 4d6 => 10..34 */
        if (C.u.uhp <= loss) {
            C.u.uhp = -1;
            C.disp.botl = C.TRUE;
            C.pline_The("poison was deadly...");
        } else {
            /* survived, but with severe reaction */
            let olduhp = C.u.uhp,
                newuhpmax = C.u.uhpmax - Math.trunc(loss / 2);

            setuhpmax(C.max(newuhpmax, minuhpmax(3)), C.TRUE); /*True: see FIXME*/
            loss = adjuhploss(loss, olduhp);

            C.losehp(loss, pkiller, kprefix); /* poison damage */
            if (adjattrib(C.A_CON, (typ != C.A_CON) ? -1 : -3, C.TRUE))
                poisontell(C.A_CON, C.TRUE);
            if (typ != C.A_CON && adjattrib(typ, -3, 1))
                poisontell(typ, C.TRUE);
        }
    } else if (i > 5) {
        let cloud = !C.strcmp(reason, "gas cloud");

        /* HP damage; more likely--but less severe--with missiles */
        loss = thrown_weapon ? C.rnd(6, 388, "poisoned") : C.rn1(10, 6, 388, "poisoned");
        if ((blast || cloud) && C.Half_gas_damage) /* worn towel */
            loss = Math.trunc(C.int(loss + 1) / 2);
        C.losehp(loss, pkiller, kprefix); /* poison damage */
    } else {
        /* attribute loss; if typ is A_STR, reduction in current and
           maximum HP will occur once strength has dropped down to 3 */
        loss = (thrown_weapon || !fatal) ? 1 : C.d(2, 2, 395, "poisoned"); /* was rn1(3,3) */
        /* check that a stat change was made */
        if (adjattrib(typ, -loss, 1))
            poisontell(typ, C.TRUE);
    }

    if (C.u.uhp < 1) {
        C.svk.killer.format = kprefix;
        C.Strcpy(C.svk.killer.name, pkiller);
        /* "Poisoned by a poisoned ___" is redundant */
        C.done(C.strstri(pkiller, "poison") ? C.DIED : C.POISONING);
    }
    C.encumber_msg();
}

export function change_luck(n)
{
    C.u.uluck += n;
    if (C.u.uluck < 0 && C.u.uluck < C.LUCKMIN)
        C.u.uluck = C.LUCKMIN;
    if (C.u.uluck > 0 && C.u.uluck > C.LUCKMAX)
        C.u.uluck = C.LUCKMAX;
}

/* decide whether there are more blessed luckstones (plus luck-conferring
   artifacts) than cursed ones; optionally combine uncursed with blessed */
export function stone_luck(include_uncursed)
{
    let otmp;
    let bonchance = 0n;

    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        if (C.confers_luck(otmp)) {
            if (otmp.cursed)
                bonchance -= otmp.quan;
            else if (otmp.blessed || include_uncursed)
                bonchance += otmp.quan;
        }

    return C.sgn(C.int(bonchance));
}

/* there has just been an inventory change affecting a luck-granting item */
export function set_moreluck()
{
    let luckbon = stone_luck(C.TRUE);

    if (!luckbon && !C.carrying(C.LUCKSTONE))
        C.u.moreluck = 0;
    else if (luckbon >= 0)
        C.u.moreluck = C.LUCKADD;
    else
        C.u.moreluck = -C.LUCKADD;
}

/* (not used) */
export function restore_attrib()
{
    let i, equilibrium;;

    /*
     * Note:  this used to get called by moveloop() on every turn but
     * ATIME() is never set to non-zero anywhere so didn't do anything.
     * Presumably it once supported something like potion of heroism
     * which conferred temporary characteristics boost(s).
     *
     * ATEMP() is used for strength loss from hunger, which doesn't
     * time out, and for dexterity loss from wounded legs, which has
     * its own timeout routine.
     */

    for (i = 0; i < C.A_MAX; i++) { /* all temporary losses/gains */
        equilibrium = ((i == C.A_STR && C.u.uhs >= C.WEAK)
                       || (i == C.A_DEX && C.Wounded_legs)) ? -1 : 0;
        if (C.ATEMP[i] != equilibrium && C.ATIME[i] != 0) {
            if (!(--(C.ATIME[i]))) { /* countdown for change */
                C.ATEMP[i] += (C.ATEMP[i] > 0) ? -1 : 1;
                C.disp.botl = C.TRUE;
                if (C.ATEMP[i]) /* reset timer */
                    C.ATIME[i] = Math.trunc(100 / acurr(C.A_CON));
            }
        }
    }
    if (C.disp.botl)
        C.encumber_msg();
}

const AVAL = 50; /* tune value for exercise gains */

export function exercise(i, inc_or_dec)
{
    C.debugpline0("Exercise:");
    if (i == C.A_INT || i == C.A_CHA)
        return; /* can't exercise these */

    /* no physical exercise while polymorphed; the body's temporary */
    if (C.Upolyd && i != C.A_WIS)
        return;

    if (C.abs(C.AEXE[i]) < AVAL) {
        /*
         *      Law of diminishing returns (Part I):
         *
         *      Gain is harder at higher attribute values.
         *      79% at "3" --> 0% at "18"
         *      Loss is even at all levels (50%).
         *
         *      Note: *YES* ACURR is the right one to use.
         */
        C.AEXE[i] += (inc_or_dec) ? (C.rn2(19, 509, "exercise") > acurr(i)) : -C.rn2(2, 509, "exercise");
        C.debugpline3("%s, %s AEXE = %d",
                    (i == C.A_STR) ? "Str" : (i == C.A_WIS) ? "Wis" : (i == C.A_DEX)
                                                                      ? "Dex"
                                                                      : "Con",
                    (inc_or_dec) ? "inc" : "dec", C.AEXE[i]);
    }
    if (C.svm.moves > 0 && (i == C.A_STR || i == C.A_CON))
        C.encumber_msg();
}

export function exerper()
{
    if (!(C.svm.moves % 10n)) {
        /* Hunger Checks */
        let hs = (C.u.uhunger > 1000) ? C.SATIATED
                 : (C.u.uhunger > 150) ? C.NOT_HUNGRY
                   : (C.u.uhunger > 50) ? C.HUNGRY
                     : (C.u.uhunger > 0) ? C.WEAK
                       : C.FAINTING;

        C.debugpline0("exerper: Hunger checks");
        switch (hs) {
        case C.SATIATED:
            exercise(C.A_DEX, C.FALSE);
            if (C.Role_if(C.PM_MONK))
                exercise(C.A_WIS, C.FALSE);
            break;
        case C.NOT_HUNGRY:
            exercise(C.A_CON, C.TRUE);
            break;
        case C.WEAK:
            exercise(C.A_STR, C.FALSE);
            if (C.Role_if(C.PM_MONK)) /* fasting */
                exercise(C.A_WIS, C.TRUE);
            break;
        case C.FAINTING:
        case C.FAINTED:
            exercise(C.A_CON, C.FALSE);
            break;
        }

        /* Encumbrance Checks */
        C.debugpline0("exerper: Encumber checks");
        switch (C.near_capacity()) {
        case C.MOD_ENCUMBER:
            exercise(C.A_STR, C.TRUE);
            break;
        case C.HVY_ENCUMBER:
            exercise(C.A_STR, C.TRUE);
            exercise(C.A_DEX, C.FALSE);
            break;
        case C.EXT_ENCUMBER:
            exercise(C.A_DEX, C.FALSE);
            exercise(C.A_CON, C.FALSE);
            break;
        }
    }

    /* status checks */
    if (!(C.svm.moves % 5n)) {
        C.debugpline0("exerper: Status checks");
        if ((C.HClairvoyant & (C.INTRINSIC | C.TIMEOUT)) && !C.BClairvoyant)
            exercise(C.A_WIS, C.TRUE);
        if (C.HRegeneration)
            exercise(C.A_STR, C.TRUE);

        if (C.Sick || C.Vomiting)
            exercise(C.A_CON, C.FALSE);
        if (C.Confusion || C.Hallucination)
            exercise(C.A_WIS, C.FALSE);
        if ((C.Wounded_legs && !C.u.usteed) || C.Fumbling || C.HStun)
            exercise(C.A_DEX, C.FALSE);
    }
}

/* exercise/abuse text (must be in attribute order, not botl order);
   phrased as "You must have been [][0]." or "You haven't been [][1]." */
export const exertext = [
    [ "exercising diligently", "exercising properly" ],           /* Str */
    [ 0, 0 ],                                                     /* Int */
    [ "very observant", "paying attention" ],                     /* Wis */
    [ "working on your reflexes", "working on reflexes lately" ], /* Dex */
    [ "leading a healthy life-style", "watching your health" ],   /* Con */
    [ 0, 0 ],                                                     /* Cha */
];

export function exerchk()
{
    let i, ax, mod_val, lolim, hilim;

    /*  Check out the periodic accumulations */
    exerper();

    if (C.svm.moves >= C.svc.context.next_attrib_check) {
        C.debugpline1("exerchk: ready to test. multi = %ld.", C.gm.multi);
    }
    /*  Are we ready for a test? */
    if (C.svm.moves >= C.svc.context.next_attrib_check && !C.gm.multi) {
        C.debugpline0("exerchk: testing.");
        /*
         *      Law of diminishing returns (Part II):
         *
         *      The effects of "exercise" and "abuse" wear
         *      off over time.  Even if you *don't* get an
         *      increase/decrease, you lose some of the
         *      accumulated effects.
         */
        for (i = 0; i < C.A_MAX; ++i) {
            ax = C.AEXE[i];
            /* nothing to do here if no exercise or abuse has occurred
               (Int and Cha always fall into this category) */
            if (!ax)
                continue; /* ok to skip nextattrib */

            mod_val = C.sgn(ax); /* +1 or -1; used below */
            /* no further effect for exercise if at max or abuse if at min;
               can't exceed 18 via exercise even if actual max is higher */
            nextattrib: {
            lolim = C.ATTRMIN(i); /* usually 3; might be higher */
            hilim = C.ATTRMAX(i); /* usually 18; maybe lower or higher */
            if (hilim > 18)
                hilim = 18;
            if ((ax < 0) ? (C.ABASE[i] <= lolim) : (C.ABASE[i] >= hilim))
                break nextattrib;
            /* can't exercise non-Wisdom while polymorphed; previous
               exercise/abuse gradually wears off without impact then */
            if (C.Upolyd && i != C.A_WIS)
                break nextattrib;

            C.debugpline2("exerchk: testing %s (%d).",
                        (i == C.A_STR) ? "Str"
                        : (i == C.A_INT) ? "Int?"
                          : (i == C.A_WIS) ? "Wis"
                            : (i == C.A_DEX) ? "Dex"
                              : (i == C.A_CON) ? "Con"
                                : (i == C.A_CHA) ? "Cha?"
                                  : "???",
                        ax);
            /*
             *  Law of diminishing returns (Part III):
             *
             *  You don't *always* gain by exercising.
             *  [MRS 92/10/28 - Treat Wisdom specially for balance.]
             */
            if (C.rn2(AVAL, 655, "exerchk") > ((i != C.A_WIS) ? Math.trunc(C.int(C.abs(ax) * 2) / 3) : C.abs(ax)))
                break nextattrib;

            C.debugpline1("exerchk: changing %d.", i);
            if (adjattrib(i, mod_val, -1)) {
                C.debugpline1("exerchk: changed %d.", i);
                /* if you actually changed an attrib - zero accumulation */
                C.AEXE[i] = ax = 0;
                /* then print an explanation */
                C.You("%s %s.",
                    (mod_val > 0) ? "must have been" : "haven't been",
                    exertext[i][(mod_val > 0) ? 0 : 1]);
            }
            }
            /* this used to be ``AEXE(i) /= 2'' but that would produce
               platform-dependent rounding/truncation for negative vals */
            C.AEXE[i] = Math.trunc(C.abs(ax) / 2) * mod_val;
        }
        C.svc.context.next_attrib_check += BigInt(C.rn1(200, 800, 673, "exerchk"));
        C.debugpline1("exerchk: next check at %ld.",
                    C.svc.context.next_attrib_check);
    }
}

/* return random hero attribute (by role's attr distribution).
   returns A_MAX if failed. */
export function rnd_attr()
{
    let i, x = C.rn2(100, 684, "rnd_attr");

    /* 5.0: the x -= ... calculation used to have an off by 1 error that
       resulted in the values being biased toward Str and away from Cha */
    for (i = 0; i < C.A_MAX; ++i)
        if ((x -= C.gu.urole.attrdist[i]) < 0)
            break;
    return i;
}

/* add or subtract np points from random attributes,
   adjusting the base and maximum values of the attributes.
   if subtracting, np must be negative.
   returns the left over points. */
export function init_attr_role_redist(np, addition)
{
    let tryct = 0;
    let adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        let i = rnd_attr();

        if (i >= C.A_MAX
            || (addition ? (C.ABASE[i] >= C.ATTRMAX(i))
                         : (C.ABASE[i] <= C.ATTRMIN(i)))) {
            tryct++;
            continue;
        }
        tryct = 0;
        C.ABASE[i] += adj;
        C.AMAX[i] += adj;
        np -= adj;
    }
    return np;
}

/* allocate hero's initial characteristics */
export function init_attr(np)
{
    let i;

    for (i = 0; i < C.A_MAX; i++) {
        C.ABASE[i] = C.AMAX[i] = C.gu.urole.attrbase[i];
        C.ATEMP[i] = C.ATIME[i] = 0;
        np -= C.gu.urole.attrbase[i];
    }

    /* distribute leftover points */
    np = init_attr_role_redist(np, C.TRUE);
    /* if we went over, remove points */
    np = init_attr_role_redist(np, C.FALSE);
}

export function redist_attr()
{
    let i, tmp;

    for (i = 0; i < C.A_MAX; i++) {
        if (i == C.A_INT || i == C.A_WIS)
            continue;
        /* Polymorphing doesn't change your mind */
        tmp = C.AMAX[i];
        C.AMAX[i] += (C.rn2(5, 749, "redist_attr") - 2);
        if (C.AMAX[i] > C.ATTRMAX(i))
            C.AMAX[i] = C.ATTRMAX(i);
        if (C.AMAX[i] < C.ATTRMIN(i))
            C.AMAX[i] = C.ATTRMIN(i);
        C.ABASE[i] = Math.trunc(C.int(C.ABASE[i] * C.AMAX[i]) / tmp);
        /* ABASE(i) > ATTRMAX(i) is impossible */
        if (C.ABASE[i] < C.ATTRMIN(i))
            C.ABASE[i] = C.ATTRMIN(i);
    }
    /* encumber_msg(); -- caller needs to do this */
}

/* apply minor variation to attributes */
export function vary_init_attr()
{
    let i;

    for (i = 0; i < C.A_MAX; i++)
        if (!C.rn2(20, 769, "vary_init_attr")) {
            let xd = C.rn2(7, 770, "vary_init_attr") - 2; /* biased variation */

            adjattrib(i, xd, C.TRUE);
            if (C.ABASE[i] < C.AMAX[i])
                C.AMAX[i] = C.ABASE[i];
        }
}

export function postadjabil(ability)
{
    if (!C.u.ulevel) /* initializing hero; don't attempt screen update yet */
        return;
    if (C.samePtr(ability, C.intrinsicNamed("HWarning")) || C.samePtr(ability, C.intrinsicNamed("HSee_invisible")))
        C.see_monsters();
}

export function role_abil(r)
{
    const roleabils = [
        { role: C.PM_ARCHEOLOGIST, abil: C.arc_abil },
        { role: C.PM_BARBARIAN, abil: C.bar_abil },
        { role: C.PM_CAVE_DWELLER, abil: C.cav_abil },
        { role: C.PM_HEALER, abil: C.hea_abil },
        { role: C.PM_KNIGHT, abil: C.kni_abil },
        { role: C.PM_MONK, abil: C.mon_abil },
        { role: C.PM_CLERIC, abil: C.pri_abil },
        { role: C.PM_RANGER, abil: C.ran_abil },
        { role: C.PM_ROGUE, abil: C.rog_abil },
        { role: C.PM_SAMURAI, abil: C.sam_abil },
        { role: C.PM_TOURIST, abil: C.tou_abil },
        { role: C.PM_VALKYRIE, abil: C.val_abil },
        { role: C.PM_WIZARD, abil: C.wiz_abil },
        { role: 0, abil: 0 }
    ];
    let i;

    for (i = 0; roleabils[i].abil && roleabils[i].role != r; i++)
        continue;
    return roleabils[i].abil;
}

export function check_innate_abil(ability, frommask)
{
    let abil = 0;

    if (frommask == C.FROMEXPER)
        abil = role_abil(C.Role_switch);
    else if (frommask == C.FROMRACE)
        switch (C.Race_switch) {
        case C.PM_DWARF:
            abil = C.dwa_abil;
            break;
        case C.PM_ELF:
            abil = C.elf_abil;
            break;
        case C.PM_GNOME:
            abil = C.gno_abil;
            break;
        case C.PM_ORC:
            abil = C.orc_abil;
            break;
        case C.PM_HUMAN:
            abil = C.hum_abil;
            break;
        default:
            break;
        }

    while (abil && abil.ability) {
        if (C.samePtr(abil.ability, ability) && (C.u.ulevel >= abil.ulevel))
            return abil;
        abil = C.nextInnate(abil);
    }
    return  0;
}

/* reasons for innate ability */
const FROM_NONE = 0;
const FROM_ROLE = 1; /* from experience at level 1 */
const FROM_RACE = 2;
const FROM_INTR = 3; /* intrinsically (eating some corpse or prayer reward) */
const FROM_EXP = 4; /* from experience for some level > 1 */
const FROM_FORM = 5;
const FROM_LYCN = 6;

/* check whether particular ability has been obtained via innate attribute */
export function innately(ability)
{
    let iptr;

    if ((iptr = check_innate_abil(ability, C.FROMEXPER)) != 0)
        return (iptr.ulevel == 1) ? FROM_ROLE : FROM_EXP;
    if ((iptr = check_innate_abil(ability, C.FROMRACE)) != 0)
        return FROM_RACE;
    if ((ability.value & C.FROMOUTSIDE) != 0n)
        return FROM_INTR;
    if ((ability.value & C.FROMFORM) != 0n)
        return FROM_FORM;
    return FROM_NONE;
}

export function is_innate(propidx)
{
    let innateness;

    /* innately() would report FROM_FORM for this; caller wants specificity */
    if (propidx == C.DRAIN_RES && C.ismnum(C.u.ulycn))
        return FROM_LYCN;
    if (propidx == C.FAST && C.Very_fast)
        return FROM_NONE; /* can't become very fast innately */
    if ((innateness = innately(C.intrinsicPointer(propidx))) != FROM_NONE)
        return innateness;
    if (propidx == C.JUMPING && C.Role_if(C.PM_KNIGHT)
        /* knight has intrinsic jumping, but extrinsic is more versatile so
           ignore innateness if equipment is going to claim responsibility */
        && !C.u.uprops[propidx].extrinsic)
        return FROM_ROLE;
    if ((propidx == C.BLINDED && !C.haseyes(C.gy.youmonst.data))
        || (propidx == C.BLND_RES && (C.HBlnd_resist & C.FROMFORM) != 0))
        return FROM_FORM;
    return FROM_NONE;
}



export function from_what(propidx)
/* special cases can have negative values */
{
    let buf = C.attribState.buf;

    C.storeChar(buf, 0);
    /*
     * Restrict the source of the attributes just to debug mode for now
     */
    if (C.wizard) {
        const because_of = " because of %s";

        if (propidx >= 0) {
            let p;
            let obj =  0;
            let innateness = is_innate(propidx);

            /*
             * Properties can be obtained from multiple sources and we
             * try to pick the most significant one.  Classification
             * priority is not set in stone; current precedence is:
             * "from the start" (from role or race at level 1),
             * "from outside" (eating corpse, divine reward, blessed potion),
             * "from experience" (from role or race at level 2+),
             * "from current form" (while polymorphed),
             * "from timed effect" (potion or spell),
             * "from worn/wielded equipment" (Firebrand, elven boots, &c),
             * "from carried equipment" (mainly quest artifacts).
             * There are exceptions.  Versatile jumping from spell or boots
             * takes priority over knight's innate but limited jumping.
             */
            if ((propidx == C.BLINDED && C.u.uroleplay.blind)
                || (propidx == C.DEAF && C.u.uroleplay.deaf))
                C.Sprintf(buf, " from birth");
            else if (innateness == FROM_ROLE || innateness == FROM_RACE)
                C.Strcpy(buf, " innately");
            else if (innateness == FROM_INTR) /* [].intrinsic & FROMOUTSIDE */
                C.Strcpy(buf, " intrinsically");
            else if (innateness == FROM_EXP)
                C.Strcpy(buf, " because of your experience");
            else if (innateness == FROM_LYCN)
                C.Strcpy(buf, " due to your lycanthropy");
            else if (innateness == FROM_FORM)
                C.Strcpy(buf, " from your creature form");
            else if (propidx == C.FAST && C.Very_fast)
                C.Sprintf(buf, because_of,
                        ((C.HFast & C.TIMEOUT) != 0n) ? "a potion or spell"
                          : ((C.EFast & C.W_ARMF) != 0n && C.uarmf.dknown
                             && C.objects[C.uarmf.otyp].oc_name_known)
                              ? C.ysimple_name(C.uarmf) /* speed boots */
                                : C.EFast ? "worn equipment"
                                  : C.something);
            else if (C.wizard
                     && (obj = C.what_gives(C.extrinsicPointer(propidx))) != 0)
                C.Sprintf(buf, because_of, obj.oartifact
                                             ? C.bare_artifactname(obj)
                                             : C.ysimple_name(obj));
            else if (propidx == C.BLINDED && C.Blindfolded_only)
                C.Sprintf(buf, because_of, C.ysimple_name(C.ublindf));
            else if (propidx == C.BLINDED && C.u.ucreamed
                     && C.BlindedTimeout ==  C.u.ucreamed
                     && !C.EBlinded && !(C.HBlinded & ~C.TIMEOUT))
                C.Sprintf(buf, "due to goop covering your %s",
                        C.body_part(C.FACE));

            /* remove some verbosity and/or redundancy */
            if ((p = C.strstri(buf, " pair of ")) != 0)
                C.copynchars(C.address(p) + 1, C.address(p) + 9, C.BUFSZ); /* overlapping buffers ok */
            else if (propidx == C.STRANGLED
                     && (p = C.strstri(buf, " of strangulation")) != 0)
                C.storeChar(p, 0);

        } else { /* negative property index */
            /* if more blocking capabilities get implemented we'll need to
               replace this with what_blocks() comparable to what_gives() */
            switch (-propidx) {
            case C.BLINDED:
                /* wearing the Eyes of the Overworld overrides blindness */
                if (C.BBlinded && C.is_art(C.ublindf, C.ART_EYES_OF_THE_OVERWORLD))
                    C.Sprintf(buf, because_of, C.bare_artifactname(C.ublindf));
                break;
            case C.INVIS:
                if (C.u.uprops[C.INVIS].blocked & C.W_ARMC)
                    C.Sprintf(buf, because_of,
                            C.ysimple_name(C.uarmc)); /* mummy wrapping */
                break;
            case C.CLAIRVOYANT:
                if (C.wizard && (C.u.uprops[C.CLAIRVOYANT].blocked & C.W_ARMH))
                    C.Sprintf(buf, because_of,
                            C.ysimple_name(C.uarmh)); /* cornuthaum */
                break;
            }
        }

    } /*wizard*/
    return buf;
}



export function adjabil(oldlevel, newlevel)
{
    let abil, rabil;
    let prevabil, mask = C.FROMEXPER;

    abil = role_abil(C.Role_switch);

    switch (C.Race_switch) {
    case C.PM_ELF:
        rabil = C.elf_abil;
        break;
    case C.PM_ORC:
        rabil = C.orc_abil;
        break;
    case C.PM_HUMAN:
    case C.PM_DWARF:
    case C.PM_GNOME:
    default:
        rabil = 0;
        break;
    }

    while (abil || rabil) {
        /* Have we finished with the intrinsics list? */
        if (!abil || !abil.ability) {
            /* Try the race intrinsics */
            if (!rabil || !rabil.ability)
                break;
            abil = rabil;
            rabil = 0;
            mask = C.FROMRACE;
        }
        prevabil = abil.ability.value;
        if (oldlevel < abil.ulevel && newlevel >= abil.ulevel) {
            /* Abilities gained at level 1 can never be lost
             * via level loss, only via means that remove _any_
             * sort of ability.  A "gain" of such an ability from
             * an outside source is devoid of meaning, so we set
             * FROMOUTSIDE to avoid such gains.
             */
            if (abil.ulevel == 1)
                abil.ability.value |= (mask | C.FROMOUTSIDE);
            else
                abil.ability.value |= mask;
            if (!(abil.ability.value & C.INTRINSIC & ~mask)) {
                if (C.loadChar(abil.gainstr))
                    C.You_feel("%s!", abil.gainstr);
            }
        } else if (oldlevel >= abil.ulevel && newlevel < abil.ulevel) {
            abil.ability.value &= ~mask;
            if (!(abil.ability.value & C.INTRINSIC)) {
                if (C.loadChar(abil.losestr))
                    C.You_feel("%s!", abil.losestr);
                else if (C.loadChar(abil.gainstr))
                    C.You_feel("less %s!", abil.gainstr);
            }
        }
        if (prevabil != abil.ability.value) /* it changed */
            postadjabil(abil.ability);
        abil = C.nextInnate(abil);
    }

    if (oldlevel > 0) {
        if (newlevel > oldlevel)
            C.add_weapon_skill(newlevel - oldlevel);
        else
            C.lose_weapon_skill(oldlevel - newlevel);
    }
}

/* called when gaining a level (before u.ulevel gets incremented);
   also called with u.ulevel==0 during hero initialization or for
   re-init if hero turns into a "new man/woman/elf/&c" */
export function newhp()
{
    let hp, conplus;

    if (C.u.ulevel == 0) {
        /* Initialize hit points */
        hp = C.gu.urole.hpadv.infix + C.gu.urace.hpadv.infix;
        if (C.gu.urole.hpadv.inrnd > 0)
            hp += C.rnd(C.gu.urole.hpadv.inrnd, 1088, "newhp");
        if (C.gu.urace.hpadv.inrnd > 0)
            hp += C.rnd(C.gu.urace.hpadv.inrnd, 1090, "newhp");
        if (C.svm.moves == 0) { /* initial hero; skip for polyself to new man */
            /* Initialize alignment stuff */
            C.u.ualign.type = C.aligns[C.flags.initalign].value;
            C.u.ualign.record = C.gu.urole.initrecord;
        }
        /* no Con adjustment for initial hit points */
    } else {
        if (C.u.ulevel < C.gu.urole.xlev) {
            hp = C.gu.urole.hpadv.lofix + C.gu.urace.hpadv.lofix;
            if (C.gu.urole.hpadv.lornd > 0)
                hp += C.rnd(C.gu.urole.hpadv.lornd, 1101, "newhp");
            if (C.gu.urace.hpadv.lornd > 0)
                hp += C.rnd(C.gu.urace.hpadv.lornd, 1103, "newhp");
        } else {
            hp = C.gu.urole.hpadv.hifix + C.gu.urace.hpadv.hifix;
            if (C.gu.urole.hpadv.hirnd > 0)
                hp += C.rnd(C.gu.urole.hpadv.hirnd, 1107, "newhp");
            if (C.gu.urace.hpadv.hirnd > 0)
                hp += C.rnd(C.gu.urace.hpadv.hirnd, 1109, "newhp");
        }
        if (acurr(C.A_CON) <= 3)
            conplus = -2;
        else if (acurr(C.A_CON) <= 6)
            conplus = -1;
        else if (acurr(C.A_CON) <= 14)
            conplus = 0;
        else if (acurr(C.A_CON) <= 16)
            conplus = 1;
        else if (acurr(C.A_CON) == 17)
            conplus = 2;
        else if (acurr(C.A_CON) == 18)
            conplus = 3;
        else
            conplus = 4;
        hp += conplus;
    }
    if (hp <= 0)
        hp = 1;
    if (C.u.ulevel < C.MAXULEV) {
        /* remember increment; future level drain could take it away again */
        C.u.uhpinc[C.u.ulevel] =  hp;
    } else {
        /* after level 30, throttle hit point gains from extra experience;
           once max reaches 1200, further increments will be just 1 more */
        let lim = C.schar(5 - Math.trunc(C.u.uhpmax / 300));

        lim = C.max(lim, 1);
        if (hp > lim)
            hp = lim;
    }
    return hp;
}

/* minimum value for uhpmax is ulevel but for life-saving it is always at
   least 10 if ulevel is less than that */
export function minuhpmax(altmin)
{
    if (altmin < 1)
        altmin = 1;
    return C.max(C.u.ulevel, altmin);
}

/* update u.uhpmax or u.mhmax and values of other things that depend upon
   whichever of them is relevant */
export function setuhpmax(newmax, even_when_polyd)
{
    if (!C.Upolyd || even_when_polyd) {
        if (newmax != C.u.uhpmax) {
            C.u.uhpmax = newmax;
            if (C.u.uhpmax > C.u.uhppeak)
                C.u.uhppeak = C.u.uhpmax;
            C.disp.botl = C.TRUE;
        }
        if (C.u.uhp > C.u.uhpmax)
            C.u.uhp = C.u.uhpmax, C.disp.botl = C.TRUE;
    } else { /* Upolyd */
        if (newmax != C.u.mhmax) {
            C.u.mhmax = newmax;
            C.disp.botl = C.TRUE;
        }
        if (C.u.mh > C.u.mhmax)
            C.u.mh = C.u.mhmax, C.disp.botl = C.TRUE;
    }
}

/* called after setuhpmax() when damage is pending;
   if uhpmax (or mhmax) has been reduced, it might have caused uhp (or mh)
   to be reduced too; if so, recalculate pending loss to account for that */
export function adjuhploss(loss, olduhp)
/* pending hp loss */
/* does double duty as oldmh when Upolyd */
{
    if (!C.Upolyd) {
        if (C.u.uhp < olduhp)
            loss -= (olduhp - C.u.uhp);
    } else {
        if (C.u.mh < olduhp)
            loss -= (olduhp - C.u.mh);
    }
    return C.max(loss, 1);
}

/* return the current effective value of a specific characteristic
   (the 'a' in 'acurr()' comes from outdated use of "attribute" for the
   six Str/Dex/&c characteristics; likewise for u.abon, u.atemp, u.acurr) */
export function acurr(chridx)
{
    let tmp, result = 0; /* 'result' will always be reset to positive value */

    C.assert(chridx >= 0 && chridx < C.A_MAX);
    tmp = C.u.abon.a[chridx] + C.u.atemp.a[chridx] + C.u.acurr.a[chridx];

    /* for Strength:  3 <= result <= 125;
       for all others:  3 <= result <= 25 */
    if (chridx == C.A_STR) {
        /* strength value is encoded:  3..18 normal, 19..118 for 18/xx (with
           1 <= xx <= 100), and 119..125 for other characteristics' 19..25;
           STR18(x) yields 18 + x (intended for 0 <= x <= 100; not used here);
           STR19(y) yields 100 + y (intended for 19 <= y <= 25) */
        if (tmp >= C.STR19(25) || (C.uarmg && C.uarmg.otyp == C.GAUNTLETS_OF_POWER))
            result = C.STR19(25); /* 125 */
        else
            /* need non-zero here to avoid 'if(result==0)' below because
               that doesn't deal with Str encoding; the cap of 25 applied
               there would limit Str to 18/07 [18 + 7] */
            result = C.max(tmp, 3);
    } else if (chridx == C.A_CHA) {
        if (tmp < 18 && (C.gy.youmonst.data.mlet == C.S_NYMPH
                         || C.u.umonnum == C.PM_AMOROUS_DEMON))
            result = 18;
    } else if (chridx == C.A_CON) {
        if (C.u_wield_art(C.ART_OGRESMASHER))
            result = 25;
    } else if (chridx == C.A_INT || chridx == C.A_WIS) {
        /* Yes, this may raise Int and/or Wis if hero is sufficiently
           stupid.  There are lower levels of cognition than "dunce". */
        if (C.uarmh && C.uarmh.otyp == C.DUNCE_CAP)
            result = 6;
    } else if (chridx == C.A_DEX) {
        ; /* there aren't any special cases for dexterity */
    }

    if (result == 0) /* none of the special cases applied */
        result = (tmp >= 25) ? 25 : (tmp <= 3) ? 3 : tmp;

    return C.schar(result);
}

/* condense clumsy ACURR(A_STR) value into value that fits into formulas */
export function acurrstr()
{
    let str = acurr(C.A_STR), /* 3..125 after massaging by acurr() */
        result; /* 3..25 */

    if (str <= C.STR18(0)) /* <= 18; max(,3) here is redundant */
        result = C.max(str, 3); /* 3..18 */
    else if (str <= C.STR19(21)) /* <= 121 */
        /* this converts
           18/01..18/31 into 19,
           18/32..18/81 into 20,
           18/82..18/100 and 19..21 into 21 */
        result = 19 + Math.trunc(str / 50); /* map to 19..21 */
    else /* convert 122..125; min(,125) here is redundant */
        result = C.min(str, 125) - 100; /* 22..25 */

    return C.schar(result);
}

/* when wearing (or taking off) an unID'd item, this routine is used
   to distinguish between observable +0 result and no-visible-effect
   due to an attribute not being able to exceed maximum or minimum */
export function extremeattr(attrindx)
/* does attrindx's value match its max or min? */
{
    /* Fixed_abil and racial MINATTR/MAXATTR aren't relevant here */
    let lolimit = 3, hilimit = 25, curval = acurr(attrindx);

    /* upper limit for Str is 25 but its value is encoded differently */
    if (attrindx == C.A_STR) {
        hilimit = C.STR19(25); /* 125 */
        /* lower limit for Str can also be 25 */
        if (C.uarmg && C.uarmg.otyp == C.GAUNTLETS_OF_POWER)
            lolimit = hilimit;
    } else if (attrindx == C.A_CON) {
        if (C.u_wield_art(C.ART_OGRESMASHER))
            lolimit = hilimit;
    }
    /* this exception is hypothetical; the only other worn item affecting
       Int or Wis is another helmet so can't be in use at the same time */
    if (attrindx == C.A_INT || attrindx == C.A_WIS) {
        if (C.uarmh && C.uarmh.otyp == C.DUNCE_CAP)
            hilimit = lolimit = 6;
    }

    /* are we currently at either limit? */
    return (curval == lolimit || curval == hilimit) ? C.TRUE : C.FALSE;
}

/* avoid possible problems with alignment overflow, and provide a centralized
   location for any future alignment limits */
export function adjalign(n)
{
    let newalign = C.u.ualign.record + n;

    if (n < 0) {
        let newabuse = C.uint(C.u.ualign.abuse - n);

        if (newalign < C.u.ualign.record)
            C.u.ualign.record = newalign;
        if (newabuse > C.u.ualign.abuse) {
            C.u.ualign.abuse = newabuse;
            C.adj_erinys(newabuse);
        }
    } else if (newalign > C.u.ualign.record) {
        C.u.ualign.record = newalign;
        if (C.u.ualign.record > C.ALIGNLIM)
            C.u.ualign.record = C.ALIGNLIM;
    }
}

/* change hero's alignment type, possibly losing use of artifacts */
export function uchangealign(newalign, reason)
/* A_CG_CONVERT, A_CG_HELM_ON, or A_CG_HELM_OFF */
{
    let oldalign = C.u.ualign.type;

    C.u.ublessed = 0; /* lose divine protection */
    /* You/Your/pline message with call flush_screen(), triggering bot(),
       so the actual data change needs to come before the message */
    C.disp.botl = C.TRUE; /* status line needs updating */
    if (reason == C.A_CG_CONVERT) {
        /* conversion via altar */
        C.livelog_printf(C.LL_ALIGNMENT, "permanently converted to %s",
                       C.aligns[1 - newalign].adj);
        C.u.ualignbase[C.A_CURRENT] = C.schar(newalign);
        /* worn helm of opposite alignment might block change */
        if (!C.uarmh || C.uarmh.otyp != C.HELM_OF_OPPOSITE_ALIGNMENT)
            C.u.ualign.type = C.u.ualignbase[C.A_CURRENT];
        C.You("have a %ssense of a new direction.",
            (C.u.ualign.type != oldalign) ? "sudden " : "");
    } else {
        /* putting on or taking off a helm of opposite alignment */
        C.u.ualign.type = C.schar(newalign);
        if (reason == C.A_CG_HELM_ON) {
            adjalign(-7); /* for abuse -- record will be cleared shortly */
            C.Your("mind oscillates %s.", C.Hallucination ? "wildly" : "briefly");
            C.make_confused(C.rn1(2, 3, 1346, "uchangealign"), C.FALSE);
            if (C.Is_astralevel(C.u.uz) || ( C.rn2(50, 1347, "uchangealign") < C.u.ualign.abuse))
                C.summon_furies(C.Is_astralevel(C.u.uz) ? 0 : 1);
            /* don't livelog taking it back off */
            C.livelog_printf(C.LL_ALIGNMENT, "used a helm to turn %s",
                           C.aligns[1 - newalign].adj);
        } else if (reason == C.A_CG_HELM_OFF) {
            C.Your("mind is %s.", C.Hallucination
                                    ? "much of a muchness"
                                    : "back in sync with your body");
        }
    }
    if (C.u.ualign.type != oldalign) {
        C.u.ualign.record = 0; /* slate is wiped clean */
        C.retouch_equipment(0);
    }
}

/*attrib.c*/
