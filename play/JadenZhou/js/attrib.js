// attrib.js — attribute and intrinsic-ability routines.
// C ref: attrib.c, include/attrib.h
//
// Ported so far: acurrstr(), exercise(), exerper(), exerchk(),
// the innate-ability tables, role_abil(), postadjabil(),
// check_innate_abil(), innately(), is_innate(), from_what(),
// adjabil(), newhp(), acurr(), adjattrib(), rnd_attr(),
// init_attr_role_redist(), init_attr(), vary_init_attr().

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { near_capacity } from './hack.js';
import { strstri } from './hacklib.js';
import { pline, see_monsters } from './display.js';
import {
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, MAXULEV, STR19, FROMEXPER,
    FROMRACE, FROMOUTSIDE, INTRINSIC, SEARCHING, STEALTH, FAST,
    POISON_RES, WARNING, SLEEP_RES, SEE_INVIS, FIRE_RES, COLD_RES, SHOCK_RES,
    TELEPORT_CONTROL, INFRAVISION, A_MAX, STR18, FIXED_ABIL,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, MOD_ENCUMBER,
    HVY_ENCUMBER, EXT_ENCUMBER, CLAIRVOYANT, REGENERATION, SICK, VOMITING,
    CONFUSION, HALLUC, HALLUC_RES, WOUNDED_LEGS, FUMBLING, STUNNED, TIMEOUT,
    LUCKMIN, LUCKMAX, FROMFORM, DRAIN_RES, JUMPING, BLINDED,
    BLND_RES, DEAF, STRANGLED, INVIS, W_ARMF, W_ARMC, W_ARMH, FACE, ismnum,
} from './const.js';
import {
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT,
    PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST,
    PM_VALKYRIE, PM_WIZARD, PM_ELF, PM_ORC, PM_HUMAN, PM_DWARF, PM_GNOME,
    PM_AMOROUS_DEMON, S_NYMPH, M2_STRONG, M1_NOEYES,
} from './monsters.js';
import { GAUNTLETS_OF_POWER, DUNCE_CAP, LUCKSTONE, objects } from './objects.js';
import { ART_OGRESMASHER, ART_EYES_OF_THE_OVERWORLD } from './artilist.js';
import { what_gives } from './artifact.js';
import { ysimple_name, bare_artifactname } from './iactions.js';
import { body_part } from './insight.js';
import { LUCKADD } from './const.js';
import { confers_luck } from './timeout.js';
import { carrying } from './invent.js';
import { aligns } from './role.js';
import { add_weapon_skill, lose_weapon_skill } from './weapon.js';
import { losehp } from './trap.js';
import { d } from './rng.js';
import { strncmpi } from './hacklib.js';
import { name_to_mon } from './mondata.js';
import { KILLED_BY, KILLED_BY_AN, DIED, POISONING } from './const.js';
import { done } from './end.js';
import { killer } from './topten.js';
import { mons, G_UNIQ, M2_PNAME, PM_ERINYS, M1_SEE_INVIS, M1_AMPHIBIOUS, M1_FLY,
         M1_REGEN, M1_TPORT_CNTRL, M1_TPORT, AT_WEAP, AD_DRST, AT_MAGC,
         AD_SPEL } from './monsters.js';
import { the } from './iactions.js';
import { encumber_msg } from './pickup.js';
import { TOWEL } from './objects.js';
import { Fixed_abil, Unaware, Half_gas_damage } from './youprop.js';
import { Role_if } from './const.js';

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
        see_monsters();
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

