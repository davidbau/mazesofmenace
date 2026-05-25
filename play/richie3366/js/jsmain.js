// jsmain.js — Game engine: NethackGame class + per-segment runner.
// C ref: unixmain.c — nethack_main() initialization and game setup.
//
// Contest contract: the judge orchestrates sessions (load JSON,
// normalize v4/v5, loop segments, aggregate scores). It calls
// runSegment(segment, prevGame) for each game segment and reads back
// game.getScreens() / getRngLog() / getCursors() to compare with
// C-recorded session data.
//
// For browser play, see nethack.js (uses NethackGame directly).

import { game, resetGame } from './gstate.js';
import { initRng, enableRngLog, getRngLog } from './rng.js';
import { pushKey, hasQueuedInput, initReplayMoves } from './input.js';
import { newgame, moveloop_core } from './allmain.js';
import { runPostCommandTurnAdvanceLikeC } from './moveloop_turn_advance.js';
import { moveloopPreamble, maybeDoTutorialLikeC } from './moveloop_preamble.js';
import { parseNethackrc } from './options.js';
import { flush_screen } from './display.js';
import { GameDisplay } from './game_display.js';
import { applyIdentityFromNethackrc } from './chargen.js';
import { needsFullInteractiveChargen, needsAsknameOnly, runInteractiveTtyChargen, ttyAsknameLikeC } from './chargen_tty.js';

export {
    enteredNewLevelLivelogMetaLikeC,
    livelogPrintfLikeC,
    maybeRecordEnteredNewLevelLivelogLikeC,
} from './livelog.js';

// ── NethackGame ──
// Wraps a single game session with replay infrastructure.
export class NethackGame {
    constructor(opts = {}) {
        this._seed = opts.seed || 0;
        this._datetime = opts.datetime || null;
        this._nethackrc = opts.nethackrc || '';
        // Cross-segment persistence handle. The judge sandbox passes a
        // shared Web-Storage-shaped object here so save / record /
        // bones survive across segments of a session; the browser
        // /play/<owner>/ page passes a localStorage-backed view so
        // those files also survive page reloads. If a port doesn't
        // need persistence (no save/restore implemented yet), it can
        // ignore this; the field just sits unused.
        this._storage = opts.storage || null;
        this._screens = [];
        this._cursors = [];
        this._rngSlices = [];
        // Animation frames captured during each step.  Outer index
        // matches _screens (one entry per input boundary); inner array
        // is the frames that fired between this boundary and the
        // previous one, in emit order.  Populated by animationFrame()
        // calls; committed at each input boundary.
        this._animFramesByStep = [];
        this._pendingAnimFrames = [];
        this._lastRngIdx = 0;
        this._nhgetchCount = 0;
    }

