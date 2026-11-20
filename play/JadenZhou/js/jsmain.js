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
import { pushKey, nhgetch } from './input.js';
import { early_init, newgame, moveloop_preamble, moveloop_core } from './allmain.js';
import { parseNethackrc, set_playmode } from './options.js';
import { wd_message } from './sys.js';
import { plnamesuffix } from './role.js';
import { tty_init_nhwindows, tty_player_selection } from './wintty.js';
import { flush_screen } from './display.js';
import { GameDisplay } from './game_display.js';
import { fruitadd } from './objnam.js';
import { objects, OBJ_NAME, SLIME_MOLD } from './objects.js';

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

        // C ref: unixmain.c main() calls early_init() first
        early_init();

        // Parse nethackrc (sets flags.initrole, initrace, initgend,
        // initalign and female as options.c does)
        const opts = parseNethackrc(this._nethackrc);
        /* whoami(): the JS port has no login name to fall back on, so a
           game without OPTIONS=name asks "Who are you?" */
        g.plname = opts.name || '';
        /* boolean options that default to on (optlist.h) */
        g.flags = { verbose: true, legacy: true, acoustics: true, ...opts.flags };
        g.iflags = { ...opts.iflags };
        g.pl_character = opts.pl_character || '';
        /* the fixed clock calendar.c getlt() reads */
        g.datetime = this._datetime;
        /* symset option (options.c optfn_symset); the default is the
           plain ASCII symbol set */
        g.symset_name = opts.symset || null;
        g.pl_race = opts.pl_race || '';
        if (opts.preferred_pet) g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set) g.tutorial_set_in_config = true;

        // Initialize hero struct (zeroed again by u_init_misc())
        g.u = { ux: 0, uy: 0, ux0: 0, uy0: 0, uroleplay: {} };
        g.context = { move: 0 };
        g.program_state = {};
        /* C ref: options.c initoptions_init() -- default fruit name;
           initoptions_finish() -- fruitadd(pl_fruit) */
        /* since this is done before init_objects(), do partial init here */
        objects[SLIME_MOLD].oc_name_idx = SLIME_MOLD;
        g.pl_fruit = OBJ_NAME(objects[SLIME_MOLD]);
        g.ffruit = null;
        fruitadd(g.pl_fruit, null);
        g.moves = 0; /* C: svm.moves stays 0 until u_init_role() sets it to 1 */

        // Initialize PRNG
        initRng(this._seed);
        enableRngLog();

        // Install display
        if (this._pendingDisplay) {
            g.nhDisplay = this._pendingDisplay;
            this._pendingDisplay = null;
        }

        // Install capture hook
        this._installCaptureHook();

        /* now we can set up window system */
        tty_init_nhwindows();

        /* wizard mode access is deferred until here */
        set_playmode(); /* sets plname to "wizard" for wizard mode */
        /* hide any hyphens from plnamesuffix() */
        g.plnamelen = 0; /* exact_username: plname didn't come from whoami() */
        /* strip role,race,&c suffix; calls askname() if plname[] is empty
           or holds a generic user name like "player" or "games" */
        await plnamesuffix();

        /* new game:  start by choosing role, race, etc */
        await tty_player_selection();

        // Run game startup
        await newgame();
        await wd_message();
        /* C ref: unixmain.c main() -> moveloop(0) -> moveloop_preamble();
           the caller drives moveloop_core() itself */
        await moveloop_preamble(false);
        /* maybe_do_tutorial(): not ported yet */
    }

    _installCaptureHook() {
        const nhGame = this;
        game._preNhgetchHook = async () => {
            const keyIdx = nhGame._nhgetchCount++;

            // Capture RNG slice since last capture
            const fullLog = getRngLog() || [];
            const slice = fullLog.slice(nhGame._lastRngIdx);
            nhGame._lastRngIdx = fullLog.length;

            // Capture screen from the terminal grid. The fixture for
            // screen scoring is the Terminal: contestants drive it
            // however they like, judge reads back terminal.serialize()
            // and compares to the C session's recorded screen.
            const disp = game?.nhDisplay;
            const term = disp?.terminal || disp;
            nhGame._screens.push(term?.serialize ? term.serialize() : '');
            nhGame._rngSlices.push(slice);

            const cursor = disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null;
            nhGame._cursors.push(cursor);

            // Commit animation frames accumulated since the previous
            // input boundary as belonging to this step.  Frames are
            // captured by animationFrame() into _pendingAnimFrames; we
            // snapshot and reset here so the next step starts empty.
            nhGame._animFramesByStep.push(nhGame._pendingAnimFrames);
            nhGame._pendingAnimFrames = [];
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
    const { seed, nethackrc, storage, datetime } = input;
    const moves = input.moves || '';

    const nhGame = new NethackGame({ seed, datetime, nethackrc, storage });

    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;

    for (const ch of moves) display.pushKey(ch.charCodeAt(0));

    // Any error stops the game where it is, keeping the screens and rolls
    // produced so far: unported C ("not ported yet"), or a panic reached
    // because state already diverged from C. Stopping can only truncate
    // output; it never invents or skips rolls, so it cannot create matches.
    // Without this, one late crash would discard a whole session's screens.
    const stop = (e) => {
        const msg = String(e?.message || e);
        if (msg.includes('Input queue empty')) return;
        if (msg.includes('not ported yet')) nhGame.notPortedError = e;
        nhGame.stopError = e;
    };

    try {
        await nhGame.start();
    } catch (e) {
        stop(e);
        return nhGame;
    }

    // Drive the game loop until input is exhausted. The judge looks
    // at game.getScreens() afterwards; whatever the contestant
    // captured is what gets compared.
    const maxIter = Math.max(moves.length * 8, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        try {
            await moveloop_core();
        } catch (e) {
            stop(e);
            break;
        }
    }

    return nhGame;
}