// C ref: attrib.c check_innate_abil() -- 'ability' is the property
// index standing in for C's &u.uprops[propidx].intrinsic
function check_innate_abil(ability, frommask) {
    let abil = null;

    if (frommask === FROMEXPER)
        abil = role_abil(game.urole.mnum); /* Role_switch */
    else if (frommask === FROMRACE)
        switch (game.urace.mnum) { /* Race_switch */
        case PM_DWARF:
            abil = dwa_abil;
            break;
        case PM_ELF:
            abil = elf_abil;
            break;
        case PM_GNOME:
            abil = gno_abil;
            break;
        case PM_ORC:
            abil = orc_abil;
            break;
        case PM_HUMAN:
            abil = hum_abil;
            break;
        default:
            break;
        }

    for (let i = 0; abil && abil[i].ability; i++) {
        if ((abil[i].ability === ability) && (game.u.ulevel >= abil[i].ulevel))
            return abil[i];
    }
    return null;
}

/* reasons for innate ability */
const FROM_NONE = 0;
const FROM_ROLE = 1; /* from experience at level 1 */
const FROM_RACE = 2;
const FROM_INTR = 3; /* intrinsically (eating some corpse or prayer reward) */
const FROM_EXP = 4;  /* from experience for some level > 1 */
const FROM_FORM = 5;
const FROM_LYCN = 6;

// C ref: attrib.c innately() -- 'ability' is the property index
/* check whether particular ability has been obtained via innate attribute */
function innately(ability) {
    let iptr;
    const intrinsic = game.u.uprops[ability].intrinsic;

    if ((iptr = check_innate_abil(ability, FROMEXPER)) !== null)
        return (iptr.ulevel === 1) ? FROM_ROLE : FROM_EXP;
    if ((iptr = check_innate_abil(ability, FROMRACE)) !== null)
        return FROM_RACE;
    if ((intrinsic & FROMOUTSIDE) !== 0)
        return FROM_INTR;
    if ((intrinsic & FROMFORM) !== 0)
        return FROM_FORM;
    return FROM_NONE;
}

// C ref: attrib.c is_innate()
export function is_innate(propidx) {
    const u = game.u;
    let innateness;
    /* youprop.h Very_fast */
    const Very_fast = ((u.uprops[FAST].intrinsic & ~INTRINSIC)
                       || u.uprops[FAST].extrinsic);

    /* innately() would report FROM_FORM for this; caller wants specificity */
    if (propidx === DRAIN_RES && ismnum(u.ulycn))
        return FROM_LYCN;
    if (propidx === FAST && Very_fast)
        return FROM_NONE; /* can't become very fast innately */
    if ((innateness = innately(propidx)) !== FROM_NONE)
        return innateness;
    if (propidx === JUMPING && game.urole.mnum === PM_KNIGHT /* Role_if() */
        /* knight has intrinsic jumping, but extrinsic is more versatile so
           ignore innateness if equipment is going to claim responsibility */
        && !u.uprops[propidx].extrinsic)
        return FROM_ROLE;
    if ((propidx === BLINDED && (game.youmonst.data.mflags1 & M1_NOEYES))
                                                         /* !haseyes() */
        || (propidx === BLND_RES
            && (u.uprops[BLND_RES].intrinsic & FROMFORM) !== 0))
        return FROM_FORM;
    return FROM_NONE;
}

