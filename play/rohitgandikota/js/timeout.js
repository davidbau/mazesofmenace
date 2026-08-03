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
import { rnd } from './rng.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';

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

// src/timeout.c:660 nh_timeout() — the per-turn countdown of intrinsic
// timeouts. Only the intrinsic-timer loop is live; the luck rebalancing,
// storm/fumaroles arms and most expiry cases need absent state and are
// recorded when their trigger appears.
export async function nh_timeout() {
    const intr = game.u.intrinsic;
    if (game.u.uluck)
        note_unported_timeout('nh_timeout:luck_rebalance');
    if (!intr)
        return;

    for (const key of Object.keys(intr)) {
        const v = intr[key];
        if (typeof v !== 'number' || v <= 0)
            continue;
        intr[key] = v - 1;
        if (intr[key] > 0)
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
        default:
            note_unported_timeout(`nh_timeout:${key}`);
            break;
        }
    }
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
