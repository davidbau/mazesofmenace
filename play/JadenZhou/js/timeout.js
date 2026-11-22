// timeout.js — timed intrinsics and timers.
// C ref: timeout.c
//
// Ported so far: nh_timeout() (luck timeout, the uprops countdown and the
// timeout cases that can occur with what the JS port sets so far).  The
// *_dialogue() routines and run_timers() are not ported yet; nothing the
// JS port does yet starts them (see the comments below).

import { game } from './gstate.js';
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
