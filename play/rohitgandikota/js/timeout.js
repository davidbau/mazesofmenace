// timeout.js — the timer queue.
// C ref: src/timeout.c
//
// Nothing here draws. The queue exists because several subsystems schedule an
// effect for a future turn rather than applying it now: buried organics rot,
// eggs hatch, lit objects burn out. Level generation starts those timers, so a
// port that skips them looks right at generation time and then never fires the
// effect.
//
// The delay itself is drawn by the CALLER, before start_timer is reached
// (bury_an_obj spends rnd(250) for ROT_ORGANIC). Only the bookkeeping is here.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { TIMEOUT, FROMOUTSIDE, WT_NOISY_INV, FOOT, A_DEX, A_CON,
         PLNMSG_ONE_ITEM_HERE } from './const.js';
import { ONAMES } from './objects_data.js';
import { pline } from './display.js';

// include/timeout.h:11 enum timer_type
export const TIMER_NONE = 0;
export const TIMER_LEVEL = 1;
export const TIMER_GLOBAL = 2;
export const TIMER_OBJECT = 3;
export const TIMER_MONSTER = 4;
export const NUM_TIMER_KINDS = 5;

// include/timeout.h:36 enum timeout_types
export const ROT_ORGANIC = 0;
export const ROT_CORPSE = 1;
export const REVIVE_MON = 2;
export const ZOMBIFY_MON = 3;
export const BURN_OBJECT = 4;
export const HATCH_EGG = 5;
export const FIG_TRANSFORM = 6;
export const SHRINK_GLOB = 7;
export const MELT_ICE_AWAY = 8;
export const NUM_TIME_FUNCS = 9;

// src/timeout.c:2467 insert_timer() — keep the queue sorted by timeout.
//
// The scan stops at the first entry whose timeout is >= the new one and links
// in FRONT of it, so a tie puts the newcomer first: equal timeouts come out in
// reverse insertion order.
function insert_timer(gnu) {
    const base = (game.timer_base ||= []);
    let i = 0;
    while (i < base.length && base[i].timeout < gnu.timeout)
        i++;
    base.splice(i, 0, gnu);
}

// src/timeout.c:2247 start_timer() — schedule `func_index` for `arg` in `when`
// turns. Returns whether it was scheduled.
export function start_timer(when, kind, func_index, arg) {
    if (kind <= TIMER_NONE || kind >= NUM_TIMER_KINDS
        || func_index < 0 || func_index >= NUM_TIME_FUNCS)
        throw new Error(`start_timer (${kind}: ${func_index})`);   /* panic() */

    /* fail if <arg> already has a <func_index> timer running */
    const dup = (game.timer_base ||= []).find(
        (d) => d.kind === kind && d.func_index === func_index && d.arg === arg);
    if (dup)
        return false;                   /* impossible(), aborted */

    const gnu = {
        tid: (game.timer_id ??= 0),     /* svt.timer_id++ — post-increment */
        timeout: (game.moves ?? 0) + when,
        kind,
        needs_fixup: 0,
        func_index,
        arg,
    };
    game.timer_id++;
    insert_timer(gnu);

    if (kind === TIMER_OBJECT)          /* increment object's timed count */
        arg.timed = (arg.timed ?? 0) + 1;

    return true;
}

// src/timeout.c:2377 obj_stop_timers(). Remove every timer attached to an
// object before changing the object type or corpse species.
export function obj_stop_timers(obj) {
    const base = (game.timer_base ||= []);
    let removed = 0;
    game.timer_base = base.filter((timer) => {
        const match = timer.kind === TIMER_OBJECT && timer.arg === obj;
        if (match)
            removed++;
        return !match;
    });
    obj.timed = Math.max(0, (obj.timed || 0) - removed);
}