// C ref: attrib.c from_what()
export function from_what(propidx) /* special cases can have negative values */ {
    const u = game.u;
    const wizard = !!game.flags.debug;
    let buf = "";

    /*
     * Restrict the source of the attributes just to debug mode for now
     */
    if (wizard) {
        const because_of = (s) => ` because of ${s}`;

        if (propidx >= 0) {
            let p;
            let obj = null;
            const innateness = is_innate(propidx);
            const HFast = u.uprops[FAST].intrinsic, EFast = u.uprops[FAST].extrinsic;
            const Very_fast = ((HFast & ~INTRINSIC) || EFast);
            const HBlinded = u.uprops[BLINDED].intrinsic;
            const EBlinded = u.uprops[BLINDED].extrinsic;
            const BBlinded = u.uprops[BLINDED].blocked;
            const Blindfolded_only = EBlinded && !(HBlinded && !BBlinded);

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
            if ((propidx === BLINDED && u.uroleplay.blind)
                || (propidx === DEAF && u.uroleplay.deaf))
                buf = " from birth";
            else if (innateness === FROM_ROLE || innateness === FROM_RACE)
                buf = " innately";
            else if (innateness === FROM_INTR) /* [].intrinsic & FROMOUTSIDE */
                buf = " intrinsically";
            else if (innateness === FROM_EXP)
                buf = " because of your experience";
            else if (innateness === FROM_LYCN)
                buf = " due to your lycanthropy";
            else if (innateness === FROM_FORM)
                buf = " from your creature form";
            else if (propidx === FAST && Very_fast)
                buf = because_of(((HFast & TIMEOUT) !== 0) ? "a potion or spell"
                          : ((EFast & W_ARMF) !== 0 && game.uarmf.dknown
                             && objects[game.uarmf.otyp].oc_name_known)
                              ? ysimple_name(game.uarmf) /* speed boots */
                                : EFast ? "worn equipment"
                                  : "something");
            else if (wizard
                     && (obj = what_gives(propidx /* &[].extrinsic */)) !== null)
                buf = because_of(obj.oartifact ? bare_artifactname(obj)
                                               : ysimple_name(obj));
            else if (propidx === BLINDED && Blindfolded_only)
                buf = because_of(ysimple_name(game.ublindf));
            else if (propidx === BLINDED && u.ucreamed
                     && (HBlinded & TIMEOUT) === u.ucreamed
                     && !EBlinded && !(HBlinded & ~TIMEOUT))
                buf = `due to goop covering your ${body_part(FACE)}`;

            /* remove some verbosity and/or redundancy */
            if ((p = strstri(buf, " pair of ")) >= 0)
                buf = buf.slice(0, p + 1) + buf.slice(p + 9); /* copynchars() */
            else if (propidx === STRANGLED
                     && (p = strstri(buf, " of strangulation")) >= 0)
                buf = buf.slice(0, p);

        } else { /* negative property index */
            /* if more blocking capabilities get implemented we'll need to
               replace this with what_blocks() comparable to what_gives() */
            switch (-propidx) {
            case BLINDED:
                /* wearing the Eyes of the Overworld overrides blindness */
                if (u.uprops[BLINDED].blocked && game.ublindf
                    && game.ublindf.oartifact === ART_EYES_OF_THE_OVERWORLD)
                    buf = because_of(bare_artifactname(game.ublindf));
                break;
            case INVIS:
                if (u.uprops[INVIS].blocked & W_ARMC)
                    buf = because_of(ysimple_name(game.uarmc)); /* mummy wrapping */
                break;
            case CLAIRVOYANT:
                if (wizard && (u.uprops[CLAIRVOYANT].blocked & W_ARMH))
                    buf = because_of(ysimple_name(game.uarmh)); /* cornuthaum */
                break;
            }
        }

    } /*wizard*/
    return buf;
}

