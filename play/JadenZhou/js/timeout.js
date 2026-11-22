// timeout.js — timed intrinsics and timers.
// C ref: timeout.c
//
// Ported so far: nh_timeout() (luck timeout, the uprops countdown and the
// timeout cases that can occur with what the JS port sets so far).  The
// *_dialogue() routines and run_timers() are not ported yet; nothing the
// JS port does yet starts them (see the comments below).

import { game } from './gstate.js';
import * as P from './const.js';
import { rnd } from './rng.js';
import { MAX_EGG_HATCH_TIME } from './const.js';
import { pline } from './display.js';
import {
    FULL_MOON, TIMEOUT, LAST_PROP, STONED, SLIMED, VOMITING, STRANGLED, SICK,
    LEVITATION, PASSES_WALLS, MAGICAL_BREATHING, SLEEPY, FAST, FUMBLING,
    FLYING, INTRINSIC, WOUNDED_LEGS, CONFUSION, STUNNED, BLINDED, DEAF,
    INVIS, SEE_INVIS, HALLUC, HALLUC_RES, FIRE_RES, WWALKING, ACID_RES,
    STONE_RES, DISPLACED, WARN_OF_MON, PROT_FROM_SHAPE_CHANGERS,
    DETECT_MONSTERS, GLIB,
} from './const.js';
import { newsym, see_monsters } from './display.js';
import { set_itimeout, make_confused, make_stunned, make_blinded, make_deaf,
         make_hallucinated, make_glib, set_mimic_blocking } from './potion.js';

/* C ref: youprop.h -- (H* || E*) for the timeout cases; Blind */
function uhave(p) {
    const q = game.u.uprops[p];
    return !!(q.intrinsic || q.extrinsic);
}
function Blind() {
    const q = game.u.uprops[BLINDED];
    return !!((q.intrinsic || q.extrinsic) && !q.blocked);
}
import { PM_ARCHEOLOGIST } from './monsters.js';
import { FEDORA, LUCKSTONE } from './objects.js';
import { stone_luck } from './attrib.js';
import { carrying } from './invent.js';
import { heal_legs } from './trap.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { spec_ability, SPFX_LUCK } from './artifact.js';

/* C ref: role.h Role_if() */
function Role_if(pm) { return game.urole.mnum === pm; }


// C ref: timeout.c propertynames[]
/* used by wizard mode #timeout and #wizintrinsic; order by 'interest'
   for timeout countdown, where most won't occur in normal play */
