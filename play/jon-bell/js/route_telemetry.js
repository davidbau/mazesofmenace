import { ENV } from './hostenv.js';
// js/route_telemetry.js — WRITE-ONLY route-attribution telemetry channel.
//
// Commissioned by tasks/generated/build-instrument-tty-paging-001.yaml (§3,
// JS ROUTE ATTRIBUTION) following the tools/dev-runner pattern
// (docs/TOOLING_PHILOSOPHY.md lesson 2): a behavior-compatible telemetry
// channel the frozen scorer discards.  When the env var NH_ROUTE_TELEMETRY=1
// is set (ONLY ever set by tools/input-desync-triage.mjs's replay subprocess),
// the blocking-read routes (_pline_paged, _topl_more/force_more/
// occupation_force_more, _topl_record_join/_topl_split_for_more,
// com_pager/pline_with_more, chargen_ui, yn readers) tag each read they raise
// with the screen-frame index it produces, so the triage instrument can name
// WHICH JS route produced (or swallowed) a divergent blocking-read event.
//
// ── CONTRACT (enforced by tools/reviewer/anti-scaffold-check.mjs,
//    'route-telemetry-read' pattern) ─────────────────────────────────────────
//  * WRITE-ONLY from game code: js/** may only CALL routeTag()/routeFrameTick()
//    (both return undefined).  Game logic must NEVER read the log —
//    __NH_ROUTE_LOG__ / __NH_ROUTE_FRAME__ may not appear anywhere in js/**
//    outside this file.  Only tools/ (the triage replay subprocess) reads it.
//  * INERT when NH_ROUTE_TELEMETRY is unset (the contest/scorer path): every
//    entry point is a single guarded early-return; no allocation, no globals
//    touched, no behavioral difference.  Contest pass/fail is bit-identical
//    with the channel on/off (asserted by
//    `node tools/input-desync-triage.mjs --self-test-telemetry`).
//  * NO RNG, NO screen mutation, NO reads of game state beyond the strings
//    the caller already has in hand.

const ON = (() => {
    try { return typeof process !== 'undefined' && !!ENV && ENV.NH_ROUTE_TELEMETRY === '1'; }
    catch { return false; }
})();

/** True iff the telemetry channel is armed (for callers that want to skip
 *  building a detail string; routeTag() itself is always safe to call). */
export function routeTelemetryOn() { return ON; }

/**
 * Tag a blocking-read route event.  `route` names the JS route (e.g.
 * '_pline_paged', 'occupation_force_more', 'chargen_ui'); `detail` is a short
 * free-text hint (usually the message being paged).  `frame`, when given,
 * overrides the frame index (used by the pre-populated chargen frames, which
 * bypass the capture hook); otherwise the current hook-tick counter is used —
 * which equals the index of the NEXT screen the capture hook will record,
 * i.e. exactly the frame a read raised here produces.
 */
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

/**
 * Advance the frame counter.  Called exactly once per captured screen (from
 * the jsmain capture hook, AFTER the push, and once per pre-populated chargen
 * frame), so the counter always equals the number of frames recorded so far.
 */
export function routeFrameTick() {
    if (!ON) return;
    const g = globalThis;
    g.__NH_ROUTE_FRAME__ = ((g.__NH_ROUTE_FRAME__ ?? 0) | 0) + 1;
}
