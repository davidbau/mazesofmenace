// timeout.js — timed property expiry (timeout.c nh_timeout subset).
// C ref: timeout.c nh_timeout — once-per-turn intrinsic TIMEOUT decrement.

import { game } from './gstate.js';
import { TIMEOUT, FROMOUTSIDE, FUMBLING, FAST, FOOT, ICE, STRAT_WAITMASK } from './const.js';
import { heal_legs } from './trap.js';
import { stop_occupation, nomul, is_pool } from './hack.js';
import { run_timers, objects_at } from './mkobj.js';
import { make_confused } from './potion.js';
import { make_blinded } from './do.js';
import { Fumbling, Fast, Very_fast } from './attrib.js';
import { pline, You_feel } from './display.js';
import { inv_weight } from './invent.js';
import { doname, makeplural } from './objnam.js';
import { rn2, rnd } from './rng.js';
import { objectNames } from './objects.js';
import { G_UNIQ } from './monsters.js';

/** C ref: weight.h WT_NOISY_INV — inv_weight() threshold for noisy fumbling. */
const WT_NOISY_INV = 500;
const ROCK = objectNames.indexOf('ROCK');

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK (quest leaders stay meditating).
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/** C ref: dbridge.c / rm.h is_ice — ICE terrain; drawbridge-under deferred. */
function is_ice(x, y) {
    return game.level?.at?.(x, y)?.typ === ICE;
}

/** C ref: mondata.c body_part — FOOT; full poly deferred. */
function body_part(part) {
    if (part === FOOT) return 'foot';
    return 'body';
}

/**
 * C ref: timeout.c slip_or_trip — fumble message + optional ice/mount arms.
 * Envelope: floor-object trip (no RNG); ice/FROMOUTSIDE path with rn2(3);
 * on_foot stumble `rn2(4)` messages. Named omissions: Hallu highc bite;
 * corpse touch_petrifies; mounted rn2(4)+dismount_steed; ice hurtle/
 * confdir/`rn2(10+DEX)`; PLNMSG_ONE_ITEM_HERE pronoun; Blind/dknown polish.
 */
async function slip_or_trip() {
    const u = game.u || {};
    const on_foot = !u.usteed;
    let otmp = objects_at(u.ux | 0, u.uy | 0);
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux | 0, u.uy | 0)) {
        otmp = null;
    }

    if (otmp && on_foot) {
        // C: trip over particular floor object — no rn2(4)
        let what;
        if (otmp.dknown || !u.Blind) {
            what = doname(otmp);
        } else {
            let rock = null;
            for (let o = otmp; o; o = o.nexthere) {
                if (o.otyp === ROCK) { rock = o; break; }
            }
            if (!rock) what = 'something';
            else what = ((rock.quan | 0) === 1) ? 'a rock' : 'some rocks';
        }
        if (u.Hallucination) {
            await pline(`Egads!  ${what} bites your ${body_part(FOOT)}!`);
        } else {
            await pline(`You trip over ${what}.`);
        }
        // touch_petrifies corpse arm deferred
    } else if (((u.HFumbling | 0) & FROMOUTSIDE)
        || (is_ice(u.ux | 0, u.uy | 0) && !rn2(3))) {
        // Ice / FROMOUTSIDE slip — mounted dismount + hurtle deferred
        const verb = rn2(2) ? 'slip' : 'slide';
        const prep = is_ice(u.ux | 0, u.uy | 0) ? 'on' : 'off';
        await pline(`You ${verb} ${prep} the ice.`);
        // !on_foot dismount / !rn2(10+DEX) hurtle deferred (no further RNG here)
    } else if (on_foot) {
        // C: timeout.c:1302 switch (rn2(4))
        switch (rn2(4)) {
        case 1:
            await pline(`You trip over your own ${
                u.Hallucination ? 'elbow' : makeplural(body_part(FOOT))
            }.`);
            break;
        case 2:
            await pline(`You slip ${
                u.Hallucination ? 'on a banana peel' : 'and nearly fall'
            }.`);
            break;
        case 3:
            await pline('You flounder.');
            break;
        default:
            await pline('You stumble.');
            break;
        }
    } else {
        // Mounted saddle messages + dismount_steed deferred; still burn rn2(4)
        rn2(4);
    }
}

/**
 * Sync flat HFumbling with uprops[FUMBLING].intrinsic (Boots_on mirror).
 */
function set_HFumbling(val) {
    const u = game.u || (game.u = {});
    u.HFumbling = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FUMBLING] || (u.uprops[FUMBLING] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFumbling;
}

/** Sync flat HFast with uprops[FAST].intrinsic. */
function set_HFast(val) {
    const u = game.u || (game.u = {});
    u.HFast = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FAST] || (u.uprops[FAST] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFast;
}

/**
 * C ref: potion.c incr_itimeout — add to TIMEOUT field only.
 */
function incr_itimeout_HFumbling(incr) {
    const u = game.u || {};
    const cur = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    let val = (cur & TIMEOUT) + (incr | 0);
    if (val > TIMEOUT) val = TIMEOUT;
    set_HFumbling((cur & ~TIMEOUT) | (val & TIMEOUT));
}

