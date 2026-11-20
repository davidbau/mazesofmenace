// attrib.js — attribute and intrinsic-ability routines.
// C ref: attrib.c, include/attrib.h
//
// Ported so far: acurrstr(), exercise(), exerper(), exerchk(),
// the innate-ability tables, role_abil(), postadjabil(),
// adjabil(), newhp(), acurr(), adjattrib(), rnd_attr(),
// init_attr_role_redist(), init_attr(), vary_init_attr().

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { near_capacity } from './hack.js';
import { pline } from './display.js';
import {
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, MAXULEV, STR19, FROMEXPER,
    FROMRACE, FROMOUTSIDE, INTRINSIC, SEARCHING, STEALTH, FAST,
    POISON_RES, WARNING, SLEEP_RES, SEE_INVIS, FIRE_RES, COLD_RES, SHOCK_RES,
    TELEPORT_CONTROL, INFRAVISION, A_MAX, STR18, FIXED_ABIL,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, MOD_ENCUMBER,
    HVY_ENCUMBER, EXT_ENCUMBER, CLAIRVOYANT, REGENERATION, SICK, VOMITING,
    CONFUSION, HALLUC, HALLUC_RES, WOUNDED_LEGS, FUMBLING, STUNNED, TIMEOUT,
    LUCKMIN, LUCKMAX,
} from './const.js';
import {
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT,
    PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST,
    PM_VALKYRIE, PM_WIZARD, PM_ELF, PM_ORC, PM_HUMAN, PM_DWARF, PM_GNOME,
    PM_AMOROUS_DEMON, S_NYMPH, M2_STRONG,
} from './monsters.js';
import { GAUNTLETS_OF_POWER, DUNCE_CAP } from './objects.js';
import { ART_OGRESMASHER } from './artilist.js';
import { aligns } from './role.js';

// C ref: attrib.h ABASE(), ABON(), AMAX(), ATEMP()
export function ABASE(x) { return game.u.acurr.a[x]; }
export function ABON(x) { return game.u.abon.a[x]; }
export function AMAX(x) { return game.u.amax.a[x]; }
export function ATEMP(x) { return game.u.atemp.a[x]; }
// C ref: attrib.h ACURR(x) -- (acurr(x))
export function ACURR(x) { return acurr(x); }

/* The innate-ability tables. In C, 'ability' points at the intrinsic
   field of a hero property (e.g. &(HSearching), which is
   &u.uprops[SEARCHING].intrinsic); here it is that property's index. */