// C ref: attrib.c adjabil()
// async for its "You feel ..." messages and add_weapon_skill(); hero
// initialization's adjabil(0, 1) reaches neither, so it completes before
// returning there
export async function adjabil(oldlevel, newlevel) {
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
                    await pline(`You feel ${a.gainstr}!`);
            }
        } else if (oldlevel >= a.ulevel && newlevel < a.ulevel) {
            prop.intrinsic &= ~mask;
            if (!(prop.intrinsic & INTRINSIC)) {
                if (a.losestr)
                    await pline(`You feel ${a.losestr}!`);
                else if (a.gainstr)
                    await pline(`You feel less ${a.gainstr}!`);
            }
        }
        if (prevabil !== prop.intrinsic) /* it changed */
            postadjabil(a.ability);
        ai++;
    }

    if (oldlevel > 0) {
        if (newlevel > oldlevel)
            await add_weapon_skill(newlevel - oldlevel);
        else
            lose_weapon_skill(oldlevel - newlevel);
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

// C ref: attrib.c losestr()
/* strength loss, possibly with damage when going below minimum */
export async function losestr(num, knam, k_format) {
    const u = game.u;
    const uhpmin = minuhpmax(1);
    let ustr = ABASE(A_STR) - num, amt, dmg;
    const waspolyd = (u.umonnum !== u.umonster);

    if (num <= 0 || ABASE(A_STR) < ATTRMIN(A_STR)) {
        /* impossible("losestr: %d - %d", ABASE(A_STR), num) */
        return;
    }
    dmg = 0;
    while (ustr < ATTRMIN(A_STR)) {
        ++ustr;
        --num;
        amt = rn1(4, 3); /* (0..(4-1))+3 => 3..6; used to use flat 6 here */
        dmg += amt;
    }
    if (dmg) {
        /* in case damage is fatal and caller didn't supply killer reason */
        if (!knam) {
            knam = "terminal frailty";
            k_format = KILLED_BY;
        }
        await losehp(dmg, knam, k_format);

        if (u.umonnum !== u.umonster) { /* Upolyd */
            /* when still poly'd, reduce you-as-monst maxHP; never below 1 */
            setuhpmax(Math.max(u.mhmax - dmg, 1), false); /* acts as setmhmax() */
        } else if (!waspolyd) {
            /* not polymorphed now and didn't rehumanize when taking damage;
               reduce max HP, but not below uhpmin */
            if (u.uhpmax > uhpmin)
                setuhpmax(Math.max(u.uhpmax - dmg, uhpmin), false);
        }
        game.disp_botl = true;
    }
    /* #if 0 ... #else nhUse(olduhpmax); #endif */
    /* 'num' could have been reduced to 0 in the minimum strength loop;
       '(Upolyd || !waspolyd)' is True unless damage caused rehumanization */
    if (num > 0 && ((u.umonnum !== u.umonster) || !waspolyd))
        await adjattrib(A_STR, -num, 1);
}

// C ref: attrib.c poison_strdmg()
/* combined strength loss and damage from some poisons */
export async function poison_strdmg(strloss, dmg, knam, k_format) {
    await losestr(strloss, knam, k_format);
    await losehp(dmg, knam, k_format);
}

// C ref: attrib.c plusattr[], minusattr[], attrname[]
const plusattr = [ "strong", "smart", "wise",
                   "agile",  "tough", "charismatic" ],
      minusattr = [ "weak",    "stupid",
                    "foolish", "clumsy",
                    "fragile", "repulsive" ];
export const attrname = [ "strength", "intelligence", "wisdom",
                          "dexterity", "constitution", "charisma" ];

/* C ref: attrib.c poiseff[] */
const poiseff = [
    ["You feel ", "weaker"],             /* A_STR */
    ["Your ", "brain is on fire"],       /* A_INT */
    ["Your ", "judgement is impaired"],  /* A_WIS */
    ["Your ", "muscles won't obey you"], /* A_DEX */
    ["You feel ", "very sick"],          /* A_CON */
    ["You ", "break out in hives"]       /* A_CHA */
];

// C ref: attrib.c poisontell()
/* feedback for attribute loss due to poisoning */
export async function poisontell(typ,       /* which attribute */
                                 exclaim) { /* emphasis */
    const prefix = poiseff[typ][0];
    let msg_txt = poiseff[typ][1];

    /*
     * "You feel weaker" or "you feel very sick" aren't appropriate when
     * wearing or wielding something (gauntlets of power, Ogresmasher)
     * which forces the attribute to maintain its maximum value.
     */
    if (typ === A_STR && ACURR(A_STR) === STR19(25))
        msg_txt = "innately weaker";
    else if (typ === A_CON && ACURR(A_CON) === 25)
        msg_txt = "sick inside";

    /* You_feel() becomes "You dream that you feel" when Unaware */
    if (prefix === "You feel " && Unaware())
        await pline(`You dream that you feel ${msg_txt}${exclaim ? '!' : '.'}`);
    else
        await pline(`${prefix}${msg_txt}${exclaim ? '!' : '.'}`);
}

// C ref: attrib.c poisoned()
/* called when an attack or trap has poisoned hero (used to be in mon.c) */
export async function poisoned(
    reason,          /* controls what messages we display */
    typ,
    pkiller,         /* for score+log file if fatal */
    fatal,           /* if fatal is 0, limit damage to adjattrib */
    thrown_weapon) { /* thrown weapons are less deadly */
    const u = game.u;
    let i, loss, kprefix = KILLED_BY_AN;
    const blast = (reason === "blast");

    /* inform player about being poisoned unless that's already been done;
       "blast" has given a "blast of poison gas" message; "poison arrow",
       "poison dart", etc have implicitly given poison messages too... */
    if (!blast && strstri(reason, "poison") < 0) { /* !strstri() */
        const plural = (reason[reason.length - 1] === 's');

        /* avoid "The" Orcus's sting was poisoned... */
        await pline(`${(reason[0] >= 'A' && reason[0] <= 'Z') ? "" : "The "}${
            reason} ${plural ? "were" : "was"} poisoned!`);
    }
    if (u.uprops[POISON_RES].intrinsic || u.uprops[POISON_RES].extrinsic) {
        /* if (blast) shieldeff(u.ux, u.uy): transient display only */
        await pline("The poison doesn't seem to affect you."); /* pline_The() */
        return;
    }

    /* suppress killer prefix if it already has one */
    i = name_to_mon(pkiller, null);
    if (ismnum(i) && (mons[i].geno & G_UNIQ)) {
        kprefix = KILLED_BY;
        if (!(mons[i].mflags2 & M2_PNAME)) /* !type_is_pname() */
            pkiller = the(pkiller);
    } else if (!strncmpi(pkiller, "the ", 4) || !strncmpi(pkiller, "an ", 3)
               || !strncmpi(pkiller, "a ", 2)) {
        /*[ does this need a plural check too? ]*/
        kprefix = KILLED_BY;
    }

    i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0));
    if (i === 0 && typ !== A_CHA) {
        /* sometimes survivable instant kill */
        loss = 6 + d(4, 6); /* 6 + 4d6 => 10..34 */
        if (u.uhp <= loss) {
            u.uhp = -1;
            game.disp_botl = true;
            await pline("The poison was deadly..."); /* pline_The() */
        } else {
            /* survived, but with severe reaction */
            const olduhp = u.uhp,
                newuhpmax = u.uhpmax - Math.trunc(loss / 2);

            setuhpmax(Math.max(newuhpmax, minuhpmax(3)), true); /*True: see FIXME*/
            loss = adjuhploss(loss, olduhp);

            await losehp(loss, pkiller, kprefix); /* poison damage */
            if (await adjattrib(A_CON, (typ !== A_CON) ? -1 : -3, 1))
                await poisontell(A_CON, true);
            if (typ !== A_CON && await adjattrib(typ, -3, 1))
                await poisontell(typ, true);
        }
    } else if (i > 5) {
        const cloud = (reason === "gas cloud");

        /* HP damage; more likely--but less severe--with missiles */
        loss = thrown_weapon ? rnd(6) : rn1(10, 6);
        if ((blast || cloud) && Half_gas_damage()) /* worn towel */
            loss = Math.trunc((loss + 1) / 2);
        await losehp(loss, pkiller, kprefix); /* poison damage */
    } else {
        /* attribute loss; if typ is A_STR, reduction in current and
           maximum HP will occur once strength has dropped down to 3 */
        loss = (thrown_weapon || !fatal) ? 1 : d(2, 2); /* was rn1(3,3) */
        /* check that a stat change was made */
        if (await adjattrib(typ, -loss, 1))
            await poisontell(typ, true);
    }

    if (u.uhp < 1) {
        killer().format = kprefix;
        killer().name = pkiller;
        /* "Poisoned by a poisoned ___" is redundant */
        await done((strstri(pkiller, "poison") >= 0) ? DIED : POISONING);
    }
    await encumber_msg();
}

