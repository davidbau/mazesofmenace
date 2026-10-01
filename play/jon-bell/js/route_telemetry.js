import { ENV } from './hostenv.js';
// js/route_telemetry.js — WRITE-ONLY route-attribution telemetry channel.
//
// channel the frozen scorer discards.  When the env var NH_ROUTE_TELEMETRY=1
// the blocking-read routes (_pline_paged, _topl_more/force_more/
// occupation_force_more, _topl_record_join/_topl_split_for_more,
// com_pager/pline_with_more, chargen_ui, yn readers) tag each read they raise
// with the screen-frame index it produces, so the triage instrument can name
// WHICH JS route produced (or swallowed) a divergent blocking-read event.
//
//    'route-telemetry-read' pattern) ─────────────────────────────────────────
//  * WRITE-ONLY from game code: js/** may only CALL routeTag()/routeFrameTick()
//    (both return undefined).  Game logic must NEVER read the log —
//    __NH_ROUTE_LOG__ / __NH_ROUTE_FRAME__ may not appear anywhere in js/**
//    entry point is a single guarded early-return; no allocation, no globals
//    with the channel on/off (asserted by
//  * NO RNG, NO screen mutation, NO reads of game state beyond the strings
//    the caller already has in hand.

const ON = (() => {
    try { return typeof process !== 'undefined' && !!ENV && ENV.NH_ROUTE_TELEMETRY === '1'; }
    catch { return false; }
})();

/** True iff the telemetry channel is armed (for callers that want to skip
 *  building a detail string; routeTag() itself is always safe to call). */
export function routeTelemetryOn() { return ON; }

export function routeTag(route, detail, frame) {
    if (!ON) return;
    const g = globalThis;
    if (!g.__NH_ROUTE_LOG__) g.__NH_ROUTE_LOG__ = [];
    g.__NH_ROUTE_LOG__.push({
        frame: (frame != null ? frame : (g.__NH_ROUTE_FRAME__ ?? 0)) | 0,
        route: String(route),
        detail: detail == null ? null : String(detail).slice(0, 160),
    });
}

export function routeFrameTick() {
    if (!ON) return;
    const g = globalThis;
    g.__NH_ROUTE_FRAME__ = ((g.__NH_ROUTE_FRAME__ ?? 0) | 0) + 1;
}
