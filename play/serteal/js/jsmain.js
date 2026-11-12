// jsmain.js - contest entry points backed by the generated plain-JS
// NetHack core (js/generated/nethack-core.mjs, the real C compiled by
// tools/c2js).
//
// How a segment runs (see tools/c2js/host/nhjs_tty_api.c for the C side):
//   - The engine starts the game like the recorder: `nethack -u <name>`,
//     HOME holding the session's .nethackrc, files left by earlier
//     segments restored into its filesystem.
//   - It pulls input one byte at a time through Module.nhjsKey(); the
//     bytes are the recorder's: every UTF-16 unit of `moves` as UTF-8,
//     CR delivered as LF.  When no byte is left, the engine unwinds and
//     nhjs_session_run() returns.
//   - Every screen the C code captures at an input boundary arrives
//     through Module.nhjsCapture() right away, so a game that ends with
//     exit(), abort() or panic keeps everything shown until then.
//
// Interactive play (the browser, the playability check) uses the same
// engine.  At the top of every moveloop_core() iteration (and once before
// the game starts) the C side calls Module.nhjsBoundary(); there the heap
// and the filesystem are snapshotted.  A new key rewinds to the last
// snapshot and runs again with the key appended, so keys typed earlier in
// an unfinished command are simply consumed again.  No async code, no
// replay from the start of the game.

import createCoreModule from "./generated/nethack-core.mjs";
import {
  FsJournal,
  restorePersistentFs,
  snapshotPersistentFs,
  storageForInput,
  walkFs,
} from "./persistence.js";

const ROWS = 24;
const COLS = 80;
const DEFAULT_COLOR = 8;
const RNG_LOG_PATH = "/rng.log";
const DEC_TO_UNICODE = {
  "`": "◆",
  a: "▒",
  f: "°",
  g: "±",
  j: "┘",
  k: "┐",
  l: "┌",
  m: "└",
  n: "┼",
  q: "─",
  t: "├",
  u: "┤",
  v: "┴",
  w: "┬",
  x: "│",
  y: "≤",
  z: "≥",
  "|": "≠",
  o: "⎺",
  s: "⎽",
  "{": "π",
  "~": "·",
};

// The recorder harness passes `-u <name>` with the first `name:` found in
// an OPTIONS= line of the rc (scripts/record-session.mjs), or "".
export function recorderPlayerName(nethackrc) {
  for (const rawLine of String(nethackrc || "").split("\n")) {
    const line = rawLine.trim();
    const upper = line.toUpperCase();
    if (!(upper.startsWith("OPTIONS=") || upper.startsWith("OPTIONS =")))
      continue;
    for (const opt of line.slice(line.indexOf("=") + 1).split(",")) {
      const t = opt.trim();
      if (t.toLowerCase().startsWith("name:"))
        return t.slice("name:".length).trim();
    }
  }
  return "";
}

// The bytes the recorder writes for one UTF-16 unit of `moves`:
// Buffer.from(unit, "utf8"), with CR turned into LF as a tty would.
// A lone surrogate becomes U+FFFD.
export function keyBytes(unit) {
  if (unit === 13) return [10];
  if (unit < 0x80) return [unit];
  if (unit < 0x800) return [0xc0 | (unit >> 6), 0x80 | (unit & 0x3f)];
  if (unit >= 0xd800 && unit <= 0xdfff) return [0xef, 0xbf, 0xbd];
  return [
    0xe0 | (unit >> 12),
    0x80 | ((unit >> 6) & 0x3f),
    0x80 | (unit & 0x3f),
  ];
}

function splitRngLog(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\)\s+=\s+/g, ")="))
    .filter(Boolean);
}

function isBlankCapturedScreen(screen) {
  return (
    String(screen || "")
      .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
      .replace(/[\x0e\x0f]/g, "")
      .trim() === ""
  );
}

