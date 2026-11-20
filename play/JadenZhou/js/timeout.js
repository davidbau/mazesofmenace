// timeout.js — timed intrinsics and timers.
// C ref: timeout.c
//
// Ported so far: nh_timeout() (luck timeout, the uprops countdown and the
// timeout cases that can occur with what the JS port sets so far).  The
// *_dialogue() routines and run_timers() are not ported yet; nothing the
// JS port does yet starts them (see the comments below).

import { game } from './gstate.js';
import { pline } from './display.js';
import {
    FULL_MOON, TIMEOUT, LAST_PROP, STONED, SLIMED, VOMITING, STRANGLED, SICK,
    LEVITATION, PASSES_WALLS, MAGICAL_BREATHING, SLEEPY, FAST, FUMBLING,
    FLYING, INTRINSIC,
} from './const.js';
import { PM_ARCHEOLOGIST } from './monsters.js';
import { FEDORA, LUCKSTONE } from './objects.js';

/* C ref: role.h Role_if() */
function Role_if(pm) { return game.urole.mnum === pm; }

// C ref: artifact.c confers_luck()
function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === LUCKSTONE)
        return true;
    /* obj->oartifact && spec_ability(obj, SPFX_LUCK): artifacts aren't
       ported yet */
    return false;
}

// C ref: attrib.c stone_luck()
/* there has just been an inventory change affecting a luck-granting item */
function stone_luck(include_uncursed) {
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

// C ref: invent.c carrying()
function carrying(type) {
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === type)
            return otmp;
    return null;
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
            case FLYING:
                /* timed Flying is via #wizintrinsic only */
                break;
            case SICK:
            case SLEEPY:
            case FUMBLING:
                /* these cases roll dice (rn2(100) < ACURR(A_CON), rnd(100),
                   rnd(20)); nothing in the JS port sets these timeouts
                   yet */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            default:
                /* the other cases only give feedback and update state
                   (make_confused(), make_blinded(), ...): not ported yet;
                   nothing in the JS port sets those timeouts yet */
                break;
            }
        }
    }

    /* run_timers(): the timer queue isn't ported yet; no timer set by
       level creation (corpse rot, revival, melting ice) comes due within
       the turns the sessions reach so far */
}

// C ref: timeout.c kill_egg()
/* prevent an egg from ever hatching */
export function kill_egg(egg) {
    /* stop previous timer, if any */
    /* (void) stop_timer(HATCH_EGG, obj_to_any(egg)): the timer queue isn't
       ported yet and no hatch timer is ever started, so there is none */
}
