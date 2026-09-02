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
import { newgame, newgame_moveloop_preamble, moveloop_core,
         maybe_do_tutorial } from './allmain.js';
import { wd_message } from './unixmain.js';
import { parseNethackrc, optValue, set_fruit_name } from './options.js';
import { assign_graphics } from './symbols.js';
import { flush_screen } from './display.js';
import { GameDisplay } from './game_display.js';
import { reset_windows } from './tty/wintty.js';
import { init_rect_globals } from './rect.js';
import { reset_role_globals } from './role.js';

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

        /* Give gameplay modules the universal nh_delay_output hook described
           above. This replay wrapper owns the per-step frame buffers. */
        g.animationFrame = this.animationFrame.bind(this);

        /* Module-scoped state that C keeps in globals and re-initialises per
           process. The judge runs every session in one process, so anything
           left behind leaks into the next game. */
        reset_windows();
        init_rect_globals();
        reset_role_globals();

        // Parse nethackrc. `rc.opts` is keyed by canonical option name, as
        // resolved against the generated table in js/optlist.js.
        // src/calendar.c getnow() reads this instead of the host clock, the
        // way patch 001 makes the recorder read NETHACK_FIXED_DATETIME.
        // Nothing in js/ may call Date.now(): output must not depend on when
        // it ran.
        g.fixed_datetime = this._datetime;

        const rc = parseNethackrc(this._nethackrc);
        g.rc = rc;
        /* src/options.c:7596 parsebindings() — BIND=key:command lines rebind
           a command key. txt2key handles the '^X' control form; the map is
           consulted by rhack() before its default dispatch. */
        g.rc_key_bindings = {};
        for (const b of rc.bindings) {
            for (const one of b.split(',')) {
                const ci = one.indexOf(':');
                if (ci < 0) continue;
                const keytxt = one.slice(0, ci).trim();
                const cmdname = one.slice(ci + 1).trim();
                const key = (keytxt.length === 2 && keytxt[0] === '^')
                    ? String.fromCharCode(keytxt.charCodeAt(1) & 0x1f)
                    : (keytxt.length === 1 ? keytxt : null);
                if (key !== null)
                    g.rc_key_bindings[key] = cmdname;
            }
        }
        /* src/symbols.c init_symbols() then assign_graphics(PRIMARYSET).
           Without OPTIONS=symset:<name> the built-in ASCII defaults stand;
           DECgraphics is the only alternate set any recorded configuration
           asks for. */
        assign_graphics(/^DECgraphics$/i.test(optValue(rc, 'symset') || ''));
        /* Leave plname EMPTY when the rc does not set it: src/allmain.c calls
           askname() in that case, and the session's keystrokes supply the name.
           Defaulting it here made player_selection() skip askname and read the
           name's letters as answers to the "[ynaq]" prompt instead. */
        g.plname = optValue(rc, 'name') || '';
        /* src/options.c — OPTIONS=playmode:debug turns on wizard mode, and
           set_playmode() below renames the hero to "wizard". */
        const playmode = optValue(rc, 'playmode');
        g.wizard = (playmode === 'debug');
        g.discover = (playmode === 'explore');
        /* src/optlist.h — both are opt_out with initval On, so they are set
           unless the rc negates them. implicit_uncursed decides whether
           doname() prints "uncursed" on a charged, identified item. */
        /* pickup_thrown is opt_out initval On (optlist.h:579), like the
           other two defaults */
        g.flags = { verbose: true, implicit_uncursed: true, legacy: true,
                    pickup_thrown: true,
                    ...rc.opts };
        g.iflags = {};
        const pettype = optValue(rc, 'pettype');
        if (pettype) g.preferred_pet = pettype[0];
        if ('tutorial' in rc.opts) g.tutorial_set_in_config = true;

        // Initialize hero struct
        /* include/you.h u.uroleplay. These startup-only options alter the
           inventory generator itself, so they must exist before u_init()
           rather than being copied after character creation. Pauper implies
           nudist in options.c. */
        g.u = {
            ux: 0, uy: 0, ux0: 0, uy0: 0,
            uroleplay: {
                pauper: !!g.flags.pauper,
                nudist: !!g.flags.nudist || !!g.flags.pauper,
            },
        };
        g.context = { move: 0 };
        set_fruit_name(optValue(rc, 'fruit') || 'slime mold', true);
        g.program_state = {};
        /* src/decl.c — svm.moves starts at 0 and moveloop() advances it. Several
           things in u_init read `moves == 0` to mean "this is character
           creation"; newhp()'s alignment-record assignment is one. It was
           hardcoded to 1 here, so that branch could never run. */
        g.moves = 0;
        /* decl.c g_init_h: moves becomes 1 during role initialization, and
           hero_seq starts at moves * 8. It advances only when time passes. */
        g.hero_seq = 8;

        /* Placeholders until allmain.c's u_init_misc() installs the real
           records. Nothing should read these — allmain.js:109 overwrites both
           from roles[]/races[] before any draw depends on them. */
        g.urole = { name: { m: 'Rambler', f: 'Rambler' } };
        g.urace = { adj: 'human' };

        // Initialize PRNG
        initRng(this._seed);
        enableRngLog();

        // Install display; keep a handle so an in-segment restart can
        // rewire the same display into the fresh game object.
        if (this._pendingDisplay) {
            this._display = this._pendingDisplay;
            this._pendingDisplay = null;
        }
        if (this._display)
            g.nhDisplay = this._display;

        /* cross-segment persistence: bones, save files, the record file.
           Web-Storage-shaped (getItem/setItem/removeItem). */
        g.storage = this._storage;

        // Install capture hook
        this._installCaptureHook();

        // Run game startup
        const resuming = await newgame();

        /* sys/unix/unixmain.c:317 — "newgame(); wd_message();": the play-mode
           notice lands between welcome() and the tutorial query. */
        await wd_message();

        /* src/allmain.c moveloop() enters its preamble after unixmain's
           wd_message(). Initial pickup and its engraving feedback therefore
           follow the explore-mode notice as well as welcome(). */
        await newgame_moveloop_preamble(resuming);
        /* moveloop_preamble() sets this before the first command. Attribute
           changes use it to announce load changes. */
        g.program_state.in_moveloop = true;

        /* src/allmain.c moveloop() — the tutorial query sits between
           moveloop_preamble() and the first moveloop_core(). This driver calls
           moveloop_core() directly rather than moveloop(), so the query has to
           be invoked here or it never runs. */
        if (!resuming)
            await maybe_do_tutorial();
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

            /* Debug-only probe seam (never set during scoring): snapshot
               the live game at an exact input boundary on a FULL replay,
               avoiding the step-vs-char truncation trap documented in
               STATUS. */
            if (globalThis.__step_snapshot
                && (nhGame._screens.length - 1 === globalThis.__step_snapshot.step
                    || globalThis.__step_snapshot.step === '*'))
                globalThis.__step_snapshot.cb(game, nhGame._screens.length - 1);

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
    const { seed, datetime, nethackrc, storage } = input;
    const moves = input.moves || '';

    // datetime must be threaded through: src/calendar.c reads it for moon
    // phase, Friday-the-13th luck, night/midnight and shopkeeper greetings,
    // and js/calendar.js throws rather than silently falling back to the host
    // clock if it is missing.
    const nhGame = new NethackGame({ seed, datetime, nethackrc, storage });

    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;

    for (const ch of moves) display.pushKey(ch.charCodeAt(0));

    /* A recording can end while the C game is still inside a startup
       prompt (the legacy text, chargen, the name). Running out of keys
       there is the same clean end as running out inside the move loop;
       letting it throw here discarded every screen the segment recorded. */
    try {
        await nhGame.start();
    } catch (e) {
        if (!String(e?.message || '').includes('Input queue empty'))
            throw e;
        return nhGame;
    }

    // Drive the game loop until input is exhausted. The judge looks
    // at game.getScreens() afterwards; whatever the contestant
    // captured is what gets compared.
    const repeatCounts = [...moves.matchAll(/\d+/g)]
        .map((match) => Number.parseInt(match[0], 10))
        .filter(Number.isFinite);
    const maxRepeat = repeatCounts.length ? Math.max(...repeatCounts) : 0;
    const maxIter = Math.max(moves.length * 8, maxRepeat + 1024, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        try {
            await moveloop_core();
        } catch (e) {
            if (e && e.__nh_gameover) continue; /* nh_terminate unwind */
            if (String(e?.message || '').includes('Input queue empty')) break;
            throw e;
        }
    }

    return nhGame;
}