// src/timeout.c:2222 run_timers() — fire every timer whose time has come.
// The list is ordered; we are done when the first element is in the future.
// Runs from nh_timeout()'s tail (timeout.c:947) and from goto_level.
export async function run_timers() {
    const base = (game.timer_base ||= []);
    while (base.length && base[0].timeout <= (game.moves ?? 0)) {
        const curr = base.shift();
        if (curr.kind === TIMER_OBJECT && curr.arg)
            curr.arg.timed = Math.max(0, (curr.arg.timed ?? 1) - 1);
        switch (curr.func_index) {
        case ROT_CORPSE: {
            const { rot_corpse } = await import('./dig.js');
            await rot_corpse(curr.arg);
            break;
        }
        case ROT_ORGANIC: {
            const { rot_organic } = await import('./dig.js');
            rot_organic(curr.arg);
            break;
        }
        case REVIVE_MON: {
            const { revive_mon } = await import('./do.js');
            await revive_mon(curr.arg);
            break;
        }
        default:
            /* hatch_egg, burn_object, revive_mon... — each is its own
               subsystem; record which one fired unported */
            (game.unported ||= new Set())
                .add('timeout:run_timers:' + curr.func_index);
            break;
        }
    }
}

// src/timeout.c:951 fall_asleep() — put the hero to sleep for -how_long turns.
//
// The #if 0 deafness block is not compiled in C and is not ported. usleep
// records WHEN sleep began so combat can wake the hero no earlier than the
// next monster turn. nomovemsg carries the wake message.
export async function fall_asleep(how_long, wakeup_msg) {
    await stop_occupation();
    nomul(how_long);
    game.multi_reason = "sleeping";
    /* early wakeup from combat won't be possible until next monster turn */
    game.u.usleep = game.moves;
    game.nomovemsg = wakeup_msg ? "You wake up." : "You can move again.";
}

// src/timeout.c:1221 slip_or_trip() — feedback when FUMBLING expires after a
// move. The floor-object and ordinary on-foot paths are common. Ice and
// mounted movement retain their exact gates and record only the unported
// forced-movement tail.
async function slip_or_trip() {
    const u = game.u;
    const on_foot = !u.usteed;
    let otmp = (game.level?.objects || [])
        .find(o => o.ox === u.ux && o.oy === u.uy) || null;
    const { is_pool } = await import('./mon.js');
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux, u.uy))
        otmp = null;

    const { You } = await import('./pline.js');
    const { Hallucination } = await import('./youprop.js');
    if (otmp && on_foot) {
        const { doname } = await import('./objnam.js');
        const { body_part } = await import('./polyself.js');
        let what;
        if (game.iflags?.last_msg === PLNMSG_ONE_ITEM_HERE)
            what = (otmp.quan === 1) ? 'it'
                 : Hallucination() ? 'they' : 'them';
        else if (otmp.dknown || !u.ublind)
            what = doname(otmp);
        else {
            const rock = (game.level.objects || [])
                .find(o => o.ox === u.ux && o.oy === u.uy
                           && o.otyp === ONAMES.ROCK);
            what = !rock ? 'something'
                 : rock.quan === 1 ? 'a rock' : 'some rocks';
        }
        if (Hallucination()) {
            const { pline } = await import('./display.js');
            const cap = what.charAt(0).toUpperCase() + what.slice(1);
            await pline(`Egads!  ${cap} bite${otmp.quan === 1 ? 's' : ''} `
                        + `your ${body_part(FOOT)}!`);
        } else {
            await You(`trip over ${what}.`);
        }
        if (!u.uarmf && otmp.otyp === ONAMES.CORPSE)
            note_unported_timeout('slip_or_trip:petrifying_corpse');
        return;
    }

    const { is_ice } = await import('./dbridge.js');
    const intrinsic = u.intrinsic || {};
    if ((intrinsic.HFumbling & FROMOUTSIDE)
        || (is_ice(u.ux, u.uy) && !rn2(3))) {
        const { pline } = await import('./display.js');
        const verb = rn2(2) ? 'slip' : 'slide';
        await pline(`You ${verb} ${is_ice(u.ux, u.uy) ? 'on' : 'off'} the ice.`);
        if (!on_foot) {
            note_unported_timeout('slip_or_trip:mounted_ice');
        } else {
            const { ACURR } = await import('./attrib.js');
            if (!rn2(10 + ACURR(A_DEX)))
                note_unported_timeout('slip_or_trip:hurtle');
        }
        return;
    }

    if (on_foot) {
        switch (rn2(4)) {
        case 1: {
            const { body_part } = await import('./polyself.js');
            const { makeplural } = await import('./objnam.js');
            await You(`trip over your own ${Hallucination()
                       ? 'elbow' : makeplural(body_part(FOOT))}.`);
            break;
        }
        case 2:
            await You(`slip ${Hallucination()
                      ? 'on a banana peel' : 'and nearly fall'}.`);
            break;
        case 3:
            await You('flounder.');
            break;
        default:
            await You('stumble.');
            break;
        }
    } else {
        /* The mounted branch uses the same rn2(4), then dismounts unless the
           saddle is cursed. Keep the draw while its steed plumbing is absent. */
        rn2(4);
        note_unported_timeout('slip_or_trip:mounted');
    }
}

