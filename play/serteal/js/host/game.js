// host/game.js - one game, with the interface the judge and the browser use
// (js/jsmain.js exports it as NethackGame):
//
//   const game = new ShipGame({ seed, datetime, nethackrc, moves, storage, rngLog });
//   await game.start();              // runs the whole segment (or, interactive, up to the first key)
//   game.getScreens(), getCursors(), getRngLog(), getAnimationFramesByStep()
//   game.pushKey(code, queued)       // interactive: one more key (and the keys typed after it)
//   game.shownScreen()               // interactive: what the player sees now
//
// One machine (host/boot.js) per process; every game starts from its
// pristine state, so segments and successive browser games are independent.
// The game's modules come from an entry module (see setShipEntry): it
// exports main (unixmain.c), moveloop_preamble, maybe_do_tutorial,
// moveloop_core and dataFiles() (the game data, js/dat).

import { createMachine } from "./boot.js";
import { SessionDriver } from "./session.js";
import { CaptureLog, splitRngLog, renderCapturedScreen } from "./capture.js";
import { MachineSnapshot } from "./snapshot.js";
import { RNG_LOG_PATH, recorderPlayerName, sessionFiles } from "./env.js";
import { isGameEnd } from "./endgame.js";
import { restorePersistentVfs, snapshotPersistentVfs, storageForInput } from "../persistence.js";
import { isFile } from "./vfs.js";

let entryImporter = null;
let machinePromise = null;
let machineOptions = {};

/** How to import the game's entry module (call before the first game). */
export function setShipEntry(importer, options = {}) {
  entryImporter = importer;
  machineOptions = options;
  machinePromise = null;
}

/** The process's machine, created and loaded on first use. */
export function shipMachine() {
  if (!machinePromise) {
    if (!entryImporter) throw new Error("ship: no game entry module (setShipEntry)");
    machinePromise = (async () => {
      const m = createMachine(machineOptions);
      await m.load(entryImporter);
      return m;
    })();
  }
  return machinePromise;
}

const S_ARGV = ["nethack", "-u"];
// type-ahead: boundaries are snapshotted only over the last keys of a run (see _atBoundary)
const TYPE_AHEAD_SNAPSHOT_KEYS = 16;

export class ShipGame {
  constructor(opts = {}) {
    this._seed = opts.seed ?? 0;
    this._datetime = opts.datetime || "";
    this._nethackrc = opts.nethackrc || "";
    this._storage = storageForInput(opts);
    this._interactive = !!opts.interactive;
    this._keepRngLog = !!opts.rngLog;
    this._log = new CaptureLog(opts.moves || "");
    this._rngLog = [];
    this._stderr = [];
    this._ended = false;
    this._endReason = null;
    this._persistSkip = new Set();
    this._machine = null;
    this._driver = null;
    this._snapshot = null;
    this._vfs = null;
    this._finished = false;
    // interactive: the snapshot was taken at a command boundary (not before main()), and it
    // was just restored: the game is about to reach that boundary again
    this._snapshotAtBoundary = false;
    this._resuming = false;
    // type-ahead (see pushKey): keys already run whose screens have not been shown yet
    this._ahead = [];
    this._shown = null;
    this._watch = null;
  }