// C ref: attrib.c minuhpmax()
/* minimum value for uhpmax is ulevel but for life-saving it is always at
   least 10 if ulevel is less than that */
export function minuhpmax(altmin) {
    if (altmin < 1)
        altmin = 1;
    return Math.max(game.u.ulevel, altmin);
}

// C ref: attrib.c setuhpmax()
/* update u.uhpmax or u.mhmax and values of other things that depend upon
   whichever of them is relevant */
export function setuhpmax(newmax, even_when_polyd) {
    const u = game.u;
    if (u.umonnum === u.umonster || even_when_polyd) { /* !Upolyd */
        if (newmax !== u.uhpmax) {
            u.uhpmax = newmax;
            if (u.uhpmax > (u.uhppeak || 0))
                u.uhppeak = u.uhpmax;
            game.disp_botl = true;
        }
        if (u.uhp > u.uhpmax)
            u.uhp = u.uhpmax, game.disp_botl = true;
    } else { /* Upolyd */
        if (newmax !== u.mhmax) {
            u.mhmax = newmax;
            game.disp_botl = true;
        }
        if (u.mh > u.mhmax)
            u.mh = u.mhmax, game.disp_botl = true;
    }
}

// C ref: attrib.c adjuhploss()
/* called after setuhpmax() when damage is pending */
export function adjuhploss(loss, /* pending hp loss */
                           olduhp) { /* does double duty as oldmh when Upolyd */
    const u = game.u;
    if (u.umonnum === u.umonster) { /* !Upolyd */
        if (u.uhp < olduhp)
            loss -= (olduhp - u.uhp);
    } else {
        if (u.mh < olduhp)
            loss -= (olduhp - u.mh);
    }
    return Math.max(loss, 1);
}