    // Universal animation-frame hook.  Call once per intermediate
    // animation state — typically inside whatever your port writes as
    // the equivalent of NetHack's nh_delay_output() (zap beams, thrown
    // objects, hurtle steps, explosion expansions).
    //
    // Same call, same code, in every runtime:
    //   * Browser /play/  — your writes to the Terminal already update
    //                        the visible DOM cells; we yield via
    //                        requestAnimationFrame so the browser
    //                        actually paints between frames.
    //   * Judge sandbox    — the Terminal is a pure data structure;
    //                        we yield a microtask, effectively
    //                        immediate.
    //   * Local score.sh   — same as judge sandbox.
    //
    // The yield mechanism is the only environment-sensitive bit, and
    // it is invisible to contestant code: every caller writes the same
    // `await game.animationFrame()`.
    //
    // Frames are scored as a SUPPLEMENTAL metric (see API.md).  Not
    // implementing animation frames doesn't penalise your official
    // RNG / screen score in any way.
    async animationFrame() {
        const disp = game?.nhDisplay;
        const term = disp?.terminal || disp;
        this._pendingAnimFrames.push({
            screen: term?.serialize ? term.serialize() : '',
            cursor: disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null,
        });
        if (typeof requestAnimationFrame === 'function') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        } else {
            await null;
        }
    }

    async start() {
        const g = resetGame();

        // Parse nethackrc
        const opts = parseNethackrc(this._nethackrc);
        const fullInteractiveChargen = needsFullInteractiveChargen(opts);
        const asknameOnly = needsAsknameOnly(opts);
        g.plname = (fullInteractiveChargen || asknameOnly) ? '' : (opts.name || 'Hero');
        /* C optlist.h — NHOPTB(legacy … On), NHOPTB(showexp … Off), NHOPTB(time … Off) */
        g.flags = { verbose: true, legacy: true, showexp: false, time: false, ...opts.flags };
        g.iflags = { ...opts.iflags };
        if (opts.preferred_pet) g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set) g.tutorial_set_in_config = true;

        // Initialize hero struct
        g.u = {
            ux: 0, uy: 0, ux0: 0, uy0: 0, dx: 0, dy: 0, dz: 0, /* C: you.h last move + getdir z */
            uac: 0, /* C: before u_init_skills_discoveries find_ac — first botl shows AC:0 */
            uluck: 0, LUCKADD: 0, Upolyd: 0,
            umonnum: 0, /* C: you.h — poly form index; `NODIAG` / corpse `monsndx` */
            inv_weight: 0, weight_cap: 0, /* C: invent.c — `cant_squeeze_thru` diagonal load */
            underwater: 0, /* C: you.h u.uinwater-style — pool / describe_decor / vision */
            utrap: 0, utraptype: 0, wounded_legs: 0, wounded_leg_side: 0,
            /** C: you.h **`ushops0`** — SHOPBASE **`levl.roomno`** list from hero tile before last **`u.ux`/`u.uy`** change (`hack.c` **`move_update`**). */
            ushops0: [],
        };
        g.uball = null;
        g.uchain = null;
        /* C: allmain.c newgame — svc.context.next_attrib_check = 600L */
        g.context = { move: 0, next_attrib_check: 600 };
        g.program_state = {};
        g.moves = 1;

        // Fixed play clock (moon, shop lines, Friday 13th, …) — C uses NETHACK_FIXED_DATETIME
        g.fixed_datetime = this._datetime || null;

        // Initialize PRNG (C: before role_init / plnamesuffix random tokens; coerceChargenIdentity may call rn2)
        initRng(this._seed);
        enableRngLog();

        // Install display
        if (this._pendingDisplay) {
            g.nhDisplay = this._pendingDisplay;
            this._pendingDisplay = null;
        }

        // Install capture hook
        this._installCaptureHook();

        /* C: u_init / role.c — identity from OPTIONS when role is fixed in rc (after PRNG for plnamesuffix / rand*). */
        if (!fullInteractiveChargen && !asknameOnly) applyIdentityFromNethackrc(g, opts);

        if (fullInteractiveChargen) {
            const disp = g.nhDisplay;
            if (!disp) throw new Error('Interactive chargen requires nhDisplay');
            await runInteractiveTtyChargen(disp, g, opts);
        } else if (asknameOnly) {
            const disp = g.nhDisplay;
            if (!disp) throw new Error('askname requires nhDisplay');
            await ttyAsknameLikeC(disp, g);
            opts.name = g.plname;
            opts.explicitNameInRc = true;
            applyIdentityFromNethackrc(g, opts);
        }

        // Run game startup (C: newgame())
        await newgame();
    }

    /**
     * One judge-facing snapshot: RNG slice since last snapshot, terminal
     * serialize, cursor, animation-frame bucket. Called before each nhgetch
     * and once at segment end (replay) so the last screen matches sessions
     * that record a final frame after the last key.
     * @param {{ bumpNhgetchCounter?: boolean }} [opts]
     */
    async captureJudgeSnapshot(opts = {}) {
        const bump = opts.bumpNhgetchCounter !== false;
        if (bump) this._nhgetchCount++;

        const fullLog = getRngLog() || [];
        const slice = fullLog.slice(this._lastRngIdx);
        this._lastRngIdx = fullLog.length;

        /* C: tty refresh before input boundaries; also when find_ac flagged botl but moveloop not started. */
        const needFlush =
            game.program_state?.in_moveloop
            || (game.disp?.botl && game._cachedBotlLine2 != null);
        if (needFlush) await flush_screen(1);

        const disp = game?.nhDisplay;
        const term = disp?.terminal || disp;
        this._screens.push(term?.serialize ? term.serialize() : '');
        this._rngSlices.push(slice);

        const cursor = disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null;
        this._cursors.push(cursor);

        this._animFramesByStep.push(this._pendingAnimFrames);
        this._pendingAnimFrames = [];
    }

    _installCaptureHook() {
        const nhGame = this;
        game._preNhgetchHook = async () => {
            await nhGame.captureJudgeSnapshot();
        };
        /** C: **`display.c`** **`nh_delay_output`** — contest hook for beam / throw animation frames. */
        game.animationFrame = async () => {
            await nhGame.animationFrame();
        };
    }

    getScreens() { return this._screens; }
    getCursors() { return this._cursors; }
    getRngLog() { return getRngLog(); }
    // Per-step PRNG slices, parallel to getScreens(). Each entry is the
    // log of PRNG calls that fired since the previous capture (i.e.
    // since the previous nhgetch). Useful for tooling like the PS
    // visualizer that wants to attribute calls to individual keystrokes;
    // the judge ignores this and uses getRngLog() flat.
    getRngSlices() { return this._rngSlices; }
    // Per-step animation frames, parallel to getScreens().  Each entry
    // is the array of frames captured (via animationFrame()) between
    // the previous input boundary and this one — i.e. the intermediate
    // display states for that step's animation.  Empty inner arrays
    // for steps that didn't animate.  SUPPLEMENTAL metric — not part
    // of the official ranking; see API.md.
    getAnimationFramesByStep() { return this._animFramesByStep; }
}