const propertynames = [
    { prop_num: P.INVULNERABLE, prop_name: "invulnerable" },
    { prop_num: P.STONED, prop_name: "petrifying" },
    { prop_num: P.SLIMED, prop_name: "becoming slime" },
    { prop_num: P.STRANGLED, prop_name: "strangling" },
    { prop_num: P.SICK, prop_name: "fatally sick" },
    { prop_num: P.STUNNED, prop_name: "stunned" },
    { prop_num: P.CONFUSION, prop_name: "confused" },
    { prop_num: P.HALLUC, prop_name: "hallucinating" },
    { prop_num: P.BLINDED, prop_name: "blinded" },
    { prop_num: P.DEAF, prop_name: "deafness" },
    { prop_num: P.VOMITING, prop_name: "vomiting" },
    { prop_num: P.GLIB, prop_name: "slippery fingers" },
    { prop_num: P.WOUNDED_LEGS, prop_name: "wounded legs" },
    { prop_num: P.SLEEPY, prop_name: "sleepy" },
    { prop_num: P.TELEPORT, prop_name: "teleporting" },
    { prop_num: P.POLYMORPH, prop_name: "polymorphing" },
    { prop_num: P.LEVITATION, prop_name: "levitating" },
    { prop_num: P.FAST, prop_name: "very fast" },
    { prop_num: P.CLAIRVOYANT, prop_name: "clairvoyant" },
    { prop_num: P.DETECT_MONSTERS, prop_name: "monster detection" },
    { prop_num: P.SEE_INVIS, prop_name: "see invisible" },
    { prop_num: P.INVIS, prop_name: "invisible" },
    /* temporary acid resistance and stone resistance can come from eating */
    { prop_num: P.ACID_RES, prop_name: "acid resistance" },
    { prop_num: P.STONE_RES, prop_name: "stoning resistance" },
    /* timed displacement is possible via eating a displacer beast corpse */
    { prop_num: P.DISPLACED, prop_name: "displaced" },
    /* timed pass-walls is a potential prayer result if surrounded by stone
       with nowhere to be safely teleported to */
    { prop_num: P.PASSES_WALLS, prop_name: "pass thru walls" },
    /* likewise for magical breathing vs poison gas regions */
    { prop_num: P.MAGICAL_BREATHING, prop_name: "magical breathing" },
    /* timed fire resistance and water walking are possible in explore mode
       (as well as in wizard mode) after life-saving in lava if it fails to
       teleport the hero to safety and player declines to die */
    { prop_num: P.WWALKING, prop_name: "water walking" },
    { prop_num: P.FIRE_RES, prop_name: "fire resistance" },
    /*
     * Properties beyond here don't have timed values during normal play,
     * so there's not much point in trying to order them sensibly.
     * They're either on or off based on equipment, role, actions, &c,
     * but in wizard mode, #wizintrinsic can give them as timed effects.
     */
    { prop_num: P.COLD_RES, prop_name: "cold resistance" },
    { prop_num: P.SLEEP_RES, prop_name: "sleep resistance" },
    { prop_num: P.DISINT_RES, prop_name: "disintegration resistance" },
    { prop_num: P.SHOCK_RES, prop_name: "shock resistance" },
    { prop_num: P.POISON_RES, prop_name: "poison resistance" },
    { prop_num: P.DRAIN_RES, prop_name: "drain resistance" },
    { prop_num: P.SICK_RES, prop_name: "sickness resistance" },
    { prop_num: P.ANTIMAGIC, prop_name: "magic resistance" },
    { prop_num: P.HALLUC_RES, prop_name: "hallucination resistance" },
    { prop_num: P.BLND_RES, prop_name: "light-induced blindness resistance" },
    { prop_num: P.FUMBLING, prop_name: "fumbling" },
    { prop_num: P.HUNGER, prop_name: "voracious hunger" },
    { prop_num: P.TELEPAT, prop_name: "telepathic" },
    { prop_num: P.WARNING, prop_name: "warning" },
    { prop_num: P.WARN_OF_MON, prop_name: "warn: monster type or class" },
    { prop_num: P.WARN_UNDEAD, prop_name: "warn: undead" },
    { prop_num: P.SEARCHING, prop_name: "searching" },
    { prop_num: P.INFRAVISION, prop_name: "infravision" },
    { prop_num: P.ADORNED, prop_name: "adorned (+/- Cha)" },
    { prop_num: P.STEALTH, prop_name: "stealthy" },
    { prop_num: P.AGGRAVATE_MONSTER, prop_name: "monster aggravation" },
    { prop_num: P.CONFLICT, prop_name: "conflict" },
    { prop_num: P.JUMPING, prop_name: "jumping" },
    { prop_num: P.TELEPORT_CONTROL, prop_name: "teleport control" },
    { prop_num: P.FLYING, prop_name: "flying" },
    { prop_num: P.SWIMMING, prop_name: "swimming" },
    { prop_num: P.SLOW_DIGESTION, prop_name: "slow digestion" },
    { prop_num: P.HALF_SPDAM, prop_name: "half spell damage" },
    { prop_num: P.HALF_PHDAM, prop_name: "half physical damage" },
    { prop_num: P.REGENERATION, prop_name: "HP regeneration" },
    { prop_num: P.ENERGY_REGENERATION, prop_name: "energy regeneration" },
    { prop_num: P.PROTECTION, prop_name: "extra protection" },
    { prop_num: P.PROT_FROM_SHAPE_CHANGERS, prop_name: "protection from shape changers" },
    { prop_num: P.POLYMORPH_CONTROL, prop_name: "polymorph control" },
    { prop_num: P.UNCHANGING, prop_name: "unchanging" },
    { prop_num: P.REFLECTING, prop_name: "reflecting" },
    { prop_num: P.FREE_ACTION, prop_name: "free action" },
    { prop_num: P.FIXED_ABIL, prop_name: "fixed abilities" },
    { prop_num: P.LIFESAVED, prop_name: "life will be saved" },
    { prop_num: 0, prop_name: null },
];

// C ref: timeout.c property_by_index()
/* returns the property's name and sets propertynum.v to its number */
export function property_by_index(idx, propertynum) {
    if (!(idx >= 0 && idx < propertynames.length)) /* IndexOkT() */
        idx = propertynames.length - 1;

    if (propertynum)
        propertynum.v = propertynames[idx].prop_num;
    return propertynames[idx].prop_name;
}