// C ref: attrib.c adjattrib()
/* adjust an attribute; return True if change is made, False otherwise */
export async function adjattrib(ndx,    /* which characteristic */
                                incr,   /* amount of change */
                                msgflg) /* positive => no message, zero => message,
                                         * and negative => conditional (msg if
                                         * change made) */ {
    const u = game.u;
    let old_acurr, old_abase, old_amax, decr;
    let abonflg, attrstr;

    if (Fixed_abil() || !incr)
        return false;

    if ((ndx === A_INT || ndx === A_WIS) && game.uarmh
        && game.uarmh.otyp === DUNCE_CAP) {
        if (msgflg === 0)
            await pline("Your cap constricts briefly, then relaxes again."); /* Your() */
        return false;
    }

    old_acurr = ACURR(ndx);
    old_abase = ABASE(ndx);
    old_amax = AMAX(ndx);
    u.acurr.a[ndx] += incr; /* when incr is negative, this reduces ABASE() */
    if (incr > 0) {
        if (ABASE(ndx) > AMAX(ndx)) {
            u.amax.a[ndx] = ABASE(ndx);
            if (AMAX(ndx) > ATTRMAX(ndx))
                u.acurr.a[ndx] = u.amax.a[ndx] = ATTRMAX(ndx);
        }
        attrstr = plusattr[ndx];
        abonflg = (ABON(ndx) < 0);
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
        attrstr = minusattr[ndx];
        abonflg = (ABON(ndx) > 0);
    }
    if (ACURR(ndx) === old_acurr) {
        if (msgflg === 0 && game.flags.verbose) {
            if (ABASE(ndx) === old_abase && AMAX(ndx) === old_amax) {
                await pline(`You're ${abonflg ? "currently" : "already"} as ${
                    attrstr} as you can get.`);
            } else {
                /* current stayed the same but base value changed, or
                   base is at minimum and reduction caused max to drop */
                await pline(`Your innate ${attrname[ndx]} has ${
                    (incr > 0) ? "improved" : "declined"}.`); /* Your() */
            }
        }
        return false;
    }

    /* Any successful change also resets abuse / exercise level */
    u.aexe.a[ndx] = 0;

    game.disp_botl = true;
    if (msgflg <= 0)
        await pline(`You feel ${(incr > 1 || incr < -1) ? "very " : ""}${attrstr}!`); /* You_feel() */
    if (game.program_state?.in_moveloop && (ndx === A_STR || ndx === A_CON))
        await encumber_msg();
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
export async function vary_init_attr() {
    const u = game.u;
    let i;

    for (i = 0; i < A_MAX; i++)
        if (!rn2(20)) {
            const xd = rn2(7) - 2; /* biased variation */

            await adjattrib(i, xd, true);
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


const AVAL = 50; /* tune value for exercise gains */

/* C ref: attrib.h AEXE() */
function AEXE(x) { return game.u.aexe.a[x]; }

// C ref: attrib.c stone_luck()
/* there has just been an inventory change affecting a luck-granting item */
export function stone_luck(include_uncursed) {
    let bonchance = 0;

    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (confers_luck(otmp)) {
            if (otmp.cursed)
                bonchance -= otmp.quan;
            else if (otmp.blessed || include_uncursed)
                bonchance += otmp.quan;
        }

    return Math.sign(bonchance);
}

// C ref: attrib.c set_moreluck()
export function set_moreluck() {
    const luckbon = stone_luck(true);

    if (!luckbon && !carrying(LUCKSTONE))
        game.u.moreluck = 0;
    else if (luckbon >= 0)
        game.u.moreluck = LUCKADD;
    else
        game.u.moreluck = -LUCKADD;
}

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
                if (await adjattrib(i, mod_val, -1)) {
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

// C ref: attrib.c adjalign()
export function adjalign(n) {
    const u = game.u;
    const newalign = u.ualign.record + n;

    if (n < 0) {
        const newabuse = (u.ualign.abuse || 0) - n;

        if (newalign < u.ualign.record)
            u.ualign.record = newalign;
        if (newabuse > (u.ualign.abuse || 0)) {
            u.ualign.abuse = newabuse;
            adj_erinys(newabuse);
        }
    } else if (newalign > u.ualign.record) {
        u.ualign.record = newalign;
        const ALIGNLIM = 10 + Math.trunc(game.moves / 200); /* align.h */
        if (u.ualign.record > ALIGNLIM)
            u.ualign.record = ALIGNLIM;
    }
}

// C ref: mon.c adj_erinys()
/* make erinyes more dangerous based on your alignment abuse */
export function adj_erinys(abuse) {
    const pm = mons[PM_ERINYS];

    if (abuse > 5) {
        pm.mflags1 |= M1_SEE_INVIS;
    }
    if (abuse > 10) {
        pm.mflags1 |= M1_AMPHIBIOUS;
    }
    if (abuse > 15) {
        pm.mflags1 |= M1_FLY;
    }
    if (abuse > 20) {
        /* more powerful attack */
        pm.mattk[0].damn = 3;
    }
    if (abuse > 25) {
        pm.mflags1 |= M1_REGEN;
    }
    if (abuse > 30) {
        pm.mflags1 |= M1_TPORT_CNTRL;
    }
    if (abuse > 35) {
        /* second attack */
        pm.mattk[1].aatyp = AT_WEAP;
        pm.mattk[1].adtyp = AD_DRST;
        pm.mattk[1].damn = 3;
        pm.mattk[1].damd = 4;
    }
    if (abuse > 40) {
        pm.mflags1 |= M1_TPORT;
    }
    if (abuse > 50) {
        /* third (spellcasting) attack */
        pm.mattk[2].aatyp = AT_MAGC;
        pm.mattk[2].adtyp = AD_SPEL;
        pm.mattk[2].damn = 3;
        pm.mattk[2].damd = 4;
    }

    /* also adjust level and difficulty */
    pm.mlevel = Math.min(7 + game.u.ualign.abuse, 50);
    pm.difficulty = Math.min(10 + Math.trunc(game.u.ualign.abuse / 3), 25);
}
