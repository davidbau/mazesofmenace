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
import { initRng, enableRngLog, getRngLog } from './rng.js';
import { setStorageForTesting, vfsReadFile, vfsWriteFile } from './storage.js';
import { SYSCONF_TEXT } from './generated/sysconf_data.js';
import { pushKey, nhgetch } from './input.js';
import { newgame, moveloop_core, welcome, moveloop_preamble, init_sound_disp_gamewindows, early_init } from './allmain.js';
import { getmailstatus } from './mail.js';
import { try_restore_save } from './save.js';
import { vision_init, vision_recalc, init_vision_globals } from './vision.js';
import { parseNethackrc, set_playmode, init_fruit_chain, initoptions_init, RC_FILE_OPT, set_configfile_name } from './options.js';
import { flush_screen, serialize_for_scoring, reset_display_messages, docrt, bot, pline, tty_wait_synch } from './display.js';
import { config_error_init, config_error_done } from './cfgfiles.js';
import { GameDisplay } from './game_display.js';
import { nomux_marker } from './nomux_capture.js';
import { askname_if_needed } from './askname.js';
import { player_selection } from './player_selection.js';
import { check_special_room } from './hack.js';
import { y_n } from './getline.js';
import { delete_savefile } from './files.js';
import { NhPanic, panic_tail } from './end.js';
import { apply_customizations, free_glyphid_cache, glyphid_cache_status } from './glyphs.js';

