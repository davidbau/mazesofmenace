// jsmain.js — Game engine: NethackGame class + per-segment runner.
// C ref: unixmain.c — nethack_main() initialization and game setup.
//
// Contest contract: the judge orchestrates sessions (load JSON,
// normalize v4/v5, loop segments, aggregate scores). It calls
// runSegment(input) for each game segment and reads back
// game.getScreens() / getRngLog() / getCursors() to compare with
// C-recorded session data. Cross-segment state flows only through
// input.storage; prior game objects are not passed back.
//
// For browser play, see nethack.js (uses NethackGame directly).

import { game, resetGame } from './gstate.js';
import { decl_globals_init } from './decl.js';
import { sys_early_init } from './sys.js';
import { initRng, enableRngLog, getRngLog } from './rng.js';
import { setStorageForTesting, vfsReadFile, vfsWriteFile } from './storage.js';
import { SYSCONF_TEXT } from './generated/sysconf_data.js';
import { pushKey, nhgetch } from './input.js';
import { newgame, moveloop_core, welcome, moveloop_preamble, init_sound_disp_gamewindows } from './allmain.js';
import { getmailstatus } from './mail.js';
import { try_restore_save } from './save.js';
import { vision_init, vision_recalc, init_vision_globals } from './vision.js';
import { parseNethackrc, set_playmode, init_fruit_chain, initoptions_init, RC_FILE_OPT, set_configfile_name } from './options.js';
import { flush_screen, serialize_for_scoring, reset_display_messages, docrt, bot } from './display.js';
import { GameDisplay } from './game_display.js';
import { askname_if_needed } from './askname.js';
import { player_selection } from './player_selection.js';
import { check_special_room } from './hack.js';

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
            cursor: term?.getCursor
                ? term.getCursor()
                : (disp
                    ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0,
                        disp.cursorVisible ?? 1]
                    : null),
        });
        if (typeof requestAnimationFrame === 'function') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        } else {
            await null;
        }
    }

    async start() {
        const g = resetGame();
        decl_globals_init(); // C allmain.c:41 early_init → decl_globals_init (decl.c:1080–1187)
        sys_early_init(); // C allmain.c:43 early_init → sys_early_init (sys.c:20–112)
        reset_display_messages();
        // Frozen VFS contract: the harness shares this handle across segments.
        setStorageForTesting(this._storage);
        // C unixmain.c:150 → options.c initoptions_init: builtin defaults
        // precede system OPTIONS, which precede the user rc. The installed
        // sysconf is embedded for Rule #2 and provisioned only when absent.
        if (vfsReadFile('sysconf') == null) vfsWriteFile('sysconf', SYSCONF_TEXT);
        // The session API supplies the seed for both C init_random streams.
        initRng(this._seed);
        enableRngLog();
        initoptions_init();
        // C nh_terminate is noreturn; its ESM adapter records exit state.
        if (g.program_state?.gameover) return;
        // C initoptions_finish → rcfile changes phase and config filename.
        set_configfile_name(null);
        g.go.opt_phase = RC_FILE_OPT;
        // Stored now for future C time predicates; consumers remain incomplete.
        g.datetime = this._datetime;

        // Overlay the user rc on the initialized live option bags. No
        // defaults may be reapplied after the system configuration pass.
        const opts = parseNethackrc(this._nethackrc, true);
        g.plname = opts.name;
        // C ref: options.c / symbols.c — default Primary ASCII; symset:DECgraphics
        // (or boolean DECgraphics) loads H_DEC showsyms. Never assume DEC.
        const sym = String(opts.symset || g.symset || '').toLowerCase();
        if (sym || opts.flags?.DECgraphics != null || opts.flags?.decgraphics != null) {
            g.iflags.decgraphics = sym === 'decgraphics'
                || opts.flags?.DECgraphics === true
                || opts.flags?.decgraphics === true;
        }
        // C: gs.symset[PRIMARYSET].name for doset_simple get_val
        if (opts.symset) g.symset = String(opts.symset);
        else if (g.iflags.decgraphics) g.symset = 'DECgraphics';
        if (opts.preferred_pet) g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set) g.tutorial_set_in_config = true;
        g._parsed_rc = opts;
        // C: cfgfiles BINDINGS → parsebindings → cmdbind_add overlays defaults
        if (!g.Cmd) g.Cmd = {};
        g.Cmd.binds = opts.binds instanceof Map ? opts.binds : new Map();
        if (opts.gender === 'female' || opts.gender === 'f') g.flags.female = true;
        else if (opts.gender === 'male' || opts.gender === 'm') g.flags.female = false;

        // Initialize hero struct
        g.u = {
            ux: 0, uy: 0, ux0: 0, uy0: 0,
            // C you.h room occupancy (hack.c move_update)
            urooms: '', urooms0: '', uentered: '',
            ushops: '', ushops0: '', ushops_entered: '', ushops_left: '',
            uinvault: 0,
        };
        g.context = { move: 0 };
        // C initoptions_finish fruitadd(pl_fruit) before newgame / mksobj
        // so SLIME_MOLD spe hits fruit_from_indx (D-1511).
        init_fruit_chain();
        g.go.opt_initial = false; // C initoptions_finish :7382
        // C: moves starts 0; u_init_role sets 1 after mklev (see u_init.c)
        g.moves = 0;

        // Role/race filled by setup_role_race_from_rc in newgame
        g.urole = { name: { m: 'Tourist', f: 'Tourist' } };
        g.urace = { adj: 'human' };

        // Install display
        if (this._pendingDisplay) {
            g.nhDisplay = this._pendingDisplay;
            this._pendingDisplay = null;
        }
        // C wintty.c tty_display_nhwindow NHW_MESSAGE `:1882–1883`
        // iflags.window_inited (yn_menuable_resp needs it; D-1728).
        if (!g.iflags) g.iflags = {};
        g.iflags.window_inited = !!g.nhDisplay;
        // C nh_delay_output → contest animationFrame (throw/zap beams)
        g.animationFrame = this.animationFrame.bind(this);

        // Install capture hook
        this._installCaptureHook();

        // C unixmain.c:188–190 — #ifdef MAIL getmailstatus() after
        // init_nhwindows, before set_playmode. libnhmain.c:220 is the
        // library entry, not this unix tty build.
        getmailstatus();

        // C ref: unixmain set_playmode before plnamesuffix — wizard mode
        // overwrites OPTIONS=name with "wizard" (options.c set_playmode).
        set_playmode();

        // C ref: unixmain → plnamesuffix → askname when no -u / OPTIONS=name
        await askname_if_needed();
        if (!g.plname) g.plname = 'Hero';

        // C ref: unixmain.c:215 — initialize before mklev or level restore.
        vision_init();

        // C ref: unixmain.c:217 init_sound_disp_gamewindows() after
        // vision_init, before attempt_restore (allmain.c:699–763).
        init_sound_disp_gamewindows();

        // C ref: unixmain attempt_restore — try save before player_selection/newgame
        if (await try_restore_save()) {
            init_vision_globals();
            // C unixmain dorecover success: no second l_nhcore_init.
            // restore_luadata already inited luacore if it was NULL
            // (nhlua.c `:1357–1358`) then loadstring'd nh_lua_variables.
            vision_recalc(0);
            await docrt();
            await bot();
            await welcome(false);
            await check_special_room(false);
            await moveloop_preamble(true);
            return;
        }

        // C ref: unixmain → player_selection() before newgame
        await player_selection();

        // Run game startup
        await newgame();
    }

    _installCaptureHook() {
        const nhGame = this;
        const captureBoundary = () => {
            const keyIdx = nhGame._nhgetchCount++;
            void keyIdx;

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
            // Count / --More-- prompts: keep cursor on topline even if a
            // later flush reset it to the hero (C get_count / more()).
            if (disp?.grid && disp.setCursor) {
                let row0 = '';
                for (let c = 0; c < (disp.cols || 80); c++)
                    row0 += disp.grid[0][c]?.ch || ' ';
                const t = row0.trimEnd();
                if (t.startsWith('Count:') || t.endsWith('--More--'))
                    disp.setCursor(t.length, 0);
            }
            nhGame._screens.push(
                term?.grid
                    ? serialize_for_scoring(term)
                    : (term?.serialize ? term.serialize() : ''),
            );
            nhGame._rngSlices.push(slice);

            const cursor = term?.getCursor
                ? term.getCursor()
                : (disp
                    ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0,
                        disp.cursorVisible ?? 1]
                    : null);
            nhGame._cursors.push(cursor);

            // Commit animation frames accumulated since the previous
            // input boundary as belonging to this step.  Frames are
            // captured by animationFrame() into _pendingAnimFrames; we
            // snapshot and reset here so the next step starts empty.
            nhGame._animFramesByStep.push(nhGame._pendingAnimFrames);
            nhGame._pendingAnimFrames = [];
        };
        // C nhgetch capture; also nh_terminate post-topten (no key wait)
        game._captureInputBoundary = captureBoundary;
        game._preNhgetchHook = async () => {
            captureBoundary();
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
    const {
        seed, datetime, nethackrc, storage,
    } = input;
    const moves = input.moves || '';

    const nhGame = new NethackGame({
        seed, datetime, nethackrc, storage,
    });

    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;

    // C ref: scripts/record-session.mjs — tmux pty ICRNL maps CR→LF before
    // NetHack reads the byte. Pipe/JS input has no line discipline, so
    // replicate here. LF is C('j') = rush-south under !number_pad.
    for (const ch of moves) {
        const code = ch === '\r' ? 10 : ch.charCodeAt(0);
        display.pushKey(code);
    }

    await nhGame.start();

    // Drive the game loop until input is exhausted. The judge looks
    // at game.getScreens() afterwards; whatever the contestant
    // captured is what gets compared.
    const maxIter = Math.max(moves.length * 8, 1024);
    for (let iter = 0; iter < maxIter && !game.program_state?.gameover; iter++) {
        try {
            await moveloop_core();
        } catch (e) {
            if (String(e?.message || '').includes('Input queue empty')) break;
            throw e;
        }
        // C really_done is noreturn — stop driving gameplay after death
        if (game.program_state?.gameover) break;
    }

    return nhGame;
}