  async start() {
    if (this._pendingDisplay) this._interactive = true;
    const m = await shipMachine();
    this._machine = m;
    const e = m.entry;
    // the game's own C driver (sys/c2js nhjs_tty_api.c, emitted) or the JS one (host/session.js)
    this._emittedDriver = typeof e.nhjs_session_run === "function";
    const vfs = m.newGame({ seed: String(this._seed), datetime: this._datetime, environment: !this._emittedDriver });
    this._vfs = vfs;
    const log = this._log;
    const clib = m.clib;
    const fileMode = 0o666 & ~vfs.umask; // as fopen(path, "wb") creates them
    m.current = {
      key: (i) => {
        if (this._watch !== null && i >= this._watch.next) this._noteKeyRequest(i);
        return log.key(i);
      },
      capture: (anim, seq, animId, cx, cy, screen) => log.capture(anim, seq, animId, cx, cy, screen),
      boundary: this._interactive ? () => this._atBoundary() : () => {},
      installData: () => {
        for (const [path, data] of e.dataFiles()) vfs.writeFile(path, data, fileMode);
      },
    };
    this._hooks = m.current;
    const name = recorderPlayerName(this._nethackrc);
    if (this._emittedDriver) {
      // C strings of the session, UTF-8 encoded
      const s = (text) => {
        const bytes = new TextEncoder().encode(String(text));
        const p = clib.fn.malloc(bytes.length + 1);
        clib.HEAPU8.set(bytes, p);
        clib.HEAPU8[p + bytes.length] = 0;
        return p;
      };
      e.nhjs_session_init(s(this._seed), s(this._datetime), s(this._nethackrc), s(name));
      e.nhjs_install_data();
      for (const [path] of vfs.walk("/")) this._persistSkip.add(path);
      e.nhjs_install_files();
    } else {
      m.current.installData();
      for (const [path] of vfs.walk("/")) this._persistSkip.add(path);
      const files = sessionFiles(this._nethackrc);
      for (const dir of files.dirs) vfs.mkdirTree(dir);
      for (const path of files.touch) if (!vfs.exists(path)) vfs.writeFile(path, "", fileMode);
      for (const [path, text] of files.files) vfs.writeFile(path, text, fileMode);
    }
    // A player sees the whole screen: no reproduction of the reference
    // recorder's 6,144-byte capture buffer (win/tty/termcap.c).
    if (this._interactive) clib.call("setenv", "NHJS_UNBOUNDED_CAPTURE", "1", 1);
    // Nor does a player need the RNG log (NETHACK_RNGLOG, one line per random number): a game
    // shown on a display does not write it unless asked to (opts.rngLog).
    if (this._pendingDisplay && !this._keepRngLog) clib.call("unsetenv", "NETHACK_RNGLOG");
    restorePersistentVfs(vfs, this._storage);
    for (const path of ["/sysconf", RNG_LOG_PATH]) this._persistSkip.add(path);
    for (const [path, node] of vfs.walk("/")) if (path.endsWith("/.nethackrc") && isFile(node.mode)) this._persistSkip.add(path);

    if (!this._emittedDriver) {
      const hooks = m.current;
      this._driver = new SessionDriver({
        main: e.main,
        moveloop_preamble: e.moveloop_preamble,
        maybe_do_tutorial: e.maybe_do_tutorial,
        moveloop_core: e.moveloop_core,
        key: hooks.key,
        capture: hooks.capture,
        boundary: hooks.boundary,
        readString: (p) => clib.readString(p),
        getSP: () => clib.stackSave(),
        setSP: (sp) => clib.stackRestore(sp),
        argv: this._argv(m, name),
      });
    }
    if (this._interactive) {
      this._snapshot = new MachineSnapshot();
      this._takeSnapshot();
    }
    this._run();
    if (!this._interactive || this._ended) this._finishSegment();
    const display = this._pendingDisplay;
    if (display) {
      display._nhjsInteractive = { game: this };
      const shown = this.shownScreen();
      if (shown) renderCapturedScreen(display, shown.screen, shown.cursor);
    }
  }

  // argv of `nethack -u <name>` in the heap (array of char *, NULL-terminated)
  _argv(m, name) {
    const clib = m.clib;
    const words = [...S_ARGV, name];
    const vec = clib.fn.malloc(4 * (words.length + 1));
    words.forEach((w, k) => (clib.HEAPU32[(vec >> 2) + k] = clib.newString(w)));
    clib.HEAPU32[(vec >> 2) + words.length] = 0;
    const value = typeof m.entry.argv === "function" ? m.entry.argv(vec, words.length) : vec;
    return [words.length, value];
  }

  _atBoundary() {
    // a replay from the snapshot first reaches the very boundary it was taken at: same state
    if (this._resuming) {
      this._resuming = false;
      return;
    }
    // type-ahead: a boundary with many typed keys still to go is passed by, a later one is kept
    // (the snapshot only has to be at some boundary of the keys run: replay works from any)
    const w = this._watch;
    if (w !== null && w.ends.length - w.views.length > TYPE_AHEAD_SNAPSHOT_KEYS) return;
    this._takeSnapshot(true);
  }

  _takeSnapshot(atBoundary = false) {
    this._snapshotAtBoundary = atBoundary;
    const d = this._driver;
    const log = this._log;
    const extra = { log: { save: () => log.mark(), restore: (s) => log.rewind(s) } };
    if (d) extra.driver = { save: () => d.snapshot(), restore: (s) => d.restore(s) };
    this._snapshot.take(this._machine, extra);
  }