function canonicalizeCapturedScreen(screen) {
  const lines = String(screen || "")
    .split("\n")
    .map((line) =>
      line.replace(/ {5,}/g, (spaces) => `\x1b[${spaces.length}C`),
    );
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function applySgr(params, state) {
  const parts = params === "" ? ["0"] : String(params).split(";");
  for (const part of parts) {
    const code = Number(part || 0);
    if (code === 0) {
      state.color = DEFAULT_COLOR;
      state.attr = 0;
    } else if (code === 1) {
      state.attr |= 2;
    } else if (code === 4) {
      state.attr |= 4;
    } else if (code === 7) {
      state.attr |= 1;
    } else if (code === 22) {
      state.attr &= ~2;
    } else if (code === 24) {
      state.attr &= ~4;
    } else if (code === 27) {
      state.attr &= ~1;
    } else if (code === 39) {
      state.color = DEFAULT_COLOR;
    } else if (code >= 30 && code <= 37) {
      state.color = code - 30;
    } else if (code >= 90 && code <= 97) {
      state.color = code - 90 + 8;
    }
  }
}

export function renderCapturedScreen(display, screen, cursor = [0, 0, 1]) {
  if (!display) return;
  display.clearScreen?.();

  let row = 0;
  let col = 0;
  let decgfx = false;
  const state = { color: DEFAULT_COLOR, attr: 0 };
  const text = String(screen || "");

  for (let i = 0; i < text.length; ) {
    const ch = text[i];
    if (ch === "\n") {
      row++;
      col = 0;
      i++;
      continue;
    }
    if (ch === "\x0e") {
      decgfx = true;
      i++;
      continue;
    }
    if (ch === "\x0f") {
      decgfx = false;
      i++;
      continue;
    }
    if (ch === "\x1b" && text[i + 1] === "[") {
      let j = i + 2;
      while (j < text.length && /[0-9;?]/.test(text[j])) j++;
      const params = text.slice(i + 2, j);
      const final = text[j];
      i = j + 1;
      if (final === "C") {
        col += Number(params) || 1;
      } else if (final === "m") {
        applySgr(params, state);
      }
      continue;
    }

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      display.setCell?.(
        col,
        row,
        decgfx ? DEC_TO_UNICODE[ch] || ch : ch,
        state.color,
        state.attr,
      );
    }
    col++;
    i++;
  }

  display.cursSet?.(cursor?.[2] ?? 1);
  display.setCursor?.(cursor?.[0] ?? 0, cursor?.[1] ?? 0);
}

// The heap below the allocator's break plus the filesystem journal mark:
// everything needed to re-enter the engine at a boundary.
class EngineSnapshot {
  constructor() {
    this.heap = new Uint8Array(0);
    this.top = 0;
    this.screens = 0;
    this.inputSteps = 0;
    this.anims = 0;
    this.taken = false;
  }

  take(game) {
    const mod = game._module;
    const top = mod._sbrk(0) >>> 0;
    if (this.heap.length < top)
      this.heap = new Uint8Array(top + (top >>> 3) + (1 << 20));
    this.heap.set(mod.HEAPU8.subarray(0, top));
    this.top = top;
    this.screens = game._screens.length;
    this.inputSteps = game._inputSteps;
    this.anims = game._animationFrames.length;
    game._journal.mark();
    this.taken = true;
  }

  restore(game) {
    game._module.HEAPU8.set(this.heap.subarray(0, this.top));
    game._journal.rollback();
    game._screens.length = this.screens;
    game._cursors.length = this.screens;
    game._screenSteps.length = this.screens;
    game._inputSteps = this.inputSteps;
    game._animationFrames.length = this.anims;
  }
}

export class NethackGame {
  constructor(opts = {}) {
    this._seed = opts.seed ?? 0;
    this._datetime = opts.datetime || "";
    this._nethackrc = opts.nethackrc || "";
    this._moves = opts.moves || "";
    this._storage = storageForInput(opts);
    this._interactive = !!opts.interactive;
    this._keys = [];
    this._units = 0;
    for (let i = 0; i < this._moves.length; i++)
      this._appendUnit(this._moves.charCodeAt(i));
    this._screens = [];
    this._cursors = [];
    this._screenSteps = [];
    this._inputSteps = 0;
    this._animationFrames = [];
    this._rngLog = [];
    this._stderr = [];
    this._ended = false;
    this._endReason = null;
    this._module = null;
    this._journal = null;
    this._snapshot = null;
    this._persistSkip = new Set();
  }

  _appendUnit(unit) {
    for (const byte of keyBytes(unit)) this._keys.push(byte);
    this._units++;
  }