// ── Per-segment runner — the contest contract ──
//
// The judge calls this once per segment. Input is a clean replay
// descriptor with up to five fields (NO recorded answers):
//
//   { seed: number,        // PRNG seed
//     datetime: string,    // fixed datetime "YYYYMMDDHHMMSS"
//     nethackrc: string,   // game-options rc text
//     moves: string,       // raw key sequence to replay from launch
//     storage: object }    // Web-Storage-shaped (getItem/setItem/...)
//                          //   handle for cross-segment persistence —
//                          //   shared across all segments of a
//                          //   session. The browser passes a
//                          //   localStorage-backed view so save files
//                          //   survive page reload too.
//
// Each call returns a self-contained game whose getScreens() /
// getRngLog() / getCursors() / getAnimationFramesByStep() cover ONLY
// this segment. The harness concatenates them itself. Cross-segment
// C-side state (bones, record file, save) lives in `input.storage`.
export async function runSegment(input) {
    const { seed, nethackrc, storage } = input;
    const datetime = input.datetime ?? null;
    const moves = input.moves || '';

    const nhGame = new NethackGame({ seed, datetime, nethackrc, storage });

    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;

    initReplayMoves(moves);
    for (const ch of moves) pushKey(ch.charCodeAt(0));

    await nhGame.start();

    // C: allmain.c moveloop() — moveloop_preamble() before first moveloop_core()
    await moveloopPreamble(false);
    // C: allmain.c moveloop() — maybe_do_tutorial() when !resuming (after preamble, before core loop)
    await maybeDoTutorialLikeC();

    // Drive the game loop until input is exhausted. The judge looks
    // at game.getScreens() afterwards; whatever the contestant
    // captured is what gets compared.
    const maxIter = Math.max(moves.length * 8, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        if (!hasQueuedInput()) break;
        try {
            await moveloop_core();
        } catch (e) {
            if (String(e?.message || '').includes('Input queue empty')) break;
            throw e;
        }
    }

    /* C: one more moveloop_core time slice after the last queued key (no rhack). */
    if (game.context?.move) {
        await runPostCommandTurnAdvanceLikeC(game);
    }

    // Sessions record one more screen than nhgetch calls: the terminal
    // state after the last key is processed (next boundary would be the
    // following nhgetch, which never happens when the replay queue ends).
    await flush_screen(1);
    await nhGame.captureJudgeSnapshot({ bumpNhgetchCounter: false });

    return nhGame;
}