// C ref: artifact.c confers_luck()
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === LUCKSTONE)
        return true;
    return !!(obj.oartifact && spec_ability(obj, SPFX_LUCK));
}

// C ref: timeout.c nh_timeout()
export async function nh_timeout() {
    const g = game;
    const u = g.u;
    const flags = g.flags;
    const P = u.uprops;
    let baseluck = (flags.moonphase === FULL_MOON) ? 1 : 0;

    if (flags.friday13)
        baseluck -= 1;

    if (g.quest_status.killed_leader)
        baseluck -= 4;

    if (Role_if(PM_ARCHEOLOGIST) && g.uarmh && g.uarmh.otyp === FEDORA)
        baseluck += 1;

    if (u.uluck !== baseluck
        && g.moves % ((u.uhave.amulet || u.ugangr) ? 300 : 600) === 0) {
        /* Cursed luckstones stop bad luck from timing out; blessed luckstones
         * stop good luck from timing out; normal luckstones stop both;
         * neither is stopped if you don't have a luckstone.
         * Luck is based at 0 usually, +1 if a full moon and -1 on Friday 13th
         */
        const time_luck = stone_luck(false);
        const nostone = !carrying(LUCKSTONE) && !stone_luck(true);

        if (u.uluck > baseluck && (nostone || time_luck < 0))
            u.uluck--;
        else if (u.uluck < baseluck && (nostone || time_luck > 0))
            u.uluck++;
    }
    if (u.uinvulnerable)
        return; /* things past this point could kill you */
    /* stoned_dialogue(), slime_dialogue(), vomiting_dialogue(),
       choke_dialogue(), sickness_dialogue(), levitation_dialogue(),
       phaze_dialogue(), region_dialogue(), sleep_dialogue(): not ported
       yet; nothing in the JS port sets those timeouts yet */
    if (P[STONED].intrinsic || P[SLIMED].intrinsic || P[VOMITING].intrinsic
        || P[STRANGLED].intrinsic || P[SICK].intrinsic
        || (P[LEVITATION].intrinsic & TIMEOUT)
        || (P[PASSES_WALLS].intrinsic & TIMEOUT)
        || (P[MAGICAL_BREATHING].intrinsic & TIMEOUT)
        || (P[SLEEPY].intrinsic & TIMEOUT))
        throw new Error('nh_timeout(): *_dialogue() not ported yet');
    if (u.mtimedone && !--u.mtimedone) {
        /* Unchanging / you_unwere() / rehumanize(): polymorphing isn't
           ported yet */
        throw new Error('nh_timeout(): rehumanize() not ported yet');
    }
    if (u.ucreamed)
        u.ucreamed--;

    /* Dissipate spell-based protection. */
    if (u.usptime) {
        if (--u.usptime === 0 && u.uspellprot) {
            u.usptime = u.uspmtime;
            u.uspellprot--;
            /* find_ac() and the "golden haze" message: spell protection
               isn't ported yet */
            throw new Error('nh_timeout(): spell protection not ported yet');
        }
    }

    if (u.ugallop) {
        if (--u.ugallop === 0 && u.usteed)
            await pline("Your steed stops galloping."); /* Monnam() isn't ported yet */
    }

    for (let idx = 0; idx <= LAST_PROP; idx++) {
        const upp = P[idx];
        if ((upp.intrinsic & TIMEOUT) && !(--upp.intrinsic & TIMEOUT)) {
            /* find_delayed_killer(): not ported yet */
            switch (idx) {
            case FAST: {
                const HFast = P[FAST].intrinsic, EFast = P[FAST].extrinsic;
                const Very_fast = ((HFast & ~INTRINSIC) || EFast);
                if (!Very_fast)
                    await pline(`You feel yourself slow down${
                        (HFast || EFast) ? " a bit" : ""}.`);
                break;
            }
            case CONFUSION:
                /* So make_confused works properly */
                set_itimeout(CONFUSION, 1);
                await make_confused(0, true);
                if (!uhave(CONFUSION))
                    await stop_occupation();
                break;
            case STUNNED:
                set_itimeout(STUNNED, 1);
                await make_stunned(0, true);
                if (!uhave(STUNNED))
                    await stop_occupation();
                break;
            case BLINDED: {
                const was_blind = Blind();

                set_itimeout(BLINDED, 1);
                await make_blinded(0, true);
                if (was_blind && !Blind())
                    await stop_occupation();
                break;
            }
            case DEAF:
                set_itimeout(DEAF, 1);
                await make_deaf(0, true);
                g.disp_botl = true;
                if (!(uhave(DEAF) || u.uroleplay?.deaf))
                    await stop_occupation();
                break;
            case INVIS: {
                const Invis = uhave(INVIS) && !P[INVIS].blocked;
                newsym(u.ux, u.uy);
                if (!Invis && !P[INVIS].blocked && !Blind()) {
                    await pline(!uhave(SEE_INVIS)
                                ? "You are no longer invisible."
                                : "You can no longer see through yourself.");
                    await stop_occupation();
                }
                break;
            }
            case SEE_INVIS:
                set_mimic_blocking(); /* do special mimic handling */
                see_monsters();       /* make invis mons appear */
                newsym(u.ux, u.uy);   /* make self appear */
                await stop_occupation();
                break;
            case HALLUC:
                set_itimeout(HALLUC, 1);
                await make_hallucinated(0, true, 0);
                if (!(P[HALLUC].intrinsic && !uhave(HALLUC_RES)))
                    await stop_occupation();
                break;
            case FIRE_RES:
                /* timed fire resistance and timed water walking combine
                   as a way to survive lava after multiple life-saving
                   attempts fail to relocate hero; skip timeout message
                   if hero has acquired fire resistance in the meantime */
                if (!uhave(FIRE_RES))
                    await pline("Your temporary ability to survive burning has ended.");
                break;
            case WWALKING:
                /* [see fire resistance] */
                if (!uhave(WWALKING))
                    await pline("Your temporary ability to walk on liquid has ended.");
                break;
            case ACID_RES:
            case STONE_RES:
            case DISPLACED:
            case WARN_OF_MON:
            case PROT_FROM_SHAPE_CHANGERS:
                /* eating_dangerous_corpse(), wielding_corpse(),
                   toggle_displacement(), restartcham() */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            case DETECT_MONSTERS:
                see_monsters();
                break;
            case GLIB:
                make_glib(0); /* might update persistent inventory */
                break;
            case FLYING:
                /* timed Flying is via #wizintrinsic only */
                break;
            case WOUNDED_LEGS:
                await heal_legs(0);
                await stop_occupation();
                break;
            case SICK:
            case SLEEPY:
            case FUMBLING:
                /* these cases roll dice (rn2(100) < ACURR(A_CON), rnd(100),
                   rnd(20)); nothing in the JS port sets these timeouts
                   yet */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            default:
                /* the remaining properties have no case in C */
                break;
            }
        }
    }

    /* run_timers(): the timer queue isn't ported yet; no timer set by
       level creation (corpse rot, revival, melting ice) comes due within
       the turns the sessions reach so far */
}