// ── NethackGame ──
// Wraps a single game session with replay infrastructure.
//
// Ephemeral VFS for harnesses that pass no storage (playability runner,
// startBrowser). C unixmain.c:150 always has the installed SYSCF_FILE on
// disk; JS seeds the embedded SYSCONF_TEXT into VFS at start. With no
// backing store the seed silently fails, assure_syscf_file (cfgfiles.c
// :2031–2068) fatals, and start() early-returns before installing the
// display — every later nhgetch throws 'Input queue empty'. A per-game
// Map-backed store keeps the installed sysconf readable and save/record
// working within the game. Scoring and /play/ always pass storage, so
// this never triggers there. Inline (not InMemoryStorage) so the fix
// does not depend on judge-overlaid storage.js exports.
function createEphemeralStorage() {
    const map = new Map();
    return {
        getItem(k) { return map.has(k) ? map.get(k) : null; },
        setItem(k, v) { map.set(k, String(v)); },
        removeItem(k) { map.delete(k); },
        get length() { return map.size; },
        key(i) {
            let n = 0;
            for (const k of map.keys()) { if (n === i) return k; n++; }
            return null;
        },
    };
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
        // those files also survive page reloads. When no handle is
        // provided (playability runner, startBrowser), use an
        // ephemeral per-game store so the installed sysconf seed and
        // VFS-backed startup still work (see above).
        this._storage = opts.storage || createEphemeralStorage();
        this._screens = [];
        this._cursors = [];
        // Recorder raw-mode statics hit by nomux_out overflows
        // (nomux_capture.js); C zero-initialises them.
        this._nomuxRaw = { mem: new Uint8Array(12) };
        this._nomuxAnimId = 0; // C nomux_anim_id: anim markers so far
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
        // C nomux_capture_write_screen: an anim marker renders the screen
        // too, so it can overflow nomux_out (nomux_capture.js).
        this._pendingAnimFrames.push({
            screen: term?.serialize ? term.serialize() : '',
            cursor: (this._nomuxAnimId++, nomux_marker(this._nomuxRaw, term,
                term?.getCursor
                    ? term.getCursor()
                    : (disp
                        ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0,
                            disp.cursorVisible ?? 1]
                        : null)).cursor),
        });
        if (typeof requestAnimationFrame === 'function') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        } else {
            await null;
        }
    }

    async start() {
        const g = resetGame();
        // C allmain.c:33–45 early_init (sole C caller unixmain.c:66, the port
        // entry): program_state `:35`, crashreport `:38`, decl `:40`,
        // objects `:41`, monst `:42`, sys `:43`, runtime `:44`. (0, []):
        // no argv in dual-runtime ESM (Rule #2); crashreport voids them.
        early_init(0, []);
        reset_display_messages();
        // Frozen VFS contract: the harness shares this handle across segments.
        // Belt-and-braces: if _storage was nulled after construction, fall
        // back to an ephemeral store (constructor already does this for a
        // missing opts.storage; see above).
        if (this._storage == null) this._storage = createEphemeralStorage();
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

        // C termcap.c nomux_buf: the recorder's shadow screen exists before
        // init_nhwindows (unixmain.c:174) allocates ttyDisplay, and every
        // tty_nhgetch emits a marker, so a config error's raw_print and
        // getret wait are captured on the pending display.
        g._nomuxShadow = this._pendingDisplay;
        this._installCaptureHook();
        // C iflags.cbreak is 0 until tty_init_nhwindows → setftty
        // (wintty.c:533): getret's xwaitforspace takes only return here.
        g.iflags.cbreak = false;

        // Overlay the user rc on the initialized live option bags. No
        // defaults may be reapplied after the system configuration pass.
        // C rcfile `:1943–1945`: no -nethackrc / NETHACKOPTIONS file, so
        // nameval is NULL and the frame is not CONFIG_ERROR_SECURE.
        config_error_init(true, null, false);
        const opts = parseNethackrc(this._nethackrc, true);
        // C config_error_done `:1613–1615`: errors pline (raw_print, no
        // window yet), then wait_synch → tty_wait_synch → getret.
        if (config_error_done()) await tty_wait_synch();
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
        // C initoptions_finish `:7376–7381` (ENHANCED_SYMBOLS live,
        // config.h:368): this runSegment startup inlines finish (the
        // opt_initial=false below is its `:7382`) — drop the glyphid
        // cache, then stamp the rc-filed urep/nhcolor rows onto
        // glyphmap (without this the wintty `:3946` utf8 arm never
        // fires: Enhanced sessions paint ASCII at step 0).
        if (glyphid_cache_status()) // C `:7377–7378`
            free_glyphid_cache(); // C `:7379`
        // C `:7380–7381` (do_custom_symbols | do_custom_colors,
        // sym.h:132–135; currentgraphics BSS 0 ≡ PRIMARYSET).
        apply_customizations(g.currentgraphics | 0, 2 | 1);
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
        g.iflags.cbreak = true; // C tty_init_nhwindows → setftty (wintty.c:533)
        // C nh_delay_output → contest animationFrame (throw/zap beams)
        g.animationFrame = this.animationFrame.bind(this);

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
            // C restore.c dorecover `:941–948` runs vision_reset +
            // vision_full_recalc = 1 straight into docrt() — no
            // vision_recalc before it (docrt_flags runs the (2)+(0)
            // pair itself, display.c `:1740`/`:1758`). A pre-docrt
            // recalc here only burns display RNG (its paints are wiped
            // by docrt's cls) and desyncs Hallu glyphs on restore.
            await docrt();
            await bot();
            await welcome(false);
            await check_special_room(false);
            // C unixmain.c:265 wd_message() after dorecover (newgame
            // analogue: allmain.js newgame tail) — the wiz_error_flag /
            // explore_error_flag arms are named (JS set_playmode never
            // raises them, so wizard/discover stand as restored); the
            // discover arm below is live.
            if (g.flags.explore || g.flags.discover) {
                await pline('You are in non-scoring explore/discovery mode.');
            }
            // C unixmain.c:266-274 — a wizard/discover restore asks
            // whether to keep the save file (y_n: ynchars / 'n' /
            // addcmdq TRUE). 'n' deletes; anything else keeps (the
            // else arm's chmod FCMASK + nh_compress are platform /
            // external-compressor work with no VFS analogue — named).
            if (g.discover || g.wizard) {
                const c = await y_n('Do you want to keep the save file?');
                if (c === 'n') {
                    delete_savefile();
                }
            }
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
            const disp = game?.nhDisplay || game?._nomuxShadow;
            const term = disp?.terminal || disp;
            // Count / --More-- prompts: keep cursor on topline even if a
            // later flush reset it to the hero (C get_count / more()).
            if (disp?.grid && disp.setCursor) {
                let row0 = '';
                for (let c = 0; c < (disp.cols || 80); c++)
                    row0 += disp.grid[0][c]?.ch || ' ';
                const t = row0.trimEnd();
                if (t.startsWith('Count:'))
                    disp.setCursor(t.length, 0);
            }
            // C nomux_emit_marker: the recorder renders the screen into
            // nomux_out before reading the cursor; an overflow there
            // replaces the reported cursor and, past obuf, corrupts the
            // recorded screen itself (nomux_capture.js).
            const marker = nomux_marker(nhGame._nomuxRaw, term,
                term?.getCursor
                    ? term.getCursor()
                    : (disp
                        ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0,
                            disp.cursorVisible ?? 1]
                        : null),
                { kind: 'input', seq: nhGame._screens.length + 1,
                    anim: nhGame._nomuxAnimId });
            nhGame._screens.push(
                marker.screen != null ? marker.screen
                    : (term?.grid
                        ? serialize_for_scoring(term)
                        : (term?.serialize ? term.serialize() : '')),
            );
            nhGame._rngSlices.push(slice);
            const cursor = marker.cursor;
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

    try {
        await nhGame.start();

        // Drive the game loop until input is exhausted. The judge looks
        // at game.getScreens() afterwards; whatever the contestant
        // captured is what gets compared.
        // C ref: allmain.c moveloop `:587–597` — `for (;;) {
        // moveloop_core(); }`: C has no iteration cap; the loop ends only
        // via noreturn exits (death/quit/save — gameover here) or, in this
        // harness, input exhaustion. A moves-based cap truncates turn-dense
        // segments (multi-turn search/rest runs ~9+ turns per keypress, so
        // the needed calls exceed any fixed multiple of the move count)
        // mid-keypress. Hang protection stays the worker timeout (the
        // Must-fix hang signal): a no-progress livelock surfaces as
        // ETIMEDOUT instead of silent truncation.
        for (; !game.program_state?.gameover;) {
            try {
                await moveloop_core();
            } catch (e) {
                if (String(e?.message || '').includes('Input queue empty')) break;
                throw e;
            }
            // C really_done is noreturn — stop driving gameplay after death
            if (game.program_state?.gameover) break;
        }
    } catch (e) {
        // Harness-clean: input exhaustion outside the drive loop (inside
        // nhGame.start()) ends the segment with what was captured, the
        // same as exhaustion inside a moveloop_core iteration (C would
        // block on input; the harness has none). Previously it escaped
        // runSegment and voided the run (0/0) instead of comparing.
        if (String(e?.message || '').includes('Input queue empty')) return nhGame;
        // C end.c panic is noreturn: the NhPanic throw unwound to here, so
        // run the rest of its body (Oops, getret wait, then the process
        // aborts). Any other throw is a port bug and still propagates.
        if (!(e instanceof NhPanic)) throw e;
        // Harness diagnostic only (scorers tell a JS-only panic from C's).
        nhGame._panicStack = String(e.stack || e.message);
        try {
            await panic_tail(e);
        } catch (e2) {
            if (!String(e2?.message || '').includes('Input queue empty')) throw e2;
        }
    }

    return nhGame;
}
