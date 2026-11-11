// host/boot.js - the machine the game runs on: one heap, the C library, the
// file system, and the game's JS code bound to them.
//
//   const machine = createMachine(options);
//   await machine.load(() => import("./ship_entry.js"));   // the game's modules, once
//   machine.newGame({ seed, datetime, ... })                // per game: reset + environment
//
// Layout of the one ArrayBuffer (js/vendor/clib-lua.js, `clib.layout`):
//   [0, nullGuard)            never written (NULL)
//   [nullGuard, globalBase)   the game's statics and string literals (rt/heap.js arena)
//   [globalBase, ...)         the C library's data, the C stack, then malloc's heap
// Nothing here is a baked address: the boundaries come from the residue and
// the game's statics are sized by the emitted declarations at load.
//
// The game's JS (emitted modules + js/rt) reaches the machine through
// rt/heap.js `machine`: the stack pointer is the C library's, malloc/free are
// dlmalloc's, and `machine.libc(name, args)` calls host/libc.js or the
// residue.  Function pointers are indices in the residue's function table, so
// the Lua VM can call the game's lua_CFunctions and allocator.
//
// A game starts from the "pristine" snapshot taken right after the modules
// were loaded (statics initialised, nothing run): several games can be
// played one after the other in one machine (runSegment per segment, the
// browser's new game), each from an identical start.

import { createClib, printfSlots } from "../vendor/clib-lua.js";
import { Vfs } from "./vfs.js";
import { createSyscalls } from "./syscalls.js";
import { BASE_ENVIRONMENT, sessionEnvironment } from "./env.js";
import * as T from "./time.js";
import { GameExit, GameAbort } from "./endgame.js";
import { createHostLibc } from "./libc.js";
import { install_lua_api } from "./lua_api.js";
import * as rtHeap from "../rt/heap.js";
import * as rtFn from "../rt/fnptr.js";
import { addr_of } from "../rt/struct.js";

function addrOf(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return addr_of(v);
}

/**
 * options:
 *   timeZone   "recorder" (New York, the recording environment; default) or "utc"
 *   stdout(bytes), stderr(bytes)   what the game writes to fd 1 / fd 2 (default: dropped)
 */
