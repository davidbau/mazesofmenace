// obj_rot_timer.js — Object-attached rot/revive timers (mkobj.c obj_timer_checks subset).
// C ref: mkobj.c obj_timer_checks(), start_corpse_timeout(); timeout.c stop_timer()/start_timer() return semantics;
//        timeout.c TIMER_OBJECT **`timed`** refcount (**single timer** model here).

import {
    ROT_CORPSE,
    REVIVE_MON,
    PM_DEATH,
    PM_LICHEN,
    PM_LIZARD,
    ROT_AGE,
    TAINT_AGE,
    TROLL_REVIVE_CHANCE,
} from './const.js';
import { isRiderMnum, isTrollCorpsenm } from './mondata.js';
import { rn2, rnz } from './rng.js';

/** NH5 `objects_nums` corpse **`otyp`** (same as **`mkobj_corpse.js`** **`CORPSE_OTYP`**). */
import { CORPSE_OTYP } from './mkobj_corpse.js';

/** C: mkobj.c **`#define ROT_ICE_ADJUSTMENT 2`** */
export const ROT_ICE_ADJUSTMENT = 2;

/**
 * C: **`timeout.c`** **`stop_timer`** — returns moves **remaining** (**`deadline - svm.moves`**).
 * JS stores absolute **`deadlineMoves`** on **`o._nhObjTimers[funcIndex]`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<number, number>|undefined} map
 * @param {number} funcIndex — **`ROT_CORPSE`** / **`REVIVE_MON`**
 */
export function stopNhObjTimer(g, o, funcIndex) {
    const m = g.moves ?? 0;
    const map = /** @type {Record<number, number>} */ (o?._nhObjTimers);
    if (!map || map[funcIndex] == null) return 0;
    const deadline = map[funcIndex] | 0;
    delete map[funcIndex];
    if (!Object.keys(map).length) delete o._nhObjTimers;
    syncObjTimedCount(o);
    return Math.max(0, deadline - m);
}

/**
 * C: **`start_timer(when, TIMER_OBJECT, func_index, …)`** — **`when`** is delta from **`moves`**.
 * @returns {boolean} false when duplicate (**`impossible`** in C)
 */
export function startNhObjTimer(g, o, whenDelta, funcIndex) {
    if (!o) return false;
    const wd = Math.max(0, whenDelta | 0);
    const m = g.moves ?? 0;
    if (!o._nhObjTimers) o._nhObjTimers = {};
    const map = /** @type {Record<number, number>} */ (o._nhObjTimers);
    if (map[funcIndex] != null) return false;
    map[funcIndex] = m + wd;
    syncObjTimedCount(o);
    return true;
}

/** C: increment **`obj->timed`** per active **`TIMER_OBJECT`** — JS uses key count. */
function syncObjTimedCount(o) {
    const n = o?._nhObjTimers ? Object.keys(o._nhObjTimers).length : 0;
    o.timed = n > 0 ? n : 0;
}

/** C: **`timeout.c`** **`obj_has_timer`** / queue lookup — one **`func_index`** key present. */
export function objHasNhTimer(o, funcIndex) {
    return o?._nhObjTimers?.[funcIndex] != null;
}

/**
 * C: **`timeout.c`** queue removal without return value — like dequeue before **`timeout_proc`**.
 * @returns {boolean} whether a key was removed
 */
export function removeNhObjTimerKey(o, funcIndex) {
    const map = /** @type {Record<number, number>} */ (o?._nhObjTimers);
    if (!map || map[funcIndex] == null) return false;
    delete map[funcIndex];
    if (!Object.keys(map).length) delete o._nhObjTimers;
    syncObjTimedCount(o);
    return true;
}

/**
 * C: **`mkobj.c`** **`rider_revival_time`** — **`rn2(3)`** loop from **`minturn`** ..**`66`**.
 * @param {{ corpsenm?: number }} body
 * @param {boolean} retry
 */