/**
 * C ref: timeout.c nh_timeout — decrement timed intrinsics; on TIMEOUT
 * expiry run property-specific handlers.
 * Envelope: WOUNDED_LEGS → heal_legs(0) + stop_occupation;
 * CONFUSION → set_itimeout(1) + make_confused(0,TRUE) + stop_occupation;
 * BLINDED → set_itimeout(1) + make_blinded(0,TRUE) + stop_occupation (D-0928);
 * FUMBLING → slip_or_trip + nomul(-2) + incr_itimeout rnd(20) (D-0692);
 * DEAF → make_deaf(0) on expiry (D-0911; talk if !Unaware deferred).
 * FAST → timeout decrement + slow-down You_feel when !Very_fast (D-0919).
 * Named omissions: luck baseluck; Stoned/Slimed/Sick/… dialogues;
 * STUNNED/INVIS/SEE_INVIS/HALLUC/SLEEPY/LEVITATION/… cases;
 * Glib; ublesscnt (in allmain); mtimedone; usptime; ugallop; delayed
 * killers; uinvulnerable early return polish; defer_decor; full ice/
 * mount slip_or_trip arms.
 */
export async function nh_timeout() {
    const u = game.u || (game.u = {});
    // C: if (u.uinvulnerable) return; — deferred until invuln props exist
    // C: for (upp = u.uprops; …) if ((intrinsic & TIMEOUT) && !(--intrinsic & TIMEOUT))

    const hw = u.HWounded_legs | 0;
    if (hw & TIMEOUT) {
        // C: --upp->intrinsic then test TIMEOUT bits cleared
        const next = hw - 1;
        u.HWounded_legs = next;
        if (!(next & TIMEOUT)) {
            // C case WOUNDED_LEGS: heal_legs(0); stop_occupation();
            await heal_legs(0);
            await stop_occupation();
        }
    }

    const hc = u.HConfusion | 0;
    if (hc & TIMEOUT) {
        const next = hc - 1;
        u.HConfusion = next;
        u.Confusion = next;
        if (!(next & TIMEOUT)) {
            // C case CONFUSION: set_itimeout(&HConfusion, 1L);
            // make_confused(0L, TRUE); if (!Confusion) stop_occupation();
            u.HConfusion = ((u.HConfusion | 0) & ~TIMEOUT) | 1;
            u.Confusion = u.HConfusion;
            await make_confused(0, true);
            if (!(u.HConfusion | 0) && !(u.Confusion | 0)) {
                await stop_occupation();
            }
        }
    }

    // C case BLINDED — timeout.c:743; make_blinded(0,TRUE) + stop if cured
    const hb = u.HBlinded | 0;
    if (hb & TIMEOUT) {
        const next = hb - 1;
        u.HBlinded = next;
        if (!(next & TIMEOUT)) {
            // C: after --, was_blind = !!Blind (props, not sticky);
            // set_itimeout(&HBlinded, 1L); make_blinded(0L, TRUE);
            // if (was_blind && !Blind) stop_occupation();
            const was_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | 1;
            await make_blinded(0, true);
            const still_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            if (was_blind && !still_blind) await stop_occupation();
        }
    }

    // C case DEAF — timeout.c:752; make_deaf(0,TRUE) talk suppressed if Unaware
    const hd = u.HDeaf | 0;
    if (hd & TIMEOUT) {
        const next = hd - 1;
        u.HDeaf = next;
        if (!(next & TIMEOUT)) {
            // C: set_itimeout(&HDeaf, 1L); make_deaf(0L, TRUE);
            // (TIMEOUT already 0 from --; set 1 so make_deaf old!=0 for botl)
            u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | 1;
            // make_deaf(0): clear TIMEOUT; Unaware → no "hear again" pline
            u.HDeaf = (u.HDeaf | 0) & ~TIMEOUT;
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
            const stillDeaf = !!(u.EDeaf || u.uroleplay?.deaf || u.Deaf);
            if (!stillDeaf) await stop_occupation();
        }
    }

    // C case FUMBLING — timeout.c:902
    const hf = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if (hf & TIMEOUT) {
        const next = hf - 1;
        set_HFumbling(next);
        if (!(next & TIMEOUT)) {
            // C: if (u.umoved && !(Levitation || Flying))
            if (u.umoved && !(u.Levitation || u.Flying)) {
                await slip_or_trip();
                nomul(-2);
                game.multi_reason = 'fumbling';
                game.nomovemsg = '';
                // C: inv_weight() > (WT_NOISY_INV * -1)
                if (inv_weight() > -WT_NOISY_INV) {
                    if (!(u.HDeaf | u.Deaf)) {
                        await pline('You make a lot of noise!');
                    }
                    wake_nearby(false);
                }
            }
            // C: HFumbling &= ~FROMOUTSIDE; if (Fumbling) incr_itimeout rnd(20)
            set_HFumbling((u.HFumbling | 0) & ~FROMOUTSIDE);
            if (Fumbling()) {
                incr_itimeout_HFumbling(rnd(20));
            }
            // defer_decor deferred
        }
    }

    // C case FAST — timeout.c:725; timed FAST is Very_fast until TIMEOUT ends
    const hfast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
    if (hfast & TIMEOUT) {
        const next = hfast - 1;
        set_HFast(next);
        if (!(next & TIMEOUT)) {
            // C: if (!Very_fast) You_feel("yourself slow down%s.", Fast ? " a bit" : "");
            if (!Very_fast()) {
                await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
            }
        }
    }

    // C: run_timers() at end of nh_timeout — corpse rot / object timers
    await run_timers();
}
