// eat.js — eating and hunger.
// C ref: eat.c
//
// Ported so far: init_uhunger(), gethungry(), newuhs(), morehungry(),
// lesshungry(), and #eat for food and corpses: doeat(), floorfood(),
// touchfood(), start_eating(), the eatfood() occupation, bite(),
// done_eating(), fprefx()/fpostfx(), eatcorpse(), cprefx()/cpostfx(),
// givit(), rottenfood(), consume_oeaten(), eaten_stat(), and tins:
// start_tin(), opentin(), consume_tin().  Non-food and edibility prompts
// are not ported yet.

import { selftouch } from './trap.js';
import { Levitation, Deaf } from './youprop.js';
import { melt_ice } from './zap.js';
import { were_beastie, you_unwere, set_ulycn } from './were.js';
import { polyself } from './polyself.js';
import { POLY_NOFLAGS, EXPL_FIERY } from './const.js';
import { attrcurse } from './sit.js';
import { yobjnam } from './objnam.js';
import { explode } from './explode.js';
import { fall_asleep } from './timeout.js';
import { olfaction, type_is_pname, humanoid, noncorporeal, carnivorous,
         herbivorous, metallivorous, is_giant, acidic, vegan, flesh_petrifies,
         slimeproof, poly_when_stoned, attacktype, cantvomit,
         is_rider } from './mondata.js';
import { rounddiv } from './hack.js';
import { game } from './gstate.js';
import { obj_stop_timers } from './timeout.js';
import { livelog_printf, verbalize, You_feel, You_hear } from './display.js';
import { LL_CONDUCT } from './const.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import {
    A_STR, A_CON, SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED,
    STARVED, SLT_ENCUMBER, SLOW_DIGESTION, REGENERATION, HUNGER, CONFLICT,
    PROTECTION, HALLUC, HALLUC_RES, DEAF, FROMFORM, W_ARTI, W_WEP, W_RINGL,
    W_RINGR,
} from './const.js';
import { M1_CARNIVORE, M1_HERBIVORE, M1_METALLIVORE, PM_WIZARD, PM_VALKYRIE,
         PM_ELF } from './monsters.js';
import { objects, RIN_SLOW_DIGESTION, MEAT_RING, RIN_PROTECTION,
         FAKE_AMULET_OF_YENDOR, carried } from './objects.js';
import { near_capacity, end_running } from './hack.js';
import { ACURR } from './attrib.js';
import * as M from './monsters.js';
import { ALTAR as ALTAR_TYP, ICE as ICE_TYP } from './const.js';
import { mons } from './monsters.js';
import { polyfood } from './mon.js';
import { SPINACH_TIN, ROTTEN_TIN, HOMEMADE_TIN, NON_PM, NEUTRAL } from './const.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
         ACID_RES, STONE_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT,
         LAST_PROP } from './const.js';
import { can_teleport, control_teleport, telepathic, attacktype_fordmg } from './mondata.js';
import { getobj } from './invent.js';
import { is_edible } from './iactions.js';
import { can_reach_floor } from './engrave.js';
import { check_capacity } from './hack.js';
import { is_pool, is_lava } from './makemon.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE,
         GETOBJ_EXCLUDE_NONINVENT, GETOBJ_NOFLAGS, ECMD_OK,
         STRANGLED } from './const.js';
import { COIN_CLASS, FOOD_CLASS } from './objects.js';
import { You, You_cant } from './display.js';
import { W_ARMOR, W_TOOL, W_AMUL, W_SADDLE } from './const.js';
import { rn1, rnd, d } from './rng.js';
import { pline_The, Your, see_monsters } from './display.js';
import { MAGICAL_BREATHING, UNCHANGING, INVIS, FAST, STUNNED, CONFUSION,
         BLINDED, VOMITING, SICK, STONED, SLIMED, SICK_RES, AGGRAVATE_MONSTER,
         TIMEOUT, FROMOUTSIDE, INTRINSIC, A_INT, A_LAWFUL, COST_BITE,
         KILLED_BY_AN, LIGHT_HEADED, STOMACH, BY_COOKIE, PARANOID_EATING,
         ECMD_TIME, G_GENOD } from './const.js';
import { CORPSE, TIN, EGG, FOOD_RATION, TRIPE_RATION, LEMBAS_WAFER,
         CRAM_RATION, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL, CLOVE_OF_GARLIC,
         SLIME_MOLD, APPLE, PEAR, K_RATION, C_RATION, SPRIG_OF_WOLFSBANE,
         CARROT, FORTUNE_COOKIE, LUMP_OF_ROYAL_JELLY, EUCALYPTUS_LEAF, PANCAKE,
         CREAM_PIE, CANDY_BAR, AMULET_OF_STRANGULATION, GEM_CLASS, GLASS, IRON,
         MITHRIL, FLESH } from './objects.js';
import { is_undead, is_were, is_elf, is_orc, is_dwarf, your_race, dmgtype,
         defended } from './mondata.js';
import { corpse_xname, singular, xname, doname, otense, the_unique_pm,
         CXN_SINGULAR, CXN_PFX_THE } from './objnam.js';
import { the } from './iactions.js';
import { strncmpi, dist2 } from './hacklib.js';
import { splitobj, weight, costly_alteration, is_rottable,
         bcsign } from './mkobj.js';
import { freeinv, addinv_nomerge, useup, useupf, will_feel_cockatrice,
         hands_obj } from './invent.js';
import { inv_cnt, nomul } from './hack.js';
import { dropy } from './do.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { exercise, adjalign, change_luck, adjattrib, ABASE, ATTRMAX,
         poison_strdmg } from './attrib.js';
import { more_experienced, newexplevel, pluslvl } from './exper.js';
import { losehp } from './trap.js';
import { body_part } from './insight.js';
import { monflee } from './monmove.js';
import { outrumor } from './rumors.js';
import { make_confused, make_stunned, make_vomiting, make_blinded, make_deaf,
         incr_itimeout, make_slimed, make_hallucinated, make_glib, make_sick,
         make_stoned, delayed_killer } from './potion.js';
import { CXN_NORMAL, an } from './objnam.js';
import { fingers_or_gloves } from './do_wear.js';
import { SICK_VOMITABLE, SICK_ALL } from './const.js';
import { paranoid_query, donull } from './cmd.js';
import { tty_yn_function } from './wintty.js';
import { safe_qbuf, encumber_msg, sellobj_state } from './pickup.js';
import { SELL_NORMAL, SELL_DONTSELL } from './const.js';
import { touch_artifact, retouch_equipment } from './artifact.js';
import { retouch_object } from './wield.js';

import { COST_OPEN, GLIB, A_DEX } from './const.js';
import { TIN_OPENER, DAGGER, SILVER_DAGGER, ELVEN_DAGGER, ORCISH_DAGGER,
         ATHAME, KNIFE, STILETTO, CRYSKNIFE, PICK_AXE, AXE } from './objects.js';
import { observe_object } from './o_init.js';
import { makeplural } from './objnam.js';
import { acurrstr } from './attrib.js';
import { costly_spot } from './insight.js';
import {
    maybe_polyd, Sleep_resistance, Poison_resistance, Acid_resistance, Stone_resistance,
    Sick_resistance, Blind, Sick, Stoned, Strangled, Slimed, Hallucination, Hunger, Breathless,
    Unchanging, Unaware
} from './youprop.js';
import { Role_if, Race_if, Upolyd } from './const.js';
import { uprop } from './youprop.js';
import { done } from './end.js';
import { rndmonnam } from './do_name.js';
import { killer } from './topten.js';
import { killer_xname } from './mthrowu.js';
import { revive_corpse } from './zap.js';
import { DIED, CHOKING, STARVING, STONING, KILLED_BY, A_WIS,
         NO_KILLER_PREFIX } from './const.js';

const invlet_basic = 52; /* C ref: invent.c */
const MAX_EGG_HATCH_TIME = 200; /* C ref: obj.h */
const ROT_ICE_ADJUSTMENT = 2; /* C ref: mkobj.c; rotting on ice takes 2 times as long */

// C ref: eat.c tintxts[] (only the names are used so far)
const tintxts = [
    "rotten", /* ROTTEN_TIN = 0 */
    "homemade", /* HOMEMADE_TIN = 1 */
    "soup made from", "french fried", "pickled", "boiled", "smoked",
    "dried", "deep fried", "szechuan", "broiled", "stir fried", "sauteed",
    "candied", "pureed", "",
];
const TTSZ = tintxts.length;

/* C ref: mondata.h vegetarian() */
export function vegetarian(ptr) {
    return vegan(ptr)
        || (ptr.mlet === M.S_PUDDING && ptr !== mons[M.PM_BLACK_PUDDING]);
}
/* C ref: eat.c nonrotting_corpse() */
function nonrotting_corpse(mnum) {
    return mnum === M.PM_LIZARD || mnum === M.PM_LICHEN
        || is_rider(mons[mnum]) || mnum === M.PM_ACID_BLOB;
}

// C ref: eat.c tin_variety()
export function tin_variety(obj, displ /* we're just displaying */) {
    let r;
    const mnum = obj.corpsenm;

    if (obj.spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN; /* always rotten if cursed */
    } else if (obj.spe < 0) {
        r = -(obj.spe);
        --r; /* get rid of the offset */
    } else {
        r = rn2(TTSZ - 1);
    }

    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7))
        r = ROTTEN_TIN; /* some homemade tins go bad */

    if (r === ROTTEN_TIN && (mnum >= M.LOW_PM && nonrotting_corpse(mnum)))
        r = HOMEMADE_TIN; /* lizards don't rot */
    return r;
}

// C ref: eat.c tin_details() -- returns the new buf (C edits it in
// place); buf already contains the word "tin"
export function tin_details(obj, mnum, buf) {
    if (!obj || buf == null)
        return buf;

    const r = tin_variety(obj, true);

    if (r === SPINACH_TIN)
        buf += " of spinach";
    else if (mnum === NON_PM)
        buf = "empty tin";
    else {
        if ((obj.cknown || game.iflags?.override_ID) && obj.spe < 0) {
            if (r === ROTTEN_TIN || r === HOMEMADE_TIN) {
                /* put these before the word tin */
                buf = `${tintxts[r]} ${buf} of `;
            } else {
                buf += ` of ${tintxts[r]} `;
            }
        } else {
            buf += " of ";
        }
        if (vegetarian(mons[mnum]))
            buf += mons[mnum].pmnames[NEUTRAL];
        else
            buf += `${mons[mnum].pmnames[NEUTRAL]} meat`;
    }
    return buf;
}

// C ref: eat.c init_uhunger()
export async function init_uhunger() {
    const g = game;
    const u = g.u;

    if (!g.disp) g.disp = {};
    g.disp.botl = (u.uhs !== NOT_HUNGRY || u.atemp.a[A_STR] < 0);
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (u.atemp.a[A_STR] < 0) {
        u.atemp.a[A_STR] = 0;
        await encumber_msg();
    }
}

// C ref: eat.c is_fainted()
export function is_fainted() {
    return game.u.uhs === FAINTED;
}