// src/timeout.c:660 nh_timeout() — the per-turn countdown of intrinsic
// timeouts. Only the intrinsic-timer loop is live; the luck rebalancing,
// storm/fumaroles arms and most expiry cases need absent state and are
// recorded when their trigger appears.
export async function nh_timeout() {
    if (game.u.uluck)
        note_unported_timeout('nh_timeout:luck_rebalance');
    /* src/timeout.c:621, successful prayer freezes every dangerous
       timeout, including wizard-set intrinsics, until prayer finishes. */
    if (game.u.uinvulnerable)
        return;

    /* src/timeout.c:631 sickness_dialogue(), followed later in nh_timeout by
       the property countdown. Fatal illness abuses constitution every turn,
       even when its low-time warning text is not yet due. */
    const sick = game.u.uprops?.SICK || 0;
    if (sick) {
        const half = Math.trunc(sick / 2);
        if (half > 0 && half <= 3 && (sick % 2) !== 0) {
            const messages = ["Your illness feels worse.",
                              "Your illness is severe.",
                              "You are at Death's door."];
            await pline(messages[3 - half]);
        }
        const { exercise } = await import('./attrib.js');
        exercise(A_CON, false);
        game.u.uprops.SICK = sick - 1;
    }

    const intr = (game.u.intrinsic ||= {});

    for (const key of Object.keys(intr)) {
        const v = intr[key];
        if (typeof v !== 'number' || !(v & TIMEOUT))
            continue;
        intr[key] = (v & ~TIMEOUT) | (((v & TIMEOUT) - 1) & TIMEOUT);
        if (intr[key] & TIMEOUT)
            continue;
        /* the timeout just ran out */
        switch (key) {
        case 'HWounded_legs': {
            /* src/timeout.c nh_timeout WOUNDED_LEGS arm: heal_legs(0) */
            const { heal_legs } = await import('./do.js');
            intr.HWounded_legs = 1; /* Wounded_legs still true for the heal */
            await heal_legs(0);
            break;
        }
        case 'HConfusion': {
            const { make_confused } = await import('./potion.js');
            intr.HConfusion = 1; /* so make_confused works properly */
            await make_confused(0, true);
            if (!game.u.uprops?.CONFUSION) {
                const { stop_occupation } = await import('./allmain.js');
                await stop_occupation();
            }
            break;
        }
        case 'HStun': {
            const { make_stunned } = await import('./potion.js');
            intr.HStun = 1; /* preserve the old timeout for the cure */
            await make_stunned(0, true);
            break;
        }
        case 'HHallucination': {
            const { make_hallucinated } = await import('./potion.js');
            intr.HHallucination = 1;
            await make_hallucinated(0, true, 0);
            break;
        }
        case 'HBlinded': {
            const { make_blinded } = await import('./potion.js');
            intr.HBlinded = 1; /* preserve the old timeout for the cure */
            await make_blinded(0, true);
            break;
        }
        case 'HFast': {
            const { Fast, Very_fast } = await import('./attrib.js');
            if (!Very_fast()) {
                const { You_feel } = await import('./pline.js');
                await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
            }
            break;
        }
        case 'HFumbling': {
            const { Levitation, Flying, Deaf } = await import('./youprop.js');
            if (game.u.umoved && !(Levitation() || Flying())) {
                await slip_or_trip();
                nomul(-2);
                game.multi_reason = 'fumbling';
                game.nomovemsg = '';
                const { inv_weight } = await import('./attrib.js');
                if (inv_weight() > -WT_NOISY_INV) {
                    if (!Deaf()) {
                        const { You } = await import('./pline.js');
                        await You('make a lot of noise!');
                    }
                    const { wake_nearby } = await import('./mon.js');
                    wake_nearby(false);
                }
            }
            intr.HFumbling &= ~FROMOUTSIDE;
            if (intr.HFumbling || game.u.uprops?.FUMBLING) {
                const timeout = Math.min(TIMEOUT,
                    (intr.HFumbling & TIMEOUT) + rnd(20));
                intr.HFumbling = (intr.HFumbling & ~TIMEOUT) | timeout;
            }
            break;
        }
        default:
            note_unported_timeout(`nh_timeout:${key}`);
            break;
        }
    }

    /* wiz_intrinsic_timeout() keeps properties without a dedicated live
       HFoo slot here. They are still ordinary u.uprops timeouts in C and
       lose one turn in the same loop. */
    const wiz = game.u.wiz_intrinsic_timeouts;
    if (wiz) {
        for (const key of Object.keys(wiz)) {
            if (typeof wiz[key] !== 'number' || wiz[key] <= 0)
                continue;
            if (--wiz[key] === 0)
                delete wiz[key];
        }
    }

    /* src/timeout.c:947 — expired timers fire at the end of nh_timeout */
    await run_timers();
}

