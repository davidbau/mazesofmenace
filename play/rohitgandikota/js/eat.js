import { MONSYMS } from './monst_data.js';
import { altar_wrath } from './pray.js';
import { melt_ice } from './zap.js';
import { ubreatheu } from './zap.js';
import { on_level } from './dungeon.js';
import { reset_utrap } from './trap.js';
import { deltrap } from './trap.js';
import { t_at } from './mon.js';
import { is_ice } from './dbridge.js';
import { retouch_equipment } from './artifact.js';
import { attrcurse } from './sit.js';
import { dismount_steed } from './steed.js';
import { toggle_displacement } from './do_wear.js';
import { self_invis_message } from './do_wear.js';
import { paranoid_query } from './cmd.js';
import { fall_asleep } from './timeout.js';
import { set_ulycn } from './were.js';
import { is_were } from './were.js';
import { you_unwere } from './were.js';
import { pluslvl } from './exper.js';
import { setuhpmax } from './exper.js';
import { explode } from './explode.js';
import { incr_itimeout } from './potion.js';
import { set_itimeout } from './potion.js';
import { make_hallucinated } from './potion.js';
import { make_confused } from './potion.js';
import { make_stunned } from './potion.js';
import { make_blinded } from './potion.js';
import { make_vomiting } from './potion.js';
import { make_sick } from './potion.js';
import { verbalize } from './pline.js';
import { pline_The } from './pline.js';
import { You_hear } from './pline.js';
import { livelog_printf } from './pline.js';
import { slimeproof } from './dog.js';
import { heal_legs } from './do.js';
import { dropy } from './do.js';
import { sellobj_state } from './shk.js';
import { feel_cockatrice } from './invent.js';
import { will_feel_cockatrice } from './invent.js';
import { g_at } from './invent.js';
import { hands_obj } from './invent.js';
import { obj_extract_self } from './invent.js';
import { inv_cnt } from './hack.js';
import { an } from './objnam.js';
import { ansimpleoname } from './objnam.js';
import { safe_qbuf } from './objnam.js';
import { otense } from './objnam.js';
import { the_unique_pm } from './objnam.js';
import { corpse_xname } from './objnam.js';
import { killer_xname } from './objnam.js';
import { Flying } from './youprop.js';
import { Wwalking } from './youprop.js';
import { Deaf } from './youprop.js';
import { Invis } from './youprop.js';
import { Sleep_resistance } from './youprop.js';
import { Acid_resistance } from './youprop.js';
import { Sick_resistance } from './youprop.js';
import { Breathless } from './youprop.js';
import { gainstr } from './attrib.js';
import { monflee } from './monmove.js';
import { TOPLINE_NEED_MORE } from './const.js';
import { TOPLINE_EMPTY } from './const.js';
import { flush_screen } from './display.js';
import { more } from './display.js';
import { see_monsters } from './display.js';
import { newsym } from './display.js';
import { is_obj_mappear } from './monst.js';
import { MATERIALS } from './objects_data.js';
import { paranoia_bits } from './options.js';
import { u_at } from './const.js';
import { IS_ALTAR } from './const.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { W_NONDIGGABLE } from './const.js';
import { IRONBARS } from './const.js';
import { TT_BEARTRAP } from './const.js';
import { BEAR_TRAP } from './const.js';
import { DISMOUNT_FELL } from './const.js';
import { INTRINSIC } from './const.js';
import { EXPL_FIERY } from './const.js';
import { SICK_ALL } from './const.js';
import { CXN_NORMAL } from './const.js';
import { LL_CONDUCT } from './const.js';
import { invlet_basic } from './const.js';
import { OBJ_FLOOR } from './const.js';
import { OBJ_DELETED } from './const.js';
import { SELL_NORMAL } from './const.js';
import { SELL_DONTSELL } from './const.js';
import { NEUTRAL } from './const.js';
import { STOMACH } from './const.js';
import { POISONING } from './const.js';
import { M_AP_OBJECT } from './const.js';
import { M_AP_NOTHING } from './const.js';
import { M_AP_TYPMASK } from './const.js';
import { PARANOID_EATING } from './const.js';
import { MAX_EGG_HATCH_TIME } from './const.js';
import { rehumanize } from './polyself.js';
import { polymon } from './polyself.js';
import { uasmon_maxStr } from './polyself.js';
import { is_clinger } from './mondata.js';
import { attacktype_fordmg } from './mondata.js';
import { is_undead } from './mondata.js';
import { is_dwarf } from './mondata.js';
import { is_elf } from './mondata.js';
import { is_orc } from './mondata.js';
import { humanoid } from './mondata.js';
import { poly_when_stoned } from './mondata.js';
import { Has_contents } from './const.js';
import { is_metallic } from './obj.js';
import { mksobj } from './mkobj.js';
import { peek_at_iced_corpse_age } from './mkobj.js';
import { is_rustprone } from './mkobj.js';
import { is_flammable } from './mkobj.js';
import { EDOG } from './const.js';
import { Mgender } from './const.js';
import { ismnum } from './const.js';
import { Upolyd } from './const.js';
import { A_INT } from './const.js';
import { A_WIS } from './const.js';
import { DIED } from './const.js';
import { NO_KILLER_PREFIX } from './const.js';
import { M_ATTK_AGR_DIED } from './const.js';
import { M_ATTK_MISS } from './const.js';
import { M_ATTK_HIT } from './const.js';
import { monsndx } from './makemon.js';
import { DEADMONSTER } from './monst.js';
import { canseemon } from './display.js';
import { canspotmon } from './display.js';
import { pmname } from './do_name.js';
import { mon_nam } from './do_name.js';
import { Monnam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { mondied } from './mon.js';
import { monstone } from './mon.js';
import { your_race } from './polyself.js';
import { same_race } from './dog.js';
import { is_rider } from './mondata.js';
import { mindless } from './mondata.js';
import { noncorporeal } from './mondata.js';
import { Role_if } from './attrib.js';
import { selftouch } from './trap.js';
import { Levitation } from './youprop.js';
import { unmul } from './hack.js';
import { donull } from './do.js';
import { POLY_NOFLAGS } from './const.js';
import { polyself } from './polyself.js';
import { Unchanging } from './youprop.js';
import { exercise, near_capacity, adjalign, poison_strdmg, adjattrib,
         acurrstr, change_luck }
    from './attrib.js';
import { A_CON, COST_BITE, COST_DSTROY, COST_OPEN, SLT_ENCUMBER,
         W_RINGL, W_RINGR } from './const.js';
// eat.js — nutrition.
// C ref: src/eat.c
//
// Only gethungry()'s once-per-turn draw is ported. 5.0 randomised the trigger:
// it used to be (moves % 20), and is now an explicit rn2(20), which is why a
// port that tracks the turn counter correctly still has to make the call.

import { game } from './gstate.js';
import { Race_if } from './u_init.js';
import { carnivorous, herbivorous, metallivorous, acidic, poisonous,
         flesh_petrifies, vegan, vegetarian, type_is_pname, dmgtype,
         attacktype, cantvomit, cantwield, olfaction } from './mondata.js';
import { can_reach_floor } from './pickup.js';
import { is_pool_or_lava } from './dbridge.js';
import { tty_yn_function } from './tty/topl.js';
import { Unaware, Hallucination, Poison_resistance, Stone_resistance, Glib,
         Blind }
    from './youprop.js';
import { singular, xname, doname, yobjnam, makeplural, the,
         gloves_simple_name }
    from './objnam.js';
import { rndmonnam, hcolor } from './do_name.js';
import { more_experienced, newexplevel } from './exper.js';
import { You, You_cant } from './pline.js';
import { outrumor } from './rumors.js';
import { BY_COOKIE } from './const.js';
import { PMNAMES, MFLAGS as MFLAGS_EAT, ATTKS } from './monst_data.js';
import { done, delayed_killer } from './end.js';
import { revive_corpse } from './do.js';
import { end_running, nomul, rounddiv, check_capacity } from './hack.js';
import { sgn, distu } from './hacklib.js';
import { ACURR } from './attrib.js';
import { A_CHA } from './const.js';
import { make_stoned, make_slimed } from './potion.js';
import { STONING, LOW_PM } from './const.js';
import { bot } from './display.js';
import { A_STR, A_DEX, STARVING, STARVED, FIRE_RES, SLEEP_RES, COLD_RES,
         DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, TELEPORT,
         TELEPORT_CONTROL, TELEPAT, LAST_PROP, FROMOUTSIDE } from './const.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { You_feel, Your } from './pline.js';
import { losehp } from './hack.js';
import { SICK_RES, SICK_VOMITABLE, KILLED_BY_AN } from './const.js';
import { NOT_HUNGRY, ECMD_OK, ECMD_TIME, SATIATED, KILLED_BY, CHOKING, WEAK, HUNGRY, FAINTING, FAINTED, A_LAWFUL, W_ARMOR, W_TOOL, W_AMUL, W_SADDLE, HOMEMADE_TIN, NON_PM, STR18 } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { getobj, weight, useup, useupf, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_NONINVENT, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_DOWNPLAY, freeinv, update_inventory, reorder_invent, addinv_nomerge, stackobj } from './invent.js';
import { pline } from './display.js';
import { observe_object } from './o_init.js';
/* include/obj.h:332 carried() is a WHERE test, not list membership. */
import { carried, polyfood } from './obj.js';
import { HUNGER, STONED, SLIMED, SICK, VOMITING } from './const.js';
import { splitobj, bcsign } from './mkobj.js';
import { is_rottable, b_trapped } from './trap.js';
import { body_part } from './polyself.js';
import { LIGHT_HEADED, Is_airlevel, Is_astralevel, Is_waterlevel } from './const.js';
import { surface } from './dungeon.js';
import { FINGER, NH_GREEN, NO_PART, TIMEOUT } from './const.js';
import { were_beastie } from './were.js';

// src/eat.c:3170 gethungry()
export async function gethungry() {
    const u = game.u;

    if (u.uinvulnerable || game.iflags?.debug_hunger)
        return;                       /* forced to fast while praying */

    /* src/eat.c:3174 — ordinary food consumption. The Unaware term is a real
       short circuit: awake heroes never draw here, but a sleeping hero spends
       one rn2(10) EVERY turn ("slow metabolic rate while asleep") and only
       digests on a 0. seed0016's wand-of-sleep nap is what exposed it. */
    const uptr = game.mons?.[u.umonnum];
    if ((!Unaware() || !rn2(10))
        && (!uptr || carnivorous(uptr) || herbivorous(uptr)
            || metallivorous(uptr))
        && !u.uprops?.SLOW_DIGESTION)
        u.uhunger--;

    /* src/eat.c:3191 — rn2(20) replaces the old (int) (svm.moves % 20L) */
    const accessorytime = rn2(20);

    if (accessorytime % 2) { /* odd */
        /* Regeneration uses up food, unless due to an artifact; the
           FROMFORM/W_ARTI source masks need states that are absent */
        if (u.uprops?.REGENERATION)
            u.uhunger--;
        if (near_capacity() > SLT_ENCUMBER)
            u.uhunger--;
    } else { /* even */
        if (u.uprops?.HUNGER)
            u.uhunger--;
        /* Conflict uses up food too */
        if (u.uprops?.CONFLICT)
            u.uhunger--;
        const uleft = worn_eat(W_RINGL), uright = worn_eat(W_RINGR),
              uamul = worn_eat(W_AMUL);
        switch (accessorytime) { /* note: use even cases among 0..19 only */
        case 0:
            if (u.uprops?.SLOW_DIGESTION
                && (!uright || uright.otyp !== ONAMES.RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== ONAMES.RIN_SLOW_DIGESTION))
                u.uhunger--;
            break;
        case 4:
            if (uleft && uleft.otyp !== ONAMES.MEAT_RING
                /* more hungry if +/- is nonzero or +/- doesn't apply or
                   +0 ring of protection is only source of protection;
                   need to check whether both rings are +0 protection or
                   they'd both slip by the "is there another source?" test,
                   but don't do that for both rings or they will both be
                   treated as supplying "MC" when only one matters;
                   note: amulet of guarding overrides both +0 rings and
                   is caught by the (EProtection & ~W_RINGx) == 0L tests */
                && (uleft.spe
                    || !game.objects[uleft.otyp].oc_charged
                    || (uleft.otyp === ONAMES.RIN_PROTECTION
                        && (((u.uprops?.PROTECTION | 0) & ~W_RINGL) === 0
                            || (((u.uprops?.PROTECTION | 0) & ~W_RINGL) === W_RINGR
                                && uright && uright.otyp === ONAMES.RIN_PROTECTION
                                && !uright.spe)))))
                u.uhunger--;
            break;
        case 8:
            if (uamul && uamul.otyp !== ONAMES.FAKE_AMULET_OF_YENDOR)
                u.uhunger--;
            break;
        case 12:
            if (uright && uright.otyp !== ONAMES.MEAT_RING
                && (uright.spe
                    || !game.objects[uright.otyp].oc_charged
                    || (uright.otyp === ONAMES.RIN_PROTECTION
                        && ((u.uprops?.PROTECTION | 0) & ~W_RINGR) === 0)))
                u.uhunger--;
            break;
        case 16:
            if (u.uhave?.amulet)
                u.uhunger--;
            break;
        default:
            break;
        }
    }
    await newuhs(true);
}

/* the worn-slot lookup, local to avoid importing do_wear (cycle) */
function worn_eat(mask) {
    for (const o of (game.invent || []))
        if ((o.owornmask ?? 0) & mask)
            return o;
    return null;
}


// src/eat.c:3336 unfaint()
export async function unfaint() {
    await Hear_again();
    if (game.u.uhs > FAINTING)
        game.u.uhs = FAINTING;
    await stop_occupation();
    (game.disp ||= {}).botl = true;
    return 0;
}

/* include/attrib.h ABASE(), AMAX(), ATTRMIN() */
const ABASE = (i) => game.u.acurr.a[i];
const AMAX = (i) => game.u.amax.a[i];
const ATTRMIN = (i) => game.urace.attrmin[i];
/* src/eat.c:51 CANNIBAL_ALLOWED() */
const CANNIBAL_ALLOWED = () => (Role_if(PMNAMES.PM_CAVE_DWELLER) || Race_if(PMNAMES.PM_ORC));
/* include/youprop.h */
const Lifesaved = () => !!game.u.uprops?.LIFESAVED;
const Stoned = () => !!game.u.uprops?.STONED;

// src/eat.c:475 eating_dangerous_corpse()
export function eating_dangerous_corpse(res) {
    let food, mnum;
    if (game.occupation === eatfood
        && (food = game.context.victual.piece)
        && food.otyp === ONAMES.CORPSE
        && (mnum = food.corpsenm) >= LOW_PM
        && (carried(food) || obj_here(food, game.u.ux, game.u.uy))) {
        if (res === ACID_RES && acidic(game.mons[mnum]))
            return true;
        if (res === STONE_RES && flesh_petrifies(game.mons[mnum]))
            return true;
    }
    return false;
}

// src/eat.c:603 eat_brains(); dmg_p is a {v} box for the extra damage
export async function eat_brains(magr, mdef, visflag, dmg_p) {
    const pd = mdef.data;
    let give_nutrit = false;
    let result = M_ATTK_HIT;
    const xtra_dmg = rnd(10);

    /* previous tentacle attack might have triggered fatal passive
       counterattack [callers ought to be updated to avoid this situation] */
    if (magr !== game.youmonst && DEADMONSTER(magr)) {
        return M_ATTK_AGR_DIED;
    }

    if (noncorporeal(pd)) {
        if (visflag)
            await pline(`${(mdef === game.youmonst) ? 'Your' : s_suffix(Monnam(mdef))} brain is unharmed.`);
        return M_ATTK_MISS; /* side-effects can't occur */
    } else if (magr === game.youmonst) {
        await You(`eat ${s_suffix(mon_nam(mdef))} brain!`);
    } else if (mdef === game.youmonst) {
        await Your('brain is eaten!');
    } else { /* monster against monster */
        if (visflag && canspotmon(mdef))
            await pline(`${s_suffix(Monnam(mdef))} brain is eaten!`);
    }

    if (flesh_petrifies(pd)) {
        /* mind flayer has attempted to eat the brains of a petrification
           inducing critter (most likely Medusa; attacking a cockatrice via
           tentacle-touch should have been caught before reaching this far) */
        if (magr === game.youmonst) {
            if (!Stone_resistance() && !Stoned())
                await make_stoned(5, null, KILLED_BY_AN,
                                  pmname(pd, Mgender(mdef)));
        } else {
            /* no need to check for poly_when_stoned or Stone_resistance;
               mind flayers don't have those capabilities */
            if (visflag && canseemon(magr))
                await pline(`${Monnam(magr)} turns to stone!`);
            await monstone(magr);
            if (!DEADMONSTER(magr)) {
                /* life-saved; don't continue eating the brains */
                return M_ATTK_MISS;
            } else {
                if (magr.mtame && !visflag)
                    /* parallels mhitm.c's brief_feeling */
                    await You('have a sad thought for a moment, then it passes.');
                return M_ATTK_AGR_DIED;
            }
        }
    }

    if (magr === game.youmonst) {
        /*
         * player mind flayer is eating something's brain
         */
        await eating_conducts(pd);
        if (mindless(pd)) { /* (cannibalism not possible here) */
            await pline(`${Monnam(mdef)} doesn't notice.`);
            /* all done; no extra harm inflicted upon target */
            return M_ATTK_MISS;
        } else if (is_rider(pd)) {
            await pline('Ingesting that is fatal.');
            game.killer = { format: NO_KILLER_PREFIX,
                            name: `unwisely ate the brain of ${pmname(pd, Mgender(mdef))}` };
            await done(DIED);
            /* life-saving needed to reach here */
            exercise(A_WIS, false);
            dmg_p.v += xtra_dmg; /* Rider takes extra damage */
        } else {
            await morehungry(-rnd(30)); /* cannot choke */
            if (ABASE(A_INT) < AMAX(A_INT)) {
                /* recover lost Int; won't increase current max */
                game.u.acurr.a[A_INT] += rnd(4);
                if (ABASE(A_INT) > AMAX(A_INT))
                    game.u.acurr.a[A_INT] = AMAX(A_INT);
                (game.disp ||= {}).botl = true;
            }
            exercise(A_WIS, true);
            dmg_p.v += xtra_dmg;
        }
        /* targeting another mind flayer or your own underlying species
           is cannibalism */
        await maybe_cannibal(monsndx(pd), true);

    } else if (mdef === game.youmonst) {
        /*
         * monster mind flayer is eating hero's brain
         */
        /* no such thing as mindless players */
        if (ABASE(A_INT) <= ATTRMIN(A_INT)) {
            const brainlessness = 'brainlessness';

            if (Lifesaved()) {
                game.killer = { format: KILLED_BY, name: brainlessness };
                await done(DIED);
                /* amulet of life saving has now been used up */
                await pline('Unfortunately your brain is still gone.');
                /* sanity check against adding other forms of life-saving */
                if (game.u.uprops)
                    delete game.u.uprops.LIFESAVED;
                if (game.u.intrinsic)
                    game.u.intrinsic.HLifesaved = 0;
            } else {
                await Your('last thought fades away.');
            }
            game.killer = { format: KILLED_BY, name: brainlessness };
            await done(DIED);
            /* can only get here when in wizard or explore mode and user has
               explicitly chosen not to die; arbitrarily boost intelligence */
            game.u.acurr.a[A_INT] = ATTRMIN(A_INT) + 2;
            await You_feel('like a scarecrow.');
        }
        give_nutrit = true; /* in case a conflicted pet is doing this */
        exercise(A_WIS, false);
        /* caller handles Int and memory loss */

    } else { /* mhitm */
        /*
         * monster mind flayer is eating another monster's brain
         */
        if (mindless(pd)) {
            if (visflag && canspotmon(mdef))
                await pline(`${Monnam(mdef)} doesn't notice.`);
            return M_ATTK_MISS;
        } else if (is_rider(pd)) {
            await mondied(magr);
            if (DEADMONSTER(magr))
                result = M_ATTK_AGR_DIED;
            /* Rider takes extra damage regardless of whether attacker dies */
            dmg_p.v += xtra_dmg;
        } else {
            dmg_p.v += xtra_dmg;
            give_nutrit = true;
            if (dmg_p.v >= mdef.mhp && visflag && canspotmon(mdef))
                await pline(`${s_suffix(Monnam(mdef))} last thought fades away...`);
        }
    }

    if (give_nutrit && magr.mtame && !magr.isminion) {
        EDOG(magr).hungrytime += rnd(60);
        magr.mconf = 0;
    }

    return result;
}

// src/eat.c:758 maybe_cannibal()
export async function maybe_cannibal(pm, allowmsg) {
    const fptr = game.mons[pm]; /* food type */

    /* when poly'd into a mind flayer, multiple tentacle hits in one
       turn cause multiple digestion checks to occur; avoid giving
       multiple luck penalties for the same attack */
    /* C's static starts at zero in each new process. */
    if (game.moves === (game.ate_brains || 0))
        return false;
    game.ate_brains = game.moves; /* ate_anything, not just brains... */

    if (!CANNIBAL_ALLOWED()
        /* non-cannibalistic heroes shouldn't eat own species ever
           and also shouldn't eat current species when polymorphed
           (even if having the form of something which doesn't care
           about cannibalism--hero's innate traits aren't altered) */
        && (your_race(fptr)
            || (Upolyd(game.u) && same_race(game.youmonst.data, fptr))
            || (ismnum(game.u.ulycn) && were_beastie(pm) === game.u.ulycn))) {
        if (allowmsg) {
            if (Upolyd(game.u) && your_race(fptr))
                await You('have a bad feeling deep inside.');
            await You('cannibal!  You will regret this!');
        }
        (game.u.intrinsic ||= {}).HAggravate_monster = (game.u.intrinsic.HAggravate_monster | 0) | FROMOUTSIDE;
        change_luck(-rn1(4, 2)); /* -5..-2 */
        return true;
    }
    return false;
}

// src/eat.c:790 cprefx()
export async function cprefx(pm) {
    await maybe_cannibal(pm, true);
    if (flesh_petrifies(game.mons[pm])) {
        if (!Stone_resistance()
            && !(poly_when_stoned(game.youmonst.data)
                 && await polymon(PMNAMES.PM_STONE_GOLEM))) {
            if (game.context.tin?.tin)
                await use_up_tin(game.context.tin.tin);
            game.killer = { name: `tasting ${game.mons[pm].pmnames[NEUTRAL]} meat`,
                            format: KILLED_BY };
            await You('turn to stone.');
            await done(STONING);
            if (game.context.victual.piece)
                game.context.victual.eating = 0;
            return;
        }
    }

    switch (pm) {
    case PMNAMES.PM_LITTLE_DOG:
    case PMNAMES.PM_DOG:
    case PMNAMES.PM_LARGE_DOG:
    case PMNAMES.PM_KITTEN:
    case PMNAMES.PM_HOUSECAT:
    case PMNAMES.PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED()) {
            await You_feel(`that eating the ${game.mons[pm].pmnames[NEUTRAL]} was a bad idea.`);
            game.u.intrinsic.HAggravate_monster |= FROMOUTSIDE;
        }
        break;
    case PMNAMES.PM_LIZARD:
        if (Stoned())
            await fix_petrification();
        break;
    case PMNAMES.PM_DEATH:
    case PMNAMES.PM_PESTILENCE:
    case PMNAMES.PM_FAMINE:
        await pline('Eating that is instantly fatal.');
        game.killer = { name: `unwisely ate the body of ${game.mons[pm].pmnames[NEUTRAL]}`,
                        format: NO_KILLER_PREFIX };
        await done(DIED);
        exercise(A_WIS, false);
        if (game.context.victual.piece
            && game.context.victual.piece.otyp === ONAMES.CORPSE
            && await revive_corpse(game.context.victual.piece))
            game.context.victual = {};
        return;
    case PMNAMES.PM_GREEN_SLIME:
        if (!Slimed() && !Unchanging() && !slimeproof(game.youmonst.data)) {
            await You("don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN, '');
        }
        /* FALLTHROUGH */
    default:
        if (acidic(game.mons[pm]) && Stoned())
            await fix_petrification();
        break;
    }
}

// src/eat.c:867 fix_petrification()
export async function fix_petrification() {
    let buf;
    if (Hallucination())
        buf = `What a pity--you just ruined a future piece of ${
            ACURR(A_CHA) > 15 ? 'fine ' : ''}art!`;
    else
        buf = 'You feel limber!';
    await make_stoned(0, buf, 0, null);
}

// src/eat.c:3347 is_fainted()
export function is_fainted() {
    return game.u.uhs === FAINTED;
}

// src/eat.c:3354 reset_faint()
export async function reset_faint() {
    if (game.afternmv === unfaint)
        await unmul('You revive.');
}

// src/eat.c:126 init_uhunger() — the hero starts well fed.
//
// exerper() reads uhunger every tenth move to decide which attribute to
// exercise, and each branch spends a different draw: NOT_HUNGRY exercises
// Constitution with rn2(19), while SATIATED and FAINTING both decrement with
// rn2(2). Leaving uhunger unset made every comparison fall through to FAINTING
// and drew the wrong one.
export function init_uhunger() {
    game.u.uhunger = 900;
    game.u.uhs = NOT_HUNGRY;
}

// src/eat.c tinnable() and tin_ok().
export function tinnable(corpse) {
    return !corpse.oeaten && !!game.mons[corpse.corpsenm].cnutrit;
}

function tin_ok(obj) {
    if (!obj)
        return game.getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
    if (obj.oclass !== OCLASSES.FOOD_CLASS)
        return GETOBJ_EXCLUDE;
    if (obj.otyp !== ONAMES.CORPSE || !tinnable(obj))
        return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

// src/eat.c floorfood() — offer each edible thing at the hero's feet with a
// y/n prompt, then fall through to getobj() for something carried.
//
// Each floor prompt reads ONE key, so the total depends on what is underfoot:
// a bear trap, iron bars, gold and a food item each add one. That makes the
// count data-dependent, and our floor contents are known to differ from C's on
// some levels, so guessing it would misalign a session rather than fix it.
// Only the clean case is ported — nothing edible underfoot, straight to
// getobj — and anything else is recorded.
export async function floorfood(verb,
                                 corpsecheck) /* 0, no check, 1, corpses, 2, tinnable corpses */
{
    let otmp;
    let qbuf;
    let c;
    const uptr = game.youmonst.data;
    const feeding = (verb === 'eat'),        /* corpsecheck==0 */
          offering = (verb === 'sacrifice'); /* corpsecheck==1 */
    let skipfloor = false;

    game.getobj_else = 0; /* haven't asked about floor food; is used to vary
                           * "you don't have anything [else] to eat" when
                           * floor food has been declined and inventory lacks
                           * any suitable items */
    /* if we can't touch floor objects then use invent food only;
       same when 'm' prefix is used--for #eat, it means "skip floor food" */
    if (game.iflags?.menu_requested
        || !can_reach_floor(true) || (feeding && game.u.usteed)
        || (is_pool_or_lava(game.u.ux, game.u.uy)
            && (Wwalking() || is_clinger(uptr) || (Flying() && !Breathless()))))
        skipfloor = true;

    if (!skipfloor && feeding && metallivorous(uptr)) {
        let gold;
        const ttmp = t_at(game.u.ux, game.u.uy);

        if (ttmp && ttmp.tseen && ttmp.ttyp === BEAR_TRAP) {
            const u_in_beartrap = (game.u.utrap && game.u.utraptype === TT_BEARTRAP);

            /* If not already stuck in the trap, perhaps there should
               be a chance to becoming trapped?  Probably not, because
               then the trap would just get eaten on the _next_ turn... */
            qbuf = `There is a bear trap here (${
                u_in_beartrap ? 'holding you' : 'armed'}); eat it?`;
            if ((c = await tty_yn_function(qbuf, 'ynq', 'n')) === 'y') {
                let beartrap;

                deltrap(ttmp);
                if (u_in_beartrap)
                    await reset_utrap(true);
                beartrap = mksobj(ONAMES.BEARTRAP, true, false);
                qbuf = `You only manage to ${
                    u_in_beartrap ? 'free yourself from' : 'disarm'} the bear trap.`;
                if (await check_capacity(qbuf) && beartrap) {
                    obj_extract_self(beartrap);
                    await dropy(beartrap);           /* put it on the floor */
                    return null;
                }
                return beartrap;
            } else if (c === 'q') {
                return null;
            }
            ++game.getobj_else;
        }
        if (game.level.at(game.u.ux, game.u.uy).typ === IRONBARS) {
            /* already verified that hero is metallivorous above */
            const nodig = (game.level.at(game.u.ux, game.u.uy).wall_info & W_NONDIGGABLE) !== 0;

            c = 'n';
            qbuf = 'There are iron bars here';
            if (nodig || game.u.uhunger > 1500) {
                await pline(`${qbuf} but you ${
                    nodig ? 'cannot' : 'are too full to'} eat them.`);
            } else {
                const digging = game.context.digging || {};
                qbuf += (!digging.chew
                         || !u_at(digging.pos?.x, digging.pos?.y)
                         || !on_level(digging.level || {}, game.u.uz))
                        ? '; eat them?'
                        : '; resume eating them?';
                c = await tty_yn_function(qbuf, 'ynq', 'n');
            }
            if (c === 'y')
                return hands_obj;
            else if (c === 'q')
                return null;
            ++game.getobj_else;
        }
        if (uptr !== game.mons[PMNAMES.PM_RUST_MONSTER]
            && (gold = g_at(game.u.ux, game.u.uy)) != null) {
            if (gold.quan === 1)
                qbuf = 'There is 1 gold piece here; eat it?';
            else
                qbuf = `There are ${gold.quan} gold pieces here; eat them?`;
            if ((c = await tty_yn_function(qbuf, 'ynq', 'n')) === 'y') {
                return gold;
            } else if (c === 'q') {
                return null;
            }
            ++game.getobj_else;
        }
    }

    /* Is there some food (probably a heavy corpse) here on the ground? */
    if (!skipfloor)
    for (const otmp of [...(game.level?.objects || [])]) {
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== game.u.ux || otmp.oy !== game.u.uy)
            continue;
        if (corpsecheck
                ? (otmp.otyp === ONAMES.CORPSE
                   && (corpsecheck === 1 || tinnable(otmp)))
                : feeding ? (otmp.oclass !== OCLASSES.COIN_CLASS && is_edible(otmp))
                          : otmp.oclass === OCLASSES.FOOD_CLASS) {
            let qsfx;
            const one = (otmp.quan === 1);

            /* if blind and without gloves, attempting to eat (or tin or
               offer) a cockatrice corpse is fatal before asking whether
               or not to use it; otherwise, 'm<dir>' followed by 'e' could
               be used to locate cockatrice corpses without touching them */
            if (otmp.otyp === ONAMES.CORPSE && will_feel_cockatrice(otmp, false)) {
                await feel_cockatrice(otmp, false);
                /* if life-saved (or poly'd into stone golem), terminate
                   attempt to eat off floor */
                return null;
            }
            /* "There is <an object> here; <verb> it?" or
               "There are <N objects> here; <verb> one?" */
            qbuf = `There ${otense(otmp, 'are')} `;
            qsfx = ` here; ${verb} ${one ? 'it' : 'one'}?`;
            qbuf = safe_qbuf(qbuf, qsfx, otmp, doname, ansimpleoname,
                             one ? 'something' : 'things');
            if ((c = await tty_yn_function(qbuf, 'ynq', 'n')) === 'y')
                return  otmp;
            else if (c === 'q')
                return null;
            ++game.getobj_else;
        }
    }

 /* skipfloor: */
    /* We cannot use GETOBJ_PROMPT since we don't want a prompt in the case
       where nothing edible is being carried. */
    if (feeding) {
        otmp = await getobj('eat', eat_ok, GETOBJ_NOFLAGS);
    } else if (offering) {
        otmp = await getobj('sacrifice', offer_ok, GETOBJ_NOFLAGS);
    } else if (corpsecheck === 2) {
        otmp = await getobj(verb, tin_ok, GETOBJ_NOFLAGS);
    } else {
        /* impossible("floorfood: unknown request (%s)", verb) */
        otmp = null;
    }
    if (otmp && corpsecheck && !(offering && otmp.oclass === OCLASSES.AMULET_CLASS)) {
        if (otmp.otyp !== ONAMES.CORPSE || (corpsecheck === 2 && !tinnable(otmp))) {
            await You_cant(`${verb} that!`);
            otmp = null;
        }
    }
    /* resetting 'getobj_else' here isn't essential; it will be cleared the
       next time it needs to be used */
    game.getobj_else = 0;
    return otmp;
}

// src/eat.c doeat() — the 'e' command.
//
// The eating itself needs the nutrition, corpse and tin code. What is ported is
// the object prompt, because a session that eats and does not have its
// inventory letter consumed runs that letter as a command instead.
/* include/youprop.h Hunger, Slow_digestion, Strangled, Sick, Vomiting,
   Displaced, Slimed; include/attrib.h:43 ATTRMAX(); include/objclass.h:193
   is_organic(); include/youprop.h:22 maybe_polyd(); include/obj.h:316
   stale_egg(); include/flag.h:578 ParanoidEating; include/monst.h:71
   U_AP_TYPE; include/you.h:555 Ugender */
const Hunger = () => !!(game.u.intrinsic?.HHunger || game.u.uprops?.HUNGER);
const Slow_digestion = () => !!(game.u.intrinsic?.HSlow_digestion || game.u.uprops?.SLOW_DIGESTION);
const Strangled = () => !!game.u.uprops?.STRANGLED;
const Sick = () => (game.u.uprops?.SICK | 0);
const Vomiting = () => (game.u.uprops?.VOMITING | 0);
const Displaced = () => !!(game.u.intrinsic?.HDisplaced || game.u.uprops?.DISPLACED);
const Slimed = () => !!game.u.uprops?.SLIMED;
const ATTRMAX = (x) => ((x === A_STR && Upolyd(game.u)) ? uasmon_maxStr() : game.urace.attrmax[x]);
const is_organic = (otmp) => game.objects[otmp.otyp].oc_material <= MATERIALS.WOOD;
const maybe_polyd = (if_so, if_not) => (Upolyd(game.u) ? if_so : if_not);
const stale_egg = (egg) => ((game.moves - egg.age) > (2 * MAX_EGG_HATCH_TIME));
const ParanoidEating = () => ((paranoia_bits() & PARANOID_EATING) !== 0);
const U_AP_TYPE = () => (game.youmonst.m_ap_type & M_AP_TYPMASK);
const Ugender = () => ((Upolyd(game.u) ? game.u.mfemale : game.flags.female) ? 1 : 0);

// src/eat.c:163 eatmdone(); the "mimicking a pile of gold" afternmv
export function eatmdone() {
    /* release `eatmbuf' */
    if (game.eatmbuf) {
        if (game.nomovemsg === game.eatmbuf)
            game.nomovemsg = null;
        game.eatmbuf = null;
    }
    /* update display */
    if (U_AP_TYPE()) {
        game.youmonst.m_ap_type = M_AP_NOTHING;
        newsym(game.u.ux, game.u.uy);
    }
    return 0;
}

// src/eat.c:181 eatmupdate(); called when hallucination is toggled
export function eatmupdate() {
    let altmsg = null;
    let altapp = 0; /* lint suppression */

    if (!game.eatmbuf || game.nomovemsg !== game.eatmbuf)
        return;

    if (is_obj_mappear(game.youmonst, ONAMES.ORANGE) && !Hallucination()) {
        /* revert from hallucinatory to "normal" mimicking */
        altmsg = 'You now prefer mimicking yourself.';
        altapp = ONAMES.GOLD_PIECE;
    } else if (is_obj_mappear(game.youmonst, ONAMES.GOLD_PIECE) && Hallucination()) {
        /* won't happen; anything which might make immobilized
           hero begin hallucinating (black light attack, theft
           of Grayswandir) will terminate the mimicry first */
        altmsg = 'Your rind escaped intact.';
        altapp = ONAMES.ORANGE;
    }

    if (altmsg) {
        /* replace end-of-mimicking message */
        game.nomovemsg = game.eatmbuf = altmsg;
        /* update current image */
        game.youmonst.mappearance = altapp;
        newsym(game.u.ux, game.u.uy);
    }
}

// src/eat.c:309 reset_eat(); flag the meal for do_reset_eat() after this round
export function reset_eat() {
    /* we only set a flag here - the actual reset process is done after
     * the round is spent eating.
     */
    if (game.context.victual?.eating && !game.context.victual.doreset) {
        game.context.victual.doreset = 1;
    }
    return;
}

// src/eat.c:2085 garlic_breath(); iter_mons() callback
async function garlic_breath(mtmp) {
    if (olfaction(mtmp.data) && distu(mtmp.mx, mtmp.my) < 7)
        await monflee(mtmp, 0, false, false);
}

// src/eat.c:91 is_edible(); can the hero eat this?
export function is_edible(obj) {
    /* protect invocation tools but not Rider corpses (handled elsewhere)*/
    /* if (obj->oclass != FOOD_CLASS && obj_resists(obj, 0, 0)) */
    if (game.objects[obj.otyp].oc_unique)
        return false;
    /* above also prevents the Amulet from being eaten, so we must never
       allow fake amulets to be eaten either [which is already the case] */

    if (game.youmonst.data === game.mons[PMNAMES.PM_FIRE_ELEMENTAL]
        && is_flammable(obj))
        return true;

    if (metallivorous(game.youmonst.data) && is_metallic(obj)
        && (game.youmonst.data !== game.mons[PMNAMES.PM_RUST_MONSTER] || is_rustprone(obj)))
        return true;

    /* Ghouls only eat non-veggy corpses or eggs (see dogfood()) */
    if (game.u.umonnum === PMNAMES.PM_GHOUL)
        return ((obj.otyp === ONAMES.CORPSE
                 && !vegan(game.mons[obj.corpsenm]))
                || (obj.otyp === ONAMES.EGG));

    if (game.u.umonnum === PMNAMES.PM_GELATINOUS_CUBE && is_organic(obj)
        /* [g-cubes can eat containers and retain all contents
            as engulfed items, but poly'd player can't do that] */
        && !Has_contents(obj))
        return true;

    return (obj.oclass === OCLASSES.FOOD_CLASS);
}

// src/eat.c:3517 eat_ok() — getobj callback; effectively wraps is_edible().
//
// C's getobj_else tracks "floor food declined" to word the refusal as
// "anything ELSE to eat"; the floor-food prompt machinery is upstream of
// getobj and recorded there.
export function eat_ok(obj) {
    if (!obj)
        return game.getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (is_edible(obj))
        return GETOBJ_SUGGEST;

    /* exclude, not downplay, gold: "You cannot eat gold" comes from getobj */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// src/eat.c:3539 offer_ok(). Corpses and the two Amulet forms remain
// selectable, with Amulets suggested only on the Astral Plane.
function offer_ok(obj) {
    if (!obj)
        return game.getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
    if (obj.oclass !== OCLASSES.FOOD_CLASS
        && obj.oclass !== OCLASSES.AMULET_CLASS)
        return GETOBJ_EXCLUDE;
    if (obj.otyp !== ONAMES.CORPSE
        && obj.otyp !== ONAMES.AMULET_OF_YENDOR
        && obj.otyp !== ONAMES.FAKE_AMULET_OF_YENDOR)
        return GETOBJ_EXCLUDE_SELECTABLE;
    if (Is_astralevel(game.u.uz)
        !== (obj.oclass === OCLASSES.AMULET_CLASS))
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

// src/eat.c:325 obj_nutrition()
export function obj_nutrition(otmp) {
    return (otmp.otyp === ONAMES.CORPSE) ? game.mons[otmp.corpsenm].cnutrit
           : otmp.globby ? otmp.owt
             : game.objects[otmp.otyp].oc_nutrition;
}

/* src/eat.c:137 tintxts[] — tin types
   [SPINACH_TIN = -1, overrides corpsenm, nut==600] */
export const tintxts = [
    { txt: 'rotten', nut: -50, fodder: 0, greasy: 0 },  /* ROTTEN_TIN = 0 */
    { txt: 'homemade', nut: 50, fodder: 1, greasy: 0 }, /* HOMEMADE_TIN = 1 */
    { txt: 'soup made from', nut: 20, fodder: 1, greasy: 0 },
    { txt: 'french fried', nut: 40, fodder: 0, greasy: 1 },
    { txt: 'pickled', nut: 40, fodder: 1, greasy: 0 },
    { txt: 'boiled', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'smoked', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'dried', nut: 55, fodder: 1, greasy: 0 },
    { txt: 'deep fried', nut: 60, fodder: 0, greasy: 1 },
    { txt: 'szechuan', nut: 70, fodder: 1, greasy: 0 },
    { txt: 'broiled', nut: 80, fodder: 0, greasy: 0 },
    { txt: 'stir fried', nut: 80, fodder: 0, greasy: 1 },
    { txt: 'sauteed', nut: 95, fodder: 0, greasy: 0 },
    { txt: 'candied', nut: 100, fodder: 1, greasy: 0 },
    { txt: 'pureed', nut: 500, fodder: 1, greasy: 0 },
    { txt: '', nut: 0, fodder: 0, greasy: 0 },
];
const TTSZ = tintxts.length;

// src/eat.c:1405 tin_variety_txt() — does 's' begin with a tin variety
// word ("pickled ", "boiled ", ...)? Returns the number of characters to
// skip past it (0 for no match); tinvariety is a {v} out-box.
export function tin_variety_txt(s, tinvariety) {
    if (s && tinvariety) {
        tinvariety.v = -1;
        for (let k = 0; k < TTSZ - 1; ++k) {
            const l = tintxts[k].txt.length;
            if (s.toLowerCase().startsWith(tintxts[k].txt.toLowerCase())
                && s.length > l && s[l] === ' ') {
                tinvariety.v = k;
                return l + 1;
            }
        }
    }
    return 0;
}

// src/eat.c:360 touchfood() — split one item off a stack before eating it and
// give it its own inventory slot; also latch its full nutrition into oeaten.
//
// The split is where the meal's rnd(2) comes from: splitobj -> nextoid ->
// next_ident. costly_alteration (shop billing) and the 52-slot overflow drop
// are recorded. The re-slot mirrors C's freeinv + addinv_nomerge using
// assigninvlet's rule: first unused letter, a-z then A-Z.
async function touchfood(otmp) {
    if (otmp.quan > 1) {
        if (!carried(otmp))
            splitobj(otmp, otmp.quan - 1);
        else
            otmp = splitobj(otmp, 1);
    }

    if (!otmp.oeaten) {
        const { costly_alteration } = await import('./shk.js');
        await costly_alteration(otmp, COST_BITE);
        otmp.oeaten = obj_nutrition(otmp);
    }

    if (carried(otmp)) {
        freeinv(otmp);
        if (inv_cnt(false) >= invlet_basic) {
            sellobj_state(SELL_DONTSELL);
            await dropy(otmp);
            sellobj_state(SELL_NORMAL);
            if (otmp.where === OBJ_DELETED)
                otmp = null;
        } else {
            otmp = addinv_nomerge(otmp);
            update_inventory();
        }
    }
    return otmp;
}

// include/eat.c:58 nonrotting_corpse() — the species whose corpses never rot.
const nonrotting_corpse = (mnum) =>
    mnum === PMNAMES.PM_LIZARD || mnum === PMNAMES.PM_LICHEN
    || mnum === PMNAMES.PM_ACID_BLOB;   /* is_rider() is recorded below */

// src/eat.c:217 food_xname() — the name a meal is announced under. For a
// corpse that is corpse_xname()'s singular form; for anything else the
// ordinary singular xname.
function food_xname(food, the_pfx) {
    let result;

    if (food.otyp === ONAMES.CORPSE) {
        /* corpse_xname(food, NULL, CXN_SINGULAR); pmname() prefers the
           NEUTRAL spelling and falls back to MALE — pmnames is
           [male, female, neutral] and species like the jackal only fill
           the neutral slot */
        const pmn = game.mons[food.corpsenm]?.pmnames || [];
        const mnam = pmn[2] ?? pmn[0] ?? pmn[1] ?? 'monster';
        result = `${mnam} corpse`;
        if (type_is_pname(game.mons[food.corpsenm]))
            the_pfx = false;
    } else {
        result = singular(food, xname);
    }
    if (the_pfx)
        result = `the ${result}`;
    return result;
}

// src/eat.c:1855 eatcorpse() — a corpse was chosen as food.
//
// Draw order is the whole point of this function: the rot age rn2(20) comes
// first and is skipped entirely for a non-rotting species, then the tainted,
// acidic, poisonous and mildly-ill arms each draw only on their own branch,
// then the rn2(7) rotten gate, and finally the palatability pair. Returns 2
// when the corpse is used up, 1 when a message already landed, 0 otherwise.
// src/eat.c:1375 violated_vegetarian() — a monk feels guilty and loses
// alignment; everyone's conduct counter ticks.
async function violated_vegetarian() {
    (game.u.uconduct ||= {}).unvegetarian =
        (game.u.uconduct.unvegetarian | 0) + 1;
    if (game.urole?.name?.m === 'Monk') {
        await You_feel('guilty.');
        adjalign(-1);
    }
}

// src/eat.c:568 eating_conducts(), shared by ordinary meals and brain eating.
export async function eating_conducts(pd) {
    const conduct = (game.u.uconduct ||= {});
    conduct.food = (conduct.food | 0) + 1;
    if (!vegan(pd))
        conduct.unvegan = (conduct.unvegan | 0) + 1;
    if (!vegetarian(pd))
        await violated_vegetarian();
}

/* src/eat.c:2491 foodwords[]; indices are enum obj_material_types. */
const foodwords = [
    'meal', 'liquid', 'wax', 'food', 'meat', 'paper', 'cloth', 'leather',
    'wood', 'bone', 'scale', 'metal', 'metal', 'metal', 'silver', 'gold',
    'platinum', 'mithril', 'plastic', 'glass', 'rich food', 'stone',
];

function foodword(otmp) {
    if (otmp.oclass === OCLASSES.FOOD_CLASS)
        return 'food';
    return foodwords[game.objects[otmp.otyp].oc_material] || 'food';
}

// src/eat.c:1799 Hear_again(), called after rotten-food unconsciousness.
async function Hear_again() {
    if (!rn2(2)) {
        (game.u.intrinsic ||= {}).HDeaf = 0;
        (game.disp ||= {}).botl = true;
    }
    return 0;
}

// src/eat.c:1812 rottenfood(). All three conditional draws and their effects
// are kept in source order because a harmless rotten bite still spends them.
async function rottenfood(obj) {
    await pline(`Blecch!  ${is_rottable(obj) ? 'Rotten' : 'Awful'} ${
        foodword(obj)}!`);
    if (!rn2(4)) {
        await You_feel(`rather ${Hallucination() ? 'trippy'
                                                : body_part(LIGHT_HEADED)}.`);
        const { make_confused } = await import('./potion.js');
        await make_confused((game.u.intrinsic?.HConfusion | 0) + d(2, 4),
                            false);
    } else if (!rn2(4) && !game.u.ublind) {
        await pline('Everything suddenly goes dark.');
        const intr = (game.u.intrinsic ||= {});
        intr.HBlinded = (intr.HBlinded | 0) + d(2, 10);
        game.u.ublind = 1;
        game.vision_full_recalc = 1;
        (game.disp ||= {}).botl = true;
    } else if (!rn2(3)) {
        const duration = rnd(10);
        let what, where;

        if (!game.u.ublind) {
            what = 'goes';
            where = 'dark';
        } else if (game.u.uprops?.LEVITATION || Is_airlevel(game.u.uz)
                   || Is_waterlevel(game.u.uz)) {
            what = 'you lose control of';
            where = 'yourself';
        } else {
            what = 'you slap against the';
            where = game.u.usteed ? 'saddle' : surface(game.u.ux, game.u.uy);
        }
        await pline(`The world spins and ${what} ${where}.`);
        const intr = (game.u.intrinsic ||= {});
        intr.HDeaf = (intr.HDeaf | 0) + duration;
        (game.disp ||= {}).botl = true;
        nomul(-duration);
        game.multi_reason = 'unconscious from rotten food';
        game.nomovemsg = 'You are conscious again.';
        game.afternmv = Hear_again;
        return 1;
    }
    return 0;
}

async function eatcorpse(otmp) {
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;
    let rotted = 0;
    let ll_conduct = 0;
    let stoneable;
    const slimeable = (mnum === PMNAMES.PM_GREEN_SLIME && !Slimed() && !Unchanging()
                       && !slimeproof(game.youmonst.data)),
          glob = otmp.globby ? true : false;

    stoneable = (flesh_petrifies(game.mons[mnum]) && !Stone_resistance()
                 && !poly_when_stoned(game.youmonst.data));

    /* KMH, conduct */
    game.u.uconduct ||= {};
    if (!vegan(game.mons[mnum]))
        if (!game.u.uconduct.unvegan++) {
            await livelog_printf(LL_CONDUCT,
                  `consumed animal products for the first time, by eating ${
                      an(food_xname(otmp, false))}`);
            ll_conduct++;
        }
    if (!vegetarian(game.mons[mnum])) {
        if (!game.u.uconduct.unvegetarian && !ll_conduct)
            await livelog_printf(LL_CONDUCT,
                           `tasted meat for the first time, by eating ${
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
        await pline(`Ulch - that ${
            (game.mons[mnum].mlet === MONSYMS.S_FUNGUS) ? 'fungoid vegetation'
            : vegetarian(game.mons[mnum]) ? 'protoplasm'
              : 'meat'} was tainted${cannibal ? ', you cannibal' : ''}!`);
        if (Sick_resistance()) {
            await pline("It doesn't seem at all sickening, though...");
        } else {
            let sick_time;

            sick_time = rn1(10, 10);
            /* make sure new ill doesn't result in improvement */
            if (Sick() && (sick_time > Sick()))
                sick_time = (Sick() > 1) ? Sick() - 1 : 1;
            await make_sick(sick_time, corpse_xname(otmp, 'rotted', CXN_NORMAL),
                            true, SICK_VOMITABLE);

            await pline('(It must have died too long ago to be safe to eat.)');
        }
        if (carried(otmp))
            useup(otmp);
        else
            useupf(otmp, 1);
        return 2;
    } else if (acidic(game.mons[mnum]) && !Acid_resistance()) {
        tp++;
        await You('have a very bad case of stomach acid.');   /* not body_part() */
        await losehp(rnd(15), !glob ? 'acidic corpse' : 'acidic glob',
                     KILLED_BY_AN); /* acid damage */
    } else if (poisonous(game.mons[mnum]) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        if (!Poison_resistance()) {
            await poison_strdmg(rnd(4), rnd(15),
                                !glob ? 'poisonous corpse' : 'poisonous glob',
                                KILLED_BY_AN);
        } else
            await You('seem unaffected by the poison.');

    /* now any corpse left too long will make you mildly ill */
    } else if ((rotted > 5 || (rotted > 3 && rn2(5))) && !Sick_resistance()) {
        tp++;
        await You_feel(`${(Sick()) ? 'very ' : ''}sick.`);
        await losehp(rnd(8), !glob ? 'cadaver' : 'rotted glob', KILLED_BY_AN);
    }

    /* delay is weight dependent */
    (game.context.victual ||= {}).reqtime
        = 3 + ((!glob ? game.mons[mnum].cwt : otmp.owt) >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        if (await rottenfood(otmp)) {
            otmp.orotten = true;
            otmp = await touchfood(otmp);
            if (!otmp)
                return 1;
            retcode = 1;
        }

        if (!game.mons[otmp.corpsenm].cnutrit) {
            /* no nutrition: rots away, no message if you passed out */
            if (!retcode)
                await pline_The('corpse rots away completely.');
            if (carried(otmp))
                useup(otmp);
            else
                useupf(otmp, 1);
            retcode = 2;
        }

        if (!retcode)
            consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum === PMNAMES.PM_COCKATRICE || mnum === PMNAMES.PM_CHICKATRICE)
               && (Stone_resistance() || Hallucination())) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PMNAMES.PM_FLOATING_EYE && game.u.umonnum === PMNAMES.PM_RAVEN) {
        await You('peck the eyeball with delight.');
    } else if (tp) {
        ; /* we've already delivered a message; don't add "it tastes okay" */
    } else {
        /* yummy is always False for omnivores, palatable always True */
        const yummy = (vegan(game.mons[mnum])
                       ? (!carnivorous(game.youmonst.data)
                          && herbivorous(game.youmonst.data))
                       : (carnivorous(game.youmonst.data)
                          && !herbivorous(game.youmonst.data))),
              palatable = ((vegetarian(game.mons[mnum])
                            ? herbivorous(game.youmonst.data)
                            : carnivorous(game.youmonst.data))
                           && rn2(10)
                           && (rotted < 1 || !rn2(rotted + 1)));
        let pmxnam = food_xname(otmp, false);
        const palatable_msgs = [
            /* first char: T = tastes ... , I = is ... */
            /* veggies are always just "okay" */
            'Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough'
        ];
        const idx = vegetarian(game.mons[mnum]) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = (Hallucination() || (palatable && palat_msg[0] === 'I'));

        if (pmxnam.slice(0, 4).toLowerCase() === 'the ')
            pmxnam = pmxnam.slice(4);
        await pline(`${
            type_is_pname(game.mons[mnum])
               ? '' : the_unique_pm(game.mons[mnum]) ? 'The ' : 'This '}${
            pmxnam} ${use_is ? 'is' : 'tastes'} ${
                /* tiger reference is to TV ads for "Frosted Flakes",
                   breakfast cereal targeted at kids by "Tony the tiger" */
            Hallucination()
               ? (yummy ? ((game.u.umonnum === PMNAMES.PM_TIGER) ? 'gr-r-reat' : 'gnarly')
                        : palatable ? 'copacetic' : 'grody')
               : (yummy ? 'delicious' : palatable ?
                  palat_msg.slice(1) : 'terrible')}${
            (yummy || !palatable) ? '!' : '.'}`);
    }

    return retcode;
}

export async function doeat() {
    let otmp = await floorfood('eat', 0);

    if (!otmp)
        return ECMD_OK;
    if (await check_capacity(null))
        return ECMD_OK;

    /* src/eat.c:2864 — "We have to make non-foods take 1 move to eat,
       unless..." — an explicitly chosen non-food is rejected without
       spending the turn. */
    if (!is_edible(otmp)) {
        await You('cannot eat that!');
        return ECMD_OK;
    } else if ((otmp.owornmask & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) !== 0) {
        /* let them eat rings */
        await You_cant(`eat something you're wearing.`);
        return ECMD_OK;
    }

    /* src/eat.c doeat() tail. Tins have their own opening occupation; the
       remaining arms continue through corpse or ordinary-food handling. */
    if (otmp.otyp === ONAMES.TIN) {
        await start_tin(otmp);
        return ECMD_TIME;
    }

    (game.u.uconduct ||= {}).food = (game.u.uconduct.food | 0) + 1;

    let dont_start = false;
    if (otmp.otyp === ONAMES.CORPSE || otmp.globby) {
        /* src/eat.c:2966 — touchfood() precedes eatcorpse(), so oeaten has
           the full corpse nutrition before rottenfood divides it. */
        const already_partly_eaten = !!otmp.oeaten;
        otmp = await touchfood(otmp);
        const v0 = (game.context.victual ||= {});
        v0.piece = otmp;
        v0.o_id = otmp.o_id;
        v0.usedtime = 0;

        /* eatcorpse() sets the unscaled delay and may reduce oeaten. */
        const tmp = await eatcorpse(otmp);

        if (tmp === 2) {
            v0.piece = null;
            v0.o_id = 0;
            return ECMD_TIME;
        } else if (tmp) {
            dont_start = true;
        }

        const basenutrit = obj_nutrition(otmp);
        v0.reqtime = basenutrit === 0 ? 0
                     : rounddiv(v0.reqtime * otmp.oeaten, basenutrit);
        v0.canchoke = (game.u.uhs === SATIATED);
        if (v0.reqtime === 0 || !otmp.oeaten)
            v0.nmod = 0;
        else if (otmp.oeaten >= v0.reqtime)
            v0.nmod = -Math.trunc(otmp.oeaten / v0.reqtime);
        else
            v0.nmod = v0.reqtime % otmp.oeaten;
        if (!dont_start)
            await start_eating(otmp, already_partly_eaten);
        else
            otmp.owt = weight(otmp);
        return ECMD_TIME;
    }

    /* src/eat.c:2966 — latched BEFORE touchfood(), which sets oeaten. */
    const already_partly_eaten = otmp.oeaten ? true : false;

    /* src/eat.c:2968 — touchfood() BEFORE the victual is set up; it may
       replace otmp with the split-off single. */
    otmp = await touchfood(otmp);

    const v = (game.context.victual ||= {});
    v.piece = otmp;
    v.o_id = otmp.o_id;
    v.usedtime = 0;
    v.reqtime = game.objects[otmp.otyp].oc_delay;

    /* src/eat.c:3027 — cursed or old food behaves rotten. The age arm's
       rn2(7) only draws once the food is over 30 (blessed: 50) turns old,
       which is why fresh starting food never spends it. nonrotting_food()
       is lembas or cram (eat.c:65). */
    if (otmp.otyp !== ONAMES.FORTUNE_COOKIE
        && (otmp.cursed
            || (!(otmp.otyp === ONAMES.LEMBAS_WAFER
                  || otmp.otyp === ONAMES.CRAM_RATION)
                && (game.moves - (otmp.age || 0)) > (otmp.blessed ? 50 : 30)
                && (otmp.orotten || !rn2(7))))) {
        /* rottenfood()'s messages and status arms draw in source order. */
        if (await rottenfood(otmp)) {
            otmp.orotten = true;
            dont_start = true;
        }
        consume_oeaten(otmp, 1);        /* oeaten >>= 1 */
    } else if (!already_partly_eaten) {
        if (!(await fprefx(otmp))) {
            await do_reset_eat();
            return ECMD_TIME;
        }
    } else {
        await You(`${v.reqtime === 1 ? "eat" : "begin eating"} ${doname(otmp)}.`);
    }

    /* nutrition units per round eating */
    if (v.reqtime === 0 || !otmp.oeaten)
        v.nmod = 0;
    else if (otmp.oeaten >= v.reqtime)
        v.nmod = -Math.trunc(otmp.oeaten / v.reqtime);
    else
        v.nmod = v.reqtime % otmp.oeaten;

    /* THE death condition: latched ONCE here from the hunger state at the
       moment the meal starts, not re-tested per bite. */
    v.canchoke = (game.u.uhs === SATIATED);

    if (!dont_start)
        await start_eating(otmp, false);
    else
        otmp.owt = weight(otmp);
    return ECMD_TIME;
}

// src/eat.c:2099 fprefx() — the "start to eat" feedback for ordinary food.
// Returns false when the meal is aborted (a pyrolisk egg explodes).
//
// The recording pins the build flags: seed0016's apple prints "Delicious!
// Must be a Macintosh!", which is the #if MACOS arm, so the reference build
// defines MACOS (and, being macOS, UNIX — the PEAR fallthrough).
async function fprefx(otmp) {
    const give_feedback = async () => {
        await pline(`This ${singular(otmp, xname)} is ${
            otmp.cursed
                ? (Hallucination() ? 'grody!' : 'terrible!')
                : (otmp.otyp === ONAMES.CRAM_RATION
                   || otmp.otyp === ONAMES.K_RATION
                   || otmp.otyp === ONAMES.C_RATION)
                    ? 'bland.'
                    : Hallucination() ? 'gnarly!' : 'delicious!'}`);
    };
    switch (otmp.otyp) {
    case ONAMES.EGG:
        if (otmp.corpsenm === PMNAMES.PM_PYROLISK) {
            if (carried(otmp))
                useup(otmp);
            else
                useupf(otmp, 1);
            await explode(game.u.ux, game.u.uy, -11, d(3, 6), 0, EXPL_FIERY);
            return false;
        } else if (stale_egg(otmp)) {
            await pline('Ugh.  Rotten egg.'); /* perhaps others like it */
            /* increasing existing nausea means that it will take longer
               before eventual vomit, but also means that constitution
               will be abused more times before illness completes */
            await make_vomiting((Vomiting() & TIMEOUT) + d(10, 4), true);
        } else
            await give_feedback();
        break;
    case ONAMES.FOOD_RATION: /* nutrition 800 */
        /* 200+800 remains below 1000+1, the satiation threshold */
        if (game.u.uhunger <= 200)
            await pline(`${Hallucination() ? 'Oh wow, like, superior, man'
                                           : 'This food really hits the spot'}!`);

        /* 700-1+800 remains below 1500, the choking threshold which
           triggers "you're having a hard time getting it down" feedback */
        else if (game.u.uhunger < 700)
            await pline(`This satiates your ${body_part(STOMACH)}!`);
        /* [satiation message may be inaccurate if eating gets interrupted] */
        break;
    case ONAMES.TRIPE_RATION:
        if (carnivorous(game.youmonst.data) && !humanoid(game.youmonst.data)) {
            await pline('This tripe ration is surprisingly good!');
        } else if (maybe_polyd(is_orc(game.youmonst.data), Race_if(PMNAMES.PM_ORC))) {
            await pline(Hallucination() ? 'Tastes great!  Less filling!'
                                        : 'Mmm, tripe... not bad!');
        } else {
            await pline('Yak - dog food!');
            more_experienced(1, 0);
            await newexplevel();
            /* not cannibalism, but we use similar criteria
               for deciding whether to be sickened by this meal */
            if (rn2(2) && !CANNIBAL_ALLOWED())
                await make_vomiting(rn1(game.context.victual.reqtime, 14),
                                    false);
        }
        break;
    case ONAMES.LEMBAS_WAFER:
        if (maybe_polyd(is_orc(game.youmonst.data), Race_if(PMNAMES.PM_ORC))) {
            await pline('!#?&* elf kibble!');
            break;
        } else if (maybe_polyd(is_elf(game.youmonst.data), Race_if(PMNAMES.PM_ELF))) {
            await pline('A little goes a long way.');
            break;
        }
        await give_feedback();
        break;
    case ONAMES.MEATBALL:
    case ONAMES.MEAT_STICK:
    case ONAMES.ENORMOUS_MEATBALL:
    case ONAMES.MEAT_RING:
        await give_feedback();
        break;
    case ONAMES.CLOVE_OF_GARLIC:
        if (is_undead(game.youmonst.data)) {
            await make_vomiting(rn1(game.context.victual.reqtime, 5), false);
            break;
        }
        /* iter_mons(garlic_breath); monflee() prints, so the walk is awaited */
        for (const mtmp of [...(game.level?.monsters || [])])
            if (!DEADMONSTER(mtmp))
                await garlic_breath(mtmp);
        /*FALLTHRU*/
    default:
        if (otmp.otyp === ONAMES.SLIME_MOLD && !otmp.cursed
            && otmp.spe === (game.context.current_fruit ?? 1)) {
            await pline(`My, this is a ${
                Hallucination() ? 'primo' : 'yummy'} ${
                singular(otmp, xname)}!`);
        } else if (otmp.otyp === ONAMES.APPLE && otmp.cursed && !Sleep_resistance()) {
            ; /* skip core joke; feedback deferred til fpostfx() */

        /* KMH -- Why should Unix have all the fun?
           We check MACOS before UNIX to get the Apple-specific apple
           message; the '#if UNIX' code will still kick in for pear.
           (the reference build defines MACOS and UNIX) */
        } else if (otmp.otyp === ONAMES.APPLE) {
            await pline('Delicious!  Must be a Macintosh!');
        } else if (otmp.otyp === ONAMES.PEAR) {
            if (!Hallucination()) {
                await pline('Core dumped.');
            } else {
                /* based on an old Usenet joke, a fake a.out manual page */
                const x = rnd(100);

                await pline(`${
                    (x <= 75)
                       ? 'Segmentation fault'
                       : (x <= 99)
                          ? 'Bus error'
                          : "Yo' mama"} -- core dumped.`);
            }
        } else {
            await give_feedback();
        }
        break; /* default */
    } /* switch */
    return true;
}

// src/eat.c:2510 fpostfx() — the food's after-effects. The reachable arms:
// the fortune cookie's rumor and the apple/pear "core dumped" deferral. The
// stat-gain foods (royal jelly, giant corpses via cpostfx) and the wolfsbane
// and carrot cures are gated on state no current hero has.
async function fpostfx(otmp) {
    switch (otmp.otyp) {
    case ONAMES.SPRIG_OF_WOLFSBANE:
        if (ismnum(game.u.ulycn) || is_were(game.youmonst.data))
            await you_unwere(true);
        break;
    case ONAMES.CARROT:
        if (!game.u.uswallow
            || !attacktype_fordmg(game.u.ustuck.data, ATTKS.AT_ENGL, ATTKS.AD_BLND))
            await make_blinded(game.u.ucreamed | 0, true);
        break;
    case ONAMES.FORTUNE_COOKIE:
        await outrumor(bcsign(otmp), BY_COOKIE);
        if (!Blind()) {
            game.u.uconduct ||= {};
            if (!game.u.uconduct.literate++)
                await livelog_printf(LL_CONDUCT,
                    'became literate by reading the fortune inside a cookie');
        }
        break;
    case ONAMES.LUMP_OF_ROYAL_JELLY:
        if (game.youmonst.data === game.mons[PMNAMES.PM_KILLER_BEE] && !Unchanging()
            && await polymon(PMNAMES.PM_QUEEN_BEE))
            break;

        /* This stuff seems to be VERY healthy! */
        await gainstr(otmp, 1, true);
        if (Upolyd(game.u)) {
            game.u.mh += otmp.cursed ? -rnd(20) : rnd(20), (game.disp ||= {}).botl = true;
            if (game.u.mh > game.u.mhmax) {
                if (!rn2(17))
                    setuhpmax(game.u.mhmax + 1, false);
                game.u.mh = game.u.mhmax;
            } else if (game.u.mh <= 0) {
                await rehumanize();
            }
        } else {
            game.u.uhp += otmp.cursed ? -rnd(20) : rnd(20), (game.disp ||= {}).botl = true;
            if (game.u.uhp > game.u.uhpmax) {
                if (!rn2(17))
                    setuhpmax(game.u.uhpmax + 1, false);
                game.u.uhp = game.u.uhpmax;
            } else if (game.u.uhp <= 0) {
                (game.killer ||= {}).format = KILLED_BY_AN;
                game.killer.name = 'rotten lump of royal jelly';
                await done(POISONING);
            }
        }
        if (!otmp.cursed)
            await heal_legs(0);
        break;
    case ONAMES.EGG:
        if (ismnum(otmp.corpsenm)
            && flesh_petrifies(game.mons[otmp.corpsenm])) {
            if (!Stone_resistance()
                && !(poly_when_stoned(game.youmonst.data)
                     && await polymon(PMNAMES.PM_STONE_GOLEM))) {
                if (!Stoned()) {
                    (game.killer ||= {}).name = `${game.mons[otmp.corpsenm].pmnames[NEUTRAL]} egg`;
                    await make_stoned(5, null, KILLED_BY_AN,
                                      game.killer.name);
                }
            }
            /* note: no "tastes like chicken" message for eggs */
        }
        break;
    case ONAMES.EUCALYPTUS_LEAF:
        if (Sick() && !otmp.cursed)
            await make_sick(0, null, true, SICK_ALL);
        if (Vomiting() && !otmp.cursed)
            await make_vomiting(0, true);
        break;
    case ONAMES.APPLE:
        if (otmp.cursed && !Sleep_resistance()) {
            /* Snow White; 'poisoned' applies to [a subset of] weapons,
               not food, so we substitute cursed; fortunately our hero
               won't have to wait for a prince to be rescued/revived */
            if (Race_if(PMNAMES.PM_DWARF) && Hallucination()) {
                await verbalize("Heigh-ho, ho-hum, I think I'll skip work today.");
            } else if (Deaf() || game.flags?.acoustics === false) {
                await You('fall asleep.');
            } else {
                /* Soundeffect(se_sinister_laughter, 100); */
                await You_hear('sinister laughter as you fall asleep...');
            }
            await fall_asleep(-rn1(11, 20), true);
        }
        break;
    }
    return;
}

// src/eat.c:2022 start_eating(), begin or resume a meal.
//
// bite() is called BEFORE usedtime is incremented, so a one-turn meal eaten
// while Satiated chokes on the very first call rather than after finishing.
export async function start_eating(otmp, already_partly_eaten) {
    const v = game.context.victual;

    v.fullwarn = 0;
    v.doreset = 0;
    v.eating = 1;

    if (otmp.otyp === ONAMES.CORPSE || otmp.globby) {
        await cprefx(game.context.victual.piece.corpsenm);
        if (!game.context.victual.piece || !game.context.victual.eating)
            return;
    }

    const old_nomovemsg = game.nomovemsg;
    if (await bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if (++v.usedtime >= v.reqtime) {
            /* C brackets this call with a save/restore of gn.nomovemsg so
               that done_eating() does not issue one when the reason we got
               here is a vomit() from bite(). */
            const save = game.nomovemsg;
            if (!old_nomovemsg)
                game.nomovemsg = null;
            await done_eating(false);
            if (!old_nomovemsg)
                game.nomovemsg = save;
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

function note_unported_eat(what) {
    (game.unported ||= new Set()).add(what);
}

// src/eat.c:245 choke() — the hero eats past Satiated and dies.
//
// This is seed0030's first death and the blocker for seven sessions. The
// guard is the SATIATED state, not the food: eating an ordinary meal chokes
// only when u.uhs is already SATIATED, and anything else returns immediately
// unless it is an amulet of strangulation.
//
// The rn2(20) is the only draw, and it is short-circuited by Breathless or
// Hunger, so a hero with either spends nothing here.
export async function choke(food) {
    /* only happens if you were satiated */
    if (game.u.uhs !== SATIATED) {
        if (!food || food.otyp !== ONAMES.AMULET_OF_STRANGULATION)
            return;
    } else if (Role_if(PMNAMES.PM_KNIGHT) && game.u.ualign.type === A_LAWFUL) {
        await adjalign(-1); /* gluttony is unchivalrous */
        await You_feel('like a glutton!');
    }

    exercise(A_CON, false);

    if (Breathless() || Hunger() || (!Strangled() && !rn2(20))) {
        /* choking by eating AoS doesn't involve stuffing yourself */
        if (food && food.otyp === ONAMES.AMULET_OF_STRANGULATION) {
            await You('choke, but recover your composure.');
            return;
        }
        await You('stuff yourself and then vomit voluminously.');
        await morehungry(Hunger() ? (game.u.uhunger - 60) : 1000); /* just got very sick! */
        await vomit();
    } else {
        (game.killer ||= {}).format = KILLED_BY_AN;
        /*
         * Note all "killer"s below read "Choked on %s" on the
         * high score list & tombstone.  So plan accordingly.
         */
        if (food) {
            await You(`choke over your ${foodword(food)}.`);
            if (food.oclass === OCLASSES.COIN_CLASS) {
                game.killer.name = 'very rich meal';
            } else {
                game.killer.format = KILLED_BY;
                game.killer.name = killer_xname(food);
            }
        } else {
            await You('choke over it.');
            game.killer.name = 'quick snack';
        }
        await You('die...');
        await done(CHOKING);
    }
}

// src/eat.c:3132 bite() — one turn of eating. Returns 1 if the hero choked and
// survived, 0 otherwise.
//
// The choke gate is the whole reason this function matters here:
//
//     if (victual.canchoke && u.uhunger >= 2000) { choke(piece); return 1; }
//
// so the death is a consequence of ACCUMULATED nutrition, not of the meal.
export async function bite() {
    const v = game.context?.victual;
    if (!v)
        return 0;

    if (v.canchoke && game.u.uhunger >= 2000) {
        await choke(v.piece);
        return 1;
    }
    if (v.doreset) {
        await do_reset_eat();     /* src/eat.c:3142 -- ported at eat.js:307 */
        return 0;
    }
    /* src/eat.c bite() tail — force_save_hs makes lesshungry() treat this as
       eating even though the occupation check would not; see lesshungry. */
    game.force_save_hs = true;
    if (v.nmod < 0) {
        await lesshungry(adj_victual_nutrition());
        consume_oeaten(v.piece, v.nmod);        /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        await lesshungry(1);
        consume_oeaten(v.piece, -1);            /* -= 1 */
    }
    game.force_save_hs = false;
    recalc_wt();
    return 0;
}

// src/eat.c eatfood() — the occupation callback. Returns 1 while still busy,
// 0 when the meal is over (or was interrupted).
//
// usedtime is incremented BEFORE bite(), and the test is <= reqtime rather
// than < , so the last turn of a meal still takes a bite. Writing it as < , or
// biting before incrementing, drops that final bite -- and for a Satiated hero
// that final bite is the one that chokes.
// src/eat.c:1491 tin_variety(). This is needed before even an empty tin can
// be identified because C chooses and stores no variety for a fresh tin.
function tin_variety(tin) {
    let r;
    if (tin.spe === 1)
        return -1;
    if (tin.cursed)
        return 0;
    if (tin.spe < 0)
        r = -tin.spe - 1;
    else
        r = rn2(TTSZ - 1);

    if (r === HOMEMADE_TIN && !tin.blessed && !rn2(7))
        r = 0;
    if (r === 0 && tin.corpsenm !== NON_PM
        && nonrotting_corpse(tin.corpsenm))
        r = HOMEMADE_TIN;
    return r;
}

async function use_up_tin(tin) {
    if (carried(tin))
        useup(tin);
    else
        await useupf(tin, 1);
    const tc = (game.context ||= {}).tin ||= {};
    tc.tin = null;
    tc.o_id = 0;
}

// src/eat.c:1389 costly_tin(). Splitting first keeps the untouched remainder
// in place and charges only the opened or destroyed tin.
async function costly_tin(tin, alter_type) {
    const { costly_alteration, costly_spot } = await import('./shk.js');
    const inInventory = carried(tin);
    const billable = inInventory ? tin.unpaid
                                 : costly_spot(tin.ox, tin.oy) && !tin.no_charge;
    if (!billable)
        return tin;

    if (tin.quan > 1) {
        tin = splitobj(tin, 1);
        const tc = (game.context ||= {}).tin ||= {};
        tc.tin = tin;
        tc.o_id = tin.o_id;
    }
    await costly_alteration(tin, alter_type);
    return tin;
}

// src/attrib.c:203 gainstr(), with the tin as the BUC source and no message.
async function gainstr_from_tin(tin) {
    const base = game.u.acurr?.a?.[A_STR] ?? 0;
    let amount;
    if (base < 18)
        amount = rn2(4) ? 1 : rnd(6);
    else if (base < STR18(85))
        amount = rnd(10);
    else
        amount = 1;
    await adjattrib(A_STR, tin.cursed ? -amount : amount, 1);
}

// src/eat.c:1528 consume_tin().
async function consume_tin(mesg) {
    const tc = (game.context ||= {}).tin ||= {};
    let tin = tc.tin;
    const r = tin_variety(tin);
    const always_eat = metallivorous(game.youmonst.data);

    if (tin.otrapped || (tin.cursed && r !== HOMEMADE_TIN && !rn2(8))) {
        await b_trapped('tin', NO_PART);
        tin = await costly_tin(tin, COST_DSTROY);
        await use_up_tin(tin);
        return;
    }

    await pline(mesg);
    if (r !== -1 && tin.corpsenm === NON_PM) {
        if (Hallucination())
            await pline(`It's full of ${rn2(2) ? 'air elemental souffle'
                                               : 'dehydrated water'}.`);
        else
            await pline('It turns out to be empty.');
        observe_object(tin);
        tin.known = 1;
        tin = await costly_tin(tin, COST_OPEN);
        await use_up_tin(tin);
        if (always_eat)
            await lesshungry(5);
        return;
    }

    if (r !== -1) {
        const mnum = tin.corpsenm;
        const mdat = game.mons[mnum];
        let what;
        let which = 0;

        if ((mnum === PMNAMES.PM_COCKATRICE
             || mnum === PMNAMES.PM_CHICKATRICE)
            && (Stone_resistance() || Hallucination())) {
            what = 'chicken';
            which = 1;
        } else if (Hallucination()) {
            what = rndmonnam();
        } else {
            what = mdat?.pmnames?.[2] ?? mdat?.pmnames?.[0] ?? 'monster';
            if (!type_is_pname(mdat) && (mdat.geno & MFLAGS_EAT.G_UNIQ))
                which = 2;
            else if (type_is_pname(mdat))
                which = 1;
        }
        if (which === 0)
            what = makeplural(what);
        else if (which === 2)
            what = the(what);

        if (!always_eat) {
            await pline(`It smells like ${what}.`);
            if ((await tty_yn_function('Eat it?', 'yn', 'n')) === 'n') {
                if (game.flags?.verbose !== false)
                    await You('discard the open tin.');
                if (!Hallucination()) {
                    observe_object(tin);
                    tin.known = 1;
                }
                tin = await costly_tin(tin, COST_OPEN);
                await use_up_tin(tin);
                return;
            }
        }

        game.context.victual = {};
        const meat = mdat?.pmnames?.[2] ?? mdat?.pmnames?.[0] ?? 'monster';
        await You(`consume ${tintxts[r].txt} ${meat}.`);
        await eating_conducts(mdat);
        observe_object(tin);
        tin.known = 1;
        tin = game.context.tin.tin = await costly_tin(tin, COST_OPEN);

        await cprefx(mnum);
        if (game.context.tin.tin)
            await cpostfx(mnum);
        if (!game.context.tin.tin)
            return;

        if (tintxts[r].nut < 0) {
            const { make_vomiting } = await import('./potion.js');
            await make_vomiting(rn1(15, 10), false);
        } else {
            let nutrition = tintxts[r].nut;
            if (r === HOMEMADE_TIN && nutrition > mdat.cnutrit)
                nutrition = mdat.cnutrit;
            if (always_eat)
                nutrition += 5;
            await use_up_tin(tin);
            await lesshungry(nutrition);
        }
        if (tintxts[r].greasy) {
            const already_glib = (game.u.intrinsic?.HGlib | 0) & TIMEOUT;
            const { make_glib } = await import('./potion.js');
            make_glib(already_glib + rn1(11, 5));
            const fingers = game.u.uarmg
                ? gloves_simple_name(game.u.uarmg)
                : makeplural(body_part(FINGER));
            await pline('Eating ' + tintxts[r].txt + ' food made your '
                        + fingers + ' '
                        + (already_glib ? 'even more' : 'very')
                        + ' slippery.');
        }
        if (game.context.tin.tin)
            await use_up_tin(tin);
        return;
    }

    if (tin.cursed) {
        await pline('It contains some decaying'
                    + (Blind() ? '' : ' ' + hcolor(NH_GREEN))
                    + ' substance.');
    } else {
        await pline('It contains spinach.');
        observe_object(tin);
        tin.known = 1;
    }
    if (!always_eat
        && (await tty_yn_function('Eat it?', 'yn', 'n')) === 'n') {
        if (game.flags?.verbose !== false)
            await You('discard the open tin.');
        tin = await costly_tin(tin, COST_OPEN);
        await use_up_tin(tin);
        return;
    }
    const conduct = game.u.uconduct ||= {};
    conduct.food = (conduct.food | 0) + 1;
    if (!tin.cursed) {
        await pline(`This makes you feel like ${Hallucination()
                     ? "Swee'pea" : 'Popeye'}!`);
    }
    await gainstr_from_tin(tin);
    tin = await costly_tin(tin, COST_OPEN);

    let nutrition = tin.blessed ? 600
                    : !tin.cursed ? 400 + rnd(200)
                      : 200 + rnd(400);
    if (always_eat)
        nutrition += 5;
    await use_up_tin(tin);
    await lesshungry(nutrition);
}

// src/eat.c:1703 opentin() and :1723 start_tin(). Applying a tin opener and
// eating a tin directly share this timing state machine.
async function opentin() {
    const tc = game.context?.tin;
    const tin = tc?.tin;
    if (!tin || (!carried(tin)
        && (!obj_here(tin, game.u.ux, game.u.uy) || !can_reach_floor(true))))
        return 0;
    if (tc.usedtime++ >= 50) {
        await You('give up your attempt to open the tin.');
        return 0;
    }
    if (tc.usedtime < tc.reqtime)
        return 1;

    await consume_tin('You succeed in opening the tin.');
    return 0;
}

export async function start_tin(tin) {
    let mesg = null;
    let delay;

    if (metallivorous(game.youmonst.data)) {
        mesg = 'You bite right into the metal tin...';
        delay = 0;
    } else if (cantwield(game.youmonst.data)) {
        await You('cannot handle the tin properly to open it.');
        return;
    } else if (tin.blessed) {
        delay = game.u.uwep?.blessed
                && game.u.uwep.otyp === ONAMES.TIN_OPENER ? 0 : rn2(2);
        if (!delay)
            mesg = 'The tin opens like magic!';
        else
            await pline('The tin seems easy to open.');
    } else if (game.u.uwep?.otyp === ONAMES.TIN_OPENER) {
        mesg = 'You easily open the tin.';
        delay = rn2(game.u.uwep.cursed ? 3
                    : !game.u.uwep.blessed ? 2 : 1);
        await pline(`Using ${yobjnam(game.u.uwep, null)} you try to open the tin.`);
    } else {
        const uwep = game.u.uwep;
        let using_tool = true;

        switch (uwep?.otyp) {
        case ONAMES.DAGGER:
        case ONAMES.SILVER_DAGGER:
        case ONAMES.ELVEN_DAGGER:
        case ONAMES.ORCISH_DAGGER:
        case ONAMES.ATHAME:
        case ONAMES.KNIFE:
        case ONAMES.STILETTO:
        case ONAMES.CRYSKNIFE:
            delay = 3;
            break;
        case ONAMES.PICK_AXE:
        case ONAMES.AXE:
            delay = 6;
            break;
        default:
            using_tool = false;
            break;
        }

        if (using_tool) {
            await pline('Using ' + yobjnam(uwep, null)
                        + ' you try to open the tin.');
        } else {
            await pline('It is not so easy to open this tin.');
            if (Glib()) {
                await pline('The tin slips from your fingers.');
                if (tin.quan > 1)
                    tin = splitobj(tin, 1);
                if (carried(tin)) {
                    const { dropx } = await import('./do.js');
                    await dropx(tin);
                } else {
                    stackobj(tin);
                }
                return;
            }
            delay = rn1(1 + Math.trunc(500 / (ACURR(A_DEX) + acurrstr())),
                        10);
        }
    }

    const tc = (game.context ||= {}).tin ||= {};
    tc.tin = tin;
    tc.o_id = tin.o_id;
    if (!delay) {
        await consume_tin(mesg);
    } else {
        tc.reqtime = delay;
        tc.usedtime = 0;
        set_occupation(opentin, 'opening the tin', 0);
    }
}

export async function eatfood() {
    const v = game.context.victual;
    let food = v?.piece;

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
        return 1;                       /* still busy */
    }
    await done_eating(true);
    return 0;
}


// src/invent.c obj_here() — is this object on that square?
const obj_here = (o, x, y) => o.ox === x && o.oy === y;

// src/eat.c done_eating() — the meal finished normally.
//
// Order matters: go.occupation is cleared BEFORE newuhs(), with the C's own
// comment "do this early, so newuhs() knows we're done". newuhs recomputes the
// hunger state, and it reads whether an occupation is running.
export async function done_eating(message) {
    const v = game.context.victual;
    const piece = v.piece;

    if (piece)
        piece.in_use = true;
    game.occupation = null;             /* early, so newuhs knows we're done */
    await newuhs(false);

    if (game.nomovemsg) {
        if (message)
            await pline(game.nomovemsg);
        game.nomovemsg = null;
    } else if (message) {
        /* You("finish eating %s.", food_xname(piece, TRUE)) */
        await You(`finish eating ${food_xname(piece, true)}.`);
    }

    if (piece && (piece.otyp === ONAMES.CORPSE || piece.globby))
        await cpostfx(piece.corpsenm);
    else if (piece)
        await fpostfx(piece);

    /* the object leaves by one of two doors: useup() when carried, useupf()
       when it is lying on the floor (src/eat.c:568, :570). Both are ported;
       useupf's shop-billing arm records inside useupf itself. */
    if (piece) {
        if (carried(piece))
            useup(piece);
        else
            await useupf(piece, 1);
    }

    game.context.victual = {};          /* zero_victual */
}

// src/eat.c do_reset_eat() — the meal was interrupted.
//
// canchoke is deliberately NOT cleared: the C comment says so outright, because
// resuming the same food has to remember whether the hero was Satiated when
// they STARTED it. Clearing it here would let a hero resume a meal that should
// still kill them.
export async function do_reset_eat() {
    if (game.context.victual?.piece) {
        let otmp;

        game.context.victual.o_id = 0;
        otmp = await touchfood(game.context.victual.piece);
        game.context.victual.piece = otmp;
        if (otmp) {
            game.context.victual.o_id = otmp.o_id;
            recalc_wt();
        }
    }
    const v = (game.context.victual ||= {});
    v.fullwarn
        = v.eating
        = v.doreset
        = 0;
    /* Do not set canchoke to FALSE; if we continue eating the same object
     * we need to know if canchoke was set when they started eating it the
     * previous time.  And if we don't continue eating the same object
     * canchoke always gets recalculated anyway.
     */
    await stop_occupation();
    await newuhs(false);
}

// src/eat.c newuhs() — recompute the hunger status from u.uhunger.
//
// The state table is the part the choke death depends on:
//
//     h > 1000 -> SATIATED, > 150 -> NOT_HUNGRY, > 50 -> HUNGRY,
//     > 0 -> WEAK, else FAINTING
//
// Note SATIATED starts at 1001 but choke() needs u.uhunger >= 2000 as well,
// so there is a wide band where the hero is Satiated and eating is safe.
//
// save_hs/saved_hs exist so that passing WEAK -> HUNGRY -> NOT_HUNGRY during a
// single meal produces one message about the whole meal rather than one per
// bite; the C's comment block says the occupation test alone is not enough
// because start_eating calls bite() before setting the occupation.
export async function newuhs(incr) {
    const h = game.u.uhunger;
    const newhs = (h > 1000) ? SATIATED
                : (h > 150)  ? NOT_HUNGRY
                : (h > 50)   ? HUNGRY
                : (h > 0)    ? WEAK
                             : FAINTING;

    /* mid-meal: remember the status we started at and report once at the end */
    if (game.occupation === eatfood || game.force_save_hs) {
        if (!game.saved_hs) {
            game.save_hs = game.u.uhs;
            game.saved_hs = true;
        }
        game.u.uhs = newhs;
        return;
    }
    if (game.saved_hs) {
        /* the whole-meal comparison: restore the status the meal started
           at, so the message switch below sees start -> end */
        game.u.uhs = game.save_hs;
        game.saved_hs = false;
    }

    let newhs2 = newhs;
    if (newhs2 === FAINTING) {
        /* u.uhunger is likely to be negative at this point */
        const uhunger_div_by_10 = sgn(game.u.uhunger)
            * Math.trunc((Math.abs(game.u.uhunger) + 5) / 10);

        if (is_fainted())
            newhs2 = FAINTED;
        if (game.u.uhs <= WEAK
            || rn2(20 - uhunger_div_by_10) >= 19) {
            if (!is_fainted() && (game.multi ?? 0) >= 0) {
                const duration = 10 - uhunger_div_by_10;

                /* stop what you're doing, then faint */
                await stop_occupation();
                await You('faint from lack of food.');
                {
                    /* incr_itimeout(&HDeaf, duration) */
                    const intr = (game.u.intrinsic ||= {});
                    let long_val = ((intr.HDeaf | 0) & TIMEOUT) + duration;
                    if (long_val > TIMEOUT)
                        long_val = TIMEOUT;
                    intr.HDeaf = ((intr.HDeaf | 0) & ~TIMEOUT) | long_val;
                }
                (game.disp ||= {}).botl = true;
                nomul(-duration);
                game.multi_reason = 'fainted from lack of food';
                game.nomovemsg = 'You regain consciousness.';
                game.afternmv = unfaint;
                newhs2 = FAINTED;
                if (!Levitation())
                    await selftouch('Falling, you');
            }
        } else if (game.u.uhunger
                   < -(100 + 10 * Number(ACURR(A_CON)))) {
            game.u.uhs = STARVED;
            (game.disp ||= {}).botl = true;
            await bot();
            await You('die from starvation.');
            game.killer = { format: KILLED_BY, name: 'starvation' };
            await done(STARVING);
            /* if we return, we lifesaved, and that calls newuhs */
            return;
        }
    }

    if (newhs2 !== game.u.uhs) {
        if (newhs2 >= WEAK && game.u.uhs < WEAK) {
            /* temporary Str loss overrides Fixed_abil */
            game.u.atemp.a[A_STR] = -1;
        } else if (newhs2 < WEAK && game.u.uhs >= WEAK) {
            game.u.atemp.a[A_STR] = 0;
        }

        switch (newhs2) {
        case HUNGRY:
            if (Hallucination()) {
                await You(!incr ? 'now have a lesser case of the munchies.'
                                : 'are getting the munchies.');
            } else
                await You(`${!incr ? 'only feel hungry now'
                           : (game.u.uhunger < 145) ? 'feel hungry'
                             : 'are beginning to feel hungry'}.`);
            if (incr && game.occupation
                && (game.occupation !== eatfood
                    && game.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        case WEAK:
            if (Hallucination())
                await pline(!incr ? 'You still have the munchies.'
                    : 'The munchies are interfering with your motor '
                      + 'capabilities.');
            else if (incr && (game.urole?.name?.m === 'Wizard'
                              || Race_if(PMNAMES.PM_ELF)
                              || game.urole?.name?.m === 'Valkyrie'))
                await pline(`${(game.urole?.name?.m === 'Wizard'
                                || game.urole?.name?.m === 'Valkyrie')
                               ? game.urole.name.m : 'Elf'}`
                            + ' needs food, badly!');
            else
                await You(`${!incr ? 'are still'
                           : (game.u.uhunger < 45) ? 'feel'
                             : 'are beginning to feel'} weak.`);
            if (incr && game.occupation
                && (game.occupation !== eatfood
                    && game.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        }
        game.u.uhs = newhs2;
        (game.disp ||= {}).botl = true;
        await bot();
        if (game.u.uhp < 1) {
            await You('die from hunger and exhaustion.');
            game.killer = { format: KILLED_BY, name: 'exhaustion' };
            await done(STARVING);
            return;
        }
    }
}

// src/eat.c maybe_finished_meal() — finish a meal that consume_oeaten has
// already exhausted, rather than reporting it as interrupted.
//
// stop_occupation calls this FIRST and only prints "You stop <occtxt>." when it
// returns FALSE, so omitting it both leaves the food half-eaten and prints a
// message C does not.
//
// `stopping` clears the occupation BEFORE eatfood() runs, which the C notes is
// "for do_reset_eat" -- eatfood checks the occupation, so leaving it set makes
// the meal look still-in-progress to its own callback.
export async function maybe_finished_meal(stopping) {
    const v = game.context?.victual;

    if (game.occupation === eatfood && v && v.usedtime >= v.reqtime) {
        if (stopping)
            game.occupation = null;     /* for do_reset_eat */
        await eatfood();                /* calls done_eating to use the food up */
        return true;
    }
    return false;
}

// src/eat.c morehungry() — spend nutrition and re-evaluate the hunger state.
// newuhs() can draw through its fainting arm, so this is not bookkeeping.
export async function morehungry(num) {
    game.u.uhunger -= num;
    await newuhs(true);
}

// src/eat.c:3736 vomit() -- ordinary vomiting immobilizes the hero for two
// turns. Polymorph-only acid breath and terrain side effects are not live in
// the reference corpus yet.
export async function vomit() /* A good idea from David Neves */
{
    let spewed = false;

    if (cantvomit(game.youmonst.data)) {
        /* doesn't cure food poisoning; message assumes that we aren't
           dealing with some esoteric body_part() */
        await Your('jaw gapes convulsively.');
    } else {
        if (Sick() && (game.u.usick_type & SICK_VOMITABLE) !== 0)
            await make_sick(0, null, true, SICK_VOMITABLE);
        /* if not enough in stomach to actually vomit then dry heave;
           vomiting_dialog() gives a vomit message when its countdown
           reaches 0, but only if u.uhs < FAINTING (and !cantvomit()) */
        if (game.u.uhs >= FAINTING)
            await Your(`${body_part(STOMACH)} heaves convulsively!`);
        else
            spewed = true;
    }

    /* nomul()/You_can_move_again used to be unconditional, which was
       viable while eating but not for Vomiting countdown where hero might
       be immobilized for some other reason at the time vomit() is called */
    if ((game.multi ?? 0) >= -2) {
        nomul(-2);
        game.multi_reason = 'vomiting';
        game.nomovemsg = 'You can move again.';
    }

    if (spewed) {
        const mattk = attacktype_fordmg(game.youmonst.data, ATTKS.AT_BREA, ATTKS.AD_ACID);

        /* currently, only yellow dragons can breathe acid */
        if (mattk) {
            await You('breathe acid on yourself...'); /* [why?] */
            await ubreatheu(mattk);
        }
        /* vomiting on an altar is, all things considered, rather impolite */
        if (IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ))
            await altar_wrath(game.u.ux, game.u.uy);
        /* if poly'd into acidic form, stomach acid is stronger than normal */
        if (acidic(game.youmonst.data)) {
            /* TODO: if there's a web here, destroy that too (before ice) */
            if (is_ice(game.u.ux, game.u.uy))
                await melt_ice(game.u.ux, game.u.uy,
                               'Your stomach acid melts straight through the ice!');
        }
    }
}

// src/eat.c recalc_wt() — the piece being eaten gets lighter.
//
// Three lines of substance: owt is recomputed from weight() as the meal is
// consumed. C's impossible() on a missing piece is a programming-error
// report, not a game event, so it is recorded rather than made to throw.
export function recalc_wt() {
    const piece = game.context.victual?.piece;

    if (!piece) {
        /* impossible("recalc_wt without piece") */
        return;
    }
    piece.owt = weight(piece);
}

// src/eat.c adj_victual_nutrition() — race-adjusted nutrition for the two
// foods that care.
//
// Called ONLY when nmod is negative, which is why the first thing it does is
// negate it; C says so in a comment and asserts nut > 0.
//
// Elves get a quarter more from a lembas wafer and orcs a quarter less
// (800 -> 1000 or 600); dwarves get a sixth more from a cram ration
// (600 -> 700). The roundings differ -- (nut+2)/4 twice, (nut+3)/6 once --
// and are C's, not a uniform formula.
//
// maybe_polyd checks the POLYFORM first and the race second, so a
// polymorphed hero is judged by what it currently is. That is recorded;
// polyform is not modelled, so the race test alone decides here.
export function adj_victual_nutrition() {
    const otyp = game.context.victual.piece.otyp;
    /* note: adj_victual_nutrition() is only called when 'nmod' is negative */
    let nut = -game.context.victual.nmod; /* convert 'nmod' to positive */

    if (otyp === ONAMES.LEMBAS_WAFER) {
        if (maybe_polyd(is_elf(game.youmonst.data), Race_if(PMNAMES.PM_ELF)))
            nut += Math.trunc((nut + 2) / 4); /* 800 -> 1000 */
        else if (maybe_polyd(is_orc(game.youmonst.data), Race_if(PMNAMES.PM_ORC)))
            nut -= Math.trunc((nut + 2) / 4); /* 800 -> 600 */
    } else if (otyp === ONAMES.CRAM_RATION) {
        if (maybe_polyd(is_dwarf(game.youmonst.data), Race_if(PMNAMES.PM_DWARF)))
            nut += Math.trunc((nut + 3) / 6); /* 600 -> 700 */
    }
    nut = Math.max(nut, 1);
    return nut;
}

// src/eat.c lesshungry() — add nutrition, then react to the new total.
//
// The two thresholds are 2000 (choke) and 1500 (the "hard time getting all
// of it down" warning), and the 1500 arm exists so that EVERY eating path
// warns before the 2000 one kills you -- C says so in a comment.
//
// iseating is (occupation == eatfood) || force_save_hs, and it decides which
// choke() argument is used and whether reset_eat() follows. The force_save_hs
// half is why recalc_wt's caller sets it around the nutrition update.
//
// newuhs(FALSE) runs unconditionally at the end: the hunger STATE is
// recomputed whether or not anything was said.
//
// The warning and its delayed completion message share gn.nomovemsg in C.
export async function lesshungry(num) {
    /* See comments in newuhs() for discussion on force_save_hs */
    const iseating = (game.occupation === eatfood) || game.force_save_hs;

    game.u.uhunger += num;
    if (game.u.uhunger >= 2000) {
        if (!iseating || game.context.victual?.canchoke) {
            if (iseating) {
                await choke(game.context.victual.piece);
                reset_eat();
            } else {
                await choke((game.occupation === opentin) ? game.context.tin?.tin : null);
                /* no reset_eat() */
            }
        }
    } else {
        /* Have lesshungry() report when you're nearly full so all eating
         * warns when you're about to choke.
         */
        if (game.u.uhunger >= 1500 && !Hunger()
            && (!game.context.victual?.eating
                || (game.context.victual.eating
                    && !game.context.victual.fullwarn))) {
            await pline("You're having a hard time getting all of it down.");
            game.nomovemsg = "You're finally finished.";
            if (!game.context.victual?.eating) {
                game.multi = -2;
            } else {
                game.context.victual.fullwarn = 1;
                if (game.context.victual.canchoke
                    && (game.context.victual.reqtime
                        - game.context.victual.usedtime) > 1) {
                    /* food with one bite left will not survive a stop */
                    if (!(await paranoid_query(ParanoidEating(), 'Continue eating?'))) {
                        reset_eat();
                        game.nomovemsg = null;
                    }
                }
            }
        }
    }
    await newuhs(false);
}

// src/eat.c consume_oeaten() — reduce a partly-eaten object's remaining food.
//
// A POSITIVE amt is a BIT SHIFT, not a subtraction: oeaten >>= amt halves the
// remainder amt times. A negative amt is the plain decrement, and because the
// value is already negative it is ADDED. Reading the sign as "how much to
// remove" and subtracting in both cases is wrong in the common case.
//
// THE CLAMP AT THE END IS THE POINT, and C spends fourteen lines explaining
// it: oeaten must never reach 0, because the object is not removed from
// inventory until the "you finish eating" message on the NEXT turn, and a
// zero oeaten reads as UNTOUCHED. That produced unexpected encumbrance
// messages at the end of a meal and full nutrition from an interrupted one.
// C also notes oeaten is unsigned there, so an over-subtraction wraps to a
// huge positive -- the reported cause of massively heavy food and unlimited
// satiation. Setting reqtime = usedtime is what actually ends the meal.
export function consume_oeaten(obj, amt) {
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

    /* mustn't let partly-eaten drop all the way to 0 or the item would be
       restored to untouched; set to no bites left */
    if (obj.oeaten === 0) {
        if (obj === game.context.victual?.piece)  /* true unless wishing */
            game.context.victual.reqtime = game.context.victual.usedtime;
        obj.oeaten = 1;         /* smallest possible positive value */
    }
}

/* ---- corpse after-effects: src/eat.c:881-1330 ---- */

/* include/monflag.h:62 MR_* conveyance bits */
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_SLEEP = 0x04, MR_DISINT = 0x08,
      MR_ELEC = 0x10, MR_POISON = 0x20, MR_ACID = 0x40, MR_STONE = 0x80;

// src/eat.c:890 intrinsic_possible() — can this species convey `type`?
export function intrinsic_possible(type, ptr) {
    switch (type) {
    case FIRE_RES:   return (ptr.mconveys & MR_FIRE) !== 0;
    case SLEEP_RES:  return (ptr.mconveys & MR_SLEEP) !== 0;
    case COLD_RES:   return (ptr.mconveys & MR_COLD) !== 0;
    case DISINT_RES: return (ptr.mconveys & MR_DISINT) !== 0;
    case SHOCK_RES:  return (ptr.mconveys & MR_ELEC) !== 0;
    case POISON_RES: return (ptr.mconveys & MR_POISON) !== 0;
    case ACID_RES:   return (ptr.mconveys & MR_ACID) !== 0;
    case STONE_RES:  return (ptr.mconveys & MR_STONE) !== 0;
    case TELEPORT:   return (ptr.mflags1 & MFLAGS_EAT.M1_TPORT) !== 0;
    case TELEPORT_CONTROL:
        return (ptr.mflags1 & MFLAGS_EAT.M1_TPORT_CNTRL) !== 0;
    case TELEPAT:
        /* include/mondata.h:84 telepathic(): three specific species */
        return ptr === game.mons[PMNAMES.PM_FLOATING_EYE]
               || ptr === game.mons[PMNAMES.PM_MIND_FLAYER]
               || ptr === game.mons[PMNAMES.PM_MASTER_MIND_FLAYER];
    default:         return false;
    }
}

// src/eat.c:960 should_givit() — level check against per-type chance.
export function should_givit(type, ptr) {
    let chance;
    switch (type) {
    case POISON_RES:
        if ((ptr === game.mons[PMNAMES.PM_KILLER_BEE]
             || ptr === game.mons[PMNAMES.PM_SCORPION]) && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:         chance = 10; break;
    case TELEPORT_CONTROL: chance = 12; break;
    case TELEPAT:          chance = 1;  break;
    default:               chance = 15; break;
    }
    return ptr.mlevel > rn2(chance);
}

// src/eat.c:996 temp_givit() — stoning/acid resistance is only temporary.
function temp_givit(type, ptr) {
    const chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;
    return chance ? (ptr.mlevel > rn2(chance)) : false;
}

// src/eat.c:1005 givit() — try to give an intrinsic.
async function givit(type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    const intr = (game.u.intrinsic ||= {});
    switch (type) {
    case FIRE_RES:
        if (!((intr.HFire_resistance | 0) & FROMOUTSIDE)) {
            await You(Hallucination() ? "be chillin'." : 'feel a momentary chill.');
            intr.HFire_resistance = (intr.HFire_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!((intr.HSleep_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('wide awake.');
            intr.HSleep_resistance = (intr.HSleep_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!((intr.HCold_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('full of hot air.');
            intr.HCold_resistance = (intr.HCold_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!((intr.HDisint_resistance | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'totally together, man.' : 'very firm.');
            intr.HDisint_resistance = (intr.HDisint_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        if (!((intr.HShock_resistance | 0) & FROMOUTSIDE)) {
            if (Hallucination())
                await You_feel('grounded in reality.');
            else
                await Your('health currently feels amplified!');
            intr.HShock_resistance = (intr.HShock_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!((intr.HPoison_resistance | 0) & FROMOUTSIDE)) {
            await You_feel(Poison_resistance() ? 'especially healthy.' : 'healthy.');
            intr.HPoison_resistance = (intr.HPoison_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!((intr.HTeleportation | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'diffuse.' : 'very jumpy.');
            intr.HTeleportation = (intr.HTeleportation | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!((intr.HTeleport_control | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'centered in your personal space.'
                                           : 'in control of yourself.');
            intr.HTeleport_control = (intr.HTeleport_control | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!((intr.HTelepat | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'in touch with the cosmos.'
                                           : 'a strange mental acuity.');
            intr.HTelepat = (intr.HTelepat | 0) | FROMOUTSIDE;
            /* If blind, make sure monsters show up. */
            if (Blind())
                see_monsters();
        }
        break;
    case ACID_RES:
        if (!Acid_resistance())
            await You_feel(`${Hallucination() ? 'secure from flashbacks'
                            : 'less concerned about being harmed by acid'}.`);
        incr_itimeout('HAcid_resistance', d(3, 6));
        break;
    case STONE_RES:
        if (!Stone_resistance())
            await You_feel(`${Hallucination() ? 'unusually limber'
                            : 'less concerned about becoming petrified'}.`);
        incr_itimeout('HStone_resistance', d(3, 6));
        break;
    default:
        break;
    }
}

// src/eat.c:1103 eye_of_newt_buzz() — small magical energy boost.
async function eye_of_newt_buzz() {
    const u = game.u;
    if (rn2(3) || 3 * u.uen <= 2 * u.uenmax) {
        const old_uen = u.uen;
        u.uen += rnd(3);
        if (u.uen > u.uenmax) {
            if (!rn2(3)) {
                u.uenmax++;
                if (u.uenmax > (u.uenpeak | 0))
                    u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== u.uen) {
            await You_feel('a mild buzz.');
            (game.disp ||= {}).botl = true;
        }
    }
}

// src/eat.c:1339 corpse_intrinsic() — reservoir-pick one conveyable
// intrinsic; -1 is the fake index for giant strength.
export function corpse_intrinsic(ptr) {
    const conveys_STR = (ptr.mflags2 & MFLAGS_EAT.M2_GIANT) !== 0;
    let count = 0;
    let prop = 0;

    if (conveys_STR) {
        count = 1;
        prop = -1; /* use -1 as fake prop index for STR */
    }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        if (!rn2(count))
            prop = i;
    }
    /* if strength is the only candidate, give it 50% chance */
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}

// src/eat.c:1129 cpostfx() — called after completely consuming a corpse.
async function cpostfx(pm) {
    let tmp = 0;
    let catch_lycanthropy = NON_PM;
    let check_intrinsics = false;

    /* in case `afternmv' didn't get called for previously mimicking
       gold, clean up now to avoid `eatmbuf' memory leak */
    if (game.eatmbuf)
        eatmdone();

    switch (pm) {
    case PMNAMES.PM_WRAITH:
        await pluslvl(false);
        break;
    case PMNAMES.PM_HUMAN_WERERAT:
        catch_lycanthropy = PMNAMES.PM_WERERAT;
        break;
    case PMNAMES.PM_HUMAN_WEREJACKAL:
        catch_lycanthropy = PMNAMES.PM_WEREJACKAL;
        break;
    case PMNAMES.PM_HUMAN_WEREWOLF:
        catch_lycanthropy = PMNAMES.PM_WEREWOLF;
        break;
    case PMNAMES.PM_NURSE:
        if (Upolyd(game.u))
            game.u.mh = game.u.mhmax;
        else
            game.u.uhp = game.u.uhpmax;
        await make_blinded(0, !game.u.ucreamed);
        (game.disp ||= {}).botl = true;
        check_intrinsics = true; /* might also convey poison resistance */
        break;
    case PMNAMES.PM_STALKER:
        if (!Invis()) {
            set_itimeout('HInvis', rn1(100, 50));
            if (!Blind() && !game.u.blocked?.INVIS)
                await self_invis_message();
        } else {
            if (!((game.u.intrinsic?.HInvis | 0) & INTRINSIC))
                await You_feel('hidden!');
            (game.u.intrinsic ||= {}).HInvis = (game.u.intrinsic.HInvis | 0) | FROMOUTSIDE;
            game.u.intrinsic.HSee_invisible = (game.u.intrinsic.HSee_invisible | 0) | FROMOUTSIDE;
        }
        newsym(game.u.ux, game.u.uy);
        /*FALLTHRU*/
    case PMNAMES.PM_YELLOW_LIGHT:
    case PMNAMES.PM_GIANT_BAT:
        await make_stunned(((game.u.intrinsic?.HStun | 0) & TIMEOUT) + 30, false);
        /*FALLTHRU*/
    case PMNAMES.PM_BAT:
        await make_stunned(((game.u.intrinsic?.HStun | 0) & TIMEOUT) + 30, false);
        break;
    case PMNAMES.PM_GIANT_MIMIC:
        tmp += 10;
        /*FALLTHRU*/
    case PMNAMES.PM_LARGE_MIMIC:
        tmp += 20;
        /*FALLTHRU*/
    case PMNAMES.PM_SMALL_MIMIC:
        tmp += 20;
        if (game.youmonst.data.mlet !== MONSYMS.S_MIMIC && !Unchanging()) {
            let buf;
            const tempshape = !Hallucination() ? 'a pile of gold'
                                               : 'an orange';

            game.u.uconduct ||= {};
            if (!game.u.uconduct.polyselfs++) /* you're changing form */
                await livelog_printf(LL_CONDUCT,
                            `changed form for the first time by mimicking ${tempshape}`);
            await You_cant(`resist the temptation to mimic ${tempshape}.`);
            /* A pile of gold can't ride. */
            if (game.u.usteed)
                await dismount_steed(DISMOUNT_FELL);
            nomul(-tmp);
            game.multi_reason = 'pretending to be a pile of gold';
            buf = Hallucination()
                  ? `You suddenly dread being peeled and mimic ${
                      an(Upolyd(game.u) ? pmname(game.youmonst.data, Ugender())
                                        : game.urace.noun)} again!`
                  : `You now prefer mimicking ${
                      an(Upolyd(game.u) ? pmname(game.youmonst.data, Ugender())
                                        : game.urace.noun)} again.`;
            game.eatmbuf = buf;
            game.nomovemsg = game.eatmbuf;
            game.afternmv = eatmdone;
            /* ??? what if this was set before? */
            game.youmonst.m_ap_type = M_AP_OBJECT;
            game.youmonst.mappearance = Hallucination() ? ONAMES.ORANGE : ONAMES.GOLD_PIECE;
            newsym(game.u.ux, game.u.uy);
            /* curs_on_u(); */
            /* make gold symbol show up now */
            /* display_nhwindow(WIN_MAP, TRUE): wintty.c's NHW_MAP arm flushes
               the map (end_glyphout), turns a pending message into --More--
               and shows the message window */
            await flush_screen(0);
            if (game._toplin !== TOPLINE_EMPTY)
                game._toplin = TOPLINE_NEED_MORE;
            if (game._toplin === TOPLINE_NEED_MORE)
                await more();
        }
        break;
    case PMNAMES.PM_QUANTUM_MECHANIC:
        await Your('velocity suddenly seems very uncertain!');
        if ((game.u.intrinsic?.HFast | 0) & INTRINSIC) {
            game.u.intrinsic.HFast &= ~INTRINSIC;
            await You('seem slower.');
        } else {
            (game.u.intrinsic ||= {}).HFast = (game.u.intrinsic.HFast | 0) | FROMOUTSIDE;
            await You('seem faster.');
        }
        break;
    case PMNAMES.PM_LIZARD:
        if (((game.u.intrinsic?.HStun | 0) & TIMEOUT) > 2)
            await make_stunned(2, false);
        if (((game.u.intrinsic?.HConfusion | 0) & TIMEOUT) > 2)
            await make_confused(2, false);
        check_intrinsics = true; /* might convey temporary stoning resist */
        break;
    case PMNAMES.PM_CHAMELEON:
    case PMNAMES.PM_DOPPELGANGER:
    case PMNAMES.PM_SANDESTIN: /* moot--they don't leave corpses */
    case PMNAMES.PM_GENETIC_ENGINEER:
        if (Unchanging()) {
            await You_feel('momentarily different.'); /* same as poly trap */
        } else {
            /* polyself() is potentially fatal; if food is a tin, use it up
               early to keep it out of bones */
            if (game.context.tin?.tin) {
                await use_up_tin(game.context.tin.tin);
                /* most tin effects end up being skipped */
                await lesshungry(200 + (metallivorous(game.youmonst.data) ? 5 : 0));
            }

            await You(`${(pm === PMNAMES.PM_GENETIC_ENGINEER)
                          ? 'undergo a freakish metamorphosis'
                          : 'feel a change coming over you'}.`);
            await polyself(POLY_NOFLAGS);
        }
        break;
    case PMNAMES.PM_DISPLACER_BEAST:
        if (!Displaced()) /* give a message (before setting the timeout) */
            await toggle_displacement(null, 0, true);
        incr_itimeout('HDisplaced', d(6, 6));
        break;
    case PMNAMES.PM_DISENCHANTER:
        /* picks an intrinsic at random and removes it; there's
           no feedback if hero already lacks the chosen ability */
        await attrcurse();
        break;
    case PMNAMES.PM_DEATH:
    case PMNAMES.PM_PESTILENCE:
    case PMNAMES.PM_FAMINE:
        /* life-saved; don't attempt to confer any intrinsics */
        break;
    case PMNAMES.PM_MIND_FLAYER:
    case PMNAMES.PM_MASTER_MIND_FLAYER:
        if (ABASE(A_INT) < ATTRMAX(A_INT)) {
            if (!rn2(2)) {
                await pline('Yum!  That was real brain food!');
                await adjattrib(A_INT, 1, false);
                break; /* don't give them telepathy, too */
            }
        } else {
            await pline('For some reason, that tasted bland.');
        }
        /*FALLTHRU*/
    default:
        check_intrinsics = true;
        break;
    }

    /* possibly convey an intrinsic */
    if (check_intrinsics) {
        const ptr = game.mons[pm];

        if (dmgtype(ptr, ATTKS.AD_STUN) || dmgtype(ptr, ATTKS.AD_HALU)
            || pm === PMNAMES.PM_VIOLET_FUNGUS) {
            await pline('Oh wow!  Great stuff!');
            await make_hallucinated(((game.u.intrinsic?.HHallucination | 0) & TIMEOUT) + 200, false,
                                    0);
        }

        /* Eating magical monsters can give you some magical energy. */
        if (attacktype(ptr, ATTKS.AT_MAGC) || pm === PMNAMES.PM_NEWT)
            await eye_of_newt_buzz();

        tmp = corpse_intrinsic(ptr);

        /* if something was chosen, give it now (givit() might fail) */
        if (tmp === -1)
            await gainstr(null, 0, true);
        else if (tmp > 0)
            await givit(tmp, ptr);
    } /* check_intrinsics */

    if (ismnum(catch_lycanthropy)) {
        set_ulycn(catch_lycanthropy);
        await retouch_equipment(2);
    }
    return;
}

// src/eat.c:3893 cant_finish_meal(); called by revive(); sort of the opposite
// of maybe_finished_meal()
export async function cant_finish_meal(corpse) {
    if (game.occupation === eatfood && game.context.victual?.piece === corpse) {
        game.context.victual = {}; /* zero_victual: victual.piece = 0, .o_id = 0 */
        if (!corpse.oeaten)
            corpse.oeaten = 1; /* [see consume_oeaten()] */
        game.occupation = donull; /* any non-Null other than eatfood() */
        await stop_occupation();
        await newuhs(false);
    }
}

// src/eat.c:3920 Popeye()
export function Popeye(threat) {
    if (game.occupation !== opentin)
        return false;
    const otin = game.context.tin.tin;
    if (!carried(otin)
        && (!obj_here(otin, game.u.ux, game.u.uy) || !can_reach_floor(true)))
        return false;
    if (!otin.known)
        return true;
    const mndx = otin.corpsenm;
    switch (threat) {
    case HUNGER:
        return mndx !== NON_PM || otin.spe === 1;
    case STONED:
        return ismnum(mndx)
            && (mndx === PMNAMES.PM_LIZARD || acidic(game.mons[mndx]));
    case SLIMED:
        return !!polyfood(otin);
    case SICK:
    case VOMITING:
        break;
    default:
        break;
    }
    return false;
}

// src/eat.c:3961 Finish_digestion()
export async function Finish_digestion() {
    if (game.corpsenm_digested !== NON_PM) {
        await cpostfx(game.corpsenm_digested);
        game.corpsenm_digested = NON_PM;
    }
    return 0;
}