// C ref: timeout.c fall_asleep()
export async function fall_asleep(how_long, wakeup_msg) {
    await stop_occupation();
    nomul(how_long);
    game.multi_reason = "sleeping";
    /* (#if 0 in C: the Deaf/Hear_again handling is disabled) */
    /* early wakeup from combat won't be possible until next monster turn */
    game.u.usleep = game.moves;
    game.nomovemsg = wakeup_msg ? "You wake up." : "You can move again.";
}

// C ref: timeout.c attach_egg_hatch_timeout()
// The timer queue isn't ported yet: as with start_corpse_timeout(), the
// pending timer is kept in obj.timer = { when, action }.
export function attach_egg_hatch_timeout(egg, when) {
    let i;

    /* stop previous timer, if any */
    /* (void) stop_timer(HATCH_EGG, obj_to_any(egg)) */
    if (egg.timer && egg.timer.action === 'HATCH_EGG')
        egg.timer = null;

    /*
     * Decide if and when to hatch the egg.  The old hatch_it() code tried
     * once a turn from age 151 to 200 (inclusive), hatching if it rolled
     * a number x, 1<=x<=age, where x>150.  This yields a chance of
     * hatching > 99.9993%.  Mimic that here.
     */
    if (!when) {
        for (i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++)
            if (rnd(i) > 150) {
                /* egg will hatch */
                when = i;
                break;
            }
    }
    if (when) {
        /* (void) start_timer(when, TIMER_OBJECT, HATCH_EGG, obj_to_any(egg)) */
        egg.timer = { when, action: 'HATCH_EGG' };
    }
}

// C ref: timeout.c kill_egg()
/* prevent an egg from ever hatching */
export function kill_egg(egg) {
    /* stop previous timer, if any */
    /* (void) stop_timer(HATCH_EGG, obj_to_any(egg)): the timer queue isn't
       ported yet and no hatch timer is ever started, so there is none */
}