function note_unported_timeout(what) {
    (game.unported ||= new Set()).add(what);
}

// src/timeout.c:981 attach_egg_hatch_timeout() — decide if and when the egg
// hatches: one rnd(i) per age 151..200 until a roll exceeds 150.
export function attach_egg_hatch_timeout(egg, when = 0) {
    /* stop_timer: no previous timer exists at creation */
    if (!when) {
        for (let i = (200 - 50) + 1; i <= 200; i++)
            if (rnd(i) > 150) {
                when = i;
                break;
            }
    }
    if (when)
        start_timer(when, TIMER_OBJECT, HATCH_EGG, egg);
}

// src/timeout.c:1846 do_storms() — no lightning if not a stormy level (the
// Plane of Air) or too often even then: the rn2(8) gate is the only draw on
// 7 of 8 stormy turns. A strike sequence spends rnd(64), a cloud hunt of
// up to 100 coordinate pairs and an rn2(3) pair per strike; the bolt itself
// is buzz(), the zap beam engine, which is not ported and records.
export async function do_storms() {
    const { rn2 } = await import('./rng.js');
    const { COLNO, ROWNO, CLOUD } = await import('./const.js');

    /* no lightning if not stormy level or too often, even then */
    if (!game.level?.flags?.stormy || rn2(8))
        return;

    /* the number of strikes is 8-log2(nstrike) */
    for (let nstrike = rnd(64); nstrike <= 64; nstrike *= 2) {
        let x, y, count = 0;
        do {
            x = rnd(COLNO - 1);
            y = rn2(ROWNO);
        } while (++count < 100 && game.level.at(x, y)?.typ !== CLOUD);

        if (count < 100) {
            const dirx = rn2(3) - 1;
            const diry = rn2(3) - 1;
            if (dirx !== 0 || diry !== 0)
                note_unported_timeout('do_storms:buzz');
        }
    }

    if (game.level.at(game.u.ux, game.u.uy)?.typ === CLOUD) {
        /* Inside a cloud during a thunderstorm is deafening. */
        /* Even if already deaf, we sense the thunder's vibrations. */
        const { pline } = await import('./display.js');
        await pline('Kaboom!!!  Boom!!  Boom!!');
        /* incr_itimeout(&HDeaf, rn1(20, 30)) — the draw is C's; the
           deafness property linkage past the timer is not wired */
        const { rn1 } = await import('./rng.js');
        (game.u.intrinsic ||= {}).HDeaf =
            ((game.u.intrinsic.HDeaf | 0) + rn1(20, 30));
        game.botl = true;
        if (!game.u.uinvulnerable) {
            const { stop_occupation } = await import('./allmain.js');
            await stop_occupation();
            await nomul(-3);
            game.multi_reason = 'hiding from thunderstorm';
            game.nomovemsg = 0;
        }
    } else {
        const { You_hear } = await import('./pline.js');
        await You_hear('a rumbling noise.');
    }
}