export function riderRevivalTime(body, retry) {
    const minturn = retry ? 3 : ((body?.corpsenm | 0) === PM_DEATH ? 6 : 12);
    let when;
    for (when = minturn; when < 67; when++) {
        if (!rn2(3)) break;
    }
    return when;
}

/**
 * C: mkobj.c **`start_corpse_timeout`** — **`start_timer`** for **`ROT_CORPSE`/`REVIVE_MON`** ( **`ZOMBIFY_MON`**
 * when **`zombie_form`** is ported).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, corpsenm?: number, age?: number, norevive?: number }} body
 */
export function startCorpseTimeout(g, body) {
    if ((body.otyp | 0) !== CORPSE_OTYP) return;
    const cm = body.corpsenm | 0;
    if (cm === PM_LICHEN || cm === PM_LIZARD) return;

    let action = ROT_CORPSE;
    const rot_adjust = g.in_mklev ? 25 : 10;
    let age = Math.max(g.moves | 0, 1) - (body.age | 0);
    let when = age > ROT_AGE ? rot_adjust : ROT_AGE - age;
    when += rnz(rot_adjust) - rot_adjust;

    if (isRiderMnum(cm)) {
        action = REVIVE_MON;
        when = riderRevivalTime(body, false);
    } else if (isTrollCorpsenm(cm)) {
        for (let a2 = 2; a2 <= TAINT_AGE; a2++) {
            if (!rn2(TROLL_REVIVE_CHANCE)) {
                action = REVIVE_MON;
                when = a2;
                break;
            }
        }
    }

    startNhObjTimer(g, body, when | 0, action);
}

/**
 * C: mkobj.c **`obj_timer_checks(otmp, x, y, force)`** — corpse + ice only (**`ROT_CORPSE`/`REVIVE_MON`**).
 * @param {'floor'|'buried'} where — C **`OBJ_FLOOR`/`OBJ_BURIED`**
 * @param {(gx: import('./gstate.js').game, xi: number, yi: number) => boolean} isIceAtCell
 */
export function objTimerChecksMkobj(g, o, x, y, force, where, isIceAtCell) {
    if ((o.otyp | 0) !== CORPSE_OTYP) return;
    const xh = x | 0;
    const yh = y | 0;
    const onFloor = where === 'floor';
    const buried = where === 'buried';
    const ice = !!isIceAtCell(g, xh, yh);
    const moves = g.moves ?? 0;

    let tleft = 0;
    let action = ROT_CORPSE;
    let restart = false;

    /* C: corpses just placed on or in ice */
    if ((onFloor || buried) && ice && force >= 0) {
        tleft = stopNhObjTimer(g, o, ROT_CORPSE);
        if (!tleft) {
            action = REVIVE_MON;
            tleft = stopNhObjTimer(g, o, REVIVE_MON);
        }
        if (tleft) {
            o.on_ice = 1;
            const age = moves - (o.age | 0);
            o.age = moves - age * ROT_ICE_ADJUSTMENT;
            tleft *= ROT_ICE_ADJUSTMENT;
            restart = true;
        }
    } else if (
        force < 0
        || ((o.on_ice | 0) && !((onFloor || buried) && ice))
    ) {
        tleft = stopNhObjTimer(g, o, ROT_CORPSE);
        if (!tleft) {
            action = REVIVE_MON;
            tleft = stopNhObjTimer(g, o, REVIVE_MON);
        }
        if (tleft) {
            o.on_ice = 0;
            const age = moves - (o.age | 0);
            o.age = (o.age | 0) + Math.trunc((age * (ROT_ICE_ADJUSTMENT - 1)) / ROT_ICE_ADJUSTMENT);
            tleft = Math.trunc(tleft / ROT_ICE_ADJUSTMENT);
            restart = true;
        }
    }
    if (restart) startNhObjTimer(g, o, tleft, action);
}
