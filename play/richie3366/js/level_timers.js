// level_timers.js — TIMER_LEVEL-style one-shot timers (subset).
// C ref: zap.c start_melt_ice_timeout(), timeout.c spot_stop_timers() / run_timers;
//        zap.c melt_ice_away() (dispatch from allmain to avoid import cycle with melt_ice.js).

import { MELT_ICE_AWAY } from './const.js';
import { rn2 } from './rng.js';

const MIN_ICE_TIME = 50;
const MAX_ICE_TIME = 2000;

function ensureTimers(g) {
    const lvl = g.level;
    if (!lvl) return null;
    if (!lvl.timers) lvl.timers = [];
    return lvl.timers;
}

/**
 * C: zap.c spot_stop_timers(x, y, MELT_ICE_AWAY) — cancel pending melt-at for this cell.
 * @param {import('./gstate.js').game} g
 */
export function spotStopTimersMeltIceAway(g, x, y) {
    const arr = g.level?.timers;
    if (!arr?.length) return;
    for (let i = arr.length - 1; i >= 0; i--) {
        const t = arr[i];
        if (t.func === MELT_ICE_AWAY && t.x === x && t.y === y) arr.splice(i, 1);
    }
}

/**
 * C: zap.c start_melt_ice_timeout(x, y, min_time) — RNG loop matches C.
 * Installs a level timer that allmain dispatches via **`pullDueMeltIceAwayTimers`**.
 * @param {import('./gstate.js').game} g
 * @param {number} minTime — C `min_time` (old timeout floor; often 0)
 */
export function startMeltIceAwayTimer(g, x, y, minTime = 0) {
    const arr = ensureTimers(g);
    if (!arr) return;

    let when = minTime | 0;
    if (when < MIN_ICE_TIME - 1) when = MIN_ICE_TIME - 1;

    while (++when <= MAX_ICE_TIME) {
        if (!rn2(MAX_ICE_TIME - when + MIN_ICE_TIME)) break;
    }
    if (when > MAX_ICE_TIME) return;

    const startMoves = g.moves | 0;
    arr.push({
        func: MELT_ICE_AWAY,
        x,
        y,
        deadlineMoves: startMoves + when,
    });
}

/**
 * C: timeout.c spot_time_left(x, y, MELT_ICE_AWAY) — turns remaining until melt (0 if none).
 * @param {import('./gstate.js').game} g
 */
export function spotTimeLeftMeltIceAway(g, x, y) {
    const arr = g.level?.timers;
    if (!arr?.length) return 0;
    const m = g.moves | 0;
    for (const t of arr) {
        if (t.func === MELT_ICE_AWAY && t.x === x && t.y === y) {
            return Math.max(0, (t.deadlineMoves | 0) - m);
        }
    }
    return 0;
}

/**
 * C: zap.c zap_over_floor ZT_COLD — already-ice branch (spot_stop + restart with prior melt time).
 * @param {import('./gstate.js').game} g
 */
export function refirmMeltIceTimerAt(g, x, y) {
    const meltTime = spotTimeLeftMeltIceAway(g, x, y);
    if (meltTime === 0) return;
    spotStopTimersMeltIceAway(g, x, y);
    startMeltIceAwayTimer(g, x, y, meltTime);
}

/**
 * Remove all **`MELT_ICE_AWAY`** timers due on or before **`g.moves`** (C timeout dispatch order simplified).
 * @param {import('./gstate.js').game} g
 * @returns {{ x: number, y: number }[]}
 */
export function pullDueMeltIceAwayTimers(g) {
    const arr = g.level?.timers;
    if (!arr?.length) return [];
    const m = g.moves | 0;
    const out = [];
    for (let i = 0; i < arr.length; i++) {
        const t = arr[i];
        if (t.func !== MELT_ICE_AWAY || (t.deadlineMoves | 0) > m) continue;
        out.push({ x: t.x | 0, y: t.y | 0 });
    }
    if (!out.length) return [];
    for (let i = arr.length - 1; i >= 0; i--) {
        const t = arr[i];
        if (t.func === MELT_ICE_AWAY && (t.deadlineMoves | 0) <= m) arr.splice(i, 1);
    }
    return out;
}
