// obj_timeout_dispatch.js — Object-attached timer expiry (timeout.c run_timers subset).
// C ref: timeout.c run_timers(); dig.c rot_organic()/rot_corpse(); do.c revive_mon()/zombify_mon();
//        allmain.c moveloop nh_timeout() tail calls run_timers.

import {
    Has_contents,
    ROT_ORGANIC,
    ROT_CORPSE,
    REVIVE_MON,
    ZOMBIFY_MON,
} from './const.js';
import { CORPSE_OTYP } from './mkobj_corpse.js';
import {
    prependBuriedObjectInLevel,
    obliterateObjectInLevel,
} from './floorobj.js';
import { newsym } from './display.js';
import { makemon } from './makemon.js';
import {
    objHasNhTimer,
    removeNhObjTimerKey,
    riderRevivalTime,
    startNhObjTimer,
} from './obj_rot_timer.js';
import { isRiderMnum, fakemonForCorpsenm } from './mondata.js';
import { d, rn2 } from './rng.js';
import { enextoNearMon } from './walkable.js';

/**
 * @param {import('./gstate.js').game} g
 * @param {object} o
 * @returns {'floor'|'buried'|'other'}
 */
function objectOnFloorOrBuried(g, o) {
    const k = `${o.ox | 0},${o.oy | 0}`;
    for (let cur = g.level?.floorObjHeads?.get(k); cur; cur = cur.nexthere) {
        if (cur === o) return 'floor';
    }
    for (let cur = g.level?.buriedObjHeads?.get(k); cur; cur = cur.nexthere) {
        if (cur === o) return 'buried';
    }
    return 'other';
}

/** C: dig.c **`rot_organic`** — container contents → **`bury_an_obj`**; **`obfree`**. */
export function rotOrganicTimeout(g, obj) {
    while (Has_contents(obj)) {
        const ch = obj.cobj;
        const rest = ch.nobj ?? null;
        ch.nobj = null;
        obj.cobj = rest ?? null;
        ch.ox = obj.ox | 0;
        ch.oy = obj.oy | 0;
        prependBuriedObjectInLevel(g, ch);
    }
    obliterateObjectInLevel(g, obj);
}

/** C: dig.c **`rot_corpse`** — floor tail **`newsym`**; then **`rot_organic`**. */
export function rotCorpseTimeout(g, obj) {
    const pl = objectOnFloorOrBuried(g, obj);
    const onFloor = pl === 'floor';
    const sx = obj.ox | 0;
    const sy = obj.oy | 0;
    rotOrganicTimeout(g, obj);
    if (onFloor) newsym(sx, sy);
}

/**
 * C: zap.c **`revive`** subset + **`do.c`** **`revive_mon`** reschedule.
 * @returns {boolean} true if corpse was consumed (**`revive_corpse`** success)
 */
function tryReviveCorpseFromTimeout(g, body) {
    if ((body.otyp | 0) !== CORPSE_OTYP) return false;
    const pl = objectOnFloorOrBuried(g, body);
    if (pl !== 'floor' && pl !== 'buried') return false;
    const mons = g.level?.monsters;
    if (!mons) return false;
    const mnum = body.corpsenm | 0;
    const fakemon = fakemonForCorpsenm(mnum);
    let x = body.ox | 0;
    let y = body.oy | 0;
    if (mons.some((m) => (m.mx | 0) === x && (m.my | 0) === y)) {
        const alt = enextoNearMon(g, x, y, fakemon);
        if (!alt) return false;
        x = alt.x;
        y = alt.y;
    }
    const mtmp = makemon({ mnum }, x, y, 0);
    if (!mtmp) return false;
    obliterateObjectInLevel(g, body);
    mtmp.mx = x;
    mtmp.my = y;
    mons.push(mtmp);
    return true;
}

/** C: **`do.c`** **`revive_mon`** — displacer **`rloc`** block still TODO. */
export function reviveMonTimeout(g, body) {
    if (tryReviveCorpseFromTimeout(g, body)) return;
    const mnum = body.corpsenm | 0;
    if (isRiderMnum(mnum) && rn2(99)) {
        if (!objHasNhTimer(body, REVIVE_MON)) {
            startNhObjTimer(g, body, riderRevivalTime(body, true), REVIVE_MON);
        }
    } else {
        if (!objHasNhTimer(body, ROT_CORPSE)) {
            const when = Math.max(1, d(5, 50) - ((g.moves | 0) - (body.age | 0)));
            startNhObjTimer(g, body, when, ROT_CORPSE);
        }
    }
}

/** C: **`do.c`** **`zombify_mon`** else branch → **`rot_corpse`**. */
export function zombifyMonTimeout(g, body) {
    rotCorpseTimeout(g, body);
}

/**
 * @param {import('./gstate.js').game} g
 * @param {object} o
 * @param {number} funcIndex
 * @param {number} deadline
 */
function dispatchOneObjectTimer(g, o, funcIndex, deadline) {
    const m = g.moves | 0;
    const map = o?._nhObjTimers;
    if (!map || map[funcIndex] !== deadline || map[funcIndex] > m) return;
    removeNhObjTimerKey(o, funcIndex);
    switch (funcIndex | 0) {
        case ROT_ORGANIC:
            rotOrganicTimeout(g, o);
            break;
        case ROT_CORPSE:
            rotCorpseTimeout(g, o);
            break;
        case REVIVE_MON:
            reviveMonTimeout(g, o);
            break;
        case ZOMBIFY_MON:
            zombifyMonTimeout(g, o);
            break;
        default:
            break;
    }
}

/**
 * C: **`timeout.c`** **`run_timers`** — process due **`TIMER_OBJECT`** deadlines (**`_nhObjTimers`**).
 * One global dequeue step per iteration (closest deadline first).
 * @param {import('./gstate.js').game} g
 */
export function runDueNhObjTimers(g) {
    const moves = g.moves | 0;
    const lvl = g.level;
    if (!lvl) return;

    let guard = 0;
    while (guard++ < 4096) {
        const candidates = [];
        let oid = 0;
        for (const o of lvl.objects || []) {
            if (!o?._nhObjTimers) continue;
            for (const k of Object.keys(o._nhObjTimers)) {
                const funcIndex = k | 0;
                const deadline = o._nhObjTimers[funcIndex] | 0;
                if (deadline <= moves) candidates.push({ o, funcIndex, deadline, oid: oid++ });
            }
        }
        if (!candidates.length) break;
        candidates.sort(
            (a, b) =>
                a.deadline - b.deadline ||
                a.funcIndex - b.funcIndex ||
                a.oid - b.oid,
        );
        const best = candidates[0];
        if (!best.o?._nhObjTimers || best.o._nhObjTimers[best.funcIndex] !== best.deadline) continue;
        dispatchOneObjectTimer(g, best.o, best.funcIndex, best.deadline);
    }
}