// C ref: attrib.c arc_abil[] .. hum_abil[]
const arc_abil = [ { ulevel: 1, ability: SEARCHING, gainstr: "", losestr: "" },
                   { ulevel: 5, ability: STEALTH, gainstr: "stealthy", losestr: "" },
                   { ulevel: 10, ability: FAST, gainstr: "quick", losestr: "slow" },
                   { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  bar_abil = [ { ulevel: 1, ability: POISON_RES, gainstr: "", losestr: "" },
               { ulevel: 7, ability: FAST, gainstr: "quick", losestr: "slow" },
               { ulevel: 15, ability: STEALTH, gainstr: "stealthy", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  cav_abil = [ { ulevel: 7, ability: FAST, gainstr: "quick", losestr: "slow" },
               { ulevel: 15, ability: WARNING, gainstr: "sensitive", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  hea_abil = [ { ulevel: 1, ability: POISON_RES, gainstr: "", losestr: "" },
               { ulevel: 15, ability: WARNING, gainstr: "sensitive", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  kni_abil = [ { ulevel: 7, ability: FAST, gainstr: "quick", losestr: "slow" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  mon_abil = [ { ulevel: 1, ability: FAST, gainstr: "", losestr: "" },
               { ulevel: 1, ability: SLEEP_RES, gainstr: "", losestr: "" },
               { ulevel: 1, ability: SEE_INVIS, gainstr: "", losestr: "" },
               { ulevel: 3, ability: POISON_RES, gainstr: "healthy", losestr: "" },
               { ulevel: 5, ability: STEALTH, gainstr: "stealthy", losestr: "" },
               { ulevel: 7, ability: WARNING, gainstr: "sensitive", losestr: "" },
               { ulevel: 9, ability: SEARCHING, gainstr: "perceptive", losestr: "unaware" },
               { ulevel: 11, ability: FIRE_RES, gainstr: "cool", losestr: "warmer" },
               { ulevel: 13, ability: COLD_RES, gainstr: "warm", losestr: "cooler" },
               { ulevel: 15, ability: SHOCK_RES, gainstr: "insulated", losestr: "conductive" },
               { ulevel: 17, ability: TELEPORT_CONTROL, gainstr: "controlled", losestr: "uncontrolled" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  pri_abil = [ { ulevel: 15, ability: WARNING, gainstr: "sensitive", losestr: "" },
               { ulevel: 20, ability: FIRE_RES, gainstr: "cool", losestr: "warmer" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  ran_abil = [ { ulevel: 1, ability: SEARCHING, gainstr: "", losestr: "" },
               { ulevel: 7, ability: STEALTH, gainstr: "stealthy", losestr: "" },
               { ulevel: 15, ability: SEE_INVIS, gainstr: "", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  rog_abil = [ { ulevel: 1, ability: STEALTH, gainstr: "", losestr: "" },
               { ulevel: 10, ability: SEARCHING, gainstr: "perceptive", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  sam_abil = [ { ulevel: 1, ability: FAST, gainstr: "", losestr: "" },
               { ulevel: 15, ability: STEALTH, gainstr: "stealthy", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  tou_abil = [ { ulevel: 10, ability: SEARCHING, gainstr: "perceptive", losestr: "" },
               { ulevel: 20, ability: POISON_RES, gainstr: "hardy", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  val_abil = [ { ulevel: 1, ability: COLD_RES, gainstr: "", losestr: "" },
               { ulevel: 3, ability: STEALTH, gainstr: "stealthy", losestr: "" },
               { ulevel: 7, ability: FAST, gainstr: "quick", losestr: "slow" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  wiz_abil = [ { ulevel: 15, ability: WARNING, gainstr: "sensitive", losestr: "" },
               { ulevel: 17, ability: TELEPORT_CONTROL, gainstr: "controlled", losestr: "uncontrolled" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  /* Intrinsics conferred by race */
  dwa_abil = [ { ulevel: 1, ability: INFRAVISION, gainstr: "", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  elf_abil = [ { ulevel: 1, ability: INFRAVISION, gainstr: "", losestr: "" },
               { ulevel: 4, ability: SLEEP_RES, gainstr: "awake", losestr: "tired" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  gno_abil = [ { ulevel: 1, ability: INFRAVISION, gainstr: "", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  orc_abil = [ { ulevel: 1, ability: INFRAVISION, gainstr: "", losestr: "" },
               { ulevel: 1, ability: POISON_RES, gainstr: "", losestr: "" },
               { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ],

  hum_abil = [ { ulevel: 0, ability: 0, gainstr: 0, losestr: 0 } ];

// C ref: attrib.c postadjabil()
function postadjabil(ability) {
    if (!game.u.ulevel) /* initializing hero; don't attempt screen update yet */
        return;
    if (ability === WARNING || ability === SEE_INVIS)
        throw new Error('postadjabil(): see_monsters() not ported yet');
}

// C ref: attrib.c role_abil()
function role_abil(r) {
    const roleabils = [
        { role: PM_ARCHEOLOGIST, abil: arc_abil },
        { role: PM_BARBARIAN, abil: bar_abil },
        { role: PM_CAVE_DWELLER, abil: cav_abil },
        { role: PM_HEALER, abil: hea_abil },
        { role: PM_KNIGHT, abil: kni_abil },
        { role: PM_MONK, abil: mon_abil },
        { role: PM_CLERIC, abil: pri_abil },
        { role: PM_RANGER, abil: ran_abil },
        { role: PM_ROGUE, abil: rog_abil },
        { role: PM_SAMURAI, abil: sam_abil },
        { role: PM_TOURIST, abil: tou_abil },
        { role: PM_VALKYRIE, abil: val_abil },
        { role: PM_WIZARD, abil: wiz_abil },
        { role: 0, abil: null },
    ];
    let i;

    for (i = 0; roleabils[i].abil && roleabils[i].role !== r; i++)
        continue;
    return roleabils[i].abil;
}

// C ref: attrib.c adjabil()
export function adjabil(oldlevel, newlevel) {
    const u = game.u;
    let abil, rabil;
    let ai = 0; /* index into abil[], standing in for the C pointer */
    let prevabil, mask = FROMEXPER;

    abil = role_abil(game.urole.mnum); /* Role_switch */

    switch (game.urace.mnum) { /* Race_switch */
    case PM_ELF:
        rabil = elf_abil;
        break;
    case PM_ORC:
        rabil = orc_abil;
        break;
    case PM_HUMAN:
    case PM_DWARF:
    case PM_GNOME:
    default:
        rabil = null;
        break;
    }

    while (abil || rabil) {
        /* Have we finished with the intrinsics list? */
        if (!abil || !abil[ai].ability) {
            /* Try the race intrinsics */
            if (!rabil || !rabil[0].ability)
                break;
            abil = rabil;
            ai = 0;
            rabil = null;
            mask = FROMRACE;
        }
        const a = abil[ai];
        const prop = u.uprops[a.ability];
        prevabil = prop.intrinsic;
        if (oldlevel < a.ulevel && newlevel >= a.ulevel) {
            /* Abilities gained at level 1 can never be lost
             * via level loss, only via means that remove _any_
             * sort of ability.  A "gain" of such an ability from
             * an outside source is devoid of meaning, so we set
             * FROMOUTSIDE to avoid such gains.
             */
            if (a.ulevel === 1)
                prop.intrinsic |= (mask | FROMOUTSIDE);
            else
                prop.intrinsic |= mask;
            if (!(prop.intrinsic & INTRINSIC & ~mask)) {
                if (a.gainstr)
                    throw new Error('adjabil(): You_feel() not ported yet');
            }
        } else if (oldlevel >= a.ulevel && newlevel < a.ulevel) {
            prop.intrinsic &= ~mask;
            if (!(prop.intrinsic & INTRINSIC)) {
                if (a.losestr || a.gainstr)
                    throw new Error('adjabil(): You_feel() not ported yet');
            }
        }
        if (prevabil !== prop.intrinsic) /* it changed */
            postadjabil(a.ability);
        ai++;
    }

    if (oldlevel > 0) {
        throw new Error('adjabil(): add_weapon_skill()/lose_weapon_skill() not ported yet');
    }
}

// C ref: attrib.c newhp()
/* called when gaining a level (before u.ulevel gets incremented);
   also called with u.ulevel==0 during hero initialization or for
   re-init if hero turns into a "new man/woman/elf/&c" */
export function newhp() {
    const g = game;
    const u = g.u, urole = g.urole, urace = g.urace;
    let hp, conplus;

    if (u.ulevel === 0) {
        /* Initialize hit points */
        hp = urole.hpadv.infix + urace.hpadv.infix;
        if (urole.hpadv.inrnd > 0)
            hp += rnd(urole.hpadv.inrnd);
        if (urace.hpadv.inrnd > 0)
            hp += rnd(urace.hpadv.inrnd);
        if (g.moves === 0) { /* initial hero; skip for polyself to new man */
            /* Initialize alignment stuff */
            u.ualign.type = aligns[g.flags.initalign].value;
            u.ualign.record = urole.initrecord;
        }
        /* no Con adjustment for initial hit points */
    } else {
        if (u.ulevel < urole.xlev) {
            hp = urole.hpadv.lofix + urace.hpadv.lofix;
            if (urole.hpadv.lornd > 0)
                hp += rnd(urole.hpadv.lornd);
            if (urace.hpadv.lornd > 0)
                hp += rnd(urace.hpadv.lornd);
        } else {
            hp = urole.hpadv.hifix + urace.hpadv.hifix;
            if (urole.hpadv.hirnd > 0)
                hp += rnd(urole.hpadv.hirnd);
            if (urace.hpadv.hirnd > 0)
                hp += rnd(urace.hpadv.hirnd);
        }
        if (ACURR(A_CON) <= 3)
            conplus = -2;
        else if (ACURR(A_CON) <= 6)
            conplus = -1;
        else if (ACURR(A_CON) <= 14)
            conplus = 0;
        else if (ACURR(A_CON) <= 16)
            conplus = 1;
        else if (ACURR(A_CON) === 17)
            conplus = 2;
        else if (ACURR(A_CON) === 18)
            conplus = 3;
        else
            conplus = 4;
        hp += conplus;
    }
    if (hp <= 0)
        hp = 1;
    if (u.ulevel < MAXULEV) {
        /* remember increment; future level drain could take it away again */
        u.uhpinc[u.ulevel] = hp;
    } else {
        /* after level 30, throttle hit point gains from extra experience;
           once max reaches 1200, further increments will be just 1 more */
        let lim = 5 - Math.trunc(u.uhpmax / 300);

        lim = Math.max(lim, 1);
        if (hp > lim)
            hp = lim;
    }
    return hp;
}

// C ref: attrib.c acurr()
/* return the current effective value of a specific characteristic */
export function acurr(chridx) {
    const g = game;
    const u = g.u;
    let tmp, result = 0; /* 'result' will always be reset to positive value */

    tmp = u.abon.a[chridx] + u.atemp.a[chridx] + u.acurr.a[chridx];

    /* for Strength:  3 <= result <= 125;
       for all others:  3 <= result <= 25 */
    if (chridx === A_STR) {
        if (tmp >= STR19(25) || (g.uarmg && g.uarmg.otyp === GAUNTLETS_OF_POWER))
            result = STR19(25); /* 125 */
        else
            /* need non-zero here to avoid 'if(result==0)' below because
               that doesn't deal with Str encoding; the cap of 25 applied
               there would limit Str to 18/07 [18 + 7] */
            result = Math.max(tmp, 3);
    } else if (chridx === A_CHA) {
        if (tmp < 18 && (g.youmonst.data.mlet === S_NYMPH
                         || u.umonnum === PM_AMOROUS_DEMON))
            result = 18;
    } else if (chridx === A_CON) {
        /* u_wield_art(ART_OGRESMASHER) */
        if (g.uwep && g.uwep.oartifact === ART_OGRESMASHER)
            result = 25;
    } else if (chridx === A_INT || chridx === A_WIS) {
        /* Yes, this may raise Int and/or Wis if hero is sufficiently
           stupid.  There are lower levels of cognition than "dunce". */
        if (g.uarmh && g.uarmh.otyp === DUNCE_CAP)
            result = 6;
    } else if (chridx === A_DEX) {
        ; /* there aren't any special cases for dexterity */
    }

    if (result === 0) /* none of the special cases applied */
        result = (tmp >= 25) ? 25 : (tmp <= 3) ? 3 : tmp;

    return result;
}

// C ref: attrib.h ATTRMAX(), ATTRMIN()
export function ATTRMAX(x) {
    return ((x === A_STR && game.u.mtimedone && strongmonst(game.youmonst.data))
            ? STR18(100) : game.urace.attrmax[x]);
}
export function ATTRMIN(x) { return game.urace.attrmin[x]; }
// C ref: mondata.h strongmonst()
function strongmonst(ptr) { return (ptr.mflags2 & M2_STRONG) !== 0; }
// C ref: youprop.h Fixed_abil
function Fixed_abil() {
    const p = game.u.uprops[FIXED_ABIL];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: attrib.c adjattrib()
/* adjust an attribute; return True if change is made, False otherwise */
export function adjattrib(ndx,    /* which characteristic */
                          incr,   /* amount of change */
                          msgflg) /* positive => no message, zero => message,
                                   * and negative => conditional (msg if
                                   * change made) */ {
    const u = game.u;
    let old_acurr, decr;

    if (Fixed_abil() || !incr)
        return false;

    if ((ndx === A_INT || ndx === A_WIS) && game.uarmh
        && game.uarmh.otyp === DUNCE_CAP) {
        /* "Your cap constricts briefly, then relaxes again." (msgflg 0):
           messages are not ported yet */
        return false;
    }

    old_acurr = ACURR(ndx);
    u.acurr.a[ndx] += incr; /* when incr is negative, this reduces ABASE() */
    if (incr > 0) {
        if (ABASE(ndx) > AMAX(ndx)) {
            u.amax.a[ndx] = ABASE(ndx);
            if (AMAX(ndx) > ATTRMAX(ndx))
                u.acurr.a[ndx] = u.amax.a[ndx] = ATTRMAX(ndx);
        }
    } else { /* incr is negative */
        if (ABASE(ndx) < ATTRMIN(ndx)) {
            /*
             * If base value has dropped so low that it is trying to be
             * taken below the minimum, reduce max value (peak reached)
             * instead.
             */
            decr = rn2(ATTRMIN(ndx) - ABASE(ndx) + 1);
            u.acurr.a[ndx] = ATTRMIN(ndx);
            u.amax.a[ndx] -= decr;
            if (AMAX(ndx) < ATTRMIN(ndx))
                u.amax.a[ndx] = ATTRMIN(ndx);
        }
    }
    if (ACURR(ndx) === old_acurr) {
        /* "You're already as <attr> as you can get." / "Your innate <attr>
           has improved." (msgflg 0): messages are not ported yet */
        return false;
    }

    /* Any successful change also resets abuse / exercise level */
    u.aexe.a[ndx] = 0;

    game.disp_botl = true;
    /* You_feel("%s%s!", ...) for msgflg <= 0 and encumber_msg() once
       in_moveloop: messages are not ported yet */
    return true;
}

// C ref: attrib.c rnd_attr()
/* return random hero attribute (by role's attr distribution).
   returns A_MAX if failed. */
function rnd_attr() {
    let i, x = rn2(100);

    /* 5.0: the x -= ... calculation used to have an off by 1 error that
       resulted in the values being biased toward Str and away from Cha */
    for (i = 0; i < A_MAX; ++i)
        if ((x -= game.urole.attrdist[i]) < 0)
            break;
    return i;
}

// C ref: attrib.c init_attr_role_redist()
/* add or subtract np points from random attributes,
   adjusting the base and maximum values of the attributes.
   if subtracting, np must be negative.
   returns the left over points. */
function init_attr_role_redist(np, addition) {
    const u = game.u;
    let tryct = 0;
    const adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        const i = rnd_attr();

        if (i >= A_MAX
            || (addition ? (ABASE(i) >= ATTRMAX(i))
                         : (ABASE(i) <= ATTRMIN(i)))) {
            tryct++;
            continue;
        }
        tryct = 0;
        u.acurr.a[i] += adj;
        u.amax.a[i] += adj;
        np -= adj;
    }
    return np;
}

// C ref: attrib.c init_attr()
/* allocate hero's initial characteristics */
export function init_attr(np) {
    const u = game.u;
    let i;

    for (i = 0; i < A_MAX; i++) {
        u.acurr.a[i] = u.amax.a[i] = game.urole.attrbase[i];
        u.atemp.a[i] = u.atime.a[i] = 0;
        np -= game.urole.attrbase[i];
    }

    /* distribute leftover points */
    np = init_attr_role_redist(np, true);
    /* if we went over, remove points */
    np = init_attr_role_redist(np, false);
}

// C ref: attrib.c vary_init_attr()
/* apply minor variation to attributes */
export function vary_init_attr() {
    const u = game.u;
    let i;

    for (i = 0; i < A_MAX; i++)
        if (!rn2(20)) {
            const xd = rn2(7) - 2; /* biased variation */

            adjattrib(i, xd, true);
            if (ABASE(i) < AMAX(i))
                u.amax.a[i] = ABASE(i);
        }
}

// C ref: attrib.c acurrstr()
/* condense clumsy ACURR(A_STR) value into value that fits into formulas */
export function acurrstr() {
    const str = ACURR(A_STR); /* 3..125 after massaging by acurr() */
    let result; /* 3..25 */

    if (str <= STR18(0)) /* <= 18; max(,3) here is redundant */
        result = Math.max(str, 3); /* 3..18 */
    else if (str <= STR19(21)) /* <= 121 */
        /* this converts
           18/01..18/31 into 19,
           18/32..18/81 into 20,
           18/82..18/100 and 19..21 into 21 */
        result = 19 + Math.trunc(str / 50); /* map to 19..21 */
    else /* convert 122..125; min(,125) here is redundant */
        result = Math.min(str, 125) - 100; /* 22..25 */

    return result;
}

// C ref: role.h Role_if()
function Role_if(pm) { return game.urole.mnum === pm; }

const AVAL = 50; /* tune value for exercise gains */

/* C ref: attrib.h AEXE() */
function AEXE(x) { return game.u.aexe.a[x]; }

// C ref: attrib.c exercise()
export function exercise(i, inc_or_dec) {
    const u = game.u;

    /* debugpline0("Exercise:"); */
    if (i === A_INT || i === A_CHA)
        return; /* can't exercise these */

    /* no physical exercise while polymorphed; the body's temporary */
    if (u.umonnum !== u.umonster /* Upolyd */ && i !== A_WIS)
        return;

    if (Math.abs(AEXE(i)) < AVAL) {
        /*
         *      Law of diminishing returns (Part I):
         *
         *      Gain is harder at higher attribute values.
         *      79% at "3" --> 0% at "18"
         *      Loss is even at all levels (50%).
         *
         *      Note: *YES* ACURR is the right one to use.
         */
        u.aexe.a[i] += (inc_or_dec) ? ((rn2(19) > ACURR(i)) ? 1 : 0) : -rn2(2);
    }
    if (game.moves > 0 && (i === A_STR || i === A_CON)) {
        /* encumber_msg(): messages about encumbrance changes are not
           ported yet (no rolls) */
    }
}

// C ref: attrib.c exerper()
/* hunger values - from eat.c */
function exerper() {
    const g = game;
    const u = g.u;
    const uprops = u.uprops;

    if (!(g.moves % 10)) {
        /* Hunger Checks */
        const hs = (u.uhunger > 1000) ? SATIATED
                 : (u.uhunger > 150) ? NOT_HUNGRY
                   : (u.uhunger > 50) ? HUNGRY
                     : (u.uhunger > 0) ? WEAK
                       : FAINTING;

        /* debugpline0("exerper: Hunger checks"); */
        switch (hs) {
        case SATIATED:
            exercise(A_DEX, false);
            if (Role_if(PM_MONK))
                exercise(A_WIS, false);
            break;
        case NOT_HUNGRY:
            exercise(A_CON, true);
            break;
        case WEAK:
            exercise(A_STR, false);
            if (Role_if(PM_MONK)) /* fasting */
                exercise(A_WIS, true);
            break;
        case FAINTING:
        case FAINTED:
            exercise(A_CON, false);
            break;
        }

        /* Encumbrance Checks */
        /* debugpline0("exerper: Encumber checks"); */
        switch (near_capacity()) {
        case MOD_ENCUMBER:
            exercise(A_STR, true);
            break;
        case HVY_ENCUMBER:
            exercise(A_STR, true);
            exercise(A_DEX, false);
            break;
        case EXT_ENCUMBER:
            exercise(A_DEX, false);
            exercise(A_CON, false);
            break;
        }
    }

    /* status checks */
    if (!(g.moves % 5)) {
        /* C ref: youprop.h property macros */
        const HClairvoyant = uprops[CLAIRVOYANT].intrinsic;
        const BClairvoyant = uprops[CLAIRVOYANT].blocked;
        const HRegeneration = uprops[REGENERATION].intrinsic;
        const Sick = uprops[SICK].intrinsic;
        const Vomiting = uprops[VOMITING].intrinsic;
        const Confusion = uprops[CONFUSION].intrinsic;
        const Hallucination = uprops[HALLUC].intrinsic
            && !(uprops[HALLUC_RES].intrinsic || uprops[HALLUC_RES].extrinsic);
        const Wounded_legs = uprops[WOUNDED_LEGS].intrinsic
            || uprops[WOUNDED_LEGS].extrinsic;
        const Fumbling = uprops[FUMBLING].intrinsic || uprops[FUMBLING].extrinsic;
        const HStun = uprops[STUNNED].intrinsic;

        /* debugpline0("exerper: Status checks"); */
        if ((HClairvoyant & (INTRINSIC | TIMEOUT)) && !BClairvoyant)
            exercise(A_WIS, true);
        if (HRegeneration)
            exercise(A_STR, true);

        if (Sick || Vomiting)
            exercise(A_CON, false);
        if (Confusion || Hallucination)
            exercise(A_WIS, false);
        if ((Wounded_legs && !u.usteed) || Fumbling || HStun)
            exercise(A_DEX, false);
    }
}

/* exercise/abuse text (must be in attribute order, not botl order);
   phrased as "You must have been [][0]." or "You haven't been [][1]." */
const exertext = [
    [ "exercising diligently", "exercising properly" ],           /* Str */
    [ null, null ],                                               /* Int */
    [ "very observant", "paying attention" ],                     /* Wis */
    [ "working on your reflexes", "working on reflexes lately" ], /* Dex */
    [ "leading a healthy life-style", "watching your health" ],   /* Con */
    [ null, null ],                                               /* Cha */
];

// C ref: attrib.c exerchk()
export async function exerchk() {
    const g = game;
    const u = g.u;
    let i, ax, mod_val, lolim, hilim;

    /*  Check out the periodic accumulations */
    exerper();

    /*  Are we ready for a test? */
    if (g.moves >= g.context.next_attrib_check && !g.multi) {
        /* debugpline0("exerchk: testing."); */
        /*
         *      Law of diminishing returns (Part II):
         *
         *      The effects of "exercise" and "abuse" wear
         *      off over time.  Even if you *don't* get an
         *      increase/decrease, you lose some of the
         *      accumulated effects.
         */
        for (i = 0; i < A_MAX; ++i) {
            ax = AEXE(i);
            /* nothing to do here if no exercise or abuse has occurred
               (Int and Cha always fall into this category) */
            if (!ax)
                continue; /* ok to skip nextattrib */

            mod_val = Math.sign(ax); /* +1 or -1; used below */
            /* no further effect for exercise if at max or abuse if at min;
               can't exceed 18 via exercise even if actual max is higher */
            lolim = ATTRMIN(i); /* usually 3; might be higher */
            hilim = ATTRMAX(i); /* usually 18; maybe lower or higher */
            if (hilim > 18)
                hilim = 18;
            nextattrib: {
                if ((ax < 0) ? (ABASE(i) <= lolim) : (ABASE(i) >= hilim))
                    break nextattrib;
                /* can't exercise non-Wisdom while polymorphed; previous
                   exercise/abuse gradually wears off without impact then */
                if (u.umonnum !== u.umonster /* Upolyd */ && i !== A_WIS)
                    break nextattrib;

                /*
                 *  Law of diminishing returns (Part III):
                 *
                 *  You don't *always* gain by exercising.
                 *  [MRS 92/10/28 - Treat Wisdom specially for balance.]
                 */
                if (rn2(AVAL) > ((i !== A_WIS) ? Math.trunc(Math.abs(ax) * 2 / 3)
                                               : Math.abs(ax)))
                    break nextattrib;

                /* debugpline1("exerchk: changing %d.", i); */
                if (adjattrib(i, mod_val, -1)) {
                    /* if you actually changed an attrib - zero accumulation */
                    u.aexe.a[i] = ax = 0;
                    /* then print an explanation */
                    await pline(`You ${(mod_val > 0) ? "must have been" : "haven't been"} ${
                        exertext[i][(mod_val > 0) ? 0 : 1]}.`);
                }
            }
            /* nextattrib: */
            /* this used to be ``AEXE(i) /= 2'' but that would produce
               platform-dependent rounding/truncation for negative vals */
            u.aexe.a[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
        }
        g.context.next_attrib_check += rn1(200, 800);
        /* debugpline1("exerchk: next check at %ld.", ...); */
    }
}

// C ref: attrib.c change_luck()
export function change_luck(n) {
    const u = game.u;
    u.uluck += n;
    if (u.uluck < 0 && u.uluck < LUCKMIN)
        u.uluck = LUCKMIN;
    if (u.uluck > 0 && u.uluck > LUCKMAX)
        u.uluck = LUCKMAX;
}