  _run() {
    if (this._ended) return;
    const m = this._machine;
    const sp = m.clib.stackSave();
    m.current = this._hooks;
    try {
      if (this._emittedDriver) m.entry.nhjs_session_run();
      else this._driver.run();
    } catch (error) {
      m.clib.stackRestore(sp);
      // exit(), abort(), panic and error() end the game; the screens captured so far stand
      this._ended = true;
      this._endReason = String(error?.message || error);
      if (error?.name !== "ExitStatus") this._stderr.push(this._endReason + (isGameEnd(error) ? "" : "\n" + error?.stack));
    }
  }

  _readRngLog() {
    const log = this._vfs?.readFile(RNG_LOG_PATH);
    return log ? splitRngLog(new TextDecoder().decode(log)) : [];
  }

  _finishSegment() {
    this._rngLog = this._readRngLog();
    this._finished = true;
    snapshotPersistentVfs(this._vfs, this._storage, this._persistSkip);
  }

  /**
   * Interactive input: one key code (a UTF-16 unit, as the browser terminal delivers it).
   *
   * A key rewinds the game to its last command boundary (host/snapshot.js) and runs it
   * again with the key appended, so the keys of an unfinished command are processed again
   * for every new one.  Type-ahead: when `queued` holds keys already typed after this one,
   * the game runs once over all of them instead, and notes what the player would see after
   * each key (the screen when the game asks for the byte after it, or when it ends).  The
   * next pushKey calls, which bring those same keys, only show the noted screens in turn.
   * Keys after the one that ends the game are not run.
   */
  pushKey(keyCode, queued = []) {
    if (this._ahead.length) {
      const next = this._ahead.shift();
      if (next.code === keyCode) {
        this._shown = this._ahead.length ? next : null;
        return true;
      }
      // not the key that was queued (the queue was cleared): the keys run ahead stand
      this._ahead.length = 0;
      this._shown = null;
    }
    if (!this._machine || this._ended) return false;
    const log = this._log;
    const firstUnit = log.units;
    const keys = [keyCode, ...queued];
    const ends = [];
    for (const code of keys) {
      log.appendUnit(code);
      ends.push(log.keys.length);
    }
    const views = [];
    if (ends.length > 1) this._watch = { next: ends[0], ends, views, firstUnit };
    this._snapshot.restore(this._machine);
    this._resuming = this._snapshotAtBoundary;
    this._run();
    this._resuming = false;
    this._watch = null;
    if (this._ended) {
      // the key that ended the game is the last one run
      log.dropKeysAfter(firstUnit + views.length + 1, ends[views.length]);
      views.push(log.shownAt());
      this._finishSegment();
    }
    if (views.length > 1) {
      this._ahead = views.map((view, k) => ({ code: keys[k], view }));
      this._shown = this._ahead.shift();
    }
    return true;
  }

  // type-ahead: the game asks for byte `index`, so the keys ending at or before it are done
  _noteKeyRequest(index) {
    const w = this._watch;
    while (w.views.length < w.ends.length && index >= w.ends[w.views.length]) {
      w.views.push(this._log.shownAt(w.firstUnit + w.views.length + 1));
    }
    w.next = w.views.length < w.ends.length ? w.ends[w.views.length] : Infinity;
  }

  /** What the player sees: { screen, cursor } of the last screen shown, or null. */
  shownScreen() {
    return this._shown ? this._shown.view : this._log.shownAt();
  }

  /** The game has ended (with type-ahead: by the keys shown so far; only the last key run can end it). */
  get ended() {
    return this._shown ? false : this._ended;
  }
  getScreens() {
    return this._log.getScreens();
  }
  getCursors() {
    return this._log.getCursors();
  }
  getAnimationFrames() {
    return this._log.animationFrames;
  }
  getAnimationFramesByStep() {
    return this._log.getAnimationFramesByStep();
  }
  /** every RNG call so far (an unfinished interactive game reads its log file now) */
  getRngLog() {
    return this._finished ? this._rngLog : this._readRngLog();
  }
  getRngSlices() {
    return [];
  }
  getStderr() {
    return this._stderr;
  }
  getStorage() {
    return this._storage;
  }
  /** the game's file system (tests, diagnostics) */
  get vfs() {
    return this._vfs ?? null;
  }
}

export { isFile };