// C ref: eat.c gethungry()
/* as time goes by - called by moveloop(every move) & domove(melee attack) */
export async function gethungry() {
    const g = game;
    const u = g.u;
    const P = u.uprops;
    let accessorytime;

    if (u.uinvulnerable || g.iflags.debug_hunger)
        return; /* you don't feel hungrier */

    /* C ref: youprop.h Slow_digestion */
    const Slow_digestion = P[SLOW_DIGESTION].intrinsic || P[SLOW_DIGESTION].extrinsic;

    /* being polymorphed into a creature which doesn't eat prevents
       this first uhunger decrement, but to stay in such form the hero
       will need to wear an Amulet of Unchanging so still burn a small
       amount of nutrition in the 'moves % 20' ring/amulet check below */
    if ((!Unaware() || !rn2(10)) /* slow metabolic rate while asleep */
        && (carnivorous(g.youmonst.data)
            || herbivorous(g.youmonst.data)
            || metallivorous(g.youmonst.data))
        && !Slow_digestion)
        u.uhunger--; /* ordinary food consumption */

    /*
     * 5.0:  trigger is randomized instead of (moves % N).  Makes
     * ring juggling ineffective.  Also causes melee-induced hunger to
     * vary from turn-based hunger instead of just replicating that.
     */
    accessorytime = rn2(20); /* rn2(20) replaces (int) (svm.moves % 20L) */
    if (accessorytime % 2) { /* odd */
        /* Regeneration uses up food, unless due to an artifact */
        if ((P[REGENERATION].intrinsic & ~FROMFORM)
            || (P[REGENERATION].extrinsic & ~(W_ARTI | W_WEP)))
            u.uhunger--;
        if (near_capacity() > SLT_ENCUMBER)
            u.uhunger--;
    } else { /* even */
        if (P[HUNGER].intrinsic || P[HUNGER].extrinsic) /* Hunger */
            u.uhunger--;
        /* Conflict uses up food too */
        if (P[CONFLICT].intrinsic || (P[CONFLICT].extrinsic & (~W_ARTI)))
            u.uhunger--;
        const uleft = g.uleft, uright = g.uright, uamul = g.uamul;
        const EProtection = P[PROTECTION].extrinsic;
        switch (accessorytime) { /* note: use even cases among 0..19 only */
        case 0:
            if (Slow_digestion
                && (!uright || uright.otyp !== RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== RIN_SLOW_DIGESTION))
                u.uhunger--;
            break;
        case 4:
            if (uleft && uleft.otyp !== MEAT_RING
                && (uleft.spe
                    || !objects[uleft.otyp].oc_charged
                    || (uleft.otyp === RIN_PROTECTION
                        && ((EProtection & ~W_RINGL) === 0
                            || ((EProtection & ~W_RINGL) === W_RINGR
                                && uright && uright.otyp === RIN_PROTECTION
                                && !uright.spe)))))
                u.uhunger--;
            break;
        case 8:
            if (uamul && uamul.otyp !== FAKE_AMULET_OF_YENDOR)
                u.uhunger--;
            break;
        case 12:
            if (uright && uright.otyp !== MEAT_RING
                && (uright.spe
                    || !objects[uright.otyp].oc_charged
                    || (uright.otyp === RIN_PROTECTION
                        && (EProtection & ~W_RINGR) === 0)))
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
    await newuhs(true);
}

/* C ref: eat.c newuhs() static save_hs / saved_hs */
let save_hs = 0;
let saved_hs = false;

// C ref: eat.c morehungry()
/* called when eating a corpse, jumping, casting a spell &c */
export async function morehungry(num) {
    game.u.uhunger -= num;
    await newuhs(true);
}

// C ref: eat.c newuhs()
/* compute and comment on your (new?) hunger status */
export async function newuhs(incr) {
    const g = game;
    const u = g.u;
    let newhs;
    const h = u.uhunger;

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
     */
    if (g.occupation === eatfood || g.force_save_hs) {
        if (!saved_hs) {
            save_hs = u.uhs;
            saved_hs = true;
        }
        u.uhs = newhs;
        return;
    } else {
        if (saved_hs) {
            u.uhs = save_hs;
            saved_hs = false;
        }
    }

    /* C ref: youprop.h Hallucination */
    const Hallucination = u.uprops[HALLUC].intrinsic
        && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic);

    if (newhs === FAINTING) {
        /* u,uhunger is likely to be negative at this point */
        const uhunger_div_by_10 = Math.sign(u.uhunger)
                                  * Math.trunc((Math.abs(u.uhunger) + 5) / 10);

        if (is_fainted())
            newhs = FAINTED;
        if (u.uhs <= WEAK || rn2(20 - uhunger_div_by_10) >= 19) {
            if (!is_fainted() && g.multi >= 0 /* %% */) {
                const duration = 10 - uhunger_div_by_10;

                /* stop what you're doing, then faint */
                await stop_occupation();
                await pline("You faint from lack of food.");
                /* incr_itimeout(&HDeaf, duration) */
                u.uprops[DEAF].intrinsic += duration;
                g.disp_botl = true;
                /* nomul(-duration) */
                g.multi = -duration;
                g.multi_reason = "fainted from lack of food";
                g.nomovemsg = "You regain consciousness.";
                g.afternmv = unfaint;
                newhs = FAINTED;
                if (!Levitation())
                    await selftouch("Falling, you");
            }

        /* this used to be -(200 + 20 * Con) but that was when being asleep
           suppressed per-turn uhunger decrement but being fainted didn't;
           now uhunger becomes more negative at a slower rate */
        } else if (u.uhunger < -(100 + 10 * ACURR(A_CON))) {
            u.uhs = STARVED;
            g.disp_botl = true;
            await pline("You die from starvation.");
            killer().format = KILLED_BY;
            killer().name = "starvation";
            await done(STARVING);
            /* if we return, we lifesaved, and that calls newuhs */
            return;
        }
    }

    if (newhs !== u.uhs) {
        if (newhs >= WEAK && u.uhs < WEAK) {
            u.atemp.a[A_STR] = -1; /* temporary loss overrides Fixed_abil */
        } else if (newhs < WEAK && u.uhs >= WEAK) {
            u.atemp.a[A_STR] = 0; /* repair of loss also overrides Fixed_abil */
        }

        switch (newhs) {
        case HUNGRY:
            if (Hallucination) {
                await pline(!incr ? "You now have a lesser case of the munchies."
                                  : "You are getting the munchies.");
            } else
                await pline(`You ${!incr ? "only feel hungry now"
                                   : (u.uhunger < 145) ? "feel hungry"
                                     : "are beginning to feel hungry"}.`);
            if (incr && g.occupation
                && (g.occupation !== eatfood && g.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        case WEAK:
            if (Hallucination)
                await pline(!incr ? "You still have the munchies."
                    : "The munchies are interfering with your motor capabilities.");
            else if (incr && (Role_if(PM_WIZARD) || Race_if(PM_ELF)
                              || Role_if(PM_VALKYRIE)))
                await pline(`${(Role_if(PM_WIZARD) || Role_if(PM_VALKYRIE))
                                   ? g.urole.name.m : "Elf"} needs food, badly!`);
            else
                await pline(`You ${!incr ? "are still"
                                   : (u.uhunger < 45) ? "feel"
                                     : "are beginning to feel"} weak.`);
            if (incr && g.occupation
                && (g.occupation !== eatfood && g.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        }
        u.uhs = newhs;
        g.disp_botl = true;
        if ((u.umonnum !== u.umonster ? u.mh : u.uhp) < 1) {
            await pline("You die from hunger and exhaustion.");
            killer().format = KILLED_BY;
            killer().name = "exhaustion";
            await done(STARVING);
            return;
        }
    }
}

// C ref: eat.c intrinsic_possible()
/* intrinsic_possible() returns TRUE iff a monster can potentially
 * convey an intrinsic to the hero (or a pet) when its corpse is eaten */
export function intrinsic_possible(type, ptr) {
    let res = 0;

    switch (type) {
    case FIRE_RES:
        res = (ptr.mconveys & M.MR_FIRE) !== 0;
        break;
    case SLEEP_RES:
        res = (ptr.mconveys & M.MR_SLEEP) !== 0;
        break;
    case COLD_RES:
        res = (ptr.mconveys & M.MR_COLD) !== 0;
        break;
    case DISINT_RES:
        res = (ptr.mconveys & M.MR_DISINT) !== 0;
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        res = (ptr.mconveys & M.MR_ELEC) !== 0;
        break;
    case POISON_RES:
        res = (ptr.mconveys & M.MR_POISON) !== 0;
        break;
    case ACID_RES:
        res = (ptr.mconveys & M.MR_ACID) !== 0;
        break;
    case STONE_RES:
        res = (ptr.mconveys & M.MR_STONE) !== 0;
        break;
    case TELEPORT:
        res = can_teleport(ptr);
        break;
    case TELEPORT_CONTROL:
        res = control_teleport(ptr);
        break;
    case TELEPAT:
        res = telepathic(ptr);
        break;
    default:
        /* res stays 0 */
        break;
    }
    return res;
}

// C ref: eat.c should_givit()
/* The "do we or do we not give the intrinsic" logic from givit(), extracted
 * into its own function. Depends on the monster's level and the type of
 * intrinsic it is trying to give you.
 */
export function should_givit(type, ptr) {
    let chance;

    /* some intrinsics are easier to get than others */
    switch (type) {
    case POISON_RES:
        if ((ptr === mons[M.PM_KILLER_BEE] || ptr === mons[M.PM_SCORPION])
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

    return (ptr.mlevel > rn2(chance));
}

// C ref: eat.c corpse_intrinsic()
/* Choose (one of) the intrinsics granted by a corpse, and return it.
 * If this corpse gives no intrinsics, return 0.
 * For the special not-real-prop cases, return a negative value. */
export function corpse_intrinsic(ptr) {
    /* Check the monster for all of the intrinsics.  If this
     * monster can give more than one, pick one to try to give
     * from among all it can give.
     */
    const conveys_STR = is_giant(ptr);
    let i;
    let count = 0; /* number of possible intrinsics */
    let prop = 0;   /* which one we will try to give */

    if (conveys_STR) {
        count = 1;
        prop = -1; /* use -1 as fake prop index for STR */
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
            prop = i;
        }
    }
    /* if strength is the only candidate, give it 50% chance */
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}

// ---------------------------------------------------------------------
// the meal in progress: context.victual

/* C ref: eat.c zero_victual -- C's svc.context.victual is a struct and
   "svc.context.victual = zero_victual" clears it; JS clears the context's
   victual object in place so that a reference to it stays current */
function zero_victual() {
    return { piece: null, o_id: 0, usedtime: 0, reqtime: 0, nmod: 0,
             canchoke: 0, fullwarn: 0, eating: 0, doreset: 0 };
}
function victual() {
    const ctx = game.context;
    if (!ctx.victual)
        ctx.victual = zero_victual();
    return ctx.victual;
}
function clear_victual() {
    Object.assign(victual(), zero_victual()); /* victual.piece = 0, .o_id = 0 */
}
/* C ref: context.h struct tin_info */
function tin_ctx() {
    const ctx = game.context;
    if (!ctx.tin)
        ctx.tin = { tin: null, o_id: 0, usedtime: 0, reqtime: 0 };
    return ctx.tin;
}

/* C ref: obj.h carried(); invent.c obj_here() */
function obj_here(obj, x, y) {
    for (const otmp of game.level.objects || [])
        if (otmp === obj)
            return otmp.where === 'OBJ_FLOOR' && otmp.ox === x && otmp.oy === y;
    return false;
}
/* C ref: mondata.h */
export function poisonous(ptr) { return (ptr.mflags1 & M.M1_POIS) !== 0; }
/* C ref: obj.h stale_egg() */
export function stale_egg(egg) {
    return (game.moves - egg.age) > (2 * MAX_EGG_HATCH_TIME);
}
/* C ref: you.h u.uconduct.x++ -- returns the old count */
function conduct_inc(what) {
    const c = game.u.uconduct;
    const old = c[what] || 0;
    c[what] = old + 1;
    return old;
}
/* C ref: eat.c CANNIBAL_ALLOWED() */
function CANNIBAL_ALLOWED() {
    return Role_if(M.PM_CAVE_DWELLER) || Race_if(M.PM_ORC);
}
/* C ref: eat.c nonrotting_food() */
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}
/* C ref: mkobj.c peek_at_iced_corpse_age() */
export function peek_at_iced_corpse_age(otmp) {
    let age, retval = otmp.age;

    if (otmp.otyp === CORPSE && otmp.on_ice) {
        /* Adjust the age; must be same as obj_timer_checks() for off ice*/
        age = game.moves - otmp.age;
        retval += Math.trunc(age * (ROT_ICE_ADJUSTMENT - 1) / ROT_ICE_ADJUSTMENT);
    }
    return retval;
}

// C ref: eat.c food_xname() -- ``[the(] singular(food, xname) [)]''
function food_xname(food, the_pfx) {
    let result;

    if (food.otyp === CORPSE) {
        result = corpse_xname(food, null,
                              CXN_SINGULAR | (the_pfx ? CXN_PFX_THE : 0));
        /* not strictly needed since pname values are capitalized
           and the() is a no-op for them */
        if (type_is_pname(mons[food.corpsenm]))
            the_pfx = false;
    } else {
        /* the ordinary case */
        result = singular(food, xname);
    }
    if (the_pfx)
        result = the(result);
    return result;
}

// C ref: eat.c vomit() -- A good idea from David Neves
export async function vomit() {
    const g = game;
    const u = g.u;
    let spewed = false;

    if (cantvomit(g.youmonst.data)) {
        /* doesn't cure food poisoning; message assumes that we aren't
           dealing with some esoteric body_part() */
        await Your("jaw gapes convulsively.");
    } else {
        if (u.uprops[SICK].intrinsic && (u.usick_type & SICK_VOMITABLE) !== 0)
            await make_sick(0, null, true, SICK_VOMITABLE);
        /* if not enough in stomach to actually vomit then dry heave;
           vomiting_dialog() gives a vomit message when its countdown
           reaches 0, but only if u.uhs < FAINTING (and !cantvomit()) */
        if (u.uhs >= FAINTING)
            await Your(`${body_part(STOMACH)} heaves convulsively!`);
        else
            spewed = true;
    }

    /* nomul()/You_can_move_again used to be unconditional, which was
       viable while eating but not for Vomiting countdown where hero might
       be immobilized for some other reason at the time vomit() is called */
    if (g.multi >= -2) {
        nomul(-2);
        g.multi_reason = "vomiting";
        g.nomovemsg = "You can move again."; /* You_can_move_again */
    }

    if (spewed) {
        const ptr = g.youmonst.data;
        const mattk = attacktype_fordmg(ptr, M.AT_BREA, M.AD_ACID);

        /* currently, only yellow dragons can breathe acid */
        if (mattk)
            throw new Error('vomit(): ubreatheu() not ported yet');
        /* vomiting on an altar is, all things considered, rather impolite */
        if (g.level.at(u.ux, u.uy).typ === ALTAR_TYP)
            throw new Error('vomit(): altar_wrath() not ported yet');
        /* if poly'd into acidic form, stomach acid is stronger than normal */
        if ((ptr.mflags1 & M.M1_ACID) !== 0) {
            /* TODO: if there's a web here, destroy that too (before ice) */
            if (g.level.at(u.ux, u.uy).typ === ICE_TYP) /* is_ice() */
                await melt_ice(u.ux, u.uy,
                               "Your stomach acid melts straight through the ice!");
        }
    }
}

// C ref: eat.c choke()
/* To a full belly all food is bad. (It.) */
async function choke(food) {
    const u = game.u;

    /* only happens if you were satiated */
    if (u.uhs !== SATIATED) {
        if (!food || food.otyp !== AMULET_OF_STRANGULATION)
            return;
    } else if (Role_if(M.PM_KNIGHT) && u.ualign.type === A_LAWFUL) {
        adjalign(-1); /* gluttony is unchivalrous */
        await You_feel("like a glutton!");
    }

    await exercise(A_CON, false);

    if (Breathless() || Hunger() || (!Strangled() && !rn2(20))) {
        /* choking by eating AoS doesn't involve stuffing yourself */
        if (food && food.otyp === AMULET_OF_STRANGULATION) {
            await You("choke, but recover your composure.");
            return;
        }
        await You("stuff yourself and then vomit voluminously.");
        await morehungry(Hunger() ? (u.uhunger - 60) : 1000); /* just got very sick! */
        await vomit();
    } else {
        /*
         * Note all "killer"s below read "Choked on %s" on the
         * high score list & tombstone.  So plan accordingly.
         */
        if (food) {
            await You(`choke over your ${foodword(food)}.`);
            if (food.oclass === COIN_CLASS) {
                killer().name = "very rich meal";
            } else {
                killer().format = KILLED_BY;
                killer().name = killer_xname(food);
            }
        } else {
            await You("choke over it.");
            killer().name = "quick snack";
        }
        await You("die...");
        await done(CHOKING);
    }
}

// C ref: eat.c recalc_wt()
/* modify victual.piece->owt depending on time spent consuming it */
function recalc_wt() {
    const piece = victual().piece;

    if (!piece) {
        /* impossible("recalc_wt without piece") */
        return;
    }
    piece.owt = weight(piece);
}

// C ref: eat.c reset_eat()
/* called when eating interrupted by an event */
export function reset_eat() {
    const v = victual();
    /* we only set a flag here - the actual reset process is done after
     * the round is spent eating.
     */
    if (v.eating && !v.doreset) {
        v.doreset = 1;
    }
}

// C ref: eat.c obj_nutrition()
/* base nutrition of a food-class object */
export function obj_nutrition(otmp) {
    const nut = (otmp.otyp === CORPSE) ? mons[otmp.corpsenm].cnutrit
                  : otmp.globby ? otmp.owt
                     : objects[otmp.otyp].oc_nutrition;

    return nut;
}

// C ref: eat.c adj_victual_nutrition()
/* nutrition increment for next bite */
function adj_victual_nutrition() {
    const v = victual();
    const otyp = v.piece.otyp;
    /* note: adj_victual_nutrition() is only called when 'nmod' is negative */
    let nut = -v.nmod; /* convert 'nmod' to positive */

    if (otyp === LEMBAS_WAFER) {
        if (maybe_polyd(is_elf(game.youmonst.data), Race_if(PM_ELF)))
            nut += Math.trunc((nut + 2) / 4); /* 800 -> 1000 */
        else if (maybe_polyd(is_orc(game.youmonst.data), Race_if(M.PM_ORC)))
            nut -= Math.trunc((nut + 2) / 4); /* 800 -> 600 */
    } else if (otyp === CRAM_RATION) {
        if (maybe_polyd(is_dwarf(game.youmonst.data), Race_if(M.PM_DWARF)))
            nut += Math.trunc((nut + 3) / 6); /* 600 -> 700 */
    }
    nut = Math.max(nut, 1);
    return nut;
}

// C ref: eat.c touchfood()
/* might destroy otmp if hero drops it */
async function touchfood(otmp) {
    if (otmp.quan > 1) {
        if (!carried(otmp))
            splitobj(otmp, otmp.quan - 1);
        else
            otmp = splitobj(otmp, 1);
    }

    if (!otmp.oeaten) {
        costly_alteration(otmp, COST_BITE);
        otmp.oeaten = obj_nutrition(otmp);
    }

    if (carried(otmp)) {
        freeinv(otmp);
        if (inv_cnt(false) >= invlet_basic) {
            sellobj_state(SELL_DONTSELL);
            await dropy(otmp);
            sellobj_state(SELL_NORMAL);
            if (otmp.where === 'OBJ_DELETED')
                otmp = null;
        } else {
            otmp = await addinv_nomerge(otmp);
        }
    }
    return otmp;
}

// C ref: eat.c food_disappears()
/* When food decays, in the middle of your meal, we don't want to dereference
 * any dangling pointers, so set it to null (which should still trigger
 * do_reset_eat() at the beginning of eatfood()) and check for null pointers
 * in do_reset_eat().
 */
export function food_disappears(obj) {
    if (obj === game.context.victual?.piece)
        clear_victual(); /* victual.piece = 0, .o_id = 0 */

    if (obj.timed)
        obj_stop_timers(obj);
}

// C ref: eat.c do_reset_eat()
async function do_reset_eat() {
    const v = victual();

    if (v.piece) {
        v.o_id = 0;
        const otmp = await touchfood(v.piece);
        v.piece = otmp;
        if (otmp) {
            v.o_id = otmp.o_id;
            recalc_wt();
        }
    }
    v.fullwarn = v.eating = v.doreset = 0;
    /* Do not set canchoke to FALSE; if we continue eating the same object
     * we need to know if canchoke was set when they started eating it the
     * previous time.  And if we don't continue eating the same object
     * canchoke always gets recalculated anyway.
     */
    await stop_occupation();
    await newuhs(false);
}

// C ref: eat.c eatfood()
/* called each move during eating process */
export async function eatfood() {
    const v = victual();
    let food = v.piece;

    if (food && !carried(food) && !obj_here(food, game.u.ux, game.u.uy))
        food = null;
    if (!food) {
        /* maybe it was stolen? */
        await do_reset_eat();
        return 0;
    }
    if (!v.eating)
        return 0;

    if (++v.usedtime <= v.reqtime) {
        if (await bite())
            return 0;
        return 1; /* still busy */
    } else {        /* done */
        await done_eating(true);
        return 0;
    }
}

// C ref: eat.c done_eating()
async function done_eating(message) {
    const piece = victual().piece;

    piece.in_use = 1;
    game.occupation = null; /* do this early, so newuhs() knows we're done */
    await newuhs(false);
    if (game.nomovemsg != null) {
        if (message && game.nomovemsg)
            await pline(game.nomovemsg); /* pline1() */
        game.nomovemsg = null;
    } else if (message) {
        await You(`finish ${(game.youmonst.data === mons[M.PM_FIRE_ELEMENTAL])
                              ? "consuming" : "eating"} ${food_xname(piece, true)}.`);
    }

    if (piece.otyp === CORPSE || piece.globby)
        await cpostfx(piece.corpsenm);
    else
        await fpostfx(piece);

    if (carried(piece))
        useup(piece);
    else
        await useupf(piece, 1);

    clear_victual(); /* victual.piece = 0, .o_id = 0 */
}

// C ref: eat.c maybe_cannibal()
/* eating a corpse or egg of one's own species is usually naughty */
let ate_brains = 0;
async function maybe_cannibal(pm, allowmsg) {
    const fptr = mons[pm]; /* food type */
    const u = game.u;

    /* when poly'd into a mind flayer, multiple tentacle hits in one
       turn cause multiple digestion checks to occur; avoid giving
       multiple luck penalties for the same attack */
    if (game.moves === ate_brains)
        return false;
    ate_brains = game.moves; /* ate_anything, not just brains... */

    if (!CANNIBAL_ALLOWED()
        /* non-cannibalistic heroes shouldn't eat own species ever
           and also shouldn't eat current species when polymorphed
           (even if having the form of something which doesn't care
           about cannibalism--hero's innate traits aren't altered) */
        && (your_race(fptr)
            || (Upolyd() && (fptr.mflags2 & game.youmonst.data.mflags2
                             & M.M2_RACEMASK) !== 0) /* same_race() */
            || (u.ulycn >= M.LOW_PM /* ismnum(u.ulycn) */
                && were_beastie(pm) === u.ulycn))) {
        if (allowmsg) {
            if (Upolyd() && your_race(fptr))
                await You("have a bad feeling deep inside.");
            await You("cannibal!  You will regret this!");
        }
        uprop(AGGRAVATE_MONSTER).intrinsic |= FROMOUTSIDE;
        change_luck(-rn1(4, 2)); /* -5..-2 */
        return true;
    }
    return false;
}

// C ref: eat.c cprefx()
async function cprefx(pm) {
    await maybe_cannibal(pm, true);
    if (flesh_petrifies(mons[pm])) {
        if (!Stone_resistance()
            && !(poly_when_stoned(game.youmonst.data)
                 && (() => { throw new Error('cprefx(): polymon(PM_STONE_GOLEM) not ported yet'); })())) {
            /* if food was a tin, use it up early to keep it out of bones */
            if (tin_ctx().tin)
                await use_up_tin(tin_ctx().tin);

            killer().name = `tasting ${mons[pm].pmnames[NEUTRAL]} meat`;
            killer().format = KILLED_BY;
            await You("turn to stone.");
            await done(STONING);
            if (victual().piece)
                victual().eating = 0;
            return; /* lifesaved */
        }
    }

    switch (pm) {
    case M.PM_LITTLE_DOG:
    case M.PM_DOG:
    case M.PM_LARGE_DOG:
    case M.PM_KITTEN:
    case M.PM_HOUSECAT:
    case M.PM_LARGE_CAT:
        /* cannibals are allowed to eat domestic animals without penalty */
        if (!CANNIBAL_ALLOWED()) {
            await You_feel(`that eating the ${mons[pm].pmnames[NEUTRAL]} was a bad idea.`);
            uprop(AGGRAVATE_MONSTER).intrinsic |= FROMOUTSIDE;
        }
        break;
    case M.PM_LIZARD:
        if (Stoned())
            throw new Error('cprefx(): fix_petrification() not ported yet');
        break;
    case M.PM_DEATH:
    case M.PM_PESTILENCE:
    case M.PM_FAMINE: {
        await pline("Eating that is instantly fatal.");
        killer().name = `unwisely ate the body of ${mons[pm].pmnames[NEUTRAL]}`;
        killer().format = NO_KILLER_PREFIX;
        await done(DIED);
        /* life-saving needed to reach here */
        await exercise(A_WIS, false);
        /* revive an actual corpse; can't do that if it was a tin;
           5.0: this used to assume that such tins were impossible but
           they can be wished for in wizard mode; they can't make it
           to normal play though because bones creation empties them */
        if (victual().piece /* Null for tins */
            && victual().piece.otyp === CORPSE /* paranoia */
            && await revive_corpse(victual().piece))
            clear_victual(); /* victual.piece=0, .o_id=0 */
        return;
    }
    case M.PM_GREEN_SLIME:
        if (!Slimed() && !Unchanging() && !slimeproof(game.youmonst.data)) {
            await You("don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN, "");
        }
        /* FALLTHRU */
    default:
        if (acidic(mons[pm]) && Stoned())
            throw new Error('cprefx(): fix_petrification() not ported yet');
        break;
    }
}

// C ref: eat.c temp_givit()
function temp_givit(type, ptr) {
    const chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;

    return chance ? (ptr.mlevel > rn2(chance)) : false;
}

// C ref: eat.c givit()
/* givit() tries to give you an intrinsic based on the monster's level
 * and what type of intrinsic it is trying to give you.
 */
async function givit(type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    const H = uprop(type);
    switch (type) {
    case FIRE_RES:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You(Hallucination() ? "be chillin'." : "feel a momentary chill.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel("wide awake.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel("full of hot air.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? "totally together, man." : "very firm.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        if (!(H.intrinsic & FROMOUTSIDE)) {
            if (Hallucination())
                await You_feel("grounded in reality.");
            else
                await Your("health currently feels amplified!");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel(Poison_resistance() ? "especially healthy." : "healthy.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? "diffuse." : "very jumpy.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? "centered in your personal space."
                                           : "in control of yourself.");
            H.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!(H.intrinsic & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? "in touch with the cosmos."
                                           : "a strange mental acuity.");
            H.intrinsic |= FROMOUTSIDE;
            /* If blind, make sure monsters show up. */
            if (Blind())
                see_monsters();
        }
        break;
    case ACID_RES:
        if (!Acid_resistance())
            await You_feel(`${Hallucination() ? "secure from flashbacks"
                              : "less concerned about being harmed by acid"}.`);
        incr_itimeout(ACID_RES, d(3, 6));
        break;
    case STONE_RES:
        if (!Stone_resistance())
            await You_feel(`${Hallucination() ? "unusually limber"
                              : "less concerned about becoming petrified"}.`);
        incr_itimeout(STONE_RES, d(3, 6));
        break;
    default:
        break;
    }
}

// C ref: eat.c eye_of_newt_buzz()
async function eye_of_newt_buzz() {
    const u = game.u;

    /* MRKR: "eye of newt" may give small magical energy boost */
    if (rn2(3) || 3 * u.uen <= 2 * u.uenmax) {
        const old_uen = u.uen;

        u.uen += rnd(3);
        if (u.uen > u.uenmax) {
            if (!rn2(3)) {
                u.uenmax++;
                if (u.uenmax > u.uenpeak)
                    u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== u.uen) {
            await You_feel("a mild buzz.");
            game.disp_botl = true;
        }
    }
}

// C ref: eat.c cpostfx()
/* called after completely consuming a corpse */
async function cpostfx(pm) {
    const u = game.u;
    let tmp = 0;
    let catch_lycanthropy = NON_PM;
    let check_intrinsics = false;

    /* in case `afternmv' didn't get called for previously mimicking
       gold, clean up now to avoid `eatmbuf' memory leak */
    if (game.eatmbuf)
        throw new Error('cpostfx(): eatmdone() not ported yet');

    switch (pm) {
    case M.PM_WRAITH:
        await pluslvl(false);
        break;
    case M.PM_HUMAN_WERERAT:
        catch_lycanthropy = M.PM_WERERAT;
        break;
    case M.PM_HUMAN_WEREJACKAL:
        catch_lycanthropy = M.PM_WEREJACKAL;
        break;
    case M.PM_HUMAN_WEREWOLF:
        catch_lycanthropy = M.PM_WEREWOLF;
        break;
    case M.PM_NURSE:
        if (Upolyd())
            u.mh = u.mhmax;
        else
            u.uhp = u.uhpmax;
        await make_blinded(0, !u.ucreamed);
        game.disp_botl = true;
        check_intrinsics = true; /* might also convey poison resistance */
        break;
    case M.PM_STALKER:
        throw new Error('cpostfx(): stalker invisibility not ported yet');
    case M.PM_YELLOW_LIGHT:
    case M.PM_GIANT_BAT:
        await make_stunned((uprop(STUNNED).intrinsic & TIMEOUT) + 30, false);
        /* FALLTHRU */
    case M.PM_BAT:
        await make_stunned((uprop(STUNNED).intrinsic & TIMEOUT) + 30, false);
        break;
    case M.PM_GIANT_MIMIC:
    case M.PM_LARGE_MIMIC:
    case M.PM_SMALL_MIMIC:
        if (game.youmonst.data.mlet !== M.S_MIMIC && !Unchanging())
            throw new Error('cpostfx(): mimicking a pile of gold not ported yet');
        break;
    case M.PM_QUANTUM_MECHANIC:
        await Your("velocity suddenly seems very uncertain!");
        if (uprop(FAST).intrinsic & INTRINSIC) {
            uprop(FAST).intrinsic &= ~INTRINSIC;
            await You("seem slower.");
        } else {
            uprop(FAST).intrinsic |= FROMOUTSIDE;
            await You("seem faster.");
        }
        break;
    case M.PM_LIZARD:
        if ((uprop(STUNNED).intrinsic & TIMEOUT) > 2)
            await make_stunned(2, false);
        if ((uprop(CONFUSION).intrinsic & TIMEOUT) > 2)
            await make_confused(2, false);
        check_intrinsics = true; /* might convey temporary stoning resist */
        break;
    case M.PM_CHAMELEON:
    case M.PM_DOPPELGANGER:
    case M.PM_SANDESTIN: /* moot--they don't leave corpses */
    case M.PM_GENETIC_ENGINEER:
        if (Unchanging()) {
            await You_feel("momentarily different."); /* same as poly trap */
        } else {
            /* polyself() is potentially fatal; if food is a tin, use it up
               early to keep it out of bones */
            const tc = tin_ctx();
            if (tc.tin) {
                await use_up_tin(tc.tin);
                /* most tin effects end up being skipped */
                await lesshungry(200 + (metallivorous(game.youmonst.data) ? 5 : 0));
            }

            await You(`${(pm === M.PM_GENETIC_ENGINEER)
                          ? "undergo a freakish metamorphosis"
                          : "feel a change coming over you"}.`);
            await polyself(POLY_NOFLAGS);
        }
        break;
    case M.PM_DISPLACER_BEAST:
        throw new Error('cpostfx(): toggle_displacement() not ported yet');
    case M.PM_DISENCHANTER:
        /* picks an intrinsic at random and removes it; there's
           no feedback if hero already lacks the chosen ability */
        /* debugpline0("using attrcurse to strip an intrinsic") */
        await attrcurse();
        break;
    case M.PM_DEATH:
    case M.PM_PESTILENCE:
    case M.PM_FAMINE:
        /* life-saved; don't attempt to confer any intrinsics */
        break;
    case M.PM_MIND_FLAYER:
    case M.PM_MASTER_MIND_FLAYER:
        if (ABASE(A_INT) < ATTRMAX(A_INT)) {
            if (!rn2(2)) {
                await pline("Yum!  That was real brain food!");
                await adjattrib(A_INT, 1, false);
                break; /* don't give them telepathy, too */
            }
        } else {
            await pline("For some reason, that tasted bland.");
        }
        /* FALLTHRU */
    default:
        check_intrinsics = true;
        break;
    }

    /* possibly convey an intrinsic */
    if (check_intrinsics) {
        const ptr = mons[pm];

        if (dmgtype(ptr, M.AD_STUN) || dmgtype(ptr, M.AD_HALU)
            || pm === M.PM_VIOLET_FUNGUS) {
            await pline("Oh wow!  Great stuff!");
            await make_hallucinated((uprop(HALLUC).intrinsic & TIMEOUT) + 200, false,
                                    0);
        }

        /* Eating magical monsters can give you some magical energy. */
        if (attacktype(ptr, M.AT_MAGC) || pm === M.PM_NEWT)
            await eye_of_newt_buzz();

        tmp = corpse_intrinsic(ptr);

        /* if something was chosen, give it now (givit() might fail) */
        if (tmp === -1)
            throw new Error('cpostfx(): gainstr() not ported yet');
        else if (tmp > 0)
            await givit(tmp, ptr);
    } /* check_intrinsics */

    if (catch_lycanthropy >= M.LOW_PM) { /* ismnum() */
        set_ulycn(catch_lycanthropy);
        await retouch_equipment(2);
    }
}

// C ref: eat.c violated_vegetarian()
async function violated_vegetarian() {
    conduct_inc('unvegetarian');
    if (Role_if(M.PM_MONK)) {
        await You_feel("guilty.");
        adjalign(-1);
    }
}

/* C ref: eat.c tintxts[] -- nutrition and greasiness of each tin variety */
const tintxt_nut = [ -50, 50, 20, 40, 40, 50, 50, 55, 60, 70, 80, 80, 95, 100,
                     500, 0 ];
const tintxt_greasy = [ 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0 ];
/* C ref: eat.c tintxts[].fodder -- suitable for vegetarians (eat.c's
   set_tin_variety(), ported in mkobj.js, uses it) */
export const tintxt_fodder = [ 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0 ];

// C ref: eat.c costly_tin()
/* common code to check and possibly charge for 1 context.tin.tin,
 * will split() context.tin.tin if necessary */
function costly_tin(alter_type) { /* COST_xxx */
    const tc = tin_ctx();
    let tin = tc.tin;

    if (carried(tin) ? tin.unpaid
                     : (costly_spot(tin.ox, tin.oy) && !tin.no_charge)) {
        if (tin.quan > 1) {
            tin = tc.tin = splitobj(tin, 1);
            tc.o_id = tin.o_id;
        }
        costly_alteration(tin, alter_type);
    }
    return tin;
}

// C ref: eat.c use_up_tin()
/* finish consume_tin(); also potentially used by cprefx() and cpostfx() */
async function use_up_tin(tin) {
    const tc = tin_ctx();

    if (carried(tin))
        useup(tin);
    else
        await useupf(tin, 1);
    /* reset tin context */
    tc.tin = null;
    tc.o_id = 0;
}

// C ref: eat.c eating_conducts()
async function eating_conducts(pd) {
    let ll_conduct = 0;

    if (!conduct_inc('food')) {
        livelog_printf(LL_CONDUCT, `ate for the first time - ${pd.pmnames[NEUTRAL]}`);
        ll_conduct++;
    }
    if (!vegan(pd)) {
        if (!conduct_inc('unvegan') && !ll_conduct) {
            livelog_printf(LL_CONDUCT,
                           `consumed animal products (${pd.pmnames[NEUTRAL]}) for the first time`);
            ll_conduct++;
        }
    }
    if (!vegetarian(pd)) {
        if (!game.u.uconduct.unvegetarian && !ll_conduct)
            livelog_printf(LL_CONDUCT,
                           `tasted meat (${pd.pmnames[NEUTRAL]}) for the first time`);
        await violated_vegetarian();
    }
}

// C ref: eat.c consume_tin()
async function consume_tin(mesg) {
    let what, which, mnum, r, nutamt;
    /* if you've eaten tin itself, chance to not eat contents gets bypassed */
    const always_eat = metallivorous(game.youmonst.data);
    const tc = tin_ctx();
    let tin = tc.tin;

    r = tin_variety(tin, false);
    if (tin.otrapped || (tin.cursed && r !== HOMEMADE_TIN && !rn2(8)))
        throw new Error('consume_tin(): b_trapped() not ported yet');

    await pline(mesg); /* "You succeed in opening the tin." */

    if (r !== SPINACH_TIN) {
        mnum = tin.corpsenm;
        if (mnum === NON_PM) {
            if (Hallucination())
                await pline(`It's full of ${rn2(2) ? "air elemental souffle"
                                                   : "dehydrated water"}.`);
            else
                await pline("It turns out to be empty.");
            observe_object(tin, Hallucination());
            tin.known = 1;
            tin = costly_tin(COST_OPEN);
            await use_up_tin(tin);
            if (always_eat)
                await lesshungry(5); /* metallivorous hero ate the tin itself */
            return;
        }

        which = 0; /* 0=>plural, 1=>as-is, 2=>"the" prefix */
        if ((mnum === M.PM_COCKATRICE || mnum === M.PM_CHICKATRICE)
            && (Stone_resistance() || Hallucination())) {
            what = "chicken";
            which = 1; /* suppress pluralization */
        } else if (Hallucination()) {
            what = rndmonnam(null);
        } else {
            what = mons[mnum].pmnames[NEUTRAL];
            if (the_unique_pm(mons[mnum]))
                which = 2;
            else if (type_is_pname(mons[mnum]))
                which = 1;
        }
        if (which === 0)
            what = makeplural(what);
        else if (which === 2)
            what = the(what);

        if (!always_eat) {
            await pline(`It smells like ${what}.`);
            if ((await tty_yn_function("Eat it?", "yn", 'n')) === 'n') { /* y_n() */
                if (game.flags.verbose)
                    await You("discard the open tin.");
                if (!Hallucination()) {
                    observe_object(tin, Hallucination());
                    tin.known = 1;
                }
                tin = costly_tin(COST_OPEN);
                await use_up_tin(tin);
                return;
            }
        }

        /* in case stop_occupation() was called on previous meal */
        clear_victual(); /* victual.piece = 0, .o_id = 0 */

        await You(`consume ${tintxts[r]} ${mons[mnum].pmnames[NEUTRAL]}.`);

        await eating_conducts(mons[mnum]);

        observe_object(tin, Hallucination());
        tin.known = 1;
        /* charge for one at pre-eating cost */
        tin = tc.tin = costly_tin(COST_OPEN);

        /* cprefx() or cpostfx() might use up tin to keep it out of bones */
        await cprefx(mnum);
        if (tc.tin)
            await cpostfx(mnum);
        if (!tc.tin)
            return;

        if (tintxt_nut[r] < 0) { /* rotten */
            await make_vomiting(rn1(15, 10), false);
        } else {
            nutamt = tintxt_nut[r];
            /* nutrition from a homemade tin (made from a single corpse)
               shouldn't be more than nutrition from the corresponding
               corpse; other tinning modes might use more than one corpse
               or add extra ingredients so aren't similarly restricted */
            if (r === HOMEMADE_TIN && nutamt > mons[mnum].cnutrit)
                nutamt = mons[mnum].cnutrit;
            if (always_eat)
                nutamt += 5; /* metallivorous hero ate the tin itself */
            /* use up tin now; lesshungry() could be fatal and produce bones */
            await use_up_tin(tin), tin = null;
            await lesshungry(nutamt);
        }

        if (tintxt_greasy[r]) {
            /* normal hero is !Glib, because you can't open tins when Glib,
               but one poly'd into metallivorous form might already be Glib */
            const alreadyglib = uprop(GLIB).intrinsic & TIMEOUT;

            make_glib(alreadyglib + rn1(11, 5)); /* 5..15 */
            await pline(`Eating ${tintxts[r]} food made your ${
                fingers_or_gloves(true)} ${alreadyglib ? "even more" : "very"} slippery.`);
        }

    } else { /* spinach... */
        throw new Error('consume_tin(): tin of spinach (gainstr()) not ported yet');
    }
    if (tin)
        await use_up_tin(tin);
}

// C ref: eat.c Popeye()
/* Some threats can be stopped by eating a tin; is the hero opening one that
   will help against the given threat? */
export function Popeye(threat) {
    if (game.occupation !== opentin)
        return false;
    const otin = tin_ctx().tin;
    /* make sure hero still has access to tin */
    if (!carried(otin)
        && (!obj_here(otin, game.u.ux, game.u.uy) || !can_reach_floor(true)))
        return false;
    /* unknown tin is assumed to be helpful */
    if (!otin.known)
        return true;
    /* known tin is helpful if it will stop life-threatening problem */
    const mndx = otin.corpsenm;
    switch (threat) {
    /* note: not used; hunger code bypasses stop_occupation() when eating */
    case HUNGER:
        return (mndx !== NON_PM || otin.spe === 1);
    /* flesh from lizards and acidic critters stops petrification */
    case STONED:
        return (mndx >= M.LOW_PM && mndx < M.NUMMONS /* ismnum() */
                && (mndx === M.PM_LIZARD || acidic(mons[mndx])));
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
    return false;
}

// C ref: eat.c opentin()
/* called during each move whilst opening a tin */
async function opentin() {
    const tc = tin_ctx();

    /* perhaps it was stolen (although that should cause interruption) */
    if (!carried(tc.tin)
        && (!obj_here(tc.tin, game.u.ux, game.u.uy)
            || !can_reach_floor(true)))
        return 0; /* %% probably we should use tinoid */
    if (tc.usedtime++ >= 50) {
        await You("give up your attempt to open the tin.");
        return 0;
    }
    if (tc.usedtime < tc.reqtime)
        return 1; /* still busy */

    await consume_tin("You succeed in opening the tin.");
    return 0;
}

// C ref: eat.c start_tin()
/* called when starting to open a tin */
async function start_tin(otmp) {
    let mesg = null;
    let tmp;
    const ydata = game.youmonst.data;
    const uwep = game.uwep;

    if (metallivorous(ydata)) {
        mesg = "You bite right into the metal tin...";
        tmp = 0;
    } else if ((ydata.mflags1 & M.M1_NOHANDS) !== 0
               || ydata.msize < M.MZ_SMALL) { /* cantwield(): nohands || verysmall */
        await You("cannot handle the tin properly to open it.");
        return;
    } else if (otmp.blessed) {
        /* 50/50 chance for immediate access vs 1 turn delay (unless
           wielding blessed tin opener which always yields immediate
           access); 1 turn delay case is non-deterministic:  getting
           interrupted and retrying might yield another 1 turn delay
           or might open immediately on 2nd (or 3rd, 4th, ...) try */
        tmp = (uwep && uwep.blessed && uwep.otyp === TIN_OPENER) ? 0 : rn2(2);
        if (!tmp)
            mesg = "The tin opens like magic!";
        else
            await pline_The("tin seems easy to open.");
    } else if (uwep && [TIN_OPENER, DAGGER, SILVER_DAGGER, ELVEN_DAGGER,
                        ORCISH_DAGGER, ATHAME, KNIFE, STILETTO, CRYSKNIFE,
                        PICK_AXE, AXE].includes(uwep.otyp)) {
        switch (uwep.otyp) {
        case TIN_OPENER:
            mesg = "You easily open the tin."; /* iff tmp==0 */
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
        }
        await pline(`Using ${yobjnam(uwep, null)} you try to open the tin.`);
    } else {
        /* no_opener: */
        await pline("It is not so easy to open this tin.");
        if (uprop(GLIB).intrinsic)
            throw new Error('start_tin(): the tin slipping from Glib fingers not ported yet');
        tmp = rn1(1 + Math.trunc(500 / (ACURR(A_DEX) + acurrstr())), 10);
    }

    const tc = tin_ctx();
    tc.tin = otmp;
    tc.o_id = otmp.o_id;
    if (!tmp) {
        await consume_tin(mesg); /* begin immediately */
    } else {
        tc.reqtime = tmp;
        tc.usedtime = 0;
        set_occupation(opentin, "opening the tin", 0);
    }
}

// C ref: eat.c Hear_again()
/* called when waking up after fainting */
export async function Hear_again() {
    /* Chance of deafness going away while fainted/sleeping/etc. */
    if (!rn2(2)) {
        await make_deaf(0, false);
        game.disp_botl = true;
    }
    return 0;
}

// C ref: eat.c rottenfood()
/* called on the "first bite" of rotten food */
async function rottenfood(obj) {
    const u = game.u;

    await pline(`Blecch!  ${is_rottable(obj) ? "Rotten" : "Awful"} ${foodword(obj)}!`);
    if (!rn2(4)) {
        if (Hallucination())
            await You_feel("rather trippy.");
        else
            await You_feel(`rather ${body_part(LIGHT_HEADED)}.`);
        await make_confused(uprop(CONFUSION).intrinsic + d(2, 4), false);
    } else if (!rn2(4) && !Blind()) {
        await pline("Everything suddenly goes dark.");
        /* hero is not Blind, but Blinded timer might be nonzero if
           blindness is being overridden by the Eyes of the Overworld */
        await make_blinded((uprop(BLINDED).intrinsic & TIMEOUT) + d(2, 10), false);
        if (!Blind())
            await Your("vision quickly clears."); /* Your1(vision_clears) */
    } else if (!rn2(3)) {
        let what, where;
        const duration = rnd(10);

        if (!Blind())
            what = "goes", where = "dark";
        else
            throw new Error('rottenfood(): blind "world spins" message not ported yet');
        await pline_The(`world spins and ${what} ${where}.`);
        incr_itimeout(DEAF, duration);
        game.disp_botl = true;
        nomul(-duration);
        game.multi_reason = "unconscious from rotten food";
        game.nomovemsg = "You are conscious again.";
        game.afternmv = Hear_again;
        void u;
        return 1;
    }
    return 0;
}

// C ref: eat.c eatcorpse()
/* called when a corpse is selected as food */
async function eatcorpse(otmp) {
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;
    let rotted = 0;
    const slimeable = (mnum === M.PM_GREEN_SLIME && !Slimed() && !Unchanging()
                       && !slimeproof(game.youmonst.data)),
          glob = otmp.globby ? true : false;

    const stoneable = (flesh_petrifies(mons[mnum]) && !Stone_resistance()
                       && !poly_when_stoned(game.youmonst.data));

    /* KMH, conduct */
    let ll_conduct = 0;
    if (!vegan(mons[mnum]))
        if (!conduct_inc('unvegan')) {
            livelog_printf(LL_CONDUCT,
                           `consumed animal products for the first time, by eating ${
                               an(food_xname(otmp, false))}`);
            ll_conduct++;
        }
    if (!vegetarian(mons[mnum])) {
        if (!game.u.uconduct.unvegetarian && !ll_conduct)
            livelog_printf(LL_CONDUCT, `tasted meat for the first time, by eating ${
                               an(food_xname(otmp, false))}`);
        await violated_vegetarian();
    }
    if (!nonrotting_corpse(mnum)) {
        const age = peek_at_iced_corpse_age(otmp);

        rotted = Math.trunc((game.moves - age) / (10 + rn2(20)));
        if (otmp.cursed)
            rotted += 2;
        else if (otmp.blessed)
            rotted -= 2;
    }

    /* 5.0: globs don't become tainted, they shrink away */
    if (!glob && !stoneable && !slimeable && rotted > 5) {
        const cannibal = await maybe_cannibal(mnum, false);

        /* tp++; -- early return makes this unnecessary */
        await pline(`Ulch - that ${(mons[mnum].mlet === M.S_FUNGUS) ? "fungoid vegetation"
                                   : vegetarian(mons[mnum]) ? "protoplasm"
                                     : "meat"} was tainted${cannibal ? ", you cannibal" : ""}!`);
        if (Sick_resistance()) {
            await pline("It doesn't seem at all sickening, though...");
        } else {
            let sick_time = rn1(10, 10);
            /* make sure new ill doesn't result in improvement */
            if (Sick() && (sick_time > Sick()))
                sick_time = (Sick() > 1) ? Sick() - 1 : 1;
            await make_sick(sick_time, corpse_xname(otmp, "rotted", CXN_NORMAL),
                            true, SICK_VOMITABLE);

            await pline("(It must have died too long ago to be safe to eat.)");
        }
        if (carried(otmp))
            useup(otmp);
        else
            await useupf(otmp, 1);
        return 2;
    } else if (acidic(mons[mnum]) && !Acid_resistance()) {
        tp++;
        await You("have a very bad case of stomach acid."); /* not body_part() */
        await losehp(rnd(15), !glob ? "acidic corpse" : "acidic glob",
                     KILLED_BY_AN); /* acid damage */
    } else if (poisonous(mons[mnum]) && rn2(5)) {
        tp++;
        await pline("Ecch - that must have been poisonous!");
        if (!Poison_resistance()) {
            const strloss = rnd(4);
            await poison_strdmg(strloss, rnd(15),
                                !glob ? "poisonous corpse" : "poisonous glob",
                                KILLED_BY_AN);
        } else
            await You("seem unaffected by the poison.");

    /* now any corpse left too long will make you mildly ill */
    } else if ((rotted > 5 || (rotted > 3 && rn2(5))) && !Sick_resistance()) {
        tp++;
        await You_feel(`${Sick() ? "very " : ""}sick.`);
        await losehp(rnd(8), !glob ? "cadaver" : "rotted glob", KILLED_BY_AN);
    }

    /* delay is weight dependent */
    victual().reqtime = 3 + ((!glob ? mons[mnum].cwt : otmp.owt) >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        if (await rottenfood(otmp)) {
            otmp.orotten = 1;
            otmp = await touchfood(otmp);
            if (!otmp)
                return 1;
            retcode = 1;
        }

        if (!mons[otmp.corpsenm].cnutrit) {
            /* no nutrition: rots away, no message if you passed out */
            if (!retcode)
                await pline_The("corpse rots away completely.");
            if (carried(otmp))
                useup(otmp);
            else
                await useupf(otmp, 1);
            retcode = 2;
        }

        if (!retcode)
            consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum === M.PM_COCKATRICE || mnum === M.PM_CHICKATRICE)
               && (Stone_resistance() || Hallucination())) {
        await pline("This tastes just like chicken!");
    } else if (mnum === M.PM_FLOATING_EYE && game.u.umonnum === M.PM_RAVEN) {
        await You("peck the eyeball with delight.");
    } else if (tp) {
        ; /* we've already delivered a message; don't add "it tastes okay" */
    } else {
        const ydata = game.youmonst.data;
        /* yummy is always False for omnivores, palatable always True */
        const yummy = (vegan(mons[mnum])
                          ? (!carnivorous(ydata) && herbivorous(ydata))
                          : (carnivorous(ydata) && !herbivorous(ydata))),
              palatable = ((vegetarian(mons[mnum])
                            ? herbivorous(ydata)
                            : carnivorous(ydata))
                           && rn2(10)
                           && (rotted < 1 || !rn2(rotted + 1)));
        let pmxnam = food_xname(otmp, false);
        const palatable_msgs = [
            /* first char: T = tastes ... , I = is ... */
            /* veggies are always just "okay" */
            "Tokay", "Istringy", "Igamey", "Ifatty", "Itough"
        ];
        const idx = vegetarian(mons[mnum]) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = (Hallucination() || (palatable && palat_msg[0] === 'I'));

        if (!strncmpi(pmxnam, "the ", 4))
            pmxnam = pmxnam.slice(4);
        await pline(`${type_is_pname(mons[mnum])
                          ? "" : the_unique_pm(mons[mnum]) ? "The " : "This "}${
                       pmxnam} ${use_is ? "is" : "tastes"} ${
                       /* tiger reference is to TV ads for "Frosted Flakes",
                          breakfast cereal targeted at kids by "Tony the tiger" */
                       Hallucination()
                          ? (yummy ? ((game.u.umonnum === M.PM_TIGER) ? "gr-r-reat" : "gnarly")
                                   : palatable ? "copacetic" : "grody")
                          : (yummy ? "delicious" : palatable
                                     ? palat_msg.slice(1) : "terrible")}${
                       (yummy || !palatable) ? '!' : '.'}`);
    }

    return retcode;
}

// C ref: eat.c start_eating()
/* called as you start to eat */
async function start_eating(otmp, already_partly_eaten) {
    const v = victual();
    let old_nomovemsg, save_nomovemsg;

    v.fullwarn = v.doreset = 0;
    v.eating = 1;

    if (otmp.otyp === CORPSE || otmp.globby) {
        await cprefx(v.piece.corpsenm);
        if (!v.piece || !v.eating) {
            /* rider revived, or hero died and was lifesaved */
            return;
        }
    }

    old_nomovemsg = game.nomovemsg;
    if (await bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if (++v.usedtime >= v.reqtime) {
            /* don't want done_eating() to issue gn.nomovemsg if it
               is due to vomit() called by bite() */
            save_nomovemsg = game.nomovemsg;
            if (!old_nomovemsg)
                game.nomovemsg = null;
            await done_eating(false);
            if (!old_nomovemsg)
                game.nomovemsg = save_nomovemsg;
        }
        return;
    }

    if (++v.usedtime >= v.reqtime) {
        /* print "finish eating" message if they just resumed -dlc */
        await done_eating((v.reqtime > 1 || already_partly_eaten) ? true : false);
        return;
    }

    set_occupation(eatfood, `eating ${food_xname(otmp, true)}`, 0);
}

// C ref: eat.c garlic_breath()
/* scare nearby monster when hero eats garlic */
async function garlic_breath(mtmp) {
    if (olfaction(mtmp.data)
        && dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) < 7) /* distu() */
        await monflee(mtmp, 0, false, false);
}

/* C ref: eat.c -- the recorder is built on macOS, where config1.h defines
   MACOS (and config.h UNIX), so fprefx() has the Macintosh apple message */
const MACOS = true;
const UNIX = true;

// C ref: eat.c fprefx()
/*
 * Called on "first bite" of (non-corpse) food, after touchfood() has
 * marked it 'partly eaten'.  Used for non-rotten non-tin non-corpse food.
 * Messages should use present tense since multi-turn food won't be
 * finishing at the time they're issued.
 * Returns FALSE if eating should not succeed for whatever reason.
 */
async function fprefx(otmp) {
    const u = game.u;
    const ydata = game.youmonst.data;
    let give_feedback = false;

    switch (otmp.otyp) {
    case EGG:
        if (otmp.corpsenm === M.PM_PYROLISK) {
            if (carried(otmp))
                useup(otmp);
            else
                await useupf(otmp, 1);
            await explode(u.ux, u.uy, -11, d(3, 6), 0, EXPL_FIERY);
            return false;
        } else if (stale_egg(otmp)) {
            await pline("Ugh.  Rotten egg."); /* perhaps others like it */
            /* increasing existing nausea means that it will take longer
               before eventual vomit, but also means that constitution
               will be abused more times before illness completes */
            await make_vomiting((uprop(VOMITING).intrinsic & TIMEOUT) + d(10, 4), true);
        } else
            give_feedback = true;
        break;
    case FOOD_RATION: /* nutrition 800 */
        /* 200+800 remains below 1000+1, the satiation threshold */
        if (u.uhunger <= 200)
            await pline(`${Hallucination() ? "Oh wow, like, superior, man"
                                           : "This food really hits the spot"}!`);

        /* 700-1+800 remains below 1500, the choking threshold which
           triggers "you're having a hard time getting it down" feedback */
        else if (u.uhunger < 700)
            await pline(`This satiates your ${body_part(STOMACH)}!`);
        /* [satiation message may be inaccurate if eating gets interrupted] */
        break;
    case TRIPE_RATION:
        if (carnivorous(ydata) && !humanoid(ydata)) {
            await pline("This tripe ration is surprisingly good!");
        } else if (maybe_polyd(is_orc(ydata), Race_if(M.PM_ORC))) {
            await pline(Hallucination() ? "Tastes great!  Less filling!"
                                        : "Mmm, tripe... not bad!");
        } else {
            await pline("Yak - dog food!");
            more_experienced(1, 0);
            await newexplevel();
            /* not cannibalism, but we use similar criteria
               for deciding whether to be sickened by this meal */
            if (rn2(2) && !CANNIBAL_ALLOWED())
                await make_vomiting(rn1(victual().reqtime, 14), false);
        }
        break;
    case LEMBAS_WAFER:
        if (maybe_polyd(is_orc(ydata), Race_if(M.PM_ORC))) {
            await pline("!#?&* elf kibble!");
            break;
        } else if (maybe_polyd(is_elf(ydata), Race_if(PM_ELF))) {
            await pline("A little goes a long way.");
            break;
        }
        give_feedback = true;
        break;
    case MEATBALL:
    case MEAT_STICK:
    case ENORMOUS_MEATBALL:
    case MEAT_RING:
        give_feedback = true;
        break;
    case CLOVE_OF_GARLIC:
        if (is_undead(ydata)) {
            await make_vomiting(rn1(victual().reqtime, 5), false);
            break;
        }
        /* iter_mons(garlic_breath) */
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.mhp <= 0) /* DEADMONSTER() */
                continue;
            await garlic_breath(mtmp);
        }
        /* FALLTHRU */
    default:
        if (otmp.otyp === SLIME_MOLD && !otmp.cursed
            && otmp.spe === game.context.current_fruit) {
            await pline(`My, this is a ${Hallucination() ? "primo" : "yummy"} ${
                            singular(otmp, xname)}!`);
        } else if (otmp.otyp === APPLE && otmp.cursed && !Sleep_resistance()) {
            ; /* skip core joke; feedback deferred til fpostfx() */
        } else if (MACOS && otmp.otyp === APPLE) {
            /* KMH -- Why should Unix have all the fun?
               We check MACOS before UNIX to get the Apple-specific apple
               message; the '#if UNIX' code will still kick in for pear. */
            await pline("Delicious!  Must be a Macintosh!");
        } else if (UNIX && (otmp.otyp === APPLE || otmp.otyp === PEAR)) {
            if (!Hallucination()) {
                await pline("Core dumped.");
            } else {
                /* based on an old Usenet joke, a fake a.out manual page */
                const x = rnd(100);

                await pline(`${(x <= 75) ? "Segmentation fault"
                                : (x <= 99) ? "Bus error" : "Yo' mama"} -- core dumped.`);
            }
        } else {
            give_feedback = true;
        }
        break; /* default */
    } /* switch */
    if (give_feedback) {
        /* give_feedback: */
        await pline(`This ${singular(otmp, xname)} is ${
                        otmp.cursed
                           ? (Hallucination() ? "grody!" : "terrible!")
                           : (otmp.otyp === CRAM_RATION
                              || otmp.otyp === K_RATION
                              || otmp.otyp === C_RATION)
                              ? "bland."
                              : Hallucination() ? "gnarly!" : "delicious!"}`);
    }
    return true;
}

/* NOTE: the order of these words exactly corresponds to the
   order of oc_material values #define'd in objclass.h. */
const foodwords = [
    "meal",    "liquid",  "wax",       "food", "meat",     "paper",
    "cloth",   "leather", "wood",      "bone", "scale",    "metal",
    "metal",   "metal",   "silver",    "gold", "platinum", "mithril",
    "plastic", "glass",   "rich food", "stone"
];

// C ref: eat.c foodword()
function foodword(otmp) {
    if (otmp.oclass === FOOD_CLASS)
        return "food";
    if (otmp.oclass === GEM_CLASS && objects[otmp.otyp].oc_material === GLASS
        && otmp.dknown)
        throw new Error('foodword(): makeknown() of glass not ported yet');
    return foodwords[objects[otmp.otyp].oc_material];
}

// C ref: eat.c fpostfx()
/* called after consuming (non-corpse) food */
async function fpostfx(otmp) {
    const u = game.u;

    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        if (u.ulycn >= M.LOW_PM || is_were(game.youmonst.data))
            await you_unwere(true);
        break;
    case CARROT:
        if (!u.uswallow
            || !attacktype_fordmg(u.ustuck.data, M.AT_ENGL, M.AD_BLND))
            await make_blinded(u.ucreamed || 0, true);
        break;
    case FORTUNE_COOKIE:
        await outrumor(bcsign(otmp), BY_COOKIE);
        if (!Blind())
            if (!conduct_inc('literate'))
                livelog_printf(LL_CONDUCT,
                    "became literate by reading the fortune inside a cookie");
        break;
    case LUMP_OF_ROYAL_JELLY:
        throw new Error('fpostfx(): lump of royal jelly (gainstr()) not ported yet');
    case EGG:
        if (otmp.corpsenm >= M.LOW_PM
            && flesh_petrifies(mons[otmp.corpsenm])) {
            if (!Stone_resistance()
                && !(poly_when_stoned(game.youmonst.data)
                     && (() => { throw new Error('fpostfx(): polymon(PM_STONE_GOLEM) not ported yet'); })())) {
                if (!Stoned()) {
                    if (!game.killer)
                        game.killer = { format: 0, name: '', next: null };
                    game.killer.name = `${mons[otmp.corpsenm].pmnames[NEUTRAL]} egg`;
                    await make_stoned(5, null, KILLED_BY_AN, game.killer.name);
                }
            }
            /* note: no "tastes like chicken" message for eggs */
        }
        break;
    case EUCALYPTUS_LEAF:
        if (Sick() && !otmp.cursed)
            await make_sick(0, null, true, SICK_ALL);
        if (uprop(VOMITING).intrinsic && !otmp.cursed)
            await make_vomiting(0, true);
        break;
    case APPLE:
        if (otmp.cursed && !Sleep_resistance()) {
            /* Snow White; 'poisoned' applies to [a subset of] weapons,
               not food, so we substitute cursed; fortunately our hero
               won't have to wait for a prince to be rescued/revived */
            if (Race_if(M.PM_DWARF) && Hallucination()) {
                await verbalize("Heigh-ho, ho-hum, I think I'll skip work today.");
            } else if (Deaf() || !game.flags.acoustics) {
                await You("fall asleep.");
            } else {
                /* Soundeffect(se_sinister_laughter, 100) */
                await You_hear("sinister laughter as you fall asleep...");
            }
            await fall_asleep(-rn1(11, 20), true);
        }
        break;
    }
    return;
}

// C ref: eat.c bite()
/* Take a single bite from a piece of food, checking for choking and
 * modifying usedtime.  Returns 1 if they choked and survived, 0 otherwise.
 */
async function bite() {
    const v = victual();

    if (v.canchoke && game.u.uhunger >= 2000) {
        await choke(v.piece);
        return 1;
    }
    if (v.doreset) {
        await do_reset_eat();
        return 0;
    }
    game.force_save_hs = true;
    if (v.nmod < 0) {
        await lesshungry(adj_victual_nutrition(/*-v.nmod*/));
        consume_oeaten(v.piece, v.nmod); /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        await lesshungry(1);
        consume_oeaten(v.piece, -1); /* -= 1 */
    }
    game.force_save_hs = false;
    recalc_wt();
    return 0;
}

// C ref: eat.c lesshungry()
/* called after eating (and after drinking fruit juice) */
export async function lesshungry(num) {
    const u = game.u;
    const v = victual();
    /* See comments in newuhs() for discussion on force_save_hs */
    const iseating = (game.occupation === eatfood) || game.force_save_hs;

    u.uhunger += num;
    if (u.uhunger >= 2000) {
        if (!iseating || v.canchoke) {
            if (iseating) {
                await choke(v.piece);
                reset_eat();
            } else {
                await choke((game.occupation === opentin) ? tin_ctx().tin : null);
                /* no reset_eat() */
            }
        }
    } else {
        /* Have lesshungry() report when you're nearly full so all eating
         * warns when you're about to choke.
         */
        if (u.uhunger >= 1500 && !Hunger()
            && (!v.eating || (v.eating && !v.fullwarn))) {
            await pline("You're having a hard time getting all of it down.");
            game.nomovemsg = "You're finally finished.";
            if (!v.eating) {
                game.multi = -2;
            } else {
                v.fullwarn = 1;
                if (v.canchoke && (v.reqtime - v.usedtime) > 1) {
                    /* food with one bite left will not survive a stop */
                    if (!(await paranoid_query(
                              ((game.flags.paranoia_bits || 0) & PARANOID_EATING) !== 0,
                              "Continue eating?"))) {
                        reset_eat();
                        game.nomovemsg = null;
                    }
                }
            }
        }
    }
    await newuhs(false);
}

// C ref: eat.c unfaint()
async function unfaint() {
    await Hear_again();
    if (game.u.uhs > FAINTING)
        game.u.uhs = FAINTING;
    await stop_occupation();
    game.disp_botl = true;
    return 0;
}

let getobj_else = 0;

// C ref: eat.c eat_ok() -- getobj callback for object to eat
function eat_ok(obj) {
    /* 'getobj_else' will be non-zero if floor food is present and
       player declined to eat that; used to insert "else" into
       "you don't have anything [else] to eat" if not carrying any food */
    if (!obj)
        return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (is_edible(obj))
        return GETOBJ_SUGGEST;

    /* make sure to exclude, not downplay, gold (if not is_edible) in order to
     * produce the "You cannot eat gold" message in getobj */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// C ref: eat.c floorfood() -- returns an object to eat; for #eat only so
// far (sacrifice and tinning aren't ported), and metallivore floor food
// (bear traps, iron bars, gold) is not ported yet
async function floorfood(verb, corpsecheck) {
    const uptr = game.youmonst.data;
    const feeding = (verb === "eat");
    let otmp;
    let c;

    getobj_else = 0; /* haven't asked about floor food */
    /* if we can't touch floor objects then use invent food only;
       same when 'm' prefix is used--for #eat, it means "skip floor food" */
    const ux = game.u.ux, uy = game.u.uy;
    let skipfloor = !!(game.iflags?.menu_requested
                       || !can_reach_floor(true) || (feeding && game.u.usteed));
    if (!skipfloor && (is_pool(ux, uy) || is_lava(ux, uy)))
        throw new Error('floorfood(): eating over water/lava not ported yet');
    if (!skipfloor) {
        if (feeding && metallivorous(uptr))
            throw new Error('floorfood(): metallivore floor food not ported yet');

        /* Is there some food (probably a heavy corpse) here on the ground? */
        for (const o of (game.level.objects || []).slice()) {
            if (o.ox !== ux || o.oy !== uy || o.where !== 'OBJ_FLOOR')
                continue;
            if (corpsecheck
                    ? (o.otyp === CORPSE
                       && (corpsecheck === 1
                           || (() => { throw new Error('floorfood(): tinnable() not ported yet'); })()))
                    : feeding ? (o.oclass !== COIN_CLASS && is_edible(o))
                              : o.oclass === FOOD_CLASS) {
                const one = (o.quan === 1);

                /* if blind and without gloves, attempting to eat (or tin or
                   offer) a cockatrice corpse is fatal before asking whether
                   or not to use it; otherwise, 'm<dir>' followed by 'e' could
                   be used to locate cockatrice corpses without touching them */
                if (o.otyp === CORPSE && will_feel_cockatrice(o, false))
                    throw new Error('floorfood(): feel_cockatrice() not ported yet');
                /* "There is <an object> here; <verb> it?" or
                   "There are <N objects> here; <verb> one?" */
                const qbuf = safe_qbuf(`There ${otense(o, "are")} `,
                                       ` here; ${verb} ${one ? "it" : "one"}?`,
                                       o, doname, one ? "something" : "things");
                if ((c = await tty_yn_function(qbuf, "ynq", 'n')) === 'y')
                    return o;
                else if (c === 'q')
                    return null;
                ++getobj_else;
            }
        }
    }

    /* skipfloor: */
    /* We cannot use GETOBJ_PROMPT since we don't want a prompt in the case
       where nothing edible is being carried. */
    if (feeding) {
        otmp = await getobj("eat", eat_ok, GETOBJ_NOFLAGS);
    } else {
        throw new Error('floorfood(): sacrifice/tinning not ported yet');
    }
    /* resetting 'getobj_else' here isn't essential; it will be cleared the
       next time it needs to be used */
    getobj_else = 0;
    return otmp;
}

// C ref: eat.c doeat() -- the #eat command
export async function doeat() {
    const u = game.u;
    let otmp;
    let basenutrit; /* nutrition of full item */
    let dont_start = false, already_partly_eaten;

    if (Strangled()) {
        await pline("If you can't breathe air, how can you consume solids?");
        return ECMD_OK;
    }
    if (!(otmp = await floorfood("eat", 0)))
        return ECMD_OK;
    if (await check_capacity(null))
        return ECMD_OK;

    if (u.uedibility)
        throw new Error('doeat(): edibility_prompts() not ported yet');

    /* from floorfood(), &hands_obj means iron bars at current spot */
    if (otmp === hands_obj)
        throw new Error('doeat(): eating iron bars not ported yet');
    /* We have to make non-foods take 1 move to eat, unless we want to
     * do ridiculous amounts of coding to deal with partly eaten plate
     * mails, players who polymorph back to human in the middle of their
     * metallic meal, etc....
     */
    if (!is_edible(otmp)) {
        await You("cannot eat that!");
        return ECMD_OK;
    } else if ((otmp.owornmask & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) !== 0) {
        /* let them eat rings */
        await You_cant("eat something you're wearing.");
        return ECMD_OK;
    } else if (!(carried(otmp) ? await retouch_object(otmp, false)
                               : await touch_artifact(otmp, game.youmonst))) {
        return ECMD_TIME; /* got blasted so use a turn */
    }
    if (objects[otmp.otyp].oc_material >= IRON
        && objects[otmp.otyp].oc_material <= MITHRIL /* is_metallic() */
        && u.umonnum === M.PM_RUST_MONSTER && otmp.oerodeproof)
        throw new Error('doeat(): rust monster eating rustproofed metal not ported yet');
    /* KMH -- Slow digestion is... indigestible */
    if (otmp.otyp === RIN_SLOW_DIGESTION)
        throw new Error('doeat(): eating a ring of slow digestion not ported yet');
    if (otmp.oclass !== FOOD_CLASS)
        throw new Error('doeat(): doeat_nonfood() not ported yet');

    const v = victual();
    if (otmp === v.piece) {
        const one_bite_left = (v.usedtime + 1 >= v.reqtime);

        /* If they weren't able to choke, they don't suddenly become able to
         * choke just because they were interrupted.  On the other hand, if
         * they were able to choke before, if they lost food it's possible
         * they shouldn't be able to choke now.
         */
        if (u.uhs !== SATIATED)
            v.canchoke = 0;
        v.o_id = 0;
        otmp = await touchfood(otmp);
        if (otmp) {
            v.piece = otmp;
            v.o_id = otmp.o_id;
        } else {
            await do_reset_eat();
        }
        /* if there's only one bite left, there sometimes won't be any
           "you finish eating" message when done; use different wording
           for resuming with one bite remaining instead of trying to
           determine whether or not "you finish" is going to be given */
        await You(`${!one_bite_left ? "resume" : "consume the last bite of"} your meal.`);
        if (otmp)
            await start_eating(otmp, false);
        return ECMD_TIME;
    }

    /* nothing in progress - so try to find something. */
    /* tins are a special case */
    /* tins must also check conduct separately in case they're discarded */
    if (otmp.otyp === TIN) {
        await start_tin(otmp);
        return ECMD_TIME;
    }

    /* KMH, conduct */
    let ll_conduct = 0;
    if (!conduct_inc('food')) {
        livelog_printf(LL_CONDUCT, `ate for the first time - ${food_xname(otmp, false)}`);
        ll_conduct++;
    }

    already_partly_eaten = otmp.oeaten ? true : false;
    otmp = await touchfood(otmp);
    if (otmp) {
        v.piece = otmp;
        v.o_id = otmp.o_id;
        v.usedtime = 0;
    } else {
        await do_reset_eat();
        return ECMD_TIME;
    }

    /* Now we need to calculate delay and nutritional info.
     * The base nutrition calculated here and in eatcorpse() accounts
     * for normal vs. rotten food.  The reqtime and nutrit values are
     * then adjusted in accordance with the amount of food left.
     */
    if (otmp.otyp === CORPSE || otmp.globby) {
        const tmp = await eatcorpse(otmp);

        if (tmp === 2) {
            /* used up */
            clear_victual(); /* victual.piece=0, .o_id=0 */
            return ECMD_TIME;
        } else if (tmp)
            dont_start = true;
        /* if not used up, eatcorpse sets up reqtime and may modify oeaten */
    } else {
        /* No checks for WAX, LEATHER, BONE, DRAGON_HIDE.  These are
         * all handled in the != FOOD_CLASS case, above.
         */
        switch (objects[otmp.otyp].oc_material) {
        case FLESH:
            if (!conduct_inc('unvegan') && !ll_conduct) {
                livelog_printf(LL_CONDUCT,
                               `consumed animal products for the first time, by eating ${
                                   an(food_xname(otmp, false))}`);
                ll_conduct++;
            }
            if (otmp.otyp !== EGG) {
                if (!game.u.uconduct.unvegetarian && !ll_conduct)
                    livelog_printf(LL_CONDUCT, `tasted meat for the first time, by eating ${
                                       an(food_xname(otmp, false))}`);

                await violated_vegetarian();
            }
            break;
        default:
            if (otmp.otyp === PANCAKE || otmp.otyp === FORTUNE_COOKIE /*eggs*/
                || otmp.otyp === CREAM_PIE || otmp.otyp === CANDY_BAR /*milk*/
                || otmp.otyp === LUMP_OF_ROYAL_JELLY)
                if (!conduct_inc('unvegan') && !ll_conduct)
                    livelog_printf(LL_CONDUCT,
                                   `consumed animal products (${food_xname(otmp, false)}) for the first time`);
            break;
        }

        v.reqtime = objects[otmp.otyp].oc_delay;
        if (otmp.otyp !== FORTUNE_COOKIE
            && (otmp.cursed || (!nonrotting_food(otmp.otyp)
                                && (game.moves - otmp.age)
                                       > (otmp.blessed ? 50 : 30)
                                && (otmp.orotten || !rn2(7))))) {
            if (await rottenfood(otmp)) {
                otmp.orotten = 1;
                dont_start = true;
            }
            consume_oeaten(otmp, 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!(await fprefx(otmp))) {
                await do_reset_eat();
                return ECMD_TIME;
            }
        } else {
            await You(`${(v.reqtime === 1) ? "eat" : "begin eating"} ${doname(otmp)}.`);
        }
    }

    /* re-calc the nutrition */
    basenutrit = obj_nutrition(otmp);

    v.reqtime = (basenutrit === 0) ? 0
                : rounddiv(v.reqtime * otmp.oeaten, basenutrit);

    /*
     * calculate the modulo value (nutrit. units per round eating)
     * note: this isn't exact - you actually lose a little nutrition due
     *       to this method.
     * TODO: add in a "remainder" value to be given at the end of the meal.
     */
    if (v.reqtime === 0 || otmp.oeaten === 0)
        /* possible if most has been eaten before */
        v.nmod = 0;
    else if (otmp.oeaten >= v.reqtime)
        v.nmod = -Math.trunc(otmp.oeaten / v.reqtime);
    else
        v.nmod = v.reqtime % otmp.oeaten;
    v.canchoke = (u.uhs === SATIATED) ? 1 : 0;

    if (!dont_start)
        await start_eating(otmp, already_partly_eaten);
    else
        otmp.owt = weight(otmp);
    return ECMD_TIME;
}

// C ref: eat.c eaten_stat()
export function eaten_stat(base, obj) {
    let uneaten_amt, full_amount;

    /* get full_amount first; obj_nutrition() might modify obj->oeaten */
    full_amount = obj_nutrition(obj);
    uneaten_amt = obj.oeaten;
    if (uneaten_amt > full_amount) {
        /* impossible("partly eaten food more nutritious than untouched food") */
        uneaten_amt = full_amount;
    }

    base = full_amount ? Math.trunc(base * uneaten_amt / full_amount) : 0;
    return (base < 1) ? 1 : base;
}

// C ref: eat.c consume_oeaten()
/* reduce obj's oeaten field, making sure it never hits or passes 0 */
export function consume_oeaten(obj, amt) {
    if (!obj_nutrition(obj)) {
        /* impossible("oeaten: attempting to set 0 nutrition food partially
           eaten") */
        return;
    }

    if (amt > 0) {
        /* bit shift to divide the remaining amount of food */
        obj.oeaten >>= amt;
    } else {
        /* simple decrement; value is negative so we actually add it */
        if (obj.oeaten > -amt)
            obj.oeaten += amt;
        else
            obj.oeaten = 0;
    }

    /* mustn't let partly-eaten drop all the way to 0 or the item would
       become restored to untouched; set to no bites left */
    if (obj.oeaten === 0) {
        const v = victual();
        if (obj === v.piece) /* always true unless wishing */
            v.reqtime = v.usedtime;
        obj.oeaten = 1; /* smallest possible positive value */
    }
}

// C ref: eat.c maybe_finished_meal()
/* called when eatfood occupation has been interrupted,
   or in the case of theft, is about to be interrupted */
export async function maybe_finished_meal(stopping) {
    const v = victual();
    /* in case consume_oeaten() has decided that the food is all gone */
    if (game.occupation === eatfood && v.usedtime >= v.reqtime) {
        if (stopping)
            game.occupation = null; /* for do_reset_eat */
        /* eatfood() calls done_eating() to use up victual.piece */
        await eatfood();
        return true;
    }
    return false;
}

// C ref: eat.c cant_finish_meal()
export async function cant_finish_meal(corpse) {
    /*
     * When a corpse gets resurrected, the makemon() for that might
     * call stop_occupation().  If that happens, prevent it from using
     * up the corpse via maybe_finished_meal() when there's not enough
     * left for another bite.  revive() needs continued access to the
     * corpse and will delete it when done.
     */
    if (game.occupation === eatfood && victual().piece === corpse) {
        /* normally performed by done_eating() */
        clear_victual(); /* victual.piece = 0, .o_id = 0 */

        if (!corpse.oeaten)
            corpse.oeaten = 1; /* [see consume_oeaten()] */
        game.occupation = donull; /* any non-Null other than eatfood() */
        await stop_occupation();
        await newuhs(false);
    }
}
