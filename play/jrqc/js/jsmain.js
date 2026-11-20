// js/jsmain.js: glue between the contest API and the transpiled NetHack
// (method/design.md 8.3). Hand-written; replaced the template skeleton
// when the generated build first ran end to end (decision D5).
//
// One segment = one run of the recorder's process (js/nhprocess.js), and we
// collect what the recorder collected:
//   - screens and cursors from the OSC 7777 markers at every input boundary,
//     encoded exactly as tools/recorder-env/record-session.mjs encodes them;
//   - RNG calls from the NETHACK_RNGLOG lines, without the "@ caller" tag; the
//     full lines are kept as a debug log for triage.
// The segment ends when the program waits for a key and none is left, or exits.
// The judge calls runSegment(input) with no prevGame (CLAUDE.md 1.5).
import { bootProcess, encodeScreen } from './nhprocess.js';
export { HOME, HACKDIR } from './nhprocess.js';
export { NethackGame } from './allmain.js';   // interactive play (index.html, frozen/playability_runner.mjs)

class SegmentGame {
    constructor() { this.screens = []; this.cursors = []; this.anim = []; this.rng = []; this.rngDebug = []; this.error = null; this.exitStatus = null; }
    // The judge (frozen/ps_test_runner.mjs runSession) keeps a recorded step's screen
    // and cursor only `if (step.screen)`: a fully blank terminal encodes as "" and is
    // not compared. Ours are left out by the same rule so later screens stay aligned
    // with the recording (a blank screen mid-session, e.g. after the end-of-game
    // conduct prompt, shifted every later screen by one).
    getScreens() { return this.screens.filter((s) => s); }
    getCursors() { return this.cursors.filter((_, i) => this.screens[i]); }
    // per input boundary, blank screens included (tools index these by step)
    getStepScreens() { return this.screens; }
    getStepCursors() { return this.cursors; }
    getRngLog() { return this.rng; }
    getRngDebugLog() { return this.rngDebug; }
    getAnimationFramesByStep() { return this.anim; }
    async animationFrame() { /* frames come from the C markers */ }
}

export async function runSegment(input, _prevGame = null) {
    const g = new SegmentGame();
    const moves = (input.moves ?? '').replace(/\r/g, '\n');   // tmux's ICRNL, as record-session.mjs does
    const expected = moves.length + 1;
    let pendingAnim = [];
    let starved;
    const starvedP = new Promise((res) => { starved = res; });
    const p = bootProcess({
        seed: input.seed, datetime: input.datetime, nethackrc: input.nethackrc, storage: input.storage,
        keys: moves, onStarve: () => starved(),
        onMarker: (m) => {
            if (m.kind === 'anim') { pendingAnim.push({ screen: encodeScreen(m.payload), cursor: [m.cx, m.cy, 1] }); return; }
            if (m.kind !== 'input' || g.screens.length >= expected) return;
            g.screens.push(encodeScreen(m.payload));
            g.cursors.push([m.cx, m.cy, 1]);
            g.anim.push(pendingAnim);
            pendingAnim = [];
        },
        onRng: (call, full) => { g.rngDebug.push(full); g.rng.push(call); },
    });
    const run = p.done.then((r) => { if (r.error) g.error = r.error; else g.exitStatus = r.status; });
    await Promise.race([run, starvedP]);
    p.flush();
    if (g.error && !globalThis.__nhQuiet) console.error('[nhmain] ' + (g.error.stack || g.error));
    return g;
}
