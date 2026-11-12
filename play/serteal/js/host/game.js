// host/game.js - one game, with the interface the judge and the browser use
// (js/jsmain.js exports it as NethackGame):
//
//   const game = new ShipGame({ seed, datetime, nethackrc, moves, storage });
//   await game.start();              // runs the whole segment (or, interactive, up to the first key)
//   game.getScreens(), getCursors(), getRngLog(), getAnimationFramesByStep()
//   game.pushKey(code)               // interactive: one more key
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

export class ShipGame {
  constructor(opts = {}) {
    this._seed = opts.seed ?? 0;
    this._datetime = opts.datetime || "";
    this._nethackrc = opts.nethackrc || "";
    this._storage = storageForInput(opts);
    this._interactive = !!opts.interactive;
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
      key: (i) => log.key(i),
      capture: (anim, seq, animId, cx, cy, screen) => log.capture(anim, seq, animId, cx, cy, screen),
      boundary: this._interactive ? () => this._takeSnapshot() : () => {},
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
    if (!this._interactive) this._finishSegment();
    const display = this._pendingDisplay;
    if (display) {
      display._nhjsInteractive = { game: this };
      const screens = this.getScreens();
      if (screens.length) renderCapturedScreen(display, screens[screens.length - 1], this.getCursors()[screens.length - 1]);
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

  _takeSnapshot() {
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

  /** Interactive input: one key code (a UTF-16 unit, as the browser terminal delivers it). */
  pushKey(keyCode) {
    if (!this._machine || this._ended) return false;
    this._log.appendUnit(keyCode);
    this._snapshot.restore(this._machine);
    this._run();
    if (this._ended) this._finishSegment();
    return true;
  }

  get ended() {
    return this._ended;
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
