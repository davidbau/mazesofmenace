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
import { early_init, newgame, moveloop_preamble, moveloop_core, maybe_do_tutorial } from './allmain.js';
import { optfn_boulder_set, optfn_fruit_initial } from './options.js';
import { parseNethackrc, set_playmode, parsebindings,
         initoptions_init_defaults, fruitadd } from './options.js';
import { reset_commands, update_rest_on_space } from './cmd.js';
import { wd_message } from './sys.js';
import { plnamesuffix } from './role.js';
import { tty_init_nhwindows, tty_player_selection, tty_yn_function } from './wintty.js';
import { flush_screen, pline } from './display.js';
import { init_vision_globals } from './vision.js';
import { getlock, restore_saved_game, delete_savefile } from './files.js';
import { dorecover } from './restore.js';
import { GameDisplay } from './game_display.js';
import { InMemoryStorage } from './storage.js';
import { objects, OBJ_NAME, SLIME_MOLD } from './objects.js';
import { LAST_PROP, PRIMARYSET } from './const.js';
import { init_ov_primary_symbols, parsesymbols } from './symbols.js';

// ── NethackGame ──
// Wraps a single game session with replay infrastructure.
// The screen a step is scored on, in the reference recordings' encoding.
// The C recorder (run_session.py compress_ansi_line) writes every run of 5
// or more spaces in a row's ANSI text as a cursor-forward (ESC[nC), so such a
// run carries no attribute when decoded, even inside inverse video (e.g. the
// blanks in a menu heading).  frozen/terminal.js serialize() only does that
// for leading blanks, so clear the attribute of those runs while
// serializing; the live grid is restored, so the display is unchanged.
function captureScreen(term) {
    if (!term?.serialize) return '';
    const grid = term.grid;
    if (!grid) return term.serialize();
    const saved = [];
    for (const row of grid) {
        /* serialize() emits a row from its first non-blank (or inverse/
           underlined blank) cell through its last non-blank cell */
        const first = row.findIndex(c => c.ch !== ' ' || (c.attr & 5));
        if (first < 0) continue;
        let last = row.length - 1;
        while (last >= 0 && row[last].ch === ' ') last--;
        for (let c = first; c <= last; ) {
            const cell = row[c];
            if (cell.ch !== ' ') { c++; continue; }
            /* a run of spaces with no SGR change inside it */
            let e = c + 1;
            while (e <= last && row[e].ch === ' ' && row[e].attr === cell.attr
                   && row[e].color === cell.color)
                e++;
            if (e - c >= 5 && cell.attr) {
                for (let k = c; k < e; k++) {
                    saved.push([row[k], row[k].attr]);
                    row[k].attr = 0;
                }
            }
            c = e;
        }
    }
    const out = term.serialize();
    for (const [cell, attr] of saved)
        cell.attr = attr;
    return out;
}

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
        //
        // With no handle outside a browser (the judge's playability check
        // constructs the game this way in Node), the game's files are kept
        // in a fresh in-memory store, as the browser keeps them in
        // localStorage, so a save still has somewhere to go.
        this._storage = opts.storage
            || (typeof window === 'undefined' ? new InMemoryStorage() : null);
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
            screen: captureScreen(term),
            cursor: disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null,
        });
        if (typeof requestAnimationFrame === 'function') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        } else {
            await null;
        }
    }

    // nh_terminate() during start-up (e.g. quitting at a prompt) ends the
    // game the way moveloop_core() does: program_state.gameover is set and
    // the caller's loop stops.
    async start() {
        try {
            await this._start();
        } catch (e) {
            if (!e?.nhexit)
                throw e;
            game.program_state.gameover = 1;
        }
    }

    async _start() {
        const g = resetGame();

        // C ref: unixmain.c main() calls early_init() first
        early_init();
        /* the playground: save files (and the bones and record files) are
           kept in the storage the judge shares between a session's
           segments (storage.js reads game.mockStorage) */
        if (this._storage)
            g.mockStorage = this._storage;

        // Parse nethackrc (sets flags.initrole, initrace, initgend,
        // initalign and female as options.c does)
        const opts = parseNethackrc(this._nethackrc);
        /* whoami(): the JS port has no login name to fall back on, so a
           game without OPTIONS=name asks "Who are you?" */
        g.plname = opts.name || '';
        /* C ref: options.c initoptions_init() -- every boolean option's
           default (optlist.h) and the other option defaults, then what
           the config file set */
        const dflt = initoptions_init_defaults();
        g.flags = { ...dflt.flags, verbose: true, legacy: true, acoustics: true,
                    tutorial: true, safe_dog: true, autoopen: true,
                    pickup_thrown: true, ...opts.flags };
        g.iflags = { ...dflt.iflags, ...opts.iflags };
        g.a11y = { ...dflt.a11y, ...opts.a11y };
        /* petname_optfn(): gc.catname, gd.dogname, gh.horsename */
        if (opts.horsename !== undefined) g.horsename = opts.horsename;
        if (opts.catname !== undefined) g.catname = opts.catname;
        if (opts.dogname !== undefined) g.dogname = opts.dogname;
        g.pl_character = opts.pl_character || '';
        /* the fixed clock calendar.c getlt() reads */
        g.datetime = this._datetime;
        /* symset option (options.c optfn_symset); the default is the
           plain ASCII symbol set */
        g.symset_name = opts.symset || null;
        g.pl_race = opts.pl_race || '';
        if (opts.preferred_pet) g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set) g.tutorial_set_in_config = true;
        /* opt_set_in_config[]: for duplicate_opt_detection() */
        g.opt_set_in_config_names = opts.set_in_config || [];
        /* C ref: options.c initoptions_init() -- set up the command
           parsing; then the config file's BIND= lines (parsebindings()) */
        reset_commands(true); /* init */
        for (const b of opts.bindings || []) {
            if (typeof b === 'string') {
                parsebindings(b);
            } else { /* optfn_number_pad(): reset_commands(FALSE) */
                g.iflags.num_pad = b.num_pad;
                g.iflags.num_pad_mode = b.num_pad_mode;
                reset_commands(false);
            }
        }
        /* C ref: options.c initoptions_init() -- init_ov_primary_symbols(),
           then the config file's SYMBOLS= lines: cfgfiles.c
           cnf_line_SYMBOLS() -- parsesymbols(bufp, PRIMARYSET), then
           switch_symbols(TRUE) (display.js reads the overrides when it
           shows a glyph) */
        init_ov_primary_symbols();
        for (const s of opts.symbols || []) {
            if (typeof s === 'object') { /* OPTIONS=boulder:c */
                optfn_boulder_set(s.boulder);
                continue;
            }
            if (!parsesymbols(s, PRIMARYSET))
                throw new Error("cnf_line_SYMBOLS(): config_error_add(\"Error in SYMBOLS definition '%s'\") not ported yet");
        }
        /* C ref: options.c initoptions_finish() -- update_rest_on_space()
           after the key bindings */
        update_rest_on_space();
        /* C ref: files.c configfile -- the unix default ".nethackrc"
           in the home directory */
        g.configfile = '.nethackrc';

        // Initialize hero struct (zeroed again by u_init_misc()); C's u is a
        // zeroed static, so the property table reads as all zero until then
        g.u = { ux: 0, uy: 0, ux0: 0, uy0: 0, uz: { dnum: 0, dlevel: 0 },
                uprops: Array.from({ length: LAST_PROP + 1 },
                                   () => ({ extrinsic: 0, intrinsic: 0, blocked: 0 })),
                uroleplay: { ...dflt.uroleplay, ...opts.uroleplay } };
        g.context = { move: 0 };
        /* C ref: decl.c -- hero_seq starts at 1L << 3 (moves*8 + n, moves 1) */
        g.hero_seq = 1 << 3;
        g.program_state = {};
        /* C ref: options.c initoptions_init() -- default fruit name;
           initoptions_finish() -- fruitadd(pl_fruit) */
        /* since this is done before init_objects(), do partial init here */
        objects[SLIME_MOLD].oc_name_idx = SLIME_MOLD;
        g.pl_fruit = OBJ_NAME(objects[SLIME_MOLD]);
        g.ffruit = null;
        /* the config file's fruit option (optfn_fruit() with opt_initial) */
        if (opts.fruit)
            optfn_fruit_initial(opts.fruit.negated, opts.fruit.opts);
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

        /*
         * Initialize the vision system.  This must be before mklev() on a
         * new game or before a level restore on a saved game.
         */
        init_vision_globals();

        /*
         * First, try to find and restore a save file for specified character.
         */
        let resuming = false; /* assume new game */
        /* attempt_restore: */
        if (g.plname)
            getlock();
        let nhfp;
        if (g.plname && (nhfp = restore_saved_game()) !== null) {
            /* chmod(fq_save, 0): disallow parallel restores -- n/a */
            /* if there are early trouble-messages issued, let's
             * not go overtop of them with a pline just yet
             * (ge.early_raw_messages: none in the JS port) */
            await pline("Restoring save file...");
            /* mark_synch(): flush output */
            if (await dorecover(nhfp)) {
                resuming = true; /* not starting new game */
                await wd_message();
                if (g.flags.explore || g.flags.debug) {
                    /* this seems like a candidate for paranoid_confirmation... */
                    if ((await tty_yn_function("Do you want to keep the save file?", "yn", 'n')) === 'n')
                        delete_savefile();
                    /* else chmod(fq_save, FCMASK); nh_compress(fq_save) */
                }
            }
        }

        if (!resuming) {
            /* new game:  start by choosing role, race, etc */
            await tty_player_selection();
            /* a hero named only now (askname()) gets the save file lookup
               above in C (goto attempt_restore); not modelled yet */

            // Run game startup
            /* no save file; start a new game */
            await newgame();
            await wd_message();
        }
        /* C ref: unixmain.c main() -> moveloop(resuming) ->
           moveloop_preamble(); the caller drives moveloop_core() itself */
        await moveloop_preamble(resuming);
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
            nhGame._screens.push(captureScreen(term));
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
        /* the game ended the program (save, quit, death): nh_terminate() */
        if (e?.nhexit) {
            nhGame.exited = true;
            return;
        }
        if (msg.includes('not ported yet')) nhGame.notPortedError = e;
        nhGame.stopError = e;
    };

    try {
        await nhGame.start();
    } catch (e) {
        stop(e);
        return nhGame;
    }
    if (game.program_state?.exiting) {
        nhGame.exited = true;
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
        /* moveloop_core() returns normally once nh_terminate() has run */
        if (game.program_state?.exiting) {
            nhGame.exited = true;
            break;
        }
    }

    return nhGame;
}