  async start() {
    if (this._pendingDisplay) this._interactive = true;
    const mod = await createCoreModule({
      print() {},
      printErr: (line) => this._stderr.push(String(line)),
    });
    this._module = mod;
    mod.nhjsKey = (index) => (index < this._keys.length ? this._keys[index] : -1);
    mod.nhjsCapture = (anim, seq, animId, cx, cy, screenPtr) =>
      this._capture(anim, seq, animId, cx, cy, mod.UTF8ToString(screenPtr));
    mod.nhjsBoundary = this._interactive
      ? () => this._snapshot.take(this)
      : () => {};

    mod.ccall(
      "nhjs_session_init",
      null,
      ["string", "string", "string", "string"],
      [
        String(this._seed),
        this._datetime,
        this._nethackrc,
        recorderPlayerName(this._nethackrc),
      ],
    );
    mod._nhjs_install_data();
    for (const [path] of walkFs(mod.FS)) this._persistSkip.add(path);
    mod._nhjs_install_files();
    restorePersistentFs(mod.FS, this._storage);
    for (const path of ["/sysconf", RNG_LOG_PATH]) this._persistSkip.add(path);
    for (const [path, node] of walkFs(mod.FS)) {
      if (path.endsWith("/.nethackrc") && mod.FS.isFile(node.mode))
        this._persistSkip.add(path);
    }

    if (this._interactive) {
      this._journal = new FsJournal(mod.FS);
      this._snapshot = new EngineSnapshot();
      this._snapshot.take(this);
    }
    this._run();
    if (!this._interactive) this._finishSegment();
    if (this._pendingDisplay) attachInteractiveDisplay(this, this._pendingDisplay);
  }

  _capture(anim, seq, animId, cx, cy, rawScreen) {
    const screen = canonicalizeCapturedScreen(rawScreen);
    const cursor = [cx, cy, 1];
    if (anim) {
      this._animationFrames.push({ screen, cursor, seq, anim: animId });
      return;
    }
    // the recorder keeps the first moves.length + 1 input boundaries;
    // the judge drops blank screens
    const step = this._inputSteps++;
    if (isBlankCapturedScreen(screen)) return;
    this._screens.push(screen);
    this._cursors.push(cursor);
    this._screenSteps.push(step);
  }

  _run() {
    if (this._ended) return;
    try {
      this._module._nhjs_session_run();
    } catch (error) {
      // exit(), abort(), panic and error() all end the game here; the
      // screens captured so far stand
      this._ended = true;
      this._endReason = String(error?.message || error);
      if (error?.name !== "ExitStatus") this._stderr.push(this._endReason);
    }
  }

  _finishSegment() {
    this._harvestRngLog();
    snapshotPersistentFs(this._module.FS, this._storage, this._persistSkip);
  }

  // Interactive input: one key code (a UTF-16 unit, as the browser
  // terminal delivers it).
  pushKey(keyCode) {
    if (!this._module || this._ended) return false;
    this._appendUnit(keyCode);
    this._snapshot.restore(this);
    this._run();
    if (this._ended) this._finishSegment();
    return true;
  }

  get ended() {
    return this._ended;
  }

  _harvestRngLog() {
    try {
      this._rngLog = splitRngLog(
        this._module.FS.readFile(RNG_LOG_PATH, { encoding: "utf8" }),
      );
    } catch {
      // the game can end before the RNG log is opened
    }
  }

  _stepLimit() {
    return this._units + 1;
  }

  getScreens() {
    const limit = this._stepLimit();
    let n = this._screens.length;
    while (n > 0 && this._screenSteps[n - 1] >= limit) n--;
    return n === this._screens.length ? this._screens : this._screens.slice(0, n);
  }
  getCursors() {
    return this._cursors.slice(0, this.getScreens().length);
  }
  getAnimationFrames() {
    return this._animationFrames;
  }
  // one group per recorded step, blank screens included (the judge
  // indexes animation frames by step, screens without the blank ones)
  getAnimationFramesByStep() {
    const steps = Math.min(this._inputSteps, this._stepLimit());
    const grouped = Array.from({ length: steps }, () => []);
    for (const frame of this._animationFrames) {
      const stepIndex =
        Number.isInteger(frame.seq) && frame.seq >= 0 ? frame.seq : 0;
      if (stepIndex >= grouped.length) continue;
      grouped[stepIndex].push({ screen: frame.screen, cursor: frame.cursor });
    }
    return grouped;
  }
  getRngLog() {
    return this._rngLog;
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
}

export async function runSegment(input) {
  const game = new NethackGame(input);
  await game.start();
  return game;
}

function renderLatestCapturedScreen(game, display) {
  const screens = game.getScreens();
  if (!screens.length) return;
  const cursors = game.getCursors();
  renderCapturedScreen(
    display,
    screens[screens.length - 1],
    cursors[cursors.length - 1],
  );
}

function attachInteractiveDisplay(game, display) {
  if (!display) return;
  display._nhjsInteractive = { game };
  renderLatestCapturedScreen(game, display);
}

export function initializeInteractiveGame(display, game) {
  attachInteractiveDisplay(game, display);
}

// One key from the browser or the playability check.  Returns false once
// the game has ended.
export function continueInteractiveGame(display, keyCode) {
  const game = display?._nhjsInteractive?.game;
  if (!game || !game.pushKey(keyCode)) return false;
  renderLatestCapturedScreen(game, display);
  return true;
}
