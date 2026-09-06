// C: timeout.c generic timers. Callback names and object references are saved;
// callback functions belong to the runtime and are never serialized.
import { game } from './gstate.js';

// timeout.c:fall_asleep uses a negative nomul duration. The disabled deafness
// block is deliberately absent; sleeping is tracked separately from hearing.
export function fallAsleep(howLong, wakeupMessage, stopOccupation) {
    stopOccupation();
    const previous = Math.min(game.multi || 0, -(game._helpless_time || 0));
    if (previous >= howLong) game.u.uinvulnerable = false;
    game.multi = Math.min(previous, howLong);
    game._helpless_time = -game.multi;
    game._sleeping_time = game._helpless_time + 1;
    game.multi_reason = 'sleeping';
    game.u.usleep = game.moves;
    game._wake_message = wakeupMessage ? 'You wake up.' : 'You can move again.';
}

export const TIMER_LEVEL = 1, TIMER_GLOBAL = 2, TIMER_OBJECT = 3, TIMER_MONSTER = 4;
export const ROT_ORGANIC = 0, ROT_CORPSE = 1, REVIVE_MON = 2, ZOMBIFY_MON = 3,
    BURN_OBJECT = 4, HATCH_EGG = 5, FIG_TRANSFORM = 6, SHRINK_GLOB = 7, MELT_ICE_AWAY = 8;

export function startTimer(when, kind, func, arg, g = game) {
    if (kind < TIMER_LEVEL || kind > TIMER_MONSTER || func < ROT_ORGANIC || func > MELT_ICE_AWAY)
        throw new Error('Invalid timer kind or callback');
    const timers = g.timers ??= [];
    if (timers.some(timer => timer.kind === kind && timer.func === func && timer.arg === arg
        && (kind !== TIMER_LEVEL || timer.level === g.level)))
        return false;
    const timer = { timeout: (g.moves || 0) + when, kind, func, arg, tid: g.timerId ?? 1 };
    g.timerId = timer.tid + 1;
    if (kind === TIMER_LEVEL) timer.level = g.level;
    // C inserts ahead of equal deadlines: the last timer started fires first.
    const index = timers.findIndex(current => current.timeout >= timer.timeout);
    timers.splice(index < 0 ? timers.length : index, 0, timer);
    if (kind === TIMER_OBJECT) arg.timed = (arg.timed || 0) + 1;
    return true;
}

export function stopTimer(func, arg, handlers = {}, g = game) {
    const index = (g.timers || []).findIndex(timer => timer.func === func && timer.arg === arg
        && (timer.kind !== TIMER_LEVEL || timer.level === g.level));
    if (index < 0) return 0;
    const [timer] = g.timers.splice(index, 1);
    if (timer.kind === TIMER_OBJECT) arg.timed--;
    handlers[func]?.cleanup?.(arg, timer.timeout, g);
    return timer.timeout - (g.moves || 0);
}

export function peekTimer(func, arg, g = game) {
    return (g.timers || []).find(timer => timer.func === func && timer.arg === arg
        && (timer.kind !== TIMER_LEVEL || timer.level === g.level))?.timeout || 0;
}

export async function runTimers(handlers, g = game, active = () => true, paused = () => false) {
    const results = [];
    for (;;) {
        if (paused()) break;
        // C unloads local timers with their level; this queue retains them.
        const index = (g.timers || []).findIndex(timer => timer.timeout <= (g.moves || 0)
            && (timer.kind !== TIMER_LEVEL || timer.level === g.level) && active(timer));
        if (index < 0) break;
        const [timer] = g.timers.splice(index, 1);
        if (timer.kind === TIMER_OBJECT) timer.arg.timed--;
        // Remove before invoking: callbacks can stop, add or replace timers.
        const result = await handlers[timer.func].run(timer.arg, timer.timeout, g);
        if (result != null) results.push(result);
    }
    return results;
}

export function moveObjectTimers(src, dest, g = game) {
    let count = 0;
    for (const timer of g.timers || []) {
        if (timer.kind !== TIMER_OBJECT || timer.arg !== src) continue;
        timer.arg = dest;
        dest.timed = (dest.timed || 0) + 1;
        count++;
    }
    if (count !== (src.timed || 0)) throw new Error('Object timer count mismatch');
    src.timed = 0;
}

export function splitObjectTimers(src, dest, g = game) {
    for (const timer of [...(g.timers || [])]) {
        if (timer.kind === TIMER_OBJECT && timer.arg === src)
            startTimer(timer.timeout - (g.moves || 0), TIMER_OBJECT, timer.func, dest, g);
    }
}

export function stopObjectTimers(obj, handlers = {}, g = game) {
    for (const timer of [...(g.timers || [])]) {
        if (timer.kind !== TIMER_OBJECT || timer.arg !== obj) continue;
        const index = g.timers.indexOf(timer);
        if (index < 0) continue;
        g.timers.splice(index, 1);
        // C obj_stop_timers leaves the count intact throughout cleanup.
        handlers[timer.func]?.cleanup?.(obj, timer.timeout, g);
    }
    obj.timed = 0;
}

export function stopSpotTimers(x, y, func, handlers = {}, g = game) {
    const where = (x << 16) | y;
    for (const timer of [...(g.timers || [])]) {
        if (timer.kind !== TIMER_LEVEL || timer.func !== func || timer.arg !== where || timer.level !== g.level)
            continue;
        const index = g.timers.indexOf(timer);
        if (index < 0) continue;
        g.timers.splice(index, 1);
        handlers[func]?.cleanup?.(where, timer.timeout, g);
    }
}

export function spotTimerExpires(x, y, func, g = game) {
    const where = (x << 16) | y;
    return (g.timers || []).find(timer => timer.kind === TIMER_LEVEL && timer.func === func
        && timer.arg === where && timer.level === g.level)?.timeout || 0;
}