export function createMachine(options = {}) {
  const m = { vfs: new Vfs(), clock: T.clocksFor(""), signals: new Map(), pristine: null, entry: null };
  const ny = (options.timeZone ?? "recorder") === "recorder";
  let clib = null;
  const mem = {
    get HEAP8() { return clib.HEAP8; },
    get HEAPU8() { return clib.HEAPU8; },
    get HEAP16() { return clib.HEAP16; },
    get HEAP32() { return clib.HEAP32; },
    get HEAPU32() { return clib.HEAPU32; },
  };
  clib = createClib({
    long64: true,
    sys: createSyscalls(() => m.vfs, mem),
    now: () => m.clock.now(),
    monotonic: () => m.clock.monotonic(),
    localtime: ny ? T.localtime : T.utcLocaltime,
    mktime: ny ? T.mktime : T.utcMktime,
    tz: ny ? T.tz : T.utcTz,
    env: BASE_ENVIRONMENT,
    exit: (status) => {
      throw new GameExit(status);
    },
    abort: () => {
      throw new GameAbort();
    },
    stdout: options.stdout,
    stderr: options.stderr,
  });
  m.clib = clib;

  // ---- js/rt on this heap ----------------------------------------------------------------
  const L = clib.layout;
  const heapOpts = {
    getSP: () => clib.stackSave(),
    setSP: (sp) => clib.stackRestore(sp),
    malloc: (n) => clib.fn.malloc(n),
    free: (p) => clib.fn.free(p),
    // the game's statics and string literals: the region the C library reserves for them
    arena: [L.nullGuard, L.globalBase],
  };
  // `FILE *stdin` & co.: rt reads the C library's stream pointers from variables
  const streams = clib.fn.malloc(12);
  clib.HEAPU32[streams >> 2] = clib.stdin;
  clib.HEAPU32[(streams >> 2) + 1] = clib.stdout;
  clib.HEAPU32[(streams >> 2) + 2] = clib.stderr;
  const streamVar = { stdin: streams, stdout: streams + 4, stderr: streams + 8 };
  rtHeap.machine.libc_data = (name) => streamVar[name] ?? 0;
  rtHeap.attach_heap(clib.buffer, heapOpts);
  clib.onGrow((buffer) => {
    if (typeof rtHeap.regrow_heap === "function") rtHeap.regrow_heap(buffer);
    else throw new Error("boot: memory grew but rt/heap.js cannot rebind its views (regrow_heap)");
  });

  // The C library assumes the wasm C ABI's 16-byte stack alignment (clang folds `sp + 16 + 8`
  // into `(sp + 16) | 8`); emitted frames keep only 8, so realign before entering the residue.
  const aligned = (f) => {
    const sp = clib.stackSave();
    if (!(sp & 15)) return f();
    clib.stackRestore(sp & -16);
    try {
      return f();
    } finally {
      clib.stackRestore(sp);
    }
  };
  m.aligned = aligned;

  // ---- function pointers: indices in the C library's table ------------------------------
  const toIndex = new Map();
  const fromIndex = new Map();
  const toRaw = (r) => (r === undefined || r === null ? 0 : typeof r === "boolean" ? +r : typeof r === "object" ? addrOf(r) : r);
  rtFn.set_fn_backend({
    get(i) {
      let f = fromIndex.get(i);
      if (f) return f;
      const target = clib.getFunction(i);
      if (!target) return null;
      // a C library function (the Lua VM's): callable from JS with JS values
      f = (...args) => aligned(() => target(...args.map(addrOf)));
      fromIndex.set(i, f);
      toIndex.set(f, i);
      return f;
    },
    index(f) {
      let i = toIndex.get(f);
      if (i !== undefined) return i;
      // called by the C library with raw values: addresses arrive as numbers
      i = clib.addFunction((...raw) => toRaw(f(...raw)));
      toIndex.set(f, i);
      fromIndex.set(i, f);
      return i;
    },
  });
  const fnIndex = (f) => rtFn.fn_index(f);

  // ---- the C library for emitted code ----------------------------------------------------
  const host = createHostLibc(clib, { signals: m.signals, vfs: () => m.vfs });
  // the host callbacks of the game's driver (the EM_JS functions of tools/c2js/host/nhjs_tty_api.c,
  // and the installer of the game data files, js/dat), bound to the running game
  m.current = null;
  const game = () => {
    if (!m.current) throw new Error("boot: no game is running");
    return m.current;
  };
  host.nhjs_js_key = (index) => game().key(index);
  host.nhjs_js_capture = (anim, seq, animId, cx, cy, screen) =>
    game().capture(anim, seq, animId, cx, cy, typeof screen === "string" ? screen : clib.readString(screen));
  host.nhjs_js_boundary = (where) => game().boundary(where);
  host.nhjs_install_data_files = () => game().installData();
  const arg = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "function") return fnIndex(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "object" && typeof v.rest !== "function" && !Array.isArray(v)) return addrOf(v);
    if (Array.isArray(v) && v._a !== undefined) return v._a;
    return v;
  };
  // per name: the host function, a direct call for signatures of plain 32-bit values, or
  // clib.call (64-bit values, varargs laid out from the format string)
  const entries = new Map();
  const formats = new Map();
  // format-string parameter of the residue's variadic printf family (stdio.h)
  const PRINTF = { printf: 0, sprintf: 1, fprintf: 1, snprintf: 2 };
  const entry = (name) => {
    let e = entries.get(name);
    if (e) return e;
    const h = host[name];
    const sig = clib.signatures[name];
    if (h) e = (args) => h(...args.map((v) => (typeof v === "function" && name === "qsort" ? v : arg(v))));
    else if (PRINTF[name] !== undefined) {
      // printf family: the varargs layout of a format text is parsed once (clib.call parses it
      // at every call); `%ld` is 64-bit (long64), the rewritten text is copied to the stack
      const fi = PRINTF[name];
      const raw = clib.fn[name];
      e = (args) => {
        for (let k = 0; k <= fi; k++) if (typeof args[k] === "string") return clib.call(name, ...args.map(arg));
        const fmtAddr = arg(args[fi]);
        const text = clib.readString(fmtAddr);
        let c = formats.get(text);
        if (!c) formats.set(text, (c = printfSlots(text, true)));
        const rest = args.length > fi + 1 ? args.slice(fi + 1).map(arg) : [];
        if (rest.length < c.slots.length) return clib.call(name, ...args.map(arg));
        const fixed = new Array(fi + 1);
        for (let k = 0; k < fi; k++) fixed[k] = arg(args[k]);
        const sp = clib.stackSave();
        try {
          fixed[fi] = c.fmt === null ? fmtAddr : clib.stackString(c.fmt);
          return raw(...fixed, clib.vaList(c.slots, rest));
        } finally {
          clib.stackRestore(sp);
        }
      };
    } else if (sig && /^[piudv]:[piud]*$/.test(sig)) {
      const raw = clib.fn[name];
      const unsigned = sig[0] === "u";
      const n = sig.length - 2;
      e = (args) => {
        const a = new Array(n);
        for (let k = 0; k < n; k++) {
          const v = args[k];
          if (typeof v === "string") return clib.call(name, ...args.map(arg));
          a[k] = arg(v);
        }
        const r = raw(...a);
        return unsigned ? r >>> 0 : r;
      };
    } else e = (args) => clib.call(name, ...args.map(arg));
    entries.set(name, e);
    return e;
  };
  rtHeap.machine.libc = (name, args) => {
    const e = entry(name);
    const sp = clib.stackSave();
    if (!(sp & 15)) return e(args);
    clib.stackRestore(sp & -16);
    try {
      return e(args);
    } finally {
      clib.stackRestore(sp);
    }
  };
  install_lua_api(clib, { addr: addrOf, fnIndex, fnFromIndex: (i) => rtFn.fn_from_index(i) });

  // ---- loading the game and starting games ------------------------------------------------

  /** Import the game's modules (once); `importer` returns the entry module's namespace. */
  m.load = async (importer) => {
    if (m.entry) return m.entry;
    m.entry = await importer();
    m.pristine = takeFull();
    return m.entry;
  };

  function takeFull() {
    const top = clib.sbrk(0);
    return {
      top,
      sp: clib.stackSave(),
      bytes: clib.HEAPU8.slice(0, top),
      rt: typeof rtHeap.rt_state_save === "function" ? rtHeap.rt_state_save() : null,
      tableSize: clib.table.length,
    };
  }

  /**
   * Reset to the pristine state and set up one game: a fresh file system,
   * the session's clock and environment.  Returns the Vfs.
   */
  m.newGame = ({ seed, datetime, environment = true }) => {
    if (!m.pristine) throw new Error("boot: load() the game first");
    const p = m.pristine;
    const now = clib.sbrk(0);
    clib.HEAPU8.set(p.bytes);
    if (now > p.top) clib.HEAPU8.fill(0, p.top, now);
    clib.stackRestore(p.sp);
    if (p.rt) rtHeap.rt_state_restore(p.rt);
    m.clock = T.clocksFor(datetime);
    m.vfs = new Vfs({ now: m.clock.now });
    m.signals.clear();
    // (a game whose own driver code sets the environment passes environment: false)
    if (environment)
      for (const [name, value] of sessionEnvironment({ seed, datetime, tz: ny ? "America/New_York" : "UTC" })) {
        if (value === null) clib.call("unsetenv", name);
        else clib.call("setenv", name, value, 1);
      }
    return m.vfs;
  };

  m.addr = addrOf;
  m.cstring = (p) => clib.readString(p);
  return m;
}
